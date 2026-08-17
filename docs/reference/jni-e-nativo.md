# Camada Nativa (JNI) e ponte MoonBridge — app/src/main/jni/ + submódulo moonlight-common-c

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (17)
6. [Ideias de melhoria](#ideias-de-melhoria) (10)
7. [Glossário](#glossário)

## Como funciona

A camada nativa do Artemis é compilada com ndk-build (NDK 27.0.12077973, `app/build.gradle:4`, `app/build.gradle:147-150`) a partir de `app/src/main/jni/Android.mk:1`, que apenas inclui os subdiretórios. O módulo principal é `moonlight-core` (`app/src/main/jni/moonlight-core/Android.mk:9-63`): uma .so compartilhada que compila 20 arquivos do submódulo `moonlight-common-c/src`, o ENet, o Reed-Solomon, e três arquivos de cola do fork — `simplejni.c` (implementações JNI 1:1 das APIs Li*), `callbacks.c` (upcalls C→Java e `startConnection`) e `minisdl.c` (heurística de tipo de gamepad copiada do SDL). Linka estaticamente `libopus`, `libssl`, `libcrypto` (todos .a pré-compilados versionados no repo, `Build.txt:1`) e `cpufeatures`, com `-Wl,--exclude-libs,ALL` para não reexportar símbolos. Um segundo módulo, `evdev_reader`, é um executável standalone que só é construído no flavor `root` (`evdev_reader/Android.mk:9`, `app/build.gradle:27-46`) e lê `/dev/input/*` com EVIOCGRAB, enviando pacotes evdev crus por socket TCP local. `Application.mk:4-7` fixa APP_PLATFORM android-21 e habilita páginas de 16KB. A superfície da API é a classe `com.limelight.nvstream.jni.MoonBridge` (426 linhas): 34 métodos `native` (`MoonBridge.java:343-425`) mais 21 métodos estáticos `bridge*` que o C chama de volta via `GetStaticMethodID` cacheado em `MoonBridge_init` (`callbacks.c:81-105`). O `System.loadLibrary("moonlight-core")` + `init()` acontecem no bloco estático `MoonBridge.java:131-134`. Threads nativas (InputSend, ControlRecv, AsyncCallback, VideoDepacketizer) se anexam à JVM sob demanda via `GetThreadEnv()` (`callbacks.c:55-78`) usando uma TLS key com destrutor que faz `DetachCurrentThread`. Para o eixo de TECLADO: a API tem duas rotas distintas e independentes. (1) Rota de scancode: `MoonBridge.sendKeyboardInput(short keyMap, byte keyDirection, byte modifier, byte flags)` → `LiSendKeyboardEvent2()` (`simplejni.c:111-114`, `InputStream.c:924-999`), que monta um `NV_KEYBOARD_PACKET` (magic 0x03 KEY_DOWN / 0x04 KEY_UP, `Input.h:22-30`) com VK codes Win32 no canal ENet `CTRL_CHANNEL_KEYBOARD` (0x02). O byte `flags` só carrega `SS_KBE_FLAG_NON_NORMALIZED` (0x01) e é zerado à força se o host não for Sunshine (`InputStream.c:986`). (2) Rota de texto: `MoonBridge.sendUtf8Text(String)` → `LiSendUtf8TextEvent(const char*, unsigned int)` (`simplejni.c:126-131`, `InputStream.c:1005-1034`), que monta um `NV_UNICODE_PACKET` com magic `UTF8_TEXT_EVENT_MAGIC` = 0x17 (`Input.h:32-37`) no canal `CTRL_CHANNEL_UTF8` (0x06). O ponto mais importante e contraintuitivo: apesar da API aceitar uma string inteira, a thread `inputSendThreadProc` REPARTE o payload em UM CODE POINT POR PACOTE antes de transmitir (`InputStream.c:592-651`), e ainda aplica um bloqueio prévio de ~50 ms + espera ativa por `isControlDataInTransit()` a cada chamada — ou seja, "texto em bloco" existe na API Java mas NÃO existe no fio. Não há negociação de suporte: diferente de touch/pen/controller-touch, que retornam `LI_ERR_UNSUPPORTED` quando `SunshineFeatureFlags` não anuncia a flag (`InputStream.c:1314,1363,1456,1510`), `LiSendUtf8TextEvent` não checa nada e envia sempre, para qualquer host. O fork do submódulo é `ClassicOldSong/moonlight-common-c` @ c999436 e adiciona as extensões Apollo: `LiSendExecServerCmd` (packet 0x3000) e `LiSendEmptyPayload` (`ControlStream.c:2054-2075`), além dos tipos Apollo 0x3001 (clipboard) e 0x3002 (file transfer nonce) declarados em `ControlStream.c:234-236`. O `InputStream.c` inteiro, incluindo todo o caminho UTF-8, é código upstream do cgutman sem modificações do fork.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`](../../app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java) | 426 | Fachada JNI única entre o app Java e o moonlight-common-c. Declara 34 métodos native (todas as chamadas Java→C) e 21 métodos estáticos bridge* que o C invoca de volta (C→Java). Também replica todas as constantes de Limelight.h que o Java precisa. |
| [`app/src/main/jni/moonlight-core/simplejni.c`](../../app/src/main/jni/moonlight-core/simplejni.c) | 271 | Implementação JNI de quase toda a API de input e utilitários. Praticamente wrappers 1:1 sem tratamento de erro — o valor de retorno int das funções Li* é DESCARTADO nos wrappers void (mouse, teclado, UTF-8). |
| [`app/src/main/jni/moonlight-core/callbacks.c`](../../app/src/main/jni/moonlight-core/callbacks.c) | 519 | Upcalls C→Java (video/audio/connection listener), decodificação Opus in-process e a implementação de startConnection que monta SERVER_INFORMATION/STREAM_CONFIGURATION. Também gerencia anexação de threads nativas à JVM. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c) | 1602 | Núcleo do envio de input. Fila bloqueante de PACKET_HOLDER, thread InputSend, batching de mouse/gamepad/pen, criptografia AES e — o mais relevante para teclado — a lógica de split do pacote UTF-8 em um code point por vez. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h) | 206 | Definições binárias (packed) de todos os pacotes de input do protocolo. Documenta os três namespaces de magic: NVIDIA (0x03..0x17), Sunshine (0x55xxxxxx) e Apollo (0x80000000). |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight.h) | 977 | Header público da API C. É a fonte de verdade de todas as constantes replicadas em MoonBridge.java e da documentação semântica de cada Li*. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c) | 2076 | Transporte ENet do control stream. Todo input pós-Gen5 trafega aqui encapsulado em packetTypes[IDX_INPUT_DATA]. Contém o teto real de tamanho de payload de qualquer pacote de input. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight-internal.h`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight-internal.h) | 155 | Globais internos e mapeamento de canais ENet. Define IS_SUNSHINE() e APP_VERSION_AT_LEAST(), os dois discriminadores de host usados em todo o código. |
| [`app/src/main/jni/moonlight-core/Android.mk`](../../app/src/main/jni/moonlight-core/Android.mk) | 65 | Build ndk-build do módulo moonlight-core: lista explícita de fontes (RecorderCallbacks.c está AUSENTE de propósito), includes, flags e libs estáticas. |
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4349 | Consumidor principal da API de teclado. Contém as duas rotas (scancode e UTF-8), a fila de chunking de commitText do fork e o backgroundPing que usa sendEmptyPayload. |
| [`app/src/main/java/com/limelight/nvstream/NvConnection.java`](../../app/src/main/java/com/limelight/nvstream/NvConnection.java) | 629 | Camada fina sobre MoonBridge que só adiciona o guard isMonkey. Nenhum tratamento de erro é adicionado aqui. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/FakeCallbacks.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/FakeCallbacks.c) | 151 | Preenche callbacks nulos com no-ops. É por causa deste arquivo que a ausência de setAdaptiveTriggers em callbacks.c não quebra o build nem crasha — apenas silencia a feature. |
| [`app/src/main/jni/evdev_reader/evdev_reader.c`](../../app/src/main/jni/evdev_reader/evdev_reader.c) | 411 | Executável root-only que faz grab exclusivo de teclado/mouse via evdev e streama os eventos crus por socket TCP em 127.0.0.1. Só entra no APK do flavor root (maxSdk 25). |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/Misc.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Misc.c) | 154 | Utilitários e os inicializadores Li*. Expõe LiGetHostFeatureFlags, que NÃO tem binding em MoonBridge. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/Connection.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/Connection.c) | 541 | Máquina de estados de conexão (stages), globais compartilhados e LiStartConnection. Define o corever enviado no /launch. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c) | 1419 | Handshake RTSP. É aqui que SunshineFeatureFlags é populado a partir do SDP, definindo o que o host anuncia como suportado. |
| [`app/src/main/jni/moonlight-core/minisdl.c`](../../app/src/main/jni/moonlight-core/minisdl.c) | 106 | Trecho isolado do SDL_joystick.c para identificar Xbox Elite / Series X / DualSense Edge por VID:PID. Suporta guessControllerHasPaddles/HasShareButton. |
| [`app/src/main/jni/Application.mk`](../../app/src/main/jni/Application.mk) | 8 | Configuração global do ndk-build: plataforma mínima e suporte a páginas de 16KB. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`**
- `static { System.loadLibrary("moonlight-core"); init(); } :131-134`
- `SS_KBE_FLAG_NON_NORMALIZED = 0x01 :77`
- `LI_ERR_UNSUPPORTED = -5501 :79`
- `startConnection(...19 params) :343-351`
- `sendKeyboardInput(short keyMap, byte keyDirection, byte modifier, byte flags) :390`
- `sendUtf8Text(String text) :396`
- `sendExecServerCmd(int cmdId) :357`
- `sendEmptyPayload() :359`
- `sendMouseMove/sendMousePosition/sendMouseMoveAsMousePosition :361-365`
- `sendMultiControllerInput :369-373`
- `sendTouchEvent :375-376`
- `sendPenEvent :378-380`
- `sendControllerArrivalEvent/TouchEvent/MotionEvent/BatteryEvent :382-388`
- `sendMouseHighResScroll/HScroll :392-394`
- `getStageName/findExternalAddressIP4/testClientConnectivity :398-406`
- `getPortFlagsFromStage/FromTerminationErrorCode/stringifyPortFlags :408-412`
- `getEstimatedRttInfo() (RTT<<32 | variance) :415`
- `getLaunchUrlQueryParameters() :417`
- `guessControllerType/HasPaddles/HasShareButton :419-423`
- `init() :425`
- `bridgeDrSubmitDecodeUnit(byte[],int,int,int,int,char,long,long) :219-229`
- `bridgeArPlaySample(short[]) :259-263`
- `bridgeClSetHdrMode(boolean, byte[]) :307-311`
- `bridgeClSetMotionEventState :319-323`
- `setupBridge/cleanupBridge :331-341`
- `AudioConfiguration(int) valida magic byte 0xCA :152-162`

**`app/src/main/jni/moonlight-core/simplejni.c`**
- `sendUtf8Text -> GetStringUTFChars + strlen + LiSendUtf8TextEvent :126-131`
- `sendKeyboardInput -> LiSendKeyboardEvent2(keyCode, keyAction, modifiers, flags) :111-114`
- `sendExecServerCmd -> LiSendExecServerCmd :18-22`
- `sendEmptyPayload -> LiSendEmptyPayload :24-27`
- `sendMouseMove/MousePosition/MoveAsMousePosition/MouseButton :13-44`
- `sendMultiControllerInput -> LiSendMultiControllerEvent :46-54`
- `sendTouchEvent -> LiSendTouchEvent :56-64`
- `sendPenEvent -> LiSendPenEvent :66-74`
- `sendControllerArrival/Touch/Motion/Battery :76-109`
- `sendMouseHighResScroll/HScroll :116-124`
- `stopConnection/interruptConnection :133-141`
- `getStageName/findExternalAddressIP4 :143-170`
- `testClientConnectivity :182-192`
- `stringifyPortFlags (buffer local 512B) :204-213`
- `getEstimatedRttInfo (retorna -1 em erro) :215-224`
- `getLaunchUrlQueryParameters :226-229`
- `guessControllerType (varre arrControllers) :231-260`

**`app/src/main/jni/moonlight-core/callbacks.c`**
- `GetThreadEnv() com pthread TLS + AttachCurrentThread :55-78`
- `DetachThread destrutor da TLS key :44-46`
- `MoonBridge_init cacheia jclass global e 21 jmethodID :81-105`
- `BridgeDrSetup aloca DecodedFrameBuffer de 32KB :107-124`
- `BridgeDrSubmitDecodeUnit (SetByteArrayRegion por frame) :146-201`
- `BridgeArInit + opus_multistream_decoder_create :203-230`
- `BridgeArDecodeAndPlaySample (GetPrimitiveArrayCritical) :254-279`
- `BridgeClSetHdrMode (NewByteArray sem DeleteLocalRef) :339-356`
- `BridgeClLogMessage -> __android_log_vprint tag moonlight-common-c :392-397`
- `BridgeVideoRendererCallbacks :399-405`
- `BridgeAudioRendererCallbacks (CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION) :407-414`
- `BridgeConnListenerCallbacks (SEM setAdaptiveTriggers) :416-429`
- `hasFastAes() via cpu-features :431-452`
- `startConnection -> LiStartConnection :454-520`
- `encryptionFlags = ENCFLG_AUDIO, promovido a ENCFLG_ALL se hasFastAes :482,497-500`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c`**
- `MAX_INPUT_PACKET_SIZE 128 :43`
- `MAX_QUEUED_INPUT_PACKETS 150 :46`
- `PACKET_HOLDER union (unicode é o último membro, abusado p/ dados variáveis) :66-93`
- `allocatePacketHolder(extraLength) :204-233`
- `encryptData (AES-GCM gen7+, AES-CBC antes) :160-193`
- `sendInputPacket :235-307`
- `inputSendThreadProc :322-661`
- `branch UTF8_TEXT_EVENT_MAGIC: flush + espera transit + PltSleepMs(50) :592-608`
- `loop de split por code point (1,2,3,4 bytes) :612-648`
- `LiSendKeyboardEvent2 (fixups de modifier só p/ GFE; flags zerado se !IS_SUNSHINE) :924-999`
- `LiSendKeyboardEvent (wrapper v1) :1001-1003`
- `LiSendUtf8TextEvent (canal CTRL_CHANNEL_UTF8, ENET_PACKET_FLAG_RELIABLE) :1005-1034`
- `gates LI_FF_PEN_TOUCH_EVENTS :1314,1363`
- `gates LI_FF_CONTROLLER_TOUCH_EVENTS :1456,1510`
- `startInputStream/stopInputStream :697-750`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/Input.h`**
- `NV_INPUT_HEADER {size BE32, magic LE32} :11-14`
- `KEY_DOWN_EVENT_MAGIC 0x03 / KEY_UP_EVENT_MAGIC 0x04 :22-23`
- `NV_KEYBOARD_PACKET {flags, keyCode, modifiers, zero2} :24-30`
- `UTF8_TEXT_EVENT_MAGIC 0x00000017 :32`
- `UTF8_TEXT_EVENT_MAX_COUNT 32 :33`
- `NV_UNICODE_PACKET {header, char text[32]} :34-37`
- `SS_HSCROLL_MAGIC 0x55000001 :120`
- `SS_TOUCH_MAGIC 0x55000002 / SS_PEN_MAGIC 0x55000003 :126,140`
- `SS_CONTROLLER_ARRIVAL/TOUCH/MOTION/BATTERY 0x55000004-07 :157-196`
- `AP_SERVER_CMD_MAGIC 0x80000000 (extensão Apollo) :198-203`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight.h`**
- `LiGetLaunchUrlQueryParameters :42`
- `STREAM_CONFIGURATION (width/height fixos na conexão) :44-103`
- `DECODE_UNIT (presentationTimeMs/hdrActive/colorspace NÃO expostos ao Java) :144-190`
- `CAPABILITY_* flags :242-278`
- `CONNECTION_LISTENER_CALLBACKS (inclui setAdaptiveTriggers) :482-496`
- `LiStartConnection :547-549`
- `LiSendExecServerCmd (extensão Apollo) :569`
- `LiSendEmptyPayload (workaround wifi sleep) :573`
- `LI_ERR_UNSUPPORTED -5501 :616`
- `LiSendTouchEvent + doc de LI_FF_PEN_TOUCH_EVENTS :618-664`
- `KEY_ACTION_DOWN 0x03 / KEY_ACTION_UP 0x04 / MODIFIER_* :700-705`
- `LiSendKeyboardEvent :706`
- `SS_KBE_FLAG_NON_NORMALIZED 0x01 + doc "Sunshine protocol extension" :708-712`
- `LiSendUtf8TextEvent (doc: 'queues an UTF-8 encoded text') :714-715`
- `LI_FF_PEN_TOUCH_EVENTS 0x01 / LI_FF_CONTROLLER_TOUCH_EVENTS 0x02 :971-972`
- `LiGetHostFeatureFlags :973`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c`**
- `NVCTL_ENET_PACKET_HEADER_V2 (4 bytes) :20-23`
- `NVCTL_ENCRYPTED_PACKET_HEADER + AES_GCM_TAG_LENGTH 16 :25-32`
- `IDX_EXEC_SERVER_CMD 12 / IDX_SET_CLIPBOARD 13 / IDX_FILE_TRANSFER_NONCE_REQUEST 14 :141-143`
- `packetTypesGen7Enc: 0x3000/0x3001/0x3002 Apollo, 0x5500-0x5503 Sunshine :221-238`
- `sendMessageEnet com char tempBuffer[256] :690-752`
- `LC_ASSERT(sizeof(*packet)+paylen < sizeof(tempBuffer)) — NO-OP em release :723`
- `memcpy(&packet[1], payload, paylen) :727`
- `canal forçado a 0 se !IS_SUNSHINE :763-765`
- `sendInputPacketOnControlStream :1660-1669`
- `flushInputOnControlStream :1672-1678`
- `isControlDataInTransit :1680-1690`
- `LiSendExecServerCmd (CTRL_CHANNEL_SERVERCTL) :2054-2064`
- `LiSendEmptyPayload (payload 0xAA55AA55, type 0x00) :2067-2075`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/Limelight-internal.h`**
- `extern uint32_t SunshineFeatureFlags :45`
- `CTRL_CHANNEL_KEYBOARD 0x02 :59`
- `CTRL_CHANNEL_UTF8 0x06 :63`
- `CTRL_CHANNEL_SERVERCTL 0x08 :64`
- `CTRL_CHANNEL_COUNT 0x30 :67`
- `APP_VERSION_AT_LEAST(a,b,c) :81-84`
- `IS_SUNSHINE() == (AppVersionQuad[3] < 0) :86`
- `ML_FF_FEC_STATUS / ML_FF_SESSION_ID_V1 :89-90`

**`app/src/main/jni/moonlight-core/Android.mk`**
- `LOCAL_MODULE := moonlight-core :9`
- `LOCAL_SRC_FILES (20 arquivos common-c + enet + reedsolomon + simplejni/callbacks/minisdl) :11-43`
- `LOCAL_CFLAGS -DHAS_SOCKLEN_T=1 -DLC_ANDROID -DHAVE_CLOCK_GETTIME=1 :50`
- `LOCAL_CFLAGS += -DLC_DEBUG apenas se NDK_DEBUG=1 :52-54`
- `LOCAL_STATIC_LIBRARIES := libopus libssl libcrypto cpufeatures :58`
- `-Wl,--exclude-libs,ALL :59`
- `import-module android/cpufeatures :65`

**`app/src/main/java/com/limelight/Game.java`**
- `UTF8_CHUNK_SIZE = 512 :313`
- `commitTextQueue (ArrayDeque) :314`
- `flushCommitTextQueue (1 chunk a cada 15ms) :317-331`
- `backgroundPing -> MoonBridge.sendEmptyPayload() a cada 20ms :333-338`
- `handleKeyDown: fallback UTF-8 por caractere :2093-2097`
- `sendKeyboardInput com SS_KBE_FLAG_NON_NORMALIZED :2108-2109, 2181-2182`
- `handleKeyMultiple -> conn.sendUtf8Text(event.getCharacters()) :2193-2208`
- `sendExecServerCmd :3981-3983`
- `handleCommitText :4290-4296`
- `handleDeleteSurroundingText (2 pacotes por backspace) :4299-4312`
- `enqueueCommitText (split UTF-8 sem cortar code point) :4314-4334`

**`app/src/main/java/com/limelight/nvstream/NvConnection.java`**
- `sendExecServerCmd :484-488`
- `sendKeyboardInput(short,byte,byte,byte) :537-541`
- `sendUtf8Text(String) :619-623`
- `findExternalAddressForMdns :625-627`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/FakeCallbacks.c`**
- `fakeClSetAdaptiveTriggers :42`
- `fakeClCallbacks.setAdaptiveTriggers :58`
- `fixupMissingCallbacks :61-150`
- `preenchimento de setAdaptiveTriggers :146-148`

**`app/src/main/jni/evdev_reader/evdev_reader.c`**
- `EVDEV_MAX_EVENT_SIZE 24 :22`
- `pollThreadFunc + EVIOCGRAB :80-175`
- `precheckDeviceForPolling (isMouse||isKeyboard) && !isGamepad :177-194`
- `startPollForDevice (sprintf/strcpy sem bound) :196-256`
- `enumerateDevices (re-enumera a cada 1s) :258-285`
- `connectSocket 127.0.0.1 + TCP_NODELAY :287-318`
- `UNGRAB_REQ 1 / REGRAB_REQ 2 :320-321`
- `main(argc,argv) sem validar argc :323-411`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/Misc.c`**
- `extractVersionQuadFromString :87-104`
- `isReferenceFrameInvalidationEnabled :122-125`
- `LiGetHostFeatureFlags -> SunshineFeatureFlags :151-153`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/Connection.c`**
- `globais AppVersionQuad/StreamConfig/SunshineFeatureFlags :14-38`
- `stageNames[STAGE_MAX] :41-54`
- `LiGetStageName :57-59`
- `LiStopConnection (desmontagem por stage) :69-144`
- `ClInternalConnectionTerminated (callback em thread separada) :158-180`
- `LiStartConnection :209-535`
- `LiGetLaunchUrlQueryParameters -> "&corever=1" :537-541`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c`**
- `parseSdpAttributeToUInt("x-ss-general.featureFlags", &SunshineFeatureFlags) :1131`
- `SunshineFeatureFlags = 0 quando o atributo não existe :1132`
- `parsing das flags de criptografia :1135+`

**`app/src/main/jni/moonlight-core/minisdl.c`**
- `SDL_IsJoystickXboxOneElite :27-38`
- `SDL_IsJoystickXboxSeriesX :40+`
- `SDL_IsJoystickDualSenseEdge`

**`app/src/main/jni/Application.mk`**
- `APP_PLATFORM := android-21 :4`
- `APP_SUPPORT_FLEXIBLE_PAGE_SIZES := true :7`

</details>

## Fluxo

FLUXO A — TECLA FÍSICA/VIRTUAL COM MAPEAMENTO VK (scancode): (1) `Game.handleKeyDown` recebe o KeyEvent do Android e chama `keyboardTranslator.translate()` (`Game.java:2083`). (2) Se traduziu, chama `conn.sendKeyboardInput(translated, KEY_DOWN, modifiers, hasNormalizedMapping ? 0 : SS_KBE_FLAG_NON_NORMALIZED)` (`Game.java:2108-2109`). (3) `NvConnection.sendKeyboardInput` (`NvConnection.java:537-541`) só filtra isMonkey e chama `MoonBridge.sendKeyboardInput` (`MoonBridge.java:390`). (4) JNI `Java_..._sendKeyboardInput` (`simplejni.c:111-114`) chama `LiSendKeyboardEvent2(keyCode, keyAction, modifiers, flags)` e DESCARTA o retorno. (5) `LiSendKeyboardEvent2` (`InputStream.c:924-999`) recusa com -2 se `!initialized`; aplica fixups de modifier de VK_LWIN/LSHIFT/RSHIFT/LCTRL/RCTRL/LALT/RALT SOMENTE se `!IS_SUNSHINE()` (`InputStream.c:945-982`); zera o byte `flags` se `!IS_SUNSHINE()` (`InputStream.c:986`); monta `NV_KEYBOARD_PACKET` com `header.size = BE32(sizeof-4)`, `header.magic = LE32(keyAction)` (0x03 ou 0x04), `keyCode = LE16`; enfileira em `packetQueue` (canal `CTRL_CHANNEL_KEYBOARD` 0x02, `ENET_PACKET_FLAG_RELIABLE`). (6) `inputSendThreadProc` (`InputStream.c:342`) tira da fila; como o magic não bate com nenhum dos branches de batching, cai direto em `sendInputPacket(holder, LbqGetItemCount>0)` (`InputStream.c:655`). (7) `sendInputPacket` (`InputStream.c:235-307`): se `encryptedControlStream` (GFE≥7.1.431 e todo Sunshine/Apollo), manda o pacote em texto claro para `sendInputPacketOnControlStream` (`ControlStream.c:1660`), que embrulha em `packetTypes[IDX_INPUT_DATA]` e chama `sendMessageEnet`. Senão, cifra localmente (AES-GCM/CBC) num buffer de `MAX_INPUT_PACKET_SIZE` 128 bytes. (8) `sendMessageEnet` (`ControlStream.c:690-841`) cria o pacote ENet, cifra o header V2 + payload dentro de `tempBuffer[256]` e faz `enet_peer_send` no canal pedido (canal forçado a 0 se `!IS_SUNSHINE()`), fazendo `enet_host_service` imediato quando `moreData==false`, com espera de até 10 ms por confirmação de envio.

FLUXO B — TEXTO UTF-8 (o caminho que interessa ao dono do fork): (1a) Rota IME/commitText: `Game.handleCommitText` (`Game.java:4290`) só age se `prefConfig.enableCommitText` (default FALSE, `PreferenceConfiguration.java:208`), chama `enqueueCommitText` (`Game.java:4314-4334`), que converte para UTF-8 real via `text.getBytes(StandardCharsets.UTF_8)`, fatia em chunks de 512 bytes sem cortar code point, e enfileira em `commitTextQueue`. O `flushCommitTextQueue` (`Game.java:317-331`) despacha UM chunk por vez com `postDelayed(15ms)`. (1b) Rota tecla sem VK: `Game.java:2093-2097` chama `conn.sendUtf8Text(""+(char)unicodeChar)` para um único caractere. (1c) Rota ACTION_MULTIPLE: `Game.handleKeyMultiple` chama `conn.sendUtf8Text(event.getCharacters())` (`Game.java:2206`). (2) `NvConnection.sendUtf8Text` (`NvConnection.java:619-623`) → `MoonBridge.sendUtf8Text(String)`. (3) JNI `Java_..._sendUtf8Text` (`simplejni.c:126-131`): `GetStringUTFChars` (que produz MODIFIED UTF-8 / CESU-8, não UTF-8 padrão) + `strlen()` para descobrir o tamanho + `LiSendUtf8TextEvent(utf8Text, strlen(utf8Text))`, retorno descartado, `ReleaseStringUTFChars`. (4) `LiSendUtf8TextEvent` (`InputStream.c:1005-1034`): `allocatePacketHolder(length)` faz `malloc(sizeof(PACKET_HOLDER) + length)` (`InputStream.c:210-216`), monta `header.size = BE32(4 + length)`, `header.magic = LE32(0x17)`, `memcpy` do texto em `packet.unicode.text` (que é declarado `char[32]` mas é o último membro da union justamente para ser transbordado dentro da alocação estendida — `InputStream.c:71-73`), canal `CTRL_CHANNEL_UTF8` 0x06, `ENET_PACKET_FLAG_RELIABLE`, enfileira em `packetQueue` (limite 150). (5) `inputSendThreadProc` detecta `magic == LE32(UTF8_TEXT_EVENT_MAGIC)` (`InputStream.c:593`) e entra no branch especial: (5a) `flushInputOnControlStream()` (`InputStream.c:602`); (5b) loop de espera enquanto `isControlDataInTransit()` com `PltSleepMs(10)` (`InputStream.c:603-605`); (5c) `PltSleepMs(50)` incondicional (`InputStream.c:608`) — comentado como workaround para o GFE não sincronizar eventos de teclado com UTF-8, mas aplicado a TODOS os hosts, inclusive Sunshine/Apollo/Vibeshine; (5d) loop `while (i < totalLength)` que lê o primeiro byte, deduz o comprimento do code point (1/2/3/4 bytes, `InputStream.c:614-634`), copia `splitPacket = *holder`, sobrescreve `size = BE32(4 + codePointLength)` e o texto com APENAS aquele code point, e chama `sendInputPacket(&splitPacket, i + 1 < totalLength)` (`InputStream.c:636-647`). O parâmetro `moreData` faz o ENet agrupar os pacotes no mesmo datagrama, mas cada code point continua sendo um pacote UTF8 separado no protocolo. (6) Mesmo transporte do fluxo A a partir daí.

FLUXO C — UPCALLS C→JAVA (vídeo): thread nativa do depacketizer chama `BridgeDrSubmitDecodeUnit` (`callbacks.c:146`) → `GetThreadEnv()` anexa a thread à JVM se necessário (`callbacks.c:55-78`) → cresce o `DecodedFrameBuffer` global se o frame não couber (`callbacks.c:151-154`) → percorre a `bufferList` copiando com `SetByteArrayRegion` (NALUs de parâmetro são submetidos separadamente, pic data é concatenado) → `CallStaticIntMethod(BridgeDrSubmitDecodeUnitMethod)` → `MoonBridge.bridgeDrSubmitDecodeUnit` (`MoonBridge.java:219`) → `videoRenderer.submitDecodeUnit(...)`.

FLUXO D — COMANDOS APOLLO: `GameMenu.java:280` → `Game.sendExecServerCmd(cmdId)` (`Game.java:3981`) → `NvConnection` (`NvConnection.java:484`) → `MoonBridge.sendExecServerCmd` → `simplejni.c:18-22` → `LiSendExecServerCmd` (`ControlStream.c:2054-2064`), que NÃO passa pela fila de input: manda direto `sendMessageAndForget(packetTypes[IDX_EXEC_SERVER_CMD]=0x3000, 4 bytes, CTRL_CHANNEL_SERVERCTL)`. O `AP_SERVER_CMD_PACKET` declarado em `Input.h:198-203` está órfão (não é usado por esse caminho). Paralelamente, `Game.backgroundPing` (`Game.java:333-338`) chama `MoonBridge.sendEmptyPayload()` a cada 20 ms enquanto conectado → `LiSendEmptyPayload` (`ControlStream.c:2067-2075`) manda type 0x00 com payload 0xAA55AA55.

NEGOCIAÇÃO DE CAPACIDADES: durante o handshake RTSP, `RtspConnection.c:1131` extrai `x-ss-general.featureFlags` do SDP para `SunshineFeatureFlags` (0 se ausente). Esse valor gateia touch/pen (`InputStream.c:1314,1363`) e controller touch/motion (`InputStream.c:1456,1510`), retornando `LI_ERR_UNSUPPORTED` (-5501). O UTF-8 e o teclado NÃO consultam essa flag em momento algum.

## Interfaces externas

- JNI (jni.h) — JNI_VERSION_1_4, GetJavaVM/FindClass/NewGlobalRef/GetStaticMethodID (callbacks.c:81-105), AttachCurrentThread + pthread TLS com destrutor (callbacks.c:44-78), GetStringUTFChars/ReleaseStringUTFChars (simplejni.c:128,130), GetByteArrayElements (callbacks.c:487-493), SetByteArrayRegion (callbacks.c:166,182), GetPrimitiveArrayCritical (callbacks.c:257)
- android/log.h — __android_log_print e __android_log_vprint; tags 'moonlight-common-c' (callbacks.c:395, simplejni.c:162) e 'EvdevReader' (evdev_reader.c:86)
- cpu-features do NDK (import-module android/cpufeatures, Android.mk:58,65) — android_getCpuCount/getCpuFamily/getCpuFeatures para detectar AES-NI/ARM-AES e decidir ENCFLG_ALL (callbacks.c:431-452)
- libopus (opus_multistream.h) — .a pré-compilado por ABI (libopus/Android.mk:4-7); opus_multistream_decoder_create/decode/destroy (callbacks.c:214,259,247)
- OpenSSL libssl+libcrypto estáticos (openssl/Android.mk) — usados por PlatformCrypto.c para AES-GCM (gen7+) e AES-CBC (legado); build script em build-openssl.sh com no-shared no-ssl3 no-stdio no-engine no-hw
- ENet (submódulo moonlight-common-c/enet) — transporte confiável/não-confiável do control stream sobre UDP; 0x30 canais (Limelight-internal.h:57-67); enet_peer_send/enet_host_service/enet_packet_create (ControlStream.c:706,768,773)
- Reed-Solomon (moonlight-common-c/reedsolomon/rs.c) — FEC do stream de vídeo
- Protocolo NVIDIA GameStream — RTSP (SdpGenerator.c/RtspConnection.c/RtspParser.c), control stream ENet, RTP de vídeo/áudio; magics de input 0x03..0x17 (Input.h)
- Extensões Sunshine — magics de input 0x55000001..0x55000007 (Input.h:120-196), tipos de control stream 0x5500-0x5503 (ControlStream.c:231-237), SDP attribute x-ss-general.featureFlags (RtspConnection.c:1131), SS_KBE_FLAG_NON_NORMALIZED (Limelight.h:711); detecção via IS_SUNSHINE() = AppVersionQuad[3] < 0 (Limelight-internal.h:86)
- Extensões Apollo — control stream 0x3000 (Execute Server Command), 0x3001 (Set Clipboard), 0x3002 (File transfer nonce request) (ControlStream.c:234-236); AP_SERVER_CMD_MAGIC 0x80000000 (Input.h:198)
- STUN (SimpleStun.c) — LiFindExternalAddressIP4 exposto como MoonBridge.findExternalAddressIP4 (simplejni.c:148-170)
- Sockets POSIX / arpa/inet — inet_ntop (simplejni.c:160), TCP legado na porta 35043 para GFE < gen5 (InputStream.c:702)
- Linux evdev (linux/input.h) — EVIOCGRAB, EVIOCGBIT(EV_REL/EV_KEY), poll(), leitura de /dev/input/event* (evdev_reader.c) — apenas no flavor root
- ndk-build (Android.mk / Application.mk) — NDK 27.0.12077973, APP_PLATFORM android-21, APP_SUPPORT_FLEXIBLE_PAGE_SIZES (16KB pages)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🔴 crítico | security | Buffer de 256 bytes no caminho de criptografia do control stream é uma armadilha de stack smash para qualquer tentativa de enviar texto em bloco | `app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c:704` |
| 🟠 alto | bug | sendUtf8Text envia Modified UTF-8 (CESU-8), não UTF-8 real — emoji e caracteres do plano suplementar chegam corrompidos ou são descartados | `app/src/main/jni/moonlight-core/simplejni.c:126-131` |
| 🟠 alto | tech-debt | O 'texto em bloco' não existe no fio: moonlight-common-c fragmenta todo pacote UTF-8 em um code point por pacote | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:610-648` |
| 🟠 alto | performance | Penalidade fixa de ~50 ms + espera por ACK em CADA pacote UTF-8, inclusive em hosts Sunshine/Apollo onde o workaround não se aplica | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:598-608` |
| 🟡 médio | bug | strlen() sobre o resultado de GetStringUTFChars, e ausência de checagem de NULL | `app/src/main/jni/moonlight-core/simplejni.c:128-130` |
| 🟡 médio | bug | Todos os wrappers JNI de input descartam o código de erro retornado pelas funções Li* | `app/src/main/jni/moonlight-core/simplejni.c:112-131` |
| 🟡 médio | bug | O loop de backspace de handleDeleteSurroundingText pode estourar silenciosamente a fila de input | `app/src/main/java/com/limelight/Game.java:4304-4310` |
| 🟡 médio | tech-debt | O callback setAdaptiveTriggers da DualSense não é bridgeado — a extensão de protocolo existe no C mas morre num no-op | `app/src/main/jni/moonlight-core/callbacks.c:416-429` |
| 🟡 médio | maintainability | LiGetHostFeatureFlags() não tem binding — o Java não consegue consultar as capacidades do host sem tentar e falhar | `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java:343-425` |
| 🟡 médio | performance | Vazamento de referências locais JNI em callbacks executados por threads nativas anexadas de longa duração | `app/src/main/jni/moonlight-core/callbacks.c:347-348` |
| 🟡 médio | performance | Cada frame de vídeo é copiado byte a byte do buffer nativo para um byte[] Java | `app/src/main/jni/moonlight-core/callbacks.c:146-201` |
| 🟡 médio | security | Bibliotecas estáticas pré-compiladas versionadas no repo, sem proveniência reprodutível e com API level inconsistente | `app/src/main/jni/moonlight-core/Build.txt:1` |
| 🟡 médio | ux | Não existe API para trocar a resolução do stream em sessão — a feature de 'empurrar a tela' não tem apoio nativo | `app/src/main/jni/moonlight-core/callbacks.c:472-485` |
| ⚪ baixo | tech-debt | Campos presentationTimeMs, hdrActive e colorspace do DECODE_UNIT nunca chegam ao Java | `app/src/main/jni/moonlight-core/callbacks.c:88` |
| ⚪ baixo | bug | getEstimatedRttInfo usa -1 como sentinela de erro, valor que colide com um resultado válido | `app/src/main/jni/moonlight-core/simplejni.c:215-224` |
| ⚪ baixo | maintainability | init() é idempotente-inseguro: chamadas repetidas vazariam a referência global da classe | `app/src/main/jni/moonlight-core/callbacks.c:81-105` |
| ⚪ baixo | security | evdev_reader usa sprintf e strcpy sem limite sobre nomes vindos de readdir | `app/src/main/jni/evdev_reader/evdev_reader.c:216` |

### Detalhe

#### 🔴 crítico Buffer de 256 bytes no caminho de criptografia do control stream é uma armadilha de stack smash para qualquer tentativa de enviar texto em bloco

**Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c:704` · **Categoria:** security

`sendMessageEnet` monta o pacote em claro dentro de `char tempBuffer[256]` na pilha e faz `memcpy(&packet[1], payload, paylen)` em ControlStream.c:727. A única proteção é `LC_ASSERT(sizeof(*packet) + paylen < sizeof(tempBuffer))` em ControlStream.c:723 — e `LC_ASSERT` expande para `assert()` (Platform.h:96), que é anulado por NDEBUG em release, já que `-DLC_DEBUG` só é passado quando `NDK_DEBUG=1` (Android.mk:52-54). Hoje isso nunca dispara porque o splitter por code point garante paylen <= 12, mas é exatamente o código que alguém vai remover ao implementar 'mandar o texto inteiro num pacote'. Com `NVCTL_ENET_PACKET_HEADER_V2` de 4 bytes, o teto seguro é paylen <= 251, ou seja `PACKET_SIZE(holder) <= 251` → texto UTF-8 <= 243 bytes. No caminho legado não-encriptado (GFE < 7.1.431), o teto é ainda menor: `MAX_INPUT_PACKET_SIZE` = 128 (InputStream.c:43, buffer em InputStream.c:254).

**Correção sugerida:** Antes de qualquer feature de 'texto em bloco': (1) aumentar `tempBuffer` para o tamanho máximo real de pacote ou alocar dinamicamente; (2) trocar o LC_ASSERT por uma checagem de runtime que retorna false e loga; (3) adicionar validação de tamanho em LiSendUtf8TextEvent (InputStream.c:1005) rejeitando payloads acima do teto negociado. Documentar o teto de 243 bytes/pacote em qualquer design de extensão de protocolo.

#### 🟠 alto sendUtf8Text envia Modified UTF-8 (CESU-8), não UTF-8 real — emoji e caracteres do plano suplementar chegam corrompidos ou são descartados

**Local:** `app/src/main/jni/moonlight-core/simplejni.c:126-131` · **Categoria:** bug

`GetStringUTFChars` NÃO retorna UTF-8 padrão: retorna Modified UTF-8 (CESU-8), no qual (a) U+0000 é codificado como 0xC0 0x80 (overlong, inválido em UTF-8) e (b) qualquer code point acima de U+FFFF é codificado como o PAR DE SURROGATES UTF-16, cada surrogate virando uma sequência de 3 bytes 0xED 0xA0-0xBF 0x80-0xBF (6 bytes no total). O splitter em InputStream.c:612-648 lê o primeiro byte 0xED, classifica como 'code point de 3 bytes' e envia um surrogate SOLTO como se fosse um code point válido. O host recebe duas sequências UTF-8 inválidas em pacotes separados e não tem como remontar o caractere original. Resultado prático: emoji e ideogramas fora do BMP nunca funcionam no campo de texto, e o comportamento parece aleatório dependendo do IME. Nota: o Java já faz a conversão CORRETA em Game.java:4318 (`text.getBytes(StandardCharsets.UTF_8)`) apenas para calcular o chunking — e depois joga fora esses bytes e passa a String de volta para o JNI, que refaz a conversão errada.

**Correção sugerida:** Mudar a assinatura JNI para receber os bytes já convertidos: `public static native void sendUtf8Text(byte[] utf8Text, int length)` em MoonBridge.java:396, e no C usar `GetByteArrayElements` + `LiSendUtf8TextEvent((const char*)buf, length)`. Isso elimina a conversão CESU-8, elimina o `strlen()` e permite reaproveitar o array de bytes que Game.enqueueCommitText já produz (Game.java:4318). Alternativa menos invasiva: manter a String mas usar `GetStringChars` (UTF-16) e converter UTF-16→UTF-8 manualmente no C.

#### 🟠 alto O 'texto em bloco' não existe no fio: moonlight-common-c fragmenta todo pacote UTF-8 em um code point por pacote

**Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:610-648` · **Categoria:** tech-debt

A API `LiSendUtf8TextEvent(text, length)` aceita uma string arbitrária, mas a thread de envio a desmonta: para cada code point ela copia o holder, reescreve `header.size` para `4 + codePointLength` e envia um pacote UTF8_TEXT separado (InputStream.c:636-647). O comentário em InputStream.c:610-611 explica o motivo ('never straddle a packet boundary (which will cause a parsing error on the host)'). Consequência para o objetivo do fork: mesmo mudando a UI para um campo de texto que envia tudo de uma vez, o cliente continua produzindo N pacotes ENet confiáveis para N caracteres. O ganho de 'digitar e enviar inteiro' hoje é apenas de UX (não passar pelo IME por caractere) — não é ganho de protocolo. Isso é código upstream do cgutman, não uma modificação do ClassicOldSong (verificado via `git log -- src/InputStream.c` no submódulo).

**Correção sugerida:** Para ganho real de latência é preciso uma extensão de protocolo bilateral (cliente + host Apollo/Vibeshine): novo magic no namespace Apollo carregando até ~240 bytes de UTF-8 por pacote, anunciado por uma nova flag em `x-ss-general.featureFlags` (RtspConnection.c:1131), com fallback para o caminho por code point quando a flag estiver ausente. Enquanto isso não existe, ajustar expectativa: a feature é de UX, não de throughput.

#### 🟠 alto Penalidade fixa de ~50 ms + espera por ACK em CADA pacote UTF-8, inclusive em hosts Sunshine/Apollo onde o workaround não se aplica

**Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:598-608` · **Categoria:** performance

Antes de enviar qualquer texto, a thread faz `flushInputOnControlStream()`, depois um busy-wait de 10 em 10 ms enquanto `isControlDataInTransit()`, e por fim um `PltSleepMs(50)` incondicional. O comentário (InputStream.c:598-601) diz explicitamente que é um HACK para o GFE, que não sincroniza eventos de teclado com eventos UTF-8. Não há guard `IS_SUNSHINE()` — o mesmo custo é pago no Vibeshine/Apollo. Impacto concreto: (a) cada caractere sem mapeamento VK digitado num teclado físico (Game.java:2095) custa >= 50 ms antes do primeiro byte sair; (b) um texto colado de 2 KB é fatiado em 4 chunks pelo Java (UTF8_CHUNK_SIZE=512, Game.java:313) e cada chunk é um holder → 4 x 50 ms só de sleep, mais 15 ms de postDelayed entre chunks (Game.java:328), mais um pacote confiável por code point com espera de até 10 ms por envio (ControlStream.c:776-790).

**Correção sugerida:** No submódulo ClassicOldSong/moonlight-common-c, envolver InputStream.c:602-608 em `if (!IS_SUNSHINE()) { ... }`. É a maior alavanca isolada de latência percebida de digitação e não requer mudança no host. Requer commit no fork do submódulo + bump do ponteiro de submódulo no repo Artemis.

#### 🟡 médio strlen() sobre o resultado de GetStringUTFChars, e ausência de checagem de NULL

**Local:** `app/src/main/jni/moonlight-core/simplejni.c:128-130` · **Categoria:** bug

Dois problemas na mesma linha. (1) `GetStringUTFChars` pode retornar NULL quando a JVM não consegue alocar; `strlen(NULL)` é SIGSEGV imediato. Nenhum outro wrapper de string em simplejni.c (linhas 152, 185, 206) checa NULL também. (2) Usar `strlen` em vez do comprimento real significa que o comprimento é determinado pelo primeiro byte 0x00 — combinado com o CESU-8 isso não trunca (U+0000 vira 0xC0 0x80), mas é semântica frágil e impede enviar dados que legitimamente contenham NUL. A API C aceita um `length` explícito justamente para isso (Limelight.h:715).

**Correção sugerida:** Checar NULL e retornar cedo; e passar o comprimento explícito ao invés de derivar com strlen — o que é resolvido de graça migrando para a assinatura `byte[] + length` sugerida no achado do CESU-8.

#### 🟡 médio Todos os wrappers JNI de input descartam o código de erro retornado pelas funções Li*

**Local:** `app/src/main/jni/moonlight-core/simplejni.c:112-131` · **Categoria:** bug

`sendKeyboardInput` (simplejni.c:113), `sendUtf8Text` (simplejni.c:129), `sendMouseMove`, `sendMousePosition`, `sendMouseButton`, `sendMultiControllerInput`, `sendMouseHighResScroll/HScroll` são todos declarados `void` em MoonBridge.java e ignoram o `int` retornado. Esse int carrega informação real: -2 quando o input stream não está inicializado (InputStream.c:928-930, 1009-1011) e `LBQ_BOUND_EXCEEDED` quando a fila de 150 pacotes está cheia (InputStream.c:1026-1031, MAX_QUEUED_INPUT_PACKETS em InputStream.c:46). O Java nunca sabe que o texto foi perdido — o usuário digita e nada aparece, sem log no lado do app. Contraste: as APIs de touch/pen/controller retornam int corretamente (simplejni.c:56-109).

**Correção sugerida:** Mudar as declarações em MoonBridge.java:390,396 para `native int`, propagar o retorno em simplejni.c, e em Game.java tratar o erro (ao menos logar / re-enfileirar o chunk em flushCommitTextQueue, Game.java:317-331).

#### 🟡 médio O loop de backspace de handleDeleteSurroundingText pode estourar silenciosamente a fila de input

**Local:** `app/src/main/java/com/limelight/Game.java:4304-4310` · **Categoria:** bug

Para cada caractere apagado o código enfileira DOIS pacotes de teclado (KEY_DOWN + KEY_UP) num laço síncrono sem qualquer throttle. A fila nativa tem limite rígido de 150 (InputStream.c:46); ao ultrapassar, `LbqOfferQueueItem` retorna LBQ_BOUND_EXCEEDED, o holder é liberado e apenas um `Limelog("Input queue reached maximum size limit")` é emitido (InputStream.c:992-996) — e como o wrapper JNI é void, o Java nem toma conhecimento. Um IME que reporte `beforeLength` grande (ex.: selecionar e apagar um parágrafo) perde backspaces de forma invisível, deixando texto residual no host.

**Correção sugerida:** Limitar `beforeLength` a um teto (ex.: 32), enfileirar os backspaces no mesmo mecanismo de Handler usado por flushCommitTextQueue (Game.java:317-331) com espaçamento, e propagar o retorno de erro conforme o achado anterior.

#### 🟡 médio O callback setAdaptiveTriggers da DualSense não é bridgeado — a extensão de protocolo existe no C mas morre num no-op

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:416-429` · **Categoria:** tech-debt

O fork do moonlight-common-c implementa a extensão Sunshine de adaptive triggers: tipo de pacote 0x5503 (ControlStream.c:237), IDX_DS_ADAPTIVE_TRIGGERS (ControlStream.c:144), roteamento em ControlStream.c:1003 e 1080-1088, e o typedef `ConnListenerSetAdaptiveTriggers` no header público (Limelight.h:474-477, membro da struct em Limelight.h:495). Mas a struct `BridgeConnListenerCallbacks` em callbacks.c:416-429 não define `.setAdaptiveTriggers`, então o campo fica NULL e `fixupMissingCallbacks` (FakeCallbacks.c:146-148) o substitui pelo no-op `fakeClSetAdaptiveTriggers`. Não há crash, apenas a feature silenciosamente indisponível no Android. Não existe método `bridgeClSetAdaptiveTriggers` em MoonBridge.java nem callback correspondente em NvConnectionListener.

**Correção sugerida:** Adicionar `BridgeClSetAdaptiveTriggers` em callbacks.c (padrão idêntico a BridgeClSetControllerLED em callbacks.c:381-390, cuidando de copiar os arrays `left`/`right` de DS_EFFECT_PAYLOAD_SIZE=10 bytes para jbyteArray), registrar o jmethodID em MoonBridge_init (callbacks.c:104), declarar `bridgeClSetAdaptiveTriggers` em MoonBridge.java e propagar até ControllerHandler.

#### 🟡 médio LiGetHostFeatureFlags() não tem binding — o Java não consegue consultar as capacidades do host sem tentar e falhar

**Local:** `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java:343-425` · **Categoria:** maintainability

`LiGetHostFeatureFlags()` existe e retorna `SunshineFeatureFlags` (Misc.c:151-153, declarada em Limelight.h:973 com as constantes LI_FF_PEN_TOUCH_EVENTS=0x01 e LI_FF_CONTROLLER_TOUCH_EVENTS=0x02 em Limelight.h:971-972). Nenhum método native em MoonBridge a expõe, e as constantes LI_FF_* também não foram replicadas em MoonBridge.java (que replica dezenas de outras). Consequência: o app só descobre suporte a touch/pen chamando e recebendo LI_ERR_UNSUPPORTED (-5501), o que impede decisões de UI antecipadas (ex.: esconder botões, escolher modo trackpad vs touch nativo antes do primeiro toque).

**Correção sugerida:** Adicionar `public static native int getHostFeatureFlags();` em MoonBridge.java e o wrapper em simplejni.c (3 linhas, padrão de getPendingVideoFrames em simplejni.c:177-180), mais as constantes LI_FF_*.

#### 🟡 médio Vazamento de referências locais JNI em callbacks executados por threads nativas anexadas de longa duração

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:347-348` · **Categoria:** performance

`BridgeClSetHdrMode` cria um `jbyteArray` com `NewByteArray` a cada chamada e nunca chama `DeleteLocalRef`. Para código JNI normal isso é inofensivo porque o frame local é destruído no retorno ao Java — mas essas funções são invocadas por threads NATIVAS anexadas via `AttachCurrentThread` (callbacks.c:72) que nunca retornam à JVM; suas referências locais só são liberadas no `DetachCurrentThread` do destrutor da TLS (callbacks.c:44-46), ou seja, no fim da sessão de streaming. O mesmo padrão aparece nas referências locais de `NewByteArray`/`NewShortArray` que são promovidas a global e cujo local nunca é deletado: callbacks.c:121, callbacks.c:153 (caminho de crescimento do buffer, executado sempre que um frame maior chega) e callbacks.c:226. Não há nenhuma chamada a `DeleteLocalRef` em todo o arquivo. Severidade é média e não crítica porque setHdrMode é raro e o crescimento do buffer converge, mas em sessões longas com HDR alternando isso acumula e pode disparar o warning de local reference table overflow do ART.

**Correção sugerida:** Adicionar `(*env)->DeleteLocalRef(env, ...)` após cada NewByteArray/NewShortArray (imediatamente após o NewGlobalRef nos casos 121/153/226, e ao fim de BridgeClSetHdrMode no caso 347). Alternativamente envolver os corpos dos callbacks em Push/PopLocalFrame.

#### 🟡 médio Cada frame de vídeo é copiado byte a byte do buffer nativo para um byte[] Java

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:146-201` · **Categoria:** performance

`BridgeDrSubmitDecodeUnit` percorre a `bufferList` do DECODE_UNIT e faz `SetByteArrayRegion` (callbacks.c:166 e 182) para cada entrada, copiando o frame inteiro para o array Java `DecodedFrameBuffer` antes de chamar o renderer. Em 4K120 isso é uma cópia extra de vários MB/s por frame no caminho crítico de latência. O moonlight-common-c oferece o modelo pull (`CAPABILITY_PULL_RENDERER`, Limelight.h:265-269, APIs LiWaitForNextVideoFrame/LiCompleteVideoFrame em Limelight.h:925-929) que evita isso, mas não há binding para essas APIs em MoonBridge.

**Correção sugerida:** Substituir o byte[] por um `DirectByteBuffer` alocado com `NewDirectByteBuffer` sobre memória nativa, ou migrar para o modelo pull expondo LiWaitForNextVideoFrame/LiCompleteVideoFrame no MoonBridge. Medir antes: o custo pode ser aceitável em resoluções típicas.

#### 🟡 médio Bibliotecas estáticas pré-compiladas versionadas no repo, sem proveniência reprodutível e com API level inconsistente

**Local:** `app/src/main/jni/moonlight-core/Build.txt:1` · **Categoria:** security

O repo carrega ~24 MB de .a binários (openssl/{abi}/libcrypto.a + libssl.a e libopus/{abi}/libopus.a, 4 ABIs cada) cuja única documentação de origem é 'Static libraries were built from https://github.com/cgutman/moonlight-mobile-deps using AppVeyor CI' (Build.txt:1). Não há hash, versão do OpenSSL, nem data. Isso é um risco de supply chain e impede auditar CVEs do OpenSSL embarcado. Além disso, build-openssl.sh:8 e :18 configuram armeabi-v7a e x86 com `-D__ANDROID_API__=16` enquanto Application.mk:4 declara `APP_PLATFORM := android-21` — inconsistência que pode gerar símbolos/ABI divergentes. E como Application.mk:7 habilita `APP_SUPPORT_FLEXIBLE_PAGE_SIZES` (páginas de 16KB, requisito do Google Play a partir de 2025), é preciso confirmar que esses .a foram linkados com o alinhamento correto — não há evidência disso no repo.

**Correção sugerida:** Registrar no repo a versão exata e o SHA256 de cada .a; idealmente migrar para um passo de build reprodutível (script + versão pinada) ou para dependências pré-compiladas com procedência verificável. Validar o alinhamento de 16KB rodando `llvm-readelf -l` nas .so resultantes por ABI.

#### 🟡 médio Não existe API para trocar a resolução do stream em sessão — a feature de 'empurrar a tela' não tem apoio nativo

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:472-485` · **Categoria:** ux

`width` e `height` são fixados na STREAM_CONFIGURATION passada uma única vez a `LiStartConnection` (callbacks.c:472-485, Limelight.h:44-49). A varredura completa da API pública (todas as funções Li* em Limelight.h) não tem nada equivalente a um LiChangeResolution/LiResizeStream. Portanto, o comportamento AnyDesk desejado (redimensionar o conteúdo remoto quando o teclado virtual abre) NÃO pode ser implementado pela camada nativa: ou é resolvido puramente no lado cliente (ajustar o layout/escala da SurfaceView para o espaço restante, com o stream continuando na resolução original e possivelmente com letterbox), ou exige uma reconexão completa (LiStopConnection + novo /launch com a nova resolução + LiStartConnection), o que com o display virtual automático do Vibeshine é viável mas custa a interrupção do stream.

**Correção sugerida:** Tratar a feature #1 como puramente client-side (layout Android + adjustResize/WindowInsets sobre a SurfaceView) e NÃO tentar renegociar resolução. Se o objetivo for o pixel-perfect do AnyDesk, a única rota é reconexão — nesse caso avaliar uma extensão de protocolo Apollo de 'resize dinâmico' como EPIC separado, que exigiria mudanças no host.

#### ⚪ baixo Campos presentationTimeMs, hdrActive e colorspace do DECODE_UNIT nunca chegam ao Java

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:88` · **Categoria:** tech-debt

A assinatura registrada é `bridgeDrSubmitDecodeUnit([BIIIICJJ)I` (callbacks.c:88) e a chamada em callbacks.c:168-171/189-192 passa apenas data, length, bufferType, frameNumber, frameType, frameHostProcessingLatency, receiveTimeMs e enqueueTimeMs. O DECODE_UNIT também carrega `presentationTimeMs` (Limelight.h:171, útil para frame pacing e descarte de frames velhos), `hdrActive` (Limelight.h:183) e `colorspace` (Limelight.h:189). O renderer Java precisa inferir ou ignorar essas informações.

**Correção sugerida:** Estender a assinatura para `([BIIIICJJIZB)I` passando os três campos e atualizar MoonBridge.bridgeDrSubmitDecodeUnit (MoonBridge.java:219) e a interface VideoDecoderRenderer. Mudança mecânica mas toca todos os renderers.

#### ⚪ baixo getEstimatedRttInfo usa -1 como sentinela de erro, valor que colide com um resultado válido

**Local:** `app/src/main/jni/moonlight-core/simplejni.c:215-224` · **Categoria:** bug

Quando `LiGetEstimatedRttInfo` falha, o wrapper retorna -1 (simplejni.c:220). Mas o valor de sucesso é `((uint64_t)rtt << 32) | variance`, e rtt=0xFFFFFFFF com variance=0xFFFFFFFF produz exatamente -1 em jlong. É um caso degenerado improvável, mas o contrato documentado em MoonBridge.java:414 ('RTT is in the top 32 bits') não menciona o sentinela.

**Correção sugerida:** Documentar o sentinela no comentário de MoonBridge.java:414 ou trocar por um método que retorne long[] / use um out-param booleano.

#### ⚪ baixo init() é idempotente-inseguro: chamadas repetidas vazariam a referência global da classe

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:81-105` · **Categoria:** maintainability

`MoonBridge_init` faz `GlobalBridgeClass = NewGlobalRef(FindClass(...))` (callbacks.c:83) sem verificar se já foi inicializado nem deletar uma referência anterior. Hoje é seguro porque só é chamado do bloco estático da classe (MoonBridge.java:131-134), que a JVM executa uma vez, mas o método é `public static native void init()` (MoonBridge.java:425) — qualquer chamador externo vaza a global ref. Além disso, o local ref do FindClass não é deletado.

**Correção sugerida:** Tornar o método privado em MoonBridge.java e/ou adicionar um guard `if (GlobalBridgeClass != NULL) return;` no início de callbacks.c:81.

#### ⚪ baixo evdev_reader usa sprintf e strcpy sem limite sobre nomes vindos de readdir

**Local:** `app/src/main/jni/evdev_reader/evdev_reader.c:216` · **Categoria:** security

`sprintf(fullPath, "/dev/input/%s", deviceName)` num buffer de 256 bytes (evdev_reader.c:198,216) e `strcpy(currentEntry->devName, deviceName)` num campo de 128 bytes (evdev_reader.c:34,232), ambos com `deviceName` vindo de `dirent->d_name` (evdev_reader.c:280). Em Linux NAME_MAX é 255, então um nome de dispositivo longo estoura o campo devName de 128 bytes. Também: `main` faz `atoi(argv[1])` sem validar argc (evdev_reader.c:331). Severidade baixa porque o binário só existe no flavor `root` (evdev_reader/Android.mk:9), roda com maxSdk 25 (app/build.gradle:31) e o conteúdo de /dev/input é controlado pelo kernel — mas é código que roda como root.

**Correção sugerida:** Trocar por `snprintf(fullPath, sizeof(fullPath), ...)` e `strncpy`/`snprintf` para devName, e validar `argc >= 2` antes de ler argv[1].


## Ideias de melhoria

### Corrigir a codificação de sendUtf8Text: trocar String por byte[] UTF-8 real

**Tamanho:** quick-win

**Por quê:** Resolve de uma vez três problemas: emoji/caracteres fora do BMP corrompidos (CESU-8), dependência de strlen, e a conversão duplicada (o Java já produz os bytes UTF-8 corretos em Game.java:4318 e os descarta). É a mudança de maior relação valor/risco para a feature de campo de texto.

**Como:** 1) MoonBridge.java:396 → `public static native int sendUtf8Text(byte[] utf8Text, int length);`. 2) simplejni.c:126-131 → usar `GetByteArrayElements`/`ReleaseByteArrayElements` (padrão já usado em callbacks.c:487-493) e retornar o int de LiSendUtf8TextEvent. 3) NvConnection.java:619-623 → aceitar byte[] ou converter com `text.getBytes(StandardCharsets.UTF_8)`. 4) Game.java:4314-4334 → passar diretamente o slice de bytes já calculado, eliminando o `new String(...)` intermediário da linha 4326. 5) Ajustar os 3 call sites: Game.java:325, 2095, 2206.

**Risco:** Baixo. Mudança de assinatura JNI: se o .so e o .java saírem de sync, dá UnsatisfiedLinkError no primeiro uso — garantir rebuild nativo completo. Sem impacto no protocolo do fio.

### Adicionar binding de LiGetHostFeatureFlags para o app conhecer as capacidades do host

**Tamanho:** quick-win

**Por quê:** Permite decisões de UI antecipadas (modo touch nativo vs trackpad, exibição de recursos) sem depender de tentar e receber LI_ERR_UNSUPPORTED, e serve de base para negociar futuras extensões de protocolo (como o canal de texto em bloco).

**Como:** Adicionar `public static native int getHostFeatureFlags();` em MoonBridge.java junto às constantes `LI_FF_PEN_TOUCH_EVENTS=0x01` e `LI_FF_CONTROLLER_TOUCH_EVENTS=0x02`; implementar em simplejni.c copiando o padrão de getPendingVideoFrames (simplejni.c:177-180) chamando LiGetHostFeatureFlags() (Misc.c:151).

**Risco:** Nenhum. Adição pura, sem alterar comportamento existente.

### Remover a penalidade de 50 ms do caminho UTF-8 em hosts Sunshine/Apollo

**Tamanho:** small

**Por quê:** É a maior alavanca isolada de latência percebida de digitação e não requer nenhuma mudança no host. O próprio comentário do upstream (InputStream.c:598-601) diz que o sleep é workaround exclusivo do GFE.

**Como:** No submódulo ClassicOldSong/moonlight-common-c, envolver InputStream.c:602-608 (`flushInputOnControlStream()` + loop `isControlDataInTransit()` + `PltSleepMs(50)`) em `if (!IS_SUNSHINE()) { ... }` — a macro já existe em Limelight-internal.h:86. Commitar no fork, atualizar o ponteiro do submódulo em app/src/main/jni/moonlight-core/moonlight-common-c e rebuildar.

**Risco:** Médio. O sleep também mascara qualquer race de ordenação entre pacotes de teclado (canal 0x02) e UTF-8 (canal 0x06), que são canais ENet DIFERENTES e portanto não têm ordenação garantida entre si. Testar cenário 'segurar Shift + digitar texto pelo IME'. Mitigação: em vez de remover, reduzir para 5-10 ms em Sunshine.

### Propagar códigos de erro dos wrappers JNI de input para o Java

**Tamanho:** small

**Por quê:** Hoje texto e teclas podem ser silenciosamente descartados quando a fila de 150 pacotes enche ou quando o stream não está inicializado, sem nenhum sinal para o app nem para o usuário. Torna a feature de campo de texto diagnosticável.

**Como:** Mudar MoonBridge.java:390 e :396 para `native int`; em simplejni.c:111-114 e :126-131 retornar o valor de LiSendKeyboardEvent2/LiSendUtf8TextEvent; em NvConnection.java:537,619 repassar; em Game.flushCommitTextQueue (Game.java:317-331) tratar falha re-enfileirando o chunk com backoff em vez de perdê-lo.

**Risco:** Baixo. Mudança de assinatura JNI exige rebuild nativo (mesmo cuidado do item anterior).

### Documentar formalmente o contrato do teclado/UTF-8 num arquivo de referência do repo

**Tamanho:** small

**Por quê:** O comportamento de 'a API aceita string inteira mas o fio envia code point a code point, com 50 ms de penalidade e sem negociação de suporte' não está documentado em lugar nenhum e é a fonte mais provável de retrabalho para qualquer agente ou contribuidor futuro que ataque a feature de teclado.

**Como:** Criar docs/ (ou CLAUDE.md) com uma seção 'Input path: keyboard & text' listando: os dois fluxos (scancode via CTRL_CHANNEL_KEYBOARD 0x02 vs texto via CTRL_CHANNEL_UTF8 0x06), a tabela de magics (Input.h), os tetos de payload (243 bytes control stream encriptado / 128 bytes legado), o comportamento de split (InputStream.c:610-648), a ausência de negociação para UTF-8 e a semântica de SS_KBE_FLAG_NON_NORMALIZED (só vale para Sunshine, zerado em InputStream.c:986).

**Risco:** Nenhum. Documentação.

### Registrar proveniência e hashes das bibliotecas estáticas pré-compiladas

**Tamanho:** small

**Por quê:** 24 MB de binários opacos (OpenSSL e Opus) sem versão nem hash impedem auditar CVEs e validar o requisito de páginas de 16KB do Google Play, além de serem um vetor de supply chain.

**Como:** Expandir Build.txt (hoje uma linha, Build.txt:1) com: versão exata do OpenSSL e do Opus, commit do moonlight-mobile-deps usado, SHA256 de cada um dos 12 arquivos .a, e data do build. Adicionar um script de verificação de hash no CI. Alinhar o `-D__ANDROID_API__=16` de build-openssl.sh:8,18 com o `APP_PLATFORM := android-21` de Application.mk:4. Validar alinhamento de 16KB nas .so finais com llvm-readelf.

**Risco:** Baixo. Se a validação revelar que as .a não suportam 16KB pages, vira um trabalho maior de rebuild das dependências.

### Bridgear o callback setAdaptiveTriggers da DualSense

**Tamanho:** medium

**Por quê:** A extensão de protocolo já está implementada e roteada no C do fork (ControlStream.c:144, 237, 1003, 1080-1088) mas morre num no-op por falta de 12 linhas de cola. É feature paga e não entregue.

**Como:** Em callbacks.c: criar `BridgeClSetAdaptiveTriggers(uint16_t, uint8_t, uint8_t, uint8_t, uint8_t*, uint8_t*)` no molde de BridgeClSetControllerLED (callbacks.c:381-390), convertendo os dois arrays de DS_EFFECT_PAYLOAD_SIZE=10 bytes (Limelight.h:474) em jbyteArray e deletando os local refs; registrar o jmethodID em MoonBridge_init (callbacks.c:104); preencher `.setAdaptiveTriggers` em BridgeConnListenerCallbacks (callbacks.c:428); declarar `bridgeClSetAdaptiveTriggers` em MoonBridge.java (junto de bridgeClSetControllerLED, MoonBridge.java:325-329) e adicionar o método a NvConnectionListener; consumir em ControllerHandler.

**Risco:** Baixo-médio. Requer cuidado com local refs (ver achado de vazamento) e com o mapeamento dos efeitos para a API de vibração do Android, que não tem equivalente direto de adaptive trigger — pode acabar sendo apenas um stub logado.

### Adicionar bindings faltantes de APIs Li* já disponíveis no C

**Tamanho:** medium

**Por quê:** Várias APIs úteis estão compiladas na .so mas inacessíveis ao Java, o que leva a workarounds no lado Java. Expor é barato e desbloqueia melhorias futuras.

**Como:** Adicionar wrappers em simplejni.c + declarações em MoonBridge.java para: LiRequestIdrFrame (Limelight.h:968, útil para recuperação de corrupção), LiGetPendingAudioFrames (Limelight.h:859), LiGetCurrentHostDisplayHdrMode (Limelight.h:933), LiGetMillis (Limelight.h:844, para alinhar timestamps de latência com receiveTimeMs/enqueueTimeMs), LiGetProtocolFromPortFlagIndex/LiGetPortFromPortFlagIndex (Limelight.h:894,897). Cada um é um wrapper de 3-4 linhas no padrão de simplejni.c:172-202.

**Risco:** Baixo. Adições puras. Manter a ordem de declaração em MoonBridge.java coerente para facilitar diff com o upstream moonlight-android.

### Eliminar a cópia por frame no caminho de vídeo (DirectByteBuffer ou modelo pull)

**Tamanho:** large

**Por quê:** BridgeDrSubmitDecodeUnit copia o frame inteiro para um byte[] Java a cada frame (callbacks.c:166,182). Em 4K120 é uma cópia de vários MB/s no caminho crítico de latência.

**Como:** Opção A (menor risco): trocar DecodedFrameBuffer por memória nativa exposta via `NewDirectByteBuffer`, mudando a assinatura de bridgeDrSubmitDecodeUnit (callbacks.c:88, MoonBridge.java:219) e todos os VideoDecoderRenderer. Opção B (maior ganho, maior risco): migrar para CAPABILITY_PULL_RENDERER (Limelight.h:269) expondo LiWaitForNextVideoFrame/LiCompleteVideoFrame (Limelight.h:925-929) e reescrevendo o loop de decodificação no Java. Medir com Perfetto antes de decidir.

**Risco:** Alto. Toca o caminho crítico de vídeo e todos os renderers; regressões aqui são visíveis imediatamente como stutter ou corrupção. Requer teste em múltiplos SoCs.

### EPIC — Canal de texto em bloco: extensão de protocolo Apollo para enviar até ~240 bytes de UTF-8 por pacote

**Tamanho:** epic

**Por quê:** É a única forma de tornar o 'envia o texto inteiro' real no fio, em vez de um pacote confiável por code point com espera de ACK (InputStream.c:610-648, ControlStream.c:776-790). Combina com o campo de texto da UI para reproduzir a experiência do AnyDesk. Requer trabalho coordenado cliente+host.

**Como:** CLIENTE: (1) definir novo magic no namespace Apollo em Input.h (o namespace 0x8000xxxx já é usado por AP_SERVER_CMD_MAGIC em Input.h:198) com struct de texto de tamanho variável; (2) definir nova flag LI_FF_BULK_TEXT em Limelight.h:971 e lê-la de `x-ss-general.featureFlags` (RtspConnection.c:1131 já popula SunshineFeatureFlags); (3) em LiSendUtf8TextEvent (InputStream.c:1005) escolher o magic novo quando a flag estiver presente; (4) no inputSendThreadProc (InputStream.c:593) adicionar branch que envia o payload inteiro sem split e SEM o sleep de 50 ms; (5) fatiar em pedaços de no máximo 243 bytes respeitando fronteiras de code point (o teto vem de tempBuffer[256] em ControlStream.c:704 menos 4 bytes de header V2 menos 8 de NV_INPUT_HEADER); (6) ANTES de tudo, corrigir o tempBuffer conforme o achado crítico. HOST (Vibeshine/Apollo): implementar o parser do novo magic e anunciar a flag no SDP. FALLBACK: se a flag ausente, usar o caminho por code point de hoje.

**Risco:** Alto. Exige mudanças em três repos (Artemis, fork do moonlight-common-c, host Vibeshine) e um contrato de versão. O risco de segurança é concreto: qualquer erro de bounds no novo caminho é um stack smash em release (LC_ASSERT é no-op, Platform.h:83-96). Exige fuzzing do parser no host e teste com payloads no limite.


## Glossário

- MoonBridge: classe Java (com.limelight.nvstream.jni.MoonBridge) que é a ÚNICA fronteira JNI do app. 34 métodos `native` para Java→C e 21 métodos estáticos `bridge*` para C→Java. Se um dado cruza a fronteira nativa, passa por aqui.
- moonlight-common-c: submódulo git em app/src/main/jni/moonlight-core/moonlight-common-c, apontando para o fork ClassicOldSong/moonlight-common-c @ c999436 (não o upstream cgutman). Implementa todo o protocolo GameStream: RTSP, control stream ENet, input, depacketização de vídeo/áudio.
- Li* (LiSendKeyboardEvent2, LiSendUtf8TextEvent, ...): prefixo de todas as funções públicas do moonlight-common-c, declaradas em Limelight.h. 'Li' vem de Limelight, o nome original do projeto Moonlight.
- IS_SUNSHINE(): macro em Limelight-internal.h:86 definida como `AppVersionQuad[3] < 0`. Sunshine e seus forks (Apollo, Vibeshine) reportam um quarto componente negativo no `appversion` do /serverinfo. É o discriminador usado em todo o código para habilitar extensões e desabilitar workarounds do GFE.
- SunshineFeatureFlags: uint32 global (Connection.c:35) extraído do atributo SDP `x-ss-general.featureFlags` no handshake RTSP (RtspConnection.c:1131), 0 se ausente. Gateia touch/pen (LI_FF_PEN_TOUCH_EVENTS 0x01) e controller touch/motion (LI_FF_CONTROLLER_TOUCH_EVENTS 0x02). NÃO gateia teclado nem UTF-8.
- SS_KBE_FLAG_NON_NORMALIZED (0x01): bit no campo `flags` do NV_KEYBOARD_PACKET (Input.h:26, Limelight.h:711) que diz ao host 'este keyCode NÃO foi normalizado para um scancode US-English; interprete como está'. É extensão Sunshine: LiSendKeyboardEvent2 força flags=0 quando !IS_SUNSHINE() (InputStream.c:986). No Artemis o valor vem de `keyboardTranslator.hasNormalizedMapping()` (Game.java:2109,2182).
- UTF8_TEXT_EVENT_MAGIC (0x00000017): magic do pacote de texto Unicode (Input.h:32). Está no namespace NVIDIA original (não em 0x55xxxxxx de Sunshine nem 0x8000xxxx de Apollo), o que indica que é feature de protocolo base — por isso LiSendUtf8TextEvent não negocia suporte com o host.
- UTF8_TEXT_EVENT_MAX_COUNT (32): tamanho declarado do array `text` em NV_UNICODE_PACKET (Input.h:33,36). É enganoso: NÃO é o limite real. O campo é o último membro da union PACKET_HOLDER de propósito, e allocatePacketHolder(length) sobre-aloca para permitir textos maiores (InputStream.c:71-73, 210-216). O limite REAL é o tempBuffer[256] de ControlStream.c:704.
- Code point splitting: comportamento em InputStream.c:610-648 onde um único LiSendUtf8TextEvent com N code points vira N pacotes UTF8_TEXT separados no fio, cada um com exatamente um code point. Feito para nunca cruzar fronteira de pacote (o host falharia no parse). É a razão pela qual 'enviar texto inteiro' não existe no protocolo hoje.
- Modified UTF-8 / CESU-8: o que GetStringUTFChars realmente retorna (simplejni.c:128). Difere de UTF-8 padrão em dois pontos: U+0000 vira 0xC0 0x80 (overlong) e code points acima de U+FFFF viram o par de surrogates UTF-16 codificado como duas sequências de 3 bytes. Causa raiz da corrupção de emoji no campo de texto.
- PACKET_HOLDER: struct em InputStream.c:66-93 que embrulha um pacote de input com sua entrada de fila, flags ENet e channelId. A union de payloads tem NV_UNICODE_PACKET como último membro justamente para permitir alocação estendida de tamanho variável.
- CTRL_CHANNEL_*: IDs de canal ENet (Limelight-internal.h:57-67). Teclado usa 0x02, texto UTF-8 usa 0x06, mouse 0x03, pen 0x04, touch 0x05, comandos Apollo 0x08, gamepads 0x10-0x1F, sensores 0x20-0x2F. Canais diferentes NÃO têm ordenação garantida entre si — relevante para a interação teclado↔texto. Em hosts GFE todos os canais colapsam para 0 (ControlStream.c:763-765).
- encryptedControlStream: flag (InputStream.c:105, ControlStream.c:330) igual a APP_VERSION_AT_LEAST(7,1,431). Verdadeira para todo Sunshine/Apollo/Vibeshine. Quando ativa, o input NÃO é cifrado no InputStream — vai em claro para o control stream, que cifra o pacote inteiro com AES-GCM (ControlStream.c:701-738).
- Extensões Apollo: tipos de control stream 0x3000 (Execute Server Command), 0x3001 (Set Clipboard) e 0x3002 (File transfer nonce request), declarados em ControlStream.c:234-236. Só o 0x3000 tem binding no Artemis (MoonBridge.sendExecServerCmd → GameMenu.java:280). Clipboard e file transfer estão declarados mas não implementados no cliente.
- LiSendEmptyPayload: extensão do fork ClassicOldSong (ControlStream.c:2067-2075, commit c999436 do submódulo) que manda um pacote type 0x00 com payload 0xAA55AA55. Usado pelo Artemis como keep-alive a cada 20 ms (Game.java:333-338) para impedir que o WiFi do Android entre em power save durante o stream.
- evdev_reader: executável nativo separado (não é uma .so) construído só no flavor `root` (evdev_reader/Android.mk:9). Roda em shell root, faz EVIOCGRAB exclusivo em /dev/input/event* e streama os eventos evdev crus por socket TCP em 127.0.0.1. É o mecanismo pré-Android-O de captura de mouse/teclado.
- flavor root vs nonRoot_game: os dois product flavors do app (app/build.gradle:27-62). O flavor root (applicationId com.limelight.root, maxSdk 25) constrói o evdev_reader passando PRODUCT_FLAVOR=root ao ndk-build; o nonRoot_game (com.limelight, o Artemis distribuído) não constrói.
- LC_ASSERT: macro de asserção do moonlight-common-c (Platform.h:80-96). Expande para assert() e é ANULADA em release, pois -DLC_DEBUG só é passado quando NDK_DEBUG=1 (Android.mk:52-54). Toda verificação de segurança escrita como LC_ASSERT não existe no APK publicado.
