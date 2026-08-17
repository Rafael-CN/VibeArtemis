# Melhorias

> Escopo definido, uma ou poucas frentes. A maior parte do valor de QoL está aqui.

Cada item tem um código estável. Para começar a trabalhar em um deles, basta
citar o código.

## Índice

| Código | Item | Tamanho |
|---|---|---|
| **M01** | [Endurecer o parsing de MAC e adicionar broadcast dirigido no Wake-on-LAN](#m01) | small |
| **M02** | [Deduplicar entradas de mDNS por nome de serviço e evictar em serviceRemoved](#m02) | small |
| **M03** | [Propagar o comprimento decodificado do Opus ate o AudioTrack](#m03) | small |
| **M04** | [Instrumentacao de audio no overlay de performance](#m04) | small |
| **M05** | [Habilitar o modo de gravacao de audio para diagnostico](#m05) | small |
| **M06** | [Pinar e reproduzir o build da libopus](#m06) | small |
| **M07** | [Reset defensivo de estado sintético em cancelamento e perda de foco](#m07) | small |
| **M08** | [Fallback automático quando o host não suporta toque/caneta nativos](#m08) | small |
| **M09** | [Corrigir o rastreamento de latência de decodificação (thread-safety + vazamento)](#m09) | small |
| **M10** | [Mover o watchdog de decoder C2 para dentro do loop e fazê-lo funcionar](#m10) | small |
| **M11** | [Sanear o dimensionamento da SurfaceView (setFixedSize, setFrameRate, modos 3D)](#m11) | small |
| **M12** | [Reduzir consumo de CPU do loop de renderização](#m12) | small |
| **M13** | [Remover a penalidade de 50 ms do caminho UTF-8 em hosts Sunshine/Apollo](#m13) | small |
| **M14** | [Propagar códigos de erro dos wrappers JNI de input para o Java](#m14) | small |
| **M15** | [Documentar formalmente o contrato do teclado/UTF-8 num arquivo de referência do repo](#m15) | small |
| **M16** | [Registrar proveniência e hashes das bibliotecas estáticas pré-compiladas](#m16) | small |
| **M17** | [Cache de PreferenceConfiguration com invalidação por listener](#m17) | small |
| **M18** | [Corrigir o pipeline de frame pacing e reconciliar as opções warp/cap-fps](#m18) | small |
| **M19** | [Preset 'Apollo/Vibeshine + display virtual' como perfil de fábrica](#m19) | small |
| **M20** | [Corrigir o ciclo de vida de toque dos sticks 'Free' (cancel + relogio + centro obsoleto)](#m20) | small |
| **M21** | [Deteccao de mudanca no envio do OSC + revisao do hack de retransmissao](#m21) | small |
| **M22** | [Reservar um controllerNumber dedicado para o OSC quando multiController estiver ativo](#m22) | small |
| **M23** | [Documentar o contrato de extras do Game em um único lugar e tipar consistentemente](#m23) | small |
| **M24** | [Migrar AdapterFragment e as transações de fragment para AndroidX](#m24) | small |
| **M25** | [Adicionar um CLAUDE.md / docs de arquitetura com o mapa de componentes e os pontos de ext…](#m25) | small |
| **M26** | [Conectar a SearchPreference já presente no build à tela de 151 preferências](#m26) | small |
| **M27** | [Passada de acessibilidade: contentDescriptions e rótulos de box art](#m27) | small |
| **M28** | [Substituir dispatch por rótulo no GameMenu e remover o hack de OnGlobalLayoutListener](#m28) | small |
| **M29** | [Soltar todas as teclas/modificadores pendentes ao perder foco, pausar ou esconder overlays](#m29) | small |
| **M30** | [Deduplicar eventos de teclado com throttle nos analógicos/D-Pad virtuais](#m30) | small |
| **M31** | [Corrigir a coerência entre forceQwerty e a flag SS_KBE_FLAG_NON_NORMALIZED, e restaurar o…](#m31) | small |
| **M32** | [Unificar as três cópias de InputConnection e remover StreamView (código morto)](#m32) | small |
| **M33** | [Duplo-ESC para abrir o menu e acordes ESC+dígito → F1..F12](#m33) | small |
| **M34** | [Fechar a superficie exportada: PosterContentProvider, PcView e o par art:// + pin/passphr…](#m34) | small |
| **M35** | [Corrigir a fronteira JNI do envio de texto: byte[] UTF-8 real em vez de GetStringUTFChars](#m35) | small |
| **M36** | [Enxugar DeviceUtils e o AccessibilityService ao escopo realmente usado](#m36) | small |
| **M37** | [Corrigir e documentar a matriz de compatibilidade de host (Apollo vs Sunshine/Vibeshine)](#m37) | small |
| **M38** | [Fechar as lacunas do gate: lint, links de docs e relatório honesto de estágios pulados](#m38) | small |
| **M39** | [Reapontar o teste de commitText para o caminho vivo e remover StreamView](#m39) | small |
| **M40** | [Adicionar signingConfigs lido de variáveis de ambiente](#m40) | small |
| **M41** | [Instrumentar cobertura com JaCoCo, medindo antes de exigir](#m41) | small |
| **M42** | [Matriz de SDK no Robolectric como base do EPIC do teclado](#m42) | small |
| **M43** | [Unificar as três implementações de InputConnection em uma só](#m43) | medium |
| **M44** | [Reaproveitar SSLContext/OkHttpClient e trocar as threads de poll por um pool](#m44) | medium |
| **M45** | [Persistir capacidades e httpsPort no banco para eliminar o round-trip HTTP de descoberta…](#m45) | medium |
| **M46** | [Resync explicito do AudioTrack em vez de descarte cego](#m46) | medium |
| **M47** | [Audio focus e reconfiguracao dinamica ao trocar de dispositivo de saida](#m47) | medium |
| **M48** | [Expor controles de latencia/qualidade de audio nas preferencias](#m48) | medium |
| **M49** | [Corrigir o descasamento entre zoom/pan e coordenadas de toque/caneta](#m49) | medium |
| **M50** | [Gestos multi-dedo configuráveis e unificados](#m50) | medium |
| **M51** | [Suportar mais de 2 pontos de toque nos modos de emulação](#m51) | medium |
| **M52** | [Testes JVM para a máquina de estados dos TouchContexts](#m52) | medium |
| **M53** | [Unificar o loop de saída: um caminho por modo de pacing](#m53) | medium |
| **M54** | [Faxina de código morto no pipeline de vídeo](#m54) | medium |
| **M55** | [Estatísticas de vídeo confiáveis: rendered FPS real e agregação thread-safe](#m55) | medium |
| **M56** | [Usar o caminho PBO assíncrono já implementado no Stereo3DRenderer](#m56) | medium |
| **M57** | [Habilitar AV1 no modo AUTO e expor override manual de decoder](#m57) | medium |
| **M58** | [HDR10: colorspace BT.2020 e transfer ST2084 corretos](#m58) | medium |
| **M59** | [Bridgear o callback setAdaptiveTriggers da DualSense](#m59) | medium |
| **M60** | [Adicionar bindings faltantes de APIs Li* já disponíveis no C](#m60) | medium |
| **M61** | [Perfis como delta + limpeza de chaves de runtime](#m61) | medium |
| **M62** | [Busca e navegação dentro das configurações](#m62) | medium |
| **M63** | [Export/import de configuração completa (incluindo perfis)](#m63) | medium |
| **M64** | [Tornar o teclado virtual próprio e o IME configuráveis de forma coerente](#m64) | medium |
| **M65** | [Camada de 'release-all' unificada para OSC, overlay de teclado e gamepads fisicos](#m65) | medium |
| **M66** | [Implementar calibracao de IMU do Switch Pro Controller](#m66) | medium |
| **M67** | [Testes de regressao para o mapeamento de botoes e a matriz de quirks](#m67) | medium |
| **M68** | [Substituir os singletons estáticos de Activity por um GameBridge (ou binder de sessão)](#m68) | medium |
| **M69** | [Extrair ComputerManagerConnection e eliminar as três cópias do boilerplate de bind](#m69) | medium |
| **M70** | [Revisão e conclusão da tradução pt-BR (36% -> 100%)](#m70) | medium |
| **M71** | [Introduzir tokens de cor e migrar temas para Material3 antes de qualquer trabalho de tema](#m71) | medium |
| **M72** | [Reativar o seletor nativo de idioma do Android 13+ e migrar para AppCompatDelegate.setApp…](#m72) | medium |
| **M73** | [Adicionar recursos alternativos para tablets e foldables (sw600dp) e revisar o suporte a…](#m73) | medium |
| **M74** | [Modernizar CachedAppAssetLoader: sair de AsyncTask e corrigir os defeitos de robustez do…](#m74) | medium |
| **M75** | [Suporte a dead keys e composição de IME no caminho de tecla individual](#m75) | medium |
| **M76** | [Indicador de estado e feedback visual do teclado (modificadores ativos, texto em envio)](#m76) | medium |
| **M77** | [Testes automatizados do pipeline de teclado](#m77) | medium |
| **M78** | [Teclado overlay com modificadores sticky, modo mini e opacidade — avaliar contra o teclad…](#m78) | medium |
| **M79** | [Extrair o teclado de Game.java para uma classe própria, seguindo o exemplo estrutural do…](#m79) | medium |
| **M80** | [Varrer os catch silenciosos e remover a reflexao cargo-cult de Game.java](#m80) | medium |
| **M81** | [Controle e transparencia da sincronizacao de clipboard](#m81) | medium |
| **M82** | [Testes de regressao para os caminhos de entrada nao confiavel](#m82) | medium |
| **M83** | [Esconder na UI as features que o host não suporta em vez de só avisar depois](#m83) | medium |
| **M84** | [Suíte de smoke tests para o caminho de teclado](#m84) | medium |
| **M85** | [Endurecer a resolução de dependências e documentar a proveniência dos binários nativos](#m85) | medium |
| **M86** | [Consumir o pacote de controle 0x3001 (Set Clipboard) do Apollo e eliminar o polling HTTP…](#m86) | large |
| **M87** | [Extrair a camada de protocolo (nvstream.http) para testes headless](#m87) | large |
| **M88** | [Migrar a saida de audio para AAudio/Oboe](#m88) | large |
| **M89** | [Eliminar a cópia por frame no caminho de vídeo (DirectByteBuffer ou modelo pull)](#m89) | large |
| **M90** | [Gerar o catálogo de preferências a partir de uma única fonte (eliminar defaults duplicado…](#m90) | large |
| **M91** | [Extrair uma base comum para os dois overlays (gamepad e teclado)](#m91) | large |
| **M92** | [Extrair GameWindowController e GameInputRouter de Game.java](#m92) | large |
| **M93** | [Migrar os grids de GridView+android.app.Fragment para RecyclerView+androidx.fragment](#m93) | large |
| **M94** | [Migrar o teclado virtual próprio para layouts orientados a dados, com AltGr e localização](#m94) | large |
| **M95** | [EPIC — Camada de confianca explicita: fim do downgrade silencioso e visibilidade do estad…](#m95) | large |
| **M96** | [Enxugar o fork: remover Stereo3D/IA se não for usado](#m96) | large |

---

## M01

### Endurecer o parsing de MAC e adicionar broadcast dirigido no Wake-on-LAN

**Tamanho:** small

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

Duas falhas silenciosas que fazem o WOL 'dizer que funcionou' sem acordar a máquina — cenário frequente para quem usa host com display virtual e mantém o PC dormindo.

**Plano de implementação**

Em WakeOnLanSender.macStringToBytes (:113-129) normalizar removendo ':', '-', '.', espaços e validar 12 dígitos hex, propagando erro em vez de fazer break silencioso. Em sendWolPacket (:61-111) enumerar NetworkInterface.getNetworkInterfaces()/InterfaceAddress.getBroadcast() e adicionar cada broadcast dirigido à lista de destinos, além de 255.255.255.255. Em PcView.doWakeOnLan (:629-660) só mostrar 'wol_waking_msg' quando pelo menos um pacote tiver sido enviado com MAC válido.

**Risco**

Baixo. getNetworkInterfaces() lança NPE em dispositivos Android quebrados — envolver em try/catch como já é feito em AddComputerManually.isWrongSubnetSiteLocalAddress (:95-100).

---

## M02

### Deduplicar entradas de mDNS por nome de serviço e evictar em serviceRemoved

**Tamanho:** small

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

O HashSet de MdnsDiscoveryAgent só cresce e re-notifica a cada mudança de IP do host (MdnsDiscoveryAgent.java:14,31-52; JmDNSDiscoveryAgent.java:260-263 só loga).

**Plano de implementação**

Trocar HashSet<MdnsComputer> por Map<String,MdnsComputer> chaveado pelo nome do serviço, substituindo a entrada quando o endereço mudar e notificando só nesse caso; implementar remoção real em JmDNSDiscoveryAgent.serviceRemoved (:260) e em NsdManagerDiscoveryAgent.onServiceLost (:131-147); limpar o mapa em stopDiscovery().

**Risco**

Baixo. Cuidado com hosts que legitimamente expõem múltiplos IPv4 (multi-homed) — o desenho atual cria um MdnsComputer por IPv4 de propósito (MdnsDiscoveryAgent.java:31-39); a chave precisa ser nome+IPv4 nesse caso, e só o conjunto por nome é evictado.

---

## M03

### Propagar o comprimento decodificado do Opus ate o AudioTrack

**Tamanho:** small

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

Elimina a reproducao de cauda de buffer obsoleta e torna a declaracao de CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION honesta ponta a ponta. Necessario antes de qualquer trabalho que permita ao usuario escolher a duracao do pacote de audio.

**Plano de implementação**

Mudar `BridgeArPlaySampleMethod` para assinatura `([SI)V` em `callbacks.c:93` e passar `decodeLen` em `callbacks.c:269`; atualizar `MoonBridge.bridgeArPlaySample(short[] pcmData, int samplesPerChannel)` (MoonBridge.java:259), a interface `AudioRenderer.playDecodedAudio` (av/audio/AudioRenderer.java:12) e `AndroidAudioRenderer.java:195` para `track.write(audioData, 0, samplesPerChannel * channelCount)` (guardando channelCount como campo em setup()).

**Risco**

Baixo. Toca a fronteira JNI: se a assinatura do metodo for alterada em so um dos lados, `GetStaticMethodID` retorna NULL e o app crasha no primeiro pacote de audio. Alterar callbacks.c e MoonBridge.java no mesmo commit e limpar o build nativo.

---

## M04

### Instrumentacao de audio no overlay de performance

**Tamanho:** small

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

Hoje nao existe UMA metrica de audio visivel ao usuario nem ao desenvolvedor: falhas de decode sao silenciosas (callbacks.c:275-278), descartes por backpressure so viram log (AndroidAudioRenderer.java:198) e o overlay mostra apenas video. Sem isso, todo relato de "audio picotando" e inacionavel.

**Plano de implementação**

Adicionar contadores estaticos em `callbacks.c` (frames decodificados, falhas de decode, invocacoes de PLC com sampleData==NULL) e um novo native `getAudioStats()` em `simplejni.c` ao lado de `getPendingAudioDuration` (linha 172). No Java, contar descartes em `AndroidAudioRenderer.playDecodedAudio` (linha 196) e expor pending duration media/pico. Renderizar junto com as metricas de video ja exibidas pelo overlay do Game.

**Risco**

Baixo. Cuidado para nao adicionar chamadas JNI por pacote no caminho quente — os contadores nativos devem ser lidos apenas na cadencia do overlay (1 Hz), nunca por frame de audio.

---

## M05

### Habilitar o modo de gravacao de audio para diagnostico

**Tamanho:** small

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

O submodulo ja traz `RecorderCallbacks.c` capaz de dumpar o Opus bruto (`recArDecodeAndPlaySample`, linhas 81-88) antes do decode, o que separa instantaneamente "problema de rede/host" de "problema de decode/AudioTrack". Esta inacessivel apenas porque o arquivo nao entra no build.

**Plano de implementação**

Adicionar `moonlight-common-c/src/RecorderCallbacks.c` a `LOCAL_SRC_FILES` em `app/src/main/jni/moonlight-core/Android.mk:11-43`; criar uma build flavor de debug que passe `-DLC_DEBUG_RECORD_MODE` em `LOCAL_CFLAGS` (linha 50, ao lado do `-DLC_DEBUG` ja condicionado a NDK_DEBUG na linha 52-54); passar um caminho de arquivo como `audioContext` em `LiStartConnection` (`callbacks.c:507`, hoje NULL).

**Risco**

Baixo, desde que fique restrito a builds de debug — em release gravaria audio do usuario em disco, o que seria um problema de privacidade. Guardar atras da flag e nunca habilitar na flavor de producao.

---

## M06

### Pinar e reproduzir o build da libopus

**Tamanho:** small

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

O decoder Opus processa dados de rede e hoje e um binario opaco commitado, sem versao, sem checksum e sem script de build — em contraste com o OpenSSL, que tem `build-openssl.sh` ao lado. Isso impede saber se ha CVEs abertos e impede rebuild reproduzivel.

**Plano de implementação**

Criar `app/src/main/jni/moonlight-core/libopus/VERSION.txt` com tag do Opus e commit do moonlight-mobile-deps; adicionar `build-opus.sh` no mesmo diretorio de `build-openssl.sh`; registrar SHA-256 dos quatro `.a`. Passo seguinte opcional: substituir o `PREBUILT_STATIC_LIBRARY` (libopus/Android.mk:5) por compilacao a partir de submodulo.

**Risco**

Baixo se limitado a documentacao/checksums. Compilar Opus do fonte no CI aumenta o tempo de build e pode exigir ajustes de flags por ABI (NEON em armeabi-v7a).

---

## M07

### Reset defensivo de estado sintético em cancelamento e perda de foco

**Tamanho:** small

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

Três flags globais (`synthClickPending`, `pendingDrag`, `isDragging`, `pointerSwiping`) sobrevivem a ACTION_CANCEL e a perda de foco, causando botão esquerdo preso e modo scroll travado.

**Plano de implementação**

Criar `private void resetSyntheticPointerState()` em `Game.java` que, se `isDragging`, envie `conn.sendMouseButtonUp(MouseButtonPacket.BUTTON_LEFT)` e zere os quatro flags. Chamar em: `case MotionEvent.ACTION_CANCEL` adicionado ao switch de 2914, no ramo de 2881, em `cancelStaleTouchState` (3336) e em `onWindowFocusChanged` (1403) quando `hasFocus == false`. Fazer o mesmo para `lastButtonState = 0` (Game.java:146) ao perder foco, evitando XOR fantasma no retorno.

**Risco**

Baixo. Cuidado para não enviar `up` espúrio quando o usuário estiver de fato com o botão físico pressionado ao alternar janelas.

---

## M08

### Fallback automático quando o host não suporta toque/caneta nativos

**Tamanho:** small

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

`trySendTouchEvent`/`trySendPenEvent` retornam false a cada evento quando o host não anuncia `LI_FF_PEN_TOUCH_EVENTS` (InputStream.c:1313-1316), o que significa tentar e falhar dezenas de vezes por segundo antes de cair no caminho de mouse.

**Plano de implementação**

Cachear o resultado num boolean `hostSupportsNativeTouch` na primeira resposta `LI_ERR_UNSUPPORTED` (Game.java:2724, 2659) e curto-circuitar as chamadas seguintes; resetar na reconexão. Exibir no overlay de notificação (`notificationOverlayView`) uma dica única informando que o host não suporta toque nativo.

**Risco**

Baixo. Atenção para não cachear um `false` causado por outro erro (o código já distingue apenas `LI_ERR_UNSUPPORTED`).

---

## M09

### Corrigir o rastreamento de latência de decodificação (thread-safety + vazamento)

**Tamanho:** small

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

O número de 'decode time' do perf overlay e do perf logging é a métrica que o dono do fork usa para avaliar mudanças de latência; hoje ela vem de uma estrutura corrompível e que vaza memória durante toda a sessão.

**Plano de implementação**

Trocar `LongSparseArray<Long> enqueueNsByPtsUs` (MediaCodecDecoderRenderer.java:58) por um array circular de 64 pares (pts, enqueueNs) com índice AtomicInteger, ou por ConcurrentHashMap com poda por tamanho. Remover a entrada em todos os releases, inclusive nos descartes (:1223, :1287, :1314, :1387, :1441). Remover os try/catch(Throwable) mudos de :1688 e :1240 que hoje escondem falhas.

**Risco**

Baixo.

---

## M10

### Mover o watchdog de decoder C2 para dentro do loop e fazê-lo funcionar

**Tamanho:** small

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

Decoders Codec2 que param de emitir frames são uma causa real de congelamento silencioso; o watchdog já foi escrito, só está no lugar errado.

**Plano de implementação**

Mover MediaCodecDecoderRenderer.java:1479-1494 para dentro do while (antes do fechamento em :1477) e atualizar `lastOutputNs = System.nanoTime()` em todo caminho onde outIndex >= 0. Substituir o setParameters({"priority":0}) por um MediaCodec.PARAMETER_KEY_REQUEST_SYNC_FRAME + DR_NEED_IDR ao host, que é o gesto correto após um flush.

**Risco**

Baixo-médio: um watchdog agora ativo pode disparar flushes indevidos se o limiar de 1,2 s for curto demais para streams de FPS baixo — parametrizar em função de targetFps.

---

## M11

### Sanear o dimensionamento da SurfaceView (setFixedSize, setFrameRate, modos 3D)

**Tamanho:** small

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

O bloco de Game.java:890-934 aplica configurações na view errada em 3D, usa dimensões erradas em retrato invertido e duplica o setFrameRate que já é feito em surfaceCreated (:3817-3828). É justamente a área que precisa estar limpa antes de mexer em resize por teclado.

**Plano de implementação**

Trocar findFirstSurfaceViewFrom(root) (:894) por streamContainer.getSurfaceView(); usar displayWidth/displayHeight em vez de prefConfig.width/height (:898-899); remover a chamada de setFrameRate por reflexão (:928-931), já coberta por Game.surfaceCreated (:3817) e por MediaCodecDecoderRenderer.applySurfaceFrameRate (:2412); em StreamContainer.init(), não deixar a SurfaceView dummy visível quando o modo é 3D (StreamContainer.java:83-93).

**Risco**

Baixo-médio: o comentário 'Workaround for the sizing issue of GLSurfaceView' (StreamContainer.java:82) sugere que a SurfaceView dummy resolve algum bug real de layout — testar os modos 3D antes de removê-la de vez; setVisibility(GONE) é um meio-termo seguro.

---

## M12

### Reduzir consumo de CPU do loop de renderização

**Tamanho:** small

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

O loop atual nunca dorme de verdade (poll 0 µs + 2000 µs + 250/500 µs) e aloca um BufferInfo por iteração. Em dispositivos móveis isso significa um core quente e throttling térmico que acaba prejudicando... a própria latência.

**Plano de implementação**

Reutilizar a instância `info` já declarada em :1209 no lugar do `new BufferInfo()` de :1215. Substituir a cascata de dequeues por um único dequeueOutputBuffer com timeout ≈ um período de frame (1_000_000/tfps µs), que bloqueia eficientemente no driver. Medir com o perf overlay e com Perfetto antes/depois.

**Risco**

Baixo-médio: aumentar o timeout do dequeue pode adicionar latência no pior caso — validar com a métrica de decode time do overlay.

---

## M13

### Remover a penalidade de 50 ms do caminho UTF-8 em hosts Sunshine/Apollo

**Tamanho:** small

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

É a maior alavanca isolada de latência percebida de digitação e não requer nenhuma mudança no host. O próprio comentário do upstream (InputStream.c:598-601) diz que o sleep é workaround exclusivo do GFE.

**Plano de implementação**

No submódulo ClassicOldSong/moonlight-common-c, envolver InputStream.c:602-608 (`flushInputOnControlStream()` + loop `isControlDataInTransit()` + `PltSleepMs(50)`) em `if (!IS_SUNSHINE()) { ... }` — a macro já existe em Limelight-internal.h:86. Commitar no fork, atualizar o ponteiro do submódulo em app/src/main/jni/moonlight-core/moonlight-common-c e rebuildar.

**Risco**

Médio. O sleep também mascara qualquer race de ordenação entre pacotes de teclado (canal 0x02) e UTF-8 (canal 0x06), que são canais ENet DIFERENTES e portanto não têm ordenação garantida entre si. Testar cenário 'segurar Shift + digitar texto pelo IME'. Mitigação: em vez de remover, reduzir para 5-10 ms em Sunshine.

---

## M14

### Propagar códigos de erro dos wrappers JNI de input para o Java

**Tamanho:** small

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

Hoje texto e teclas podem ser silenciosamente descartados quando a fila de 150 pacotes enche ou quando o stream não está inicializado, sem nenhum sinal para o app nem para o usuário. Torna a feature de campo de texto diagnosticável.

**Plano de implementação**

Mudar MoonBridge.java:390 e :396 para `native int`; em simplejni.c:111-114 e :126-131 retornar o valor de LiSendKeyboardEvent2/LiSendUtf8TextEvent; em NvConnection.java:537,619 repassar; em Game.flushCommitTextQueue (Game.java:317-331) tratar falha re-enfileirando o chunk com backoff em vez de perdê-lo.

**Risco**

Baixo. Mudança de assinatura JNI exige rebuild nativo (mesmo cuidado do item anterior).

---

## M15

### Documentar formalmente o contrato do teclado/UTF-8 num arquivo de referência do repo

**Tamanho:** small

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

O comportamento de 'a API aceita string inteira mas o fio envia code point a code point, com 50 ms de penalidade e sem negociação de suporte' não está documentado em lugar nenhum e é a fonte mais provável de retrabalho para qualquer agente ou contribuidor futuro que ataque a feature de teclado.

**Plano de implementação**

Criar docs/ (ou CLAUDE.md) com uma seção 'Input path: keyboard & text' listando: os dois fluxos (scancode via CTRL_CHANNEL_KEYBOARD 0x02 vs texto via CTRL_CHANNEL_UTF8 0x06), a tabela de magics (Input.h), os tetos de payload (243 bytes control stream encriptado / 128 bytes legado), o comportamento de split (InputStream.c:610-648), a ausência de negociação para UTF-8 e a semântica de SS_KBE_FLAG_NON_NORMALIZED (só vale para Sunshine, zerado em InputStream.c:986).

**Risco**

Nenhum. Documentação.

---

## M16

### Registrar proveniência e hashes das bibliotecas estáticas pré-compiladas

**Tamanho:** small

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

24 MB de binários opacos (OpenSSL e Opus) sem versão nem hash impedem auditar CVEs e validar o requisito de páginas de 16KB do Google Play, além de serem um vetor de supply chain.

**Plano de implementação**

Expandir Build.txt (hoje uma linha, Build.txt:1) com: versão exata do OpenSSL e do Opus, commit do moonlight-mobile-deps usado, SHA256 de cada um dos 12 arquivos .a, e data do build. Adicionar um script de verificação de hash no CI. Alinhar o `-D__ANDROID_API__=16` de build-openssl.sh:8,18 com o `APP_PLATFORM := android-21` de Application.mk:4. Validar alinhamento de 16KB nas .so finais com llvm-readelf.

**Risco**

Baixo. Se a validação revelar que as .a não suportam 16KB pages, vira um trabalho maior de rebuild das dependências.

---

## M17

### Cache de PreferenceConfiguration com invalidação por listener

**Tamanho:** small

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

readPreferences() faz ~110 leituras (e às vezes escritas em disco) e é chamada em onDraw de botões virtuais e em handlers de toque (DigitalButton.java:162,165,175; DigitalPad.java:56-57; AnalogStickFree.java:313; KeyBoardController.java:390,648). É jank garantido em dispositivos fracos exatamente no modo OSC.

**Plano de implementação**

Adicionar em PreferenceConfiguration um `private static volatile PreferenceConfiguration cached` + getCached(Context), invalidado por OnSharedPreferenceChangeListener registrado no SharedPreferences default e por um hook em ProfilesManager.setActive/update/delete (ProfilesManager.java:143-162, que já tem o mecanismo de listeners). Trocar os call sites de desenho/evento para getCached; manter readPreferences para quem precisa de leitura fresca (StreamSettings, EditProfileActivity).

**Risco**

Baixo-médio: risco de stale config se algum caminho gravar prefs sem passar pelo listener (ex.: escrita direta em Game.java:1726-1733). Mitigar invalidando também em Game.onDestroy/onResume.

---

## M18

### Corrigir o pipeline de frame pacing e reconciliar as opções warp/cap-fps

**Tamanho:** small

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

Hoje a preferência mais visível da categoria de vídeo (frame_pacing, 6 opções na UI) não tem efeito por causa de Game.java:696 e :702; o usuário do fork ajusta latência e nada muda, o que gera relatos falsos de regressão.

**Plano de implementação**

Remover as atribuições de prefConfig.framePacing em Game.java:692-703, manter apenas setPreferLowerDelays/setPreferLowerDelaysTimeoutUs; revisar Game.java:757-765 (cap-fps) para não degradar para BALANCED silenciosamente; documentar no summary de frame_pacing (strings.xml) o que warp/warp2 fazem (multiplicam chosenFrameRate por 2/4 em Game.java:775-777) já que hoje isso não está explicado em lugar nenhum.

**Risco**

Médio: reativa caminhos de código do renderer que estavam efetivamente desligados há tempo (MediaCodecDecoderRenderer.java:1136-1400). Fazer release com aviso e possibilidade de voltar ao modo balanced.

---

## M19

### Preset 'Apollo/Vibeshine + display virtual' como perfil de fábrica

**Tamanho:** small

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

O host do dono do fork cria display virtual automaticamente; a combinação correta de checkbox_use_virtual_display, checkbox_enable_sops, resolução/refresh custom e checkbox_enforce_display_mode é não óbvia e hoje precisa ser montada à mão em cada instalação.

**Plano de implementação**

Adicionar em ProfilesActivity (app/src/main/java/com/limelight/ProfilesActivity.java:39-43) uma opção 'Criar a partir de preset' que instancia SettingsProfile com um Map pré-definido (checkbox_use_virtual_display=true, list_resolution=<nativa do device>, custom_refresh_rate, checkbox_enable_sops=false, video_format=auto). Os presets podem viver em um JSON em res/raw para facilitar manutenção.

**Risco**

Baixo, desde que os presets sejam apenas ponto de partida (perfil editável) e não sobrescrevam configurações globais.

---

## M20

### Corrigir o ciclo de vida de toque dos sticks 'Free' (cancel + relogio + centro obsoleto)

**Tamanho:** small

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

Os tres bugs de AnalogStickFree/keyAnalogStickFree se manifestam exatamente no cenario que o dono do fork mais usa (abrir teclado/IME sobre o stream com o overlay ativo): stick travado, deadzone que nunca solta e salto no primeiro toque.

**Plano de implementação**

Em AnalogStickFree.java:419 e keyAnalogStickFree.java:394 adicionar `case MotionEvent.ACTION_CANCEL:` com reset incondicional; trocar `System.currentTimeMillis()` por `event.getEventTime()` (AnalogStickFree.java:391/399 e equivalentes); mover o calculo de relative_x/y (AnalogStickFree.java:356-370) para depois do switch. Comparar linha a linha com AnalogStick.java:283-348, que ja esta correto.

**Risco**

Baixo; mudar a fonte de tempo altera ligeiramente a sensibilidade do double-click (timeoutDoubleClick=350ms) — vale validar manualmente o gesto de L3/R3 por duplo toque.

---

## M21

### Deteccao de mudanca no envio do OSC + revisao do hack de retransmissao

**Tamanho:** small

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

`VirtualController.sendControllerInputContext()` (VirtualController.java:244) reenvia o estado completo a cada evento e agenda 3 retransmissoes (25/50/75 ms, linhas 269-271) para contornar descarte de pacotes do GFE. Com Apollo/Vibeshine (que nao tem esse bug do GFE) isso e trafego e trabalho desperdicados; e como `removeCallbacks` (linha 246) cancela todas as pendencias, num arrasto continuo as retransmissoes nunca chegam a rodar — o hack so custa, quase nunca ajuda.

**Plano de implementação**

Guardar o ultimo ControllerInputContext enviado e pular o envio quando nada mudou; tornar as retransmissoes condicionais a uma preferencia (ou detectar o tipo do host) e mante-las apenas para o pacote de zeragem (o caso que o comentario das linhas 265-268 realmente descreve).

**Risco**

Suprimir retransmissoes pode reintroduzir stick preso em hosts GFE legados — manter a opcao ligada por padrao para GFE e desligada para Sunshine/Apollo.

---

## M22

### Reservar um controllerNumber dedicado para o OSC quando multiController estiver ativo

**Tamanho:** small

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

Hoje o OSC escreve no defaultContext (controllerNumber 0) e forca o bit 0 da mascara (ControllerHandler.java:404, 1078), colidindo com o jogador 1 fisico. Somado ao bug do `|=` na agregacao, entrada virtual e fisica se misturam.

**Plano de implementação**

Criar um contexto proprio para o OSC (em vez de reutilizar defaultContext) e passa-lo por assignControllerNumberIfNeeded (ControllerHandler.java:457), com reportOscState escrevendo nele; contabilizar o OSC no contador de getAttachedControllerMask (linha 402-405).

**Risco**

Muda o numero de jogador visto pelo host quando o OSC esta ativo junto com um gamepad — pode confundir jogos que amarram jogador 1 ao primeiro dispositivo. Colocar atras de preferencia.

---

## M23

### Documentar o contrato de extras do Game em um único lugar e tipar consistentemente

**Tamanho:** small

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

O Intent do Game é a única fronteira entre as duas metades do app (browsing e streaming) e hoje é um contrato implícito de 13 extras com um caso de tipo inconsistente (EXTRA_APP_ID como String vs int).

**Plano de implementação**

Criar `com.limelight.GameLaunchRequest` (classe Parcelable ou builder) que serialize/desserialize todos os extras declarados em Game.java:256-269, e usar em utils/ServerHelper.java:93-138 e Game.java:564-576. Padronizar EXTRA_APP_ID como int (ver finding). Documentar o contrato em docs/ para agentes futuros.

**Risco**

Baixo-médio: atalhos de launcher já criados usam o formato antigo, então é necessário manter compatibilidade de leitura no ShortcutTrampoline (ShortcutTrampoline.java:395-403).

---

## M24

### Migrar AdapterFragment e as transações de fragment para AndroidX

**Tamanho:** small

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

O app carrega dois frameworks de fragment simultaneamente e paga o preço com commitAllowingStateLoss + try/catch(IllegalStateException) defensivos em AppView.java:153-159.

**Plano de implementação**

Trocar `android.app.Fragment` por `androidx.fragment.app.Fragment` em ui/AdapterFragment.java e `getFragmentManager()` por `getSupportFragmentManager()` em PcView.java:195 e AppView.java:154/:185. Manter a interface AdapterFragmentCallbacks intacta.

**Risco**

Baixo-médio: mudanças de timing de ciclo de vida de fragment podem expor corridas latentes; validar rotação de tela e mudança de preferences com os testes de app/src/test/java/com/limelight/profiles/.

---

## M25

### Adicionar um CLAUDE.md / docs de arquitetura com o mapa de componentes e os pontos de extensão de teclado

**Tamanho:** small

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

O repositório não tem nenhum documento de arquitetura; um agente que abre o projeto pela primeira vez precisa reconstruir do zero as fronteiras (browsing vs streaming), a existência de código morto e as armadilhas (Game.instance, onStop->finish, source set órfão 'game').

**Plano de implementação**

Documentar: (a) o mapa de módulos e a fronteira ServerHelper.createStartIntent; (b) os 4 build variants reais e o source set morto; (c) a tabela de arquivos mortos; (d) o caminho completo do teclado (StreamContainer.onCreateInputConnection -> Game.handleCommitText -> enqueueCommitText -> NvConnection.sendUtf8Text -> simplejni.c -> LiSendUtf8TextEvent) com os line numbers; (e) as invariantes perigosas (Game.onStop chama finish; immersive sticky é reaplicado a cada 2s; MoonBridge é sessão única).

**Risco**

Nenhum.

---

## M26

### Conectar a SearchPreference já presente no build à tela de 151 preferências

**Tamanho:** small

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

A dependência com.github.ByteHamster:SearchPreference:v2.5.1 já está em build.gradle e as 6 strings searchpreference_* já estão em values/strings.xml:654-659 e traduzidas em vários locales — alguém começou e não terminou. A tela de settings tem 1026 linhas e 151 preferências em 13 categorias, e encontrar qualquer coisa exige scroll cego.

**Plano de implementação**

Adicionar o <com.bytehamster.lib.preferencesearch.SearchPreference> no topo de preferences.xml (antes do primeiro PreferenceCategory na linha 7), fazer StreamSettings implementar SearchPreferenceResultListener e configurar o SearchConfiguration em StreamSettings.reloadSettings (:82-88) apontando para R.xml.preferences. Verificar se funciona também no EditProfileActivity.ProfilePreferenceFragment, que reusa o mesmo XML.

**Risco**

Baixo. Risco de conflito de tema (a biblioteca usa AppCompat; SettingsTheme já é Theme.AppCompat.NoActionBar na base e AppTheme em values-v29). Se der problema, o plano B é quebrar preferences.xml em PreferenceScreens aninhadas.

---

## M27

### Passada de acessibilidade: contentDescriptions e rótulos de box art

**Tamanho:** small

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

Hoje a tela inicial tem três botões anônimos, cada card de jogo é uma imagem sem rótulo e a UI inteira do display externo (5 botões) é invisível para TalkBack. É baixo esforço e alto impacto para usuários de leitor de tela, e também melhora a navegação por D-pad em TV.

**Plano de implementação**

1) Adicionar android:contentDescription com @string em settingsButton/helpButton/manuallyAddPc de activity_pc_view.xml (:52,:65,:78) e layout-land/activity_pc_view.xml (:45,:58,:71). 2) Em ExternalDisplayControlActivity.createImageButton (:505), acrescentar um parâmetro de contentDescription e preencher nas 5 chamadas (:406,:423,:424,:430,:441). 3) Em AppGridAdapter.populateView (:171) setar imgView.setContentDescription(obj.app.getAppName()) e marcar grid_overlay com setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO); análogo em PcGridAdapter.populateView (:53) com o nome do PC + estado. 4) Substituir os literais 'Edit profile'/'Delete profile' em row_profile.xml:50,:58 por @string. 5) Verificar tamanhos de alvo: floatingMenuButton e overlayToggleZoomButton em activity_game.xml (:92,:105) têm 36dp, abaixo do mínimo de 48dp.

**Risco**

Muito baixo. Nenhuma mudança funcional.

---

## M28

### Substituir dispatch por rótulo no GameMenu e remover o hack de OnGlobalLayoutListener

**Tamanho:** small

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

GameMenu.showMenuDialog identifica a ação clicada comparando o texto do item (:120). Isso quebra com rótulos duplicados — cenário real quando o usuário importa atalhos customizados via JSON (showSpecialKeysMenu:203 usa sc.name sem validação) ou quando o servidor expõe comandos com o mesmo nome (showServerCmd:279). Também acopla lógica de negócio a texto traduzido.

**Plano de implementação**

Usar o índice 'which' do listener de setAdapter para indexar diretamente o array options (que é posicionalmente idêntico ao adapter, já que ambos são preenchidos na mesma ordem). Com isso, o hack de ViewTreeObserver.OnGlobalLayoutListener (:137-151) que só adiciona os itens ao adapter depois do primeiro layout pode ser removido, ou pelo menos passa a ser seguro. Validar que showServerCmd e showSpecialKeysMenu continuam funcionando.

**Risco**

Baixo. Requer teste manual do menu in-game, do submenu de teclas especiais e dos comandos de servidor.

---

## M29

### Soltar todas as teclas/modificadores pendentes ao perder foco, pausar ou esconder overlays

**Tamanho:** small

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

Teclas presas no host (Alt, Shift, Ctrl, Win 'grudados') são um dos bugs mais reportados em clientes de streaming e afetam o PC inteiro, não só o jogo.

**Plano de implementação**

Criar `Game.releaseAllHeldKeys()` que: (a) itera os bits de `modifierFlags` (Game.java:201) enviando KEY_UP dos VKs 0xA0/0xA2/0xA4/0x5B antes de zerar (Game.java:1408); (b) chama um novo `KeyBoardController.releaseAll()` percorrendo `getElements()` e disparando `onReleaseCallback()` nos KeyBoardDigitalButton pressionados/sticky; (c) chama um novo `KeyBoardLayoutController.releaseAll()` que percorre `modifierKeyStates` (KeyBoardLayoutController.java:84) enviando ACTION_UP. Invocar em `onWindowFocusChanged` (1403), `onPause` (1746), `onStop` (1761), `setInputGrabState(false)` (1864) e nos `hide()` dos dois controllers.

**Risco**

Baixo. Cuidado para não enviar KEY_UP após `conn` ser encerrado (checar `connected`).

---

## M30

### Deduplicar eventos de teclado com throttle nos analógicos/D-Pad virtuais

**Tamanho:** small

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

Elimina um flood de até ~500 pacotes ENet RELIABLE por segundo que pode saturar a fila de entrada (MAX_QUEUED_INPUT_PACKETS = 150) e degradar a latência de TODO o teclado, inclusive o físico.

**Plano de implementação**

Em KeyBoardAnalogStickButtonFree.java:118-120 (e no equivalente KeyBoardAnalogStickButton), manter `boolean[] lastStickBool` e só chamar `listener.onkeyEvent` na transição. Em KeyBoardControllerConfigurationLoader.createDiaitalPadButton (linhas 68-112), manter o último `direction` e emitir apenas o delta. Em keyAnalogStickFree.java:404-413, só disparar revoke na transição pressed->released.

**Risco**

Baixo; melhora comportamento e latência. Testar que não há tecla 'presa' quando o gesto termina fora do elemento (o revoke deve continuar sendo emitido no ACTION_UP/CANCEL).

---

## M31

### Corrigir a coerência entre forceQwerty e a flag SS_KBE_FLAG_NON_NORMALIZED, e restaurar o fallback por scancode

**Tamanho:** small

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

Os dois bugs juntos fazem teclados físicos com layout não-US produzirem caracteres errados ou perderem teclas inteiras justamente nos aparelhos mais novos (API 33+), que é onde o mapeamento de layout existe.

**Plano de implementação**

Em KeyboardTranslator.java, criar `public byte getKeyFlags(int keycode, int deviceId)` que devolve 0 apenas se `prefConfig.forceQwerty && hasNormalizedMapping(keycode, deviceId)`; usar em Game.java:2108-2109 e 2181-2182 no lugar da expressão ternária atual. Em KeyboardTranslator.java:412-423, tentar sempre `KeyMapper.getWindowsKeyCode(scancode)` antes de devolver 0.

**Risco**

Médio: altera o que o host recebe para teclados não-US. Precisa de teste com ABNT2, ISO-UK/DE/FR e com o host Apollo/Vibeshine. Recomenda-se um log de diagnóstico (LimeLog) durante a validação.

---

## M32

### Unificar as três cópias de InputConnection e remover StreamView (código morto)

**Tamanho:** small

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

Reduz de 3 para 1 os lugares onde o pipeline de texto precisa ser corrigido; StreamView.java (167 linhas) não é referenciado por nada e induz futuros agentes ao erro de editar o arquivo errado.

**Plano de implementação**

Deletar app/src/main/java/com/limelight/ui/StreamView.java (grep confirma zero referências em .java e .xml). Extrair a lógica compartilhada de StreamContainer.java:180-202 e ExternalControllerView.java:53-85 para uma classe utilitária ou uma interface default, garantindo o mesmo `requestFocus()` e os mesmos flags de EditorInfo nos dois.

**Risco**

Baixo; validar com uma compilação completa e com o fluxo de tela externa.

---

## M33

### Duplo-ESC para abrir o menu e acordes ESC+dígito → F1..F12

**Tamanho:** small

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

Duas features de teclado do V+ que o Artemis não tem, úteis com teclado físico e de custo baixo: checkbox_enable_esc_menu + list_esc_menu_key (duplo toque em 500ms abre o menu, KeyboardInputHandler.kt:322-339) e checkbox_special_key_map (ESC seguido de 1-9/0/-/= vira F1..F12, KeyboardInputHandler.kt:154-232), este último resolvendo a ausência de fileira de função em teclados compactos.

**Plano de implementação**

Reimplementar em Java dentro do handleKeyDown/handleKeyUp da Game (o Artemis não tem o KeyboardInputHandler extraído; a lógica vive em Game.java, ver o caminho em Game.java:2095 e 2206). Copiar a MÁQUINA DE ESTADOS, não o código: escState 0/1/2 com um Runnable de confirmação em 200ms que emite o ESC real caso nenhuma tecla de acorde chegue (KeyboardInputHandler.kt:156-165). Adicionar as duas preferências em PreferenceConfiguration.java e preferences.xml.

**Risco**

Médio. A máquina de estados atrasa o ESC em 200ms quando o mapeamento custom está ligado — penalidade perceptível em jogos onde ESC é o menu. Manter desligado por padrão. Atenção também ao conflito com a lógica de menu já existente do Artemis (prefConfig.enableBackMenu, Game.java:3241).

---

## M34

### Fechar a superficie exportada: PosterContentProvider, PcView e o par art:// + pin/passphrase

**Tamanho:** small

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

Sao tres achados de severidade alta que compartilham a mesma raiz — componentes exportados aceitando entrada sem validacao nem confirmacao. Corrigi-los juntos evita tres rodadas de revisao e mantem o raciocinio de seguranca em um lugar so.

**Plano de implementação**

(1) `PosterContentProvider.java:34-41`: fazer `openFile` respeitar o `UriMatcher`, registrar o padrao `boxart/*/#`, validar o uuid com `UUID.fromString` e canonicalizar o caminho contra `getCacheDir()` antes de abrir; envolver `Integer.parseInt` (:57) em try/catch. (2) `CacheHelper.openPath` (CacheHelper.java:16): rejeitar componentes com `..` ou separador de caminho — beneficia tambem `DiskAssetLoader`. (3) `PcView.java:255-267`: exigir um `AlertDialog` de confirmacao (mostrando host, porta e `getReferrer()`) antes de armar `pendingPairingAddress`, e envolver `new ComputerDetails.AddressTuple(hostname, port)` em try/catch. Adicionar testes Robolectric que chamem o provider com URIs maliciosas e que iniciem `PcView` com extras forjados.

**Risco**

O fluxo de deep link `art://?pin=&passphrase=` ganha um dialogo a mais — pode incomodar quem usa QR code de pareamento do Apollo. Mitigar deixando o dialogo com texto curto e botao afirmativo em destaque. O canal de TV (`TvChannelHelper.java:148`) precisa ser testado em um dispositivo Android TV real depois da mudanca no provider, porque o launcher resolve a URI a partir de outro processo.

---

## M35

### Corrigir a fronteira JNI do envio de texto: byte[] UTF-8 real em vez de GetStringUTFChars

**Tamanho:** small

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

Ataca diretamente a dor numero 2 do dono do fork (enviar texto inteiro pela conexao). Hoje o caminho funciona para ASCII e corrompe qualquer coisa fora do BMP, porque `GetStringUTFChars` devolve CESU-8 e o host espera UTF-8. Alem disso remove um `strlen(NULL)` em potencial. Sem essa correcao, o campo de texto tipo AnyDesk vai funcionar ate o primeiro emoji.

**Plano de implementação**

Mudar `MoonBridge.sendUtf8Text(String)` (MoonBridge.java:396) para `sendUtf8Text(byte[] utf8)`; em `NvConnection.sendUtf8Text` (:619-621) passar `text.getBytes(StandardCharsets.UTF_8)`. No lado C (simplejni.c:127-131), trocar `GetStringUTFChars`/`strlen` por `GetByteArrayElements` + `GetArrayLength`, com `ReleaseByteArrayElements(..., JNI_ABORT)` em todos os caminhos, e checar NULL. Aproveitar para adicionar checagem de NULL nos outros tres `GetStringUTFChars` (:152,:185,:206). `Game.enqueueCommitText` (:4314-4329) ja fatia em bytes UTF-8, entao pode passar os blocos direto sem reconverter para String. Seguir `.claude/rules/jni-boundary.md`: alterar os dois lados, rodar `node tools/codemap/jni-check.mjs` e depois `node tools/codemap/codemap.mjs`.

**Risco**

Erro de assinatura JNI nao e pego pelo compilador e quebra em runtime no meio do stream — por isso o `jni-check.mjs` e obrigatorio. Os testes Robolectric nao exercitam esse caminho (`ShadowMoonBridge` anula o carregamento nativo), entao a validacao precisa ser manual, com um host real, testando ASCII, acentos e emoji.

---

## M36

### Enxugar DeviceUtils e o AccessibilityService ao escopo realmente usado

**Tamanho:** small

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

Duas fontes independentes de exposicao desnecessaria que se resolvem por deducao, nao por construcao. `DeviceUtils` tem ~370 linhas mortas que leem ANDROID_ID, MAC e estado de root; o AccessibilityService pede leitura de conteudo de tela para reencaminhar teclas. Ambos aparecem em revisao de politica do Google Play e ambos assustam quem le o codigo pela primeira vez.

**Plano de implementação**

Em `DeviceUtils.java`, manter apenas `getModel()` (:283), `getManufacturer()` (:273) e `getSDKVersionName()` (:72) — confirmados como os unicos usados por varredura de `DeviceUtils.` no codigo — e apagar o restante, incluindo `readCpuInfo` (:380) com seu `ProcessBuilder`. Em `res/xml/keyboard_accessibility_service.xml`, remover `canRetrieveWindowContent`, remover `flagRetrieveInteractiveWindows`, reduzir `accessibilityEventTypes` a `typeWindowStateChanged` e adicionar `android:packageNames`. Em `KeyboardAccessibilityService.onServiceConnected` (:52-61), trocar `TYPES_ALL_MASK` por o mesmo tipo unico e `FEEDBACK_SPOKEN` por `FEEDBACK_GENERIC`.

**Risco**

Baixo em `DeviceUtils` (codigo comprovadamente nao chamado). No AccessibilityService, o risco real e que a reducao de flags quebre a captura de teclas em algum aparelho — `flagRequestFilterKeyEvents` e o que importa e permanece, mas convem testar em um tablet Xiaomi (o caso citado no comentario da linha 30) e em um dispositivo com teclado fisico antes de publicar.

---

## M37

### Corrigir e documentar a matriz de compatibilidade de host (Apollo vs Sunshine/Vibeshine)

**Tamanho:** small

**Subsistema:** Delta Artemis vs Moonlight upstream — ver [referência](../reference/artemis-vs-moonlight.md)

**Por quê**

O dono do fork usa Vibeshine, não Apollo. Hoje a informação está espalhada em strings de UI (strings.xml:200, 433, 547, 566, 631, 633, 634) e no README, e nada no código nomeia claramente o que degrada. Um agente que assuma 'Artemis == Apollo' vai propor features mortas.

**Plano de implementação**

Escrever docs/reference/host-compatibility.md com três colunas (Apollo / Sunshine vanilla / Vibeshine-desconhecido) cobrindo: virtual display (NvHTTP.java:550-566 + AppView.java:513), scaleFactor (NvHTTP.java:882), FPS fracionário (StreamConfiguration.java:190-196), server commands (NvHTTP.java:568 + MoonBridge.java:357), clipboard sync (NvHTTP.java:922-937), OTP pairing (PairingManager.java:214-223), permissões (ComputerDetails.java:170-238), appuuid/IDX/currentgameuuid (NvHTTP.java:746-752), management URL (PcView.java:928). Marcar explicitamente o que funciona com QUALQUER host: commit-text/sendUtf8Text, trackpad, teclado virtual, pan/zoom, perfis, gestos, display externo, tuning de decoder, prevent packet loss (LiSendEmptyPayload é client-side).

**Risco**

Baixo. É documentação. O único cuidado é não afirmar coisas sobre o Vibeshine sem verificar — o correto é marcar como 'a verificar no host do usuário' e listar como testar (ler o /serverinfo do host e procurar as tags).

---

## M38

### Fechar as lacunas do gate: lint, links de docs e relatório honesto de estágios pulados

**Tamanho:** small

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

tools/validate.mjs já é a definição de pronto operacional do repositório e já faz a coisa mais importante — avisar quais estágios não rodaram (validate.mjs:105-107), que é o que impede um agente de reportar como verificado o que não executou. Faltam dois estágios cuja ausência enfraquece exatamente os itens do checklist do AGENTS.md que hoje não são verificáveis, e ambos são baratos.

**Plano de implementação**

1. Adicionar um estágio `lint` rodando :app:lintNonRoot_gameDebug, marcado needsSdk como build e test, contra uma lint-baseline.xml versionada — sem a baseline o estágio é inútil, porque não há noção de 'aviso novo'.
2. Adicionar um estágio `docs` (sem needsSdk, portanto executando mesmo em --fast, o único modo disponível na máquina do dono) que verifique links internos quebrados em *.md. Hoje AGENTS.md aponta para quatro documentos inexistentes e setup-ambiente.md:86 para um quinto — esse estágio pega essa classe de deriva antes que ela envelhe.
3. Alinhar o checklist do AGENTS.md com os estágios reais, para que cada item da definição de pronto tenha um verificador correspondente e vice-versa: build, testes, jni-check, mapas, lint, links de docs. Itens que continuam manuais — strings extraídas, teste com teclado aberto em dispositivo — devem estar marcados como manuais, para que um agente saiba que precisa declará-los em vez de assumi-los.
4. Manter em destaque a regra que já existe e é a mais valiosa: se um estágio não pôde rodar, dizer explicitamente qual e por quê. Com o CI no lugar, o caminho preferencial passa a ser abrir o PR e ler os checks — a única prova que não depende da máquina local.

**Risco**

Baixo. O cuidado é gerar a baseline de lint antes de ligar o estágio, senão o gate passa a falhar por dívida herdada e a reação natural será desligar o estágio em vez de reduzir a dívida.

---

## M39

### Reapontar o teste de commitText para o caminho vivo e remover StreamView

**Tamanho:** small

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

É o achado de maior impacto direto sobre a prioridade nº2 do dono do fork. Hoje existe a aparência de cobertura sobre o envio de texto inteiro, e a aparência é pior que a ausência: um agente que rode a suíte e a veja verde conclui que a feature está protegida, quando o código testado nunca executa.

**Plano de implementação**

Passo 1: criar StreamContainerCommitTextTest espelhando os dois casos de StreamViewCommitTextTest.java:30 e :46, mas contra StreamContainer — inflando app/src/main/res/layout/activity_game.xml ou instanciando StreamContainer diretamente e chamando setCommitTextEnabled (StreamContainer.java:156) e onCreateInputConnection (:186). Passo 2: espelhar para ExternalControllerView (ExternalControllerView.java:59), o caminho de display externo instanciado em ExternalDisplayControlActivity.java:388. Passo 3: apagar StreamViewCommitTextTest e app/src/main/java/com/limelight/ui/StreamView.java. Passo 4: ampliar para os casos que realmente quebram e que o teste atual nem tenta — texto multibyte e emoji, o ciclo setComposingText/finishComposingText usado por todo teclado preditivo (Gboard, SwiftKey), string vazia e deleteSurroundingText — verificando em cada um que MoonBridge.sendUtf8Text recebe o texto completo de uma vez, que é o comportamento que o dono quer.

**Risco**

Baixo. StreamView é comprovadamente morto (sem referência em layout nem instanciação em nenhum source set), então a remoção não afeta runtime. O único risco é a inflação de activity_game.xml em Robolectric esbarrar em GLSurfaceView — se ocorrer, instanciar StreamContainer programaticamente em vez de inflar o layout.

---

## M40

### Adicionar signingConfigs lido de variáveis de ambiente

**Tamanho:** small

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

Pré-requisito bloqueante do job de release do CI. Sem isso, qualquer automação de release produz APK não assinado — e, pior, produz com o CI verde, porque nada no build falha por falta de assinatura. É a armadilha concreta de copiar o workflow do V+, que exporta as variáveis de keystore assumindo que o build.gradle as lê.

**Plano de implementação**

Em app/build.gradle, antes de buildTypes, adicionar signingConfigs.release condicional: se System.getenv('KEYSTORE_PATH') estiver definido, preencher storeFile, storePassword, keyAlias e keyPassword a partir do ambiente. Em buildTypes.release, aplicar signingConfig signingConfigs.release também condicionalmente, para que builds locais sem as variáveis continuem funcionando (produzindo unsigned, como hoje) em vez de falharem. Usar exatamente os nomes de variável que o workflow do V+ já usa (KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD), para que o workflow seja copiável sem tradução. O key/ já está no .gitignore (.gitignore:22); manter.

**Risco**

Baixo no build. O risco real é operacional: perder o keystore significa não poder mais atualizar o app para quem já o instalou, porque o Android exige a mesma assinatura. Guardar backup fora do GitHub antes de configurar o secret. Nunca commitar o keystore nem colar sua senha em arquivo versionado.

---

## M41

### Instrumentar cobertura com JaCoCo, medindo antes de exigir

**Tamanho:** small

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

Hoje ninguém sabe a cobertura real — 51 testes passando transmite uma impressão otimista demais para 43 mil linhas de produção. Sem medição, 'testar mais' é especulação e a decisão de onde investir esforço não tem base.

**Plano de implementação**

Aplicar o plugin jacoco em app/build.gradle e criar jacocoTestReport ligada a testNonRoot_gameDebugUnitTest, com XML e HTML. Excluir o ruído habitual (R.class, BuildConfig, classes geradas do AndroidX). Publicar o XML como artefato no job verify. Deliberadamente NÃO definir limiar no começo: rodar algumas semanas só para ter o número. Quando houver dado, definir limiar por pacote — com.limelight.ui, com.limelight.preferences e com.limelight.binding.input — e não global, porque Game.java (4.349 linhas) e ControllerHandler (3.473) arrastariam o total para um patamar inatingível, e limiar inatingível é limiar que se desliga.

**Risco**

Baixo. O cuidado é não perseguir o número: a suíte atual tem testes que executam muito código sem assertar nada (StartupCrashTest.java:193 e :208), então a cobertura vai parecer melhor que a proteção real. Ler o relatório como mapa do que nunca é executado, não como nota.

---

## M42

### Matriz de SDK no Robolectric como base do EPIC do teclado

**Tamanho:** small

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

O comportamento de IME e insets muda em pontos específicos — API 30 introduz WindowInsets.Type.ime(), API 35 impõe edge-to-edge — e a suíte inteira roda fixada em 33, exatamente entre os dois. Sem essa matriz, a solução do teclado será validada num único nível e vai quebrar nos outros de forma que só aparece no dispositivo do usuário.

**Plano de implementação**

Depois de mover robolectric.properties para o classpath, definir sdk=33 como padrão lá e anotar explicitamente os testes sensíveis a versão com @Config(sdk = {21, 30, 33, 35}). Aplicar a todo teste novo do EPIC do teclado e aos testes de commitText reapontados. Confirmar antes quais níveis o Robolectric 4.16 (app/build.gradle:189) disponibiliza; se algum não estiver, registrar a lacuna no android_test_setup.md em vez de omiti-la — que é exatamente como a fixação em 33 nasceu. Combinar com a subida de targetSdk: rodar a matriz antes e depois dá o diff exato de comportamento que a subida provoca, que é a informação mais valiosa para projetar o resize.

**Risco**

Baixo em si, mas testes multi-SDK são mais lentos (Robolectric instancia um jar de Android por nível) e podem revelar falhas preexistentes em API 21 — o que é o ponto, não um problema. Reservar tempo para triar essas falhas em vez de fixar de volta em 33.

---

## M43

### Unificar as três implementações de InputConnection em uma só

**Tamanho:** medium

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App, Delta Artemis vs Moonlight upstream, Build, CI, Testes e Qualidade — ver [referência](../reference/arquitetura.md), [referência](../reference/artemis-vs-moonlight.md), [referência](../reference/build-e-ci.md)

> Levantado de forma independente por 3 análises.

**Por quê**

Consertar o teclado hoje significa aplicar a mesma mudança em dois lugares vivos e testá-la em dois. A probabilidade de um agente encontrar apenas o primeiro por grep e declarar pronto é alta — e o resultado é a feature funcionando no display interno e quebrada no externo, com sintoma difícil de diagnosticar porque os dois caminhos parecem idênticos à leitura.

**Plano de implementação**

Criar com.limelight.ui.CommitTextInputConnection (ou uma factory estática) que receba a View hospedeira e um único callback, encapsulando o bloco onCheckIsTextEditor + onCreateInputConnection + BaseInputConnection anônimo. Unificar as três interfaces InputCallbacks hoje separadas (StreamContainer.java:28-31, StreamView.java:159-166, ExternalControllerView.java:87-90) em uma só. StreamContainer.java:186-202 e ExternalControllerView.java:59-85 passam a delegar; Game.java:141-142 deixa de implementar duas interfaces e passa a implementar uma. Fazer DEPOIS da ideia anterior, para que os testes já existam contra os dois caminhos e sirvam de rede de segurança — refatorar primeiro e testar depois inverte a ordem que dá garantia.

**Risco**

Médio. Game.java tem 4.349 linhas e fan-out 44; mexer nas interfaces que ela implementa toca uma god-class. Mitigação: dois commits — primeiro introduzir a interface unificada mantendo as antigas como extends dela (compatível), depois remover as antigas. Consultar `node tools/codemap/query.mjs --callers` antes, para confirmar quem mais depende dessas interfaces.

---

## M44

### Reaproveitar SSLContext/OkHttpClient e trocar as threads de poll por um pool

**Tamanho:** medium

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

O polling em idle é o maior consumidor de CPU/bateria do app fora do stream: handshake TLS completo + criação de SSLContext por requisição (NvHTTP.java:462-472,495), pool de conexões desabilitado (:178) e 4 threads novas por PC a cada 1,5 s (ComputerManagerService.java:601-625,46).

**Plano de implementação**

1) Mover a criação do SSLContext/SSLSocketFactory para initializeHttpState() (NvHTTP.java:114-192) e aplicá-lo nos três clientes; medir se o 'SSLv3 fallback' citado no comentário (:463-464) ainda ocorre em minSdk atual. 2) Aumentar o ConnectionPool para permitir keep-alive entre polls consecutivos. 3) Substituir os `new Thread()` de startParallelPollThread por um ExecutorService compartilhado. 4) Sondar apenas o activeAddress enquanto o PC estiver ONLINE, revalidando os outros só em falha ou quando o NetworkCallback (:742-773) disparar.

**Risco**

O comentário em NvHTTP.java:462-464 sugere que o hack existe por um bug histórico de Android; remover sem testar em dispositivos antigos pode reintroduzir falhas de handshake. Fazer a mudança atrás de um flag e testar em Android 7-9. A otimização de 'sondar só o endereço ativo' atrasa a detecção de troca LAN↔WAN — mitigar com revalidação periódica a cada N ciclos.

---

## M45

### Persistir capacidades e httpsPort no banco para eliminar o round-trip HTTP de descoberta de porta

**Tamanho:** medium

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

getHttpsUrl() faz um GET HTTP /serverinfo extra sempre que httpsPort==0 (NvHTTP.java:194-202), e tryPollIp passa 0 sempre que a porta do endereço não bate com a do activeAddress (ComputerManagerService.java:549-552). Além disso a UI abre sem saber pairState/capacidades porque getComputerFromCursor força state=UNKNOWN (ComputerDatabaseManager.java:178).

**Plano de implementação**

Adicionar uma coluna JSON 'Capabilities' em computers4.db (ComputerDatabaseManager.java:62-67, com CREATE TABLE IF NOT EXISTS + ALTER TABLE tolerante) contendo httpsPort, permission, vDisplaySupported/DriverReady, serverCommands e um timestamp. Popular em updateComputer() (:110-139), ler em getComputerFromCursor() (:141-181) marcando como stale, e usar o httpsPort cacheado como palpite inicial em tryPollIp.

**Risco**

Migração de schema — versões antigas do app não entendem a coluna nova (aceitável, é aditivo). Cache stale pode apontar para uma porta HTTPS antiga; manter o fallback de redescoberta quando o handshake falhar.

---

## M46

### Resync explicito do AudioTrack em vez de descarte cego

**Tamanho:** medium

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

O heuristico atual (descartar o sample se pending > 40 ms, AndroidAudioRenderer.java:190-199) nao corrige a causa: o backlog continua la e o padrao se repete, produzindo picotes continuos em vez de um unico salto. Combinado com o flush total da LBQ nativa ao estourar 30 itens (AudioStream.c:151-156), o comportamento sob rede ruim e imprevisivel.

**Plano de implementação**

Em `AndroidAudioRenderer.playDecodedAudio`, ao cruzar o limiar: `track.pause(); track.flush(); track.play();` e registrar o evento no contador; escrever o sample atual normalmente apos o flush. Derivar o limiar de `samplesPerFrame` (guardado em setup(), AndroidAudioRenderer.java:68) e do buffer real via `track.getBufferSizeInFrames()` em vez do 40 fixo. Opcionalmente expor `LiGetPendingAudioFrames()` (ja existe em AudioStream.c:470) via JNI para decidir com granularidade de pacote.

**Risco**

Medio. Um flush do AudioTrack produz um corte audivel de curta duracao; se o limiar for muito agressivo o resultado pode ser pior que o atual. Precisa de teste sob perda de pacotes simulada (por exemplo, com o dispositivo em Wi-Fi congestionado) e de um limiar conservador inicial.

---

## M47

### Audio focus e reconfiguracao dinamica ao trocar de dispositivo de saida

**Tamanho:** medium

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

O app e usado em celular/tablet, onde trocar para fone Bluetooth no meio da sessao e rotina. Hoje o AudioTrack criado para o alto-falante interno sobrevive a troca com um modo low-latency que ja nao faz sentido, e o stream nunca cede foco de audio a chamadas/notificacoes. Nenhuma ocorrencia de requestAudioFocus/AudioDeviceCallback existe no codebase.

**Plano de implementação**

Em `AndroidAudioRenderer.start()` (linha 203), solicitar `AudioFocusRequest.Builder(AUDIOFOCUS_GAIN)` com os mesmos `AudioAttributes` USAGE_GAME construidos em `createAudioTrack` (linha 29) e abandonar em `stop()` (linha 214). Registrar um `AudioDeviceCallback` no AudioManager e, em add/remove de dispositivo de saida, refazer a cascata de `setup()` (linhas 104-178) — isso exige extrair o loop para um metodo `rebuildTrack()` e sincronizar com a thread AudioDec (a escrita ocorre em `playDecodedAudio`, chamada da thread nativa).

**Risco**

Medio. A recriacao do AudioTrack precisa ser thread-safe em relacao a `track.write()` em andamento (thread AudioDec nativa), sob pena de IllegalStateException ou uso apos release — reforca a necessidade de corrigir antes a falta de null-guards (ver finding correspondente). Ceder audio focus tambem pode surpreender quem espera que o jogo continue tocando durante uma notificacao; deixar configuravel.

---

## M48

### Expor controles de latencia/qualidade de audio nas preferencias

**Tamanho:** medium

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

Hoje a duracao do pacote de audio (5 vs 10 ms) e o high quality surround sao decididos exclusivamente por limiares de bitrate de video hardcoded no submodulo (SdpGenerator.c:492-523: >=15000 kbps para HQ surround, <5000 kbps para 10 ms). Um usuario com display virtual do Vibeshine e bitrate alto nao tem como pedir pacotes de 10 ms para economizar banda, nem como declarar que seu device tem decoder lento.

**Plano de implementação**

Adicionar uma preferencia em `res/xml/preferences.xml` na categoria de audio (linhas 222-239) do tipo "prioridade de audio: latencia / equilibrado / banda". Mapear para as capabilities do renderer: `CAPABILITY_SLOW_OPUS_DECODER` (0x8, Limelight.h:257) forca 10 ms e desabilita HQ surround; sem ela mantem o comportamento atual. Passar o valor de Java ate `callbacks.c:413` via um novo parametro de `startConnection` (analogo ao `videoCapabilities` ja passado em callbacks.c:495), evitando patchear o submodulo.

**Risco**

Medio-baixo. Nao requer fork do moonlight-common-c porque as capabilities ja sao o mecanismo oficial de configuracao. Risco de confundir o usuario com mais uma opcao — mitigar com um summary explicito e default = comportamento atual.

---

## M49

### Corrigir o descasamento entre zoom/pan e coordenadas de toque/caneta

**Tamanho:** medium

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

Sem isso, qualquer melhoria de layout (incluindo o EPIC do IME) herda um erro de mapeamento proporcional ao fator de zoom. É também um bug visível hoje para quem usa o botão de zoom flutuante.

**Plano de implementação**

Unificar a conversão numa função `float[] screenToVideoNormalized(float x, float y)` em `Game.java`, usando `streamContainer.getSurfaceView()` (a view que o `PanZoomHandler` realmente transforma, PanZoomHandler.java:30/129-133) em vez do `streamContainer`. Substituir as chamadas em `getNormalizedCoordinates` (2532-2540), `getStreamViewRelativeNormalizedXY` (2503-2530), `updateMousePosition` (3353-3403) e passar a mesma view para `AbsoluteTouchContext` em `applyMouseMode` (4182). Adicionar teste Robolectric com escala 2.0 e pan (-100,-50) verificando que o centro da tela mapeia para o centro do vídeo.

**Risco**

`getSurfaceView()` retorna a GLSurfaceView nos modos 3D (StreamContainer.java:86-94) — validar que a transformação também se aplica lá. Regressão possível em `ScaleMode.STRETCH` e em display externo, onde container e surface têm o mesmo tamanho e o bug é hoje invisível.

---

## M50

### Gestos multi-dedo configuráveis e unificados

**Tamanho:** medium

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

Hoje 3/4/5 dedos são hardcoded para teclado/teclado-completo/menu, com limiares fixos de 300ms (Game.java:165-167) e a lógica duplicada em dois blocos. O dono do fork quer teclado acessível; outros querem colar texto, alternar mouse mode ou abrir o campo de texto novo.

**Plano de implementação**

Extrair `MultiFingerGestureDetector` (novo arquivo em `binding/input/touch/`) alimentado por `handleTouchInput`; substituir os blocos de Game.java:3230-3249 e 3288-3334 por chamadas a ele. Expor as ações como `ListPreference` (`gesture_three_finger_action`, `gesture_four_finger_action`, `gesture_five_finger_action`) em preferences.xml na categoria `category_input_settings` (linha 363), com valores mapeando para métodos já existentes: `toggleKeyboard()` (2402), `toggleFullKeyboard()`, `showGameMenu(null)`, `toggleZoomMode()` (3992), `selectMouseMode(this)` (4091) e o novo overlay de texto. Tornar o limiar de 300ms uma SeekBarPreference.

**Risco**

Médio: mexer no detector afeta todos os modos de toque. Necessário garantir que `cancelStaleTouchState` continue sendo chamado para não deixar cliques pendentes ao disparar um gesto.

---

## M51

### Suportar mais de 2 pontos de toque nos modos de emulação

**Tamanho:** medium

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

O limite de 2 contextos (Game.java:149-150) impede gestos contínuos de 3 dedos (arrastar, swipe entre desktops) que existem em trackpads reais e no AnyDesk, e força o clique do meio de 3 dedos a ser inferido apenas por contagem.

**Plano de implementação**

Parametrizar o tamanho dos arrays (`MAX_TOUCH_CONTEXTS = 5`) e revisar as suposições de índice: `TrackpadContext` linhas 383 (`actionIndex == 1`) e 483 (`checkForConfirmedScroll`), `RelativeTouchContext` linhas 237 e 253, `AbsoluteTouchContext` linha 257. Introduzir no `TrackpadContext` um estado `THREE_FINGER_DRAG` alimentado por `setPointerCount(3)`, emitindo `sendMouseButtonDown(BUTTON_LEFT)` + movimento (comportamento macOS).

**Risco**

Alto risco de regressão nos gestos existentes: `isTap()` depende de `actionIndex + 1 == maxPointerCountInGesture` (TrackpadContext:162, RelativeTouchContext:130) e a promoção de ponteiro em Game.java:3260-3273 assume índice 1. Fazer atrás de uma pref experimental.

---

## M52

### Testes JVM para a máquina de estados dos TouchContexts

**Tamanho:** medium

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

Os três contextos concentram temporizadores, limiares e transições sutis (tap x drag x scroll x flick) e não têm nenhum teste; toda validação é manual e dependente de hardware. Isso trava qualquer refactor seguro do EPIC de input.

**Plano de implementação**

Usar o Robolectric já configurado (robolectric.properties na raiz) para instanciar `TrackpadContext`/`AbsoluteTouchContext`/`RelativeTouchContext` com um `NvConnection` mockado (todos os métodos relevantes são públicos e não-finais: NvConnection.java:490-565) e um `Handler` com `ShadowLooper` controlável. Casos mínimos: tap de 1/2/3 dedos, duplo-toque-arrasta, scroll de 2 dedos com eixo dominante, flick com botão não-esquerdo (regressão do finding #1), cancelamento com FLAG_CANCELED.

**Risco**

Baixo; é código novo. Exige extrair a criação do `Handler` para permitir injeção (hoje é `new Handler(Looper.getMainLooper())` nos construtores).

---

## M53

### Unificar o loop de saída: um caminho por modo de pacing

**Tamanho:** medium

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

Hoje existem dois caminhos concorrentes (latest-only e clássico) rodando na mesma iteração, com condição invertida, estatísticas divergentes e um `continue` que pula a recuperação de codec. É a maior fonte de comportamento imprevisível do pipeline e o principal obstáculo para qualquer trabalho de latência.

**Plano de implementação**

Extrair o corpo do while de MediaCodecDecoderRenderer.java:1211-1477 para uma estratégia por modo: (a) LatestOnlyStrategy — drena com 0 µs e apresenta imediatamente; usada quando preferLowerDelays==true; (b) PacedStrategy — dequeue bloqueante + enfileiramento em outputBufferQueue consumido pelo Choreographer em doFrame() (:1068); (c) DropStrategy — a lógica adaptativa de :1284-1429. Garantir que todas incrementem totalFramesRendered/numFramesOut, tratem INFO_OUTPUT_FORMAT_CHANGED e chamem doCodecRecoveryIfRequired() antes de qualquer continue. Remover os blocos SDK<21 e os aninhamentos duplicados no caminho.

**Risco**

Médio-alto. É o núcleo do pipeline; exige teste em pelo menos Qualcomm, MediaTek e Exynos, com o perf overlay ativo comparando incoming/rendering FPS antes e depois.

---

## M54

### Faxina de código morto no pipeline de vídeo

**Tamanho:** medium

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

MediaCodecDecoderRenderer tem 2433 linhas das quais uma fração significativa é inalcançável (pré-Lollipop com minSdk 21, ramos else duplicados, variáveis EWMA nunca lidas, USE_FRAME_RENDER_TIME=false, forceTightThresholds, applyExtraVendorOptions, isMTKDecoderName, StreamView.java inteiro). Isso multiplica o custo de contexto de todo agente que trabalhar aqui.

**Plano de implementação**

Remover, em ordem: (1) StreamView.java inteiro; (2) todos os guards SDK<21 e legacyInputBuffers (:107, :652-654, :1531-1536); (3) os aninhamentos `if(>=21){}else{if(>=21){}else{}}` de :1101-1110, :1337-1351, :1411-1425 e as variáveis __ts; (4) forceTightThresholds (:53-55) e o bloco de reflexão de Game.java:673-688; (5) ewmaDecodeToPresentNs, MAX_FACTOR, highRefresh, managedMode, isC2Decoder; (6) USE_FRAME_RENDER_TIME e o listener de :780-792; (7) MediaCodecHelper.applyExtraVendorOptions e isMTKDecoderName, OU ativá-los de verdade. Estimativa: -400 a -500 linhas.

**Risco**

Baixo se feito com um commit por item e verificação de compilação. O único cuidado é confirmar que nenhum fork downstream depende dos métodos públicos removidos (setForceTightThresholds é público).

---

## M55

### Estatísticas de vídeo confiáveis: rendered FPS real e agregação thread-safe

**Tamanho:** medium

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

Com o caminho latest-only ativo, o 'Rendering FPS' do overlay é sistematicamente subnotificado, e VideoStats é escrito por três threads sem sincronização. Sem métricas confiáveis, qualquer trabalho de latência vira adivinhação.

**Plano de implementação**

Converter os campos de VideoStats.java para tipos atômicos (LongAdder/AtomicInteger) ou trocar a agregação por troca de instância imutável a cada janela. Incrementar totalFramesRendered em todos os caminhos de apresentação. Adicionar ao overlay: modo de pacing efetivo, nome do decoder, flags low-latency aceitas (já logadas em :645-646 mas não expostas) e o tamanho médio de outputBufferQueue. Guardar as divisões de :1791/:1816/:1854 contra zero.

**Risco**

Baixo. Mudança observável apenas no overlay/log.

---

## M56

### Usar o caminho PBO assíncrono já implementado no Stereo3DRenderer

**Tamanho:** medium

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

readPixelsForAI_Async() (Stereo3DRenderer.java:660-687) implementa double-buffering com PBO e glMapBufferRange, mas onDrawFrame chama a versão síncrona readPixelsForAI() (:647), que faz glReadPixels bloqueante na thread GL a cada frame — um stall de GPU garantido por frame nos modos 3D.

**Plano de implementação**

Trocar a chamada de :447 para readPixelsForAI_Async(), mantendo readPixelsForAI como fallback quando o retorno for false nas primeiras iterações (o PBO de leitura só tem dado válido a partir do segundo frame). Medir com o campo drawDelay já exposto no overlay (:1829).

**Risco**

Médio: PBOs exigem GLES3 (o contexto já é setEGLContextClientVersion(3), StreamContainer.java:88) e alguns drivers têm bugs em glMapBufferRange — manter fallback e um flag de preferência.

---

## M57

### Habilitar AV1 no modo AUTO e expor override manual de decoder

**Tamanho:** medium

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

AV1 hoje só existe se o usuário forçar, desperdiçando toda a lógica de performance point já escrita; e a lista preferredDecoders (que permitiria 'forçar decoder X') está vazia, apesar de o mecanismo estar pronto em findPreferredDecoder().

**Plano de implementação**

Em MediaCodecDecoderRenderer.findAv1Decoder (:329), permitir AUTO quando isDecoderWhitelistedForAv1() passar E decoderCanMeetPerformancePoint() aprovar na resolução/FPS alvo. Popular MediaCodecHelper.preferredDecoders (:87-88) a partir de uma nova preferência de texto ('decoder override') exposta em StreamSettings (que já usa findProbableSafeDecoder em :536-537 para listar codecs).

**Risco**

Médio para AV1 (decoders AV1 de hardware ainda são irregulares — manter a checagem isSoftwareOnly de MediaCodecHelper.java:868); baixo para o override manual, que é opt-in e ajuda enormemente na triagem de bugs de device.

---

## M58

### HDR10: colorspace BT.2020 e transfer ST2084 corretos

**Tamanho:** medium

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

O cliente anuncia BT.709 ao host mesmo quando negocia HEVC Main10 HDR10, e nunca usa COLOR_TRANSFER_ST2084. Com Apollo/Vibeshine e display virtual, isso pode causar conversão de gamut desnecessária no host.

**Plano de implementação**

Fazer getPreferredColorSpace() (:498) retornar COLORSPACE_REC_2020 quando (videoFormat & VIDEO_FORMAT_MASK_10BIT) != 0, e avaliar setar KEY_COLOR_TRANSFER=COLOR_TRANSFER_ST2084 + KEY_COLOR_STANDARD=COLOR_STANDARD_BT2020 no createBaseMediaFormat quando o metadata HDR estiver presente (hoje o bloco :557-571 pula essas chaves inteiramente em 10-bit). Validar contra o comportamento real do Vibeshine antes de tornar padrão.

**Risco**

Médio-alto: mexer em colorspace é a categoria de mudança com maior chance de produzir imagem lavada/saturada em algum device. Colocar atrás de uma preferência experimental.

---

## M59

### Bridgear o callback setAdaptiveTriggers da DualSense

**Tamanho:** medium

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

A extensão de protocolo já está implementada e roteada no C do fork (ControlStream.c:144, 237, 1003, 1080-1088) mas morre num no-op por falta de 12 linhas de cola. É feature paga e não entregue.

**Plano de implementação**

Em callbacks.c: criar `BridgeClSetAdaptiveTriggers(uint16_t, uint8_t, uint8_t, uint8_t, uint8_t*, uint8_t*)` no molde de BridgeClSetControllerLED (callbacks.c:381-390), convertendo os dois arrays de DS_EFFECT_PAYLOAD_SIZE=10 bytes (Limelight.h:474) em jbyteArray e deletando os local refs; registrar o jmethodID em MoonBridge_init (callbacks.c:104); preencher `.setAdaptiveTriggers` em BridgeConnListenerCallbacks (callbacks.c:428); declarar `bridgeClSetAdaptiveTriggers` em MoonBridge.java (junto de bridgeClSetControllerLED, MoonBridge.java:325-329) e adicionar o método a NvConnectionListener; consumir em ControllerHandler.

**Risco**

Baixo-médio. Requer cuidado com local refs (ver achado de vazamento) e com o mapeamento dos efeitos para a API de vibração do Android, que não tem equivalente direto de adaptive trigger — pode acabar sendo apenas um stub logado.

---

## M60

### Adicionar bindings faltantes de APIs Li* já disponíveis no C

**Tamanho:** medium

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

Várias APIs úteis estão compiladas na .so mas inacessíveis ao Java, o que leva a workarounds no lado Java. Expor é barato e desbloqueia melhorias futuras.

**Plano de implementação**

Adicionar wrappers em simplejni.c + declarações em MoonBridge.java para: LiRequestIdrFrame (Limelight.h:968, útil para recuperação de corrupção), LiGetPendingAudioFrames (Limelight.h:859), LiGetCurrentHostDisplayHdrMode (Limelight.h:933), LiGetMillis (Limelight.h:844, para alinhar timestamps de latência com receiveTimeMs/enqueueTimeMs), LiGetProtocolFromPortFlagIndex/LiGetPortFromPortFlagIndex (Limelight.h:894,897). Cada um é um wrapper de 3-4 linhas no padrão de simplejni.c:172-202.

**Risco**

Baixo. Adições puras. Manter a ordem de declaração em MoonBridge.java coerente para facilitar diff com o upstream moonlight-android.

---

## M61

### Perfis como delta + limpeza de chaves de runtime

**Tamanho:** medium

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

Perfis-snapshot congelam configurações e carregam lixo (performance_log, zoom/pan), causando o sintoma 'mudei nas configurações e não mudou nada' e inflando profiles.json.

**Plano de implementação**

Em EditProfileActivity.saveProfile (EditProfileActivity.java:119-159) aplicar o diff() já existente (:232-248) contra PreferenceManager.getDefaultSharedPreferences(this).getAll() e remover uma denylist fixa (performance_log, number_zoom_scale, number_pan_offset_x, number_pan_offset_y). Adicionar migração one-shot que reduz perfis existentes ao delta na primeira carga (ProfilesManager.load, :49-100). Exibir na UI do editor 'N configurações sobrescritas'.

**Risco**

Médio: reduzir um perfil existente para delta muda semanticamente o que ele faz (chaves antes congeladas passam a seguir o global). Fazer backup do profiles.json antes da migração e avisar o usuário.

---

## M62

### Busca e navegação dentro das configurações

**Tamanho:** medium

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

São 133 chaves em 11 categorias numa única PreferenceScreen plana de 1026 linhas de XML; achar 'commit text' ou 'metered bitrate' exige rolagem longa, o que agrava a percepção de que 'a opção não existe'.

**Plano de implementação**

Migrar de uma tela única para PreferenceScreen aninhadas ou adicionar uma SearchView na StreamSettings que filtre por título/summary percorrendo getPreferenceScreen() recursivamente (existe helper análogo em EditProfileActivity.highlightPreferences, EditProfileActivity.java:314-328). Alternativa mais barata: manter a tela e apenas ajustar app:initialExpandedChildrenCount por categoria com base em telemetria de uso.

**Risco**

Médio: a lógica de poda dinâmica de StreamSettings.initializePreferences (StreamSettings.java:335-403) assume uma hierarquia plana com categorias conhecidas; aninhar telas exige revisar todos os findPreference.

---

## M63

### Export/import de configuração completa (incluindo perfis)

**Tamanho:** medium

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

O backup do Android exclui todas as SharedPreferences (backup_rules.xml:3), então trocar de aparelho significa reconfigurar ~130 opções à mão. O app já exporta layout de teclado via FileProvider e tem um exportador de todas as prefs escrito porém morto (StreamSettings.java:1073-1084).

**Plano de implementação**

Criar Preference 'Exportar configurações' em category_settings_misc (preferences.xml:979-1025) reaproveitando getAllJsonData + FileProvider (padrão de StreamSettings.java:822-847), incluindo profiles.json e os arquivos OSC/OSC_Keyboard*; e 'Importar configurações' com ACTION_OPEN_DOCUMENT (padrão de StreamSettings.java:743-756 e onActivityResult :998-1045), com validação de versão e allowlist de chaves para não importar estado dependente de dispositivo (resoluções nativas, GlPreferences, DecoderTombstone).

**Risco**

Médio: importar prefs de outro dispositivo pode reintroduzir exatamente os valores device-specific que motivaram a exclusão do backup; exigir allowlist e diálogo de confirmação.

---

## M64

### Tornar o teclado virtual próprio e o IME configuráveis de forma coerente

**Tamanho:** medium

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

As chaves onscreen_keyboard_* (altura, largura, alinhamento, autofit) têm nomes que sugerem IME mas controlam o teclado desenhado pelo app (KeyBoardLayoutController.java:327-338), e o campo Java se chama onscreenKeyboardAutoFitDisabled enquanto a chave é onscreen_keyboard_autofit (semântica invertida em relação ao nome, PreferenceConfiguration.java:960 e preferences.xml:567-594 onde os seekbars dependem do checkbox). Isso confunde qualquer um que procure 'teclado' nas configurações.

**Plano de implementação**

Renomear os títulos/summaries (strings.xml:490,495) para deixar explícito 'teclado virtual do Artemis' vs 'teclado do sistema (IME)', renomear o campo Java para onscreenKeyboardManualSize (mantendo a chave para compatibilidade) e agrupar as futuras opções de IME numa subcategoria própria adjacente.

**Risco**

Baixo (renomeações de UI e de campo interno; a chave persistida não muda).

---

## M65

### Camada de 'release-all' unificada para OSC, overlay de teclado e gamepads fisicos

**Tamanho:** medium

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

Botao/tecla travado no host e um dos piores modos de falha percebidos pelo usuario e hoje ocorre em varios caminhos: hide() do OSC (VirtualController.java:128), hide(true) do teclado (KeyBoardController.java:230), entrada em PiP (Game.java:1224-1231), perda de foco e ControllerHandler.stop() (ControllerHandler.java:271).

**Plano de implementação**

Definir `interface InputSurface { void releaseAllHeldInput(); }` implementada por VirtualController, KeyBoardController, KeyBoardLayoutController e ControllerHandler. Em ControllerHandler adicionar `releaseAllContexts()` que zera inputMap/triggers/sticks de cada contexto e envia um pacote final (reaproveitando o codigo de releaseControllerNumber :421-427). Chamar a partir de Game.onPause, onWindowFocusChanged(false) e do fluxo de PiP.

**Risco**

Enviar zeros extras e inofensivo para o host, mas cuidado para nao chamar durante o gameplay normal (ex.: ao abrir o menu do jogo o usuario pode querer manter um botao segurado) — deixar o gatilho configuravel.

---

## M66

### Implementar calibracao de IMU do Switch Pro Controller

**Tamanho:** medium

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

O driver ja le calibracao de sticks da flash SPI e ja declara as constantes de IMU (ProConController.java:23-32) — falta so o codigo. Sem isso o gyro reporta valores brutos e acumula drift, degradando aim-por-movimento nos jogos.

**Plano de implementação**

Escrever `loadImuCalibration()` no molde de `loadStickCalibration()` (ProConController.java:374): checar magic 0xB2/0xA1 em USER_IMU_MAGIC_OFFSET (0x8026) via `checkUserCalMagic()` (:364), ler IMU_CALIBRATION_LENGTH (24) bytes de USER_IMU_CALIBRATION_OFFSET (0x8028) ou FACTORY_IMU_CALIBRATION_OFFSET (0x6020) com `spiFlashRead()` (:346), e aplicar offset+escala em handleRead() (:336-341). Chamar do createInputThread (:76) junto com loadStickCalibration.

**Risco**

Exige hardware fisico para validar; o formato dos 24 bytes (acc offset/scale + gyro offset/scale, little-endian int16) precisa conferir com a documentacao de engenharia reversa do Joy-Con.

---

## M67

### Testes de regressao para o mapeamento de botoes e a matriz de quirks

**Tamanho:** medium

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

`handleRemapping()` (ControllerHandler.java:1364-1650) e o coracao de compatibilidade do subsistema, com quirks por VID/PID/scancode para pelo menos 12 familias de controle, e hoje nao ha nenhum teste. Qualquer alteracao (ex.: o fix de JoyCon do fork, linhas 1435-1481) e feita as cegas.

**Plano de implementação**

Com Robolectric (o projeto ja tem robolectric.properties na raiz), escrever testes que constroem um InputDeviceContext falso por familia (DS4 padrao/nao-padrao, Xbox One S BT antigo, Serval, ASUS Gamepad, JoyCon L/R, Switch Pro, 8BitDo) e assertam o keycode retornado por handleRemapping para cada scancode relevante. Complementar com testes de handleDeadZone (incluindo o caminho de anti-deadzone negativo, ControllerHandler.java:1682-1697) e de handleAxisSet (triggersIdleNegative).

**Risco**

handleRemapping e privado e depende de InputDeviceContext (inner class) — precisa de @VisibleForTesting ou extracao para uma classe pura de mapeamento, o que ja e um ganho arquitetural.

---

## M68

### Substituir os singletons estáticos de Activity por um GameBridge (ou binder de sessão)

**Tamanho:** medium

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

Game.instance é lido por um AccessibilityService, um BroadcastReceiver e outra Activity — é a fonte de NPEs em corrida, de vazamentos e da espera ativa de 500ms em ExternalDisplayControlActivity.initViews. Também é o que impede testar KeyboardAccessibilityService e o modo display externo.

**Plano de implementação**

Passo 1 (barato): criar `com.limelight.GameBridge` com métodos estáticos null-safe (isConnected(), handleKeyDown(KeyEvent), handleKeyUp(KeyEvent), handleMotionEvent(View,MotionEvent), toggleKeyboard(), isZoomModeEnabled()) e trocar os 47 acessos diretos (KeyboardAccessibilityService.java:27-44, StartExternalDisplayControlReceiver.java:45-52, utils/ExternalDisplayControlActivity.java:333-384, Game.java:4001/4223) por chamadas à ponte. Passo 2: trocar a implementação interna da ponte por um bound service ou por um objeto de sessão em escopo de Application, eliminando a referência à Activity. Passo 3: substituir o polling de initViews (ExternalDisplayControlActivity.java:149-158) por um callback registrado na ponte.

**Risco**

Médio. Fazer em dois commits (introduzir ponte; depois trocar implementação) para manter o comportamento observável idêntico no primeiro passo.

---

## M69

### Extrair ComputerManagerConnection e eliminar as três cópias do boilerplate de bind

**Tamanho:** medium

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

~200 linhas duplicadas entre PcView, AppView e ShortcutTrampoline, cada uma com tratamento de erro ligeiramente diferente — fonte recorrente de bugs de 'managerBinder == null' e de trabalho de I/O em threads anônimas.

**Plano de implementação**

Criar `com.limelight.computers.ComputerManagerConnection` encapsulando bind/unbind, a thread de waitForReady (ComputerManagerService.java:227), startPolling/stopPolling e o marshalling para a main thread. Refatorar PcView.java:81-108, AppView.java:93-169 e ShortcutTrampoline.java:61-240 para usá-la. Aproveitar para tirar a criação do AppGridAdapter e o I/O de cache de dentro do onServiceConnected (AppView.java:117-138).

**Risco**

Médio: mexe no caminho crítico de descoberta/pareamento. Cobrir com os testes Robolectric já existentes (app/src/test/java/com/limelight/StartupTest.java, StartupCrashTest.java) e testar manualmente pareamento OTP, atalho .art e wake-on-LAN.

---

## M70

### Revisão e conclusão da tradução pt-BR (36% -> 100%)

**Tamanho:** medium

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

O usuário do fork é brasileiro e toda a UI específica do Artemis (perfis, display virtual, clipboard, teclado on-screen, display externo, commit-text) está em inglês em pt-BR. Além disso há erros concretos de qualidade: lusismos ('rato', 'Selecciona'), anglicismos ('crashou', 'dropar'), typo de pontuação e referências obsoletas a GeForce/GameStream que o fork não usa mais.

**Plano de implementação**

1) Corrigir as ocorrências pontuais em values-pt-rBR/strings.xml: linhas 23 (ip_hint), 24-26 (searching_pc), 34/35/112 (crashou), 121 (rede::), 136/218 (dropados/dropar), 246 e 250 (rato/Selecciona). 2) Traduzir as ~419 chaves faltantes priorizando por prefixo: profile_manager_*, vdisplay_*, *clipboard*, keyboard_*, external_display_*/notification_*, game_menu_*, title_/summary_ das categorias novas de preferences.xml. Usar values-zh-rTW (100%) ou values-ru (97%) como referência de escopo — ambos cobrem todas as strings do fork. 3) Decidir o destino de values-pt: hoje 146 das 233 strings são idênticas às de pt-BR; ou reescrevê-lo em pt-PT genuíno ou removê-lo (não é fallback útil, já que pt-BR contém todas as chaves de pt). 4) Reativar o lint MissingTranslation como informational e adicionar contagem de cobertura ao CI.

**Risco**

Baixo tecnicamente; o risco é de consistência terminológica. Criar um glossário curto no repositório (host/PC, stream/transmissão, pareamento, display virtual, perfil, área de transferência) antes de traduzir em volume.

---

## M71

### Introduzir tokens de cor e migrar temas para Material3 antes de qualquer trabalho de tema

**Tamanho:** medium

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

values/colors.xml tem UMA cor. Todas as demais são literais espalhados por styles.xml e por pelo menos 8 layouts. Enquanto isso não for centralizado, tema claro, dynamic color e até ajuste de contraste são inviáveis, e cada mudança visual exige caçar hex em vários arquivos.

**Plano de implementação**

1) Popular values/colors.xml com tokens semânticos (surface, surface_variant, on_surface, on_surface_variant, overlay_scrim, hud_background, key_background, key_background_pressed). 2) Substituir os literais em values/styles.xml (#1A1A1A nas linhas de AppTheme), activity_pc_view.xml:5, layout-land/activity_pc_view.xml:4, activity_add_computer_manually.xml:3, activity_game_display.xml:5, row_profile.xml:24,:33, activity_profiles.xml, activity_game.xml:49,:69, drawable/bg_ax_keyboard_button.xml, bg_ax_keyboard_button_confirm.xml, floating_menu_button.xml, floating_menu_button_active.xml, ic_hud_bg.xml, key_popup_background.xml. 3) Trocar as referências diretas por ?attr/colorSurface etc. onde fizer sentido. 4) Só então avaliar values-night/ e remover o android:forceDarkAllowed="false" de values-v29/styles.xml.

**Risco**

Médio. Mudança visual ampla que precisa de revisão em tela; o comentário em values-v29 ('Avoid some systems like MIUI which break the visibility of games title') indica que forceDarkAllowed=false foi uma correção de bug real em MIUI — não remover sem testar.

---

## M72

### Reativar o seletor nativo de idioma do Android 13+ e migrar para AppCompatDelegate.setApplicationLocales

**Tamanho:** medium

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

LanguagePreference.java existe como subclasse vazia com todo o corpo comentado (:30-48) — o suporte ao seletor nativo foi escrito e desligado. A abordagem atual (UiHelper.setLocale mutando Resources.updateConfiguration, deprecado desde API 25) causa os problemas observados: quatro Activities exibindo idioma diferente das outras, necessidade de System.exit(0) para aplicar a troca (StreamSettings.java:158), e a lista de idiomas duplicada entre arrays.xml e locales_config.xml.

**Plano de implementação**

1) Migrar UiHelper.setLocale (UiHelper.java:77-106) para AppCompatDelegate.setApplicationLocales(LocaleListCompat) — androidx.appcompat 1.7.1 já é dependência e o androidx.appcompat cuida do backport até API 21 via AppLocalesMetadataHolderService. 2) Descomentar e adaptar LanguagePreference.onClick (:30-48) para API 33+. 3) Com isso, arrays.xml deixa de ser a fonte de verdade e locales_config.xml passa a ser suficiente, eliminando a duplicação. 4) Remover o System.exit(0) de StreamSettings.onBackPressed (:158) e a comparação com == (:156). 5) As Activities que hoje não chamam setLocale (ProfilesActivity, HelpActivity, DebugInfoActivity, ExternalDisplayControlActivity) passam a funcionar automaticamente.

**Risco**

Médio. O comentário em UiHelper.java:91 ('nasty non-standard devices which cannot set locale using system config correctly') indica que o hack manual existe por causa de OEMs problemáticas — manter um caminho de fallback e testar em Xiaomi/MIUI e Samsung antes de remover o código antigo.

---

## M73

### Adicionar recursos alternativos para tablets e foldables (sw600dp) e revisar o suporte a TV

**Tamanho:** medium

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

O app declara LEANBACK_LAUNCHER e MULTIWINDOW_LAUNCHER, tem resizeableActivity=true em quase todas as Activities e suporte a Samsung DeX, mas não tem nenhum recurso alternativo por tamanho de tela. Em tablet os cards de 170x220dp ficam perdidos; em TV a única adaptação é 15dp de padding em runtime.

**Plano de implementação**

1) Criar values-sw600dp/dimens.xml com larguras de coluna maiores e mover as dimensões fixas de app_grid_item.xml (170dp/220dp) e app_grid_item_small.xml (110dp/143dp) e de app_grid_view.xml:7 (columnWidth 170dp) para @dimen. 2) Avaliar layout-sw600dp/activity_pc_view.xml com painel lateral persistente em vez da coluna de ImageButtons. 3) Substituir o heurístico de contagem de pixels em StreamSettings.onConfigurationChanged (:135) por androidx.window WindowSizeClass/WindowMetricsCalculator. 4) Para TV, garantir nextFocusUp/Down/Left/Right consistentes (hoje só layout-land/activity_pc_view.xml:51,:64 e pc_grid_view.xml:11 declaram) e revisar o defaultFocusHighlightEnabled="false" de activity_game.xml:19.

**Risco**

Baixo-médio. Requer dispositivos ou emuladores de tablet/foldable/TV para validar. Não mexe em nenhum caminho de streaming.

---

## M74

### Modernizar CachedAppAssetLoader: sair de AsyncTask e corrigir os defeitos de robustez do cache

**Tamanho:** medium

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

AsyncTask é deprecada desde a API 30 e o pipeline de box art acumula três defeitos concretos (NPE potencial de textView, equals sem hashCode em LoaderTuple, evictionCache estático ilimitado e não thread-safe) além de manter um bitmap placeholder 1x1 nunca reciclado. É o segundo caminho mais quente da UI depois do stream.

**Plano de implementação**

1) Substituir a LoaderTask (CachedAppAssetLoader.java:145) por Runnables nos ThreadPoolExecutors já existentes (:34-50) com postagem de resultado via Handler(Looper.getMainLooper()), preservando a mecânica de AsyncDrawable (:255) para cancelamento. 2) Adicionar null-check de imageView/textView em onProgressUpdate (:188) e onPostExecute (:211). 3) Adicionar hashCode() a LoaderTuple (:372). 4) Trocar evictionCache (MemoryAssetLoader.java:29) por um segundo LruCache limitado ou ConcurrentHashMap com poda, e sincronizar o acesso. 5) Considerar substituir tudo por Coil/Glide, o que eliminaria ~600 linhas de código de cache caseiro — mas avaliar o custo em tamanho de APK, já que o projeto hoje não tem nenhuma biblioteca de imagem.

**Risco**

Médio. O cancelamento por AsyncDrawable é sutil e uma regressão aqui aparece como box art trocada entre células durante scroll. Cobrir com testes Robolectric antes de mexer.

---

## M75

### Suporte a dead keys e composição de IME no caminho de tecla individual

**Tamanho:** medium

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

Sem isso, usuários de teclado físico ABNT2/pt-BR, francês, alemão, espanhol etc. não conseguem digitar acentos no host — o caractere é descartado sem qualquer feedback.

**Plano de implementação**

Em Game.handleKeyDown (Game.java:2093-2100): quando `(unicodeChar & KeyCharacterMap.COMBINING_ACCENT) != 0`, guardar `pendingDeadChar = unicodeChar & COMBINING_ACCENT_MASK` e consumir o evento; no próximo KeyEvent com unicodeChar válido, chamar `KeyCharacterMap.getDeadChar(pendingDeadChar, unicodeChar)` e enviar o resultado via `conn.sendUtf8Text`. Se getDeadChar devolver 0, enviar o acento e o caractere separadamente. Limpar `pendingDeadChar` em onWindowFocusChanged (1403) e após timeout. Complementarmente, sobrescrever `setComposingText`/`finishComposingText` no BaseInputConnection de StreamContainer.java:192 para acumular composição e enviar só no commit.

**Risco**

Estado adicional que pode ficar preso se o usuário trocar de janela no meio da composição — mitigado pelos resets. Pode conflitar com jogos que usam a tecla de acento como bind (expor preferência).

---

## M76

### Indicador de estado e feedback visual do teclado (modificadores ativos, texto em envio)

**Tamanho:** medium

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

Hoje o usuário não tem nenhuma indicação de qual modificador está sticky, se o Caps Lock está ligado no host, ou se ainda há texto na fila de envio — o que amplifica a sensação de 'teclado que não funciona'.

**Plano de implementação**

Reaproveitar o `notificationOverlayView` já existente (res/layout/activity_game.xml + Game.java:518, `displayTransientMessage`) ou criar um HUD pequeno: mostrar `modifierFlags` (Game.java:201) e `KeyBoardLayoutController.modifierKeyStates` (linha 84) como chips, e um contador de blocos pendentes em `commitTextQueue` (Game.java:314) durante a injeção de texto.

**Risco**

Baixo; apenas cuidar para não desenhar durante PiP (Game.java:1238-1239) nem impactar o overlay de performance.

---

## M77

### Testes automatizados do pipeline de teclado

**Tamanho:** medium

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

O subsistema tem múltiplos caminhos de entrada convergindo no mesmo código e vários bugs sutis (fila, flags, normalização) que só aparecem em runtime. O projeto já tem infraestrutura de teste (robolectric.properties, app/src/test).

**Plano de implementação**

Testes de unidade para: (a) `KeyboardTranslator.translate` cobrindo todas as faixas, o switch, o fallback de scancode e o comportamento com/sem forceQwerty; (b) `enqueueCommitText` com tamanhos 0/1/99/100/101/5000 e caracteres de 1-4 bytes, verificando que a fila é drenada por completo; (c) a máquina de estados de `handleSpecialKeys` (combos e reentrada dupla); (d) `getModifierState(KeyEvent)` combinando metaState e modifierFlags. Instrumentar com um `NvConnection` fake que registre os pacotes.

**Risco**

Baixo; exige refatorar levemente Game.java para tornar as funções testáveis (extrair a fila de commitText para uma classe própria, ex.: `Utf8TextSender`).

---

## M78

### Teclado overlay com modificadores sticky, modo mini e opacidade — avaliar contra o teclado que o Artemis já tem

**Tamanho:** medium

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

O V+ tem KeyboardUIController.kt (629 linhas): 4 páginas (Main/Nav/Num/Mini), modificadores sticky de 3 estados (MOD_NEUTRAL/MOD_SINGLE/MOD_LOCKED, :431-435 e :502-507), slider de opacidade persistido (:117-128), handle de redimensionamento (:275-337), modo mini flutuante arrastável (:146-147) e popup de preview da tecla (:458). O Artemis já tem teclado virtual próprio e MAIOR (4.186 linhas em binding/input/virtual_controller/keyboard/, com KeyBoardController.java de 795 linhas), além de checkbox_enable_sticky_modifier_key_virtual_keyboard, seekbar_keyboard_axi_opacity e import/export de layout — que o V+ não tem. Portanto isto não é adotar o do V+, é colher ideias pontuais.

**Plano de implementação**

Não portar o KeyboardUIController. Extrair apenas os conceitos ausentes e aplicá-los ao teclado existente: (a) o modo 'mini' — uma barra flutuante compacta só com modificadores, arrastável, que ocupa fração da tela em vez de cobrir o stream, ideia que dialoga diretamente com a dor #1; (b) o popup de preview da tecla ao pressionar; (c) o padrão de gesto de KeyboardGestureDetector.kt:45-53, que distingue release curto de hold (>=200ms) para dar semântica diferente a modificadores. Implementar em KeyBoardController.java e KeyBoardLayoutController.java.

**Risco**

Médio. O teclado do Artemis é grande e tem persistência de layout própria (KeyBoardControllerConfigurationLoader.java, 590 linhas) com import/export exposto ao usuário; introduzir um modo novo exige versionar o formato de configuração para não invalidar layouts salvos.

---

## M79

### Extrair o teclado de Game.java para uma classe própria, seguindo o exemplo estrutural do V+

**Tamanho:** medium

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

Game.java tem 4.348 linhas e fan-out 44 (é a god-class apontada pelo CLAUDE.md). O V+ atacou exatamente isso extraindo KeyboardInputHandler.kt (495 linhas, com o comentário explícito 'extraído de Game.java'), TouchInputHandler.kt, FloatBallHandler.kt, OrientationManager.kt e outros. Como todo trabalho de teclado planejado (dores #1 e #2) vai aterrissar nessa classe, extrair antes reduz o risco de todas as mudanças seguintes.

**Plano de implementação**

Criar com.limelight.binding.input.KeyboardInputHandler em Java, movendo para lá handleKeyDown/handleKeyUp/handleKeyMultiple, handleCommitText (Game.java:4290), handleDeleteSurroundingText (:4299), enqueueCommitText (:4314) e o flushCommitTextQueue (:317-331), com a Game injetada por construtor — mesma forma do V+ (`class KeyboardInputHandler(private val game: Game)`). Manter a interface StreamView.InputCallbacks (StreamView.java:159-166) intacta para não tocar na StreamView. Regerar os mapas com node tools/codemap/codemap.mjs conforme o CLAUDE.md.

**Risco**

Médio. Refatoração pura sem mudança de comportamento, mas mexe no caminho de input mais quente do app; o acoplamento a campos privados da Game (conn, prefConfig, grabbedInput, keyboardTranslator) vai exigir expor getters ou visibilidade de pacote. Fazer em commit isolado, antes das features.

---

## M80

### Varrer os catch silenciosos e remover a reflexao cargo-cult de Game.java

**Tamanho:** medium

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

Sao 86 catches genericos em 24 arquivos, e ja se sabe que pelo menos um esconde codigo morto completo (`SurfaceView.setFrameRate`, que nao existe). A regra `.claude/rules/decoder.md` avisa que regressao invisivel e o modo de falha caracteristico desse subsistema; catch silencioso e exatamente o mecanismo que a torna invisivel. Fazer a varredura de uma vez cria uma linha de base para o lint reclamar dali em diante.

**Plano de implementação**

Comecar pelos casos ja identificados: `Game.java:677-682` (trocar reflexao por `prefConfig.forceTightThresholds` direto), `Game.java:928-931` (remover o bloco ou usar `getHolder().getSurface().setFrameRate` como em :3821), e os 8 `catch (Throwable ignored)` de `MediaCodecDecoderRenderer.java` (:1171,:1191,:1223,:1240,:1245,:1486,:1491,:1494). Regra de decisao: se o catch cobre uma chamada de API opcional por dispositivo, manter mas logar via `LimeLog.warning`; se cobre logica propria, deixar a excecao subir. Em seguida, adicionar `EmptyCatchBlock` ao `app/lint.xml` como erro para impedir reintroducao. Usar `docs/maps/HOTSPOTS.md` para priorizar os arquivos com maior concentracao.

**Risco**

Deixar excecoes subirem onde antes eram engolidas pode revelar crashes que estavam mascarados em dispositivos especificos — o que e o objetivo, mas exige uma janela de teste com os aparelhos da errata (`decoder-errata.txt`) antes de release. Fazer em PRs pequenos por arquivo, nunca em um unico commit gigante.

---

## M81

### Controle e transparencia da sincronizacao de clipboard

**Tamanho:** medium

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

O clipboard e o dado mais sensivel que o app move: gerenciadores de senha colocam credenciais ali. Hoje, com `smartClipboardSync` ligado, todo ganho de foco da janela envia o clipboard local inteiro ao host (`Game.java:2233-2243` -> `:2304`), sem filtro e sem indicacao de que ocorreu (o toast e opcional, `smartClipboardSyncToast`). O default e `false` (`PreferenceConfiguration.java:199`), o que e a decisao certa — mas quem liga a opcao nao tem como saber o que esta sendo enviado. Isso ganha peso quando o campo de texto tipo AnyDesk existir, porque colar sera o fluxo natural.

**Plano de implementação**

Tres camadas. (1) Respeitar a flag de sensibilidade: em `getClipboardContent` (`Game.java:2246`), checar `clipDescription.getExtras().getBoolean("android.content.extra.IS_SENSITIVE")` (API 33+) e `ClipDescription.EXTRA_IS_SENSITIVE`, e nunca enviar clipboard marcado como sensivel — gerenciadores de senha marcam. (2) Trocar o envio automatico no foco por envio explicito: manter `getClipboard` (host->cliente) automatico, mas exigir acao do usuario para `sendClipboard` (cliente->host), que ja existe no menu (`GameMenu.java:295-296`). (3) Verificar a permissao do host antes de tentar: `ComputerDetails.permission` ja carrega os bits `clipboard_set`/`clipboard_read` (documentados em `ComputerDetails.java:187-188`) e hoje nao sao consultados — checar evita requisicoes inuteis contra hosts que nao autorizam.

**Risco**

Mudar o envio automatico para manual e regressao de conveniencia para quem usa a feature hoje. Mitigar com uma sub-preferencia ('enviar automaticamente ao focar' vs 'somente pelo menu'), com o padrao no modo manual. A checagem de `IS_SENSITIVE` depende da versao do Android e do gerenciador de senha cooperar — e defesa parcial, nao garantia.

---

## M82

### Testes de regressao para os caminhos de entrada nao confiavel

**Tamanho:** medium

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

Quase todos os achados de seguranca deste relatorio estao em codigo que processa entrada externa (URIs de provider, deep links, arquivos .art, JSON de perfil, XML do host, SPS da rede) e nenhum deles tem teste. Sao exatamente os caminhos onde uma correcao silenciosamente regride, porque ninguem exercita entrada malformada manualmente. A infraestrutura ja existe: Robolectric 4.16 e JUnit 4.13.2 estao no `build.gradle` e `./gradlew test` roda sem emulador.

**Plano de implementação**

Criar uma suite `app/src/test/java/com/limelight/security/` com casos derivados dos achados: (1) `PosterContentProviderTest` — URIs com `..`, appId nao numerico, contagem de segmentos errada. (2) `AddComputerManuallyTest`/`PcViewTest` — Intents com `port=0`, `port=-1`, `hostname` vazio, `pin` sem `passphrase`. (3) `ShortcutTrampolineTest` — arquivos .art truncados, com linhas invalidas, e `openInputStream` devolvendo null (via ShadowContentResolver). (4) `ProfilesManagerTest` — round-trip Gson lendo todos os tipos de preferencia, incluindo string-set. (5) `NvHTTPTest` — XML do host malformado, `status_code` fora da faixa, `HttpsPort` nao numerico, aproveitando que `getXmlString`/`getXmlArray` sao estaticos e testaveis isoladamente. Rodar via `./gradlew test`, conforme a definicao de pronto do CLAUDE.md.

**Risco**

Baixo — sao testes novos, nao alteram producao. O unico atrito e que alguns exigem Shadows do Robolectric (ContentResolver, PackageManager) que podem exigir configuracao em `robolectric.properties`. Comecar pelos casos puramente estaticos (`NvHTTP`, `ProfilesManager`, `CacheHelper`), que nao precisam de shadow nenhum, e so depois avancar para os que instanciam componentes Android.

---

## M83

### Esconder na UI as features que o host não suporta em vez de só avisar depois

**Tamanho:** medium

**Subsistema:** Delta Artemis vs Moonlight upstream — ver [referência](../reference/artemis-vs-moonlight.md)

**Por quê**

Hoje o app oferece 'Start in Virtual Display' mesmo quando o host não suporta e só mostra um diálogo de aviso com botão 'Proceed' (AppView.java:513-524, UiHelper.java:253-266); o mesmo vale para Server Command (GameMenu.java:304-311) e clipboard. Para quem usa Vibeshine isso é ruído permanente.

**Plano de implementação**

ComputerDetails já carrega vDisplaySupported/vDisplayDriverReady/serverCommands/permission. Usar esses campos para (a) ocultar START_WITH_VDISPLAY/START_WITH_QUIT_VDISPLAY do menu quando !vDisplaySupported (AppView.java:452-472), (b) ocultar os itens de clipboard e Server Command do GameMenu quando os bits de permissão correspondentes estiverem zerados (bits 0x00010000/0x00020000/0x00100000 documentados em ComputerDetails.java:187-191), (c) desabilitar (setEnabled(false)) checkbox_use_virtual_display, seekbar_resolution_scale_factor e custom_refresh_rate em StreamSettings quando nenhum host pareado anunciar VirtualDisplayCapable. Manter um escape hatch em 'avançado' para quem quiser forçar.

**Risco**

Médio-baixo. Precisa de cuidado com o estado ONLINE/UNKNOWN do host: esconder opções porque o polling ainda não completou seria pior que o comportamento atual. Condicionar a esconder só quando state == ONLINE e permission >= 0.

---

## M84

### Suíte de smoke tests para o caminho de teclado

**Tamanho:** medium

**Subsistema:** Delta Artemis vs Moonlight upstream — ver [referência](../reference/artemis-vs-moonlight.md)

**Por quê**

O projeto já tem Robolectric configurado e testes de startup/perfis, mas nada cobre o pipeline de texto. Como as mudanças de teclado são de alto risco e não compilam-e-quebram, testes são o único guarda-corpo antes do dispositivo real.

**Plano de implementação**

Adicionar testes Robolectric para: (a) StreamContainer.onCreateInputConnection devolvendo InputConnection só quando commitTextEnabled (espelhando StreamViewCommitTextTest.java); (b) Game.enqueueCommitText fatiando corretamente strings com emoji/acentos em fronteiras de code point (Game.java:4314-4334) — testável isolando o método ou extraindo o chunker para um utilitário puro; (c) um teste de que a Activity Game aplica ou não FLAG_FULLSCREEN conforme checkbox_full_screen, incluindo depois de onMultiWindowModeChanged. Usar os shadows já existentes (ShadowMoonBridge, ShadowGameManager, ShadowBackdropFrameRenderer em app/src/test/java/com/limelight/shadows/).

**Risco**

Baixo. O maior custo é o chunker estar embutido em Game.java; extraí-lo para com.limelight.utils é um refactor pequeno que já paga o teste.

---

## M85

### Endurecer a resolução de dependências e documentar a proveniência dos binários nativos

**Tamanho:** medium

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

São 22 MB de OpenSSL e 9,8 MB de libopus entrando no APK como binários opacos, mais três dependências resolvidas de um repositório que constrói repositórios GitHub arbitrários sem filtro. Nada disso é verificável hoje por um agente ou revisor — e a OpenSSL em questão está fora de suporte há dois anos e faz a criptografia do pareamento com o host. A regra do AGENTS.md que proíbe editar openssl/ e libopus/ está certa como higiene, mas tem o efeito colateral de tornar essa defasagem invisível.

**Plano de implementação**

Curto prazo, barato e sem risco: (a) restringir o JitPack ao seu namespace em build.gradle:16 com content { includeGroupByRegex "com\\.github\\..*" }; (b) inverter para google() antes de mavenCentral() em build.gradle:4-5 e :13-14; (c) gerar e versionar gradle/verification-metadata.xml via ./gradlew --write-verification-metadata sha256 help, fazendo o CI falhar se o conteúdo de qualquer artefato mudar; (d) criar PROVENANCE.md em openssl/ e libopus/ registrando versão, origem, data e SHA-256 de cada .a — hoje o único indício de versão é opensslv.h:43.

Prazo real: substituir os .a commitados por build reprodutível. Script em tools/ (docker + NDK) que compile OpenSSL 3.x ou BoringSSL e libopus para as 4 ABIs, executado em CI e publicado como artefato, em vez de binários no git. Antes, verificar se moonlight-common-c usa APIs removidas na 3.x — o upstream já enfrentou essa migração e é a melhor fonte de comparação.

**Risco**

A migração de OpenSSL é a parte arriscada: mexe na criptografia do pareamento, e uma regressão quebra a conexão com o host de forma difícil de diagnosticar (falha no handshake, não no build). PR isolado, testar pareamento do zero com Vibeshine e com Apollo antes de mesclar, manter os .a antigos até validar em dispositivo real. Os itens (a) a (d) são independentes e podem ir antes, sem risco.

---

## M86

### Consumir o pacote de controle 0x3001 (Set Clipboard) do Apollo e eliminar o polling HTTP de clipboard

**Tamanho:** large

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

O tipo de pacote já existe na tabela Gen7Enc (ControlStream.c:234) e já é declarado como needsAsyncCallback (:1027), mas não há handler — cai no LC_ASSERT(false) (:1090-1095). Implementar fecha o loop de clipboard bidirecional em push, eliminando o getClipboard() disparado por foco (Game.java:2233-2243) que hoje pode sobrescrever o clipboard do usuário com corpo de erro.

**Plano de implementação**

No submódulo: adicionar o ramo de IDX_SET_CLIPBOARD em queueAsyncCallback() (ControlStream.c:1046-1089), definir a callback em CONNECTION_LISTENER_CALLBACKS e expô-la em simplejni.c como um bridge para o Java (mesmo padrão de bridgeClRumble etc.). No Java, adicionar o callback em MoonBridge e encaminhar para Game, reutilizando a lógica de cloneClipData/CLIPBOARD_IDENTIFIER já existente (Game.java:2290-2302, 2361-2374). Manter o caminho HTTP como fallback para hosts sem a extensão.

**Risco**

Exige mudança em submódulo e no JNI, com risco de crash se o parsing do payload divergir do que o Apollo envia. Necessita host Apollo/Vibeshine para teste. Enquanto não for implementado, remover os dois tipos de needsAsyncCallback() para não deixar o LC_ASSERT armado.

---

## M87

### Extrair a camada de protocolo (nvstream.http) para testes headless

**Tamanho:** large

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

Todo o protocolo GameStream — parsing de XML, pareamento, negociação de capacidades — está hoje acoplado ao Android (BuildConfig, DeviceUtils, import de Toast em PairingManager.java:3) e não tem nenhum teste. Qualquer mudança de protocolo para suportar novas features do Apollo é validada só manualmente contra um host real.

**Plano de implementação**

Remover os imports Android de nvstream.http (injetar deviceName e verbose pelo construtor de NvHTTP, NvHTTP.java:204-239), criar um módulo de teste JVM com fixtures XML de serverinfo/applist para GFE, Sunshine vanilla e Apollo, e cobrir getComputerDetails (NvHTTP.java:401-450), getAppListByReader (:717-781), verifyResponseStatus (:324-340) e as fases de PairingManager.pair (:187-316) com um NvHTTP mockado.

**Risco**

Esforço alto e sem valor visível ao usuário no curto prazo; mas é pré-requisito para mexer com confiança no protocolo (EPICs de texto/clipboard). Fixtures precisam ser capturadas de hosts reais, incluindo Vibeshine.

---

## M88

### Migrar a saida de audio para AAudio/Oboe

**Tamanho:** large

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

O `AudioTrack` da API Java e o caminho de maior latencia disponivel no Android. A cascata de 4 tentativas em AndroidAudioRenderer.java:104-178 e uma heuristica antiga que tenta arrancar baixa latencia de uma API que nao foi feita para isso, e ainda depende de comparar o sample rate nativo do device (linha 151). AAudio em modo EXCLUSIVE/LOW_LATENCY, com callback pull, elimina a escrita bloqueante do Java e a viagem JNI de PCM por pacote.

**Plano de implementação**

Implementar um segundo AudioRenderer nativo: em vez de `BridgeArDecodeAndPlaySample` chamar de volta o Java (callbacks.c:269), escrever o PCM decodificado num ring buffer nativo consumido por um callback AAudio. O Java passaria a apenas selecionar a implementacao (via preferencia) e o `AudioRenderer` Java viraria um no-op nesse modo. Manter o caminho AudioTrack como fallback para devices onde AAudio nao entrega modo low latency.

**Risco**

Alto. AAudio exige API 26+ (o minSdk aqui e android-21, Application.mk:4), tem bugs conhecidos de device-specific em disconnect (fone/BT), e exige gerenciamento manual de underrun/xrun. Deve ser opcional e desligado por padrao ate maturar. Tambem torna o pipeline mais dificil de depurar (o PCM nao passa mais pelo Java).

---

## M89

### Eliminar a cópia por frame no caminho de vídeo (DirectByteBuffer ou modelo pull)

**Tamanho:** large

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

BridgeDrSubmitDecodeUnit copia o frame inteiro para um byte[] Java a cada frame (callbacks.c:166,182). Em 4K120 é uma cópia de vários MB/s no caminho crítico de latência.

**Plano de implementação**

Opção A (menor risco): trocar DecodedFrameBuffer por memória nativa exposta via `NewDirectByteBuffer`, mudando a assinatura de bridgeDrSubmitDecodeUnit (callbacks.c:88, MoonBridge.java:219) e todos os VideoDecoderRenderer. Opção B (maior ganho, maior risco): migrar para CAPABILITY_PULL_RENDERER (Limelight.h:269) expondo LiWaitForNextVideoFrame/LiCompleteVideoFrame (Limelight.h:925-929) e reescrevendo o loop de decodificação no Java. Medir com Perfetto antes de decidir.

**Risco**

Alto. Toca o caminho crítico de vídeo e todos os renderers; regressões aqui são visíveis imediatamente como stutter ou corrupção. Requer teste em múltiplos SoCs.

---

## M90

### Gerar o catálogo de preferências a partir de uma única fonte (eliminar defaults duplicados)

**Tamanho:** large

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

Existem hoje ~130 pares chave/default declarados DUAS vezes (preferences.xml e PreferenceConfiguration.java), sem verificação — foi exatamente isso que produziu checkbox_joycon_fix vs checkbox_enable_joyconfix e checkbox_forceTightThresholds órfã.

**Plano de implementação**

Curto prazo: escrever um teste unitário (app/src/test) que parseia res/xml/preferences.xml, extrai android:key/android:defaultValue e compara com as constantes e defaults refletidos de PreferenceConfiguration, falhando o build em divergência ou chave órfã nos dois sentidos. Longo prazo: gerar PreferenceConfiguration por annotation processor/KSP a partir de um descritor único (chave, tipo, default, categoria, dependência), mantendo os campos públicos atuais para não quebrar os ~35 call sites de readPreferences.

**Risco**

Médio na versão gerada (refatoração ampla); praticamente nulo na versão só-teste, que já pega 90% do valor.

---

## M91

### Extrair uma base comum para os dois overlays (gamepad e teclado)

**Tamanho:** large

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

Aproximadamente 2.000 linhas duplicadas entre virtual_controller/ e virtual_controller/keyboard/ (ver finding de maintainability). A duplicacao ja causou divergencia real: o snapping de layout so existe no lado do teclado, e os bugs dos sticks 'Free' precisaram ser identificados duas vezes.

**Plano de implementação**

Criar `binding/input/overlay/` com `OverlayElement` (ciclo de toque, modos Normal/Move/Resize/Enable, serializacao JSON, opacidade, snapping) e `OverlayController<E extends OverlayElement>` (lista de elementos, botao de configuracao, save/load de perfil). Fazer VirtualControllerElement e keyBoardVirtualControllerElement herdarem dela mantendo os elementId int/String via generics ou string sempre. Migrar em duas etapas para nao quebrar os perfis salvos.

**Risco**

Alto risco de regressao no comportamento de toque e nos perfis persistidos; exige testes manuais amplos. Fazer depois dos quick-wins e apos os EPICs de teclado, para nao bloquear a entrega da funcionalidade que o dono quer.

---

## M92

### Extrair GameWindowController e GameInputRouter de Game.java

**Tamanho:** large

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

Game.java tem 4348 linhas e 12 interfaces; é o gargalo de qualquer trabalho de teclado, insets ou input. Dividir em dois colaboradores bem delimitados reduz o risco de todas as features de teclado subsequentes e torna o comportamento de janela testável.

**Plano de implementação**

GameWindowController absorve: Game.java:357-372 (flags iniciais), :1144-1185 (setPreferredOrientationForActivity), :1425-1443 (shouldIgnoreInsetsForResolution), :1455-1643 (prepareDisplayForRendering), :1646-1699 (hideSystemUi/multi-window), :3915-3928 (onSystemUiVisibilityChange), :1288-1400 (PiP). GameInputRouter absorve: :1893-2231 (teclado + special keys + sendKeys), :2391-3420 (touch/pen/mouse/motion), :3847-3912 (callbacks de evdev/mouse). Game vira a casca que faz binding de ciclo de vida e delega. Fazer em duas PRs separadas, começando pelo WindowController, que é menor e é o que o EPIC de teclado precisa.

**Risco**

Alto: é o coração do app e há muito estado compartilhado (modifierFlags, grabbedInput, isPanZoomMode, connected, currentOrientation). Mitigar movendo estado junto com o comportamento e mantendo os métodos públicos existentes (handleKeyDown etc.) como fachada delegante, para não quebrar os 47 call-sites de Game.instance.

---

## M93

### Migrar os grids de GridView+android.app.Fragment para RecyclerView+androidx.fragment

**Tamanho:** large

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

O caminho de listagem é a parte mais antiga do app: GridView legado, BaseAdapter sem ViewHolder (5 findViewById por bind em GenericGridAdapter.java:66-70), hospedado num android.app.Fragment deprecado (AdapterFragment.java:14) com getFragmentManager() do framework — enquanto StreamSettings já usa AndroidX. A lista de perfis já usa RecyclerView, então existe um padrão interno a seguir. Resolve de uma vez performance de scroll, suporte a tablets (GridLayoutManager com spanCount dinâmico) e o débito de Fragment.

**Plano de implementação**

1) Converter AdapterFragment para androidx.fragment.app.Fragment e trocar getFragmentManager() por getSupportFragmentManager() em PcView.java:195 e AppView.java:154,:185. 2) Trocar app_grid_view.xml/app_grid_view_small.xml/pc_grid_view.xml por RecyclerView com GridLayoutManager e spanCount calculado por largura disponível (elimina a necessidade dos dois layouts _small e permite adaptação a tablet/foldable sem novos qualifiers). 3) Reescrever GenericGridAdapter como RecyclerView.Adapter com ViewHolder, espelhando ProfilesAdapter.ProfileViewHolder. 4) Substituir registerForContextMenu/openContextMenu (PcView.java:901,:911; AppView.java:757,:774) por long-press listeners no ViewHolder ou por BottomSheet. 5) Aproveitar para modernizar CachedAppAssetLoader de AsyncTask para ExecutorService+Handler ou Coroutines/WorkManager, e corrigir o NPE de textView (:205,:223) e o hashCode de LoaderTuple (:382).

**Risco**

Alto em escopo, baixo em risco por item. O menu de contexto do AbsListView é usado extensivamente (AdapterContextMenuInfo em PcView.java:405,:734 e AppView.java:486,:594) e é o ponto que mais quebra. Recomenda-se migrar PcView primeiro (grid menor, menos casos de menu) e só depois AppView. Fazer em PR separado do trabalho de teclado para não misturar riscos.

---

## M94

### Migrar o teclado virtual próprio para layouts orientados a dados, com AltGr e localização

**Tamanho:** large

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

O teclado embutido é hoje um XML de 874 linhas com rótulos fixos e sem acentos/AltGr/numpad — inutilizável para digitar em português. Tornar isso dado (como já é feito para o KeyBoardController via assets/config/keyboard.json) permite entregar layouts US/ABNT2/ISO sem tocar em código e permite o usuário customizar.

**Plano de implementação**

Definir um esquema JSON (linhas -> teclas com `keycode`, `label`, `shiftLabel`, `altGrLabel`, `weight`, `sticky`) em assets/config/; reescrever `KeyBoardLayoutController.initKeyboard()` (linhas 120-259) para construir as views programaticamente a partir do JSON em vez de iterar `keyboardView.getChildAt` com tags; implementar camada AltGr (as teclas estão comentadas em layout_axixi_keyboard.xml:791-802) enviando VK_RMENU (0xA5); implementar auto-repeat com Handler.postDelayed; adicionar seletor de layout em res/xml/preferences.xml (perto de list_onscreen_keyboard_align_mode, linha 599).

**Risco**

Grande superfície de regressão no principal recurso diferenciado do fork; migrar mantendo o XML atual como layout 'legacy' selecionável, e preservar a compatibilidade das preferências existentes de altura/largura/alinhamento/opacidade.

---

## M95

### EPIC — Camada de confianca explicita: fim do downgrade silencioso e visibilidade do estado TLS

**Tamanho:** large

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

O cliente hoje toma tres decisoes de seguranca em silencio: cai para HTTP quando o certificado nao confere (`NvHTTP.java:359-379`), aceita qualquer hostname para o certificado fixado (`:161-174`), e colapsa 'MITM detectado' em 'Pairing failed' (`PairingManager.java:282-287`). Nenhuma delas e visivel ao usuario. Para quem usa Vibeshine com display virtual em rede domestica o risco pratico e baixo, mas o custo de nao ter essa camada aparece no dia em que o host trocar de certificado e ninguem souber distinguir isso de um ataque.

**Plano de implementação**

Introduzir um `TrustState` por host, persistido em `ComputerDatabaseManager` junto do certificado (nova coluna: data do pareamento, fingerprint SHA-256, versao major do servidor observada). Fase 1 — remover o fallback automatico de `getServerInfo` (:375-379) e substituir por uma excecao tipada `ServerCertificateChangedException` que a UI trata com um dialogo dedicado ('o certificado deste host mudou'), com acao explicita de 'confiar no novo certificado' que limpa o pin e refaz o pareamento. Fase 2 — adicionar `PairState.SIGNATURE_MISMATCH` e mensagem propria em `PcView.doPair` (:522-528). Fase 3 — recusar downgrade de hash: se a versao major persistida for >= 7, nao aceitar SHA-1 em `PairingManager.pair` (:192-199). Fase 4 — expor o fingerprint do host na tela de detalhes (ja existe `ComputerDetails.toString()` usado pelo DebugInfoActivity) para que o usuario possa comparar com o que o Apollo/Vibeshine mostra.

**Risco**

Mudanca de comportamento visivel: hosts que legitimamente trocam de certificado (reinstalacao do Sunshine/Apollo, container recriado) passam a exigir acao do usuario onde antes reconectavam sozinhos. Isso e correto do ponto de vista de seguranca mas e uma regressao de conveniencia — precisa de texto de dialogo muito claro. Requer migracao de schema do SQLite (nova coluna), o que significa mais um `LegacyDatabaseReader` ou um `ALTER TABLE` idempotente em `initializeDb`.

---

## M96

### Enxugar o fork: remover Stereo3D/IA se não for usado

**Tamanho:** large

**Subsistema:** Delta Artemis vs Moonlight upstream — ver [referência](../reference/artemis-vs-moonlight.md)

**Por quê**

17 MB de modelo TFLite + litert + litert-gpu + OpenCV 4.12 num app cujo dono migrou para o Artemis justamente 'para escapar do excesso de features do V+'. Além do tamanho, StreamContainer carrega a complexidade dos três modos de render (StreamContainer.java:36-100), e é exatamente o arquivo que precisa mudar para o teclado AnyDesk.

**Plano de implementação**

Deletar app/src/main/assets/midas-midas-v2-w8a8.tflite, Stereo3DRenderer.java (1.148 linhas), ShaderUtils.java, ReflectivePaddingInt8Minimal.java, as dependências litert/litert-gpu/opencv de app/build.gradle:183-185, as prefs parallax_depth/convergence_ratio/balance_shift (PreferenceConfiguration.java:268-271, 388-391) e as entradas de render mode em arrays.xml; simplificar StreamContainer para só o caminho SurfaceView, o que elimina o workaround do 'sempre criar um SurfaceView antes' (StreamContainer.java:82-94) e o uses-feature glEsVersion 3.0 obrigatório do manifest.

**Risco**

Alto para merges futuros: divergir do upstream nesses arquivos torna todo `git merge upstream/moonlight-noir` doloroso, e o ClassicOldSong continua evoluindo o 3D (commits 'update speed - added movie mode' são recentes). Fazer só se o fork assumir que não vai mais acompanhar o upstream de perto — o que é uma decisão de ADR, não de conveniência.

---

