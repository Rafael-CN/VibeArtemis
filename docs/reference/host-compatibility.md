# Compatibilidade de host

> **Leia isto antes de planejar qualquer feature.** Parte do que o Artemis faz depende do
> host ser Apollo. O dono deste fork usa **Vibeshine** (fork do Sunshine), então essas
> features nascem inativas para ele.

## Índice

1. [Os hosts](#os-hosts)
2. [Como o cliente detecta o host](#como-o-cliente-detecta-o-host)
3. [Matriz de features](#matriz-de-features)
4. [Consequências para o EPIC do teclado](#consequências-para-o-epic-do-teclado)

## Os hosts

| Host | O que é | Situação |
|---|---|---|
| **GeForce Experience (GFE)** | o original da NVIDIA | descontinuado; ainda há caminhos de código para ele |
| **Sunshine** (LizardByte) | host open source, o padrão de fato | ativo |
| **Apollo** (ClassicOldSong) | fork do Sunshine, pareado ao Artemis | 10,5 mil ★ |
| **Vibeshine** (Nonary) | fork do Sunshine — **o que o dono usa** | ativo |

Apollo e Artemis são do mesmo autor e evoluem juntos: várias features do cliente existem
porque o Apollo as expõe. Vibeshine derivou do Sunshine, não do Apollo — então as
extensões do Apollo **não estão presumidas** ali.

## Como o cliente detecta o host

Duas camadas, com granularidade diferente.

**No protocolo nativo** (`Limelight-internal.h:86`):

```c
#define IS_SUNSHINE() (AppVersionQuad[3] < 0)
```

Um quarto componente negativo na versão marca "não é GFE". Grosseiro: não distingue
Sunshine de Apollo nem de Vibeshine.

**No HTTP**, por um campo de permissões (`ComputerDetails.java:187-192`):

```
clipboard_set   = 0x00010000   // permite o cliente escrever no clipboard do host
clipboard_read                 // permite ler
file_upload / file_dwnload
server_cmd                     // comandos de servidor
```

Esse modelo de permissões é uma extensão do **Apollo**. Em host que não o implementa, o
campo simplesmente não vem.

Há ainda uma heurística explícita em `NvHTTP.sendClipboard()`:

```java
// For handling the 200ed 404 from Sunshine
if (resp.isEmpty()) return true;   // Apollo aceitou
else return false;                 // Sunshine devolveu a página de erro com status 200
```

Ou seja: **o próprio código documenta que clipboard não funciona com Sunshine vanilla.**

> Não existe hoje um modelo unificado de capacidades do host. A detecção está espalhada
> entre `IS_SUNSHINE()`, o campo de permissões e heurísticas por endpoint. A análise
> levantou isso como EPIC ("Modelo explícito de capacidades do host") — ver
> [`../BACKLOG.md`](../BACKLOG.md).

## Matriz de features

| Feature | GFE | Sunshine | Vibeshine | Apollo |
|---|:--:|:--:|:--:|:--:|
| Streaming, pareamento, entrada básica | ✅ | ✅ | ✅ | ✅ |
| Resolução e bitrate customizados | ✅ | ✅ | ✅ | ✅ |
| `sendUtf8Text` (texto Unicode) | ⚠ com 50 ms de penalidade | ✅ | ✅ provável | ✅ |
| Virtual display | ❌ | ❌ | ⚠ tem o próprio mecanismo | ✅ |
| Server commands | ❌ | ❌ | ❌ | ✅ |
| Clipboard sync (`actions/clipboard`) | ❌ | ❌ | ❓ **não verificado** | ✅ |
| Modelo de permissões | ❌ | ❌ | ❓ | ✅ |
| Controle de display externo | ❌ | ❌ | ❓ | ✅ |

Legenda: ✅ funciona · ⚠ funciona com ressalva · ❌ não existe · ❓ não verificado.

**As colunas de Vibeshine marcadas com ❓ precisam ser testadas.** Nenhuma delas foi
confirmada — não há como saber pelo código do cliente.

### Sobre o setup atual do dono

Rafael usa Vibeshine com display virtual automático por cliente: o host desativa o monitor
físico e ativa o virtual como primário. Isso resolve, do lado do host, o mesmo problema que
o "Virtual display" do Apollo resolve do lado do cliente. **Não é preciso migrar para
Apollo por causa disso.**

O que a migração para Apollo traria de fato: clipboard sync, server commands e o modelo de
permissões. O clipboard, especificamente, destrava a melhor solução para o problema de
digitação — ver abaixo.

## Consequências para o EPIC do teclado

O [EPIC E01](../epics/E01-teclado-anydesk.md) tem dois caminhos possíveis para "enviar o
texto inteiro", e a escolha depende do host:

**Caminho A — `sendUtf8Text` (funciona em qualquer host moderno).**
O `moonlight-common-c` fatia o texto e envia **um pacote por code point**
(`InputStream.c:610-648`), precedido de flush e 50 ms de espera. Funciona sempre, mas é
incremental por natureza.

Detalhe aproveitável: aquele atraso de 50 ms é um *workaround para o GFE*, declarado no
próprio comentário do código —

> *"HACK: This is a workaround for the fact that GFE doesn't appear to synchronize keyboard
> and UTF-8 text events with each other."*

Como `IS_SUNSHINE()` já existe, dá para pular o flush e o sleep quando o host não é GFE.
É uma melhoria barata e de efeito direto na sensação de digitação.

**Caminho B — clipboard + Ctrl+V (exige Apollo, talvez Vibeshine).**
`NvHTTP.sendClipboard()` faz um único POST `text/plain` para `actions/clipboard`. Escreve o
texto no clipboard do host de uma vez e depois emite Ctrl+V. É literalmente "a string
inteira numa tacada", e é o que mais se aproxima do AnyDesk.

Limitações: depende de o aplicativo em foco no host aceitar colagem (jogos com input raw
não aceitam), e convém salvar e restaurar o clipboard anterior do usuário.

**Recomendação:** implementar A como base — funciona em todo lugar — e B como caminho
preferencial quando o host anunciar `clipboard_set`, com fallback automático para A.
Assim a feature funciona hoje com Vibeshine e fica melhor sozinha se você migrar para
Apollo, ou se Vibeshine passar a suportar o endpoint.

**Primeiro passo, antes de escrever código:** testar contra o teu Vibeshine se
`actions/clipboard` responde. É um `curl` e resolve a dúvida que decide o desenho.
