# Arquitetura Geral e Ciclo de Vida do App (Manifest, Activities/Services/Provider/Receiver, navegação PcView→AppView→Game, ShortcutTrampoline, source sets/build variants, fronteiras entre camadas)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (24)
6. [Ideias de melhoria](#ideias-de-melhoria) (12)
7. [Glossário](#glossário)

## Como funciona

Artemis é um APK monolítico de módulo único (`settings.gradle:1` → `include ':app'`), namespace `com.limelight`, minSdk 21 / targetSdk 34 / compileSdk 36, com uma camada nativa NDK (`ndkBuild`, `app/src/main/jni/Android.mk`) que embute o submódulo `moonlight-common-c` (fork ClassicOldSong), enet, reedsolomon, libopus e OpenSSL. O app tem duas "metades" arquiteturais claramente separadas: uma metade de *browsing* (PcView → AppView, adapters de grid, ComputerManagerService + DiscoveryService, NvHTTP/PairingManager) e uma metade de *streaming* (Game + StreamContainer + MediaCodecDecoderRenderer + ControllerHandler + NvConnection → MoonBridge → JNI). A ponte entre elas é `ServerHelper.createStartIntent()` (`utils/ServerHelper.java:93`), que serializa todo o estado necessário (host, portas, uniqueId, certificado DER do servidor, appId/appUUID, flag de virtual display, lista de server commands, displayId) em extras de Intent — não há repositório, DI ou estado compartilhado entre as duas metades além do `ComputerManagerService` (bound service) e do `SharedPreferences`/`ProfilesManager`. O ciclo de vida de descoberta/estado dos PCs vive inteiramente em `ComputerManagerService` (`computers/ComputerManagerService.java:45`), um bound service com `ComputerManagerBinder` que faz polling por thread-por-PC, persiste em SQLite via `ComputerDatabaseManager` e delega mDNS a `DiscoveryService` (`discovery/DiscoveryService.java:17`), que por sua vez escolhe jmDNS (<API 34) ou NsdManager (≥API 34). Cada Activity que precisa de dados de PC repete o mesmo padrão boilerplate: `bindService(ComputerManagerService)` → thread → `binder.waitForReady()` → `binder.startPolling(listener)` (PcView:81-108, AppView:93-169, ShortcutTrampoline:61-240) — três cópias quase idênticas de ~80 linhas cada. `ShortcutTrampoline` (`ShortcutTrampoline.java:47`) é uma Activity `noHistory` que existe para reconstituir uma back-stack coerente (`startActivities([PcView, AppView, Game])`) a partir de atalhos de launcher, de arquivos `.art` (deep link `content:`/`file:` com `pathPattern=".*\.art"`) e de intents `art://`; ela também faz wake-on-LAN com até 10 tentativas antes de desistir. A Activity `Game` (`Game.java:139`, 4348 linhas) é a god-class absoluta do projeto: implementa 9 interfaces simultaneamente (SurfaceHolder.Callback, OnGenericMotionListener, OnTouchListener, NvConnectionListener, EvdevListener, OnSystemUiVisibilityChangeListener, GameGestures, StreamContainer.InputCallbacks, ExternalControllerView.InputCallbacks, PerfOverlayListener, UsbDriverService.UsbDriverStateListener, View.OnKeyListener) e concentra: seleção de display mode/refresh rate, configuração do decoder, roteamento de todo o input (teclado, mouse, touch, stylus, gamepad, evdev), overlays flutuantes, PiP, clipboard sync, menus, zoom/pan e o ciclo de vida da conexão. `Game` expõe `public static Game instance` (`Game.java:144`), usado por 47 call-sites em 6 arquivos, incluindo um `AccessibilityService` (`KeyboardAccessibilityService.java:27`) e um `BroadcastReceiver` (`StartExternalDisplayControlReceiver.java:45`) — esse singleton estático é o "barramento" informal do app. O suporte a display externo introduz uma segunda Activity espelho, `ExternalDisplayControlActivity` (declarada no pacote `com.limelight.utils`, `utils/ExternalDisplayControlActivity.java:57`), que roda no display primário como touchpad/controle enquanto `Game` roda no secundário; ela também tem `public static instance` e reencaminha todos os eventos de tecla/motion para `Game.instance`. Para o teclado especificamente há três caminhos paralelos e triplicados de `InputConnection`/`commitText`: `StreamView` (morto, só referenciado pelo próprio teste), `StreamContainer` (o vivo, `ui/StreamContainer.java:186`) e `ExternalControllerView` (`ui/ExternalControllerView.java:59`); o texto vai para `Game.handleCommitText` → `enqueueCommitText` → `NvConnection.sendUtf8Text` → `MoonBridge.sendUtf8Text` (nativo) → `LiSendUtf8TextEvent`. Os build variants são apenas dois (`flavorDimensions "root"`: flavor `root` com `maxSdk 25` e `applicationId com.limelight.root`, e `nonRoot_game` com `applicationId com.limelight`), cruzados com `debug` (sufixo `.noirdebug`, label "Diana") e `release` (sufixo `.noir`, label "Artemis"); o source set `app/src/game/` existe no disco mas não corresponde a nenhum flavor ou build type e portanto é código morto. O source set `root` adiciona a implementação evdev (mouse capture em dispositivos rooteados), acessada por reflexão via `EvdevCaptureProviderShim` para permitir que o flavor não-root compile sem ela. O source set `test` roda em Robolectric e cobre principalmente startup/profiles; a suíte tem um teste que exercita exclusivamente a classe morta `StreamView`, dando falsa confiança sobre o caminho de commitText real.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/AndroidManifest.xml`](../../app/src/main/AndroidManifest.xml) | 269 | Declara todos os componentes. 9 Activities, 3 Services + 1 AccessibilityService, 1 BroadcastReceiver, 2 ContentProviders. Define os configChanges que fazem cada Activity absorver rotação/resize sem recriação, e os flags críticos da Activity Game (noHistory, singleTask, excludeFromRecents, StreamTheme). |
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4348 | God-class: Activity de streaming. Faz setup de display/refresh rate, decoder, conexão, todo o roteamento de input, overlays, PiP, clipboard, menus e o teardown. É o ponto de entrada de qualquer trabalho de teclado/IME. |
| [`app/src/main/java/com/limelight/PcView.java`](../../app/src/main/java/com/limelight/PcView.java) | 933 | Activity de entrada (LAUNCHER). Lista PCs descobertos, faz pairing (PIN e OTP+passphrase), WOL, delete, e navega para AppView. Hospeda um AdapterFragment com PcGridAdapter. |
| [`app/src/main/java/com/limelight/AppView.java`](../../app/src/main/java/com/limelight/AppView.java) | 795 | Lista de apps de um PC. Faz cache de applist em disco, poller dedicado (ApplistPoller), menu de contexto com start/quit/vdisplay/hide/shortcut/export .art e dispara ServerHelper.doStart -> Game. |
| [`app/src/main/java/com/limelight/ShortcutTrampoline.java`](../../app/src/main/java/com/limelight/ShortcutTrampoline.java) | 530 | Activity noHistory que resolve host/app a partir de atalho, arquivo .art ou intent, aguarda o PC ficar online (com WOL retry) e então monta a back-stack [PcView, AppView, Game] via startActivities(). |
| [`app/src/main/java/com/limelight/computers/ComputerManagerService.java`](../../app/src/main/java/com/limelight/computers/ComputerManagerService.java) | 968 | Bound service central do lado de browsing: polling de serverinfo por PC (thread dedicada), integração mDNS, persistência SQLite, geração/uso do uniqueId, ApplistPoller. Todo o estado de PCs vive aqui. |
| [`app/src/main/java/com/limelight/utils/ServerHelper.java`](../../app/src/main/java/com/limelight/utils/ServerHelper.java) | 274 | Fronteira browsing→streaming. Constrói os Intents de Game e de ShortcutTrampoline, resolve display secundário, e implementa doStart/doQuit/doNetworkTest. É o único lugar que sabe montar uma sessão. |
| [`app/src/main/java/com/limelight/ui/StreamContainer.java`](../../app/src/main/java/com/limelight/ui/StreamContainer.java) | 273 | FrameLayout que hospeda o SurfaceView (2D) ou GLSurfaceView (3D SBS), aplica aspect ratio no onMeasure, e é o View que recebe foco/IME durante o stream. É o ponto de extensão natural para redimensionar o stream quando o teclado abrir. |
| [`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`](../../app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java) | 567 | Activity espelho para modo display externo: roda no display padrão como touchpad + botões, hospeda GameMenu e KeyBoardLayoutController, e delega todo input para Game.instance. Está no pacote utils (violação de camada) e usa static instance. |
| [`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 1041 | DTO gigante que materializa TODO o SharedPreferences em campos públicos. É lido por readPreferences() em 40 call-sites; a leitura passa pelo overlay de profile (ProfilesManager.getOverlayingSharedPreferences). |
| [`app/src/main/java/com/limelight/profiles/ProfilesManager.java`](../../app/src/main/java/com/limelight/profiles/ProfilesManager.java) | 266 | Singleton carregado no Application.onCreate. Persiste perfis em files/profiles/profiles.json (Gson) e expõe um SharedPreferences decorator (OverlaySharedPreferences) que sobrepõe as opções do perfil ativo em cima das prefs reais. |
| [`app/src/main/java/com/limelight/nvstream/NvConnection.java`](../../app/src/main/java/com/limelight/nvstream/NvConnection.java) | 628 | Fachada Java sobre o núcleo nativo. Faz o handshake HTTP (launch/resume via NvHTTP), decide LAN/WAN/VPN, e depois só encaminha input para MoonBridge. Apesar de morar no pacote 'portável' nvstream, depende diretamente de APIs Android. |
| [`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`](../../app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java) | 426 | Camada JNI 100% estática (métodos native static + callbacks static). Implica uma única sessão de streaming por processo e cria acoplamento global. |
| [`app/src/main/java/com/limelight/GameMenu.java`](../../app/src/main/java/com/limelight/GameMenu.java) | 348 | Menu quick-actions do stream (AlertDialog). Implementa Game.GameMenuCallbacks; é instanciado tanto por Game quanto por ExternalDisplayControlActivity com Context diferente. Contém as entradas de toggle de teclado. |
| [`app/src/main/java/com/limelight/ui/StreamView.java`](../../app/src/main/java/com/limelight/ui/StreamView.java) | 167 | CÓDIGO MORTO: SurfaceView legado com a mesma lógica de aspect ratio e InputConnection do StreamContainer. Não é referenciado por nenhum layout XML nem por nenhuma classe de produção — apenas pelo teste StreamViewCommitTextTest. |
| [`app/src/main/java/com/limelight/ui/ExternalControllerView.java`](../../app/src/main/java/com/limelight/ui/ExternalControllerView.java) | 93 | FrameLayout raiz da ExternalDisplayControlActivity; terceira cópia da lógica de InputConnection/commitText. |
| [`app/src/main/java/com/limelight/ArtemisApplication.java`](../../app/src/main/java/com/limelight/ArtemisApplication.java) | 17 | Application. Único trabalho: carregar ProfilesManager antes de qualquer Activity. Não há DI, não há inicialização de crash reporting, nem registro de ActivityLifecycleCallbacks. |
| [`app/src/main/java/com/limelight/KeyboardAccessibilityService.java`](../../app/src/main/java/com/limelight/KeyboardAccessibilityService.java) | 72 | AccessibilityService com FLAG_REQUEST_FILTER_KEY_EVENTS que sequestra teclas de sistema (Home etc.) e as reencaminha para Game.instance.handleKeyDown/Up. Só filtra eventos do próprio pacote. |
| [`app/src/main/java/com/limelight/StartExternalDisplayControlReceiver.java`](../../app/src/main/java/com/limelight/StartExternalDisplayControlReceiver.java) | 57 | BroadcastReceiver (não exportado) acionado pela notificação sticky do modo display externo; traz a task do Game para frente e reabre a ExternalDisplayControlActivity. |
| [`app/src/main/java/com/limelight/PosterContentProvider.java`](../../app/src/main/java/com/limelight/PosterContentProvider.java) | 107 | ContentProvider exportado (authority poster.${applicationId}) que serve box art do cache para launchers/TV. openFile ignora o resultado do UriMatcher e não sanitiza os segmentos da URI. |
| [`app/src/main/java/com/limelight/discovery/DiscoveryService.java`](../../app/src/main/java/com/limelight/discovery/DiscoveryService.java) | 90 | Bound service fino que encapsula a escolha entre JmDNSDiscoveryAgent (<API 34) e NsdManagerDiscoveryAgent (>=API 34). Só o ComputerManagerService se liga a ele. |
| [`app/src/main/java/com/limelight/ui/AdapterFragment.java`](../../app/src/main/java/com/limelight/ui/AdapterFragment.java) | 35 | Fragment (android.app.Fragment, framework legado) genérico usado por PcView e AppView; obtém o layout e devolve o AbsListView via AdapterFragmentCallbacks implementado pela Activity. |
| [`app/build.gradle`](../../app/build.gradle) | 191 | Define os build variants. flavorDimensions 'root' com flavors root e nonRoot_game; buildTypes debug (.noirdebug, label Diana) e release (.noir, label Artemis); ambos com minifyEnabled true. ndkBuild recebe PRODUCT_FLAVOR para condicionar o evdev_reader. Splits de ABI habilitados. |
| [`app/src/main/java/com/limelight/utils/UiHelper.java`](../../app/src/main/java/com/limelight/utils/UiHelper.java) | 295 | Utilitário de UI transversal: locale, insets de status bar para as telas não-stream, GameManager/GameState hints, diálogos de confirmação compartilhados e diálogo de crash do decoder. |
| [`app/src/main/res/layout/activity_game.xml`](../../app/src/main/res/layout/activity_game.xml) | 118 | Layout do stream. Raiz é <merge>: backgroundTouchView (área de trackpad fora do vídeo), StreamContainer (focusedByDefault, alvo do IME), overlays de notificação/performance e dois ImageButton flutuantes. É aqui que um campo de texto ancorado precisaria ser adicionado. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/AndroidManifest.xml`**
- `<application android:name=".ArtemisApplication"> :46`
- `provider .PosterContentProvider exported=true :61`
- `receiver .StartExternalDisplayControlReceiver :67`
- `activity .PcView (LAUNCHER/LEANBACK_LAUNCHER) :90`
- `activity .ShortcutTrampoline noHistory + deep link *.art :110`
- `activity .AppView :130`
- `activity .ProfilesActivity :138`
- `activity .EditProfileActivity :147`
- `activity .utils.ExternalDisplayControlActivity singleInstance/taskAffinity="" :157`
- `activity .preferences.StreamSettings :164`
- `activity .preferences.AddComputerManually (scheme art://, windowSoftInputMode=stateVisible) :175`
- `activity .Game noHistory/singleTask/excludeFromRecents/supportsPictureInPicture :193`
- `service .discovery.DiscoveryService :218`
- `service .computers.ComputerManagerService :221`
- `service .binding.input.driver.UsbDriverService :224`
- `activity .HelpActivity :228`
- `activity .DebugInfoActivity :238`
- `service KeyboardAccessibilityService (BIND_ACCESSIBILITY_SERVICE) :242`
- `provider androidx.core.content.FileProvider :257`

**`app/src/main/java/com/limelight/Game.java`**
- `class Game extends AppCompatActivity implements 12 interfaces :139`
- `public static Game instance :144`
- `commitTextQueue/UTF8_CHUNK_SIZE/flushCommitTextQueue :313-331`
- `onCreate() :342`
- `FLAG_FULLSCREEN + immersive flags :357-367`
- `FLAG_LAYOUT_IN_SCREEN :369`
- `setContentView(R.layout.activity_game) :378`
- `streamContainer.init()/setInputCallbacks/setCommitTextEnabled :459-464`
- `rootView = streamContainer.getParent() :466`
- `setOnSurfaceAvailable -> conn.start() :867`
- `initKeyboardController()/initkeyBoardLayoutController()/toggleFullKeyboard() :1091-1132`
- `setPreferredOrientationForActivity() :1144`
- `onConfigurationChanged() :1188`
- `getPictureInPictureParams()/updatePipAutoEnter() :1288/:1333`
- `prepareDisplayForRendering() :1455`
- `hideSystemUi (immersive sticky) :1646/:1671`
- `onDestroy() :1702`
- `onPause() :1746`
- `onStop() -> stopConnection() + finish() :1760/:1855`
- `handleKeyDown() :2030`
- `handleKeyUp() :2121`
- `handleKeyMultiple() -> sendUtf8Text :2193`
- `sendKeys(short[]) :2210`
- `handleFocusChange()/sendClipboard()/getClipboard() :2233/:2304/:2339`
- `toggleKeyboard() (InputMethodManager.toggleSoftInput) :2402`
- `handleMotionEvent() :2756`
- `stopConnection() :3439`
- `connectionTerminated() :3548`
- `surfaceChanged()/surfaceCreated()/surfaceDestroyed() :3779/:3796/:3832`
- `onSystemUiVisibilityChange() -> hideSystemUi(2000) :3915`
- `onBackPressed() -> showGameMenu :3973`
- `handleCommitText() :4290`
- `handleDeleteSurroundingText() :4299`
- `enqueueCommitText() :4314`

**`app/src/main/java/com/limelight/PcView.java`**
- `serviceConnection (bind CMS) :81`
- `onConfigurationChanged() :111`
- `initializeViews() :140`
- `onCreate() (GLSurfaceView para capturar GL_RENDERER) :210`
- `completeOnCreate() :270`
- `startComputerUpdates()/stopComputerUpdates() :286/:327`
- `onCreateContextMenu() :399`
- `doPair() :470`
- `doOTPPair() :584`
- `doAppList() -> Intent(AppView) :714`
- `onContextItemSelected() :733`
- `removeComputer() :824`
- `receiveAbsListView() :891`
- `static class ComputerObject :914`

**`app/src/main/java/com/limelight/AppView.java`**
- `EXTRAS: NAME_EXTRA/UUID_EXTRA/NEW_PAIR_EXTRA/SHOW_HIDDEN_APPS_EXTRA :87-90`
- `HIDDEN_APPS_PREF_FILENAME :85`
- `serviceConnection (cria AppGridAdapter dentro do bind) :93`
- `startComputerUpdates() (cria ApplistPoller) :194`
- `onCreate() :296`
- `populateAppGridWithCache() :356`
- `onCreateContextMenu() :444`
- `onContextItemSelected() (START_WITH_VDISPLAY etc.) :505`
- `updateUiWithAppList() :663`
- `receiveAbsListView() :744`
- `static class AppObject :778`

**`app/src/main/java/com/limelight/ShortcutTrampoline.java`**
- `serviceConnection + wakeHostTries :57-240`
- `validateHostInput() :242`
- `validateAppInput() :277`
- `parseArtFileData() :311`
- `onCreate() :354`
- `onStop() -> finish() :512`

**`app/src/main/java/com/limelight/computers/ComputerManagerService.java`**
- `SERVERINFO_POLLING_PERIOD_MS=1500 / APPLIST_POLLING_PERIOD_MS=30000 :46-47`
- `runPoll() :90`
- `createPollingThread() :164`
- `class ComputerManagerBinder :196`
- `startPolling() :197`
- `waitForReady() :227`
- `getComputer(uuid) :281`
- `invalidateStateForComputer() :293`
- `onUnbind() (para polling) :309`
- `createDiscoveryListener() :394`
- `parallelPollPc() :627`
- `onCreate() (bind DiscoveryService + NetworkCallback) :717`
- `class ApplistPoller :799`

**`app/src/main/java/com/limelight/utils/ServerHelper.java`**
- `createPcShortcutIntent() :45`
- `createAppShortcutIntent() (EXTRA_APP_ID como String) :53`
- `getActiveDisplay()/getSecondaryDisplay() :64/:73`
- `createStartIntent() (EXTRA_APP_ID como int; embrulha em ExternalDisplayControlActivity se display externo) :93`
- `doStart() :141`
- `doQuit() :189/:246`

**`app/src/main/java/com/limelight/ui/StreamContainer.java`**
- `interface InputCallbacks :28`
- `enum StreamMode {MODE_2D, MODE_AI_3D, MODE_AI_3D_MOVIE} :36`
- `init(Game, PreferenceConfiguration) :65`
- `setDesiredAspectRatio()/setFillDisplay() :103/:108`
- `onMeasure() (cálculo de aspect ratio) :114`
- `onKeyPreIme() :161`
- `onCheckIsTextEditor() :181`
- `onCreateInputConnection() (BaseInputConnection com commitText/deleteSurroundingText) :186`
- `surfaceChanged() :240`

**`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`**
- `public static ExternalDisplayControlActivity instance :62`
- `EXTRA_LAUNCH_INTENT :59`
- `closeExternalDisplayControl()/toggleKeyboard()/toggleFullKeyboard()/toggleGameMenu() :87-109`
- `onCreate() :114`
- `initViews() (único uso de WindowInsetsCompat.Type.ime() no app) :148/:172`
- `onKey()/onKeyDown()/onKeyUp()/onKeyMultiple() -> Game.instance :333-384`
- `createProgrammaticUI() :387`
- `_toggleKeyboard() :448`
- `_toggleFullKeyboard() :464`

**`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`**
- `CHECKBOX_ENABLE_COMMIT_TEXT :139`
- `DEFAULT_ENABLE_COMMIT_TEXT=false :208`
- `public boolean enableCommitText :337`
- `readPreferences(Context) :712`
- `readPreferences(Context, SharedPreferences) :716`
- `config.enableCommitText = ... :991`

**`app/src/main/java/com/limelight/profiles/ProfilesManager.java`**
- `getInstance() :42`
- `load(Context) :49`
- `save(Context) :102`
- `setActive(UUID)/getActive() :158/:164`
- `getOverlayingSharedPreferences() :200`
- `private static class OverlaySharedPreferences :212`

**`app/src/main/java/com/limelight/nvstream/NvConnection.java`**
- `NvConnection(Context, AddressTuple, ...) :55`
- `stop() :92`
- `sendKeyboardInput() :537`
- `sendUtf8Text() :619`
- `imports android.content.Context / android.net.* :5-14`

**`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`**
- `sendKeyboardInput(short,byte,byte,byte) native :390`
- `sendUtf8Text(String) native :396`
- `testClientConnectivity() :406`
- `init() :425`

**`app/src/main/java/com/limelight/GameMenu.java`**
- `class MenuOption :42`
- `GameMenu(Game, Context dialogScreenContext) :63`
- `showMenuDialog() :108`
- `showSpecialKeysMenu() :155`
- `showAdvancedMenu() (toggle keyboard controller / full keyboard) :245`
- `showMenu() (game_menu_toggle_keyboard -> game::toggleKeyboard) :288/:317`

**`app/src/main/java/com/limelight/ui/StreamView.java`**
- `class StreamView extends SurfaceView :15`
- `setCommitTextEnabled() :36`
- `onMeasure() :62`
- `onCreateInputConnection() :131`
- `interface InputCallbacks (inclui isOnExternalDisplay(), que StreamContainer.InputCallbacks não tem) :159`

**`app/src/main/java/com/limelight/ui/ExternalControllerView.java`**
- `setCommitTextEnabled() :20`
- `onKeyPreIme() :34`
- `onCreateInputConnection() :59`
- `interface InputCallbacks :87`

**`app/src/main/java/com/limelight/ArtemisApplication.java`**
- `onCreate() -> ProfilesManager.getInstance().load(this) :10-16`

**`app/src/main/java/com/limelight/KeyboardAccessibilityService.java`**
- `BLACKLIST_KEYS (volume/power) :15`
- `onKeyEvent() -> Game.instance :22`
- `onServiceConnected() (packageNames = BuildConfig.APPLICATION_ID) :52`

**`app/src/main/java/com/limelight/StartExternalDisplayControlReceiver.java`**
- `onReceive() :25`
- `requestFocusToExternalDisplayControl(Context) :29`
- `requestFocusToGameActivity(boolean) (usa Game.instance + moveTaskToFront) :38`

**`app/src/main/java/com/limelight/PosterContentProvider.java`**
- `AUTHORITY :20`
- `openFile() (fallback incondicional) :36-43`
- `openBoxArtFile() :45`
- `createBoxArtUri() :97`

**`app/src/main/java/com/limelight/discovery/DiscoveryService.java`**
- `class DiscoveryBinder :22`
- `onCreate() (escolha do agente por SDK_INT) :41-72`
- `onUnbind() :82`

**`app/src/main/java/com/limelight/ui/AdapterFragment.java`**
- `onAttach() (cast da Activity para AdapterFragmentCallbacks) :18`
- `onCreateView() :25`
- `onActivityCreated() -> callbacks.receiveAbsListView() :31`

**`app/build.gradle`**
- `ndkVersion 27.0.12077973 / compileSdk 36 / minSdk 21 / targetSdk 34 :4-13`
- `flavorDimensions.add("root") :21`
- `productFlavors.root (maxSdk 25, ROOT_BUILD=true) :28`
- `productFlavors.nonRoot_game (ROOT_BUILD=false) :48`
- `buildTypes.debug (minifyEnabled true) :97`
- `buildTypes.release :106`
- `externalNativeBuild ndkBuild path src/main/jni/Android.mk :147`
- `splits.abi :153`

**`app/src/main/java/com/limelight/utils/UiHelper.java`**
- `setGameModeStatus() :39`
- `notifyStreamConnecting/Connected/EnteringPiP/ExitingPiP/Ended :57-73`
- `setLocale() (updateConfiguration deprecado) :77`
- `applyStatusBarPadding() :108`
- `notifyNewRootView() (NÃO é chamado pela Game) :125`
- `showDecoderCrashDialog() :182`
- `displayQuitConfirmationDialog() :268`

**`app/src/main/res/layout/activity_game.xml`**
- `View @id/backgroundTouchView`
- `com.limelight.ui.StreamContainer @id/streamContainer (focusable/focusedByDefault)`
- `TextView @id/notificationOverlay`
- `LinearLayout @id/performanceOverlay`
- `ImageButton @id/floatingMenuButton`
- `ImageButton @id/overlayToggleZoomButton`
- `bloco ApertureViewGroup comentado (código morto)`

</details>

## Fluxo

## 1. Boot\n`ArtemisApplication.onCreate()` (`ArtemisApplication.java:10`) carrega `ProfilesManager.getInstance().load(this)` — isso precisa acontecer antes de qualquer `PreferenceConfiguration.readPreferences()`, porque toda leitura de preferência passa pelo overlay do perfil ativo (`PreferenceConfiguration.java:718` → `ProfilesManager.getOverlayingSharedPreferences()` → `ProfilesManager.java:200`).\n\n## 2. PcView (tela inicial)\n`PcView.onCreate()` (`PcView.java:210`) primeiro cria um `GLSurfaceView` descartável só para descobrir a string do GL renderer e cacheá-la em `GlPreferences` (`PcView.java:219-249`); quando isso resolve, chama `completeOnCreate()` (`PcView.java:270`), que instancia `ShortcutHelper`, faz `bindService(ComputerManagerService)` e cria o `PcGridAdapter`. O `ServiceConnection` (`PcView.java:81`) dispara uma thread que faz `localBinder.waitForReady()` (bloqueia até o `DiscoveryService` estar ligado, `ComputerManagerService.java:227`) e então `startComputerUpdates()` (`PcView.java:286`) → `binder.startPolling(listener)` (`ComputerManagerService.java:197`).\n\n## 3. Descoberta e polling\n`ComputerManagerService.onCreate()` (`ComputerManagerService.java:717`) faz bind no `DiscoveryService` e registra um `ConnectivityManager.NetworkCallback`. `DiscoveryService.onCreate()` (`discovery/DiscoveryService.java:41`) escolhe jmDNS ou NsdManager por SDK. Cada PC conhecido vira um `PollingTuple` com thread própria (`createPollingThread`, `ComputerManagerService.java:164`) que faz `runPoll` a cada 1500 ms; PCs novos vindos do mDNS entram por `createDiscoveryListener().notifyComputerAdded()` (`:394`) → `addTuple()` (`:438`). Cada atualização chama `listener.notifyComputerUpdated(details)`, que a `PcView` marshala para a UI thread em `updateComputer()` (`PcView.java:856`).\n\n## 4. Pairing\nClique num PC não pareado → `PcView.doPair()` (`PcView.java:470`) numa thread: `stopComputerUpdates(true)` → `new NvHTTP(...)` → `PairingManager.pair()`; em sucesso guarda `serverCert` no `ComputerDetails` do binder e chama `invalidateStateForComputer` (`PcView.java:539-543`), depois navega para `doAppList()`.\n\n## 5. PcView → AppView\n`PcView.doAppList()` (`PcView.java:714`) monta `Intent(AppView)` com `NAME_EXTRA`, `UUID_EXTRA`, `NEW_PAIR_EXTRA`, `SHOW_HIDDEN_APPS_EXTRA`. `AppView.onCreate()` (`AppView.java:296`) lê o UUID, carrega os appIds escondidos de `SharedPreferences("HiddenApps")` e faz seu próprio bind no CMS. No `onServiceConnected` (`AppView.java:93`) — ainda dentro da thread — cria o `AppGridAdapter`, chama `populateAppGridWithCache()` (lê `cacheDir/applist/<uuid>`, `AppView.java:356`) e só então publica `managerBinder` e inicia o `ApplistPoller` (`AppView.java:275`).\n\n## 6. AppView → Game (a fronteira)\nClique/menu → `ServerHelper.doStart()` (`utils/ServerHelper.java:141`) → `createStartIntent()` (`:93`). Aqui é onde toda a sessão é serializada: `EXTRA_HOST`, `EXTRA_PORT`, `EXTRA_HTTPS_PORT`, `EXTRA_APP_NAME/UUID/ID/HDR`, `EXTRA_UNIQUEID`, `EXTRA_PC_UUID/NAME`, `EXTRA_VDISPLAY`, `EXTRA_SERVER_COMMANDS`, `EXTRA_SERVER_CERT` (DER). Se `prefConfig.enableFullExDisplay` e existe display secundário, o Intent do Game é *embrulhado* dentro de um Intent para `ExternalDisplayControlActivity` via `EXTRA_LAUNCH_INTENT` (`ServerHelper.java:126-134`), invertendo quem inicia quem.\n\n## 7. Game.onCreate (o pipeline mais denso do app)\n`Game.java:342` → `UiHelper.setLocale` → `requestWindowFeature(NO_TITLE)` → `PreferenceConfiguration.readPreferences` → **`FLAG_FULLSCREEN` + flags de immersive** (`:357-367`) → **`FLAG_LAYOUT_IN_SCREEN`** (`:369`) → `setContentView(R.layout.activity_game)` (`:378`) → resolve o `Display` alvo (`:387-397`, usa `EXTRA_DISPLAY_ID`) → decide resolução/orientação (`:399-436`) → `streamContainer.init()/setInputCallbacks(this)/setCommitTextEnabled(prefConfig.enableCommitText)` (`:459-464`) → `rootView = streamContainer.getParent()` (`:466`, este `ViewParent` é depois castado para `FrameLayout` para hospedar os controllers virtuais, `:1092`) → `PanZoomHandler` (`:481`) → WifiLocks (`:547`) → lê os extras (`:564-576`) → `MediaCodecHelper.initialize` → `MediaCodecDecoderRenderer` (`:652`) → `prepareDisplayForRendering()` (`:750`/`:1455`, escolhe `Display.Mode` e chama `streamContainer.setDesiredAspectRatio`) → `StreamConfiguration.Builder` (`:779`) → `new NvConnection(...)` (`:805`) → `ControllerHandler` + `KeyboardTranslator` (`:809-813`) → contexts de touch/trackpad → `initMouseMode()` (`:833`) → OSC/teclado virtual (`:836-850`) → `streamContainer.setOnSurfaceAvailable(...)` que dispara `conn.start(audioRenderer, decoderRenderer, this)` (`:867-879`) → `GameMenu` (`:881`) → botões flutuantes (`:883-888`) → `setFixedSize` + `setFrameRate` por reflexão na SurfaceView (`:891-934`).\n\n## 8. Sessão ativa: input\nTeclas físicas chegam por três portas: `Game.onKeyDown/onKeyUp` (Activity), `StreamContainer.onKeyPreIme` → `InputCallbacks.handleKeyDown/Up` (`ui/StreamContainer.java:161`), e `KeyboardAccessibilityService.onKeyEvent` → `Game.instance.handleKeyDown/Up` (`KeyboardAccessibilityService.java:22`). Todas convergem em `Game.handleKeyDown` (`:2030`) → `KeyboardTranslator.translate()` → `conn.sendKeyboardInput()` (`:2108`) → `MoonBridge.sendKeyboardInput` (`NvConnection.java:537`) → `simplejni.c:112` → `LiSendKeyboardEvent2`.\n\n## 9. Sessão ativa: texto inteiro (caminho que já existe)\nIME → `StreamContainer.onCreateInputConnection` (`ui/StreamContainer.java:186`, só se `prefConfig.enableCommitText`) → `BaseInputConnection.commitText()` → `Game.handleCommitText` (`Game.java:4290`) → `enqueueCommitText` (`:4314`, fatia em chunks de 512 bytes UTF-8 respeitando fronteiras de code point) → `flushCommitTextQueue` posta um chunk a cada 15 ms (`:317-331`) → `NvConnection.sendUtf8Text` (`NvConnection.java:619`) → `MoonBridge.sendUtf8Text` → `simplejni.c:127` (`GetStringUTFChars` + `strlen`) → `LiSendUtf8TextEvent` (`InputStream.c:1005`) → pacote no `CTRL_CHANNEL_UTF8` com flag `ENET_PACKET_FLAG_RELIABLE`.\n\n## 10. Sessão ativa: teclado virtual\n`GameMenu.showMenu` (`GameMenu.java:317`) → `game::toggleKeyboard` → `Game.toggleKeyboard()` (`:2402`) → `InputMethodManager.toggleSoftInput(0,0)` (ou delega para `ExternalDisplayControlActivity.toggleKeyboard()` se em display externo). O "teclado cheio" próprio do app é outro caminho: `Game.toggleFullKeyboard()` (`:1122`) → `KeyBoardLayoutController` inflado dentro do `(FrameLayout) rootView` (`:1108`) — um overlay que *cobre* o vídeo, não empurra.\n\n## 11. Display externo\n`ExternalDisplayControlActivity.onCreate` (`utils/ExternalDisplayControlActivity.java:114`) lança o Intent do Game no display secundário com `ActivityOptions.setLaunchDisplayId` (`:127-136`), depois faz polling em `initViews()` até `Game.instance != null` (`:149-158`). A partir daí todo teclado/motion daquela Activity é reencaminhado para `Game.instance` (`:333-384`), e o `Game` chama de volta os métodos estáticos (`Game.java:1124`, `:2404`, `:4247`). O `StartExternalDisplayControlReceiver` fecha o ciclo trazendo a task para frente (`StartExternalDisplayControlReceiver.java:38`).\n\n## 12. Teardown\n`Game.onStop()` (`:1760`) esconde overlays, chama `stopConnection()` (`:3439` → `conn.stop()` em thread separada, `NvConnection.java:92` → `MoonBridge.stopConnection/cleanupBridge`), mostra o toast de latência, grava estatísticas e **chama `finish()` incondicionalmente** (`:1855`). `onDestroy()` (`:1702`) zera `instance`, destrói `ControllerHandler`, solta WifiLocks, salva zoom/pan e destrói o `inputCaptureProvider`. Como a Activity é `noHistory` (`AndroidManifest.xml:196`), voltar do Game leva direto à `AppView`.\n\n## 13. Caminho alternativo: ShortcutTrampoline\n`ShortcutTrampoline.onCreate` (`:354`) resolve host/app a partir de `.art` (`parseArtFileData`, `:311`) ou extras, valida (`:242`/`:277`), faz bind no CMS e aguarda o PC ficar `ONLINE`+`PAIRED`, tentando WOL até 10 vezes (`:111-125`); então monta `intentStack` = `[PcView(CLEAR_TASK|NEW_TASK), AppView, (Game)]` e chama `startActivities()` (`:155`/`:203`).

## Interfaces externas

- Android Activity/Service/BroadcastReceiver/ContentProvider framework (todos os componentes em app/src/main/AndroidManifest.xml)
- AndroidX AppCompat 1.7.1 (todas as Activities estendem AppCompatActivity) + androidx.preference 1.2.1 (StreamSettings, EditProfileActivity) + recyclerview 1.4.0 + cardview + Material 1.13.0 (ExtendedFloatingActionButton em PcView/AppView)
- android.app.Fragment (framework legado) via ui/AdapterFragment.java:5 — coexiste com androidx.fragment usado pelo PreferenceFragmentCompat
- JNI / NDK ndkBuild 27.0.12077973: app/src/main/jni/moonlight-core/simplejni.c + callbacks.c expondo com.limelight.nvstream.jni.MoonBridge (nvstream/jni/MoonBridge.java:390-425)
- moonlight-common-c (submódulo git, fork ClassicOldSong) — protocolo Gamestream/Sunshine: RTSP, ENet control stream, RTP vídeo/áudio, LiSendUtf8TextEvent (InputStream.c:1005)
- enet (canal de controle confiável), reedsolomon (FEC), libopus (áudio, .a pré-compilados por ABI), OpenSSL (build-openssl.sh)
- android.media.MediaCodec / MediaFormat (binding/video/MediaCodecDecoderRenderer.java, MediaCodecHelper.java)
- android.media.AudioTrack (binding/audio/AndroidAudioRenderer.java)
- android.hardware.display.DisplayManager + Display.Mode (Game.java:390, :1461; ServerHelper.java:73) e ActivityOptions.setLaunchDisplayId (ExternalDisplayControlActivity.java:128)
- android.view.inputmethod: InputMethodManager.toggleSoftInput (Game.java:2408, ExternalDisplayControlActivity.java:451), BaseInputConnection/EditorInfo (StreamContainer.java:186, ExternalControllerView.java:59, StreamView.java:131)
- androidx.core.view.WindowInsetsCompat / WindowCompat / WindowInsetsControllerCompat — usados APENAS em ExternalDisplayControlActivity.java:160-176; a Activity Game usa exclusivamente os View.SYSTEM_UI_FLAG_* legados
- android.accessibilityservice.AccessibilityService com FLAG_REQUEST_FILTER_KEY_EVENTS (KeyboardAccessibilityService.java, xml/keyboard_accessibility_service.xml)
- android.app.PictureInPictureParams / enterPictureInPictureMode (Game.java:1288-1400)
- android.hardware.usb (UsbManager) via binding/input/driver/UsbDriverService.java + drivers Xbox360/XboxOne/ProCon
- android.hardware.input.InputManager + InputDevice (Game.java:812, ControllerHandler)
- Linux evdev via binário nativo evdev_reader (jni/evdev_reader/Android.mk, só no flavor root) acessado por root/java/com.limelight/binding/input/evdev/EvdevCaptureProvider.java e ponte EvdevCaptureProviderShim (reflexão)
- mDNS/DNS-SD: org.jmdns 3.6.2 (JmDNSDiscoveryAgent) para <API 34 e android.net.nsd.NsdManager (NsdManagerDiscoveryAgent) para >=API 34
- HTTP/HTTPS via OkHttp 4.12.0 + BouncyCastle 1.81 (bcprov/bcpkix) para o cert cliente — nvstream/http/NvHTTP.java, PairingManager.java, binding/crypto/AndroidCryptoProvider.java
- Wake-on-LAN UDP (nvstream/wol/WakeOnLanSender.java)
- STUN via MoonBridge.findExternalAddressIP4 (NvConnection.java:626)
- SQLite (android.database.sqlite) — computers/ComputerDatabaseManager.java, DB 'computers4.db' + LegacyDatabaseReader1/2/3
- SharedPreferences (default + 'HiddenApps' + 'DecoderTombstone' + 'specialPrefs') e arquivos em filesDir/profiles/profiles.json via Gson 2.13.1
- ContentProvider próprio poster.${applicationId} (PosterContentProvider) + androidx FileProvider ${applicationId}.fileprovider (export de arquivos .art)
- android.media.tv TvContract / READ_EPG_DATA+WRITE_EPG_DATA (utils/TvChannelHelper.java) para canal Android TV
- ShortcutManager / pinned shortcuts (utils/ShortcutHelper.java)
- android.app.GameManager / GameState (utils/UiHelper.java:39) + xml/game_mode_config.xml
- APIs proprietárias Samsung por reflexão: com.samsung.android.view.SemWindowManager.requestMetaKeyEvent (Game.java:1352-1361)
- com.github.cgutman:ShieldControllerExtensions (binding/input/capture/ShieldCaptureProvider.java)
- com.google.ai.edge.litert 1.4.0 + litert-gpu + org.opencv 4.12.0 — modelo MiDaS para 3D SBS (utils/Stereo3DRenderer.java, ReflectivePaddingInt8Minimal.java)
- MPAndroidChart v3.1.0 + ByteHamster SearchPreference v2.5.1 (telas de settings/estatísticas)
- WebView (HelpActivity.java) para o wiki/setup guide
- Robolectric 4.16 + Mockito 5.19 + androidx.test:core (source set test, com shadows customizados em test/java/com/limelight/shadows/)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🟠 alto | maintainability | Game.java é uma god-class de 4348 linhas implementando 12 interfaces | `app/src/main/java/com/limelight/Game.java:139` |
| 🟠 alto | ux | A janela do Game é configurada de forma que o IME nunca pode redimensionar o stream (causa raiz do requisito AnyDesk #1) | `app/src/main/java/com/limelight/Game.java:357` |
| 🟠 alto | bug | onSystemUiVisibilityChange reimpõe immersive sticky 2s depois, brigando com o IME | `app/src/main/java/com/limelight/Game.java:3915` |
| 🟠 alto | tech-debt | Game.onStop() chama finish() incondicionalmente e a Activity é noHistory+singleTask | `app/src/main/java/com/limelight/Game.java:1855` |
| 🟠 alto | bug | Bug no agendamento do flush de commitText: textos com mais de um chunk nunca são enviados | `app/src/main/java/com/limelight/Game.java:4331` |
| 🟠 alto | tech-debt | ui/StreamView.java é código morto, mas é a única classe coberta pelo teste de commitText | `app/src/main/java/com/limelight/ui/StreamView.java:15` |
| 🟡 médio | tech-debt | Source set app/src/game/ é órfão: nenhum flavor ou build type chamado 'game' | `app/src/game/AndroidManifest.xml:1` |
| 🟡 médio | maintainability | Lógica de InputConnection/commitText triplicada em três Views | `app/src/main/java/com/limelight/ui/StreamContainer.java:186` |
| 🟡 médio | maintainability | ExternalDisplayControlActivity é uma Activity morando no pacote utils | `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java:57` |
| 🟡 médio | maintainability | Acoplamento global por singletons estáticos de Activity (Game.instance, ExternalDisplayControlActivity.instance) | `app/src/main/java/com/limelight/Game.java:144` |
| 🟡 médio | maintainability | Pacote nvstream (porta 'portável' do moonlight-common) depende de APIs Android | `app/src/main/java/com/limelight/nvstream/NvConnection.java:5` |
| 🟡 médio | tech-debt | MoonBridge é 100% estático: uma única sessão de streaming por processo | `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java:390` |
| 🟡 médio | bug | Reflexão para ler um campo do próprio PreferenceConfiguration quebra com R8 (minifyEnabled=true nos dois build types) | `app/src/main/java/com/limelight/Game.java:673` |
| 🟡 médio | security | PosterContentProvider é exportado sem permissão, ignora o UriMatcher e não sanitiza os segmentos da URI | `app/src/main/java/com/limelight/PosterContentProvider.java:36` |
| 🟡 médio | bug | Ponte JNI de texto usa GetStringUTFChars + strlen: emojis e caracteres fora do BMP são corrompidos | `app/src/main/jni/moonlight-core/simplejni.c:127` |
| 🟡 médio | maintainability | Três cópias quase idênticas do boilerplate de bind ao ComputerManagerService | `app/src/main/java/com/limelight/PcView.java:81` |
| 🟡 médio | bug | Game.EXTRA_APP_ID é usado ora como String ora como int, dependendo do Intent | `app/src/main/java/com/limelight/utils/ServerHelper.java:59` |
| ⚪ baixo | bug | Fall-through no switch de PcView.onContextItemSelected e item de menu UNPAIR_ID inalcançável | `app/src/main/java/com/limelight/PcView.java:811` |
| ⚪ baixo | maintainability | Source set root usa um diretório literalmente chamado 'com.limelight' em vez da hierarquia de pacotes | `app/src/root/java/com.limelight/binding/input/evdev/EvdevCaptureProvider.java:1` |
| ⚪ baixo | compatibility | AdapterFragment usa android.app.Fragment (framework legado) enquanto o resto do app usa AndroidX | `app/src/main/java/com/limelight/ui/AdapterFragment.java:5` |
| ⚪ baixo | tech-debt | ShortcutTrampoline tem finish() comentado em todos os caminhos de erro e finish() incondicional em onStop | `app/src/main/java/com/limelight/ShortcutTrampoline.java:408` |
| ⚪ baixo | tech-debt | ui/ApertureViewGroup é código morto (só referenciado em bloco XML comentado) | `app/src/main/java/com/limelight/ui/ApertureViewGroup.java:1` |
| ⚪ baixo | ux | UiHelper.notifyNewRootView não é chamado pela Game, criando tratamento de insets inconsistente entre telas | `app/src/main/java/com/limelight/utils/UiHelper.java:125` |
| ⚪ baixo | compatibility | UiHelper.setLocale usa Resources.updateConfiguration (depreciado) em vez de createConfigurationContext/AppCompatDelegate | `app/src/main/java/com/limelight/utils/UiHelper.java:105` |

### Detalhe

#### 🟠 alto Game.java é uma god-class de 4348 linhas implementando 12 interfaces

**Local:** `app/src/main/java/com/limelight/Game.java:139` · **Categoria:** maintainability

A classe declara `implements SurfaceHolder.Callback, OnGenericMotionListener, OnTouchListener, NvConnectionListener, EvdevListener, OnSystemUiVisibilityChangeListener, GameGestures, StreamContainer.InputCallbacks, ExternalControllerView.InputCallbacks, PerfOverlayListener, UsbDriverService.UsbDriverStateListener, View.OnKeyListener` e acumula pelo menos 12 responsabilidades distintas: negociação de display mode/refresh rate (:1455), configuração do decoder (:652), montagem da StreamConfiguration (:779), ciclo de vida da NvConnection (:867, :3439), roteamento de teclado (:2030-2208), mouse/touch/stylus (:2756-3420), gamepad (delegado mas orquestrado aqui), clipboard sync (:2246-2390), PiP (:1288-1400), overlays flutuantes e drag deles (:938-1090), zoom/pan (:3992) e menus (:4245). Só o onCreate tem ~595 linhas. Qualquer alteração de teclado/IME obriga a mexer nessa classe, e não há como testá-la isoladamente (o único teste que a toca é StartupCrashTest via Robolectric).

**Correção sugerida:** Extrair colaboradores com fronteiras claras antes de implementar as features de teclado: `GameWindowController` (flags de janela, insets, immersive, orientação, PiP), `GameInputRouter` (todo handleKey*/handleMotionEvent), `StreamSessionController` (NvConnection + decoder + StreamConfiguration) e `GameOverlayController` (botões flutuantes, OSC, teclados virtuais). Começar pelo GameWindowController, que é exatamente o escopo do EPIC de teclado ancorado.

#### 🟠 alto A janela do Game é configurada de forma que o IME nunca pode redimensionar o stream (causa raiz do requisito AnyDesk #1)

**Local:** `app/src/main/java/com/limelight/Game.java:357` · **Categoria:** ux

Em onCreate a Activity adiciona `WindowManager.LayoutParams.FLAG_FULLSCREEN` (:359), aplica `SYSTEM_UI_FLAG_LAYOUT_STABLE|LAYOUT_HIDE_NAVIGATION|LAYOUT_FULLSCREEN` (:363-366) e depois `FLAG_LAYOUT_IN_SCREEN` (:369). A declaração no manifest (`AndroidManifest.xml:193-216`) não define nenhum `android:windowSoftInputMode`, e o tema `StreamTheme` (`res/values/styles.xml:34`) também não. Com FLAG_FULLSCREEN + LAYOUT_IN_SCREEN, o Android não aplica `adjustResize` — o IME simplesmente sobrepõe a janela. Uma busca por `SOFT_INPUT|windowSoftInputMode|adjustResize|setDecorFitsSystemWindows|WindowInsets.*ime()` em todo `app/src/main` retorna zero ocorrências no caminho do Game; o único uso de `WindowInsetsCompat.Type.ime()` no projeto inteiro está em `utils/ExternalDisplayControlActivity.java:172` e serve apenas para não escurecer a tela por inatividade.

**Correção sugerida:** Introduzir um modo 'teclado ancorado': quando o IME abrir, (a) `getWindow().clearFlags(FLAG_FULLSCREEN)` e trocar os SYSTEM_UI_FLAG_* por `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)` + `WindowInsetsControllerCompat`; (b) registrar `ViewCompat.setOnApplyWindowInsetsListener` no `android.R.id.content` lendo `insets.getInsets(Type.ime()).bottom`; (c) aplicar esse valor como bottom padding/margin do `@id/streamContainer` — `StreamContainer.onMeasure` (`ui/StreamContainer.java:114`) já reprojeta o vídeo mantendo aspect ratio dentro do espaço disponível, então o vídeo encolhe sozinho; (d) chamar `panZoomHandler.handleSurfaceChange()` depois do relayout. Manter tudo atrás de uma preference nova para não regredir jogos em fullscreen.

#### 🟠 alto onSystemUiVisibilityChange reimpõe immersive sticky 2s depois, brigando com o IME

**Local:** `app/src/main/java/com/limelight/Game.java:3915` · **Categoria:** bug

Sempre que os flags de system UI mudam e `SYSTEM_UI_FLAG_FULLSCREEN` ou `SYSTEM_UI_FLAG_HIDE_NAVIGATION` some, o callback agenda `hideSystemUi(2000)` (:3923/:3926), que reaplica `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` (`:1660-1666`). Abrir o teclado virtual muda a visibilidade da navigation bar, então dois segundos depois o app força immersive de volta — provocando flicker, perda de foco do IME e, em alguns OEMs, fechamento do teclado. É um obstáculo direto para qualquer solução de teclado ancorado.

**Correção sugerida:** Manter um flag `imeVisible` (alimentado pelo OnApplyWindowInsetsListener) e fazer `hideSystemUi(int)` (`Game.java:1671`) retornar imediatamente enquanto o IME estiver visível; reagendar quando o IME fechar.

#### 🟠 alto Game.onStop() chama finish() incondicionalmente e a Activity é noHistory+singleTask

**Local:** `app/src/main/java/com/limelight/Game.java:1855` · **Categoria:** tech-debt

`onStop()` derruba a conexão (`stopConnection()`, :1782) e termina com `finish()` sem nenhuma condição (:1855). Combinado com `android:noHistory="true"`, `android:launchMode="singleTask"` e `android:excludeFromRecents="true"` (`AndroidManifest.xml:196-201`), qualquer coisa que leve a Activity a onStop mata o stream. Isso impede arquiteturas óbvias para a feature de 'campo de texto': não é possível abrir uma Activity/Dialog em outra task, nem um overlay em janela separada, sem encerrar a sessão. Também torna o modo multi-janela/split-screen frágil.

**Correção sugerida:** Trocar o `finish()` incondicional por uma decisão explícita: manter a sessão viva quando `isChangingConfigurations()` ou quando um flag `suppressStopTeardown` (usado por diálogos internos e pelo futuro campo de texto) estiver ligado. Se um campo de texto for necessário, implementá-lo como View dentro do próprio `activity_game.xml` (não como Activity separada) justamente por causa dessa restrição.

#### 🟠 alto Bug no agendamento do flush de commitText: textos com mais de um chunk nunca são enviados

**Local:** `app/src/main/java/com/limelight/Game.java:4331` · **Categoria:** bug

`enqueueCommitText` fatia o texto em chunks de até 512 bytes UTF-8 e só agenda o flush se `commitTextQueue.size() == 1` (:4331). Se a fila estava vazia e o texto gerou 2 ou mais chunks (>512 bytes, ex.: colar um parágrafo ou uma senha longa via ditado), a condição é falsa e `flushCommitTextQueue` nunca é postado — o texto fica parado na fila até que um commit pequeno posterior dispare o flush, e aí sai fora de ordem temporal. Isso ataca exatamente o caso de uso do dono do fork (enviar texto inteiro de uma vez).

**Correção sugerida:** Substituir por um flag de 'flush agendado': `boolean wasEmpty = commitTextQueue.isEmpty();` antes do loop e `if (wasEmpty) commitTextHandler.post(flushCommitTextQueue);` depois — ou simplesmente `commitTextHandler.removeCallbacks(flushCommitTextQueue); commitTextHandler.post(flushCommitTextQueue);`.

#### 🟠 alto ui/StreamView.java é código morto, mas é a única classe coberta pelo teste de commitText

**Local:** `app/src/main/java/com/limelight/ui/StreamView.java:15` · **Categoria:** tech-debt

`StreamView` não aparece em nenhum layout XML (`res/layout/activity_game.xml` usa `com.limelight.ui.StreamContainer`) nem é instanciada por nenhuma classe de produção — grep por `StreamView` só retorna comentários em Game.java, nomes de métodos privados (`getStreamViewRelativeNormalizedXY`) e o próprio arquivo + `app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java`. Ou seja: o único teste automatizado do caminho de commitText valida uma classe que o app não usa, dando falsa confiança sobre a feature de envio de texto.

**Correção sugerida:** Apagar `ui/StreamView.java` e reescrever `StreamViewCommitTextTest` contra `StreamContainer` (e/ou contra a fábrica de InputConnection unificada proposta abaixo), incluindo um caso com payload >512 bytes que reproduza o bug de flush.

#### 🟡 médio Source set app/src/game/ é órfão: nenhum flavor ou build type chamado 'game'

**Local:** `app/src/game/AndroidManifest.xml:1` · **Categoria:** tech-debt

`app/build.gradle:21` declara uma única dimensão (`root`) com dois flavors: `root` (:28) e `nonRoot_game` (:48). O AGP só reconhece source sets nomeados por flavor, build type ou combinação; `game` não é nenhum deles. Logo `app/src/game/AndroidManifest.xml` (que define `android:label="@string/app_label_game"`) nunca é mesclado, e a resValue `app_label_game` (`app/build.gradle:101` e `:140`) é gerada mas nunca usada. Um agente futuro vai gastar tempo procurando o variant 'game'.

**Correção sugerida:** Remover `app/src/game/` e as resValues `app_label_game`, ou — se a intenção era ter um variant separado — declarar o flavor de verdade. Documentar no README/CLAUDE.md que só existem 4 variants: rootDebug, rootRelease, nonRoot_gameDebug, nonRoot_gameRelease.

#### 🟡 médio Lógica de InputConnection/commitText triplicada em três Views

**Local:** `app/src/main/java/com/limelight/ui/StreamContainer.java:186` · **Categoria:** maintainability

O bloco `onCheckIsTextEditor()` + `onCreateInputConnection()` com `BaseInputConnection` sobrescrevendo `commitText`/`deleteSurroundingText` está copiado literalmente em três lugares: `ui/StreamContainer.java:181-202`, `ui/ExternalControllerView.java:54-85` e `ui/StreamView.java:126-157`. Cada um tem sua própria interface `InputCallbacks` com assinaturas ligeiramente diferentes (a de StreamView tem `isOnExternalDisplay()`, as outras não), e `Game` implementa duas delas simultaneamente (`Game.java:141-142`). Qualquer melhoria no envio de texto (ex.: suportar `setComposingText`, `finishComposingText`, `performEditorAction`) precisa ser feita 3 vezes.

**Correção sugerida:** Criar `com.limelight.ui.StreamInputConnectionFactory` (ou um `StreamTextInputDelegate`) com uma única interface `StreamTextCallbacks`, e fazer StreamContainer e ExternalControllerView delegarem para ela; apagar StreamView.

#### 🟡 médio ExternalDisplayControlActivity é uma Activity morando no pacote utils

**Local:** `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java:57` · **Categoria:** maintainability

O pacote `com.limelight.utils` deveria conter helpers sem estado; ele hospeda uma Activity de 567 linhas que constrói UI programaticamente, gerencia notificação sticky, permissão POST_NOTIFICATIONS, brilho por inatividade e roteia input. A declaração no manifest reflete isso (`AndroidManifest.xml:157`: `android:name=".utils.ExternalDisplayControlActivity"`), destoando de todas as outras Activities que estão na raiz `com.limelight` ou em `com.limelight.preferences`. Isso quebra a heurística 'utils = sem dependência de UI' que um agente usaria para navegar.

**Correção sugerida:** Mover para `com.limelight` (ou criar `com.limelight.externaldisplay`) junto com `StartExternalDisplayControlReceiver` e `ui/ExternalControllerView`, atualizando o manifest. É um rename mecânico e de baixo risco.

#### 🟡 médio Acoplamento global por singletons estáticos de Activity (Game.instance, ExternalDisplayControlActivity.instance)

**Local:** `app/src/main/java/com/limelight/Game.java:144` · **Categoria:** maintainability

`public static Game instance` (:144) é lido em 47 call-sites espalhados por 6 arquivos, incluindo componentes que não têm relação de ciclo de vida com a Activity: `KeyboardAccessibilityService.java:27` (processo do serviço de acessibilidade), `StartExternalDisplayControlReceiver.java:45` (BroadcastReceiver) e `utils/ExternalDisplayControlActivity.java` (outra Activity). O mesmo padrão se repete em `ExternalDisplayControlActivity.instance` (:62, anotado com @SuppressLint("StaticFieldLeak")). `Game.onDestroy` zera `instance` (:1705) mas `ExternalDisplayControlActivity.initViews` faz polling de 500 ms esperando `Game.instance != null` até 10 tentativas (:149-158) — um handshake por espera ativa entre duas Activities. Consequências: NPEs em corrida, vazamento de Activity, e impossibilidade de testar qualquer um desses componentes.

**Correção sugerida:** Substituir por um canal explícito: um `LocalBinder` de um `StreamSessionService` (ou um `ViewModel`/objeto de sessão em escopo de Application) que exponha os poucos verbos realmente necessários (handleKeyDown/Up, handleMotionEvent, toggleKeyboard, isZoomModeEnabled). Passo intermediário barato: encapsular tudo atrás de um `GameBridge` estático com métodos null-safe, para reduzir os 47 acessos diretos a um só ponto.

#### 🟡 médio Pacote nvstream (porta 'portável' do moonlight-common) depende de APIs Android

**Local:** `app/src/main/java/com/limelight/nvstream/NvConnection.java:5` · **Categoria:** maintainability

`NvConnection` importa `android.app.ActivityManager`, `android.content.Context`, `android.net.ConnectivityManager/IpPrefix/LinkProperties/Network/NetworkCapabilities/NetworkInfo/RouteInfo` e `android.os.Build` (:5-14) e recebe um `Context` no construtor (:55). O pacote `com.limelight.nvstream` é herdado do upstream como a camada de protocolo agnóstica de plataforma, com a intenção de que tudo específico de Android ficasse em `com.limelight.binding`. Essa inversão faz com que a fronteira 'protocolo vs. plataforma' deixe de existir na prática, e impede testar a lógica de conexão fora do Robolectric.

**Correção sugerida:** Extrair a detecção de LAN/VPN/rede para uma interface `NetworkEnvironmentProvider` implementada em `com.limelight.binding` e injetada no `NvConnection`. Documentar explicitamente que hoje `nvstream` NÃO é portável, para evitar que agentes futuros assumam o contrário.

#### 🟡 médio MoonBridge é 100% estático: uma única sessão de streaming por processo

**Local:** `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java:390` · **Categoria:** tech-debt

Todos os métodos são `public static native` e os callbacks também são estáticos (`jni/callbacks.c`). `NvConnection.stop()` sincroniza em `MoonBridge.class` (`NvConnection.java:98`) e usa um `Semaphore` estático `connectionAllowed` (:51) para serializar. Além disso, `Game` chama `MoonBridge` diretamente em vários pontos, pulando a fachada `NvConnection` — ex.: `MoonBridge.sendEmptyPayload()` no backgroundPing (`Game.java:336`), `MoonBridge.testClientConnectivity` (:3475, :3552), `MoonBridge.getPortFlagsFromTerminationErrorCode` (:3551), `MoonBridge.VIDEO_FORMAT_*` (:723-734). Isso cria duas rotas paralelas para o núcleo nativo e impede multi-sessão (relevante para o modo display externo, que já tenta rodar duas Activities).

**Correção sugerida:** Padronizar: tudo que for por-sessão passa por `NvConnection`; deixar em MoonBridge só o que é genuinamente global (testClientConnectivity, guessControllerType, stringifyPortFlags). Adicionar um comentário de classe explicitando a restrição de sessão única.

#### 🟡 médio Reflexão para ler um campo do próprio PreferenceConfiguration quebra com R8 (minifyEnabled=true nos dois build types)

**Local:** `app/src/main/java/com/limelight/Game.java:673` · **Categoria:** bug

Em onCreate há um bloco que faz `prefConfig.getClass().getDeclaredField("forceTightThresholds")` via reflexão, com `catch (Throwable ignored)` (:674-688), para ler um campo de uma classe que está no mesmo módulo e poderia ser acessada diretamente. Como `minifyEnabled true` está ligado tanto em `debug` (`app/build.gradle:103`) quanto em `release` (:142), o R8 pode renomear/remover o campo e o bloco silenciosamente cai no catch — o recurso simplesmente não funciona em build minificado, sem nenhum log. O mesmo padrão de `catch (Throwable ignored)` engolindo erros aparece em todo o bloco de setFixedSize/setFrameRate (:891-934).

**Correção sugerida:** Acessar `prefConfig.forceTightThresholds` diretamente (o campo existe ou não existe em tempo de compilação). Se o campo realmente não existir hoje, remover o bloco morto. Em geral, trocar os `catch (Throwable ignored)` por logs via `LimeLog.warning`.

#### 🟡 médio PosterContentProvider é exportado sem permissão, ignora o UriMatcher e não sanitiza os segmentos da URI

**Local:** `app/src/main/java/com/limelight/PosterContentProvider.java:36` · **Categoria:** security

O provider é declarado `android:exported="true"` sem `android:permission` nem `android:grantUriPermissions` (`AndroidManifest.xml:61-66`). Em `openFile` o resultado do `sUriMatcher.match(uri)` é calculado mas ignorado: ambos os ramos chamam `openBoxArtFile` (:37-42). Dentro dele, `segments.get(1)` (uuid) e `segments.get(2)` (appId) vêm direto da URI e são concatenados como componentes de caminho por `DiskAssetLoader.getFile` (`grid/assets/DiskAssetLoader.java:147`) → `CacheHelper.openPath` (`utils/CacheHelper.java:16`), que apenas faz `new File(f, component)` em loop, sem nenhuma validação contra `..`. Qualquer app instalado pode assim ler arquivos `<n>.png` fora do diretório boxart dentro do sandbox do Artemis.

**Correção sugerida:** Retornar `FileNotFoundException` quando `sUriMatcher.match(uri) != BOXART_URI_ID`; validar que o segmento uuid casa com `UUID.fromString()` e que `appId` é um inteiro; e conferir `file.getCanonicalPath().startsWith(cacheBoxartDir.getCanonicalPath())` antes de abrir.

#### 🟡 médio Ponte JNI de texto usa GetStringUTFChars + strlen: emojis e caracteres fora do BMP são corrompidos

**Local:** `app/src/main/jni/moonlight-core/simplejni.c:127` · **Categoria:** bug

`Java_com_limelight_nvstream_jni_MoonBridge_sendUtf8Text` obtém a string com `GetStringUTFChars`, que devolve *modified UTF-8* (CESU-8): pares substitutos viram 6 bytes em vez dos 4 bytes de UTF-8 real, e o caractere U+0000 vira 0xC0 0x80. O comprimento é calculado com `strlen` (:129), o que trunca no primeiro NUL embutido. `LiSendUtf8TextEvent` (`moonlight-common-c/src/InputStream.c:1005`) copia esses bytes crus no pacote do canal CTRL_CHANNEL_UTF8. Resultado: emoji e ditado com caracteres suplementares chegam corrompidos no host — relevante porque o dono do fork quer justamente enviar texto arbitrário digitado.

**Correção sugerida:** No lado Java, converter para `byte[]` com `text.getBytes(StandardCharsets.UTF_8)` e mudar a assinatura nativa para `sendUtf8Text(byte[] utf8, int length)`, usando `GetByteArrayElements` no JNI. Alternativa mínima: usar `GetStringChars` + conversão UTF-16→UTF-8 no C.

#### 🟡 médio Três cópias quase idênticas do boilerplate de bind ao ComputerManagerService

**Local:** `app/src/main/java/com/limelight/PcView.java:81` · **Categoria:** maintainability

O mesmo padrão (`ServiceConnection` anônimo → `new Thread()` → `localBinder.waitForReady()` → publicar `managerBinder` → `startPolling(listener)` → tratar `onServiceDisconnected` zerando o binder) aparece em `PcView.java:81-108`, `AppView.java:93-169` e `ShortcutTrampoline.java:61-240`, cada uma com variações sutis de tratamento de erro e de quando o binder fica visível. `AppView` inclusive cria o `AppGridAdapter` e faz I/O de cache dentro dessa thread (:117-138), misturando responsabilidades.

**Correção sugerida:** Extrair uma classe `ComputerManagerConnection` (ou um `AppCompatActivity` base) que encapsule bind/unbind/waitForReady/startPolling/stopPolling e exponha callbacks na main thread. Reduz ~200 linhas duplicadas e centraliza o tratamento de `managerBinder == null`.

#### 🟡 médio Game.EXTRA_APP_ID é usado ora como String ora como int, dependendo do Intent

**Local:** `app/src/main/java/com/limelight/utils/ServerHelper.java:59` · **Categoria:** bug

`createAppShortcutIntent` grava `i.putExtra(Game.EXTRA_APP_ID, ""+app.getAppId())` — String (`ServerHelper.java:59`) — enquanto `createStartIntent` grava `gameIntent.putExtra(Game.EXTRA_APP_ID, app.getAppId())` — int (`ServerHelper.java:110`). `ShortcutTrampoline` lê com `getStringExtra` (`ShortcutTrampoline.java:399`) e `Game` lê com `getIntExtra` (`Game.java:571`). Hoje funciona porque cada Intent tem só um consumidor, mas é uma armadilha silenciosa: um `getIntExtra` sobre o Intent do trampolim retorna o default `INVALID_APP_ID` e o Game faz `finish()` sem mensagem (`Game.java:591-594`).

**Correção sugerida:** Padronizar em int e adicionar constantes separadas (`EXTRA_APP_ID_INT` vs `EXTRA_APP_ID_STR`) ou converter no trampolim antes de repassar. Documentar o contrato de extras do Game em um único lugar.

#### ⚪ baixo Fall-through no switch de PcView.onContextItemSelected e item de menu UNPAIR_ID inalcançável

**Local:** `app/src/main/java/com/limelight/PcView.java:811` · **Categoria:** bug

O `case OPEN_MANAGEMENT_PAGE_ID:` (:811-818) não tem `return`/`break` e cai no `default: return super.onContextItemSelected(item)` (:819-820), que reprocessa o item. Além disso, `UNPAIR_ID` é tratado no switch (:745) mas `onCreateContextMenu` (:399-460) nunca o adiciona ao menu — é caminho morto herdado do upstream.

**Correção sugerida:** Adicionar `return true;` no case OPEN_MANAGEMENT_PAGE_ID e remover o case UNPAIR_ID (ou reintroduzir a entrada de menu correspondente).

#### ⚪ baixo Source set root usa um diretório literalmente chamado 'com.limelight' em vez da hierarquia de pacotes

**Local:** `app/src/root/java/com.limelight/binding/input/evdev/EvdevCaptureProvider.java:1` · **Categoria:** maintainability

O caminho é `app/src/root/java/com.limelight/binding/input/evdev/`, mas o arquivo declara `package com.limelight.binding.input.evdev;`. O javac aceita porque o Gradle passa os arquivos explicitamente, mas IDEs, lint, ferramentas de indexação e agentes que navegam por convenção de diretório vão se perder — inclusive uma busca por `app/src/root/java/com/limelight/**` não encontra nada.

**Correção sugerida:** Renomear para `app/src/root/java/com/limelight/binding/input/evdev/`.

#### ⚪ baixo AdapterFragment usa android.app.Fragment (framework legado) enquanto o resto do app usa AndroidX

**Local:** `app/src/main/java/com/limelight/ui/AdapterFragment.java:5` · **Categoria:** compatibility

`AdapterFragment` estende `android.app.Fragment` e `PcView`/`AppView` usam `getFragmentManager().beginTransaction()` (`PcView.java:195`, `AppView.java:154` e `:185`), APIs depreciadas desde a API 28 e removidas do caminho recomendado. Ao mesmo tempo, `StreamSettings` e `EditProfileActivity` usam `androidx.preference.PreferenceFragmentCompat` (AndroidX fragments). O app carrega os dois gerenciadores de fragment simultaneamente. `AppView` já precisa de um `try/catch (IllegalStateException)` em volta do commit (:157) e de `commitAllowingStateLoss()` para contornar corridas de ciclo de vida.

**Correção sugerida:** Migrar `AdapterFragment` para `androidx.fragment.app.Fragment` e usar `getSupportFragmentManager()`. É pré-requisito para eliminar os commitAllowingStateLoss e os try/catch defensivos.

#### ⚪ baixo ShortcutTrampoline tem finish() comentado em todos os caminhos de erro e finish() incondicional em onStop

**Local:** `app/src/main/java/com/limelight/ShortcutTrampoline.java:408` · **Categoria:** tech-debt

Nos caminhos de erro de validação a chamada `finish()` está comentada (linhas 408, 421, 458, 475, 497), aparentemente para que o `Dialog.displayDialog(..., endAfterDismiss=true)` sobreviva. Mas `onStop()` (:512) sempre chama `finish()` e `Dialog.closeDialogs()`, e a Activity é `android:noHistory="true"` (`AndroidManifest.xml:112`) — a combinação torna o comportamento de erro dependente de timing (o diálogo pode ser fechado antes de ser lido se algo levar a Activity a onStop).

**Correção sugerida:** Remover o código comentado e usar um único caminho de erro explícito: mostrar o diálogo com `setCancelable(false)` e chamar `finish()` no dismiss, ou usar Toast + finish(). Documentar a intenção.

#### ⚪ baixo ui/ApertureViewGroup é código morto (só referenciado em bloco XML comentado)

**Local:** `app/src/main/java/com/limelight/ui/ApertureViewGroup.java:1` · **Categoria:** tech-debt

As únicas referências são o bloco comentado em `res/layout/activity_game.xml:26-37` e o `<declare-styleable name="ApertureViewGroup">` em `res/values/styles.xml:66-72`. Nenhuma classe Java o instancia.

**Correção sugerida:** Remover a classe, o bloco comentado do layout e o declare-styleable; ou, se for feature planejada, mover para uma branch.

#### ⚪ baixo UiHelper.notifyNewRootView não é chamado pela Game, criando tratamento de insets inconsistente entre telas

**Local:** `app/src/main/java/com/limelight/utils/UiHelper.java:125` · **Categoria:** ux

`notifyNewRootView` (que aplica `LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`, padding de TV e o OnApplyWindowInsetsListener com `getTappableElementInsets`) é chamado por PcView (:143), AppView (:314), ShortcutTrampoline (:359), ProfilesActivity (:50), EditProfileActivity (:85) e AddComputerManually (:327) — mas está comentado em `StreamSettings.java:102` e nunca é chamado pela `Game`, que faz seu próprio tratamento de cutout inline (`Game.java:439-453`). Resultado: duas políticas de insets diferentes no mesmo app e nenhuma delas cobre o inset do IME.

**Correção sugerida:** Centralizar toda a política de insets num único helper com dois modos (browsing vs. streaming), incluindo o inset de IME — é a mesma refatoração que habilita o teclado ancorado.

#### ⚪ baixo UiHelper.setLocale usa Resources.updateConfiguration (depreciado) em vez de createConfigurationContext/AppCompatDelegate

**Local:** `app/src/main/java/com/limelight/utils/UiHelper.java:105` · **Categoria:** compatibility

`activity.getResources().updateConfiguration(config, ...)` é depreciado desde a API 25 e não é confiável em Android 13+, onde há `localeConfig` no manifest (`AndroidManifest.xml:56` já aponta `@xml/locales_config`) e `AppCompatDelegate.setApplicationLocales()`. Isso pode causar strings inconsistentes entre Activities que chamam setLocale em momentos diferentes do ciclo de vida.

**Correção sugerida:** Migrar para `AppCompatDelegate.setApplicationLocales(LocaleListCompat...)` e remover as chamadas espalhadas de `setLocale` nos onCreate.


## Ideias de melhoria

### Quick win — Corrigir o flush de commitText para payloads >512 bytes

**Tamanho:** quick-win

**Por quê:** Bug de uma linha que quebra exatamente o caso de uso de 'enviar texto inteiro'. Hoje colar/ditar mais de 512 bytes resulta em nada sendo enviado.

**Como:** Em app/src/main/java/com/limelight/Game.java:4331, trocar `if (commitTextQueue.size() == 1) commitTextHandler.post(flushCommitTextQueue);` por uma verificação de fila-antes-vazia (capturar `boolean wasEmpty = commitTextQueue.isEmpty()` antes do loop de chunking na linha 4320). Adicionar teste em app/src/test/java/com/limelight/ com um payload de 2 KB.

**Risco:** Nenhum risco relevante; comportamento estritamente melhor.

### Quick win — Remover código morto: ui/StreamView.java, ui/ApertureViewGroup.java, app/src/game/

**Tamanho:** quick-win

**Por quê:** Três artefatos mortos que confundem qualquer agente lendo o repositório — um deles (StreamView) chega a ter teste automatizado, sugerindo falsamente que o caminho de commitText está coberto.

**Como:** Apagar app/src/main/java/com/limelight/ui/StreamView.java e reapontar app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java para ui/StreamContainer.java (ui/StreamContainer.java:186). Apagar app/src/main/java/com/limelight/ui/ApertureViewGroup.java, o bloco comentado em res/layout/activity_game.xml:26-37 e o declare-styleable em res/values/styles.xml:66-72. Apagar app/src/game/AndroidManifest.xml e as resValues app_label_game em app/build.gradle:101 e :140.

**Risco:** Baixo. Confirmar antes com grep que não há referência via reflexão (não há) e rodar o build dos 4 variants.

### Endurecer o PosterContentProvider (URI matching + validação de path)

**Tamanho:** quick-win

**Por quê:** Provider exportado sem permissão, com fallback incondicional e sem sanitização de path — leitura arbitrária limitada de arquivos .png dentro do sandbox por qualquer app instalado.

**Como:** Em app/src/main/java/com/limelight/PosterContentProvider.java:36-61: lançar FileNotFoundException quando o UriMatcher não casar; validar o segmento uuid com UUID.fromString e o appId com Integer.parseInt em try/catch; e verificar o canonical path contra o diretório boxart antes de abrir (utils/CacheHelper.java:16 não faz nenhuma validação).

**Risco:** Baixo. Verificar que a integração de canal de TV (utils/TvChannelHelper.java) continua conseguindo ler as capas.

### Quick win — Unificar as três implementações de InputConnection num único delegate

**Tamanho:** small

**Por quê:** Pré-requisito prático para qualquer evolução do teclado: hoje qualquer mudança precisa ser replicada em StreamContainer, ExternalControllerView e StreamView.

**Como:** Criar `com.limelight.ui.StreamTextInputDelegate` com `onCheckIsTextEditor()`, `onCreateInputConnection(EditorInfo, View)` e uma interface única `StreamTextCallbacks {boolean onCommitText(CharSequence); boolean onDeleteSurroundingText(int,int);}`. Fazer ui/StreamContainer.java:181-202 e ui/ExternalControllerView.java:54-85 delegarem. Game passa a implementar uma interface só, simplificando a declaração em Game.java:141-142.

**Risco:** Baixo — refatoração mecânica com teste de regressão simples (o teste de commitText já existe, só precisa ser reapontado).

### Documentar o contrato de extras do Game em um único lugar e tipar consistentemente

**Tamanho:** small

**Por quê:** O Intent do Game é a única fronteira entre as duas metades do app (browsing e streaming) e hoje é um contrato implícito de 13 extras com um caso de tipo inconsistente (EXTRA_APP_ID como String vs int).

**Como:** Criar `com.limelight.GameLaunchRequest` (classe Parcelable ou builder) que serialize/desserialize todos os extras declarados em Game.java:256-269, e usar em utils/ServerHelper.java:93-138 e Game.java:564-576. Padronizar EXTRA_APP_ID como int (ver finding). Documentar o contrato em docs/ para agentes futuros.

**Risco:** Baixo-médio: atalhos de launcher já criados usam o formato antigo, então é necessário manter compatibilidade de leitura no ShortcutTrampoline (ShortcutTrampoline.java:395-403).

### Migrar AdapterFragment e as transações de fragment para AndroidX

**Tamanho:** small

**Por quê:** O app carrega dois frameworks de fragment simultaneamente e paga o preço com commitAllowingStateLoss + try/catch(IllegalStateException) defensivos em AppView.java:153-159.

**Como:** Trocar `android.app.Fragment` por `androidx.fragment.app.Fragment` em ui/AdapterFragment.java e `getFragmentManager()` por `getSupportFragmentManager()` em PcView.java:195 e AppView.java:154/:185. Manter a interface AdapterFragmentCallbacks intacta.

**Risco:** Baixo-médio: mudanças de timing de ciclo de vida de fragment podem expor corridas latentes; validar rotação de tela e mudança de preferences com os testes de app/src/test/java/com/limelight/profiles/.

### Adicionar um CLAUDE.md / docs de arquitetura com o mapa de componentes e os pontos de extensão de teclado

**Tamanho:** small

**Por quê:** O repositório não tem nenhum documento de arquitetura; um agente que abre o projeto pela primeira vez precisa reconstruir do zero as fronteiras (browsing vs streaming), a existência de código morto e as armadilhas (Game.instance, onStop->finish, source set órfão 'game').

**Como:** Documentar: (a) o mapa de módulos e a fronteira ServerHelper.createStartIntent; (b) os 4 build variants reais e o source set morto; (c) a tabela de arquivos mortos; (d) o caminho completo do teclado (StreamContainer.onCreateInputConnection -> Game.handleCommitText -> enqueueCommitText -> NvConnection.sendUtf8Text -> simplejni.c -> LiSendUtf8TextEvent) com os line numbers; (e) as invariantes perigosas (Game.onStop chama finish; immersive sticky é reaplicado a cada 2s; MoonBridge é sessão única).

**Risco:** Nenhum.

### Substituir os singletons estáticos de Activity por um GameBridge (ou binder de sessão)

**Tamanho:** medium

**Por quê:** Game.instance é lido por um AccessibilityService, um BroadcastReceiver e outra Activity — é a fonte de NPEs em corrida, de vazamentos e da espera ativa de 500ms em ExternalDisplayControlActivity.initViews. Também é o que impede testar KeyboardAccessibilityService e o modo display externo.

**Como:** Passo 1 (barato): criar `com.limelight.GameBridge` com métodos estáticos null-safe (isConnected(), handleKeyDown(KeyEvent), handleKeyUp(KeyEvent), handleMotionEvent(View,MotionEvent), toggleKeyboard(), isZoomModeEnabled()) e trocar os 47 acessos diretos (KeyboardAccessibilityService.java:27-44, StartExternalDisplayControlReceiver.java:45-52, utils/ExternalDisplayControlActivity.java:333-384, Game.java:4001/4223) por chamadas à ponte. Passo 2: trocar a implementação interna da ponte por um bound service ou por um objeto de sessão em escopo de Application, eliminando a referência à Activity. Passo 3: substituir o polling de initViews (ExternalDisplayControlActivity.java:149-158) por um callback registrado na ponte.

**Risco:** Médio. Fazer em dois commits (introduzir ponte; depois trocar implementação) para manter o comportamento observável idêntico no primeiro passo.

### Extrair ComputerManagerConnection e eliminar as três cópias do boilerplate de bind

**Tamanho:** medium

**Por quê:** ~200 linhas duplicadas entre PcView, AppView e ShortcutTrampoline, cada uma com tratamento de erro ligeiramente diferente — fonte recorrente de bugs de 'managerBinder == null' e de trabalho de I/O em threads anônimas.

**Como:** Criar `com.limelight.computers.ComputerManagerConnection` encapsulando bind/unbind, a thread de waitForReady (ComputerManagerService.java:227), startPolling/stopPolling e o marshalling para a main thread. Refatorar PcView.java:81-108, AppView.java:93-169 e ShortcutTrampoline.java:61-240 para usá-la. Aproveitar para tirar a criação do AppGridAdapter e o I/O de cache de dentro do onServiceConnected (AppView.java:117-138).

**Risco:** Médio: mexe no caminho crítico de descoberta/pareamento. Cobrir com os testes Robolectric já existentes (app/src/test/java/com/limelight/StartupTest.java, StartupCrashTest.java) e testar manualmente pareamento OTP, atalho .art e wake-on-LAN.

### Extrair GameWindowController e GameInputRouter de Game.java

**Tamanho:** large

**Por quê:** Game.java tem 4348 linhas e 12 interfaces; é o gargalo de qualquer trabalho de teclado, insets ou input. Dividir em dois colaboradores bem delimitados reduz o risco de todas as features de teclado subsequentes e torna o comportamento de janela testável.

**Como:** GameWindowController absorve: Game.java:357-372 (flags iniciais), :1144-1185 (setPreferredOrientationForActivity), :1425-1443 (shouldIgnoreInsetsForResolution), :1455-1643 (prepareDisplayForRendering), :1646-1699 (hideSystemUi/multi-window), :3915-3928 (onSystemUiVisibilityChange), :1288-1400 (PiP). GameInputRouter absorve: :1893-2231 (teclado + special keys + sendKeys), :2391-3420 (touch/pen/mouse/motion), :3847-3912 (callbacks de evdev/mouse). Game vira a casca que faz binding de ciclo de vida e delega. Fazer em duas PRs separadas, começando pelo WindowController, que é menor e é o que o EPIC de teclado precisa.

**Risco:** Alto: é o coração do app e há muito estado compartilhado (modifierFlags, grabbedInput, isPanZoomMode, connected, currentOrientation). Mitigar movendo estado junto com o comportamento e mantendo os métodos públicos existentes (handleKeyDown etc.) como fachada delegante, para não quebrar os 47 call-sites de Game.instance.

### EPIC — Modo 'Teclado Ancorado': redimensionar o stream quando o IME abre (paridade AnyDesk #1)

**Tamanho:** epic

**Por quê:** É o requisito nº 1 do dono do fork. Hoje o teclado virtual sempre cobre o vídeo porque a janela do Game é fullscreen+immersive e não há nenhum tratamento de WindowInsets.Type.ime() no caminho de streaming. A boa notícia é que a infraestrutura de layout já existe: StreamContainer.onMeasure recalcula o vídeo mantendo aspect ratio dentro do espaço disponível, então basta reduzir o espaço.

**Como:** 1) Nova preference `checkbox_ime_anchored_mode` em res/xml/preferences.xml + campo em preferences/PreferenceConfiguration.java (seguir o padrão de CHECKBOX_ENABLE_COMMIT_TEXT em :139/:208/:337/:991). 2) Extrair de Game.java um `GameWindowController` que centralize os flags hoje espalhados em Game.java:357-369 (FLAG_FULLSCREEN, SYSTEM_UI_FLAG_*, FLAG_LAYOUT_IN_SCREEN), Game.java:1646-1677 (hideSystemUi) e Game.java:3915-3928 (onSystemUiVisibilityChange). 3) Quando o modo estiver ligado: `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`, `getWindow().clearFlags(FLAG_FULLSCREEN)` ao detectar IME, e registrar `ViewCompat.setOnApplyWindowInsetsListener` no root (`findViewById(android.R.id.content)`, já que activity_game.xml usa <merge>). 4) Ler `insets.getInsets(WindowInsetsCompat.Type.ime()).bottom` e aplicar como bottom margin do `@id/streamContainer` (res/layout/activity_game.xml) — o `onMeasure` de ui/StreamContainer.java:114 reprojeta o vídeo sozinho. 5) Suprimir `hideSystemUi()` enquanto `imeVisible` (ver finding correspondente). 6) Após o relayout, chamar `panZoomHandler.handleSurfaceChange()` (utils/PanZoomHandler.java:79) e revalidar as coordenadas normalizadas de toque (Game.getStreamViewRelativeNormalizedXY, Game.java:2503 — elas usam width/height da view, então já acompanham). 7) Reaplicar fullscreen quando o IME fechar. Referência de implementação existente no próprio repo: utils/ExternalDisplayControlActivity.java:169-176 já faz setDecorFitsSystemWindows(false)+listener de insets com Type.ime().

**Risco:** Alto se aplicado sem flag: mexer nos flags de janela do Game afeta PiP (Game.java:1288), multi-window (Game.java:1681), display externo (que usa outra Activity) e o `setFixedSize` da SurfaceView (Game.java:900). Mitigação: manter atrás de preference, desligado por padrão, e testar explicitamente os cenários PiP/multi-window/display externo. Cuidado extra com `videoScaleMode == STRETCH` e `shouldIgnoreInsetsForResolution` (Game.java:1425), que assumem que a view ocupa a tela inteira.

### EPIC — Barra de composição de texto: digitar num campo e enviar a string inteira (paridade AnyDesk #2)

**Tamanho:** epic

**Por quê:** O transporte já existe e é confiável (LiSendUtf8TextEvent sobre canal ENet RELIABLE, moonlight-common-c/src/InputStream.c:1005), assim como o pipeline Java (Game.handleCommitText:4290 → enqueueCommitText:4314 → NvConnection.sendUtf8Text:619). O que falta é (a) uma UI de composição e (b) corrigir os dois bugs do caminho (agendamento do flush e modified-UTF-8 no JNI). Diferente do requisito #1, este é majoritariamente aditivo.

**Como:** 1) Corrigir primeiro o bug de agendamento em Game.java:4331 e a conversão UTF-8 em jni/moonlight-core/simplejni.c:127 (ver findings). 2) Adicionar um `EditText` + botão 'enviar' em res/layout/activity_game.xml, ancorado ao bottom, inicialmente `visibility=gone` e com `android:imeOptions=actionSend`. 3) Novo item no GameMenu (padrão de GameMenu.java:317, string em res/values/strings.xml) para alternar a barra; opcionalmente também um botão flutuante seguindo o padrão de Game.initFloatingButton (Game.java:1038). 4) No envio, chamar `handleCommitText(editText.getText())` — reusa o chunker e a fila existentes — e limpar o campo. 5) Como o EditText tem seu próprio InputConnection real, o `enableCommitText` do StreamContainer pode ficar desligado nesse modo, evitando a interferência com jogos que dependem de key-by-key (o próprio summary da preference em res/values/strings.xml:696 avisa disso). 6) Combinar com o EPIC de teclado ancorado para que o campo + IME empurrem o vídeo em vez de cobri-lo. 7) Opcional: um modo 'streaming' que envia a cada N ms enquanto digita, e um histórico de últimas strings.

**Risco:** Médio-baixo. O principal risco é o EditText roubar foco de teclas físicas e do gamepad durante o stream — mitigar liberando o foco (clearFocus + streamContainer.requestFocus()) assim que a barra fecha, e não interceptar onKeyPreIme quando a barra estiver visível. Cuidado com Game.onStop()->finish() (Game.java:1855): a barra precisa ser uma View dentro da própria Activity, nunca uma Activity/Dialog em outra task.


## Glossário

- Artemis: nome do fork de ClassicOldSong do Moonlight Android (antes 'Moonlight Noir'); label da build release. A build debug se chama 'Diana' (app/build.gradle:99,138).
- Apollo: fork do Sunshine feito pelo mesmo autor; é o host de referência do Artemis, com virtual display, server commands e clipboard sync. Vibeshine (usado pelo dono deste fork) é outro fork de Sunshine na mesma família.
- moonlight-common-c: submódulo C em app/src/main/jni/moonlight-core/moonlight-common-c (fork ClassicOldSong) que implementa o protocolo Gamestream/Sunshine (RTSP, ENet, RTP, FEC). É a fonte da verdade do wire protocol.
- MoonBridge: classe Java 100% estática (nvstream/jni/MoonBridge.java) que é a única ponte JNI para moonlight-common-c. Implica uma sessão de streaming por processo.
- simplejni.c: app/src/main/jni/moonlight-core/simplejni.c — implementação C dos métodos native do MoonBridge (envio de input). callbacks.c faz o caminho inverso (nativo -> Java).
- NvConnection: fachada Java da sessão de streaming (nvstream/NvConnection.java). Faz o handshake HTTP de launch/resume e depois só encaminha input para o MoonBridge. Apesar do pacote, depende de APIs Android.
- NvHTTP / PairingManager: cliente HTTP(S) do protocolo de controle do host (serverinfo, applist, launch, resume, quit) e a máquina de pareamento (PIN clássico e OTP+passphrase do Apollo).
- ComputerManagerService (CMS): bound service que é a fonte única de verdade sobre PCs conhecidos — polling por thread-por-PC, mDNS, SQLite. Toda Activity de browsing se liga a ele via ComputerManagerBinder.
- ComputerManagerBinder: Binder local do CMS. Métodos-chave: waitForReady(), startPolling(listener), getComputer(uuid), invalidateStateForComputer(uuid), createAppListPoller(), getUniqueId().
- ApplistPoller: poller dedicado, criado pelo AppView, que atualiza a lista de apps de um PC específico a cada 30s (ComputerManagerService.java:799).
- PollingTuple: registro interno do CMS que agrupa um ComputerDetails, sua thread de polling e o lock de rede (ComputerManagerService.java:61).
- ShortcutTrampoline: Activity noHistory que reconstrói a back-stack [PcView, AppView, Game] a partir de atalhos de launcher, arquivos .art ou deep links art://. É o único lugar que chama startActivities() com uma pilha.
- arquivo .art: formato de texto próprio do Artemis para exportar um 'launcher' de app/PC (linhas do tipo `[chave] valor`). Parseado em ShortcutTrampoline.parseArtFileData (:311) e escrito por utils/ShortcutHelper.
- StreamContainer: FrameLayout que hospeda o SurfaceView (2D) ou GLSurfaceView (3D SBS), aplica aspect ratio no onMeasure e é o View que recebe o IME durante o stream. Substituiu o antigo StreamView (hoje morto).
- StreamView: SurfaceView legado, código morto, mantido apenas por um teste. NÃO confundir com StreamContainer.
- ExternalControllerView: FrameLayout raiz da ExternalDisplayControlActivity; terceira cópia da lógica de InputConnection.
- commitText / enableCommitText: caminho pelo qual texto multi-caractere do IME (swipe typing, predição, ditado) é enviado como UTF-8 inteiro em vez de tecla-a-tecla. Preference `checkbox_enable_commit_text`, default false (PreferenceConfiguration.java:139/:208).
- LiSendUtf8TextEvent: função de moonlight-common-c (InputStream.c:1005) que envia uma string UTF-8 pelo canal CTRL_CHANNEL_UTF8 com flag RELIABLE. É o transporte que a feature de 'enviar texto inteiro' precisa.
- KeyBoardController vs KeyBoardLayoutController: dois overlays de teclado próprios do app. O primeiro (binding/input/virtual_controller/keyboard/KeyBoardController.java) são teclas especiais configuráveis; o segundo (KeyBoardLayoutController.java) é um teclado completo inflado de R.layout.layout_axixi_keyboard. Ambos SOBREPÕEM o vídeo — nenhum empurra a tela.
- toggleKeyboard() vs toggleFullKeyboard(): o primeiro (Game.java:2402) abre o IME do sistema via InputMethodManager.toggleSoftInput; o segundo (Game.java:1122) alterna o teclado próprio do app (KeyBoardLayoutController).
- virtual display / vDisplay: recurso do Apollo/Vibeshine em que o host cria um monitor virtual com a resolução do cliente. No app é o extra Game.EXTRA_VDISPLAY e a preference useVirtualDisplay; AppView oferece variantes de menu 'start with vdisplay'.
- enableFullExDisplay / modo display externo: quando ligado e há um display secundário, o Game roda no display externo e a ExternalDisplayControlActivity roda no primário como touchpad/controle, reencaminhando input via Game.instance.
- PreferenceConfiguration: DTO que materializa todo o SharedPreferences em campos públicos. Lido via readPreferences(Context) em 40 call-sites; sempre passa pelo overlay do perfil ativo.
- ProfilesManager / OverlaySharedPreferences: sistema de perfis do fork. Perfis ficam em filesDir/profiles/profiles.json (Gson); o perfil ativo é aplicado como um decorator de SharedPreferences que sobrepõe chaves (ProfilesManager.java:212).
- flavor root vs nonRoot_game: os dois únicos product flavors. `root` (maxSdk 25, applicationId com.limelight.root, BuildConfig.ROOT_BUILD=true) inclui o binário nativo evdev_reader e a classe EvdevCaptureProvider; `nonRoot_game` (applicationId com.limelight) não. Cruzados com debug/release dão 4 variants.
- EvdevCaptureProviderShim: ponte por reflexão (binding/input/evdev/EvdevCaptureProviderShim.java) que permite ao flavor não-root compilar sem a classe EvdevCaptureProvider, que só existe no source set root.
- InputCaptureProvider: abstração de captura de ponteiro/mouse com 4 implementações escolhidas por InputCaptureManager (Android nativo API 26+, PointerIcon, Shield, Null) + a variante evdev do flavor root.
- AdapterFragment / AdapterFragmentCallbacks: par genérico usado por PcView e AppView para inflar o grid (PcGridAdapter ou AppGridAdapter) num Fragment do framework legado; a Activity implementa os callbacks getAdapterFragmentLayoutId() e receiveAbsListView().
- tombstonePrefs / DecoderTombstone: SharedPreferences que conta crashes do MediaCodec entre execuções (Game.java:355, UiHelper.showDecoderCrashDialog:182).
- PanZoomHandler: utils/PanZoomHandler.java — aplica scale/translate no SurfaceView para zoom e pan do vídeo. Precisa ser reavaliado (handleSurfaceChange) sempre que o layout do stream mudar de tamanho.
