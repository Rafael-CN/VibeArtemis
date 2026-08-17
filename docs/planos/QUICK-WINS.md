# Ganhos rápidos

> Horas, não dias. Bons para ganhar tração no codebase antes de encarar um EPIC.

Cada item tem um código estável. Para começar a trabalhar em um deles, basta
citar o código.

## Índice

| Código | Item | Tamanho |
|---|---|---|
| **Q01** | [Corrigir o aninhamento do STUN em populateExternalAddress](#q01) | quick-win |
| **Q02** | [Validar a resposta de /actions/clipboard antes de escrever no clipboard do Android](#q02) | quick-win |
| **Q03** | [Tornar AddressTuple imutável](#q03) | quick-win |
| **Q04** | [Corrigir a troca de preferencia enableAudioFx/playHostAudio](#q04) | quick-win |
| **Q05** | [Mute local do stream durante a sessao (e cumprir o //静音 todo)](#q05) | quick-win |
| **Q06** | [Rastrear o botão ativo do drag no TrackpadContext (corrige botão preso)](#q06) | quick-win |
| **Q07** | [Aplicar sensibilidade/swap de eixo também ao trackpad de touchscreen](#q07) | quick-win |
| **Q08** | [Indicador visual de modo de toque ativo](#q08) | quick-win |
| **Q09** | [Corrigir o loop infinito de configuração em NVIDIA/MediaTek](#q09) | quick-win |
| **Q10** | [Restaurar o respeito ao frame pacing escolhido pelo usuário](#q10) | quick-win |
| **Q11** | [Corrigir a codificação de sendUtf8Text: trocar String por byte[] UTF-8 real](#q11) | quick-win |
| **Q12** | [Adicionar binding de LiGetHostFeatureFlags para o app conhecer as capacidades do host](#q12) | quick-win |
| **Q13** | [Higienizar preferências mortas e órfãs](#q13) | quick-win |
| **Q14** | [Sincronizar os controles duplicados de bitrate e validar limites](#q14) | quick-win |
| **Q15** | [Telemetria de configuração no DebugInfoActivity](#q15) | quick-win |
| **Q16** | [Corrigir supportedButtonFlags dos drivers USB](#q16) | quick-win |
| **Q17** | [Cachear PreferenceConfiguration nos elementos do OSC e remover leituras de prefs do onDraw](#q17) | quick-win |
| **Q18** | [De-duplicar eventos do stick-para-teclado e remover codigo morto](#q18) | quick-win |
| **Q19** | [Quick win — Corrigir o flush de commitText para payloads >512 bytes](#q19) | quick-win |
| **Q20** | [Quick win — Remover código morto: ui/StreamView.java, ui/ApertureViewGroup.java, app/src/…](#q20) | quick-win |
| **Q21** | [Endurecer o PosterContentProvider (URI matching + validação de path)](#q21) | quick-win |
| **Q22** | [Corrigir enqueueCommitText: textos acima de 512 bytes são descartados silenciosamente](#q22) | quick-win |
| **Q23** | [Ressincronizar a lista de idiomas: liberar polonês, turco, búlgaro e português europeu](#q23) | quick-win |
| **Q24** | [Limpeza de recursos e dependências órfãs + habilitar shrinkResources](#q24) | quick-win |
| **Q25** | [Alternância de teclado por N dedos também no modo de toque nativo (único porte de teclado…](#q25) | quick-win |
| **Q26** | [Registrar em ADR que cherry-pick do V+ é inviável e que todo porte é reimplementação](#q26) | quick-win |
| **Q27** | [Blindar o backup: excluir chave privada, uniqueid e banco de hosts](#q27) | quick-win |
| **Q28** | [Fechar os vazamentos de recurso pontuais ja mapeados](#q28) | quick-win |
| **Q29** | [Consertar o retorno de OverlaySharedPreferences.edit()](#q29) | quick-win |
| **Q30** | [Documentar o delta CRLF para não desperdiçar leitura de diff](#q30) | quick-win |
| **Q31** | [Mover robolectric.properties para o classpath de teste e centralizar a configuração](#q31) | quick-win |
| **Q32** | [Higiene de build: limpar código morto e acelerar a iteração local](#q32) | quick-win |

---

## Q01

### Corrigir o aninhamento do STUN em populateExternalAddress

**Tamanho:** quick-win

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

Bug de uma linha de indentação que desativa completamente a descoberta de endereço externo fora de VPN, quebrando o acesso remoto automático para todo mundo que parear na LAN.

**Plano de implementação**

Em ComputerManagerService.java:333-392, fechar o `if (activeNetworkIsVpn)` logo após o loop de bind de rede (:366) e deixar o bloco STUN (:368-376), o unbind (:378-385) e o unlock (:387-390) no escopo do método. Adicionar LimeLog.info com o endereço resolvido para verificação em campo.

**Risco**

Muito baixo. Passa a haver uma requisição STUN por PC novo detectado via mDNS (ComputerManagerService.java:407-409), como o upstream sempre pretendeu — verificar que não há regressão de latência no primeiro contato.

---

## Q02

### Validar a resposta de /actions/clipboard antes de escrever no clipboard do Android

**Tamanho:** quick-win

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

Evita que uma página de erro do host sobrescreva silenciosamente a área de transferência do usuário a cada perda de foco quando smartClipboardSync está ligado.

**Plano de implementação**

Em NvHTTP.getClipboard() (NvHTTP.java:922-926) devolver null quando a resposta estiver vazia ou começar com '<'; em Game.getClipboard() (Game.java:2360-2374) só chamar setPrimaryClip quando o conteúdo for não-nulo. Gatear a chamada por `details.permission & 0x00020000` (clipboard_read) quando o campo Permission estiver presente.

**Risco**

Baixo. Um host que legitimamente tenha '<' no início do clipboard perderia a sincronização — usar uma heurística mais específica (detectar o corpo de erro exato do Sunshine) se isso incomodar.

---

## Q03

### Tornar AddressTuple imutável

**Tamanho:** quick-win

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

AddressTuple é usado como chave de HashSet na deduplicação de poll (ComputerManagerService.java:604,635) e ComputerDetails.update() muta o campo port in-place (ComputerDetails.java:142), quebrando o contrato de hashCode.

**Plano de implementação**

Marcar `address` e `port` como final em ComputerDetails.AddressTuple (:16-17), remover a normalização mutante do construtor para uma variável local (:28-34) e trocar a atribuição em update() (:142) por criação de um novo tuple.

**Risco**

Baixo; o compilador aponta todos os pontos de mutação. Verificar LegacyDatabaseReader*/ComputerDatabaseManager para atribuições diretas.

---

## Q04

### Corrigir a troca de preferencia enableAudioFx/playHostAudio

**Tamanho:** quick-win

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

Uma unica linha errada em Game.java:876 hoje (a) aumenta a latencia de audio de todo usuario que liga "tocar audio no PC" e (b) torna uma preferencia visivel e traduzida em 20 idiomas completamente inerte. E o maior retorno por caractere de codigo em todo o pipeline de audio.

**Plano de implementação**

Em `app/src/main/java/com/limelight/Game.java:876`, trocar `prefConfig.playHostAudio` por `prefConfig.enableAudioFx`. Verificar que `PreferenceConfiguration.java:1015` continua populando o campo e que `res/xml/preferences.xml:233-238` permanece. Testar as 4 combinacoes (audiofx on/off x host audio on/off) observando a linha de log `Audio track configuration: <bufferSize> <lowLatency>` emitida em AndroidAudioRenderer.java:166.

**Risco**

Praticamente nulo. Unico efeito colateral: usuarios que hoje tem "host audio" ligado vao passar a usar o modo low-latency (buffer menor), o que em dispositivos muito fracos pode expor underruns antes mascarados pelo buffer maior — mitigado pela cascata de 4 tentativas que ja existe.

---

## Q05

### Mute local do stream durante a sessao (e cumprir o //静音 todo)

**Tamanho:** quick-win

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

Existe um TODO explicito de mute em MoonBridge.java:258 que nunca foi implementado. Um toggle de mute local e trivial (o audio ja passa por um unico funil) e util no caso de uso do dono do fork: quando ele abre o teclado virtual para digitar, frequentemente quer silenciar o jogo sem mexer no volume do sistema.

**Plano de implementação**

Adicionar `private volatile boolean muted` em `AndroidAudioRenderer` com setter, e em `playDecodedAudio` (linha 189) retornar cedo quando `muted` — mas continuando a drenar a fila, ou seja, sem pular o consumo (senao o backlog cresce). Expor o toggle no `GameMenu` junto dos demais itens de sessao e remover o comentario TODO de MoonBridge.java:258.

**Risco**

Baixo. Cuidado para nao criar backlog: ao mutar, ainda e preciso descartar os samples (nao apenas nao escreve-los) e idealmente pausar/flushar o AudioTrack para nao segurar buffer preenchido.

---

## Q06

### Rastrear o botão ativo do drag no TrackpadContext (corrige botão preso)

**Tamanho:** quick-win

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

Bug de severidade alta com correção pequena e localizada; botão direito preso no host é o tipo de falha que faz o usuário encerrar a sessão.

**Plano de implementação**

Em `TrackpadContext.java`, adicionar `private byte activeDragButton = MouseButtonPacket.BUTTON_LEFT;` atribuído no mesmo ponto em que `confirmedDrag = true` (linhas 209, 317) e no `isDblClickPending`/tap (252). Usar `activeDragButton` em `momentumRunnable:100`, `touchUpEvent:256-270`, `setPointerCount:448` e `cancelTouch:424`. Transformar `getMouseButtonIndex()` em função pura recebendo o `pointerCount` como parâmetro.

**Risco**

Baixo; a máquina de estados é local à classe. Requer teste manual dos 4 gestos (tap 1/2/3 dedos, duplo-toque-arrasta, flick com 2 dedos).

---

## Q07

### Aplicar sensibilidade/swap de eixo também ao trackpad de touchscreen

**Tamanho:** quick-win

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

Preferências existentes e documentadas na UI não têm efeito no modo de trackpad mais usado (modo 2, padrão em display externo e input-only).

**Plano de implementação**

Trocar `new TrackpadContext(conn, i)` por `new TrackpadContext(conn, i, prefConfig.trackpadSwapAxis, prefConfig.trackpadSensitivityX, prefConfig.trackpadSensitivityY)` em `Game.java:4186`. Se a intenção for separar trackpad físico de virtual, criar `seekbar_virtual_trackpad_sensitivity_x/y` em preferences.xml (categoria `category_virtual_trackpad_settings`, linha 808) e ler em PreferenceConfiguration perto da linha 999.

**Risco**

Usuários que já ajustaram os sliders para o trackpad físico verão o comportamento da tela mudar de uma vez. Mitigar com nota no changelog ou com prefs separadas.

---

## Q08

### Indicador visual de modo de toque ativo

**Tamanho:** quick-win

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

Com 6 modos de mouse, pan/zoom, cursor local e captura de ponteiro alternáveis em runtime (Game.java:4091-4151, 3992-4004), é fácil o usuário não saber por que o toque "parou de funcionar" — especialmente após `applyMouseMode(4)` (desabilitado) ou `isPanZoomMode`.

**Plano de implementação**

Reutilizar `notificationOverlayView` (Game.java:225-226) e `updateZoomButtonAppearance` (4001-1009) para exibir um chip persistente com o modo atual; alternativamente, mudar o ícone do `overlayToggleZoomButton` (activity_game.xml:105-117). Emitir a notificação em `applyMouseMode` e `toggleMouseLocalCursor`.

**Risco**

Mínimo; apenas UI. Cuidar para não poluir a tela em sessões de jogo (respeitar `isHidingOverlays`, Game.java:222).

---

## Q09

### Corrigir o loop infinito de configuração em NVIDIA/MediaTek

**Tamanho:** quick-win

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

É o único bug com potencial de travar o app por tempo indefinido, e afeta exatamente as duas famílias de SoC mais comuns em Android TV boxes e tablets baratos.

**Plano de implementação**

Em MediaCodecHelper.java:541, envolver o bloco NVIDIA em `if (tryNumber < 4)`. Em :672, mover `setNewOption = true;` para dentro do `if (tryNumber < 4)` que começa em :637. Adicionar em MediaCodecDecoderRenderer.java:756 um teto `if (tryNumber > 8) return -5;`.

**Risco**

Baixo. Só reduz o número de tentativas; o caminho de sucesso não muda.

---

## Q10

### Restaurar o respeito ao frame pacing escolhido pelo usuário

**Tamanho:** quick-win

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

Remover duas linhas devolve ao usuário quatro modos de pacing que hoje estão inertes, e torna honestos os logs de performance (Game.java:1848).

**Plano de implementação**

Deletar as atribuições `prefConfig.framePacing = FRAME_PACING_BALANCED;` de Game.java:696 e :702, mantendo apenas setPreferLowerDelays/setPreferLowerDelaysTimeoutUs. Fazer depois do item de unificação do loop, para não expor caminhos de pacing ainda instáveis.

**Risco**

Médio se feito isolado (expõe código de pacing pouco testado); baixo se feito após a unificação do loop.

---

## Q11

### Corrigir a codificação de sendUtf8Text: trocar String por byte[] UTF-8 real

**Tamanho:** quick-win

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

Resolve de uma vez três problemas: emoji/caracteres fora do BMP corrompidos (CESU-8), dependência de strlen, e a conversão duplicada (o Java já produz os bytes UTF-8 corretos em Game.java:4318 e os descarta). É a mudança de maior relação valor/risco para a feature de campo de texto.

**Plano de implementação**

1) MoonBridge.java:396 → `public static native int sendUtf8Text(byte[] utf8Text, int length);`. 2) simplejni.c:126-131 → usar `GetByteArrayElements`/`ReleaseByteArrayElements` (padrão já usado em callbacks.c:487-493) e retornar o int de LiSendUtf8TextEvent. 3) NvConnection.java:619-623 → aceitar byte[] ou converter com `text.getBytes(StandardCharsets.UTF_8)`. 4) Game.java:4314-4334 → passar diretamente o slice de bytes já calculado, eliminando o `new String(...)` intermediário da linha 4326. 5) Ajustar os 3 call sites: Game.java:325, 2095, 2206.

**Risco**

Baixo. Mudança de assinatura JNI: se o .so e o .java saírem de sync, dá UnsatisfiedLinkError no primeiro uso — garantir rebuild nativo completo. Sem impacto no protocolo do fio.

---

## Q12

### Adicionar binding de LiGetHostFeatureFlags para o app conhecer as capacidades do host

**Tamanho:** quick-win

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

Permite decisões de UI antecipadas (modo touch nativo vs trackpad, exibição de recursos) sem depender de tentar e receber LI_ERR_UNSUPPORTED, e serve de base para negociar futuras extensões de protocolo (como o canal de texto em bloco).

**Plano de implementação**

Adicionar `public static native int getHostFeatureFlags();` em MoonBridge.java junto às constantes `LI_FF_PEN_TOUCH_EVENTS=0x01` e `LI_FF_CONTROLLER_TOUCH_EVENTS=0x02`; implementar em simplejni.c copiando o padrão de getPendingVideoFrames (simplejni.c:177-180) chamando LiGetHostFeatureFlags() (Misc.c:151).

**Risco**

Nenhum. Adição pura, sem alterar comportamento existente.

---

## Q13

### Higienizar preferências mortas e órfãs

**Tamanho:** quick-win

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

Limpeza de baixo risco que remove três armadilhas conhecidas para agentes/contribuidores: uma preferência que não faz nada, uma chave escrita e nunca lida e uma lida e nunca escrita.

**Plano de implementação**

(a) Corrigir checkbox_joycon_fix → checkbox_enable_joyconfix (PreferenceConfiguration.java:951). (b) Ligar checkbox_forceTightThresholds em readPreferences e apagar o bloco de reflection de Game.java:673-687. (c) Remover ou implementar CUSTOM_BITRATE_PREF_STRING/customBitrate (PreferenceConfiguration.java:33,232,1028) e o método morto getAllJsonData (StreamSettings.java:1073-1084). (d) Corrigir strings.xml:713. (e) Corrigir seekbar:min negativos (preferences.xml:204,254,419,429).

**Risco**

Baixo: mudanças pontuais e locais; apenas (b) altera comportamento de decodificação para quem tinha a caixa marcada — mencionar no changelog.

---

## Q14

### Sincronizar os controles duplicados de bitrate e validar limites

**Tamanho:** quick-win

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

edit_diy_bitrate e seekbar_bitrate_kbps representam o mesmo valor com UIs independentes e sem clamp, permitindo estados incoerentes e um NumberFormatException não tratado.

**Plano de implementação**

Em StreamSettings.java:861-881 envolver Float.parseFloat em try/catch (como já é feito para resolução em :904-920 e refresh rate em :938-956), clampar em [500,300000] e chamar setText no EditTextPreference sempre que o seekbar mudar (e vice-versa) via setSummaryProvider mostrando o valor efetivo em Mbps.

**Risco**

Baixo.

---

## Q15

### Telemetria de configuração no DebugInfoActivity

**Tamanho:** quick-win

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

Diagnosticar problemas de usuários exige saber qual perfil está ativo e quais chaves ele sobrescreve — hoje isso não aparece em lugar nenhum, e o overlay torna a configuração efetiva diferente do que a tela de settings mostra.

**Plano de implementação**

Em DebugInfoActivity (aberta pela Preference pref_debug_info, StreamSettings.java:849-859) acrescentar uma seção com ProfilesManager.getInstance().getActiveName(), o número e a lista de chaves do patch (SettingsProfile.getOptions().keySet()) e o dump dos campos de PreferenceConfiguration relevantes ao stream.

**Risco**

Baixo; atenção apenas para não vazar conteúdo sensível (o patch pode conter performance_log enquanto perfis forem snapshots).

---

## Q16

### Corrigir supportedButtonFlags dos drivers USB

**Tamanho:** quick-win

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

Uma linha em AbstractXboxController.java:32 corrige o anuncio de capacidades de todos os gamepads Xbox controlados pelo driver proprio, alem de eliminar a janela em que 15 botoes aparecem pressionados.

**Plano de implementação**

Trocar `this.buttonFlags` por `this.supportedButtonFlags` em AbstractXboxController.java:32 e adicionar a mascara correspondente em ProConController.java:49-55 (A/B/X/Y/UP/DOWN/LEFT/RIGHT/LB/RB/LS_CLK/RS_CLK/BACK/PLAY/SPECIAL/MISC, conforme o que handleRead() de fato preenche em ProConController.java:306-321).

**Risco**

Praticamente nulo. Vale checar se algum host se comporta diferente ao receber supportedButtonFlags != 0 (deveria melhorar).

---

## Q17

### Cachear PreferenceConfiguration nos elementos do OSC e remover leituras de prefs do onDraw

**Tamanho:** quick-win

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

Elimina milhares de leituras de SharedPreferences por frame no thread de UI (DigitalButton.java:162/165/175, DigitalPad.java:56-57, KeyBoardDigitalButton.java:168, VirtualController.java:249, KeyBoardController.java:390) — ganho direto de fluidez com risco mínimo.

**Plano de implementação**

Adicionar um campo `protected PreferenceConfiguration prefConfig` em VirtualControllerElement e keyBoardVirtualControllerElement, preenchido no construtor (padrao ja usado em KeyBoardTouchPadButton.java:126); adicionar `applyPreferences(PreferenceConfiguration)` chamado de VirtualController.refreshLayout() (VirtualController.java:198) e KeyBoardController.refreshLayout() (KeyBoardController.java:316) para reagir a mudancas de config.

**Risco**

Se o usuario mudar uma preferencia de skin/opacidade sem reconstruir o layout, a mudanca so aparece no proximo refreshLayout — mitigado chamando applyPreferences no fluxo que ja existe de reconfiguracao.

---

## Q18

### De-duplicar eventos do stick-para-teclado e remover codigo morto

**Tamanho:** quick-win

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

Reduz de ~480 para poucos pacotes de teclado por segundo no overlay de teclado com stick virtual, diminuindo jitter de rede e carga no host.

**Plano de implementação**

Em KeyBoardAnalogStickButton.java:118-120 (e no gemeo KeyBoardAnalogStickButtonFree.java) comparar `stickBool` com um `lastStickBool` antes de chamar `listener.onkeyEvent`; apagar o array `stickIndex` (linhas 14, 39-59, 135-138), que nunca e lido.

**Risco**

Nenhum funcional; garantir que onRevoke() (linha 134) continue emitindo os UPs mesmo se o estado ja estiver false, para nao deixar tecla presa.

---

## Q19

### Quick win — Corrigir o flush de commitText para payloads >512 bytes

**Tamanho:** quick-win

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

Bug de uma linha que quebra exatamente o caso de uso de 'enviar texto inteiro'. Hoje colar/ditar mais de 512 bytes resulta em nada sendo enviado.

**Plano de implementação**

Em app/src/main/java/com/limelight/Game.java:4331, trocar `if (commitTextQueue.size() == 1) commitTextHandler.post(flushCommitTextQueue);` por uma verificação de fila-antes-vazia (capturar `boolean wasEmpty = commitTextQueue.isEmpty()` antes do loop de chunking na linha 4320). Adicionar teste em app/src/test/java/com/limelight/ com um payload de 2 KB.

**Risco**

Nenhum risco relevante; comportamento estritamente melhor.

---

## Q20

### Quick win — Remover código morto: ui/StreamView.java, ui/ApertureViewGroup.java, app/src/game/

**Tamanho:** quick-win

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

Três artefatos mortos que confundem qualquer agente lendo o repositório — um deles (StreamView) chega a ter teste automatizado, sugerindo falsamente que o caminho de commitText está coberto.

**Plano de implementação**

Apagar app/src/main/java/com/limelight/ui/StreamView.java e reapontar app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java para ui/StreamContainer.java (ui/StreamContainer.java:186). Apagar app/src/main/java/com/limelight/ui/ApertureViewGroup.java, o bloco comentado em res/layout/activity_game.xml:26-37 e o declare-styleable em res/values/styles.xml:66-72. Apagar app/src/game/AndroidManifest.xml e as resValues app_label_game em app/build.gradle:101 e :140.

**Risco**

Baixo. Confirmar antes com grep que não há referência via reflexão (não há) e rodar o build dos 4 variants.

---

## Q21

### Endurecer o PosterContentProvider (URI matching + validação de path)

**Tamanho:** quick-win

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

Provider exportado sem permissão, com fallback incondicional e sem sanitização de path — leitura arbitrária limitada de arquivos .png dentro do sandbox por qualquer app instalado.

**Plano de implementação**

Em app/src/main/java/com/limelight/PosterContentProvider.java:36-61: lançar FileNotFoundException quando o UriMatcher não casar; validar o segmento uuid com UUID.fromString e o appId com Integer.parseInt em try/catch; e verificar o canonical path contra o diretório boxart antes de abrir (utils/CacheHelper.java:16 não faz nenhuma validação).

**Risco**

Baixo. Verificar que a integração de canal de TV (utils/TvChannelHelper.java) continua conseguindo ler as capas.

---

## Q22

### Corrigir enqueueCommitText: textos acima de 512 bytes são descartados silenciosamente

**Tamanho:** quick-win

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

Bug crítico de uma linha que quebra exatamente a funcionalidade de texto multi-caractere que o fork já anuncia como recurso (title_enable_commit_text / summary_enable_commit_text, strings.xml:695-696). Qualquer ditado por voz longo, colagem ou swipe typing extenso é engolido sem erro visível.

**Plano de implementação**

Game.java:4331 — substituir 'if (commitTextQueue.size() == 1)' por um controle explícito de agendamento: capturar 'boolean wasEmpty = commitTextQueue.isEmpty();' ANTES do loop de chunking e postar o flush se wasEmpty. Adicionar teste Robolectric (já disponível no build.gradle) com payloads de 1, 511, 512, 513, 2000 e 10000 bytes UTF-8 incluindo emojis (para exercitar o back-step de fronteira de code point nas linhas 4322-4324).

**Risco**

Muito baixo. Mudança localizada, sem impacto em outros caminhos.

---

## Q23

### Ressincronizar a lista de idiomas: liberar polonês, turco, búlgaro e português europeu

**Tamanho:** quick-win

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

Existem 252 strings em polonês, 253 em turco, 134 em búlgaro e 233 em pt-PT já traduzidas e completamente inacessíveis. É valor pronto na prateleira, custo de dois arquivos.

**Plano de implementação**

Adicionar <item>Polski</item>/<item>pl</item>, <item>Türkçe</item>/<item>tr</item>, <item>Български</item>/<item>bg</item> e <item>Português</item>/<item>pt</item> em values/arrays.xml:58-107 (manter a mesma posição nos dois arrays, que são posicionalmente acoplados) e as <locale> correspondentes em xml/locales_config.xml. Remover values-ckb/ e values-fa/ (vazios) ou traduzi-los. Escrever um teste unitário que enumere os diretórios values-*/ e compare com language_values e locales_config.xml, falhando na divergência.

**Risco**

Baixo. Cuidado apenas com a ordem posicional dos dois string-arrays de arrays.xml e com o fato de 'iw' (não 'he') ser o código legado usado no projeto.

---

## Q24

### Limpeza de recursos e dependências órfãs + habilitar shrinkResources

**Tamanho:** quick-win

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

Peso morto que confunde agentes de IA e humanos: dois layouts nunca inflados, dois drawables mortos (um deles um PNG de 51KB), dois diretórios de locale vazios, duas dependências não usadas, um dimen nunca lido e duas strings esvaziadas ainda traduzidas em 24 locales.

**Plano de implementação**

Remover: res/layout/activity_game_display.xml, res/layout/activity_configure_virtual_controller.xml, res/drawable/list_view_unselected.xml, res/drawable-xhdpi/ouya_icon.png, res/drawable/ic_focus_secondary.xml (e a linha comentada ExternalDisplayControlActivity.java:405), res/values-ckb/, res/values-fa/, app/src/main/java/com/limelight/ui/StreamView.java. Remover do build.gradle as dependências MPAndroidChart e (se não for adotada a ideia de busca) SearchPreference, mais as 6 strings searchpreference_* e as 12 chaves de chart órfãs em values-ru. Corrigir TvChannelHelper.java:122 para usar tv_channel_logo_height. Remover as chaves de compliance category_basic_settings/title_checkbox_stretch_video de todos os values-*/. Adicionar shrinkResources true nos buildTypes (minifyEnabled já é true nos dois).

**Risco**

Baixo, mas shrinkResources exige atenção: o comentário FIXME em build.gradle sobre bundle.density.enableSplit=false menciona 'weird crashes due to missing drawable resources', o que sugere que já houve problema com stripping de recursos. Habilitar shrinkResources em modo 'safe' primeiro e testar release build antes de publicar.

---

## Q25

### Alternância de teclado por N dedos também no modo de toque nativo (único porte de teclado do V+ que compensa)

**Tamanho:** quick-win

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

É a única melhoria de teclado do V+ que é simultaneamente pequena, genuinamente ausente no Artemis e alinhada ao uso do dono. Hoje o Artemis só oferece os taps de 3/4/5 dedos sob prefConfig.touchscreenTrackpad (Game.java:3232), deixando o modo multiponto sem atalho.

**Plano de implementação**

Espelhar o modelo do V+ sem copiar código: adicionar preferência inteira análoga a nativeTouchFingersToToggleKeyboard (PreferenceConfiguration.kt:1209, default 3, -1 desliga) em PreferenceConfiguration.java e preferences.xml, e mover a detecção de tap multi-dedo de handleMultiTouchGesture (Game.java:~3288-3325) para valer também fora do ramo trackpad. Strings novas em res/values/strings.xml conforme a regra 6 do CLAUDE.md.

**Risco**

Baixo. Risco contido em falsos positivos de tap durante gestos de jogo multi-toque; mitigar mantendo os thresholds de tempo já usados (THREE_FINGER_TAP_THRESHOLD e afins) e permitindo -1 para desligar.

---

## Q26

### Registrar em ADR que cherry-pick do V+ é inviável e que todo porte é reimplementação

**Tamanho:** quick-win

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

Este é o achado mais acionável da análise e precisa virar documentação permanente, senão todo agente futuro vai repetir a tentativa. Evidência dura: apenas 7 dos 152 arquivos Java do Artemis existem com o mesmo caminho no V+ (4,6%); testei quatro commits de teclado/input do V+ (771baad5, 1686d0ac, 1389687e, 14e80d24) e todos os arquivos de lógica são .kt inexistentes aqui; o V+ é Kotlin+Compose+Firebase multi-módulo (app/build.gradle:3-4, 41-43, 241-242) contra Java puro módulo único; e os submódulos moonlight-common-c são de linhagens diferentes.

**Plano de implementação**

Escrever docs/adr/NNNN-relacao-com-moonlight-vplus.md consolidando: a base comum f10085f5 (27/07/2024), os contadores de divergência 568/615, a estatística de 7/152 caminhos compartilhados, a lista dos 7 arquivos comuns, a divergência de submódulo com os dois SHAs, e a regra operacional — features do V+ entram por reimplementação manual em Java, jamais por git cherry-pick. Referenciar do CLAUDE.md e do docs/BACKLOG.md.

**Risco**

Nenhum. É documentação. O único cuidado é datar o snapshot, já que o V+ publica release a cada poucos dias e os contadores envelhecem.

---

## Q27

### Blindar o backup: excluir chave privada, uniqueid e banco de hosts

**Tamanho:** quick-win

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

E a correcao com maior reducao de risco por linha alterada em todo o repositorio. Hoje a chave privada do cliente vai para o Google Drive do usuario. Duas linhas em dois arquivos XML fecham o buraco, sem tocar em codigo Java e sem risco de regressao funcional.

**Plano de implementação**

Editar `app/src/main/res/xml/backup_rules.xml` adicionando `<exclude domain="file" path="client.key"/>`, `<exclude domain="file" path="client.crt"/>`, `<exclude domain="file" path="uniqueid"/>` e `<exclude domain="database" path="computers4.db"/>` ao lado do exclude existente. Replicar as mesmas exclusoes em `app/src/main/res/xml/backup_rules_s.xml` dentro de `<cloud-backup>` e `<device-transfer>`. Os nomes vem de `AndroidCryptoProvider.java:61-62`, `IdentityManager.java:15` e `ComputerDatabaseManager.java:26`. Verificar com `adb shell bmgr backupnow com.limelight.noir` seguido de inspecao do conjunto de backup.

**Risco**

Praticamente nulo. O unico efeito visivel e que um usuario que restaure um backup precisara reparear os hosts — comportamento correto e, na pratica, ja e o que acontece hoje porque `sharedpref` (que carrega parte do estado) ja e excluido.

---

## Q28

### Fechar os vazamentos de recurso pontuais ja mapeados

**Tamanho:** quick-win

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

Cinco correcoes independentes, cada uma de poucas linhas, todas com localizacao exata e sem ambiguidade de design. Sao o tipo de divida que nunca vira prioridade sozinha mas que degrada o app silenciosamente ao longo de uma sessao longa.

**Plano de implementação**

(1) `ShortcutTrampoline.java:360`: fechar o `ComputerDatabaseManager` (ou move-lo para dentro do ramo que o usa, :414). (2) `FileUriUtils.java:64-81`: try-with-resources e substituir `e.getLocalizedMessage();` por um log de verdade. (3) `Stereo3DRenderer.java:702-722`: null-check nos `close()` dos delegates e corrigir a variavel do log em :712; `loadModelFile` (:746) com try-with-resources. (4) `ExternalDisplayControlActivity.java:152`: adicionar `return;` apos `finish()` e `handler.removeCallbacksAndMessages(null)` em `onDestroy` (:215). (5) `PerformanceDataTracker.java:32`: executor estatico com thread daemon. Cada uma pode ser um commit separado.

**Risco**

Minimo. O unico que pede atencao e (4): confirmar que nenhum outro caminho depende do retry continuo de `initViews` — a leitura do codigo indica que nao, mas vale testar conectando e desconectando um display externo durante um stream ativo.

---

## Q29

### Consertar o retorno de OverlaySharedPreferences.edit()

**Tamanho:** quick-win

**Subsistema:** Delta Artemis vs Moonlight upstream — ver [referência](../reference/artemis-vs-moonlight.md)

**Por quê**

Bug silencioso: escritas feitas via perfil vão para o global e o usuário vê a configuração 'não pegar' (afeta hoje o remember-mouse-mode em Game.java:4127-4132).

**Plano de implementação**

Em ProfilesManager.java:251, implementar um Editor que acumule num Map e, no commit()/apply(), chame ProfilesManager.update(activeProfile) quando houver perfil ativo, delegando ao base.edit() só quando não houver. Cobrir com um teste em app/src/test/java/com/limelight/profiles/ (já existe OverlayPreferencesTest.java e ProfilesManagerTest.java).

**Risco**

Baixo, mas mexe num objeto lido por PreferenceConfiguration (fan-in altíssimo). Rodar ./gradlew test e conferir OverlayPreferencesTest/ProfilesOverlayTest.

---

## Q30

### Documentar o delta CRLF para não desperdiçar leitura de diff

**Tamanho:** quick-win

**Subsistema:** Delta Artemis vs Moonlight upstream — ver [referência](../reference/artemis-vs-moonlight.md)

**Por quê**

git diff contra moonlight/master mostra ControllerHandler.java com 6.737 linhas alteradas quando o delta semântico é 559 — a diferença é conversão de fim de linha (commit 8a7ebb70 'Chore: Clean up CRLF'). Um agente que confie no --stat vai concluir que o fork reescreveu o ControllerHandler, o que é falso.

**Plano de implementação**

Registrar em docs/ (guia ou ADR) que toda comparação com o upstream deve usar `git diff --ignore-cr-at-eol moonlight/master...HEAD`, com os números reais de delta por arquivo. Opcionalmente adicionar um .gitattributes com `*.java text eol=lf` para estancar a fonte.

**Risco**

Baixo. Mexer no .gitattributes agora causaria um commit de normalização gigante — melhor só documentar, a menos que se faça junto com outra grande reescrita.

---

## Q31

### Mover robolectric.properties para o classpath de teste e centralizar a configuração

**Tamanho:** quick-win

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

Correção de uma linha que restaura um shadow hoje inerte e, de quebra, elimina a repetição de @Config em dez arquivos. O shadow em questão protege contra crash de Choreographer em redimensionamento de janela — exatamente o território do EPIC do teclado, onde a ausência dessa proteção vai se manifestar como falhas confusas e difíceis de atribuir.

**Plano de implementação**

git mv robolectric.properties app/src/test/resources/robolectric.properties. Expandir o conteúdo para sdk=33 e shadows=com.limelight.shadows.ShadowMoonBridge,com.limelight.shadows.ShadowGameManager,com.limelight.shadows.ShadowBackdropFrameRenderer. Depois remover as anotações @Config redundantes de StartupTest.java:24, StartupCrashTest.java:26, SimpleStartupTest.java:20, ProfilesManagerTest.java:22, ProfilesOverlayTest.java:24, OverlayPreferencesTest.java:26, ProfilesActivityUiTest.java:33, ProfilesNavigationTest.java:30 e LayoutInflationTest.java:17, mantendo @Config apenas onde o teste precisar de SDK diferente do padrão. Provar que ShadowBackdropFrameRenderer passou a ser aplicado — um log em seu run() basta, já que hoje ele nunca é carregado.

**Risco**

Baixo, mas não nulo: ao ativar ShadowBackdropFrameRenderer pela primeira vez, algum teste que hoje passa pelo caminho real pode mudar de comportamento. Rodar a suíte antes e depois e comparar a contagem de testes executados, não só o verde.

---

## Q32

### Higiene de build: limpar código morto e acelerar a iteração local

**Tamanho:** quick-win

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

Um punhado de correções mecânicas e independentes que juntas reduzem bastante o ruído para quem — humano ou agente — precisa se orientar no repositório. Cada uma isolada é trivial; o valor está em fazê-las de uma vez, num PR só de limpeza, sem misturar com mudança de comportamento.

**Plano de implementação**

1. Remover app/src/game/ (source set órfão) e as duas linhas resValue app_label_game de app/build.gradle:101 e :140. 2. Preencher app/src/test/java/com/limelight/ProfileTestHelper.java (hoje 1 byte) com deleteRecursively e o reset por reflexão de ProfilesManager.instance, eliminando as cinco cópias em SimpleStartupTest.java:145, StartupTest.java:220, StartupCrashTest.java:276, ProfilesManagerTest.java:107 e ProfilesOverlayTest.java:85. 3. Definir minifyEnabled false no debug (app/build.gradle:103), mantendo a checagem de R8 no job release-check. 4. Habilitar org.gradle.caching=true e org.gradle.parallel=true em gradle.properties. 5. Remover outputs.upToDateWhen { false } de build.gradle:37. 6. git mv app/src/root/java/com.limelight → app/src/root/java/com/limelight. 7. Decidir por ADR o destino dos 69 changelogs do Fastlane numerados pelo versionCode do upstream. 8. Rodar node tools/codemap/codemap.mjs ao final e commitar docs/maps/ regenerado — os itens 1 e 6 mudam a estrutura indexada.

**Risco**

Baixo, e cada item é reversível isoladamente. O único que merece verificação é o 3: se algum crash só se manifesta com R8 ativo, desligá-lo no debug o esconde localmente — daí a importância de o job release-check existir antes ou junto. Manter este PR sem nenhuma mudança de comportamento, para que a revisão seja trivial.

---

