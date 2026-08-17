<!-- GERADO POR tools/codemap/codemap.mjs — NÃO EDITE À MÃO. Rode: node tools/codemap/codemap.mjs -->

# Fronteira JNI (Java ⟷ C)

> Toda travessia entre a JVM e o código nativo. Alterar qualquer assinatura aqui exige mudança nos DOIS lados, ou o app quebra em runtime (não em compile time).

## Métodos `native` declarados em Java


### `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`

| Método | Assinatura | Linha |
|---|---|--:|
| `startConnection` | `int startConnection(String address, String appVersion, String gfeVersion, String rtspSessionUrl, int serverCodecModeSupport, int width, int height, int fps, int bitrate, int packetSize, int streamingRemotely, int audioConfiguration, int supportedVideoFormats, int clientRefreshRateX100, byte[] riAesKey, byte[] riAesIv, int videoCapabilities, int colorSpace, int colorRange)` | 345 |
| `stopConnection` | `void stopConnection()` | 355 |
| `interruptConnection` | `void interruptConnection()` | 357 |
| `sendExecServerCmd` | `void sendExecServerCmd(int cmdId)` | 359 |
| `sendEmptyPayload` | `void sendEmptyPayload()` | 361 |
| `sendMouseMove` | `void sendMouseMove(short deltaX, short deltaY)` | 363 |
| `sendMousePosition` | `void sendMousePosition(short x, short y, short referenceWidth, short referenceHeight)` | 365 |
| `sendMouseMoveAsMousePosition` | `void sendMouseMoveAsMousePosition(short deltaX, short deltaY, short referenceWidth, short referenceHeight)` | 367 |
| `sendMouseButton` | `void sendMouseButton(byte buttonEvent, byte mouseButton)` | 369 |
| `sendMultiControllerInput` | `void sendMultiControllerInput(short controllerNumber, short activeGamepadMask, int buttonFlags, byte leftTrigger, byte rightTrigger, short leftStickX, short leftStickY, short rightStickX, short rightStickY)` | 371 |
| `sendTouchEvent` | `int sendTouchEvent(byte eventType, int pointerId, float x, float y, float pressure, float contactAreaMajor, float contactAreaMinor, short rotation)` | 377 |
| `sendPenEvent` | `int sendPenEvent(byte eventType, byte toolType, byte penButtons, float x, float y, float pressure, float contactAreaMajor, float contactAreaMinor, short rotation, byte tilt)` | 380 |
| `sendControllerArrivalEvent` | `int sendControllerArrivalEvent(byte controllerNumber, short activeGamepadMask, byte type, int supportedButtonFlags, short capabilities)` | 384 |
| `sendControllerTouchEvent` | `int sendControllerTouchEvent(byte controllerNumber, byte eventType, int pointerId, float x, float y, float pressure)` | 386 |
| `sendControllerMotionEvent` | `int sendControllerMotionEvent(byte controllerNumber, byte motionType, float x, float y, float z)` | 388 |
| `sendControllerBatteryEvent` | `int sendControllerBatteryEvent(byte controllerNumber, byte batteryState, byte batteryPercentage)` | 390 |
| `sendKeyboardInput` | `void sendKeyboardInput(short keyMap, byte keyDirection, byte modifier, byte flags)` | 392 |
| `sendMouseHighResScroll` | `void sendMouseHighResScroll(short scrollAmount)` | 394 |
| `sendMouseHighResHScroll` | `void sendMouseHighResHScroll(short scrollAmount)` | 396 |
| `sendUtf8TextBytes` | `void sendUtf8TextBytes(byte[] utf8)` | 414 |
| `getStageName` | `String getStageName(int stage)` | 416 |
| `findExternalAddressIP4` | `String findExternalAddressIP4(String stunHostName, int stunPort)` | 418 |
| `getPendingAudioDuration` | `int getPendingAudioDuration()` | 420 |
| `getPendingVideoFrames` | `int getPendingVideoFrames()` | 422 |
| `testClientConnectivity` | `int testClientConnectivity(String testServerHostName, int referencePort, int testFlags)` | 424 |
| `getPortFlagsFromStage` | `int getPortFlagsFromStage(int stage)` | 426 |
| `getPortFlagsFromTerminationErrorCode` | `int getPortFlagsFromTerminationErrorCode(int errorCode)` | 428 |
| `stringifyPortFlags` | `String stringifyPortFlags(int portFlags, String separator)` | 430 |
| `getEstimatedRttInfo` | `long getEstimatedRttInfo()` | 433 |
| `getLaunchUrlQueryParameters` | `String getLaunchUrlQueryParameters()` | 435 |
| `guessControllerType` | `byte guessControllerType(int vendorId, int productId)` | 437 |
| `guessControllerHasPaddles` | `boolean guessControllerHasPaddles(int vendorId, int productId)` | 439 |
| `guessControllerHasShareButton` | `boolean guessControllerHasShareButton(int vendorId, int productId)` | 441 |
| `init` | `void init()` | 443 |

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
| `Java_com_limelight_nvstream_jni_MoonBridge_sendUtf8TextBytes` | `com.limelight.nvstream.jni.MoonBridge.sendUtf8TextBytes` | 131 |
| `Java_com_limelight_nvstream_jni_MoonBridge_stopConnection` | `com.limelight.nvstream.jni.MoonBridge.stopConnection` | 150 |
| `Java_com_limelight_nvstream_jni_MoonBridge_interruptConnection` | `com.limelight.nvstream.jni.MoonBridge.interruptConnection` | 155 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getStageName` | `com.limelight.nvstream.jni.MoonBridge.getStageName` | 160 |
| `Java_com_limelight_nvstream_jni_MoonBridge_findExternalAddressIP4` | `com.limelight.nvstream.jni.MoonBridge.findExternalAddressIP4` | 165 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getPendingAudioDuration` | `com.limelight.nvstream.jni.MoonBridge.getPendingAudioDuration` | 189 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getPendingVideoFrames` | `com.limelight.nvstream.jni.MoonBridge.getPendingVideoFrames` | 194 |
| `Java_com_limelight_nvstream_jni_MoonBridge_testClientConnectivity` | `com.limelight.nvstream.jni.MoonBridge.testClientConnectivity` | 199 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getPortFlagsFromStage` | `com.limelight.nvstream.jni.MoonBridge.getPortFlagsFromStage` | 211 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getPortFlagsFromTerminationErrorCode` | `com.limelight.nvstream.jni.MoonBridge.getPortFlagsFromTerminationErrorCode` | 216 |
| `Java_com_limelight_nvstream_jni_MoonBridge_stringifyPortFlags` | `com.limelight.nvstream.jni.MoonBridge.stringifyPortFlags` | 221 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getEstimatedRttInfo` | `com.limelight.nvstream.jni.MoonBridge.getEstimatedRttInfo` | 232 |
| `Java_com_limelight_nvstream_jni_MoonBridge_getLaunchUrlQueryParameters` | `com.limelight.nvstream.jni.MoonBridge.getLaunchUrlQueryParameters` | 243 |
| `Java_com_limelight_nvstream_jni_MoonBridge_guessControllerType` | `com.limelight.nvstream.jni.MoonBridge.guessControllerType` | 248 |
| `Java_com_limelight_nvstream_jni_MoonBridge_guessControllerHasPaddles` | `com.limelight.nvstream.jni.MoonBridge.guessControllerHasPaddles` | 279 |
| `Java_com_limelight_nvstream_jni_MoonBridge_guessControllerHasShareButton` | `com.limelight.nvstream.jni.MoonBridge.guessControllerHasShareButton` | 285 |
