# Entrada de Controle/Gamepad (com.limelight.binding.input.ControllerHandler + binding/input/driver/ + binding/input/virtual_controller/ [+ subpacote keyboard/])

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (23)
6. [Ideias de melhoria](#ideias-de-melhoria) (12)
7. [Glossário](#glossário)

## Como funciona

O subsistema de gamepad do Artemis tem tres origens de entrada que convergem num unico ponto de saida: `ControllerHandler.sendControllerInputPacket()` (ControllerHandler.java:1215), que chama `NvConnection.sendControllerInput()`. As tres origens sao: (1) InputDevices do Android (KeyEvent/MotionEvent entregues por Game.java:2066/2155/2770), (2) drivers USB proprios rodando em `UsbDriverService` (Xbox 360 wired, Xbox One/Series, Switch Pro Controller), e (3) o overlay virtual na tela (OSC classico em `virtual_controller/` e o overlay de teclado/mouse em `virtual_controller/keyboard/`). Cada dispositivo vira um `GenericControllerContext` (ControllerHandler.java:3031) — especializado em `InputDeviceContext` (:3118) para InputDevices e `UsbDeviceContext` (:3435) para drivers USB — guardado em dois `SparseArray` indexados por deviceId (:114-115), mais um `defaultContext` (:120) usado tanto por eventos com deviceId==0 quanto pelo OSC (via `reportOscState()` :2943). A deteccao de capacidades acontece em `createInputDeviceContextForDevice()` (:717): descobre eixos de stick (X/Y, Z/RZ, RX/RY), eixos de gatilho (LTRIGGER/RTRIGGER, BRAKE/GAS, BRAKE/THROTTLE, Z/RZ), hat (HAT_X/HAT_Y), touchpad (SOURCE_TOUCHPAD ranges), vibradores (VibratorManager com 2 ou 4 motores amplitude-controlled, ou Vibrator legado), sensores (InputDevice.getSensorManager() com fallback pro sensor do aparelho), LED RGB (LightsManager) e paddles/share via heuristica nativa do SDL (`MoonBridge.guessControllerHasPaddles/ShareButton`). Sobre isso ha uma camada grande de quirks por VID/PID e por nome em `handleRemapping()` (:1364): DualShock4 nao-padrao, Xbox One S BT antigo, Razer Serval, ASUS Gamepad/ADT-1, ROG Kunai, 8BitDo, Switch Pro/HORIPAD, e um fix especifico do fork para JoyCon esquerdo/direito (:1435-1481, atras de `prefConfig.enableJoyConFix`). A numeracao de controle (`assignControllerNumberIfNeeded()` :457) reserva bits em `currentControllers` (max 16 gamepads) quando `multiController` esta ligado, e propaga o numero para dispositivos "associados" (caso do touchpad do DS4 que aparece como InputDevice separado, :514-551). Rumble entra pelo host via `handleRumble()` (:2165) com tres estrategias em cascata (VibratorManager dual/quad -> API proprietaria do Shield via `SceManager` -> Vibrator unico com PWM emulado em `rumbleSingleVibrator()` :2108) e ainda um fallback de vibrar o proprio aparelho. Gyro/accel sao registrados sob demanda pelo host (`handleSetMotionEventState()` :2356) com correcao de orientacao quando se usa o sensor do aparelho (:2299-2331) e convertem rad/s -> deg/s. Bateria e reportada por polling de 2 minutos numa HandlerThread dedicada (:3191-3199) porque `getBatteryState()` pode causar ANR. O OSC classico (`VirtualController` :28) desenha `View`s filhas do FrameLayout raiz da Activity, com posicoes em pixels absolutos derivadas de uma grade 128x72 (`VirtualControllerConfigurationLoader.screenScale()` :29), persistidas como JSON em SharedPreferences "OSC". O overlay de teclado (`KeyBoardController`) e uma copia paralela quase inteira da mesma hierarquia, mas em vez de bits de gamepad ele injeta `KeyEvent`s sinteticos de volta em `Game.instance.onKey()` usando `KeyEvent.setSource()` com valores magicos (0=tecla, 1=mouse, 2=stick, 3=dpad) — um hack que abusa de um campo que deveria ser bitmask de `InputDevice.SOURCE_*`. Existe tambem um caminho ja pronto de envio de texto inteiro (`NvConnection.sendUtf8Text()` -> `MoonBridge.sendUtf8Text()`), usado hoje so pelo commitText do IME em Game.java:325/2206 com chunking UTF-8 seguro em `enqueueCommitText()` (Game.java:4314) — e a peca que falta para o requisito de "campo de texto que envia tudo de uma vez".

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/binding/input/ControllerHandler.java`](../../app/src/main/java/com/limelight/binding/input/ControllerHandler.java) | 3472 | Cerebro do subsistema. Traduz KeyEvent/MotionEvent do Android, estado dos drivers USB e estado do OSC num unico ControllerPacket enviado ao host. Tambem recebe callbacks do host (rumble, gyro/accel on/off, LED) e os roteia pro hardware certo. Contem toda a matriz de quirks por fabricante. |
| [`app/src/main/java/com/limelight/binding/input/driver/UsbDriverService.java`](../../app/src/main/java/com/limelight/binding/input/driver/UsbDriverService.java) | 366 | Service Android que enumera dispositivos USB, pede permissao ao usuario, decide se deve 'roubar' o dispositivo do kernel e instancia o driver certo. Faz de ponte (UsbDriverListener) entre os drivers e o ControllerHandler via Binder. |
| [`app/src/main/java/com/limelight/binding/input/driver/ProConController.java`](../../app/src/main/java/com/limelight/binding/input/driver/ProConController.java) | 485 | Driver USB completo do Nintendo Switch Pro Controller (VID 0x057e / PID 0x2009). Faz handshake, troca pra modo de report 0x30, liga IMU e vibracao, le calibracao de sticks da flash SPI e reporta gyro/accel. Unico driver do fork com suporte a movimento. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java) | 277 | Controlador do OSC (on-screen controller) classico de gamepad. Mantem a lista de elementos, os modos de configuracao (mover/redimensionar/habilitar), a persistencia do layout e o envio agregado de estado com retransmissoes anti-perda de pacote. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java) | 512 | Stick analogico 'flutuante' do OSC (ativado por prefConfig.enableNewAnalogStick): o centro do stick nasce onde o dedo toca, em vez de ficar fixo no centro do elemento. E a variante mais nova e a que concentra mais bugs de ciclo de vida do toque. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerConfigurationLoader.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerConfigurationLoader.java) | 449 | Define o layout padrao do OSC numa grade 128x72 (16:9), cria e conecta cada elemento aos bits de ControllerPacket, e faz save/load do perfil em SharedPreferences 'OSC'. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerElement.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerElement.java) | 360 | Classe base de todo elemento do OSC de gamepad: modos Normal/Move/Resize, desenho da borda de configuracao, opacidade e serializacao JSON (LEFT/TOP/WIDTH/HEIGHT/ENABLED) da posicao em pixels absolutos. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java) | 795 | Overlay de teclado/mouse na tela (prefConfig.enableKeyboard). Carrega assets/config/keyboard.json, oferece dialogo 'Add Keys' com posicionamento automatico sem sobreposicao, e injeta KeyEvents sinteticos de volta em Game.instance. Nao usa o caminho de gamepad. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java) | 590 | Equivalente do VirtualControllerConfigurationLoader para o overlay de teclado. Contem createCustomButton(), que envia uma SEQUENCIA de teclas (macro) com modificadores acumulados — o mecanismo mais proximo hoje de 'enviar texto inteiro'. |
| [`app/src/main/java/com/limelight/binding/input/driver/AbstractXboxController.java`](../../app/src/main/java/com/limelight/binding/input/driver/AbstractXboxController.java) | 183 | Base dos drivers Xbox USB: claim das interfaces, descoberta de endpoints IN/OUT, thread de leitura com heuristica de deteccao de erro de I/O, e release das interfaces no stop (para o kernel reassumir o controle). |
| [`app/src/main/java/com/limelight/binding/input/driver/XboxOneController.java`](../../app/src/main/java/com/limelight/binding/input/driver/XboxOneController.java) | 239 | Driver do protocolo GIP (Xbox One/Series) por USB, incluindo tabela de pacotes de init por VID/PID, ACK dos mode reports do Xbox One S e rumble com 4 motores (incl. gatilhos). |
| [`app/src/main/java/com/limelight/binding/input/driver/Xbox360Controller.java`](../../app/src/main/java/com/limelight/binding/input/driver/Xbox360Controller.java) | 167 | Driver do protocolo XInput wired (subclass 93 / protocol 1), com lista extensa de VIDs suportados e LED de player. |
| [`app/src/main/java/com/limelight/binding/input/driver/Xbox360WirelessDongle.java`](../../app/src/main/java/com/limelight/binding/input/driver/Xbox360WirelessDongle.java) | 148 | Caso especial: nao e um driver de verdade. So acende o LED de player correto em cada interface do dongle wireless e depois retorna false de start() para devolver o dispositivo ao xpad do kernel. |
| [`app/src/main/java/com/limelight/binding/input/driver/AbstractController.java`](../../app/src/main/java/com/limelight/binding/input/driver/AbstractController.java) | 87 | Contrato comum dos drivers USB: estado de botoes/eixos/gyro/accel, tipo (LI_CTYPE_*), capabilities (LI_CCAP_*) e os callbacks reportInput()/reportMotion() para o UsbDriverListener. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java) | 267 | Botao digital do OSC. Implementa o 'slide entre botoes' (checkMovement/layer), long-click e o desenho por skin (oficial vs icones). Faz leitura de SharedPreferences dentro do onDraw. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalPad.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalPad.java) | 316 | D-pad do OSC com 8 direcoes. Na skin nao-oficial rotaciona drawables em tempo de desenho gerando Bitmaps por frame. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyBoardVirtualControllerElement.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyBoardVirtualControllerElement.java) | 438 | Classe base dos elementos do overlay de teclado. Diferente da base do gamepad, tem flag 'hidden' alem de 'enabled' e integra o LayoutSnappingHelper (snap/espacamento/auto-resize) durante o modo de mover. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButton.java) | 154 | Converte movimento de stick virtual em teclas WASD-like usando 8 setores angulares (tan(pi/8) e tan(3pi/8)) e uma zona morta circular de raio 10000. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/LayoutSnappingHelper.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/LayoutSnappingHelper.java) | 157 | Utilitario de UX do editor de layout do overlay de teclado: snap de bordas (10px), ajuste de espacamento minimo (4px) e igualar tamanho quando ha 50%+ de sobreposicao. |
| [`app/src/main/java/com/limelight/binding/input/GameInputDevice.java`](../../app/src/main/java/com/limelight/binding/input/GameInputDevice.java) | 19 | Interface minima que permite um contexto de controle contribuir com itens no menu do jogo (usada pelo toggle de emulacao de mouse via Start segurado). |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/binding/input/ControllerHandler.java`**
- `ANDROID_TO_LI_BUTTON_MAP :77`
- `ControllerHandler(Activity,NvConnection,GameGestures,PreferenceConfiguration) :136`
- `isGameControllerDevice() :332`
- `getAttachedControllerMask() :368`
- `releaseControllerNumber() :411`
- `assignControllerNumberIfNeeded() :457`
- `createUsbDeviceContextForDevice() :571`
- `isExternal() :614`
- `shouldIgnoreBack() :658`
- `createInputDeviceContextForDevice() :717`
- `getContextForEvent() :1018`
- `getActiveControllerMask() :1076`
- `sendControllerBatteryPacket() :1099`
- `sendControllerInputPacket() :1215`
- `handleRemapping() :1364`
- `handleFlipFaceButtons() :1652`
- `handleDeadZone() :1673`
- `handleAxisSet() :1700`
- `sendTouchpadEventForPointer() :1787`
- `tryHandleTouchpadEvent() :1799`
- `handleMotionEvent() :1920`
- `convertRawStickAxisToPixelMovement() :1956`
- `rumbleDualVibrators() :2014`
- `rumbleQuadVibrators() :2071`
- `rumbleSingleVibrator() :2108`
- `handleRumble() :2165`
- `handleRumbleTriggers() :2241`
- `createSensorListener() :2272`
- `handleSetMotionEventState() :2356`
- `handleSetControllerLED() :2426`
- `handleButtonUp() :2461`
- `handleButtonDown() :2708`
- `reportOscState() :2943`
- `reportControllerState() :2962`
- `reportControllerMotion() :3001`
- `deviceRemoved() :3011`
- `deviceAdded() :3022`
- `class GenericControllerContext :3031`
- `mouseEmulationRunnable :3061`
- `toggleMouseEmulation() :3099`
- `class InputDeviceContext :3118`
- `batteryStateUpdateRunnable :3191`
- `enableSensorRunnable :3201`
- `InputDeviceContext.sendControllerArrival() :3244`
- `InputDeviceContext.migrateContext() :3373`
- `InputDeviceContext.disableSensors() :3407`
- `class UsbDeviceContext :3435`
- `UsbDeviceContext.sendControllerArrival() :3446`

**`app/src/main/java/com/limelight/binding/input/driver/UsbDriverService.java`**
- `ACTION_USB_PERMISSION :29`
- `class UsbEventReceiver :81`
- `class UsbDriverBinder :122`
- `handleUsbDeviceState() :147`
- `isRecognizedInputDevice() :224`
- `kernelSupportsXboxOne() :243`
- `kernelSupportsXbox360W() :267`
- `shouldClaimDevice() :288`
- `start() :298`
- `stop() :325`
- `interface UsbDriverStateListener :362`

**`app/src/main/java/com/limelight/binding/input/driver/ProConController.java`**
- `canClaimDevice() :45`
- `createInputThread() :57`
- `sendCommand() :119`
- `sendSubcommand() :144`
- `handshake() :180`
- `setInputReportMode() :192`
- `setPlayerLED() :197`
- `enableIMU() :202`
- `enableVibration() :207`
- `start() :212`
- `stop() :242`
- `rumble() :263`
- `handleRead() :295`
- `spiFlashRead() :346`
- `loadStickCalibration() :374`
- `applyStickCalibration() :462`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java`**
- `class ControllerInputContext :29`
- `enum ControllerMode :40`
- `delayedRetransmitRunnable :53`
- `refreshLayout() :198`
- `addElement() :180`
- `sendControllerInputContextInternal() :224`
- `sendControllerInputContext(long,int) :244`
- `switchShowHide() :142`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java`**
- `interface AnalogStickListener :48`
- `enum STICK_STATE :78`
- `onSizeChanged() :226`
- `onElementDraw() :237`
- `setBgOpacity() :312`
- `updatePosition() :324`
- `onElementTouchEvent() :351`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerConfigurationLoader.java`**
- `screenScale() :29`
- `createDigitalPad() :33`
- `createDigitalButton() :76`
- `createLeftTrigger() :123`
- `createLeftStick2() :163`
- `createDefaultLayout() :210`
- `saveProfile() :414`
- `loadFromPreferences() :430`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerElement.java`**
- `EID_DPAD..EID_TOUCHPAD :25-41`
- `moveElement() :78`
- `resizeElement() :92`
- `onDraw() :109`
- `getDefaultColor() :170`
- `onTouchEvent() :237`
- `setOpacity() :319`
- `getConfiguration() :336`
- `loadConfiguration() :349`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java`**
- `sendKeyEvent() :366`
- `sendMouseMove() :382`
- `vibrate() :389`
- `showKeySelectionDialog() :414`
- `findNonOverlappingPosition() :703`
- `findPositionNextToExisting() :714`
- `isPositionFree() :736`
- `refreshLayout() :316`
- `toggleVisibility() :273`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java`**
- `MODIFIER_KEY_CODES :42`
- `isModifierKey() :55`
- `screenScale() :60`
- `createDiaitalPadButton() :68`
- `createKeyBoardAnalogStickButton() :115`
- `createDigitalButton() :147`
- `createCustomButton() :219`
- `createDigitalTouchButton() :308`
- `createDefaultLayout() :351`
- `saveProfile() :552`
- `loadFromPreferences() :569`

**`app/src/main/java/com/limelight/binding/input/driver/AbstractXboxController.java`**
- `AbstractXboxController(...) :26`
- `createInputThread() :40`
- `start() :99`
- `stop() :148`
- `handleRead() abstract :181`
- `doInit() abstract :182`

**`app/src/main/java/com/limelight/binding/input/driver/XboxOneController.java`**
- `SUPPORTED_VENDORS :19`
- `INIT_PKTS :43`
- `processButtons() :74`
- `ackModeReport() :107`
- `handleRead() :113`
- `canClaimDevice() :149`
- `doInit() :170`
- `sendRumblePacket() :198`
- `rumbleTriggers() :221`

**`app/src/main/java/com/limelight/binding/input/driver/Xbox360Controller.java`**
- `SUPPORTED_VENDORS :16`
- `canClaimDevice() :47`
- `handleRead() :75`
- `sendLedCommand() :129`
- `doInit() :142`
- `rumble() :151`

**`app/src/main/java/com/limelight/binding/input/driver/Xbox360WirelessDongle.java`**
- `canClaimDevice() :26`
- `sendLedCommandToInterface() :67`
- `start() :88 (retorna false de proposito)`
- `stop() :135`

**`app/src/main/java/com/limelight/binding/input/driver/AbstractController.java`**
- `setButtonFlag() :46`
- `reportInput() :54`
- `reportMotion() :60`
- `getSupportedButtonFlags() :34`
- `rumble() abstract :76`
- `rumbleTriggers() abstract :78`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java`**
- `interface DigitalButtonListener :28`
- `inRange() :65`
- `checkMovement() :70`
- `checkMovementForAllButtons() :113`
- `onElementDraw() :145`
- `onClickCallback() :199`
- `onElementTouchEvent() :229`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalPad.java`**
- `DIGITAL_PAD_DIRECTION_* :26-31`
- `onElementDraw() :48`
- `rotateDrawable() :250`
- `newDirectionCallback() :264`
- `onElementTouchEvent() :274`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyBoardVirtualControllerElement.java`**
- `moveElement() :83`
- `checkAndApplyResize() :138`
- `onDraw() :165`
- `onTouchEvent() :293`
- `getConfiguration() :396`
- `loadConfiguration() :410`
- `actionDisableEnableButton() :429`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButton.java`**
- `MIN_CIRCLE_R :8`
- `stickSender :16`
- `onMovement() :34`
- `onRevoke() :134`
- `interface KeyBoardAnalogStickListener :151`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/LayoutSnappingHelper.java`**
- `SNAP_THRESHOLD :7`
- `class SnapResult :12`
- `isOverlapping() :32`
- `hasParallelEdges() :59`
- `calculateSnappedPosition() :73`

**`app/src/main/java/com/limelight/binding/input/GameInputDevice.java`**
- `getGameMenuOptions() :18`

</details>

## Fluxo

CAMINHO A - GAMEPAD FISICO (InputDevice do Android): O evento chega em Game.java:2066 (`dispatchKeyEvent`/`onKeyDown` -> `controllerHandler.handleButtonDown`) ou Game.java:2770 (`onGenericMotionEvent` -> `handleMotionEvent`). 1) `getContextForEvent()` (ControllerHandler.java:1018) resolve/cria o `InputDeviceContext`; deviceId==0 cai no `defaultContext`. 2) Para teclas, `handleRemapping()` (:1364) aplica os quirks por VID/PID e scancode e devolve o keycode final, REMAP_IGNORE(-1) ou REMAP_CONSUME(-2). 3) Se `prefConfig.flipFaceButtons`, `handleFlipFaceButtons()` (:1652) troca A<->B e X<->Y. 4) O switch gigante em :2723-2878 (down) / :2496-2656 (up) seta/limpa bits em `context.inputMap`; gatilhos digitais (L2/R2) sao suprimidos se `leftTriggerAxisUsed` (:2837). 5) Combos emulados: Start+LB vira Select se `!hasSelect` (:2888), Start+Select ou Start+RB vira Guide se `!hasMode` (:2914), Select+LB vira clickpad se `needsClickpadEmulation` (:2899), e Start+Back+LB+RB arma `pendingExit` (:2881) que fecha a Activity no release (:2700). 6) Para eixos, `handleMotionEvent()` (:1920) le os eixos configurados no contexto e chama `handleAxisSet()` (:1700), que aplica `handleDeadZone()` (:1673) — deadzone normal OU anti-deadzone quando o valor e negativo — escala pra +-0x7FFE, converte gatilho com `triggersIdleNegative` (:1732) e mapeia hat pra bits de D-pad. 7) Ambos convergem em `sendControllerInputPacket()` (:1215), que primeiro chama `assignControllerNumberIfNeeded()` (:457) e depois AGREGA todos os contextos com o mesmo `controllerNumber` (:1231-1267) antes de chamar `conn.sendControllerInput()` (:1351) — ou, se `mouseEmulationActive`, converte tudo em eventos de mouse (:1269-1349).

CAMINHO B - DRIVER USB PROPRIO: `Game.java:3709` faz bindService de `UsbDriverService`; `UsbDriverBinder.setListener(controllerHandler)` (UsbDriverService.java:123) registra o handler. `UsbDriverService.start()` (:298) enumera `usbManager.getDeviceList()` e chama `handleUsbDeviceState()` (:147), que consulta `shouldClaimDevice()` (:288) — que por sua vez cruza `canClaimDevice()` de cada driver com `isRecognizedInputDevice()` (:224) e heuristicas de versao de kernel (:243/:267) para nao competir com o xpad/hid-nintendo. Pede permissao USB via PendingIntent mutavel (:176), abre a conexao e instancia XboxOneController / Xbox360Controller / Xbox360WirelessDongle / ProConController (:196-207). Cada driver sobe uma thread propria: `AbstractXboxController.createInputThread()` (:40) ou `ProConController.createInputThread()` (:57). A thread espera 1s (para o InputDevice antigo sumir), chama `notifyDeviceAdded()` -> `ControllerHandler.deviceAdded()` (:3022) -> cria `UsbDeviceContext` (:571), e entao faz `bulkTransfer` em loop; cada leitura valida vai pra `handleRead()` -> `reportInput()` -> `ControllerHandler.reportControllerState()` (:2962), que aplica deadzone e cai no mesmo `sendControllerInputPacket()`. ProCon adicionalmente chama `reportMotion()` -> `reportControllerMotion()` (:3001) -> `conn.sendControllerMotionEvent()`.

CAMINHO C - OSC DE GAMEPAD: `Game.initVirtualController()` (Game.java:1101) cria `VirtualController` sobre o FrameLayout raiz. `refreshLayout()` (VirtualController.java:198) chama `createDefaultLayout()` (VirtualControllerConfigurationLoader.java:210) e depois `loadFromPreferences()` (:430). Cada elemento (DigitalButton/DigitalPad/AnalogStick/AnalogStickFree) recebe um listener anonimo que muta `VirtualController.inputContext` e chama `sendControllerInputContext()` (VirtualController.java:244), que repassa a `ControllerHandler.reportOscState()` (:2943) — este escreve direto no `defaultContext` e envia. O OSC tambem agenda 3 retransmissoes (25/50/75ms, VirtualController.java:269-271) como hack contra descarte de pacotes do GFE.

CAMINHO D - OVERLAY DE TECLADO: `Game.initKeyboardController()` (Game.java:1091) cria `KeyBoardController`. Os elementos NAO usam ControllerPacket: eles constroem `KeyEvent`s sinteticos e chamam `KeyBoardController.sendKeyEvent()` (KeyBoardController.java:366), que faz dispatch conforme `keyEvent.getSource()` (magic: 1 = `Game.instance.mouseButtonEvent`, resto = `Game.instance.onKey` -> `handleKeyDown/Up` -> `conn.sendKeyboardInput`). Botoes customizados (`createCustomButton`, KeyBoardControllerConfigurationLoader.java:219) contornam esse caminho e chamam `conn.sendKeyboardInput()` diretamente, acumulando modificadores em ordem no down e desfazendo em ordem reversa no up.

CAMINHO E - HOST -> CLIENTE (feedback): callbacks nativos chegam em Game.java:3751/3759/3770/3775 e viram `handleRumble()` (:2165), `handleRumbleTriggers()` (:2241), `handleSetMotionEventState()` (:2356) e `handleSetControllerLED()` (:2426). `handleRumble` percorre `inputDeviceContexts` e depois `usbDeviceContexts`, tentando VibratorManager quad -> dual -> SceManager (Shield) -> Vibrator unico; se nada casou e o OSC esta ativo, vibra o aparelho (:2221). `handleSetMotionEventState` registra/desregistra `SensorEventListener`s criados em `createSensorListener()` (:2272), com correcao de eixo por rotacao de tela quando o SensorManager e o do aparelho (:2299).

ANUNCIO DE CAPACIDADES: na primeira vez que um contexto recebe numero, `sendControllerArrival()` e chamado (:568). Para InputDevice (:3244) monta `supportedButtonFlags` varrendo `ANDROID_TO_LI_BUTTON_MAP` com `inputDevice.hasKeys()`, soma paddles/share/hat, e monta `capabilities` (RUMBLE/TRIGGER_RUMBLE/BATTERY/RGB/ANALOG_TRIGGERS/ACCEL/GYRO/TOUCHPAD); se o gamepad nao e PlayStation mas tem sensores, o tipo reportado vira LI_CTYPE_UNKNOWN e liga `needsClickpadEmulation` (:3330-3337). Para USB (:3446) usa `device.getType()`/`getCapabilities()`/`getSupportedButtonFlags()`.

## Interfaces externas

- android.view.InputDevice / InputDevice.MotionRange / InputDevice.getSensorManager() / getVibratorManager() / getLightsManager() / getBatteryState() / hasKeys() / isExternal() — deteccao de capacidades em ControllerHandler.java:717-1015
- android.hardware.input.InputManager.InputDeviceListener — hot-plug de gamepads (ControllerHandler.java:212, 232-269)
- android.view.KeyEvent / MotionEvent (SOURCE_JOYSTICK, SOURCE_GAMEPAD, SOURCE_TOUCHPAD, AXIS_*, ACTION_*) — ControllerHandler.java:1920, 1799
- android.os.VibratorManager + CombinedVibration.ParallelCombination + VibrationEffect + VibrationAttributes (API 31+) — rumble dual/quad em ControllerHandler.java:2014-2106
- android.os.Vibrator + AudioAttributes (pre-Tiramisu) com PWM manual — ControllerHandler.java:2108-2163
- android.hardware.SensorManager / Sensor.TYPE_ACCELEROMETER / TYPE_GYROSCOPE / SensorEventListener — ControllerHandler.java:2272-2424
- android.hardware.lights.LightsManager / Light.hasRgbControl() / LightState / LightsRequest (API 31+) — ControllerHandler.java:2426-2459
- android.hardware.BatteryState (API 31+) — ControllerHandler.java:1099-1213
- android.hardware.usb.UsbManager / UsbDevice / UsbDeviceConnection / UsbInterface / UsbEndpoint / bulkTransfer — todos os drivers em binding/input/driver/
- android.app.PendingIntent com FLAG_MUTABLE + BroadcastReceiver RECEIVER_NOT_EXPORTED para permissao USB — UsbDriverService.java:159-176, 309-313
- Protocolo XInput wired (interface class VENDOR_SPEC, subclass 93, protocol 1) — Xbox360Controller.java:13-14
- Protocolo GIP Xbox One (subclass 71, protocol 208) com pacotes de init por VID/PID e ACK de mode report 0x30 — XboxOneController.java:16-61, 107
- Protocolo Nintendo Switch HID por USB: comandos 0x80 0x02/0x03/0x04 (handshake/highspeed/forceUSB), subcomandos 0x03 (input report mode 0x30), 0x30 (player LED), 0x40 (IMU), 0x48 (vibration), 0x10 (SPI flash read) — ProConController.java:119-210, 346
- Leitura de calibracao de sticks da flash SPI do ProCon (offsets 0x603D/0x6046 fabrica, 0x8010/0x801B usuario com magic 0xB2 0xA1) — ProConController.java:23-33, 364-460
- com.limelight.nvstream.jni.MoonBridge (JNI): sendControllerInput, sendControllerArrivalEvent, sendControllerBatteryEvent, sendControllerMotionEvent, sendControllerTouchEvent, sendKeyboardInput, sendUtf8Text, guessControllerType, guessControllerHasPaddles, guessControllerHasShareButton (delegam ao moonlight-common-c/SDL)
- Constantes de protocolo LI_CTYPE_* / LI_CCAP_* / LI_MOTION_TYPE_* / LI_BATTERY_STATE_* — MoonBridge.java:101-125
- org.cgutman.shieldcontrollerextensions (SceManager/SceConnectionType/SceChargingState), dependencia Maven com.github.cgutman:ShieldControllerExtensions:1.0.1 — rumble e bateria proprietarios do NVIDIA Shield
- com.limelight.nvstream.input.ControllerPacket (bitflags A/B/X/Y/UP/DOWN/LEFT/RIGHT/LB/RB/LS_CLK/RS_CLK/PLAY/BACK/SPECIAL/MISC/TOUCHPAD/PADDLE1-4)
- com.limelight.nvstream.input.KeyboardPacket.KEY_DOWN/KEY_UP — usado pelos botoes customizados do overlay de teclado
- assets/config/keyboard.json — fonte de verdade do layout do overlay de teclado (arrays keystroke/mouse/rocker/dpad)
- SharedPreferences: 'OSC' (layout do gamepad virtual), 'keyboard_axi_list'/'OSC_Keyboard' (layout do teclado virtual), GameMenu.PREF_NAME (atalhos customizados)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🟠 alto | bug | Gamepads dos drivers USB anunciam supportedButtonFlags = 0 ao host | `app/src/main/java/com/limelight/binding/input/driver/AbstractXboxController.java:32` |
| 🟠 alto | bug | AnalogStickFree e keyAnalogStickFree nao tratam ACTION_CANCEL: stick trava pressionado | `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:372` |
| 🟠 alto | performance | PreferenceConfiguration.readPreferences() e chamado dentro de onDraw() de elementos do OSC | `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java:162` |
| 🟠 alto | performance | DigitalPad.rotateDrawable() aloca dois Bitmaps e um Canvas por frame desenhado | `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalPad.java:250` |
| 🟠 alto | performance | Overlay de stick-para-teclado dispara 4 KeyEvents por amostra de toque, sem deteccao de mudanca | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButton.java:118` |
| 🟠 alto | performance | VirtualController le SharedPreferences a cada evento de entrada do OSC | `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java:249` |
| 🟡 médio | bug | Agregacao multi-dispositivo usa \|= em vez de = e corrompe gatilhos e sticks | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:1237` |
| 🟡 médio | bug | Sticks 'Free' misturam System.currentTimeMillis() com MotionEvent.getEventTime(): liberacao de deadzone por tempo nunca funciona | `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:391` |
| 🟡 médio | bug | AnalogStickFree calcula raio/angulo com o centro de toque anterior no ACTION_DOWN | `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:356` |
| 🟡 médio | bug | ProConController.rumble(): precedencia de operadores mascara a amplitude do motor de baixa frequencia | `app/src/main/java/com/limelight/binding/input/driver/ProConController.java:272` |
| 🟡 médio | bug | ProConController.stop() nao libera as interfaces USB reivindicadas | `app/src/main/java/com/limelight/binding/input/driver/ProConController.java:253` |
| 🟡 médio | bug | Botoes e teclas ficam travados no host quando o OSC e escondido com um toque ativo | `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java:128` |
| 🟡 médio | performance | handleButtonUp faz Thread.sleep() no thread de UI | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:2479` |
| 🟡 médio | bug | O gamepad do OSC sempre reivindica o bit 0 da mascara de controles ativos, podendo colidir com um gamepad fisico | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:402` |
| 🟡 médio | tech-debt | ProCon: constantes de calibracao de IMU declaradas mas nunca usadas — gyro/accel sem calibracao de fabrica | `app/src/main/java/com/limelight/binding/input/driver/ProConController.java:23` |
| 🟡 médio | maintainability | Duas hierarquias de overlay quase identicas (virtual_controller vs virtual_controller.keyboard) | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyAnalogStick.java:1` |
| 🟡 médio | maintainability | Overlay de teclado depende do singleton estatico Game.instance | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java:366` |
| 🟡 médio | maintainability | Uso de KeyEvent.setSource() com valores magicos 0/1/2/3 como canal de roteamento | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java:371` |
| 🟡 médio | compatibility | Layout do OSC usa margens absolutas em pixels derivadas de DisplayMetrics de tela cheia | `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerConfigurationLoader.java:212` |
| ⚪ baixo | bug | KeyBoardTouchPadButton oculta o campo pressedColor do pai, anulando o ajuste de opacidade | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardTouchPadButton.java:143` |
| ⚪ baixo | bug | handleSetMotionEventState so configura o primeiro contexto com o controllerNumber pedido | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:2364` |
| ⚪ baixo | bug | hasGameController nunca volta a false apos desconexao do gamepad | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:130` |
| ⚪ baixo | tech-debt | Xbox360WirelessDongle emite deviceRemoved sem ter emitido deviceAdded e deixa imports mortos | `app/src/main/java/com/limelight/binding/input/driver/Xbox360WirelessDongle.java:130` |

### Detalhe

#### 🟠 alto Gamepads dos drivers USB anunciam supportedButtonFlags = 0 ao host

**Local:** `app/src/main/java/com/limelight/binding/input/driver/AbstractXboxController.java:32` · **Categoria:** bug

O construtor atribui a mascara completa de botoes a `this.buttonFlags` (o estado ATUAL de botoes pressionados) em vez de `this.supportedButtonFlags`. Consequencias: (1) `AbstractController.getSupportedButtonFlags()` (AbstractController.java:34-36) devolve 0, e `UsbDeviceContext.sendControllerArrival()` (ControllerHandler.java:3468-3469) informa ao Apollo/Sunshine que o gamepad nao suporta nenhum botao — o host pode entao expor um gamepad virtual capado; (2) entre `notifyDeviceAdded()` (AbstractXboxController.java:55) e o primeiro `handleRead()`, o driver considera 15 botoes simultaneamente pressionados. `ProConController` (ProConController.java:49-55) tambem nunca escreve `supportedButtonFlags`, ficando em 0.

**Correção sugerida:** Trocar `this.buttonFlags =` por `this.supportedButtonFlags =` em AbstractXboxController.java:32 e adicionar a mascara equivalente (A/B/X/Y/DPAD/LB/RB/LS_CLK/RS_CLK/BACK/PLAY/SPECIAL/MISC) ao construtor de ProConController.java:49. Adicionar um teste unitario que instancia cada driver e assegura getSupportedButtonFlags() != 0 e buttonFlags == 0.

#### 🟠 alto AnalogStickFree e keyAnalogStickFree nao tratam ACTION_CANCEL: stick trava pressionado

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:372` · **Categoria:** bug

O switch de `onElementTouchEvent` cobre ACTION_DOWN/POINTER_DOWN, ACTION_MOVE e ACTION_UP/POINTER_UP, mas nao ACTION_CANCEL. Como `VirtualControllerElement.onTouchEvent` (VirtualControllerElement.java:237-299) nunca chama `super.onTouchEvent()`, o estado `pressed` do View nao e limpo pelo framework. Se o gesto for cancelado (IME abrindo, PiP, dialogo, ViewGroup pai interceptando o toque), `bIsFingerOnScreen` fica true, `isPressed()` fica true e o bloco final (:429) segue chamando `updatePosition()` — o stick fica gravado no ultimo valor ate o proximo toque. O mesmo defeito existe em keyboard/keyAnalogStickFree.java:390. A variante classica AnalogStick.java:327 trata ACTION_CANCEL corretamente, o que confirma que e regressao da variante 'Free'.

**Correção sugerida:** Adicionar `case MotionEvent.ACTION_CANCEL:` junto ao bloco ACTION_UP em AnalogStickFree.java:419 e keyAnalogStickFree.java:394, forcando `setPressed(false); bIsFingerOnScreen = false;` independentemente do pointerId.

#### 🟠 alto PreferenceConfiguration.readPreferences() e chamado dentro de onDraw() de elementos do OSC

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java:162` · **Categoria:** performance

`DigitalButton.onElementDraw()` chama `PreferenceConfiguration.readPreferences(getContext())` em ate 3 pontos (linhas 162, 165, 175); `DigitalPad.onElementDraw()` chama 2 vezes (DigitalPad.java:56-57); `keyboard/KeyBoardDigitalButton.onElementDraw()` 1 vez (linha 168). Cada chamada aloca um wrapper `OverlaySharedPreferences` (ProfilesManager.java:200-207) e executa 123 leituras `prefs.get*` (PreferenceConfiguration.java:712 em diante). Com o layout padrao (~14 elementos de gamepad, e dezenas no overlay de teclado) isso significa milhares de lookups em SharedPreferences por frame, no thread de UI, durante o gameplay — jank direto na experiencia que o dono do fork ja considera ruim.

**Correção sugerida:** Ler a config uma vez no construtor do elemento (como ja e feito em KeyBoardTouchPadButton.java:126) ou, melhor, passar a `PreferenceConfiguration` ja carregada de VirtualControllerConfigurationLoader.createDefaultLayout() (VirtualControllerConfigurationLoader.java:213) para cada elemento, e invalidar via um metodo `applyPreferences(PreferenceConfiguration)` chamado por refreshLayout().

#### 🟠 alto DigitalPad.rotateDrawable() aloca dois Bitmaps e um Canvas por frame desenhado

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalPad.java:250` · **Categoria:** performance

`rotateDrawable()` cria `Bitmap.createBitmap(...)`, um `Canvas`, uma `Matrix` e um segundo `Bitmap` rotacionado, e e chamado de dentro de `onElementDraw()` nas linhas 89, 97, 105, 113, 128 e 136 sempre que a direcao do D-pad nao for a neutra. Alem disso `getResources().getDrawable(id)` (API depreciada) e chamado em todos os ramos. Enquanto o dedo desliza no D-pad ha invalidate() a cada ACTION_MOVE (DigitalPad.java:294), logo essa alocacao acontece na cadencia do touch (60-240 Hz), gerando pressao de GC durante o jogo.

**Correção sugerida:** Pre-rotacionar os 8 drawables uma unica vez em onSizeChanged() e guardar num array indexado pela bitmask de direcao; ou substituir a rotacao por `canvas.save(); canvas.rotate(angle, cx, cy); d.draw(canvas); canvas.restore();`.

#### 🟠 alto Overlay de stick-para-teclado dispara 4 KeyEvents por amostra de toque, sem deteccao de mudanca

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButton.java:118` · **Categoria:** performance

O laco `for (int i = 0; i < 4; i++) listener.onkeyEvent(stickSender[i], stickBool[i]);` roda a cada callback `onMovement`, mesmo quando o vetor `stickBool` nao mudou. Cada chamada vira um `KeyEvent` novo -> `KeyBoardController.sendKeyEvent()` (KeyBoardController.java:366) -> `Game.instance.onKey()` -> `conn.sendKeyboardInput()`. Com um dedo movendo o stick a 120 Hz sao ~480 pacotes de teclado por segundo enviados ao host, a maioria repeticoes identicas. O array `stickIndex` (linhas 39-59) e calculado e nunca lido — codigo morto que sugere que a deteccao de mudanca foi removida em algum refactor.

**Correção sugerida:** Guardar `boolean[] lastStickBool` e so emitir onkeyEvent quando `stickBool[i] != lastStickBool[i]`; remover `stickIndex` inteiramente. Mesmo tratamento em KeyBoardAnalogStickButtonFree.java.

#### 🟠 alto VirtualController le SharedPreferences a cada evento de entrada do OSC

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java:249` · **Categoria:** performance

`sendControllerInputContext(long,int)` executa `PreferenceConfiguration.readPreferences(context).enableKeyboardVibrate` a cada envio — ou seja, a cada movimento de stick virtual, cada toque de D-pad e cada pressao de botao. Como visto acima, cada readPreferences custa 123 lookups + alocacao de wrapper. `KeyBoardController.vibrate()` (KeyBoardController.java:390) faz o mesmo por tecla virtual. Isso esta no caminho critico de latencia da entrada.

**Correção sugerida:** Guardar uma `PreferenceConfiguration` (ou apenas o boolean enableKeyboardVibrate) como campo final lido no construtor de VirtualController/KeyBoardController, atualizando em refreshLayout().

#### 🟡 médio Agregacao multi-dispositivo usa |= em vez de = e corrompe gatilhos e sticks

**Local:** `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:1237` · **Categoria:** bug

Em `sendControllerInputPacket()` as linhas 1237-1242, 1251-1256 e 1261-1266 fazem `leftTrigger |= maxByMagnitude(leftTrigger, context.leftTrigger)` (idem rightTrigger e os 4 eixos de stick). `maxByMagnitude` ja devolve o valor vencedor; o `|=` faz um OR bit a bit com o acumulador atual, produzindo um valor que nao e nenhum dos dois operandos. Exemplo: acumulador 0x30 e contexto 0x40 -> max = 0x40 -> 0x30 | 0x40 = 0x70. So se manifesta quando dois contextos compartilham o mesmo controllerNumber (DS4 com touchpad como InputDevice separado, OSC + gamepad fisico com multiController desligado, ou gamepad USB + defaultContext), mas quando ocorre gera valores de eixo fantasma. Defeito herdado do upstream (confirmado em upstream/master:1218).

**Correção sugerida:** Trocar `|=` por `=` nas 18 linhas envolvidas (manter `inputMap |=`, que esta correto por ser bitfield). Alternativamente reescrever como `leftTrigger = maxByMagnitude(leftTrigger, context.leftTrigger);`.

#### 🟡 médio Sticks 'Free' misturam System.currentTimeMillis() com MotionEvent.getEventTime(): liberacao de deadzone por tempo nunca funciona

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:391` · **Categoria:** bug

`timeLastClick` e escrito com `System.currentTimeMillis()` (AnalogStickFree.java:391 e 399) mas comparado em `updatePosition()` contra `eventTime`, que vem de `MotionEvent.getEventTime()` = `SystemClock.uptimeMillis()` (AnalogStickFree.java:340). Os dois relogios tem epocas completamente diferentes (uptime ~10^7 vs wall-clock ~10^12), logo `eventTime - timeLastClick > timeoutDeadzone` e sempre falso. O recurso documentado no proprio comentario (linhas 337-338: 'release the deadzone if the user keeps the stick pressed for a bit to allow them to make precise movements') fica permanentemente desligado, e o stick so sai da deadzone por magnitude. A variante classica AnalogStick.java:321 usa `event.getEventTime()` corretamente, provando a regressao. Mesmo bug em keyboard/keyAnalogStickFree.java (System.currentTimeMillis nos ACTION_DOWN vs eventTime em updatePosition).

**Correção sugerida:** Trocar as duas ocorrencias de `System.currentTimeMillis()` por `event.getEventTime()` em AnalogStickFree.java:391/399 e nos pontos equivalentes de keyAnalogStickFree.java, alinhando com AnalogStick.java:313/321.

#### 🟡 médio AnalogStickFree calcula raio/angulo com o centro de toque anterior no ACTION_DOWN

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:356` · **Categoria:** bug

`relative_x`/`relative_y`, `movement_radius` e `movement_angle` sao calculados nas linhas 356-361, ANTES do switch que define `touchStartX`/`touchStartY` no ACTION_DOWN (linhas 377-379). No primeiro toque de cada gesto, o raio/angulo usam o `touchStart` do gesto ANTERIOR, e `updatePosition(event.getEventTime())` e chamado logo em seguida na linha 403 com esses valores obsoletos — o que pode emitir um `notifyOnMovement()` com deslocamento grande e espurio no instante em que o dedo encosta. Mesmo padrao em keyAnalogStickFree.java:329-334 vs 351-353.

**Correção sugerida:** Mover o bloco de calculo (linhas 356-370) para depois do switch, ou recalcular relative_x/y/movement_radius/movement_angle dentro do ramo ACTION_DOWN logo apos atribuir touchStartX/touchStartY.

#### 🟡 médio ProConController.rumble(): precedencia de operadores mascara a amplitude do motor de baixa frequencia

**Local:** `app/src/main/java/com/limelight/binding/input/driver/ProConController.java:272` · **Categoria:** bug

`(byte)(0x50 - (lowFreqMotor & 0xFFFF >> 12))` — em Java `>>` tem precedencia maior que `&`, entao a expressao e avaliada como `lowFreqMotor & (0xFFFF >> 12)` = `lowFreqMotor & 0x000F`, ou seja, apenas os 4 bits MENOS significativos do motor sao usados, quando a intencao evidente (comparando com a linha seguinte, que usa `((lowFreqMotor & 0xFFFF) >> 8)`) era `((lowFreqMotor & 0xFFFF) >> 12)`. O resultado e uma frequencia de HD rumble essencialmente aleatoria em relacao a intensidade pedida pelo host.

**Correção sugerida:** Trocar por `(byte)(0x50 - ((lowFreqMotor & 0xFFFF) >> 12))`. Revisar tambem a linha 276 `(byte)((0x70 - ((highFreqMotor & 0xFFFF) >> 10) & -0x04))`, cuja precedencia tambem esta ambigua (o `&` aplica-se ao resultado da subtracao).

#### 🟡 médio ProConController.stop() nao libera as interfaces USB reivindicadas

**Local:** `app/src/main/java/com/limelight/binding/input/driver/ProConController.java:253` · **Categoria:** bug

O laco de `connection.releaseInterface(iface)` esta comentado (linhas 253-256), diferentemente de `AbstractXboxController.stop()` (AbstractXboxController.java:165-172), que libera as interfaces justamente por causa do commit ff02cd40 ('Release all claimed interface after disconnect for Android to pick up the USB controller again'). Sem o release, apos parar o stream o kernel/hid-nintendo pode nao reassumir o Switch Pro Controller, deixando o gamepad morto ate reconectar o cabo.

**Correção sugerida:** Descomentar e executar o laco de releaseInterface antes de `connection.close()` em ProConController.java:257, replicando o padrao de AbstractXboxController.java:165-175.

#### 🟡 médio Botoes e teclas ficam travados no host quando o OSC e escondido com um toque ativo

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java:128` · **Categoria:** bug

`VirtualController.hide()` apenas faz `setVisibility(View.GONE)` em cada elemento; nenhum ACTION_UP/CANCEL e sintetizado e `inputContext.inputMap` nao e zerado. Se um botao estiver pressionado quando o overlay some — cenario direto de Game.java:1224 (entrada em PiP) e Game.java:1767 — o bit permanece setado no `defaultContext` e o host continua vendo o botao pressionado indefinidamente. `KeyBoardController.hide(true)` (KeyBoardController.java:230) tem exatamente o mesmo problema, mas com teclas, o que e pior: uma tecla modificadora presa (Shift/Ctrl) afeta todo o input subsequente. `ControllerHandler.stop()` (ControllerHandler.java:271-293) tambem nao chama `releaseControllerNumber()`, entao nao envia o pacote de zeros de despedida.

**Correção sugerida:** Adicionar `releaseAll()` em VirtualController/KeyBoardController que percorre os elementos, forca setPressed(false)+onRelease, zera inputContext e envia um pacote final; chamar de hide() e do onPause/PiP. Em ControllerHandler.stop(), enviar `conn.sendControllerInput(..., 0, 0, ...)` para cada contexto com assignedControllerNumber antes de destruir.

#### 🟡 médio handleButtonUp faz Thread.sleep() no thread de UI

**Local:** `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:2479` · **Categoria:** performance

Se o intervalo entre down e up for menor que MINIMUM_BUTTON_DOWN_TIME_MS (25 ms), o metodo dorme a diferenca no thread que despacha eventos de input. O comentario (linhas 2482-2483) assume que 25 ms sao inofensivos, mas isso bloqueia o Choreographer e pode causar drop de frame do stream. Em teclados/gamepads que reportam pressões muito curtas (ou em macros/atalhos gerados pelo overlay de teclado, que sintetizam DOWN e UP quase simultaneos), o custo se acumula.

**Correção sugerida:** Substituir o sleep por um agendamento: guardar o up pendente e postar o `sendControllerInputPacket()` correspondente via mainThreadHandler.postDelayed(), garantindo que os bits so sejam limpos apos o intervalo minimo sem bloquear a thread.

#### 🟡 médio O gamepad do OSC sempre reivindica o bit 0 da mascara de controles ativos, podendo colidir com um gamepad fisico

**Local:** `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:402` · **Categoria:** bug

Em `getAttachedControllerMask()` o OSC faz `mask |= 1` (linha 404) ignorando o contador `count`, e `getActiveControllerMask()` (linha 1078) faz `| (prefConfig.onscreenController ? 1 : 0)`. Como `reportOscState()` escreve no `defaultContext`, cujo `controllerNumber` e 0 (linha 195), o OSC compartilha o slot do jogador 1 com qualquer InputDevice que tenha recebido o numero 0. Combinado com o bug do `|=` na agregacao (finding acima), entrada do OSC e de um gamepad fisico se misturam de forma imprevisivel. Em ControllerHandler.java:382/396 o `mask |= 1 << count++` tambem estoura silenciosamente para count >= 16 (mask e short).

**Correção sugerida:** Reservar um controllerNumber proprio para o OSC via assignControllerNumberIfNeeded quando multiController estiver ligado, ou pelo menos contabilizar `mask |= 1 << count++` para o OSC. Adicionar guarda `if (count >= MAX_GAMEPADS) break;` nos lacos de getAttachedControllerMask.

#### 🟡 médio ProCon: constantes de calibracao de IMU declaradas mas nunca usadas — gyro/accel sem calibracao de fabrica

**Local:** `app/src/main/java/com/limelight/binding/input/driver/ProConController.java:23` · **Categoria:** tech-debt

`FACTORY_IMU_CALIBRATION_OFFSET` (:23), `USER_IMU_MAGIC_OFFSET` (:26), `USER_IMU_CALIBRATION_OFFSET` (:27), `IMU_CALIBRATION_LENGTH` (:32) e os arrays `RUMBLE_NEUTRAL`/`RUMBLE` (:21-22) sao declarados e nunca referenciados. `handleRead()` (:336-341) converte os valores brutos do IMU por constantes fixas (4096.0f para accel, 16.0f para gyro) sem subtrair offset nem aplicar escala calibrada, ao contrario do que o driver ja faz para os sticks (`loadStickCalibration()` :374). Resultado esperado: drift de gyro perceptivel em jogos com aim por movimento.

**Correção sugerida:** Implementar `loadImuCalibration()` espelhando `loadStickCalibration()`: checar o magic 0xB2/0xA1 em USER_IMU_MAGIC_OFFSET, ler 24 bytes de USER_IMU_CALIBRATION_OFFSET ou FACTORY_IMU_CALIBRATION_OFFSET, e aplicar offset+escala em handleRead(). Se nao for implementar, remover as constantes mortas.

#### 🟡 médio Duas hierarquias de overlay quase identicas (virtual_controller vs virtual_controller.keyboard)

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyAnalogStick.java:1` · **Categoria:** maintainability

Existem pares de classes com codigo praticamente copiado: AnalogStick.java (349 linhas) vs keyboard/KeyAnalogStick.java (351), AnalogStickFree.java (512) vs keyboard/keyAnalogStickFree.java (419), DigitalButton.java (267) vs keyboard/KeyBoardDigitalButton.java (266), VirtualControllerElement.java (360) vs keyboard/keyBoardVirtualControllerElement.java (438), VirtualControllerConfigurationLoader.java (449) vs keyboard/KeyBoardControllerConfigurationLoader.java (590). A unica diferenca estrutural real e o tipo do elementId (int vs String), a flag `hidden` e o destino do evento. Correcoes precisam ser aplicadas duas vezes — e de fato NAO foram: o ACTION_CANCEL e o bug de relogio existem nas duas copias 'Free', mas o snapping (LayoutSnappingHelper) so existe no lado do teclado.

**Correção sugerida:** Extrair uma base generica `OverlayElement<T extends OverlayController>` com o ciclo de vida de toque, modos de configuracao, serializacao JSON e opacidade, e deixar apenas os listeners especificos nas subclasses. Como passo intermediario e barato, mover LayoutSnappingHelper para uso tambem no OSC de gamepad e unificar o tratamento de ACTION_CANCEL.

#### 🟡 médio Overlay de teclado depende do singleton estatico Game.instance

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java:366` · **Categoria:** maintainability

`sendKeyEvent()` e `sendMouseMove()` (linhas 366-387) acessam `Game.instance` (declarado em Game.java:144) e `Game.instance.connected` para despachar entrada, apesar do `KeyBoardController` ja receber uma `NvConnection conn` no construtor (linha 80) — que so e usada para criar botoes customizados. Isso cria acoplamento global, impede teste unitario do overlay e abre janela de NPE/uso de Activity destruida em rotacoes e troca de display externo.

**Correção sugerida:** Injetar uma interface `KeyboardInputSink { void key(int keyCode, boolean down); void mouseButton(int id, boolean down); void mouseMove(int dx,int dy); }` implementada por Game, e passar no construtor do KeyBoardController, eliminando as referencias a Game.instance.

#### 🟡 médio Uso de KeyEvent.setSource() com valores magicos 0/1/2/3 como canal de roteamento

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java:371` · **Categoria:** maintainability

O comentario na linha 370 documenta '1-mouse 0-tecla 2-stick 3-dpad' e o codigo faz `keyEvent.getSource() == 1` para decidir o dispatch. `InputDevice.SOURCE_*` e uma bitmask onde 1 = SOURCE_KEYBOARD e 2 = SOURCE_DPAD; usar 0..3 como enum privado desvirtua a semantica da API e colide com valores reais caso algum codigo a jusante inspecione a source (Game.handleKeyDown/handleKeyUp recebem o KeyEvent inteiro). Os mesmos literais aparecem em KeyBoardControllerConfigurationLoader.java:75, 121, 174, 199, 324.

**Correção sugerida:** Definir um enum `SyntheticSource { KEY, MOUSE, STICK, DPAD }` e um metodo `sendSynthetic(SyntheticSource, int keyCode, boolean down)` no KeyBoardController, deixando de sobrescrever o campo source do KeyEvent.

#### 🟡 médio Layout do OSC usa margens absolutas em pixels derivadas de DisplayMetrics de tela cheia

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerConfigurationLoader.java:212` · **Categoria:** compatibility

`createDefaultLayout()` calcula posicoes a partir de `context.getResources().getDisplayMetrics()` (linha 212) e de `rightDisplacement = widthPixels - heightPixels*16/9` (linha 216), e `VirtualControllerElement.getConfiguration()` persiste `leftMargin/topMargin/width/height` em pixels crus (VirtualControllerElement.java:341-344). Os elementos sao filhos do mesmo FrameLayout raiz que contem o `streamContainer` (Game.java:466, 1102). Portanto: (a) qualquer mudanca no tamanho util da janela — abertura do IME, multi-janela, foldable, PiP — deixa o OSC fora de lugar ou parcialmente coberto, pois ele nao acompanha o insets; (b) layouts salvos nao sao portaveis entre resolucoes/dispositivos; (c) especificamente para o objetivo AnyDesk de 'empurrar' o stream ao abrir o teclado, o OSC nao seguiria o redimensionamento do stream. O overlay de teclado tem o mesmo padrao (KeyBoardControllerConfigurationLoader.java:353-370) e ainda usa `screen.heightPixels` para achar posicoes livres (KeyBoardController.java:736-759).

**Correção sugerida:** Persistir posicoes normalizadas (fracoes 0..1 do container) em vez de pixels, migrando os perfis existentes; e reagir a `View.setOnApplyWindowInsetsListener`/`ViewTreeObserver.OnGlobalLayoutListener` no FrameLayout raiz para recalcular as margens quando a area visivel mudar. Isso e pre-requisito do EPIC de 'stream empurrado pelo teclado'.

#### ⚪ baixo KeyBoardTouchPadButton oculta o campo pressedColor do pai, anulando o ajuste de opacidade

**Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardTouchPadButton.java:143` · **Categoria:** bug

A classe declara `int pressedColor = 0x2BF5F5F9;` (sem modificador, package-private) enquanto a superclasse ja declara `protected int pressedColor` (keyBoardVirtualControllerElement.java:49). `setOpacity()` (keyBoardVirtualControllerElement.java:379-385) escreve no campo do PAI, mas `onElementDraw()` (KeyBoardTouchPadButton.java:156) le o campo FILHO — logo a opacidade configurada pelo usuario nunca afeta o trackpad virtual.

**Correção sugerida:** Remover a declaracao duplicada na linha 143 e inicializar o campo herdado no construtor (`this.pressedColor = 0x2BF5F5F9;`), ou sobrescrever setOpacity().

#### ⚪ baixo handleSetMotionEventState so configura o primeiro contexto com o controllerNumber pedido

**Local:** `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:2364` · **Categoria:** bug

O laco percorre inputDeviceContexts seguido de usbDeviceContexts, mas executa `break` (linha 2421) apos tratar o primeiro contexto cujo controllerNumber casa. Quando um controle e dividido em varios InputDevices que compartilham o numero (caso DS4/DualSense, tratado explicitamente em assignControllerNumberIfNeeded :514-551), o dispositivo com sensores pode nao ser o primeiro do SparseArray, e o gyro simplesmente nunca liga. Note que o `continue` da linha 2390 (quando sensorManager e null) pula o break e permite avancar, o que torna o comportamento dependente da ordem de insercao.

**Correção sugerida:** Remover o `break` e tratar todos os contextos com o controllerNumber correspondente que tenham sensorManager != null (ou escolher explicitamente o contexto com sensores antes de configurar).

#### ⚪ baixo hasGameController nunca volta a false apos desconexao do gamepad

**Local:** `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:130` · **Categoria:** bug

`hasGameController` e setado em true no construtor (linha 177) e em createInputDeviceContextForDevice (linha 812), mas nunca e recalculado em `onInputDeviceRemoved()` (linha 238) nem em `deviceRemoved()` (linha 3011). `hasController()` (linha 228) alimenta a decisao de Game.java:839 (`hideOSCWhenHasGamepad`): se o usuario desconectar o gamepad durante a sessao, o OSC nao reaparece.

**Correção sugerida:** Recalcular hasGameController varrendo InputDevice.getDeviceIds() em onInputDeviceRemoved/deviceRemoved, e notificar o Game para reavaliar a visibilidade do OSC.

#### ⚪ baixo Xbox360WirelessDongle emite deviceRemoved sem ter emitido deviceAdded e deixa imports mortos

**Local:** `app/src/main/java/com/limelight/binding/input/driver/Xbox360WirelessDongle.java:130` · **Categoria:** tech-debt

`start()` retorna false deliberadamente ('Fail to give control back to the kernel driver', linha 131) apos so acender os LEDs; `UsbDriverService.handleUsbDeviceState()` entao fecha a conexao (UsbDriverService.java:215-217) e o controller nunca entra na lista. Isso e intencional, mas o padrao e confuso e nao esta documentado no ponto de instanciacao (UsbDriverService.java:202-204). Alem disso a classe importa `android.os.Build` e `java.nio.ByteBuffer` sem usar (linhas 8, 13) e `stop()` (linha 135) e um no-op que nunca chama notifyDeviceRemoved. `ProConController.createInputThread()` (ProConController.java:67-71) tem o problema simetrico: chama `stop()` -> `notifyDeviceRemoved()` mesmo quando o handshake falhou e `notifyDeviceAdded()` nunca ocorreu.

**Correção sugerida:** Renomear/refatorar Xbox360WirelessDongle para uma interface separada (ex.: `UsbLedInitializer.applyIfMatches(device, connection)`) chamada antes do bloco de escolha de driver, removendo o abuso do contrato start()==false; remover imports mortos; guardar um flag `added` em ProConController para so notificar remocao se houve adicao.


## Ideias de melhoria

### Corrigir supportedButtonFlags dos drivers USB

**Tamanho:** quick-win

**Por quê:** Uma linha em AbstractXboxController.java:32 corrige o anuncio de capacidades de todos os gamepads Xbox controlados pelo driver proprio, alem de eliminar a janela em que 15 botoes aparecem pressionados.

**Como:** Trocar `this.buttonFlags` por `this.supportedButtonFlags` em AbstractXboxController.java:32 e adicionar a mascara correspondente em ProConController.java:49-55 (A/B/X/Y/UP/DOWN/LEFT/RIGHT/LB/RB/LS_CLK/RS_CLK/BACK/PLAY/SPECIAL/MISC, conforme o que handleRead() de fato preenche em ProConController.java:306-321).

**Risco:** Praticamente nulo. Vale checar se algum host se comporta diferente ao receber supportedButtonFlags != 0 (deveria melhorar).

### Cachear PreferenceConfiguration nos elementos do OSC e remover leituras de prefs do onDraw

**Tamanho:** quick-win

**Por quê:** Elimina milhares de leituras de SharedPreferences por frame no thread de UI (DigitalButton.java:162/165/175, DigitalPad.java:56-57, KeyBoardDigitalButton.java:168, VirtualController.java:249, KeyBoardController.java:390) — ganho direto de fluidez com risco mínimo.

**Como:** Adicionar um campo `protected PreferenceConfiguration prefConfig` em VirtualControllerElement e keyBoardVirtualControllerElement, preenchido no construtor (padrao ja usado em KeyBoardTouchPadButton.java:126); adicionar `applyPreferences(PreferenceConfiguration)` chamado de VirtualController.refreshLayout() (VirtualController.java:198) e KeyBoardController.refreshLayout() (KeyBoardController.java:316) para reagir a mudancas de config.

**Risco:** Se o usuario mudar uma preferencia de skin/opacidade sem reconstruir o layout, a mudanca so aparece no proximo refreshLayout — mitigado chamando applyPreferences no fluxo que ja existe de reconfiguracao.

### De-duplicar eventos do stick-para-teclado e remover codigo morto

**Tamanho:** quick-win

**Por quê:** Reduz de ~480 para poucos pacotes de teclado por segundo no overlay de teclado com stick virtual, diminuindo jitter de rede e carga no host.

**Como:** Em KeyBoardAnalogStickButton.java:118-120 (e no gemeo KeyBoardAnalogStickButtonFree.java) comparar `stickBool` com um `lastStickBool` antes de chamar `listener.onkeyEvent`; apagar o array `stickIndex` (linhas 14, 39-59, 135-138), que nunca e lido.

**Risco:** Nenhum funcional; garantir que onRevoke() (linha 134) continue emitindo os UPs mesmo se o estado ja estiver false, para nao deixar tecla presa.

### Corrigir o ciclo de vida de toque dos sticks 'Free' (cancel + relogio + centro obsoleto)

**Tamanho:** small

**Por quê:** Os tres bugs de AnalogStickFree/keyAnalogStickFree se manifestam exatamente no cenario que o dono do fork mais usa (abrir teclado/IME sobre o stream com o overlay ativo): stick travado, deadzone que nunca solta e salto no primeiro toque.

**Como:** Em AnalogStickFree.java:419 e keyAnalogStickFree.java:394 adicionar `case MotionEvent.ACTION_CANCEL:` com reset incondicional; trocar `System.currentTimeMillis()` por `event.getEventTime()` (AnalogStickFree.java:391/399 e equivalentes); mover o calculo de relative_x/y (AnalogStickFree.java:356-370) para depois do switch. Comparar linha a linha com AnalogStick.java:283-348, que ja esta correto.

**Risco:** Baixo; mudar a fonte de tempo altera ligeiramente a sensibilidade do double-click (timeoutDoubleClick=350ms) — vale validar manualmente o gesto de L3/R3 por duplo toque.

### Deteccao de mudanca no envio do OSC + revisao do hack de retransmissao

**Tamanho:** small

**Por quê:** `VirtualController.sendControllerInputContext()` (VirtualController.java:244) reenvia o estado completo a cada evento e agenda 3 retransmissoes (25/50/75 ms, linhas 269-271) para contornar descarte de pacotes do GFE. Com Apollo/Vibeshine (que nao tem esse bug do GFE) isso e trafego e trabalho desperdicados; e como `removeCallbacks` (linha 246) cancela todas as pendencias, num arrasto continuo as retransmissoes nunca chegam a rodar — o hack so custa, quase nunca ajuda.

**Como:** Guardar o ultimo ControllerInputContext enviado e pular o envio quando nada mudou; tornar as retransmissoes condicionais a uma preferencia (ou detectar o tipo do host) e mante-las apenas para o pacote de zeragem (o caso que o comentario das linhas 265-268 realmente descreve).

**Risco:** Suprimir retransmissoes pode reintroduzir stick preso em hosts GFE legados — manter a opcao ligada por padrao para GFE e desligada para Sunshine/Apollo.

### Reservar um controllerNumber dedicado para o OSC quando multiController estiver ativo

**Tamanho:** small

**Por quê:** Hoje o OSC escreve no defaultContext (controllerNumber 0) e forca o bit 0 da mascara (ControllerHandler.java:404, 1078), colidindo com o jogador 1 fisico. Somado ao bug do `|=` na agregacao, entrada virtual e fisica se misturam.

**Como:** Criar um contexto proprio para o OSC (em vez de reutilizar defaultContext) e passa-lo por assignControllerNumberIfNeeded (ControllerHandler.java:457), com reportOscState escrevendo nele; contabilizar o OSC no contador de getAttachedControllerMask (linha 402-405).

**Risco:** Muda o numero de jogador visto pelo host quando o OSC esta ativo junto com um gamepad — pode confundir jogos que amarram jogador 1 ao primeiro dispositivo. Colocar atras de preferencia.

### Camada de 'release-all' unificada para OSC, overlay de teclado e gamepads fisicos

**Tamanho:** medium

**Por quê:** Botao/tecla travado no host e um dos piores modos de falha percebidos pelo usuario e hoje ocorre em varios caminhos: hide() do OSC (VirtualController.java:128), hide(true) do teclado (KeyBoardController.java:230), entrada em PiP (Game.java:1224-1231), perda de foco e ControllerHandler.stop() (ControllerHandler.java:271).

**Como:** Definir `interface InputSurface { void releaseAllHeldInput(); }` implementada por VirtualController, KeyBoardController, KeyBoardLayoutController e ControllerHandler. Em ControllerHandler adicionar `releaseAllContexts()` que zera inputMap/triggers/sticks de cada contexto e envia um pacote final (reaproveitando o codigo de releaseControllerNumber :421-427). Chamar a partir de Game.onPause, onWindowFocusChanged(false) e do fluxo de PiP.

**Risco:** Enviar zeros extras e inofensivo para o host, mas cuidado para nao chamar durante o gameplay normal (ex.: ao abrir o menu do jogo o usuario pode querer manter um botao segurado) — deixar o gatilho configuravel.

### Implementar calibracao de IMU do Switch Pro Controller

**Tamanho:** medium

**Por quê:** O driver ja le calibracao de sticks da flash SPI e ja declara as constantes de IMU (ProConController.java:23-32) — falta so o codigo. Sem isso o gyro reporta valores brutos e acumula drift, degradando aim-por-movimento nos jogos.

**Como:** Escrever `loadImuCalibration()` no molde de `loadStickCalibration()` (ProConController.java:374): checar magic 0xB2/0xA1 em USER_IMU_MAGIC_OFFSET (0x8026) via `checkUserCalMagic()` (:364), ler IMU_CALIBRATION_LENGTH (24) bytes de USER_IMU_CALIBRATION_OFFSET (0x8028) ou FACTORY_IMU_CALIBRATION_OFFSET (0x6020) com `spiFlashRead()` (:346), e aplicar offset+escala em handleRead() (:336-341). Chamar do createInputThread (:76) junto com loadStickCalibration.

**Risco:** Exige hardware fisico para validar; o formato dos 24 bytes (acc offset/scale + gyro offset/scale, little-endian int16) precisa conferir com a documentacao de engenharia reversa do Joy-Con.

### Testes de regressao para o mapeamento de botoes e a matriz de quirks

**Tamanho:** medium

**Por quê:** `handleRemapping()` (ControllerHandler.java:1364-1650) e o coracao de compatibilidade do subsistema, com quirks por VID/PID/scancode para pelo menos 12 familias de controle, e hoje nao ha nenhum teste. Qualquer alteracao (ex.: o fix de JoyCon do fork, linhas 1435-1481) e feita as cegas.

**Como:** Com Robolectric (o projeto ja tem robolectric.properties na raiz), escrever testes que constroem um InputDeviceContext falso por familia (DS4 padrao/nao-padrao, Xbox One S BT antigo, Serval, ASUS Gamepad, JoyCon L/R, Switch Pro, 8BitDo) e assertam o keycode retornado por handleRemapping para cada scancode relevante. Complementar com testes de handleDeadZone (incluindo o caminho de anti-deadzone negativo, ControllerHandler.java:1682-1697) e de handleAxisSet (triggersIdleNegative).

**Risco:** handleRemapping e privado e depende de InputDeviceContext (inner class) — precisa de @VisibleForTesting ou extracao para uma classe pura de mapeamento, o que ja e um ganho arquitetural.

### EPIC: Campo de entrada de texto que envia a string inteira (paste/commit) em vez de tecla por tecla

**Tamanho:** large

**Por quê:** Requisito numero 2 do dono do fork. A infraestrutura ja existe e esta parcialmente usada: `NvConnection.sendUtf8Text()` -> `MoonBridge.sendUtf8Text()` (MoonBridge.java:396) e o helper `enqueueCommitText()` com chunking UTF-8 seguro de 512 bytes e flush a cada 15 ms (Game.java:4314-4333, flushCommitTextQueue em Game.java:317). Falta apenas a UI e um ponto de entrada explicito.

**Como:** Criar um novo elemento no overlay (ou um dialogo acionavel pelo GameMenu) com um EditText; no envio, chamar `Game.enqueueCommitText(text)` (tornar publico ou expor via um metodo `sendText(String)`). Reaproveitar o padrao de `KeyBoardControllerConfigurationLoader.createCustomButton()` (KeyBoardControllerConfigurationLoader.java:219-305) para o caso de macros com modificadores, e usar sendUtf8Text para texto puro. Adicionar suporte a colar do clipboard. Registrar o elemento no keyboard.json / no dialogo 'Add Keys' (KeyBoardController.showKeySelectionDialog :414) para que seja posicionavel como qualquer outro botao.

**Risco:** sendUtf8Text depende do host suportar o evento UTF-8 do moonlight-common-c; e preciso um fallback para traducao tecla-a-tecla via KeyboardTranslator quando o host nao suporta (o retorno de LiSendUtf8TextEvent deve ser checado). Layouts de teclado nao-US no host podem interpretar mal caracteres se cair no fallback.

### Extrair uma base comum para os dois overlays (gamepad e teclado)

**Tamanho:** large

**Por quê:** Aproximadamente 2.000 linhas duplicadas entre virtual_controller/ e virtual_controller/keyboard/ (ver finding de maintainability). A duplicacao ja causou divergencia real: o snapping de layout so existe no lado do teclado, e os bugs dos sticks 'Free' precisaram ser identificados duas vezes.

**Como:** Criar `binding/input/overlay/` com `OverlayElement` (ciclo de toque, modos Normal/Move/Resize/Enable, serializacao JSON, opacidade, snapping) e `OverlayController<E extends OverlayElement>` (lista de elementos, botao de configuracao, save/load de perfil). Fazer VirtualControllerElement e keyBoardVirtualControllerElement herdarem dela mantendo os elementId int/String via generics ou string sempre. Migrar em duas etapas para nao quebrar os perfis salvos.

**Risco:** Alto risco de regressao no comportamento de toque e nos perfis persistidos; exige testes manuais amplos. Fazer depois dos quick-wins e apos os EPICs de teclado, para nao bloquear a entrega da funcionalidade que o dono quer.

### EPIC: Redimensionar o stream quando o teclado virtual abre (comportamento AnyDesk) sem quebrar o OSC

**Tamanho:** epic

**Por quê:** E a dor numero 1 do dono do fork. Hoje o IME simplesmente cobre o stream porque o Game roda em modo imersivo/fullscreen e todos os overlays (OSC de gamepad, overlay de teclado, botao flutuante) sao filhos absolutamente posicionados do FrameLayout raiz (Game.java:466, 1092, 1102, 1108), com margens em pixels calculadas sobre DisplayMetrics de tela cheia. Qualquer solucao que so mexa no SurfaceView vai desalinhar o OSC.

**Como:** 1) No Game, instalar `ViewCompat.setOnApplyWindowInsetsListener` no rootView e observar `WindowInsets.Type.ime()`; 2) aplicar a altura do IME como bottom padding/altura ao `streamContainer` (res/layout/activity_game.xml, id streamContainer) e recalcular o aspect ratio do SurfaceView; 3) informar o novo tamanho ao host — o Vibeshine/Sunshine ja aceita mudanca de resolucao/viewport, e o fork ja tem caminho de reconfiguracao em Game.onConfigurationChanged (Game.java:1194) que chama `virtualController.refreshLayout()` e `keyBoardController.refreshLayout()`; 4) tornar as posicoes do OSC relativas ao container (ver finding sobre VirtualControllerConfigurationLoader.java:212) para que refreshLayout() reposicione corretamente na area reduzida; 5) adicionar preferencia 'resize stream when keyboard opens' com fallback pro comportamento atual.

**Risco:** Redimensionar o SurfaceView durante o stream provoca recriacao de superficie no decoder (Game/MediaCodecDecoderRenderer) — precisa de debounce e teste em varios fabricantes. A migracao de layouts do OSC de pixels absolutos para fracoes exige migracao dos perfis salvos em SharedPreferences 'OSC' e 'OSC_Keyboard' (VirtualControllerElement.java:336-359, keyBoardVirtualControllerElement.java:396-427), senao usuarios perdem seus layouts.


## Glossário

- OSC (On-Screen Controller): overlay de gamepad virtual desenhado sobre o stream; classe raiz VirtualController (virtual_controller/VirtualController.java:28), habilitado por prefConfig.onscreenController.
- Overlay de teclado (KeyBoardController): overlay PARALELO e independente do OSC que injeta teclas/mouse em vez de bits de gamepad; habilitado por prefConfig.enableKeyboard (Game.java:1091).
- KeyBoardLayoutController: um TERCEIRO overlay, um teclado completo inflado de R.layout.layout_axixi_keyboard, distinto do KeyBoardController (Game.java:1107).
- controllerNumber: indice de jogador 0..15 atribuido por assignControllerNumberIfNeeded (ControllerHandler.java:457); varios InputDevices podem compartilhar o mesmo numero (caso DS4 touchpad + joystick).
- activeGamepadMask / currentControllers / initialControllers: bitmask de 16 bits (short) dos slots de jogador ocupados; enviada em todo pacote via getActiveControllerMask() (ControllerHandler.java:1076).
- inputMap: bitfield de botoes no formato ControllerPacket (A_FLAG, B_FLAG, ..., PADDLE1_FLAG, TOUCHPAD_FLAG, MISC_FLAG) mantido por contexto e agregado antes do envio.
- EMULATING_SPECIAL / EMULATING_SELECT / EMULATING_TOUCHPAD: flags (ControllerHandler.java:69-71) que marcam que um botao esta sendo sintetizado por um combo (Start+LB, Start+Select, Select+LB) e precisa ser solto quando o combo se desfaz.
- needsClickpadEmulation: ativado quando o cliente finge ser um controle PlayStation para habilitar sensores num gamepad Xbox (ControllerHandler.java:3336); libera o combo Select+LB como botao de clickpad.
- triggersIdleNegative: quando os eixos de gatilho repousam em -1 em vez de 0 (controles com eixos centrados em zero), exige a conversao (v+1)/2 (ControllerHandler.java:1732-1739).
- hat axes (AXIS_HAT_X/AXIS_HAT_Y): forma analogica do D-pad; quando presentes, os KEYCODE_DPAD_* duplicados sao suprimidos via hatXAxisUsed/hatYAxisUsed (ControllerHandler.java:2527).
- Anti-deadzone: valor NEGATIVO de seekbar_deadzone (faixa -20..20, res/xml/preferences.xml:252) que faz handleDeadZone() (ControllerHandler.java:1682-1697) EXPANDIR o sinal (mapeando [0,1] para [|dz|,1]) em vez de cortar o centro — recurso do fork.
- Stick 'Free' (AnalogStickFree / keyAnalogStickFree): variante flutuante do stick virtual (prefConfig.enableNewAnalogStick) em que o centro nasce no ponto de toque; contrasta com AnalogStick/KeyAnalogStick, de centro fixo.
- layer (DigitalButton): grupo de botoes entre os quais o dedo pode deslizar; checkMovement() so propaga pressao entre botoes do mesmo layer (DigitalButton.java:70-111).
- movingButton: referencia ao botao que originou o gesto de arraste, usada para que apenas ele possa 'entregar' e 'retirar' a pressao de botoes vizinhos (DigitalButton.java:63, 80-91).
- sticky modifier: modificador (Ctrl/Shift/Alt/Meta) que fica travado apos long-click no overlay de teclado, controlado por prefConfig.stickyModifierKey (KeyBoardControllerConfigurationLoader.java:165-193).
- switchDown / enableSwitchDown: modo toggle de um botao do overlay de teclado (elementIds prefixados 'key_s_' ou 'm_s_'), em que o UP e suprimido ate o proximo toque (KeyBoardDigitalButton.java:215-251).
- EID_* (elementId): identificadores dos elementos do OSC de gamepad, usados como chave em SharedPreferences 'OSC' (VirtualControllerElement.java:25-41); no overlay de teclado o elementId e uma String ('key_<code>', 'm_<code>', 'custom_<id>').
- LI_CTYPE_*: tipo de controle informado ao host (UNKNOWN/XBOX/PS/NINTENDO), MoonBridge.java:101-104.
- LI_CCAP_*: bitmask de capacidades informada no arrival (ANALOG_TRIGGERS, RUMBLE, TRIGGER_RUMBLE, TOUCHPAD, ACCEL, GYRO, BATTERY_STATE, RGB_LED), MoonBridge.java:106-113.
- sendControllerArrival: handshake em que o cliente descreve ao host tipo, botoes suportados e capacidades do gamepad; disparado uma unica vez por contexto em assignControllerNumberIfNeeded (ControllerHandler.java:568).
- SceManager: API proprietaria do NVIDIA Shield (dependencia com.github.cgutman:ShieldControllerExtensions) para rumble e leitura de bateria de controles Shield (ControllerHandler.java:2196, 1116).
- backMenuPending / QUICK_MENU_FIRST_STAGE_MS: gesto de dois estagios no botao Start — toque rapido seguido de nova pressao mantida por 750 ms abre o menu do jogo em vez de alternar emulacao de mouse (ControllerHandler.java:2730-2515).
- mouseEmulation: modo em que o gamepad vira mouse; sticks movem o cursor via mouseEmulationRunnable a 50 ms (ControllerHandler.java:3061-3087), A/B viram botoes e o D-pad vira scroll.
- shouldClaimDevice: decisao de 'roubar' um dispositivo USB do kernel, cruzando canClaimDevice de cada driver com isRecognizedInputDevice e heuristicas de versao de kernel (UsbDriverService.java:288).
- bindAllUsb: preferencia que forca reivindicar o dispositivo USB mesmo quando o kernel ja o suporta (UsbDriverService.java:149).
- subcomando ProCon 0x10 (SPI flash read): mecanismo usado para ler calibracao de sticks/IMU gravada na flash do controle (ProConController.java:346).
- magic 0xB2 0xA1: marcador que indica que existe calibracao feita pelo USUARIO na flash do ProCon, sobrepondo a de fabrica (ProConController.java:371).
- sendUtf8Text: caminho JNI ja existente para enviar uma string inteira ao host de uma vez (MoonBridge.java:396, NvConnection.java:619), hoje usado apenas pelo commitText do IME com chunking de 512 bytes (Game.java:4314).
