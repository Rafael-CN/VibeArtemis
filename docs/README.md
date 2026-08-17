# Documentação — Artemis (fork Rafael-CN)

Índice único. Toda folha listada com uma linha dizendo quando abri-la.
**Um nível de profundidade**: você chega ao que precisa em um salto a partir daqui.

Instruções operacionais para agentes estão em [`AGENTS.md`](../AGENTS.md) na raiz.
Este índice é o mapa do conhecimento acumulado.

## Comece por aqui

| Documento | Quando abrir |
|---|---|
| [`guides/setup-ambiente.md`](guides/setup-ambiente.md) | Antes de tentar compilar — o ambiente pode não ter JDK nem SDK |
| [`reference/host-compatibility.md`](reference/host-compatibility.md) | Antes de planejar feature — parte delas exige host Apollo |
| [`BACKLOG.md`](BACKLOG.md) | Para escolher o que fazer — 308 problemas e 161 ideias, priorizados |
| [`epics/E01-teclado-anydesk.md`](epics/E01-teclado-anydesk.md) | **A dor que motivou o fork** |
| [`glossary.md`](glossary.md) | Quando um termo do domínio não fizer sentido — 410 termos |

## Referência por subsistema

Semeados pela análise multi-agente de 2026-08-16 (14 analistas, 1.059 leituras de arquivo)
e mantidos à mão desde então. Cada um tem: como funciona, arquivos-chave com símbolos,
fluxo de dados, problemas conhecidos e ideias de melhoria.

**Abra só o do subsistema que você vai tocar.**

| Documento | Subsistema | Problemas |
|---|---|--:|
| [`reference/arquitetura.md`](reference/arquitetura.md) | Activities, ciclo de vida, navegação, build variants | 24 |
| [`reference/input-teclado.md`](reference/input-teclado.md) | **Teclado, IME, tradução de teclas** | 37 |
| [`reference/input-touch.md`](reference/input-touch.md) | Toque, trackpad, mouse, caneta | 19 |
| [`reference/input-gamepad.md`](reference/input-gamepad.md) | Controles, drivers USB, overlay virtual | 23 |
| [`reference/video.md`](reference/video.md) | MediaCodec, decoders, HDR, Stereo3D | 25 |
| [`reference/audio.md`](reference/audio.md) | AudioTrack, Opus, surround | 14 |
| [`reference/rede.md`](reference/rede.md) | HTTP, pareamento, mDNS, WoL, descoberta | 20 |
| [`reference/jni-e-nativo.md`](reference/jni-e-nativo.md) | Ponte JNI, MoonBridge, moonlight-common-c | 17 |
| [`reference/preferencias.md`](reference/preferencias.md) | Preferências, perfis, configuração | 24 |
| [`reference/ui-e-i18n.md`](reference/ui-e-i18n.md) | Layouts, temas, traduções, box art | 34 |
| [`reference/seguranca.md`](reference/seguranca.md) | Cripto, pareamento, permissões, robustez | 23 |
| [`reference/build-e-ci.md`](reference/build-e-ci.md) | Gradle, variants, testes, CI | 24 |
| [`reference/artemis-vs-moonlight.md`](reference/artemis-vs-moonlight.md) | O que o Artemis adicionou ao Moonlight | 16 |
| [`reference/comparacao-vplus.md`](reference/comparacao-vplus.md) | O que o Moonlight V+ tem que nós não temos | 8 |
| [`reference/host-compatibility.md`](reference/host-compatibility.md) | Que feature exige qual host | — |

## Mapas gerados

Gerados por `node tools/codemap/codemap.mjs`. **Não edite à mão** — um hook bloqueia.

| Arquivo | Como consumir |
|---|---|
| [`maps/FILE_INDEX.md`](maps/FILE_INDEX.md) | Grep pelo nome do arquivo |
| [`maps/DEPENDENCY_GRAPH.md`](maps/DEPENDENCY_GRAPH.md) | pode ler inteiro (103 linhas) |
| [`maps/HOTSPOTS.md`](maps/HOTSPOTS.md) | pode ler inteiro (118 linhas) |
| [`maps/JNI_BRIDGE.md`](maps/JNI_BRIDGE.md) | pode ler inteiro (94 linhas) |
| `maps/SYMBOLS.md` | **só Grep** — 2.058 linhas |
| `maps/code-index.json` | **nunca leia** — use `query.mjs` |

Os dois últimos são banco de dados, não documento — e o `permissions.deny` em
`.claude/settings.json` bloqueia a leitura deles justamente por isso.

```bash
node tools/codemap/query.mjs --symbol sendUtf8Text
node tools/codemap/query.mjs --callers PreferenceConfiguration
node tools/codemap/query.mjs --jni sendKeyboardInput
node tools/codemap/query.mjs --package com.limelight.binding.video
node tools/codemap/query.mjs --hot 15
```

## Guias

| Documento | Assunto |
|---|---|
| [`guides/setup-ambiente.md`](guides/setup-ambiente.md) | JDK, SDK, NDK, build variants, rodar testes |

## EPICs

| Documento | Status |
|---|---|
| [`epics/E01-teclado-anydesk.md`](epics/E01-teclado-anydesk.md) | analisado, não iniciado — **prioridade máxima** |

Outros 21 EPICs propostos estão em [`BACKLOG.md`](BACKLOG.md#epics-propostos), ainda sem
documento próprio.

## Decisões de arquitetura (ADR)

| # | Decisão |
|---|---|
| [0001](adr/0001-versionar-doc-de-agentes.md) | Versionar a documentação de agentes no repositório |
| [0002](adr/0002-base-do-fork-e-remotes.md) | Base do fork e topologia de remotes |

ADR aceito é imutável. Mudou de ideia? Escreva um novo que supersede o antigo.

## Como manter isto

| O que você descobriu | Onde registrar |
|---|---|
| decisão de arquitetura | novo ADR em `adr/` |
| entendimento de subsistema | `reference/<subsistema>.md` |
| procedimento repetível | `guides/` |
| trabalho grande e faseado | `epics/` |
| ideia solta, bug avulso | `BACKLOG.md` |

Toda folha com mais de 100 linhas começa com índice nas primeiras linhas, porque leitura
parcial é comum e sem índice o leitor conclui que a informação não existe.

**Documentação desatualizada é pior que ausente, porque é acreditada.** Se encontrar algo
errado aqui, corrija na hora — não abra tarefa para isso.

### Uma ressalva sobre a análise inicial

Os 308 problemas em `BACKLOG.md` e nas referências vieram de leitura de código, **não de
execução**. Nada foi verificado em dispositivo. São hipóteses bem fundamentadas, com âncora
de `arquivo:linha` — confirme antes de agir. Quando confirmar (ou refutar) uma, anote no
próprio documento.
