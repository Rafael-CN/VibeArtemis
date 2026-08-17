# Entrada de Toque, Trackpad, Mouse e Caneta (touch/trackpad/mouse/stylus input pipeline)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (19)
6. [Ideias de melhoria](#ideias-de-melhoria) (11)
7. [Glossário](#glossário)

## Como funciona

Todo o input de ponteiro do Artemis passa por um único funil: `Game.handleMotionEvent(View, MotionEvent)` (`app/src/main/java/com/limelight/Game.java:2756`), alimentado por três entradas — `onTouch()` do `backgroundTouchView` (`Game.java:3410`, registrado em `Game.java:477-478`), `onGenericMotion()` do `streamContainer` (`Game.java:3405`, registrado em `Game.java:461`) e `onGenericMotionEvent()` da Activity com `view == null` (`Game.java:3347`). Uma quarta entrada externa vem de `ExternalDisplayControlActivity` (`ExternalDisplayControlActivity.java:189-195`), que repassa toques da tela do celular para o `Game` quando o stream está num display externo. O roteamento primário separa por `InputDevice.SOURCE_*`: joystick vai para `ControllerHandler` (`Game.java:2769-2776`, incluindo touchpad de DS4/DualSense via `tryHandleTouchpadEvent`, `ControllerHandler.java:1799`); tudo que é `SOURCE_CLASS_POINTER`/`SOURCE_CLASS_POSITION`/`SOURCE_MOUSE_RELATIVE` entra no bloco grande de mouse/caneta (`Game.java:2777-3062`); e o resto (dedos) cai no bloco de touchscreen (`Game.java:3063-3111`). Existem duas famílias de contexto de toque, ambas com apenas 2 slots: `touchContextMap` (tela) e `trackpadContextMap` (trackpad físico), declaradas em `Game.java:149-150` com o comentário "Only 2 touches are supported". O modo de mouse é escolhido por `mouse_mode_list` (0=Multi-touch nativo, 1=Absolute touch, 2=Trackpad Natural, 3=Trackpad Gaming, 4=Desabilitado, 5=Absolute swapped) e materializado em `applyMouseMode()` (`Game.java:4153-4193`), que instancia `AbsoluteTouchContext`, `RelativeTouchContext` ou `TrackpadContext`. `TrackpadContext` (485 linhas, o arquivo mais elaborado do fork) implementa trackpad estilo macOS: aceleração por raiz cúbica, drag por duplo-toque, scroll de 2 dedos em alta resolução, clique do meio com 3 dedos, inércia/flick com atrito e transição anti-jitter scroll→move. `AbsoluteTouchContext` mapeia toque direto para `LiSendMousePositionEvent` com long-press virando botão direito. `RelativeTouchContext` é o modo "gaming" (long press para arrastar, escala por resolução de referência 1280x720). Quando o host é Sunshine/Apollo com `LI_FF_PEN_TOUCH_EVENTS`, o modo Multi-touch (0) contorna todos esses contextos e envia toque nativo normalizado 0..1 via `LiSendTouchEvent` (`Game.java:3103-3107` → `trySendTouchEvent` `Game.java:2727` → `simplejni.c:57`), e caneta/borracha via `LiSendPenEvent` com pressão, tilt, rotação e área de contato (`Game.java:2673`, `simplejni.c:67`). Pointer capture é abstraído por `InputCaptureProvider` com 5 implementações escolhidas em cascata por `InputCaptureManager.getInputCaptureProvider()` (`InputCaptureManager.java:12-37`): Android O+ nativo, extensão NVIDIA Shield, evdev via root, apenas esconder o cursor (Android N) e no-op. Sob captura, deltas relativos vêm de `AXIS_RELATIVE_X/Y` (ou `AXIS_X/Y` em `SOURCE_MOUSE_RELATIVE`) somando o histórico do evento (`AndroidNativePointerCaptureProvider.java:123-142`). Há um caminho especial e frágil para trackpads sem captura, em que o Android sintetiza swipes de 2 dedos como 1 dedo na tela e o fork os "re-sintetiza" em eventos de 2 ponteiros (`Game.java:2874-2886`), além de um emulador de clique/drag-and-drop por tempo de toque (`Game.java:2888-2962`). Gestos de 3/4/5 dedos disparam teclado, teclado completo e menu (`handleMultiTouchGesture`, `Game.java:3288`), com uma segunda cópia da mesma lógica dentro de `handleTouchInput` para o modo trackpad (`Game.java:3230-3249`). Scroll é sempre alta resolução: `AXIS_VSCROLL/HSCROLL * 120` para mouse real (`Game.java:2968-2972`) e fatores 2/3/5 para os contextos de toque; o scroll horizontal só existe em hosts Sunshine (`InputStream.c:1269-1272`). Por fim, o zoom/pan do stream é feito por `PanZoomHandler` aplicando escala/translação na `SurfaceView` interna (`PanZoomHandler.java:28-40`), enquanto toda a normalização de coordenadas de toque lê escala/posição do `StreamContainer` pai (`Game.java:2532-2540`) — as duas visões não conversam, o que é a origem do bug de descasamento mais sério desta dimensão.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4348 | Activity de streaming e roteador central de TODO o input de ponteiro. Concentra decisão de fonte (mouse/touchpad/caneta/dedo), sintetização de gestos de trackpad, gestos multi-dedo, normalização de coordenadas, envio de toque/caneta nativos e ciclo de vida do pointer capture. 4348 linhas — é o god-object do fork. |
| [`app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java) | 485 | Implementação de trackpad "natural" (modo 2 e trackpad físico). Curva de aceleração cúbica, drag por duplo-toque, clique direito com 2 dedos, clique do meio com 3, scroll 2 dedos em alta resolução com eixo dominante, inércia (flick) com atrito e janela anti-jitter na transição scroll→move. |
| [`app/src/main/java/com/limelight/binding/input/touch/AbsoluteTouchContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/AbsoluteTouchContext.java) | 261 | Modo "Absolute touch" (modos 1 e 5): mapeia o toque diretamente para posição absoluta do cursor no host, com dead zone de toque, long-press virando botão secundário e scroll vertical com o segundo dedo. Suporta troca de botões primário/secundário. |
| [`app/src/main/java/com/limelight/binding/input/touch/RelativeTouchContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/RelativeTouchContext.java) | 331 | Modo "Track pad (Gaming)" (modo 3): movimento relativo escalado pela resolução de referência 1280x720, drag por long press (650ms), scroll de 2 dedos e único contexto que respeita `prefConfig.absoluteMouseMode` e os sliders `touchPadSensitivity`/`touchPadYSensitity`. |
| [`app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java) | 170 | Provider padrão em Android 8+. Faz request/release de pointer capture, monitora hotplug de dispositivos via InputManager.InputDeviceListener, filtra touchscreens para contornar a regressão do S-Pen no Android 12 e extrai os eixos relativos (incluindo o histórico do MotionEvent). |
| [`app/src/main/java/com/limelight/binding/input/capture/InputCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/InputCaptureProvider.java) | 57 | Contrato abstrato de captura: estado isCapturing/isCursorVisible, hooks show/hideCursor e API de eixos relativos com overloads (event) e (event, pointerIndex). Base para os 5 providers. |
| [`app/src/main/java/com/limelight/binding/input/capture/InputCaptureManager.java`](../../app/src/main/java/com/limelight/binding/input/capture/InputCaptureManager.java) | 38 | Fábrica que escolhe o provider em cascata: Android O+ nativo > extensão NVIDIA Shield (exceto em build root) > evdev root > apenas esconder cursor (N) > NullCaptureProvider. |
| [`app/src/main/java/com/limelight/binding/input/capture/ShieldCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/ShieldCaptureProvider.java) | 93 | Provider legado para NVIDIA Shield via reflection (InputManager.setCursorVisibility + AXIS_RELATIVE_X/Y). Só usado quando o dispositivo expõe a extensão NVIDIA e o build não é root. |
| [`app/src/main/java/com/limelight/binding/input/capture/AndroidPointerIconCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/AndroidPointerIconCaptureProvider.java) | 35 | Fallback Android N: não captura o ponteiro, apenas troca o PointerIcon por TYPE_NULL sobre a view do stream. É a superclasse do provider nativo O+ (para o caso de DeX/ChromeOS onde a captura falha). |
| [`app/src/main/java/com/limelight/binding/input/touch/TouchContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/TouchContext.java) | 11 | Interface de 7 métodos que padroniza os três modos de toque. Ponto de extensão natural para novos modos (ex.: modo com teclado aberto). |
| [`app/src/main/java/com/limelight/utils/PanZoomHandler.java`](../../app/src/main/java/com/limelight/utils/PanZoomHandler.java) | 173 | Zoom por pinça e pan do vídeo. Aplica setScaleX/Y e setX/Y na SurfaceView INTERNA (streamContainer.getSurfaceView()), com pivô em 0,0 e clamp de bordas. Só recebe eventos quando isPanZoomMode está ativo (Game.java:3075-3079). |
| [`app/src/main/java/com/limelight/ui/StreamContainer.java`](../../app/src/main/java/com/limelight/ui/StreamContainer.java) | 273 | FrameLayout que hospeda a SurfaceView/GLSurfaceView, faz o aspect-fit em onMeasure (por isso getX() != 0 quando há letterbox) e expõe a InputConnection que habilita commitText do IME (base para envio de texto inteiro). |
| [`app/src/main/jni/moonlight-core/simplejni.c`](../../app/src/main/jni/moonlight-core/simplejni.c) | 271 | Ponte JNI fina para moonlight-common-c. Todos os eventos de ponteiro desta dimensão terminam aqui. |
| [`app/src/main/java/com/limelight/nvstream/NvConnection.java`](../../app/src/main/java/com/limelight/nvstream/NvConnection.java) | 700 | Wrapper Java sobre MoonBridge com guarda isMonkey. Toda chamada dos TouchContexts passa por aqui. |
| [`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 1100 | Carrega todas as prefs de toque/mouse e traduz mouse_mode_list nos flags enableMultiTouchScreen/touchscreenTrackpad. |
| [`app/src/root/java/com.limelight/binding/input/evdev/EvdevCaptureProvider.java`](../../app/src/root/java/com.limelight/binding/input/evdev/EvdevCaptureProvider.java) | 347 | Provider exclusivo de builds root: sobe libevdev_reader.so via su, grava/libera o device evdev e traduz REL_X/REL_Y/REL_WHEEL/BTN_* para os callbacks EvdevListener implementados em Game.java:3848+. |
| [`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardTouchPadButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardTouchPadButton.java) | 282 | Trackpad virtual desenhado no overlay de teclado (elementos m_9/m_11). Usa a mesma escala 1280x720 do RelativeTouchContext e os sliders touchPadSensitivity. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/Game.java`**
- `handleMotionEvent(View, MotionEvent) :2756`
- `handleTouchInput(event, contextMap, isTouchScreen) :3121`
- `handleTouchInput(event, contextMap, isTouchScreen, invertAxis, eventAction, actionIndex, pointerCount) :3126`
- `handleMultiTouchGesture() :3288`
- `cancelStaleTouchState() :3336`
- `updateMousePosition(View, MotionEvent) :3353`
- `trySendTouchEvent() :2727`
- `sendTouchEventForPointer() :2717`
- `trySendPenEvent() :2673`
- `sendPenEventForPointer() :2636`
- `convertToolTypeToStylusToolType() :2662`
- `getLiTouchTypeFromEvent() :2412`
- `getStreamViewRelativeNormalizedXY() :2503`
- `getNormalizedCoordinates() :2532`
- `getStreamViewRelativeSensitivityXY() :2457`
- `getStreamViewNormalizedContactArea() :2589`
- `getPressureOrDistance() :2546`
- `getRotationDegrees() :2567`
- `getTouchContext() :2391`
- `applyMouseMode(int) :4153`
- `initMouseMode() :4032`
- `selectMouseMode(Context) :4091`
- `toggleMouseLocalCursor() :4140`
- `setInputGrabState(boolean) :1864`
- `onTouch(View, MotionEvent) :3412`
- `onGenericMotion(View, MotionEvent) :3406`
- `onGenericMotionEvent(MotionEvent) :3348`
- `onWindowFocusChanged(boolean) :1403`
- `mouseMove(int,int) [EvdevListener] :3848`
- `mouseButtonEvent(int,boolean) :3853`
- `mouseVScroll(byte) :3887`
- `mouseHScroll(byte) :3892`
- `handleCommitText(CharSequence) :4290`
- `enqueueCommitText(String) :4314`
- `touchContextMap/trackpadContextMap :149-150`
- `THREE/FOUR/FIVE_FINGER_TAP_THRESHOLD :165-167`
- `STYLUS_DOWN/UP_DEAD_ZONE_* :159-163`
- `REFERENCE_HORIZ_RES/VERT_RES :156-157`

**`app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java`**
- `momentumRunnable :75-109`
- `scrollMomentumRunnable :111-144`
- `touchDownEvent() :182`
- `touchUpEvent() :238`
- `touchMoveEvent() :305`
- `setPointerCount() :434`
- `getMouseButtonIndex() :170`
- `isTap() :157`
- `checkForConfirmedMove() :463`
- `checkForConfirmedScroll() :482`
- `cancelTouch() :415`
- `TAP_MOVEMENT_THRESHOLD=30 / TAP_TIME_THRESHOLD=230 :42-43`
- `SCROLL_SPEED_FACTOR_X=2 / _Y=3 :45-46`
- `ACCELERATION_THRESHOLD=8.0 :47`
- `FLICK_FRICTION=0.93 / FLICK_THRESHOLD=0.8 :48-50`
- `SCROLL_TRANSITION_TIMEOUT_MS=200 :53`

**`app/src/main/java/com/limelight/binding/input/touch/AbsoluteTouchContext.java`**
- `touchDownEvent() :96`
- `touchUpEvent() :133`
- `touchMoveEvent() :205`
- `updatePosition() :121`
- `tapConfirmed() :187`
- `longPressRunnable :26-39`
- `tapDownRunnable :41-47`
- `setPointerCount() :256`
- `LONG_PRESS_TIME_THRESHOLD=650 :63`
- `DOUBLE_TAP_TIME_THRESHOLD=250 :66`
- `TOUCH_DOWN_DEAD_ZONE_TIME_THRESHOLD=100 :69`
- `SCROLL_SPEED_FACTOR=3 :61`

**`app/src/main/java/com/limelight/binding/input/touch/RelativeTouchContext.java`**
- `touchDownEvent() :149`
- `touchUpEvent() :174`
- `touchMoveEvent() :241`
- `dragTimerRunnable :34-51`
- `buttonUpRunnables[] :54-85`
- `checkForConfirmedMove() :211`
- `checkForConfirmedScroll() :233`
- `getMouseButtonIndex() :138`
- `DRAG_TIME_THRESHOLD=650 :90`
- `SCROLL_SPEED_FACTOR=5 :92`
- `uso de absoluteMouseMode :274-283`

**`app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java`**
- `hasCaptureCompatibleInputDevice() :35`
- `hideCursor() :76`
- `showCursor() :65`
- `onWindowFocusChanged() :89`
- `eventHasRelativeMouseAxes() :113`
- `getRelativeAxisX() :123`
- `getRelativeAxisY() :134`
- `onInputDeviceAdded/Removed/Changed :145-169`

**`app/src/main/java/com/limelight/binding/input/capture/InputCaptureProvider.java`**
- `enableCapture() :9`
- `disableCapture() :14`
- `isCapturingActive() :24`
- `eventHasRelativeMouseAxes() :36`
- `getRelativeAxisX(event,idx) :40`
- `getRelativeAxisX(event) :44`
- `getRelativeAxisY(event,idx) :48`
- `getRelativeAxisY(event) :52`

**`app/src/main/java/com/limelight/binding/input/capture/InputCaptureManager.java`**
- `getInputCaptureProvider(Activity, EvdevListener) :12`

**`app/src/main/java/com/limelight/binding/input/capture/ShieldCaptureProvider.java`**
- `static init por reflection :27-41`
- `setCursorVisibility() :51`
- `eventHasRelativeMouseAxes() :77`
- `getRelativeAxisX(event,idx) :85`
- `getRelativeAxisY(event) :90`

**`app/src/main/java/com/limelight/binding/input/capture/AndroidPointerIconCaptureProvider.java`**
- `hideCursor() :25`
- `showCursor() :31`

**`app/src/main/java/com/limelight/binding/input/touch/TouchContext.java`**
- `touchDownEvent(x,y,time,isNewFinger) :6`
- `touchMoveEvent() :7`
- `touchUpEvent() :8`
- `setPointerCount() :5`
- `cancelTouch() :9`

**`app/src/main/java/com/limelight/utils/PanZoomHandler.java`**
- `PanZoomHandler(ctx, game, streamView, parent, prefConfig) :28`
- `handleTouchEvent() :42`
- `constrainToBounds() :54`
- `handleSurfaceChange() :79`
- `ScaleListener.onScale() :113`
- `GestureListener.onScroll() :147`
- `setInitialZoomAndPan() :159`
- `MAX_SCALE=10.0f :14`

**`app/src/main/java/com/limelight/ui/StreamContainer.java`**
- `onMeasure() :114`
- `getSurfaceView() :215`
- `onCreateInputConnection() :186`
- `onCheckIsTextEditor() :181`
- `setCommitTextEnabled() :156`
- `onKeyPreIme() :161`

**`app/src/main/jni/moonlight-core/simplejni.c`**
- `sendMouseMove -> LiSendMouseMoveEvent :14`
- `sendMousePosition -> LiSendMousePositionEvent :30`
- `sendMouseMoveAsMousePosition :36`
- `sendMouseButton :42`
- `sendTouchEvent -> LiSendTouchEvent :57`
- `sendPenEvent -> LiSendPenEvent :67`
- `sendMouseHighResScroll :117`
- `sendMouseHighResHScroll :122`
- `sendUtf8Text -> LiSendUtf8TextEvent :127`

**`app/src/main/java/com/limelight/nvstream/NvConnection.java`**
- `sendMouseMove() :490`
- `sendMousePosition() :497`
- `sendMouseMoveAsMousePosition() :504`
- `sendMouseButtonDown/Up() :511-523`
- `sendMouseHighResScroll() :555`
- `sendMouseHighResHScroll() :561`
- `sendTouchEvent() :567`
- `sendPenEvent() :578`
- `sendUtf8Text() :619`

**`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`**
- `switch mouse_mode_list :897-916`
- `trackpadSensitivityX/Y :999-1000`
- `trackpadDragDropThreshold :1002`
- `trackpadSwapAxis :1003`
- `absoluteMouseMode :1005`
- `ignoreSynthEvents :1009`
- `touchPadSensitivity :995`
- `touchPadYSensitity :997`
- `touchSensitivityX/Y :970-972`
- `enableMultiTouchGestures :982`
- `enableMouseLocalCursor :980`

**`app/src/root/java/com.limelight/binding/input/evdev/EvdevCaptureProvider.java`**
- `handlerThread.run() :36-198`
- `enableCapture() :274`
- `hideCursor()/showCursor() (GRAB/UNGRAB) :237-271`
- `destroy() :288`

**`app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardTouchPadButton.java`**
- `onElementTouchEvent() :222`
- `xFactor/yFactor 1280x720 :227-228`
- `onMoveCallback com touchPadSensitivity :256`

</details>

## Fluxo

FASE 0 — CAPTURA/FOCO: em `Game.onCreate` o provider é escolhido (`Game.java:526` → `InputCaptureManager.java:12`) e `requestUnbufferedDispatch` é pedido para POINTER/POSITION/TRACKBALL em `streamContainer` e `backgroundTouchView` (`Game.java:498-515`); `onTouch` repete o pedido por gesto em ACTION_DOWN (`Game.java:3413-3418`). `setInputGrabState(true)` (`Game.java:1864`) chama `enableCapture()` → `hideCursor()` → `requestPointerCapture()` (`AndroidNativePointerCaptureProvider.java:76-86`). Ao perder/ganhar foco, `Game.onWindowFocusChanged` (`Game.java:1403-1413`) delega ao provider que re-captura com 500ms de atraso (`AndroidNativePointerCaptureProvider.java:89-110`).\n\nFASE 1 — ENTRADA: eventos chegam por `onTouch` (backgroundTouchView, dedos), `onGenericMotion` (streamContainer, hover/scroll/mouse) ou `onGenericMotionEvent` (Activity, `view==null`), todos convergindo em `handleMotionEvent(view, event)` (`Game.java:2756`). Guardas iniciais: `!grabbedInput` → devolve o evento ao Android (`Game.java:2758-2760`); `ignoreSynthEvents && deviceId <= 0` → descarta injeções sintéticas (`Game.java:2763-2765`).\n\nFASE 2 — ROTEAMENTO POR FONTE (`Game.java:2767-2792`): (a) `SOURCE_CLASS_JOYSTICK` → `ControllerHandler.handleMotionEvent`; (b) device com joystick mas evento de touchpad → `ControllerHandler.tryHandleTouchpadEvent` (`ControllerHandler.java:1799`), que vira `LiSendControllerTouchEvent`; (c) demais ponteiros entram no bloco 2777-3115. Dentro dele, a condição 2783-2792 decide "mouse/caneta" vs "dedo": é mouse se `SOURCE_MOUSE`, ou `SOURCE_CLASS_POSITION` com `getActionButton()!=0`, ou `SOURCE_MOUSE_RELATIVE`, ou toolType ∈ {MOUSE, STYLUS, ERASER}, ou source==12290 (DeX).\n\nFASE 3A — CAMINHO MOUSE/CANETA (`Game.java:2793-3062`): normaliza clique de 2 dedos em touchpad para BUTTON_SECONDARY (2797-2812); aborta se a captura não está ativa (2815-2819); então escolhe UMA das quatro estratégias de posição, nesta ordem: (1) eixos relativos sob captura → `getRelativeAxisX/Y` somando histórico → `sendMouseMove` ou, se `absoluteMouseMode`, `sendMouseMoveAsMousePosition` com as dimensões do streamContainer (2824-2839); (2) touchpad sem captura (Android < O) → converte coordenadas do device pelo `MotionRange` e manda `sendMousePosition` (2840-2865); (3) caneta com host Sunshine → `trySendPenEvent` (2866-2869); (4) fallback com view: dedo em touchpad emulado (2871-2962) ou `updateMousePosition` para mouse/caneta absolutos (2963-2965). Depois, sempre: scroll `AXIS_VSCROLL/HSCROLL * 120` (2968-2972), diffs de botão primário/secundário/terciário/X1/X2 via XOR com `lastButtonState` (2974-3021), e o par down/up de caneta/borracha (3023-3059), fechando com `lastButtonState = buttonState` (3061).\n\nFASE 3B — CAMINHO DEDO (`Game.java:3064-3110`): se `SOURCE_TOUCHPAD` → `handleTouchInput(event, trackpadContextMap, false)`; senão: ignora se o controle virtual está em modo de edição (3068-3073); se `isPanZoomMode` → `panZoomHandler.handleTouchEvent` e retorna (3075-3079); se `touchContextMap[0]==null` (modo 4, desabilitado) retorna (3082-3084); se `enableMultiTouchGestures || !enableMultiTouchScreen` e há >2 dedos → `handleMultiTouchGesture` (3086-3101); se `enableMultiTouchScreen && !touchscreenTrackpad` → tenta `trySendTouchEvent` (toque nativo Sunshine) (3103-3107); caso contrário → `handleTouchInput(event, touchContextMap, true)` (3109).\n\nFASE 4 — DISTRIBUIÇÃO PARA OS CONTEXTOS (`handleTouchInput`, `Game.java:3121-3286`): `getTouchContext(actionIndex)` limita a 2 ponteiros (`Game.java:2391-2399`). Em ACTION_MOVE percorre primeiro o histórico (`getHistoricalX/Y`, 3142-3175) e depois os valores atuais (3178-3204), chamando `touchMoveEvent` para cada contexto com índice < pointerCount; com `isTouchScreen` aplica `getNormalizedCoordinates(streamContainer, ...)` (3150, 3185); com `invertAxis` troca X↔Y (3160-3172, 3191-3196) para desfazer a inversão dupla dos swipes sintéticos. Em DOWN/POINTER_DOWN chama `setPointerCount` em todos os contextos e `touchDownEvent(..., isNewFinger=true)` (3221-3227). Em UP/POINTER_UP: no modo trackpad checa taps de 3/4/5 dedos (3230-3249); trata `FLAG_CANCELED` como `cancelTouch()` (3250-3252); chama `touchUpEvent`; decrementa `setPointerCount`; e, se o dedo primário saiu com outros ainda na tela, promove o ponteiro 1 a primário com `touchDownEvent(..., isNewFinger=false)` (3260-3273). Em ACTION_CANCEL cancela todos (3275-3280).\n\nFASE 5 — CONTEXTO → PROTOCOLO: `AbsoluteTouchContext.updatePosition` clampa e chama `conn.sendMousePosition(x, y, viewW, viewH)`; `RelativeTouchContext.touchMoveEvent` escala por 1280x720 e chama `sendMouseMove` ou `sendMouseMoveAsMousePosition`; `TrackpadContext.touchMoveEvent` aplica `cbrt(magnitude/8)` de aceleração, multiplica pelas sensibilidades, acumula em `pendingDelta*`, envia `sendMouseMove` (1 dedo) ou `sendMouseHighResHScroll/-Scroll` (2 dedos), e mantém um EMA de velocidade (0.8/0.2) usado pelo flick.\n\nFASE 6 — INÉRCIA (`TrackpadContext.java:75-144`): em `touchUpEvent` a velocidade decai proporcionalmente ao tempo parado (238-250); se `speed > 0.8 px/ms` inicia `momentumRunnable` (movimento) ou `scrollMomentumRunnable` (scroll) a cada 10ms com atrito 0.93 até a velocidade cair abaixo de 0.5 px/frame.\n\nFASE 7 — REDE: tudo desce por `NvConnection` (`NvConnection.java:490-588`) → `MoonBridge` (JNI) → `simplejni.c:14/30/42/57/67/117/122` → `LiSend*Event` em `moonlight-common-c/src/InputStream.c`. `LiSendTouchEvent`/`LiSendPenEvent` retornam `LI_ERR_UNSUPPORTED` (-5501) se o host não anunciar `LI_FF_PEN_TOUCH_EVENTS` (`InputStream.c:1313-1316`) — é esse retorno que faz o cliente cair para o fallback de mouse. `LiSendHighResHScrollEvent` exige `IS_SUNSHINE()` (`InputStream.c:1269-1272`). Eventos de move/hover são marcados como descartáveis (não-reliable) e os de estado como ENET reliable (`InputStream.c:1327`).

## Interfaces externas

- android.view.MotionEvent — getActionMasked/getActionIndex/getPointerCount/getPointerId/getToolType/getButtonState/getActionButton/getFlags(FLAG_CANCELED)/getHistoricalX,Y/getHistoricalEventTime/getAxisValue/getPressure/getOrientation/getToolMajor,Minor/getTouchMajor,Minor/getClassification
- android.view.MotionEvent axes — AXIS_X, AXIS_Y, AXIS_RELATIVE_X, AXIS_RELATIVE_Y, AXIS_VSCROLL, AXIS_HSCROLL, AXIS_DISTANCE, AXIS_ORIENTATION, AXIS_TILT
- android.view.InputDevice — SOURCE_MOUSE, SOURCE_MOUSE_RELATIVE, SOURCE_TOUCHPAD, SOURCE_TOUCHSCREEN, SOURCE_CLASS_POINTER/POSITION/JOYSTICK/TRACKBALL/BUTTON, getMotionRange(), getDeviceIds(), supportsSource()
- android.view.View — requestPointerCapture(), releasePointerCapture(), hasPointerCapture(), setPointerIcon(PointerIcon.TYPE_NULL), requestUnbufferedDispatch(), dispatchTouchEvent(), setScaleX/Y, setX/Y, setPivotX/Y
- android.hardware.input.InputManager — InputDeviceListener (hotplug de mouse/trackpad) e, por reflection na Shield, setCursorVisibility(boolean)
- android.view.ScaleGestureDetector e android.view.GestureDetector — pinça e pan em PanZoomHandler
- android.view.inputmethod.InputMethodManager.toggleSoftInput() — abre/fecha teclado no gesto de 3 dedos (Game.java:2407-2408)
- android.view.inputmethod.BaseInputConnection.commitText()/deleteSurroundingText() — canal de texto do IME (StreamContainer.java:186-202, StreamView.java:131-157)
- android.os.Vibrator / VibrationEffect.createOneShot(20,127) — feedback do drag-and-drop de trackpad (Game.java:2901-2907)
- MotionEvent.CLASSIFICATION_TWO_FINGER_SWIPE (API 29+) — detecção do swipe de 2 dedos sintetizado pelo Android (Game.java:2875)
- JNI com.limelight.nvstream.jni.MoonBridge → simplejni.c: LiSendMouseMoveEvent, LiSendMousePositionEvent, LiSendMouseMoveAsMousePositionEvent, LiSendMouseButtonEvent, LiSendHighResScrollEvent, LiSendHighResHScrollEvent, LiSendTouchEvent, LiSendPenEvent, LiSendUtf8TextEvent
- Protocolo Sunshine/Apollo — SS_TOUCH_MAGIC / CTRL_CHANNEL_TOUCH, feature flag LI_FF_PEN_TOUCH_EVENTS, LI_ERR_UNSUPPORTED=-5501, LI_TOUCH_EVENT_* (0x00..0x07), LI_TOOL_TYPE_PEN/ERASER, LI_PEN_BUTTON_PRIMARY/SECONDARY/TERTIARY, LI_TILT_UNKNOWN=0xFF, LI_ROT_UNKNOWN=0xFFFF, LI_WHEEL_DELTA=120
- evdev via root (build ROOT_BUILD) — libevdev_reader.so lançado por `su`, socket TCP local, EV_REL/EV_KEY/EV_SYN, REL_X/REL_Y/REL_WHEEL/REL_HWHEEL, BTN_LEFT/RIGHT/MIDDLE/SIDE/EXTRA
- Meta-data NVIDIA Shield no manifesto — com.nvidia.immediateInput e com.nvidia.rawCursorInput (AndroidManifest.xml:209-214) para desligar aceleração de mouse
- Samsung DeX — source mágico 12290 tratado como mouse de desktop (Game.java:2791, 2932-2939)
- ChromeOS — system feature `org.chromium.arc.device_management` usada para não pular touchscreens ao avaliar captura (AndroidNativePointerCaptureProvider.java:50)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🟠 alto | bug | Flick/inércia libera o botão de mouse errado, deixando botão direito/meio preso no host | `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:99-102` |
| 🟠 alto | bug | Coordenadas de toque absoluto e de caneta ignoram o zoom/pan do vídeo | `app/src/main/java/com/limelight/Game.java:2532-2540` |
| 🟠 alto | ux | Modo "Track pad (Natural)" na tela ignora sensibilidade e swap de eixo configurados | `app/src/main/java/com/limelight/Game.java:4186` |
| 🟠 alto | bug | ACTION_CANCEL no trackpad emulado deixa o botão esquerdo pressionado no host | `app/src/main/java/com/limelight/Game.java:2914-2962` |
| 🟡 médio | bug | `pointerSwiping` só é limpo em ACTION_UP; um cancelamento congela o cliente em modo scroll | `app/src/main/java/com/limelight/Game.java:2874-2886` |
| 🟡 médio | compatibility | `TrackpadContext` ignora a preferência `absoluteMouseMode` | `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:375-381` |
| 🟡 médio | maintainability | `getMouseButtonIndex()` tem efeito colateral (muta `clickedMiddle`) | `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:170-179` |
| 🟡 médio | bug | `ShieldCaptureProvider` sobrescreve overloads assimétricos de eixo relativo | `app/src/main/java/com/limelight/binding/input/capture/ShieldCaptureProvider.java:85-92` |
| 🟡 médio | tech-debt | Lógica de tap de 3/4/5 dedos duplicada em dois lugares com regras divergentes | `app/src/main/java/com/limelight/Game.java:3230-3249` |
| 🟡 médio | ux | Teclado virtual cobre o stream: não há tratamento de insets de IME nem `windowSoftInputMode` | `app/src/main/AndroidManifest.xml:193-204` |
| 🟡 médio | tech-debt | Apenas 2 pontos de toque são suportados nos modos de emulação de mouse | `app/src/main/java/com/limelight/Game.java:149-150` |
| 🟡 médio | bug | Ajuste de sensibilidade de tela compara coordenada de view com largura do display físico | `app/src/main/java/com/limelight/Game.java:2463` |
| 🟡 médio | maintainability | `Game.java` concentra ~700 linhas de roteamento de input num único método/arquivo | `app/src/main/java/com/limelight/Game.java:2756-3421` |
| ⚪ baixo | bug | `cancelStaleTouchState` pode lançar NPE quando o evento veio de `onGenericMotionEvent` | `app/src/main/java/com/limelight/Game.java:3336-3340` |
| ⚪ baixo | maintainability | Código morto/duplicado em `TrackpadContext.touchDownEvent` | `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:188-191` |
| ⚪ baixo | performance | Alocação de String por evento de movimento no mapa de sensibilidade | `app/src/main/java/com/limelight/Game.java:2467` |
| ⚪ baixo | compatibility | Fonte mágica 12290 para Samsung DeX espalhada sem constante nomeada | `app/src/main/java/com/limelight/Game.java:2791` |
| ⚪ baixo | ux | Scroll horizontal ausente no modo Absolute touch | `app/src/main/java/com/limelight/binding/input/touch/AbsoluteTouchContext.java:223-225` |
| ⚪ baixo | bug | Mistura de deltas brutos e processados na decisão de eixo do scroll | `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:391-401` |

### Detalhe

#### 🟠 alto Flick/inércia libera o botão de mouse errado, deixando botão direito/meio preso no host

**Local:** `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:99-102` · **Categoria:** bug

`momentumRunnable` finaliza a inércia chamando `conn.sendMouseButtonUp(getMouseButtonIndex())`. `getMouseButtonIndex()` (linha 170-179) decide o botão a partir do campo `pointerCount` ATUAL, mas quando a inércia termina todos os dedos já saíram e `pointerCount` vale 0, retornando sempre BUTTON_LEFT. Se o drag tinha sido iniciado com 2 dedos (BUTTON_RIGHT) ou 3 (BUTTON_MIDDLE), o cliente envia um `up` de LEFT e nunca solta o botão realmente pressionado. Agrava porque `setPointerCount()` (linha 447) pula a liberação justamente quando `isFlicking` é verdadeiro.

**Correção sugerida:** Guardar o byte do botão no momento em que `confirmedDrag` vira true (ex.: campo `activeDragButton`) e usar esse valor em `momentumRunnable`, `cancelTouch()` e `setPointerCount()`, em vez de recalcular por `getMouseButtonIndex()`. Adicionalmente, em `cancelTouch()` (linha 415-426) parar a inércia ANTES de decidir o botão.

#### 🟠 alto Coordenadas de toque absoluto e de caneta ignoram o zoom/pan do vídeo

**Local:** `app/src/main/java/com/limelight/Game.java:2532-2540` · **Categoria:** bug

`PanZoomHandler` é construído com `streamContainer.getSurfaceView()` como alvo da transformação (Game.java:481-487; PanZoomHandler.java:28-40, 129-133, 151-152), ou seja, escala e translação são aplicadas na SurfaceView INTERNA. Já `getNormalizedCoordinates()` lê `streamView.getScaleX()/getX()` do `streamContainer` (o pai, que nunca é escalado pelo PanZoomHandler), e `getStreamViewRelativeNormalizedXY` (2523-2527) e `AbsoluteTouchContext.updatePosition` (AbsoluteTouchContext.java:126-129) normalizam pelas dimensões do container. Resultado: com zoom > 1 ou pan ativo, o ponto tocado na tela não corresponde ao pixel do host — o erro cresce proporcionalmente ao fator de escala.

**Correção sugerida:** Centralizar a conversão numa única função que use a view realmente transformada (`streamContainer.getSurfaceView()`): `x_video = (x_tela - surface.getX()) / surface.getScaleX()`, dividindo depois por `surface.getWidth()`. Passar essa view (e não o container) para `AbsoluteTouchContext`/`RelativeTouchContext` em `applyMouseMode` (Game.java:4182-4184) e para os cálculos de `sendTouchEventForPointer`/`sendPenEventForPointer`.

#### 🟠 alto Modo "Track pad (Natural)" na tela ignora sensibilidade e swap de eixo configurados

**Local:** `app/src/main/java/com/limelight/Game.java:4186` · **Categoria:** ux

Em `applyMouseMode`, o trackpad de touchscreen é criado com `new TrackpadContext(conn, i)` — o construtor de 2 argumentos (TrackpadContext.java:55-59), que deixa `sensitivityX = sensitivityY = 1` e `swapAxis = false`. Já os contextos de trackpad físico são criados com o construtor completo (Game.java:817). Consequência: os sliders `seekbar_trackpad_sensitivity_x/y` e o checkbox `checkbox_trackpad_swap_axis` (preferences.xml:411-452), anunciados como "Trackpad Sensitivity", não têm nenhum efeito no modo de trackpad por tela — que é justamente o modo padrão forçado em display externo e em sessão input-only (Game.java:824).

**Correção sugerida:** Usar `new TrackpadContext(conn, i, prefConfig.trackpadSwapAxis, prefConfig.trackpadSensitivityX, prefConfig.trackpadSensitivityY)` também na linha 4186, ou introduzir prefs separadas (ex.: `virtual_trackpad_sensitivity_*`) e documentar a diferença entre trackpad físico e virtual.

#### 🟠 alto ACTION_CANCEL no trackpad emulado deixa o botão esquerdo pressionado no host

**Local:** `app/src/main/java/com/limelight/Game.java:2914-2962` · **Categoria:** bug

O emulador de clique/drag para dedo em touchpad sem captura mantém os estados `synthClickPending`, `pendingDrag` e `isDragging` e envia `sendMouseButtonDown(BUTTON_LEFT)` na linha 2909 quando o drag-and-drop é confirmado. O `switch (eventAction)` das linhas 2914-2962 trata MOVE/DOWN/UP/BUTTON_PRESS/BUTTON_RELEASE mas NÃO trata `MotionEvent.ACTION_CANCEL` (cai no `default: break`). Se o gesto for cancelado pelo sistema (ex.: janela perde foco, gesto do sistema, `cancelStaleTouchState`), o `up` correspondente nunca é enviado e o botão esquerdo fica travado no host.

**Correção sugerida:** Adicionar `case MotionEvent.ACTION_CANCEL:` junto ao ramo de UP, ou extrair um método `resetSynthTrackpadState()` que envie `sendMouseButtonUp(BUTTON_LEFT)` quando `isDragging` e zere `isDragging/pendingDrag/synthClickPending/pointerSwiping`, chamando-o também em `onWindowFocusChanged`, `onPause` e em `cancelStaleTouchState`.

#### 🟡 médio `pointerSwiping` só é limpo em ACTION_UP; um cancelamento congela o cliente em modo scroll

**Local:** `app/src/main/java/com/limelight/Game.java:2874-2886` · **Categoria:** bug

O flag `pointerSwiping` é ligado ao detectar `CLASSIFICATION_TWO_FINGER_SWIPE` (2875-2879) e só é desligado no ramo `pointerSwiping && eventAction == ACTION_UP` (2881-2886). Se o gesto terminar com ACTION_CANCEL (comum quando o gesto do sistema intercepta) o flag permanece true; como o ramo 2880 é avaliado antes do resto, movimentos subsequentes de 1 dedo continuam sendo injetados como ACTION_MOVE de 2 ponteiros em `trackpadContextMap`, ou seja, a tela vira um scroll permanente até um novo UP acontecer.

**Correção sugerida:** Incluir `ACTION_CANCEL` (e `ACTION_POINTER_UP` com FLAG_CANCELED) na condição de reset da linha 2881 e emitir também o `ACTION_POINTER_UP` sintético para não deixar os TrackpadContexts com `pointerCount == 2` residual.

#### 🟡 médio `TrackpadContext` ignora a preferência `absoluteMouseMode`

**Local:** `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:375-381` · **Categoria:** compatibility

`RelativeTouchContext` respeita `prefConfig.absoluteMouseMode` e converte deltas em posição absoluta via `sendMouseMoveAsMousePosition` (RelativeTouchContext.java:274-283), assim como o caminho de mouse capturado em Game.java:2830-2837. `TrackpadContext` sempre chama `conn.sendMouseMove()` (linhas 379, 386, 89) e nunca recebe o `PreferenceConfiguration` no construtor. Em jogos/hosts onde o mouse relativo não funciona, o modo 2 (trackpad natural, que é o padrão em display externo/input-only) fica inutilizável, mesmo com a opção marcada.

**Correção sugerida:** Passar `PreferenceConfiguration` (ou apenas o boolean e as dimensões de referência) ao construtor de `TrackpadContext` e replicar o if de `RelativeTouchContext:274`. Idealmente extrair um helper `MouseMotionSink.move(dx, dy)` compartilhado pelos três contextos.

#### 🟡 médio `getMouseButtonIndex()` tem efeito colateral (muta `clickedMiddle`)

**Local:** `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:170-179` · **Categoria:** maintainability

O método, nomeado como getter, escreve `clickedMiddle = true` quando `pointerCount == 3`. Ele é chamado de pelo menos cinco lugares (`touchUpEvent:252`, `setPointerCount:448`, `cancelTouch:424`, `momentumRunnable:100`), então uma simples consulta do botão altera silenciosamente a máquina de estados que decide se o clique direito de 2 dedos deve ser suprimido (`touchDownEvent:220`). Isso torna o comportamento dependente da ordem das chamadas e é a raiz do bug de botão preso.

**Correção sugerida:** Separar em `byte resolveButtonForPointerCount(int n)` puro e um `markMiddleClicked()` explícito, chamado somente no ponto onde o clique do meio é realmente emitido.

#### 🟡 médio `ShieldCaptureProvider` sobrescreve overloads assimétricos de eixo relativo

**Local:** `app/src/main/java/com/limelight/binding/input/capture/ShieldCaptureProvider.java:85-92` · **Categoria:** bug

A classe sobrescreve `getRelativeAxisX(MotionEvent, int pointerIndex)` (linha 85) mas `getRelativeAxisY(MotionEvent)` (linha 90) — o overload sem índice. Como `InputCaptureProvider.getRelativeAxisY(event)` (linha 52) delega para `getRelativeAxisY(event, 0)`, qualquer chamador que use a versão com pointerIndex recebe 0 no eixo Y. Hoje só funciona por acidente porque Game.java:2826-2827 usa a variante sem índice; qualquer refactor que passe o índice (ex.: suporte a múltiplos ponteiros capturados) quebra silenciosamente o eixo Y em dispositivos Shield.

**Correção sugerida:** Uniformizar: sobrescrever sempre o overload `(MotionEvent, int)` nas duas coordenadas e remover os overloads sem índice da classe base, deixando apenas o delegate.

#### 🟡 médio Lógica de tap de 3/4/5 dedos duplicada em dois lugares com regras divergentes

**Local:** `app/src/main/java/com/limelight/Game.java:3230-3249` · **Categoria:** tech-debt

O mesmo gesto é decidido em `handleMultiTouchGesture` (3288-3334, ativado apenas quando `pointerCount > 2` em 3088) e novamente dentro de `handleTouchInput` (3230-3249, ativado apenas quando `prefConfig.touchscreenTrackpad` e `pointerCount == 1`). As duas cópias usam os mesmos campos (`threeFingerDownTime`, etc.) mas condições diferentes, e só a primeira chama `cancelStaleTouchState`. Manter os limiares e as ações (`toggleKeyboard`, `toggleFullKeyboard`, `showGameMenu`) sincronizados exige editar dois blocos; qualquer nova ação de gesto tende a ficar inconsistente entre modo trackpad e modo multi-touch.

**Correção sugerida:** Extrair um `MultiFingerGestureDetector` com `onPointerDown(count, time)` / `onPointerUp(count, time)` retornando um enum de ação, e chamá-lo de um único ponto em `handleTouchInput`. Ganho colateral: permite tornar as ações configuráveis (ver ideias de melhoria).

#### 🟡 médio Teclado virtual cobre o stream: não há tratamento de insets de IME nem `windowSoftInputMode`

**Local:** `app/src/main/AndroidManifest.xml:193-204` · **Categoria:** ux

A activity `.Game` não declara `android:windowSoftInputMode` e o layout roda em modo imersivo com `SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | SYSTEM_UI_FLAG_LAYOUT_STABLE` (Game.java:1660-1665). Não existe nenhum `setOnApplyWindowInsetsListener` na `Game` observando `WindowInsetsCompat.Type.ime()` — o único listener de IME do projeto está em `ExternalDisplayControlActivity.java:171-175` e só serve para controlar o dimming de brilho. Resultado: ao abrir o teclado (gesto de 3 dedos, `Game.java:2402-2410`), o IME simplesmente cobre a parte inferior do vídeo, que é exatamente a dor relatada pelo dono do fork. Como agravante, mesmo que a view fosse redimensionada, `AbsoluteTouchContext` usa `targetView.getWidth()/getHeight()` a cada evento (AbsoluteTouchContext.java:126-129) e `PanZoomHandler.handleSurfaceChange` (PanZoomHandler.java:79-109) só recalcula pan a partir do `surfaceChanged` do decoder — não há caminho que recalcule o mapeamento de toque ao vivo quando o IME abre.

**Correção sugerida:** 1) Declarar `android:windowSoftInputMode="adjustResize"` para `.Game`; 2) em `Game.onCreate`, `WindowCompat.setDecorFitsSystemWindows(window, false)` + `ViewCompat.setOnApplyWindowInsetsListener(rootView)` lendo `insets.getInsets(Type.ime()).bottom`; 3) aplicar esse bottom como `bottomMargin`/`paddingBottom` do `streamContainer` (ou um `translationY` negativo animado com `WindowInsetsAnimationCompat`); 4) ao mudar, chamar `panZoomHandler.handleSurfaceChange()` e cancelar os `TouchContext` ativos para não deixar botões pressos; 5) opcionalmente reenviar a resolução ao host se o modo de escala for STRETCH.

#### 🟡 médio Apenas 2 pontos de toque são suportados nos modos de emulação de mouse

**Local:** `app/src/main/java/com/limelight/Game.java:149-150` · **Categoria:** tech-debt

`touchContextMap` e `trackpadContextMap` têm tamanho fixo 2 e `getTouchContext` (2391-2399) devolve null para actionIndex >= 2, fazendo `handleTouchInput` retornar false (3128-3130). Isso significa que qualquer gesto com 3+ dedos nos modos 1/2/3/5 só é observado pelo detector de taps multi-dedo; não existe caminho para gestos contínuos de 3 dedos (ex.: arrastar janelas, swipe entre desktops), algo que o AnyDesk e trackpads reais oferecem. Também impede que o clique do meio com 3 dedos do `TrackpadContext.getMouseButtonIndex()` (linha 174) chegue por um contexto de índice 2.

**Correção sugerida:** Tornar o array dimensionado por uma constante (ex.: 5) e revisar as suposições de `actionIndex == 0/1` espalhadas por `TrackpadContext` (383, 483) e `RelativeTouchContext` (237, 253). Alternativamente, adicionar um gesto de 3 dedos explícito no `TrackpadContext` alimentado pelo `setPointerCount`.

#### 🟡 médio Ajuste de sensibilidade de tela compara coordenada de view com largura do display físico

**Local:** `app/src/main/java/com/limelight/Game.java:2463` · **Categoria:** bug

`getStreamViewRelativeSensitivityXY` decide se aplica a sensibilidade comparando `normalizedX < getResources().getDisplayMetrics().widthPixels/2`. `normalizedX` nesse ponto é `event.getX(pointerIndex)`, relativo à VIEW que recebeu o evento (que pode ser o `backgroundTouchView` ou o `streamContainer` letterboxed), enquanto `widthPixels` é a largura do display inteiro. Em telas com letterbox, split-screen, PiP ou display externo, a fronteira "metade direita" fica deslocada e a sensibilidade é aplicada na região errada. Além disso a divisão inteira e a leitura de `getResources()` acontecem a cada evento de move.

**Correção sugerida:** Usar `streamContainer.getWidth() / 2f` (ou a largura da view de origem do evento) e cachear o valor; extrair a lógica para uma classe `TouchSensitivityFilter` testável.

#### 🟡 médio `Game.java` concentra ~700 linhas de roteamento de input num único método/arquivo

**Local:** `app/src/main/java/com/limelight/Game.java:2756-3421` · **Categoria:** maintainability

`handleMotionEvent` tem ~360 linhas com aninhamento de até 7 níveis e mistura sete responsabilidades: filtro de fonte, captura, mouse relativo, touchpad legado, caneta, emulação de trackpad, gestos multi-dedo e scroll. Somado a `handleTouchInput`, `handleMultiTouchGesture`, `updateMousePosition` e os helpers de normalização, são ~700 linhas num arquivo de 4348. Não há nenhum teste unitário cobrindo esse caminho (`app/src/test/java` não contém testes de input). Qualquer alteração para atender às demandas de teclado/tela do dono do fork tem alto risco de regressão silenciosa em modos que ele não usa (DeX, ChromeOS, Shield, display externo).

**Correção sugerida:** EPIC de refactor: criar `com.limelight.binding.input.PointerInputRouter` com interface `PointerSink` (métodos move/position/button/scroll/touch/pen), mover a árvore de decisão para lá, e cobrir com testes JVM usando `MotionEvent.obtain(...)` (Robolectric já está configurado — ver robolectric.properties na raiz).

#### ⚪ baixo `cancelStaleTouchState` pode lançar NPE quando o evento veio de `onGenericMotionEvent`

**Local:** `app/src/main/java/com/limelight/Game.java:3336-3340` · **Categoria:** bug

`handleMotionEvent(null, event)` é chamado por `onGenericMotionEvent` (Game.java:3348-3349). O caminho de dedo chega em `handleMultiTouchGesture(event, action, pointerCount, view)` (3096) que chama `cancelStaleTouchState(event, view)`, o qual desreferencia `view.dispatchTouchEvent(cancelEvent)` sem checagem de nulo. É improvável em uso normal (eventos de dedo com POINTER_UP raramente chegam pelo canal de generic motion), mas é um crash em produção esperando um device exótico.

**Correção sugerida:** Guardar com `if (view != null)` antes do `dispatchTouchEvent`, ou usar `streamContainer` como fallback.

#### ⚪ baixo Código morto/duplicado em `TrackpadContext.touchDownEvent`

**Local:** `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:188-191` · **Categoria:** maintainability

As atribuições `originalTouchX = lastTouchX = eventX; originalTouchY = lastTouchY = eventY; pendingDeltaX = pendingDeltaY = 0;` aparecem idênticas nas linhas 188-191 e novamente nas linhas 229-232, no fim do mesmo método. O segundo bloco desfaz qualquer ajuste que os ramos intermediários fizessem, o que é confuso para quem for alterar a máquina de estados.

**Correção sugerida:** Remover a duplicata (manter apenas o bloco final, que é o efetivo) e adicionar comentário explicando que a reinicialização precisa ocorrer depois do tratamento de transição de dedos.

#### ⚪ baixo Alocação de String por evento de movimento no mapa de sensibilidade

**Local:** `app/src/main/java/com/limelight/Game.java:2467` · **Categoria:** performance

`sensitivityMap.get(String.valueOf(event.getPointerId(pointerIndex)))` e o `put` correspondente (linha 2491) criam uma String nova a cada ACTION_MOVE por ponteiro, num caminho que roda a 120-1000 Hz com `requestUnbufferedDispatch` ativo. Isso gera pressão de GC exatamente no thread de UI que precisa ter latência mínima para streaming.

**Correção sugerida:** Trocar por `android.util.SparseArray<SensitivityBean>` ou `HashMap<Integer, SensitivityBean>` com chave `Integer.valueOf` (cacheada para valores pequenos), e reutilizar os beans em vez de recriá-los.

#### ⚪ baixo Fonte mágica 12290 para Samsung DeX espalhada sem constante nomeada

**Local:** `app/src/main/java/com/limelight/Game.java:2791` · **Categoria:** compatibility

O literal `12290` (0x3002 = SOURCE_MOUSE | SOURCE_TOUCHSCREEN) aparece cru na condição de roteamento (2791) e novamente na lógica de clique sintético (2932), com o comentário "Samsung DeX mode desktop mouse". Não há constante, teste ou documentação; qualquer mudança de comportamento do DeX exige caçar os literais.

**Correção sugerida:** Definir `private static final int SOURCE_SAMSUNG_DEX_MOUSE = 12290;` com comentário explicando a decomposição em flags, e considerar substituir por `(source & SOURCE_MOUSE) != 0 && (source & SOURCE_TOUCHSCREEN) != 0`.

#### ⚪ baixo Scroll horizontal ausente no modo Absolute touch

**Local:** `app/src/main/java/com/limelight/binding/input/touch/AbsoluteTouchContext.java:223-225` · **Categoria:** ux

No modo absoluto o segundo dedo só produz scroll vertical (`sendMouseHighResScroll` com o delta Y). Não há chamada a `sendMouseHighResHScroll`, disponível no protocolo Sunshine e já usada por `TrackpadContext` (392, 399). Usuários de planilhas/timelines no host não conseguem rolar horizontalmente no modo mais usado por quem trabalha (não joga).

**Correção sugerida:** Espelhar a lógica de eixo dominante de `TrackpadContext.touchMoveEvent:390-401` dentro de `AbsoluteTouchContext.touchMoveEvent`, usando `lastTouchLocationX` para o delta horizontal.

#### ⚪ baixo Mistura de deltas brutos e processados na decisão de eixo do scroll

**Local:** `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:391-401` · **Categoria:** bug

A escolha do eixo dominante usa `absDeltaX/absDeltaY`, calculados a partir dos deltas BRUTOS do evento (linhas 332-339), enquanto os valores efetivamente enviados (`sendDeltaX/sendDeltaY`) vêm do acumulador `pendingDelta*` já multiplicado pela aceleração cúbica e pelas sensibilidades (342-346, 366-373). Com sensibilidades X e Y muito diferentes (as prefs permitem -200..200), o eixo considerado "dominante" pode não ser o de maior deslocamento real enviado, produzindo scroll cruzado inesperado.

**Correção sugerida:** Calcular `absDeltaX/absDeltaY` a partir de `sendDeltaX/sendDeltaY` (ou de `deltaX/deltaY` pós-sensibilidade) para que decisão e emissão usem a mesma escala.


## Ideias de melhoria

### Rastrear o botão ativo do drag no TrackpadContext (corrige botão preso)

**Tamanho:** quick-win

**Por quê:** Bug de severidade alta com correção pequena e localizada; botão direito preso no host é o tipo de falha que faz o usuário encerrar a sessão.

**Como:** Em `TrackpadContext.java`, adicionar `private byte activeDragButton = MouseButtonPacket.BUTTON_LEFT;` atribuído no mesmo ponto em que `confirmedDrag = true` (linhas 209, 317) e no `isDblClickPending`/tap (252). Usar `activeDragButton` em `momentumRunnable:100`, `touchUpEvent:256-270`, `setPointerCount:448` e `cancelTouch:424`. Transformar `getMouseButtonIndex()` em função pura recebendo o `pointerCount` como parâmetro.

**Risco:** Baixo; a máquina de estados é local à classe. Requer teste manual dos 4 gestos (tap 1/2/3 dedos, duplo-toque-arrasta, flick com 2 dedos).

### Aplicar sensibilidade/swap de eixo também ao trackpad de touchscreen

**Tamanho:** quick-win

**Por quê:** Preferências existentes e documentadas na UI não têm efeito no modo de trackpad mais usado (modo 2, padrão em display externo e input-only).

**Como:** Trocar `new TrackpadContext(conn, i)` por `new TrackpadContext(conn, i, prefConfig.trackpadSwapAxis, prefConfig.trackpadSensitivityX, prefConfig.trackpadSensitivityY)` em `Game.java:4186`. Se a intenção for separar trackpad físico de virtual, criar `seekbar_virtual_trackpad_sensitivity_x/y` em preferences.xml (categoria `category_virtual_trackpad_settings`, linha 808) e ler em PreferenceConfiguration perto da linha 999.

**Risco:** Usuários que já ajustaram os sliders para o trackpad físico verão o comportamento da tela mudar de uma vez. Mitigar com nota no changelog ou com prefs separadas.

### Indicador visual de modo de toque ativo

**Tamanho:** quick-win

**Por quê:** Com 6 modos de mouse, pan/zoom, cursor local e captura de ponteiro alternáveis em runtime (Game.java:4091-4151, 3992-4004), é fácil o usuário não saber por que o toque "parou de funcionar" — especialmente após `applyMouseMode(4)` (desabilitado) ou `isPanZoomMode`.

**Como:** Reutilizar `notificationOverlayView` (Game.java:225-226) e `updateZoomButtonAppearance` (4001-1009) para exibir um chip persistente com o modo atual; alternativamente, mudar o ícone do `overlayToggleZoomButton` (activity_game.xml:105-117). Emitir a notificação em `applyMouseMode` e `toggleMouseLocalCursor`.

**Risco:** Mínimo; apenas UI. Cuidar para não poluir a tela em sessões de jogo (respeitar `isHidingOverlays`, Game.java:222).

### Reset defensivo de estado sintético em cancelamento e perda de foco

**Tamanho:** small

**Por quê:** Três flags globais (`synthClickPending`, `pendingDrag`, `isDragging`, `pointerSwiping`) sobrevivem a ACTION_CANCEL e a perda de foco, causando botão esquerdo preso e modo scroll travado.

**Como:** Criar `private void resetSyntheticPointerState()` em `Game.java` que, se `isDragging`, envie `conn.sendMouseButtonUp(MouseButtonPacket.BUTTON_LEFT)` e zere os quatro flags. Chamar em: `case MotionEvent.ACTION_CANCEL` adicionado ao switch de 2914, no ramo de 2881, em `cancelStaleTouchState` (3336) e em `onWindowFocusChanged` (1403) quando `hasFocus == false`. Fazer o mesmo para `lastButtonState = 0` (Game.java:146) ao perder foco, evitando XOR fantasma no retorno.

**Risco:** Baixo. Cuidado para não enviar `up` espúrio quando o usuário estiver de fato com o botão físico pressionado ao alternar janelas.

### Fallback automático quando o host não suporta toque/caneta nativos

**Tamanho:** small

**Por quê:** `trySendTouchEvent`/`trySendPenEvent` retornam false a cada evento quando o host não anuncia `LI_FF_PEN_TOUCH_EVENTS` (InputStream.c:1313-1316), o que significa tentar e falhar dezenas de vezes por segundo antes de cair no caminho de mouse.

**Como:** Cachear o resultado num boolean `hostSupportsNativeTouch` na primeira resposta `LI_ERR_UNSUPPORTED` (Game.java:2724, 2659) e curto-circuitar as chamadas seguintes; resetar na reconexão. Exibir no overlay de notificação (`notificationOverlayView`) uma dica única informando que o host não suporta toque nativo.

**Risco:** Baixo. Atenção para não cachear um `false` causado por outro erro (o código já distingue apenas `LI_ERR_UNSUPPORTED`).

### Corrigir o descasamento entre zoom/pan e coordenadas de toque/caneta

**Tamanho:** medium

**Por quê:** Sem isso, qualquer melhoria de layout (incluindo o EPIC do IME) herda um erro de mapeamento proporcional ao fator de zoom. É também um bug visível hoje para quem usa o botão de zoom flutuante.

**Como:** Unificar a conversão numa função `float[] screenToVideoNormalized(float x, float y)` em `Game.java`, usando `streamContainer.getSurfaceView()` (a view que o `PanZoomHandler` realmente transforma, PanZoomHandler.java:30/129-133) em vez do `streamContainer`. Substituir as chamadas em `getNormalizedCoordinates` (2532-2540), `getStreamViewRelativeNormalizedXY` (2503-2530), `updateMousePosition` (3353-3403) e passar a mesma view para `AbsoluteTouchContext` em `applyMouseMode` (4182). Adicionar teste Robolectric com escala 2.0 e pan (-100,-50) verificando que o centro da tela mapeia para o centro do vídeo.

**Risco:** `getSurfaceView()` retorna a GLSurfaceView nos modos 3D (StreamContainer.java:86-94) — validar que a transformação também se aplica lá. Regressão possível em `ScaleMode.STRETCH` e em display externo, onde container e surface têm o mesmo tamanho e o bug é hoje invisível.

### Gestos multi-dedo configuráveis e unificados

**Tamanho:** medium

**Por quê:** Hoje 3/4/5 dedos são hardcoded para teclado/teclado-completo/menu, com limiares fixos de 300ms (Game.java:165-167) e a lógica duplicada em dois blocos. O dono do fork quer teclado acessível; outros querem colar texto, alternar mouse mode ou abrir o campo de texto novo.

**Como:** Extrair `MultiFingerGestureDetector` (novo arquivo em `binding/input/touch/`) alimentado por `handleTouchInput`; substituir os blocos de Game.java:3230-3249 e 3288-3334 por chamadas a ele. Expor as ações como `ListPreference` (`gesture_three_finger_action`, `gesture_four_finger_action`, `gesture_five_finger_action`) em preferences.xml na categoria `category_input_settings` (linha 363), com valores mapeando para métodos já existentes: `toggleKeyboard()` (2402), `toggleFullKeyboard()`, `showGameMenu(null)`, `toggleZoomMode()` (3992), `selectMouseMode(this)` (4091) e o novo overlay de texto. Tornar o limiar de 300ms uma SeekBarPreference.

**Risco:** Médio: mexer no detector afeta todos os modos de toque. Necessário garantir que `cancelStaleTouchState` continue sendo chamado para não deixar cliques pendentes ao disparar um gesto.

### Suportar mais de 2 pontos de toque nos modos de emulação

**Tamanho:** medium

**Por quê:** O limite de 2 contextos (Game.java:149-150) impede gestos contínuos de 3 dedos (arrastar, swipe entre desktops) que existem em trackpads reais e no AnyDesk, e força o clique do meio de 3 dedos a ser inferido apenas por contagem.

**Como:** Parametrizar o tamanho dos arrays (`MAX_TOUCH_CONTEXTS = 5`) e revisar as suposições de índice: `TrackpadContext` linhas 383 (`actionIndex == 1`) e 483 (`checkForConfirmedScroll`), `RelativeTouchContext` linhas 237 e 253, `AbsoluteTouchContext` linha 257. Introduzir no `TrackpadContext` um estado `THREE_FINGER_DRAG` alimentado por `setPointerCount(3)`, emitindo `sendMouseButtonDown(BUTTON_LEFT)` + movimento (comportamento macOS).

**Risco:** Alto risco de regressão nos gestos existentes: `isTap()` depende de `actionIndex + 1 == maxPointerCountInGesture` (TrackpadContext:162, RelativeTouchContext:130) e a promoção de ponteiro em Game.java:3260-3273 assume índice 1. Fazer atrás de uma pref experimental.

### Testes JVM para a máquina de estados dos TouchContexts

**Tamanho:** medium

**Por quê:** Os três contextos concentram temporizadores, limiares e transições sutis (tap x drag x scroll x flick) e não têm nenhum teste; toda validação é manual e dependente de hardware. Isso trava qualquer refactor seguro do EPIC de input.

**Como:** Usar o Robolectric já configurado (robolectric.properties na raiz) para instanciar `TrackpadContext`/`AbsoluteTouchContext`/`RelativeTouchContext` com um `NvConnection` mockado (todos os métodos relevantes são públicos e não-finais: NvConnection.java:490-565) e um `Handler` com `ShadowLooper` controlável. Casos mínimos: tap de 1/2/3 dedos, duplo-toque-arrasta, scroll de 2 dedos com eixo dominante, flick com botão não-esquerdo (regressão do finding #1), cancelamento com FLAG_CANCELED.

**Risco:** Baixo; é código novo. Exige extrair a criação do `Handler` para permitir injeção (hoje é `new Handler(Looper.getMainLooper())` nos construtores).

### EPIC: Campo de entrada de texto com envio do texto inteiro (paridade AnyDesk)

**Tamanho:** large

**Por quê:** Dor #2 do dono do fork. A infraestrutura de envio de bloco já existe e é subutilizada: `LiSendUtf8TextEvent` está exposto (`simplejni.c:127-131`, `NvConnection.java:619`) e `Game.enqueueCommitText` (`Game.java:4314-4334`) já faz chunking UTF-8 seguro em 512 bytes com flush a cada 15ms. Hoje isso só é acionado pelo `commitText` do IME quando `checkbox_enable_commit_text` está ligado (Game.java:4290-4296, StreamContainer.java:186-202), o que depende do teclado e ainda passa por deleteSurroundingText emulado com backspaces (4299-4312).

**Como:** 1) Criar um overlay (`EditText` + botão Enviar) inflado sobre o `rootView` da `Game`, ancorado acima do inset do IME (reutilizando o listener do EPIC anterior). 2) No envio, chamar diretamente `conn.sendUtf8Text(texto)` ou reaproveitar `enqueueCommitText` para o chunking. 3) Ligar o gesto de 4 dedos (`toggleFullKeyboard`, invocado em Game.java:3240 e 3314) ou uma entrada nova no menu de jogo a esse overlay. 4) Enquanto o overlay tiver foco, curto-circuitar `handleMotionEvent` (o guard `!grabbedInput` em Game.java:2758 já serve) para que os toques no campo não virem cliques no host. 5) Adicionar opção "enviar Enter ao final" usando `keyboardTranslator.translate(KeyEvent.KEYCODE_ENTER, ...)`. 6) Documentar que hosts sem suporte a UTF8 text (GFE) precisam do fallback caractere-a-caractere já presente em Game.java:2095.

**Risco:** `LiSendUtf8TextEvent` é extensão Sunshine — precisa de fallback detectável para hosts antigos. Layouts de teclado do host podem reordenar caracteres se o Apollo processar o texto como sequência de teclas. O overlay compete por foco com o `StreamContainer` (que é `focusableInTouchMode`, activity_game.xml:20-23) e com o pointer capture — será preciso `disableCapture()` enquanto o campo estiver ativo e recapturar depois (`setInputGrabState`, Game.java:1864).

### EPIC: Layout ciente do IME — empurrar/redimensionar o stream quando o teclado virtual abre (paridade AnyDesk)

**Tamanho:** epic

**Por quê:** É a dor #1 declarada do dono do fork. Hoje o IME simplesmente cobre o vídeo porque a `.Game` não declara `windowSoftInputMode` e não há listener de insets de IME. Além do layout, o subsistema de toque precisa ser reavaliado no mesmo instante, senão o usuário ganha um vídeo redimensionado com toques desalinhados e botões de mouse presos.

**Como:** 1) `AndroidManifest.xml:193` — adicionar `android:windowSoftInputMode="adjustResize"` na activity `.Game`. 2) `Game.java` (perto de 455-515, onde `streamContainer` e `backgroundTouchView` são configurados) — `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)` e `ViewCompat.setOnApplyWindowInsetsListener(rootView, ...)` lendo `insets.getInsets(WindowInsetsCompat.Type.ime()).bottom`; usar `WindowInsetsAnimationCompat.Callback` para acompanhar a animação do teclado em vez de saltar. 3) Aplicar o inset como `bottomMargin` do `streamContainer` (ele já refaz o aspect-fit em `StreamContainer.onMeasure:114-150`, então o vídeo re-letterboxa sozinho). 4) Após cada layout, chamar `panZoomHandler.handleSurfaceChange()` (PanZoomHandler.java:79) e cancelar contextos ativos (`touchContextMap[i].cancelTouch()`) para não deixar botão pressionado. 5) Ajustar `hideSystemUi` (Game.java:1646-1670) para não reimpor `SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN` enquanto o IME estiver visível. 6) Adicionar pref `checkbox_resize_stream_for_keyboard` (preferences.xml, categoria `category_input_settings` linha 363) para quem prefere o comportamento atual. 7) Como o `AbsoluteTouchContext` já lê `targetView.getWidth()/getHeight()` a cada evento (AbsoluteTouchContext.java:126-129), o mapeamento se corrige sozinho depois que o bug de zoom (finding #2) for resolvido.

**Risco:** Alto acoplamento com o modo imersivo e com PiP/display externo; em `ScaleMode.STRETCH` a mudança de aspecto pode exigir renegociação com o host (Vibeshine com display virtual pode reagir bem, mas GFE não). Risco de flicker do SurfaceView durante a animação do IME. Mitigar com a pref de opt-in e testar em DeX, ChromeOS e display externo.


## Glossário

- TouchContext: interface de 7 métodos (TouchContext.java) que abstrai o comportamento de um dedo individual; existem exatamente 2 instâncias por mapa (índice 0 = dedo primário, índice 1 = secundário).
- touchContextMap vs trackpadContextMap: dois arrays de TouchContext em Game.java:149-150. O primeiro atende dedos na TELA (modo definido por mouse_mode_list); o segundo atende um TRACKPAD FÍSICO (SOURCE_TOUCHPAD) e é sempre TrackpadContext com sensibilidade/swap das prefs.
- mouse_mode_list: preferência inteira 0..5 que define o modo de toque. 0=Multi touch (toque nativo Sunshine), 1=Absolute touch, 2=Track pad Natural (duplo-toque arrasta), 3=Track pad Gaming (long press arrasta), 4=Desabilitado, 5=Absolute touch com botões trocados. Mapeada em PreferenceConfiguration.java:897-916 e Game.applyMouseMode:4153.
- enableMultiTouchScreen / touchscreenTrackpad: par de booleans derivados do mouse_mode_list; enableMultiTouchScreen=true habilita o envio de toque nativo, touchscreenTrackpad=true seleciona os contextos relativos (Trackpad/Relative).
- Pointer capture: recurso Android 8+ (View.requestPointerCapture) que entrega o mouse em modo relativo e esconde o cursor do sistema; sob captura, SOURCE_MOUSE vira SOURCE_MOUSE_RELATIVE e SOURCE_TOUCHPAD passa a preencher AXIS_RELATIVE_X/Y.
- Mouse relativo vs absoluto: relativo envia deltas (LiSendMouseMoveEvent, usado em jogos com mouse-look); absoluto envia posição normalizada com referência de tamanho (LiSendMousePositionEvent, usado em desktop). A pref checkbox_absolute_mouse_mode converte deltas em posição via LiSendMouseMoveAsMousePositionEvent.
- Toque nativo (native touch): envio dos pontos de contato crus ao host via LiSendTouchEvent com coordenadas normalizadas 0..1, pressão, área de contato e rotação; só funciona com Sunshine/Apollo que anuncie a feature flag LI_FF_PEN_TOUCH_EVENTS, caso contrário retorna LI_ERR_UNSUPPORTED (-5501).
- LI_ERR_UNSUPPORTED: constante -5501 (MoonBridge.java:79) devolvida por LiSendTouchEvent/LiSendPenEvent quando o host não suporta a extensão; é o sinal usado por trySendTouchEvent/trySendPenEvent para cair no fallback de mouse.
- Scroll de alta resolução: LiSendHighResScrollEvent trabalha em unidades onde 120 (LI_WHEEL_DELTA) equivale a um clique de roda; o scroll horizontal (LiSendHighResHScrollEvent) é extensão exclusiva do Sunshine (InputStream.c:1269-1272).
- Flick / momentum: inércia do TrackpadContext — se a velocidade EMA na hora de levantar o dedo passa de 0.8 px/ms, o cursor (ou o scroll) continua se movendo em frames de 10ms com atrito 0.93 até parar (TrackpadContext.java:75-144).
- confirmedMove / confirmedDrag / confirmedScroll: flags da máquina de estados dos contextos que classificam o gesto em curso; enquanto nenhuma estiver ligada o gesto ainda pode virar um tap.
- maxPointerCountInGesture: maior número de dedos visto durante o gesto atual; usado por isTap() para garantir que um toque de N dedos gere apenas UM clique (só o contexto de índice N-1 reporta o tap).
- shouldDuplicateMovement: hack em handleTouchInput (Game.java:3135) que faz os dois contextos lerem o mesmo ponteiro quando o número real de ponteiros é menor que o número simulado — usado no swipe de 2 dedos sintetizado pelo Android.
- CLASSIFICATION_TWO_FINGER_SWIPE: classificação do Android 10+ que indica que o sistema converteu um swipe de 2 dedos do trackpad num arrasto de 1 dedo na tela; o fork a detecta em Game.java:2875 e re-sintetiza dois ponteiros.
- invertAxis / swapAxis: dois níveis independentes de troca X↔Y. `swapAxis` é do TrackpadContext (construtor, TrackpadContext.java:328-340) e vale para trackpad físico; `invertAxis` é o parâmetro de handleTouchInput (Game.java:3160) aplicado nos swipes sintéticos para CANCELAR o swapAxis (dupla inversão = sem inversão).
- isPanZoomMode: modo em que os toques deixam de ir para o host e alimentam o PanZoomHandler (pinça e arrasto do vídeo local); alternado pelo botão flutuante de zoom ou pelo menu (Game.java:3992).
- StreamContainer vs SurfaceView interna: StreamContainer é o FrameLayout que faz o aspect-fit (letterbox); dentro dele há a SurfaceView/GLSurfaceView que o PanZoomHandler escala e translada. Toda normalização de toque hoje usa o container, o que é a causa do bug de zoom.
- backgroundTouchView: View transparente de tela cheia (activity_game.xml:8-12) que recebe os toques fora da área do vídeo, permitindo que o trackpad funcione nas bordas letterboxed sem quebrar o touch splitting do controle virtual.
- grabbedInput: flag global que decide se o input é consumido pelo stream ou devolvido ao Android (Game.java:202, guard em 2758); alternado por Ctrl+Alt+Shift+Z e ao abrir menus.
- cursorVisible / enableMouseLocalCursor: modo em que a captura continua ativa mas o cursor do Android permanece visível sobre o stream (Game.java:4140-4151), útil em DeX/ChromeOS.
- commitText: caminho de texto do IME (StreamContainer.onCreateInputConnection:186) em que o teclado entrega uma CharSequence inteira; Game.enqueueCommitText fatia em blocos UTF-8 de 512 bytes e envia por LiSendUtf8TextEvent — é a base existente para o campo de texto estilo AnyDesk.
- ignoreSynthEvents: pref que descarta MotionEvents com deviceId <= 0 (injeções sintéticas de apps de automação/acessibilidade), Game.java:2763.
- Source 12290 (DeX): valor de InputDevice source usado pelo Samsung DeX para o mouse de desktop (SOURCE_MOUSE | SOURCE_TOUCHSCREEN); recebe tratamento especial de clique no Game.java:2932-2939.
- EvdevCaptureProvider: provider exclusivo de builds root que abre o device evdev via `su` e libevdev_reader.so, dando mouse relativo verdadeiro em Androids antigos; alimenta Game via callbacks EvdevListener (mouseMove/mouseButtonEvent/mouseVScroll/mouseHScroll).
