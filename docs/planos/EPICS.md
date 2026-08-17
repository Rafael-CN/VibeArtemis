# EPICs — trabalho grande

> Frentes que valem várias sessões e mudam algo estrutural. O E01 (teclado) está em `docs/epics/`, com detalhe maior por ser o que motivou o fork.

Cada item tem um código estável. Para começar a trabalhar em um deles, basta
citar o código.

## Índice

| Código | Item | Tamanho |
|---|---|---|
| **E02** | [EPIC — Empacotar múltiplos code points por pacote UTF-8 quando o host for Sunshine/Apollo](#e02) | epic |
| **E03** | [EPIC — Modelo explícito de capacidades do host (HostCapabilities) e propagação até o Game](#e03) | epic |
| **E04** | [EPIC: Camada de audio resiliente a mudancas de layout e ciclo de vida (pre-requisito da f…](#e04) | epic |
| **E05** | [EPIC: Passagem de microfone do cliente para o host](#e05) | epic |
| **E06** | [EPIC: Extrair MediaCodecDecoderRenderer em componentes testáveis](#e06) | epic |
| **E07** | [Perfis por host e por app (resolução automática de perfil)](#e07) | epic |
| **E08** | [EPIC — decidir explicitamente o que NÃO portar do V+ e fechar o escopo do fork](#e08) | epic |
| **E09** | [EPIC — Mover a identidade criptografica do cliente para o Android Keystore](#e09) | epic |

---

## E02

### EPIC — Empacotar múltiplos code points por pacote UTF-8 quando o host for Sunshine/Apollo

**Tamanho:** epic

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

Ataca a causa raiz da lentidão de digitação sem depender do clipboard: hoje cada code point é um pacote ENet confiável separado, e o hack de flush + PltSleepMs(50) foi escrito explicitamente para contornar um bug do GFE (comentário em InputStream.c:601-606), não do Sunshine/Apollo.

**Plano de implementação**

No submódulo app/src/main/jni/moonlight-core/moonlight-common-c: em InputStream.c:591-651, condicionar o caminho de fragmentação a !IS_SUNSHINE() (Limelight-internal.h:86). Para hosts Sunshine/Apollo, montar pacotes com o máximo de code points completos que caibam em UTF8_TEXT_EVENT_MAX_COUNT (Input.h:33, hoje 32 bytes) — mantendo a garantia de nunca cortar no meio de um code point — e aplicar o flush+sleep uma única vez por rajada em vez de por chamada de LiSendUtf8TextEvent. Validar contra o parser do host antes de aumentar UTF8_TEXT_EVENT_MAX_COUNT acima de 32. Depois, simplificar a fila de 512 bytes/15 ms do lado Java (Game.java:312-331, 4314-4334), que passa a ser redundante.

**Risco**

Mudança em submódulo compartilhado — precisa ser validada contra Sunshine vanilla, Apollo e Vibeshine. Se o parser do host assumir 1 code point por pacote, o texto chega corrompido. Requer teste com acentuação, emoji (4 bytes) e CJK. Mitigar com um preference de opt-in ('modo de texto rápido') durante a validação.

---

## E03

### EPIC — Modelo explícito de capacidades do host (HostCapabilities) e propagação até o Game

**Tamanho:** epic · **Prioridade elevada em 2026-08-17**

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

> ## Caso concreto que justifica priorizar
>
> Verifiquei as rotas HTTP do Vibeshine 1.19.0-alpha.2. São exatamente as do Sunshine:
> `/serverinfo /applist /appasset /launch /resume /cancel /pair /unpair /bitrate
> /api/abr/capabilities`. **Não existe `/actions/clipboard`** — é extensão do Apollo.
>
> Resultado prático no setup do dono do fork: a sincronização de clipboard aparece na
> interface e simplesmente não funciona. O cliente já *sabe* disso e mesmo assim oferece
> — `NvHTTP.sendClipboard()` tem um comentário tratando "the 200ed 404 from Sunshine",
> ou seja, a detecção existe, é feita por tentativa e erro, e o resultado é descartado
> em vez de desabilitar o recurso.
>
> Este EPIC deixa de ser arrumação arquitetural e passa a ter sintoma observável: um
> botão que mente. O mínimo entregável, antes do modelo completo, é **esconder ou
> desabilitar com explicação** o que o host não suporta.
>
> Ver `docs/reference/host-compatibility.md` para a matriz por host.

**Por quê**

Hoje a distinção Apollo/Vibeshine vs Sunshine vanilla vs GFE está espalhada por heurísticas frágeis (NvHTTP.java:444 MJOLNIR, :664-676 ExternalPort, :550-570 VirtualDisplay*/ServerCommand, Limelight-internal.h:86 IS_SUNSHINE) e o clipboard sequer é detectado — é tentativa e erro (NvHTTP.java:931-936). Toda feature nova dependente do Apollo (injeção de texto, clipboard, file transfer, comandos de servidor) pagará esse custo de novo.

**Plano de implementação**

Criar com.limelight.nvstream.http.HostCapabilities preenchida em NvHTTP.getComputerDetails(String) (NvHTTP.java:401-450) a partir do serverinfo: isNvidia (state contém MJOLNIR), isSunshineFamily (appversion quad[3] < 0, mesma regra do nativo), isApollo (presença de Permission/VirtualDisplayCapable/ServerCommand), permissionMask e flags derivadas (clipboardSet 0x10000, clipboardRead 0x20000, serverCmd 0x100000, conforme o comentário em ComputerDetails.java:173-204). Armazenar em ComputerDetails, persistir como cache no SQLite (ComputerDatabaseManager.java:110-139), propagar em ServerHelper.createStartIntent (ServerHelper.java:93-138) e consumir em GameMenu (GameMenu.java:288-305) para habilitar/desabilitar itens em vez de mostrar toasts de erro depois.

**Risco**

Mudança de schema do banco (precisa de migração ou de coluna nova tolerante a null). Requer alinhamento com o significado real dos bits de permissão do Apollo — o comentário em ComputerDetails.java:173-204 é a única fonte e pode envelhecer se o Apollo mudar o enum.

---

## E04

### EPIC: Camada de audio resiliente a mudancas de layout e ciclo de vida (pre-requisito da feature de teclado tipo AnyDesk)

**Tamanho:** epic

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

O objetivo n.1 do dono do fork — empurrar/redimensionar o stream quando o teclado virtual abre — esbarra numa arquitetura onde a destruicao da Surface derruba a conexao INTEIRA, audio incluso (Game.java:3832-3844 + ui/StreamContainer.java:249-258). Qualquer prototipo que troque de container, use um modo de render alternativo, ou entre/saia de multi-window vai matar o audio junto com o video e exigir reconexao, arruinando a experiencia que ele quer replicar. Desacoplar o ciclo de vida do audio do ciclo de vida da Surface e o que torna a feature viavel.

**Plano de implementação**

Fase 1 — Blindar o caminho seguro: usar `windowSoftInputMode="adjustResize"` no `<activity android:name=".Game">` (AndroidManifest.xml:193-216; o configChanges ja cobre keyboardHidden|screenSize|screenLayout, logo a Activity NAO e recriada) e alterar apenas LayoutParams da SurfaceView existente; revisar o `setFixedSize(vw, vh)` de Game.java:900 para acompanhar a area util. Fase 2 — Guard de ciclo de vida: em `Game.surfaceDestroyed` (linha 3832), so chamar `stopConnection()` se `isFinishing() || isChangingConfigurations()==false && realmente saindo`, evitando teardown em transicoes de layout. Fase 3 — Separar os teardowns: hoje `stopAudioStream()` e `stopVideoStream()` sao inseparaveis dentro de `LiStopConnection`; documentar isso e, se necessario, introduzir um modo "video suspenso, audio ativo" (o decoder de video ja tem `prepareForStop()`, Game.java:3839) para que perder a Surface temporariamente nao interrompa o audio. Fase 4 — Testes de regressao cobrindo: abrir/fechar IME, rotacao, split-screen, PiP (`supportsPictureInPicture="true"`, AndroidManifest.xml:197) e external display, verificando em cada um que o log de `BridgeArInit`/`BridgeArCleanup` nao aparece.

**Risco**

Alto. Mexer no guard de `surfaceDestroyed` pode deixar a conexao viva com uma Surface morta, o que trava o decoder de video. A fase 3 pode exigir patch no submodulo moonlight-common-c (divergindo do upstream, com custo de merge futuro). Recomendo entregar as fases 1 e 2 primeiro, medindo com o modo de gravacao de audio habilitado (ver ideia correspondente) para provar que o audio nao e interrompido pelo resize.

---

## E05

### EPIC: Passagem de microfone (e câmera) do cliente para o host

**Tamanho:** epic · **Status: NÃO RECOMENDADO — ver a verificação abaixo**

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

> ## ⚠ Verificação de 2026-08-17 que muda a conclusão deste EPIC
>
> A justificativa original afirmava que "forks do Sunshine (incluindo a linhagem
> Apollo/Vibeshine) têm suporte a sink de microfone". **Isso foi verificado e é falso.**
>
> - `src/platform/macos/microphone.mm` do Vibeshine é o **oposto** do que se supôs: é o
>   `mic_t` que captura o microfone **do host macOS** para misturar no áudio que desce
>   para o cliente. Não é passthrough do cliente.
> - `Limelight.h` — a API completa do protocolo — não tem **nenhuma** ocorrência de
>   microfone, câmera ou canal de mídia ascendente. O protocolo Moonlight é
>   **unidirecional para mídia**: vídeo e áudio descem, e só *input* (teclado, mouse,
>   gamepad, touch, caneta) sobe.
> - O Vibeshine 1.19.0-alpha.2 não tem contraparte nenhuma para isto.
>
> Ou seja: não é "o host ainda não implementou". É uma extensão de protocolo que teria
> que existir simultaneamente em três lugares — `moonlight-common-c` (submódulo
> compartilhado com o upstream), o host, e o cliente — e que nos deixaria incompatíveis
> com Sunshine, Apollo e Vibeshine ao mesmo tempo.
>
> **Alternativa que resolve a necessidade real hoje:** usar o mic e a câmera do Android
> como *dispositivos virtuais do Windows*, por um canal independente do Moonlight —
> DroidCam, Iriun ou Camo. O PC enxerga uma webcam e um microfone comuns, funciona em
> qualquer aplicativo, e roda em paralelo ao Remote Monitor sem conflito, porque são
> caminhos separados.
>
> Só reabrir este EPIC se o `moonlight-common-c` upstream adotar um canal ascendente de
> mídia. Até lá, o custo é permanente e o benefício é obtido de graça por fora.

**Por quê (justificativa original, mantida para contexto)**

Nao existe nenhuma captura de audio no app — grep por `AudioRecord`, `RECORD_AUDIO` e `MODIFY_AUDIO_SETTINGS` em `app/src/main/java` e no AndroidManifest.xml nao retorna nada. Para um cliente que ja mira uso tipo desktop remoto (teclado, texto), voz e o proximo degrau natural.

**Plano de implementação**

Requer trabalho dos dois lados. Cliente: permissao RECORD_AUDIO, um `AudioRecord` a 48 kHz mono, encoder Opus (a libopus embarcada e decoder-only no uso atual, mas a .a completa normalmente inclui o encoder — verificar simbolos em `libopus/*/libopus.a` antes de assumir), e um novo canal de envio. Transporte: nao existe canal de audio ascendente no protocolo Moonlight atual — `Limelight-internal.h:56-67` lista os canais ENet (generic, urgent, keyboard, mouse, pen, touch, UTF8, serverctl, gamepad, sensor) e nenhum e para audio. Seria preciso um canal novo negociado por feature flag com o host, ou um socket RTP dedicado. Comecar validando o que o Vibeshine/Apollo ja expoe do lado host antes de escrever qualquer linha no cliente.

**Risco**

Muito alto. Envolve mudanca de protocolo (divergencia do moonlight-common-c upstream, com custo de manutencao permanente), permissao sensivel de privacidade (RECORD_AUDIO exige justificativa em lojas de app), verificacao de que o encoder Opus esta presente na .a prebuilt, e um caminho de latencia totalmente novo. So justificavel se o host ja tiver a contraparte pronta.

---

## E06

### EPIC: Extrair MediaCodecDecoderRenderer em componentes testáveis

**Tamanho:** epic

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

2433 linhas misturam seleção de decoder, patching de bitstream, loop de saída, pacing, recuperação de erro, coleta de estatísticas e formatação de UI (inclusive strings de R.string dentro do renderer, :1798-1876). Nada disso é testável isoladamente e cada mudança arrisca regressão em devices que ninguém tem.

**Plano de implementação**

Dividir em: (a) DecoderSelector — findAvc/Hevc/Av1Decoder + performance points (:199-359); (b) BitstreamPatcher — todo o patching de SPS/CSD de :1726-1741 e :1900-2103, testável em JVM pura com jcodec e SPS capturados; (c) OutputPacer — as estratégias do loop de saída + doFrame; (d) CodecRecoveryCoordinator — :809-1066; (e) VideoStatsCollector + PerfOverlayFormatter (tirando R.string do renderer). Manter MediaCodecDecoderRenderer como fachada que implementa VideoDecoderRenderer. Adicionar testes Robolectric (o projeto já tem robolectric.properties na raiz) para BitstreamPatcher e VideoStatsCollector.

**Risco**

Alto em esforço, baixo em risco se feito incrementalmente e com o BitstreamPatcher primeiro (é a parte mais pura e mais perigosa de quebrar por acidente).

---

## E07

### Perfis por host e por app (resolução automática de perfil)

**Tamanho:** epic

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

Perfis são globais e ativados à mão (ProfilesManager.java:158, ProfilesAdapter.java:54-63); ninguém lembra de trocar o perfil ao mudar de PC/jogo, o que gera bitrate/resolução errados silenciosamente. É a evolução natural do sistema já existente.

**Plano de implementação**

1) Estender SettingsProfile (app/src/main/java/com/limelight/profiles/SettingsProfile.java:6-21) com Set<String> hostUuids e Set<Integer> appIds (Gson tolera campos ausentes, então profiles.json antigo continua carregando). 2) Criar ProfilesManager.resolveFor(ComputerDetails, NvApp) com precedência app > host > ativo global e usá-la em getOverlayingSharedPreferences (ProfilesManager.java:200-207) por meio de um 'contexto de perfil' setado em ServerHelper.doStart e em Game.onCreate (Game.java:354). 3) UI: menu de contexto em AppView.onCreateContextMenu (AppView.java:443-480, onde já há 'hide app') com 'Atribuir perfil', e no PcView.onCreateContextMenu para hosts. 4) Mostrar o perfil resolvido no FAB de PcView/AppView (PcView.java:345-359).

**Risco**

Alto: mexe no ponto por onde toda a configuração é lida; um bug ali afeta o app inteiro. Exige cuidado com o singleton mutável e com estado por-thread. Fazer feature-flag e cobrir com testes de resolução de precedência.

---

## E08

### EPIC — decidir explicitamente o que NÃO portar do V+ e fechar o escopo do fork

**Tamanho:** epic

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

O dono migrou para o Artemis justamente para fugir do excesso de features do V+ (registrado no CLAUDE.md). O V+ tem hoje 157 chaves de preferência contra 133 do Artemis, com 113 exclusivas dele, incluindo módulos inteiros: framegen (Vulkan/LSFG-VK + shaders AMD FSR), EasyTier VPN, microfone, audio haptics, HDR10+, handbook offline, float ball, QR pairing, sync de configuração. Sem uma decisão escrita, cada análise futura vai reabrir a discussão de portar cada uma delas.

**Plano de implementação**

Produzir um documento de escopo classificando as 113 preferências exclusivas do V+ em três baldes: (a) FORA — tudo que depende do submódulo qiin2333/moonlight-common-c (microfone, clipboard 0x5508, touchpad, HDR10+, cursor shapes) ou de módulo Gradle novo (framegen, haptics), por conflitar com as features Apollo do Artemis (sendExecServerCmd em MoonBridge.java:357, sendEmptyPayload em :359); (b) TALVEZ — melhorias de UI/QoL puramente Java-portáveis (toggle de teclado por N dedos, duplo-ESC, backup/restore de configuração); (c) JÁ TEMOS OU MELHOR — commitText (o Artemis tem, o V+ não), teclado virtual (4.186 vs 629 linhas), gestos multi-dedo, display virtual Apollo, perfis. Cruzar com a lista de chaves exclusivas de cada lado levantada nesta análise.

**Risco**

Baixo tecnicamente, mas é decisão de produto e não de engenharia: precisa do dono do fork. O risco é o documento nascer desatualizado, dado o ritmo de release do V+ (12.11.0 a 12.11.4 entre 23/07 e 14/08/2026) — mitigar datando e revisando por amostragem, não continuamente.

---

## E09

### EPIC — Mover a identidade criptografica do cliente para o Android Keystore

**Tamanho:** epic

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

Corrige a categoria inteira do problema em vez do sintoma: hoje a chave privada e um arquivo em disco legivel por qualquer processo com root, extraivel por backup e copiavel por qualquer ferramenta de dump de dados de app. Com o Keystore, a chave passa a ser nao-exportavel e as operacoes de assinatura acontecem dentro do TEE. E o unico caminho que torna irrelevante uma futura regressao nas regras de backup ou um novo componente exportado.

**Plano de implementação**

Fase 1 — introduzir uma segunda implementacao de `LimelightCryptoProvider` (a interface ja existe em `nvstream/http/LimelightCryptoProvider.java`) baseada em `KeyPairGenerator.getInstance("RSA", "AndroidKeyStore")` com `KeyGenParameterSpec` (PURPOSE_SIGN, sem autenticacao de usuario, alias fixo). O certificado autoassinado continua gerado por BouncyCastle, mas assinado por um `ContentSigner` que delega ao `Signature` do Keystore. Fase 2 — `PlatformBinding.getCryptoProvider` escolhe a implementacao Keystore quando `Build.VERSION.SDK_INT >= 23` e um novo par ainda nao existe. Fase 3 — migracao: manter o par em arquivo funcionando para hosts ja pareados (a chave existente nao pode ser importada no Keystore de forma nao-exportavel), e oferecer na UI um 'regenerar identidade' que gera a nova chave no Keystore e exige reparear. Fase 4 — depois de uma versao de convivencia, apagar o caminho de arquivo. `NvHTTP.initializeHttpState` (:114-128) nao precisa mudar: o `X509KeyManager` ja obtem a chave pela interface.

**Risco**

Alto e concentrado na migracao. `minSdk` e 21, entao o caminho legado precisa continuar existindo para API 21-22. Chaves do Keystore sao perdidas em alguns cenarios (restauracao de fabrica parcial, troca de lock screen em versoes antigas do Android) — o app precisa detectar `KeyPermanentlyInvalidatedException`/`UnrecoverableKeyException` e guiar o usuario ao repareamento em vez de crashar. Exige um ADR em `docs/adr/` antes de comecar, porque muda o contrato de identidade do cliente com todos os hosts ja pareados.

---

