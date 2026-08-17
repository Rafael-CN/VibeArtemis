# Preferências, Configuração e Perfis (com.limelight.preferences, com.limelight.profiles, EditProfileActivity, res/xml/preferences.xml)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (24)
6. [Ideias de melhoria](#ideias-de-melhoria) (14)
7. [Glossário](#glossário)

## Como funciona

Toda a configuração do Artemis vive em um único arquivo de SharedPreferences default (PreferenceManager.getDefaultSharedPreferences) descrito declarativamente por app/src/main/res/xml/preferences.xml (1026 linhas, 133 android:key, 11 PreferenceCategory) e lido imperativamente por PreferenceConfiguration.readPreferences() (PreferenceConfiguration.java:712-1040), que devolve um POJO com ~110 campos públicos consumido por Game, AppView, PcView, ControllerHandler, MediaCodecDecoderRenderer e pelos controles virtuais. Não existe binding automático entre XML e Java: cada chave é lida à mão com um default literal duplicado no Java, então divergências entre `android:defaultValue` e o default do getter são invisíveis ao compilador — e existem (ver findings). A UI de settings é StreamSettings (AppCompatActivity + PreferenceFragmentCompat interno SettingsFragment, StreamSettings.java:164-1085), que infla preferences.xml e depois faz poda dinâmica por capacidade de hardware/OS (touchscreen, pointer capture, sensores, USB host, PiP, vibração, HDR10, decoders AVC/HEVC via MediaCodecHelper) e injeta entradas nativas de resolução/refresh rate lidas de Display.getSupportedModes(). O sistema de perfis (com.limelight.profiles) é uma camada de override: SettingsProfile é {uuid, name, createdUtc, modifiedUtc, Map<String,Object> options} serializado por Gson em files/profiles/profiles.json (ProfilesManager.java:30-131), e ProfilesManager.getOverlayingSharedPreferences() devolve um SharedPreferences decorator (OverlaySharedPreferences, ProfilesManager.java:212-258) que faz shadow das chaves do perfil ativo sobre as prefs reais. Praticamente todo readPreferences passa por esse overlay, de modo que ativar um perfil muda a configuração efetiva do app inteiro sem tocar nas prefs globais. Porém o overlay é read-only por acidente: edit() delega para base.edit() (ProfilesManager.java:251), logo qualquer escrita feita através dele (migrações legacy, reset pós-crash, memorização de modo de mouse, default de metered bitrate) grava no arquivo base e continua sendo sombreada pelo perfil — a escrita "não faz efeito". O editor de perfil (EditProfileActivity.java) reaproveita o mesmo fragment de settings apontando um PreferenceDataStore para um SharedPreferences totalmente em memória, e ao criar um perfil novo copia getAll() das prefs globais — ou seja, um perfil é um snapshot completo (inclusive de lixo de runtime como `performance_log`, `number_zoom_scale`, `number_pan_offset_*`), não um delta; o cálculo de delta (diff(), EditProfileActivity.java:232-248) só serve para prefixar títulos com "*". Perfis são globais e ativados manualmente por RadioButton (ProfilesAdapter.java:54-63): NÃO existe vínculo perfil↔host nem perfil↔app em lugar nenhum do código — o único acoplamento por host/app hoje é a lista de apps ocultos ("HiddenApps", AppView.java:85,323,348) e o cache de applist. Existem ainda 6 arquivos de preferências satélite fora do default: "GlPreferences" (renderer GL), "DecoderTombstone" (contador de crash que dispara resetStreamingSettings a cada 3 crashes, UiHelper.java:183-193), "HiddenApps", "OSC" (layout do gamepad virtual), "OSC_Keyboard".."OSC_Keyboard_5" (5 slots de teclado virtual, escolhidos pela chave `keyboard_axi_list` que é literalmente o nome do arquivo) e "specialPrefs"/`special_key` (JSON de botões especiais). Backup em nuvem está desabilitado para sharedpref (backup_rules.xml, backup_rules_s.xml), então nenhuma configuração migra entre dispositivos — mas profiles.json (em files/) NÃO está excluído, o que cria uma assimetria. Do ponto de vista do dono do fork: não existe nenhuma chave relacionada a comportamento do IME/teclado virtual do sistema (empurrar/redimensionar o stream), a Activity Game não declara windowSoftInputMode no AndroidManifest.xml:193-216, e o único mecanismo de envio de texto em bloco já existente é `checkbox_enable_commit_text` (default OFF, PreferenceConfiguration.java:991) que habilita onCreateInputConnection em StreamView/StreamContainer e envia via conn.sendUtf8Text() em chunks de 512 bytes (Game.java:313-330, 4289-4335). O único lugar do código que já trata WindowInsetsCompat.Type.ime() é ExternalDisplayControlActivity.java:170-176 — é o protótipo mais próximo do comportamento tipo AnyDesk.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 1041 | Fonte única de verdade em runtime da configuração. Declara ~130 constantes de chave, os defaults Java (duplicados em relação ao XML) e um POJO com ~110 campos públicos. readPreferences() também executa as migrações de chaves legacy e grava defaults calculados de volta no disco. |
| [`app/src/main/res/xml/preferences.xml`](../../app/src/main/res/xml/preferences.xml) | 1026 | Declaração da tela de settings: 11 PreferenceCategory e 133 android:key (incluindo as categorias). Define android:defaultValue, dependências (android:dependency), ranges de SeekBarPreference (seekbar:min/step/divisor/keyStep) e as entries/entryValues via @array. |
| [`app/src/main/java/com/limelight/preferences/StreamSettings.java`](../../app/src/main/java/com/limelight/preferences/StreamSettings.java) | 1087 | Activity + PreferenceFragmentCompat da tela de settings. Faz poda dinâmica de preferências por capacidade de hardware/OS, injeta resoluções e refresh rates nativos do display, valida os EditTextPreference customizados e implementa import/export de layouts de teclado e envio de logs de performance. |
| [`app/src/main/java/com/limelight/EditProfileActivity.java`](../../app/src/main/java/com/limelight/EditProfileActivity.java) | 476 | Editor de perfil. Reusa StreamSettings.SettingsFragment com um PreferenceDataStore apontando para um SharedPreferences 100% em memória; salva o mapa resultante dentro do SettingsProfile. Perfil novo = snapshot completo das prefs globais. |
| [`app/src/main/java/com/limelight/profiles/ProfilesManager.java`](../../app/src/main/java/com/limelight/profiles/ProfilesManager.java) | 266 | Singleton que carrega/salva files/profiles/profiles.json (Gson), mantém o perfil ativo e expõe o SharedPreferences decorator que aplica o patch do perfil sobre as prefs reais. É o ponto por onde 100% das leituras de PreferenceConfiguration passam. |
| [`app/src/main/java/com/limelight/profiles/SettingsProfile.java`](../../app/src/main/java/com/limelight/profiles/SettingsProfile.java) | 62 | POJO do perfil serializado por Gson: uuid, name, createdUtc, modifiedUtc e Map<String,Object> options (o patch de preferências). Campo isActive é transient e nunca é usado de fato. |
| [`app/src/main/java/com/limelight/profiles/ProfilesAdapter.java`](../../app/src/main/java/com/limelight/profiles/ProfilesAdapter.java) | 109 | RecyclerView.Adapter da lista de perfis: ativa/desativa por RadioButton, abre EditProfileActivity e confirma exclusão. Chama save() redundantemente (o manager já persiste). |
| [`app/src/main/java/com/limelight/ProfilesActivity.java`](../../app/src/main/java/com/limelight/ProfilesActivity.java) | 75 | Tela de listagem de perfis com FAB de criação e empty state; registra-se como ProfileChangeListener. |
| [`app/src/main/java/com/limelight/preferences/SeekBarPreference.java`](../../app/src/main/java/com/limelight/preferences/SeekBarPreference.java) | 205 | Preference customizada com diálogo de SeekBar. Lê atributos direto do AttributeSet (namespace http://schemas.moonlight-stream.com/apk/res/seekbar: min/step/divisor/keyStep). O fallback de defaultValue é getDefaultBitrate(context), avaliado avidamente para TODOS os seekbars. |
| [`app/src/main/java/com/limelight/preferences/AddComputerManually.java`](../../app/src/main/java/com/limelight/preferences/AddComputerManually.java) | 407 | Activity de adição manual de host e handler do deep link art:// (inclui art://launch?host_uuid=...&app_uuid=... e pareamento via ?pin=&passphrase=). Não persiste nenhuma preferência: grava direto no ComputerManagerService. |
| [`app/src/main/res/values/arrays.xml`](../../app/src/main/res/values/arrays.xml) | 203 | entries/entryValues de todas as ListPreference. Contém o mapeamento canônico de resolução, fps, frame pacing (inclui warp/warp2/cap-fps), video format, mouse mode (6 modos), render mode, alinhamento do teclado virtual e os 5 slots de teclado. |
| [`app/src/main/java/com/limelight/preferences/GlPreferences.java`](../../app/src/main/java/com/limelight/preferences/GlPreferences.java) | 37 | Arquivo de prefs separado ("GlPreferences") com Renderer e Fingerprint, usado por MediaCodecHelper para decidir quirks de decoder. Não passa pelo overlay de perfis. |
| [`app/src/main/java/com/limelight/preferences/ConfirmDeleteKeyboardPreference.java`](../../app/src/main/java/com/limelight/preferences/ConfirmDeleteKeyboardPreference.java) | 55 | DialogPreference que limpa o arquivo de layout do teclado virtual atualmente selecionado (lê keyboard_axi_list direto das prefs default, ignorando o perfil ativo). |
| [`app/src/main/java/com/limelight/preferences/ConfirmDeleteOscPreference.java`](../../app/src/main/java/com/limelight/preferences/ConfirmDeleteOscPreference.java) | 50 | DialogPreference que limpa o arquivo "OSC" (layout do gamepad virtual). |
| [`app/src/main/java/com/limelight/preferences/SmallIconCheckboxPreference.java`](../../app/src/main/java/com/limelight/preferences/SmallIconCheckboxPreference.java) | 30 | CheckBoxPreference cujo default é calculado (TV/leanback/tablet <500dp). Na prática o override nunca roda porque o XML não declara android:defaultValue. |
| [`app/src/main/java/com/limelight/preferences/WebLauncherPreference.java`](../../app/src/main/java/com/limelight/preferences/WebLauncherPreference.java) | 43 | Preference que abre uma URL fixa declarada no atributo custom 'url' (sem namespace). Usada para wiki, releases e Obtainium. |
| [`app/src/main/java/com/limelight/preferences/LanguagePreference.java`](../../app/src/main/java/com/limelight/preferences/LanguagePreference.java) | 55 | ListPreference de idioma; o override que abriria as configurações nativas de locale do Android 13+ está inteiramente comentado. |
| [`app/src/main/java/com/limelight/ArtemisApplication.java`](../../app/src/main/java/com/limelight/ArtemisApplication.java) | 17 | Application que carrega os perfis no boot do processo; se falhar exibe Toast. É o único ponto que injeta o appContext usado pelo auto-save do ProfilesManager. |
| [`app/src/main/AndroidManifest.xml`](../../app/src/main/AndroidManifest.xml) | 260 | Declara StreamSettings, ProfilesActivity, EditProfileActivity (theme SettingsTheme) e Game. Game NÃO declara android:windowSoftInputMode — ponto de ancoragem para o comportamento de IME desejado. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`**
- `readPreferences(Context) :712`
- `readPreferences(Context, SharedPreferences) :716`
- `getDefaultBitrate(String,String) :495`
- `getDefaultBitrate(Context) :578`
- `getDefaultSmallMode(Context) :558`
- `getVideoFormatValue() :585`
- `getVideoScaleMode() :607`
- `getSelectedFramePacingName() :626`
- `getPreferLowerDelays() :632`
- `getFramePacingValue() :637`
- `getAnalogStickForScrollingValue() :668`
- `resetStreamingSettings(Context) :683`
- `isNativeResolution() :395`
- `isSquarishScreen() :421`
- `convertFromLegacyResolutionString() :444`
- `isShieldAtvFirmwareWithBrokenHdr() :705`
- `enum ScaleMode :14`
- `enum FormatOption :20`
- `enum AnalogStickForScrolling :27`
- `forceTightThresholds (campo morto) :233`

**`app/src/main/res/xml/preferences.xml`**
- `category_video_settings :7`
- `category_gamepad_settings :242`
- `category_input_settings :364`
- `category_ui_settings :528`
- `category_onscreen_controls :649`
- `category_special_key_layout :739`
- `category_virtual_trackpad_settings :809`
- `category_perf_monitor_settings :886`
- `category_advanced_settings :940`
- `category_settings_misc :979`
- `checkbox_forceTightThresholds (morta) :76`
- `checkbox_enable_joyconfix (morta) :322`
- `checkbox_enable_commit_text :479`
- `seekbar_onscreen_keyboard_height :576`
- `list_onscreen_keyboard_align_mode :599`
- `keyboard_axi_list :770`

**`app/src/main/java/com/limelight/preferences/StreamSettings.java`**
- `reloadSettings() :77`
- `SettingsFragment :164`
- `SettingsFragment.getPrefs() :174`
- `initializePreferences() :335`
- `addNativeResolutionEntries() :235`
- `addNativeFrameRateEntry() :242`
- `removeEntryFromListAndSetValue() :961`
- `resetBitrateToDefault() :304`
- `editAndReload() :972`
- `onActivityResult() :998`
- `onDisplayPreferenceDialog() :1047`
- `getJsonContent() :1060`
- `getAllJsonData() (morto) :1073`
- `onBackPressed() :143`

**`app/src/main/java/com/limelight/EditProfileActivity.java`**
- `onCreate() :39`
- `saveProfile() :119`
- `showRenameDialog() :161`
- `getInMemoryPrefs() :191`
- `ProfilePreferenceFragment :195`
- `ProfilePreferenceFragment.onCreatePreferences() :266`
- `ProfilePreferenceFragment.getPrefs() :251`
- `InMemoryPreferenceDataStore :196`
- `diff() :232`
- `highlightPreferences() :314`
- `InMemorySharedPreferences :334`
- `InMemorySharedPreferences.getFloat() :371`
- `InMemoryEditor :406`

**`app/src/main/java/com/limelight/profiles/ProfilesManager.java`**
- `getInstance() :42`
- `load(Context) :49`
- `save(Context) :102`
- `add/update/delete :137,143,149`
- `setActive(UUID) :158`
- `getActive() :164`
- `getActiveName() :169`
- `getOverlayingSharedPreferences(Context) :200`
- `OverlaySharedPreferences :212`
- `OverlaySharedPreferences.edit() (delega para base) :251`
- `ProfilesData :188`
- `ProfileChangeListener :193`
- `saveIfPossible() :260`

**`app/src/main/java/com/limelight/profiles/SettingsProfile.java`**
- `SettingsProfile(...) :15`
- `getOptions() :47`
- `setOptions() :51`
- `isActive()/setActive() :55,59`

**`app/src/main/java/com/limelight/profiles/ProfilesAdapter.java`**
- `onBindViewHolder() :41`
- `setActive/deactivate handler :54`
- `edit handler :65`
- `delete handler :71`
- `getItemCount() :89`
- `ProfileViewHolder :93`

**`app/src/main/java/com/limelight/ProfilesActivity.java`**
- `onCreate() :24`
- `onProfilesChanged() :60`
- `updateUI() :64`

**`app/src/main/java/com/limelight/preferences/SeekBarPreference.java`**
- `SeekBarPreference(Context,AttributeSet) :40`
- `getDialog() :72`
- `onSetInitialValue(boolean,Object) (API deprecada) :173`
- `setProgress()/getProgress() :184,190`
- `showDialog() :194`
- `fallback getDefaultBitrate :63`

**`app/src/main/java/com/limelight/preferences/AddComputerManually.java`**
- `doAddPc() :121`
- `parseRawUserInputToUri() :103`
- `isWrongSubnetSiteLocalAddress() :60`
- `onCreate() (deep link art://) :280`
- `handleDoneEvent() :396`

**`app/src/main/res/values/arrays.xml`**
- `resolution_values :13`
- `fps_values :28`
- `video_frame_pacing_values :130`
- `video_format_values :115`
- `mouse_mode_values :183`
- `render_mode_values :170`
- `onscreen_keyboard_align_values :197`
- `keyboard_axi_values :158`
- `keyboard_axi_names (5 rótulos idênticos) :151`

**`app/src/main/java/com/limelight/preferences/GlPreferences.java`**
- `readPreferences(Context) :21`
- `writePreferences() :31`

**`app/src/main/java/com/limelight/preferences/ConfirmDeleteKeyboardPreference.java`**
- `DialogFragmentCompat.onDialogClosed() :46`

**`app/src/main/java/com/limelight/preferences/ConfirmDeleteOscPreference.java`**
- `DialogFragmentCompat.onDialogClosed() :43`

**`app/src/main/java/com/limelight/preferences/SmallIconCheckboxPreference.java`**
- `onGetDefaultValue() :29`

**`app/src/main/java/com/limelight/preferences/WebLauncherPreference.java`**
- `initialize(AttributeSet) :30`
- `onClick() :40`

**`app/src/main/java/com/limelight/preferences/LanguagePreference.java`**
- `onClick() (comentado) :31`

**`app/src/main/java/com/limelight/ArtemisApplication.java`**
- `onCreate() :10`

**`app/src/main/AndroidManifest.xml`**
- `activity .ProfilesActivity :147`
- `activity .EditProfileActivity :157`
- `activity .preferences.StreamSettings :164`
- `activity .preferences.AddComputerManually (windowSoftInputMode=stateVisible) :175`
- `activity .Game :193`

</details>

## Fluxo

LEITURA (caminho normal): (1) ArtemisApplication.onCreate() (ArtemisApplication.java:10-16) chama ProfilesManager.getInstance().load(this), que lê files/profiles/profiles.json via Gson (ProfilesManager.java:67-92) preenchendo o LinkedHashMap<UUID,SettingsProfile> e o activeProfileId. (2) Qualquer consumidor chama PreferenceConfiguration.readPreferences(context) (PreferenceConfiguration.java:712). (3) Se nenhum SharedPreferences for passado, obtém-se ProfilesManager.getOverlayingSharedPreferences(context) (PreferenceConfiguration.java:718 → ProfilesManager.java:200): se há perfil ativo, devolve OverlaySharedPreferences(base=default prefs, patch=profile.getOptions()); senão devolve o SharedPreferences default puro. (4) readPreferences executa migrações destrutivas ANTES de qualquer leitura: checkbox_51_surround→list_audio_config (723-730), list_resolution_fps→list_resolution+list_fps (732-786), string legacy "720p"→"1280x720" (789-795), checkbox_stretch_video→list_video_scale_mode (802-808), checkbox_enforce_refresh_rate→checkbox_enforce_display_mode (810-816), grava default de checkbox_small_icon_mode (818-822) e força checkbox_gamepad_motion_sensors=false no Android 12 (824-831); checkbox_disable_frame_drop→frame_pacing acontece em getFramePacingValue (641-647). (5) Bitrate: seekbar_bitrate_kbps, com fallback para seekbar_bitrate*1000 e, se 0, getDefaultBitrate(context) que interpola a tabela pixels×fator e multiplica por frameRateFactor (495-556, 834-837); metered bitrate default = bitrate/4 e persiste 0 (839-843). (6) ~100 getters preenchem o POJO (845-1037) e o objeto é devolvido por valor — não há cache nem invalidação. ESCRITA: a UI escreve via androidx Preference → PreferenceManager.getDefaultSharedPreferences (StreamSettings.SettingsFragment.getPrefs(), StreamSettings.java:174-176), portanto SEMPRE no arquivo base, nunca no perfil; listeners de list_resolution/list_fps recalculam o bitrate (StreamSettings.java:673-726 → resetBitrateToDefault :304); edit_diy_w_h e custom_refresh_rate usam editAndReload() (972-977) que grava e recria o fragment 500ms depois (979-993); edit_diy_bitrate grava seekbar_bitrate_kbps no listener (861-881). Escritas de runtime: zoom/pan em Game.onDestroy (Game.java:1726-1733, chaves number_zoom_scale/number_pan_offset_x/number_pan_offset_y, gravadas explicitamente nas prefs base), mouse_mode_list quando rememberMouseMode (Game.java:4126-4133, gravado via overlay → cai no base e continua sombreado), performance_log (PerformanceDataTracker.java:119), CrashCount/LastNotifiedCrashCount no arquivo "DecoderTombstone" (Game.java:355, UiHelper.java:183-205). PERFIS (edição): ProfilesActivity → EditProfileActivity; perfil existente carrega InMemorySharedPreferences(currentProfile.getOptions()) (EditProfileActivity.java:65), perfil novo copia getAll() das prefs globais (:74). ProfilePreferenceFragment instala InMemoryPreferenceDataStore (:270) ANTES de super.onCreatePreferences (:272), de modo que todo widget do preferences.xml passa a ler/gravar no mapa em memória; em seguida esconde import/export/reset de layouts (:280-299) e prefixa com "*" as chaves que diferem do global (:302-306). Salvar (saveProfile :119) copia o mapa inteiro para SettingsProfile.options, marca modifiedUtc e chama ProfilesManager.update/add → notifyListeners → saveIfPossible → save() grava profiles.json (ProfilesManager.java:102-131). ATIVAÇÃO: ProfilesAdapter.java:54-63 chama setActive(uuid|null) + save(); PcView.refreshProfileButton (PcView.java:345-359) e AppView (AppView.java:401-413) só mostram o nome do perfil ativo no FAB. APLICAÇÃO: na próxima chamada de readPreferences o overlay entra em ação — não há evento de reconfiguração de stream em andamento; Game lê prefConfig uma única vez em Game.java:354.

## Interfaces externas

- androidx.preference:preference:1.2.1 — PreferenceFragmentCompat, ListPreference, CheckBoxPreference, EditTextPreference, DialogPreference, PreferenceDataStore, PreferenceCategory (app/build.gradle:177)
- android.content.SharedPreferences + PreferenceManager.getDefaultSharedPreferences — arquivo default <pkg>_preferences.xml; 6 arquivos satélite: GlPreferences, DecoderTombstone, HiddenApps, OSC, OSC_Keyboard..OSC_Keyboard_5, specialPrefs
- com.google.code.gson:gson:2.13.1 — serialização de profiles.json (ProfilesManager.java:79-118) e export de layout de teclado (StreamSettings.java:1065)
- android.view.Display / Display.Mode / Display.HdrCapabilities / DisplayCutout — enumeração de resoluções e refresh rates nativos e detecção de HDR10 (StreamSettings.java:456-669)
- android.media.MediaCodecInfo + MediaCodecHelper.findProbableSafeDecoder — limita a lista de resoluções pelo range de largura suportado por AVC/HEVC (StreamSettings.java:534-593)
- android.os.Vibrator (hasVibrator/hasAmplitudeControl) — poda das opções de vibração (StreamSettings.java:407-428)
- android.content.pm.PackageManager features: FEATURE_TOUCHSCREEN, FEATURE_TELEVISION, FEATURE_LEANBACK, FEATURE_USB_HOST, FEATURE_SENSOR_ACCELEROMETER/GYROSCOPE, android.software.picture_in_picture, com.amazon.software.fireos, com.nvidia.feature.shield (StreamSettings.java:340-403)
- androidx.core.content.FileProvider (<pkg>.fileprovider, provider_file_paths.xml) — export de layout de teclado e envio de logs de performance por Intent.ACTION_SEND (StreamSettings.java:798-843)
- Intent.ACTION_OPEN_DOCUMENT (application/json) — import de layout de teclado e de botões especiais (StreamSettings.java:748-768)
- Deep link scheme art:// (AndroidManifest.xml:175-192) — art://<host>[:port]?pin=&passphrase=&name= e art://launch?host_uuid=&host_name=&app_uuid=&app_name=&app_id= (AddComputerManually.java:103-119, 280-321)
- com.limelight.nvstream.jni.MoonBridge — AUDIO_CONFIGURATION_STEREO/51/71 e testClientConnectivity (PreferenceConfiguration.java:845-854, AddComputerManually.java:169)
- com.limelight.nvstream.StreamConfiguration — destino final de bitrate, resolutionScaleFactor, enableUltraLowLatency etc. (Game.java:775-800)
- WindowInsetsCompat.Type.ime() (androidx.core) — único uso de IME insets do app, em ExternalDisplayControlActivity.java:170-176
- locales_config.xml + android:localeConfig — lista de 23 idiomas espelhada em arrays.xml language_names/language_values
- Backup do Android: backup_rules.xml / backup_rules_s.xml excluem domain="sharedpref" inteiro (profiles.json em files/ NÃO é excluído)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🔴 crítico | bug | frame_pacing do usuário é sobrescrito incondicionalmente para BALANCED em runtime | `app/src/main/java/com/limelight/Game.java:692-703` |
| 🟠 alto | bug | Chave do JoyCon fix divergente entre XML e código: toggle inerte | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:951` |
| 🟠 alto | tech-debt | checkbox_forceTightThresholds é uma preferência 100% morta, lida por reflection sobre um campo hardcoded | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:233` |
| 🟠 alto | bug | OverlaySharedPreferences.edit() grava na base: escritas feitas com perfil ativo são silenciosamente sombreadas | `app/src/main/java/com/limelight/profiles/ProfilesManager.java:251` |
| 🟠 alto | tech-debt | Perfil é snapshot completo das prefs globais, não delta — inclui lixo de runtime e congela configurações | `app/src/main/java/com/limelight/EditProfileActivity.java:74` |
| 🟠 alto | ux | Não existe preferência nem suporte para redimensionar o stream quando o IME abre | `app/src/main/AndroidManifest.xml:193` |
| 🟡 médio | bug | Round-trip Gson quebra tipos numéricos: floats de perfil voltam como default no editor | `app/src/main/java/com/limelight/EditProfileActivity.java:371-374` |
| 🟡 médio | bug | keyboard_axi_list é lida fora do overlay de perfis | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java:554` |
| 🟡 médio | ux | Os 5 slots de layout de teclado têm rótulos idênticos na UI | `app/src/main/res/values/arrays.xml:151-157` |
| 🟡 médio | bug | Três defaults conflitantes para o metered bitrate | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:839-843` |
| 🟡 médio | tech-debt | edit_diy_bitrate duplica seekbar_bitrate_kbps sem sincronização de volta | `app/src/main/java/com/limelight/preferences/StreamSettings.java:861-881` |
| 🟡 médio | bug | Ranges negativos em seekbars de deadzone e sensibilidade de trackpad | `app/src/main/res/xml/preferences.xml:254` |
| 🟡 médio | bug | O editor de perfil lê configuração global para decidir a lista de FPS | `app/src/main/java/com/limelight/preferences/StreamSettings.java:605` |
| 🟡 médio | performance | readPreferences() (leitura de ~110 chaves) é chamada dentro de onDraw dos controles virtuais | `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java:162` |
| 🟡 médio | bug | resetStreamingSettings não limpa as chaves de resolução/refresh customizados | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:683-697` |
| 🟡 médio | maintainability | Categorias sem android:key impedem poda programática e casts sem verificação de nulo | `app/src/main/java/com/limelight/preferences/StreamSettings.java:356-369` |
| 🟡 médio | performance | Log de performance armazenado como JSON dentro das preferências default | `app/src/main/java/com/limelight/utils/PerformanceDataTracker.java:119` |
| 🟡 médio | maintainability | ProfilesManager não é thread-safe e persiste em disco na thread de UI, com saves duplicados | `app/src/main/java/com/limelight/profiles/ProfilesManager.java:137-162` |
| 🟡 médio | ux | Perfis não têm vínculo com host nem com app; a associação é 100% manual e global | `app/src/main/java/com/limelight/profiles/ProfilesManager.java:158` |
| ⚪ baixo | tech-debt | SmallIconCheckboxPreference.onGetDefaultValue nunca é chamada | `app/src/main/res/xml/preferences.xml:635-639` |
| ⚪ baixo | bug | Comparação de idioma com == e comentário de default contraditório | `app/src/main/java/com/limelight/preferences/StreamSettings.java:156` |
| ⚪ baixo | compatibility | Configurações não são migráveis entre dispositivos, mas profiles.json é incluído no backup | `app/src/main/res/xml/backup_rules.xml:3` |
| ⚪ baixo | maintainability | Recurso de string malformado em strings.xml | `app/src/main/res/values/strings.xml:713` |
| ⚪ baixo | performance | SeekBarPreference calcula o bitrate default para todo seekbar da tela e usa API deprecada | `app/src/main/java/com/limelight/preferences/SeekBarPreference.java:63` |

### Detalhe

#### 🔴 crítico frame_pacing do usuário é sobrescrito incondicionalmente para BALANCED em runtime

**Local:** `app/src/main/java/com/limelight/Game.java:692-703` · **Categoria:** bug

Game.java executa `prefConfig.framePacing = PreferenceConfiguration.FRAME_PACING_BALANCED;` nos DOIS ramos do if (preferLowerDelays true e false), logo após o valor ter sido corretamente lido de `frame_pacing` em PreferenceConfiguration.java:637-666. Com isso os modos 'latency' (FRAME_PACING_MIN_LATENCY, default), 'cap-fps' e 'smoothness' nunca chegam ao MediaCodecDecoderRenderer, que decide política de release por prefs.framePacing (MediaCodecDecoderRenderer.java:1136,1182,1284-1296). A ListPreference `frame_pacing` (preferences.xml:53-60) fica cosmética; só o efeito colateral warp/warp2 (framePacingWarpFactor, PreferenceConfiguration.java:863-868 → Game.java:775-777) e a checagem de cap-fps em Game.java:757-765 (que também é reescrita para BALANCED) sobrevivem parcialmente.

**Correção sugerida:** Remover as duas atribuições de prefConfig.framePacing em Game.java:696 e 702; fazer preferLowerDelays apenas configurar decoderRenderer.setPreferLowerDelays()/setPreferLowerDelaysTimeoutUs() e manter o framePacing lido da preferência. Se a intenção era que pref_low_latency_frame_balance implique BALANCED, aplicar somente quando prefConfig.framePacing == FRAME_PACING_MIN_LATENCY e documentar no summary da preferência.

#### 🟠 alto Chave do JoyCon fix divergente entre XML e código: toggle inerte

**Local:** `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:951` · **Categoria:** bug

O código lê `prefs.getBoolean("checkbox_joycon_fix", false)` mas a CheckBoxPreference declarada é `checkbox_enable_joyconfix` (preferences.xml:322). Resultado: config.enableJoyConFix é sempre false e o workaround de D-pad para Joy-Con L/R (ControllerHandler.java:1435 e :1459, vendorId 0x057e, productId 0x2006/0x2007) nunca ativa; a chave gravada pelo usuário fica órfã no arquivo de prefs.

**Correção sugerida:** Trocar o literal em PreferenceConfiguration.java:951 para CHECKBOX_ENABLE_JOYCONFIX = "checkbox_enable_joyconfix" (promovendo a uma constante como as demais) e, opcionalmente, migrar o valor antigo `checkbox_joycon_fix` no bloco de migrações (linhas 723-831) para não perder quem já marcou a opção.

#### 🟠 alto checkbox_forceTightThresholds é uma preferência 100% morta, lida por reflection sobre um campo hardcoded

**Local:** `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:233` · **Categoria:** tech-debt

`public boolean forceTightThresholds = false; // default off` nunca é preenchido a partir de SharedPreferences, apesar de existir CheckBoxPreference `checkbox_forceTightThresholds` (preferences.xml:74-79) com título/summary traduzidos em en/ru/zh-rCN/zh-rTW (strings.xml:563-564). Pior: Game.java:673-687 obtém esse mesmo campo via java.lang.reflect.Field.getDeclaredField("forceTightThresholds") dentro de try/catch silencioso e repassa a decoderRenderer.setForceTightThresholds() — ou seja, um acesso por reflection a um campo público da própria classe, que sempre devolve false.

**Correção sugerida:** Adicionar `config.forceTightThresholds = prefs.getBoolean("checkbox_forceTightThresholds", false);` em readPreferences e substituir o bloco de reflection de Game.java:673-687 por `decoderRenderer.setForceTightThresholds(prefConfig.forceTightThresholds);`. Se a feature for considerada instável, remover a preferência do XML e as 4 traduções em vez de deixá-la visível e inerte.

#### 🟠 alto OverlaySharedPreferences.edit() grava na base: escritas feitas com perfil ativo são silenciosamente sombreadas

**Local:** `app/src/main/java/com/limelight/profiles/ProfilesManager.java:251` · **Categoria:** bug

`@Override public Editor edit() { return base.edit(); }`. Como quase todo o app obtém prefs por getOverlayingSharedPreferences(), várias escritas caem no arquivo base enquanto a leitura continua vindo do patch do perfil: (a) migrações legacy e defaults calculados de readPreferences (PreferenceConfiguration.java:727,781-785,804-807,812-815,821,830,842); (b) resetStreamingSettings() (PreferenceConfiguration.java:683-697), chamado após 3 crashes de decoder (UiHelper.java:193) — o reset de segurança não funciona com perfil ativo, o usuário fica em loop de crash; (c) memorização do modo de mouse com rememberMouseMode (Game.java:4126-4133) — o usuário troca de modo, o app 'salva' e no próximo stream volta ao modo do perfil.

**Correção sugerida:** Ou tornar o overlay honestamente read-only (lançar UnsupportedOperationException em edit() e obrigar os call sites a escolher explicitamente base vs. perfil), ou implementar um Editor que escreva no Map do perfil ativo e persista profiles.json. No mínimo: em resetStreamingSettings e nas migrações usar PreferenceManager.getDefaultSharedPreferences diretamente E remover as mesmas chaves do perfil ativo.

#### 🟠 alto Perfil é snapshot completo das prefs globais, não delta — inclui lixo de runtime e congela configurações

**Local:** `app/src/main/java/com/limelight/EditProfileActivity.java:74` · **Categoria:** tech-debt

Ao criar um perfil novo: `new InMemorySharedPreferences(PreferenceManager.getDefaultSharedPreferences(this).getAll())` copia TODAS as chaves, e saveProfile() (:121) grava o mapa inteiro em SettingsProfile.options. Consequências: (1) o JSON do perfil carrega estado de runtime irrelevante como `performance_log` (JSON de logs de performance acumulado, PerformanceDataTracker.java:16,119), `number_zoom_scale`, `number_pan_offset_x/y`, podendo inflar profiles.json em centenas de KB; (2) toda alteração posterior de configuração global fica invisível enquanto o perfil estiver ativo, porque o patch sombreia a chave — o usuário edita Settings e 'nada acontece'; (3) o método diff() (:232-248), que já existe, é usado apenas para colocar '*' no título (:314-328), não para reduzir o patch.

**Correção sugerida:** Aplicar diff() no saveProfile (guardar apenas chaves cujo valor difere do global no momento do save) e manter uma denylist de chaves de runtime (performance_log, number_zoom_scale, number_pan_offset_x, number_pan_offset_y, CrashCount). Documentar na UI que o perfil só sobrescreve o que foi alterado.

#### 🟠 alto Não existe preferência nem suporte para redimensionar o stream quando o IME abre

**Local:** `app/src/main/AndroidManifest.xml:193` · **Categoria:** ux

A Activity .Game não declara android:windowSoftInputMode (default do sistema) e usa StreamTheme (fullscreen), e StreamContainer/StreamView medem sempre contra o tamanho total da janela mantendo aspect ratio (StreamContainer.java:120-150, StreamView.java:61-90). Não há nenhuma chave em preferences.xml relacionada a comportamento do teclado do sistema — as chaves 'onscreen_keyboard_*' (preferences.xml:567-602) dizem respeito ao TECLADO VIRTUAL PRÓPRIO do app (KeyBoardLayoutController.java:327-338), não ao IME. O único código do repositório que reage a WindowInsetsCompat.Type.ime() está em ExternalDisplayControlActivity.java:170-176 e apenas mostra/esconde o teclado próprio.

**Correção sugerida:** Adicionar android:windowSoftInputMode="adjustResize" a .Game, chamar WindowCompat.setDecorFitsSystemWindows(window,false) e um OnApplyWindowInsetsListener em Game que aplique bottom padding = insets.getInsets(Type.ime()).bottom no streamContainer, com nova preferência (ex.: list_ime_behavior = overlay|resize|pan, default overlay para preservar comportamento atual) na category_input_settings.

#### 🟡 médio Round-trip Gson quebra tipos numéricos: floats de perfil voltam como default no editor

**Local:** `app/src/main/java/com/limelight/EditProfileActivity.java:371-374` · **Categoria:** bug

SettingsProfile.options é Map<String,Object>; ao desserializar, Gson converte todo número JSON em Double. InMemorySharedPreferences.getFloat faz `value instanceof Float ? (Float) value : defValue`, então qualquer float vindo de profiles.json (number_zoom_scale, number_pan_offset_x/y) é descartado silenciosamente. OverlaySharedPreferences trata Number corretamente (ProfilesManager.java:236-239), mas seu getStringSet faz cast direto `(Set<String>) patch.get(key)` (ProfilesManager.java:244-247) — Gson devolveria ArrayList para um array JSON, gerando ClassCastException se algum dia uma chave StringSet entrar num perfil (padrão já usado em HiddenApps).

**Correção sugerida:** Trocar `instanceof Float` por `instanceof Number` + floatValue() em InMemorySharedPreferences.getFloat/getInt/getLong, e em OverlaySharedPreferences.getStringSet aceitar Collection<?> convertendo para LinkedHashSet<String>. Alternativamente registrar um TypeAdapter Gson que preserve int/long/float.

#### 🟡 médio keyboard_axi_list é lida fora do overlay de perfis

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java:554` · **Categoria:** bug

A ListPreference `keyboard_axi_list` (preferences.xml:765-773) escolhe qual dos 5 arquivos de layout de teclado virtual usar (o valor É o nome do arquivo SharedPreferences: OSC_Keyboard..OSC_Keyboard_5). Ela é lida com PreferenceManager.getDefaultSharedPreferences em KeyBoardControllerConfigurationLoader.java:554 e :570, em ConfirmDeleteKeyboardPreference.java:49 e em StreamSettings.java:1009,1061 — nunca pelo overlay. Logo um perfil que define keyboard_axi_list não troca o layout de teclado; a preferência aparece no editor de perfil e não faz efeito.

**Correção sugerida:** Substituir as chamadas por ProfilesManager.getInstance().getOverlayingSharedPreferences(context).getString(OSC_PREFERENCE, OSC_PREFERENCE_VALUE), ou expor a chave via PreferenceConfiguration (novo campo keyboardLayoutSlot) e consumir de lá, como o resto do app.

#### 🟡 médio Os 5 slots de layout de teclado têm rótulos idênticos na UI

**Local:** `app/src/main/res/values/arrays.xml:151-157` · **Categoria:** ux

`keyboard_axi_names` repete @string/keyboard_layout_set_1 cinco vezes, enquanto keyboard_axi_values tem OSC_Keyboard, OSC_Keyboard_2..._5. O usuário vê cinco entradas com o mesmo texto e não consegue distinguir qual slot está selecionando; combinado com ConfirmDeleteKeyboardPreference (que apaga o slot selecionado) isso é um caminho fácil para perda acidental de layout.

**Correção sugerida:** Criar keyboard_layout_set_1..5 (ou usar formatação '%d') em strings.xml e todas as traduções, e exibir o nome do slot no summary da ListPreference com setSummaryProvider.

#### 🟡 médio Três defaults conflitantes para o metered bitrate

**Local:** `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:839-843` · **Categoria:** bug

(1) preferences.xml:40-51 não declara android:defaultValue para seekbar_metered_bitrate_kbps, então SeekBarPreference cai no fallback do construtor, que é PreferenceConfiguration.getDefaultBitrate(context) — o bitrate CHEIO (SeekBarPreference.java:63). (2) readPreferences usa bitrate/4 quando o valor lido é 0. (3) readPreferences ainda executa `prefs.edit().putInt(METERED_BITRATE_PREF_STRING, 0).apply()`, persistindo 0, de forma que o diálogo do seekbar passa a exibir 0 (o mínimo) — e o usuário nunca consegue configurar 0 kbps de propósito, pois 0 é reinterpretado como 'automático'.

**Correção sugerida:** Escolher uma sentinela explícita (-1 = automático) ou remover a escrita de 0 (linha 842), declarar android:defaultValue coerente no XML e usar um summaryProvider que mostre 'Automático (bitrate/4)' quando não configurado.

#### 🟡 médio edit_diy_bitrate duplica seekbar_bitrate_kbps sem sincronização de volta

**Local:** `app/src/main/java/com/limelight/preferences/StreamSettings.java:861-881` · **Categoria:** tech-debt

O EditTextPreference `edit_diy_bitrate` (preferences.xml:141-149, defaultValue 20) persiste sua própria string, que NINGUÉM lê — o campo customBitrate está comentado em PreferenceConfiguration.java:232 e :1028. O efeito real vem do OnPreferenceChangeListener que multiplica por 1000 e grava seekbar_bitrate_kbps. Assim existem dois widgets para o mesmo valor: alterar o seekbar não atualiza o texto do EditText, e o valor exibido no EditText pode contradizer o bitrate real. Além disso a validação aceita valores acima de android:max=300000 do seekbar e Float.parseFloat pode lançar NumberFormatException para entradas como '1.2.3' (o listener não está em try/catch, diferente dos de resolução e refresh rate).

**Correção sugerida:** Manter apenas um dos dois controles (preferencialmente o SeekBar com keyStep, adicionando entrada manual pelo próprio diálogo) ou, se mantiver ambos, gravar sempre nos dois sentidos, envolver o parse em try/catch e clampar em [500, 300000].

#### 🟡 médio Ranges negativos em seekbars de deadzone e sensibilidade de trackpad

**Local:** `app/src/main/res/xml/preferences.xml:254` · **Categoria:** bug

`seekbar_deadzone` declara seekbar:min="-20" com android:max="20": SeekBarPreference calcula seekbarMax = max - min = 40 e permite valores de -20 a 20 (SeekBarPreference.java:69,143,151). O valor vai direto para ControllerHandler.java:162,182 como `stickDeadzone = deadzonePercentage/100.0`, ou seja, deadzone negativa. O mesmo padrão aparece em seekbar_trackpad_sensitivity_x/y com seekbar:min="-200" (preferences.xml:419,429) alimentando TrackpadContext (Game.java:817) e em balance_shift com seekbar:min="-0" (preferences.xml:204), que é um typo inofensivo mas indica copy-paste.

**Correção sugerida:** Corrigir para seekbar:min="0" (deadzone) e seekbar:min="10" (sensibilidades, alinhando com os demais seekbars de sensibilidade que já usam min=10), e adicionar clamp defensivo em ControllerHandler e TrackpadContext.

#### 🟡 médio O editor de perfil lê configuração global para decidir a lista de FPS

**Local:** `app/src/main/java/com/limelight/preferences/StreamSettings.java:605` · **Categoria:** bug

initializePreferences() chama `PreferenceConfiguration.readPreferences(this.getActivity()).unlockFps` — no contexto de EditProfileActivity isso lê o overlay GLOBAL, não o SharedPreferences em memória do perfil sendo editado (que é acessível via getPrefs()/prevPrefConfig). Resultado: dentro do editor de perfil, a poda das opções 90/120 FPS reflete o unlock_fps global, não o do perfil. O mesmo método também dispara migrações e escritas em disco a partir do editor de perfil.

**Correção sugerida:** Usar prevPrefConfig.unlockFps (já disponível no fragment, StreamSettings.java:168-172) em vez de reler as preferências, eliminando também uma leitura completa redundante.

#### 🟡 médio readPreferences() (leitura de ~110 chaves) é chamada dentro de onDraw dos controles virtuais

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java:162` · **Categoria:** performance

PreferenceConfiguration.readPreferences() percorre ~110 getters, aloca um OverlaySharedPreferences e pode até gravar em disco (migrações/defaults, PreferenceConfiguration.java:818-831,842). Mesmo assim é invocada em caminhos de desenho e de evento: DigitalButton.onDraw (:162, :165, :175 — até 3 chamadas por botão por frame), DigitalPad (:56-57), AnalogStickFree (:313), KeyBoardDigitalButton (:168), KeyBoardController (:390 no toque e :648 dentro do laço de criação de elementos), VirtualController (:249), ControllerHandler (:387,:402). São 35 call sites no total (grep PreferenceConfiguration.readPreferences).

**Correção sugerida:** Introduzir um cache estático invalidado por OnSharedPreferenceChangeListener e por ProfilesManager.setActive() (ex.: PreferenceConfiguration.getCached(Context)), ou passar o prefConfig já lido para os construtores dos elementos de OSC. Nunca chamar readPreferences dentro de onDraw.

#### 🟡 médio resetStreamingSettings não limpa as chaves de resolução/refresh customizados

**Local:** `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:683-697` · **Categoria:** bug

O reset automático após 3 crashes consecutivos de decoder (UiHelper.java:183-205) remove bitrate, resolução, fps, video_format, HDR, unlock_fps e full_range, mas NÃO remove edit_diy_w_h, custom_refresh_rate nem edit_diy_bitrate. Como esses valores voltam a ser injetados como entradas 'Custom' na lista (StreamSettings.java:431-454), o usuário pode reincidir imediatamente na configuração que causou o crash. Somado ao problema do overlay (edit() na base), com perfil ativo o reset não tem efeito algum.

**Correção sugerida:** Acrescentar .remove(CUSTOM_RESOLUTION_PREF_STRING).remove(CUSTOM_REFRESH_RATE_PREF_STRING).remove(CUSTOM_BITRATE_PREF_STRING) ao editor de resetStreamingSettings e também limpar essas chaves no perfil ativo.

#### 🟡 médio Categorias sem android:key impedem poda programática e casts sem verificação de nulo

**Local:** `app/src/main/java/com/limelight/preferences/StreamSettings.java:356-369` · **Categoria:** maintainability

As categorias de áudio (preferences.xml:222), host (:485) e general (:502) não têm android:key, ao contrário das outras 8 — não podem ser escondidas por hardware/OS como as demais. Além disso StreamSettings faz `(PreferenceCategory) findPreference("category_input_settings")` e `category.removePreference(findPreference(...))` sem checagem de nulo nas linhas 358-361 e 365-369 (só os blocos posteriores, 411-422, checam), então qualquer renomeação de chave vira NullPointerException na abertura das configurações em vez de erro de compilação.

**Correção sugerida:** Dar android:key a todas as categorias, extrair as chaves para constantes em PreferenceConfiguration e criar um helper removeIfPresent(String categoryKey, String prefKey) com null-checks.

#### 🟡 médio Log de performance armazenado como JSON dentro das preferências default

**Local:** `app/src/main/java/com/limelight/utils/PerformanceDataTracker.java:119` · **Categoria:** performance

`prefs.edit().putString("performance_log", logsArray.toString()).apply()` acumula um JSONArray inteiro no arquivo de preferências default. SharedPreferences carrega o arquivo todo em memória e reescreve integralmente a cada apply; o valor também é copiado para todo perfil novo (EditProfileActivity.java:74) e aparece no export getAllJsonData (StreamSettings.java:1073-1084, atualmente método morto). O usuário controla isso apenas por checkbox_enable_perf_logging, cujo desligamento chama clearLogs (StreamSettings.java:728-740).

**Correção sugerida:** Mover o log para um arquivo próprio em getFilesDir()/perf_log.json (ou Room), limitar o número de entradas e adicionar 'performance_log' à denylist de chaves copiadas para perfis.

#### 🟡 médio ProfilesManager não é thread-safe e persiste em disco na thread de UI, com saves duplicados

**Local:** `app/src/main/java/com/limelight/profiles/ProfilesManager.java:137-162` · **Categoria:** maintainability

add/update/delete/setActive mutam um LinkedHashMap sem sincronização e chamam saveIfPossible() (:260-265), que faz FileWriter + Gson.toJson síncrono na thread chamadora (sempre a UI). ProfilesAdapter ainda chama profilesManager.save(context) logo depois (ProfilesAdapter.java:62 e :77), causando duas escritas completas do profiles.json por clique. getProfiles() (:133) aloca um ArrayList novo e é chamado em getItemCount() e onBindViewHolder (ProfilesAdapter.java:42,90) — uma alocação por item por bind. O campo `instance` (:33) é package-private e mutável.

**Correção sugerida:** Remover os save() redundantes do adapter, mover a persistência para um executor de background com debounce, tornar `instance` private final volátil e cachear a lista no adapter (ou usar ListAdapter/DiffUtil).

#### 🟡 médio Perfis não têm vínculo com host nem com app; a associação é 100% manual e global

**Local:** `app/src/main/java/com/limelight/profiles/ProfilesManager.java:158` · **Categoria:** ux

Não existe nenhuma referência a ComputerDetails.uuid ou NvApp.appId no pacote profiles nem em SettingsProfile (uuid/name/createdUtc/modifiedUtc/options apenas). PcView.refreshProfileButton (PcView.java:345-359) e AppView (AppView.java:401-413) só renderizam o nome do perfil ativo. Ou seja, o usuário precisa ativar manualmente o perfil correto antes de iniciar cada stream; ao trocar de host (ex.: PC com display virtual Vibeshine vs. notebook) o perfil errado permanece ativo silenciosamente e altera bitrate/resolução/HDR sem aviso.

**Correção sugerida:** Adicionar campos opcionais hostUuids:Set<String> e appIds:Set<Integer> a SettingsProfile e resolver o perfil efetivo em ServerHelper.doStart/Game.onCreate (perfil do app > perfil do host > perfil ativo global), mantendo compatibilidade com profiles.json existente (campos ausentes = null).

#### ⚪ baixo SmallIconCheckboxPreference.onGetDefaultValue nunca é chamada

**Local:** `app/src/main/res/xml/preferences.xml:635-639` · **Categoria:** tech-debt

A preferência checkbox_small_icon_mode não declara android:defaultValue; o androidx.preference só invoca onGetDefaultValue() para atributos presentes no TypedArray, logo o override de SmallIconCheckboxPreference.java:29 é código morto. O comportamento correto só acontece por efeito colateral: readPreferences grava o default calculado em disco antes da tela inflar (PreferenceConfiguration.java:818-822). Se essa gravação for removida em uma refatoração, o default silenciosamente vira false em tablets/telefones.

**Correção sugerida:** Declarar android:defaultValue="false" (qualquer valor) no XML para que onGetDefaultValue seja chamado, ou remover a subclasse e depender explicitamente da gravação em readPreferences com um comentário.

#### ⚪ baixo Comparação de idioma com == e comentário de default contraditório

**Local:** `app/src/main/java/com/limelight/preferences/StreamSettings.java:156` · **Categoria:** bug

`if (newPrefs.language == PreferenceConfiguration.DEFAULT_LANGUAGE)` compara Strings por identidade; funciona hoje apenas porque o valor vem de interning de literais/constantes do XML, mas quebra se a string vier de outra fonte (por ex. Gson/patch de perfil, que cria uma nova String). No mesmo arquivo de configuração, getPreferLowerDelays (PreferenceConfiguration.java:632-636) tem o comentário `// default true: favor lower delay unless user opts out` enquanto o código usa default false, e o XML também declara false (preferences.xml:63).

**Correção sugerida:** Usar equals() em StreamSettings.java:156 e corrigir/remover o comentário enganoso em PreferenceConfiguration.java:634.

#### ⚪ baixo Configurações não são migráveis entre dispositivos, mas profiles.json é incluído no backup

**Local:** `app/src/main/res/xml/backup_rules.xml:3` · **Categoria:** compatibility

backup_rules.xml e backup_rules_s.xml excluem `domain="sharedpref" path="."` inteiro, então nenhuma preferência (nem os layouts de OSC/teclado, que também são SharedPreferences) é restaurada em um aparelho novo. Já profiles.json vive em getFilesDir() (ProfilesManager.java:68,108) e NÃO está excluído — o backup restaura perfis cujo conteúdo referencia resoluções/refresh rates específicos do aparelho antigo, exatamente o motivo pelo qual as prefs foram excluídas.

**Correção sugerida:** Decidir a política e torná-la coerente: ou excluir também files/profiles no backup, ou permitir backup seletivo das chaves não dependentes de dispositivo, ou implementar export/import manual de configuração (o app já tem FileProvider e um getAllJsonData morto em StreamSettings.java:1073).

#### ⚪ baixo Recurso de string malformado em strings.xml

**Local:** `app/src/main/res/values/strings.xml:713` · **Categoria:** maintainability

A linha termina com `</string>s` — há um caractere 's' solto fora do elemento, entre <string> irmãos, logo depois de profile_manager_tap_create_profile. É texto ignorado pelo AAPT2 hoje, mas é ruído que confunde ferramentas de tradução e diffs.

**Correção sugerida:** Remover o 's' extra ao final da linha 713.

#### ⚪ baixo SeekBarPreference calcula o bitrate default para todo seekbar da tela e usa API deprecada

**Local:** `app/src/main/java/com/limelight/preferences/SeekBarPreference.java:63` · **Categoria:** performance

`attrs.getAttributeIntValue(ANDROID_SCHEMA_URL, "defaultValue", PreferenceConfiguration.getDefaultBitrate(context))` — o argumento default é avaliado avidamente em Java, então cada um dos 13 SeekBarPreference de preferences.xml (opacidade, sensibilidade, altura do teclado etc.) executa getDefaultBitrate → getOverlayingSharedPreferences + parse de resolução/fps na inflação da tela. A classe também sobrescreve apenas o onSetInitialValue(boolean,Object) deprecado do androidx 1.2.1 (linha 173), e o ramo `currentValue = (Integer) defaultValue` (linha 180) é inalcançável/NPE-prone caso o comportamento da lib mude.

**Correção sugerida:** Calcular o fallback preguiçosamente (verificar attrs.getAttributeValue != null antes de chamar getDefaultBitrate) e migrar para o onSetInitialValue(Object) atual, tratando defaultValue nulo.


## Ideias de melhoria

### Higienizar preferências mortas e órfãs

**Tamanho:** quick-win

**Por quê:** Limpeza de baixo risco que remove três armadilhas conhecidas para agentes/contribuidores: uma preferência que não faz nada, uma chave escrita e nunca lida e uma lida e nunca escrita.

**Como:** (a) Corrigir checkbox_joycon_fix → checkbox_enable_joyconfix (PreferenceConfiguration.java:951). (b) Ligar checkbox_forceTightThresholds em readPreferences e apagar o bloco de reflection de Game.java:673-687. (c) Remover ou implementar CUSTOM_BITRATE_PREF_STRING/customBitrate (PreferenceConfiguration.java:33,232,1028) e o método morto getAllJsonData (StreamSettings.java:1073-1084). (d) Corrigir strings.xml:713. (e) Corrigir seekbar:min negativos (preferences.xml:204,254,419,429).

**Risco:** Baixo: mudanças pontuais e locais; apenas (b) altera comportamento de decodificação para quem tinha a caixa marcada — mencionar no changelog.

### Sincronizar os controles duplicados de bitrate e validar limites

**Tamanho:** quick-win

**Por quê:** edit_diy_bitrate e seekbar_bitrate_kbps representam o mesmo valor com UIs independentes e sem clamp, permitindo estados incoerentes e um NumberFormatException não tratado.

**Como:** Em StreamSettings.java:861-881 envolver Float.parseFloat em try/catch (como já é feito para resolução em :904-920 e refresh rate em :938-956), clampar em [500,300000] e chamar setText no EditTextPreference sempre que o seekbar mudar (e vice-versa) via setSummaryProvider mostrando o valor efetivo em Mbps.

**Risco:** Baixo.

### Telemetria de configuração no DebugInfoActivity

**Tamanho:** quick-win

**Por quê:** Diagnosticar problemas de usuários exige saber qual perfil está ativo e quais chaves ele sobrescreve — hoje isso não aparece em lugar nenhum, e o overlay torna a configuração efetiva diferente do que a tela de settings mostra.

**Como:** Em DebugInfoActivity (aberta pela Preference pref_debug_info, StreamSettings.java:849-859) acrescentar uma seção com ProfilesManager.getInstance().getActiveName(), o número e a lista de chaves do patch (SettingsProfile.getOptions().keySet()) e o dump dos campos de PreferenceConfiguration relevantes ao stream.

**Risco:** Baixo; atenção apenas para não vazar conteúdo sensível (o patch pode conter performance_log enquanto perfis forem snapshots).

### Cache de PreferenceConfiguration com invalidação por listener

**Tamanho:** small

**Por quê:** readPreferences() faz ~110 leituras (e às vezes escritas em disco) e é chamada em onDraw de botões virtuais e em handlers de toque (DigitalButton.java:162,165,175; DigitalPad.java:56-57; AnalogStickFree.java:313; KeyBoardController.java:390,648). É jank garantido em dispositivos fracos exatamente no modo OSC.

**Como:** Adicionar em PreferenceConfiguration um `private static volatile PreferenceConfiguration cached` + getCached(Context), invalidado por OnSharedPreferenceChangeListener registrado no SharedPreferences default e por um hook em ProfilesManager.setActive/update/delete (ProfilesManager.java:143-162, que já tem o mecanismo de listeners). Trocar os call sites de desenho/evento para getCached; manter readPreferences para quem precisa de leitura fresca (StreamSettings, EditProfileActivity).

**Risco:** Baixo-médio: risco de stale config se algum caminho gravar prefs sem passar pelo listener (ex.: escrita direta em Game.java:1726-1733). Mitigar invalidando também em Game.onDestroy/onResume.

### Corrigir o pipeline de frame pacing e reconciliar as opções warp/cap-fps

**Tamanho:** small

**Por quê:** Hoje a preferência mais visível da categoria de vídeo (frame_pacing, 6 opções na UI) não tem efeito por causa de Game.java:696 e :702; o usuário do fork ajusta latência e nada muda, o que gera relatos falsos de regressão.

**Como:** Remover as atribuições de prefConfig.framePacing em Game.java:692-703, manter apenas setPreferLowerDelays/setPreferLowerDelaysTimeoutUs; revisar Game.java:757-765 (cap-fps) para não degradar para BALANCED silenciosamente; documentar no summary de frame_pacing (strings.xml) o que warp/warp2 fazem (multiplicam chosenFrameRate por 2/4 em Game.java:775-777) já que hoje isso não está explicado em lugar nenhum.

**Risco:** Médio: reativa caminhos de código do renderer que estavam efetivamente desligados há tempo (MediaCodecDecoderRenderer.java:1136-1400). Fazer release com aviso e possibilidade de voltar ao modo balanced.

### Preset 'Apollo/Vibeshine + display virtual' como perfil de fábrica

**Tamanho:** small

**Por quê:** O host do dono do fork cria display virtual automaticamente; a combinação correta de checkbox_use_virtual_display, checkbox_enable_sops, resolução/refresh custom e checkbox_enforce_display_mode é não óbvia e hoje precisa ser montada à mão em cada instalação.

**Como:** Adicionar em ProfilesActivity (app/src/main/java/com/limelight/ProfilesActivity.java:39-43) uma opção 'Criar a partir de preset' que instancia SettingsProfile com um Map pré-definido (checkbox_use_virtual_display=true, list_resolution=<nativa do device>, custom_refresh_rate, checkbox_enable_sops=false, video_format=auto). Os presets podem viver em um JSON em res/raw para facilitar manutenção.

**Risco:** Baixo, desde que os presets sejam apenas ponto de partida (perfil editável) e não sobrescrevam configurações globais.

### Preferência de comportamento do IME: empurrar/redimensionar o stream (comportamento AnyDesk)

**Tamanho:** medium

**Por quê:** É a dor nº1 do dono do fork: hoje o teclado do sistema cobre o stream porque .Game não declara windowSoftInputMode e StreamContainer sempre mede contra a janela inteira. Nenhuma preferência existente controla isso.

**Como:** 1) Nova ListPreference `list_ime_behavior` (valores overlay|resize|pan, default overlay) em category_input_settings de app/src/main/res/xml/preferences.xml:364-483, com arrays em app/src/main/res/values/arrays.xml. 2) Ler em PreferenceConfiguration.readPreferences (novo campo imeBehavior, seguindo o padrão de getVideoScaleMode em PreferenceConfiguration.java:607-624). 3) Em Game.onCreate (perto de Game.java:464, onde já se chama streamContainer.setCommitTextEnabled) instalar ViewCompat.setOnApplyWindowInsetsListener aplicando bottom padding/height = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom no streamContainer quando imeBehavior==resize — usar ExternalDisplayControlActivity.java:169-176 como referência de API já validada no projeto. 4) Adicionar android:windowSoftInputMode="adjustResize" a .Game em app/src/main/AndroidManifest.xml:193-216. 5) StreamContainer.onMeasure (StreamContainer.java:120-150) já preserva aspect ratio, então reduzir a altura disponível redimensiona o vídeo naturalmente.

**Risco:** Médio: .Game é fullscreen com system bars escondidas e usa PiP + display externo; adjustResize pode interagir mal com setDecorFitsSystemWindows e com o modo de tela cheia (checkbox_full_screen). Mitigar mantendo o default 'overlay' (comportamento atual) e testando com enableFullExDisplay/PiP.

### Campo de entrada de texto em bloco (send text) reaproveitando conn.sendUtf8Text

**Tamanho:** medium

**Por quê:** O transporte de texto inteiro JÁ EXISTE: conn.sendUtf8Text é usado em Game.java:2095, 2206 e no pipeline de commitText (Game.java:4289-4335, chunks de 512 bytes com preservação de code points). Falta apenas UI e uma preferência. Hoje só se consegue isso ativando checkbox_enable_commit_text, que depende do IME chamar commitText (não funciona bem com teclados que enviam tecla a tecla).

**Como:** 1) Adicionar item no GameMenu (GameMenu.java, mesma lista onde ficam os botões especiais) abrindo um AlertDialog com EditText multilinha; no OK chamar o já existente enqueueCommitText(text) de Game.java:4314. 2) Nova CheckBoxPreference `checkbox_enable_text_input_dialog` (default true) e `checkbox_text_input_send_enter` em category_input_settings (preferences.xml:364-483), lidas em PreferenceConfiguration junto de CHECKBOX_ENABLE_COMMIT_TEXT (PreferenceConfiguration.java:139,991). 3) Opcional: botão flutuante, reaproveitando a infra de checkbox_enable_floating_button (PreferenceConfiguration.java:116,939). 4) Promover checkbox_enable_commit_text para default true ou destacá-lo com summary explicando swipe typing.

**Risco:** Baixo: usa caminho de rede já existente e testado. Atenção ao host Apollo/Vibeshine — validar que o pacote UTF-8 é suportado pelo fork do Sunshine em uso antes de ligar por padrão.

### Perfis como delta + limpeza de chaves de runtime

**Tamanho:** medium

**Por quê:** Perfis-snapshot congelam configurações e carregam lixo (performance_log, zoom/pan), causando o sintoma 'mudei nas configurações e não mudou nada' e inflando profiles.json.

**Como:** Em EditProfileActivity.saveProfile (EditProfileActivity.java:119-159) aplicar o diff() já existente (:232-248) contra PreferenceManager.getDefaultSharedPreferences(this).getAll() e remover uma denylist fixa (performance_log, number_zoom_scale, number_pan_offset_x, number_pan_offset_y). Adicionar migração one-shot que reduz perfis existentes ao delta na primeira carga (ProfilesManager.load, :49-100). Exibir na UI do editor 'N configurações sobrescritas'.

**Risco:** Médio: reduzir um perfil existente para delta muda semanticamente o que ele faz (chaves antes congeladas passam a seguir o global). Fazer backup do profiles.json antes da migração e avisar o usuário.

### Busca e navegação dentro das configurações

**Tamanho:** medium

**Por quê:** São 133 chaves em 11 categorias numa única PreferenceScreen plana de 1026 linhas de XML; achar 'commit text' ou 'metered bitrate' exige rolagem longa, o que agrava a percepção de que 'a opção não existe'.

**Como:** Migrar de uma tela única para PreferenceScreen aninhadas ou adicionar uma SearchView na StreamSettings que filtre por título/summary percorrendo getPreferenceScreen() recursivamente (existe helper análogo em EditProfileActivity.highlightPreferences, EditProfileActivity.java:314-328). Alternativa mais barata: manter a tela e apenas ajustar app:initialExpandedChildrenCount por categoria com base em telemetria de uso.

**Risco:** Médio: a lógica de poda dinâmica de StreamSettings.initializePreferences (StreamSettings.java:335-403) assume uma hierarquia plana com categorias conhecidas; aninhar telas exige revisar todos os findPreference.

### Export/import de configuração completa (incluindo perfis)

**Tamanho:** medium

**Por quê:** O backup do Android exclui todas as SharedPreferences (backup_rules.xml:3), então trocar de aparelho significa reconfigurar ~130 opções à mão. O app já exporta layout de teclado via FileProvider e tem um exportador de todas as prefs escrito porém morto (StreamSettings.java:1073-1084).

**Como:** Criar Preference 'Exportar configurações' em category_settings_misc (preferences.xml:979-1025) reaproveitando getAllJsonData + FileProvider (padrão de StreamSettings.java:822-847), incluindo profiles.json e os arquivos OSC/OSC_Keyboard*; e 'Importar configurações' com ACTION_OPEN_DOCUMENT (padrão de StreamSettings.java:743-756 e onActivityResult :998-1045), com validação de versão e allowlist de chaves para não importar estado dependente de dispositivo (resoluções nativas, GlPreferences, DecoderTombstone).

**Risco:** Médio: importar prefs de outro dispositivo pode reintroduzir exatamente os valores device-specific que motivaram a exclusão do backup; exigir allowlist e diálogo de confirmação.

### Tornar o teclado virtual próprio e o IME configuráveis de forma coerente

**Tamanho:** medium

**Por quê:** As chaves onscreen_keyboard_* (altura, largura, alinhamento, autofit) têm nomes que sugerem IME mas controlam o teclado desenhado pelo app (KeyBoardLayoutController.java:327-338), e o campo Java se chama onscreenKeyboardAutoFitDisabled enquanto a chave é onscreen_keyboard_autofit (semântica invertida em relação ao nome, PreferenceConfiguration.java:960 e preferences.xml:567-594 onde os seekbars dependem do checkbox). Isso confunde qualquer um que procure 'teclado' nas configurações.

**Como:** Renomear os títulos/summaries (strings.xml:490,495) para deixar explícito 'teclado virtual do Artemis' vs 'teclado do sistema (IME)', renomear o campo Java para onscreenKeyboardManualSize (mantendo a chave para compatibilidade) e agrupar as futuras opções de IME numa subcategoria própria adjacente.

**Risco:** Baixo (renomeações de UI e de campo interno; a chave persistida não muda).

### Gerar o catálogo de preferências a partir de uma única fonte (eliminar defaults duplicados)

**Tamanho:** large

**Por quê:** Existem hoje ~130 pares chave/default declarados DUAS vezes (preferences.xml e PreferenceConfiguration.java), sem verificação — foi exatamente isso que produziu checkbox_joycon_fix vs checkbox_enable_joyconfix e checkbox_forceTightThresholds órfã.

**Como:** Curto prazo: escrever um teste unitário (app/src/test) que parseia res/xml/preferences.xml, extrai android:key/android:defaultValue e compara com as constantes e defaults refletidos de PreferenceConfiguration, falhando o build em divergência ou chave órfã nos dois sentidos. Longo prazo: gerar PreferenceConfiguration por annotation processor/KSP a partir de um descritor único (chave, tipo, default, categoria, dependência), mantendo os campos públicos atuais para não quebrar os ~35 call sites de readPreferences.

**Risco:** Médio na versão gerada (refatoração ampla); praticamente nulo na versão só-teste, que já pega 90% do valor.

### Perfis por host e por app (resolução automática de perfil)

**Tamanho:** epic

**Por quê:** Perfis são globais e ativados à mão (ProfilesManager.java:158, ProfilesAdapter.java:54-63); ninguém lembra de trocar o perfil ao mudar de PC/jogo, o que gera bitrate/resolução errados silenciosamente. É a evolução natural do sistema já existente.

**Como:** 1) Estender SettingsProfile (app/src/main/java/com/limelight/profiles/SettingsProfile.java:6-21) com Set<String> hostUuids e Set<Integer> appIds (Gson tolera campos ausentes, então profiles.json antigo continua carregando). 2) Criar ProfilesManager.resolveFor(ComputerDetails, NvApp) com precedência app > host > ativo global e usá-la em getOverlayingSharedPreferences (ProfilesManager.java:200-207) por meio de um 'contexto de perfil' setado em ServerHelper.doStart e em Game.onCreate (Game.java:354). 3) UI: menu de contexto em AppView.onCreateContextMenu (AppView.java:443-480, onde já há 'hide app') com 'Atribuir perfil', e no PcView.onCreateContextMenu para hosts. 4) Mostrar o perfil resolvido no FAB de PcView/AppView (PcView.java:345-359).

**Risco:** Alto: mexe no ponto por onde toda a configuração é lida; um bug ali afeta o app inteiro. Exige cuidado com o singleton mutável e com estado por-thread. Fazer feature-flag e cobrir com testes de resolução de precedência.


## Glossário

- SharedPreferences default: arquivo <applicationId>_preferences.xml gerenciado por androidx PreferenceManager.getDefaultSharedPreferences; é a única fonte persistente da configuração do Artemis (PreferenceConfiguration.java:718)
- Overlay de perfil: SharedPreferences decorator (ProfilesManager.OverlaySharedPreferences, ProfilesManager.java:212-258) que sobrepõe o Map<String,Object> do perfil ativo às prefs default nas LEITURAS; escritas caem no arquivo base (edit() :251)
- Patch/options do perfil: Map<String,Object> em SettingsProfile.options (SettingsProfile.java:11) serializado em files/profiles/profiles.json; hoje é um snapshot completo, não um delta
- Perfil ativo: UUID em ProfilesManager.activeProfileId (ProfilesManager.java:36), persistido junto dos perfis; null = sem perfil, prefs default puras
- InMemorySharedPreferences: implementação de SharedPreferences em memória usada pelo editor de perfil (EditProfileActivity.java:334-475)
- InMemoryPreferenceDataStore: PreferenceDataStore que roteia todos os widgets do preferences.xml para o SharedPreferences em memória do perfil (EditProfileActivity.java:196-230)
- Chave legacy: chave antiga migrada e removida em readPreferences — list_resolution_fps, checkbox_51_surround, checkbox_stretch_video, checkbox_enforce_refresh_rate, seekbar_bitrate, checkbox_disable_frame_drop (PreferenceConfiguration.java:37-45,69)
- SeekBarPreference custom: Preference do projeto com namespace http://schemas.moonlight-stream.com/apk/res/seekbar e atributos min/step/divisor/keyStep (SeekBarPreference.java:20-69)
- Native resolution entry: entrada de resolução injetada em runtime a partir de Display.getSupportedModes/DisplayCutout, marcada com prefixo Native/Custom (StreamSettings.java:196-240)
- list_resolution: String, default "1280x720" (XML :13 / Java :141), lido em PreferenceConfiguration.java:789 → config.width/height; entradas nativas são anexadas em runtime
- list_fps: String, default "60" (XML :22 / Java :142), lido em :799 → config.fps (float; aceita valores custom como 59.94)
- seekbar_bitrate_kbps: int em kbps, sem default no XML, default = getDefaultBitrate(res,fps) (:495-556, :834); range 500..300000, step 500
- seekbar_metered_bitrate_kbps: int em kbps, default efetivo = bitrate/4 quando 0 (:839-843); usado em rede tarifada
- frame_pacing: String, default "latency"; valores latency|balanced|cap-fps|smoothness|warp|warp2 (arrays.xml:130-137); warp/warp2 setam framePacingWarpFactor 2/4 (:863-868); valor é sobrescrito para BALANCED em Game.java:696,702
- pref_low_latency_frame_balance: boolean, default false (:635) → preferLowerDelays; controla timeout de dequeue do decoder (500us vs 2000us, Game.java:692-703)
- checkbox_ultra_low_latency: boolean, default false (:882) → StreamConfiguration.setEnableUltraLowLatency (Game.java:789) e opções low-latency do MediaCodec
- checkbox_forceTightThresholds: boolean declarado em preferences.xml:76 e NUNCA lido; campo forceTightThresholds fixo em false (PreferenceConfiguration.java:233) — preferência morta
- checkbox_use_virtual_display: boolean, default false (:881); inverte o menu de start do AppView (AppView.java:453,464,755-768) e é passado a ServerHelper.doStart
- checkbox_auto_orientation: boolean, default false (:941) → autoOrientation (modo retrato)
- checkbox_auto_invert_video_resolution: boolean, default true (:942), dependente de checkbox_auto_orientation no XML (:96); usado em Game.java:429 (portraitMode && autoInvertVideoResolution)
- checkbox_enable_view_top_center: boolean, default false (:968) → alignDisplayTopCenter (alinhamento do vídeo no topo)
- seekbar_resolution_scale_factor: int %, default 100, range 20..200 (:943) → StreamConfiguration.setResolutionScaleFactor (Game.java:787)
- list_video_scale_mode: String, default "fit"; fit|fill|stretch → enum ScaleMode (:607-624)
- edit_diy_w_h: String "LxA", default XML "1920x1080", lido como null por padrão (:1026) → customResolution; injeta entrada Custom na lista (StreamSettings.java:431-441)
- edit_diy_bitrate: String em Mbps, default XML "20"; valor próprio nunca é lido — só grava seekbar_bitrate_kbps via listener (StreamSettings.java:868-880)
- custom_refresh_rate: String float, default XML "59.94", lido como null (:1027) → customRefreshRate; injeta entrada Custom de FPS (StreamSettings.java:444-454)
- checkbox_enforce_display_mode: boolean, default false (:880); força o Display.Mode do stream (Game.java:1554)
- render_mode_list: String "0"|"1"|"2" (2D, 3D SBS, 3D SBS filme), default "0" (:890) → config.renderMode
- parallax_depth / convergence_ratio / balance_shift: int 0..100, default 50, divididos por 100 em runtime (:1035-1037); parâmetros do render 3D SBS
- checkbox_enable_hdr: boolean, default false (:921); anulado em firmware Shield ATV quebrado (isShieldAtvFirmwareWithBrokenHdr :705) e escondido sem HDR10 no display (StreamSettings.java:633-668)
- checkbox_enable_fullexdisplay: boolean, default false (:966) → enableFullExDisplay; modo display externo (ServerHelper.java:66,99,126)
- list_audio_config: String "2"|"51"|"71", default "2" → MoonBridge.AUDIO_CONFIGURATION_* (:845-854)
- checkbox_enable_audiofx: boolean, default false (:1015); habilita AudioEffect no AudioTrack
- seekbar_deadzone: int %, default 5, XML permite -20..20 (preferences.xml:246-254) → stickDeadzone (ControllerHandler.java:182)
- checkbox_multi_controller: boolean, default true (:886); múltiplos gamepads
- checkbox_usb_driver / checkbox_usb_bind_all: boolean, default true/false (:887,:927); driver USB próprio (Xbox) e bind de todos os dispositivos
- checkbox_mouse_emulation: boolean, default true (:928); emulação de mouse pelo gamepad
- analog_scrolling: String none|right|left, default "right" → enum AnalogStickForScrolling (:668-681)
- checkbox_flip_face_buttons: boolean, default false (:935); troca A/B, X/Y
- checkbox_gamepad_touchpad_as_mouse: boolean, default false (:1018)
- checkbox_gamepad_motion_sensors: boolean, default true (:1019); forçado a false uma única vez no Android 12 por bug do InputDeviceSensorManager (:824-831)
- checkbox_gamepad_motion_fallback / checkbox_force_device_motion: boolean, default false (:1020,:1021); usa sensores do próprio aparelho
- checkbox_enable_joyconfix: chave do XML (preferences.xml:322) que NINGUÉM lê; o código lê checkbox_joycon_fix (:951) — par órfão
- checkbox_gamepad_enable_battery_report: boolean, default true (:1006)
- checkbox_enable_rumble: boolean, default true (:1022); checkbox_vibrate_fallback (false, :933) e checkbox_enable_device_rumble (false, :989) dependem dele; seekbar_vibrate_fallback_strength int 1..200 default 100 (:934)
- mouse_mode_list: String "0".. "5" (multi-touch, mouse normal, trackpad natural, trackpad gaming, desabilitado, mouse com botões trocados), default "0"; mapeado para enableMultiTouchScreen/touchscreenTrackpad em :895-916 e regravado em runtime se rememberMouseMode (Game.java:4126-4133)
- checkbox_remember_mouse_mode: boolean, default false (:930); persiste o modo escolhido no menu do jogo
- checkbox_mouse_local_cursor: boolean, default false (:980); cursor local desenhado pelo cliente
- checkbox_multi_touch_gestures: boolean, default false (:982)
- checkbox_mouse_nav_buttons: boolean, default false (:929); botões voltar/avançar do mouse
- checkbox_absolute_mouse_mode: boolean, default false (:1005); removido da UI em pré-Oreo e em NVIDIA Shield (StreamSettings.java:356-361)
- seekbar_trackpad_sensitivity_x / _y: int %, default 100, XML permite -200..200 (preferences.xml:411-430) → TrackpadContext (Game.java:817)
- checkbox_trackpad_drag_drop_vibration / seekbar_trackpad_drag_drop_threshold: boolean false e int ms default 250 (0..2000) (:1001,:1002); limiar de drag-and-drop no trackpad (Game.java:2895)
- checkbox_trackpad_swap_axis: boolean, default false (:1003)
- checkbox_force_qwerty: boolean, default true (:1007); força layout QWERTY na tradução de teclas
- checkbox_back_as_meta: boolean, default false (:1008); tecla Back física vira Meta/Win
- checkbox_back_as_guide: boolean, default false (:1010); Back vira botão Guide do gamepad
- checkbox_ignore_synth_events: boolean, default false (:1009); ignora eventos sintéticos de input
- checkbox_enable_commit_text: boolean, default false (:991) → enableCommitText; habilita InputConnection em StreamView/StreamContainer (StreamView.java:36, StreamContainer.java:156) e o envio de texto inteiro por conn.sendUtf8Text em chunks de 512 bytes (Game.java:313-330, 4289-4335) — é o mecanismo mais próximo do 'enviar texto inteiro' pedido
- checkbox_enable_sops: boolean, default true (:883); deixa o host otimizar as configurações do jogo
- checkbox_host_audio: boolean, default false (:884); mantém áudio tocando também no host
- checkbox_smart_clipboard_sync: boolean, default false (:1011); sincronização de clipboard (Game.java:2234,4215); checkbox_smart_clipboard_sync_toast (true, :1012) e checkbox_hide_clipboard_content (true, :1013) o acompanham
- checkbox_resume_without_confirm: boolean, default false (:945); retoma sessão sem diálogo
- checkbox_enable_quit_dialog: boolean, default true, literal hardcoded no getter (:938) → enableBackMenu; checkbox_enable_floating_button (false, :939) depende dele no XML
- checkbox_full_screen: boolean, default true (:888) → fullScreen
- seekbar_keyboard_axi_opacity: int %, default 90 (:953) → oscKeyboardOpacity (opacidade do teclado virtual próprio)
- onscreen_keyboard_autofit: boolean, default false (:960) → campo onscreenKeyboardAutoFitDisabled (semântica invertida em relação ao nome); quando marcado, habilita altura/largura manuais (KeyBoardLayoutController.java:327-329)
- seekbar_onscreen_keyboard_height / _width: int dp, defaults 200 (150..400) e 1000 (150..1000) (:959,:961); dependem de onscreen_keyboard_autofit
- list_onscreen_keyboard_align_mode: String left|center|right, default "center" (:962); alinhamento do teclado virtual próprio (KeyBoardLayoutController.java:338)
- checkbox_enable_sticky_modifier_key_virtual_keyboard: boolean, default true (:1014) → stickyModifierKey; modificadores fixos no teclado virtual (KeyBoardLayoutController.java:91)
- checkbox_disable_warnings: boolean, default false (:879) → disableWarnings (suprime toasts)
- checkbox_show_overlay_zoom_toggle_button: boolean, default false (:940)
- checkbox_remember_zoom_pan: boolean, default false (:1030); persiste number_zoom_scale/number_pan_offset_x/number_pan_offset_y em Game.onDestroy (Game.java:1726-1733)
- number_zoom_scale / number_pan_offset_x / number_pan_offset_y: float de runtime nas prefs default (defaults 1.0/0.0/0.0, :1031-1033); não aparecem em preferences.xml
- checkbox_enable_post_stream_toast: boolean, default false (:937) → enableLatencyToast (estatísticas ao fim do stream)
- checkbox_small_icon_mode: boolean com default calculado por getDefaultSmallMode (TV/leanback = false; smallestScreenWidthDp<500 = true), gravado em disco na primeira leitura (:558-576, :818-822, :885)
- checkbox_enable_pip: boolean, default false (:922); removido da UI em pré-Oreo, sem suporte a PiP ou em Fire OS (StreamSettings.java:390-396)
- checkbox_show_onscreen_controls: boolean, default false (:917) → onscreenController; é a dependência XML de quase toda a categoria de OSC
- checkbox_hide_osc_when_has_gamepad: boolean, default true (:918)
- checkbox_onscreen_style_official: boolean, default false (:955); estilo oficial dos botões virtuais (DigitalButton.java:162)
- checkbox_vibrate_osc: boolean, default true (:932); vibração dos controles na tela
- checkbox_only_show_L3R3: boolean, default false (:919)
- checkbox_show_guide_button: boolean, default true (:920)
- seekbar_osc_opacity: int %, default 90 (:874) → oscOpacity
- checkbox_enable_analog_stick_new: boolean, default false (:964) → enableNewAnalogStick (analógico livre); seekbar_osc_free_analog_stick_opacity int % default 20 (:957)
- option_reset_osc_preference: DialogPreference que limpa o arquivo SharedPreferences "OSC" (ConfirmDeleteOscPreference.java:46); sem valor persistido
- checkbox_enable_keyboard: boolean, default false (:947) → enableKeyboard (teclado virtual próprio / botões especiais na tela)
- checkbox_enable_clear_default_special_button: boolean, default false (:987) → disableDefaultExtraKeys (GameMenu.java:158)
- checkbox_vibrate_keyboard: boolean, default false (:949) → enableKeyboardVibrate
- keyboard_axi_list: String, default "OSC_Keyboard", valores OSC_Keyboard..OSC_Keyboard_5 — o valor É o nome do arquivo SharedPreferences do layout; lido fora do overlay de perfis (KeyBoardControllerConfigurationLoader.java:39,554,570)
- checkbox_enable_keyboard_square: boolean, default false (:993); botões quadrados no teclado virtual
- option_reset_osc: DialogPreference que limpa o arquivo do layout de teclado selecionado (ConfirmDeleteKeyboardPreference.java:46-52)
- import_keyboard_file / export_keyboard_file: Preferences de ação (sem valor) que importam/exportam o JSON do layout via ACTION_OPEN_DOCUMENT e FileProvider (StreamSettings.java:743-756, 822-847); ocultas no editor de perfil (EditProfileActivity.java:284-291)
- import_special_button_file: ação que grava o JSON de botões especiais no arquivo "specialPrefs", chave "special_key" (StreamSettings.java:1036-1038; GameMenu.java:38,40)
- checkbox_enable_touch_sensitivity: boolean, default false (:978); mestre da categoria de trackpad virtual
- checkbox_enable_global_touch_sensitivity: boolean, default false (:976) → touchSensitivityGlobal
- checkbox_enable_touch_sensitivity_rotation_auto: boolean, default true (:974) → touchSensitivityRotationAuto
- seekbar_touch_sensitivity_opacity_x / _y: int %, default 100, range 10..300 (:970,:972) → touchSensitivityX/Y (Game.java:2474,2507); nome 'opacity' é herança de copy-paste
- seekbar_touchpad_sensitivity_opacity / _y_opacity: int %, default 100, range 10..300 (:995,:997) → touchPadSensitivity / touchPadYSensitity
- checkbox_enable_perf_overlay: boolean, default false (:923); mestre de checkbox_enable_perf_overlay_lite (:925), _lite_dialog (:985), _bottom (:926) e checkbox_enable_perf_logging (:924)
- checkbox_enable_perf_logging: boolean, default false (:924); ao desligar, apaga o log (StreamSettings.java:728-740)
- performance_log: String JSON gravada nas prefs default por PerformanceDataTracker.java:16,119; não aparece em preferences.xml e é copiada para dentro de perfis novos
- share_performance_logs: ação que grava artemistics_logs.txt no cacheDir e dispara ACTION_SEND por e-mail (StreamSettings.java:771-820)
- option_view_shared_pref_logs / option_help_custom_keys / option_software_release / option_follow_update: WebLauncherPreference com URL fixa no atributo 'url' (wiki, teclas especiais, releases, Obtainium)
- pref_debug_info: ação que abre DebugInfoActivity (StreamSettings.java:849-859)
- video_format: String auto|forceav1|forceh265|neverh265, default "auto" → enum FormatOption (:585-605)
- checkbox_unlock_fps: boolean, default false (:931); ao mudar, recria a tela de settings (StreamSettings.java:620-630) e libera opções de FPS acima do suportado
- checkbox_reduce_refresh_rate: boolean, default false (:1016)
- checkbox_full_range: boolean, default false (:1017); full range color
- checkbox_prevent_packet_loss: boolean, default false (:1023)
- list_languages: String, default "default" (:876); 23 idiomas espelhados em locales_config.xml; mudança força restart em pré-Android 13 (StreamSettings.java:143-162)
- GlPreferences: arquivo de prefs separado com Renderer e Fingerprint, usado por MediaCodecHelper para quirks de decoder (GlPreferences.java:10-13)
- DecoderTombstone: arquivo de prefs com CrashCount/LastNotifiedCrashCount; a cada 3 crashes dispara resetStreamingSettings (Game.java:355, UiHelper.java:183-205)
- HiddenApps: arquivo de prefs com StringSet por UUID de host contendo appIds ocultos — o único estado hoje realmente per-host/per-app (AppView.java:85,323,348)
- OSC: arquivo de prefs com o layout do gamepad virtual (VirtualControllerConfigurationLoader.java:20,416,431)
- specialPrefs / special_key: arquivo e chave com o JSON dos botões especiais do GameMenu (GameMenu.java:38,40,203)
- profiles.json: files/profiles/profiles.json com {profiles:[SettingsProfile], activeProfileId} serializado por Gson (ProfilesManager.java:30-31,102-131)
- resetStreamingSettings: limpeza de emergência de bitrate/resolução/fps/formato/HDR/unlock_fps/full_range após 3 crashes de decoder (PreferenceConfiguration.java:683-697)
- getDefaultBitrate: interpolação linear da tabela pixels→fator (360p=1 … 4K=40) multiplicada pelo fator de frame rate, resultado em kbps (PreferenceConfiguration.java:495-556)
- isSquarishScreen: heurística de tela quase quadrada (razão < 1.3) que faz o app oferecer resoluções em retrato e paisagem (PreferenceConfiguration.java:421-442)
