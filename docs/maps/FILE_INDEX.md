<!-- GERADO POR tools/codemap/codemap.mjs — NÃO EDITE À MÃO. Rode: node tools/codemap/codemap.mjs -->

# Índice de Arquivos

> Um registro por arquivo de código. Use para localizar o arquivo certo **sem abri-lo**. Colunas: linhas, tipos declarados, métodos públicos relevantes. Rank = PageRank no grafo de imports (quão central o arquivo é).

Total: **216 arquivos**, **64.193 linhas**, **268 tipos**, **2530 métodos**.

## `app/src/main/java/com/limelight/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4437 | 14.9 | Game, GameMenuCallbacks | `onServiceConnected()`:247 `onServiceDisconnected()`:256 `sendText()`:324 `sendBackspaces()`:331 `onCreate()`:353 `onCapturedPointer()`:543 `notifyCrash()`:669 `onDisplayAdded()`:1034 |
| [`PcView.java`](../../app/src/main/java/com/limelight/PcView.java) | 934 | 4.8 | PcView, ComputerObject | `onServiceConnected()`:82 `run()`:89 `onServiceDisconnected()`:105 `onConfigurationChanged()`:111 `onClick()`:164 `onClick()`:170 `onClick()`:177 `onClick()`:183 |
| [`AppView.java`](../../app/src/main/java/com/limelight/AppView.java) | 796 | 6.6 | AppView, AppObject | `onServiceConnected()`:94 `run()`:101 `run()`:145 `onServiceDisconnected()`:166 `onConfigurationChanged()`:172 `notifyComputerUpdated()`:202 `run()`:217 `run()`:231 |
| [`ShortcutTrampoline.java`](../../app/src/main/java/com/limelight/ShortcutTrampoline.java) | 531 | 3.5 | ShortcutTrampoline | `onServiceConnected()`:62 `run()`:69 `notifyComputerUpdated()`:104 `run()`:130 `run()`:163 `run()`:174 `onServiceDisconnected()`:237 `validateHostInput()`:242 |
| [`EditProfileActivity.java`](../../app/src/main/java/com/limelight/EditProfileActivity.java) | 476 | 6.6 | EditProfileActivity, ProfilePreferenceFragment, InMemoryPreferenceDataStore, InMemorySharedPreferences, InMemoryEditor | `onCreate()`:39 `onCreateOptionsMenu()`:89 `onOptionsItemSelected()`:95 `getInMemoryPrefs()`:191 `getPrefs()`:227 `getPrefs()`:251 `onCreateView()`:261 `onCreatePreferences()`:266 |
| [`GameMenu.java`](../../app/src/main/java/com/limelight/GameMenu.java) | 403 | 12.7 | GameMenu, MenuOption | `onGlobalLayout()`:191 `showMenu()`:339 `hideMenu()`:391 `isMenuOpen()`:399 |
| [`DebugInfoActivity.java`](../../app/src/main/java/com/limelight/DebugInfoActivity.java) | 266 | 3.3 | DebugInfoActivity | `onCreate()`:41 `onClick()`:82 `onClick()`:92 `onClick()`:119 `onClick()`:125 `onProgressChanged()`:168 `onStartTrackingTouch()`:174 `onStopTrackingTouch()`:177 |
| [`PosterContentProvider.java`](../../app/src/main/java/com/limelight/PosterContentProvider.java) | 153 | 3.5 | PosterContentProvider | `openFile()`:45 `openBoxArtFile()`:55 `delete()`:109 `getType()`:114 `insert()`:119 `onCreate()`:124 `query()`:130 `update()`:136 |
| [`HelpActivity.java`](../../app/src/main/java/com/limelight/HelpActivity.java) | 119 | 7.7 | HelpActivity | `onCreate()`:25 `onBackInvoked()`:31 `onPageStarted()`:57 `onPageFinished()`:68 `onDestroy()`:96 `onBackPressed()`:108 |
| [`ProfilesActivity.java`](../../app/src/main/java/com/limelight/ProfilesActivity.java) | 75 | 4.8 | ProfilesActivity | `onCreate()`:24 `onDestroy()`:54 `onProfilesChanged()`:60 |
| [`KeyboardAccessibilityService.java`](../../app/src/main/java/com/limelight/KeyboardAccessibilityService.java) | 72 | 2.9 | KeyboardAccessibilityService | `onKeyEvent()`:22 `onServiceConnected()`:52 `onAccessibilityEvent()`:64 `onInterrupt()`:68 |
| [`StartExternalDisplayControlReceiver.java`](../../app/src/main/java/com/limelight/StartExternalDisplayControlReceiver.java) | 58 | 4.0 | StartExternalDisplayControlReceiver | `onReceive()`:25 |
| [`SensitivityBean.java`](../../app/src/main/java/com/limelight/SensitivityBean.java) | 49 | 2.9 | SensitivityBean | `getLastAbsoluteX()`:17 `setLastAbsoluteX()`:21 `getLastAbsoluteY()`:25 `setLastAbsoluteY()`:29 `getLastRelativelyX()`:33 `setLastRelativelyX()`:37 `getLastRelativelyY()`:41 `setLastRelativelyY()`:45 |
| [`LimeLog.java`](../../app/src/main/java/com/limelight/LimeLog.java) | 26 | 88.0 | LimeLog | — |
| [`ArtemisApplication.java`](../../app/src/main/java/com/limelight/ArtemisApplication.java) | 17 | 2.9 | ArtemisApplication | `onCreate()`:10 |

## `app/src/main/java/com/limelight/binding/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`PlatformBinding.java`](../../app/src/main/java/com/limelight/binding/PlatformBinding.java) | 15 | 4.7 | PlatformBinding | — |

## `app/src/main/java/com/limelight/binding/audio/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`AndroidAudioRenderer.java`](../../app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java) | 234 | 4.2 | AndroidAudioRenderer | `setup()`:68 `playDecodedAudio()`:189 `start()`:203 `stop()`:215 `cleanup()`:226 |

## `app/src/main/java/com/limelight/binding/crypto/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`AndroidCryptoProvider.java`](../../app/src/main/java/com/limelight/binding/crypto/AndroidCryptoProvider.java) | 260 | 4.1 | AndroidCryptoProvider | `getClientCertificate()`:191 `getClientPrivateKey()`:218 `getPemEncodedClientCertificate()`:245 `encodeBase64String()`:256 |

## `app/src/main/java/com/limelight/binding/input/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`ControllerHandler.java`](../../app/src/main/java/com/limelight/binding/input/ControllerHandler.java) | 3473 | 5.7 | ControllerHandler, GenericControllerContext, InputDeviceContext, UsbDeviceContext | `hasController()`:228 `onInputDeviceAdded()`:233 `onInputDeviceRemoved()`:238 `onInputDeviceChanged()`:251 `stop()`:271 `destroy()`:295 `disableSensors()`:304 `enableSensors()`:311 |
| [`KeyboardTranslator.java`](../../app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java) | 455 | 5.4 | KeyboardTranslator, KeyboardMapping | `getDeviceKeyCodeForQwertyKeyCode()`:134 `getQwertyKeyCodeForDeviceKeyCode()`:138 `hasNormalizedMapping()`:161 `translate()`:183 `onInputDeviceAdded()`:429 `onInputDeviceRemoved()`:439 `onInputDeviceChanged()`:444 |
| [`TextInputPump.java`](../../app/src/main/java/com/limelight/binding/input/TextInputPump.java) | 153 | 3.2 | TextInputPump, Sink, Scheduler | `run()`:57 `run()`:73 `offerText()`:94 `offerBackspaces()`:122 `clear()`:134 `isIdle()`:141 `pendingChunks()`:145 `pendingBackspaces()`:149 |
| [`GameInputDevice.java`](../../app/src/main/java/com/limelight/binding/input/GameInputDevice.java) | 19 | 8.4 | GameInputDevice | — |

## `app/src/main/java/com/limelight/binding/input/capture/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`AndroidNativePointerCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/AndroidNativePointerCaptureProvider.java) | 171 | 2.9 | AndroidNativePointerCaptureProvider | `showCursor()`:65 `hideCursor()`:76 `onWindowFocusChanged()`:89 `run()`:104 `eventHasRelativeMouseAxes()`:113 `getRelativeAxisX()`:123 `getRelativeAxisY()`:134 `onInputDeviceAdded()`:145 |
| [`ShieldCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/ShieldCaptureProvider.java) | 94 | 2.9 | ShieldCaptureProvider | `hideCursor()`:65 `showCursor()`:71 `eventHasRelativeMouseAxes()`:77 `getRelativeAxisX()`:85 `getRelativeAxisY()`:90 |
| [`InputCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/InputCaptureProvider.java) | 58 | 7.7 | InputCaptureProvider | `enableCapture()`:9 `disableCapture()`:13 `destroy()`:18 `isCapturingEnabled()`:20 `isCapturingActive()`:24 `showCursor()`:28 `hideCursor()`:32 `eventHasRelativeMouseAxes()`:36 |
| [`InputCaptureManager.java`](../../app/src/main/java/com/limelight/binding/input/capture/InputCaptureManager.java) | 39 | 3.2 | InputCaptureManager | — |
| [`AndroidPointerIconCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/AndroidPointerIconCaptureProvider.java) | 36 | 2.9 | AndroidPointerIconCaptureProvider | `hideCursor()`:25 `showCursor()`:31 |
| [`NullCaptureProvider.java`](../../app/src/main/java/com/limelight/binding/input/capture/NullCaptureProvider.java) | 5 | 2.9 | NullCaptureProvider | — |

## `app/src/main/java/com/limelight/binding/input/driver/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`ProConController.java`](../../app/src/main/java/com/limelight/binding/input/driver/ProConController.java) | 486 | 2.9 | ProConController | `start()`:212 `stop()`:242 `rumble()`:263 `rumbleTriggers()`:291 `handleRead()`:295 |
| [`UsbDriverService.java`](../../app/src/main/java/com/limelight/binding/input/driver/UsbDriverService.java) | 367 | 3.6 | UsbDriverService, UsbEventReceiver, UsbDriverBinder, UsbDriverStateListener | `reportControllerState()`:46 `reportControllerMotion()`:55 `deviceRemoved()`:63 `deviceAdded()`:74 `onReceive()`:83 `run()`:99 `setListener()`:123 `setStateListener()`:134 |
| [`XboxOneController.java`](../../app/src/main/java/com/limelight/binding/input/driver/XboxOneController.java) | 240 | 2.9 | XboxOneController, InitPacket | `handleRead()`:114 `doInit()`:171 `rumble()`:215 `rumbleTriggers()`:222 |
| [`AbstractXboxController.java`](../../app/src/main/java/com/limelight/binding/input/driver/AbstractXboxController.java) | 184 | 2.9 | AbstractXboxController | `run()`:42 `start()`:99 `stop()`:148 |
| [`Xbox360Controller.java`](../../app/src/main/java/com/limelight/binding/input/driver/Xbox360Controller.java) | 168 | 2.9 | Xbox360Controller | `handleRead()`:75 `doInit()`:142 `rumble()`:151 `rumbleTriggers()`:164 |
| [`Xbox360WirelessDongle.java`](../../app/src/main/java/com/limelight/binding/input/driver/Xbox360WirelessDongle.java) | 149 | 2.9 | Xbox360WirelessDongle | `start()`:89 `stop()`:135 `rumble()`:140 `rumbleTriggers()`:145 |
| [`AbstractController.java`](../../app/src/main/java/com/limelight/binding/input/driver/AbstractController.java) | 88 | 3.3 | AbstractController | `getControllerId()`:22 `getVendorId()`:26 `getProductId()`:30 `getSupportedButtonFlags()`:34 `getCapabilities()`:38 `getType()`:42 `setButtonFlag()`:46 `reportInput()`:54 |
| [`UsbDriverListener.java`](../../app/src/main/java/com/limelight/binding/input/driver/UsbDriverListener.java) | 13 | 3.3 | UsbDriverListener | — |

## `app/src/main/java/com/limelight/binding/input/evdev/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`EvdevCaptureProviderShim.java`](../../app/src/main/java/com/limelight/binding/input/evdev/EvdevCaptureProviderShim.java) | 25 | 3.8 | EvdevCaptureProviderShim | — |
| [`EvdevListener.java`](../../app/src/main/java/com/limelight/binding/input/evdev/EvdevListener.java) | 16 | 4.1 | EvdevListener | — |

## `app/src/main/java/com/limelight/binding/input/touch/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`TrackpadContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java) | 486 | 3.2 | TrackpadContext | `run()`:70 `run()`:77 `run()`:113 `getActionIndex()`:147 `touchDownEvent()`:182 `touchUpEvent()`:238 `touchMoveEvent()`:305 `cancelTouch()`:415 |
| [`RelativeTouchContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/RelativeTouchContext.java) | 332 | 3.2 | RelativeTouchContext | `run()`:36 `run()`:57 `run()`:63 `run()`:69 `run()`:75 `run()`:81 `cancelTouch()`:306 `isCancelled()`:319 |
| [`AbsoluteTouchContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/AbsoluteTouchContext.java) | 262 | 3.2 | AbsoluteTouchContext | `run()`:28 `run()`:43 `run()`:56 `cancelTouch()`:234 `isCancelled()`:251 `setPointerCount()`:256 |
| [`TouchContext.java`](../../app/src/main/java/com/limelight/binding/input/touch/TouchContext.java) | 12 | 3.2 | TouchContext | — |

## `app/src/main/java/com/limelight/binding/input/virtual_controller/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`AnalogStickFree.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java) | 513 | 2.9 | AnalogStickFree, AnalogStickListener, STICK_STATE, CLICK_STATE | `addAnalogStickListener()`:189 `onSizeChanged()`:226 `onElementDraw()`:237 `setBgOpacity()`:312 `setOpacity()`:319 `onElementTouchEvent()`:351 |
| [`VirtualControllerConfigurationLoader.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerConfigurationLoader.java) | 450 | 2.9 | VirtualControllerConfigurationLoader | `onDirectionChange()`:40 `onClick()`:92 `onLongClick()`:101 `onRelease()`:110 |
| [`VirtualControllerElement.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualControllerElement.java) | 361 | 3.8 | VirtualControllerElement, Mode | `moveElement()`:78 `resizeElement()`:92 `actionDisableEnableButton()`:104 `onDraw()`:109 `actionEnableMove()`:157 `actionEnableResize()`:161 `actionCancel()`:165 `getDefaultColor()`:170 |
| [`AnalogStick.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStick.java) | 350 | 2.9 | AnalogStick, AnalogStickListener, STICK_STATE, CLICK_STATE | `addAnalogStickListener()`:174 `onSizeChanged()`:211 `onElementDraw()`:221 `onElementTouchEvent()`:284 |
| [`DigitalPad.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalPad.java) | 317 | 2.9 | DigitalPad, DigitalPadListener | `addDigitalPadListener()`:43 `onElementDraw()`:48 `rotateDrawable()`:250 `onElementTouchEvent()`:274 |
| [`VirtualController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java) | 278 | 7.8 | VirtualController, ControllerInputContext, ControllerMode | `run()`:55 `onClick()`:92 `hide()`:128 `show()`:136 `switchShowHide()`:142 `showElements()`:152 `showEnabledElements()`:158 `removeElements()`:164 |
| [`DigitalButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java) | 268 | 2.9 | DigitalButton, DigitalButtonListener | `run()`:54 `checkMovement()`:70 `addDigitalButtonListener()`:126 `setText()`:130 `setIcon()`:135 `setIconPress()`:140 `onElementDraw()`:145 `onElementTouchEvent()`:230 |
| [`LeftAnalogStickFree.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/LeftAnalogStickFree.java) | 52 | 2.9 | LeftAnalogStickFree | `onMovement()`:19 `onClick()`:29 `onDoubleClick()`:33 `onRevoke()`:42 |
| [`RightAnalogStickFree.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/RightAnalogStickFree.java) | 52 | 2.9 | RightAnalogStickFree | `onMovement()`:19 `onClick()`:29 `onDoubleClick()`:33 `onRevoke()`:42 |
| [`LeftAnalogStick.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/LeftAnalogStick.java) | 50 | 2.9 | LeftAnalogStick | `onMovement()`:17 `onClick()`:27 `onDoubleClick()`:31 `onRevoke()`:40 |
| [`RightAnalogStick.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/RightAnalogStick.java) | 50 | 2.9 | RightAnalogStick | `onMovement()`:17 `onClick()`:27 `onDoubleClick()`:31 `onRevoke()`:40 |
| [`LeftTrigger.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/LeftTrigger.java) | 37 | 2.9 | LeftTrigger | `onClick()`:14 `onLongClick()`:23 `onRelease()`:27 |
| [`RightTrigger.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/RightTrigger.java) | 37 | 2.9 | RightTrigger | `onClick()`:14 `onLongClick()`:23 `onRelease()`:27 |

## `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`KeyBoardController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java) | 796 | 3.2 | KeyBoardController, ControllerMode | `onLongClick()`:97 `onTouch()`:112 `onClick()`:159 `hide()`:230 `hide()`:241 `show()`:245 `showElements()`:251 `showEnabledElements()`:262 |
| [`KeyBoardControllerConfigurationLoader.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java) | 591 | 3.3 | KeyBoardControllerConfigurationLoader | `onDirectionChange()`:72 `onkeyEvent()`:120 `onkeyEvent()`:136 `onClick()`:168 `onLongClick()`:179 `onRelease()`:185 `onClick()`:197 `onLongClick()`:204 |
| [`keyBoardVirtualControllerElement.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyBoardVirtualControllerElement.java) | 439 | 2.9 | keyBoardVirtualControllerElement, Mode | `moveElement()`:83 `resizeElement()`:126 `checkAndApplyResize()`:138 `onDraw()`:165 `actionEnableMove()`:213 `actionEnableResize()`:217 `actionCancel()`:221 `getDefaultColor()`:226 |
| [`keyAnalogStickFree.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyAnalogStickFree.java) | 420 | 2.9 | keyAnalogStickFree, AnalogStickListener, STICK_STATE, CLICK_STATE | `addAnalogStickListener()`:187 `onSizeChanged()`:224 `onElementDraw()`:235 `onElementTouchEvent()`:328 |
| [`KeyBoardLayoutController.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardLayoutController.java) | 380 | 4.3 | KeyBoardLayoutController, ViewCallbacks | `isModifierKeyPressed()`:86 `setViewCallbacks()`:112 `getHandler()`:116 `isKeyboardVisible()`:279 `hide()`:283 `hide()`:301 `show()`:305 `toggleVisibility()`:313 |
| [`KeyAnalogStick.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyAnalogStick.java) | 352 | 2.9 | KeyAnalogStick, AnalogStickListener, STICK_STATE, CLICK_STATE | `addAnalogStickListener()`:176 `onSizeChanged()`:213 `onElementDraw()`:223 `onElementTouchEvent()`:286 |
| [`KeyBoardTouchPadButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardTouchPadButton.java) | 282 | 2.9 | KeyBoardTouchPadButton, DigitalButtonListener | `run()`:56 `checkMovement()`:72 `addDigitalButtonListener()`:129 `setText()`:133 `setIcon()`:138 `onElementDraw()`:148 `onElementTouchEvent()`:222 |
| [`KeyBoardDigitalButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardDigitalButton.java) | 267 | 2.9 | KeyBoardDigitalButton, DigitalButtonListener | `run()`:54 `checkMovement()`:71 `addDigitalButtonListener()`:127 `setText()`:131 `setIcon()`:136 `setSticky()`:141 `isSticky()`:145 `onElementDraw()`:150 |
| [`KeyboardDigitalPadButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyboardDigitalPadButton.java) | 203 | 2.9 | KeyboardDigitalPadButton, DigitalPadListener | `addDigitalPadListener()`:32 `onElementDraw()`:37 `onElementTouchEvent()`:160 |
| [`LayoutSnappingHelper.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/LayoutSnappingHelper.java) | 158 | 2.9 | LayoutSnappingHelper, SnapResult | — |
| [`KeyBoardAnalogStickButton.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButton.java) | 155 | 2.9 | KeyBoardAnalogStickButton, KeyBoardAnalogStickListener | `setListener()`:21 `onMovement()`:34 `onClick()`:124 `onDoubleClick()`:129 `onRevoke()`:134 |
| [`KeyBoardAnalogStickButtonFree.java`](../../app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButtonFree.java) | 155 | 2.9 | KeyBoardAnalogStickButtonFree, KeyBoardAnalogStickListener | `setListener()`:21 `onMovement()`:34 `onClick()`:124 `onDoubleClick()`:129 `onRevoke()`:134 |

## `app/src/main/java/com/limelight/binding/video/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`MediaCodecDecoderRenderer.java`](../../app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java) | 2447 | 3.2 | MediaCodecDecoderRenderer, DecoderHungException, RendererException | `setForceTightThresholds()`:55 `setPreferLowerDelaysTimeoutUs()`:63 `setPreferLowerDelays()`:100 `setRenderTarget()`:361 `isHevcSupported()`:456 `isAvcSupported()`:460 `isHevcMain10Hdr10Supported()`:464 `isAv1Supported()`:479 |
| [`MediaCodecHelper.java`](../../app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java) | 1206 | 3.6 | MediaCodecHelper | — |
| [`VideoStats.java`](../../app/src/main/java/com/limelight/binding/video/VideoStats.java) | 93 | 2.9 | VideoStats, VideoStatsFps | — |
| [`CrashListener.java`](../../app/src/main/java/com/limelight/binding/video/CrashListener.java) | 6 | 3.2 | CrashListener | — |
| [`PerfOverlayListener.java`](../../app/src/main/java/com/limelight/binding/video/PerfOverlayListener.java) | 6 | 3.2 | PerfOverlayListener | — |

## `app/src/main/java/com/limelight/computers/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`ComputerManagerService.java`](../../app/src/main/java/com/limelight/computers/ComputerManagerService.java) | 969 | 4.2 | ComputerManagerService, ComputerManagerBinder, ParallelPollTuple, ApplistPoller, PollingTuple, ReachabilityTuple | `onServiceConnected()`:71 `onServiceDisconnected()`:84 `run()`:167 `startPolling()`:197 `waitForReady()`:227 `waitForPollingStopped()`:245 `addComputerBlocking()`:260 `removeComputer()`:264 |
| [`ComputerDatabaseManager.java`](../../app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java) | 236 | 3.1 | ComputerDatabaseManager, AddressFields | `close()`:58 `deleteComputer()`:84 `updateComputer()`:110 `getAllComputers()`:183 `getComputerByName()`:202 `getComputerByUUID()`:222 |
| [`LegacyDatabaseReader3.java`](../../app/src/main/java/com/limelight/computers/LegacyDatabaseReader3.java) | 124 | 2.9 | LegacyDatabaseReader3 | — |
| [`LegacyDatabaseReader.java`](../../app/src/main/java/com/limelight/computers/LegacyDatabaseReader.java) | 103 | 2.9 | LegacyDatabaseReader | — |
| [`LegacyDatabaseReader2.java`](../../app/src/main/java/com/limelight/computers/LegacyDatabaseReader2.java) | 84 | 2.9 | LegacyDatabaseReader2 | — |
| [`IdentityManager.java`](../../app/src/main/java/com/limelight/computers/IdentityManager.java) | 74 | 2.9 | IdentityManager | `getUniqueId()`:29 |
| [`ComputerManagerListener.java`](../../app/src/main/java/com/limelight/computers/ComputerManagerListener.java) | 8 | 3.6 | ComputerManagerListener | — |

## `app/src/main/java/com/limelight/discovery/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`DiscoveryService.java`](../../app/src/main/java/com/limelight/discovery/DiscoveryService.java) | 91 | 3.2 | DiscoveryService, DiscoveryBinder | `setListener()`:23 `startDiscovery()`:27 `stopDiscovery()`:31 `getComputerSet()`:35 `onCreate()`:41 `notifyComputerAdded()`:44 `notifyDiscoveryFailure()`:51 `onBind()`:77 |

## `app/src/main/java/com/limelight/grid/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`AppGridAdapter.java`](../../app/src/main/java/com/limelight/grid/AppGridAdapter.java) | 194 | 3.3 | AppGridAdapter | `updateHiddenApps()`:52 `updateLayoutWithPreferences()`:86 `cancelQueuedOperations()`:119 `compare()`:128 `addApp()`:140 `removeApp()`:159 `clear()`:165 `populateView()`:171 |
| [`PcGridAdapter.java`](../../app/src/main/java/com/limelight/grid/PcGridAdapter.java) | 95 | 3.1 | PcGridAdapter | `updateLayoutWithPreferences()`:29 `addComputer()`:34 `compare()`:42 `removeComputer()`:48 `populateView()`:53 |
| [`GenericGridAdapter.java`](../../app/src/main/java/com/limelight/grid/GenericGridAdapter.java) | 77 | 2.9 | GenericGridAdapter | `clear()`:39 `getCount()`:44 `getItem()`:49 `getItemId()`:54 `getView()`:61 |

## `app/src/main/java/com/limelight/grid/assets/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`CachedAppAssetLoader.java`](../../app/src/main/java/com/limelight/grid/assets/CachedAppAssetLoader.java) | 397 | 3.3 | CachedAppAssetLoader, LoaderTask, AsyncDrawable, LoaderTuple | `cancelBackgroundLoads()`:72 `cancelForegroundLoads()`:79 `freeCacheMemory()`:91 `doInBackground()`:159 `onProgressUpdate()`:188 `onPostExecute()`:211 `onAnimationStart()`:230 `onAnimationEnd()`:233 |
| [`DiskAssetLoader.java`](../../app/src/main/java/com/limelight/grid/assets/DiskAssetLoader.java) | 186 | 6.5 | DiskAssetLoader | `checkCacheExists()`:35 `loadBitmapFromCache()`:61 `onHeaderDecoded()`:116 `getFile()`:146 `getBoxArtDirectory()`:155 `deleteAssetsForComputer()`:159 `populateCacheWithStream()`:169 |
| [`MemoryAssetLoader.java`](../../app/src/main/java/com/limelight/grid/assets/MemoryAssetLoader.java) | 75 | 3.3 | MemoryAssetLoader | `sizeOf()`:14 `entryRemoved()`:20 `loadBitmapFromCache()`:35 `populateCache()`:65 `clearCache()`:69 |
| [`NetworkAssetLoader.java`](../../app/src/main/java/com/limelight/grid/assets/NetworkAssetLoader.java) | 41 | 3.3 | NetworkAssetLoader | `getBitmapStream()`:22 |
| [`ScaledBitmap.java`](../../app/src/main/java/com/limelight/grid/assets/ScaledBitmap.java) | 19 | 2.9 | ScaledBitmap | — |

## `app/src/main/java/com/limelight/nvstream/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`NvConnection.java`](../../app/src/main/java/com/limelight/nvstream/NvConnection.java) | 629 | 7.8 | NvConnection | `stop()`:92 `quitAndLaunch()`:353 `run()`:391 `sendExecServerCmd()`:484 `sendKeyboardInput()`:537 `sendMouseScroll()`:543 `sendMouseHScroll()`:549 `sendMouseHighResScroll()`:555 |
| [`StreamConfiguration.java`](../../app/src/main/java/com/limelight/nvstream/StreamConfiguration.java) | 262 | 3.2 | StreamConfiguration, Builder | `setApp()`:38 `setRemoteConfiguration()`:43 `setResolution()`:48 `setRefreshRate()`:54 `setLaunchRefreshRate()`:59 `setVirtualDisplay()`:64 `setResolutionScaleFactor()`:69 `setBitrate()`:74 |
| [`ConnectionContext.java`](../../app/src/main/java/com/limelight/nvstream/ConnectionContext.java) | 35 | 5.1 | ConnectionContext | — |
| [`NvConnectionListener.java`](../../app/src/main/java/com/limelight/nvstream/NvConnectionListener.java) | 24 | 18.9 | NvConnectionListener | — |

## `app/src/main/java/com/limelight/nvstream/av/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`ByteBufferDescriptor.java`](../../app/src/main/java/com/limelight/nvstream/av/ByteBufferDescriptor.java) | 58 | 2.9 | ByteBufferDescriptor | — |

## `app/src/main/java/com/limelight/nvstream/av/audio/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`AudioRenderer.java`](../../app/src/main/java/com/limelight/nvstream/av/audio/AudioRenderer.java) | 16 | 21.4 | AudioRenderer | — |

## `app/src/main/java/com/limelight/nvstream/av/video/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`VideoDecoderRenderer.java`](../../app/src/main/java/com/limelight/nvstream/av/video/VideoDecoderRenderer.java) | 22 | 19.7 | VideoDecoderRenderer | — |

## `app/src/main/java/com/limelight/nvstream/http/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`NvHTTP.java`](../../app/src/main/java/com/limelight/nvstream/http/NvHTTP.java) | 939 | 10.3 | NvHTTP | `chooseClientAlias()`:116 `chooseServerAlias()`:118 `getCertificateChain()`:120 `getClientAliases()`:123 `getPrivateKey()`:124 `getServerAliases()`:127 `getAcceptedIssuers()`:132 `checkClientTrusted()`:135 |
| [`PairingManager.java`](../../app/src/main/java/com/limelight/nvstream/http/PairingManager.java) | 357 | 5.2 | PairingManager, PairState, PairingHashAlgorithm, Sha1PairingHash, Sha256PairingHash | `getPairedCert()`:183 `pair()`:187 `getHashLength()`:324 `hashData()`:328 `getHashLength()`:341 `hashData()`:345 |
| [`ComputerDetails.java`](../../app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java) | 240 | 24.7 | ComputerDetails, State, AddressTuple | `hashCode()`:37 `equals()`:42 `toString()`:51 `guessExternalPort()`:102 `update()`:123 `toString()`:172 |
| [`NvApp.java`](../../app/src/main/java/com/limelight/nvstream/http/NvApp.java) | 101 | 9.6 | NvApp | `setAppName()`:28 `setAppUUID()`:32 `setAppId()`:36 `setAppIndex()`:45 `setAppId()`:54 `setAppIndex()`:59 `setHdrSupported()`:63 `getAppName()`:67 |
| [`HostHttpResponseException.java`](../../app/src/main/java/com/limelight/nvstream/http/HostHttpResponseException.java) | 29 | 3.9 | HostHttpResponseException | `getErrorCode()`:16 `getErrorMessage()`:20 `getMessage()`:25 |
| [`LimelightCryptoProvider.java`](../../app/src/main/java/com/limelight/nvstream/http/LimelightCryptoProvider.java) | 12 | 6.3 | LimelightCryptoProvider | — |

## `app/src/main/java/com/limelight/nvstream/input/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`ControllerPacket.java`](../../app/src/main/java/com/limelight/nvstream/input/ControllerPacket.java) | 27 | 18.2 | ControllerPacket | — |
| [`MouseButtonPacket.java`](../../app/src/main/java/com/limelight/nvstream/input/MouseButtonPacket.java) | 13 | 7.4 | MouseButtonPacket | — |
| [`KeyboardPacket.java`](../../app/src/main/java/com/limelight/nvstream/input/KeyboardPacket.java) | 11 | 4.7 | KeyboardPacket | — |

## `app/src/main/java/com/limelight/nvstream/jni/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`MoonBridge.java`](../../app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java) | 445 | 55.4 | MoonBridge, AudioConfiguration | `getSurroundAudioInfo()`:167 `equals()`:172 `hashCode()`:182 `toInt()`:188 `startConnection()`:345 `stopConnection()`:355 `interruptConnection()`:357 `sendExecServerCmd()`:359 |

## `app/src/main/java/com/limelight/nvstream/mdns/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`JmDNSDiscoveryAgent.java`](../../app/src/main/java/com/limelight/nvstream/mdns/JmDNSDiscoveryAgent.java) | 270 | 3.5 | JmDNSDiscoveryAgent, MyNetworkTopologyDiscovery | `serviceAdded()`:34 `serviceRemoved()`:50 `serviceResolved()`:66 `useInetAddress()`:84 `newNetworkTopologyDiscovery()`:113 `startDiscovery()`:169 `run()`:183 `stopDiscovery()`:227 |
| [`NsdManagerDiscoveryAgent.java`](../../app/src/main/java/com/limelight/nvstream/mdns/NsdManagerDiscoveryAgent.java) | 235 | 3.5 | NsdManagerDiscoveryAgent | `onStartDiscoveryFailed()`:33 `onStopDiscoveryFailed()`:49 `onDiscoveryStarted()`:63 `onDiscoveryStopped()`:79 `onServiceFound()`:92 `onServiceInfoCallbackRegistrationFailed()`:104 `onServiceUpdated()`:110 `onServiceLost()`:118 |
| [`MdnsDiscoveryAgent.java`](../../app/src/main/java/com/limelight/nvstream/mdns/MdnsDiscoveryAgent.java) | 149 | 3.5 | MdnsDiscoveryAgent | `reportNewComputer()`:24 `getComputerSet()`:55 |
| [`MdnsComputer.java`](../../app/src/main/java/com/limelight/nvstream/mdns/MdnsComputer.java) | 72 | 3.7 | MdnsComputer | `getName()`:19 `getLocalAddress()`:23 `getIpv6Address()`:27 `getPort()`:31 `hashCode()`:36 `equals()`:41 `toString()`:68 |
| [`MdnsDiscoveryListener.java`](../../app/src/main/java/com/limelight/nvstream/mdns/MdnsDiscoveryListener.java) | 7 | 3.7 | MdnsDiscoveryListener | — |

## `app/src/main/java/com/limelight/nvstream/wol/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`WakeOnLanSender.java`](../../app/src/main/java/com/limelight/nvstream/wol/WakeOnLanSender.java) | 150 | 3.3 | WakeOnLanSender | — |

## `app/src/main/java/com/limelight/preferences/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`StreamSettings.java`](../../app/src/main/java/com/limelight/preferences/StreamSettings.java) | 1088 | 4.2 | StreamSettings, SettingsFragment | `onCreate()`:92 `onAttachedToWindow()`:106 `onConfigurationChanged()`:124 `onBackPressed()`:143 `getPrefs()`:174 `onCreateView()`:320 `onCreateView()`:326 `onCreatePreferences()`:331 |
| [`PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 1075 | 51.5 | PreferenceConfiguration, ScaleMode, ImeDisplayMode, FormatOption, AnalogStickForScrolling | — |
| [`AddComputerManually.java`](../../app/src/main/java/com/limelight/preferences/AddComputerManually.java) | 408 | 3.1 | AddComputerManually | `onServiceConnected()`:49 `onServiceDisconnected()`:54 `run()`:197 `run()`:227 `onStop()`:262 `onDestroy()`:270 `onCreate()`:280 `onEditorAction()`:333 |
| [`SeekBarPreference.java`](../../app/src/main/java/com/limelight/preferences/SeekBarPreference.java) | 206 | 2.9 | SeekBarPreference | `getDialog()`:72 `onProgressChanged()`:102 `onStartTrackingTouch()`:127 `onStopTrackingTouch()`:130 `updateSeekbar()`:164 `setProgress()`:184 `getProgress()`:190 `showDialog()`:194 |
| [`ConfirmDeleteKeyboardPreference.java`](../../app/src/main/java/com/limelight/preferences/ConfirmDeleteKeyboardPreference.java) | 56 | 2.9 | ConfirmDeleteKeyboardPreference, DialogFragmentCompat | `onDialogClosed()`:47 |
| [`ConfirmDeleteOscPreference.java`](../../app/src/main/java/com/limelight/preferences/ConfirmDeleteOscPreference.java) | 52 | 2.9 | ConfirmDeleteOscPreference, DialogFragmentCompat | `onDialogClosed()`:44 |
| [`LanguagePreference.java`](../../app/src/main/java/com/limelight/preferences/LanguagePreference.java) | 50 | 2.9 | LanguagePreference | — |
| [`WebLauncherPreference.java`](../../app/src/main/java/com/limelight/preferences/WebLauncherPreference.java) | 46 | 2.9 | WebLauncherPreference | `onClick()`:42 |
| [`GlPreferences.java`](../../app/src/main/java/com/limelight/preferences/GlPreferences.java) | 38 | 3.4 | GlPreferences | `writePreferences()`:31 |
| [`SmallIconCheckboxPreference.java`](../../app/src/main/java/com/limelight/preferences/SmallIconCheckboxPreference.java) | 33 | 2.9 | SmallIconCheckboxPreference | `onGetDefaultValue()`:29 |

## `app/src/main/java/com/limelight/profiles/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`ProfilesManager.java`](../../app/src/main/java/com/limelight/profiles/ProfilesManager.java) | 266 | 33.7 | ProfilesManager, ProfilesData, ProfileChangeListener, OverlaySharedPreferences | `load()`:49 `save()`:102 `getProfiles()`:133 `add()`:137 `update()`:143 `delete()`:149 `setActive()`:158 `getActive()`:164 |
| [`ProfilesAdapter.java`](../../app/src/main/java/com/limelight/profiles/ProfilesAdapter.java) | 109 | 4.3 | ProfilesAdapter, ProfileViewHolder | `onCreateViewHolder()`:35 `onBindViewHolder()`:41 `getItemCount()`:89 |
| [`SettingsProfile.java`](../../app/src/main/java/com/limelight/profiles/SettingsProfile.java) | 62 | 4.0 | SettingsProfile | `getUuid()`:23 `getName()`:27 `setName()`:31 `getCreatedUtc()`:35 `getModifiedUtc()`:39 `setModifiedUtc()`:43 `getOptions()`:47 `setOptions()`:51 |

## `app/src/main/java/com/limelight/ui/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`StreamContainer.java`](../../app/src/main/java/com/limelight/ui/StreamContainer.java) | 274 | 3.2 | StreamContainer, InputCallbacks, StreamMode | `init()`:65 `setDesiredAspectRatio()`:103 `setFillDisplay()`:108 `onMeasure()`:114 `setInputCallbacks()`:152 `setCommitTextEnabled()`:156 `onKeyPreIme()`:161 `onWindowFocusChanged()`:173 |
| [`StreamView.java`](../../app/src/main/java/com/limelight/ui/StreamView.java) | 168 | 2.9 | StreamView, InputCallbacks | `setDesiredAspectRatio()`:24 `setInputCallbacks()`:28 `setFillDisplay()`:32 `setCommitTextEnabled()`:36 `onMeasure()`:62 `onKeyPreIme()`:97 `onWindowFocusChanged()`:117 `onCheckIsTextEditor()`:126 |
| [`ApertureViewGroup.java`](../../app/src/main/java/com/limelight/ui/ApertureViewGroup.java) | 151 | 2.9 | ApertureViewGroup | `getOutline()`:54 `getCurrentSpeed()`:80 `setCurrentSpeed()`:84 `onSizeChanged()`:90 `dispatchDraw()`:124 |
| [`ExternalControllerView.java`](../../app/src/main/java/com/limelight/ui/ExternalControllerView.java) | 94 | 4.3 | ExternalControllerView, InputCallbacks | `setInputCallbacks()`:16 `setCommitTextEnabled()`:20 `onKeyPreIme()`:34 `onCheckIsTextEditor()`:54 `onCreateInputConnection()`:59 `commitText()`:70 `deleteSurroundingText()`:78 |
| [`AdapterFragment.java`](../../app/src/main/java/com/limelight/ui/AdapterFragment.java) | 36 | 3.4 | AdapterFragment | `onAttach()`:18 `onCreateView()`:25 `onActivityCreated()`:31 |
| [`GameGestures.java`](../../app/src/main/java/com/limelight/ui/GameGestures.java) | 10 | 3.6 | GameGestures | — |
| [`AdapterFragmentCallbacks.java`](../../app/src/main/java/com/limelight/ui/AdapterFragmentCallbacks.java) | 9 | 3.4 | AdapterFragmentCallbacks | — |

## `app/src/main/java/com/limelight/utils/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`Stereo3DRenderer.java`](../../app/src/main/java/com/limelight/utils/Stereo3DRenderer.java) | 1149 | 4.1 | Stereo3DRenderer, OnSurfaceReadyListener, InferenceResult, RenderResult, AiTask, AiResultHandling | `setPrefConfig()`:156 `onSurfaceDestroyed()`:160 `getVideoSurface()`:223 `onFrameAvailable()`:228 `onSurfaceCreated()`:236 `onDrawFrame()`:414 `onSurfaceChanged()`:756 `run()`:981 |
| [`KeyMapper.java`](../../app/src/main/java/com/limelight/utils/KeyMapper.java) | 1077 | 7.0 | KeyMapper | — |
| [`ExternalDisplayControlActivity.java`](../../app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java) | 567 | 9.1 | ExternalDisplayControlActivity | `onCreate()`:114 `onResume()`:199 `onPause()`:207 `onDestroy()`:215 `onKeyboardControllerVisibilityChange()`:221 `onWindowFocusChanged()`:279 `onBackPressed()`:289 `onConfigurationChanged()`:316 |
| [`DeviceUtils.java`](../../app/src/main/java/com/limelight/utils/DeviceUtils.java) | 411 | 7.9 | DeviceUtils | — |
| [`TvChannelHelper.java`](../../app/src/main/java/com/limelight/utils/TvChannelHelper.java) | 367 | 2.9 | TvChannelHelper, PreviewProgramBuilder, ChannelBuilder | `setChannelId()`:285 `setType()`:290 `setTitle()`:295 `setPosterArtAspectRatio()`:300 `setIntent()`:305 `setIntentUri()`:310 `setInternalProviderId()`:315 `setPosterArtUri()`:320 |
| [`ShortcutHelper.java`](../../app/src/main/java/com/limelight/utils/ShortcutHelper.java) | 315 | 3.9 | ShortcutHelper | `reportComputerShortcutUsed()`:97 `reportGameLaunched()`:105 `createAppViewShortcut()`:110 `createAppViewShortcutForOnlineHost()`:155 `createPinnedGameShortcut()`:164 `disableComputerShortcut()`:186 `disableAppShortcut()`:206 `enableAppShortcut()`:216 |
| [`UiHelper.java`](../../app/src/main/java/com/limelight/utils/UiHelper.java) | 296 | 12.6 | UiHelper | `onApplyWindowInsets()`:113 `onApplyWindowInsets()`:158 `run()`:199 `run()`:211 |
| [`ServerHelper.java`](../../app/src/main/java/com/limelight/utils/ServerHelper.java) | 278 | 5.1 | ServerHelper | `run()`:163 `run()`:201 |
| [`ShaderUtils.java`](../../app/src/main/java/com/limelight/utils/ShaderUtils.java) | 202 | 2.9 | ShaderUtils | — |
| [`PanZoomHandler.java`](../../app/src/main/java/com/limelight/utils/PanZoomHandler.java) | 174 | 3.2 | PanZoomHandler, ScaleListener, GestureListener | `handleTouchEvent()`:42 `handleSurfaceChange()`:79 `onScale()`:113 `onScaleEnd()`:140 `onScroll()`:147 `setInitialZoomAndPan()`:159 `getScaleFactor()`:170 `getChildX()`:171 |
| [`PerformanceDataTracker.java`](../../app/src/main/java/com/limelight/utils/PerformanceDataTracker.java) | 148 | 3.6 | PerformanceDataTracker | `savePerformanceStatistics()`:34 `getLog()`:137 `clearLogs()`:142 |
| [`SpinnerDialog.java`](../../app/src/main/java/com/limelight/utils/SpinnerDialog.java) | 121 | 10.5 | SpinnerDialog | `run()`:62 `run()`:69 `onCancel()`:112 |
| [`Dialog.java`](../../app/src/main/java/com/limelight/utils/Dialog.java) | 114 | 4.5 | Dialog | `run()`:47 `run()`:61 `onClick()`:74 `onClick()`:84 `onShow()`:98 |
| [`FileUriUtils.java`](../../app/src/main/java/com/limelight/utils/FileUriUtils.java) | 103 | 3.3 | FileUriUtils | — |
| [`CacheHelper.java`](../../app/src/main/java/com/limelight/utils/CacheHelper.java) | 87 | 6.5 | CacheHelper | — |
| [`ReflectivePaddingInt8Minimal.java`](../../app/src/main/java/com/limelight/utils/ReflectivePaddingInt8Minimal.java) | 80 | 2.9 | ReflectivePaddingInt8Minimal | — |
| [`HelpLauncher.java`](../../app/src/main/java/com/limelight/utils/HelpLauncher.java) | 60 | 5.6 | HelpLauncher | — |
| [`Vector2d.java`](../../app/src/main/java/com/limelight/utils/Vector2d.java) | 48 | 3.3 | Vector2d | `initialize()`:14 `getMagnitude()`:20 `getNormalized()`:24 `scalarMultiply()`:28 `setX()`:32 `setY()`:36 `getX()`:40 `getY()`:44 |
| [`KeyConfigHelper.java`](../../app/src/main/java/com/limelight/utils/KeyConfigHelper.java) | 45 | 5.8 | KeyConfigHelper, ShortcutFile, Shortcut | — |
| [`TrafficStatsHelper.java`](../../app/src/main/java/com/limelight/utils/TrafficStatsHelper.java) | 37 | 3.4 | TrafficStatsHelper | — |
| [`NetHelper.java`](../../app/src/main/java/com/limelight/utils/NetHelper.java) | 33 | 3.2 | NetHelper | — |
| [`MouseModeOption.java`](../../app/src/main/java/com/limelight/utils/MouseModeOption.java) | 17 | 3.2 | MouseModeOption | `toString()`:13 |

## `app/src/main/jni/evdev_reader/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`evdev_reader.c`](../../app/src/main/jni/evdev_reader/evdev_reader.c) | 412 | — | — | — |

## `app/src/main/jni/moonlight-core/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`controller_list.h`](../../app/src/main/jni/moonlight-core/controller_list.h) | 593 | — | — | — |
| [`callbacks.c`](../../app/src/main/jni/moonlight-core/callbacks.c) | 520 | — | — | — |
| [`simplejni.c`](../../app/src/main/jni/moonlight-core/simplejni.c) | 288 | — | — | — |
| [`usb_ids.h`](../../app/src/main/jni/moonlight-core/usb_ids.h) | 168 | — | — | — |
| [`minisdl.c`](../../app/src/main/jni/moonlight-core/minisdl.c) | 107 | — | — | — |
| [`controller_type.h`](../../app/src/main/jni/moonlight-core/controller_type.h) | 78 | — | — | — |
| [`minisdl.h`](../../app/src/main/jni/moonlight-core/minisdl.h) | 11 | — | — | — |

## `app/src/main/jni/moonlight-core/moonlight-common-c/src/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`ControlStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c) | 2077 | — | — | — |
| [`InputStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c) | 1603 | — | — | — |
| [`RtspConnection.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c) | 1420 | — | — | — |
| [`VideoDepacketizer.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/VideoDepacketizer.c) | 1189 | — | — | — |
| [`PlatformSockets.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/PlatformSockets.c) | 1001 | — | — | — |
| [`Limelight.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight.h) | 978 | — | — | — |
| [`RtpVideoQueue.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpVideoQueue.c) | 802 | — | — | — |
| [`RtpAudioQueue.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpAudioQueue.c) | 718 | — | — | — |
| [`SdpGenerator.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/SdpGenerator.c) | 623 | — | — | — |
| [`Connection.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Connection.c) | 542 | — | — | — |
| [`Platform.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Platform.c) | 504 | — | — | — |
| [`AudioStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/AudioStream.c) | 477 | — | — | — |
| [`PlatformCrypto.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/PlatformCrypto.c) | 471 | — | — | — |
| [`RtspParser.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspParser.c) | 431 | — | — | — |
| [`VideoStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/VideoStream.c) | 418 | — | — | — |
| [`ConnectionTester.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/ConnectionTester.c) | 309 | — | — | — |
| [`LinkedBlockingQueue.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/LinkedBlockingQueue.c) | 250 | — | — | — |
| [`Input.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h) | 206 | — | — | — |
| [`SimpleStun.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/SimpleStun.c) | 195 | — | — | — |
| [`ByteBuffer.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/ByteBuffer.c) | 176 | — | — | — |
| [`Limelight-internal.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight-internal.h) | 155 | — | — | — |
| [`Misc.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Misc.c) | 154 | — | — | — |
| [`Platform.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Platform.h) | 152 | — | — | — |
| [`FakeCallbacks.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/FakeCallbacks.c) | 151 | — | — | — |
| [`PlatformSockets.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/PlatformSockets.h) | 132 | — | — | — |
| [`RecorderCallbacks.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RecorderCallbacks.c) | 103 | — | — | — |
| [`RtpAudioQueue.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpAudioQueue.h) | 80 | — | — | — |
| [`PlatformThreads.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/PlatformThreads.h) | 74 | — | — | — |
| [`Video.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Video.h) | 71 | — | — | — |
| [`Rtsp.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Rtsp.h) | 68 | — | — | — |
| [`RtpVideoQueue.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpVideoQueue.h) | 58 | — | — | — |
| [`PlatformCrypto.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/PlatformCrypto.h) | 49 | — | — | — |
| [`LinkedBlockingQueue.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/LinkedBlockingQueue.h) | 42 | — | — | — |
| [`ByteBuffer.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/ByteBuffer.h) | 30 | — | — | — |

## `app/src/root/java/com.limelight/binding/input/evdev/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`EvdevCaptureProvider.java`](../../app/src/root/java/com.limelight/binding/input/evdev/EvdevCaptureProvider.java) | 348 | 2.9 | EvdevCaptureProvider | `run()`:38 `run()`:210 `showCursor()`:237 `run()`:242 `hideCursor()`:255 `run()`:260 `enableCapture()`:274 `destroy()`:288 |
| [`EvdevTranslator.java`](../../app/src/root/java/com.limelight/binding/input/evdev/EvdevTranslator.java) | 140 | 2.9 | EvdevTranslator | — |
| [`EvdevReader.java`](../../app/src/root/java/com.limelight/binding/input/evdev/EvdevReader.java) | 59 | 2.9 | EvdevReader | — |
| [`EvdevEvent.java`](../../app/src/root/java/com.limelight/binding/input/evdev/EvdevEvent.java) | 39 | 2.9 | EvdevEvent | — |

## `app/src/test/java/com/limelight/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`StartupCrashTest.java`](../../app/src/test/java/com/limelight/StartupCrashTest.java) | 288 | 2.9 | StartupCrashTest | `setUp()`:37 `testNativeLibraryLoadingFailure()`:54 `testGLSurfaceViewInitialization()`:68 `testPreferenceConfigurationCrash()`:82 `testUiHelperCrash()`:93 `testComputerManagerServiceBinding()`:106 `testSharedPreferencesCorruption()`:119 `testMissingRequiredIntentExtras()`:139 |
| [`StartupTest.java`](../../app/src/test/java/com/limelight/StartupTest.java) | 232 | 2.9 | StartupTest | `setUp()`:35 `testApplicationStartup()`:52 `testPcViewActivityCreation()`:64 `testPcViewActivityWithIntent()`:72 `testAppViewActivityCreation()`:86 `testProfilesManagerFileSystemAccess()`:98 `testMissingPermissions()`:112 `testCorruptedProfilesFile()`:130 |
| [`PosterContentProviderTest.java`](../../app/src/test/java/com/limelight/PosterContentProviderTest.java) | 173 | 2.9 | PosterContentProviderTest | `setUp()`:39 `legitimateBoxArtIsServed()`:77 `traversalCannotReachAFileOutsideTheBoxArtDirectory()`:91 `traversalShapedUuidsAreRejected()`:113 `nonUuidSegmentsAreRejected()`:120 `nonNumericAppIdIsRejectedWithoutCrashing()`:127 `unexpectedPathsAreRejected()`:135 `writeModesAreRefused()`:154 |
| [`SimpleStartupTest.java`](../../app/src/test/java/com/limelight/SimpleStartupTest.java) | 157 | 2.9 | SimpleStartupTest | `setUp()`:31 `testApplicationCreation()`:48 `testApplicationOnCreate()`:55 `testProfilesManagerSingleton()`:74 `testProfilesManagerLoad()`:85 `testProfilesManagerSave()`:99 `testContextFileAccess()`:114 `testNullContextHandling()`:132 |
| [`LayoutInflationTest.java`](../../app/src/test/java/com/limelight/LayoutInflationTest.java) | 58 | 2.9 | LayoutInflationTest | `allLayoutsInflateSuccessfully()`:26 |
| [`TestLogSuppressor.java`](../../app/src/test/java/com/limelight/TestLogSuppressor.java) | 37 | 14.1 | TestLogSuppressor | `println()`:23 `print()`:30 |
| [`ProfileTestHelper.java`](../../app/src/test/java/com/limelight/ProfileTestHelper.java) | 1 | — | — | — |

## `app/src/test/java/com/limelight/binding/input/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`TextInputPumpTest.java`](../../app/src/test/java/com/limelight/binding/input/TextInputPumpTest.java) | 204 | 2.9 | TextInputPumpTest, FakeScheduler, RecordingSink | `postDelayed()`:30 `sendText()`:53 `sendBackspaces()`:58 `setUp()`:73 `shortText_isDeliveredWhole()`:88 `multiChunkText_isFullyDelivered()`:98 `queueKeepsWorkingAfterAMultiChunkCommit()`:110 `chunkBoundaryNeverSplitsACodePoint()`:122 |

## `app/src/test/java/com/limelight/profiles/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`OverlayPreferencesTest.java`](../../app/src/test/java/com/limelight/profiles/OverlayPreferencesTest.java) | 129 | 2.9 | OverlayPreferencesTest | `setup()`:37 `overlayPref_CoercesDoubleToInt()`:47 `overlayPref_CoercesDoubleToLong()`:68 `overlayPref_RemembersZoomOptionsBetweenSessions()`:88 |
| [`ProfilesActivityUiTest.java`](../../app/src/test/java/com/limelight/profiles/ProfilesActivityUiTest.java) | 124 | 2.9 | ProfilesActivityUiTest | `setUp()`:45 `fabLaunchesEditProfileActivity()`:54 `radioClick_changesActiveProfile()`:68 `deleteProfile_removesRowAndUpdatesEmptyState()`:94 |
| [`ProfilesManagerTest.java`](../../app/src/test/java/com/limelight/profiles/ProfilesManagerTest.java) | 116 | 2.9 | ProfilesManagerTest | `setUp()`:35 `tearDown()`:45 `addAndRetrieveProfile()`:50 `setActivePersists()`:58 `updateAndSaveProfile()`:70 `deleteProfile()`:82 `deleteActiveProfile_resetsActive()`:92 |
| [`ProfilesNavigationTest.java`](../../app/src/test/java/com/limelight/profiles/ProfilesNavigationTest.java) | 113 | 2.9 | ProfilesNavigationTest | `clickingProfileButton_launchesProfilesActivity()`:72 `clickingProfileButton_launchesProfilesActivityFromAppView()`:88 `profilesActivity_startsWithoutCrash()`:108 |
| [`ProfilesOverlayTest.java`](../../app/src/test/java/com/limelight/profiles/ProfilesOverlayTest.java) | 97 | 2.9 | ProfilesOverlayTest | `setUp()`:35 `overlaySharedPreferences_returnsPatchedValues()`:44 `overlayPersistsAcrossSessions()`:66 |

## `app/src/test/java/com/limelight/shadows/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`ShadowMoonBridge.java`](../../app/src/test/java/com/limelight/shadows/ShadowMoonBridge.java) | 38 | 2.9 | ShadowMoonBridge, AudioConfiguration | `toInt()`:22 |
| [`ShadowGameManager.java`](../../app/src/test/java/com/limelight/shadows/ShadowGameManager.java) | 22 | 2.9 | ShadowGameManager | `__constructor__()`:14 `setGameState()`:19 |
| [`ShadowBackdropFrameRenderer.java`](../../app/src/test/java/com/limelight/shadows/ShadowBackdropFrameRenderer.java) | 12 | 2.9 | ShadowBackdropFrameRenderer | `run()`:9 |

## `app/src/test/java/com/limelight/ui/`

| Arquivo | Linhas | Rank | Tipos | Símbolos-chave |
|---|--:|--:|---|---|
| [`StreamViewCommitTextTest.java`](../../app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java) | 61 | 2.9 | StreamViewCommitTextTest | `setUp()`:25 `commitText_isForwarded_whenEnabled()`:30 `commitText_notForwarded_whenDisabled()`:46 |
