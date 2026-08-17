<!-- GERADO POR tools/codemap/codemap.mjs — NÃO EDITE À MÃO. Rode: node tools/codemap/codemap.mjs -->

# Hotspots e Dívida Técnica

> Onde o risco se concentra. Consulte **antes** de planejar um refactor.

## God-classes (>800 linhas)

| Arquivo | Linhas | Métodos | Fan-in | Fan-out |
|---|--:|--:|--:|--:|
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4430 | 151 | 10 | 45 |
| [`app/src/main/java/com/limelight/binding/input/ControllerHandler.java`](../../app/src/main/java/com/limelight/binding/input/ControllerHandler.java) | 3473 | 72 | 3 | 12 |
| [`app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java`](../../app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java) | 2434 | 58 | 1 | 6 |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c) | 2077 | 40 | — | — |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c) | 1603 | 35 | — | — |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c) | 1420 | 19 | — | — |
| [`app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java`](../../app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java) | 1196 | 40 | 2 | 2 |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/VideoDepacketizer.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/VideoDepacketizer.c) | 1189 | 32 | — | — |
| [`app/src/main/java/com/limelight/utils/Stereo3DRenderer.java`](../../app/src/main/java/com/limelight/utils/Stereo3DRenderer.java) | 1149 | 36 | 2 | 2 |
| [`app/src/main/java/com/limelight/preferences/StreamSettings.java`](../../app/src/main/java/com/limelight/preferences/StreamSettings.java) | 1088 | 34 | 2 | 10 |
| [`app/src/main/java/com/limelight/utils/KeyMapper.java`](../../app/src/main/java/com/limelight/utils/KeyMapper.java) | 1077 | 2 | 4 | 0 |
| [`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 1075 | 21 | 33 | 2 |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/PlatformSockets.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/PlatformSockets.c) | 1001 | 24 | — | — |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight.h) | 978 | 52 | — | — |
| [`app/src/main/java/com/limelight/computers/ComputerManagerService.java`](../../app/src/main/java/com/limelight/computers/ComputerManagerService.java) | 969 | 42 | 5 | 13 |
| [`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`](../../app/src/main/java/com/limelight/nvstream/http/NvHTTP.java) | 939 | 59 | 13 | 4 |
| [`app/src/main/java/com/limelight/PcView.java`](../../app/src/main/java/com/limelight/PcView.java) | 934 | 47 | 4 | 23 |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpVideoQueue.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpVideoQueue.c) | 802 | 12 | — | — |

## Mais dependidos (fan-in alto — mudanças aqui propagam)

| Arquivo | Fan-in | Linhas |
|---|--:|--:|
| `app/src/main/java/com/limelight/LimeLog.java` | 47 | 26 |
| `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java` | 33 | 1075 |
| `app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java` | 21 | 240 |
| `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java` | 15 | 445 |
| `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java` | 13 | 939 |
| `app/src/main/java/com/limelight/nvstream/http/NvApp.java` | 11 | 101 |
| `app/src/main/java/com/limelight/utils/UiHelper.java` | 11 | 296 |
| `app/src/main/java/com/limelight/Game.java` | 10 | 4430 |
| `app/src/main/java/com/limelight/nvstream/input/ControllerPacket.java` | 10 | 27 |
| `app/src/main/java/com/limelight/profiles/ProfilesManager.java` | 10 | 266 |
| `app/src/main/java/com/limelight/nvstream/NvConnection.java` | 8 | 629 |
| `app/src/test/java/com/limelight/TestLogSuppressor.java` | 8 | 37 |
| `app/src/main/java/com/limelight/utils/ServerHelper.java` | 7 | 275 |
| `app/src/main/java/com/limelight/GameMenu.java` | 6 | 403 |
| `app/src/main/java/com/limelight/nvstream/http/PairingManager.java` | 6 | 357 |
| `app/src/main/java/com/limelight/nvstream/input/MouseButtonPacket.java` | 6 | 13 |
| `app/src/main/java/com/limelight/utils/Dialog.java` | 6 | 114 |
| `app/src/main/java/com/limelight/AppView.java` | 5 | 796 |
| `app/src/main/java/com/limelight/binding/PlatformBinding.java` | 5 | 15 |
| `app/src/main/java/com/limelight/computers/ComputerManagerService.java` | 5 | 969 |

## Mais acoplados (fan-out alto — difíceis de testar isoladamente)

| Arquivo | Fan-out | Linhas |
|---|--:|--:|
| `app/src/main/java/com/limelight/Game.java` | 45 | 4430 |
| `app/src/main/java/com/limelight/PcView.java` | 23 | 934 |
| `app/src/main/java/com/limelight/AppView.java` | 17 | 796 |
| `app/src/main/java/com/limelight/ShortcutTrampoline.java` | 15 | 531 |
| `app/src/main/java/com/limelight/computers/ComputerManagerService.java` | 13 | 969 |
| `app/src/main/java/com/limelight/binding/input/ControllerHandler.java` | 12 | 3473 |
| `app/src/main/java/com/limelight/preferences/AddComputerManually.java` | 12 | 408 |
| `app/src/main/java/com/limelight/utils/ServerHelper.java` | 12 | 275 |
| `app/src/main/java/com/limelight/nvstream/NvConnection.java` | 11 | 629 |
| `app/src/main/java/com/limelight/preferences/StreamSettings.java` | 10 | 1088 |
| `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardController.java` | 8 | 796 |
| `app/src/main/java/com/limelight/grid/AppGridAdapter.java` | 8 | 194 |
| `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardControllerConfigurationLoader.java` | 7 | 591 |
| `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java` | 7 | 567 |
| `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java` | 6 | 2434 |
| `app/src/main/java/com/limelight/EditProfileActivity.java` | 5 | 476 |
| `app/src/main/java/com/limelight/GameMenu.java` | 5 | 403 |
| `app/src/main/java/com/limelight/discovery/DiscoveryService.java` | 5 | 91 |
| `app/src/main/java/com/limelight/utils/UiHelper.java` | 5 | 296 |
| `app/src/main/java/com/limelight/binding/PlatformBinding.java` | 4 | 15 |

## Marcadores TODO/FIXME/HACK (35)

| Tipo | Local | Texto |
|---|---|---|
| FIXME | `app/src/main/java/com/limelight/EditProfileActivity.java:276` | // We can't separate keyboard files and special button files in profiles |
| FIXME | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:109` | Paddles? |
| FIXME | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:1592` | There's no good way to know for sure if xpad is bound |
| FIXME | `app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:186` | Should we do this for all Amlogic S905X SoCs? |
| FIXME | `app/src/main/java/com/limelight/computers/ComputerManagerService.java:788` | Should await termination here but we have timeout issues in HttpURLConnection |
| FIXME | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:425` | Do we want to use the current port? |
| FIXME | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:869` | Detect support resolutions using the serverinfo response, not a hardcoded list |
| FIXME | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:107` | Unsure if this is exactly right, but it's probably good enough. |
| FIXME | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:1183` | Maybe reset accumulated delta based on time too? |
| FIXME | `app/src/main/jni/moonlight-core/moonlight-common-c/src/PlatformCrypto.c:452` | This is not thread safe... |
| FIXME | `app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c:76` | Hacked CSeq attribute due to RTSP parser bug |
| HACK | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:342` | for https://issuetracker.google.com/issues/163120692 |
| HACK | `app/src/main/java/com/limelight/binding/input/ControllerHandler.java:1034` | for https://issuetracker.google.com/issues/163120692 |
| HACK | `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java:265` | GFE sometimes discards gamepad packets when they are received |
| HACK | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1669` | Reset codec recovery attempt counter, since this is an expected "recovery" |
| HACK | `app/src/main/java/com/limelight/preferences/StreamSettings.java:74` | for Android 9 |
| HACK | `app/src/main/java/com/limelight/preferences/StreamSettings.java:623` | We need to let the preference change succeed before reinitializing to ensure |
| HACK | `app/src/main/java/com/limelight/preferences/StreamSettings.java:980` | We need to let the preference change succeed before reinitializing to ensure |
| HACK | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:598` | This is a workaround for the fact that GFE doesn't appear to synchronize keyboard |
| HACK | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:1047` | We previously used a short for the buttonFlags argument, but we switched to an |
| HACK | `app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c:945` | In order to get GFE to respect our request for a lower audio bitrate, we must |
| TODO | `app/src/main/java/com/limelight/Game.java:1647` | Improve this |
| TODO | `app/src/main/java/com/limelight/Game.java:1661` | Do we want to use WindowInsetsController here on R+ instead of |
| TODO | `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStick.java:93` | implement square sick for simulations |
| TODO | `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:95` | implement square sick for simulations |
| TODO | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyAnalogStick.java:95` | implement square sick for simulations |
| TODO | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/keyAnalogStickFree.java:93` | implement square sick for simulations |
| TODO | `app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:873` | Test some AV1 decoders |
| TODO | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:349` | Shield Hub uses HTTP for this and is able to get an accurate PairStatus with HTTP. |
| TODO | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:524` | Collect some empirical data to see if these defaults make sense. |
| TODO | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:781` | Send this as unreliable sequenced when we have a delayed reliable retransmission thread |
| TODO | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:842` | Send this as unreliable sequenced when we have a delayed reliable retransmission thread |
| TODO | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:1085` | Send this as unreliable sequenced when we have a delayed reliable retransmission thread |
| TODO | `app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpVideoQueue.c:368` | nvPacket->multiFecFlags? |
| XXX | `app/src/main/jni/moonlight-core/controller_list.h:80` | this may not work and may need to be called a ps3 controller |
