# Delta Artemis vs Moonlight upstream — o que o fork ClassicOldSong adicionou sobre moonlight-stream/moonlight-android

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (16)
6. [Ideias de melhoria](#ideias-de-melhoria) (9)
7. [Glossário](#glossário)

## Como funciona

O repo local está na branch `dev`, que aponta para o mesmo commit de `moonlight-noir` e de `upstream/moonlight-noir` (3397ec7750969466ad8983364ee1a33182bbffa1) — ou seja, todo o código analisado é Artemis upstream puro; só `CLAUDE.md`, `AGENTS.md`, `docs/` e `tools/` estão untracked (trabalho do Rafael). Contra `moonlight/master` (merge-base f10085f5) são 568 commits exclusivos (519 sem merges), 354 arquivos alterados, +54.782/−29.266 linhas. Boa parte do volume bruto é ruído de CRLF: com `--ignore-cr-at-eol`, ControllerHandler.java cai de 6.737 para 559 linhas de delta, enquanto Game.java mantém ~2.501 linhas adicionadas (é o real epicentro do fork). O fork adiciona 45 classes Java novas em `app/src/main`, 6 layouts novos, 133 chaves de preferência (contra 47 no upstream) e sobe toda a stack (AGP 8.13.0, compileSdk 36, appcompat/preference/material/recyclerview, Gson, LiteRT, OpenCV 4.12, MPAndroidChart, SearchPreference). Os eixos do delta são sete. (1) Integração com o host Apollo: virtual display por cliente (`virtualDisplay=1` no launch), `scaleFactor`, server commands sobre o control stream, clipboard sync bidirecional via HTTP, pareamento OTP com passphrase (`otpauth` = SHA-256 de pin+salt+passphrase), leitura e exibição do bitmap de permissões, app UUID e FPS fracionário (fps×1000). (2) Reescrita da entrada: `TrackpadContext` novo com aceleração/momentum/flick, gestos de 3/4/5 dedos, seis modos de mouse trocáveis em tempo real, teclado virtual completo em overlay (`KeyBoardLayoutController` + `layout_axixi_keyboard.xml`, 874 linhas), teclado de teclas especiais editável (`KeyBoardController`), modificadores sticky por long-press, e um `KeyboardAccessibilityService` que sequestra teclas físicas do sistema. (3) Display externo/secundário: `ExternalDisplayControlActivity` roda no display primário como touchpad + menu enquanto o `Game` roda no secundário, com notificação sticky, dimming por inatividade e — único lugar do app — tratamento de insets de IME. (4) Perfis de configuração (`SettingsProfile` + `OverlaySharedPreferences`) que sobrepõem SharedPreferences sem gravá-las. (5) Modo Stereo3D por IA: MiDaS v2 TFLite de 17 MB embarcado nos assets, OpenCV e shaders DIBR dentro de `Stereo3DRenderer`, orquestrado pelo novo `StreamContainer` que substituiu o `StreamView` no layout. (6) Pan/zoom do vídeo com rotação em jogo, PiP e botões flutuantes. (7) Tuning agressivo de decoder (MediaTek/Qualcomm/NVIDIA/Tegra, "ultra low latency", latest-frame rendering, warp factor). Para o dono do fork o ponto crítico é: o commit-text (`checkbox_enable_commit_text`, default off) já existe e funciona via `StreamContainer.onCreateInputConnection()` → `Game.handleCommitText()` → fila de chunks UTF-8 de 512 bytes → `MoonBridge.sendUtf8Text()` → `LiSendUtf8TextEvent`; mas o `StreamView.java` citado no CLAUDE.md está morto (não é mais referenciado por layout nem por código, só por teste). E o redimensionamento tipo AnyDesk não existe: o `Game` adiciona `FLAG_FULLSCREEN` + `FLAG_LAYOUT_IN_SCREEN` + `SYSTEM_UI_FLAG_IMMERSIVE_STICKY`, não declara `windowSoftInputMode` no manifest e não escuta insets de IME em lugar nenhum.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4348 | God-class da Activity de stream, onde a maior parte do delta Artemis aterrissou (~2.501 linhas adicionadas contra o upstream, ignorando CRLF). Concentra as flags de janela que bloqueiam o comportamento AnyDesk, o pipeline de commit-text, os gestos multi-touch, os seis modos de mouse, clipboard sync, server commands e a montagem do StreamConfiguration com virtual display. |
| [`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`](../../app/src/main/java/com/limelight/nvstream/http/NvHTTP.java) | 938 | Toda a camada HTTP com o host. É onde o Artemis quebra a compatibilidade de identidade com o Moonlight vanilla e adiciona os campos Apollo (virtual display, server commands, permissões, clipboard, appuuid, scaleFactor, fps fracionário). |
| [`app/src/main/java/com/limelight/ui/StreamContainer.java`](../../app/src/main/java/com/limelight/ui/StreamContainer.java) | 273 | FrameLayout novo que substituiu o StreamView no activity_game.xml. Escolhe entre SurfaceView (2D) e GLSurfaceView + Stereo3DRenderer (3D/3D-movie), faz o aspect-ratio, e é o ponto vivo de interceptação de commitText do teclado virtual do sistema. |
| [`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`](../../app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java) | 566 | Activity de controle para display externo: roda no display primário como touchpad/menu enquanto o Game roda no secundário. É o ÚNICO lugar do app que trata insets de IME — precedente direto para implementar o comportamento AnyDesk no Game. |
| [`app/src/main/java/com/limelight/PcView.java`](../../app/src/main/java/com/limelight/PcView.java) | 933 | Lista de hosts. Ganhou pareamento OTP com passphrase (Apollo), atalho para a web UI do host, e recebe pin/passphrase via deep link art://. |
| [`app/src/main/java/com/limelight/AppView.java`](../../app/src/main/java/com/limelight/AppView.java) | 795 | Lista de apps. Ganhou o menu de contexto "Start in Virtual Display", o diálogo de aviso quando o host não suporta vdisplay, ocultar apps, ordenação e exportação de arquivo .art. |
| [`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 1041 | Objeto de configuração; passou de 47 para 133 chaves de preferência. Lê via ProfilesManager.getOverlayingSharedPreferences, então perfis se aplicam de forma transparente. É o arquivo com maior fan-in do projeto. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java) | 379 | Teclado virtual COMPLETO do Artemis: infla layout_axixi_keyboard.xml (874 linhas de TextViews com android:tag = keycode) dentro do FrameLayout raiz do Game, em overlay sobre o stream. Modificadores sticky por long-press, popup da tecla, haptics, alinhamento e tamanho configuráveis. |
| [`app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java`](../../app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java) | 239 | Modelo do host. Ganhou os campos Apollo (permission, vDisplaySupported, vDisplayDriverReady, serverCommands, runningGameUUID) e a decodificação documentada do bitmap de permissões do Apollo em toString(). |
| [`app/src/main/java/com/limelight/utils/ServerHelper.java`](../../app/src/main/java/com/limelight/utils/ServerHelper.java) | 274 | Fábrica dos Intents de start. Decide entre lançar o Game direto ou embrulhá-lo em ExternalDisplayControlActivity, e propaga vDisplay + serverCommands para o Game. |
| [`app/src/main/java/com/limelight/GameMenu.java`](../../app/src/main/java/com/limelight/GameMenu.java) | 348 | Quick menu do jogo (não existe no upstream). Disconnect/quit, upload/fetch clipboard, server commands do Apollo, toggle de teclado/IME/OSC, zoom, rotação, atalhos de teclas customizáveis vindos de JSON. |
| [`app/src/main/java/com/limelight/nvstream/http/PairingManager.java`](../../app/src/main/java/com/limelight/nvstream/http/PairingManager.java) | 356 | Pareamento. O delta é pequeno mas crítico: assinatura pair() ganhou passphrase e o parâmetro otpauth do Apollo. |
| [`app/src/main/java/com/limelight/profiles/ProfilesManager.java`](../../app/src/main/java/com/limelight/profiles/ProfilesManager.java) | 265 | Perfis de configuração persistidos em files/profiles/profiles.json via Gson. O truque central é OverlaySharedPreferences, que sobrepõe um Map<String,Object> por cima das SharedPreferences reais sem gravar nada. |
| [`app/src/main/java/com/limelight/utils/Stereo3DRenderer.java`](../../app/src/main/java/com/limelight/utils/Stereo3DRenderer.java) | 1148 | Renderer OpenGL ES 3 que roda o modelo MiDaS v2 (TFLite quantizado w8a8, 17 MB em assets) para estimar profundidade e sintetizar SBS 3D com DIBR + blur bilateral. Usa PBOs, delegates GPU/NNAPI com fallback CPU e OpenCV para pós-processamento. |
| [`app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java) | 485 | Modo trackpad novo do Artemis (o upstream só tinha AbsoluteTouchContext e RelativeTouchContext). Implementa aceleração, momentum/flick com atrito, scroll de dois dedos, clique do meio com três dedos, drag&drop e swap de eixos. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java) | 795 | Overlay de teclas especiais editável (mover/redimensionar/desabilitar botões, adicionar teclas customizadas). Carrega assets/config/keyboard.json e assets/config/specialbuttons.json; layout persistido e importável/exportável. |
| [`app/src/main/java/com/limelight/KeyboardAccessibilityService.java`](../../app/src/main/java/com/limelight/KeyboardAccessibilityService.java) | 71 | AccessibilityService com FLAG_REQUEST_FILTER_KEY_EVENTS que intercepta teclas físicas antes do sistema (para mandar Win/Home/atalhos ao host em vez de o Android consumi-los). Whitelist só de volume e power. |
| [`app/src/main/java/com/limelight/nvstream/StreamConfiguration.java`](../../app/src/main/java/com/limelight/nvstream/StreamConfiguration.java) | 261 | Config de stream. refreshRate/launchRefreshRate viraram float e são codificados como fps×1000 quando fracionários; ganhou virtualDisplay, resolutionScaleFactor e enableUltraLowLatency. |
| [`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`](../../app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java) | 426 | Fronteira JNI. Delta pequeno mas load-bearing: dois nativos novos que só existem no fork do moonlight-common-c do ClassicOldSong. |
| [`app/src/main/jni/moonlight-core/simplejni.c`](../../app/src/main/jni/moonlight-core/simplejni.c) | 200 | Cola JNI. Ganhou os dois wrappers correspondentes. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c`](../../app/src/main/jni/moonlight-core/moonlight-common-c) | 0 | Submódulo apontando para github.com/ClassicOldSong/moonlight-common-c (commit c999436), NÃO para o upstream moonlight-stream. Traz dois commits exclusivos: 84af637 'Add server cmd support over Control Stream' e c999436 'Add send empty payload method'. Editar aqui diverge do upstream duas vezes. |
| [`app/src/main/java/com/limelight/ui/StreamView.java`](../../app/src/main/java/com/limelight/ui/StreamView.java) | 167 | CÓDIGO MORTO. Era a view de stream do upstream; foi substituída por StreamContainer no activity_game.xml e no Game.java. Nenhum layout ou classe de produção a referencia — só o teste StreamViewCommitTextTest. Contém uma cópia da lógica de commitText que NÃO está no caminho executado. |
| [`app/src/main/java/com/limelight/ui/ExternalControllerView.java`](../../app/src/main/java/com/limelight/ui/ExternalControllerView.java) | 93 | Terceira cópia (quase idêntica) da lógica de commitText/onKeyPreIme, usada como root view da ExternalDisplayControlActivity. |
| [`app/src/main/res/xml/preferences.xml`](../../app/src/main/res/xml/preferences.xml) | 1026 | Árvore de preferências: 133 chaves contra 47 do upstream (+906/−167 linhas). Onde vivem as opções Apollo-dependentes e as de teclado. |
| [`app/src/main/java/com/limelight/preferences/StreamSettings.java`](../../app/src/main/java/com/limelight/preferences/StreamSettings.java) | 1759 | Tela de configurações reescrita: entradas de resolução/FPS nativas e customizadas, import/export de layout de teclado, atalho para DebugInfoActivity, perfis, busca (removida em 15122dd1), tema escuro. |
| [`app/src/main/java/com/limelight/utils/PanZoomHandler.java`](../../app/src/main/java/com/limelight/utils/PanZoomHandler.java) | 173 | Pan/zoom do vídeo (ScaleGestureDetector + GestureDetector) com clamp de bordas, modo top-align para dobráveis e persistência opcional da escala/offset. |
| [`app/src/main/java/com/limelight/binding/input/driver/ProConController.java`](../../app/src/main/java/com/limelight/binding/input/driver/ProConController.java) | 485 | Driver USB novo para Nintendo Switch Pro Controller (VID 0x057e, PID 0x2009): handshake, calibração de sticks lida da SPI, IMU, rumble HD. |
| [`app/src/main/java/com/limelight/nvstream/NvConnection.java`](../../app/src/main/java/com/limelight/nvstream/NvConnection.java) | 1219 | Orquestração de launch/resume. Ganhou retry com backoff (5 tentativas, 2s), resume por appUUID, tratamento especial de InputOnly e sendExecServerCmd. |
| [`app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java`](../../app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java) | 1195 | Onde vive o tuning de decoder do fork: flags de baixa latência por fabricante (MediaTek, Qualcomm OMX e C2, NVIDIA/Tegra), helper safeSet e o modo ultra-low-latency escalonado por tryNumber. |
| [`app/src/main/AndroidManifest.xml`](../../app/src/main/AndroidManifest.xml) | 270 | Delta de manifest: application ArtemisApplication, receiver e activity de display externo, activities de perfis, deep link art://, intent-filter para arquivos .art, AccessibilityService, FileProvider, POST_NOTIFICATIONS/REORDER_TASKS, glEsVersion 3.0 obrigatório. Removeu isGame/appCategory=game (workaround Flyme). |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/Game.java`**
- `EXTRA_VDISPLAY / EXTRA_SERVER_COMMANDS :267-268`
- `CLIPBOARD_IDENTIFIER :271`
- `UTF8_CHUNK_SIZE=512 / commitTextQueue / commitTextHandler :313-315`
- `flushCommitTextQueue (envia 1 chunk a cada 15ms) :317-331`
- `backgroundPing (sendEmptyPayload a cada 20ms, prevent packet loss) :333-338`
- `onCreate: FLAG_FULLSCREEN + SYSTEM_UI_FLAG_LAYOUT_* :357-367`
- `getWindow().addFlags(FLAG_LAYOUT_IN_SCREEN) :369`
- `streamContainer.setCommitTextEnabled(prefConfig.enableCommitText) :464`
- `StreamConfiguration com setVirtualDisplay/setResolutionScaleFactor/setEnableUltraLowLatency :779-802`
- `trackpadContextMap com swapAxis+sensitivity :816-818`
- `REMOTE_INPUT_UUID => força trackpad, isInputOnly :820-834`
- `initKeyboardController() :1091`
- `isKeyboardLayoutVisible() :1097`
- `initkeyBoardLayoutController() :1107-1111`
- `toggleKeyboardController() :1114-1120`
- `toggleFullKeyboard() :1122-1132`
- `toggleVirtualController() :1135-1142`
- `shouldIgnoreInsetsForResolution() :1425-1443`
- `isOnExternalDisplay() :1451`
- `prepareDisplayForRendering() :1455`
- `hideSystemUi Runnable (IMMERSIVE_STICKY) :1646-1669`
- `onMultiWindowModeChanged (readiciona FLAG_FULLSCREEN incondicional) :1681-1699`
- `getClipboardContent/cloneClipData :2246-2302`
- `sendClipboard(boolean force) :2304-2337`
- `getClipboard(int delay) :2339-2389`
- `toggleKeyboard() (só toggleSoftInput) :2401-2410`
- `getStreamViewRelativeSensitivityXY :2457`
- `handleTouchInput :3121-3287`
- `handleMultiTouchGesture (3 dedos=IME, 4=teclado full, 5=menu) :3288-3334`
- `sendExecServerCmd(int) :3981-3983`
- `getServerCmds() :3985-3987`
- `toggleZoomMode() :3992`
- `rotateScreen() :4006`
- `initMouseMode() :4032-4074`
- `selectMouseMode(Context) :4091-4137`
- `applyMouseMode(int) :4153-4193`
- `handleCommitText(CharSequence) :4290-4296`
- `handleDeleteSurroundingText(int,int) :4298-4312`
- `enqueueCommitText(String) :4314-4334`

**`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`**
- `this.uniqueId = uniqueId (upstream usava fixo "0123456789ABCDEF") :205`
- `this.deviceName = DeviceUtils.getModel() :207`
- `getXmlArray() (parse de tags repetidas) :285-320`
- `leitura de <Permission> para details.permission :412-419`
- `details.vDisplaySupported / vDisplayDriverReady :432-435`
- `details.serverCommands = getServerCmds() :437`
- `getCurrentGameUUID() :452-454`
- `getCompleteUrl: addQueryParameter("devicename") :478`
- `getServerSupportsVDisplay(<VirtualDisplayCapable>) :550-557`
- `getServerVDisplayDriverReady(<VirtualDisplayDriverReady>) :559-566`
- `getServerCmds(<ServerCommand>) :568-570`
- `executePairingCommand (removeu devicename=roth) :799-802`
- `launchApp(ctx, verb, appUUID, appId, hdr) :849`
- `&scaleFactor= :882`
- `&virtualDisplay= :887`
- `getClipboard() GET actions/clipboard?type=text :922-926`
- `sendClipboard(String) POST actions/clipboard :929-937`

**`app/src/main/java/com/limelight/ui/StreamContainer.java`**
- `enum StreamMode {MODE_2D, MODE_AI_3D, MODE_AI_3D_MOVIE} :36-40`
- `init(Game, PreferenceConfiguration) :65-100`
- `onMeasure com fillDisplay :113-150`
- `setCommitTextEnabled(boolean) :156-158`
- `onKeyPreIme :160-170`
- `onCheckIsTextEditor :180-183`
- `onCreateInputConnection -> BaseInputConnection.commitText/deleteSurroundingText :185-202`
- `surfaceCreated/Changed/Destroyed delegando ao Game :235-258`
- `onStereo3DSurfaceReady :260-266`

**`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`**
- `toggleKeyboard()/toggleFullKeyboard()/toggleGameMenu() estáticos :93-109`
- `initViews: setDecorFitsSystemWindows(false) + setOnApplyWindowInsetsListener + insets.isVisible(Type.ime()) :169-176`
- `updateKeyboardVisibility(boolean) :242-255`
- `setupInactivityTimeoutForBrightness (dim após 10s) :226-240`
- `createProgrammaticUI (botões zoom/menu/close/IME/full keyboard) :386-443`
- `_toggleKeyboard() (InputMethodManager.toggleSoftInput) :448-452`
- `initFullKeyboard/_toggleFullKeyboard :454-470`
- `showStickyNotification :526-548`

**`app/src/main/java/com/limelight/PcView.java`**
- `PAIR_ID_OTP = 21 :138`
- `pendingPairingPassphrase (extra do deep link) :260`
- `doPair(computer, otp, passphrase) :470-582`
- `pm.pair(serverInfo, pinStr, passphrase) :518`
- `doOTPPair(computer) — dialog PIN 4 dígitos + passphrase >=4 :584-627`
- `OPEN_MANAGEMENT_PAGE_ID handler :811-818`
- `ComputerObject.guessManagementUrl() (porta HTTP+1, https) :928-931`

**`app/src/main/java/com/limelight/AppView.java`**
- `START_WITH_VDISPLAY = 20 / START_WITH_QUIT_VDISPLAY = 21 :82-83`
- `onCreateContextMenu (inverte a ordem conforme prefConfig.useVirtualDisplay) :443-498`
- `checagem computer.vDisplaySupported && computer.vDisplayDriverReady :513, :540, :760`
- `EXPORT_LAUNCHER_FILE_ID handler :602-617`

**`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`**
- `ENABLE_ULTRA_LOW_LATENCY_PREF_STRING :47`
- `USE_VIRTUAL_DISPLAY_PREF_STRING = checkbox_use_virtual_display :49`
- `RESOLUTION_SCALE_FACTOR_PREF_STRING :51`
- `FULL_SCREEN_PREF_STRING = checkbox_full_screen :96`
- `CHECKBOX_SMART_CLIPBOARD_SYNC / _TOAST / HIDE_CLIPBOARD_CONTENT :108-110`
- `SEEKBAR_TRACKPAD_SENSITIVITY_X/Y, DRAG_DROP_THRESHOLD, SWAP_AXIS :133-137`
- `CHECKBOX_ENABLE_COMMIT_TEXT = checkbox_enable_commit_text :139`
- `DEFAULT_ENABLE_COMMIT_TEXT = false :208`
- `DEFAULT_FULL_SCREEN = true :215`
- `RES_NATIVE = "Native" (declarado e nunca usado) :228`
- `public float fps (era int no upstream) :231`
- `isNativeResolution(int,int) :395-417`
- `isSquarishScreen :421-442`
- `config.useVirtualDisplay :881`
- `config.fullScreen :888`
- `config.resolutionScaleFactor :943`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java`**
- `MODIFIER_KEY_CODES / SPECIAL_KEY_CODES :38-80`
- `initKeyboard() com OnTouchListener por tecla :120-259`
- `initKeyPopup() :261-277`
- `isKeyboardVisible() :279-281`
- `hide(boolean temporary) / show() / toggleVisibility() :283-319`
- `refreshLayout() — LayoutParams gravity BOTTOM, altura = 50% da tela por padrão :321-357`
- `sendKeyEvent -> Game.instance.onKey :364-374`
- `interface ViewCallbacks.onKeyboardControllerVisibilityChange :376-378`

**`app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java`**
- `public int permission = -1 :75`
- `runningGameUUID :81`
- `vDisplaySupported / vDisplayDriverReady :86-87`
- `List<String> serverCommands :90`
- `update(ComputerDetails) propagando os novos campos :123-168`
- `toString() com o enum PERM do Apollo comentado e a decodificação bit a bit :170-238`

**`app/src/main/java/com/limelight/utils/ServerHelper.java`**
- `getActiveDisplay(Context, PreferenceConfiguration) :64-71`
- `getSecondaryDisplay(Context) :73-91`
- `createStartIntent(..., boolean withVDisplay) :93-138`
- `EXTRA_VDISPLAY / EXTRA_SERVER_COMMANDS :115-116`
- `embrulho em ExternalDisplayControlActivity quando enableFullExDisplay :126-135`
- `doStart(...) :141-155`
- `doQuit com tratamento do erro 599 (sessão de outro device) :189-244`

**`app/src/main/java/com/limelight/GameMenu.java`**
- `MenuOption (label, withGameFocus, runnable) :42-56`
- `showSpecialKeysMenu() com atalhos built-in + custom via KeyConfigHelper/KeyMapper :155-243`
- `showAdvancedMenu(GameInputDevice) :245-272`
- `showServerCmd(ArrayList<String>) -> game.sendExecServerCmd(index) :274-286`
- `showMenu(GameInputDevice) :288-334`

**`app/src/main/java/com/limelight/nvstream/http/PairingManager.java`**
- `pair(String serverInfo, String pin, String passphrase) :187`
- `SHA-256 de (pin + saltHex + passphrase) :214-221`
- `pairingArguments += "&otpauth=" + hexString :223`

**`app/src/main/java/com/limelight/profiles/ProfilesManager.java`**
- `PROFILES_DIR/PROFILES_FILE :30-31`
- `load(Context) :49-100`
- `save(Context) :102-131`
- `setActive(UUID) / getActive() :158-166`
- `getOverlayingSharedPreferences(Context) :200-207`
- `class OverlaySharedPreferences (edit() delega ao base — escrita ignora o patch) :212-258`

**`app/src/main/java/com/limelight/utils/Stereo3DRenderer.java`**
- `AI_MODEL = "midas-midas-v2-w8a8.tflite" :55`
- `modelInputWidth/Height = 256 :56-57`
- `isMovieMode :65`
- `pboHandles / pboIndex :61-62`
- `GpuDelegate / NnApiDelegate / Interpreter :105-108`
- `OnSurfaceReadyListener.onStereo3DSurfaceReady`

**`app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java`**
- `TAP_MOVEMENT_THRESHOLD=30 / TAP_TIME_THRESHOLD=230 :42-43`
- `SCROLL_SPEED_FACTOR_X=2 / _Y=3 :45-46`
- `ACCELERATION_THRESHOLD=8.0 / FLICK_FRICTION=0.93 / FLICK_THRESHOLD=0.8 :47-50`
- `TrackpadContext(conn, actionIndex, swapAxis, sensX, sensY) :61-66`
- `momentumRunnable :75-109`
- `scrollMomentumRunnable :111+`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java`**
- `enum ControllerMode {Active, MoveButtons, ResizeButtons, DisableEnableButtons} :51-56`
- `buttonConfigure/buttonClearAll/buttonAddKeys :71-73`
- `context.getAssets().open("config/keyboard.json") :416`

**`app/src/main/java/com/limelight/KeyboardAccessibilityService.java`**
- `BLACKLIST_KEYS (na verdade whitelist do que NÃO é interceptado) :15-19`
- `onKeyEvent -> Game.instance.handleKeyDown/handleKeyUp :22-49`
- `workaround scanCode==1 -> KEYCODE_ESCAPE (tablets Xiaomi) :31-34, :39-42`
- `onServiceConnected com AccessibilityServiceInfo :52-61`

**`app/src/main/java/com/limelight/nvstream/StreamConfiguration.java`**
- `private float refreshRate, launchRefreshRate :15-16`
- `private boolean virtualDisplay / int resolutionScaleFactor :17-18`
- `setVirtualDisplay/setResolutionScaleFactor :61-72`
- `setEnableUltraLowLatency :144-147`
- `getRefreshRate() com encoding ×1000 :182-188`
- `getLaunchRefreshRate() idem :190-196`

**`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`**
- `public static native void sendExecServerCmd(int cmdId) :357`
- `public static native void sendEmptyPayload() :359`
- `public static native void sendUtf8Text(String text) :396 (já existia no upstream)`

**`app/src/main/jni/moonlight-core/simplejni.c`**
- `Java_..._sendExecServerCmd -> LiSendExecServerCmd :18-22`
- `Java_..._sendEmptyPayload -> LiSendEmptyPayload :24-28`
- `Java_..._sendUtf8Text -> LiSendUtf8TextEvent :127-130`

**`app/src/main/jni/moonlight-core/moonlight-common-c`**
- `Limelight.h: int LiSendExecServerCmd(uint8_t cmdId) :569`
- `Limelight.h: int LiSendEmptyPayload() :573`
- `Limelight.h: int LiSendUtf8TextEvent(const char*, unsigned int) :715`

**`app/src/main/java/com/limelight/ui/StreamView.java`**
- `setCommitTextEnabled(boolean) :36-43`
- `onCreateInputConnection :130-157`
- `interface InputCallbacks :159-166`

**`app/src/main/java/com/limelight/ui/ExternalControllerView.java`**
- `setCommitTextEnabled(boolean) :20-27`
- `onCreateInputConnection :58-84`
- `interface InputCallbacks :86-92`

**`app/src/main/res/xml/preferences.xml`**
- `checkbox_ultra_low_latency :70-72`
- `checkbox_use_virtual_display :82-84`
- `seekbar_resolution_scale_factor :112-116`
- `custom_refresh_rate :152-157`
- `checkbox_enable_commit_text (default false) :477-482`
- `checkbox_smart_clipboard_sync :509-511`
- `checkbox_full_screen :552-554`
- `seekbar_keyboard_axi_opacity :559`
- `onscreen_keyboard_autofit / height / width / align :569-601`
- `checkbox_enable_sticky_modifier_key_virtual_keyboard :604-606`
- `checkbox_enable_keyboard + import/export/reset keyboard :746-805`
- `checkbox_prevent_packet_loss :972-974`

**`app/src/main/java/com/limelight/preferences/StreamSettings.java`**
- `addNativeResolutionEntry(...) :196-233`
- `addNativeResolutionEntries :235-240`
- `addNativeFrameRateEntry(float, boolean) :242-266`
- `custom resolution parse :436`
- `custom refresh rate :449`
- `import_keyboard_file :743`
- `export_keyboard_file :822`
- `atalho para DebugInfoActivity :854`

**`app/src/main/java/com/limelight/utils/PanZoomHandler.java`**
- `MAX_SCALE = 10.0f :14`
- `constrainToBounds() :54-77`
- `handleSurfaceChange() :79-109`
- `ScaleListener.onScale :112-137`
- `setInitialZoomAndPan(float,float,float) :159-168`

**`app/src/main/java/com/limelight/binding/input/driver/ProConController.java`**
- `canClaimDevice (0x057e/0x2009) :45-47`
- `stickCalibration[2][2][3] / stickExtends :43-44`
- `createInputThread com handshake :57+`
- `rumble(short,short) :263`
- `rumbleTriggers (no-op) :291-292`

**`app/src/main/java/com/limelight/nvstream/NvConnection.java`**
- `resume por currentgameuuid :314-322`
- `InputOnly não termina o app corrente :321-323`
- `launchNotRunningApp com appUUID :375-380`
- `loop de retry (tryCount<5, sleep 2000) :396-450`
- `sendExecServerCmd(int) :484-488`

**`app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java`**
- `setDecoderLowLatencyOptions(format, info, ultraLowLatency, tryNumber) :533-660+`
- `safeSet(...)`
- `flags NVIDIA/Tegra :541-547`
- `vdec-lowlatency (MediaTek) :562-579`
- `KEY_OPERATING_RATE/KEY_PRIORITY :581-590`
- `vendor.qti-ext-* (Snapdragon 8 Gen2/8s Gen3/Elite) :602-625`

**`app/src/main/AndroidManifest.xml`**
- `android:name=".ArtemisApplication"`
- `intent-filter pathPattern .*\.art (PcView) :116-127`
- `intent-filter scheme art (AddComputerManually) :186-191`
- `activity .utils.ExternalDisplayControlActivity singleInstance :undefined`
- `service KeyboardAccessibilityService`
- `provider androidx.core.content.FileProvider`
- `activity .Game sem windowSoftInputMode :194-203`

</details>

## Fluxo

FLUXO A — Launch com virtual display (Apollo): usuário faz long-press num app → `AppView.onCreateContextMenu` (AppView.java:443-472) mostra "Start in Virtual Display" ou "Start on primary display" dependendo de `prefConfig.useVirtualDisplay` → `onContextItemSelected` (AppView.java:509-552) checa `computer.vDisplaySupported && computer.vDisplayDriverReady`; se falso chama `UiHelper.displayVdisplayConfirmationDialog` (UiHelper.java:253-266) que só avisa e permite prosseguir → `ServerHelper.doStart(..., withVDisplay)` (ServerHelper.java:141-155) → `createStartIntent` (ServerHelper.java:93-138) coloca `EXTRA_VDISPLAY` e `EXTRA_SERVER_COMMANDS` no Intent, e se `enableFullExDisplay` embrulha tudo num Intent para `ExternalDisplayControlActivity` → `Game.onCreate` lê `vDisplay`/`serverCommands` (Game.java:573-574) → monta `StreamConfiguration` com `.setVirtualDisplay(vDisplay)` e `.setResolutionScaleFactor(prefConfig.resolutionScaleFactor)` (Game.java:786-787) → `NvConnection` → `NvHTTP.launchApp` (NvHTTP.java:849) que serializa `&virtualDisplay=0|1` (NvHTTP.java:887) e `&scaleFactor=N` (NvHTTP.java:882) na query de `/launch`. Do lado da descoberta, `getComputerDetails` (NvHTTP.java:432-437) lê `<VirtualDisplayCapable>` e `<VirtualDisplayDriverReady>` do `/serverinfo`; hosts que não emitem essas tags ficam com `vDisplaySupported=false`.

FLUXO B — Pareamento OTP (Apollo): menu de contexto do PC → `PAIR_ID_OTP` (PcView.java:138, 741-742) → `doOTPPair` (PcView.java:584-627) monta um dialog com PIN de 4 dígitos + passphrase (mín. 4) → `doPair(computer, otp, passphrase)` (PcView.java:470) → `PairingManager.pair(serverInfo, pin, passphrase)` (PairingManager.java:187) → calcula SHA-256 de `pin + saltHex + passphrase`, hex maiúsculo (PairingManager.java:214-221) → anexa `&otpauth=<hash>` aos argumentos de `/pair?phrase=getservercert` (PairingManager.java:223) → `NvHTTP.executePairingCommand` (NvHTTP.java:799). Alternativamente o pin/passphrase chegam por deep link `art://host:port?pin=&passphrase=` interceptado por `AddComputerManually` (AddComputerManually.java:205-216), que reencaminha para `PcView` via extras lidos em PcView.java:260.

FLUXO C — Commit-text (o que o dono do fork quer, parcialmente pronto): `Game.onCreate` faz `streamContainer.setCommitTextEnabled(prefConfig.enableCommitText)` (Game.java:464) → quando o IME abre, o Android chama `StreamContainer.onCheckIsTextEditor()` (StreamContainer.java:180-183) e `onCreateInputConnection` (StreamContainer.java:185-202), que devolve uma `BaseInputConnection` anônima → o teclado (swipe/voz/predição) chama `commitText(text, pos)` → `Game.handleCommitText` (Game.java:4290-4296) → `enqueueCommitText` (Game.java:4314-4334) fatia o texto em chunks de ≤512 bytes UTF-8 respeitando fronteiras de code point → `flushCommitTextQueue` (Game.java:317-331) despacha 1 chunk a cada 15 ms no main looper → `conn.sendUtf8Text(chunk)` → `MoonBridge.sendUtf8Text` (MoonBridge.java:396) → `Java_..._sendUtf8Text` (simplejni.c:127-130) → `LiSendUtf8TextEvent` (Limelight.h:715). `deleteSurroundingText` vira N pares KEY_DOWN/KEY_UP de VK_BACK (Game.java:4298-4312). A preferência nasce desligada (PreferenceConfiguration.java:208).

FLUXO D — Server commands (Apollo): `/serverinfo` traz N tags `<ServerCommand>` → `NvHTTP.getServerCmds` usa o novo `getXmlArray` (NvHTTP.java:285-320, 568-570) → `ComputerDetails.serverCommands` → `ServerHelper.createStartIntent` empacota como `ArrayList<String>` em `EXTRA_SERVER_COMMANDS` (ServerHelper.java:116) → `Game.serverCommands` (Game.java:574) → `GameMenu.showMenu` → item "Server Command" (GameMenu.java:301-315) → se lista vazia mostra diálogo pedindo Apollo + permissão; senão `showServerCmd` (GameMenu.java:274-286) → `game.sendExecServerCmd(indice)` (Game.java:3981) → `NvConnection.sendExecServerCmd` (NvConnection.java:484) → `MoonBridge.sendExecServerCmd` (MoonBridge.java:357) → `LiSendExecServerCmd` (simplejni.c:18-22, Limelight.h:569) — pacote novo no control stream, existente só no fork do moonlight-common-c.

FLUXO E — Clipboard sync (Apollo): ao conectar/retomar, `Game.sendClipboard(force)` (Game.java:2304) lê o clipboard local marcando-o como "visitado" via extras `ArtemisStreaming` para não ecoar (Game.java:2246-2302) e faz `POST /actions/clipboard?type=text` (NvHTTP.java:929); ao perder foco, `Game.getClipboard(delay)` (Game.java:2339) faz `GET /actions/clipboard?type=text` (NvHTTP.java:922) e escreve no clipboard local marcado como IS_SENSITIVE quando `hideClipboardContent`. Sunshine devolve 404 com corpo, e o código trata isso como "não suportado" (NvHTTP.java:932-936).

FLUXO F — Teclado virtual próprio (overlay, não empurra a tela): quatro dedos ou item do menu → `Game.toggleFullKeyboard()` (Game.java:1122-1132) → `initkeyBoardLayoutController()` (Game.java:1107) → `new KeyBoardLayoutController(rootView, this, prefConfig)` infla `layout_axixi_keyboard.xml` → `refreshLayout()` (KeyBoardLayoutController.java:321-357) adiciona a view ao FrameLayout raiz com `gravity=BOTTOM` e altura = 50% da tela (ou dimensões manuais) → cada tecla é um TextView cujo `android:tag` é o keycode Android; o OnTouchListener (KeyBoardLayoutController.java:120-259) fabrica um `KeyEvent` e chama `Game.instance.onKey(...)`. Como é um filho do mesmo FrameLayout do `StreamContainer`, ele COBRE o stream — mesmo problema que o IME do sistema.

FLUXO G — Display externo: `ServerHelper.createStartIntent` detecta display secundário e cria o `Game` num `createDisplayContext` (ServerHelper.java:99-104), passando `EXTRA_DISPLAY_ID`, e retorna um Intent para `ExternalDisplayControlActivity` (ServerHelper.java:126-135) → essa Activity roda no display primário, instancia um `GameMenu` apontando para `Game.instance`, e repassa todos os eventos de toque/tecla via `Game.instance.handleMotionEvent/handleKeyDown/...` (ExternalDisplayControlActivity.java:186-384). `Game.onCreate` detecta `onExternelDisplay` e força resolução/refresh do painel externo, STRETCH e landscape (Game.java:397-416).

FLUXO H — Perfis: `ArtemisApplication.onCreate` carrega `profiles.json` (ArtemisApplication.java:9-15) → `ProfilesManager.getOverlayingSharedPreferences(context)` devolve um wrapper que consulta primeiro o Map do perfil ativo e cai no SharedPreferences real (ProfilesManager.java:200-258) → `PreferenceConfiguration.readPreferences` usa esse wrapper, então toda a app enxerga o perfil sem escrever nada em disco.

## Interfaces externas

- Apollo/Sunshine HTTP API (portas 47989 HTTP / 47984 HTTPS): /serverinfo, /applist, /appasset, /launch, /resume, /cancel, /pair — Artemis adiciona os campos <Permission>, <VirtualDisplayCapable>, <VirtualDisplayDriverReady>, <ServerCommand>, <currentgameuuid>, <UUID>, <IDX> e os parâmetros de query devicename, uniqueid, appuuid, virtualDisplay, scaleFactor, otpauth
- Apollo web UI: PcView.guessManagementUrl() assume https://<host>:<portaHTTP+1> (PcView.java:928-931)
- Apollo actions/clipboard: GET e POST text/plain em /actions/clipboard?type=text (NvHTTP.java:922-937)
- JNI moonlight-core: LiSendExecServerCmd(uint8_t) e LiSendEmptyPayload() — EXCLUSIVOS do fork ClassicOldSong/moonlight-common-c (commits 84af637 e c999436); LiSendUtf8TextEvent já é upstream
- Android WindowInsetsCompat.Type.ime() + WindowCompat.setDecorFitsSystemWindows — usado APENAS em ExternalDisplayControlActivity.java:169-176
- android.view.inputmethod.BaseInputConnection / EditorInfo / InputMethodManager.toggleSoftInput — 3 implementações duplicadas (StreamContainer, StreamView morto, ExternalControllerView)
- android.accessibilityservice.AccessibilityService com FLAG_REQUEST_FILTER_KEY_EVENTS (KeyboardAccessibilityService.java)
- android.hardware.display.DisplayManager + Activity.createDisplayContext + ActivityOptions.setLaunchDisplayId (ServerHelper.java, StartExternalDisplayControlReceiver.java)
- android.opengl.GLES30 / GLSurfaceView / SurfaceTexture — Stereo3DRenderer; manifest exige glEsVersion 0x00030000
- org.tensorflow.lite (com.google.ai.edge.litert:litert 1.4.0 + litert-gpu) com GpuDelegate e NnApiDelegate — inferência MiDaS
- org.opencv:opencv 4.12.0 — pós-processamento do depth map
- com.google.code.gson:gson 2.13.1 — perfis, atalhos customizados, layouts de teclado
- com.github.ByteHamster:SearchPreference v2.5.1 (busca em preferências, atualmente desativada) e com.github.PhilJay:MPAndroidChart v3.1.0 (chart overlay revertido em 0c0c53a2 mas dependência mantida)
- androidx.appcompat 1.7.1 / preference 1.2.1 / recyclerview 1.4.0 / cardview / material 1.13.0 — UI reescrita
- androidx.core.content.FileProvider (${applicationId}.fileprovider) para import/export de .art e layouts
- Deep link art:// e MIME de arquivo *.art (AndroidManifest.xml:116-127, 186-191)
- MediaCodec vendor extensions: vendor.qti-ext-dec-low-latency.enable, vendor.qti-ext-output-sw-fence-enable.value, vendor.qti-ext-output-fence.*, vdec-lowlatency (MediaTek/Amlogic), media.low-latency.enable e vendor.nvidia.disable-output-reorder (Tegra)
- USB Host API: driver novo para Nintendo Switch Pro Controller VID 0x057e PID 0x2009 (ProConController.java:45-47)
- Obtainium (URL de auto-update embutida via resValue em app/build.gradle), TrafficStats, NotificationCompat

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🟠 alto | maintainability | StreamView.java é código morto mas o CLAUDE.md aponta para ele como o caminho do commit-text | `app/src/main/java/com/limelight/ui/StreamView.java:130-157` |
| 🟠 alto | ux | Activity Game não declara windowSoftInputMode e não observa insets de IME — bloqueio raiz do comportamento AnyDesk | `app/src/main/AndroidManifest.xml:194-203` |
| 🟡 médio | tech-debt | Lógica de commitText triplicada em três views quase idênticas | `app/src/main/java/com/limelight/ui/StreamContainer.java:185-202` |
| 🟡 médio | bug | Game.onMultiWindowModeChanged readiciona FLAG_FULLSCREEN ignorando a preferência checkbox_full_screen | `app/src/main/java/com/limelight/Game.java:1693` |
| 🟡 médio | bug | OverlaySharedPreferences.edit() delega ao SharedPreferences base, ignorando silenciosamente o perfil ativo | `app/src/main/java/com/limelight/profiles/ProfilesManager.java:251` |
| 🟡 médio | compatibility | Artemis não reusa mais o uniqueId compartilhado do Moonlight — quebra o quit cross-client | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:205` |
| 🟡 médio | performance | Modelo TFLite de 17 MB embarcado no APK mesmo para quem nunca usa 3D | `app/src/main/assets/midas-midas-v2-w8a8.tflite:1` |
| 🟡 médio | ux | KeyboardAccessibilityService intercepta praticamente todas as teclas com uma 'blacklist' de apenas 3 | `app/src/main/java/com/limelight/KeyboardAccessibilityService.java:15-19` |
| 🟡 médio | maintainability | prepareDisplayForRendering e onCreate mutam prefConfig em memória, misturando configuração e estado | `app/src/main/java/com/limelight/Game.java:408-419` |
| ⚪ baixo | maintainability | Braço morto na conversão de FPS fracionário em NvHTTP.launchApp | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:854-862` |
| ⚪ baixo | tech-debt | PreferenceConfiguration.RES_NATIVE é declarado e nunca usado | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:228` |
| ⚪ baixo | performance | getCurrentGameUUID() reparseia o XML do serverinfo três vezes por tentativa de resume | `app/src/main/java/com/limelight/nvstream/NvConnection.java:314-316` |
| ⚪ baixo | compatibility | sendClipboard trata resposta vazia como sucesso, invertendo a semântica em hosts não-Apollo | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:929-937` |
| ⚪ baixo | maintainability | DeviceUtils.getModel usa replaceAll("\\s*", "") e o resultado vai em toda query HTTP | `app/src/main/java/com/limelight/utils/DeviceUtils.java:283-291` |
| ⚪ baixo | performance | Fila de commitText usa Handler do main looper e enfileira sem limite | `app/src/main/java/com/limelight/Game.java:313-331` |
| ⚪ baixo | tech-debt | Dependência MPAndroidChart mantida após o revert do Chart Overlay | `app/build.gradle:181` |

### Detalhe

#### 🟠 alto StreamView.java é código morto mas o CLAUDE.md aponta para ele como o caminho do commit-text

**Local:** `app/src/main/java/com/limelight/ui/StreamView.java:130-157` · **Categoria:** maintainability

O activity_game.xml trocou <com.limelight.ui.StreamView> por <com.limelight.ui.StreamContainer> e o Game.java só referencia `streamContainer` (Game.java:209, 461-464). Nenhum layout ou classe de produção instancia StreamView — a única referência viva é o teste app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java. Isso significa que (a) o teste valida um caminho que não roda, e (b) qualquer agente que siga o CLAUDE.md atual ("StreamView.onCreateInputConnection() já intercepta commitText") vai editar o arquivo errado e concluir que a mudança não teve efeito.

**Correção sugerida:** Ou apagar StreamView.java e reapontar o teste para StreamContainer, ou, se quiser manter por compatibilidade, marcar @Deprecated com um comentário explícito apontando para StreamContainer. Em qualquer caso corrigir o CLAUDE.md/AGENTS.md para citar StreamContainer.java:185-202 como o ponto vivo.

#### 🟠 alto Activity Game não declara windowSoftInputMode e não observa insets de IME — bloqueio raiz do comportamento AnyDesk

**Local:** `app/src/main/AndroidManifest.xml:194-203` · **Categoria:** ux

A entrada de .Game no manifest não tem android:windowSoftInputMode, e Game.java não tem nenhum setOnApplyWindowInsetsListener nem leitura de WindowInsetsCompat.Type.ime() (grep confirmado: as únicas ocorrências de WindowInsets em Game.java são o comentário TODO da linha 1649). Combinado com FLAG_FULLSCREEN (Game.java:359), FLAG_LAYOUT_IN_SCREEN (Game.java:369) e SYSTEM_UI_FLAG_IMMERSIVE_STICKY (Game.java:1666), o Android ignora adjustResize e o teclado simplesmente cobre o stream. O ExternalDisplayControlActivity prova que o padrão correto já é conhecido no codebase (setDecorFitsSystemWindows(false) + insets.isVisible(Type.ime()) em ExternalDisplayControlActivity.java:169-176).

**Correção sugerida:** Adicionar android:windowSoftInputMode="adjustResize" na Activity Game; quando prefConfig.fullScreen estiver ligado, não usar FLAG_FULLSCREEN e sim WindowInsetsControllerCompat.hide(Type.systemBars()) com BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE; registrar um ViewCompat.setOnApplyWindowInsetsListener no decorView que aplique bottom padding/margin no container quando Type.ime() estiver visível. Usar WindowInsetsCompat (não WindowInsets.Type.ime(), que é API 30+) por causa do minSdk 21.

#### 🟡 médio Lógica de commitText triplicada em três views quase idênticas

**Local:** `app/src/main/java/com/limelight/ui/StreamContainer.java:185-202` · **Categoria:** tech-debt

O mesmo bloco onCheckIsTextEditor + onCreateInputConnection + BaseInputConnection(commitText/deleteSurroundingText) + interface InputCallbacks aparece copiado em StreamContainer.java:180-202, StreamView.java:126-166 e ExternalControllerView.java:53-92. As três interfaces InputCallbacks têm assinaturas divergentes (a do StreamView tem isOnExternalDisplay(), a do ExternalControllerView não tem handleFocusChange). Qualquer evolução do input de texto (ex.: um campo de texto dedicado tipo AnyDesk) precisa ser feita em três lugares, e é fácil esquecer um.

**Correção sugerida:** Extrair um helper `CommitTextInputConnectionFactory` (ou uma classe base/delegate) em com.limelight.ui que receba um único callback e seja usada pelas views que precisam. Unificar a interface InputCallbacks com métodos default para o que é opcional.

#### 🟡 médio Game.onMultiWindowModeChanged readiciona FLAG_FULLSCREEN ignorando a preferência checkbox_full_screen

**Local:** `app/src/main/java/com/limelight/Game.java:1693` · **Categoria:** bug

onCreate só adiciona FLAG_FULLSCREEN quando `prefConfig.fullScreen` é true (Game.java:357-359), mas onMultiWindowModeChanged faz `getWindow().addFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)` incondicionalmente ao sair do multi-window/PiP. Com a preferência desligada, basta entrar e sair do PiP (ou do split-screen) para o app voltar a full-screen e nunca mais soltar — o que reintroduz exatamente o bloqueio que impede o IME de redimensionar a janela.

**Correção sugerida:** Guardar a chamada: `if (prefConfig.fullScreen) getWindow().addFlags(FLAG_FULLSCREEN);` e no ramo `isInMultiWindowMode` manter o clearFlags como está. Vale extrair um `applyFullscreenFlags(boolean)` único usado por onCreate e por onMultiWindowModeChanged.

#### 🟡 médio OverlaySharedPreferences.edit() delega ao SharedPreferences base, ignorando silenciosamente o perfil ativo

**Local:** `app/src/main/java/com/limelight/profiles/ProfilesManager.java:251` · **Categoria:** bug

`@Override public Editor edit() { return base.edit(); }`. Toda escrita feita através do wrapper vai para as preferências GLOBAIS, não para o perfil ativo. Isso morde na prática em Game.selectMouseMode (Game.java:4127-4132), que ao gravar `mouse_mode_list` com rememberMouseMode ligado escreve no global; se o perfil ativo tiver um override de mouse_mode_list, a leitura seguinte continuará devolvendo o valor do perfil e o usuário verá a escolha "não pegar".

**Correção sugerida:** Ou fazer edit() lançar UnsupportedOperationException para forçar o chamador a escolher explicitamente entre perfil e global, ou implementar um Editor que grave no Map do perfil ativo e chame ProfilesManager.update(). No mínimo, documentar o comportamento com um comentário no método.

#### 🟡 médio Artemis não reusa mais o uniqueId compartilhado do Moonlight — quebra o quit cross-client

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:205` · **Categoria:** compatibility

O upstream forçava `this.uniqueId = "0123456789ABCDEF"` de propósito, com o comentário 'Use the same UID for all Moonlight clients so we can quit games started by other Moonlight clients'. O Artemis passa o uniqueId real gerado por IdentityManager (8 bytes aleatórios, IdentityManager.java:54-56) e adiciona `devicename=<Build.MODEL>` em toda requisição (NvHTTP.java:207, 478). Isso é necessário para o Apollo identificar clientes por dispositivo, mas significa que uma sessão iniciada pelo Moonlight vanilla (ou por outro app) não pode ser encerrada pelo Artemis — o host devolve 599, tratado com uma mensagem hardcoded em inglês em ServerHelper.java:209-213.

**Correção sugerida:** Não é para 'consertar' (é intencional), mas precisa estar documentado em docs/reference/host-compatibility.md. A string do erro 599 em ServerHelper.java:210-212 está hardcoded e deveria ir para res/values/strings.xml como todas as outras.

#### 🟡 médio Modelo TFLite de 17 MB embarcado no APK mesmo para quem nunca usa 3D

**Local:** `app/src/main/assets/midas-midas-v2-w8a8.tflite:1` · **Categoria:** performance

O asset midas-midas-v2-w8a8.tflite tem 17.749.000 bytes e é empacotado em todos os flavors/ABIs. Somado às dependências litert + litert-gpu + opencv (que trazem .so nativos por ABI), o modo Stereo3D domina o tamanho do APK de um app cujo caso de uso principal (escritório/remote desktop, que é o do dono do fork) nunca o aciona. O split por ABI (app/build.gradle:153-159) ajuda nos .so mas não no asset.

**Correção sugerida:** Se o fork do Rafael não vai usar Stereo3D, avaliar remover o asset + as dependências litert/opencv + StreamContainer.MODE_AI_3D* e manter só MODE_2D — isso simplifica também o StreamContainer, que é o arquivo que precisa mudar para o teclado AnyDesk. Alternativa menos radical: mover para um dynamic feature module ou baixar sob demanda.

#### 🟡 médio KeyboardAccessibilityService intercepta praticamente todas as teclas com uma 'blacklist' de apenas 3

**Local:** `app/src/main/java/com/limelight/KeyboardAccessibilityService.java:15-19` · **Categoria:** ux

A constante chama-se BLACKLIST_KEYS mas é na verdade a whitelist do que NÃO é sequestrado: VOLUME_UP, VOLUME_DOWN e POWER. Todo o resto (incluindo teclas de acessibilidade, brilho, media keys, e o que mais o fabricante mapear) é consumido e reenviado ao host enquanto Game.instance.connected for true. Além disso `private final static List BLACKLIST_KEYS` é um raw type sem generics.

**Correção sugerida:** Renomear para PASSTHROUGH_KEYS, tipar como List<Integer>, e expandir com pelo menos os keycodes de brilho/media/assistente. Considerar tornar a lista configurável, já que o serviço exige que o usuário conceda acessibilidade manualmente.

#### 🟡 médio prepareDisplayForRendering e onCreate mutam prefConfig em memória, misturando configuração e estado

**Local:** `app/src/main/java/com/limelight/Game.java:408-419` · **Categoria:** maintainability

Em display externo o Game sobrescreve prefConfig.width/height/fps/videoScaleMode/enableFloatingButton/showOverlayZoomToggleButton/enablePip diretamente no objeto lido das preferências; applyMouseMode faz o mesmo com enableMultiTouchScreen/touchscreenTrackpad (Game.java:4156-4167) e toggleHUD com enablePerfOverlay (Game.java:4196). Como PreferenceConfiguration é o objeto de maior fan-in do projeto, esse padrão faz o significado de um campo depender de quando você o lê, e torna qualquer refatoração de janela/teclado arriscada.

**Correção sugerida:** Separar um `SessionState` mutável do `PreferenceConfiguration` imutável, ou pelo menos concentrar as mutações num método `deriveSessionConfig(Display)` documentado, para que fique claro quais campos são derivados em runtime.

#### ⚪ baixo Braço morto na conversão de FPS fracionário em NvHTTP.launchApp

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:854-862` · **Categoria:** maintainability

`float fps = context.streamConfig.getLaunchRefreshRate()` já recebe um int (getLaunchRefreshRate() em StreamConfiguration.java:190-196 devolve N ou N*1000). Em seguida `int fpsInt = (int)fps; if (fpsInt != fps) fpsInt = (int)(fps * 1000);` — a condição nunca é verdadeira, porque fps é sempre integral. O encoding ×1000 já aconteceu uma vez; a segunda multiplicação é código morto que sugere um bug de duplicação para quem lê.

**Correção sugerida:** Trocar o tipo local para int e remover o bloco condicional, deixando um comentário de que o encoding fracionário (fps*1000) é responsabilidade de StreamConfiguration.getLaunchRefreshRate() e só é entendido pelo Apollo.

#### ⚪ baixo PreferenceConfiguration.RES_NATIVE é declarado e nunca usado

**Local:** `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:228` · **Categoria:** tech-debt

`public static final String RES_NATIVE = "Native"` não tem nenhum consumidor em app/src/main nem em res/values/arrays.xml (grep em todo o repo retorna só a própria declaração). A detecção de resolução nativa é feita por heurística em isNativeResolution() (PreferenceConfiguration.java:395-417) e pelas entradas dinâmicas de StreamSettings.addNativeResolutionEntry (StreamSettings.java:196). A constante órfã sugere um caminho de configuração que não existe.

**Correção sugerida:** Remover a constante, ou — se a intenção era ter um valor sentinela de "resolução nativa do cliente" para o virtual display do Apollo — implementá-la de fato e documentar.

#### ⚪ baixo getCurrentGameUUID() reparseia o XML do serverinfo três vezes por tentativa de resume

**Local:** `app/src/main/java/com/limelight/nvstream/NvConnection.java:314-316` · **Categoria:** performance

A condição `if (h.getCurrentGame(serverInfo) != 0 || (h.getCurrentGameUUID(serverInfo) != null && !h.getCurrentGameUUID(serverInfo).isEmpty()))` seguida de `if (... || Objects.equals(h.getCurrentGameUUID(serverInfo), app.getAppUUID()))` chama getCurrentGameUUID três vezes, e cada chamada instancia um XmlPullParserFactory e varre a string inteira (NvHTTP.java:452-454 → getXmlString). No caminho de conexão isso é latência gratuita.

**Correção sugerida:** Extrair `String currentGameUUID = h.getCurrentGameUUID(serverInfo);` e `int currentGameId = h.getCurrentGame(serverInfo);` uma vez antes das condições.

#### ⚪ baixo sendClipboard trata resposta vazia como sucesso, invertendo a semântica em hosts não-Apollo

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:929-937` · **Categoria:** compatibility

O comentário diz 'For handling the 200ed 404 from Sunshine' e o código faz `return resp.isEmpty()`. Ou seja: o critério de sucesso é o corpo VAZIO. Qualquer host que responda 200 com um corpo de confirmação será interpretado como falha, e qualquer host que responda 200 vazio por outro motivo (proxy, redirect) será interpretado como sucesso. Como o Vibeshine é um fork do Sunshine, esse endpoint provavelmente nem existe lá.

**Correção sugerida:** Verificar o status HTTP real em vez do corpo (openHttpConnection já tem acesso à Response), e degradar explicitamente quando o endpoint não existir, escondendo os itens de clipboard do GameMenu quando computer.permission indicar que clipboard_set/clipboard_read não foram concedidos.

#### ⚪ baixo DeviceUtils.getModel usa replaceAll("\\s*", "") e o resultado vai em toda query HTTP

**Local:** `app/src/main/java/com/limelight/utils/DeviceUtils.java:283-291` · **Categoria:** maintainability

`model.trim().replaceAll("\\s*", "")` funciona por acidente (o quantificador * casa a string vazia em cada posição, substituindo por vazio) mas expressa mal a intenção — o correto seria \\s+. Esse valor é enviado como parâmetro devicename em TODA requisição HTTP ao host (NvHTTP.java:478), inclusive as de pairing, então é o identificador que o Apollo/Vibeshine mostra na UI de clientes.

**Correção sugerida:** Trocar para replaceAll("\\s+", "") (ou apenas trim(), deixando o okhttp fazer o percent-encoding) e adicionar um teste. Documentar que devicename é o nome que aparece na lista de clientes do host.

#### ⚪ baixo Fila de commitText usa Handler do main looper e enfileira sem limite

**Local:** `app/src/main/java/com/limelight/Game.java:313-331` · **Categoria:** performance

commitTextQueue é um ArrayDeque não sincronizado drenado por um Runnable no main looper a 15 ms por chunk de 512 bytes. Uma colagem grande (ex.: 50 KB) gera ~100 chunks e 1,5 s de posts no main thread; não há limite de fila nem descarte na desconexão (o Runnable checa conn != null mas não connected). Além disso enqueueCommitText só agenda o flush quando `commitTextQueue.size() == 1` (Game.java:4331), o que é frágil se algum dia a fila for tocada por outra thread.

**Correção sugerida:** Guardar um boolean `flushScheduled` explícito em vez de inferir pelo size, limitar a fila (ou concatenar chunks pendentes), e limpar a fila em connectionTerminated/onDestroy.

#### ⚪ baixo Dependência MPAndroidChart mantida após o revert do Chart Overlay

**Local:** `app/build.gradle:181` · **Categoria:** tech-debt

O commit 0c0c53a2 ('Revert Charts Implementation is not ideal') removeu o uso, e um grep por 'com.github.mikephil' em app/src/main/java não retorna nada, mas `implementation 'com.github.PhilJay:MPAndroidChart:v3.1.0'` continua no build.gradle, junto com o repositório jitpack. É peso morto no APK e no grafo de dependências.

**Correção sugerida:** Remover a dependência (e checar se SearchPreference também ficou órfã depois de 15122dd1 'Remove preference search bar').


## Ideias de melhoria

### Unificar as três cópias de InputConnection num único componente

**Tamanho:** quick-win

**Por quê:** Pré-requisito barato dos dois EPICs de teclado: enquanto houver três cópias divergentes (StreamContainer.java:185-202, StreamView.java:130-157, ExternalControllerView.java:58-84) qualquer mudança no input de texto tem 3x o custo e 3x o risco de esquecimento.

**Como:** Criar com.limelight.ui.CommitTextSupport com um método estático `createInputConnection(View owner, EditorInfo out, Callbacks cb)` e uma única interface. StreamContainer e ExternalControllerView passam a delegar; StreamView é removido (ou marcado @Deprecated) e StreamViewCommitTextTest reapontado para StreamContainer.

**Risco:** Baixo. É refatoração local com um teste unitário existente (StreamViewCommitTextTest) que pode ser adaptado para cobrir a nova classe, e Robolectric já está configurado (robolectric.properties, app/build.gradle:188-191).

### Consertar o retorno de OverlaySharedPreferences.edit()

**Tamanho:** quick-win

**Por quê:** Bug silencioso: escritas feitas via perfil vão para o global e o usuário vê a configuração 'não pegar' (afeta hoje o remember-mouse-mode em Game.java:4127-4132).

**Como:** Em ProfilesManager.java:251, implementar um Editor que acumule num Map e, no commit()/apply(), chame ProfilesManager.update(activeProfile) quando houver perfil ativo, delegando ao base.edit() só quando não houver. Cobrir com um teste em app/src/test/java/com/limelight/profiles/ (já existe OverlayPreferencesTest.java e ProfilesManagerTest.java).

**Risco:** Baixo, mas mexe num objeto lido por PreferenceConfiguration (fan-in altíssimo). Rodar ./gradlew test e conferir OverlayPreferencesTest/ProfilesOverlayTest.

### Documentar o delta CRLF para não desperdiçar leitura de diff

**Tamanho:** quick-win

**Por quê:** git diff contra moonlight/master mostra ControllerHandler.java com 6.737 linhas alteradas quando o delta semântico é 559 — a diferença é conversão de fim de linha (commit 8a7ebb70 'Chore: Clean up CRLF'). Um agente que confie no --stat vai concluir que o fork reescreveu o ControllerHandler, o que é falso.

**Como:** Registrar em docs/ (guia ou ADR) que toda comparação com o upstream deve usar `git diff --ignore-cr-at-eol moonlight/master...HEAD`, com os números reais de delta por arquivo. Opcionalmente adicionar um .gitattributes com `*.java text eol=lf` para estancar a fonte.

**Risco:** Baixo. Mexer no .gitattributes agora causaria um commit de normalização gigante — melhor só documentar, a menos que se faça junto com outra grande reescrita.

### Corrigir e documentar a matriz de compatibilidade de host (Apollo vs Sunshine/Vibeshine)

**Tamanho:** small

**Por quê:** O dono do fork usa Vibeshine, não Apollo. Hoje a informação está espalhada em strings de UI (strings.xml:200, 433, 547, 566, 631, 633, 634) e no README, e nada no código nomeia claramente o que degrada. Um agente que assuma 'Artemis == Apollo' vai propor features mortas.

**Como:** Escrever docs/reference/host-compatibility.md com três colunas (Apollo / Sunshine vanilla / Vibeshine-desconhecido) cobrindo: virtual display (NvHTTP.java:550-566 + AppView.java:513), scaleFactor (NvHTTP.java:882), FPS fracionário (StreamConfiguration.java:190-196), server commands (NvHTTP.java:568 + MoonBridge.java:357), clipboard sync (NvHTTP.java:922-937), OTP pairing (PairingManager.java:214-223), permissões (ComputerDetails.java:170-238), appuuid/IDX/currentgameuuid (NvHTTP.java:746-752), management URL (PcView.java:928). Marcar explicitamente o que funciona com QUALQUER host: commit-text/sendUtf8Text, trackpad, teclado virtual, pan/zoom, perfis, gestos, display externo, tuning de decoder, prevent packet loss (LiSendEmptyPayload é client-side).

**Risco:** Baixo. É documentação. O único cuidado é não afirmar coisas sobre o Vibeshine sem verificar — o correto é marcar como 'a verificar no host do usuário' e listar como testar (ler o /serverinfo do host e procurar as tags).

### Esconder na UI as features que o host não suporta em vez de só avisar depois

**Tamanho:** medium

**Por quê:** Hoje o app oferece 'Start in Virtual Display' mesmo quando o host não suporta e só mostra um diálogo de aviso com botão 'Proceed' (AppView.java:513-524, UiHelper.java:253-266); o mesmo vale para Server Command (GameMenu.java:304-311) e clipboard. Para quem usa Vibeshine isso é ruído permanente.

**Como:** ComputerDetails já carrega vDisplaySupported/vDisplayDriverReady/serverCommands/permission. Usar esses campos para (a) ocultar START_WITH_VDISPLAY/START_WITH_QUIT_VDISPLAY do menu quando !vDisplaySupported (AppView.java:452-472), (b) ocultar os itens de clipboard e Server Command do GameMenu quando os bits de permissão correspondentes estiverem zerados (bits 0x00010000/0x00020000/0x00100000 documentados em ComputerDetails.java:187-191), (c) desabilitar (setEnabled(false)) checkbox_use_virtual_display, seekbar_resolution_scale_factor e custom_refresh_rate em StreamSettings quando nenhum host pareado anunciar VirtualDisplayCapable. Manter um escape hatch em 'avançado' para quem quiser forçar.

**Risco:** Médio-baixo. Precisa de cuidado com o estado ONLINE/UNKNOWN do host: esconder opções porque o polling ainda não completou seria pior que o comportamento atual. Condicionar a esconder só quando state == ONLINE e permission >= 0.

### Suíte de smoke tests para o caminho de teclado

**Tamanho:** medium

**Por quê:** O projeto já tem Robolectric configurado e testes de startup/perfis, mas nada cobre o pipeline de texto. Como as mudanças de teclado são de alto risco e não compilam-e-quebram, testes são o único guarda-corpo antes do dispositivo real.

**Como:** Adicionar testes Robolectric para: (a) StreamContainer.onCreateInputConnection devolvendo InputConnection só quando commitTextEnabled (espelhando StreamViewCommitTextTest.java); (b) Game.enqueueCommitText fatiando corretamente strings com emoji/acentos em fronteiras de code point (Game.java:4314-4334) — testável isolando o método ou extraindo o chunker para um utilitário puro; (c) um teste de que a Activity Game aplica ou não FLAG_FULLSCREEN conforme checkbox_full_screen, incluindo depois de onMultiWindowModeChanged. Usar os shadows já existentes (ShadowMoonBridge, ShadowGameManager, ShadowBackdropFrameRenderer em app/src/test/java/com/limelight/shadows/).

**Risco:** Baixo. O maior custo é o chunker estar embutido em Game.java; extraí-lo para com.limelight.utils é um refactor pequeno que já paga o teste.

### EPIC — Campo de entrada de texto dedicado (envio do texto inteiro, tipo AnyDesk)

**Tamanho:** large

**Por quê:** O item 2 da dor do dono. O transporte já existe e está testado (sendUtf8Text → LiSendUtf8TextEvent); o que falta é a UI e desacoplar do commitText do IME, que é frágil porque depende do teclado do fabricante emitir commitText em vez de KeyEvents.

**Como:** Criar um overlay leve com um EditText real (não uma BaseInputConnection sintética) — pode ser um FrameLayout filho do rootView do Game, ancorado acima do IME usando os mesmos insets do EPIC anterior. No botão 'enviar', chamar diretamente Game.enqueueCommitText(editText.getText().toString()) (Game.java:4314), que já faz o chunking UTF-8 correto de 512 bytes. Expor pelo GameMenu (GameMenu.showMenu, GameMenu.java:288) e por um gesto (hoje 3 dedos abre o IME e 4 abre o teclado próprio — Game.java:3313-3320; um 2-dedos-longo ou um item do botão flutuante seriam candidatos). Reaproveitar o botão flutuante já existente (Game.initFloatingButton, Game.java:1038). Manter checkbox_enable_commit_text como caminho legado para swipe typing.

**Risco:** Médio. O texto vai ao host via LiSendUtf8TextEvent, que o Sunshine/Vibeshine suporta (é API upstream do moonlight-common-c), então não há dependência de Apollo. O risco real é de foco: o EditText precisa não roubar teclas do ControllerHandler nem disparar o KeyboardAccessibilityService (KeyboardAccessibilityService.java:27 checa Game.instance.connected e engoliria as teclas) — vai precisar de um flag de 'modo digitação' consultado pelo serviço.

### Enxugar o fork: remover Stereo3D/IA se não for usado

**Tamanho:** large

**Por quê:** 17 MB de modelo TFLite + litert + litert-gpu + OpenCV 4.12 num app cujo dono migrou para o Artemis justamente 'para escapar do excesso de features do V+'. Além do tamanho, StreamContainer carrega a complexidade dos três modos de render (StreamContainer.java:36-100), e é exatamente o arquivo que precisa mudar para o teclado AnyDesk.

**Como:** Deletar app/src/main/assets/midas-midas-v2-w8a8.tflite, Stereo3DRenderer.java (1.148 linhas), ShaderUtils.java, ReflectivePaddingInt8Minimal.java, as dependências litert/litert-gpu/opencv de app/build.gradle:183-185, as prefs parallax_depth/convergence_ratio/balance_shift (PreferenceConfiguration.java:268-271, 388-391) e as entradas de render mode em arrays.xml; simplificar StreamContainer para só o caminho SurfaceView, o que elimina o workaround do 'sempre criar um SurfaceView antes' (StreamContainer.java:82-94) e o uses-feature glEsVersion 3.0 obrigatório do manifest.

**Risco:** Alto para merges futuros: divergir do upstream nesses arquivos torna todo `git merge upstream/moonlight-noir` doloroso, e o ClassicOldSong continua evoluindo o 3D (commits 'update speed - added movie mode' são recentes). Fazer só se o fork assumir que não vai mais acompanhar o upstream de perto — o que é uma decisão de ADR, não de conveniência.

### EPIC — Teclado estilo AnyDesk: empurrar o stream em vez de cobri-lo

**Tamanho:** epic

**Por quê:** É a dor número 1 do dono do fork e nenhum cliente Moonlight resolve. O codebase já tem o padrão certo implementado em outra Activity, então não é pesquisa e sim portabilidade.

**Como:** Fase 1 — desacoplar o full-screen: substituir FLAG_FULLSCREEN (Game.java:359) e o SYSTEM_UI_FLAG_IMMERSIVE_STICKY (Game.java:1660-1666) por WindowInsetsControllerCompat.hide(Type.systemBars()) com BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE, exatamente como ExternalDisplayControlActivity.java:160-167; corrigir de passagem o addFlags incondicional em Game.java:1693. Fase 2 — declarar android:windowSoftInputMode="adjustResize" na Activity Game (AndroidManifest.xml:194-203) e WindowCompat.setDecorFitsSystemWindows(getWindow(), false). Fase 3 — registrar ViewCompat.setOnApplyWindowInsetsListener no decorView (espelhando ExternalDisplayControlActivity.java:171-175), ler insets.getInsets(WindowInsetsCompat.Type.ime()).bottom e aplicar como bottomMargin/padding no StreamContainer, chamando requestLayout(); StreamContainer.onMeasure (StreamContainer.java:113-150) já recalcula o aspect ratio a partir do espaço disponível, então o vídeo se reajusta sozinho. Fase 4 — reavaliar o mapeamento de coordenadas: getStreamViewRelativeNormalizedXY (Game.java:2503) e updateMousePosition (Game.java:3353) usam a geometria da view, então devem seguir corretos, mas precisam de teste com teclado aberto. Fase 5 — fazer o mesmo para o teclado próprio do Artemis (KeyBoardLayoutController.refreshLayout, KeyBoardLayoutController.java:321-357), que hoje também sobrepõe. Guardar tudo atrás de uma preferência nova (ex.: checkbox_resize_on_ime) para não regredir o caso de uso de jogo.

**Risco:** Alto. As flags de janela do Game são exatamente o tipo de coisa que quebra em runtime e não em compilação, e variam muito por OEM (Samsung DeX, Xiaomi, dobráveis). Interage com PiP (getPictureInPictureParams, Game.java:1288), com o modo display externo (Game.java:397-416) e com o pan/zoom (PanZoomHandler.handleSurfaceChange, PanZoomHandler.java:79-109). Exige teste em dispositivo real com IME aberto/fechado, rotação e PiP.


## Glossário

- Artemis: nome atual do fork ClassicOldSong/moonlight-android (antes 'Moonlight Noir'). applicationId com sufixo .noir em release e .noirdebug em debug; o build debug se chama 'Diana' (app/build.gradle:96-100).
- Apollo: fork do Sunshine feito pelo mesmo autor do Artemis (github.com/ClassicOldSong/Apollo). É o host que expõe VirtualDisplayCapable, ServerCommand, actions/clipboard, otpauth, appuuid e o bitmap de permissões. Várias features do Artemis são no-op sem ele.
- Vibeshine: fork do Sunshine usado pelo dono deste fork, com display virtual automático por cliente. NÃO é o Apollo — nenhuma tag Apollo-específica é garantida; toda feature marcada 'requires Apollo' deve ser considerada inativa até verificação no /serverinfo real.
- vDisplay / Virtual Display: display virtual criado pelo host, casado com a resolução/refresh do cliente. No Artemis é um flag por-launch (&virtualDisplay=1, NvHTTP.java:887) somado a uma preferência default (checkbox_use_virtual_display) e a um item de menu de contexto por app (AppView START_WITH_VDISPLAY).
- resolutionScaleFactor: percentual (default 100) que o host multiplica na resolução do display virtual sem mudar a resolução do stream — melhora nitidez em alguns jogos. Só o Apollo entende (&scaleFactor=, NvHTTP.java:882).
- Server Command: comando arbitrário definido no host e listado em <ServerCommand> no /serverinfo; o cliente dispara pelo índice via LiSendExecServerCmd no control stream. Exige Apollo + a permissão server_cmd (bit 0x00100000).
- Permission bitmap: inteiro devolvido pelo Apollo em <Permission> no /serverinfo, decodificado em ComputerDetails.toString() (ComputerDetails.java:170-238). Grupos: input (0x100-0x1000), operation/clipboard/file/server_cmd (0x10000-0x100000), action list/view/launch (0x1000000-0x4000000). -1 = host não informou.
- OTP pairing: pareamento do Apollo com PIN de 4 dígitos + passphrase; o cliente envia otpauth = SHA-256(pin + saltHex + passphrase) em hex maiúsculo (PairingManager.java:214-223). Em hosts sem suporte, cai no pareamento clássico por PIN.
- commit-text: caminho pelo qual texto multi-caractere do teclado virtual (swipe, predição, ditado) é enviado inteiro ao host via LiSendUtf8TextEvent, em vez de caractere a caractere. Preferência checkbox_enable_commit_text, default DESLIGADA. Ponto vivo: StreamContainer.java:185-202 (StreamView.java é código morto).
- StreamContainer: FrameLayout que substituiu o StreamView do upstream no activity_game.xml. Hospeda SurfaceView (2D) ou GLSurfaceView+Stereo3DRenderer (3D) e é o receptor de InputConnection do IME.
- KeyBoardLayoutController: teclado virtual COMPLETO do Artemis, inflado de layout_axixi_keyboard.xml. É um overlay no FrameLayout raiz do Game (gravity BOTTOM, 50% de altura por padrão) — cobre o stream, não o empurra.
- KeyBoardController: overlay separado de TECLAS ESPECIAIS, editável (mover/redimensionar/desabilitar/adicionar teclas), configurado por assets/config/keyboard.json e specialbuttons.json. Não confundir com o KeyBoardLayoutController.
- ExternalDisplayControlActivity: Activity que roda no display PRIMÁRIO como touchpad + menu enquanto o Game roda no display SECUNDÁRIO. Único lugar do app que trata insets de IME (linhas 169-176) — referência para o EPIC do teclado.
- SettingsProfile / OverlaySharedPreferences: perfis de configuração persistidos em files/profiles/profiles.json; o overlay sobrepõe um Map<String,Object> por cima das SharedPreferences reais na LEITURA (a escrita, hoje, vaza para o global).
- InputOnly / REMOTE_INPUT_UUID: app virtual do Apollo com UUID fixo 8CB5C136-DA67-4F99-B4A1-F9CD35005CF4 (NvApp.java:6) que dá só entrada remota sem vídeo; o Artemis não termina o app corrente ao lançá-lo (NvConnection.java:321) e força modo trackpad (Game.java:820-824).
- art:// e arquivo .art: esquema de deep link e formato de arquivo de atalho do Artemis (host_uuid/host_name/app_uuid/app_name/app_id em texto). Exportado por ShortcutHelper.exportLauncherFile (ShortcutHelper.java:225-275); art://launch?... e art://host?pin=&passphrase= são tratados por AddComputerManually.
- FPS fracionário: taxas como 59.94 são codificadas como fps×1000 (59940) por StreamConfiguration.getLaunchRefreshRate (StreamConfiguration.java:190-196) e enviadas no &mode=WxHxFPS. Só o Apollo decodifica; em outros hosts o valor seria interpretado literalmente.
- prevent packet loss: workaround client-side (checkbox_prevent_packet_loss) que envia LiSendEmptyPayload a cada 20 ms para impedir o Wi-Fi do Android de dormir (Game.java:333-338, 3701-3702). Independe do host, mas depende do fork do moonlight-common-c.
- ultra low latency / warp factor: opções de tuning do decoder do fork. enableUltraLowLatency escalona flags de fabricante por tryNumber em MediaCodecHelper.setDecoderLowLatencyOptions; framePacingWarpFactor multiplica o frame rate alvo (Game.java:775-777).
- MODE_AI_3D / MODE_AI_3D_MOVIE: modos de render do StreamContainer que rodam o MiDaS v2 (TFLite, 256x256, quantizado w8a8) para estimar profundidade e sintetizar SBS 3D com DIBR, principalmente para displays externos/óculos.
- moonlight-common-c (submódulo): NÃO aponta para o upstream moonlight-stream e sim para ClassicOldSong/moonlight-common-c. Traz LiSendExecServerCmd e LiSendEmptyPayload, inexistentes no upstream. Editá-lo diverge do upstream duas vezes.
