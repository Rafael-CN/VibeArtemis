# UI, Recursos e Internacionalização (app/src/main/res/, com.limelight.ui, com.limelight.grid, PcView/AppView/ProfilesActivity/ExternalDisplayControlActivity)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (34)
6. [Ideias de melhoria](#ideias-de-melhoria) (14)
7. [Glossário](#glossário)

## Como funciona

O subsistema de UI do Artemis é composto por 131 XMLs em app/src/main/res/ (18 layouts em layout/, 1 em layout-land/, 60 vector/shape drawables, 22 mipmaps, 29 arquivos strings.xml de locale, 4 values-vNN com styles, 8 XMLs em xml/) e por uma camada Java fina: 7 arquivos em com.limelight.ui/, 3 adapters em com.limelight.grid/, 5 loaders de box art em com.limelight.grid/assets/, e as 4 Activities de navegação (PcView 933 linhas, AppView 795, ProfilesActivity 74, EditProfileActivity 475). A navegação é o padrão herdado do Moonlight: PcView (grid de PCs) -> AppView (grid de jogos) -> Game (stream em tela cheia). Ambos os grids usam GridView legado (AbsListView) alimentado por GenericGridAdapter/BaseAdapter, hospedado dentro de um android.app.Fragment DEPRECADO (com.limelight.ui.AdapterFragment) — não AndroidX. O carregamento de box art passa por CachedAppAssetLoader, que orquestra três ThreadPoolExecutors (cache/foreground/network) sobre AsyncTask DEPRECADA, com cache LRU estático em MemoryAssetLoader e cache em disco em DiskAssetLoader. A tela de stream (Game) infla activity_game.xml, que é um <merge> contendo StreamContainer (FrameLayout que hospeda SurfaceView 2D ou GLSurfaceView para os modos 3D SBS), um backgroundTouchView, dois overlays de texto e dois ImageButtons flutuantes. StreamView.java (167 linhas) é CÓDIGO MORTO — foi substituído por StreamContainer e não é referenciado por nenhum layout ou classe. O tema é dark-only e hardcoded: values/styles.xml fixa #1A1A1A em statusBar/navigationBar/colorBackground/windowBackground, values-v29 troca o AppBaseTheme para Theme.Material3.Dark.NoActionBar e força android:forceDarkAllowed=false; NÃO existe values-night/, nem tokens de cor (values/colors.xml tem exatamente 1 cor), então todo layout usa literais hex (#FFFFFF, #CCCCCC, #1A1A1A). Não existe values-sw600dp/, layout-sw600dp/ nem layout-television/: tablets, foldables e Android TV usam exatamente os mesmos layouts do celular, com apenas dois ajustes em runtime (padding de 15dp para TV em UiHelper.notifyNewRootView e largura de célula 110dp/170dp via smallIconMode). Não há android:supportsRtl no manifest, apesar de existirem values-iw (hebraico, 133 strings) e diretórios stub values-fa e values-ckb (ambos <resources></resources> vazios) — ou seja, locales RTL não espelham o layout. A i18n tem 28 locales no disco mas apenas 21 declarados em xml/locales_config.xml e em values/arrays.xml (language_names/language_values): bg, ckb, eo, fa, pl, pt e tr são INALCANÇÁVEIS pelo seletor in-app e pelo seletor nativo do Android 13+. A cobertura de tradução é muito desigual: zh-rTW 100% (655/655), zh-rCN 99%, ru 97%, fr 82%, vi 82%, e todo o resto entre 5% e 41% — pt-rBR tem 236/655 (36%), pt tem 233/655 (36%) com 146 strings textualmente idênticas entre os dois. O lint de MissingTranslation está desabilitado em app/build.gradle, o que mascara isso. O recurso de display externo (utils/ExternalDisplayControlActivity, 566 linhas) constrói toda a sua UI programaticamente (nenhum layout XML), monta 4 clusters de ImageButton (zoom, menu, fechar, teclado Android, teclado full) sem nenhum contentDescription, e é o ÚNICO ponto do app que usa a API moderna de insets (WindowCompat.setDecorFitsSystemWindows + WindowInsetsCompat.Type.ime()) — porém só para controlar dimming de brilho, não para redimensionar. A Activity Game NÃO declara windowSoftInputMode no manifest e usa flags legadas SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|IMMERSIVE_STICKY, de modo que o teclado virtual SEMPRE cobre o stream — exatamente a dor relatada pelo dono do fork. O teclado full on-screen próprio (layout_axixi_keyboard.xml, 31KB, 84 TextViews sem nenhum id, endereçados por android:tag numérico) também é adicionado como overlay com Gravity.BOTTOM sobre o FrameLayout raiz, nunca empurrando a imagem.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/res/values/strings.xml`](../../app/src/main/res/values/strings.xml) | 676 | Catálogo canônico de 655 strings (66KB). Fonte de verdade para todas as traduções. Contém as strings herdadas do Moonlight upstream misturadas com as strings específicas do fork Artemis (perfis, display virtual, clipboard, teclado on-screen, display externo). |
| [`app/src/main/res/layout/activity_game.xml`](../../app/src/main/res/layout/activity_game.xml) | 119 | Layout raiz da tela de stream, é um <merge> inflado direto no android.R.id.content (FrameLayout). Define StreamContainer, backgroundTouchView, os dois overlays de performance/notificação e os dois botões flutuantes. É AQUI que a feature de 'empurrar o stream quando o teclado abre' deve ser ancorada. |
| [`app/src/main/java/com/limelight/ui/StreamContainer.java`](../../app/src/main/java/com/limelight/ui/StreamContainer.java) | 273 | FrameLayout que hospeda o SurfaceView (2D) ou GLSurfaceView (3D SBS) e implementa onMeasure com aspect-ratio fit/fill. Substituiu StreamView. Expõe InputCallbacks (incluindo handleCommitText) e cria o InputConnection para o IME. É o componente que já sabe se re-medir corretamente se o espaço disponível encolher. |
| [`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`](../../app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java) | 566 | Activity singleInstance que vira touchpad/controle no display primário enquanto o Game roda no display secundário. UI 100% programática. É a ÚNICA referência no repo de uso correto de WindowInsetsCompat.Type.ime() — modelo a copiar para a feature de push do teclado. |
| [`app/src/main/java/com/limelight/PcView.java`](../../app/src/main/java/com/limelight/PcView.java) | 933 | Activity inicial: grid de PCs descobertos, menu de contexto (pair/unpair/WOL/delete/detalhes), diálogo de pareamento OTP e binding ao ComputerManagerService. Também hospeda os 3 ImageButtons de topo (settings/help/add) e o FAB de perfis. |
| [`app/src/main/java/com/limelight/AppView.java`](../../app/src/main/java/com/limelight/AppView.java) | 795 | Grid de jogos de um PC. Escolhe entre app_grid_view e app_grid_view_small por preferência, monta o menu de contexto de start/resume/quit com e sem display virtual, e gerencia shortcuts e canais de TV. |
| [`app/src/main/java/com/limelight/grid/assets/CachedAppAssetLoader.java`](../../app/src/main/java/com/limelight/grid/assets/CachedAppAssetLoader.java) | 396 | Pipeline de carregamento de box art em 3 níveis (memória -> disco -> rede) com 3 ThreadPoolExecutors e retry de 3 tentativas. Faz o fade-in/fade-out via R.anim.boxart_fadein/fadeout. Baseado em AsyncTask deprecada. |
| [`app/src/main/res/xml/preferences.xml`](../../app/src/main/res/xml/preferences.xml) | 1026 | Tela de configurações inteira: 1026 linhas, 151 Preferences em 13 PreferenceCategory, sem busca e sem sub-telas. Único ponto de entrada para praticamente toda a customização do fork. |
| [`app/src/main/res/values/arrays.xml`](../../app/src/main/res/values/arrays.xml) | 203 | Arrays de entries/values das ListPreferences, incluindo a lista de idiomas do seletor in-app. Está dessincronizado do disco de recursos. |
| [`app/src/main/res/values/styles.xml`](../../app/src/main/res/values/styles.xml) | 95 | Todos os temas do app. Dark-only com cores hardcoded. Define AppTheme, StreamTheme, SettingsTheme, ExternalDisplayControllerTheme e o declare-styleable de ApertureViewGroup. |
| [`app/src/main/res/layout/layout_axixi_keyboard.xml`](../../app/src/main/res/layout/layout_axixi_keyboard.xml) | 1350 | Teclado full on-screen estático de 31KB: 84 TextViews em LinearLayouts aninhados, ZERO android:id, cada tecla identificada por android:tag com o keycode numérico em string e texto hardcoded (ESC, F1, Q, W...). Inflado por KeyBoardLayoutController. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java) | 379 | Controlador do teclado full on-screen. Infla layout_axixi_keyboard, faz popup de tecla, sticky modifiers e posicionamento. Adiciona o teclado como OVERLAY sobre o FrameLayout raiz — nunca redimensiona o stream. |
| [`app/src/main/AndroidManifest.xml`](../../app/src/main/AndroidManifest.xml) | 269 | Declara 11 Activities, 3 Services, 1 AccessibilityService, 2 Providers. Ponto onde falta windowSoftInputMode no .Game e onde faltam supportsRtl e labels localizados. |
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4400 | Activity de streaming (4300+ linhas). Relevante aqui: infla activity_game, controla immersive mode, faz o toggle do IME e implementa o caminho de commitText -> conn.sendUtf8Text (base da feature de 'enviar texto inteiro'). |
| [`app/src/main/java/com/limelight/utils/UiHelper.java`](../../app/src/main/java/com/limelight/utils/UiHelper.java) | 295 | Utilitário de UI compartilhado: troca de locale em runtime, padding de insets, padding de TV, diálogos de confirmação. É o ponto único de i18n em runtime. |
| [`app/src/main/java/com/limelight/GameMenu.java`](../../app/src/main/java/com/limelight/GameMenu.java) | 348 | Menu rápido in-game (AlertDialog com ArrayAdapter). Despacha as ações comparando o LABEL da opção com string equality. É onde entraria um item 'Enviar texto'. |
| [`app/src/main/res/layout/activity_pc_view.xml`](../../app/src/main/res/layout/activity_pc_view.xml) | 103 | Layout portrait da tela inicial. Contém o bug de âncora do helpButton e três ImageButtons sem contentDescription. |
| [`app/src/main/res/layout/row_profile.xml`](../../app/src/main/res/layout/row_profile.xml) | 68 | Item da lista de perfis. Cores hardcoded e contentDescriptions em inglês literal. |
| [`app/src/main/java/com/limelight/preferences/StreamSettings.java`](../../app/src/main/java/com/limelight/preferences/StreamSettings.java) | 600 | Host da tela de preferências (PreferenceFragmentCompat). Trata reload por mudança de display (foldables) e o restart por mudança de idioma. |
| [`app/src/main/java/com/limelight/ui/StreamView.java`](../../app/src/main/java/com/limelight/ui/StreamView.java) | 167 | CÓDIGO MORTO. Antiga SurfaceView do stream, substituída por StreamContainer. Não é referenciada por nenhum layout nem classe; ainda carrega imports não usados (ClipData, ClipboardManager, TargetApi, ExternalDisplayControlActivity). |
| [`app/src/main/res/values-pt-rBR/strings.xml`](../../app/src/main/res/values-pt-rBR/strings.xml) | 255 | Tradução pt-BR: 236 de 655 strings (36%). Nenhuma string específica do fork Artemis traduzida. Contém lusismos europeus e anglicismos. |
| [`app/src/main/res/xml/locales_config.xml`](../../app/src/main/res/xml/locales_config.xml) | 25 | Declara os 22 locales expostos no seletor nativo de idioma por app do Android 13+. Está dessincronizado dos diretórios values-*/ existentes. |
| [`app/src/main/java/com/limelight/preferences/LanguagePreference.java`](../../app/src/main/java/com/limelight/preferences/LanguagePreference.java) | 49 | Subclasse de ListPreference que hoje NÃO faz nada: todo o corpo que abria o seletor nativo de locale do Android 13+ (Settings.ACTION_APP_LOCALE_SETTINGS) está comentado. |
| [`app/src/main/java/com/limelight/grid/GenericGridAdapter.java`](../../app/src/main/java/com/limelight/grid/GenericGridAdapter.java) | 76 | BaseAdapter base dos dois grids. Faz 5 findViewById a cada bind, sem ViewHolder. |
| [`app/src/main/java/com/limelight/grid/assets/MemoryAssetLoader.java`](../../app/src/main/java/com/limelight/grid/assets/MemoryAssetLoader.java) | 74 | Cache LRU estático de bitmaps + cache secundário de SoftReference. Os dois são static, compartilhados entre todas as instâncias. |
| [`app/src/main/java/com/limelight/ui/AdapterFragment.java`](../../app/src/main/java/com/limelight/ui/AdapterFragment.java) | 35 | Fragment que hospeda o GridView. Usa android.app.Fragment DEPRECADO (não androidx.fragment). |
| [`app/build.gradle`](../../app/build.gradle) | 195 | Configuração de build. Desabilita o lint de MissingTranslation, define targetSdk 34, e declara dependências não usadas (MPAndroidChart, SearchPreference). |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/res/values/strings.xml`**
- `keyboard_service_label :365`
- `game_menu_toggle_keyboard :370`
- `game_menu_toggle_keyboard_model :378 (tem 's' solto depois de </string>)`
- `title_smart_clipboard_sync :546`
- `keyboard_layout_set_1..5 :581-585`
- `external_display_info :636`
- `notification_channel_name :637`
- `title_enable_commit_text :695`
- `summary_enable_commit_text :696`
- `searchpreference_* :654-659 (biblioteca não conectada)`
- `category_basic_settings :675 (string VAZIA de compliance)`
- `title_checkbox_stretch_video :676 (string VAZIA de compliance)`

**`app/src/main/res/layout/activity_game.xml`**
- `backgroundTouchView :9`
- `StreamContainer streamContainer :14`
- `notificationOverlay :39`
- `performanceOverlay/performanceOverlayBig/performanceOverlayLite :53-87`
- `floatingMenuButton :92`
- `overlayToggleZoomButton :105`
- `ApertureViewGroup comentado :26-37`

**`app/src/main/java/com/limelight/ui/StreamContainer.java`**
- `interface InputCallbacks :28`
- `enum StreamMode :36`
- `init() :65`
- `setDesiredAspectRatio() :103`
- `setFillDisplay() :108`
- `onMeasure() :114 (lógica fit/fill de aspect ratio)`
- `onKeyPreIme() :161`
- `onCheckIsTextEditor() :181`
- `onCreateInputConnection() :186 (BaseInputConnection com commitText/deleteSurroundingText)`

**`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`**
- `instance (static) :62`
- `toggleKeyboard()/toggleFullKeyboard()/toggleGameMenu() :93-109`
- `initViews() :148`
- `setDecorFitsSystemWindows + setOnApplyWindowInsetsListener + isVisible(Type.ime()) :169-176`
- `updateKeyboardVisibility() :242`
- `createProgrammaticUI() :387`
- `createImageButton() :505 (sem contentDescription)`
- `showStickyNotification() :526 (usa app_icon.png colorido como smallIcon)`

**`app/src/main/java/com/limelight/PcView.java`**
- `initializeViews() :140`
- `completeOnCreate() :270`
- `refreshProfileButton() :345`
- `onCreateContextMenu() :399`
- `doPair() :470`
- `doOTPPair() :584 (otpInput.setHint("PIN") hardcoded :592; setPadding em px crus :589)`
- `onContextItemSelected() :733 (case OPEN_MANAGEMENT_PAGE_ID cai no default :811-819)`
- `receiveAbsListView() :891`
- `UNPAIR_ID :128 (constante morta, nunca adicionada ao menu)`

**`app/src/main/java/com/limelight/AppView.java`**
- `setContentView(R.layout.activity_app_view) :307`
- `label appListText :330`
- `refreshProfileButton :401`
- `onCreateContextMenu() :448-498`
- `updateUiWithAppList() :663`
- `getAdapterFragmentLayoutId() :738`
- `receiveAbsListView() :744`
- `AppObject :778`

**`app/src/main/java/com/limelight/grid/assets/CachedAppAssetLoader.java`**
- `cacheExecutor/foregroundExecutor/networkExecutor :34-50`
- `doNetworkAssetLoad() :95`
- `class LoaderTask extends AsyncTask :145`
- `onProgressUpdate() :188 (textView pode ser null :205)`
- `onPostExecute() :211 (textView.setVisibility sem null-check :223)`
- `class AsyncDrawable :255`
- `queueCacheLoad() :305`
- `isBitmapPlaceholder() :328`
- `populateImageView() :334`
- `class LoaderTuple :372 (equals sem hashCode :382)`

**`app/src/main/res/xml/preferences.xml`**
- `category_video_settings :7`
- `category_audio_settings :222`
- `category_gamepad_settings :241`
- `category_input_settings :363`
- `checkbox_enable_commit_text :479`
- `seekbar_keyboard_axi_opacity :559`
- `onscreen_keyboard_autofit :569`
- `list_onscreen_keyboard_align_mode :597`
- `category_on_screen_controls_settings :648`
- `category_special_key_layout :738`
- `keyboard_axi_list :770 (usa array com 5 labels idênticos)`
- `category_virtual_trackpad_settings :808`
- `category_settings_misc :978`

**`app/src/main/res/values/arrays.xml`**
- `resolution_names/values :3-20`
- `fps_names/values :22-33`
- `language_names :58 (21 idiomas + Default)`
- `language_values :83`
- `keyboard_axi_names :151 (BUG: 5 itens apontando todos para @string/keyboard_layout_set_1)`
- `mouse_mode_names :175`
- `onscreen_keyboard_align_modes :192`

**`app/src/main/res/values/styles.xml`**
- `AppBaseTheme (Theme.MaterialComponents.NoActionBar)`
- `AppTheme (#1A1A1A hardcoded em 4 atributos)`
- `StreamBaseTheme (windowBackground transparent)`
- `StreamTheme (força colorAccent/colorControlNormal = white)`
- `SettingsTheme (Theme.AppCompat.NoActionBar, fundo transparente)`
- `ExternalDisplayControllerTheme`
- `declare-styleable ApertureViewGroup`

**`app/src/main/res/layout/layout_axixi_keyboard.xml`**
- `root LinearLayout height=200dp background=#212121 :2-7`
- `tecla ESC tag=111 :23`
- `tecla F1 tag=131 :33`
- `teclas alfanuméricas com android:text hardcoded :181-700+`
- `tag="hide" (tecla de esconder)`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java`**
- `MODIFIER_KEY_CODES/SPECIAL_KEY_CODES :37-38, static block :53`
- `initKeyboard() :119 (Integer.parseInt(tag))`
- `initKeyPopup() :291 (setTextSize(32), setPadding px crus)`
- `isKeyboardVisible() :309`
- `show()/hide() :304-321`
- `refreshLayout() :330 (FrameLayout.LayoutParams com Gravity.BOTTOM, altura = heightPixels*0.5 no modo autofit)`
- `interface ViewCallbacks :375`

**`app/src/main/AndroidManifest.xml`**
- `<application> sem android:supportsRtl :46-59`
- `localeConfig=@xml/locales_config :56`
- `StreamSettings android:label="Streaming Settings" hardcoded :169`
- `AddComputerManually android:label="Add Computer Manually" hardcoded :182, windowSoftInputMode=stateVisible :179`
- `activity .Game :193-216 (SEM windowSoftInputMode)`
- `services com label hardcoded :220,223,226`

**`app/src/main/java/com/limelight/Game.java`**
- `UTF8_CHUNK_SIZE=512 / commitTextQueue / flushCommitTextQueue :313-330`
- `setContentView(R.layout.activity_game) :378`
- `streamContainer = findViewById :459`
- `rootView = streamContainer.getParent() :466`
- `hideSystemUi Runnable com SYSTEM_UI_FLAG_IMMERSIVE_STICKY :1646-1668`
- `toggleKeyboard() :2402 (inputManager.toggleSoftInput(0,0))`
- `handleCommitText() :4290`
- `handleDeleteSurroundingText() :4299`
- `enqueueCommitText() :4314 (BUG: só posta o flush se size()==1)`

**`app/src/main/java/com/limelight/utils/UiHelper.java`**
- `setLocale() :77 (usa Resources.updateConfiguration deprecado e config.locale deprecado)`
- `applyStatusBarPadding() :108`
- `notifyNewRootView() :125 (padding de TV :143-151; insets Q+ :152-179)`
- `showDecoderCrashDialog() :182`
- `displayConfirmationDialog() :220 (Html.fromHtml deprecado :238)`
- `dpToPx() :292`

**`app/src/main/java/com/limelight/GameMenu.java`**
- `class MenuOption :41`
- `showMenuDialog() :103 (dispatch por label.equals(option.label) :120)`
- `showSpecialKeysMenu() :154`
- `showAdvancedMenu() :245`
- `showServerCmd() :275`
- `showMenu() :288 (game_menu_toggle_keyboard :317)`

**`app/src/main/res/layout/activity_pc_view.xml`**
- `pcFragmentContainer :10`
- `no_pc_found_layout :24`
- `settingsButton :52 (sem contentDescription)`
- `helpButton :65 (toRightOf=settingsButton :72 mas toEndOf=profilesButton :73)`
- `manuallyAddPc :78 (sem contentDescription)`
- `profilesButton ExtendedFAB :91`

**`app/src/main/res/layout/row_profile.xml`**
- `profileName textColor=#FFFFFF :24`
- `profileTimestamp textColor=#CCCCCC :33`
- `profileActive RadioButton :42`
- `editProfile contentDescription="Edit profile" :50 (hardcoded)`
- `deleteProfile contentDescription="Delete profile" :58 (hardcoded)`

**`app/src/main/java/com/limelight/preferences/StreamSettings.java`**
- `reloadSettings() :~70-89`
- `onCreate() :92 (setTheme comentado :93; notifyNewRootView comentado :102)`
- `onAttachedToWindow() :106`
- `onConfigurationChanged() :124 (detecta troca de tela em foldable por contagem de pixels)`
- `onBackPressed() :143 (BUG: comparação de String com == :156; Toast hardcoded :157; System.exit(0) :158)`
- `class SettingsFragment :164`

**`app/src/main/java/com/limelight/ui/StreamView.java`**
- `class StreamView extends SurfaceView :15`
- `onMeasure() :62 (duplica a lógica de StreamContainer.onMeasure)`
- `onCreateInputConnection() :131`
- `interface InputCallbacks :159 (tem isOnExternalDisplay(), variante da de StreamContainer)`

**`app/src/main/res/values-pt-rBR/strings.xml`**
- `ip_hint :23 ("Endereço de IP do PC GeForce" — desatualizado, base diz "IP address of host PC")`
- `searching_pc :24 (menciona GameStream/SHIELD/GeForce Experience — obsoleto para Apollo)`
- `message_decoding_error :34 ("Moonlight crashou")`
- `perf_overlay_incomingfps :121 (dois-pontos duplicado "rede::")`
- `analogscroll_none :246 ("rato" = pt-PT)`
- `summary_analog_scrolling :250 ("Selecciona" + "rato" = pt-PT)`
- `title_enable_commit_text :253`
- `summary_enable_commit_text :254`

**`app/src/main/res/xml/locales_config.xml`**
- `comentário 'Don't forget to update arrays.xml' :3`
- `faltam bg, ckb, eo, fa, pl, pt, tr`

**`app/src/main/java/com/limelight/preferences/LanguagePreference.java`**
- `onClick() inteiramente comentado :30-48`

**`app/src/main/java/com/limelight/grid/GenericGridAdapter.java`**
- `setLayoutId() :30`
- `getView() :61 (findViewById x5 por item, sem ViewHolder :66-70)`
- `populateView() abstrato :58`

**`app/src/main/java/com/limelight/grid/assets/MemoryAssetLoader.java`**
- `memoryCache static LruCache :12 (maxMemory/16)`
- `evictionCache static HashMap<String,SoftReference> :29 (nunca é podado de refs mortas em massa)`
- `constructKey() :31`
- `clearCache() :69`

**`app/src/main/java/com/limelight/ui/AdapterFragment.java`**
- `extends android.app.Fragment :14`
- `onAttach(Activity) :18 (overload deprecado)`
- `onActivityCreated() :31 (deprecado)`

**`app/build.gradle`**
- `minSdk 21 / targetSdk 34 / compileSdk 36 :11-13`
- `lint { disable 'MissingTranslation' } :~73`
- `bundle.language.enableSplit = false :~79`
- `bundle.density.enableSplit = false com FIXME :~82`
- `dependency SearchPreference v2.5.1 :~178`
- `dependency MPAndroidChart v3.1.0 :~179`

</details>

## Fluxo

FLUXO 1 — Descoberta e navegação (PcView -> AppView): PcView.onCreate (PcView.java:210) cria uma GLSurfaceView descartável só para ler o GL_RENDERER e, no callback, chama completeOnCreate (:270) -> UiHelper.setLocale (:275) muta a Configuration compartilhada de Resources -> initializeViews (:140) faz setContentView(R.layout.activity_pc_view) (portrait) ou layout-land/activity_pc_view.xml (landscape, escolhido pelo resource qualifier) -> UiHelper.notifyNewRootView (:143) aplica LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES e, se UI_MODE_TYPE_TELEVISION, 15dp de padding no root (UiHelper.java:143-151), senão instala um OnApplyWindowInsetsListener em android.R.id.content usando getTappableElementInsets (UiHelper.java:156-176) -> substitui pcFragmentContainer por um AdapterFragment (PcView.java:195) que infla pc_grid_view.xml e devolve o GridView via receiveAbsListView (:891), onde UiHelper.applyStatusBarPadding instala um segundo listener de insets no próprio GridView (UiHelper.java:108). Clique num PC pareado -> doAppList (:714) -> Intent para AppView.

FLUXO 2 — Box art: AppGridAdapter.updateLayoutWithPreferences (AppGridAdapter.java:86) calcula scalingDivisor a partir de ART_WIDTH_PX=300 e da largura de célula (110dp ou 170dp) e constrói CachedAppAssetLoader. Para cada célula, GenericGridAdapter.getView (:61) faz 5 findViewById e chama populateView -> AppGridAdapter.populateView (:171) -> CachedAppAssetLoader.populateImageView (:334): cancela task anterior via AsyncDrawable (cancelPendingLoad :285) -> tenta MemoryAssetLoader (LRU estático + evictionCache de SoftReference) -> se falhar, cria LoaderTask(diskOnly=true) no foregroundExecutor -> DiskAssetLoader.loadBitmapFromCache -> se ausente, publishProgress (:175) mostra no_app_image com R.anim.boxart_fadein e dispara uma segunda LoaderTask(diskOnly=false) no networkExecutor -> doNetworkAssetLoad (:95) usa NvHTTP.getBoxArt, grava direto no disco, relê e devolve -> onPostExecute (:211) faz boxart_fadeout e depois boxart_fadein. Em paralelo, AppGridAdapter.addApp (:140) enfileira queueCacheLoad no cacheExecutor (1 thread) para pré-aquecer o disco.

FLUXO 3 — Stream e teclado (o caminho crítico para as features pedidas): Game.onCreate (:348 setLocale) -> setContentView(R.layout.activity_game) (:378) infla o <merge> direto no FrameLayout android.R.id.content -> streamContainer = findViewById (:459) -> StreamContainer.init (StreamContainer.java:65) cria SurfaceView (ou GLSurfaceView se renderMode != 2D) e registra o SurfaceHolder.Callback -> Game.setCommitTextEnabled(prefConfig.enableCommitText) (:463) -> hideSystemUi Runnable (Game.java:1646) aplica SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|HIDE_NAVIGATION|IMMERSIVE_STICKY. Como a Activity .Game NÃO declara windowSoftInputMode (AndroidManifest.xml:193-216) e usa LAYOUT_FULLSCREEN, o WindowManager NÃO redimensiona a janela quando o IME sobe: o teclado simplesmente cobre a imagem. Quando o usuário aciona o teclado (GameMenu.java:317 -> Game.toggleKeyboard :2402), a única ação é inputManager.toggleSoftInput(0,0). Não existe nenhum OnApplyWindowInsetsListener na Game.

FLUXO 4 — Texto multi-caractere: o IME chama StreamContainer.onCreateInputConnection (:186), que só devolve um BaseInputConnection customizado se commitTextEnabled; o override de commitText (:194) chama Game.handleCommitText (Game.java:4290) -> enqueueCommitText (:4314) fatia o texto em chunks de 512 bytes UTF-8 respeitando fronteiras de code point e enfileira em commitTextQueue -> flushCommitTextQueue (:317) faz poll e conn.sendUtf8Text(chunk) a cada 15ms. Backspace vem por deleteSurroundingText -> Game.handleDeleteSurroundingText (:4299), que envia N pares KEY_DOWN/KEY_UP de VK_BACK em loop apertado. Ou seja, o transporte de "texto inteiro pela conexão" JÁ EXISTE (conn.sendUtf8Text); o que falta é uma UI de campo de texto.

FLUXO 5 — Teclado full on-screen próprio: GameMenu.showAdvancedMenu (:253) -> Game.toggleFullKeyboard -> KeyBoardLayoutController é construído com o FrameLayout raiz (KeyBoardLayoutController.java:106 infla layout_axixi_keyboard) -> refreshLayout (:330) calcula width/height (autofit = screen.widthPixels x screen.heightPixels*0.5) e faz frame_layout.addView(keyboardView, params) com Gravity.BOTTOM|START|CENTER|END -> ou seja, OVERLAY puro sobre o stream. initKeyboard (:119) percorre cada linha do LinearLayout, lê android:tag, faz Integer.parseInt e registra o OnTouchListener; teclas viram KeyEvent -> sendKeyEvent (:361) -> Game.instance.onKey.

FLUXO 6 — Display externo: StartExternalDisplayControlReceiver -> ExternalDisplayControlActivity.onCreate (:114) -> se Game.instance não existe, lança o Game no display secundário via ActivityOptions.setLaunchDisplayId (:128) -> initViews (:148) faz polling a cada 500ms até Game.instance existir (máx 10 tentativas) -> esconde system bars, e (API 30+) chama WindowCompat.setDecorFitsSystemWindows(false) + setOnApplyWindowInsetsListener lendo insets.isVisible(Type.ime()) (:171-176) -> updateKeyboardVisibility (:242) apenas cancela/reagenda o dimScreenRunnable de brilho. createProgrammaticUI (:387) monta os 4 clusters de ImageButton sem contentDescription. showStickyNotification (:526) publica notificação persistente com R.drawable.app_icon (PNG colorido).

FLUXO 7 — Troca de idioma: preferences.xml:988 (LanguagePreference, category_settings_misc) grava a chave de idioma -> StreamSettings.onBackPressed (:143) compara com previousPrefs; em API < 33 relança PcView com CLEAR_TASK, em API >= 33 compara com == (bug) e, se bater, mostra Toast hardcoded e chama System.exit(0). Em runtime, cada Activity que chama UiHelper.setLocale (apenas PcView, AppView, Game, EditProfileActivity, StreamSettings, AddComputerManually) reaplica o locale mutando Resources; ProfilesActivity, HelpActivity, DebugInfoActivity e ExternalDisplayControlActivity NÃO chamam, então exibem no idioma do sistema.

## Interfaces externas

- android.view.SurfaceView / SurfaceHolder.Callback — superfície de vídeo 2D (StreamContainer.java:83,96)
- android.opengl.GLSurfaceView + EGL context v3 — renderização 3D SBS via Stereo3DRenderer (StreamContainer.java:87-91)
- android.view.inputmethod.InputMethodManager — toggleSoftInput para mostrar/esconder IME (Game.java:2407, ExternalDisplayControlActivity.java:450)
- android.view.inputmethod.BaseInputConnection / EditorInfo / InputConnection — interceptação de commitText e deleteSurroundingText (StreamContainer.java:186-202, ExternalControllerView.java:59-85, StreamView.java:131-157)
- androidx.core.view.WindowCompat / WindowInsetsCompat / WindowInsetsControllerCompat — insets modernos, usados SOMENTE em ExternalDisplayControlActivity.java:160-176
- android.view.WindowInsets (API framework) + getTappableElementInsets — insets legados em UiHelper.java:108-179
- android.view.View.setSystemUiVisibility com SYSTEM_UI_FLAG_* — immersive mode legado deprecado (Game.java:1652-1667, UiHelper.java:178)
- android.app.LocaleManager + android.os.LocaleList (API 33+) — leitura de system locales em UiHelper.setLocale:84-88
- android:localeConfig / xml/locales_config.xml — seletor nativo de idioma por app do Android 13+
- android.content.res.Resources.updateConfiguration + Configuration.locale (ambos deprecados) — troca de idioma em runtime (UiHelper.java:105)
- android.app.GameManager + GameState (API 33+) — sinalização de modo de jogo (UiHelper.java:39-55) e xml/game_mode_config.xml
- android.hardware.display.DisplayManager + ActivityOptions.setLaunchDisplayId (API 30+) — lançamento no display secundário (ExternalDisplayControlActivity.java:126-136)
- android.app.NotificationManager / NotificationChannel / NotificationCompat + POST_NOTIFICATIONS — notificação persistente do display externo (ExternalDisplayControlActivity.java:516-548)
- android.accessibilityservice.AccessibilityService — captura de atalhos de teclado físico (xml/keyboard_accessibility_service.xml, KeyboardAccessibilityService)
- android.app.Fragment (framework, deprecado) — AdapterFragment.java:14; coexiste com androidx.fragment usado em StreamSettings
- android.os.AsyncTask (deprecado) — CachedAppAssetLoader.LoaderTask:145
- android.util.LruCache + java.lang.ref.SoftReference — cache de bitmaps (MemoryAssetLoader.java:12,29)
- android.widget.GridView / AbsListView / BaseAdapter — grids legados (pc_grid_view.xml, app_grid_view.xml, GenericGridAdapter)
- androidx.recyclerview.widget.RecyclerView — usado apenas na lista de perfis (activity_profiles.xml:19)
- androidx.preference.PreferenceFragmentCompat / ListPreference / PreferenceDataStore — tela de settings e edição de perfil
- com.google.android.material (1.13.0) — ExtendedFloatingActionButton, FloatingActionButton, Theme.MaterialComponents / Theme.Material3.Dark
- androidx.cardview.widget.CardView — cartões de box art (app_grid_item.xml)
- com.github.ByteHamster:SearchPreference v2.5.1 — declarada em build.gradle e com 6 strings traduzidas, mas SEM NENHUMA referência em Java ou XML
- com.github.PhilJay:MPAndroidChart v3.1.0 — declarada em build.gradle, SEM NENHUM import em Java (resquício do recurso de perf charts, cujas strings sobraram em values-ru)
- android.media.tv / TvContractCompat via TvChannelHelper — canais Android TV (usa R.dimen.tv_channel_logo_width duas vezes, TvChannelHelper.java:121-122)
- android.webkit.WebView — HelpActivity carrega a wiki remota com JavaScript habilitado
- com.limelight.nvstream.NvConnection.sendUtf8Text — transporte de texto UTF-8 pelo protocolo Moonlight (Game.java:325, 2095, 2206)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🔴 crítico | bug | enqueueCommitText nunca dispara o flush quando o texto gera mais de um chunk: textos > 512 bytes são silenciosamente descartados | `app/src/main/java/com/limelight/Game.java:4331` |
| 🟠 alto | ux | Activity Game não declara windowSoftInputMode: o teclado virtual sempre cobre o stream | `app/src/main/AndroidManifest.xml:193` |
| 🟠 alto | tech-debt | Sete idiomas traduzidos são inalcançáveis: values-bg, values-pl, values-tr, values-pt, values-eo ausentes de arrays.xml e locales_config.xml | `app/src/main/res/values/arrays.xml:58` |
| 🟠 alto | compatibility | App sem android:supportsRtl apesar de ter locale hebraico ativo | `app/src/main/AndroidManifest.xml:46` |
| 🟡 médio | bug | helpButton ancorado a dois alvos diferentes em activity_pc_view.xml (portrait) | `app/src/main/res/layout/activity_pc_view.xml:72` |
| 🟡 médio | bug | keyboard_axi_names expõe cinco perfis de teclado com o mesmo rótulo 'Profile 1' | `app/src/main/res/values/arrays.xml:151` |
| 🟡 médio | maintainability | Caractere solto 's' fora de tag em values/strings.xml | `app/src/main/res/values/strings.xml:378` |
| 🟡 médio | maintainability | Lint MissingTranslation desabilitado mascara 36% de cobertura média de tradução | `app/build.gradle:73` |
| 🟡 médio | ux | Tradução pt-BR contém lusismos europeus, anglicismos e referências obsoletas a GeForce/GameStream | `app/src/main/res/values-pt-rBR/strings.xml:246` |
| 🟡 médio | maintainability | App é dark-only por construção, sem values-night e sem tokens de cor | `app/src/main/res/values/styles.xml:19` |
| 🟡 médio | tech-debt | StreamView.java é código morto de 167 linhas duplicando StreamContainer | `app/src/main/java/com/limelight/ui/StreamView.java:15` |
| 🟡 médio | ux | Nove ImageButtons/ImageViews sem contentDescription e dois com texto hardcoded em inglês | `app/src/main/res/layout/activity_pc_view.xml:52` |
| 🟡 médio | bug | NPE potencial: textView de WeakReference usado sem null-check em CachedAppAssetLoader | `app/src/main/java/com/limelight/grid/assets/CachedAppAssetLoader.java:223` |
| 🟡 médio | ux | Teclado full on-screen é overlay Gravity.BOTTOM e também cobre o stream | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:330` |
| 🟡 médio | ux | InputConnection do stream não seta IME_FLAG_NO_FULLSCREEN: em landscape o IME entra em modo extract e toma a tela toda | `app/src/main/java/com/limelight/ui/StreamContainer.java:191` |
| 🟡 médio | bug | GameMenu despacha ações comparando o rótulo traduzido da opção | `app/src/main/java/com/limelight/GameMenu.java:120` |
| 🟡 médio | compatibility | Nenhum recurso alternativo para tablets, foldables ou Android TV | `app/src/main/res/layout/app_grid_view.xml:1` |
| 🟡 médio | ux | Tela de configurações com 151 preferências em 13 categorias, sem busca e sem sub-telas | `app/src/main/res/xml/preferences.xml:1` |
| 🟡 médio | compatibility | targetSdk 34 abaixo do mínimo atual da Play Store e sem preparo para edge-to-edge obrigatório | `app/build.gradle:12` |
| ⚪ baixo | tech-debt | Recursos órfãos: 2 layouts, 2 drawables e 2 diretórios de locale vazios | `app/src/main/res/layout/activity_game_display.xml:1` |
| ⚪ baixo | tech-debt | Dependências declaradas e nunca usadas: SearchPreference e MPAndroidChart | `app/build.gradle:178` |
| ⚪ baixo | bug | case OPEN_MANAGEMENT_PAGE_ID sem return cai no default do switch em PcView | `app/src/main/java/com/limelight/PcView.java:811` |
| ⚪ baixo | bug | Comparação de String com == em StreamSettings.onBackPressed | `app/src/main/java/com/limelight/preferences/StreamSettings.java:156` |
| ⚪ baixo | ux | Notificação do display externo usa PNG colorido como smallIcon | `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java:540` |
| ⚪ baixo | bug | LoaderTuple sobrescreve equals() sem sobrescrever hashCode() | `app/src/main/java/com/limelight/grid/assets/CachedAppAssetLoader.java:382` |
| ⚪ baixo | performance | evictionCache estático e ilimitado em MemoryAssetLoader acumula entradas mortas | `app/src/main/java/com/limelight/grid/assets/MemoryAssetLoader.java:29` |
| ⚪ baixo | performance | GenericGridAdapter faz 5 findViewById por bind, sem ViewHolder | `app/src/main/java/com/limelight/grid/GenericGridAdapter.java:66` |
| ⚪ baixo | ux | Título de tela de perfil montado por concatenação de strings | `app/src/main/java/com/limelight/EditProfileActivity.java:64` |
| ⚪ baixo | ux | Quatro Activities não aplicam o idioma escolhido pelo usuário | `app/src/main/java/com/limelight/ProfilesActivity.java:24` |
| ⚪ baixo | ux | Labels de Activity e Service hardcoded em inglês no manifest | `app/src/main/AndroidManifest.xml:169` |
| ⚪ baixo | ux | Toasts e diálogos com texto hardcoded em inglês espalhados pelo código | `app/src/main/java/com/limelight/Game.java:624` |
| ⚪ baixo | bug | Notificação persistente do display externo pode sobreviver ao fechamento da Activity | `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java:215` |
| ⚪ baixo | maintainability | Percentuais literais não escapados em strings de preferência | `app/src/main/res/values/strings.xml:200` |
| ⚪ baixo | tech-debt | AdapterFragment usa android.app.Fragment deprecado enquanto o resto do app usa AndroidX | `app/src/main/java/com/limelight/ui/AdapterFragment.java:14` |

### Detalhe

#### 🔴 crítico enqueueCommitText nunca dispara o flush quando o texto gera mais de um chunk: textos > 512 bytes são silenciosamente descartados

**Local:** `app/src/main/java/com/limelight/Game.java:4331` · **Categoria:** bug

enqueueCommitText (Game.java:4314) fatia o texto em chunks de 512 bytes e os adiciona a commitTextQueue; no final, só agenda o flush com 'if (commitTextQueue.size() == 1) { commitTextHandler.post(flushCommitTextQueue); }'. Se a fila estava vazia e uma única chamada produz 2 ou mais chunks (qualquer texto acima de 512 bytes UTF-8 — colagem, ditado longo, teclado com predição agressiva), size() vale 2+ e o Runnable NUNCA é postado: o texto fica parado na fila e nada é enviado ao host. Só volta a fluir se uma próxima chamada por acaso deixar a fila com exatamente 1 elemento, o que é improvável. Isso corta pela raiz justamente a feature de 'enviar texto inteiro pela conexão'.

**Correção sugerida:** Trocar a condição por um flag booleano de 'flush agendado' ou simplesmente por 'if (!flushScheduled) { flushScheduled = true; commitTextHandler.post(flushCommitTextQueue); }', limpando o flag quando a fila esvazia dentro de flushCommitTextQueue (Game.java:317-330). Alternativa mínima: guardar o tamanho da fila antes do loop e postar se 'sizeAntes == 0'. Adicionar teste unitário cobrindo payloads de 1, 512, 513 e 5000 bytes.

#### 🟠 alto Activity Game não declara windowSoftInputMode: o teclado virtual sempre cobre o stream

**Local:** `app/src/main/AndroidManifest.xml:193` · **Categoria:** ux

A <activity android:name=".Game"> (linhas 193-216) não declara android:windowSoftInputMode. Combinada com as flags legadas SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | SYSTEM_UI_FLAG_IMMERSIVE_STICKY aplicadas em Game.java:1652-1667, a janela nunca é redimensionada quando o IME aparece. Não existe nenhum setOnApplyWindowInsetsListener na Game (o único do repo está em ExternalDisplayControlActivity.java:171). Resultado: o teclado sobe por cima da imagem do stream, escondendo exatamente a região onde o usuário está digitando. Esta é literalmente a dor nº1 relatada pelo dono do fork (comportamento AnyDesk).

**Correção sugerida:** Adicionar android:windowSoftInputMode="adjustResize" na .Game e, em Game.onCreate (após setContentView na linha 378), instalar ViewCompat.setOnApplyWindowInsetsListener no findViewById(android.R.id.content) que leia insets.getInsets(WindowInsetsCompat.Type.ime()).bottom e aplique como bottom padding no root FrameLayout. Como StreamContainer.onMeasure (StreamContainer.java:114-150) já implementa fit por aspect ratio, o stream vai se re-letterboxar sozinho no espaço restante. Em API 30+, preferir WindowCompat.setDecorFitsSystemWindows(false) + WindowInsetsControllerCompat em vez de setSystemUiVisibility, e usar WindowInsetsAnimationCompat para acompanhar a animação do teclado. Gate atrás de uma nova preferência (ex.: checkbox_resize_on_ime) para não regredir quem prefere o overlay.

#### 🟠 alto Sete idiomas traduzidos são inalcançáveis: values-bg, values-pl, values-tr, values-pt, values-eo ausentes de arrays.xml e locales_config.xml

**Local:** `app/src/main/res/values/arrays.xml:58` · **Categoria:** tech-debt

Existem 28 diretórios values-<locale>/strings.xml no disco, mas language_names/language_values (arrays.xml:58-107) e xml/locales_config.xml listam apenas 21 idiomas + Default. Ficam de fora: bg (134 strings traduzidas), pl (252), tr (253), pt (233), eo (36), além dos stubs vazios ckb e fa. Consequência dupla: (a) o seletor in-app nunca oferece esses idiomas; (b) por não estarem em localeConfig, o seletor nativo de idioma por app do Android 13+ também não os mostra. O trabalho de tradução de polonês, turco e búlgaro está efetivamente morto. Os próprios comentários em arrays.xml:57 e locales_config.xml:3 admitem que os dois arquivos precisam ser mantidos em sincronia manualmente.

**Correção sugerida:** Adicionar bg/pl/tr/pt aos dois arquivos (mantendo a mesma ordem nos dois arrays de arrays.xml, que são posicionalmente acoplados). Remover values-ckb/ e values-fa/ (ambos são <resources></resources> vazios) ou traduzi-los. Criar um teste de unidade (já existe Robolectric no build.gradle) que falhe se o conjunto de diretórios values-*/ divergir de language_values e de locales_config.xml.

#### 🟠 alto App sem android:supportsRtl apesar de ter locale hebraico ativo

**Local:** `app/src/main/AndroidManifest.xml:46` · **Categoria:** compatibility

O bloco <application> (linhas 46-59) não declara android:supportsRtl="true". Existe values-iw/strings.xml com 133 strings em hebraico (idioma RTL) declarado tanto em arrays.xml quanto em locales_config.xml, e diretórios stub values-fa (persa) e values-ckb (curdo sorani), também RTL. Sem supportsRtl, o layoutDirection nunca é resolvido para RTL e todos os atributos Start/End se comportam como Left/Right: a tela inicial, os menus de contexto, a lista de perfis e a tela de settings ficam espelhados errado para usuários de hebraico.

**Correção sugerida:** Adicionar android:supportsRtl="true" no <application>. Em seguida auditar os layouts que ainda usam apenas Left/Right sem par Start/End (activity_add_computer_manually.xml:26-27 usa toLeftOf+toStartOf corretamente, mas pc_grid_item.xml e app_grid_item.xml usam layout_centerHorizontal/gravity fixos) e rodar o app com 'Force RTL layout direction' das opções de desenvolvedor.

#### 🟡 médio helpButton ancorado a dois alvos diferentes em activity_pc_view.xml (portrait)

**Local:** `app/src/main/res/layout/activity_pc_view.xml:72` · **Categoria:** bug

O ImageButton helpButton declara simultaneamente android:layout_toRightOf="@+id/settingsButton" (linha 72) e android:layout_toEndOf="@+id/profilesButton" (linha 73). São dois alvos diferentes. O RelativeLayout resolve regras Start/End com precedência sobre Left/Right quando a direção de layout é resolvida, então o botão de ajuda pode acabar posicionado relativo ao ExtendedFloatingActionButton de perfis (que fica alinhado ao bottom/end da tela) em vez do botão de settings. Também introduz uma dependência circular latente entre helpButton e profilesButton. O layout-land equivalente (layout-land/activity_pc_view.xml:58-69) usa o empilhamento vertical correto e não tem o problema.

**Correção sugerida:** Trocar a linha 73 para android:layout_toEndOf="@id/settingsButton", casando com o toRightOf da linha 72. Aproveitar para trocar o '@+id/' por '@id/' já que settingsButton é declarado adiante no mesmo arquivo (linha 53).

#### 🟡 médio keyboard_axi_names expõe cinco perfis de teclado com o mesmo rótulo 'Profile 1'

**Local:** `app/src/main/res/values/arrays.xml:151` · **Categoria:** bug

O string-array keyboard_axi_names (arrays.xml:151-157) tem 5 itens e TODOS apontam para @string/keyboard_layout_set_1. As strings keyboard_layout_set_2..5 existem em values/strings.xml:582-585 e nunca são usadas. Esse array alimenta a ListPreference keyboard_axi_list (preferences.xml:768-770), cujos entryValues são OSC_Keyboard..OSC_Keyboard_5. Na prática o usuário vê cinco opções idênticas 'Profile 1' e não tem como saber qual perfil está selecionando.

**Correção sugerida:** Corrigir os itens 2..5 do array para @string/keyboard_layout_set_2 .. keyboard_layout_set_5. Verificar se existe problema análogo em qualquer outra ListPreference cujo array de nomes tenha itens repetidos.

#### 🟡 médio Caractere solto 's' fora de tag em values/strings.xml

**Local:** `app/src/main/res/values/strings.xml:378` · **Categoria:** maintainability

A linha 378 é '<string name="game_menu_toggle_keyboard_model">Toggle Special keys</string>s' — há um caractere 's' após o fechamento da tag, dentro do elemento <resources>. O AAPT2 tolera texto solto em <resources> (gera warning ou ignora silenciosamente), mas é lixo que quebra ferramentas de tradução (Weblate/Crowdin/Lokalise) e diffs automáticos, e sinaliza que ninguém está validando o XML no CI.

**Correção sugerida:** Remover o 's'. Adicionar um passo de validação de XML no CI (xmllint ou 'gradlew lint' com o check de resources habilitado) sobre todos os arquivos de res/values*/.

#### 🟡 médio Lint MissingTranslation desabilitado mascara 36% de cobertura média de tradução

**Local:** `app/build.gradle:73` · **Categoria:** maintainability

O bloco lint declara disable 'MissingTranslation'. Medida real de cobertura contra as 655 strings de values/strings.xml: zh-rTW 655 (100%), zh-rCN 649 (99%), ru 648 (97%), fr 540 (82%), vi 535 (82%), de 268 (41%), es 258 (39%), it/ko/tr 253 (39%), pl 252, sv 252, uk 252, hu 240, pt-rBR 236 (36%), pt 233, cs 226, in 192, el 190, nb-rNO 189, nl 189, ro 163, ja 153 (23%), bg 134, iw 133 (20%), eo 36 (5%), ckb 0, fa 0. Toda a UI específica do fork Artemis (perfis de configuração, display virtual, sincronização de clipboard, teclado on-screen, controle de display externo, commit-text) só existe em inglês, chinês, russo, francês e vietnamita.

**Correção sugerida:** Trocar o disable por severity="informational" e adicionar um relatório de cobertura no CI (ex.: script que conta chaves por locale e falha se um locale declarado em locales_config.xml cair abaixo de um piso, ex. 60%). Considerar mover as traduções para uma plataforma (Weblate) e publicar o strings.xml base como fonte.

#### 🟡 médio Tradução pt-BR contém lusismos europeus, anglicismos e referências obsoletas a GeForce/GameStream

**Local:** `app/src/main/res/values-pt-rBR/strings.xml:246` · **Categoria:** ux

Problemas concretos: (1) 'rato' em vez de 'mouse' nas linhas 246 (analogscroll_none: 'Nenhum (ambos os sticks movem o rato)') e 250 (summary_analog_scrolling: 'quando a emulação de rato está ativada') — 'rato' é pt-PT; (2) 'Selecciona' na linha 250 é ortografia pré-Acordo de pt-PT (pt-BR: 'Seleciona'); (3) anglicismos 'crashou'/'crashando'/'Crashou' nas linhas 34, 35 e 112, e 'dropar'/'dropados' nas linhas 136 e 218; (4) dois-pontos duplicado em perf_overlay_incomingfps linha 121 ('rede:: %1$.2f FPS'); (5) ip_hint na linha 23 diz 'Endereço de IP do PC GeForce' enquanto a base (values/strings.xml:117) já foi atualizada para 'IP address of host PC' — o Artemis pareia com Apollo/Sunshine, não com GeForce Experience; (6) searching_pc nas linhas 24-26 ainda instrui o usuário a habilitar GameStream nas configurações do SHIELD no GeForce Experience, enquanto a base (values/strings.xml:118) já fala apenas em 'host PCs on your local network'. Além disso, values-pt e values-pt-rBR compartilham 146 de 233 strings com texto IDÊNTICO, e como values-pt é o fallback de values-pt-rBR e não tem nenhuma chave extra, ele não agrega nada para usuários brasileiros.

**Correção sugerida:** Revisar as 6 ocorrências citadas; padronizar 'mouse', 'travou/falhou', 'descartados'; ressincronizar ip_hint e searching_pc com a base atual; e traduzir as ~419 chaves faltantes priorizando o bloco Artemis (profile_manager_*, vdisplay_*, *_clipboard_*, keyboard_*, external_display_*, notification_*, title/summary_enable_commit_text). Avaliar remover values-pt/ ou reescrevê-lo em pt-PT genuíno (hoje ele já contém 'ecrã' e 'A recarregar', então tem identidade própria — o problema é o vazamento inverso de pt-PT para pt-BR).

#### 🟡 médio App é dark-only por construção, sem values-night e sem tokens de cor

**Local:** `app/src/main/res/values/styles.xml:19` · **Categoria:** maintainability

AppTheme (values/styles.xml:19-27) hardcoda #1A1A1A em android:statusBarColor, navigationBarColor, colorBackground e windowBackground. values-v29/styles.xml troca o AppBaseTheme para Theme.Material3.Dark.NoActionBar e ainda força android:forceDarkAllowed="false". Não existe diretório values-night/. values/colors.xml tem exatamente UMA cor (profileAccent #FF4081), então todos os layouts usam literais: activity_pc_view.xml:5 e layout-land/activity_pc_view.xml:4 e activity_add_computer_manually.xml:3 usam #1A1A1A; row_profile.xml:24 e :33 usam #FFFFFF e #CCCCCC; activity_profiles.xml usa #CCCCCC e #FFFFFF; activity_game.xml:49,69 usa #80000000. Nenhum uso de ?attr/colorSurface, ?android:textColorPrimary etc. Consequência: impossível oferecer tema claro, e nenhum respeito ao dynamic color do Material You.

**Correção sugerida:** Extrair todas as cores literais para values/colors.xml, converter os temas para usarem atributos do Material3 (colorSurface, colorOnSurface, colorPrimary), e só então avaliar um values-night/. Como o app é de streaming em ambiente escuro, manter dark como padrão via DayNight com forceDarkAllowed continua defensável, mas o refactor de tokens é pré-requisito para qualquer trabalho de tema.

#### 🟡 médio StreamView.java é código morto de 167 linhas duplicando StreamContainer

**Local:** `app/src/main/java/com/limelight/ui/StreamView.java:15` · **Categoria:** tech-debt

Nenhum layout referencia com.limelight.ui.StreamView (activity_game.xml:14 usa StreamContainer) e nenhuma classe Java a importa — o grep só encontra a própria definição e menções em comentários de Game.java (:474, :2513, :3356). A classe ainda carrega imports não usados (android.annotation.TargetApi, android.content.ClipData, android.text.ClipboardManager, android.view.View, android.view.ViewGroup, com.limelight.utils.ExternalDisplayControlActivity) e duplica integralmente a lógica de onMeasure (StreamView.java:62-94 vs StreamContainer.java:114-150) e de onCreateInputConnection. Sua interface InputCallbacks (:159) tem um método extra isOnExternalDisplay() que a de StreamContainer (:28) não tem, criando duas interfaces com o mesmo nome em pacotes iguais — fonte garantida de confusão para agentes futuros.

**Correção sugerida:** Deletar app/src/main/java/com/limelight/ui/StreamView.java. Se a variante isOnExternalDisplay() de onWindowFocusChanged (StreamView.java:117-123) ainda for desejada, portá-la para StreamContainer.onWindowFocusChanged (:173) antes de remover.

#### 🟡 médio Nove ImageButtons/ImageViews sem contentDescription e dois com texto hardcoded em inglês

**Local:** `app/src/main/res/layout/activity_pc_view.xml:52` · **Categoria:** ux

Sem contentDescription: settingsButton (activity_pc_view.xml:52 e layout-land:45), helpButton (:65 / land:58), manuallyAddPc (:78 / land:71), grid_image e grid_overlay em app_grid_item.xml:17,27 e app_grid_item_small.xml, grid_image e grid_overlay em pc_grid_item.xml:10,15, e TODOS os 5 ImageButtons criados programaticamente em ExternalDisplayControlActivity.createImageButton (:505) — zoom, menu, fechar, teclado Android, teclado full. Com contentDescription hardcoded em inglês (não localizável): row_profile.xml:50 'Edit profile' e :58 'Delete profile'. Para usuários de TalkBack, a tela inicial inteira é um conjunto de botões anônimos e cada card de jogo é uma imagem sem rótulo.

**Correção sugerida:** Adicionar contentDescription referenciando @string em todos os ImageButtons de chrome; para as box arts, setar contentDescription dinamicamente com o nome do app em AppGridAdapter.populateView (AppGridAdapter.java:171) e PcGridAdapter.populateView (:53), ou marcar grid_overlay com importantForAccessibility="no" já que é puramente decorativo. Extrair 'Edit profile'/'Delete profile' para strings.xml (as strings profile_manager_* já existem no catálogo).

#### 🟡 médio NPE potencial: textView de WeakReference usado sem null-check em CachedAppAssetLoader

**Local:** `app/src/main/java/com/limelight/grid/assets/CachedAppAssetLoader.java:223` · **Categoria:** bug

Em onPostExecute (:211), imageView e textView são obtidos de WeakReferences separadas (:217-218). A guarda é 'if (getLoaderTask(imageView) == this)' (:219), que retorna null (logo, false) se imageView foi coletado — mas NÃO protege contra textView ter sido coletado independentemente. A linha 223 faz textView.setVisibility(...) direto. O mesmo padrão aparece em onProgressUpdate (:188) nas linhas 205 (textView.setVisibility) e 202-204. Como as duas Views vêm da mesma célula do GridView, é raro, mas em cenários de reciclagem agressiva/low memory dá NPE na main thread.

**Correção sugerida:** Adicionar 'if (imageView == null || textView == null) return;' logo após obter as duas referências, em ambos os métodos.

#### 🟡 médio Teclado full on-screen é overlay Gravity.BOTTOM e também cobre o stream

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:330` · **Categoria:** ux

refreshLayout (:330) cria FrameLayout.LayoutParams com params.gravity = Gravity.BOTTOM (mais START/END/CENTER_HORIZONTAL conforme onscreenKeyboardAlignMode) e faz frame_layout.addView(keyboardView, params) — ou seja, o teclado próprio do Artemis é sobreposto ao StreamContainer, não empurra nem redimensiona. No modo autofit ele ocupa screen.heightPixels*0.5 (metade da tela). Isso reproduz exatamente a mesma queixa do IME do sistema, agora no teclado nativo do app. Além disso refreshLayout usa DisplayMetrics do Context em vez das dimensões reais do container, o que erra em multi-window/DeX/freeform, e não é reinvocado automaticamente em onConfigurationChanged.

**Correção sugerida:** Fazer o KeyBoardLayoutController reportar sua altura efetiva ao Game (a interface ViewCallbacks:375 já notifica visibilidade) e, no mesmo mecanismo criado para o IME, aplicar bottom padding no root para que StreamContainer.onMeasure encolha a imagem. Trocar DisplayMetrics por frame_layout.getWidth()/getHeight() e chamar refreshLayout em onConfigurationChanged.

#### 🟡 médio InputConnection do stream não seta IME_FLAG_NO_FULLSCREEN: em landscape o IME entra em modo extract e toma a tela toda

**Local:** `app/src/main/java/com/limelight/ui/StreamContainer.java:191` · **Categoria:** ux

onCreateInputConnection (:186) seta apenas outAttrs.imeOptions = EditorInfo.IME_FLAG_NO_EXTRACT_UI (:191). NO_EXTRACT_UI esconde o campo de extração, mas não impede o IME de entrar em fullscreen (extract mode) — é IME_FLAG_NO_FULLSCREEN que faz isso. Como streaming em Android é quase sempre landscape e a altura é pequena, vários IMEs (Samsung, Gboard em telas curtas) entram em fullscreen e cobrem 100% da tela. Mesmo padrão replicado em ExternalControllerView.java:66 e no morto StreamView.java:138. Também não é setado IME_ACTION_NONE nem TYPE_TEXT_FLAG_NO_SUGGESTIONS, o que deixa o IME oferecer autocorreção sobre um 'campo' que nunca devolve texto.

**Correção sugerida:** Setar outAttrs.imeOptions = IME_FLAG_NO_EXTRACT_UI | IME_FLAG_NO_FULLSCREEN | IME_ACTION_NONE e outAttrs.inputType = TYPE_CLASS_TEXT | TYPE_TEXT_FLAG_NO_SUGGESTIONS (ou TYPE_TEXT_VARIATION_VISIBLE_PASSWORD para desligar predição) nos três pontos. Testar com Gboard e teclado Samsung em landscape.

#### 🟡 médio GameMenu despacha ações comparando o rótulo traduzido da opção

**Local:** `app/src/main/java/com/limelight/GameMenu.java:120` · **Categoria:** bug

showMenuDialog (:103) monta um ArrayAdapter<String> e, no onClick, percorre as options procurando 'label.equals(option.label)' (:120) para descobrir qual Runnable executar. Se duas opções tiverem o mesmo texto — o que é plausível em traduções parciais, em atalhos customizados importados pelo usuário (showSpecialKeysMenu:203 usa sc.name vindo de JSON externo, sem validação de unicidade) ou em comandos de servidor duplicados (showServerCmd:279 prefixa com '> ') — a PRIMEIRA opção com aquele texto é executada, não a clicada. Também é O(n) por clique e acopla lógica a texto localizado.

**Correção sugerida:** Usar o índice 'which' do onClick diretamente contra o array options (que é posicionalmente equivalente ao adapter), ou dar um id estável a cada MenuOption. Como bônus, isso remove o hack de ViewTreeObserver/OnGlobalLayoutListener (:137-151) que popula o adapter só depois do layout.

#### 🟡 médio Nenhum recurso alternativo para tablets, foldables ou Android TV

**Local:** `app/src/main/res/layout/app_grid_view.xml:1` · **Categoria:** compatibility

Não existem diretórios layout-sw600dp/, values-sw600dp/, layout-television/ nem values-television/. Só existe layout-land/ com UM arquivo (activity_pc_view.xml). Consequências: (a) em tablet 12" a largura de coluna do grid continua 170dp (app_grid_view.xml:7) e app_grid_item.xml fixa 170dp x 220dp, gerando cards minúsculos e muito espaço morto; (b) o LEANBACK_LAUNCHER e a category tv.ouya são declarados (AndroidManifest.xml:105-106) e o app se anuncia para Android TV, mas a adaptação de TV é apenas 15dp de padding em runtime (UiHelper.java:143-151) — nada de leanback UI, nada de focus highlight consistente (activity_game.xml:19 até desliga defaultFocusHighlightEnabled); (c) foldables são tratados só por um heurístico de contagem de pixels em StreamSettings.onConfigurationChanged (:135) e por resizeableActivity=true no manifest; a UI em si não reflui.

**Correção sugerida:** Criar values-sw600dp/dimens.xml com colunas maiores (ex.: 240dp) e um app_grid_item de dimensão relativa; adicionar layout-sw600dp/ para PcView com painel lateral. Para TV, no mínimo garantir nextFocus* consistentes (hoje só pc_grid_view.xml:11 e o layout-land têm nextFocus) e contentDescriptions. Avaliar WindowSizeClass (androidx.window) em vez do heurístico de pixels.

#### 🟡 médio Tela de configurações com 151 preferências em 13 categorias, sem busca e sem sub-telas

**Local:** `app/src/main/res/xml/preferences.xml:1` · **Categoria:** ux

preferences.xml tem 1026 linhas e 151 elementos Preference distribuídos em 13 PreferenceCategory (video, audio, gamepad, input, host, general, ui, on-screen controls, special key layout, virtual trackpad, perf monitor, advanced, misc), todos numa ÚNICA PreferenceScreen. O mitigador é app:initialExpandedChildrenCount, que apenas colapsa. Não há PreferenceScreen aninhada, não há busca (apesar de a dependência SearchPreference estar no build.gradle), e a mesma tela é reutilizada para edição de perfil (EditProfileActivity.ProfilePreferenceFragment estende StreamSettings.SettingsFragment). Achar uma opção específica é um exercício de scroll.

**Correção sugerida:** Conectar a SearchPreference já disponível (as 6 strings searchpreference_* já estão traduzidas em vários locales) e/ou quebrar em PreferenceScreens aninhadas por categoria. Ganho imediato de usabilidade com custo baixo.

#### 🟡 médio targetSdk 34 abaixo do mínimo atual da Play Store e sem preparo para edge-to-edge obrigatório

**Local:** `app/build.gradle:12` · **Categoria:** compatibility

defaultConfig declara targetSdk 34 (compileSdk 36). Além do requisito de nível de API da Play Store, subir para 35 tem impacto direto neste subsistema: no Android 15 apps com targetSdk 35 recebem edge-to-edge FORÇADO e as APIs legadas de System UI (setSystemUiVisibility, usado em Game.java:1652-1667 e UiHelper.java:178) e os flags TRANSLUCENT_NAVIGATION (UiHelper.java:168-171) passam a ser no-op. Todo o esquema de padding por getTappableElementInsets de UiHelper.notifyNewRootView (:152-179) vai precisar ser reescrito.

**Correção sugerida:** Planejar a migração para targetSdk 35 junto com a reescrita de insets: substituir setSystemUiVisibility por WindowInsetsControllerCompat (o padrão já usado corretamente em ExternalDisplayControlActivity.java:160-167) e substituir os listeners de tappable insets por ViewCompat.setOnApplyWindowInsetsListener com Type.systemBars()/Type.displayCutout()/Type.ime(). Fazer isso na mesma leva da feature de resize do teclado, que já toca exatamente esses pontos.

#### ⚪ baixo Recursos órfãos: 2 layouts, 2 drawables e 2 diretórios de locale vazios

**Local:** `app/src/main/res/layout/activity_game_display.xml:1` · **Categoria:** tech-debt

Sem nenhuma referência em Java ou XML: res/layout/activity_game_display.xml, res/layout/activity_configure_virtual_controller.xml, res/drawable/list_view_unselected.xml, res/drawable-xhdpi/ouya_icon.png (51KB embarcados em todo APK), res/drawable/ic_focus_secondary.xml (só aparece na linha COMENTADA ExternalDisplayControlActivity.java:405), res/values-ckb/strings.xml e res/values-fa/strings.xml (ambos <resources></resources> vazios). Também: res/values/dimens.xml:7 declara tv_channel_logo_height que nunca é lido — TvChannelHelper.java:122 usa tv_channel_logo_width para calcular a ALTURA (copy-paste). As strings category_basic_settings e title_checkbox_stretch_video foram esvaziadas na base (values/strings.xml:675-676, sob o comentário 'Compliance') mas continuam traduzidas em 24 locales.

**Correção sugerida:** Remover os arquivos órfãos. Corrigir TvChannelHelper.java:122 para R.dimen.tv_channel_logo_height. Remover as duas chaves de compliance de todos os values-*/ ou marcá-las translatable="false". Habilitar shrinkResources nos buildTypes release/debug (build.gradle já usa minifyEnabled true nos dois) para pegar isso automaticamente no futuro.

#### ⚪ baixo Dependências declaradas e nunca usadas: SearchPreference e MPAndroidChart

**Local:** `app/build.gradle:178` · **Categoria:** tech-debt

build.gradle declara com.github.ByteHamster:SearchPreference:v2.5.1 e com.github.PhilJay:MPAndroidChart:v3.1.0. Nenhuma das duas tem qualquer import ou tag XML no projeto: não há SearchConfiguration/SearchPreferenceResult em Java nem <SearchPreference> em preferences.xml, e não há nenhum import de com.github.mikephil. Restam apenas os 6 overrides de string searchpreference_* (values/strings.xml:654-659, traduzidos em vários locales) e, no caso do chart, 12 chaves obsoletas que sobreviveram apenas em values-ru (category_perf_charts, desc_chart_decode, desc_chart_fps, desc_chart_latency, summary_enable_perf_charts, summary_perf_chart_decode, ...) — resquício de um recurso de gráficos de performance removido do base.

**Correção sugerida:** Ou remover as duas dependências (e as 6 strings searchpreference_* + as 12 chaves órfãs de values-ru), ou — muito melhor para SearchPreference — efetivamente conectar a busca na tela de settings, que hoje tem 151 preferências em 13 categorias sem nenhum mecanismo de busca.

#### ⚪ baixo case OPEN_MANAGEMENT_PAGE_ID sem return cai no default do switch em PcView

**Local:** `app/src/main/java/com/limelight/PcView.java:811` · **Categoria:** bug

Em onContextItemSelected (PcView.java:733), o case OPEN_MANAGEMENT_PAGE_ID (linhas 811-818) termina sem 'return true' nem 'break', então o fluxo cai no 'default: return super.onContextItemSelected(item)' (linha 819-820). Além de ser um fallthrough não intencional, faz a Activity reportar que NÃO tratou o item mesmo tendo aberto a URL de gerenciamento, o que pode disparar tratamento duplicado em subclasses/frameworks.

**Correção sugerida:** Adicionar 'return true;' ao final do case OPEN_MANAGEMENT_PAGE_ID, dentro de um bloco { }, como já é feito nos demais cases.

#### ⚪ baixo Comparação de String com == em StreamSettings.onBackPressed

**Local:** `app/src/main/java/com/limelight/preferences/StreamSettings.java:156` · **Categoria:** bug

'if (newPrefs.language == PreferenceConfiguration.DEFAULT_LANGUAGE)' compara referências de String, não conteúdo. Como newPrefs.language vem de SharedPreferences.getString, na prática é uma String nova e a comparação quase sempre dá false, então o ramo de 'idioma resetado para o padrão' (Toast + System.exit(0)) nunca roda em Android 13+. Na linha 149 logo acima o código usa .equals() corretamente, o que confirma que é lapso. Bônus: a mensagem do Toast na linha 157 é hardcoded em inglês ('Language has been reset to default, please restart the app!') e System.exit(0) na linha 158 é uma forma brutal de reiniciar.

**Correção sugerida:** Trocar por .equals(). Extrair a mensagem para strings.xml. Substituir System.exit(0) por recriação da task via Intent com FLAG_ACTIVITY_CLEAR_TASK|NEW_TASK (padrão já usado no ramo pré-Tiramisu, linhas 152-154) ou, melhor ainda, por AppCompatDelegate.setApplicationLocales.

#### ⚪ baixo Notificação do display externo usa PNG colorido como smallIcon

**Local:** `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java:540` · **Categoria:** ux

showStickyNotification usa .setSmallIcon(R.drawable.app_icon), que é res/drawable/app_icon.png — um PNG colorido de 5.8KB. Desde a API 21 o Android aplica tint monocromático no smallIcon, então ícones coloridos com fundo opaco viram um quadrado branco sólido na barra de status. Não existe nenhum vector monocromático de notificação no projeto.

**Correção sugerida:** Criar res/drawable/ic_notification.xml como VectorDrawable branco sobre transparente (pode reutilizar o path de mipmap/ic_launcher_foreground) e usá-lo em setSmallIcon. Considerar também .setColor() com a cor de acento.

#### ⚪ baixo LoaderTuple sobrescreve equals() sem sobrescrever hashCode()

**Local:** `app/src/main/java/com/limelight/grid/assets/CachedAppAssetLoader.java:382` · **Categoria:** bug

LoaderTuple (:372) define equals() (:382) comparando computer.uuid e app.getAppId(), mas não define hashCode(). Hoje o cache usa chaves String construídas em MemoryAssetLoader.constructKey (:31), então não há bug ativo, mas o contrato equals/hashCode está quebrado e qualquer uso futuro de LoaderTuple num HashMap/HashSet vai falhar silenciosamente. equals() também não trata computer.uuid == null.

**Correção sugerida:** Adicionar @Override hashCode() = Objects.hash(computer.uuid, app.getAppId()) e null-safety no equals.

#### ⚪ baixo evictionCache estático e ilimitado em MemoryAssetLoader acumula entradas mortas

**Local:** `app/src/main/java/com/limelight/grid/assets/MemoryAssetLoader.java:29` · **Categoria:** performance

evictionCache é um static HashMap<String, SoftReference<ScaledBitmap>> sem limite de tamanho (:29). Entradas são inseridas em entryRemoved a cada eviction do LRU (:25) e só removidas quando a mesma chave é consultada e a SoftReference já morreu (:58) ou em clearCache (:72). Numa biblioteca grande de jogos, o mapa acumula indefinidamente entradas cujo SoftReference já foi limpo pelo GC — vazamento de chaves String, não de bitmaps. Além disso o mapa é acessado da main thread (populateImageView) e potencialmente de threads dos executors, sem sincronização — HashMap não é thread-safe.

**Correção sugerida:** Trocar por outro LruCache limitado (ou ConcurrentHashMap com poda periódica) e/ou fazer uma varredura de expurgo em clearCache/onTrimMemory. No mínimo, sincronizar o acesso ou usar ConcurrentHashMap.

#### ⚪ baixo GenericGridAdapter faz 5 findViewById por bind, sem ViewHolder

**Local:** `app/src/main/java/com/limelight/grid/GenericGridAdapter.java:66` · **Categoria:** performance

getView (:61) reaproveita convertView mas refaz findViewById de grid_image, grid_mask, grid_overlay, grid_text e grid_spinner a cada bind (:66-70). Com GridView em scroll rápido e box arts de 300px, isso soma travamentos perceptíveis em dispositivos modestos. O padrão ViewHolder existe desde 2012 e o app já usa RecyclerView com ViewHolder na lista de perfis (ProfilesAdapter.ProfileViewHolder), então há inconsistência interna.

**Correção sugerida:** Introduzir um ViewHolder guardado em convertView.setTag(). A migração completa GridView->RecyclerView+GridLayoutManager é o alvo maior (ver improvementIdeas).

#### ⚪ baixo Título de tela de perfil montado por concatenação de strings

**Local:** `app/src/main/java/com/limelight/EditProfileActivity.java:64` · **Categoria:** ux

setTitle(getString(R.string.profile_manager_edit_profile) + currentProfile.getName()) (:64) e getString(R.string.profile_manager_profile) + (n+1) (:135) concatenam strings traduzidas com dados — quebra em idiomas com ordem de palavras diferente e em RTL, e não deixa espaço/pontuação sob controle do tradutor. O próprio arquivo já usa a forma correta em outros pontos: profile_manager_edit_profile_with (:181) e profile_manager_new_profile_with (:184) aceitam placeholder. Relacionado: highlightPreferences faz pref.setTitle("*" + pref.getTitle()) (:325), que não é idempotente (chamadas repetidas geram '**') e não é anunciado por leitor de tela. Também há erro de digitação na chave profile_manager_confirm_profile_deleteion (ProfilesAdapter.java:74).

**Correção sugerida:** Usar sempre as variantes _with com %1$s. Tornar highlightPreferences idempotente (guardar o título original ou usar um ícone/summary em vez de prefixo textual). Renomear a chave 'deleteion' para 'deletion' em base e em todos os values-*/.

#### ⚪ baixo Quatro Activities não aplicam o idioma escolhido pelo usuário

**Local:** `app/src/main/java/com/limelight/ProfilesActivity.java:24` · **Categoria:** ux

UiHelper.setLocale só é chamado em PcView:275, AppView:305, Game:348, EditProfileActivity:43, StreamSettings:98 e AddComputerManually:323. ProfilesActivity.onCreate (:24-51), HelpActivity.onCreate, DebugInfoActivity e ExternalDisplayControlActivity.onCreate (:114) não chamam. Com o idioma in-app diferente do idioma do sistema, essas telas aparecem no idioma do sistema, misturando idiomas na mesma sessão. A raiz do problema é a própria abordagem: UiHelper.setLocale (:77-106) muta a Configuration compartilhada de Resources via updateConfiguration (deprecado desde API 25) em vez de usar AppCompatDelegate.setApplicationLocales ou attachBaseContext/createConfigurationContext.

**Correção sugerida:** Curto prazo: chamar UiHelper.setLocale nas quatro Activities faltantes. Médio prazo: migrar para AppCompatDelegate.setApplicationLocales (androidx.appcompat 1.7 já é dependência) e reativar o LanguagePreference.onClick que hoje está 100% comentado (LanguagePreference.java:30-48), abrindo o seletor nativo do Android 13+.

#### ⚪ baixo Labels de Activity e Service hardcoded em inglês no manifest

**Local:** `app/src/main/AndroidManifest.xml:169` · **Categoria:** ux

android:label="Streaming Settings" (:169), android:label="Add Computer Manually" (:182), e os três Services com android:label="mDNS PC Auto-Discovery Service" (:220), "Computer Management Service" (:223), "Usb Driver Service" (:226). Os labels de Activity aparecem no recents/multi-window e em DeX; os de Service aparecem em Configurações > Apps em execução. Nenhum é traduzível. Contraste: EditProfileActivity usa @string/title_edit_profile (:152) e o AccessibilityService usa @string/keyboard_service_label (:245), então o padrão correto já existe no arquivo.

**Correção sugerida:** Criar chaves em strings.xml (ex.: title_stream_settings, title_add_pc já existe em values/strings.xml, service_label_discovery, service_label_computer_manager, service_label_usb_driver) e substituir.

#### ⚪ baixo Toasts e diálogos com texto hardcoded em inglês espalhados pelo código

**Local:** `app/src/main/java/com/limelight/Game.java:624` · **Categoria:** ux

Ocorrências confirmadas de UI text não localizada: Game.java:624 'Display does not support HDR10', :628 'HDR requires Android 7.0 or later', :710 'Decoder does not support HDR10 profile', :714 'No HEVC decoder found', :719 'No AV1 decoder found'; ControllerHandler.java:3102 'Mouse emulation is: ON/OFF'; KeyBoardController.java:498 'Error loading custom keys: '; StreamSettings.java:157 'Language has been reset to default, please restart the app!'; PcView.java:592 otpInput.setHint("PIN"); EditProfileActivity.java:170 e SeekBarPreference.java:149 setPositiveButton("OK"); VirtualControllerElement.java:188 e keyBoardVirtualControllerElement.java:245 alertBuilder.setTitle("Configuration"); SeekBarPreference.java:93 valueText.setText("0%"); row_profile.xml:50 e :58 contentDescription "Edit profile"/"Delete profile".

**Correção sugerida:** Extrair todas para values/strings.xml. Para os "OK" usar @android:string/ok (já usado corretamente em activity_add_computer_manually.xml:52). Habilitar o lint check HardcodedText como erro após a limpeza.

#### ⚪ baixo Notificação persistente do display externo pode sobreviver ao fechamento da Activity

**Local:** `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java:215` · **Categoria:** bug

showStickyNotification (:526) publica uma notificação ongoing com SECONDARY_SCREEN_NOTIFICATION_ID. O cancelamento só existe em Game.java:1033 (NotificationManagerCompat.cancel), ou seja, está atrelado ao ciclo de vida do Game, não ao desta Activity. onDestroy (:215-218) só zera o campo static instance. Se a ExternalDisplayControlActivity for finalizada por outro caminho (botão fechar :424 chama finish(), onPause :207 chama finish() quando não há Game) sem que o Game passe pelo ponto de cancelamento, a notificação persistente fica órfã.

**Correção sugerida:** Cancelar SECONDARY_SCREEN_NOTIFICATION_ID em ExternalDisplayControlActivity.onDestroy, além do cancelamento já existente em Game.

#### ⚪ baixo Percentuais literais não escapados em strings de preferência

**Local:** `app/src/main/res/values/strings.xml:200` · **Categoria:** maintainability

summary_resolution_scale_factor (:200) contém 'e.g. 120% will make...' e title_render_mode_balance_shift_description (:439) contém '50% depth', '100% Pop', '100% Far' com % literal não escapado como %%. Enquanto essas strings forem lidas por getString(int) simples não há crash, mas basta alguém passá-las por getString(int, Object...) ou String.format para gerar UnknownFormatConversionException. As traduções divergem (ru, zh-rCN e zh-rTW removeram os %; fr e vi mantiveram em posições diferentes), o que confirma que os tradutores tratam isso de forma inconsistente. Casos benignos correlatos: suffix_osc_opacity, suffix_seekbar_deadzone e suffix_seekbar_vibrate_fallback_strength são a string '%' sozinha.

**Correção sugerida:** Escapar como %% nas strings que contêm percentual literal (base e todas as traduções), e marcar os sufixos '%' como translatable="false" já que não há o que traduzir.

#### ⚪ baixo AdapterFragment usa android.app.Fragment deprecado enquanto o resto do app usa AndroidX

**Local:** `app/src/main/java/com/limelight/ui/AdapterFragment.java:14` · **Categoria:** tech-debt

AdapterFragment estende android.app.Fragment (framework) e sobrescreve onAttach(Activity) (:18) e onActivityCreated(Bundle) (:31), ambos deprecados. PcView (:195) e AppView (:154, :185) usam getFragmentManager() do framework, enquanto StreamSettings (:86) usa getSupportFragmentManager() do AndroidX. Coexistem dois sistemas de Fragment no mesmo app. android.app.Fragment é deprecado desde a API 28 e o comportamento em recriação de estado é diferente do AndroidX, o que casa com os comentários defensivos sobre reinicialização de views em PcView.onConfigurationChanged (:111-125).

**Correção sugerida:** Migrar AdapterFragment para androidx.fragment.app.Fragment e trocar getFragmentManager() por getSupportFragmentManager() em PcView e AppView. Fazer junto da migração GridView->RecyclerView, já que os dois mexem no mesmo caminho.


## Ideias de melhoria

### Corrigir enqueueCommitText: textos acima de 512 bytes são descartados silenciosamente

**Tamanho:** quick-win

**Por quê:** Bug crítico de uma linha que quebra exatamente a funcionalidade de texto multi-caractere que o fork já anuncia como recurso (title_enable_commit_text / summary_enable_commit_text, strings.xml:695-696). Qualquer ditado por voz longo, colagem ou swipe typing extenso é engolido sem erro visível.

**Como:** Game.java:4331 — substituir 'if (commitTextQueue.size() == 1)' por um controle explícito de agendamento: capturar 'boolean wasEmpty = commitTextQueue.isEmpty();' ANTES do loop de chunking e postar o flush se wasEmpty. Adicionar teste Robolectric (já disponível no build.gradle) com payloads de 1, 511, 512, 513, 2000 e 10000 bytes UTF-8 incluindo emojis (para exercitar o back-step de fronteira de code point nas linhas 4322-4324).

**Risco:** Muito baixo. Mudança localizada, sem impacto em outros caminhos.

### Ressincronizar a lista de idiomas: liberar polonês, turco, búlgaro e português europeu

**Tamanho:** quick-win

**Por quê:** Existem 252 strings em polonês, 253 em turco, 134 em búlgaro e 233 em pt-PT já traduzidas e completamente inacessíveis. É valor pronto na prateleira, custo de dois arquivos.

**Como:** Adicionar <item>Polski</item>/<item>pl</item>, <item>Türkçe</item>/<item>tr</item>, <item>Български</item>/<item>bg</item> e <item>Português</item>/<item>pt</item> em values/arrays.xml:58-107 (manter a mesma posição nos dois arrays, que são posicionalmente acoplados) e as <locale> correspondentes em xml/locales_config.xml. Remover values-ckb/ e values-fa/ (vazios) ou traduzi-los. Escrever um teste unitário que enumere os diretórios values-*/ e compare com language_values e locales_config.xml, falhando na divergência.

**Risco:** Baixo. Cuidado apenas com a ordem posicional dos dois string-arrays de arrays.xml e com o fato de 'iw' (não 'he') ser o código legado usado no projeto.

### Limpeza de recursos e dependências órfãs + habilitar shrinkResources

**Tamanho:** quick-win

**Por quê:** Peso morto que confunde agentes de IA e humanos: dois layouts nunca inflados, dois drawables mortos (um deles um PNG de 51KB), dois diretórios de locale vazios, duas dependências não usadas, um dimen nunca lido e duas strings esvaziadas ainda traduzidas em 24 locales.

**Como:** Remover: res/layout/activity_game_display.xml, res/layout/activity_configure_virtual_controller.xml, res/drawable/list_view_unselected.xml, res/drawable-xhdpi/ouya_icon.png, res/drawable/ic_focus_secondary.xml (e a linha comentada ExternalDisplayControlActivity.java:405), res/values-ckb/, res/values-fa/, app/src/main/java/com/limelight/ui/StreamView.java. Remover do build.gradle as dependências MPAndroidChart e (se não for adotada a ideia de busca) SearchPreference, mais as 6 strings searchpreference_* e as 12 chaves de chart órfãs em values-ru. Corrigir TvChannelHelper.java:122 para usar tv_channel_logo_height. Remover as chaves de compliance category_basic_settings/title_checkbox_stretch_video de todos os values-*/. Adicionar shrinkResources true nos buildTypes (minifyEnabled já é true nos dois).

**Risco:** Baixo, mas shrinkResources exige atenção: o comentário FIXME em build.gradle sobre bundle.density.enableSplit=false menciona 'weird crashes due to missing drawable resources', o que sugere que já houve problema com stripping de recursos. Habilitar shrinkResources em modo 'safe' primeiro e testar release build antes de publicar.

### Conectar a SearchPreference já presente no build à tela de 151 preferências

**Tamanho:** small

**Por quê:** A dependência com.github.ByteHamster:SearchPreference:v2.5.1 já está em build.gradle e as 6 strings searchpreference_* já estão em values/strings.xml:654-659 e traduzidas em vários locales — alguém começou e não terminou. A tela de settings tem 1026 linhas e 151 preferências em 13 categorias, e encontrar qualquer coisa exige scroll cego.

**Como:** Adicionar o <com.bytehamster.lib.preferencesearch.SearchPreference> no topo de preferences.xml (antes do primeiro PreferenceCategory na linha 7), fazer StreamSettings implementar SearchPreferenceResultListener e configurar o SearchConfiguration em StreamSettings.reloadSettings (:82-88) apontando para R.xml.preferences. Verificar se funciona também no EditProfileActivity.ProfilePreferenceFragment, que reusa o mesmo XML.

**Risco:** Baixo. Risco de conflito de tema (a biblioteca usa AppCompat; SettingsTheme já é Theme.AppCompat.NoActionBar na base e AppTheme em values-v29). Se der problema, o plano B é quebrar preferences.xml em PreferenceScreens aninhadas.

### Passada de acessibilidade: contentDescriptions e rótulos de box art

**Tamanho:** small

**Por quê:** Hoje a tela inicial tem três botões anônimos, cada card de jogo é uma imagem sem rótulo e a UI inteira do display externo (5 botões) é invisível para TalkBack. É baixo esforço e alto impacto para usuários de leitor de tela, e também melhora a navegação por D-pad em TV.

**Como:** 1) Adicionar android:contentDescription com @string em settingsButton/helpButton/manuallyAddPc de activity_pc_view.xml (:52,:65,:78) e layout-land/activity_pc_view.xml (:45,:58,:71). 2) Em ExternalDisplayControlActivity.createImageButton (:505), acrescentar um parâmetro de contentDescription e preencher nas 5 chamadas (:406,:423,:424,:430,:441). 3) Em AppGridAdapter.populateView (:171) setar imgView.setContentDescription(obj.app.getAppName()) e marcar grid_overlay com setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO); análogo em PcGridAdapter.populateView (:53) com o nome do PC + estado. 4) Substituir os literais 'Edit profile'/'Delete profile' em row_profile.xml:50,:58 por @string. 5) Verificar tamanhos de alvo: floatingMenuButton e overlayToggleZoomButton em activity_game.xml (:92,:105) têm 36dp, abaixo do mínimo de 48dp.

**Risco:** Muito baixo. Nenhuma mudança funcional.

### Substituir dispatch por rótulo no GameMenu e remover o hack de OnGlobalLayoutListener

**Tamanho:** small

**Por quê:** GameMenu.showMenuDialog identifica a ação clicada comparando o texto do item (:120). Isso quebra com rótulos duplicados — cenário real quando o usuário importa atalhos customizados via JSON (showSpecialKeysMenu:203 usa sc.name sem validação) ou quando o servidor expõe comandos com o mesmo nome (showServerCmd:279). Também acopla lógica de negócio a texto traduzido.

**Como:** Usar o índice 'which' do listener de setAdapter para indexar diretamente o array options (que é posicionalmente idêntico ao adapter, já que ambos são preenchidos na mesma ordem). Com isso, o hack de ViewTreeObserver.OnGlobalLayoutListener (:137-151) que só adiciona os itens ao adapter depois do primeiro layout pode ser removido, ou pelo menos passa a ser seguro. Validar que showServerCmd e showSpecialKeysMenu continuam funcionando.

**Risco:** Baixo. Requer teste manual do menu in-game, do submenu de teclas especiais e dos comandos de servidor.

### Revisão e conclusão da tradução pt-BR (36% -> 100%)

**Tamanho:** medium

**Por quê:** O usuário do fork é brasileiro e toda a UI específica do Artemis (perfis, display virtual, clipboard, teclado on-screen, display externo, commit-text) está em inglês em pt-BR. Além disso há erros concretos de qualidade: lusismos ('rato', 'Selecciona'), anglicismos ('crashou', 'dropar'), typo de pontuação e referências obsoletas a GeForce/GameStream que o fork não usa mais.

**Como:** 1) Corrigir as ocorrências pontuais em values-pt-rBR/strings.xml: linhas 23 (ip_hint), 24-26 (searching_pc), 34/35/112 (crashou), 121 (rede::), 136/218 (dropados/dropar), 246 e 250 (rato/Selecciona). 2) Traduzir as ~419 chaves faltantes priorizando por prefixo: profile_manager_*, vdisplay_*, *clipboard*, keyboard_*, external_display_*/notification_*, game_menu_*, title_/summary_ das categorias novas de preferences.xml. Usar values-zh-rTW (100%) ou values-ru (97%) como referência de escopo — ambos cobrem todas as strings do fork. 3) Decidir o destino de values-pt: hoje 146 das 233 strings são idênticas às de pt-BR; ou reescrevê-lo em pt-PT genuíno ou removê-lo (não é fallback útil, já que pt-BR contém todas as chaves de pt). 4) Reativar o lint MissingTranslation como informational e adicionar contagem de cobertura ao CI.

**Risco:** Baixo tecnicamente; o risco é de consistência terminológica. Criar um glossário curto no repositório (host/PC, stream/transmissão, pareamento, display virtual, perfil, área de transferência) antes de traduzir em volume.

### Introduzir tokens de cor e migrar temas para Material3 antes de qualquer trabalho de tema

**Tamanho:** medium

**Por quê:** values/colors.xml tem UMA cor. Todas as demais são literais espalhados por styles.xml e por pelo menos 8 layouts. Enquanto isso não for centralizado, tema claro, dynamic color e até ajuste de contraste são inviáveis, e cada mudança visual exige caçar hex em vários arquivos.

**Como:** 1) Popular values/colors.xml com tokens semânticos (surface, surface_variant, on_surface, on_surface_variant, overlay_scrim, hud_background, key_background, key_background_pressed). 2) Substituir os literais em values/styles.xml (#1A1A1A nas linhas de AppTheme), activity_pc_view.xml:5, layout-land/activity_pc_view.xml:4, activity_add_computer_manually.xml:3, activity_game_display.xml:5, row_profile.xml:24,:33, activity_profiles.xml, activity_game.xml:49,:69, drawable/bg_ax_keyboard_button.xml, bg_ax_keyboard_button_confirm.xml, floating_menu_button.xml, floating_menu_button_active.xml, ic_hud_bg.xml, key_popup_background.xml. 3) Trocar as referências diretas por ?attr/colorSurface etc. onde fizer sentido. 4) Só então avaliar values-night/ e remover o android:forceDarkAllowed="false" de values-v29/styles.xml.

**Risco:** Médio. Mudança visual ampla que precisa de revisão em tela; o comentário em values-v29 ('Avoid some systems like MIUI which break the visibility of games title') indica que forceDarkAllowed=false foi uma correção de bug real em MIUI — não remover sem testar.

### Reativar o seletor nativo de idioma do Android 13+ e migrar para AppCompatDelegate.setApplicationLocales

**Tamanho:** medium

**Por quê:** LanguagePreference.java existe como subclasse vazia com todo o corpo comentado (:30-48) — o suporte ao seletor nativo foi escrito e desligado. A abordagem atual (UiHelper.setLocale mutando Resources.updateConfiguration, deprecado desde API 25) causa os problemas observados: quatro Activities exibindo idioma diferente das outras, necessidade de System.exit(0) para aplicar a troca (StreamSettings.java:158), e a lista de idiomas duplicada entre arrays.xml e locales_config.xml.

**Como:** 1) Migrar UiHelper.setLocale (UiHelper.java:77-106) para AppCompatDelegate.setApplicationLocales(LocaleListCompat) — androidx.appcompat 1.7.1 já é dependência e o androidx.appcompat cuida do backport até API 21 via AppLocalesMetadataHolderService. 2) Descomentar e adaptar LanguagePreference.onClick (:30-48) para API 33+. 3) Com isso, arrays.xml deixa de ser a fonte de verdade e locales_config.xml passa a ser suficiente, eliminando a duplicação. 4) Remover o System.exit(0) de StreamSettings.onBackPressed (:158) e a comparação com == (:156). 5) As Activities que hoje não chamam setLocale (ProfilesActivity, HelpActivity, DebugInfoActivity, ExternalDisplayControlActivity) passam a funcionar automaticamente.

**Risco:** Médio. O comentário em UiHelper.java:91 ('nasty non-standard devices which cannot set locale using system config correctly') indica que o hack manual existe por causa de OEMs problemáticas — manter um caminho de fallback e testar em Xiaomi/MIUI e Samsung antes de remover o código antigo.

### Adicionar recursos alternativos para tablets e foldables (sw600dp) e revisar o suporte a TV

**Tamanho:** medium

**Por quê:** O app declara LEANBACK_LAUNCHER e MULTIWINDOW_LAUNCHER, tem resizeableActivity=true em quase todas as Activities e suporte a Samsung DeX, mas não tem nenhum recurso alternativo por tamanho de tela. Em tablet os cards de 170x220dp ficam perdidos; em TV a única adaptação é 15dp de padding em runtime.

**Como:** 1) Criar values-sw600dp/dimens.xml com larguras de coluna maiores e mover as dimensões fixas de app_grid_item.xml (170dp/220dp) e app_grid_item_small.xml (110dp/143dp) e de app_grid_view.xml:7 (columnWidth 170dp) para @dimen. 2) Avaliar layout-sw600dp/activity_pc_view.xml com painel lateral persistente em vez da coluna de ImageButtons. 3) Substituir o heurístico de contagem de pixels em StreamSettings.onConfigurationChanged (:135) por androidx.window WindowSizeClass/WindowMetricsCalculator. 4) Para TV, garantir nextFocusUp/Down/Left/Right consistentes (hoje só layout-land/activity_pc_view.xml:51,:64 e pc_grid_view.xml:11 declaram) e revisar o defaultFocusHighlightEnabled="false" de activity_game.xml:19.

**Risco:** Baixo-médio. Requer dispositivos ou emuladores de tablet/foldable/TV para validar. Não mexe em nenhum caminho de streaming.

### Modernizar CachedAppAssetLoader: sair de AsyncTask e corrigir os defeitos de robustez do cache

**Tamanho:** medium

**Por quê:** AsyncTask é deprecada desde a API 30 e o pipeline de box art acumula três defeitos concretos (NPE potencial de textView, equals sem hashCode em LoaderTuple, evictionCache estático ilimitado e não thread-safe) além de manter um bitmap placeholder 1x1 nunca reciclado. É o segundo caminho mais quente da UI depois do stream.

**Como:** 1) Substituir a LoaderTask (CachedAppAssetLoader.java:145) por Runnables nos ThreadPoolExecutors já existentes (:34-50) com postagem de resultado via Handler(Looper.getMainLooper()), preservando a mecânica de AsyncDrawable (:255) para cancelamento. 2) Adicionar null-check de imageView/textView em onProgressUpdate (:188) e onPostExecute (:211). 3) Adicionar hashCode() a LoaderTuple (:372). 4) Trocar evictionCache (MemoryAssetLoader.java:29) por um segundo LruCache limitado ou ConcurrentHashMap com poda, e sincronizar o acesso. 5) Considerar substituir tudo por Coil/Glide, o que eliminaria ~600 linhas de código de cache caseiro — mas avaliar o custo em tamanho de APK, já que o projeto hoje não tem nenhuma biblioteca de imagem.

**Risco:** Médio. O cancelamento por AsyncDrawable é sutil e uma regressão aqui aparece como box art trocada entre células durante scroll. Cobrir com testes Robolectric antes de mexer.

### EPIC: Campo de composição de texto ('Enviar texto') que manda a string inteira pela conexão

**Tamanho:** large

**Por quê:** Dor nº2 do dono do fork. O transporte já existe e está testado: conn.sendUtf8Text é usado em três lugares (Game.java:325, 2095, 2206) e enqueueCommitText (:4314) já faz chunking UTF-8 correto em 512 bytes com pacing de 15ms. Falta apenas a UI. Além disso, digitar num EditText local e enviar de uma vez elimina o problema de latência e de teclas perdidas do caminho tecla-a-tecla, e é imune a jogos que engolem input.

**Como:** 1) PRÉ-REQUISITO: corrigir o bug de enqueueCommitText (Game.java:4331) que impede o envio de textos com mais de um chunk — sem isso a feature nasce quebrada. 2) Criar res/layout/dialog_send_text.xml com um EditText multi-linha (inputType textMultiLine|textNoSuggestions), um checkbox 'enviar Enter ao final' e botões Enviar/Cancelar; usar tokens de cor, não literais. 3) Adicionar um MenuOption em GameMenu.showMenu (GameMenu.java:288, ao lado de game_menu_toggle_keyboard na linha 317) com nova string game_menu_send_text; ao confirmar, chamar um novo método público Game.sendTextBlock(String) que delega a enqueueCommitText. 4) Adicionar o mesmo botão na UI programática do display externo (ExternalDisplayControlActivity.createProgrammaticUI:387) para paridade. 5) Persistir um histórico curto (últimas 5 entradas) em SharedPreferences para reenvio rápido. 6) Opcionalmente integrar com o clipboard já existente (game_menu_upload_clipboard, strings :629) pré-preenchendo o campo com o conteúdo da área de transferência. 7) Como o diálogo tem um EditText real, o IME vai se comportar normalmente (sem depender do hack de InputConnection sobre o SurfaceView) — combinar com o EPIC de resize para o diálogo não ser coberto.

**Risco:** Baixo-médio. Precisa validar que sendUtf8Text é aceito pelo host Vibeshine/Apollo para payloads grandes e que o pacing de 15ms/chunk não é rápido demais para o host. Caracteres não-ASCII dependem do suporte de UTF-8 text injection no lado servidor (Apollo suporta; Sunshine vanilla mais antigo pode não). Adicionar fallback: se sendUtf8Text falhar, cair para o caminho de KeyEvent por caractere (Game.java:2095).

### Migrar os grids de GridView+android.app.Fragment para RecyclerView+androidx.fragment

**Tamanho:** large

**Por quê:** O caminho de listagem é a parte mais antiga do app: GridView legado, BaseAdapter sem ViewHolder (5 findViewById por bind em GenericGridAdapter.java:66-70), hospedado num android.app.Fragment deprecado (AdapterFragment.java:14) com getFragmentManager() do framework — enquanto StreamSettings já usa AndroidX. A lista de perfis já usa RecyclerView, então existe um padrão interno a seguir. Resolve de uma vez performance de scroll, suporte a tablets (GridLayoutManager com spanCount dinâmico) e o débito de Fragment.

**Como:** 1) Converter AdapterFragment para androidx.fragment.app.Fragment e trocar getFragmentManager() por getSupportFragmentManager() em PcView.java:195 e AppView.java:154,:185. 2) Trocar app_grid_view.xml/app_grid_view_small.xml/pc_grid_view.xml por RecyclerView com GridLayoutManager e spanCount calculado por largura disponível (elimina a necessidade dos dois layouts _small e permite adaptação a tablet/foldable sem novos qualifiers). 3) Reescrever GenericGridAdapter como RecyclerView.Adapter com ViewHolder, espelhando ProfilesAdapter.ProfileViewHolder. 4) Substituir registerForContextMenu/openContextMenu (PcView.java:901,:911; AppView.java:757,:774) por long-press listeners no ViewHolder ou por BottomSheet. 5) Aproveitar para modernizar CachedAppAssetLoader de AsyncTask para ExecutorService+Handler ou Coroutines/WorkManager, e corrigir o NPE de textView (:205,:223) e o hashCode de LoaderTuple (:382).

**Risco:** Alto em escopo, baixo em risco por item. O menu de contexto do AbsListView é usado extensivamente (AdapterContextMenuInfo em PcView.java:405,:734 e AppView.java:486,:594) e é o ponto que mais quebra. Recomenda-se migrar PcView primeiro (grid menor, menos casos de menu) e só depois AppView. Fazer em PR separado do trabalho de teclado para não misturar riscos.

### EPIC: Modo 'IME docked' — empurrar/redimensionar o stream quando o teclado abre (comportamento AnyDesk)

**Tamanho:** epic

**Por quê:** É a dor nº1 explicitada pelo dono do fork. Hoje o IME cobre o stream porque a .Game não declara windowSoftInputMode e usa immersive sticky com LAYOUT_FULLSCREEN. O caminho é curto porque toda a infraestrutura de re-medição já existe: StreamContainer.onMeasure já faz fit por aspect ratio, e o layout raiz é um <merge> inflado direto no FrameLayout de android.R.id.content, então um bottom padding no content view redimensiona o container inteiro.

**Como:** 1) AndroidManifest.xml:193 — adicionar android:windowSoftInputMode="adjustResize" na .Game. 2) Game.java, logo após setContentView (:378), instalar ViewCompat.setOnApplyWindowInsetsListener no findViewById(android.R.id.content) lendo insets.getInsets(WindowInsetsCompat.Type.ime()).bottom e aplicando como bottom padding — usar exatamente o padrão já validado em ExternalDisplayControlActivity.java:169-176. 3) Substituir o Runnable hideSystemUi (Game.java:1646-1668) por WindowInsetsControllerCompat com BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE + WindowCompat.setDecorFitsSystemWindows(false), mantendo o caminho legado sob Build.VERSION_CODES.R para minSdk 21. 4) Adicionar WindowInsetsAnimationCompat.Callback para o padding acompanhar a animação do teclado em vez de saltar. 5) Aplicar a MESMA lógica ao teclado próprio: KeyBoardLayoutController.refreshLayout (:330) hoje faz addView com Gravity.BOTTOM sobre o stream — fazer o controller reportar sua altura via ViewCallbacks (:375) e o Game aplicar o mesmo padding. 6) Corrigir os imeOptions (StreamContainer.java:191) adicionando IME_FLAG_NO_FULLSCREEN para evitar extract mode em landscape. 7) Nova preferência checkbox_resize_stream_on_keyboard em preferences.xml (categoria category_input_settings, linha 363) com strings title_/summary_ novas. 8) Ao redimensionar, reavaliar se o pan/zoom (PanZoomHandler, criado em Game.java:481) precisa ser resetado ou reancorado.

**Risco:** Médio-alto. adjustResize interage mal com immersive sticky legado em algumas OEMs (MIUI, One UI) e pode fazer o SurfaceView recriar a superfície, disparando surfaceChanged (StreamContainer.java:240) e potencialmente um reconfigure do decoder — precisa testar se o pipeline de vídeo aguenta resize sem reconectar. Em modo 3D (GLSurfaceView) o onMeasure faz early-return (StreamContainer.java:115-118), então o caminho 3D precisa de tratamento separado. Também há risco de conflito com supportsPictureInPicture e com o display externo (isOnExternalDisplay). Recomenda-se ficar atrás de preferência e testar em Samsung/Xiaomi/Pixel.


## Glossário

- Artemis: nome do fork de ClassicOldSong do Moonlight Android. O applicationId é com.limelight com suffix .noir (release) ou .noirdebug (debug, rotulado 'Diana'). O label vem de resValue app_label definido em app/build.gradle por buildType, e é aplicado pelos manifests de flavor (app/src/nonRoot_game/AndroidManifest.xml, app/src/root/AndroidManifest.xml, app/src/game/AndroidManifest.xml), não pelo manifest main.
- Apollo: fork do Sunshine (host de streaming em PC) com o qual o Artemis pareia. Adiciona display virtual automático, sincronização de clipboard bidirecional, pareamento por OTP+passphrase e comandos de servidor. Várias strings do app dizem explicitamente 'requires Apollo' (ex.: summary_smart_clipboard_sync em values/strings.xml:547).
- Vibeshine: fork do Sunshine/Apollo usado pelo dono deste repositório, com display virtual automático. Do ponto de vista do cliente Android é indistinguível de Apollo.
- Moonlight V+ / qiin2333: outro fork de cliente Moonlight Android, usado hoje pelo dono do fork como referência de comportamento de teclado.
- StreamContainer: FrameLayout customizado (com.limelight.ui.StreamContainer) que hospeda o SurfaceView (modo 2D) ou o GLSurfaceView (modos 3D SBS) do stream e implementa onMeasure com aspect ratio fit/fill. É o componente ativo. NÃO confundir com StreamView, que é a classe antiga e morta no mesmo pacote.
- StreamView: classe legada com.limelight.ui.StreamView, 167 linhas, sem nenhuma referência no projeto. Foi substituída por StreamContainer. Ambas declaram uma interface interna chamada InputCallbacks, com assinaturas diferentes — fonte comum de confusão.
- commitText / commit-text input: mecanismo pelo qual um IME entrega texto de múltiplos caracteres de uma vez (swipe typing, predição, ditado por voz) em vez de KeyEvents individuais. No Artemis é ativado pela preferência checkbox_enable_commit_text (preferences.xml:479) e implementado sobrescrevendo BaseInputConnection.commitText em StreamContainer/ExternalControllerView, terminando em Game.handleCommitText -> enqueueCommitText -> conn.sendUtf8Text.
- sendUtf8Text: método de NvConnection que envia uma string UTF-8 pelo protocolo Moonlight para ser injetada como texto no host. É o transporte que permite 'enviar texto inteiro pela conexão'. Usado em Game.java:325 (flush do commitTextQueue), :2095 (caractere único) e :2206 (KeyEvent.getCharacters).
- OSC (On-Screen Controls): controles virtuais desenhados sobre o stream — gamepad virtual (com.limelight.binding.input.virtual_controller) e teclado virtual (subpacote keyboard). Prefixo usado em várias strings (title_reset_osc, suffix_osc_opacity, seekbar_keyboard_axi_opacity).
- Teclado 'axi' / axixi: nome interno do teclado full on-screen do fork. res/layout/layout_axixi_keyboard.xml (31KB) é um LinearLayout estático com 84 TextViews SEM NENHUM android:id — cada tecla é identificada por android:tag contendo o keycode Android em string ('111' = ESC, '131' = F1) ou a string literal 'hide'. Inflado e controlado por KeyBoardLayoutController.
- KeyBoardLayoutController vs KeyBoardController: dois arquivos diferentes no mesmo pacote. KeyBoardLayoutController (379 linhas) gerencia o teclado FULL estático de layout_axixi_keyboard.xml. KeyBoardController (795 linhas) gerencia o teclado de teclas especiais CONFIGURÁVEL, salvo em JSON e posicionável pelo usuário.
- AdapterFragment / AdapterFragmentCallbacks: par de classes que desacopla PcView/AppView do GridView. A Activity implementa AdapterFragmentCallbacks e devolve o layout id via getAdapterFragmentLayoutId(); o Fragment infla e devolve o AbsListView via receiveAbsListView(). Usa android.app.Fragment (framework, deprecado), não AndroidX.
- LoaderTuple: chave lógica (ComputerDetails + NvApp) que identifica uma box art no pipeline de cache. Definida como classe estática interna em CachedAppAssetLoader:372. Sobrescreve equals mas não hashCode.
- ScaledBitmap: wrapper simples (originalWidth, originalHeight, Bitmap) usado para detectar box arts placeholder do GFE por dimensão exata (130x180 no GFE 2.0, 628x888 no GFE 3.0) em CachedAppAssetLoader.isBitmapPlaceholder:328.
- scalingDivisor: fator calculado em AppGridAdapter.updateLayoutWithPreferences:97 como ART_WIDTH_PX(300) / (larguraDaCélulaEmDp * densidade), usado para fazer downsampling da box art na decodificação. Nunca menor que 1.0.
- smallIconMode: preferência booleana que troca simultaneamente o layout de item (app_grid_item vs app_grid_item_small) e o de grid (app_grid_view 170dp vs app_grid_view_small 110dp). É o único mecanismo de adaptação de densidade de conteúdo do app.
- Perfil (SettingsProfile) / ProfilesManager: recurso exclusivo do fork que salva conjuntos completos de preferências e permite alternar entre eles. UI em ProfilesActivity + EditProfileActivity (que reusa a mesma preferences.xml via um PreferenceDataStore em memória). Todas as strings usam o prefixo profile_manager_.
- ExternalDisplayControlActivity: Activity singleInstance com taskAffinity vazio que fica no display PRIMÁRIO servindo de touchpad/controle enquanto o Game roda no display SECUNDÁRIO. Toda a UI é criada programaticamente. É a única classe do repo que usa WindowInsetsCompat.Type.ime().
- values-iw: código de locale LEGADO para hebraico usado pelo Android (o ISO moderno é 'he'). O projeto usa 'iw' consistentemente em values-iw/, arrays.xml e locales_config.xml — não trocar para 'he' sem verificar os três lugares.
- locales_config.xml + language_names/language_values: DUAS fontes de verdade paralelas para a lista de idiomas. locales_config.xml (referenciado por android:localeConfig no manifest) alimenta o seletor nativo do Android 13+; os dois string-arrays de values/arrays.xml alimentam o seletor in-app e são POSICIONALMENTE ACOPLADOS entre si. Os próprios arquivos têm comentários lembrando de sincronizá-los; hoje estão sincronizados entre si mas dessincronizados dos diretórios values-*/ existentes.
- Strings de 'Compliance': bloco no final de values/strings.xml (linhas 675-676) com category_basic_settings e title_checkbox_stretch_video declaradas VAZIAS (<string name=... />). São chaves que foram removidas do uso mas mantidas como stub para não quebrar as 24 traduções que ainda as contêm.
- adjustResize vs adjustPan: valores de android:windowSoftInputMode. adjustResize encolhe a janela para o teclado (comportamento AnyDesk desejado); adjustPan apenas rola a janela. A Activity .Game não declara nenhum dos dois, e o immersive fullscreen legado faz com que nenhum deles tenha efeito sem migração para a API de insets.
- IME_FLAG_NO_EXTRACT_UI vs IME_FLAG_NO_FULLSCREEN: flags de EditorInfo.imeOptions. A primeira (única usada hoje, StreamContainer.java:191) esconde o campo de extração do IME; a segunda, ausente, é a que impede o IME de entrar em modo fullscreen em telas baixas/landscape.
