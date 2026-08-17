<!-- GERADO POR tools/codemap/codemap.mjs — NÃO EDITE À MÃO. Rode: node tools/codemap/codemap.mjs -->

# Fronteira JNI (Java ⟷ C)

> Toda travessia entre a JVM e o código nativo. Alterar qualquer assinatura aqui exige mudança nos DOIS lados, ou o app quebra em runtime (não em compile time).

## Métodos `native` declarados em Java


### `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`

| Método | Assinatura | Linha |
|---|---|--:|
| `startConnection` | `int startConnection(String address, String appVersion, String gfeVersion, String rtspSessionUrl, int serverCodecModeSupport, int width, int height, int fps, int bitrate, int packetSize, int streamingRemotely, int audioConfiguration, int supportedVideoFormats, int clientRefreshRateX100, byte[] riAesKey, byte[] riAesIv, int videoCapabilities, int colorSpace, int colorRange)` | 343 |
| `stopConnection` | `void stopConnection()` | 353 |
| `interruptConnection` | `void interruptConnection()` | 355 |
| `sendExecServerCmd` | `void sendExecServerCmd(int cmdId)` | 357 |
| `sendEmptyPayload` | `void sendEmptyPayload()` | 359 |
| `sendMouseMove` | `void sendMouseMove(short deltaX, short deltaY)` | 361 |
| `sendMousePosition` | `void sendMousePosition(short x, short y, short referenceWidth, short referenceHeight)` | 363 |
| `sendMouseMoveAsMousePosition` | `void sendMouseMoveAsMousePosition(short deltaX, short deltaY, short referenceWidth, short referenceHeight)` | 365 |
| `sendMouseButton` | `void sendMouseButton(byte buttonEvent, byte mouseButton)` | 367 |
| `sendMultiControllerInput` | `void sendMultiControllerInput(short controllerNumber, short activeGamepadMask, int buttonFlags, byte leftTrigger, byte rightTrigger, short leftStickX, short leftStickY, short rightStickX, short rightStickY)` | 369 |
| `sendTouchEvent` | `int sendTouchEvent(byte eventType, int pointerId, float x, float y, float pressure, float contactAreaMajor, float contactAreaMinor, short rotation)` | 375 |
| `sendPenEvent` | `int sendPenEvent(byte eventType, byte toolType, byte penButtons, float x, float y, float pressure, float contactAreaMajor, float contactAreaMinor, short rotation, byte tilt)` | 378 |
| `sendControllerArrivalEvent` | `int sendControllerArrivalEvent(byte controllerNumber, short activeGamepadMask, byte type, int supportedButtonFlags, short capabilities)` | 382 |
| `sendControllerTouchEvent` | `int sendControllerTouchEvent(byte controllerNumber, byte eventType, int pointerId, float x, float y, float pressure)` | 384 |
| `sendControllerMotionEvent` | `int sendControllerMotionEvent(byte controllerNumber, byte motionType, float x, float y, float z)` | 386 |
| `sendControllerBatteryEvent` | `int sendControllerBatteryEvent(byte controllerNumber, byte batteryState, byte batteryPercentage)` | 388 |
| `sendKeyboardInput` | `void sendKeyboardInput(short keyMap, byte keyDirection, byte modifier, byte flags)` | 390 |
| `sendMouseHighResScroll` | `void sendMouseHighResScroll(short scrollAmount)` | 392 |
| `sendMouseHighResHScroll` | `void sendMouseHighResHScroll(short scrollAmount)` | 394 |
| `sendUtf8Text` | `void sendUtf8Text(String text)` | 396 |
| `getStageName` | `String getStageName(int stage)` | 398 |
| `findExternalAddressIP4` | `String findExternalAddressIP4(String stunHostName, int stunPort)` | 400 |
| `getPendingAudioDuration` | `int getPendingAudioDuration()` | 402 |
| `getPendingVideoFrames` | `int getPendingVideoFrames()` | 404 |
| `testClientConnectivity` | `int testClientConnectivity(String testServerHostName, int referencePort, int testFlags)` | 406 |
| `getPortFlagsFromStage` | `int getPortFlagsFromStage(int stage)` | 408 |
| `getPortFlagsFromTerminationErrorCode` | `int getPortFlagsFromTerminationErrorCode(int errorCode)` | 410 |
| `stringifyPortFlags` | `String stringifyPortFlags(int portFlags, String separator)` | 412 |
| `getEstimatedRttInfo` | `long getEstimatedRttInfo()` | 415 |
| `getLaunchUrlQueryParameters` | `String getLaunchUrlQueryParameters()` | 417 |
| `guessControllerType` | `byte guessControllerType(int vendorId, int productId)` | 419 |
| `guessControllerHasPaddles` | `boolean guessControllerHasPaddles(int vendorId, int productId)` | 421 |
| `guessControllerHasShareButton` | `boolean guessControllerHasShareButton(int vendorId, int productId)` | 423 |
| `init` | `void init()` | 425 |

## Exports `Java_*` no lado C


### `app/src/main/jni/moonlight-core/callbacks.c`

| Export | Símbolo Java | Linha |
|---|---|--:|
| `Java_com_limelight_nvstream_jni_MoonBridge_init` | `com.limelight.nvstream.jni.MoonBridge.init` | 81 |
| `Java_com_limelight_nvstream_jni_MoonBridge_startConnection` | `com.limelight.nvstream.jni.MoonBridge.startConnection` | 455 |

### `app/src/main/jni/moonlight-core/simplejni.c`

| Export | Símbolo Java | Linha |
|---|---|--:|
| `Java_com_limelight_nvstream_jni_MoonBridge_sendMouseMove` | `com.limelight.nvstream.jni.MoonBridge.sendMouseMove` | 14 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendExecServerCmd` | `com.limelight.nvstream.jni.MoonBridge.sendExecServerCmd` | 19 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendEmptyPayload` | `com.limelight.nvstream.jni.MoonBridge.sendEmptyPayload` | 25 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendMousePosition` | `com.limelight.nvstream.jni.MoonBridge.sendMousePosition` | 30 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendMouseMoveAsMousePosition` | `com.limelight.nvstream.jni.MoonBridge.sendMouseMoveAsMousePosition` | 36 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendMouseButton` | `com.limelight.nvstream.jni.MoonBridge.sendMouseButton` | 42 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendMultiControllerInput` | `com.limelight.nvstream.jni.MoonBridge.sendMultiControllerInput` | 47 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendTouchEvent` | `com.limelight.nvstream.jni.MoonBridge.sendTouchEvent` | 57 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendPenEvent` | `com.limelight.nvstream.jni.MoonBridge.sendPenEvent` | 67 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendControllerArrivalEvent` | `com.limelight.nvstream.jni.MoonBridge.sendControllerArrivalEvent` | 77 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendControllerTouchEvent` | `com.limelight.nvstream.jni.MoonBridge.sendControllerTouchEvent` | 87 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendControllerMotionEvent` | `com.limelight.nvstream.jni.MoonBridge.sendControllerMotionEvent` | 96 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendControllerBatteryEvent` | `com.limelight.nvstream.jni.MoonBridge.sendControllerBatteryEvent` | 104 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendKeyboardInput` | `com.limelight.nvstream.jni.MoonBridge.sendKeyboardInput` | 112 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendMouseHighResScroll` | `com.limelight.nvstream.jni.MoonBridge.sendMouseHighResScroll` | 117 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendMouseHighResHScroll` | `com.limelight.nvstream.jni.MoonBridge.sendMouseHighResHScroll` | 122 |
| `Java_com_limelight_nvstream_jni_MoonBridge_sendUtf8Text` | `com.limelight.nvstream.jni.MoonBridge.sendUtf8Text` | 127 |
| `Java_com_limelight_nvstream_jni_MoonBridge_stopConnection` | `com.limelight.nvstream.jni.MoonBridge.stopConnection` | 134 |
| `Java_com_limelight_nvstream_jni_MoonBridge_interruptConnection` | `com.limelight.nvstream.jni.MoonBridge.interruptConnection` | 139 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getStageName` | `com.limelight.nvstream.jni.MoonBridge.getStageName` | 144 |
| `Java_com_limelight_nvstream_jni_MoonBridge_findExternalAddressIP4` | `com.limelight.nvstream.jni.MoonBridge.findExternalAddressIP4` | 149 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getPendingAudioDuration` | `com.limelight.nvstream.jni.MoonBridge.getPendingAudioDuration` | 173 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getPendingVideoFrames` | `com.limelight.nvstream.jni.MoonBridge.getPendingVideoFrames` | 178 |
| `Java_com_limelight_nvstream_jni_MoonBridge_testClientConnectivity` | `com.limelight.nvstream.jni.MoonBridge.testClientConnectivity` | 183 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getPortFlagsFromStage` | `com.limelight.nvstream.jni.MoonBridge.getPortFlagsFromStage` | 195 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getPortFlagsFromTerminationErrorCode` | `com.limelight.nvstream.jni.MoonBridge.getPortFlagsFromTerminationErrorCode` | 200 |
| `Java_com_limelight_nvstream_jni_MoonBridge_stringifyPortFlags` | `com.limelight.nvstream.jni.MoonBridge.stringifyPortFlags` | 205 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getEstimatedRttInfo` | `com.limelight.nvstream.jni.MoonBridge.getEstimatedRttInfo` | 216 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getLaunchUrlQueryParameters` | `com.limelight.nvstream.jni.MoonBridge.getLaunchUrlQueryParameters` | 227 |
| `Java_com_limelight_nvstream_jni_MoonBridge_guessControllerType` | `com.limelight.nvstream.jni.MoonBridge.guessControllerType` | 232 |
| `Java_com_limelight_nvstream_jni_MoonBridge_guessControllerHasPaddles` | `com.limelight.nvstream.jni.MoonBridge.guessControllerHasPaddles` | 263 |
| `Java_com_limelight_nvstream_jni_MoonBridge_guessControllerHasShareButton` | `com.limelight.nvstream.jni.MoonBridge.guessControllerHasShareButton` | 269 |
