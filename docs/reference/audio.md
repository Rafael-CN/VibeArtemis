# Pipeline de Audio (AndroidAudioRenderer + MoonBridge JNI + moonlight-common-c AudioStream/RtpAudioQueue + libopus)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (14)
6. [Ideias de melhoria](#ideias-de-melhoria) (12)
7. [Glossário](#glossário)

## Como funciona

O pipeline de audio do Artemis e praticamente identico ao do Moonlight Android upstream: nao ha reescrita propria do fork, apenas uma regressao introduzida em `Game.java`. O fluxo e: moonlight-common-c abre um socket UDP RTP dedicado para audio (`AudioStream.c:96`, porta negociada via RTSP SETUP), recebe pacotes RTP payload-type 97 (dados) e 98 (FEC Reed-Solomon 4+2), reordena/recupera perdas em `RtpAudioQueue.c`, e entrega buffers Opus crus ao callback `decodeAndPlaySample`. Esse callback e implementado em C no fork (`callbacks.c:254 BridgeArDecodeAndPlaySample`), que decodifica com `opus_multistream_decode()` diretamente para um `jshortArray` global pre-alocado e chama de volta o Java via `MoonBridge.bridgeArPlaySample(short[])`. O Java repassa para `AndroidAudioRenderer.playDecodedAudio()`, que escreve em um `AudioTrack` PCM 16-bit MODE_STREAM. Ou seja: o Opus e decodificado no lado NATIVO (nao ha MediaCodec de audio), e o Java so faz PCM out. A configuracao de canais e escolhida no Java a partir do preference `list_audio_config` (2 / 51 / 71 -> `MoonBridge.AUDIO_CONFIGURATION_*`), empacotada no inteiro magico `((channelMask<<16)|(channelCount<<8)|0xCA)` (`MoonBridge.java:186-188`) e enviada tanto ao host via HTTP `surroundAudioInfo` (`NvHTTP.java:889`) quanto ao nativo em `startConnection` (`NvConnection.java:465`). O mapeamento Opus multistream (streams, coupledStreams, mapping[]) NAO e escolhido pelo cliente: e parseado da resposta RTSP DESCRIBE do host (`RtspConnection.c:734-834 parseOpusConfigurations`), com um remapeamento GFE (FL FR C RL RR SL SR LFE -> FL FR C LFE RL RR SL SR) em `RtspConnection.c:772-785` e um fallback hardcoded so para 5.1. A duracao do pacote de audio (5 ms ou 10 ms) e decidida em `SdpGenerator.c:492-530` com base no bitrate de video e nas capabilities do renderer, e vira `samplesPerFrame = 48 * AudioPacketDuration` (`AudioStream.c:438`). O renderer do fork declara apenas `CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION` (`callbacks.c:413`) e NAO declara `CAPABILITY_DIRECT_SUBMIT`, logo existe uma thread dedicada de decode ("AudioDec", `AudioStream.c:383`) alimentada por uma LinkedBlockingQueue limitada a 30 itens (`AudioStream.c:69`) — o que da um teto de backlog de ~150 ms a 5 ms/pacote. O controle de latencia no cliente e um unico heuristico grosseiro: `AndroidAudioRenderer.playDecodedAudio()` chama `MoonBridge.getPendingAudioDuration()` (JNI -> `LiGetPendingAudioDuration()` = itens na LBQ * AudioPacketDuration) e simplesmente DESCARTA o sample se o backlog passar de 40 ms (`AndroidAudioRenderer.java:190-199`). O AudioTrack e criado com uma cascata de 4 tentativas (buffer pequeno/grande x low-latency on/off, `AndroidAudioRenderer.java:104-178`), tentando primeiro um buffer de apenas 2 frames (`bytesPerFrame*2`, ~10 ms em estereo a 5 ms/frame) com `PERFORMANCE_MODE_LOW_LATENCY` (API 26+) ou `AudioAttributes.FLAG_LOW_LATENCY` (API 21-25), com `USAGE_GAME`. O audio e sempre criptografado (AES-CBC por pacote, IV = rikeyid + sequenceNumber) porque `callbacks.c:482` seta `ENCFLG_AUDIO` incondicionalmente e `ENCFLG_ALL` se houver AES por hardware (`callbacks.c:498-500`); a decriptacao acontece em `AudioStream.c:178-218`. A libopus e um `.a` prebuilt commitado por ABI (`libopus/Android.mk:5`), sem versao rastreada. Nao existe captura de microfone, nem audio focus, nem tratamento de troca de dispositivo (fone/BT) em lugar nenhum do app. Para o objetivo do dono do fork (teclado estilo AnyDesk), o ponto de contato do audio e indireto mas critico: o audio so morre se a Surface for destruida (`Game.java:3832-3844` -> `stopConnection()`), entao um redimensionamento por IME com `adjustResize` e seguro, mas qualquer implementacao que remova/recrie a SurfaceView derruba audio e video juntos.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java`](../../app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java) | 233 | Unico arquivo do pacote binding/audio. Implementa AudioRenderer sobre AudioTrack: escolhe channel mask a partir do channelCount, tenta 4 combinacoes de buffer/low-latency, escreve PCM 16-bit e aplica o unico controle de latencia do cliente (descartar sample se backlog > 40 ms). Tambem abre/fecha sessao de AudioEffect para equalizador do sistema. |
| [`app/src/main/jni/moonlight-core/callbacks.c`](../../app/src/main/jni/moonlight-core/callbacks.c) | 520 | Ponte JNI C<->Java. Contem TODA a decodificacao Opus (o Java nunca ve Opus, so PCM). Registra os metodos estaticos do MoonBridge, cria/destroi o OpusMSDecoder, mantem o jshortArray global de saida e declara as capabilities do renderer de audio. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/AudioStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/AudioStream.c) | 476 | Nucleo do transporte de audio no submodulo. Socket RTP UDP, thread de ping (500 ms), thread de recepcao, thread de decode, fila LBQ limitada, decriptacao AES-CBC, PLC do Opus e escolha entre config normal/high-quality de surround. |
| [`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`](../../app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java) | 426 | Fachada Java de todo o moonlight-core. Define as constantes AUDIO_CONFIGURATION_*, a classe AudioConfiguration (encode/decode do inteiro magico 0xCA), os trampolins estaticos bridgeAr* chamados pelo C e as declaracoes native (incluindo getPendingAudioDuration e sendUtf8Text). |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/SdpGenerator.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/SdpGenerator.c) | 622 | Decide os parametros de audio anunciados ao host no SDP do RTSP ANNOUNCE: numero de canais, channel mask, surround enable, AudioQuality (high quality surround) e — o mais importante para latencia — o valor de AudioPacketDuration (5 ou 10 ms). |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c) | 1419 | Parseia a configuracao Opus multistream (streams/coupledStreams/mapping) do DESCRIBE do host e decide se pode pedir high quality surround. Tambem contem o hack de endereco falso que forca o GFE a dar audio de baixa qualidade. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpAudioQueue.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpAudioQueue.c) | 717 | Fila de reordenacao e recuperacao FEC (Reed-Solomon 4 data + 2 FEC) dos pacotes RTP de audio. Define quanto tempo o pipeline espera por pacotes fora de ordem antes de desistir — contribuicao direta para a latencia de audio. |
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4000 | Activity de streaming. Constroi a StreamConfiguration (incluindo audioConfiguration e localAudioPlayback) e instancia o AndroidAudioRenderer. Contem a regressao de parametro do renderer de audio e o ponto onde a destruicao da Surface derruba a conexao inteira (audio incluso). |
| [`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`](../../app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java) | 1100 | Le as preferencias de audio. Mapeia list_audio_config para MoonBridge.AUDIO_CONFIGURATION_*, le checkbox_host_audio (playHostAudio) e checkbox_enable_audiofx (enableAudioFx — campo lido mas nunca consumido). |
| [`app/src/main/jni/moonlight-core/simplejni.c`](../../app/src/main/jni/moonlight-core/simplejni.c) | 272 | Wrappers JNI 1:1 sobre a API Li*. Relevante ao audio por expor getPendingAudioDuration (usado pelo controle de backpressure) e por conter sendUtf8Text, que e a primitiva ja existente para o objetivo de teclado do dono do fork. |
| [`app/src/main/jni/moonlight-core/Android.mk`](../../app/src/main/jni/moonlight-core/Android.mk) | 65 | Build ndk-build do moonlight-core. Lista os .c do submodulo compilados (RecorderCallbacks.c NAO esta na lista) e linka libopus/libssl/libcrypto estaticos. |
| [`app/src/main/jni/moonlight-core/libopus/Android.mk`](../../app/src/main/jni/moonlight-core/libopus/Android.mk) | 7 | Importa libopus como PREBUILT_STATIC_LIBRARY por ABI. Os .a estao commitados no repo (arm64-v8a 2.8 MB, armeabi-v7a 2.0 MB) sem versao declarada; Build.txt so diz que vieram do repo moonlight-mobile-deps via AppVeyor. |
| [`app/src/main/java/com/limelight/nvstream/av/audio/AudioRenderer.java`](../../app/src/main/java/com/limelight/nvstream/av/audio/AudioRenderer.java) | 15 | Interface de 5 metodos que o AndroidAudioRenderer implementa e que o MoonBridge invoca. Nota: playDecodedAudio nao recebe o comprimento decodificado, apenas o array inteiro. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java`**
- `setup(MoonBridge.AudioConfiguration, int sampleRate, int samplesPerFrame) :68`
- `createAudioTrack(int channelConfig, int sampleRate, int bufferSize, boolean lowLatency) :28`
- `switch channelCount -> CHANNEL_OUT_STEREO/QUAD/5POINT1/0x18fc :72-92`
- `bytesPerFrame = channelCount*samplesPerFrame*2 :96`
- `loop de 4 tentativas buffer/lowLatency :104-178`
- `skip low latency se sample rate nativo != stream :151-153`
- `skip low latency se enableAudioFx :157-159`
- `playDecodedAudio(short[]) :189`
- `getPendingAudioDuration() < 40 :191`
- `track.write(audioData, 0, audioData.length) :195`
- `start() broadcast ACTION_OPEN_AUDIO_EFFECT_CONTROL_SESSION :203-212`
- `stop() broadcast ACTION_CLOSE_AUDIO_EFFECT_CONTROL_SESSION :214-223`
- `cleanup() pause/flush/release :225-232`

**`app/src/main/jni/moonlight-core/callbacks.c`**
- `static OpusMSDecoder* Decoder :13`
- `static OPUS_MULTISTREAM_CONFIGURATION OpusConfig :14`
- `static jshortArray DecodedAudioBuffer :42`
- `BridgeArInitMethod signature "(III)I" :89`
- `BridgeArPlaySampleMethod signature "([S)V" :93`
- `BridgeArInit() :203`
- `opus_multistream_decoder_create(...) :214-219`
- `NewShortArray(channelCount*samplesPerFrame) :226`
- `BridgeArStart/Stop/Cleanup :232-252`
- `BridgeArDecodeAndPlaySample(char*, int) :254`
- `GetPrimitiveArrayCritical :257`
- `opus_multistream_decode(...) :259-264`
- `ReleasePrimitiveArrayCritical + CallStaticVoidMethod :267-269`
- `BridgeAudioRendererCallbacks com CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION :407-414`
- `streamConfig.encryptionFlags = ENCFLG_AUDIO :482`
- `hasFastAes() -> ENCFLG_ALL :498-500`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/AudioStream.c`**
- `LbqInitializeLinkedBlockingQueue(&packetQueue, 30) :69`
- `MAX_PACKET_SIZE 1400 :26`
- `AudioPingThreadProc (ping a cada 500 ms) :38-65`
- `notifyAudioPortNegotiationComplete() bindUdpSocket SOCK_QOS_TYPE_AUDIO :90-110`
- `decodeInputData() — size==0 dispara PLC com NULL :162-169`
- `decriptacao AES-CBC com IV = BE32(avRiKeyId + seq) :178-201`
- `AudioReceiveThreadProc() :239`
- `packetsToDrop = 500 / AudioPacketDuration (descarta 500 ms iniciais) :248`
- `AudioDecoderThreadProc() :383`
- `startAudioStream(): escolha HighQualityOpusConfig vs NormalQualityOpusConfig :422-436`
- `chosenConfig.samplesPerFrame = 48 * AudioPacketDuration :438`
- `AudioCallbacks.init(StreamConfig.audioConfiguration, &chosenConfig, ...) :440`
- `LiGetPendingAudioFrames() = LbqGetItemCount :470-472`
- `LiGetPendingAudioDuration() = frames * AudioPacketDuration :474-476`

**`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`**
- `AUDIO_CONFIGURATION_STEREO/51/71 :10-12`
- `class AudioConfiguration :140`
- `AudioConfiguration(int) valida magic byte 0xCA :152-162`
- `getSurroundAudioInfo() :165-167`
- `toInt() :186-188`
- `bridgeArInit(int,int,int) :231`
- `bridgeArStart/Stop/Cleanup :240-256`
- `bridgeArPlaySample(short[]) :259 (comentario "//静音 todo" na linha 258)`
- `setupBridge(video, audio, listener) :331`
- `native getPendingAudioDuration() :402`
- `native sendUtf8Text(String) :396`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/SdpGenerator.c`**
- `addGen5Options() define NVFF_AUDIO_ENCRYPTION / AudioEncryptionEnabled :180-200`
- `x-nv-audio.surround.numChannels / channelMask / enable :480-489`
- `bloco de decisao high quality surround :492-504`
- `HighQualitySurroundEnabled = true; AudioPacketDuration = 5 :500-503`
- `AudioPacketDuration = 10 se SLOW_OPUS_DECODER ou bitrate < 5000 :509-514`
- `AudioPacketDuration = 5 default :517`
- `x-nv-aqos.packetDuration :521-522`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/RtspConnection.c`**
- `parseOpusConfigFromParamString() :664`
- `parseOpusConfigurations() :734`
- `sampleRate fixo 48000 :740`
- `caso estereo hardcoded (1 stream, 1 coupled) :743-749`
- `busca por "a=fmtp:97 surround-params=<N>" :759-760`
- `remapeamento de canal GFE (LFE depois de C) :772-785`
- `HighQualitySurroundSupported = true :802`
- `fallback hardcoded so para 6 canais, senao retorna -4 :815-829`
- `AudioEncryptionEnabled = false (init) :940`
- `criterios de high quality audio (bitrate>=15000, !SLOW_OPUS, local ou <=2ch) :955-957`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/RtpAudioQueue.c`**
- `RtpaInitializeQueue() (comeca em synchronizing) :21-26`
- `getFecBlockForRtpPacket() :196`
- `completeFecBlock() :390`
- `queueHasPacketReady() :496`
- `handleMissingPackets() — espera AudioPacketDuration*4 + 10 ms :504-550`
- `RtpaAddPacket() (fast path RTPQ_RET_HANDLE_NOW) :552-646`
- `RtpaGetQueuedPacket() :648`

**`app/src/main/java/com/limelight/Game.java`**
- `.enableLocalAudioPlayback(prefConfig.playHostAudio) :792`
- `.setAudioConfiguration(prefConfig.audioConfiguration) :798`
- `new AndroidAudioRenderer(Game.this, prefConfig.playHostAudio) :876 (BUG: deveria ser prefConfig.enableAudioFx)`
- `setVolumeControlStream(AudioManager.STREAM_MUSIC) :375`
- `streamSurfaceView.getHolder().setFixedSize(vw, vh) :900`
- `stopConnection() :3439`
- `surfaceDestroyed() -> stopConnection() :3832-3844`
- `onStop() -> stopConnection() :1761-1782`

**`app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java`**
- `HOST_AUDIO_PREF_STRING = "checkbox_host_audio" :56`
- `AUDIO_CONFIG_PREF_STRING = "list_audio_config" :62`
- `ENABLE_AUDIO_FX_PREF_STRING = "checkbox_enable_audiofx" :89`
- `DEFAULT_AUDIO_CONFIG = "2" :180`
- `DEFAULT_ENABLE_AUDIO_FX = false :184`
- `public boolean enableAudioFx :370`
- `mapeamento 71/51/2 -> AudioConfiguration :845-854`
- `config.playHostAudio :884`
- `config.enableAudioFx (write-only, nunca lido) :1015`

**`app/src/main/jni/moonlight-core/simplejni.c`**
- `getPendingAudioDuration -> LiGetPendingAudioDuration() :172-175`
- `getPendingVideoFrames :177-180`
- `sendUtf8Text -> LiSendUtf8TextEvent :126-131`
- `sendKeyboardInput -> LiSendKeyboardEvent2 :111-114`

**`app/src/main/jni/moonlight-core/Android.mk`**
- `LOCAL_SRC_FILES incluindo AudioStream.c e RtpAudioQueue.c :11-43`
- `LOCAL_STATIC_LIBRARIES := libopus libssl libcrypto cpufeatures :58`
- `LOCAL_CFLAGS := -DHAS_SOCKLEN_T=1 -DLC_ANDROID -DHAVE_CLOCK_GETTIME=1 :50`

**`app/src/main/jni/moonlight-core/libopus/Android.mk`**
- `LOCAL_SRC_FILES := $(TARGET_ARCH_ABI)/libopus.a :5`
- `LOCAL_EXPORT_C_INCLUDES := $(LOCAL_PATH)/include :6`

**`app/src/main/java/com/limelight/nvstream/av/audio/AudioRenderer.java`**
- `setup(AudioConfiguration, int, int) :6`
- `start() :8`
- `stop() :10`
- `playDecodedAudio(short[]) :12`
- `cleanup() :14`

</details>

## Fluxo

1) SETUP DE PREFERENCIA: usuario escolhe estereo/5.1/7.1 em `res/xml/preferences.xml:225-232` (key `list_audio_config`, valores 2/51/71 em `res/values/arrays.xml:46-55`). `PreferenceConfiguration.java:845-854` converte para `MoonBridge.AUDIO_CONFIGURATION_STEREO|_51_SURROUND|_71_SURROUND` (`MoonBridge.java:10-12`). Default = estereo (`PreferenceConfiguration.java:180`).
2) BUILD DA STREAM CONFIG: `Game.java:798` faz `.setAudioConfiguration(prefConfig.audioConfiguration)` e `Game.java:792` `.enableLocalAudioPlayback(prefConfig.playHostAudio)`. Armazenado em `StreamConfiguration.java:26,124-127`.
3) LAUNCH HTTP: `NvHTTP.java:888-889` envia `localAudioPlayMode=<0|1>` e `surroundAudioInfo=<channelMask<<16 | channelCount>` (`MoonBridge.java:165-167`) no `/launch`. E aqui que o Apollo/Vibeshine decide se o audio tambem toca no host.
4) START NATIVO: quando a Surface fica pronta, `Game.java:876` chama `conn.start(new AndroidAudioRenderer(...), decoderRenderer, this)`. `NvConnection.java:458` faz `MoonBridge.setupBridge(video, audio, listener)` (guarda a referencia estatica em `MoonBridge.java:127,333`) e `NvConnection.java:459-471` chama `MoonBridge.startConnection(..., audioConfiguration.toInt(), ...)`.
5) JNI START: `callbacks.c:454-508` monta `STREAM_CONFIGURATION` com `.audioConfiguration = audioConfiguration` e `.encryptionFlags = ENCFLG_AUDIO` (`callbacks.c:482`), promovido a `ENCFLG_ALL` se `hasFastAes()` (`callbacks.c:498-500`), e chama `LiStartConnection` passando `BridgeAudioRendererCallbacks` (`callbacks.c:407-414`) cujo `capabilities = CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION` (sem `CAPABILITY_DIRECT_SUBMIT`, sem `CAPABILITY_SLOW_OPUS_DECODER`).
6) VALIDACAO: `Connection.c:286-291` rejeita a conexao se o magic byte != 0xCA ou channelCount > 8.
7) INIT DO STREAM: `initializeAudioStream()` (`AudioStream.c:68-85`) cria a LBQ de 30 slots, o RTP_AUDIO_QUEUE e o contexto AES (chave = `StreamConfig.remoteInputAesKey`, IV base = BE32 dos primeiros 4 bytes do `remoteInputAesIv`, `AudioStream.c:80-82`).
8) NEGOCIACAO RTSP: apos o SETUP de audio, `notifyAudioPortNegotiationComplete()` (`AudioStream.c:90-110`) faz `bindUdpSocket(..., SOCK_QOS_TYPE_AUDIO)` e sobe a thread "AudioPing" que envia um ping a cada 500 ms (`AudioStream.c:38-65`) — obrigatorio antes do PLAY em GFE 3.22.
9) DESCRIBE -> OPUS CONFIG: `parseOpusConfigurations()` (`RtspConnection.c:734-834`) preenche `NormalQualityOpusConfig`/`HighQualityOpusConfig`. Estereo e hardcoded (1 stream, 1 coupled, mapping 0,1 — `RtspConnection.c:743-749`); surround vem do texto `a=fmtp:97 surround-params=<N><streams><coupled><mapping...>` (`RtspConnection.c:759-766`), com o swap de LFE para a posicao 3 (`RtspConnection.c:772-785`). Se nao achar surround-params e nao for 6 canais, retorna -4 e a conexao FALHA (`RtspConnection.c:826-829`).
10) ANNOUNCE -> PACKET DURATION: `SdpGenerator.c:492-523` decide `AudioPacketDuration` = 5 ms (default) ou 10 ms (se `CAPABILITY_SLOW_OPUS_DECODER` ou bitrate < 5000 kbps com ARBITRARY_AUDIO_DURATION), e liga `HighQualitySurroundEnabled` se bitrate >= 15000, canais > 2 e o host suportar. Anuncia `x-nv-aqos.packetDuration` e `x-nv-audio.surround.*`.
11) START DO AUDIO: `startAudioStream()` (`AudioStream.c:422-468`) escolhe `chosenConfig` (high vs normal), sobrescreve `chosenConfig.samplesPerFrame = 48 * AudioPacketDuration` (=240 @5ms, 480 @10ms) e chama `AudioCallbacks.init(StreamConfig.audioConfiguration, &chosenConfig, ...)`.
12) INIT -> JAVA: `BridgeArInit()` (`callbacks.c:203-230`) chama `MoonBridge.bridgeArInit(audioConfiguration, sampleRate, samplesPerFrame)` (`MoonBridge.java:231-238`) que constroi um `AudioConfiguration` do inteiro (valida o 0xCA, `MoonBridge.java:152-162`) e chama `AndroidAudioRenderer.setup()`.
13) CRIACAO DO AUDIOTRACK: `AndroidAudioRenderer.java:72-92` mapeia channelCount -> `CHANNEL_OUT_STEREO`/`QUAD`/`5POINT1`/`0x18fc` (7.1 hardcoded). `bytesPerFrame = channelCount*samplesPerFrame*2` (linha 96). O loop de 4 tentativas (linhas 104-178) tenta, em ordem: (a) buffer minusculo `bytesPerFrame*2` com low latency, (b) `max(getMinBufferSize, bytesPerFrame*2)` arredondado ao frame com low latency, (c) buffer minusculo sem low latency, (d) buffer grande sem low latency. Opcoes low-latency sao puladas se a taxa nativa do device != sampleRate (linha 151) ou se `enableAudioFx` (linha 157). Retorna 0 (ok), -1 (channelCount invalido) ou -2 (nenhum AudioTrack criado).
14) CRIACAO DO DECODER OPUS: de volta em `callbacks.c:212-227`, com err==0, cria `opus_multistream_decoder_create(sampleRate, channelCount, streams, coupledStreams, mapping, &err)` e aloca o `DecodedAudioBuffer` global de `channelCount * samplesPerFrame` shorts. Se falhar, chama `bridgeArCleanup` no Java e retorna -1.
15) THREADS: `AudioStream.c:447-465` sobe "AudioRecv" e, como `CAPABILITY_DIRECT_SUBMIT` nao esta setado, tambem "AudioDec". `BridgeArStart()` -> `AndroidAudioRenderer.start()` (abre a sessao AudioEffect se enableAudioFx).
16) RECEPCAO: "AudioRecv" (`AudioStream.c:239-381`) faz `recvUdpSocket` com timeout de 100 ms, descarta os primeiros `500/AudioPacketDuration` pacotes de dados (`AudioStream.c:248`, resync inicial), converte seq/timestamp/ssrc para host order (linhas 319-321) e entrega a `RtpaAddPacket()`.
17) FEC/REORDENACAO: `RtpAudioQueue.c:552-646`. Caso comum (pacote na ordem) retorna `RTPQ_RET_HANDLE_NOW` e o pacote vai direto. Caso contrario o pacote entra num bloco FEC 4+2; `handleMissingPackets()` (`RtpAudioQueue.c:504-550`) so desiste apos `AudioPacketDuration*4 + 10 ms` (30 ms @5ms) se ja houve dados fora de ordem, e ai marca `allowDiscontinuity` — o que gera pacotes de tamanho 0 (concealment).
18) ENFILEIRAMENTO: como nao ha DIRECT_SUBMIT, `queuePacketToLbq()` (`AudioStream.c:142-160`) coloca na LBQ de 30. Se estourar, LOGA "Audio packet queue overflow" e FAZ FLUSH DE TUDO (`AudioStream.c:151-156`).
19) DECODE: "AudioDec" (`AudioStream.c:383-398`) tira da LBQ e chama `decodeInputData()` (`AudioStream.c:162-237`), que decripta AES-CBC quando `AudioEncryptionEnabled` e chama `AudioCallbacks.decodeAndPlaySample(dados, len)`. Pacote de tamanho 0 => `decodeAndPlaySample(NULL, 0)` => PLC do Opus.
20) OPUS -> PCM: `BridgeArDecodeAndPlaySample()` (`callbacks.c:254-279`) pega ponteiro critico do `DecodedAudioBuffer`, roda `opus_multistream_decode(Decoder, sampleData, sampleLength, decodedData, OpusConfig.samplesPerFrame, 0)`, libera o ponteiro e chama `MoonBridge.bridgeArPlaySample(short[])`. Se `decodeLen <= 0`, aborta silenciosamente (JNI_ABORT, sem log).
21) BACKPRESSURE E PLAYBACK: `MoonBridge.bridgeArPlaySample` (`MoonBridge.java:259-263`) -> `AndroidAudioRenderer.playDecodedAudio()` (linha 189). Consulta `MoonBridge.getPendingAudioDuration()` (JNI -> `simplejni.c:172-175` -> `LiGetPendingAudioDuration()` = `LbqGetItemCount(&packetQueue) * AudioPacketDuration`, `AudioStream.c:470-476`). Se < 40 ms, faz `track.write(audioData, 0, audioData.length)` (bloqueante); senao DESCARTA o buffer e loga.
22) TEARDOWN: `stopAudioStream()` (`AudioStream.c:400-420`) chama `AudioCallbacks.stop()` -> `AndroidAudioRenderer.stop()` (fecha sessao AudioEffect), interrompe/join das threads, e `AudioCallbacks.cleanup()` -> `BridgeArCleanup()` (`callbacks.c:244-252`) que destroi o decoder Opus, apaga o global ref do buffer e chama `AndroidAudioRenderer.cleanup()` (pause/flush/release do AudioTrack). Disparado por `Game.java:3439 stopConnection()`, que por sua vez e chamado de `onStop()` (`Game.java:1782`) e de `surfaceDestroyed()` (`Game.java:3842`).

## Interfaces externas

- android.media.AudioTrack — MODE_STREAM, ENCODING_PCM_16BIT, unico sink de audio do app (AndroidAudioRenderer.java:28-65)
- android.media.AudioTrack.Builder + setPerformanceMode(PERFORMANCE_MODE_LOW_LATENCY) — caminho API 26+ (AndroidAudioRenderer.java:45-56)
- android.media.AudioAttributes — USAGE_GAME e FLAG_LOW_LATENCY para API 21-25 (AndroidAudioRenderer.java:29-41)
- android.media.AudioFormat — CHANNEL_OUT_STEREO, CHANNEL_OUT_QUAD, CHANNEL_OUT_5POINT1 e a constante 7.1 hardcoded 0x000018fc (AndroidAudioRenderer.java:75-87)
- android.media.AudioManager — getNativeOutputSampleRate(STREAM_MUSIC) para decidir low latency (AndroidAudioRenderer.java:151); setVolumeControlStream(STREAM_MUSIC) (Game.java:375); AUDIO_SESSION_ID_GENERATE (AndroidAudioRenderer.java:63)
- android.media.audiofx.AudioEffect — broadcasts ACTION_OPEN/CLOSE_AUDIO_EFFECT_CONTROL_SESSION com CONTENT_TYPE_GAME para equalizadores do sistema (AndroidAudioRenderer.java:206-221)
- JNI — chamadas estaticas C->Java bridgeArInit "(III)I", bridgeArStart/Stop/Cleanup "()V", bridgeArPlaySample "([S)V" (callbacks.c:89-93)
- JNI — GetPrimitiveArrayCritical / ReleasePrimitiveArrayCritical sobre o jshortArray global de PCM (callbacks.c:257,267,277)
- JNI — AttachCurrentThread via TLS pthread_key para as threads nativas de audio (callbacks.c:44-78)
- libopus (multistream) — opus_multistream_decoder_create / opus_multistream_decode / opus_multistream_decoder_destroy; .a prebuilt por ABI (callbacks.c:214,259,247; libopus/Android.mk:5)
- libssl/libcrypto (OpenSSL estatico) — AES-128-CBC por pacote de audio via PltDecryptMessage (AudioStream.c:192-197; build-openssl.sh)
- RTP/UDP — payload type 97 (dados de audio) e 98 (FEC), MAX_PACKET_SIZE 1400, porta negociada por RTSP SETUP (AudioStream.c:26,312; RtpAudioQueue.c)
- Reed-Solomon (reedsolomon/rs.c) — FEC de audio 4 data + 2 paridade (RtpAudioQueue.h:11-13)
- RTSP — DESCRIBE para obter "a=fmtp:97 surround-params=..." e ANNOUNCE para enviar x-nv-audio.surround.* e x-nv-aqos.packetDuration (RtspConnection.c:759; SdpGenerator.c:480-522)
- HTTP/HTTPS do host (GFE/Sunshine/Apollo) — parametros de launch localAudioPlayMode e surroundAudioInfo (NvHTTP.java:888-889)
- ENet / control stream — nao transporta audio, mas compartilha o mesmo LiStartConnection; canal CTRL_CHANNEL_UTF8 0x06 e o par do sendUtf8Text (Limelight-internal.h:63)
- android.os.Build.VERSION — gates de API 21/26 no caminho de criacao do AudioTrack (AndroidAudioRenderer.java:37,44)
- cpufeatures (NDK) — android_getCpuFeatures para decidir ENCFLG_ALL vs ENCFLG_AUDIO, o que afeta se o audio e criptografado com AES acelerado (callbacks.c:431-452)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🟠 alto | bug | Preferencia errada passada ao AndroidAudioRenderer: playHostAudio ocupa o lugar de enableAudioFx | `app/src/main/java/com/limelight/Game.java:876` |
| 🟡 médio | bug | O comprimento decodificado pelo Opus e descartado; o AudioTrack sempre recebe o buffer inteiro | `app/src/main/jni/moonlight-core/callbacks.c:265` |
| 🟡 médio | performance | Backpressure de audio descarta samples sem resync, criando gaps permanentes | `app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java:190` |
| 🟡 médio | maintainability | Falhas de decodificacao Opus sao silenciosas — impossivel diagnosticar cortes de audio | `app/src/main/jni/moonlight-core/callbacks.c:275` |
| 🟡 médio | bug | AudioTrack nao e anulado em cleanup() e start/stop/cleanup nao tem guarda de null | `app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java:226` |
| 🟡 médio | ux | Nenhum gerenciamento de audio focus nem reacao a troca de dispositivo de saida | `app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java:28` |
| 🟡 médio | bug | Destruicao da Surface derruba a conexao inteira, audio incluso — risco direto para a feature de teclado com resize | `app/src/main/java/com/limelight/Game.java:3842` |
| ⚪ baixo | performance | GetPrimitiveArrayCritical mantido durante toda a decodificacao Opus | `app/src/main/jni/moonlight-core/callbacks.c:257` |
| ⚪ baixo | compatibility | Mapeamento de canais errado se channelCount for 4 (CHANNEL_OUT_QUAD) | `app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java:78` |
| ⚪ baixo | compatibility | A AudioConfiguration entregue ao renderer e a REQUISITADA, nao a negociada — e a falta de fallback derruba a conexao | `app/src/main/jni/moonlight-core/moonlight-common-c/src/AudioStream.c:440` |
| ⚪ baixo | security | libopus commitada como binario prebuilt sem versao rastreada nem script de build | `app/src/main/jni/moonlight-core/libopus/Android.mk:5` |
| ⚪ baixo | tech-debt | Imports mortos de audio em PlatformBinding | `app/src/main/java/com/limelight/binding/PlatformBinding.java:5` |
| ⚪ baixo | maintainability | Comentarios TODO em chines na ponte de audio indicando trabalho inacabado | `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java:258` |
| ⚪ baixo | tech-debt | RecorderCallbacks.c existe no submodulo mas nao esta no Android.mk — modo de gravacao de audio inacessivel | `app/src/main/jni/moonlight-core/Android.mk:11` |

### Detalhe

#### 🟠 alto Preferencia errada passada ao AndroidAudioRenderer: playHostAudio ocupa o lugar de enableAudioFx

**Local:** `app/src/main/java/com/limelight/Game.java:876` · **Categoria:** bug

O construtor e `AndroidAudioRenderer(Context context, boolean enableAudioFx)` (AndroidAudioRenderer.java:23), mas Game.java:876 passa `prefConfig.playHostAudio`. Sao duas preferencias completamente diferentes: `checkbox_host_audio` ("Play audio on PC", PreferenceConfiguration.java:56,884) e `checkbox_enable_audiofx` ("Enable system equalizer support", PreferenceConfiguration.java:89,1015). Consequencias reais: (1) quando o usuario liga "tocar audio tambem no PC", o cliente silenciosamente PULA todas as tentativas de AudioTrack de baixa latencia (AndroidAudioRenderer.java:157-159) e passa a usar buffer/modo padrao, aumentando a latencia de audio; (2) o cliente passa a fazer broadcast das intents ACTION_OPEN/CLOSE_AUDIO_EFFECT_CONTROL_SESSION (AndroidAudioRenderer.java:203-223) sem que o usuario tenha pedido, deixando equalizadores do sistema processarem o audio do jogo; (3) a preferencia `checkbox_enable_audiofx` que aparece na UI (res/xml/preferences.xml:233-238, com strings traduzidas em ~20 idiomas) e completamente inerte — `config.enableAudioFx` (PreferenceConfiguration.java:370) e escrito e nunca lido em lugar nenhum do app. Confirmado por `git log -S`: o upstream usava `prefConfig.enableAudioFx` (commits fe322590 e 6d51185d) e a troca foi introduzida pelo commit 08dd5406 "3d mode v1" (Janyger, 2025-07-23), que reescreveu o bloco de start da conexao dentro do callback `streamContainer.setOnSurfaceAvailable`.

**Correção sugerida:** Trocar por `new AndroidAudioRenderer(Game.this, prefConfig.enableAudioFx)` em Game.java:876. Adicionalmente, para tornar a classe imune a esse tipo de troca, mudar a assinatura para receber o `PreferenceConfiguration` inteiro ou usar um parametro nomeado/objeto de config em vez de um boolean solto.

#### 🟡 médio O comprimento decodificado pelo Opus e descartado; o AudioTrack sempre recebe o buffer inteiro

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:265` · **Categoria:** bug

`opus_multistream_decode()` retorna em `decodeLen` o numero de samples por canal efetivamente decodificados (callbacks.c:259-264), mas esse valor so e usado como um teste `> 0`. A interface JNI `bridgeArPlaySample` tem assinatura `([S)V` (callbacks.c:93) e nao carrega comprimento, entao `AndroidAudioRenderer.playDecodedAudio()` faz `track.write(audioData, 0, audioData.length)` (AndroidAudioRenderer.java:195) — o buffer inteiro de `channelCount * samplesPerFrame` shorts alocado uma unica vez no init (callbacks.c:226). Se um frame decodificar menos samples que `samplesPerFrame`, a cauda do buffer (dados do frame ANTERIOR) e reproduzida como audio, gerando um artefato audivel. Isso importa exatamente porque o fork declara `CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION` (callbacks.c:413), cuja documentacao (Limelight.h:259-263) diz explicitamente que os pacotes podem conter mais ou menos audio que 5 ms e que o renderer deve usar samplesPerFrame para calcular o tamanho correto — o buffer e dimensionado corretamente, mas o comprimento REAL por frame nunca chega ao AudioTrack.

**Correção sugerida:** Mudar a assinatura para `bridgeArPlaySample([SI)V` passando `decodeLen`, propagar para `AudioRenderer.playDecodedAudio(short[] data, int sampleCount)` e escrever `track.write(audioData, 0, decodeLen * channelCount)`. Alternativa menos invasiva: zerar a cauda do buffer quando `decodeLen < OpusConfig.samplesPerFrame` antes de chamar de volta o Java.

#### 🟡 médio Backpressure de audio descarta samples sem resync, criando gaps permanentes

**Local:** `app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java:190` · **Categoria:** performance

Quando `MoonBridge.getPendingAudioDuration()` passa de 40 ms, o sample decodificado e simplesmente jogado fora e nada mais acontece: o AudioTrack nao e flushado, a fila nativa nao e drenada, e nao ha contador do evento. Como `LiGetPendingAudioDuration()` mede apenas a LBQ nativa (AudioStream.c:470-476) e nao a fila interna do AudioTrack, o backlog real pode ser maior. Pior: a fila nativa tem limite de 30 itens (AudioStream.c:69) e, ao estourar, `queuePacketToLbq()` faz FLUSH DE TODOS os pacotes (AudioStream.c:151-156). Ou seja, existem dois mecanismos de descarte descoordenados, ambos produzindo cortes abruptos em vez de um resync limpo. Alem disso, no caminho de descarte roda `LimeLog.info("Too much pending audio data: " + MoonBridge.getPendingAudioDuration() + " ms")` (linha 198), que faz concatenacao de string e uma SEGUNDA chamada JNI na thread de decode de audio justamente quando o sistema ja esta sobrecarregado.

**Correção sugerida:** Ao ultrapassar o limiar, fazer `track.pause(); track.flush(); track.play();` para um resync explicito, drenar a LBQ nativa de uma vez, e contabilizar o evento num contador exposto no overlay de performance em vez de logar por ocorrencia. Trocar o limiar fixo de 40 ms por um valor derivado de `AudioPacketDuration` e do buffer real do AudioTrack (`getBufferSizeInFrames()`).

#### 🟡 médio Falhas de decodificacao Opus sao silenciosas — impossivel diagnosticar cortes de audio

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:275` · **Categoria:** maintainability

Quando `opus_multistream_decode()` retorna <= 0 (por exemplo OPUS_BUFFER_TOO_SMALL quando o host muda a duracao do pacote no meio do stream, ou OPUS_INVALID_PACKET apos uma recuperacao FEC incorreta), o codigo apenas faz `ReleasePrimitiveArrayCritical(..., JNI_ABORT)` e retorna. Nao ha `Limelog`, nao ha contador, nao ha nada. Combinado com o fato de o overlay de performance nao ter nenhuma metrica de audio (`getPendingAudioDuration` so aparece em AndroidAudioRenderer.java:191,198), o usuario que relata "o audio corta" nao gera nenhum dado acionavel.

**Correção sugerida:** Adicionar `Limelog("Opus decode failed: %d (len=%d)\n", decodeLen, sampleLength)` com rate limiting, manter contadores estaticos de frames decodificados/falhos/PLC, e exportar via um novo native `getAudioStats()` para o overlay de performance junto com as metricas de video.

#### 🟡 médio AudioTrack nao e anulado em cleanup() e start/stop/cleanup nao tem guarda de null

**Local:** `app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java:226` · **Categoria:** bug

`cleanup()` faz `track.pause(); track.flush(); track.release();` mas nao seta `track = null`. `start()` (linha 203), `stop()` (linha 214) e `cleanup()` (linha 226) desreferenciam `track` sem checagem. Hoje o unico caminho seguro depende de moonlight-common-c nunca chamar cleanup duas vezes nem chamar start apos um setup que retornou -2 (AudioStream.c:440-443 aborta antes de `AudioCallbacks.start()`), mas essa e uma invariante implicita mantida do outro lado da fronteira JNI, em C, num submodulo. Qualquer refatoracao do teardown (ou um `LiStopConnection` concorrente — lembrando que `MoonBridge` mantem o renderer numa estatica, MoonBridge.java:127,333) vira `IllegalStateException` num AudioTrack ja liberado, dentro de uma thread nativa anexada, o que crasha o processo (o proprio codigo em callbacks.c:270-273 comenta "We will crash here").

**Correção sugerida:** Setar `track = null` ao final de `cleanup()` e adicionar `if (track == null) return;` no inicio de `start()`, `stop()`, `cleanup()` e `playDecodedAudio()`.

#### 🟡 médio Nenhum gerenciamento de audio focus nem reacao a troca de dispositivo de saida

**Local:** `app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java:28` · **Categoria:** ux

Busca por `requestAudioFocus`, `AudioFocus`, `AudioDeviceCallback` e `setPreferredDevice` em todo `app/src/main/java` nao retorna nenhuma ocorrencia. Consequencias: (a) o stream nao reduz volume nem pausa quando chega uma chamada ou uma notificacao, e nao interrompe corretamente outros apps de midia; (b) a decisao de low-latency e tomada UMA unica vez em `setup()` comparando `AudioTrack.getNativeOutputSampleRate(STREAM_MUSIC)` com o sample rate do stream (linha 151) — se o usuario conectar um fone Bluetooth (tipicamente 44.1 kHz / caminho A2DP de alta latencia) no meio da sessao, o AudioTrack criado para o alto-falante interno continua ativo, o modo low-latency vira contraproducente e a latencia de audio dispara sem que nada seja reconfigurado.

**Correção sugerida:** Registrar `AudioManager.registerAudioDeviceCallback` e recriar o AudioTrack (parar de escrever, release, refazer a cascata de setup) em `onAudioDevicesAdded/Removed`; solicitar `AUDIOFOCUS_GAIN` com `AudioFocusRequest` usando os mesmos `AudioAttributes` (USAGE_GAME) em `start()` e abandonar em `stop()`.

#### 🟡 médio Destruicao da Surface derruba a conexao inteira, audio incluso — risco direto para a feature de teclado com resize

**Local:** `app/src/main/java/com/limelight/Game.java:3842` · **Categoria:** bug

`Game.surfaceDestroyed()` chama `stopConnection()` (Game.java:3832-3844), que executa `conn.stop()` e portanto `stopAudioStream()` -> `BridgeArCleanup()` -> destruicao do decoder Opus e release do AudioTrack. `StreamContainer.surfaceDestroyed()` (ui/StreamContainer.java:249-258) encaminha incondicionalmente para o Game. Isso e diretamente relevante ao objetivo n.1 do dono do fork (empurrar/redimensionar o stream quando o teclado virtual abre, estilo AnyDesk): uma implementacao baseada em `adjustResize` apenas dispara `surfaceChanged` e e SEGURA para o audio; ja qualquer implementacao que remova/re-adicione a SurfaceView na hierarquia, troque de container, ou entre e saia de um modo alternativo de render (o `StreamContainer` ja tem MODE_2D vs estereo, ui/StreamContainer.java:250-255) destroi a Surface e mata audio e video juntos, exigindo reconexao completa. Agrava o quadro `Game.java:900`, que faz `setFixedSize(vw, vh)` pinando o tamanho do buffer da Surface — o que interage mal com um layout que pretende redimensionar o stream.

**Correção sugerida:** Ao implementar o resize por IME, usar exclusivamente `android:windowSoftInputMode="adjustResize"` no `<activity android:name=".Game">` (AndroidManifest.xml:193-216, que ja declara configChanges com keyboardHidden|screenSize e portanto NAO recria a Activity) e alterar apenas os LayoutParams da SurfaceView existente, jamais remove-la/re-adiciona-la. Reavaliar o `setFixedSize` da linha 900 para que o buffer acompanhe a area util. Como rede de seguranca, adicionar um guard em surfaceDestroyed que so pare a conexao se a Activity estiver finishing/stopping.

#### ⚪ baixo GetPrimitiveArrayCritical mantido durante toda a decodificacao Opus

**Local:** `app/src/main/jni/moonlight-core/callbacks.c:257` · **Categoria:** performance

O ponteiro critico do `DecodedAudioBuffer` e obtido antes de `opus_multistream_decode()` e so liberado depois (callbacks.c:257-267). A especificacao JNI proibe outras chamadas JNI e permite que a VM bloqueie o GC durante a regiao critica. A 5 ms por pacote sao 200 regioes criticas por segundo, cada uma cobrindo uma decodificacao multistream completa (mais custosa em 5.1/7.1 com alta qualidade, onde ha varios streams nao acoplados). Em ART com GC concorrente isso pode contribuir para jank em dispositivos fracos — que sao exatamente os que ja tendem a sofrer com audio.

**Correção sugerida:** Decodificar para um buffer nativo estatico (`static int16_t pcmScratch[8*480]`) e depois copiar com `SetShortArrayRegion` para o jshortArray, o que elimina a regiao critica. O custo do memcpy de <= 7680 bytes e desprezivel comparado ao risco de bloquear o GC.

#### ⚪ baixo Mapeamento de canais errado se channelCount for 4 (CHANNEL_OUT_QUAD)

**Local:** `app/src/main/java/com/limelight/binding/audio/AndroidAudioRenderer.java:78` · **Categoria:** compatibility

O caso `case 4: channelConfig = AudioFormat.CHANNEL_OUT_QUAD;` assume ordem FL/FR/BL/BR (mask 0xCC, ordem por posicao de bit), mas o contrato do mapping Opus documentado em Limelight.h:317-326 fixa a ordem de saida em FL, FR, C, LFE, BL, BR, SL, SR — ou seja, com 4 canais os indices 2 e 3 sao Center e LFE, que seriam roteados para as caixas traseiras. Os casos 2, 6 e 8 estao corretos (0x3=FL|FR; CHANNEL_OUT_5POINT1=0xFC = FL FR FC LFE BL BR; 0x18FC = FL FR FC LFE BL BR SL SR — bate exatamente com a ordem do Limelight.h). Hoje o caso 4 e inalcancavel porque a UI so oferece 2/51/71 (res/values/arrays.xml:46-55 e PreferenceConfiguration.java:845-854), entao e codigo defensivo morto — mas errado, e uma armadilha para quem futuramente adicionar `MAKE_AUDIO_CONFIGURATION(4, mask)`.

**Correção sugerida:** Ou remover o `case 4` (deixando cair no `default` que retorna -1 com log), ou construir o channel mask a partir de `audioConfiguration.channelMask` (que ja e transportado em MoonBridge.AudioConfiguration.channelMask, MoonBridge.java:141-147) traduzindo bit a bit do formato WAVE_FORMAT_EXTENSIBLE da Microsoft para as constantes CHANNEL_OUT_* do Android, em vez de usar um switch por contagem.

#### ⚪ baixo A AudioConfiguration entregue ao renderer e a REQUISITADA, nao a negociada — e a falta de fallback derruba a conexao

**Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/AudioStream.c:440` · **Categoria:** compatibility

`AudioCallbacks.init()` recebe `StreamConfig.audioConfiguration`, e um grep por `audioConfiguration` em todo `moonlight-common-c/src/*.c` mostra que esse campo nunca e reescrito apos a negociacao — apenas lido (Connection.c:286-287, RtspConnection.c:743,756,957, SdpGenerator.c:418-419). Isso contradiz o contrato declarado em Limelight.h:338-340 ("The audio configuration parameter provides the negotiated audio configuration. This may differ from the one specified in the stream configuration"). Na pratica, se o usuario pedir 7.1 e o host nao publicar `a=fmtp:97 surround-params=8`, `parseOpusConfigurations()` cai no ramo sem fallback e retorna -4 (RtspConnection.c:826-829), abortando a conexao inteira em vez de degradar para estereo. Para quem usa Apollo/Vibeshine com display virtual e um sink de audio virtual criado dinamicamente, isso significa que uma configuracao de saida diferente no host vira "nao conecta" em vez de "conectou em estereo".

**Correção sugerida:** No cliente (fora do submodulo, para nao divergir do upstream): detectar o codigo de falha do estagio de RTSP e reconectar automaticamente com AUDIO_CONFIGURATION_STEREO, avisando o usuario. No submodulo, se houver disposicao de patchear: adicionar fallback para estereo em parseOpusConfigurations e atualizar StreamConfig.audioConfiguration com o valor efetivamente negociado antes de chamar AudioCallbacks.init.

#### ⚪ baixo libopus commitada como binario prebuilt sem versao rastreada nem script de build

**Local:** `app/src/main/jni/moonlight-core/libopus/Android.mk:5` · **Categoria:** security

O modulo usa `PREBUILT_STATIC_LIBRARY` apontando para `$(TARGET_ARCH_ABI)/libopus.a` — arquivos binarios commitados no repo (arm64-v8a 2.826.428 bytes, armeabi-v7a 2.066.404 bytes, mais x86 e x86_64). `Build.txt` diz apenas "Static libraries were built from https://github.com/cgutman/moonlight-mobile-deps using AppVeyor CI", sem commit, sem tag, sem versao do Opus. Nao existe hash de verificacao, nem script equivalente ao `build-openssl.sh` que existe ao lado para o OpenSSL. Os headers em libopus/include tambem nao carregam versao. Resultado: nao ha como saber se a libopus embarcada contem correcoes de seguranca conhecidas do decoder Opus, nem como reproduzir o binario. Isso e critico porque o decoder Opus processa dados vindos da rede (ainda que autenticados/criptografados).

**Correção sugerida:** Adicionar um `libopus/VERSION.txt` com a tag/commit exata do Opus e o commit do moonlight-mobile-deps usado, um `build-opus.sh` analogo ao `build-openssl.sh`, e checksums SHA-256 dos .a. Idealmente migrar para compilar o Opus a partir de um submodulo git com ndk-build/CMake, eliminando o binario do repo.

#### ⚪ baixo Imports mortos de audio em PlatformBinding

**Local:** `app/src/main/java/com/limelight/binding/PlatformBinding.java:5` · **Categoria:** tech-debt

A classe tem apenas o metodo `getCryptoProvider` (linhas 11-13), mas importa `com.limelight.binding.audio.AndroidAudioRenderer` (linha 5) e `com.limelight.nvstream.av.audio.AudioRenderer` (linha 7). Resquicio de quando o PlatformBinding era a fabrica do renderer de audio no upstream antigo. Confunde a leitura de quem procura onde o renderer de audio e construido (a resposta e Game.java:876, nao aqui).

**Correção sugerida:** Remover as duas linhas de import.

#### ⚪ baixo Comentarios TODO em chines na ponte de audio indicando trabalho inacabado

**Local:** `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java:258` · **Categoria:** maintainability

Logo acima de `bridgeArPlaySample` ha o comentario `//静音 todo` ("mudo / silenciar todo"), e acima de `bridgeDrSubmitDecodeUnit` ha `//todo 不显示画面` ("nao exibe imagem") na linha 218. Sao marcadores deixados por um contribuidor anterior (provavelmente do commit 030c79fd "feat:提交内容修改") em cima justamente dos dois pontos de entrada de A/V. Nao ha issue nem contexto associado, e nenhum codigo de mute existe — o que sugere ou uma feature de mute abandonada ou uma nota de depuracao. Para um codebase que sera mantido por agentes de IA, esses marcadores sao ativamente enganosos.

**Correção sugerida:** Remover os dois comentarios ou substitui-los por uma nota em ingles/portugues explicando a intencao real. Se a intencao era um mute local, implementa-lo de verdade com um flag volatile checado em playDecodedAudio (ver ideia de melhoria correspondente).

#### ⚪ baixo RecorderCallbacks.c existe no submodulo mas nao esta no Android.mk — modo de gravacao de audio inacessivel

**Local:** `app/src/main/jni/moonlight-core/Android.mk:11` · **Categoria:** tech-debt

`Connection.c:248-251` instala callbacks pass-through de gravacao quando `LC_DEBUG_RECORD_MODE` esta definido, e `RecorderCallbacks.c:81-88 recArDecodeAndPlaySample` grava o Opus bruto em arquivo antes de repassar ao decoder real. Mas `RecorderCallbacks.c` nao consta em `LOCAL_SRC_FILES` (Android.mk:11-43). Como o `#ifdef` protege a unica chamada, o build passa; porem qualquer tentativa de habilitar `LC_DEBUG_RECORD_MODE` para diagnosticar problemas de audio falha no link com "undefined reference to setRecorderCallbacks". Isso desperdica a unica ferramenta de diagnostico de audio pronta no codebase.

**Correção sugerida:** Adicionar `moonlight-common-c/src/RecorderCallbacks.c` a LOCAL_SRC_FILES e criar uma flavor/flag de build de debug que defina `-DLC_DEBUG_RECORD_MODE`, com o caminho do arquivo vindo do arContext (hoje `callbacks.c:507` passa NULL como audioContext em LiStartConnection, entao tambem seria preciso passar um path).


## Ideias de melhoria

### Corrigir a troca de preferencia enableAudioFx/playHostAudio

**Tamanho:** quick-win

**Por quê:** Uma unica linha errada em Game.java:876 hoje (a) aumenta a latencia de audio de todo usuario que liga "tocar audio no PC" e (b) torna uma preferencia visivel e traduzida em 20 idiomas completamente inerte. E o maior retorno por caractere de codigo em todo o pipeline de audio.

**Como:** Em `app/src/main/java/com/limelight/Game.java:876`, trocar `prefConfig.playHostAudio` por `prefConfig.enableAudioFx`. Verificar que `PreferenceConfiguration.java:1015` continua populando o campo e que `res/xml/preferences.xml:233-238` permanece. Testar as 4 combinacoes (audiofx on/off x host audio on/off) observando a linha de log `Audio track configuration: <bufferSize> <lowLatency>` emitida em AndroidAudioRenderer.java:166.

**Risco:** Praticamente nulo. Unico efeito colateral: usuarios que hoje tem "host audio" ligado vao passar a usar o modo low-latency (buffer menor), o que em dispositivos muito fracos pode expor underruns antes mascarados pelo buffer maior — mitigado pela cascata de 4 tentativas que ja existe.

### Mute local do stream durante a sessao (e cumprir o //静音 todo)

**Tamanho:** quick-win

**Por quê:** Existe um TODO explicito de mute em MoonBridge.java:258 que nunca foi implementado. Um toggle de mute local e trivial (o audio ja passa por um unico funil) e util no caso de uso do dono do fork: quando ele abre o teclado virtual para digitar, frequentemente quer silenciar o jogo sem mexer no volume do sistema.

**Como:** Adicionar `private volatile boolean muted` em `AndroidAudioRenderer` com setter, e em `playDecodedAudio` (linha 189) retornar cedo quando `muted` — mas continuando a drenar a fila, ou seja, sem pular o consumo (senao o backlog cresce). Expor o toggle no `GameMenu` junto dos demais itens de sessao e remover o comentario TODO de MoonBridge.java:258.

**Risco:** Baixo. Cuidado para nao criar backlog: ao mutar, ainda e preciso descartar os samples (nao apenas nao escreve-los) e idealmente pausar/flushar o AudioTrack para nao segurar buffer preenchido.

### Propagar o comprimento decodificado do Opus ate o AudioTrack

**Tamanho:** small

**Por quê:** Elimina a reproducao de cauda de buffer obsoleta e torna a declaracao de CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION honesta ponta a ponta. Necessario antes de qualquer trabalho que permita ao usuario escolher a duracao do pacote de audio.

**Como:** Mudar `BridgeArPlaySampleMethod` para assinatura `([SI)V` em `callbacks.c:93` e passar `decodeLen` em `callbacks.c:269`; atualizar `MoonBridge.bridgeArPlaySample(short[] pcmData, int samplesPerChannel)` (MoonBridge.java:259), a interface `AudioRenderer.playDecodedAudio` (av/audio/AudioRenderer.java:12) e `AndroidAudioRenderer.java:195` para `track.write(audioData, 0, samplesPerChannel * channelCount)` (guardando channelCount como campo em setup()).

**Risco:** Baixo. Toca a fronteira JNI: se a assinatura do metodo for alterada em so um dos lados, `GetStaticMethodID` retorna NULL e o app crasha no primeiro pacote de audio. Alterar callbacks.c e MoonBridge.java no mesmo commit e limpar o build nativo.

### Instrumentacao de audio no overlay de performance

**Tamanho:** small

**Por quê:** Hoje nao existe UMA metrica de audio visivel ao usuario nem ao desenvolvedor: falhas de decode sao silenciosas (callbacks.c:275-278), descartes por backpressure so viram log (AndroidAudioRenderer.java:198) e o overlay mostra apenas video. Sem isso, todo relato de "audio picotando" e inacionavel.

**Como:** Adicionar contadores estaticos em `callbacks.c` (frames decodificados, falhas de decode, invocacoes de PLC com sampleData==NULL) e um novo native `getAudioStats()` em `simplejni.c` ao lado de `getPendingAudioDuration` (linha 172). No Java, contar descartes em `AndroidAudioRenderer.playDecodedAudio` (linha 196) e expor pending duration media/pico. Renderizar junto com as metricas de video ja exibidas pelo overlay do Game.

**Risco:** Baixo. Cuidado para nao adicionar chamadas JNI por pacote no caminho quente — os contadores nativos devem ser lidos apenas na cadencia do overlay (1 Hz), nunca por frame de audio.

### Habilitar o modo de gravacao de audio para diagnostico

**Tamanho:** small

**Por quê:** O submodulo ja traz `RecorderCallbacks.c` capaz de dumpar o Opus bruto (`recArDecodeAndPlaySample`, linhas 81-88) antes do decode, o que separa instantaneamente "problema de rede/host" de "problema de decode/AudioTrack". Esta inacessivel apenas porque o arquivo nao entra no build.

**Como:** Adicionar `moonlight-common-c/src/RecorderCallbacks.c` a `LOCAL_SRC_FILES` em `app/src/main/jni/moonlight-core/Android.mk:11-43`; criar uma build flavor de debug que passe `-DLC_DEBUG_RECORD_MODE` em `LOCAL_CFLAGS` (linha 50, ao lado do `-DLC_DEBUG` ja condicionado a NDK_DEBUG na linha 52-54); passar um caminho de arquivo como `audioContext` em `LiStartConnection` (`callbacks.c:507`, hoje NULL).

**Risco:** Baixo, desde que fique restrito a builds de debug — em release gravaria audio do usuario em disco, o que seria um problema de privacidade. Guardar atras da flag e nunca habilitar na flavor de producao.

### Pinar e reproduzir o build da libopus

**Tamanho:** small

**Por quê:** O decoder Opus processa dados de rede e hoje e um binario opaco commitado, sem versao, sem checksum e sem script de build — em contraste com o OpenSSL, que tem `build-openssl.sh` ao lado. Isso impede saber se ha CVEs abertos e impede rebuild reproduzivel.

**Como:** Criar `app/src/main/jni/moonlight-core/libopus/VERSION.txt` com tag do Opus e commit do moonlight-mobile-deps; adicionar `build-opus.sh` no mesmo diretorio de `build-openssl.sh`; registrar SHA-256 dos quatro `.a`. Passo seguinte opcional: substituir o `PREBUILT_STATIC_LIBRARY` (libopus/Android.mk:5) por compilacao a partir de submodulo.

**Risco:** Baixo se limitado a documentacao/checksums. Compilar Opus do fonte no CI aumenta o tempo de build e pode exigir ajustes de flags por ABI (NEON em armeabi-v7a).

### Resync explicito do AudioTrack em vez de descarte cego

**Tamanho:** medium

**Por quê:** O heuristico atual (descartar o sample se pending > 40 ms, AndroidAudioRenderer.java:190-199) nao corrige a causa: o backlog continua la e o padrao se repete, produzindo picotes continuos em vez de um unico salto. Combinado com o flush total da LBQ nativa ao estourar 30 itens (AudioStream.c:151-156), o comportamento sob rede ruim e imprevisivel.

**Como:** Em `AndroidAudioRenderer.playDecodedAudio`, ao cruzar o limiar: `track.pause(); track.flush(); track.play();` e registrar o evento no contador; escrever o sample atual normalmente apos o flush. Derivar o limiar de `samplesPerFrame` (guardado em setup(), AndroidAudioRenderer.java:68) e do buffer real via `track.getBufferSizeInFrames()` em vez do 40 fixo. Opcionalmente expor `LiGetPendingAudioFrames()` (ja existe em AudioStream.c:470) via JNI para decidir com granularidade de pacote.

**Risco:** Medio. Um flush do AudioTrack produz um corte audivel de curta duracao; se o limiar for muito agressivo o resultado pode ser pior que o atual. Precisa de teste sob perda de pacotes simulada (por exemplo, com o dispositivo em Wi-Fi congestionado) e de um limiar conservador inicial.

### Audio focus e reconfiguracao dinamica ao trocar de dispositivo de saida

**Tamanho:** medium

**Por quê:** O app e usado em celular/tablet, onde trocar para fone Bluetooth no meio da sessao e rotina. Hoje o AudioTrack criado para o alto-falante interno sobrevive a troca com um modo low-latency que ja nao faz sentido, e o stream nunca cede foco de audio a chamadas/notificacoes. Nenhuma ocorrencia de requestAudioFocus/AudioDeviceCallback existe no codebase.

**Como:** Em `AndroidAudioRenderer.start()` (linha 203), solicitar `AudioFocusRequest.Builder(AUDIOFOCUS_GAIN)` com os mesmos `AudioAttributes` USAGE_GAME construidos em `createAudioTrack` (linha 29) e abandonar em `stop()` (linha 214). Registrar um `AudioDeviceCallback` no AudioManager e, em add/remove de dispositivo de saida, refazer a cascata de `setup()` (linhas 104-178) — isso exige extrair o loop para um metodo `rebuildTrack()` e sincronizar com a thread AudioDec (a escrita ocorre em `playDecodedAudio`, chamada da thread nativa).

**Risco:** Medio. A recriacao do AudioTrack precisa ser thread-safe em relacao a `track.write()` em andamento (thread AudioDec nativa), sob pena de IllegalStateException ou uso apos release — reforca a necessidade de corrigir antes a falta de null-guards (ver finding correspondente). Ceder audio focus tambem pode surpreender quem espera que o jogo continue tocando durante uma notificacao; deixar configuravel.

### Expor controles de latencia/qualidade de audio nas preferencias

**Tamanho:** medium

**Por quê:** Hoje a duracao do pacote de audio (5 vs 10 ms) e o high quality surround sao decididos exclusivamente por limiares de bitrate de video hardcoded no submodulo (SdpGenerator.c:492-523: >=15000 kbps para HQ surround, <5000 kbps para 10 ms). Um usuario com display virtual do Vibeshine e bitrate alto nao tem como pedir pacotes de 10 ms para economizar banda, nem como declarar que seu device tem decoder lento.

**Como:** Adicionar uma preferencia em `res/xml/preferences.xml` na categoria de audio (linhas 222-239) do tipo "prioridade de audio: latencia / equilibrado / banda". Mapear para as capabilities do renderer: `CAPABILITY_SLOW_OPUS_DECODER` (0x8, Limelight.h:257) forca 10 ms e desabilita HQ surround; sem ela mantem o comportamento atual. Passar o valor de Java ate `callbacks.c:413` via um novo parametro de `startConnection` (analogo ao `videoCapabilities` ja passado em callbacks.c:495), evitando patchear o submodulo.

**Risco:** Medio-baixo. Nao requer fork do moonlight-common-c porque as capabilities ja sao o mecanismo oficial de configuracao. Risco de confundir o usuario com mais uma opcao — mitigar com um summary explicito e default = comportamento atual.

### Migrar a saida de audio para AAudio/Oboe

**Tamanho:** large

**Por quê:** O `AudioTrack` da API Java e o caminho de maior latencia disponivel no Android. A cascata de 4 tentativas em AndroidAudioRenderer.java:104-178 e uma heuristica antiga que tenta arrancar baixa latencia de uma API que nao foi feita para isso, e ainda depende de comparar o sample rate nativo do device (linha 151). AAudio em modo EXCLUSIVE/LOW_LATENCY, com callback pull, elimina a escrita bloqueante do Java e a viagem JNI de PCM por pacote.

**Como:** Implementar um segundo AudioRenderer nativo: em vez de `BridgeArDecodeAndPlaySample` chamar de volta o Java (callbacks.c:269), escrever o PCM decodificado num ring buffer nativo consumido por um callback AAudio. O Java passaria a apenas selecionar a implementacao (via preferencia) e o `AudioRenderer` Java viraria um no-op nesse modo. Manter o caminho AudioTrack como fallback para devices onde AAudio nao entrega modo low latency.

**Risco:** Alto. AAudio exige API 26+ (o minSdk aqui e android-21, Application.mk:4), tem bugs conhecidos de device-specific em disconnect (fone/BT), e exige gerenciamento manual de underrun/xrun. Deve ser opcional e desligado por padrao ate maturar. Tambem torna o pipeline mais dificil de depurar (o PCM nao passa mais pelo Java).

### EPIC: Camada de audio resiliente a mudancas de layout e ciclo de vida (pre-requisito da feature de teclado tipo AnyDesk)

**Tamanho:** epic

**Por quê:** O objetivo n.1 do dono do fork — empurrar/redimensionar o stream quando o teclado virtual abre — esbarra numa arquitetura onde a destruicao da Surface derruba a conexao INTEIRA, audio incluso (Game.java:3832-3844 + ui/StreamContainer.java:249-258). Qualquer prototipo que troque de container, use um modo de render alternativo, ou entre/saia de multi-window vai matar o audio junto com o video e exigir reconexao, arruinando a experiencia que ele quer replicar. Desacoplar o ciclo de vida do audio do ciclo de vida da Surface e o que torna a feature viavel.

**Como:** Fase 1 — Blindar o caminho seguro: usar `windowSoftInputMode="adjustResize"` no `<activity android:name=".Game">` (AndroidManifest.xml:193-216; o configChanges ja cobre keyboardHidden|screenSize|screenLayout, logo a Activity NAO e recriada) e alterar apenas LayoutParams da SurfaceView existente; revisar o `setFixedSize(vw, vh)` de Game.java:900 para acompanhar a area util. Fase 2 — Guard de ciclo de vida: em `Game.surfaceDestroyed` (linha 3832), so chamar `stopConnection()` se `isFinishing() || isChangingConfigurations()==false && realmente saindo`, evitando teardown em transicoes de layout. Fase 3 — Separar os teardowns: hoje `stopAudioStream()` e `stopVideoStream()` sao inseparaveis dentro de `LiStopConnection`; documentar isso e, se necessario, introduzir um modo "video suspenso, audio ativo" (o decoder de video ja tem `prepareForStop()`, Game.java:3839) para que perder a Surface temporariamente nao interrompa o audio. Fase 4 — Testes de regressao cobrindo: abrir/fechar IME, rotacao, split-screen, PiP (`supportsPictureInPicture="true"`, AndroidManifest.xml:197) e external display, verificando em cada um que o log de `BridgeArInit`/`BridgeArCleanup` nao aparece.

**Risco:** Alto. Mexer no guard de `surfaceDestroyed` pode deixar a conexao viva com uma Surface morta, o que trava o decoder de video. A fase 3 pode exigir patch no submodulo moonlight-common-c (divergindo do upstream, com custo de merge futuro). Recomendo entregar as fases 1 e 2 primeiro, medindo com o modo de gravacao de audio habilitado (ver ideia correspondente) para provar que o audio nao e interrompido pelo resize.

### EPIC: Passagem de microfone do cliente para o host

**Tamanho:** epic

**Por quê:** Nao existe nenhuma captura de audio no app — grep por `AudioRecord`, `RECORD_AUDIO` e `MODIFY_AUDIO_SETTINGS` em `app/src/main/java` e no AndroidManifest.xml nao retorna nada. Forks do Sunshine (incluindo a linhagem Apollo/Vibeshine que o dono do fork usa) tem suporte a sink de microfone. Para um cliente que ja mira uso tipo desktop remoto (teclado, texto), voz e o proximo degrau natural.

**Como:** Requer trabalho dos dois lados. Cliente: permissao RECORD_AUDIO, um `AudioRecord` a 48 kHz mono, encoder Opus (a libopus embarcada e decoder-only no uso atual, mas a .a completa normalmente inclui o encoder — verificar simbolos em `libopus/*/libopus.a` antes de assumir), e um novo canal de envio. Transporte: nao existe canal de audio ascendente no protocolo Moonlight atual — `Limelight-internal.h:56-67` lista os canais ENet (generic, urgent, keyboard, mouse, pen, touch, UTF8, serverctl, gamepad, sensor) e nenhum e para audio. Seria preciso um canal novo negociado por feature flag com o host, ou um socket RTP dedicado. Comecar validando o que o Vibeshine/Apollo ja expoe do lado host antes de escrever qualquer linha no cliente.

**Risco:** Muito alto. Envolve mudanca de protocolo (divergencia do moonlight-common-c upstream, com custo de manutencao permanente), permissao sensivel de privacidade (RECORD_AUDIO exige justificativa em lojas de app), verificacao de que o encoder Opus esta presente na .a prebuilt, e um caminho de latencia totalmente novo. So justificavel se o host ja tiver a contraparte pronta.


## Glossário

- AudioTrack: API Java do Android para saida de PCM. Aqui usada em MODE_STREAM com ENCODING_PCM_16BIT; e o unico sink de audio do app. Criada em AndroidAudioRenderer.createAudioTrack (AndroidAudioRenderer.java:28).
- AudioConfiguration (int magico): inteiro que codifica canais e mascara como ((channelMask<<16)|(channelCount<<8)|0xCA). O byte 0xCA e um magic byte validado tanto no Java (MoonBridge.java:156) quanto no C (Connection.c:286) para distinguir de valores hardcoded de versoes antigas. Construido por MAKE_AUDIO_CONFIGURATION (Limelight.h:204).
- surroundAudioInfo: parametro do /launch HTTP enviado ao host, formato channelMask<<16|channelCount (MoonBridge.getSurroundAudioInfo :165, usado em NvHTTP.java:889). Diferente do AudioConfiguration por nao carregar o magic byte.
- localAudioPlayMode: parametro do /launch que pede ao host para TAMBEM tocar o audio nos alto-falantes dele (NvHTTP.java:888). Controlado pela preferencia checkbox_host_audio. Nao tem relacao nenhuma com efeitos de audio no cliente — a confusao entre os dois e exatamente o bug de Game.java:876.
- enableAudioFx: preferencia checkbox_enable_audiofx que abre uma sessao de AudioEffect do sistema (equalizador) sobre a sessao do AudioTrack e, como efeito colateral obrigatorio, desabilita o modo low-latency (AndroidAudioRenderer.java:157-159, porque o pipeline de efeitos do Android e incompativel com low latency ate o Android 13).
- Opus multistream: modo do Opus para >2 canais, onde N canais sao transportados como S streams (alguns 'coupled', isto e, estereo) mais um array de mapping. Parametros vem do host via RTSP DESCRIBE (RtspConnection.c:664 parseOpusConfigFromParamString).
- surround-params: string no SDP do DESCRIBE no formato 'a=fmtp:97 surround-params=<channelCount><streams><coupledStreams><mapping[0..N]>', cada campo um digito. Parseada em RtspConnection.c:759-798. Pode aparecer duas vezes: a primeira e a config normal, a segunda a de high quality.
- AudioPacketDuration: duracao em ms do audio por pacote RTP, 5 ou 10. Decidida em SdpGenerator.c:492-523 e anunciada como x-nv-aqos.packetDuration. Determina samplesPerFrame = 48 * AudioPacketDuration (AudioStream.c:438) e a granularidade de LiGetPendingAudioDuration.
- samplesPerFrame: numero de samples POR CANAL por frame decodificado. 240 a 5 ms, 480 a 10 ms (48 kHz fixo, RtspConnection.c:740). Usado para dimensionar o jshortArray global (callbacks.c:226) e o buffer do AudioTrack (AndroidAudioRenderer.java:96).
- HighQualitySurroundEnabled: modo em que o host envia surround com streams desacoplados e maior bitrate. Ligado em SdpGenerator.c:500 quando bitrate de video >= 15 Mbps, canais > 2, o host suportar e o renderer nao declarar decoder lento. Faz startAudioStream usar HighQualityOpusConfig em vez de NormalQualityOpusConfig (AudioStream.c:426-436).
- CAPABILITY_DIRECT_SUBMIT (0x1): flag que faria o decode acontecer direto na thread de recepcao. Este fork NAO a declara para audio (callbacks.c:413), logo existe uma thread AudioDec separada e uma LinkedBlockingQueue intermediaria — que e justamente o que LiGetPendingAudioDuration mede.
- CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION (0x10): flag declarada por este fork (callbacks.c:413). Significa que o renderer promete ler samplesPerFrame em vez de assumir 240, e habilita o host a usar pacotes de 10 ms em bitrates baixos (SdpGenerator.c:510-513).
- CAPABILITY_SLOW_OPUS_DECODER (0x8): flag NAO declarada aqui. Se declarada, forcaria 10 ms por pacote e proibiria high quality surround (SdpGenerator.c:494,509). E o gancho oficial para expor uma preferencia de 'priorizar banda/CPU'.
- LiGetPendingAudioDuration: API nativa que retorna itens na LBQ * AudioPacketDuration (AudioStream.c:474-476). Exposta via JNI em simplejni.c:172 e usada como UNICO sinal de backpressure pelo cliente (AndroidAudioRenderer.java:191). Nao inclui o que ja esta bufferizado dentro do AudioTrack.
- LBQ (LinkedBlockingQueue nativa): fila entre a thread AudioRecv e a AudioDec, limitada a 30 itens (AudioStream.c:69). Ao estourar, descarta TODOS os itens (AudioStream.c:151-156), nao apenas o mais antigo.
- RTP_AUDIO_QUEUE / FEC block: estrutura de reordenacao e recuperacao com Reed-Solomon 4 data + 2 paridade (RtpAudioQueue.h:11-13). O tempo maximo de espera por pacote fora de ordem e AudioPacketDuration*4 + 10 ms (RtpAudioQueue.c:534), contribuicao direta ao budget de latencia de audio.
- allowDiscontinuity: flag do bloco FEC que autoriza entregar o audio disponivel mesmo com buracos (RtpAudioQueue.c:546). Os buracos viram pacotes de tamanho 0, que AudioStream.c:166-168 converte em decodeAndPlaySample(NULL,0), acionando o PLC (packet loss concealment) do Opus.
- PLC (Packet Loss Concealment): sintese de audio pelo proprio Opus quando se chama opus_multistream_decode com data=NULL. Aqui e o caminho de AudioStream.c:167 -> callbacks.c:259 com sampleData NULL.
- AudioEncryptionEnabled: quando true, cada pacote de audio e AES-128-CBC com IV = BE32(avRiKeyId + sequenceNumber) (AudioStream.c:186-197). Ligado em SdpGenerator.c:196 porque callbacks.c:482 sempre pede ENCFLG_AUDIO; vira ENCFLG_ALL se o CPU tiver AES por hardware (callbacks.c:498).
- bridgeAr* : familia de metodos estaticos Java (bridgeArInit/Start/Stop/Cleanup/PlaySample, MoonBridge.java:231-263) invocados pelo C via CallStaticVoidMethod/CallStaticIntMethod. Sao o unico ponto de entrada do audio no mundo Java — o Opus nunca chega ate la, so PCM.
- DecodedAudioBuffer: jshortArray global alocado uma unica vez no init (callbacks.c:226) com channelCount*samplesPerFrame shorts, reutilizado a cada pacote via GetPrimitiveArrayCritical. E o buffer cujo comprimento efetivo se perde (ver finding sobre decodeLen).
- AudioPingThread: thread que envia um ping UDP a cada 500 ms para a porta de audio (AudioStream.c:38-65). Precisa comecar ANTES do handshake RTSP porque GFE 3.22 nao responde ao PLAY sem ele (comentario em AudioStream.c:94).
- packetsToDrop: resync inicial que descarta 500/AudioPacketDuration pacotes de dados no comeco do stream (AudioStream.c:248), mais um ajuste pelo tempo decorrido (linha 302), para nao tocar o backlog acumulado pelo host antes do cliente estar pronto.
- StreamContainer: view custom do fork (ui/StreamContainer.java) que embrulha a SurfaceView e tem modos 2D e estereo. Encaminha surfaceCreated/Changed/Destroyed para o Game (linhas 236-258) — e por onde uma feature de resize por teclado passaria, e onde mora o risco de destruir a Surface e matar o audio.
