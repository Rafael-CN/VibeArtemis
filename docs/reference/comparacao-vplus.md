# Comparação Artemis (fork Rafael-CN / ClassicOldSong) vs Moonlight V+ (qiin2333/moonlight-vplus) — foco em TECLADO e viabilidade de cherry-pick

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (8)
6. [Ideias de melhoria](#ideias-de-melhoria) (8)
7. [Glossário](#glossário)

## Como funciona

O remote `vplus` foi buscado com sucesso (`git fetch vplus`, 49 branches remotas). A base comum entre `dev` (HEAD do Artemis, idêntico a `moonlight-noir`, commit 3397ec77) e `vplus/master` (HEAD 2ae5b1f4) é `f10085f5` "Update to libopus v1.5.2", de 27/07/2024 — ou seja, os forks divergiram há ~2 anos, com 568 commits do lado Artemis e 615 do lado V+ desde então. A divergência não é apenas de volume: é arquitetural. O V+ reescreveu praticamente todo o app em Kotlin (355 arquivos `.kt` contra 0 no Artemis), adotou Jetpack Compose, Firebase Analytics+Crashlytics, version catalogs (`libs.versions.toml`) e módulos Gradle adicionais (`:framegen`, `:moonlight-haptics-android`), enquanto o Artemis permanece Java puro, módulo único, `minSdk 21`/`targetSdk 34` contra `minSdk 22`/`targetSdk 35` do V+. A consequência prática é medível: dos 152 arquivos Java do Artemis em `app/src/main/java`, apenas 7 existem com o mesmo caminho no V+ (4,6%) — os 6 legados de `binding/input/virtual_controller/` e `nvstream/jni/MoonBridge.java`. Testei `git show --name-only` em quatro commits de teclado/input recentes do V+ (771baad5, 1686d0ac, 1389687e, 14e80d24) e todo arquivo de lógica interessante é `.kt` inexistente no Artemis; um `git cherry-pick` literal criaria arquivos Kotlin órfãos que nem compilariam. Portanto: **todo porte é reimplementação manual, não cherry-pick**. Sobre as duas dores do dono do fork, a conclusão é contraintuitiva e importante. Para a dor (1) — empurrar a tela quando o teclado abre — o V+ **não tem solução alguma**: a activity `.Game` do V+ não declara `windowSoftInputMode` no manifesto (mesma omissão do Artemis) e aplica exatamente os mesmos `FLAG_FULLSCREEN` + `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` que fazem o Android ignorar `adjustResize`. Não há nada a portar; tem que ser construído do zero. O único tijolo aproveitável é `window.setDecorFitsSystemWindows(false)` em `vplus/master:Game.kt:267`, pré-requisito do tratamento moderno de insets, que o V+ usa para outra finalidade. Para a dor (2) — enviar texto inteiro — **o Artemis está estritamente à frente do V+**: `StreamView.onCreateInputConnection()` já intercepta `commitText`/`deleteSurroundingText` e `Game.enqueueCommitText()` fatia em UTF-8 e drena com paceamento, enquanto uma busca por `commitText|onCreateInputConnection|BaseInputConnection|onCheckIsTextEditor` em toda a árvore do V+ retorna **zero resultados**. O único caminho de texto em lote do V+ é `handleKeyMultiple` → `sendUtf8Text(event.characters)` (`KeyboardInputHandler.kt:467-473`), que é o comportamento upstream padrão e raramente dispara em IMEs modernos. O que o V+ tem de teclado que o Artemis não tem é de outra natureza: um teclado overlay próprio (`KeyboardUIController.kt`, 629 linhas, 4 páginas Main/Nav/Num/Mini, modificadores sticky de 3 estados, slider de opacidade, redimensionamento por handle, modo mini flutuante arrastável), duplo-ESC para abrir o menu, acordes ESC+dígito → F1..F12, e alternância do teclado por N dedos configurável no modo native touch. O Artemis já tem teclado virtual próprio maior (4.186 linhas em `virtual_controller/keyboard/`) e gestos de 3/4/5 dedos, mas restritos ao modo trackpad. No plano de protocolo a divergência é ainda mais dura: o V+ aponta o submódulo para `qiin2333/moonlight-common-c` branch `mic` (commit 72733e3a) enquanto o Artemis usa `ClassicOldSong/moonlight-common-c` (c9994368) — logo microfone, clipboard 0x5508, eventos de touchpad e HDR10+ do V+ exigiriam trocar ou repatchar o submódulo, o que quebraria as features Apollo exclusivas do Artemis (`sendExecServerCmd`, `sendEmptyPayload`), ausentes no V+. Por fim, relevante ao contexto Vibeshine: o clipboard sync do Artemis é HTTP Apollo-only (`NvHTTP.getClipboard/sendClipboard` no endpoint `actions/clipboard`, com comentário explícito tratando "the 200ed 404 from Sunshine"), portanto inerte no host do dono; o do V+ roda sobre o control stream e teria chance de funcionar em forks do Sunshine.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/ui/StreamView.java`](../../app/src/main/java/com/limelight/ui/StreamView.java) | 167 | SurfaceView do stream. Contém a vantagem decisiva do Artemis sobre o V+: expõe uma InputConnection que intercepta commitText/deleteSurroundingText, permitindo receber texto do IME em bloco. O V+ não tem equivalente algum. Também faz o onMeasure com aspect ratio, que é o ponto onde a dor #1 (redimensionar quando o IME abre) vai aterrissar. |
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4348 | God-class de 4.348 linhas com toda a lógica de teclado, janela e clipboard. Concentra os dois bloqueios do dono: os flags de fullscreen que impedem adjustResize e o pipeline de commitText (que tem um bug de arranque de fila). É o arquivo que o V+ dividiu em KeyboardInputHandler.kt/TouchInputHandler.kt. |
| [`app/src/main/AndroidManifest.xml`](../../app/src/main/AndroidManifest.xml) | 0 | Declaração da activity .Game SEM android:windowSoftInputMode — metade do bloqueio da dor #1. Confirmado que o V+ tem exatamente a mesma omissão (V+ AndroidManifest.xml:288-298), o que prova que não há solução a portar. |
| [`vplus/master:app/src/main/java/com/limelight/KeyboardInputHandler.kt`](../../vplus/master:app/src/main/java/com/limelight/KeyboardInputHandler.kt) | 495 | Todo o teclado do V+ extraído da Game (495 linhas). Prova negativa central desta análise: não há nenhum ramo de InputConnection/commitText. Contém as duas features de teclado genuinamente ausentes no Artemis — duplo-ESC para menu e acordes ESC+dígito → F1..F12. |
| [`vplus/master:app/src/main/java/com/limelight/binding/input/advance_setting/KeyboardUIController.kt`](../../vplus/master:app/src/main/java/com/limelight/binding/input/advance_setting/KeyboardUIController.kt) | 629 | Teclado overlay próprio do V+ (629 linhas): páginas Main/Nav/Num/Mini, modificadores sticky de 3 estados, opacidade persistida, handle de redimensionamento, modo mini flutuante. É a resposta do V+ à oclusão do teclado — mitigar com transparência e modo compacto em vez de empurrar a tela. O Artemis já tem teclado virtual maior (4.186 linhas), então aqui só se colhem ideias. |
| [`vplus/master:app/src/main/java/com/limelight/Game.kt`](../../vplus/master:app/src/main/java/com/limelight/Game.kt) | 0 | Activity de stream do V+. Confirma que o V+ usa o MESMO toggleSoftInput(0,0) primitivo do Artemis e os MESMOS flags de fullscreen/immersive — nenhum tratamento de insets do IME. Também mostra o setDecorFitsSystemWindows(false), único tijolo aproveitável para a dor #1. |
| [`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`](../../app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java) | 0 | Um dos únicos 7 arquivos com caminho idêntico nos dois forks — e mesmo assim divergente. Fronteira JNI inteira. O diff dos métodos nativos é o mapa preciso do que cada fork ganhou: Artemis tem sendExecServerCmd/sendEmptyPayload (Apollo); V+ tem microfone, clipboard, touchpad, HDR10+ e cursor shapes. |
| [`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`](../../app/src/main/java/com/limelight/nvstream/http/NvHTTP.java) | 938 | Cliente HTTP do protocolo. Contém o clipboard sync do Artemis, que é Apollo-only e portanto inerte no host Vibeshine do dono — o comentário no código admite o 404 do Sunshine. |
| [`vplus/master:app/src/main/java/com/limelight/nvstream/input/ClipboardSyncManager.kt`](../../vplus/master:app/src/main/java/com/limelight/nvstream/input/ClipboardSyncManager.kt) | 470 | Clipboard sync bidirecional do V+ sobre o control packet 0x5508, com supressão de eco em duas camadas, suporte a PNG e upload de blobs grandes por HTTPS. Alternativa conceitual ao clipboard Apollo-only do Artemis, mas presa ao submódulo moonlight-common-c do V+. |
| [`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 0 | Superfície de preferências do Artemis (133 chaves contra 157 do V+). Define enableCommitText com default false e o smartClipboardSync. Ponto de entrada para as preferências novas de qualquer feature de teclado portada. |
| [`app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java`](../../app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java) | 0 | Único teste do caminho de commitText (Robolectric). Cobre apenas payloads curtos, motivo pelo qual o bug de arranque de fila com texto >512 bytes passou despercebido. É o lugar para estender a cobertura. |
| [`vplus/master:app/src/main/java/com/limelight/binding/input/advance_setting/KeyboardGestureDetector.kt`](../../vplus/master:app/src/main/java/com/limelight/binding/input/advance_setting/KeyboardGestureDetector.kt) | 64 | Detector de toque do teclado overlay do V+. Pequeno e conceitualmente aproveitável: distingue release curto de hold (>=200ms) e double-tap (250ms), roteando keycodes por tag de View. Dá semântica diferente a modificadores sem UI extra. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java) | 795 | Núcleo do teclado virtual próprio do Artemis. Contexto essencial para avaliar o overlay do V+: o conjunto do Artemis soma 4.186 linhas contra 629 do V+, com import/export de layout que o V+ não tem. Reforça que o teclado overlay do V+ não deve ser adotado, só saqueado por ideias. |
| [`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`](../../app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java) | 0 | Única parte do Artemis que já lê insets de IME corretamente — modelo interno pronto para a implementação da dor #1, evitando inventar padrão novo. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/ui/StreamView.java`**
- `setCommitTextEnabled() :36`
- `onMeasure() :62`
- `onKeyPreIme() :97`
- `onCheckIsTextEditor() :126`
- `onCreateInputConnection() :131`
- `commitText() :142`
- `deleteSurroundingText() :150`
- `interface InputCallbacks :159`

**`app/src/main/java/com/limelight/Game.java`**
- `commitTextQueue + UTF8_CHUNK_SIZE :312-315`
- `flushCommitTextQueue :317`
- `addFlags(FLAG_FULLSCREEN) :359`
- `hideSystemUi runnable :1646`
- `IMMERSIVE_STICKY :1666`
- `sendUtf8Text(unicodeChar) :2095`
- `handleKeyMultiple → sendUtf8Text :2206`
- `handleFocusChange() :2233`
- `sendClipboard() :2304`
- `getClipboard() :2339`
- `toggleKeyboard() :2402`
- `gestos 3/4/5 dedos (só trackpad) :3232`
- `handleMultiTouchGesture() :3288`
- `handleCommitText() :4290`
- `handleDeleteSurroundingText() :4299`
- `enqueueCommitText() :4314`
- `bug de arranque da fila :4331`

**`app/src/main/AndroidManifest.xml`**
- `activity .Game :194`
- `configChanges :195`
- `theme StreamTheme :202`

**`vplus/master:app/src/main/java/com/limelight/KeyboardInputHandler.kt`**
- `handleSpecialKeys() :45`
- `handleKeyDown() :132`
- `máquina de estados escState :154-232`
- `ESC+dígito → F1-F12 :175-219`
- `handleKeyUp() :304`
- `duplo-ESC abre menu :322-339`
- `handleKeyMultiple → sendUtf8Text :467`
- `keyboardEvent() :482`

**`vplus/master:app/src/main/java/com/limelight/binding/input/advance_setting/KeyboardUIController.kt`**
- `init (infla layer_6_keyboard) :55`
- `initModifiers() :106`
- `initSeekbars (opacidade) :116`
- `setMiniMode :146`
- `resize handle :275-337`
- `sticky MOD_SINGLE :431`
- `showPopup() :458`
- `MOD_NEUTRAL :502-507`

**`vplus/master:app/src/main/java/com/limelight/Game.kt`**
- `setDecorFitsSystemWindows(false) :267`
- `addFlags(FLAG_FULLSCREEN) :272`
- `getOrCreateKeyboardUIController() :533`
- `toggle do teclado overlay :548`
- `createKeyboardEventListener() :631`
- `toggleKeyboard() → toggleSoftInput :1639-1643`
- `IMMERSIVE_STICKY :1291`

**`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`**
- `sendExecServerCmd() :357 (só Artemis)`
- `sendEmptyPayload() :359 (só Artemis)`
- `sendKeyboardInput() :390`
- `sendUtf8Text() :396 (nos dois)`

**`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`**
- `getClipboard() :922`
- `sendClipboard() :929`
- `comentário sobre 404 do Sunshine :931`
- `virtualDisplay na query :887`

**`vplus/master:app/src/main/java/com/limelight/nvstream/input/ClipboardSyncManager.kt`**
- `class ClipboardSyncManager :53`
- `start() :84`
- `onFocusGained() :112`
- `handleLocalClipChanged() :125`
- `trySendImage() :152`

**`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`**
- `CHECKBOX_ENABLE_COMMIT_TEXT :139`
- `DEFAULT_ENABLE_COMMIT_TEXT = false :208`
- `smartClipboardSync :259`
- `enableCommitText :337`
- `leitura de enableCommitText :991`
- `leitura de smartClipboardSync :1011`

**`app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java`**
- `commitText_isForwarded_whenEnabled() :30`
- `commitText_notForwarded_whenDisabled() :45`

**`vplus/master:app/src/main/java/com/limelight/binding/input/advance_setting/KeyboardGestureDetector.kt`**
- `interface GestureListener :9`
- `onTouchEvent() :21`
- `parse de tag "k<code>" :22-24`
- `hold vs release :48-53`
- `DOUBLE_TAP_TIMEOUT/HOLD_THRESHOLD :61-62`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java`**
- `KeyBoardController`
- `refreshLayout`
- `addElement`

**`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`**
- `toggleKeyboard() estático :93`
- `setDecorFitsSystemWindows(false) :170`
- `setOnApplyWindowInsetsListener :171`
- `insets.isVisible(Type.ime()) :172`
- `_toggleKeyboard() :448`

</details>

## Fluxo

FLUXO DE TECLADO NO ARTEMIS (estado atual, dev/3397ec77): (a) Tecla física ou IME → `StreamView.onKeyPreIme()` em app/src/main/java/com/limelight/ui/StreamView.java:97 → delega a `InputCallbacks.handleKeyDown/handleKeyUp` implementados em Game.java. (b) Caminho de texto em lote, só quando `checkbox_enable_commit_text` está ligado (default false, PreferenceConfiguration.java:208): `StreamView.setCommitTextEnabled(true)` (StreamView.java:36) marca a view como focável e faz `onCheckIsTextEditor()` retornar true (StreamView.java:126); o IME então chama `onCreateInputConnection()` (StreamView.java:131), que devolve uma `BaseInputConnection` anônima cujo `commitText()` (StreamView.java:142) chama `inputCallbacks.handleCommitText(text)`. (c) `Game.handleCommitText()` em Game.java:4290 checa `prefConfig.enableCommitText` e chama `enqueueCommitText()` (Game.java:4314), que converte para UTF-8, fatia em blocos de 512 bytes respeitando fronteiras de code point (Game.java:4320-4329) e enfileira em `commitTextQueue`. (d) O dreno é `flushCommitTextQueue` (Game.java:317-331): retira um chunk, chama `conn.sendUtf8Text(chunk)` (Game.java:325) e reagenda a si mesmo em 15ms se sobrou fila. (e) `NvConnection.sendUtf8Text()` (NvConnection.java:619) → `MoonBridge.sendUtf8Text()` (MoonBridge.java:396, native) → `Java_com_limelight_nvstream_jni_MoonBridge_sendUtf8Text` (jni/moonlight-core/simplejni.c:127) → `LiSendUtf8TextEvent(utf8Text, strlen(utf8Text))` (simplejni.c:129). (f) Backspaces do IME: `handleDeleteSurroundingText` (Game.java:4299) traduz KEYCODE_DEL e emite `beforeLength` pares DOWN/UP em laço apertado sem paceamento (Game.java:4304-4310). (g) Abrir/fechar teclado: `Game.toggleKeyboard()` (Game.java:2402) chama `inputManager.toggleSoftInput(0,0)` (Game.java:2408), ou desvia para `ExternalDisplayControlActivity.toggleKeyboard()` (ExternalDisplayControlActivity.java:93) quando em display externo. (h) Gatilhos de gesto: `handleMultiTouchGesture` em Game.java:~3288-3325 mapeia 3 dedos → `toggleKeyboard()`, 4 dedos → `toggleFullKeyboard()`, 5 dedos → menu — porém o ramo em Game.java:3232-3245 só roda sob `prefConfig.touchscreenTrackpad`. (i) A janela é fixada em fullscreen por `getWindow().addFlags(FLAG_FULLSCREEN)` (Game.java:359) e pelo runnable `hideSystemUi` (Game.java:1646-1669) que reaplica `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` (Game.java:1666); somado à ausência de `android:windowSoftInputMode` na declaração de `.Game` (AndroidManifest.xml:194-203), isso é exatamente o que faz o Android ignorar `adjustResize` e deixar o IME cobrir o stream. FLUXO EQUIVALENTE NO V+: (a) `Game.kt` delega a `KeyboardInputHandler.kt:132 handleKeyDown` / `:304 handleKeyUp`, que fazem dedup contra `KeyboardAccessibilityService.instance` (KeyboardInputHandler.kt:141-147), aplicam a máquina de estados ESC (`escState`, KeyboardInputHandler.kt:154-232) e traduzem via `keyboardTranslator.translate()` antes de `game.conn?.sendKeyboardInput(...)` (KeyboardInputHandler.kt:295). (b) Não existe ramo de `InputConnection`: o único lote é `handleKeyMultiple` (KeyboardInputHandler.kt:467) → `sendUtf8Text(event.characters)` (:471). (c) O teclado overlay é inflado por `KeyboardUIController` (construído em Game.kt:541), alternado por `Game.kt:548 getOrCreateKeyboardUIController()?.toggle()`, com toques roteados por `KeyboardGestureDetector.onTouchEvent` (KeyboardGestureDetector.kt:21) que distingue press/release/hold(200ms)/double-tap(250ms) e devolve keycodes via tag `"k<code>"` (:22-24). (d) `Game.kt:1639 toggleKeyboard()` chama o mesmo `inputManager.toggleSoftInput(0, 0)` (Game.kt:1643) do Artemis — nenhum tratamento de insets. (e) Clipboard do V+: `ClipboardSyncManager.kt` implementa `MoonBridge.ClipboardListener`, escuta `OnPrimaryClipChangedListener` (:76-82), reenvia no ganho de foco (`onFocusGained`, :112) e despacha via `sendClipboardFrameNative` (MoonBridge.java:556) sobre o control packet 0x5508; payloads grandes vão por HTTPS `/api/v1/clipboard/blob`. No Artemis o equivalente é `Game.handleFocusChange` (Game.java:2233) → `sendClipboard`/`getClipboard` (Game.java:2304 / 2339) → `NvHTTP.sendClipboard`/`getClipboard` (NvHTTP.java:929 / 922), caminho HTTP exclusivo do Apollo.

## Interfaces externas

- Android InputMethodManager — toggleSoftInput(0,0) usado identicamente por Artemis (Game.java:2408) e V+ (Game.kt:1643); nenhum dos dois usa WindowInsetsControllerCompat para IME
- Android InputConnection / BaseInputConnection / EditorInfo — usado SÓ pelo Artemis (StreamView.java:131-157); ausente por completo no V+
- Android WindowInsetsCompat.Type.ime() — no Artemis existe apenas em ExternalDisplayControlActivity.java:172; no V+ não é usado em lugar nenhum (só systemBars/displayCutout)
- Window.setDecorFitsSystemWindows(false) — V+ Game.kt:267 (API 30+); Artemis só em ExternalDisplayControlActivity.java:170
- android:windowSoftInputMode — ausente na activity .Game dos DOIS forks (Artemis AndroidManifest.xml:194; V+ AndroidManifest.xml:288)
- JNI MoonBridge → LiSendUtf8TextEvent (simplejni.c:127-129) — presente e idêntico nos dois
- JNI exclusivo do Artemis: sendExecServerCmd (MoonBridge.java:357), sendEmptyPayload (MoonBridge.java:359) — features Apollo, ausentes no V+
- JNI exclusivo do V+: sendClipboardFrameNative (:556), getHostFeatureFlags (:588), setCursorMode (:591), getMicPortNumber/isMicrophoneRequested/sendMicrophoneOpusData/isMicrophoneEncryptionEnabled (:599-605), setAudioHapticsSceneMode/OutputEnabled/SessionHandle (:608-610), nativeSetSurfaceDataSpace/nativeGetSurfaceDataSpace (:625-626), sendTouchpadEvent/sendTouchpadFrameEvent (:523-527)
- Submódulo moonlight-common-c — Artemis: ClassicOldSong/moonlight-common-c @ c999436858471dfefa7617af3b7dc03ec1644ce4; V+: qiin2333/moonlight-common-c branch 'mic' @ 72733e3a47fc7823e7e0b1b0cef2e3d101b0399b. Divergência incompatível.
- Control packet 0x5508 (clipboard sync, moonlight-common-c PR #5) — só V+
- HTTP Apollo actions/clipboard (NvHTTP.java:922-937) — só Artemis; retorna 404 em Sunshine, logo inerte no Vibeshine
- Sunshine HTTPS /api/v1/clipboard/blob — só V+, para payloads acima do inline
- AccessibilityService (KeyboardAccessibilityService) — Artemis 71 linhas em com.limelight; V+ 127 linhas em com.limelight.services
- Jetpack Compose + Firebase Analytics/Crashlytics + Kotlin coroutines — só V+ (app/build.gradle:3-4, 41-43, 265-284)
- Módulos Gradle extras do V+: :framegen (Vulkan/LSFG-VK + AMD FSR shaders) e :moonlight-haptics-android
- EasyTier VPN JNI (com.easytier.jni) — só V+
- LiteRT + OpenCV (app/build.gradle:182-184) — só Artemis

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🟠 alto | bug | enqueueCommitText nunca inicia o dreno quando o texto gera 2+ chunks — texto longo fica preso na fila | `app/src/main/java/com/limelight/Game.java:4331` |
| 🟠 alto | ux | Bloqueio da dor #1 do dono: activity .Game sem windowSoftInputMode e com IMMERSIVE_STICKY reaplicado | `app/src/main/AndroidManifest.xml:194` |
| 🟠 alto | tech-debt | Divergência de submódulo moonlight-common-c torna impossível portar qualquer feature de protocolo do V+ | `app/src/main/jni/moonlight-core/moonlight-common-c` |
| 🟡 médio | bug | handleDeleteSurroundingText emite rajada de backspaces sem paceamento e ignora afterLength | `app/src/main/java/com/limelight/Game.java:4299` |
| 🟡 médio | compatibility | Clipboard sync do Artemis é Apollo-only e fica inerte no host Vibeshine do dono | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:929` |
| 🟡 médio | ux | onCreateInputConnection não seta IME_FLAG_NO_FULLSCREEN — IME entra em extract mode em landscape | `app/src/main/java/com/limelight/ui/StreamView.java:138` |
| ⚪ baixo | maintainability | setCommitTextEnabled(false) não reverte focusableInTouchMode nem libera o foco | `app/src/main/java/com/limelight/ui/StreamView.java:36` |
| ⚪ baixo | ux | Gestos de 3/4/5 dedos para teclado só funcionam no modo trackpad | `app/src/main/java/com/limelight/Game.java:3232` |

### Detalhe

#### 🟠 alto enqueueCommitText nunca inicia o dreno quando o texto gera 2+ chunks — texto longo fica preso na fila

**Local:** `app/src/main/java/com/limelight/Game.java:4331` · **Categoria:** bug

O laço em Game.java:4320-4329 enfileira TODOS os chunks antes da checagem de arranque, e a checagem é `if (commitTextQueue.size() == 1)`. Se a fila estava vazia e o texto passa de 512 bytes UTF-8, o laço produz 2 ou mais chunks, `size()` vale >= 2, o `commitTextHandler.post(flushCommitTextQueue)` NUNCA é executado e o texto inteiro fica parado na `commitTextQueue` até que um commit posterior de exatamente um chunk dispare o dreno — momento em que o texto antigo sai na frente, fora de ordem. Com digitação normal (commits curtos) sempre nasce 1 chunk, o que mascara o defeito. Isso cai exatamente sobre a dor (2) do dono do fork: colar/enviar um bloco grande de texto é o caso que quebra. Note que o V+ não tem esse bug apenas porque não tem a feature.

**Correção sugerida:** Capturar o estado da fila ANTES de enfileirar e arrancar com base nele: `boolean wasIdle = commitTextQueue.isEmpty();` no topo de enqueueCommitText, e no fim `if (wasIdle) commitTextHandler.post(flushCommitTextQueue);`. Alternativamente manter um flag booleano `flushScheduled` setado no post e limpo no fim do runnable quando a fila esvazia. Cobrir com teste unitário Robolectric alimentando >512 bytes.

#### 🟠 alto Bloqueio da dor #1 do dono: activity .Game sem windowSoftInputMode e com IMMERSIVE_STICKY reaplicado

**Local:** `app/src/main/AndroidManifest.xml:194` · **Categoria:** ux

A declaração de `.Game` (AndroidManifest.xml:194-203) não traz `android:windowSoftInputMode`, e a janela recebe FLAG_FULLSCREEN em Game.java:359 mais SYSTEM_UI_FLAG_IMMERSIVE_STICKY reaplicado pelo runnable hideSystemUi em Game.java:1666. Nessa combinação o Android ignora adjustResize e o IME simplesmente cobre o stream — que é precisamente o comportamento que o dono quer eliminar. Confirmei que o Moonlight V+ tem EXATAMENTE a mesma configuração (V+ AndroidManifest.xml:288-298 sem windowSoftInputMode; Game.kt:272 FLAG_FULLSCREEN; Game.kt:1291 IMMERSIVE_STICKY), portanto não existe implementação de referência a portar — a feature precisa ser escrita do zero. Registro como finding e não só como ideia porque a expectativa de encontrar a solução pronta no V+ é falsa e conduziria o planejamento ao erro.

**Correção sugerida:** Não tentar adjustResize com os flags legados. Migrar a Game para WindowInsetsCompat: setDecorFitsSystemWindows(false) (padrão que o V+ já usa em Game.kt:267), registrar ViewCompat.setOnApplyWindowInsetsListener no container, ler insets.getInsets(WindowInsetsCompat.Type.ime()) e aplicar a altura como padding/height do StreamContainer, deixando o StreamView remedir pelo onMeasure já existente (StreamView.java:62). Guardar por Build.VERSION.SDK_INT >= 30 com WindowInsetsCompat para respeitar o minSdk 21.

#### 🟠 alto Divergência de submódulo moonlight-common-c torna impossível portar qualquer feature de protocolo do V+

**Local:** `app/src/main/jni/moonlight-core/moonlight-common-c` · **Categoria:** tech-debt

O Artemis fixa o submódulo em ClassicOldSong/moonlight-common-c @ c999436858471dfefa7617af3b7dc03ec1644ce4; o V+ usa qiin2333/moonlight-common-c branch `mic` @ 72733e3a47fc7823e7e0b1b0cef2e3d101b0399b (confirmado em .gitmodules e ls-tree de ambos os refs). São linhagens distintas do protocolo. Todas as features de wire do V+ — microfone (MoonBridge.java:599-605), clipboard 0x5508 (:556), eventos de touchpad (:523-527), HDR10+ via dataspace (:625-626), cursor shapes (:588/:591) — dependem dessa árvore nativa. Trocar o submódulo pelo do V+ derrubaria as features Apollo que só o Artemis tem (sendExecServerCmd em MoonBridge.java:357, sendEmptyPayload em :359), das quais o Artemis depende (o backgroundPing em Game.java:333-338 chama sendEmptyPayload). Isso define um teto rígido de portabilidade que precisa estar documentado antes de qualquer planejamento de backlog.

**Correção sugerida:** Tratar como restrição de arquitetura, não como tarefa: registrar um ADR declarando que features de protocolo do V+ estão fora de escopo enquanto o submódulo for o do ClassicOldSong. Se alguma se tornar essencial, a rota é portar o patch específico para o fork do ClassicOldSong (upstream próprio), nunca trocar o submódulo inteiro.

#### 🟡 médio handleDeleteSurroundingText emite rajada de backspaces sem paceamento e ignora afterLength

**Local:** `app/src/main/java/com/limelight/Game.java:4299` · **Categoria:** bug

Em Game.java:4304-4310 o método envia `beforeLength` pares KEY_DOWN/KEY_UP de KEYCODE_DEL num laço apertado, sem nenhum atraso — em contraste direto com o caminho de texto, que pacea a 15ms (Game.java:328). IMEs de swipe/predição corrigem palavras inteiras emitindo deleteSurroundingText com beforeLength igual ao tamanho da palavra, gerando uma rajada de 5-15 eventos no mesmo tick que o host pode descartar ou processar fora de ordem em relação ao sendUtf8Text que vem logo depois pelo mesmo caminho assíncrono. Além disso `afterLength` é completamente ignorado, mas o método retorna `true`, sinalizando ao IME que o forward-delete foi tratado — ele é silenciosamente engolido, dessincronizando o buffer do IME do estado real do host.

**Correção sugerida:** Rotear os backspaces pela MESMA fila do commitText para preservar ordem e paceamento (ex.: enfileirar um marcador de delete que o flushCommitTextQueue interpreta), e retornar false quando afterLength > 0 e não houver tratamento, para que o IME saiba que a operação não foi honrada.

#### 🟡 médio Clipboard sync do Artemis é Apollo-only e fica inerte no host Vibeshine do dono

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:929` · **Categoria:** compatibility

`sendClipboard` e `getClipboard` (NvHTTP.java:922-937) batem no endpoint HTTP `actions/clipboard`, exclusivo do Apollo — o próprio código comenta o tratamento do "200ed 404 from Sunshine" (NvHTTP.java:931), admitindo que em Sunshine a chamada não existe. Como o dono usa Vibeshine (fork do Sunshine), `checkbox_smart_clipboard_sync` não produz efeito, e o caminho `Game.handleFocusChange` (Game.java:2233) gasta uma thread por troca de foco para nada. O V+ resolveu o mesmo problema por outra via: ClipboardSyncManager.kt sobre o control packet 0x5508 do moonlight-common-c, que é protocolo e não endpoint proprietário, logo tem chance real de funcionar em forks do Sunshine.

**Correção sugerida:** Detectar suporte antes de agendar o sync (checar capability do host no NvHTTP e desligar o caminho quando ausente) para não desperdiçar threads, e sinalizar na UI que a feature exige Apollo. Se o clipboard for desejado no Vibeshine, a rota é o protocolo 0x5508 — mas ela depende do submódulo moonlight-common-c, ver o finding de divergência de submódulo.

#### 🟡 médio onCreateInputConnection não seta IME_FLAG_NO_FULLSCREEN — IME entra em extract mode em landscape

**Local:** `app/src/main/java/com/limelight/ui/StreamView.java:138` · **Categoria:** ux

Em StreamView.java:137-138 o EditorInfo recebe `TYPE_CLASS_TEXT` e apenas `IME_FLAG_NO_EXTRACT_UI`. Em telefones em landscape — o caso de uso dominante de game streaming — muitos IMEs entram em fullscreen/extract mode mesmo assim, porque NO_EXTRACT_UI suprime a UI de extração mas não impede o modo fullscreen; o flag que impede é IME_FLAG_NO_FULLSCREEN. O resultado é o teclado tomando a tela inteira, agravando exatamente a dor (1). Como commitText nasce desligado (PreferenceConfiguration.java:208), o defeito está latente e só aparece quando o dono ligar a feature que mais lhe interessa.

**Correção sugerida:** Compor os dois flags: `outAttrs.imeOptions = EditorInfo.IME_FLAG_NO_EXTRACT_UI | EditorInfo.IME_FLAG_NO_FULLSCREEN;` e considerar `outAttrs.inputType |= InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS` para evitar que a correção preditiva dispare deleteSurroundingText em rajada (ver finding relacionado).

#### ⚪ baixo setCommitTextEnabled(false) não reverte focusableInTouchMode nem libera o foco

**Local:** `app/src/main/java/com/limelight/ui/StreamView.java:36` · **Categoria:** maintainability

`setCommitTextEnabled` (StreamView.java:36-43) só age no ramo `enabled == true`: chama setFocusableInTouchMode(true) e requestFocus(). Quando a preferência é desligada em runtime, o campo `commitTextEnabled` vira false — o que faz onCheckIsTextEditor (StreamView.java:126) e onCreateInputConnection (StreamView.java:131) voltarem ao comportamento padrão — mas a view continua focável em touch mode e continua segurando o foco, estado que pode manter o IME atrelado à SurfaceView e interferir no roteamento de teclas do overlay do teclado virtual.

**Correção sugerida:** Adicionar o ramo simétrico: quando enabled for false, chamar setFocusableInTouchMode(false) e clearFocus(), e opcionalmente hideSoftInputFromWindow para garantir que o IME solte a view.

#### ⚪ baixo Gestos de 3/4/5 dedos para teclado só funcionam no modo trackpad

**Local:** `app/src/main/java/com/limelight/Game.java:3232` · **Categoria:** ux

O ramo que interpreta o tap de 3 dedos como toggleKeyboard e o de 4 como toggleFullKeyboard está sob `if (prefConfig.touchscreenTrackpad)` (Game.java:3232-3245). No modo de toque nativo/multiponto o usuário fica sem atalho de teclado. O V+ resolve isso com contagem de dedos configurável e independente do modo (PreferenceConfiguration.kt:1209 `nativeTouchFingersToToggleKeyboard`, default 3, com -1 desabilitando; consumido em TouchInputHandler.kt:1048), exposto por checkbox_enable_keyboard_toggle_in_native_touch + seekbar_keyboard_toggle_fingers_native_touch. É a única melhoria de teclado do V+ que é ao mesmo tempo pequena, útil e portável.

**Correção sugerida:** Extrair a detecção de tap multi-dedo de handleMultiTouchGesture (Game.java:~3288) para que valha também no caminho de toque nativo, com uma preferência de contagem de dedos espelhando o modelo do V+ (valor -1 = desligado).


## Ideias de melhoria

### Alternância de teclado por N dedos também no modo de toque nativo (único porte de teclado do V+ que compensa)

**Tamanho:** quick-win

**Por quê:** É a única melhoria de teclado do V+ que é simultaneamente pequena, genuinamente ausente no Artemis e alinhada ao uso do dono. Hoje o Artemis só oferece os taps de 3/4/5 dedos sob prefConfig.touchscreenTrackpad (Game.java:3232), deixando o modo multiponto sem atalho.

**Como:** Espelhar o modelo do V+ sem copiar código: adicionar preferência inteira análoga a nativeTouchFingersToToggleKeyboard (PreferenceConfiguration.kt:1209, default 3, -1 desliga) em PreferenceConfiguration.java e preferences.xml, e mover a detecção de tap multi-dedo de handleMultiTouchGesture (Game.java:~3288-3325) para valer também fora do ramo trackpad. Strings novas em res/values/strings.xml conforme a regra 6 do CLAUDE.md.

**Risco:** Baixo. Risco contido em falsos positivos de tap durante gestos de jogo multi-toque; mitigar mantendo os thresholds de tempo já usados (THREE_FINGER_TAP_THRESHOLD e afins) e permitindo -1 para desligar.

### Registrar em ADR que cherry-pick do V+ é inviável e que todo porte é reimplementação

**Tamanho:** quick-win

**Por quê:** Este é o achado mais acionável da análise e precisa virar documentação permanente, senão todo agente futuro vai repetir a tentativa. Evidência dura: apenas 7 dos 152 arquivos Java do Artemis existem com o mesmo caminho no V+ (4,6%); testei quatro commits de teclado/input do V+ (771baad5, 1686d0ac, 1389687e, 14e80d24) e todos os arquivos de lógica são .kt inexistentes aqui; o V+ é Kotlin+Compose+Firebase multi-módulo (app/build.gradle:3-4, 41-43, 241-242) contra Java puro módulo único; e os submódulos moonlight-common-c são de linhagens diferentes.

**Como:** Escrever docs/adr/NNNN-relacao-com-moonlight-vplus.md consolidando: a base comum f10085f5 (27/07/2024), os contadores de divergência 568/615, a estatística de 7/152 caminhos compartilhados, a lista dos 7 arquivos comuns, a divergência de submódulo com os dois SHAs, e a regra operacional — features do V+ entram por reimplementação manual em Java, jamais por git cherry-pick. Referenciar do CLAUDE.md e do docs/BACKLOG.md.

**Risco:** Nenhum. É documentação. O único cuidado é datar o snapshot, já que o V+ publica release a cada poucos dias e os contadores envelhecem.

### Duplo-ESC para abrir o menu e acordes ESC+dígito → F1..F12

**Tamanho:** small

**Por quê:** Duas features de teclado do V+ que o Artemis não tem, úteis com teclado físico e de custo baixo: checkbox_enable_esc_menu + list_esc_menu_key (duplo toque em 500ms abre o menu, KeyboardInputHandler.kt:322-339) e checkbox_special_key_map (ESC seguido de 1-9/0/-/= vira F1..F12, KeyboardInputHandler.kt:154-232), este último resolvendo a ausência de fileira de função em teclados compactos.

**Como:** Reimplementar em Java dentro do handleKeyDown/handleKeyUp da Game (o Artemis não tem o KeyboardInputHandler extraído; a lógica vive em Game.java, ver o caminho em Game.java:2095 e 2206). Copiar a MÁQUINA DE ESTADOS, não o código: escState 0/1/2 com um Runnable de confirmação em 200ms que emite o ESC real caso nenhuma tecla de acorde chegue (KeyboardInputHandler.kt:156-165). Adicionar as duas preferências em PreferenceConfiguration.java e preferences.xml.

**Risco:** Médio. A máquina de estados atrasa o ESC em 200ms quando o mapeamento custom está ligado — penalidade perceptível em jogos onde ESC é o menu. Manter desligado por padrão. Atenção também ao conflito com a lógica de menu já existente do Artemis (prefConfig.enableBackMenu, Game.java:3241).

### Corrigir o arranque da fila de commitText e depois construir o campo de texto dedicado (dor #2)

**Tamanho:** medium

**Por quê:** O Artemis já está à FRENTE do V+ aqui — o V+ tem zero commitText/InputConnection em toda a árvore, seu único lote é handleKeyMultiple → sendUtf8Text (KeyboardInputHandler.kt:471). Ou seja, não há nada a portar e o caminho é evoluir o que já existe. Mas a base tem um bug que quebra justamente o caso de texto longo (ver finding em Game.java:4331), então corrigir vem antes de construir.

**Como:** Primeiro corrigir o arranque do dreno em Game.java:4331 capturando `commitTextQueue.isEmpty()` antes do laço de enfileiramento. Depois adicionar os flags de EditorInfo em StreamView.java:138 (IME_FLAG_NO_FULLSCREEN e TYPE_TEXT_FLAG_NO_SUGGESTIONS). Só então construir o campo AnyDesk-like: um EditText em overlay sobre o StreamContainer, com botão enviar que chama Game.enqueueCommitText(texto) de uma vez — reaproveitando integralmente o pipeline UTF-8 → MoonBridge.sendUtf8Text (MoonBridge.java:396) → LiSendUtf8TextEvent (simplejni.c:129) que já está pronto e testado. Acionar pelo GameMenu (GameMenu.java:318, onde toggleKeyboard já está registrado) e por gesto. Estender StreamViewCommitTextTest.java com um caso de payload >512 bytes.

**Risco:** Baixo a médio. O pipeline nativo já existe e tem teste. O risco real é de foco: o EditText precisa roubar o foco do StreamView sem que o ControllerHandler passe a interpretar as teclas como input de jogo — o V+ enfrentou classe de problema semelhante e resolveu com restauração explícita de foco (commit 771baad5 'restore focus before opening local keyboard'), ideia aproveitável mesmo sem o código.

### Teclado overlay com modificadores sticky, modo mini e opacidade — avaliar contra o teclado que o Artemis já tem

**Tamanho:** medium

**Por quê:** O V+ tem KeyboardUIController.kt (629 linhas): 4 páginas (Main/Nav/Num/Mini), modificadores sticky de 3 estados (MOD_NEUTRAL/MOD_SINGLE/MOD_LOCKED, :431-435 e :502-507), slider de opacidade persistido (:117-128), handle de redimensionamento (:275-337), modo mini flutuante arrastável (:146-147) e popup de preview da tecla (:458). O Artemis já tem teclado virtual próprio e MAIOR (4.186 linhas em binding/input/virtual_controller/keyboard/, com KeyBoardController.java de 795 linhas), além de checkbox_enable_sticky_modifier_key_virtual_keyboard, seekbar_keyboard_axi_opacity e import/export de layout — que o V+ não tem. Portanto isto não é adotar o do V+, é colher ideias pontuais.

**Como:** Não portar o KeyboardUIController. Extrair apenas os conceitos ausentes e aplicá-los ao teclado existente: (a) o modo 'mini' — uma barra flutuante compacta só com modificadores, arrastável, que ocupa fração da tela em vez de cobrir o stream, ideia que dialoga diretamente com a dor #1; (b) o popup de preview da tecla ao pressionar; (c) o padrão de gesto de KeyboardGestureDetector.kt:45-53, que distingue release curto de hold (>=200ms) para dar semântica diferente a modificadores. Implementar em KeyBoardController.java e KeyBoardLayoutController.java.

**Risco:** Médio. O teclado do Artemis é grande e tem persistência de layout própria (KeyBoardControllerConfigurationLoader.java, 590 linhas) com import/export exposto ao usuário; introduzir um modo novo exige versionar o formato de configuração para não invalidar layouts salvos.

### Extrair o teclado de Game.java para uma classe própria, seguindo o exemplo estrutural do V+

**Tamanho:** medium

**Por quê:** Game.java tem 4.348 linhas e fan-out 44 (é a god-class apontada pelo CLAUDE.md). O V+ atacou exatamente isso extraindo KeyboardInputHandler.kt (495 linhas, com o comentário explícito 'extraído de Game.java'), TouchInputHandler.kt, FloatBallHandler.kt, OrientationManager.kt e outros. Como todo trabalho de teclado planejado (dores #1 e #2) vai aterrissar nessa classe, extrair antes reduz o risco de todas as mudanças seguintes.

**Como:** Criar com.limelight.binding.input.KeyboardInputHandler em Java, movendo para lá handleKeyDown/handleKeyUp/handleKeyMultiple, handleCommitText (Game.java:4290), handleDeleteSurroundingText (:4299), enqueueCommitText (:4314) e o flushCommitTextQueue (:317-331), com a Game injetada por construtor — mesma forma do V+ (`class KeyboardInputHandler(private val game: Game)`). Manter a interface StreamView.InputCallbacks (StreamView.java:159-166) intacta para não tocar na StreamView. Regerar os mapas com node tools/codemap/codemap.mjs conforme o CLAUDE.md.

**Risco:** Médio. Refatoração pura sem mudança de comportamento, mas mexe no caminho de input mais quente do app; o acoplamento a campos privados da Game (conn, prefConfig, grabbedInput, keyboardTranslator) vai exigir expor getters ou visibilidade de pacote. Fazer em commit isolado, antes das features.

### Empurrar/redimensionar o stream quando o IME abre (dor #1 do dono) — construir do zero, não há referência no V+

**Tamanho:** large

**Por quê:** É a dor número um do dono do fork e a comparação com o V+ fecha a questão de forma definitiva: o V+ NÃO tem essa feature (activity .Game sem windowSoftInputMode em AndroidManifest.xml:288, FLAG_FULLSCREEN em Game.kt:272, IMMERSIVE_STICKY em Game.kt:1291 — idêntico ao Artemis). Nenhum dos 615 commits do V+ ajuda aqui. O trabalho é original e por isso merece orçamento próprio em vez de ser tratado como porte.

**Como:** Migrar a janela da Game para o modelo de insets: aplicar WindowCompat.setDecorFitsSystemWindows(getWindow(), false) junto ao setup atual em Game.java:357-366 (o V+ faz o equivalente em Game.kt:267, útil como confirmação de que o padrão é compatível com stream em fullscreen); registrar ViewCompat.setOnApplyWindowInsetsListener sobre o StreamContainer (app/src/main/java/com/limelight/ui/StreamContainer.java) lendo insets.getInsets(WindowInsetsCompat.Type.ime()).bottom; aplicar essa altura como redução de altura do container e deixar StreamView.onMeasure (StreamView.java:62-94) recalcular a caixa pelo desiredAspectRatio já existente. Suprimir a reaplicação de IMMERSIVE_STICKY enquanto o IME estiver visível, adicionando um guard no runnable hideSystemUi (Game.java:1646-1669). Usar WindowInsetsCompat (androidx) e não WindowInsets nativo, porque Type.ime() é API 30+ e o minSdk do projeto é 21. O padrão de leitura de insets já existe no repo em ExternalDisplayControlActivity.java:171-174 e serve de modelo.

**Risco:** Alto. Mexer nos flags de janela da Game afeta notch/cutout (Game.java:447-451), multi-window (Game.java:1654), PiP e display externo — todos caminhos já frágeis. O SurfaceView do decoder pode piscar ou reconfigurar a cada mudança de tamanho, e o host pode receber resize espúrio. Mitigar atrás de preferência desligada por padrão e testar com teclado aberto conforme a Definição de Pronto do CLAUDE.md.

### EPIC — decidir explicitamente o que NÃO portar do V+ e fechar o escopo do fork

**Tamanho:** epic

**Por quê:** O dono migrou para o Artemis justamente para fugir do excesso de features do V+ (registrado no CLAUDE.md). O V+ tem hoje 157 chaves de preferência contra 133 do Artemis, com 113 exclusivas dele, incluindo módulos inteiros: framegen (Vulkan/LSFG-VK + shaders AMD FSR), EasyTier VPN, microfone, audio haptics, HDR10+, handbook offline, float ball, QR pairing, sync de configuração. Sem uma decisão escrita, cada análise futura vai reabrir a discussão de portar cada uma delas.

**Como:** Produzir um documento de escopo classificando as 113 preferências exclusivas do V+ em três baldes: (a) FORA — tudo que depende do submódulo qiin2333/moonlight-common-c (microfone, clipboard 0x5508, touchpad, HDR10+, cursor shapes) ou de módulo Gradle novo (framegen, haptics), por conflitar com as features Apollo do Artemis (sendExecServerCmd em MoonBridge.java:357, sendEmptyPayload em :359); (b) TALVEZ — melhorias de UI/QoL puramente Java-portáveis (toggle de teclado por N dedos, duplo-ESC, backup/restore de configuração); (c) JÁ TEMOS OU MELHOR — commitText (o Artemis tem, o V+ não), teclado virtual (4.186 vs 629 linhas), gestos multi-dedo, display virtual Apollo, perfis. Cruzar com a lista de chaves exclusivas de cada lado levantada nesta análise.

**Risco:** Baixo tecnicamente, mas é decisão de produto e não de engenharia: precisa do dono do fork. O risco é o documento nascer desatualizado, dado o ritmo de release do V+ (12.11.0 a 12.11.4 entre 23/07 e 14/08/2026) — mitigar datando e revisando por amostragem, não continuamente.


## Glossário

- Moonlight V+ (qiin2333/moonlight-vplus): fork chinês muito ativo do moonlight-android, ~3,3k estrelas, versão 12.11.4 (14/08/2026). Reescrito majoritariamente em Kotlin (355 arquivos .kt) com Jetpack Compose e Firebase. Derivou do upstream moonlight-stream, NÃO do Artemis.
- Artemis (ClassicOldSong/moonlight-android): fork do Moonlight que pareia com o host Apollo. Java puro, sem Kotlin, módulo Gradle único. Branch de trabalho local: dev (idêntica a moonlight-noir, commit 3397ec77).
- Base comum (merge-base): f10085f552b367cf7203007693d91c322a0a2936, 'Update to libopus v1.5.2', 27/07/2024 — ponto onde Artemis e V+ divergiram. Contadores atuais: 568 commits Artemis / 615 commits V+.
- Sobreposição de caminhos: apenas 7 dos 152 arquivos Java do Artemis existem no mesmo caminho no V+ (4,6%) — os 6 de binding/input/virtual_controller/ e nvstream/jni/MoonBridge.java. É a métrica que inviabiliza cherry-pick.
- commitText: método de InputConnection pelo qual o IME entrega uma string inteira (não tecla a tecla). O Artemis implementa em StreamView.java:142; o V+ NÃO implementa em lugar nenhum. Base da dor #2 do dono do fork.
- InputConnection / BaseInputConnection / onCheckIsTextEditor: trio de APIs Android que faz uma View não-editável ser alvo do IME. Usado em StreamView.java:126-157. Ausente no V+.
- LiSendUtf8TextEvent: função do moonlight-common-c que envia texto UTF-8 inteiro pela conexão. Alcançada por MoonBridge.sendUtf8Text (MoonBridge.java:396) → simplejni.c:129. Presente nos dois forks.
- adjustResize / windowSoftInputMode: atributo de manifesto que faria a janela encolher quando o IME abre. Ausente na activity .Game dos DOIS forks — é o bloqueio da dor #1.
- SYSTEM_UI_FLAG_IMMERSIVE_STICKY + FLAG_FULLSCREEN: combinação que faz o Android ignorar adjustResize. Artemis em Game.java:359 e Game.java:1666; V+ em Game.kt:272 e Game.kt:1291. Idênticos.
- WindowInsetsCompat.Type.ime(): API androidx (nativa em API 30+) para medir a altura do teclado virtual. É a rota correta para a dor #1 no minSdk 21. Nenhum dos dois forks usa na Game.
- setDecorFitsSystemWindows(false): pré-requisito do tratamento moderno de insets. V+ usa em Game.kt:267; Artemis só em ExternalDisplayControlActivity.java:170.
- escState (V+): máquina de estados de 3 posições (0 ocioso / 1 ESC pressionado / 2 acorde ativo) que implementa ESC+dígito → F1..F12, com Runnable de confirmação em 200ms. KeyboardInputHandler.kt:154-232.
- Sticky modifier (V+): modificador do teclado overlay com 3 estados MOD_NEUTRAL / MOD_SINGLE / MOD_LOCKED. KeyboardUIController.kt:431-435 e :502-507. O Artemis tem conceito equivalente via checkbox_enable_sticky_modifier_key_virtual_keyboard.
- Control packet 0x5508: pacote do control stream para clipboard sync, do moonlight-common-c PR #5. Usado pelo V+ (ClipboardSyncManager.kt). Indisponível no Artemis por divergência de submódulo.
- actions/clipboard: endpoint HTTP exclusivo do Apollo usado pelo clipboard sync do Artemis (NvHTTP.java:922-937). Retorna 404 em Sunshine, logo inerte no host Vibeshine do dono.
- Vibeshine: fork do Sunshine usado pelo dono do fork, com display virtual automático por cliente. Não é Apollo, portanto features Apollo-only (clipboard HTTP, server commands, virtual display) ficam inativas.
- Apollo: host que o Artemis pareia. Habilita sendExecServerCmd (MoonBridge.java:357), sendEmptyPayload (:359) e virtual display — todos ausentes no V+.
- framegen (V+): módulo Gradle próprio com pipeline Vulkan de geração de quadros (LSFG-VK) e upscaling AMD FSR. Submódulo separado, fora do alcance do Artemis.
- EasyTier (V+): VPN embutida via JNI (pacote com.easytier.jni) para streaming remoto. Exclusiva do V+.
- KeyboardAccessibilityService: serviço de acessibilidade que captura teclas globalmente. Artemis: 71 linhas em com.limelight; V+: 127 linhas em com.limelight.services, usado para dedup de eventos (KeyboardInputHandler.kt:141-147).
- handleKeyMultiple: callback de KeyEvent.ACTION_MULTIPLE que carrega uma string em event.characters. Único caminho de texto em lote do V+ (KeyboardInputHandler.kt:467-473) e também presente no Artemis (Game.java:2206). Raramente dispara em IMEs modernos.
