# Entrada de Teclado (Artemis / moonlight-noir) — do KeyEvent Android ao pacote na rede, teclados virtuais, IME/insets e injeção de texto

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (37)
6. [Ideias de melhoria](#ideias-de-melhoria) (12)
7. [Glossário](#glossário)

## Como funciona

O subsistema de teclado do Artemis tem CINCO caminhos de entrada distintos que convergem para dois primitivos de rede: `LiSendKeyboardEvent2` (tecla individual, VK do Windows) e `LiSendUtf8TextEvent` (texto UTF-8 em bloco). O caminho canônico é: KeyEvent Android -> `StreamContainer.onKeyPreIme()` (app/src/main/java/com/limelight/ui/StreamContainer.java:161) -> `Game.handleKeyDown()` (app/src/main/java/com/limelight/Game.java:2030) -> `KeyboardTranslator.translate()` (app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java:183) -> `NvConnection.sendKeyboardInput()` (NvConnection.java:537) -> JNI `simplejni.c:112` -> `LiSendKeyboardEvent2()` (moonlight-common-c/src/InputStream.c:924) -> `NV_KEYBOARD_PACKET` no canal ENet `CTRL_CHANNEL_KEYBOARD`. A tradução é um switch "poor man's mapping" Android-keycode -> VK_* do Windows, com prefixo `0x80 << 8` (KeyboardTranslator.java:27,425) e fallback por scancode Linux->VK via `KeyMapper.getWindowsKeyCode()` (KeyMapper.java:1064). Modificadores são rastreados em DOIS lugares independentes: o estado global `Game.modifierFlags` mantido por `handleSpecialKeys()` (Game.java:1893-1995) e o metaState do próprio KeyEvent, combinados em `getModifierState(KeyEvent)` (Game.java:2001-2018) — isso existe porque alguns IMEs não emitem KeyEvent real para Shift. Dead keys / composição / IME NÃO são suportados: `handleKeyDown` (Game.java:2093-2100) só envia UTF-8 quando o caractere não é um acento combinante (`KeyCharacterMap.COMBINING_ACCENT`), descartando silenciosamente ´ ` ~ ^ — crítico para teclados ABNT2/pt-BR. Texto multi-caractere de IMEs (swipe, voz, predição) chega por dois caminhos: `ACTION_MULTIPLE` -> `handleKeyMultiple()` -> `sendUtf8Text` (Game.java:2193-2208), sempre ativo; e, quando `prefConfig.enableCommitText` está ligado (default FALSE), por um `BaseInputConnection` exposto pelo `StreamContainer` (StreamContainer.java:186-202) -> `Game.handleCommitText()` (Game.java:4290) -> `enqueueCommitText()` (Game.java:4314), que já fatia o texto em blocos UTF-8 de 512 bytes e drena 1 bloco a cada 15 ms. Ou seja, a infraestrutura de "enviar texto em bloco" JÁ EXISTE e está 80% pronta — falta só a UI (campo de texto) e a correção de um bug que a torna inoperante para textos > 512 bytes. Existem DOIS teclados virtuais próprios: `KeyBoardController` (teclas especiais avulsas, arrastáveis/redimensionáveis, geradas de `assets/config/keyboard.json`) e `KeyBoardLayoutController` (teclado QWERTY completo inflado de `res/layout/layout_axixi_keyboard.xml`, 82 teclas com o keycode Android na tag XML); ambos são overlays adicionados ao FrameLayout de conteúdo (`rootView = streamContainer.getParent()`, Game.java:466) e ambos sintetizam `new KeyEvent(action, keycode)` que voltam por `Game.onKey()` (Game.java:3958) — ou seja, reentram no mesmo pipeline do teclado físico. O teclado do SISTEMA (IME) cobre o stream porque a Activity `.Game` NÃO declara `windowSoftInputMode` no AndroidManifest.xml:193-216 (o único `windowSoftInputMode` do manifesto está em `AddComputerManually`, linha 179) e porque a janela usa `FLAG_FULLSCREEN` + `FLAG_LAYOUT_IN_SCREEN` + `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` (Game.java:357-369, 1646-1669), combinação que faz o WindowManager ignorar qualquer adjustResize; existe inclusive um TODO explícito não implementado sobre migrar para `WindowInsetsController` (Game.java:1649). A boa notícia para o reflow estilo AnyDesk é que `getHolder().setFixedSize(prefConfig.width, prefConfig.height)` já é aplicado (Game.java:900), então redimensionar a View NÃO reconfigura o decoder — só muda o retângulo de composição —, e o mapeamento de toque já normaliza contra `streamContainer.getWidth()/getHeight()` (Game.java:2523-2527, 2532-2540), acompanhando o reflow automaticamente. O padrão de insets IME já está implementado em outro lugar do próprio repo (`ExternalDisplayControlActivity.java:169-176` usa `WindowCompat.setDecorFitsSystemWindows(false)` + `insets.isVisible(WindowInsetsCompat.Type.ime())`), servindo de referência direta. Há ainda um `KeyboardAccessibilityService` (AndroidManifest.xml:242-254) que intercepta teclas do sistema e as reinjeta em `Game.handleKeyDown/Up`, e um caminho evdev/root (`app/src/root/.../EvdevTranslator.java`) que entra por `Game.keyboardEvent()` (Game.java:3897).

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4348 | Activity de streaming e hub absoluto de toda a entrada de teclado. Contém o roteamento de KeyEvent, a máquina de estados de modificadores, os combos especiais, a fila de commitText/UTF-8, o toggle do IME e a configuração de janela/fullscreen que causa a sobreposição do teclado virtual. 4348 linhas. |
| [`app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java`](../../app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java) | 454 | Traduz keycode Android -> Virtual-Key do Windows com prefixo 0x80. Mantém, por deviceId, um mapa de normalização de layout para QWERTY (API 33+) usado tanto para remapear quanto para decidir a flag SS_KBE_FLAG_NON_NORMALIZED. Também expõe getModifier() usado pelas macros. |
| [`app/src/main/java/com/limelight/ui/StreamContainer.java`](../../app/src/main/java/com/limelight/ui/StreamContainer.java) | 273 | Container do SurfaceView (2D/GL 3D) e ponto de entrada real do teclado na View: intercepta onKeyPreIme antes do IME e expõe o InputConnection que habilita commitText. O onMeasure implementa o letterbox por aspect ratio — é ele que reflowaria o vídeo se a janela encolhesse. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java) | 379 | Teclado QWERTY virtual COMPLETO do fork. Overlay LinearLayout inflado de layout_axixi_keyboard.xml, ancorado em Gravity.BOTTOM sobre o stream. Implementa modificadores sticky por long-press e um popup de preview de tecla. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java) | 795 | Overlay de teclas especiais avulsas, arrastáveis/redimensionáveis, com modos de configuração (mover/redimensionar/habilitar) e diálogo de adição de teclas a partir de assets/config/keyboard.json. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java) | 590 | Fábrica de elementos do KeyBoardController e persistência do perfil de layout. Define como cada tipo de botão (comum, sticky, custom multi-tecla, touchpad, dpad, analógico) converte toque em evento de teclado. |
| [`app/src/main/AndroidManifest.xml`](../../app/src/main/AndroidManifest.xml) | 268 | Declaração da Activity .Game — é aqui que a AUSÊNCIA de android:windowSoftInputMode causa a sobreposição do teclado virtual. Também registra o KeyboardAccessibilityService. |
| [`app/src/main/java/com/limelight/utils/KeyMapper.java`](../../app/src/main/java/com/limelight/utils/KeyMapper.java) | 1076 | Duas tabelas grandes: constantes KEY_* do Linux (input-event-codes.h) e VK_* do Windows, mais o mapa estático linuxToWindowsKeyMap usado no fallback por scancode do KeyboardTranslator. Também é usado por reflexão para resolver nomes 'VK_*' em atalhos custom. |
| [`app/src/main/res/layout/layout_axixi_keyboard.xml`](../../app/src/main/res/layout/layout_axixi_keyboard.xml) | 874 | Layout XML do teclado virtual completo: 82 TextViews em linhas LinearLayout, cada uma com android:tag = keycode Android em string e android:text = rótulo. É a definição de teclado hardcoded (layout US-ish, sem localização). |
| [`app/src/main/java/com/limelight/nvstream/NvConnection.java`](../../app/src/main/java/com/limelight/nvstream/NvConnection.java) | 625 | Fachada Java sobre o MoonBridge. Ponto onde as chamadas de teclado viram JNI. |
| [`app/src/main/jni/moonlight-core/simplejni.c`](../../app/src/main/jni/moonlight-core/simplejni.c) | 200 | Ponte JNI. Converte a String Java para UTF-8 nativo e chama as funções Li* do moonlight-common-c. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c) | 1200 | Implementação do protocolo de entrada: montagem, enfileiramento, criptografia e envio dos pacotes de teclado e de texto UTF-8. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h) | 200 | Structs do wire protocol de entrada. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyBoardVirtualControllerElement.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyBoardVirtualControllerElement.java) | 438 | Classe base de todos os elementos do KeyBoardController: modos mover/redimensionar/habilitar, desenho, serialização JSON de posição/tamanho para SharedPreferences. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardDigitalButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardDigitalButton.java) | 266 | Botão digital do overlay de teclas especiais: click/long-click/release, propagação de toque entre botões da mesma camada, modo sticky e modo switch (toggle). |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyAnalogStickFree.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyAnalogStickFree.java) | 419 | Analógico virtual 'livre' (origem no ponto de toque) que alimenta o mapeamento stick->teclas WASD. É a fonte do fluxo de eventos de movimento. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButtonFree.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButtonFree.java) | 154 | Converte o vetor do analógico em 4 teclas direcionais + 1 tecla de duplo-clique usando setores de pi/8. É onde nasce o flood de pacotes de teclado. |
| [`app/src/main/java/com/limelight/KeyboardAccessibilityService.java`](../../app/src/main/java/com/limelight/KeyboardAccessibilityService.java) | 71 | AccessibilityService que intercepta teclas do sistema (para permitir atalhos como Home/Alt+Tab chegarem ao host) e as reinjeta em Game.handleKeyDown/Up. |
| [`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`](../../app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java) | 567 | Activity de controle na tela secundária. IMPORTANTE: é o ÚNICO lugar do repo que já usa a API moderna de WindowInsets, incluindo WindowInsetsCompat.Type.ime() — serve de blueprint direto para o reflow do Game. |
| [`app/src/main/java/com/limelight/ui/ExternalControllerView.java`](../../app/src/main/java/com/limelight/ui/ExternalControllerView.java) | 93 | FrameLayout raiz da Activity de tela externa; duplica a lógica de onKeyPreIme + InputConnection do StreamContainer. |
| [`app/src/main/java/com/limelight/ui/StreamView.java`](../../app/src/main/java/com/limelight/ui/StreamView.java) | 167 | CÓDIGO MORTO. SurfaceView legado do upstream Moonlight, substituído por StreamContainer; não é referenciado por nenhum layout nem por nenhuma classe Java. Contém uma TERCEIRA cópia da lógica de InputConnection/commitText. |
| [`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 1076 | Todas as preferências de teclado: forceQwerty, backAsMeta, ignoreSynthEvents, enableCommitText, stickyModifierKey, enableKeyboard, dimensões/alinhamento/opacidade do teclado on-screen. |
| [`app/src/main/java/com/limelight/GameMenu.java`](../../app/src/main/java/com/limelight/GameMenu.java) | 400 | Menu do jogo: macros de teclado (Esc, Alt+F4, Ctrl+V, Win+D, Ctrl+Shift+Esc...), toggle do IME e dos dois teclados virtuais. |
| [`app/src/main/res/layout/activity_game.xml`](../../app/src/main/res/layout/activity_game.xml) | 120 | Layout <merge> da Activity: os filhos são adicionados DIRETAMENTE ao FrameLayout de conteúdo do Android, o que faz de rootView (Game.java:466) um FrameLayout onde stream e todos os overlays são irmãos. Fundamental para o desenho do reflow. |
| [`app/src/main/res/values/styles.xml`](../../app/src/main/res/values/styles.xml) | 75 | StreamTheme/StreamBaseTheme usados pela Activity .Game — sem windowTranslucentStatus/Navigation, fundo transparente (preto em v24+). |
| [`app/src/main/res/xml/preferences.xml`](../../app/src/main/res/xml/preferences.xml) | 800 | UI das preferências de teclado. |
| [`app/src/root/java/com.limelight/binding/input/evdev/EvdevTranslator.java`](../../app/src/root/java/com.limelight/binding/input/evdev/EvdevTranslator.java) | 200 | Tradução evdev(Linux) -> keycode Android para o caminho de captura root. Só compilado no flavor ROOT_BUILD. |
| [`app/src/main/java/com/limelight/binding/input/evdev/EvdevCaptureProviderShim.java`](../../app/src/main/java/com/limelight/binding/input/evdev/EvdevCaptureProviderShim.java) | 24 | Carrega o EvdevCaptureProvider por reflexão só em builds root. |
| [`app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java) | 170 | Captura de ponteiro nativa. Relevante para teclado porque requestPointerCapture() exige foco da View e compete com o foco de um futuro EditText de injeção de texto. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/Game.java`**
- `campo modifierFlags :201`
- `campos waitingForAllModifiersUp/specialKeyCode :207-208`
- `UTF8_CHUNK_SIZE=512 / commitTextQueue / commitTextHandler :312-315`
- `flushCommitTextQueue (drena 1 bloco/15ms) :317-331`
- `onCreate: FLAG_FULLSCREEN + SYSTEM_UI_FLAG_LAYOUT_* :357-367`
- `FLAG_LAYOUT_IN_SCREEN :369`
- `layoutInDisplayCutoutMode :439-453`
- `streamContainer.setInputCallbacks/setCommitTextEnabled :459-464`
- `rootView = streamContainer.getParent() :466`
- `getHolder().setFixedSize(prefConfig.width, height) :900`
- `initKeyboardController() se prefConfig.enableKeyboard :848-850`
- `initKeyboardController() :1091-1095`
- `initkeyBoardLayoutController() :1107-1111`
- `toggleKeyboardController() :1114-1120`
- `toggleFullKeyboard() :1122-1132`
- `onConfigurationChanged -> refreshLayout dos teclados :1187-1205`
- `setMetaKeyCaptureState() (Samsung) :1348-1370`
- `onWindowFocusChanged -> modifierFlags = 0 :1402-1413`
- `hideSystemUi Runnable + TODO WindowInsetsController :1645-1669`
- `hideSystemUi(int delay) :1671-1677`
- `onMultiWindowModeChanged :1679-1699`
- `onStop -> keyBoardController.hide()/keyBoardLayoutController.hide() :1770-1775`
- `setInputGrabState()/toggleGrab :1864-1890`
- `handleSpecialKeys() :1893-1995`
- `getModifierState(KeyEvent) :2001-2018`
- `getModifierState() :2020-2022`
- `onKeyDown :2025-2027`
- `handleKeyDown :2030-2113`
- `onKeyUp :2115-2118`
- `handleKeyUp :2120-2186`
- `onKeyMultiple :2188-2191`
- `handleKeyMultiple -> sendUtf8Text :2193-2208`
- `sendKeys(short[]) :2210-2231`
- `toggleKeyboard() -> toggleSoftInput :2401-2410`
- `getStreamViewNormalizedXY (normaliza contra streamContainer) :2503-2530`
- `getNormalizedCoordinates :2532-2540`
- `tap 3 dedos -> toggleKeyboard :3237 e :3318`
- `tap 4 dedos -> toggleFullKeyboard :3240 e :3314`
- `keyboardEvent(boolean, short) (evdev/root) :3886-3912`
- `onSystemUiVisibilityChange -> hideSystemUi(2000) :3914-3928`
- `onKey(View,int,KeyEvent) :3958-3970`
- `surfaceChanged :3779-3793`
- `handleCommitText :4289-4296`
- `handleDeleteSurroundingText :4298-4312`
- `enqueueCommitText :4314-4334`

**`app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java`**
- `KEY_PREFIX = 0x80 :27`
- `constantes VK_* usadas pelas macros do GameMenu :29-92`
- `getModifier(short) :94-107`
- `classe interna KeyboardMapping :111-145`
- `KeyboardMapping(InputDevice) usa getKeyCodeForKeyLocation :115-131`
- `construtor: só popula mapas em API >= 33 :149-159`
- `hasNormalizedMapping(keycode, deviceId) :161-175`
- `translate(keycode, scancode, deviceId) :183-426`
- `remap forceQwerty :188-198`
- `faixas 0-9/A-Z/NUMPAD/F1-F12 :203-218`
- `switch principal :220-409`
- `fallback por scancode + descarte se normalizado :412-423`
- `onInputDeviceAdded/Removed/Changed :428-453`

**`app/src/main/java/com/limelight/ui/StreamContainer.java`**
- `interface InputCallbacks (handleKeyUp/Down/CommitText/DeleteSurroundingText/FocusChange) :28-34`
- `campo commitTextEnabled :51`
- `construtor: setFocusable + setFocusableInTouchMode :58-63`
- `onMeasure (letterbox por desiredAspectRatio/fillDisplay) :113-150`
- `setCommitTextEnabled :156-158`
- `onKeyPreIme -> handleKeyDown/handleKeyUp :160-170`
- `onWindowFocusChanged -> handleFocusChange :172-178`
- `onCheckIsTextEditor :180-183`
- `onCreateInputConnection (BaseInputConnection dummy) :185-202`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java`**
- `MODIFIER_KEY_CODES / SPECIAL_KEY_CODES :38-39, 54-80`
- `longClickRunnables (HashMap ESTÁTICO) :82`
- `modifierKeyStates (BitSet) :84`
- `isModifierKeyPressed :86-88`
- `construtor: infla R.layout.layout_axixi_keyboard :102-110`
- `initKeyboard() OnTouchListener por tecla :120-259`
- `parse do android:tag como keycode :132, 248`
- `sticky modifier: clear no DOWN :138-141 / skip UP :189-191`
- `initKeyPopup :261-277`
- `isKeyboardVisible :279-281`
- `hide(boolean)/show/toggleVisibility :283-319`
- `refreshLayout (Gravity.BOTTOM, altura 50% ou prefConfig) :321-357`
- `sendKeyEvent -> Game.instance.onKey :364-374`
- `interface ViewCallbacks :376-378`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java`**
- `enum ControllerMode :52-57`
- `campo shown :59`
- `construtor + buttonConfigure/ClearAll/AddKeys :80-224`
- `hide(boolean)/hide()/show()/toggleVisibility :230-279`
- `removeElements :281-290`
- `addElement (FrameLayout.LayoutParams com margins) :298-304`
- `refreshLayout (recria tudo) :316-360`
- `sendKeyEvent -> Game.instance.onKey / mouseButtonEvent :366-380`
- `vibrate :389-406`
- `showKeySelectionDialog (lê keyboard.json + atalhos custom) :414-701`
- `findNonOverlappingPosition :703-790`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java`**
- `MODIFIER_KEY_CODES / isModifierKey :42-57`
- `screenScale/screenScaleSwitch (grade 128x72) :59-66`
- `createDiaitalPadButton (emite UP de todas as direções inativas) :68-112`
- `createKeyBoardAnalogStickButton :115-129`
- `createKeyBoardAnalogStickButton2 (Free) :131-145`
- `createDigitalButton (com suporte a sticky) :147-217`
- `createCustomButton (chama conn.sendKeyboardInput com VK cru) :219-305`
- `createDigitalTouchButton :308-349`
- `createDefaultLayout (lê assets/config/keyboard.json) :351-550`
- `saveProfile :552-567`
- `loadFromPreferences :569-589`

**`app/src/main/AndroidManifest.xml`**
- `windowSoftInputMode="stateVisible" (único do app, em AddComputerManually) :179`
- `activity .Game (SEM windowSoftInputMode) :193-216`
- `configChanges do .Game inclui screenSize|screenLayout :195`
- `theme StreamTheme / launchMode singleTask / noHistory :196-202`
- `service KeyboardAccessibilityService :242-254`

**`app/src/main/java/com/limelight/utils/KeyMapper.java`**
- `KEY_* Linux :7-744`
- `KEY_CNT :744`
- `VK_* Windows :750-937`
- `linuxToWindowsKeyMap + bloco static :938-1062`
- `getWindowsKeyCode(int) :1064-1069`
- `setKeyMapping(int,int) (API morta, nunca chamada) :1071-1075`

**`app/src/main/res/layout/layout_axixi_keyboard.xml`**
- `altura fixa 200dp + fundo #212121 :4-6`
- `tag="111" ESC :22`
- `tag="131..142" F1..F12 :31+`
- `Shift tag="59" :612`
- `Ctrl tag="113" :749`
- `Win tag="117" :759`
- `Alt tag="57" :769`
- `tag="hide" (fecha o teclado) :731`
- `teclas Alt/Ctrl direitos comentados :791-802`

**`app/src/main/java/com/limelight/nvstream/NvConnection.java`**
- `sendKeyboardInput(short,byte,byte,byte) :537-541`
- `sendUtf8Text(String) :619-623`

**`app/src/main/jni/moonlight-core/simplejni.c`**
- `Java_..._sendKeyboardInput -> LiSendKeyboardEvent2 :111-114`
- `Java_..._sendUtf8Text -> LiSendUtf8TextEvent (GetStringUTFChars + strlen) :126-131`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c`**
- `MAX_INPUT_PACKET_SIZE = 128 :43`
- `MAX_QUEUED_INPUT_PACKETS = 150 :46`
- `PAYLOAD_SIZE/PACKET_SIZE :48-49`
- `encryptedControlStream = APP_VERSION_AT_LEAST(7,1,431) :105`
- `encryptData (buffer de pilha de 128 bytes no caminho legado) :160-193`
- `allocatePacketHolder(extraLength) :204-232`
- `sendInputPacket :235-300`
- `inputSendThreadProc :323`
- `LiSendKeyboardEvent2 :924-999`
- `LiSendUtf8TextEvent :1005-1034`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h`**
- `KEY_DOWN_EVENT_MAGIC 0x03 / KEY_UP_EVENT_MAGIC 0x04 :22-23`
- `NV_KEYBOARD_PACKET (flags/keyCode/modifiers) :24-30`
- `UTF8_TEXT_EVENT_MAGIC 0x17 :32`
- `UTF8_TEXT_EVENT_MAX_COUNT 32 :33`
- `NV_UNICODE_PACKET :34-37`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyBoardVirtualControllerElement.java`**
- `moveElement (com snapping) :83-124`
- `resizeElement :126-136`
- `checkAndApplyResize :138-162`
- `onDraw/onElementDraw :164-179`
- `showConfigurationDialog :242-291`
- `onTouchEvent (roteia para modo config ou onElementTouchEvent) :293-359`
- `setOpacity :379-385`
- `getConfiguration (LEFT/TOP/WIDTH/HEIGHT/ENABLED/HIDDEN) :396-408`
- `loadConfiguration (força VISIBLE/GONE) :410-427`
- `actionDisableEnableButton :429-436`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardDigitalButton.java`**
- `interface DigitalButtonListener :30-46`
- `checkMovement (slide entre botões) :71-112`
- `onElementDraw (oval ou quadrado por prefConfig.enableKeyboardSquare) :149-183`
- `onClickCallback/onLongClickCallback/onReleaseCallback :185-213`
- `setEnableSwitchDown (elementos key_s_/m_s_) :215-221`
- `onElementTouchEvent :223-265`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyAnalogStickFree.java`**
- `constantes de raio/deadzone/timeouts :24-41`
- `interface AnalogStickListener :46-71`
- `notifyOnMovement/notifyOnClick/notifyOnDoubleClick/notifyOnRevoke :191-221`
- `onSizeChanged (recalcula raios) :223-231`
- `onElementDraw :234-298`
- `updatePosition -> notifyOnMovement em todo move ativo :301-325`
- `onElementTouchEvent (chama updatePosition em ACTION_MOVE e no fim) :327-418`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButtonFree.java`**
- `MIN_CIRCLE_R (deadzone em unidades de stick) :8`
- `setores EIGHTH_PI / EIGHTH_THREE_PI :9-12`
- `stickSender (5 keycodes) :16`
- `onMovement -> setores -> 4x listener.onkeyEvent SEM diff de estado :34-121`
- `onDoubleClick -> tecla do meio :129-131`
- `onRevoke -> solta as 5 teclas :134-147`

**`app/src/main/java/com/limelight/KeyboardAccessibilityService.java`**
- `BLACKLIST_KEYS (volume/power) :15-19`
- `onKeyEvent :22-49`
- `hack scanCode==1 -> ESCAPE :31-34, 39-42`
- `onServiceConnected (FLAG_REQUEST_FILTER_KEY_EVENTS) :52-61`

**`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`**
- `WindowInsetsControllerCompat + hide(systemBars) :160-167`
- `setDecorFitsSystemWindows(false) + setOnApplyWindowInsetsListener com Type.ime() :169-176`
- `updateKeyboardVisibility :242-255`
- `onKey/onKeyDown/onKeyUp/onKeyMultiple -> Game.instance :332-384`
- `rootLayout.setCommitTextEnabled :398`
- `_toggleKeyboard (toggleSoftInput) :448-452`
- `initFullKeyboard / _toggleFullKeyboard :454-470`

**`app/src/main/java/com/limelight/ui/ExternalControllerView.java`**
- `setCommitTextEnabled (faz requestFocus) :20-27`
- `onKeyPreIme :33-51`
- `onCheckIsTextEditor :53-56`
- `onCreateInputConnection :58-85`
- `interface InputCallbacks :87-92`

**`app/src/main/java/com/limelight/ui/StreamView.java`**
- `setCommitTextEnabled :36-43`
- `onMeasure (letterbox) :61-94`
- `onKeyPreIme :96-114`
- `onCheckIsTextEditor :125-128`
- `onCreateInputConnection :130-157`
- `interface InputCallbacks (com isOnExternalDisplay) :159-166`

**`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`**
- `LIST_ONSCREEN_KEYBOARD_ALIGN_MODE :101`
- `CHECKBOX_FORCE_QWERTY / CHECKBOX_BACK_AS_META :104-105`
- `CHECKBOX_IGNORE_SYNTH_EVENTS :106`
- `CHECKBOX_ENABLE_STICKY_MODIFIER_KEY_VIRTUAL_KEYBOARD :112`
- `CHECKBOX_ENABLE_KEYBOARD :123`
- `CHECKBOX_ENABLE_KEYBOARD_VIBRATE :126`
- `CHECKBOX_ENABLE_COMMIT_TEXT :139`
- `DEFAULT_FORCE_QWERTY = true :194`
- `DEFAULT_IGNORE_SYNTH_EVENTS = false :196`
- `DEFAULT_ENABLE_COMMIT_TEXT = false :208`
- `campos onscreenKeyboard* :242-246`
- `campos forceQwerty/backAsMeta/ignoreSynthEvents :255-257`
- `campo stickyModifierKey :262`
- `campo enableCommitText + comentário :336-337`
- `leitura das prefs :947-1014`

**`app/src/main/java/com/limelight/GameMenu.java`**
- `KEY_UP_DELAY = 25 :35`
- `sendKeys(short[]) -> game.sendKeys :78-79`
- `macros com VK_* crus :160-199`
- `atalhos custom por reflexão em KeyMapper :222-231`
- `toggle Special keys :253`
- `toggle On-screen full keyboard :257`
- `Task Manager (Ctrl+Shift+Esc) :258`
- `Show soft keyboard -> game::toggleKeyboard :317-318`

**`app/src/main/res/layout/activity_game.xml`**
- `<merge> raiz`
- `backgroundTouchView (match_parent)`
- `com.limelight.ui.StreamContainer com focusable/focusedByDefault/<requestFocus/>`
- `notificationOverlay`
- `performanceOverlay`
- `floatingMenuButton`
- `overlayToggleZoomButton`

**`app/src/main/res/values/styles.xml`**
- `StreamBaseTheme :28-31`
- `StreamTheme :34-50`
- `override v24 (fundo preto) em res/values-v24/styles.xml`

**`app/src/main/res/xml/preferences.xml`**
- `checkbox_force_qwerty :455`
- `checkbox_back_as_meta :461`
- `checkbox_ignore_synth_events :473`
- `checkbox_enable_commit_text :479-481`
- `seekbar_keyboard_axi_opacity :559`
- `onscreen_keyboard_autofit :569`
- `seekbar_onscreen_keyboard_height :576`
- `seekbar_onscreen_keyboard_width :589`
- `list_onscreen_keyboard_align_mode :599`
- `checkbox_enable_sticky_modifier_key_virtual_keyboard :604`
- `checkbox_enable_keyboard :746`
- `checkbox_vibrate_keyboard :760`
- `keyboard_axi_list :770`
- `checkbox_enable_keyboard_square :778`

**`app/src/root/java/com.limelight/binding/input/evdev/EvdevTranslator.java`**
- `EVDEV_KEY_CODES (tabela) :7+`
- `translateEvdevKeyCode()`

**`app/src/main/java/com/limelight/binding/input/evdev/EvdevCaptureProviderShim.java`**
- `isCaptureProviderSupported (BuildConfig.ROOT_BUILD) :8-10`
- `createEvdevCaptureProvider :13-22`

**`app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java`**
- `showCursor -> releasePointerCapture :64-73`
- `hideCursor -> requestPointerCapture :75-86`
- `onWindowFocusChanged (recaptura com delay de 500ms) :88-110`

</details>

## Fluxo

## A) TECLA FÍSICA (caminho canônico)
1. `ViewRootImpl` entrega o KeyEvent à View focada. O `StreamContainer` é focável e `focusedByDefault` (res/layout/activity_game.xml, bloco `<com.limelight.ui.StreamContainer>` com `<requestFocus/>`), então recebe **antes do IME**: `StreamContainer.onKeyPreIme()` (ui/StreamContainer.java:161-170).
2. `onKeyPreIme` chama `mInputCallbacks.handleKeyDown(event)` -> `Game.handleKeyDown()` (Game.java:2030). Se retornar true, o evento morre aqui (nunca chega ao IME).
3. Se não consumido, o IME processa; se o IME não consumir, o evento desce pela árvore -> `OnKeyListener` registrado em Game.java:462 -> `Game.onKey()` (Game.java:3958-3970) -> `handleKeyDown/handleKeyUp/handleKeyMultiple`. Último fallback: `Activity.onKeyDown` (Game.java:2025-2027).
4. Dentro de `handleKeyDown` (Game.java:2030-2113), em ordem:
   - 2032: descarta `FLAG_VIRTUAL_HARD_KEY` (navegação virtual).
   - 2036-2039: se `prefConfig.ignoreSynthEvents` e `deviceId <= 0`, descarta (mata todo evento sintético).
   - 2044-2059: `KEYCODE_BACK` vindo de `SOURCE_MOUSE`/`SOURCE_MOUSE_RELATIVE` vira botão direito do mouse.
   - 2063-2067: se `ControllerHandler.isGameControllerDevice(event.getDevice())` (ControllerHandler.java:332), tenta primeiro `controllerHandler.handleButtonDown(event)`.
   - 2072: `handleSpecialKeys(keyCode, true)` (Game.java:1893) — atualiza `modifierFlags` (1917-1922) e implementa os combos locais Ctrl+Alt+Shift+Z/Q/C (1974-1991).
   - 2077-2079: se `!grabbedInput`, devolve o evento ao sistema.
   - 2083: `keyboardTranslator.translate(keyCode, scanCode, deviceId)`.
   - 2084-2101: se traduziu para 0 -> `backAsMeta` (0x5B) ou fallback UTF-8 `conn.sendUtf8Text(""+(char)unicodeChar)` quando o char não é acento combinante.
   - 2104-2106: descarta auto-repeat (`getRepeatCount() > 0`).
   - 2108-2109: `conn.sendKeyboardInput(translated, KeyboardPacket.KEY_DOWN, getModifierState(event), hasNormalizedMapping? 0 : SS_KBE_FLAG_NON_NORMALIZED)`.
5. `KeyboardTranslator.translate` (KeyboardTranslator.java:183-426):
   - 188-198: se `prefConfig.forceQwerty` (default true) e `deviceId >= 0`, remapeia o keycode do layout do device para a POSIÇÃO QWERTY usando `InputDevice.getKeyCodeForKeyLocation()` — só existe em API 33+ (TIRAMISU), ver 151-158.
   - 203-218: faixas contíguas 0-9 -> VK_0.., A-Z -> VK_A.., NUMPAD_0-9 -> VK_NUMPAD0.., F1-F12 -> VK_F1..
   - 220-409: switch para pontuação, modificadores L/R (0xA0..0xA5, 0x5B/0x5C), setas, Home/End/PgUp/PgDn, teclado numérico.
   - 412-423: se nada casou -> se `hasNormalizedMapping()` (161-175) devolve 0 (**descarta a tecla**); senão `KeyMapper.getWindowsKeyCode(scanCode)` (KeyMapper.java:1064) traduz o scancode evdev Linux -> VK (tabela estática KeyMapper.java:938-1062).
   - 425: `return (short)((KEY_PREFIX << 8) | translated)` com `KEY_PREFIX = 0x80` (linha 27).
6. `NvConnection.sendKeyboardInput` (nvstream/NvConnection.java:537-541) -> `MoonBridge.sendKeyboardInput` (nvstream/jni/MoonBridge.java:390, native) -> `Java_com_limelight_nvstream_jni_MoonBridge_sendKeyboardInput` (jni/moonlight-core/simplejni.c:111-114) -> `LiSendKeyboardEvent2(keyCode, keyAction, modifiers, flags)`.
7. `LiSendKeyboardEvent2` (moonlight-common-c/src/InputStream.c:924-999): aplica fixups de modificador só para GFE (945-982, pulado quando `IS_SUNSHINE()`), monta `NV_KEYBOARD_PACKET` (Input.h:22-30) com `header.magic = 0x03` (down) / `0x04` (up), `flags` (extensão Sunshine, zerada em GFE), `keyCode` LE16, `modifiers`; canal `CTRL_CHANNEL_KEYBOARD`, `ENET_PACKET_FLAG_RELIABLE` (937-938).
8. `inputSendThreadProc` (InputStream.c:323) desenfileira -> `sendInputPacket` (InputStream.c:235). Como Apollo/Sunshine reporta >= 7.1.431, `encryptedControlStream == true` (InputStream.c:105) e o pacote vai por `sendInputPacketOnControlStream` (ControlStream.c:1660) sobre ENet criptografado. No caminho legado (GFE < 3.22) usa `encryptData` com buffer de pilha `MAX_INPUT_PACKET_SIZE = 128` (InputStream.c:43, 160-193).

## B) TECLADO DO SISTEMA (IME) — texto em bloco
1. `Game.toggleKeyboard()` (Game.java:2401-2410) chama `InputMethodManager.toggleSoftInput(0, 0)`. Gatilhos: menu do jogo (GameMenu.java:317-318), tap de 3 dedos (Game.java:3237 e 3318).
2. Teclas "duras" do IME viram KeyEvent e seguem o caminho (A).
3. Texto multi-caractere sem keycode vem como `ACTION_MULTIPLE` -> `handleKeyMultiple()` (Game.java:2193-2208) -> `conn.sendUtf8Text(event.getCharacters())` (2206). **Esse caminho funciona mesmo com `enableCommitText` desligado**, porque o `BaseInputConnection` em "dummy mode" do Android sintetiza ACTION_MULTIPLE.
4. Com `prefConfig.enableCommitText = true` (aplicado em Game.java:464 via `streamContainer.setCommitTextEnabled`), `StreamContainer.onCheckIsTextEditor()` passa a devolver true (StreamContainer.java:180-183) e `onCreateInputConnection()` (186-202) devolve um `BaseInputConnection(this, false)` com `commitText`/`deleteSurroundingText` sobrescritos.
5. `commitText` -> `Game.handleCommitText()` (Game.java:4289-4296) -> `enqueueCommitText()` (4314-4334): converte para UTF-8, fatia em blocos de `UTF8_CHUNK_SIZE = 512` bytes (Game.java:313) respeitando fronteira de code point (4322-4325), enfileira em `commitTextQueue` (ArrayDeque, linha 314) e agenda `flushCommitTextQueue` (317-331) que envia 1 bloco a cada 15 ms.
6. `conn.sendUtf8Text` (NvConnection.java:619-623) -> `MoonBridge.sendUtf8Text` (MoonBridge.java:396) -> `simplejni.c:126-131` (`GetStringUTFChars` + `strlen`) -> `LiSendUtf8TextEvent(text, length)` (InputStream.c:1005-1034) -> `NV_UNICODE_PACKET` (Input.h:32-37) com `magic = UTF8_TEXT_EVENT_MAGIC (0x17)`, canal `CTRL_CHANNEL_UTF8`, RELIABLE. O holder é alocado com `malloc(sizeof(*holder) + length)` (InputStream.c:210-216), portanto textos maiores que os 32 bytes do struct declarado funcionam no caminho ENet.
7. `deleteSurroundingText` -> `Game.handleDeleteSurroundingText()` (Game.java:4298-4312): emite N pares KEY_DOWN/KEY_UP de VK_BACK, em loop apertado, com `modifier = 0`.

## C) TECLADO VIRTUAL PRÓPRIO — completo (`KeyBoardLayoutController`)
1. `Game.toggleFullKeyboard()` (Game.java:1122-1132) -> `initkeyBoardLayoutController()` (1107-1111) -> `new KeyBoardLayoutController((FrameLayout)rootView, this, prefConfig)`.
2. Construtor infla `R.layout.layout_axixi_keyboard` (KeyBoardLayoutController.java:106) — 82 TextViews cujo `android:tag` é o **keycode Android** em string (ex.: tag "111" = KEYCODE_ESCAPE, "131" = KEYCODE_F1, "29" = KEYCODE_A) e uma tag especial `"hide"` (layout_axixi_keyboard.xml:731).
3. `initKeyboard()` (120-259) instala um `OnTouchListener` por tecla: `Integer.parseInt(tag)` -> `new KeyEvent(keyAction, keyCode)` -> `setSource(0)` -> `sendKeyEvent()` (364-374) -> `Game.instance.onKey(null, keyCode, keyEvent)` -> reentra no caminho (A) a partir do passo 4.
4. Modificadores "sticky": long-press de 300 ms marca `modifierKeyStates` (82, 208-216, 249-256); enquanto sticky, o ACTION_UP não envia KEY_UP (189-191) e o próximo ACTION_DOWN só limpa o estado (138-141).
5. `refreshLayout()` (321-357) posiciona o teclado com `Gravity.BOTTOM` + alinhamento configurável, altura = 50% da tela ou `prefConfig.onscreenKeyboardHeight`. **É um overlay: sobrepõe o vídeo, não empurra.**

## D) TECLADO VIRTUAL PRÓPRIO — teclas especiais (`KeyBoardController`)
1. `Game.toggleKeyboardController()` (Game.java:1114-1120) / auto-init se `prefConfig.enableKeyboard` (Game.java:848-850).
2. `refreshLayout()` (KeyBoardController.java:316-360) -> `KeyBoardControllerConfigurationLoader.createDefaultLayout()` (loader:351-550) lê `assets/config/keyboard.json` (arrays `keystroke`, `mouse`, `rocker`, `dpad`) + atalhos custom do usuário (GameMenu.PREF_NAME) e cria elementos.
3. Botão comum: `createDigitalButton` (loader:147-217) -> listener onClick/onRelease -> `controller.sendKeyEvent(new KeyEvent(...))` (KeyBoardController.java:366-380) -> `Game.instance.onKey(...)` (ou `Game.instance.mouseButtonEvent` se `source == 1`).
4. Botão custom multi-tecla: `createCustomButton` (loader:219-305) chama **`conn.sendKeyboardInput()` DIRETO** com VKs crus (sem o prefixo 0x80), acumulando modificador via `KeyboardTranslator.getModifier()` (KeyboardTranslator.java:94-107).
5. Analógico -> teclas: `KeyBoardAnalogStickButtonFree` (arquivo homônimo:32-148) converte o vetor do stick em 4 booleanos de direção e chama `listener.onkeyEvent(code, bool)` para as 4 direções **a cada evento de movimento** (linhas 118-120), disparado por `keyAnalogStickFree.updatePosition()` (keyAnalogStickFree.java:301-325) em todo `ACTION_MOVE` (382-392).
6. D-Pad: `createDiaitalPadButton` (loader:68-112) emite DOWN/UP para as 4 direções a cada `onDirectionChange`.

## E) CAMINHOS AUXILIARES
- **AccessibilityService**: `KeyboardAccessibilityService.onKeyEvent()` (KeyboardAccessibilityService.java:22-49) intercepta tudo (menos volume/power) e chama `Game.instance.handleKeyDown/handleKeyUp`; hack: `scanCode == 1` é forçado para KEYCODE_ESCAPE (31-34, 39-42). Registrado em AndroidManifest.xml:242-254 + res/xml/keyboard_accessibility_service.xml.
- **evdev/root**: `EvdevCaptureProvider` (app/src/root/java/com.limelight/binding/input/evdev/EvdevCaptureProvider.java:186-188) traduz evdev->Android via `EvdevTranslator.translateEvdevKeyCode()` e chama `Game.keyboardEvent(down, keyCode)` (Game.java:3886-3912), que usa `translate(keyCode, 0, -1)` e `getModifierState()` (sem KeyEvent).
- **GameMenu / macros**: `GameMenu.sendKeys()` (GameMenu.java:78-79) -> `Game.sendKeys(short[])` (Game.java:2210-2231) envia todos os DOWN, acumula modificadores e agenda os UP em ordem inversa após `GameMenu.KEY_UP_DELAY = 25` ms.
- **Tela externa**: `ExternalDisplayControlActivity` replica todo o roteamento (onKey/onKeyDown/onKeyUp/onKeyMultiple -> `Game.instance.*`, linhas 333-384) e hospeda seu próprio `KeyBoardLayoutController` (454-470) e `ExternalControllerView` com o mesmo `BaseInputConnection` (ExternalControllerView.java:58-85).

## Interfaces externas

- android.view.KeyEvent / KeyCharacterMap — origem de todos os eventos; `getUnicodeChar()`, `COMBINING_ACCENT`, `COMBINING_ACCENT_MASK`, `getScanCode()` (scancode evdev Linux), `getMetaState()` (Game.java:2001-2018, 2093)
- android.view.InputDevice#getKeyCodeForKeyLocation(int) — API 33+ (TIRAMISU); única fonte de normalização de layout para QWERTY (KeyboardTranslator.java:126,135)
- android.hardware.input.InputManager.InputDeviceListener — KeyboardTranslator implementa para manter o cache de layouts por deviceId (KeyboardTranslator.java:22,428-453); registrado/desregistrado em Game (Game.java:1713-1716)
- android.view.inputmethod.InputMethodManager#toggleSoftInput(int,int) — DEPRECATED; único mecanismo de abrir/fechar o IME (Game.java:2407-2408, ExternalDisplayControlActivity.java:450-451)
- android.view.inputmethod.BaseInputConnection / EditorInfo / InputConnection — IME em modo 'dummy'; `commitText`, `deleteSurroundingText`, `onCheckIsTextEditor` (StreamContainer.java:186-202, StreamView.java:130-157, ExternalControllerView.java:58-85)
- androidx.core.view.WindowCompat / WindowInsetsCompat / WindowInsetsControllerCompat — usados APENAS em ExternalDisplayControlActivity.java:160-176 (inclui `WindowInsetsCompat.Type.ime()`); NÃO usados em Game.java
- android.view.View#setSystemUiVisibility + WindowManager.LayoutParams FLAG_FULLSCREEN / FLAG_LAYOUT_IN_SCREEN / layoutInDisplayCutoutMode — modelo de janela legado do Game (Game.java:357-369, 439-453, 1646-1669)
- android.accessibilityservice.AccessibilityService com FLAG_REQUEST_FILTER_KEY_EVENTS — captura global de teclas (KeyboardAccessibilityService.java, res/xml/keyboard_accessibility_service.xml)
- com.samsung.android.view.SemWindowManager#requestMetaKeyEvent — via reflexão, para capturar teclas meta em dispositivos Samsung (Game.java:1348-1370)
- View#requestPointerCapture()/releasePointerCapture() — captura de ponteiro exige foco da View; compete com foco de EditText/IME (AndroidNativePointerCaptureProvider.java:72,84,106)
- JNI moonlight-core: `MoonBridge.sendKeyboardInput(short,byte,byte,byte)` e `MoonBridge.sendUtf8Text(String)` (MoonBridge.java:390,396) -> simplejni.c:112,127
- moonlight-common-c: `LiSendKeyboardEvent2()` (InputStream.c:924), `LiSendUtf8TextEvent()` (InputStream.c:1005), constantes `SS_KBE_FLAG_NON_NORMALIZED`, `KEY_ACTION_DOWN/UP`, `MODIFIER_*` (Limelight.h:700-715)
- Protocolo NVIDIA/Sunshine: `NV_KEYBOARD_PACKET` magic 0x03/0x04, `NV_UNICODE_PACKET` magic 0x17 com `UTF8_TEXT_EVENT_MAX_COUNT = 32` declarado (Input.h:22-37); canais ENet `CTRL_CHANNEL_KEYBOARD` e `CTRL_CHANNEL_UTF8`, sempre RELIABLE
- Windows Virtual-Key codes (VK_*) — tabela completa em utils/KeyMapper.java:750-937; mapa Linux evdev -> VK em KeyMapper.java:938-1062
- Linux input-event-codes.h (KEY_*) — replicado em utils/KeyMapper.java:7-744
- assets/config/keyboard.json — fonte de dados das teclas do KeyBoardController (keystroke/mouse/rocker/dpad), com codes = keycodes Android
- SharedPreferences: perfil de layout do teclado virtual (`keyboard_axi_list` / `OSC_Keyboard`, KeyBoardControllerConfigurationLoader.java:39-40, 552-589) e prefs de teclado em res/xml/preferences.xml:455-482, 559-607, 746-790
- NvHTTP clipboard (`httpConn.getClipboard()` / `sendClipboard`) — canal alternativo de texto host<->cliente (Game.java:2245-2389)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🔴 crítico | bug | Fila de commitText nunca é drenada quando o texto gera mais de um bloco (>512 bytes UTF-8) — e trava permanentemente | `app/src/main/java/com/limelight/Game.java:4331` |
| 🔴 crítico | ux | Activity .Game não declara windowSoftInputMode — o teclado do sistema sobrepõe o stream (o problema nº1 do dono do fork) | `app/src/main/AndroidManifest.xml:193` |
| 🔴 crítico | tech-debt | Modelo de janela legado (FLAG_FULLSCREEN + IMMERSIVE_STICKY) impede qualquer adjustResize/insets do IME | `app/src/main/java/com/limelight/Game.java:357` |
| 🟠 alto | bug | Dead keys e composição de IME são descartadas silenciosamente — impossível digitar acentos (crítico para pt-BR/ABNT2) | `app/src/main/java/com/limelight/Game.java:2093` |
| 🟠 alto | bug | Flag SS_KBE_FLAG_NON_NORMALIZED é calculada independentemente de forceQwerty — cliente mente ao host quando forceQwerty está desligado | `app/src/main/java/com/limelight/Game.java:2108` |
| 🟠 alto | bug | Teclas com mapeamento normalizado mas fora do switch são descartadas em vez de usar o fallback por scancode | `app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java:412` |
| 🟠 alto | security | UTF8_CHUNK_SIZE = 512 excede MAX_INPUT_PACKET_SIZE = 128 do moonlight-common-c (stack overflow no caminho de criptografia legado) | `app/src/main/java/com/limelight/Game.java:313` |
| 🟠 alto | bug | Preferência ignoreSynthEvents desativa TODOS os teclados virtuais próprios e o AccessibilityService | `app/src/main/java/com/limelight/Game.java:2036` |
| 🟠 alto | ux | Não existe nenhum campo de entrada de texto (EditText) em toda a UI de streaming | `app/src/main/java/com/limelight/Game.java:2401` |
| 🟡 médio | bug | ControllerHandler consome eventos de teclado sintéticos porque isGameControllerDevice(null) devolve true | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:332` |
| 🟡 médio | bug | modifierFlags é zerado ao perder foco sem enviar KEY_UP ao host — modificadores ficam presos no PC | `app/src/main/java/com/limelight/Game.java:1402` |
| 🟡 médio | bug | Overlays de teclado escondem-se sem soltar as teclas pressionadas — teclas presas no host | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:283` |
| 🟡 médio | bug | KeyBoardController.refreshLayout() reexibe o overlay oculto após rotação/mudança de configuração | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java:316` |
| 🟡 médio | maintainability | longClickRunnables é um HashMap estático — vaza a Activity e colide entre Game e ExternalDisplayControlActivity | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:82` |
| 🟡 médio | performance | Analógico virtual mapeado para teclas gera flood de pacotes de teclado (4 eventos por amostra de movimento) | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButtonFree.java:118` |
| 🟡 médio | performance | notifyOnRevoke()/notifyOnMovement(0,0) disparam em todo evento quando o stick não está pressionado | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyAnalogStickFree.java:404` |
| 🟡 médio | compatibility | toggleSoftInput(0, 0) é deprecated e não confiável — em muitos ROMs/Android 11+ não abre o teclado | `app/src/main/java/com/limelight/Game.java:2407` |
| 🟡 médio | bug | handleDeleteSurroundingText emite N backspaces em loop apertado, ignora afterLength e ignora modificadores | `app/src/main/java/com/limelight/Game.java:4298` |
| 🟡 médio | bug | handleSpecialKeys pode ser executado duas vezes para o mesmo KeyEvent (onKeyPreIme + onKeyDown da Activity) | `app/src/main/java/com/limelight/Game.java:2072` |
| 🟡 médio | compatibility | Macros do GameMenu e botões custom enviam VK cru sem o prefixo 0x80 usado pelo caminho normal | `app/src/main/java/com/limelight/Game.java:2210` |
| 🟡 médio | compatibility | KeyboardAccessibilityService reescreve qualquer tecla com scanCode == 1 para ESCAPE | `app/src/main/java/com/limelight/KeyboardAccessibilityService.java:31` |
| 🟡 médio | bug | AccessibilityService e a Activity podem processar a mesma tecla (duplo envio) | `app/src/main/java/com/limelight/KeyboardAccessibilityService.java:27` |
| 🟡 médio | maintainability | Três cópias duplicadas da lógica de InputConnection/commitText, uma delas em código morto | `app/src/main/java/com/limelight/ui/StreamView.java:130` |
| 🟡 médio | ux | Teclado virtual próprio não tem AltGr, acentos, dead keys, repetição automática nem localização | `app/src/main/res/layout/layout_axixi_keyboard.xml:1` |
| 🟡 médio | compatibility | Pointer capture compete com o foco de qualquer editor de texto | `app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java:84` |
| ⚪ baixo | bug | Game.sendKeys usa `new Handler()` sem Looper explícito | `app/src/main/java/com/limelight/Game.java:2221` |
| ⚪ baixo | bug | KeyBoardLayoutController dimensiona o teclado com DisplayMetrics globais em vez do tamanho da janela | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:332` |
| ⚪ baixo | ux | enableCommitText vem desligado por padrão, deixando o caminho de texto em bloco inativo | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:208` |
| ⚪ baixo | maintainability | KeyMapper: tabela estática mutável global e API morta setKeyMapping | `app/src/main/java/com/limelight/utils/KeyMapper.java:1071` |
| ⚪ baixo | maintainability | Erro de sintaxe cosmético em strings.xml (texto solto fora de elemento) | `app/src/main/res/values/strings.xml:378` |
| ⚪ baixo | performance | Fila de commitText sem limite de tamanho e sem descarte | `app/src/main/java/com/limelight/Game.java:314` |
| ⚪ baixo | ux | Sem sincronização de estado de Caps Lock / Num Lock / Scroll Lock com o host | `app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java:233` |
| ⚪ baixo | bug | enqueueCommitText: laço de ajuste de fronteira UTF-8 sem guarda de progresso | `app/src/main/java/com/limelight/Game.java:4323` |
| ⚪ baixo | bug | KeyBoardLayoutController.initKeyboard faz Integer.parseInt de android:tag sem tratamento de erro | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:248` |
| ⚪ baixo | ux | handleKeyDown descarta auto-repeat mas o host não gera repeat para teclas enviadas como UTF-8 | `app/src/main/java/com/limelight/Game.java:2104` |
| ⚪ baixo | ux | Combos locais Ctrl+Alt+Shift+Z/Q/C não são configuráveis e conflitam com atalhos de aplicativos no host | `app/src/main/java/com/limelight/Game.java:1973` |
| ⚪ baixo | compatibility | NV_UNICODE_PACKET declara text[32] mas o cliente envia blocos maiores — dependência de detalhe de implementação | `app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h:33` |

### Detalhe

#### 🔴 crítico Fila de commitText nunca é drenada quando o texto gera mais de um bloco (>512 bytes UTF-8) — e trava permanentemente

**Local:** `app/src/main/java/com/limelight/Game.java:4331` · **Categoria:** bug

`enqueueCommitText()` fatia o texto em N blocos e depois faz `if (commitTextQueue.size() == 1) commitTextHandler.post(flushCommitTextQueue);`. Se o texto produzir 2+ blocos, `size()` nunca é 1 no momento do teste, o Runnable NUNCA é postado e nada é enviado. Pior: a fila fica permanentemente com itens residuais, de modo que qualquer commit posterior (mesmo de 1 bloco) também falha na condição `size() == 1` — o recurso de commitText fica morto até o fim da sessão. Isso mata exatamente o caso de uso 'enviar texto inteiro em bloco' que o dono do fork quer.

**Correção sugerida:** Substituir o contador pela flag de agendamento: adicionar `private boolean commitFlushScheduled = false;` e usar `if (!commitFlushScheduled) { commitFlushScheduled = true; commitTextHandler.post(flushCommitTextQueue); }`; no Runnable (Game.java:317-331), setar `commitFlushScheduled = false` quando a fila esvaziar e mantê-la true ao reagendar. Alternativa mínima: trocar por `if (!commitTextHandler.hasCallbacks(flushCommitTextQueue))` (API 29+) ou simplesmente `commitTextHandler.removeCallbacks(flushCommitTextQueue); commitTextHandler.post(flushCommitTextQueue);`.

#### 🔴 crítico Activity .Game não declara windowSoftInputMode — o teclado do sistema sobrepõe o stream (o problema nº1 do dono do fork)

**Local:** `app/src/main/AndroidManifest.xml:193` · **Categoria:** ux

O bloco `<activity android:name=".Game" ...>` (linhas 193-216) não tem `android:windowSoftInputMode`. Com `SOFT_INPUT_ADJUST_UNSPECIFIED`, o WindowManager escolhe pan/nada; e como a janela adiciona `FLAG_FULLSCREEN` (Game.java:359) e `FLAG_LAYOUT_IN_SCREEN` (Game.java:369), o Android NUNCA redimensiona a janela para o IME — o teclado simplesmente desenha por cima do vídeo. O único `windowSoftInputMode` do manifesto está em `.preferences.AddComputerManually` (linha 179).

**Correção sugerida:** Adicionar `android:windowSoftInputMode="adjustResize"` à Activity .Game E remover FLAG_FULLSCREEN em favor de `WindowInsetsControllerCompat.hide(Type.systemBars())`, senão o adjustResize é ignorado (ver finding seguinte). O configChanges já inclui `screenSize|screenLayout` (linha 195), então o resize não recria a Activity.

#### 🔴 crítico Modelo de janela legado (FLAG_FULLSCREEN + IMMERSIVE_STICKY) impede qualquer adjustResize/insets do IME

**Local:** `app/src/main/java/com/limelight/Game.java:357` · **Categoria:** tech-debt

onCreate adiciona `FLAG_FULLSCREEN` e `SYSTEM_UI_FLAG_LAYOUT_STABLE|LAYOUT_HIDE_NAVIGATION|LAYOUT_FULLSCREEN` (357-367) mais `FLAG_LAYOUT_IN_SCREEN` (369); o Runnable `hideSystemUi` (1646-1669) reaplica `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` e é re-agendado por `onSystemUiVisibilityChange` a cada 2000 ms sempre que as flags caem (3914-3928). Existe um TODO explícito na linha 1649 ('Do we want to use WindowInsetsController here on R+ instead of SYSTEM_UI_FLAG_IMMERSIVE_STICKY?') que nunca foi implementado. Nenhum `setDecorFitsSystemWindows`, `OnApplyWindowInsetsListener` ou `WindowInsetsCompat.Type.ime()` existe em Game.java — só em ExternalDisplayControlActivity.java:169-176. Consequência: mesmo declarando adjustResize, o IME continuaria sobrepondo, e o loop de immersive-sticky brigaria com o teclado (que em immersive é tratado como barra transitória).

**Correção sugerida:** Migrar Game.java para o modelo moderno: (1) `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`; (2) trocar `hideSystemUi` por `WindowInsetsControllerCompat.hide(WindowInsetsCompat.Type.systemBars())` + `setSystemBarsBehavior(BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)` — NUNCA esconder `Type.ime()`; (3) suprimir o re-agendamento de `hideSystemUi` enquanto `insets.isVisible(Type.ime())` for true; (4) copiar o padrão já existente em ExternalDisplayControlActivity.java:169-176.

#### 🟠 alto Dead keys e composição de IME são descartadas silenciosamente — impossível digitar acentos (crítico para pt-BR/ABNT2)

**Local:** `app/src/main/java/com/limelight/Game.java:2093` · **Categoria:** bug

Em `handleKeyDown`, quando `translate()` devolve 0, o código só envia UTF-8 se `(unicodeChar & KeyCharacterMap.COMBINING_ACCENT) == 0 && (unicodeChar & COMBINING_ACCENT_MASK) != 0` — ou seja, acentos combinantes (´ ` ~ ^ ¨) são explicitamente ignorados (o comentário nas linhas 2088-2089 admite: 'not a dead character (which we don't support)'). `handleKeyUp` (2176-2177) repete a checagem apenas para reportar handled. Não existe nenhuma chamada a `setComposingText`, `KeyCharacterMap.getDeadChar()` ou acumulação de estado de composição em todo o repo. Resultado prático num teclado ABNT2/pt-BR: é impossível digitar á, ã, ç (via ´+c), â, õ etc. pelo caminho de tecla individual.

**Correção sugerida:** (a) Curto prazo: manter o estado do acento morto em Game (`pendingDeadChar`), e no próximo KeyEvent usar `KeyCharacterMap.getDeadChar(pendingDeadChar, nextChar)` para compor e enviar o resultado via `conn.sendUtf8Text()`. (b) Correto: sobrescrever `setComposingText()` no BaseInputConnection do StreamContainer (StreamContainer.java:192) para acumular e só enviar em `finishComposingText()`. (c) Estratégico: o campo de injeção de texto (EPIC) resolve tudo isso de graça, porque um EditText real dá composição/IME nativos.

#### 🟠 alto Flag SS_KBE_FLAG_NON_NORMALIZED é calculada independentemente de forceQwerty — cliente mente ao host quando forceQwerty está desligado

**Local:** `app/src/main/java/com/limelight/Game.java:2108` · **Categoria:** bug

`conn.sendKeyboardInput(..., keyboardTranslator.hasNormalizedMapping(event.getKeyCode(), deviceId) ? 0 : MoonBridge.SS_KBE_FLAG_NON_NORMALIZED)` (idem em 2181-2182). Mas `hasNormalizedMapping()` (KeyboardTranslator.java:161-175) só verifica se EXISTE um mapa de normalização para o device, enquanto `translate()` (KeyboardTranslator.java:188) só APLICA a normalização se `prefConfig.forceQwerty` for true. Com `forceQwerty = false` (opção exposta em res/xml/preferences.xml:455) num device API 33+ com layout não-US, o cliente envia o VK derivado do keycode NÃO normalizado mas informa flags=0 (=normalizado), fazendo o host (Sunshine/Apollo) interpretar o código como posição US-QWERTY e produzir o caractere errado.

**Correção sugerida:** Extrair a decisão para o próprio KeyboardTranslator (ex.: `translate()` devolver também a flag, ou um método `getKeyFlags(keycode, deviceId)` que retorne 0 apenas quando `prefConfig.forceQwerty && hasNormalizedMapping(...)`). Aplicar nos dois call sites (Game.java:2108-2109 e 2181-2182).

#### 🟠 alto Teclas com mapeamento normalizado mas fora do switch são descartadas em vez de usar o fallback por scancode

**Local:** `app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java:412` · **Categoria:** bug

No fim de `translate()`: `if (translated == 0) { if (hasNormalizedMapping(keycode, deviceId)) return 0; translated = KeyMapper.getWindowsKeyCode(scancode); ... }`. Ou seja, em qualquer device API 33+ com layout de teclado reconhecido, toda tecla que não está no switch (ex.: a tecla 102ª/`<>` de teclados ABNT2 e ISO, KEYCODE_RO, KEYCODE_YEN, teclas de mídia, KEYCODE_NUMPAD_ENTER, KEYCODE_NUMPAD_EQUALS, KEYCODE_NUMPAD_COMMA) é ABANDONADA — nem VK, nem UTF-8 (porque `handleKeyDown` só cai no UTF-8 quando translate devolve 0, o que ocorre, mas aí a tecla costuma ter unicodeChar 0 ou ser acento morto). O fallback `KeyMapper.getWindowsKeyCode(scancode)` (que cobre KEY_102ND=86 -> VK_OEM_102, KEY_KPENTER, KEY_KPCOMMA etc., KeyMapper.java:1060-1061) fica inacessível justamente nos aparelhos mais novos.

**Correção sugerida:** Inverter a ordem: tentar sempre `KeyMapper.getWindowsKeyCode(scancode)` primeiro quando `translated == 0`, e só devolver 0 se o scancode também não mapear. Manter `hasNormalizedMapping` apenas para decidir a flag, não para descartar a tecla.

#### 🟠 alto UTF8_CHUNK_SIZE = 512 excede MAX_INPUT_PACKET_SIZE = 128 do moonlight-common-c (stack overflow no caminho de criptografia legado)

**Local:** `app/src/main/java/com/limelight/Game.java:313` · **Categoria:** security

`enqueueCommitText` gera blocos de até 512 bytes -> `LiSendUtf8TextEvent` monta um pacote de 512+8 bytes. Em `sendInputPacket` (InputStream.c:235-300), quando `encryptedControlStream == false` (host com AppVersion < 7.1.431, i.e. GFE antigo — InputStream.c:105), o código faz `char encryptedBuffer[MAX_INPUT_PACKET_SIZE]` (=128, InputStream.c:43,254) e `encryptData()` copia o plaintext inteiro para `unsigned char paddedData[ROUND_TO_PKCS7_PADDED_LEN(128)]` com `memcpy(paddedData, plaintext, plaintextLen)` sem checar tamanho (InputStream.c:180-182) — smash de pilha determinístico. Com Apollo/Sunshine (>=7.1.431) o caminho ENet é usado e não há overflow, mas o risco existe para qualquer host legado e é uma bomba-relógio.

**Correção sugerida:** Reduzir `UTF8_CHUNK_SIZE` para <= 100 bytes (mantém margem para o header de 8 bytes e o padding PKCS7 dentro dos 128). Opcionalmente adicionar validação de tamanho em `LiSendUtf8TextEvent` (InputStream.c:1005) e/ou fragmentar lá. Blocos menores também reduzem jitter na fila `MAX_QUEUED_INPUT_PACKETS = 150`.

#### 🟠 alto Preferência ignoreSynthEvents desativa TODOS os teclados virtuais próprios e o AccessibilityService

**Local:** `app/src/main/java/com/limelight/Game.java:2036` · **Categoria:** bug

`if (prefConfig.ignoreSynthEvents && deviceId <= 0) return false;` em `handleKeyDown` (2036-2039) e `handleKeyUp` (2127-2130). Todos os KeyEvent sintetizados pelo fork usam `new KeyEvent(action, keyCode)` (KeyBoardLayoutController.java:204, KeyBoardControllerConfigurationLoader.java:74-107,121,173,189,198,209,324,341), cujo deviceId é o do teclado virtual (<= 0). Se o usuário ligar `checkbox_ignore_synth_events` (res/xml/preferences.xml:473) para resolver problemas de mouse/gamepad, os DOIS teclados on-screen e o KeyboardAccessibilityService param de funcionar silenciosamente, sem nenhum aviso na UI.

**Correção sugerida:** Marcar os eventos sintéticos do próprio app (ex.: construir o KeyEvent com `KeyEvent(downTime, eventTime, action, code, repeat, metaState, deviceId, scancode, flags, source)` usando um `source` próprio, ou passar um parâmetro `boolean internal` para handleKeyDown/Up) e pular o filtro de ignoreSynthEvents para eles. Documentar a interação no summary da preferência.

#### 🟠 alto Não existe nenhum campo de entrada de texto (EditText) em toda a UI de streaming

**Local:** `app/src/main/java/com/limelight/Game.java:2401` · **Categoria:** ux

Grep confirma que a única forma de mandar texto ao host é (a) tecla a tecla, (b) `sendUtf8Text` disparado por commitText/ACTION_MULTIPLE do IME quando o usuário digita no vazio sobre o vídeo, ou (c) sincronização de clipboard (Game.java:2245-2389). Não há EditText, nem barra de composição, nem preview do que está sendo digitado. Somado ao IME que cobre a tela e às dead keys descartadas, é exatamente a experiência que o dono do fork descreve como ruim comparada ao AnyDesk.

**Correção sugerida:** Ver o EPIC 'Barra de injeção de texto' em improvementIdeas — a infraestrutura de envio (enqueueCommitText/sendUtf8Text) já existe; falta a UI e a correção do bug da fila.

#### 🟡 médio ControllerHandler consome eventos de teclado sintéticos porque isGameControllerDevice(null) devolve true

**Local:** `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:332` · **Categoria:** bug

`isGameControllerDevice(InputDevice device)` retorna `true` quando `device == null` (linhas 333-335). Em `Game.handleKeyDown` (2063-2067) isso faz todo evento sem InputDevice resolvível passar primeiro por `controllerHandler.handleButtonDown(event)`. Se `getContextForEvent()` (ControllerHandler.java:1018-1032) devolver null (deviceId != 0 mas `getDevice() == null`), `handleButtonDown` retorna **true** (linhas 2710-2712), marcando o evento como tratado e IMPEDINDO que a tecla chegue ao caminho de teclado. Cenário real: evento de teclado durante remoção/reconfiguração de device, ou eventos sintéticos com deviceId != 0.

**Correção sugerida:** Fazer `isGameControllerDevice(null)` retornar false, ou pelo menos condicionar a tentativa de gamepad a `event.getDevice() != null` em Game.java:2063 e 2152, e fazer `handleButtonDown/Up` retornarem false quando o contexto é null.

#### 🟡 médio modifierFlags é zerado ao perder foco sem enviar KEY_UP ao host — modificadores ficam presos no PC

**Local:** `app/src/main/java/com/limelight/Game.java:1402` · **Categoria:** bug

`onWindowFocusChanged` faz `this.modifierFlags = 0;` (linha 1408) com o comentário 'We can't guarantee the state of modifiers keys'. Mas nenhum `conn.sendKeyboardInput(..., KEY_UP, ...)` é emitido para os modificadores que estavam pressionados. O host (Sunshine/Apollo) continua com Ctrl/Alt/Shift/Win virtualmente pressionados até o usuário apertar e soltar a tecla de novo. Sintoma clássico: sair do app com Alt+Tab e voltar com o Alt 'grudado' no Windows.

**Correção sugerida:** Antes de zerar, iterar sobre os bits ativos de modifierFlags e enviar KEY_UP dos VKs correspondentes (0xA0/0xA2/0xA4/0x5B). Fazer o mesmo em `onPause`/`onStop` e em `setInputGrabState(false)` (Game.java:1864).

#### 🟡 médio Overlays de teclado escondem-se sem soltar as teclas pressionadas — teclas presas no host

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:283` · **Categoria:** bug

`KeyBoardLayoutController.hide()` (283-303) apenas faz `keyboardView.setVisibility(View.GONE)`; `KeyBoardController.hide()` (KeyBoardController.java:230-243) faz `element.setVisibility(View.GONE)` em loop. Nenhum dos dois envia KEY_UP das teclas atualmente pressionadas nem limpa `modifierKeyStates` (KeyBoardLayoutController.java:84). Os pontos de chamada incluem onStop (Game.java:1770-1775), entrada em PiP (Game.java:1228-1234) e a tecla 'hide' do próprio teclado (KeyBoardLayoutController.java:125-130). Modificadores sticky ficam presos indefinidamente no host.

**Correção sugerida:** Adicionar um `releaseAllKeys()` chamado em hide()/onPause: para o KeyBoardLayoutController iterar `modifierKeyStates` e enviar ACTION_UP; para o KeyBoardController iterar `elements`, e para cada `KeyBoardDigitalButton` com `isPressed() || isSticky()` disparar `onReleaseCallback()`.

#### 🟡 médio KeyBoardController.refreshLayout() reexibe o overlay oculto após rotação/mudança de configuração

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java:316` · **Categoria:** bug

`onConfigurationChanged` (Game.java:1199-1201) chama `keyBoardController.refreshLayout()`, que faz `removeElements()` e recria tudo: `buttonConfigure` é re-adicionado sempre VISIBLE (linha 326, sem consultar `shown`), e `loadFromPreferences` -> `loadConfiguration` força `setVisibility(!hidden && enabled ? VISIBLE : GONE)` (keyBoardVirtualControllerElement.java:421-425). Resultado: o usuário esconde o overlay de teclas especiais, gira a tela, e o overlay volta.

**Correção sugerida:** Ao final de `refreshLayout()`, respeitar o estado: `if (shown) show(); else hide(true);`. O mesmo cuidado vale para `KeyBoardLayoutController.refreshLayout()` (321-357), que preserva a visibilidade da View mas recalcula tamanho com DisplayMetrics globais.

#### 🟡 médio longClickRunnables é um HashMap estático — vaza a Activity e colide entre Game e ExternalDisplayControlActivity

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:82` · **Categoria:** maintainability

`private static final HashMap<Integer, Runnable> longClickRunnables` é populado em `initKeyboard()` (249-256) com lambdas que capturam `child` (uma View do layout inflado) e, por consequência, o Context/Activity. Como é estático e nunca limpo: (1) mantém a Activity viva após destruição (memory leak clássico); (2) quando ExternalDisplayControlActivity cria seu próprio KeyBoardLayoutController (ExternalDisplayControlActivity.java:455), ele SOBRESCREVE as entradas do controller do Game, quebrando os modificadores sticky do teclado principal e disparando feedback háptico na View errada.

**Correção sugerida:** Tornar o campo de instância (`private final HashMap<Integer, Runnable> longClickRunnables = new HashMap<>();`) e limpá-lo em um novo método `destroy()` chamado no onDestroy das duas Activities.

#### 🟡 médio Analógico virtual mapeado para teclas gera flood de pacotes de teclado (4 eventos por amostra de movimento)

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButtonFree.java:118` · **Categoria:** performance

`onMovement()` termina com `for (int i = 0; i < 4; i++) listener.onkeyEvent(stickSender[i], stickBool[i]);` — SEM comparar com o estado anterior. `keyAnalogStickFree.updatePosition()` (keyAnalogStickFree.java:322-324) chama `notifyOnMovement` em todo ACTION_MOVE ativo, e `onElementTouchEvent` ainda chama `updatePosition` uma segunda vez no final de cada evento (linhas 404-406). Com ~120 Hz de amostragem de toque isso gera ~480 chamadas/s a `Game.onKey` -> `handleKeyDown` -> `conn.sendKeyboardInput`, cada uma um pacote ENet RELIABLE. A fila do moonlight-common-c tem limite de `MAX_QUEUED_INPUT_PACKETS = 150` (InputStream.c:46) e vai começar a descartar entradas ('Input queue reached maximum size limit'), afetando TODA a entrada, inclusive teclado real. `KeyAnalogStick`/`KeyBoardAnalogStickButton` (variante não-Free) têm o mesmo padrão.

**Correção sugerida:** Guardar `boolean[] lastStickBool` e só chamar `listener.onkeyEvent` quando `stickBool[i] != lastStickBool[i]`. Fazer o mesmo em `createDiaitalPadButton` (KeyBoardControllerConfigurationLoader.java:68-112), que hoje envia DOWN/UP das 4 direções a cada `onDirectionChange`.

#### 🟡 médio notifyOnRevoke()/notifyOnMovement(0,0) disparam em todo evento quando o stick não está pressionado

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyAnalogStickFree.java:404` · **Categoria:** performance

No final de `onElementTouchEvent`: `if (isPressed()) { updatePosition(...); } else { stick_state = NO_MOVEMENT; notifyOnRevoke(); notifyOnMovement(0, 0); }`. O ramo else roda para QUALQUER evento recebido enquanto o elemento não está pressionado (inclusive ACTION_MOVE de outros ponteiros que passem pela área), emitindo 5+4 KEY_UP redundantes por evento.

**Correção sugerida:** Só executar o ramo de revoke quando houver transição pressed->released (guardar `wasPressed`) ou nos actions ACTION_UP/ACTION_CANCEL/ACTION_POINTER_UP.

#### 🟡 médio toggleSoftInput(0, 0) é deprecated e não confiável — em muitos ROMs/Android 11+ não abre o teclado

**Local:** `app/src/main/java/com/limelight/Game.java:2407` · **Categoria:** compatibility

`InputMethodManager.toggleSoftInput(0, 0)` (Game.java:2407-2408 e ExternalDisplayControlActivity.java:450-451) está deprecated desde a API 31 e depende de a janela ter uma View editora focada. Como `StreamContainer.onCheckIsTextEditor()` só devolve true quando `enableCommitText` está ligado (StreamContainer.java:182, default FALSE em PreferenceConfiguration.java:208), na configuração padrão o Android muitas vezes recusa mostrar o IME — o gesto de 3 dedos e o item de menu 'Show soft keyboard' simplesmente não fazem nada em vários aparelhos.

**Correção sugerida:** Usar `WindowInsetsControllerCompat(getWindow(), streamContainer).show(WindowInsetsCompat.Type.ime())` / `.hide(...)` em API 30+ e manter `showSoftInput(view, SHOW_IMPLICIT)` como fallback; garantir que a View alvo esteja focada e seja text editor no momento da chamada.

#### 🟡 médio handleDeleteSurroundingText emite N backspaces em loop apertado, ignora afterLength e ignora modificadores

**Local:** `app/src/main/java/com/limelight/Game.java:4298` · **Categoria:** bug

O loop `for (int i = 0; i < beforeLength; i++)` envia 2 pacotes ENet por caractere, sem qualquer throttling (contrastando com o cuidadoso `flushCommitTextQueue` de 15 ms usado para texto). Um IME apagando uma palavra longa ou uma seleção pode enfileirar centenas de pacotes de uma vez e estourar `MAX_QUEUED_INPUT_PACKETS`. Além disso, `afterLength` (tecla Delete) é ignorado e o modifier é hardcoded `(byte)0`, desprezando `getModifierState()` — um Ctrl segurado vira Ctrl+Backspace perdido/errado.

**Correção sugerida:** Limitar/agrupar os backspaces numa fila com o mesmo Handler do commitText, respeitar `afterLength` emitindo VK_DELETE (0x2E), e usar `getModifierState()` em vez de 0.

#### 🟡 médio handleSpecialKeys pode ser executado duas vezes para o mesmo KeyEvent (onKeyPreIme + onKeyDown da Activity)

**Local:** `app/src/main/java/com/limelight/Game.java:2072` · **Categoria:** bug

Quando `StreamContainer.onKeyPreIme` (StreamContainer.java:161-170) chama `handleKeyDown` e este devolve **false** (ex.: `!grabbedInput` na linha 2078, ou tecla sem tradução e sem unicode na linha 2099), o evento continua sua propagação e volta por `Game.onKey` (3958-3970) e/ou `Activity.onKeyDown` (2025-2027), executando `handleSpecialKeys()` de novo. As operações de bit sobre modifierFlags são idempotentes, mas a máquina de estados de combo (`specialKeyCode`, `waitingForAllModifiersUp`, linhas 1925-1991) não é: o segundo passe pode consumir/limpar o estado prematuramente ou disparar o combo duas vezes.

**Correção sugerida:** Marcar o evento como já processado (ex.: um `WeakHashMap<KeyEvent,Boolean>` ou comparar `event.getEventTime()+getKeyCode()+getAction()` com o último processado) no início de handleKeyDown/handleKeyUp, ou tratar apenas em um único ponto de entrada (remover o setOnKeyListener redundante de Game.java:462, já que onKeyPreIme cobre o caso).

#### 🟡 médio Macros do GameMenu e botões custom enviam VK cru sem o prefixo 0x80 usado pelo caminho normal

**Local:** `app/src/main/java/com/limelight/Game.java:2210` · **Categoria:** compatibility

`Game.sendKeys(short[] keys)` envia `conn.sendKeyboardInput(key, ...)` com os valores de `KeyboardTranslator.VK_*` (ex.: VK_ESCAPE = 27, KeyboardTranslator.java:40) chamados de GameMenu.java:160-199, enquanto o caminho de tecla real sempre envia `(0x80 << 8) | vk` (KeyboardTranslator.java:425). O mesmo ocorre em `createCustomButton` (KeyBoardControllerConfigurationLoader.java:246,268,282,299). Funciona hoje apenas porque Sunshine/Apollo mascara `keyCode & 0x00FF`; o GFE original espera o prefixo 0x80, e `LiSendKeyboardEvent2` faz seus fixups sobre `keyCode & 0xFF` (InputStream.c:946), tornando a diferença invisível — mas é uma inconsistência que quebra qualquer host que valide o high byte.

**Correção sugerida:** Normalizar: criar um helper `static short toGfeKeyCode(int vk) { return (short)(0x8000 | (vk & 0xFF)); }` em KeyboardTranslator e aplicá-lo em Game.sendKeys e em createCustomButton.

#### 🟡 médio KeyboardAccessibilityService reescreve qualquer tecla com scanCode == 1 para ESCAPE

**Local:** `app/src/main/java/com/limelight/KeyboardAccessibilityService.java:31` · **Categoria:** compatibility

O hack `if (event.getScanCode() == 1) { Game.instance.handleKeyDown(new KeyEvent(ACTION_DOWN, KEYCODE_ESCAPE)); return true; }` (linhas 31-34 e 39-42) foi criado para um bug específico de tablets Xiaomi que reportam ESC como KEYCODE_BACK. Mas scanCode 1 é `KEY_ESC` no evdev — em teclados normais a tecla ESC já traduz corretamente, e o hack descarta o keycode real de QUALQUER dispositivo cujo scancode 1 seja remapeado. O KeyEvent sintetizado também perde deviceId/scanCode/metaState, então cai no filtro de `ignoreSynthEvents` e não carrega modificadores.

**Correção sugerida:** Restringir o hack a `Build.MANUFACTURER`/`Build.MODEL` Xiaomi, ou condicioná-lo a `event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getScanCode() == 1`, e propagar o evento original (com deviceId/metaState) em vez de sintetizar um novo.

#### 🟡 médio AccessibilityService e a Activity podem processar a mesma tecla (duplo envio)

**Local:** `app/src/main/java/com/limelight/KeyboardAccessibilityService.java:27` · **Categoria:** bug

`onKeyEvent` chama `Game.instance.handleKeyDown(event)` e retorna true (consumindo o evento) sempre que o Game está conectado. Como `onServiceConnected` define `info.packageNames = { BuildConfig.APPLICATION_ID }` (linha 55), na teoria o filtro limita ao próprio app; porém `FLAG_REQUEST_FILTER_KEY_EVENTS` entrega teclas antes da janela e o comportamento do filtro por pacote para key events é inconsistente entre ROMs. Em ROMs onde o evento é entregue ao serviço E à janela, cada tecla é enviada duas vezes ao host (caractere duplicado).

**Correção sugerida:** Adicionar deduplicação por (deviceId, downTime, keyCode, action) em Game.handleKeyDown/Up, ou tornar o serviço opt-in com aviso explícito na UI e testar em Xiaomi/Samsung/OnePlus.

#### 🟡 médio Três cópias duplicadas da lógica de InputConnection/commitText, uma delas em código morto

**Local:** `app/src/main/java/com/limelight/ui/StreamView.java:130` · **Categoria:** maintainability

`StreamView` (167 linhas) implementa onKeyPreIme + onCheckIsTextEditor + onCreateInputConnection + a interface InputCallbacks, mas NÃO é referenciado por nenhum layout XML nem por nenhuma classe Java (o layout activity_game.xml usa `com.limelight.ui.StreamContainer`; a Activity externa usa `ExternalControllerView`). É código morto herdado do upstream. `StreamContainer.java:185-202` e `ExternalControllerView.java:58-85` contêm a MESMA lógica copiada, com pequenas divergências (StreamContainer não faz `requestFocus()` em setCommitTextEnabled; StreamView e ExternalControllerView fazem; ExternalControllerView não implementa onWindowFocusChanged). Qualquer correção no pipeline de texto precisa ser feita em 2-3 lugares.

**Correção sugerida:** Deletar `StreamView.java` (e `StreamView.InputCallbacks`), e extrair a lógica comum para uma classe utilitária (ex.: `com.limelight.ui.StreamInputConnectionFactory.create(View, InputCallbacks, EditorInfo)`) usada por StreamContainer e ExternalControllerView.

#### 🟡 médio Teclado virtual próprio não tem AltGr, acentos, dead keys, repetição automática nem localização

**Local:** `app/src/main/res/layout/layout_axixi_keyboard.xml:1` · **Categoria:** ux

O layout é hardcoded em XML: 82 TextViews com `android:tag` = keycode Android e `android:text` = rótulo fixo em inglês/ASCII. Não existem as teclas Alt direito/AltGr (os blocos estão COMENTADOS nas linhas 791-802), ç, ~, ´, `, ^, nem teclado numérico. Não há variante por locale (nenhum layout_axixi_keyboard.xml em res/layout-*/ ou por idioma) e não há auto-repeat ao segurar uma tecla (o OnTouchListener só emite DOWN e UP, KeyBoardLayoutController.java:136-206). Para um usuário pt-BR isso significa que nem o teclado do sistema (dead keys descartadas) nem o teclado próprio permitem digitar acentos.

**Correção sugerida:** Migrar o layout para uma definição de dados (JSON em assets, como já é feito para o KeyBoardController via keyboard.json) com linhas/teclas/larguras/rótulos, permitindo múltiplos layouts (US/ABNT2/etc.) e uma tecla AltGr/modificador de camada; adicionar auto-repeat com Handler.postDelayed.

#### 🟡 médio Pointer capture compete com o foco de qualquer editor de texto

**Local:** `app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java:84` · **Categoria:** compatibility

`targetView.requestPointerCapture()` é chamado sobre o `streamContainer` (InputCaptureManager.java:15) em hideCursor (linha 84), em onWindowFocusChanged com 500 ms de atraso (linhas 101-109) e em onInputDeviceAdded/Changed (145-169). A API exige que a View tenha foco; ao focar um EditText de injeção de texto o capture é perdido e o provider tentará recapturá-lo periodicamente, roubando o foco de volta e/ou fazendo o IME fechar. Também afeta o cenário atual em que o usuário abre o IME com 3 dedos.

**Correção sugerida:** Introduzir um estado 'text input mode' em Game que chame `setInputGrabState(false)` + `inputCaptureProvider.showCursor()` (que já faz releasePointerCapture) enquanto a barra de texto/IME estiver aberta, e suspenda as recapturas de `onWindowFocusChanged`/`onInputDeviceAdded`.

#### ⚪ baixo Game.sendKeys usa `new Handler()` sem Looper explícito

**Local:** `app/src/main/java/com/limelight/Game.java:2221` · **Categoria:** bug

`new Handler().postDelayed(..., GameMenu.KEY_UP_DELAY)` — o construtor sem argumentos usa o Looper da thread chamadora e lança `RuntimeException: Can't create handler inside thread that has not called Looper.prepare()` se `sendKeys` for chamado de uma thread de background (hoje só é chamado da UI thread via GameMenu, mas nada impede o contrário). Além disso, cria um Handler novo a cada chamada e o delay fixo de 25 ms (GameMenu.java:35) pode ser curto demais para alguns jogos registrarem o KEY_DOWN.

**Correção sugerida:** Usar o `timerHandler` já existente (Game.java:169, criado com `Looper.getMainLooper()`) e tornar o delay configurável.

#### ⚪ baixo KeyBoardLayoutController dimensiona o teclado com DisplayMetrics globais em vez do tamanho da janela

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:332` · **Categoria:** bug

`DisplayMetrics screen = context.getResources().getDisplayMetrics(); width = screen.widthPixels; height = (int)(screen.heightPixels * 0.5);` — ignora multi-window, PiP, freeform e tela externa, onde o tamanho da janela difere do display. O mesmo padrão aparece em `KeyBoardController.refreshLayout()` (linha 319-320), `createDefaultLayout` (KeyBoardControllerConfigurationLoader.java:353-365) e `isPositionFree` (KeyBoardController.java:737-739).

**Correção sugerida:** Usar `frame_layout.getWidth()/getHeight()` (o FrameLayout de conteúdo) ou, em API 30+, `WindowMetricsCalculator`/`getWindowManager().getCurrentWindowMetrics().getBounds()`.

#### ⚪ baixo enableCommitText vem desligado por padrão, deixando o caminho de texto em bloco inativo

**Local:** `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:208` · **Categoria:** ux

`DEFAULT_ENABLE_COMMIT_TEXT = false` e o checkbox (res/xml/preferences.xml:479-481, strings 'May break games that rely on key-by-key input') está enterrado na categoria de entrada. Sem ele, `StreamContainer.onCheckIsTextEditor()` devolve false (StreamContainer.java:182), o IME não tem editor alvo, `toggleSoftInput` fica menos confiável e o texto de swipe/voz só chega pelo caminho frágil de ACTION_MULTIPLE.

**Correção sugerida:** Manter o default para o modo jogo, mas ligar automaticamente enquanto a barra de injeção de texto estiver aberta (é um editor dedicado, não interfere com jogos), e/ou expor o toggle no menu do jogo em vez de só nas settings.

#### ⚪ baixo KeyMapper: tabela estática mutável global e API morta setKeyMapping

**Local:** `app/src/main/java/com/limelight/utils/KeyMapper.java:1071` · **Categoria:** maintainability

`linuxToWindowsKeyMap` é um `int[]` estático mutável (linha 938) e `setKeyMapping(int,int)` (1071-1075) permite alterá-lo globalmente em runtime — mas nenhum call site existe no repositório (grep confirma que só `getWindowsKeyCode` é usado, em KeyboardTranslator.java:419). Todas as constantes KEY_*/VK_* são `public static int` não-final, podendo ser sobrescritas acidentalmente. Não há sincronização.

**Correção sugerida:** Tornar as constantes `static final`, o array `private static final`, e remover `setKeyMapping` (ou transformá-lo num mecanismo de remapeamento por perfil, com cópia por sessão).

#### ⚪ baixo Erro de sintaxe cosmético em strings.xml (texto solto fora de elemento)

**Local:** `app/src/main/res/values/strings.xml:378` · **Categoria:** maintainability

A linha é `<string name="game_menu_toggle_keyboard_model">Toggle Special keys</string>s` — há um caractere `s` solto após o fechamento da tag, dentro de `<resources>`. O AAPT tolera, mas é um sinal de edição descuidada e polui o diff/lint.

**Correção sugerida:** Remover o `s` final.

#### ⚪ baixo Fila de commitText sem limite de tamanho e sem descarte

**Local:** `app/src/main/java/com/limelight/Game.java:314` · **Categoria:** performance

`commitTextQueue` é um ArrayDeque sem limite. Com o drenar a 1 bloco/15 ms (Game.java:328), um paste de 100 KB geraria ~196 blocos e ~3 s de envio; um usuário colando repetidamente pode acumular minutos de backlog sem nenhum feedback nem cancelamento. Também não há limpeza da fila em onDestroy/desconexão (o Runnable checa `conn != null` mas não `connected`).

**Correção sugerida:** Limitar a fila (ex.: 256 blocos), descartar/avisar no overflow, limpar em `onDestroy` (Game.java:1702) e em `stageFailed/connectionTerminated`, e checar `connected` antes de enviar.

#### ⚪ baixo Sem sincronização de estado de Caps Lock / Num Lock / Scroll Lock com o host

**Local:** `app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java:233` · **Categoria:** ux

As teclas são traduzidas (VK_CAPS_LOCK/VK_NUM_LOCK/VK_SCROLL_LOCK, KeyboardTranslator.java:233-239, 306-308, 326-328) mas o estado de LED/toggle nunca é lido de `KeyEvent.getMetaState() & META_CAPS_LOCK_ON` nem reconciliado com o host. Se o Caps Lock do Android e o do Windows divergirem (comum ao entrar/sair do stream), o usuário digita em maiúsculas sem entender por quê.

**Correção sugerida:** Ao ganhar foco (Game.onWindowFocusChanged:1403), comparar `getMetaState()` local com o último estado enviado e emitir um toggle de CapsLock/NumLock se divergirem; ou expor uma opção 'reset lock keys ao conectar'.

#### ⚪ baixo enqueueCommitText: laço de ajuste de fronteira UTF-8 sem guarda de progresso

**Local:** `app/src/main/java/com/limelight/Game.java:4323` · **Categoria:** bug

`while (end < utf8.length && (utf8[end] & 0xC0) == 0x80) { end--; }` retrocede sem checar `end > offset`. Com UTF8_CHUNK_SIZE = 512 e sequências UTF-8 de no máximo 4 bytes isso é seguro na prática, mas se alguém reduzir o chunk size (o que este relatório recomenda) para um valor pequeno, ou se o array contiver bytes de continuação inválidos, `end` pode chegar a `offset`, gerando um chunk vazio e um laço externo infinito (`offset = end` não progride) que trava a UI thread.

**Correção sugerida:** Adicionar `&& end > offset + 1` na condição e um `if (end <= offset) end = Math.min(offset + UTF8_CHUNK_SIZE, utf8.length);` como salvaguarda.

#### ⚪ baixo KeyBoardLayoutController.initKeyboard faz Integer.parseInt de android:tag sem tratamento de erro

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java:248` · **Categoria:** bug

`int keycode = Integer.parseInt((String) child.getTag());` (linha 248) e `int keyCode = Integer.parseInt(tag);` (linha 132) — qualquer View no layout sem tag, com tag não numérica diferente de 'hide', ou um cast de tag não-String, lança NumberFormatException/NPE/ClassCastException que derruba a abertura do teclado. Também assume que todos os filhos de `keyboardView` são LinearLayout (linha 240) — um separador ou View diferente causa ClassCastException.

**Correção sugerida:** Envolver em try/catch com LimeLog.warning, e checar `child.getTag() instanceof String` / `getChildAt(i) instanceof LinearLayout` antes do cast.

#### ⚪ baixo handleKeyDown descarta auto-repeat mas o host não gera repeat para teclas enviadas como UTF-8

**Local:** `app/src/main/java/com/limelight/Game.java:2104` · **Categoria:** ux

`if (event.getRepeatCount() > 0) return true;` (2104-2106) é executado DEPOIS do envio UTF-8 (2093-2097) — o comentário nas linhas 2091-2092 explica que isso é intencional porque 'UTF-8 events don't auto-repeat on the host side'. Consequência: teclas mapeadas para VK não repetem (o host repete sozinho), mas teclas enviadas como UTF-8 repetem no ritmo do Android — comportamento inconsistente e potencialmente rápido demais para o host.

**Correção sugerida:** Documentar explicitamente; opcionalmente aplicar um throttle mínimo aos repeats UTF-8.

#### ⚪ baixo Combos locais Ctrl+Alt+Shift+Z/Q/C não são configuráveis e conflitam com atalhos de aplicativos no host

**Local:** `app/src/main/java/com/limelight/Game.java:1973` · **Categoria:** ux

`handleSpecialKeys` intercepta Ctrl+Alt+Shift+Z (toggle grab), +Q (finish/encerrar stream) e +C (toggle cursor) (linhas 1974-1991) e consome os eventos localmente. Não há preferência para desabilitá-los nem para remapeá-los; um jogo/app no host que use essas combinações nunca as recebe, e +Q encerra o stream sem confirmação.

**Correção sugerida:** Expor as combinações em res/xml/preferences.xml com opção de desativar, e pedir confirmação em +Q.

#### ⚪ baixo NV_UNICODE_PACKET declara text[32] mas o cliente envia blocos maiores — dependência de detalhe de implementação

**Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h:33` · **Categoria:** compatibility

`#define UTF8_TEXT_EVENT_MAX_COUNT 32` e `char text[UTF8_TEXT_EVENT_MAX_COUNT]` definem o struct como 32 bytes de texto. `LiSendUtf8TextEvent` (InputStream.c:1013) contorna isso alocando `malloc(sizeof(*holder) + length)` e escrevendo `memcpy(holder->packet.unicode.text, text, length)` além do array declarado — funciona porque a alocação é maior, mas é escrita fora dos limites do campo declarado (UB formal em C) e depende do host aceitar payloads > 32 bytes. Sunshine/Apollo aceitam; GFE não é garantido.

**Correção sugerida:** No cliente Java, manter blocos <= 32 bytes quando o host não for Sunshine (a informação está disponível via `MoonBridge`/AppVersion), ou pelo menos documentar a premissa. Ver também o finding de MAX_INPUT_PACKET_SIZE.


## Ideias de melhoria

### Corrigir o bug da fila de commitText (quick win que destrava o envio de texto em bloco)

**Tamanho:** quick-win

**Por quê:** Uma linha de código impede que qualquer texto maior que 512 bytes seja enviado, e envenena a fila de forma permanente. É pré-requisito de todo o resto do trabalho de texto.

**Como:** Em Game.java:4331, trocar `if (commitTextQueue.size() == 1)` por uma flag `commitFlushScheduled` gerenciada em conjunto com o Runnable `flushCommitTextQueue` (Game.java:317-331). Adicionar teste unitário (o projeto já tem robolectric.properties e app/src/test) cobrindo texto de 1 byte, 511, 512, 513 e 5000 bytes com caracteres multi-byte.

**Risco:** Praticamente nulo; muda apenas o agendamento.

### Soltar todas as teclas/modificadores pendentes ao perder foco, pausar ou esconder overlays

**Tamanho:** small

**Por quê:** Teclas presas no host (Alt, Shift, Ctrl, Win 'grudados') são um dos bugs mais reportados em clientes de streaming e afetam o PC inteiro, não só o jogo.

**Como:** Criar `Game.releaseAllHeldKeys()` que: (a) itera os bits de `modifierFlags` (Game.java:201) enviando KEY_UP dos VKs 0xA0/0xA2/0xA4/0x5B antes de zerar (Game.java:1408); (b) chama um novo `KeyBoardController.releaseAll()` percorrendo `getElements()` e disparando `onReleaseCallback()` nos KeyBoardDigitalButton pressionados/sticky; (c) chama um novo `KeyBoardLayoutController.releaseAll()` que percorre `modifierKeyStates` (KeyBoardLayoutController.java:84) enviando ACTION_UP. Invocar em `onWindowFocusChanged` (1403), `onPause` (1746), `onStop` (1761), `setInputGrabState(false)` (1864) e nos `hide()` dos dois controllers.

**Risco:** Baixo. Cuidado para não enviar KEY_UP após `conn` ser encerrado (checar `connected`).

### Deduplicar eventos de teclado com throttle nos analógicos/D-Pad virtuais

**Tamanho:** small

**Por quê:** Elimina um flood de até ~500 pacotes ENet RELIABLE por segundo que pode saturar a fila de entrada (MAX_QUEUED_INPUT_PACKETS = 150) e degradar a latência de TODO o teclado, inclusive o físico.

**Como:** Em KeyBoardAnalogStickButtonFree.java:118-120 (e no equivalente KeyBoardAnalogStickButton), manter `boolean[] lastStickBool` e só chamar `listener.onkeyEvent` na transição. Em KeyBoardControllerConfigurationLoader.createDiaitalPadButton (linhas 68-112), manter o último `direction` e emitir apenas o delta. Em keyAnalogStickFree.java:404-413, só disparar revoke na transição pressed->released.

**Risco:** Baixo; melhora comportamento e latência. Testar que não há tecla 'presa' quando o gesto termina fora do elemento (o revoke deve continuar sendo emitido no ACTION_UP/CANCEL).

### Corrigir a coerência entre forceQwerty e a flag SS_KBE_FLAG_NON_NORMALIZED, e restaurar o fallback por scancode

**Tamanho:** small

**Por quê:** Os dois bugs juntos fazem teclados físicos com layout não-US produzirem caracteres errados ou perderem teclas inteiras justamente nos aparelhos mais novos (API 33+), que é onde o mapeamento de layout existe.

**Como:** Em KeyboardTranslator.java, criar `public byte getKeyFlags(int keycode, int deviceId)` que devolve 0 apenas se `prefConfig.forceQwerty && hasNormalizedMapping(keycode, deviceId)`; usar em Game.java:2108-2109 e 2181-2182 no lugar da expressão ternária atual. Em KeyboardTranslator.java:412-423, tentar sempre `KeyMapper.getWindowsKeyCode(scancode)` antes de devolver 0.

**Risco:** Médio: altera o que o host recebe para teclados não-US. Precisa de teste com ABNT2, ISO-UK/DE/FR e com o host Apollo/Vibeshine. Recomenda-se um log de diagnóstico (LimeLog) durante a validação.

### Unificar as três cópias de InputConnection e remover StreamView (código morto)

**Tamanho:** small

**Por quê:** Reduz de 3 para 1 os lugares onde o pipeline de texto precisa ser corrigido; StreamView.java (167 linhas) não é referenciado por nada e induz futuros agentes ao erro de editar o arquivo errado.

**Como:** Deletar app/src/main/java/com/limelight/ui/StreamView.java (grep confirma zero referências em .java e .xml). Extrair a lógica compartilhada de StreamContainer.java:180-202 e ExternalControllerView.java:53-85 para uma classe utilitária ou uma interface default, garantindo o mesmo `requestFocus()` e os mesmos flags de EditorInfo nos dois.

**Risco:** Baixo; validar com uma compilação completa e com o fluxo de tela externa.

### Suporte a dead keys e composição de IME no caminho de tecla individual

**Tamanho:** medium

**Por quê:** Sem isso, usuários de teclado físico ABNT2/pt-BR, francês, alemão, espanhol etc. não conseguem digitar acentos no host — o caractere é descartado sem qualquer feedback.

**Como:** Em Game.handleKeyDown (Game.java:2093-2100): quando `(unicodeChar & KeyCharacterMap.COMBINING_ACCENT) != 0`, guardar `pendingDeadChar = unicodeChar & COMBINING_ACCENT_MASK` e consumir o evento; no próximo KeyEvent com unicodeChar válido, chamar `KeyCharacterMap.getDeadChar(pendingDeadChar, unicodeChar)` e enviar o resultado via `conn.sendUtf8Text`. Se getDeadChar devolver 0, enviar o acento e o caractere separadamente. Limpar `pendingDeadChar` em onWindowFocusChanged (1403) e após timeout. Complementarmente, sobrescrever `setComposingText`/`finishComposingText` no BaseInputConnection de StreamContainer.java:192 para acumular composição e enviar só no commit.

**Risco:** Estado adicional que pode ficar preso se o usuário trocar de janela no meio da composição — mitigado pelos resets. Pode conflitar com jogos que usam a tecla de acento como bind (expor preferência).

### Indicador de estado e feedback visual do teclado (modificadores ativos, texto em envio)

**Tamanho:** medium

**Por quê:** Hoje o usuário não tem nenhuma indicação de qual modificador está sticky, se o Caps Lock está ligado no host, ou se ainda há texto na fila de envio — o que amplifica a sensação de 'teclado que não funciona'.

**Como:** Reaproveitar o `notificationOverlayView` já existente (res/layout/activity_game.xml + Game.java:518, `displayTransientMessage`) ou criar um HUD pequeno: mostrar `modifierFlags` (Game.java:201) e `KeyBoardLayoutController.modifierKeyStates` (linha 84) como chips, e um contador de blocos pendentes em `commitTextQueue` (Game.java:314) durante a injeção de texto.

**Risco:** Baixo; apenas cuidar para não desenhar durante PiP (Game.java:1238-1239) nem impactar o overlay de performance.

### Reduzir a latência percebida do envio de texto usando o clipboard do host para blocos grandes

**Tamanho:** medium

**Por quê:** A 100 bytes/15 ms, um parágrafo de 2 KB leva ~300 ms e um documento leva segundos; o clipboard já sincronizado com o host entrega instantaneamente.

**Como:** No 'Enviar' da barra de texto, se `texto.length() > limiar` (ex.: 512 chars) e o host suportar clipboard (httpConn != null, Game.java:2339-2389): setar o ClipData local com o marcador CLIPBOARD_IDENTIFIER (Game.java:271), chamar o mesmo caminho de `sendClipboard` já usado em `handleFocusChange` (Game.java:2233-2243) e então `sendKeys(new short[]{KeyboardTranslator.VK_LCONTROL, KeyboardTranslator.VK_V})` (mesmo padrão de GameMenu.java:172). Oferecer como opção ('enviar via área de transferência').

**Risco:** Depende de o host aceitar o endpoint de clipboard e de o app em foco no host suportar Ctrl+V; deve ser opt-in com fallback automático para sendUtf8Text.

### Testes automatizados do pipeline de teclado

**Tamanho:** medium

**Por quê:** O subsistema tem múltiplos caminhos de entrada convergindo no mesmo código e vários bugs sutis (fila, flags, normalização) que só aparecem em runtime. O projeto já tem infraestrutura de teste (robolectric.properties, app/src/test).

**Como:** Testes de unidade para: (a) `KeyboardTranslator.translate` cobrindo todas as faixas, o switch, o fallback de scancode e o comportamento com/sem forceQwerty; (b) `enqueueCommitText` com tamanhos 0/1/99/100/101/5000 e caracteres de 1-4 bytes, verificando que a fila é drenada por completo; (c) a máquina de estados de `handleSpecialKeys` (combos e reentrada dupla); (d) `getModifierState(KeyEvent)` combinando metaState e modifierFlags. Instrumentar com um `NvConnection` fake que registre os pacotes.

**Risco:** Baixo; exige refatorar levemente Game.java para tornar as funções testáveis (extrair a fila de commitText para uma classe própria, ex.: `Utf8TextSender`).

### Migrar o teclado virtual próprio para layouts orientados a dados, com AltGr e localização

**Tamanho:** large

**Por quê:** O teclado embutido é hoje um XML de 874 linhas com rótulos fixos e sem acentos/AltGr/numpad — inutilizável para digitar em português. Tornar isso dado (como já é feito para o KeyBoardController via assets/config/keyboard.json) permite entregar layouts US/ABNT2/ISO sem tocar em código e permite o usuário customizar.

**Como:** Definir um esquema JSON (linhas -> teclas com `keycode`, `label`, `shiftLabel`, `altGrLabel`, `weight`, `sticky`) em assets/config/; reescrever `KeyBoardLayoutController.initKeyboard()` (linhas 120-259) para construir as views programaticamente a partir do JSON em vez de iterar `keyboardView.getChildAt` com tags; implementar camada AltGr (as teclas estão comentadas em layout_axixi_keyboard.xml:791-802) enviando VK_RMENU (0xA5); implementar auto-repeat com Handler.postDelayed; adicionar seletor de layout em res/xml/preferences.xml (perto de list_onscreen_keyboard_align_mode, linha 599).

**Risco:** Grande superfície de regressão no principal recurso diferenciado do fork; migrar mantendo o XML atual como layout 'legacy' selecionável, e preservar a compatibilidade das preferências existentes de altura/largura/alinhamento/opacidade.

### EPIC — Reflow do stream com os insets do IME (comportamento AnyDesk: teclado empurra a tela)

**Tamanho:** epic

**Por quê:** É a dor nº1 declarada do dono do fork. Hoje o teclado virtual cobre metade inferior do vídeo, escondendo justamente o campo onde ele está digitando no host. Todo o encanamento necessário já existe no repo: o padrão de insets está implementado em ExternalDisplayControlActivity, o SurfaceView já usa setFixedSize (o decoder não é reconfigurado ao redimensionar a View), o StreamContainer.onMeasure já recalcula o letterbox a partir do heightMeasureSpec, e o mapeamento de toque já normaliza contra as dimensões do streamContainer. É trabalho de janela/layout, não de vídeo.

**Como:** 1) AndroidManifest.xml:195 — adicionar `android:windowSoftInputMode="adjustResize"` à Activity .Game (configChanges já cobre screenSize|screenLayout, então não há recriação). 2) Game.java:357-369 — remover `FLAG_FULLSCREEN` e as `SYSTEM_UI_FLAG_*`; adicionar `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`. 3) Game.java:1645-1677 — reescrever `hideSystemUi` como `WindowInsetsControllerCompat(getWindow(), streamContainer)` com `hide(WindowInsetsCompat.Type.systemBars())` + `setSystemBarsBehavior(BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)`, NUNCA escondendo `Type.ime()`; guardar um campo `imeVisible` e fazer `hideSystemUi(int)` (1671) virar no-op enquanto `imeVisible == true`. 4) Game.java:3914-3928 — `onSystemUiVisibilityChange` deixa de re-agendar quando imeVisible (ou é substituído inteiramente pelo listener de insets). 5) Instalar em onCreate (perto de Game.java:466, onde `rootView` já é obtido) um `ViewCompat.setOnApplyWindowInsetsListener((View)rootView, (v, insets) -> { int imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom; applyImeInset(imeBottom); return insets; })` — copiando literalmente o padrão de ExternalDisplayControlActivity.java:169-176. 6) `applyImeInset(int px)`: setar `bottomMargin = px` no `FrameLayout.LayoutParams` do `streamContainer` e chamar `requestLayout()`. `StreamContainer.onMeasure` (StreamContainer.java:113-150) recalcula sozinho o letterbox por aspect ratio no espaço restante; `PanZoomHandler.handleSurfaceChange()` (PanZoomHandler.java:79-108) já é chamado por `Game.surfaceChanged` (3786) e reposiciona o pan/zoom. 7) Animação: em API 30+, usar `WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP)` para interpolar o bottomMargin junto com a animação do IME; abaixo disso aplicar direto. 8) Overlays: `keyBoardLayoutController`, `keyBoardController`, `floatingMenuButton` e `overlayToggleZoomButton` são irmãos do streamContainer no FrameLayout de conteúdo (Game.java:466 + res/layout/activity_game.xml <merge>) — decidir por elemento se acompanham o reflow (botões flutuantes: sim; teclado on-screen próprio: deve ficar por cima do espaço liberado, não empurrar de novo). 9) Preferência nova `checkbox_ime_push_stream` (res/xml/preferences.xml, perto da linha 479) com default ON, para permitir voltar ao overlay. 10) Modo alternativo 'translate-only' (não redimensiona, só sobe o vídeo com `setTranslationY(-min(imeBottom, folgaInferior))`) para quem prefere manter o tamanho do vídeo — é ainda mais barato porque nem dispara layout.

**Risco:** Alto acoplamento com o modelo de janela: remover FLAG_FULLSCREEN pode alterar o comportamento de notch (Game.java:439-453), de PiP (getPictureInPictureParams usa getLocationOnScreen do streamContainer, Game.java:1287-1331) e de multi-window (onMultiWindowModeChanged, 1679-1699). O `setFixedSize` (Game.java:900) precisa continuar ativo, senão o resize da View reconfigura o buffer e pode causar glitch/reinicialização do decoder em MTK. Redimensionar o SurfaceView durante o stream pode gerar um frame preto em alguns SoCs — mitigar preferindo o modo translate-only como default em devices problemáticos. Testar especificamente com renderMode != 2D (GLSurfaceView, StreamContainer.java:86-94) e na tela externa.

### EPIC — Barra de injeção de texto (digitar num campo e enviar o texto inteiro via sendUtf8Text)

**Tamanho:** epic

**Por quê:** Segunda dor declarada do dono do fork e a solução definitiva para dead keys/IME/acentos: num EditText real o Android faz composição, predição, autocorreção, ditado por voz e swipe nativamente, e o cliente só precisa enviar o resultado final. A camada de transporte já existe e está parcialmente pronta (enqueueCommitText + fila com chunking UTF-8 + sendUtf8Text); o que falta é UI, um bug de fila e polimento.

**Como:** 1) PRÉ-REQUISITO: corrigir o bug de Game.java:4331 (fila nunca drenada com 2+ blocos) e reduzir `UTF8_CHUNK_SIZE` (Game.java:313) de 512 para <= 100 bytes. 2) Criar `com.limelight.ui.TextInjectionBar` (ou `binding/input/TextInjectionController`) espelhando a arquitetura já validada de `KeyBoardLayoutController`: recebe o `FrameLayout` raiz (`rootView`, Game.java:466), infla um layout novo `res/layout/text_injection_bar.xml` (EditText multiline + botões Enviar / Enter / Limpar / Colar-do-clipboard / Fechar) e se ancora com `FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)` + `Gravity.BOTTOM` — exatamente como KeyBoardLayoutController.refreshLayout (linhas 321-357). 3) Entrada: novo `MenuOption` em GameMenu.java ao lado da linha 317 (`game::toggleKeyboard`), e opcionalmente um gesto (o slot de 3 dedos hoje chama toggleKeyboard, Game.java:3237/3318 — pode virar 'abre a barra de texto' se a preferência estiver ligada). 4) Ao abrir: `editText.requestFocus()` + `WindowInsetsControllerCompat.show(Type.ime())`; chamar `setInputGrabState(false)` (Game.java:1864) e `inputCaptureProvider.showCursor()` para liberar o pointer capture (ver finding correspondente) e suspender as recapturas de AndroidNativePointerCaptureProvider.java:88-109. Como o foco sai do `streamContainer`, `onKeyPreIme` (StreamContainer.java:161) deixa de interceptar e a digitação vai naturalmente para o EditText — nenhum guard extra é necessário no pipeline de teclado. 5) Ao 'Enviar': quebrar o texto em `\n`, e para cada segmento chamar `enqueueCommitText(segmento)` seguido de `conn.sendKeyboardInput((short)0x800D, KEY_DOWN/KEY_UP, getModifierState(), (byte)0)` (VK_RETURN) — `sendUtf8Text` não produz Enter na maioria dos hosts. Limpar o campo e manter o foco (opção 'manter aberto após enviar'). 6) Modo 'live' opcional: um TextWatcher que envia incrementalmente ao final de cada palavra, para quem quer ver o texto aparecer no host enquanto digita. 7) Para blocos muito grandes (> ~4 KB): oferecer o caminho de clipboard já existente — setar o clipboard local e chamar `sendClipboard` (Game.java:2288+) e depois enviar Ctrl+V via `sendKeys(new short[]{VK_LCONTROL, VK_V})` (padrão idêntico ao GameMenu.java:172), muito mais rápido que 100 bytes/15 ms. 8) Ligar `streamContainer.setCommitTextEnabled(true)` temporariamente não é necessário — o EditText é o editor. 9) Reaplicar `setInputGrabState(true)` ao fechar, e enviar KEY_UP dos modificadores pendentes.

**Risco:** Conflito de foco com pointer capture e com o `focusedByDefault` do streamContainer (res/layout/activity_game.xml) — precisa de teste com mouse/teclado físico conectados. Se o EPIC de reflow não estiver pronto, a barra ficará escondida atrás do IME (mitigável ancorando a barra pelos insets do IME, que é justamente o mesmo listener do EPIC 1 — os dois se apoiam mutuamente). Envio de texto grande pode estourar `MAX_QUEUED_INPUT_PACKETS = 150` (InputStream.c:46) se o chunking/throttle não for respeitado. Em tela externa é preciso duplicar a barra na ExternalDisplayControlActivity (que já tem o ExternalControllerView como raiz).


## Glossário

- KeyEvent (Android): evento de tecla do sistema. Campos relevantes aqui: `keyCode` (KEYCODE_* Android), `scanCode` (código evdev do Linux, usado no fallback de KeyboardTranslator.java:419), `deviceId` (<=0 para eventos sintéticos/virtuais), `metaState` (bits de modificador), `flags` (FLAG_VIRTUAL_HARD_KEY), `repeatCount` e `unicodeChar`.
- VK_* / Virtual-Key code: código de tecla do Windows (ex.: VK_ESCAPE = 0x1B, VK_LSHIFT = 0xA0). É o que o host Sunshine/Apollo espera. Tabela completa em app/src/main/java/com/limelight/utils/KeyMapper.java:750-937.
- KEY_PREFIX (0x80): byte alto adicionado pelo Moonlight ao VK antes de enviar — `(short)((0x80 << 8) | vk)` (KeyboardTranslator.java:27,425). Herança do GFE; Sunshine/Apollo mascara com `& 0x00FF` e o ignora.
- SS_KBE_FLAG_NON_NORMALIZED (0x01): extensão do protocolo Sunshine que informa ao host que o keyCode NÃO foi normalizado para US-QWERTY e deve ser interpretado como está (Limelight.h:711, MoonBridge.java:77, usado em Game.java:2109 e 2182).
- Normalização QWERTY / forceQwerty: remapear o keycode produzido pelo layout do teclado do usuário para a POSIÇÃO física equivalente num teclado US-QWERTY, via `InputDevice.getKeyCodeForKeyLocation()` (API 33+). Preferência `checkbox_force_qwerty`, default true (PreferenceConfiguration.java:194).
- modifierFlags (Game.java:201): bitmask GLOBAL de Shift/Ctrl/Alt/Meta mantido por `handleSpecialKeys()` (Game.java:1917-1922). Existe porque alguns IMEs não emitem KeyEvent real para Shift; é combinado com o metaState do evento em `getModifierState(KeyEvent)` (Game.java:2001-2018).
- Dead key / acento morto: tecla que não produz caractere sozinha (´ ` ~ ^ ¨) e compõe com a próxima. Sinalizada por `KeyCharacterMap.COMBINING_ACCENT` (bit 0x80000000) em `getUnicodeChar()`. O Artemis DESCARTA dead keys (Game.java:2093-2100).
- commitText: método do `InputConnection` pelo qual o IME entrega texto pronto (swipe typing, predição, ditado) em vez de teclas individuais. Interceptado em StreamContainer.java:194 -> Game.handleCommitText (Game.java:4290).
- BaseInputConnection em 'dummy mode': `new BaseInputConnection(view, false)` — conexão sem editor real; o Android sintetiza KeyEvent (inclusive ACTION_MULTIPLE com `getCharacters()`) a partir do texto. É o que faz `handleKeyMultiple` (Game.java:2193) funcionar mesmo com enableCommitText desligado.
- ACTION_MULTIPLE: ação de KeyEvent (formalmente deprecated desde a API 29, mas ainda emitida) que carrega uma String em `getCharacters()` quando não há keycode correspondente. Caminho de texto multi-caractere: Game.java:2202-2207.
- sendUtf8Text / LiSendUtf8TextEvent: primitivo do protocolo que envia uma string UTF-8 inteira ao host (magic 0x17, canal CTRL_CHANNEL_UTF8). NvConnection.java:619 -> simplejni.c:127 -> InputStream.c:1005. É a base do envio 'em bloco' desejado.
- LiSendKeyboardEvent2: primitivo do protocolo para tecla individual, com o parâmetro extra `flags` do Sunshine (InputStream.c:924). Monta o NV_KEYBOARD_PACKET com magic 0x03 (down) / 0x04 (up).
- CTRL_CHANNEL_KEYBOARD / CTRL_CHANNEL_UTF8: canais ENet distintos usados para pacotes de teclado e de texto; ambos com ENET_PACKET_FLAG_RELIABLE (InputStream.c:937-938, 1018-1019).
- encryptedControlStream: flag do moonlight-common-c ligada quando o host é >= 7.1.431 (Sunshine/Apollo sempre; GFE >= 3.22). Determina se o pacote vai via ENet criptografado (sem limite prático de tamanho) ou via socket legado com buffer de 128 bytes (InputStream.c:105, 241).
- MAX_INPUT_PACKET_SIZE (128): teto do buffer de pilha usado no caminho de criptografia legado do moonlight-common-c (InputStream.c:43). É a razão pela qual UTF8_CHUNK_SIZE = 512 (Game.java:313) é perigoso.
- StreamContainer: FrameLayout customizado que hospeda o SurfaceView (ou GLSurfaceView para 3D), faz o letterbox por aspect ratio no onMeasure e é o receptor real do foco de teclado/IME. Substituiu o antigo StreamView (que virou código morto).
- onKeyPreIme: callback de View invocado pelo ViewRootImpl ANTES de o evento ir ao IME. É o primeiro ponto de contato do teclado no Artemis (StreamContainer.java:161) e é o que permite roubar teclas que o IME consumiria (ex.: Shift+Space da Samsung).
- KeyBoardController: overlay de TECLAS ESPECIAIS AVULSAS (arrastáveis/redimensionáveis), gerado a partir de assets/config/keyboard.json. Menu: 'Toggle Special keys'. Preferência: checkbox_enable_keyboard.
- KeyBoardLayoutController: TECLADO QWERTY COMPLETO on-screen do fork, inflado de res/layout/layout_axixi_keyboard.xml (82 teclas). Menu: 'Toggle On-screen full keyboard'. É um OVERLAY (Gravity.BOTTOM) — sobrepõe o vídeo, não o empurra.
- keyBoardVirtualControllerElement: classe base (View) de todos os elementos do KeyBoardController; implementa os modos Active/MoveButtons/ResizeButtons/DisableEnableButtons e serializa posição/tamanho em JSON nas SharedPreferences.
- Sticky modifier: modificador do teclado virtual que fica travado após long-press de 300 ms, para permitir combos com um dedo. Estado em `KeyBoardLayoutController.modifierKeyStates` (BitSet) e em `KeyBoardDigitalButton.sticky`. Preferência: checkbox_enable_sticky_modifier_key_virtual_keyboard.
- setFixedSize (SurfaceHolder): fixa o tamanho do BUFFER da Surface independentemente do tamanho da View (Game.java:900, com prefConfig.width/height). Chave para o reflow: redimensionar a View não reconfigura o decoder, só muda o retângulo de composição.
- WindowInsets.Type.ime(): API moderna (API 30+) que reporta a altura ocupada pelo teclado do sistema. Usada hoje apenas em ExternalDisplayControlActivity.java:172; é a peça central do reflow estilo AnyDesk.
- adjustResize (windowSoftInputMode): modo em que o Android reduz a janela para caber acima do IME. Ausente na Activity .Game (AndroidManifest.xml:193) e, mesmo se declarado, ignorado enquanto FLAG_FULLSCREEN estiver ativo.
- IMMERSIVE_STICKY: modo de tela cheia legado que esconde as barras e as reexibe transitoriamente. Reaplicado a cada 2 s por `onSystemUiVisibilityChange` (Game.java:3914-3928); briga diretamente com o IME.
- grabbedInput / setInputGrabState: estado que determina se o cliente captura mouse+teclado para o stream ou os devolve ao Android (Game.java:1864-1890, 2077). Alternado pelo combo Ctrl+Alt+Shift+Z.
- ignoreSynthEvents: preferência que descarta eventos com deviceId <= 0 (Game.java:2036). Efeito colateral pouco óbvio: mata todos os teclados virtuais próprios e o AccessibilityService.
- KeyboardAccessibilityService: AccessibilityService com FLAG_REQUEST_FILTER_KEY_EVENTS que intercepta teclas do sistema (Home, Alt+Tab...) e as reinjeta em Game.handleKeyDown/Up, para que cheguem ao host em vez de serem consumidas pelo Android.
- evdev / EvdevCaptureProvider: caminho de captura de baixo nível disponível apenas em builds root (app/src/root/...), lendo /dev/input diretamente e traduzindo evdev -> keycode Android via EvdevTranslator antes de chamar Game.keyboardEvent().
- Apollo / Vibeshine: forks do Sunshine usados como host por este ecossistema; do ponto de vista do protocolo comportam-se como Sunshine (IS_SUNSHINE() true, AppVersion >= 7.1.431), o que habilita o campo `flags` do pacote de teclado e o control stream criptografado.
