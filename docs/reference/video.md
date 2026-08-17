# Pipeline de Vídeo e Decodificação (MediaCodec + Surface + Stereo3D)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (25)
6. [Ideias de melhoria](#ideias-de-melhoria) (14)
7. [Glossário](#glossário)

## Como funciona

O pipeline de vídeo do Artemis vai do callback JNI `BridgeDrSubmitDecodeUnit` (app/src/main/jni/moonlight-core/callbacks.c:146) até um `Surface` fornecido por `StreamContainer`. A classe central é `MediaCodecDecoderRenderer` (2433 linhas), que estende `VideoDecoderRenderer` e implementa `Choreographer.FrameCallback`. A seleção de decoder acontece no construtor (MediaCodecDecoderRenderer.java:365-454): `findAvcDecoder()`, `findHevcDecoder()` e `findAv1Decoder()` delegam para `MediaCodecHelper.findProbableSafeDecoder()`, que faz duas rodadas sobre `MediaCodecList.REGULAR_CODECS` — a primeira só aceita decoders com `FEATURE_LowLatency` (MediaCodecHelper.java:1018-1064), resolvendo a errata #15 (Pixel 4 / Galaxy S21 Exynos têm decoders low-latency listados depois dos normais). HEVC exige whitelist por prefixo de SoC, media performance class >= S, ou `FEATURE_LowLatency` (MediaCodecHelper.java:812-849); AV1 só é usado se o usuário forçar `FORCE_AV1` (MediaCodecDecoderRenderer.java:329-333). `MediaCodecHelper.initialize()` (linha 336) ajusta listas em runtime com base no `glRenderer` string (Adreno 3xx = HEVC ruim, Adreno x0x = low-end sem RFI 1080p, PowerVR = MTK HEVC ok) e no fabricante (Amazon Fire OS libera MTK/Amlogic). O `MediaFormat` é montado em `createBaseMediaFormat()` (linha 535) com frame rate, `KEY_MAX_WIDTH/HEIGHT` para adaptive playback e chaves de cor (`KEY_COLOR_RANGE`, `KEY_COLOR_STANDARD`, `KEY_COLOR_TRANSFER`), essas últimas omitidas em streams 10-bit para o decoder detectar transições HDR sozinho. As flags de baixa latência são aplicadas incrementalmente por `MediaCodecHelper.setDecoderLowLatencyOptions()` (linha 533) num loop de tentativas (MediaCodecDecoderRenderer.java:756-778) que vai da opção mais arriscada para a mais conservadora: `low-latency` (Android 11), `vdec-lowlatency` (MTK/Amlogic/Amazon), `KEY_OPERATING_RATE=Short.MAX_VALUE` ou `KEY_PRIORITY=0`, e depois extensões de fornecedor (`vendor.qti-ext-dec-low-latency.enable`, fences de software da Qualcomm, preset MTK completo, Kirin, Exynos, Amlogic). HDR10 entra via `setHdrMode()` (linha 1649), que só guarda os metadados e agenda um RESTART do codec; o InfoFrame CTA-861.3 de 25 bytes é montado em `configureAndStartDecoder()` (linhas 579-605) e injetado como `KEY_HDR_STATIC_INFO`. A entrada de dados passa por `submitDecodeUnit()` (linha 1743), que faz patching pesado do SPS H.264 com jcodec (`level_idc` rebaixado, `num_ref_frames=1`, `max_dec_frame_buffering`, `bitstream_restriction`, hack baseline para Intel, constrained-high para Intel) e agrupa VPS/SPS/PPS num único buffer `BUFFER_FLAG_CODEC_CONFIG`, opcionalmente fundido com o IDR quando o decoder suporta `FEATURE_AdaptivePlayback` (fusedIdrFrame). A saída tem DOIS caminhos concorrentes dentro do mesmo `while (!stopping)` da renderer thread (linha 1211): um caminho "LATEST_ONLY_LOW_LATENCY" (linhas 1212-1247) que dreno não-bloqueante e apresenta só o frame mais novo, e o caminho clássico (1250-1476) com modos de pacing (MIN_LATENCY / BALANCED / CAP_FPS / MAX_SMOOTHNESS). No modo BALANCED os buffers vão para uma `LinkedBlockingQueue` de no máximo 2 (linha 186) consumida por `doFrame()` no Choreographer, rodando numa `HandlerThread` própria com prioridade URGENT_DISPLAY (linha 1142). Recuperação de erro é feita por uma máquina de estados de 4 níveis (FLUSH → RESTART → RESET → recriar) com quiesce de 3 threads via flags e monitor (linhas 809-952). Estatísticas ficam em `VideoStats` (janelas de ~1s, ativa/última/global) e alimentam o perf overlay montado dentro de `submitDecodeUnit()` (linhas 1773-1893). O dimensionamento da tela é responsabilidade de `StreamContainer` (FrameLayout), cujo `onMeasure()` (StreamContainer.java:113-150) aplica letterbox/pillarbox conforme `desiredAspectRatio` e `fillDisplay`, definidos em `Game.prepareDisplayForRendering()` (Game.java:1619-1625). O modo 3D substitui a `SurfaceView` por uma `GLSurfaceView` com `Stereo3DRenderer`, que recebe o vídeo numa `SurfaceTexture` OES, roda um modelo MiDaS TFLite 256x256 para depth map, aplica blur gaussiano em dois passes e renderiza DIBR side-by-side com dois viewports.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java`](../../app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java) | 2433 | Coração do pipeline. Seleciona decoder, monta MediaFormat, faz patching de SPS/CSD, alimenta o MediaCodec, roda o loop de saída com frame pacing, coleta estatísticas, monta o texto do perf overlay e implementa a máquina de recuperação de codec. Contém código de vários forks sobrepostos (ALONSOJR1980, derflacco, comentários em italiano/alemão/chinês), com caminhos duplicados e mortos. |
| [`app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java`](../../app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java) | 1195 | Base de conhecimento de errata por device/SoC. Mantém listas estáticas de prefixos (blacklist, whitelist HEVC, RFI AVC/HEVC, direct submit, adaptive playback, slices) ajustadas em runtime por GPU/fabricante, e centraliza a aplicação das flags de baixa latência (padrão Android + extensões de fornecedor). |
| [`app/src/main/java/com/limelight/ui/StreamContainer.java`](../../app/src/main/java/com/limelight/ui/StreamContainer.java) | 273 | FrameLayout que hospeda a SurfaceView (2D) ou GLSurfaceView (3D), decide o dimensionamento por aspect-ratio em onMeasure(), gerencia o ciclo de vida do Surface e expõe os callbacks de entrada (incluindo commitText do IME). É AQUI que o redimensionamento do stream quando o teclado abre deve ser resolvido. |
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4349 | Activity de streaming. Decide resolução (incluindo inversão em retrato), cria o MediaCodecDecoderRenderer, sobrescreve o modo de frame pacing, negocia refresh rate/display mode, define aspect ratio no StreamContainer, aplica setFixedSize/setFrameRate na SurfaceView e implementa PerfOverlayListener. Ponto de integração entre pipeline de vídeo e UI. |
| [`app/src/main/java/com/limelight/utils/Stereo3DRenderer.java`](../../app/src/main/java/com/limelight/utils/Stereo3DRenderer.java) | 1148 | Renderer OpenGL ES 3 para os modos 3D. Recebe o vídeo decodificado numa SurfaceTexture OES, executa MiDaS v2 (TFLite int8, 256x256) num pool de threads, suaviza o depth map com OpenCV, aplica blur gaussiano de dois passes numa FBO e desenha DIBR estéreo side-by-side. Quando ativo, é ele quem fornece o Surface ao decoder, não a SurfaceView. |
| [`app/src/main/java/com/limelight/binding/video/VideoStats.java`](../../app/src/main/java/com/limelight/binding/video/VideoStats.java) | 92 | Contadores simples de janela (decoderTimeMs, totalTimeMs, frames recebidos/renderizados/perdidos, latência de processamento do host). Três instâncias: activeWindow, lastWindow e global. Sem sincronização — escrito por 3 threads. |
| [`app/src/main/java/com/limelight/ui/StreamView.java`](../../app/src/main/java/com/limelight/ui/StreamView.java) | 167 | Implementação LEGADA de SurfaceView com aspect-ratio e commitText. Não é referenciada por nenhum layout nem código — foi substituída por StreamContainer. Candidata a remoção (só confunde agentes que procurem 'onde o stream é dimensionado'). |
| [`app/src/main/jni/moonlight-core/callbacks.c`](../../app/src/main/jni/moonlight-core/callbacks.c) | 420 | Ponte JNI entre moonlight-common-c e MoonBridge. BridgeDrSubmitDecodeUnit fatia a DECODE_UNIT: NALUs de parameter set vão em chamadas separadas (offset 0) e os PICDATA são concatenados num único byte[] global que cresce sob demanda (inicialmente 32 KB). |
| [`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`](../../app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java) | 0 | Constantes de formato/colorspace/capabilities e despacho estático dos callbacks nativos para o VideoDecoderRenderer registrado. |
| [`app/src/main/java/com/limelight/utils/PanZoomHandler.java`](../../app/src/main/java/com/limelight/utils/PanZoomHandler.java) | 173 | Aplica scaleX/scaleY/X/Y diretamente na SurfaceView (filho do StreamContainer) para pinch-zoom e pan. Reage a Game.surfaceChanged() via handleSurfaceChange(). Importante para qualquer mudança de layout: se o container encolher, a matemática de bounds precisa ser reexecutada. |
| [`decoder-errata.txt`](../../decoder-errata.txt) | 40 | Documento de referência (16 itens) que explica POR QUE cada workaround existe no MediaCodecHelper/MediaCodecDecoderRenderer. Leitura obrigatória antes de mexer em blacklists ou no patching de SPS. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java`**
- `preferLowerDelays (campo) :49`
- `forceTightThresholds (write-only) :53`
- `enqueueNsByPtsUs LongSparseArray :58`
- `releaseWithPolicy() :67`
- `getOutputDequeueTimeoutUs() :83`
- `updateDecodeLatencyStats() :86`
- `USE_FRAME_RENDER_TIME=false :103`
- `outputBufferQueue + OUTPUT_BUFFER_QUEUE_LIMIT=2 :185`
- `findAvcDecoder() :199`
- `decoderCanMeetPerformancePoint() :208`
- `findHevcDecoder() :288`
- `findAv1Decoder() :329`
- `setRenderTarget() :361`
- `construtor (seleção de decoders) :365`
- `isHevcMain10Hdr10Supported() :464`
- `isAv1Main10Supported() :483`
- `getPreferredColorSpace() :498`
- `getPreferredColorRange() :514`
- `createBaseMediaFormat() :535`
- `configureAndStartDecoder() :577`
- `HDR static info CTA-861.3 :581`
- `videoDecoder.configure() :609`
- `setVideoScalingMode(SCALE_TO_FIT) :636`
- `tryConfigureDecoder() :657`
- `initializeDecoder() :688`
- `loop de tentativas low-latency :756`
- `setup() :797`
- `doCodecRecoveryIfRequired() :809`
- `handleDecoderException() :954`
- `doFrame() (Choreographer) :1068`
- `startChoreographerThread() :1135`
- `startRendererThread() :1155`
- `bloco LATEST_ONLY_LOW_LATENCY :1212`
- `dequeueOutputBuffer + backoff :1252`
- `pacing MAX_SMOOTHNESS/CAP_FPS :1295`
- `pacing MIN_LATENCY (drop adaptativo) :1354`
- `enfileiramento BALANCED :1430`
- `watchdog C2 (fora do loop) :1479`
- `fetchNextInputBuffer() :1501`
- `prepareForStop() :1582`
- `stop() :1612`
- `cleanup() :1644`
- `setHdrMode() :1649`
- `queueNextInputBuffer() :1679`
- `doProfileSpecificSpsPatching() :1726`
- `submitDecodeUnit() :1743`
- `montagem do perf overlay :1773`
- `patching de SPS H.264 :1900`
- `submissão de CSD agrupado :2062`
- `fused IDR :2136`
- `replaySps() :2179`
- `getCapabilities() :2205`
- `getAverageEndToEndLatency() :2231`
- `RendererException.generateText() :2289`
- `applySurfaceFrameRate() :2412`
- `isMTKDecoderName() (morto) :2428`

**`app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java`**
- `SHOULD_BYPASS_SOFTWARE_BLOCK :51`
- `directSubmitPrefixes :59`
- `refFrameInvalidationAvc/HevcPrefixes :77`
- `blacklistedDecoderPrefixes :91`
- `spsFixupBitstreamFixupDecoderPrefixes :117`
- `blacklistedAdaptivePlaybackPrefixes :125`
- `constrainedHighProfilePrefixes :133`
- `whitelistedHevcDecoders :138`
- `useFourSlicesPrefixes :209`
- `knownVendorLowLatencyOptions :221`
- `qualcomm/tegra/mtk/kirin/exynos/amlogic prefixes :230-271`
- `initialize(Context, glRenderer) :336`
- `isDecoderInList() :453`
- `decoderSupportsAndroidRLowLatency() :470`
- `decoderSupportsKnownVendorLowLatencyOption() :486`
- `decoderSupportsMaxOperatingRate() :515`
- `setDecoderLowLatencyOptions() :533`
- `bloco NVIDIA sem guard de tryNumber :541`
- `bloco Qualcomm (fences SW) :602`
- `preset MTK :636`
- `decoderSupportsFusedIdrFrame() :704`
- `decoderSupportsAdaptivePlayback() :720`
- `getDecoderOptimalSlicesPerFrame() :758`
- `decoderSupportsRefFrameInvalidationAvc() :769`
- `decoderSupportsRefFrameInvalidationHevc() :784`
- `decoderIsWhitelistedForHevc() :812`
- `isDecoderWhitelistedForAv1() :851`
- `findFirstDecoder() :955`
- `findProbableSafeDecoder() :986`
- `findKnownSafeDecoder() (2 rodadas) :1009`
- `isExynos4Device() :1087`
- `safeSet() :1128`
- `applyExtraVendorOptions() (nunca chamado) :1161`

**`app/src/main/java/com/limelight/ui/StreamContainer.java`**
- `InputCallbacks (interface) :28`
- `StreamMode enum :36`
- `init() :65`
- `criação da SurfaceView 2D :83`
- `criação da GLSurfaceView 3D :87`
- `setDesiredAspectRatio() :103`
- `setFillDisplay() :108`
- `onMeasure() (letterbox/pillarbox) :113`
- `onCheckIsTextEditor() :181`
- `onCreateInputConnection() (commitText) :186`
- `getSurface() :211`
- `getSurfaceView() :215`
- `surfaceChanged() :240`
- `onStereo3DSurfaceReady() :261`

**`app/src/main/java/com/limelight/Game.java`**
- `displayWidth/displayHeight + inversão :399-432`
- `layoutInDisplayCutoutMode :439`
- `streamContainer.init() :459`
- `PanZoomHandler (zoom/pan sobre a SurfaceView) :481`
- `MediaCodecHelper.initialize() :598`
- `checklist HDR10 :601`
- `new MediaCodecDecoderRenderer() :645`
- `setForceTightThresholds via reflexão :673`
- `override de framePacing para BALANCED :690-705`
- `supportedVideoFormats :722`
- `prepareDisplayForRendering() :1455`
- `decisão de aspect ratio / setDesiredAspectRatio :1600-1625`
- `setOnSurfaceAvailable -> setRenderTarget + conn.start :867`
- `setFixedSize + setFrameRate por reflexão :890-934`
- `getPictureInPictureParams() :1288`
- `toggleKeyboard() :2402`
- `surfaceChanged() :3779`
- `surfaceCreated() + Surface.setFrameRate :3795`
- `surfaceDestroyed() :3831`
- `onPerfUpdate() :3931`
- `handleCommitText() :4290`
- `findFirstSurfaceViewFrom() :4337`

**`app/src/main/java/com/limelight/utils/Stereo3DRenderer.java`**
- `AI_MODEL midas-midas-v2-w8a8.tflite :55`
- `modelInputWidth/Height=256 :56`
- `isMovieMode :64`
- `estatísticas estáticas (fps/threeDFps/drawDelay/renderer) :68-73`
- `construtor :144`
- `onSurfaceDestroyed() :160`
- `onFrameAvailable() :227`
- `onSurfaceCreated() (cria videoSurface) :236`
- `applyTwoPassGaussianBlur() :304`
- `drawBothEyes() (split de viewport) :348`
- `drawEye() :361`
- `onDrawFrame() :413`
- `busy-wait do depth map em movie mode :464`
- `uploadLatestDepthMapToGpu() :538`
- `readPixelsForAI() (glReadPixels síncrono) :647`
- `readPixelsForAI_Async() (PBO, não usado) :660`
- `initializeTfLite() (GPU->NNAPI->CPU) :689`
- `onSurfaceChanged() :755`
- `hasSceneChangedFast() :940`
- `AiTask :976`
- `AiResultHandling :1044`

**`app/src/main/java/com/limelight/binding/video/VideoStats.java`**
- `add() :20`
- `copy() :45`
- `clear() :60`
- `getFps() :75`
- `VideoStatsFps :88`

**`app/src/main/java/com/limelight/ui/StreamView.java`**
- `onMeasure() :62`
- `onCreateInputConnection() :131`
- `InputCallbacks :159`

**`app/src/main/jni/moonlight-core/callbacks.c`**
- `BridgeDrSetup() :107`
- `BridgeDrStart() :126`
- `BridgeDrStop() :132`
- `BridgeDrCleanup() :138`
- `BridgeDrSubmitDecodeUnit() :146`
- `realocação do DecodedFrameBuffer :151`
- `DECODER_RENDERER_CALLBACKS :400`

**`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`**
- `VIDEO_FORMAT_* :14-18`
- `VIDEO_FORMAT_MASK_* :20-23`
- `BUFFER_TYPE_* :25-28`
- `FRAME_TYPE_IDR :31`
- `COLORSPACE_REC_* :33-35`
- `COLOR_RANGE_* :37-38`
- `CAPABILITY_* :40-43`
- `DR_OK / DR_NEED_IDR :45-46`
- `CAPABILITY_SLICES_PER_FRAME() :136`
- `bridgeDrSetup() :191`
- `bridgeDrSubmitDecodeUnit() :217`
- `bridgeClSetHdrMode() :307`

**`app/src/main/java/com/limelight/utils/PanZoomHandler.java`**
- `MAX_SCALE=10 :14`
- `updateDimensions() :47`
- `constrainToBounds() :54`
- `handleSurfaceChange() :79`
- `ScaleListener.onScale() :113`
- `setInitialZoomAndPan() :159`

**`decoder-errata.txt`**
- `errata 1 num_ref_frames=16`
- `errata 11 RFI 1080p Snapdragon low-end`
- `errata 12 adaptive playback MTK HEVC`
- `errata 15 FEATURE_LowLatency não está no 1o decoder`
- `errata 16 chaves mágicas de fornecedor`

</details>

## Fluxo

1) SETUP: moonlight-common-c chama `BridgeDrSetup` (callbacks.c:107) -> `MoonBridge.bridgeDrSetup` -> `MediaCodecDecoderRenderer.setup(format,w,h,redrawRate)` (MediaCodecDecoderRenderer.java:797). Aqui `targetFps`, `initialWidth/Height` (com re-inversão por `invertResolution`, :800-801), `videoFormat` e `refreshRate` são fixados e `initializeDecoder(false)` (:688) é chamado. 2) ESCOLHA DE MIME: :692-752 mapeia VIDEO_FORMAT_MASK_H264/H265/AV1 para "video/avc"/"video/hevc"/"video/av01" e ativa fixups específicos de H.264 (needsSpsBitstreamFixup, needsBaselineSpsHack, constrainedHighProfile, isExynos4). 3) CONFIGURAÇÃO: loop `for(tryNumber=0;;tryNumber++)` (:756) monta `createBaseMediaFormat()` (:535), aplica `MediaCodecHelper.setDecoderLowLatencyOptions()` (MediaCodecHelper.java:533) e tenta `tryConfigureDecoder()` (:657) -> `MediaCodec.createByCodecName` + `configureAndStartDecoder()` (:577), que injeta `KEY_HDR_STATIC_INFO` (:581-601), chama `configure(format, renderTarget, null, 0)` (:609), `applySurfaceFrameRate()` (:611), `setVideoScalingMode(SCALE_TO_FIT)` (:636) e `start()` (:639). 4) SURFACE: o `renderTarget` veio de `Game`: `streamContainer.setOnSurfaceAvailable(...)` (Game.java:867) chama `decoderRenderer.setRenderTarget(streamContainer.getSurface())` (:873) e só então `conn.start(...)`. Em 2D o Surface vem de `SurfaceHolder` (StreamContainer.java:242); em 3D vem da `SurfaceTexture` OES criada em `Stereo3DRenderer.onSurfaceCreated` (Stereo3DRenderer.java:240) e entregue por `onStereo3DSurfaceReady` (StreamContainer.java:261). 5) ENTRADA: `BridgeDrSubmitDecodeUnit` (callbacks.c:146) percorre a lista de buffers da DECODE_UNIT: cada NALU de parameter set (SPS/PPS/VPS) vira uma chamada Java isolada, e todos os PICDATA são concatenados num único array antes da chamada final (callbacks.c:189). 6) SUBMISSÃO: `submitDecodeUnit()` (:1743) contabiliza perdas de frame por descontinuidade de `frameNumber` (:1755-1761), rola a janela de estatísticas a cada 1000 ms (:1773-1893), e para IDR acumula VPS/SPS/PPS em listas (:1900-2061) — o SPS H.264 é desserializado por `H264Utils.readSPS`, patchado (level_idc :1918-1935, num_ref_frames=1 :1947-1950, VUI/bitstream_restriction :1966-2009, baseline hack :2012-2016, constraint flags :2019) e reserializado. No primeiro buffer PICDATA do IDR o CSD agrupado é enfileirado com `BUFFER_FLAG_CODEC_CONFIG` (:2081); com `fusedIdrFrame` o CSD é reconcatenado dentro do próprio buffer do IDR (:2136-2146). 7) BUFFER DE ENTRADA: `fetchNextInputBuffer()` (:1501) faz `dequeueInputBuffer(10000)` em loop; `queueNextInputBuffer()` (:1679) chama `queueInputBuffer` com PTS derivado de `enqueueTimeMs*1000` forçado a ser estritamente crescente (:2149-2155) e registra o instante de enfileiramento em `enqueueNsByPtsUs` (:1688). 8) SAÍDA: a renderer thread (`startRendererThread()`, :1155, prioridade URGENT_DISPLAY) roda `while(!stopping)`. Primeiro o bloco LATEST_ONLY (:1212-1247), ativo quando `preferLowerDelays==false`, drena com timeout 0 µs descartando todos menos o último e apresenta imediatamente via `releaseWithPolicy` (:67), atualizando `updateDecodeLatencyStats` e dando `continue`. Se nada foi drenado, cai no caminho clássico: `dequeueOutputBuffer(info, getOutputDequeueTimeoutUs())` (:1252) com retry de backoff 250/500 µs (:1256-1258). Em pacing != BALANCED, drena até o último frame e decide drop por idade do frame contra um limiar adaptativo (`factorSmooth` :1304 para MAX_SMOOTHNESS/CAP_FPS, `factorLatency` :1364 para MIN_LATENCY) e apresenta com `releaseOutputBuffer(index, nowNs)`. Em BALANCED, o índice vai para `outputBufferQueue` (limite 2, descartando o mais velho, :1439-1449). 9) PACING: `doFrame()` (:1068) roda na thread do Choreographer, subtrai `getAppVsyncOffsetNanos()` (:1076), só apresenta se passou >= 80% do período do stream (:1082), faz `poll()` na fila e `releaseOutputBuffer(index, frameTimeNanos)`, incrementando `totalFramesRendered` (:1113), e re-posta o callback (:1132). 10) RECUPERAÇÃO: qualquer `IllegalStateException`/`CodecException` cai em `handleDecoderException()` (:954), que classifica em FLUSH/RESTART/RESET; as três threads (input, render, choreographer) marcam suas flags em `doCodecRecoveryIfRequired()` (:809) e a última executa a recuperação com todas quiesced. 11) DIMENSIONAMENTO: `Game.prepareDisplayForRendering()` (:1455) escolhe display mode/refresh rate e, se o modo não é STRETCH e não há match exato de aspect ratio, chama `streamContainer.setDesiredAspectRatio(displayWidth/displayHeight)` e `setFillDisplay(FILL)` (:1621-1622). `StreamContainer.onMeasure()` (:113-150) então calcula measuredWidth/Height letterboxando dentro do espaço disponível e propaga um MeasureSpec EXACTLY aos filhos (:147-149). Separadamente, `Game` (:890-934) localiza a primeira SurfaceView da árvore e aplica `getHolder().setFixedSize(prefConfig.width, prefConfig.height)` + `setFrameRate` por reflexão. `PanZoomHandler` sobrepõe scale/translate na própria SurfaceView (PanZoomHandler.java:129-133). 12) HDR EM RUNTIME: host -> `bridgeClSetHdrMode` -> `Game.setHdrMode` (:3763) -> `MediaCodecDecoderRenderer.setHdrMode` (:1649), que só guarda `currentHdrMetadata` e promove o estado de recuperação para RESTART; a reconfiguração real ocorre no próximo `doCodecRecoveryIfRequired()`. 13) 3D: `Stereo3DRenderer.onFrameAvailable` (:227) marca o frame e pede render; `onDrawFrame` (:413) faz `updateTexImage()`, renderiza um quad 256x256 numa FBO, lê os pixels (`glReadPixels` síncrono, :653), enfileira para `AiTask` (MiDaS TFLite), recebe o depth map suavizado por `AiResultHandling` (OpenCV normalize + blend temporal), sobe para a textura (:538), aplica blur em dois passes (:304) e desenha os dois olhos em meia largura cada (:348-359).

## Interfaces externas

- android.media.MediaCodec (createByCodecName, configure, start, flush, stop, reset, release, dequeue/queueInputBuffer, dequeue/releaseOutputBuffer com timestamp, setParameters, setOnFrameRenderedListener, getSupportedVendorParameters)
- android.media.MediaCodecInfo / MediaCodecList(REGULAR_CODECS) / CodecCapabilities (FEATURE_LowLatency, FEATURE_AdaptivePlayback, isSoftwareOnly, isHardwareAccelerated, isAlias, profileLevels, VideoCapabilities.PerformancePoint, getAchievableFrameRatesFor, areSizeAndRateSupported)
- android.media.MediaFormat (KEY_FRAME_RATE, KEY_MAX_WIDTH/HEIGHT, KEY_COLOR_RANGE/STANDARD/TRANSFER, KEY_HDR_STATIC_INFO, KEY_OPERATING_RATE, KEY_PRIORITY, KEY_LOW_LATENCY via string "low-latency")
- Chaves de fornecedor OMX/Codec2: vendor.qti-ext-dec-low-latency.enable, vendor.qti-ext-dec-picture-order.enable, vendor.qti-ext-output-sw-fence-enable.value, vendor.qti-ext-output-fence.enable/fence_type, vendor.hisi-ext-low-latency-video-dec.*, vendor.rtc-ext-dec-low-latency.enable, vendor.low-latency.enable, vdec-lowlatency, media.low-latency.enable, disable-output-reorder, vendor.mtk.vdec.* (MediaCodecHelper.java:533-702, 1161-1193)
- android.view.Choreographer (postFrameCallback / FrameCallback) para frame pacing BALANCED
- android.view.Surface / SurfaceHolder / SurfaceView (setFixedSize, setFrameRate FRAME_RATE_COMPATIBILITY_FIXED_SOURCE / DEFAULT, CHANGE_FRAME_RATE_ALWAYS, setZOrderOnTop/MediaOverlay)
- android.opengl.GLSurfaceView + GLES20/GLES30 (FBO, PBO glMapBufferRange, GL_TEXTURE_EXTERNAL_OES 0x8D65) e android.graphics.SurfaceTexture
- android.view.Display / DisplayManager / WindowManager (getMode, getSupportedModes, getRefreshRate, getAppVsyncOffsetNanos, HdrCapabilities.HDR_TYPE_HDR10, preferredDisplayModeId, preferredRefreshRate)
- android.app.PictureInPictureParams (setAspectRatio, setSourceRectHint, setAutoEnterEnabled, setSeamlessResizeEnabled)
- android.net.TrafficStats via TrafficStatsHelper (bytes Rx/Tx por UID no perf overlay)
- org.jcodec.codecs.h264 (H264Utils.readSPS/writeSPS, SeqParameterSet, VUIParameters.BitstreamRestriction) para patching Annex B de SPS
- TensorFlow Lite: org.tensorflow.lite.Interpreter, gpu.GpuDelegate/GpuDelegateFactory, nnapi.NnApiDelegate (modelo midas-midas-v2-w8a8.tflite em assets)
- OpenCV (org.opencv.core.Core/Mat/CvType/Scalar, imgproc.Imgproc: cvtColor, Sobel, calcHist, compareHist, threshold, normalize) para suavização do depth map
- JNI moonlight-core -> moonlight-common-c: DECODER_RENDERER_CALLBACKS (setup/start/stop/cleanup/submitDecodeUnit/capabilities), CAPABILITY_DIRECT_SUBMIT, CAPABILITY_REFERENCE_FRAME_INVALIDATION_AVC/HEVC/AV1, CAPABILITY_SLICES_PER_FRAME, DR_OK/DR_NEED_IDR
- Especificação CTA-861.3 (HDMI Dynamic Range and Mastering InfoFrame, 25 bytes little-endian) montada manualmente em MediaCodecDecoderRenderer.java:581-601
- Build.SOC_MANUFACTURER/SOC_MODEL e Build.VERSION.MEDIA_PERFORMANCE_CLASS (Android S+) para heurísticas de decoder
- /proc/cpuinfo e /sys/devices/system (detecção de Exynos 4 em MediaCodecHelper.java:1087)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🔴 crítico | bug | Loop infinito de configuração do decoder em SoCs NVIDIA e MediaTek | `app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:541 e :672 (loop em MediaCodecDecoderRenderer.java:756)` |
| 🟠 alto | bug | framePacing escolhido pelo usuário é sobrescrito para BALANCED em todos os casos | `app/src/main/java/com/limelight/Game.java:696 e :702` |
| 🟠 alto | bug | Caminho LATEST_ONLY tem a condição invertida e faz bypass do Choreographer, corrompendo o pacing e as estatísticas | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1213` |
| 🟠 alto | bug | Caminho LATEST_ONLY pula doCodecRecoveryIfRequired(), podendo travar a recuperação de codec | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1243` |
| 🟠 alto | bug | enqueueNsByPtsUs (LongSparseArray) é acessado de duas threads sem sincronização e vaza entradas | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:58, :87-89, :1688` |
| 🟡 médio | bug | Watchdog de decoder C2 está fora do while loop e nunca executa | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1479-1494` |
| 🟡 médio | bug | setFixedSize usa prefConfig.width/height, ignorando a inversão de resolução em retrato | `app/src/main/java/com/limelight/Game.java:898-900` |
| 🟡 médio | bug | findFirstSurfaceViewFrom() encontra a SurfaceView descartada nos modos 3D | `app/src/main/java/com/limelight/Game.java:894 (helper em :4337) + app/src/main/java/com/limelight/ui/StreamContainer.java:83-93` |
| 🟡 médio | tech-debt | ewmaJitterNs nunca é atualizado, tornando toda a lógica de drop 'adaptativa' uma constante | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1207 (usado em :1303 e :1364)` |
| 🟡 médio | ux | Nenhum tratamento de WindowInsets/IME: o teclado virtual cobre o stream em vez de redimensioná-lo | `app/src/main/AndroidManifest.xml:193-203 (activity .Game) + app/src/main/java/com/limelight/Game.java:359-369` |
| 🟡 médio | bug | NullPointerException em Stereo3DRenderer.initializeTfLite() se a criação do delegate falhar | `app/src/main/java/com/limelight/utils/Stereo3DRenderer.java:704 e :713` |
| 🟡 médio | performance | Busy-wait com Thread.sleep(1) na thread GL bloqueia o pipeline em movie mode | `app/src/main/java/com/limelight/utils/Stereo3DRenderer.java:464-470` |
| 🟡 médio | maintainability | drawBothEyes() lê glSurfaceView.getWidth()/getHeight() da thread GL em vez de usar onSurfaceChanged | `app/src/main/java/com/limelight/utils/Stereo3DRenderer.java:349-350 (vs. onSurfaceChanged em :755-758)` |
| 🟡 médio | bug | Exceção fatal quando o decode unit não cabe no input buffer, em vez de pedir IDR | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:2159-2167` |
| 🟡 médio | performance | doFrame() consulta o WindowManager a cada vsync a partir de uma thread não-UI | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1076` |
| ⚪ baixo | tech-debt | forceTightThresholds: campo write-only lido por reflexão desnecessária | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:53-55 + app/src/main/java/com/limelight/Game.java:673-688` |
| ⚪ baixo | tech-debt | MediaCodecHelper.applyExtraVendorOptions() e isMTKDecoderName() são código morto | `app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:1161-1193 e app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:2428-2432` |
| ⚪ baixo | tech-debt | Código pré-Lollipop extenso e inalcançável (minSdk é 21) | `app/build.gradle:11 (minSdk 21) vs. MediaCodecDecoderRenderer.java:107, :652-654, :1101-1110, :1337-1351, :1411-1425, :1531-1536` |
| ⚪ baixo | tech-debt | notifyVideoForeground/notifyVideoBackground não têm efeito nenhum | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:141, :523-529` |
| ⚪ baixo | bug | Divisões sem guarda no perf overlay podem gerar NaN/Infinity | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1791, :1816, :1854` |
| ⚪ baixo | compatibility | getPreferredColorSpace() nunca retorna REC_2020, mesmo em HDR10 | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:498-512 (switch em :560-570)` |
| ⚪ baixo | tech-debt | AV1 só é considerado com FORCE_AV1; a lista preferredDecoders está permanentemente vazia | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:330-333 e app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:87-88` |
| ⚪ baixo | bug | cleanup() e stop() não verificam null, podendo mascarar a causa raiz de uma falha de setup | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1633 e :1646` |
| ⚪ baixo | performance | Loop de renderização com alocação por iteração e polling agressivo | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1215, :1252-1258` |
| ⚪ baixo | maintainability | StreamView.java é código legado não utilizado que duplica a lógica de aspect ratio | `app/src/main/java/com/limelight/ui/StreamView.java:1-167` |

### Detalhe

#### 🔴 crítico Loop infinito de configuração do decoder em SoCs NVIDIA e MediaTek

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:541 e :672 (loop em MediaCodecDecoderRenderer.java:756)` · **Categoria:** bug

O loop `for (int tryNumber = 0;; tryNumber++)` em initializeDecoder() só termina quando tryConfigureDecoder() tem sucesso OU quando setDecoderLowLatencyOptions() retorna false (`if (!newFormat) return -5;`). Porém o bloco NVIDIA (MediaCodecHelper.java:541-547) não tem nenhum guard de `tryNumber` e faz `setNewOption = true` incondicionalmente; e no bloco MediaTek a linha `setNewOption = true;` (:672) está FORA do `if (tryNumber < 4)` (:637). Em qualquer decoder omx.nvidia/c2.nvidia/omx.mtk/c2.mtk, setNewOption é sempre true, então se o configure() nunca tiver sucesso (Surface inválido, resolução não suportada, decoder ocupado) o loop roda para sempre criando e destruindo instâncias de MediaCodec. Como initializeDecoder() é chamado tanto de setup() quanto do caminho de recuperação (:905), isso trava a thread de conexão ou a thread que estiver fazendo a recuperação, com log 'Decoder configuration try: N' crescendo sem fim.

**Correção sugerida:** Envolver o bloco NVIDIA em `if (tryNumber < N)` e mover `setNewOption = true;` do MTK para dentro do `if (tryNumber < 4)`. Adicionalmente, colocar um teto absoluto no loop de initializeDecoder (ex.: `if (tryNumber > 8) return -5;`) como rede de segurança.

#### 🟠 alto framePacing escolhido pelo usuário é sobrescrito para BALANCED em todos os casos

**Local:** `app/src/main/java/com/limelight/Game.java:696 e :702` · **Categoria:** bug

Ambos os ramos do bloco de 'latency profile selection' fazem `prefConfig.framePacing = PreferenceConfiguration.FRAME_PACING_BALANCED;`. Isso acontece DEPOIS da leitura das preferências (PreferenceConfiguration.java:859) e ANTES do ajuste de CAP_FPS (Game.java:757), portanto os modos FRAME_PACING_MIN_LATENCY (0), FRAME_PACING_CAP_FPS (2) e FRAME_PACING_MAX_SMOOTHNESS (3) nunca chegam ao renderer. Consequência: todo o bloco de pacing adaptativo de MediaCodecDecoderRenderer.java:1284-1429 (~145 linhas com EWMA, lateStreak, cooldown de drop) é código morto em runtime, a UI de configuração de frame pacing não tem efeito, e o ajuste 'chosenFrameRate = roundedRefreshRate - 1' de Game.java:769 nunca dispara. Só o perf log continua reportando o nome do pacing escolhido (Game.java:1848), o que torna qualquer diagnóstico enganoso.

**Correção sugerida:** Remover as duas atribuições e deixar preferLowerDelays afetar apenas o timeout/política de release. Se a intenção era realmente forçar BALANCED, isso deve ser feito na UI (desabilitando as outras opções) e não silenciosamente em runtime.

#### 🟠 alto Caminho LATEST_ONLY tem a condição invertida e faz bypass do Choreographer, corrompendo o pacing e as estatísticas

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1213` · **Categoria:** bug

O bloco marcado `/* LATEST_ONLY_LOW_LATENCY */` executa quando `!preferLowerDelays`, isto é, no perfil BALANCED (padrão), e NÃO quando o usuário pede menor latência — o oposto do que o nome e os comentários das linhas 60-62 dizem. Como Game.java força framePacing=BALANCED, os dois caminhos de saída (latest-only em :1212-1247 e o enfileiramento BALANCED em :1430-1451) competem pelo mesmo dequeueOutputBuffer a cada iteração de forma não determinística: quando o poll de 0 µs pega o frame, ele é apresentado na hora e `continue` pula tudo; quando não pega, o dequeue de 2000 µs pega e o frame vai para outputBufferQueue para o Choreographer. Efeitos colaterais concretos: (a) frames apresentados pelo latest-only não incrementam `activeWindowVideoStats.totalFramesRendered` (só :1113 e :1428 incrementam), então o 'Rendering FPS' do perf overlay fica muito abaixo do real; (b) não incrementam `numFramesOut`, corrompendo a heurística de RendererException (:2304-2308); (c) INFO_OUTPUT_FORMAT_CHANGED drenado nesse loop é descartado silenciosamente, então `outputFormat` pode ficar null e a exceção reportar 'PreOutputConfigError' incorretamente; (d) o alinhamento a vsync do Choreographer é aplicado só a uma fração dos frames, produzindo micro-stutter.

**Correção sugerida:** Escolher UM caminho de saída por modo de pacing. Sugestão: manter o latest-only apenas quando preferLowerDelays==true E framePacing==MIN_LATENCY, e nunca combiná-lo com o caminho do Choreographer. Se mantido, incrementar totalFramesRendered/numFramesOut e tratar INFO_OUTPUT_FORMAT_CHANGED dentro dele.

#### 🟠 alto Caminho LATEST_ONLY pula doCodecRecoveryIfRequired(), podendo travar a recuperação de codec

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1243` · **Categoria:** bug

`doCodecRecoveryIfRequired(CR_FLAG_RENDER_THREAD)` só é chamado no `finally` do try que começa em :1250 (linha 1475). O `continue` da linha 1243, dentro do bloco latest-only, sai da iteração sem passar por esse finally. Se a recuperação for solicitada (por HDR mode change em :1673 ou por CodecException na input thread) enquanto o latest-only ainda consegue drenar frames com sucesso, a render thread nunca marca CR_FLAG_RENDER_THREAD; a thread de input fica presa em `codecRecoveryMonitor.wait(1000)` (:936) logando 'Waiting to quiesce decoder threads' indefinidamente e o stream congela sem recuperar. O comentário do próprio código na linha 152-153 diz explicitamente que toda thread que toca o MediaCodec deve chamar doCodecRecoveryIfRequired() regularmente.

**Correção sugerida:** Chamar `doCodecRecoveryIfRequired(CR_FLAG_RENDER_THREAD)` imediatamente antes do `continue` da linha 1243, ou reestruturar o loop para que a chamada esteja num finally que cubra a iteração inteira.

#### 🟠 alto enqueueNsByPtsUs (LongSparseArray) é acessado de duas threads sem sincronização e vaza entradas

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:58, :87-89, :1688` · **Categoria:** bug

`LongSparseArray` não é thread-safe. `put()` acontece na thread de input (queueNextInputBuffer, :1688) e `get()/delete()` na render thread (updateDecodeLatencyStats, :87-89), sem lock nem volatile. Uma realocação interna do array concorrente com uma leitura pode devolver valores errados, lançar ArrayIndexOutOfBoundsException dentro do `try{}catch(Throwable)` mudo da linha 1688 (mascarando a corrupção) ou corromper a estrutura. Além disso, entradas só são removidas quando updateDecodeLatencyStats() é chamado para aquele PTS — frames descartados (releaseOutputBuffer(idx,false) nas linhas 1223, 1287, 1314, 1387, 1441) nunca removem sua entrada, então o mapa cresce sem limite durante toda a sessão. Numa sessão de 1 hora a 120 fps com 5% de drop isso são ~21 mil entradas órfãs; o custo de busca do LongSparseArray é O(log n) mas a memória e o GC pressure crescem monotonicamente.

**Correção sugerida:** Trocar por `ConcurrentHashMap<Long,Long>` ou por um ring buffer de tamanho fixo indexado por (pts % N), e remover a entrada em TODOS os caminhos de release (inclusive os de descarte). Alternativa mais simples: guardar o enqueue time no próprio BufferInfo via um array circular de N=32 posições.

#### 🟡 médio Watchdog de decoder C2 está fora do while loop e nunca executa

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1479-1494` · **Categoria:** bug

O bloco `/* WATCHDOG_C2_SLEEP */` está posicionado depois do fechamento do `while (!stopping)` (linha 1477), portanto só roda uma vez, no encerramento da thread — exatamente quando não importa. Pior: `lastOutputNs` é inicializado em :1210 e nunca atualizado dentro do loop, então a condição `__nowNs - lastOutputNs > 1.2s` será verdadeira em qualquer sessão com mais de 1,2 s, disparando um flush inútil do codec já parado no shutdown. O objetivo declarado (detectar decoders Codec2 que 'dormem' e param de emitir frames) não é atendido em nenhum momento.

**Correção sugerida:** Mover o bloco para dentro do while, atualizar `lastOutputNs = System.nanoTime()` sempre que `outIndex >= 0` em qualquer dos caminhos de saída, e só então avaliar o timeout de 1,2 s.

#### 🟡 médio setFixedSize usa prefConfig.width/height, ignorando a inversão de resolução em retrato

**Local:** `app/src/main/java/com/limelight/Game.java:898-900` · **Categoria:** bug

`int vw = prefConfig.width > 0 ? prefConfig.width : displayWidth;` — quando `shouldInvertDecoderResolution` é true (retrato + autoInvertVideoResolution, Game.java:429-432), displayWidth/displayHeight são o inverso de prefConfig.width/height. O stream negociado com o host é displayWidth x displayHeight (ex.: 1080x1920), mas o holder recebe setFixedSize(1920,1080). A mesma inconsistência aparece em MediaCodecDecoderRenderer.setup(:800-801), que re-inverte width/height recebidos do host e configura o MediaFormat com as dimensões erradas (o SPS acaba corrigindo o decoder, mas KEY_MAX_WIDTH/KEY_MAX_HEIGHT do adaptive playback ficam trocados, e todos os logs/diagnósticos de 'Video dimensions' em :2379 mentem).

**Correção sugerida:** Usar `displayWidth`/`displayHeight` em Game.java:898-899 e revisar a semântica de `invertResolution` em setup(): documentar explicitamente se as dimensões vindas do host já são as finais (nesse caso remover a re-inversão) ou não.

#### 🟡 médio findFirstSurfaceViewFrom() encontra a SurfaceView descartada nos modos 3D

**Local:** `app/src/main/java/com/limelight/Game.java:894 (helper em :4337) + app/src/main/java/com/limelight/ui/StreamContainer.java:83-93` · **Categoria:** bug

StreamContainer.init() sempre cria e adiciona uma SurfaceView comum (:83-84, com o comentário 'Workaround for the sizing issue of GLSurfaceView'); nos modos 3D cria também uma GLSurfaceView, adiciona depois (:93) e reatribui mSurfaceView. A SurfaceView original continua no ViewGroup como filho 0. `findFirstSurfaceViewFrom()` faz busca em profundidade na ordem dos filhos, então retorna a SurfaceView órfã. Resultado: nos modos AI_3D e AI_3D_MOVIE, `setFixedSize()`, `setZOrderOnTop(false)` e `setFrameRate()` (Game.java:900-931) são aplicados numa view que não exibe nada, e a GLSurfaceView real nunca recebe o hint de frame rate. Ainda por cima, a SurfaceView órfã consome um layer do SurfaceFlinger durante toda a sessão.

**Correção sugerida:** Trocar `findFirstSurfaceViewFrom(root)` por `streamContainer.getSurfaceView()` (já existe, StreamContainer.java:215) e remover a SurfaceView dummy nos modos 3D (ou pelo menos chamar setVisibility(GONE) nela após adicionar a GLSurfaceView).

#### 🟡 médio ewmaJitterNs nunca é atualizado, tornando toda a lógica de drop 'adaptativa' uma constante

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1207 (usado em :1303 e :1364)` · **Categoria:** tech-debt

`double ewmaJitterNs = periodNs * 0.1;` é inicializado e lido em duas fórmulas de limiar (`pressure` em :1303 e `factorLatency` em :1364) mas nunca recebe uma amostra. Portanto `ewmaJitterNs / vsyncPeriodNs` é uma constante (0.1 * periodNs / vsyncPeriodNs), e as fórmulas que aparentam ser adaptativas são efetivamente `factorSmooth ≈ constante` e `factorLatency ≈ 1.02 + 0.13*(0.05 + 0.3*backPressure + 0.2*mismatch)`. No mesmo bloco, `ewmaDecodeToPresentNs` (:1206) é atualizado em :1239 mas nunca lido, `MAX_FACTOR` (:1196) nunca é usado, e `highRefresh` (:1181), `managedMode` (:1182) e `isC2Decoder` (:1185-1191) são calculados e descartados. É código que dá aparência de sofisticação sem efeito.

**Correção sugerida:** Ou alimentar ewmaJitterNs com |interArrival - periodNs| a cada frame, ou remover as variáveis mortas e substituir os limiares por constantes explícitas documentadas. A segunda opção é preferível se ninguém validou os ganhos das fórmulas.

#### 🟡 médio Nenhum tratamento de WindowInsets/IME: o teclado virtual cobre o stream em vez de redimensioná-lo

**Local:** `app/src/main/AndroidManifest.xml:193-203 (activity .Game) + app/src/main/java/com/limelight/Game.java:359-369` · **Categoria:** ux

A activity Game não declara `android:windowSoftInputMode`, e o app adiciona FLAG_FULLSCREEN + FLAG_LAYOUT_IN_SCREEN (Game.java:359,369) com immersive sticky (:1660-1666). Com FLAG_FULLSCREEN o adjustResize padrão não redimensiona a janela, então o IME aparece sobreposto ao stream. Não existe nenhuma chamada a setOnApplyWindowInsetsListener, WindowInsetsCompat.Type.ime() ou WindowInsetsAnimation em todo o app (grep vazio). Isso é exatamente o comportamento que o dono do fork quer eliminar (referência: AnyDesk). O lado bom: a infraestrutura para consertar já existe — `StreamContainer.onMeasure()` (StreamContainer.java:113-150) já sabe letterboxar para qualquer tamanho disponível, e `getHolder().setFixedSize()` fixa o tamanho do buffer, então encolher a view apenas reescala o vídeo sem tocar no decoder.

**Correção sugerida:** Aplicar um OnApplyWindowInsetsListener na raiz que leia insets de Type.ime() e aplique bottom padding ao container (ou reduza o height do StreamContainer via LayoutParams), deixando o onMeasure existente recalcular o letterbox. Detalhe crítico: com setFixedSize ativo, SurfaceHolder.Callback.surfaceChanged NÃO dispara em mudanças de bounds da view, então PanZoomHandler.handleSurfaceChange() (chamado só de Game.surfaceChanged, :3786) precisa ser invocado explicitamente a partir de um OnLayoutChangeListener.

#### 🟡 médio NullPointerException em Stereo3DRenderer.initializeTfLite() se a criação do delegate falhar

**Local:** `app/src/main/java/com/limelight/utils/Stereo3DRenderer.java:704 e :713` · **Categoria:** bug

No catch da linha 702, `gpuDelegate.close()` é chamado sem verificação de null. Se `new GpuDelegate(gpuOptions)` (:697) for justamente o que lançou a exceção (caso comum em GPUs sem suporte OpenCL/GL compute), gpuDelegate ainda é null e o close() lança NPE dentro do catch, escapando de initializeTfLite() e derrubando onSurfaceCreated() na thread GL. O mesmo padrão se repete em :713 com `nnApiDelegate.close()`. O fallback para CPU (:716) e o reinitializeTfLiteOnCpu() (:725) ficam inalcançáveis.

**Correção sugerida:** Guardar as chamadas com `if (gpuDelegate != null)` / `if (nnApiDelegate != null)` e envolver initializeTfLite() num try/catch abrangente que garanta o fallback CPU.

#### 🟡 médio Busy-wait com Thread.sleep(1) na thread GL bloqueia o pipeline em movie mode

**Local:** `app/src/main/java/com/limelight/utils/Stereo3DRenderer.java:464-470` · **Categoria:** performance

Em `isMovieMode` com `block==true`, onDrawFrame entra em `while ((newMap = latestDepthMap.getAndSet(null)) == null) { Thread.sleep(1); }` — um busy-wait sem timeout na thread de renderização OpenGL. Se a AiTask falhar (GPU delegate quebrado, tflite==null após o retorno em :990, ou InterruptedException) latestDepthMap nunca é preenchido e a thread GL trava para sempre, congelando o vídeo sem nenhuma mensagem ao usuário. Não há timeout, contador de tentativas nem verificação de `Thread.currentThread().isInterrupted()`.

**Correção sugerida:** Substituir por uma espera com timeout (ex.: SynchronousQueue.poll(33, MILLISECONDS) ou um limite de ~2 períodos de frame) e, ao expirar, renderizar com o último depth map válido ou com createFlatDepthMap() (:526).

#### 🟡 médio drawBothEyes() lê glSurfaceView.getWidth()/getHeight() da thread GL em vez de usar onSurfaceChanged

**Local:** `app/src/main/java/com/limelight/utils/Stereo3DRenderer.java:349-350 (vs. onSurfaceChanged em :755-758)` · **Categoria:** maintainability

O renderer chama `glSurfaceView.getWidth()` e `getHeight()` a cada frame a partir da thread GL. Esses campos são escritos pela UI thread durante o layout, sem barreira de memória, e podem estar temporariamente inconsistentes (largura nova com altura antiga) durante um redimensionamento — o que é exatamente o cenário que vai acontecer se o redimensionamento por teclado for implementado. `onSurfaceChanged(gl,width,height)` (:756) recebe as dimensões corretas mas só as usa para glViewport e as descarta.

**Correção sugerida:** Guardar width/height em campos voláteis dentro de onSurfaceChanged() e usá-los em drawBothEyes(). Isso também é pré-requisito para o modo 3D funcionar com o stream redimensionado pelo IME.

#### 🟡 médio Exceção fatal quando o decode unit não cabe no input buffer, em vez de pedir IDR

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:2159-2167` · **Categoria:** bug

Se `decodeUnitLength > nextInputBuffer.limit() - position()`, o código lança RendererException e notifica crash, derrubando o stream. Esse caso é atingível: com fusedIdrFrame ativo (:2136-2146), VPS+SPS+PPS são escritos ANTES do PICDATA no mesmo buffer, consumindo espaço; em 4K HEVC com bitrate alto e slices grandes, um IDR fundido pode estourar o input buffer do decoder. O tratamento correto para um frame que não cabe é devolver DR_NEED_IDR e deixar o host reenviar, não matar a sessão.

**Correção sugerida:** Substituir o throw por: limpar o buffer, log de warning e `return MoonBridge.DR_NEED_IDR`. Manter o crash apenas se isso se repetir N vezes consecutivas.

#### 🟡 médio doFrame() consulta o WindowManager a cada vsync a partir de uma thread não-UI

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1076` · **Categoria:** performance

`activity.getWindowManager().getDefaultDisplay().getAppVsyncOffsetNanos()` é executado a cada callback do Choreographer (até 144x/s) na HandlerThread 'Video - Choreographer'. Cada chamada percorre a cadeia Activity->WindowManagerImpl->DisplayManagerGlobal, potencialmente com IPC ao DisplayManagerService. Além do custo, `getDefaultDisplay()` sempre retorna o display padrão — errado quando o stream está num display externo (Game.java:389-397 escolhe o display por EXTRA_DISPLAY_ID), fazendo o offset de vsync ser o do display errado.

**Correção sugerida:** Cachear o valor de getAppVsyncOffsetNanos() no startChoreographerThread() e reavaliá-lo apenas em surfaceChanged()/onConfigurationChanged(). Usar o Display efetivamente ativo em vez de getDefaultDisplay().

#### ⚪ baixo forceTightThresholds: campo write-only lido por reflexão desnecessária

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:53-55 + app/src/main/java/com/limelight/Game.java:673-688` · **Categoria:** tech-debt

`forceTightThresholds` é declarado volatile e tem setter em MediaCodecDecoderRenderer, mas nunca é lido em lugar nenhum da classe (grep confirma apenas as linhas 53 e 55). Do lado do Game, o valor é obtido por `getDeclaredField("forceTightThresholds")` via reflexão (:678-682) apesar de o campo ser `public boolean` em PreferenceConfiguration.java:233 — e esse campo nunca é populado a partir de SharedPreferences, ficando sempre false. São ~16 linhas de código que não fazem nada, com reflexão que quebraria silenciosamente sob R8/ProGuard.

**Correção sugerida:** Remover o campo, o setter e todo o bloco try/reflexão de Game.java:673-688. Se o comportamento de limiar apertado for desejado, implementá-lo de verdade dentro do cálculo de periodNs (:1184).

#### ⚪ baixo MediaCodecHelper.applyExtraVendorOptions() e isMTKDecoderName() são código morto

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:1161-1193 e app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:2428-2432` · **Categoria:** tech-debt

`applyExtraVendorOptions()` (33 linhas, com chaves específicas de Qualcomm OMX que não existem em setDecoderLowLatencyOptions, como vendor.qti-ext-dec-dpb-output-delay.enable e vendor.qti-ext-dec-frame-drop.enable) não tem nenhum chamador em todo o app/src. `isMTKDecoderName()` idem. Isso é armadilha para agentes futuros: parece que essas otimizações estão ativas, mas não estão.

**Correção sugerida:** Ou remover as duas funções, ou chamar applyExtraVendorOptions() a partir de setDecoderLowLatencyOptions() com um guard de tryNumber, depois de validar num device Qualcomm real. Documentar a decisão em decoder-errata.txt.

#### ⚪ baixo Código pré-Lollipop extenso e inalcançável (minSdk é 21)

**Local:** `app/build.gradle:11 (minSdk 21) vs. MediaCodecDecoderRenderer.java:107, :652-654, :1101-1110, :1337-1351, :1411-1425, :1531-1536` · **Categoria:** tech-debt

O projeto tem minSdk 21 (LOLLIPOP), mas o renderer mantém `legacyInputBuffers` (:107) e vários blocos `if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {...} else {...}`. Pior, os ramos else contêm padrões absurdos como `if (SDK_INT >= 21) {...} else { if (SDK_INT >= 21) {...} else {...} }` (:1102-1110, :1338-1346, :1412-1420) — aninhamentos idênticos gerados por edições automatizadas, com variáveis `long __ts = System.nanoTime();` declaradas e nunca usadas. São cerca de 80 linhas inalcançáveis que dificultam muito a leitura do loop de renderização.

**Correção sugerida:** Remover todos os guards de SDK < 21 e os ramos else duplicados; deletar legacyInputBuffers e a chamada getInputBuffers(). Isso reduz o loop de saída para algo legível e é pré-requisito para qualquer refatoração séria de pacing.

#### ⚪ baixo notifyVideoForeground/notifyVideoBackground não têm efeito nenhum

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:141, :523-529` · **Categoria:** tech-debt

O campo `foreground` é escrito por notifyVideoForeground()/notifyVideoBackground() (chamados de Game.onMultiWindowModeChanged, Game.java:1690/1694) mas nunca é lido. A intenção provável era reduzir prioridade/taxa de decodificação em PiP ou multi-window, mas isso nunca foi implementado.

**Correção sugerida:** Implementar de fato (ex.: em PiP, aumentar o timeout do dequeue e desabilitar o drop agressivo, ou pedir menor operating rate) ou remover os três métodos e as chamadas.

#### ⚪ baixo Divisões sem guarda no perf overlay podem gerar NaN/Infinity

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1791, :1816, :1854` · **Categoria:** bug

`(float)lastTwo.decoderTimeMs / lastTwo.totalFramesReceived` (:1791) e `(float)lastTwo.framesLost / lastTwo.totalFrames * 100` (:1816 e :1854) não verificam divisor zero. Nos primeiros ~2 s de stream, ou depois de uma recuperação de codec que zere a janela, totalFramesReceived/totalFrames podem ser 0, produzindo 'NaN' ou 'Infinity' no overlay. Como decodeTimeMs também alimenta a comparação `minDecodeTime > decodeTimeMs` (:1884), um NaN faz a comparação sempre falhar e o perf logging nunca registrar o mínimo.

**Correção sugerida:** Adicionar guardas `lastTwo.totalFramesReceived > 0 ? ... : 0f` nas três divisões, e um `!Float.isNaN(decodeTimeMs)` antes da comparação da linha 1884.

#### ⚪ baixo getPreferredColorSpace() nunca retorna REC_2020, mesmo em HDR10

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:498-512 (switch em :560-570)` · **Categoria:** compatibility

A função só devolve REC_709 ou REC_601; o case COLORSPACE_REC_2020 do switch em createBaseMediaFormat (:567) é inalcançável. O valor é enviado ao host via StreamConfiguration.setColorSpace() (Game.java:799), então mesmo com HDR10 ativo o cliente anuncia BT.709. Na prática o decoder detecta a transição pelo bitstream (o código omite as chaves de cor em streams 10-bit, :557), mas o host pode fazer conversão de gamut desnecessária. Também não há uso de MediaFormat.COLOR_TRANSFER_ST2084 em lugar nenhum.

**Correção sugerida:** Retornar COLORSPACE_REC_2020 quando (videoFormat & VIDEO_FORMAT_MASK_10BIT) != 0 e o decoder anunciar suporte, validando contra Apollo/Vibeshine antes.

#### ⚪ baixo AV1 só é considerado com FORCE_AV1; a lista preferredDecoders está permanentemente vazia

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:330-333 e app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:87-88` · **Categoria:** tech-debt

findAv1Decoder() retorna null imediatamente se o usuário não escolheu FORCE_AV1, então toda a lógica de decoderCanMeetPerformancePointWithAv1AndNotHevc/AndNotAvc (:262-286) e isDecoderWhitelistedForAv1 (MediaCodecHelper.java:851) é inalcançável no modo AUTO. Em paralelo, `preferredDecoders = new LinkedList<>()` nunca recebe elementos, tornando findPreferredDecoder() (MediaCodecHelper.java:910-935) sempre um no-op de ~25 linhas.

**Correção sugerida:** Habilitar AV1 no modo AUTO quando o decoder for hardware, tiver FEATURE_LowLatency e passar no performance point. Popular preferredDecoders a partir de uma preferência de debug ('forçar decoder por nome'), que é extremamente útil para triagem de bugs de device.

#### ⚪ baixo cleanup() e stop() não verificam null, podendo mascarar a causa raiz de uma falha de setup

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1633 e :1646` · **Categoria:** bug

`rendererThread.join()` (:1633) e `videoDecoder.release()` (:1646) não checam null. Se setup() falhar (retorno -1/-2/-3/-5 em :697/731/741/750/776), videoDecoder fica null e rendererThread nunca é criado; um cleanup()/stop() vindo do teardown da conexão lança NPE que substitui o erro original nos logs. O próprio comentário de prepareForStop() (:1581) alerta que ele pode ser chamado mesmo se setup()/start() falharem, mas cleanup()/stop() não seguem a mesma disciplina.

**Correção sugerida:** Adicionar checagens de null em cleanup() e stop(), espelhando o cuidado já presente em prepareForStop().

#### ⚪ baixo Loop de renderização com alocação por iteração e polling agressivo

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1215, :1252-1258` · **Categoria:** performance

Cada iteração do while aloca `new MediaCodec.BufferInfo()` (:1215) — em um loop que gira milhares de vezes por segundo, isso é pressão de GC constante numa thread de tempo real. Além disso, a sequência de dequeues por iteração é 0 µs (latest-only) + até 2000 µs + 250/500 µs de backoff; quando não há frames, o loop nunca dorme de verdade e mantém um core ocupado, prejudicando bateria e térmico em dispositivos móveis (justamente onde o fork é usado).

**Correção sugerida:** Reutilizar uma única instância de BufferInfo fora do loop (já existe `info` em :1209) e revisar a estratégia de timeout — um único dequeue bloqueante com timeout de ~1 período de frame é mais eficiente e igualmente responsivo.

#### ⚪ baixo StreamView.java é código legado não utilizado que duplica a lógica de aspect ratio

**Local:** `app/src/main/java/com/limelight/ui/StreamView.java:1-167` · **Categoria:** maintainability

A classe StreamView (SurfaceView com onMeasure de aspect ratio, onKeyPreIme, commitText InputConnection) não é referenciada por nenhum layout XML nem por nenhum código Java (grep confirma: só menções em comentários). Ela foi substituída por StreamContainer, que reimplementa exatamente a mesma matemática de letterbox (StreamContainer.java:113-150 vs StreamView.java:62-94). Um agente futuro procurando 'onde o stream é dimensionado' vai encontrar as duas e editar a errada — risco alto justamente na área que o dono do fork quer modificar.

**Correção sugerida:** Deletar StreamView.java (e a interface InputCallbacks duplicada dentro dela), deixando StreamContainer como única fonte de verdade.


## Ideias de melhoria

### Corrigir o loop infinito de configuração em NVIDIA/MediaTek

**Tamanho:** quick-win

**Por quê:** É o único bug com potencial de travar o app por tempo indefinido, e afeta exatamente as duas famílias de SoC mais comuns em Android TV boxes e tablets baratos.

**Como:** Em MediaCodecHelper.java:541, envolver o bloco NVIDIA em `if (tryNumber < 4)`. Em :672, mover `setNewOption = true;` para dentro do `if (tryNumber < 4)` que começa em :637. Adicionar em MediaCodecDecoderRenderer.java:756 um teto `if (tryNumber > 8) return -5;`.

**Risco:** Baixo. Só reduz o número de tentativas; o caminho de sucesso não muda.

### Restaurar o respeito ao frame pacing escolhido pelo usuário

**Tamanho:** quick-win

**Por quê:** Remover duas linhas devolve ao usuário quatro modos de pacing que hoje estão inertes, e torna honestos os logs de performance (Game.java:1848).

**Como:** Deletar as atribuições `prefConfig.framePacing = FRAME_PACING_BALANCED;` de Game.java:696 e :702, mantendo apenas setPreferLowerDelays/setPreferLowerDelaysTimeoutUs. Fazer depois do item de unificação do loop, para não expor caminhos de pacing ainda instáveis.

**Risco:** Médio se feito isolado (expõe código de pacing pouco testado); baixo se feito após a unificação do loop.

### Corrigir o rastreamento de latência de decodificação (thread-safety + vazamento)

**Tamanho:** small

**Por quê:** O número de 'decode time' do perf overlay e do perf logging é a métrica que o dono do fork usa para avaliar mudanças de latência; hoje ela vem de uma estrutura corrompível e que vaza memória durante toda a sessão.

**Como:** Trocar `LongSparseArray<Long> enqueueNsByPtsUs` (MediaCodecDecoderRenderer.java:58) por um array circular de 64 pares (pts, enqueueNs) com índice AtomicInteger, ou por ConcurrentHashMap com poda por tamanho. Remover a entrada em todos os releases, inclusive nos descartes (:1223, :1287, :1314, :1387, :1441). Remover os try/catch(Throwable) mudos de :1688 e :1240 que hoje escondem falhas.

**Risco:** Baixo.

### Mover o watchdog de decoder C2 para dentro do loop e fazê-lo funcionar

**Tamanho:** small

**Por quê:** Decoders Codec2 que param de emitir frames são uma causa real de congelamento silencioso; o watchdog já foi escrito, só está no lugar errado.

**Como:** Mover MediaCodecDecoderRenderer.java:1479-1494 para dentro do while (antes do fechamento em :1477) e atualizar `lastOutputNs = System.nanoTime()` em todo caminho onde outIndex >= 0. Substituir o setParameters({"priority":0}) por um MediaCodec.PARAMETER_KEY_REQUEST_SYNC_FRAME + DR_NEED_IDR ao host, que é o gesto correto após um flush.

**Risco:** Baixo-médio: um watchdog agora ativo pode disparar flushes indevidos se o limiar de 1,2 s for curto demais para streams de FPS baixo — parametrizar em função de targetFps.

### Sanear o dimensionamento da SurfaceView (setFixedSize, setFrameRate, modos 3D)

**Tamanho:** small

**Por quê:** O bloco de Game.java:890-934 aplica configurações na view errada em 3D, usa dimensões erradas em retrato invertido e duplica o setFrameRate que já é feito em surfaceCreated (:3817-3828). É justamente a área que precisa estar limpa antes de mexer em resize por teclado.

**Como:** Trocar findFirstSurfaceViewFrom(root) (:894) por streamContainer.getSurfaceView(); usar displayWidth/displayHeight em vez de prefConfig.width/height (:898-899); remover a chamada de setFrameRate por reflexão (:928-931), já coberta por Game.surfaceCreated (:3817) e por MediaCodecDecoderRenderer.applySurfaceFrameRate (:2412); em StreamContainer.init(), não deixar a SurfaceView dummy visível quando o modo é 3D (StreamContainer.java:83-93).

**Risco:** Baixo-médio: o comentário 'Workaround for the sizing issue of GLSurfaceView' (StreamContainer.java:82) sugere que a SurfaceView dummy resolve algum bug real de layout — testar os modos 3D antes de removê-la de vez; setVisibility(GONE) é um meio-termo seguro.

### Reduzir consumo de CPU do loop de renderização

**Tamanho:** small

**Por quê:** O loop atual nunca dorme de verdade (poll 0 µs + 2000 µs + 250/500 µs) e aloca um BufferInfo por iteração. Em dispositivos móveis isso significa um core quente e throttling térmico que acaba prejudicando... a própria latência.

**Como:** Reutilizar a instância `info` já declarada em :1209 no lugar do `new BufferInfo()` de :1215. Substituir a cascata de dequeues por um único dequeueOutputBuffer com timeout ≈ um período de frame (1_000_000/tfps µs), que bloqueia eficientemente no driver. Medir com o perf overlay e com Perfetto antes/depois.

**Risco:** Baixo-médio: aumentar o timeout do dequeue pode adicionar latência no pior caso — validar com a métrica de decode time do overlay.

### Unificar o loop de saída: um caminho por modo de pacing

**Tamanho:** medium

**Por quê:** Hoje existem dois caminhos concorrentes (latest-only e clássico) rodando na mesma iteração, com condição invertida, estatísticas divergentes e um `continue` que pula a recuperação de codec. É a maior fonte de comportamento imprevisível do pipeline e o principal obstáculo para qualquer trabalho de latência.

**Como:** Extrair o corpo do while de MediaCodecDecoderRenderer.java:1211-1477 para uma estratégia por modo: (a) LatestOnlyStrategy — drena com 0 µs e apresenta imediatamente; usada quando preferLowerDelays==true; (b) PacedStrategy — dequeue bloqueante + enfileiramento em outputBufferQueue consumido pelo Choreographer em doFrame() (:1068); (c) DropStrategy — a lógica adaptativa de :1284-1429. Garantir que todas incrementem totalFramesRendered/numFramesOut, tratem INFO_OUTPUT_FORMAT_CHANGED e chamem doCodecRecoveryIfRequired() antes de qualquer continue. Remover os blocos SDK<21 e os aninhamentos duplicados no caminho.

**Risco:** Médio-alto. É o núcleo do pipeline; exige teste em pelo menos Qualcomm, MediaTek e Exynos, com o perf overlay ativo comparando incoming/rendering FPS antes e depois.

### Faxina de código morto no pipeline de vídeo

**Tamanho:** medium

**Por quê:** MediaCodecDecoderRenderer tem 2433 linhas das quais uma fração significativa é inalcançável (pré-Lollipop com minSdk 21, ramos else duplicados, variáveis EWMA nunca lidas, USE_FRAME_RENDER_TIME=false, forceTightThresholds, applyExtraVendorOptions, isMTKDecoderName, StreamView.java inteiro). Isso multiplica o custo de contexto de todo agente que trabalhar aqui.

**Como:** Remover, em ordem: (1) StreamView.java inteiro; (2) todos os guards SDK<21 e legacyInputBuffers (:107, :652-654, :1531-1536); (3) os aninhamentos `if(>=21){}else{if(>=21){}else{}}` de :1101-1110, :1337-1351, :1411-1425 e as variáveis __ts; (4) forceTightThresholds (:53-55) e o bloco de reflexão de Game.java:673-688; (5) ewmaDecodeToPresentNs, MAX_FACTOR, highRefresh, managedMode, isC2Decoder; (6) USE_FRAME_RENDER_TIME e o listener de :780-792; (7) MediaCodecHelper.applyExtraVendorOptions e isMTKDecoderName, OU ativá-los de verdade. Estimativa: -400 a -500 linhas.

**Risco:** Baixo se feito com um commit por item e verificação de compilação. O único cuidado é confirmar que nenhum fork downstream depende dos métodos públicos removidos (setForceTightThresholds é público).

### Estatísticas de vídeo confiáveis: rendered FPS real e agregação thread-safe

**Tamanho:** medium

**Por quê:** Com o caminho latest-only ativo, o 'Rendering FPS' do overlay é sistematicamente subnotificado, e VideoStats é escrito por três threads sem sincronização. Sem métricas confiáveis, qualquer trabalho de latência vira adivinhação.

**Como:** Converter os campos de VideoStats.java para tipos atômicos (LongAdder/AtomicInteger) ou trocar a agregação por troca de instância imutável a cada janela. Incrementar totalFramesRendered em todos os caminhos de apresentação. Adicionar ao overlay: modo de pacing efetivo, nome do decoder, flags low-latency aceitas (já logadas em :645-646 mas não expostas) e o tamanho médio de outputBufferQueue. Guardar as divisões de :1791/:1816/:1854 contra zero.

**Risco:** Baixo. Mudança observável apenas no overlay/log.

### Usar o caminho PBO assíncrono já implementado no Stereo3DRenderer

**Tamanho:** medium

**Por quê:** readPixelsForAI_Async() (Stereo3DRenderer.java:660-687) implementa double-buffering com PBO e glMapBufferRange, mas onDrawFrame chama a versão síncrona readPixelsForAI() (:647), que faz glReadPixels bloqueante na thread GL a cada frame — um stall de GPU garantido por frame nos modos 3D.

**Como:** Trocar a chamada de :447 para readPixelsForAI_Async(), mantendo readPixelsForAI como fallback quando o retorno for false nas primeiras iterações (o PBO de leitura só tem dado válido a partir do segundo frame). Medir com o campo drawDelay já exposto no overlay (:1829).

**Risco:** Médio: PBOs exigem GLES3 (o contexto já é setEGLContextClientVersion(3), StreamContainer.java:88) e alguns drivers têm bugs em glMapBufferRange — manter fallback e um flag de preferência.

### Habilitar AV1 no modo AUTO e expor override manual de decoder

**Tamanho:** medium

**Por quê:** AV1 hoje só existe se o usuário forçar, desperdiçando toda a lógica de performance point já escrita; e a lista preferredDecoders (que permitiria 'forçar decoder X') está vazia, apesar de o mecanismo estar pronto em findPreferredDecoder().

**Como:** Em MediaCodecDecoderRenderer.findAv1Decoder (:329), permitir AUTO quando isDecoderWhitelistedForAv1() passar E decoderCanMeetPerformancePoint() aprovar na resolução/FPS alvo. Popular MediaCodecHelper.preferredDecoders (:87-88) a partir de uma nova preferência de texto ('decoder override') exposta em StreamSettings (que já usa findProbableSafeDecoder em :536-537 para listar codecs).

**Risco:** Médio para AV1 (decoders AV1 de hardware ainda são irregulares — manter a checagem isSoftwareOnly de MediaCodecHelper.java:868); baixo para o override manual, que é opt-in e ajuda enormemente na triagem de bugs de device.

### HDR10: colorspace BT.2020 e transfer ST2084 corretos

**Tamanho:** medium

**Por quê:** O cliente anuncia BT.709 ao host mesmo quando negocia HEVC Main10 HDR10, e nunca usa COLOR_TRANSFER_ST2084. Com Apollo/Vibeshine e display virtual, isso pode causar conversão de gamut desnecessária no host.

**Como:** Fazer getPreferredColorSpace() (:498) retornar COLORSPACE_REC_2020 quando (videoFormat & VIDEO_FORMAT_MASK_10BIT) != 0, e avaliar setar KEY_COLOR_TRANSFER=COLOR_TRANSFER_ST2084 + KEY_COLOR_STANDARD=COLOR_STANDARD_BT2020 no createBaseMediaFormat quando o metadata HDR estiver presente (hoje o bloco :557-571 pula essas chaves inteiramente em 10-bit). Validar contra o comportamento real do Vibeshine antes de tornar padrão.

**Risco:** Médio-alto: mexer em colorspace é a categoria de mudança com maior chance de produzir imagem lavada/saturada em algum device. Colocar atrás de uma preferência experimental.

### EPIC: Redimensionar o stream quando o teclado virtual abre (comportamento AnyDesk)

**Tamanho:** epic

**Por quê:** Requisito nº1 do dono do fork. Hoje o IME sobrepõe o vídeo porque a activity é fullscreen sem tratamento de insets. A boa notícia: nenhuma mudança no decoder é necessária — o buffer do Surface é fixo (setFixedSize) e o SurfaceFlinger já escala para os bounds da view, então basta encolher a view.

**Como:** 1) Em Game.onCreate, após streamContainer = findViewById (Game.java:459), registrar ViewCompat.setOnApplyWindowInsetsListener na raiz lendo WindowInsetsCompat.Type.ime(). 2) Aplicar o bottom inset como altura reduzida do StreamContainer (LayoutParams.height = parentHeight - imeHeight) ou como padding da raiz — o StreamContainer.onMeasure() existente (StreamContainer.java:113-150) já recalcula o letterbox corretamente com o novo heightSize, tanto em FIT quanto em FILL. 3) Adicionar android:windowSoftInputMode="adjustResize" ao <activity .Game> (AndroidManifest.xml:193) e, enquanto o IME estiver visível, limpar FLAG_FULLSCREEN e sair do immersive sticky (o mesmo padrão já usado em Game.onMultiWindowModeChanged, :1688-1693) — senão o adjustResize é ignorado. 4) Chamar panZoomHandler.handleSurfaceChange() (PanZoomHandler.java:79) a partir de um OnLayoutChangeListener no StreamContainer, porque com setFixedSize ativo o SurfaceHolder.Callback.surfaceChanged NÃO dispara em mudança de bounds e o pan/zoom ficaria com bounds obsoletos. 5) Para os modos 3D, cachear width/height em onSurfaceChanged (Stereo3DRenderer.java:756) e usá-los em drawBothEyes (:349-350) no lugar de glSurfaceView.getWidth(). 6) Suprimir auto-PiP enquanto o IME estiver aberto via suppressPipRefCount (Game.java:1338).

**Risco:** Médio. Sair do fullscreen faz a status/navigation bar reaparecer momentaneamente (aceitável, é o que o AnyDesk faz). Cuidado com WindowInsetsAnimation em Android 11+ para evitar 'pulos' de layout. Em modo STRETCH (Game.java:1619 não define aspect ratio) o vídeo vai distorcer ao encolher — deve-se forçar FIT enquanto o IME estiver aberto, ou aplicar o aspect ratio sempre.

### EPIC: Extrair MediaCodecDecoderRenderer em componentes testáveis

**Tamanho:** epic

**Por quê:** 2433 linhas misturam seleção de decoder, patching de bitstream, loop de saída, pacing, recuperação de erro, coleta de estatísticas e formatação de UI (inclusive strings de R.string dentro do renderer, :1798-1876). Nada disso é testável isoladamente e cada mudança arrisca regressão em devices que ninguém tem.

**Como:** Dividir em: (a) DecoderSelector — findAvc/Hevc/Av1Decoder + performance points (:199-359); (b) BitstreamPatcher — todo o patching de SPS/CSD de :1726-1741 e :1900-2103, testável em JVM pura com jcodec e SPS capturados; (c) OutputPacer — as estratégias do loop de saída + doFrame; (d) CodecRecoveryCoordinator — :809-1066; (e) VideoStatsCollector + PerfOverlayFormatter (tirando R.string do renderer). Manter MediaCodecDecoderRenderer como fachada que implementa VideoDecoderRenderer. Adicionar testes Robolectric (o projeto já tem robolectric.properties na raiz) para BitstreamPatcher e VideoStatsCollector.

**Risco:** Alto em esforço, baixo em risco se feito incrementalmente e com o BitstreamPatcher primeiro (é a parte mais pura e mais perigosa de quebrar por acidente).


## Glossário

- Decode Unit (DU): unidade entregue pelo moonlight-common-c ao renderer; corresponde a um frame, fatiada em entradas de buffer (parameter sets separados + PICDATA concatenado) em callbacks.c:146-197.
- CSD (Codec Specific Data): VPS/SPS/PPS agrupados num único input buffer com MediaCodec.BUFFER_FLAG_CODEC_CONFIG, conforme recomendação do AOSP. Ver MediaCodecDecoderRenderer.java:2062-2090.
- SPS/PPS/VPS: Sequence/Picture/Video Parameter Set. No Artemis o SPS H.264 é desserializado, patchado e reserializado com jcodec (MediaCodecDecoderRenderer.java:1911-2028); os de HEVC são passados intactos.
- IDR (Instantaneous Decoder Refresh): keyframe que reseta as referências. MoonBridge.FRAME_TYPE_IDR=1. Dispara o reset das listas de CSD (:1764-1768).
- Fused IDR frame: enviar CSD junto com o IDR no mesmo input buffer, possível quando o decoder anuncia FEATURE_AdaptivePlayback (MediaCodecHelper.decoderSupportsFusedIdrFrame, :704).
- RFI (Reference Frame Invalidation): capacidade de pedir ao host que invalide frames de referência específicos em vez de mandar um IDR completo após perda de pacote. Anunciada em getCapabilities() (:2205); incompatível com o patch num_ref_frames=1 (:1947).
- Direct submit: capacidade de chamar submitDecodeUnit direto da thread de recepção de rede, sem thread intermediária. Concedida a decoders com latência de input buffer baixa (MediaCodecHelper.java:59-74).
- Frame pacing: estratégia de quando apresentar cada frame decodificado. Quatro modos em PreferenceConfiguration.java:217-220 — MIN_LATENCY(0), BALANCED(1), CAP_FPS(2), MAX_SMOOTHNESS(3). BALANCED usa o Choreographer; os outros apresentam direto na render thread.
- Choreographer: API Android que entrega callbacks sincronizados ao vsync. Usado numa HandlerThread dedicada com THREAD_PRIORITY_URGENT_DISPLAY (:1142) para alinhar a apresentação ao refresh do display.
- releaseOutputBuffer(index, timestampNs): variante que agenda a apresentação do frame para um instante futuro (usada no pacing); a variante (index, boolean) apresenta imediatamente (true) ou descarta (false).
- preferLowerDelays: perfil de latência do fork (PreferenceConfiguration.java:361). Controla o timeout do dequeue de saída e a política de release. ATENÇÃO: a condição do bloco latest-only (:1213) está invertida em relação ao nome.
- Adaptive playback (FEATURE_AdaptivePlayback): capacidade de mudar resolução sem reconfigurar o codec; habilita KEY_MAX_WIDTH/HEIGHT (:544-547) e fused IDR. Blacklistado em omx.intel e omx.mtk (MediaCodecHelper.java:125-131).
- FEATURE_LowLatency: capacidade oficial do Android 11+ que indica modo de baixa latência real. Usada como critério de qualidade tanto para preferir o decoder (findKnownSafeDecoder round 1) quanto para liberar HEVC e HEVC RFI.
- Performance Point: API do Android 10 (VideoCapabilities.PerformancePoint) que declara combinações resolução×fps que o decoder garante. Usada para decidir se vale trocar AVC→HEVC→AV1 (:208-286).
- Vendor extension keys: chaves não documentadas no namespace 'vendor.<extensão>.<parâmetro>' aceitas pelo MediaCodec desde Android 8. Cada SoC tem as suas; a lista conhecida está em MediaCodecHelper.java:221-227 e as aplicações em :533-702.
- OMX vs C2 (Codec2): duas gerações de HAL de codec no Android. Prefixos 'omx.*' são a antiga, 'c2.*' a nova. Em vários devices as duas coexistem e a que tem FEATURE_LowLatency não é a primeira listada (errata #15).
- Media performance class (Build.VERSION.MEDIA_PERFORMANCE_CLASS): nota de conformidade de mídia do device (Android 12+). >= S libera HEVC automaticamente (MediaCodecHelper.java:832-838).
- Annex B: formato de bitstream com start codes 0x000001/0x00000001. jcodec (H264Utils.readSPS/writeSPS) lida com as escape sequences de emulação corretamente.
- DPB (Decoded Picture Buffer): buffer de imagens decodificadas do decoder. max_dec_frame_buffering e num_ref_frames controlam seu tamanho e são a raiz de várias erratas de latência.
- level_idc: nível do perfil H.264. Rebaixado deliberadamente (31/32/42) para forçar o decoder a alocar menos buffers e reduzir latência (:1918-1935). Só quando RFI está inativo.
- Constrained High Profile: constraint_set4/5 flags que garantem ausência de B-frames, permitindo ao decoder reduzir buffering. Aplicado apenas em omx.intel (MediaCodecHelper.java:133-134).
- ScaleMode (FIT/FILL/STRETCH): política de escala do vídeo. FIT letterboxa preservando o aspect ratio, FILL preenche cortando, STRETCH deforma. Definido em PreferenceConfiguration.java:14-18 e aplicado em StreamContainer.onMeasure().
- desiredAspectRatio / fillDisplay: os dois parâmetros que governam StreamContainer.onMeasure(). São definidos em Game.prepareDisplayForRendering (:1621-1622) e são o ponto de entrada para qualquer mudança de dimensionamento do stream.
- setFixedSize(w,h): fixa o tamanho do buffer da Surface independentemente dos bounds da view, deixando o SurfaceFlinger escalar. Consequência importante: mudanças de layout NÃO disparam SurfaceHolder.Callback.surfaceChanged.
- invertResolution / autoInvertVideoResolution: em retrato, inverte a resolução pedida ao host para obter um display virtual em pé. Aplicado em Game.java:431-432 e re-aplicado (invertendo de novo) em MediaCodecDecoderRenderer.setup(:800-801).
- DIBR (Depth Image Based Rendering): técnica usada pelo Stereo3DRenderer para sintetizar o par estéreo a partir de um único frame + depth map, com deslocamento horizontal proporcional à profundidade (shader FRAGMENT_SHADER_3D).
- MiDaS: modelo de estimativa monocular de profundidade (midas-midas-v2-w8a8.tflite, int8 quantizado, entrada 256x256) executado por TFLite com delegate GPU→NNAPI→CPU (Stereo3DRenderer.java:689-723).
- PBO (Pixel Buffer Object): buffer GL que permite glReadPixels assíncrono. Implementado em readPixelsForAI_Async (:660) mas não utilizado — onDrawFrame chama a versão síncrona.
- EWMA (Exponentially Weighted Moving Average): média móvel usada nas heurísticas de drop do renderer (EWMA_ALPHA=0.25, :1194). Duas das três variáveis EWMA estão mortas (ver findings).
- Codec recovery (FLUSH/RESTART/RESET): escada de recuperação de erro do MediaCodec (:144-159). Exige que as três threads que tocam o codec (input, render, choreographer) fiquem quiesced antes da operação.
- Perf overlay lite vs big: dois formatos do HUD de performance, montados como String dentro de submitDecodeUnit (:1794-1877) e entregues via PerfOverlayListener.onPerfUpdate a TextViews do activity_game.xml.
