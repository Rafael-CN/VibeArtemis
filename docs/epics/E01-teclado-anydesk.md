# EPIC E01 — Teclado no padrão AnyDesk

- **Status:** analisado, não iniciado
- **Prioridade:** máxima — é a dor que motivou o fork
- **Data da análise:** 2026-08-16

## Índice

1. [O problema](#o-problema)
2. [Correção de premissa: o que "enviar em bloco" realmente significa](#correção-de-premissa)
3. [Bug crítico já existente](#bug-crítico-que-mata-a-feature-hoje)
4. [O que já existe no código](#o-que-já-existe-no-código)
5. [Causa raiz da parte 1](#causa-raiz-da-parte-1--o-teclado-cobre-a-tela)
6. [Desenho proposto](#desenho-proposto)
7. [Ordem sugerida](#ordem-sugerida)
8. [Verificação](#verificação)

## O problema

Em clientes Moonlight no Android o teclado virtual **cobre** a tela do stream — você digita
sem ver o que digita. O AnyDesk resolve de duas formas, e queremos as duas:

1. **A tela é empurrada/redimensionada** para o espaço restante acima do teclado.
2. **Um campo de texto** onde você digita e o conteúdo é enviado de uma vez.

## Correção de premissa

> **O protocolo não transmite texto em bloco, e isso é por design.**

`InputStream.c:610-647` no `moonlight-common-c` contém o comentário explícito:

> *"We send each Unicode code point individually. This way we can always ensure they will
> never straddle a packet boundary (which will cause a parsing error on the host)."*

Ou seja: mesmo chamando `sendUtf8Text("uma frase inteira")`, o `moonlight-common-c` fatia a
string e envia **um pacote ENet por code point**. Antes disso ainda faz
`flushInputOnControlStream()`, espera a fila de controle drenar, e dorme **50 ms**
(`InputStream.c:608`) para o host processar os eventos de tecla pendentes sem interferência
de modificadores.

**Consequência para este EPIC:** "enviar o texto inteiro em vez de caractere por caractere"
não é alcançável no fio sem mudar o protocolo — e mudá-lo quebraria a compatibilidade com
Sunshine, Apollo e Vibeshine ao mesmo tempo. Não vale.

> **Existe um segundo caminho que contorna isso.** `NvHTTP.sendClipboard()` faz um único
> POST `text/plain` para `actions/clipboard`: escreve o texto no clipboard do host de uma
> vez, e aí basta emitir Ctrl+V. Isso **é** literalmente a string inteira numa tacada.
> A pegadinha: o endpoint é extensão do Apollo, e o próprio código registra que Sunshine
> devolve a página de erro com status 200. Se funciona no Vibeshine, ninguém verificou.
> Ver [Caminho B](../reference/host-compatibility.md#consequências-para-o-epic-do-teclado).

**E mesmo pelo caminho padrão o ganho continua grande**, só que é outro:

| | Caminho de tecla (`sendKeyboardInput`) | Caminho de texto (`sendUtf8Text`) |
|---|---|---|
| O que vai no fio | scancode + modificadores | code point Unicode |
| Depende do layout do host | **sim** | não |
| Acentos, cedilha, ABNT2 | frequentemente erram | corretos |
| Emoji / caracteres suplementares | impossível | possível (com a ressalva abaixo) |
| Pacotes por caractere | 2 (down + up) | 1 |

E o ganho de **experiência** — digitar num campo com calma, revisar, e só então enviar — é
100% alcançável, porque é interface do cliente. É isso que você percebe como usuário do
AnyDesk, e é isso que dá para entregar.

## Bug crítico que mata a feature hoje

`Game.java:4331` — encontrado independentemente por dois analistas e confirmado lendo o
código:

```java
private void enqueueCommitText(String text) {
    ...
    while (offset < utf8.length) { ... commitTextQueue.add(chunk); ... }
    // Kick off flushing if not already scheduled
    if (commitTextQueue.size() == 1) {          // ← BUG
        commitTextHandler.post(flushCommitTextQueue);
    }
}
```

Se o texto produzir **dois ou mais** blocos (qualquer coisa acima de 512 bytes UTF-8 —
colagem, ditado longo), `size()` nunca vale 1 e o `Runnable` **nunca é postado**. Nada é
enviado. Pior: a fila fica com resíduo permanente, então todo `commitText` posterior também
falha na condição, e **o recurso morre até o fim da sessão**.

Correção:

```java
private boolean commitFlushScheduled = false;

// em enqueueCommitText, no lugar do if atual:
if (!commitFlushScheduled) {
    commitFlushScheduled = true;
    commitTextHandler.post(flushCommitTextQueue);
}
```

E em `flushCommitTextQueue` (`Game.java:317-331`), zerar o flag quando a fila esvaziar.

Este é um bug isolado, de baixo risco e alto impacto. **Comece por ele.**

## O que já existe no código

| Peça | Onde | Estado |
|---|---|---|
| Transporte de texto | `MoonBridge.sendUtf8Text()` → `LiSendUtf8TextEvent()` | ✅ funciona |
| Interceptação do IME (**a que roda**) | `ui/StreamContainer.java:181-195` | ✅ implementado |
| Interceptação do IME (display externo) | `ui/ExternalControllerView.java:54-74` | ✅ implementado |
| Encaminhamento do `commitText` | `Game.java:4290` | ✅ implementado |
| Fila com blocos de 512 B | `Game.java:312-331` | ⚠ **quebrada** (ver acima) |
| `deleteSurroundingText` → backspaces | `Game.java:4299-4312` | ⚠ um par de eventos por caractere |
| Preferência `checkbox_enable_commit_text` | `PreferenceConfiguration.java:139,208` | ⚠ default **`false`** |
| Redimensionar a tela com o IME | — | ❌ não existe |
| Campo de texto dedicado | — | ❌ não existe |

### Armadilha: `ui/StreamView.java` é código morto

O layout `activity_game.xml:14` instancia `com.limelight.ui.StreamContainer`. **Nada
instancia `StreamView`** — as únicas menções no código são comentários. Ele é uma cópia
antiga que ficou para trás.

O problema é que `app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java` — o
**único** teste de entrada do repositório — testa exatamente essa classe morta. Ele passa,
e não prova nada sobre o comportamento real.

Há **três cópias** da mesma lógica de IME: `StreamContainer` (viva), `ExternalControllerView`
(viva, display externo) e `StreamView` (morta). Ao corrigir qualquer coisa aqui, corrija nas
duas vivas — e considere apagar a morta, movendo o teste para `StreamContainer`.

O teclado em `binding/input/virtual_controller/keyboard/` (12 arquivos, 4.198 linhas) **não**
resolve nada disso: é um overlay de botões arrastáveis para atalhos de jogo, não um teclado
de digitação.

## Causa raiz da parte 1 — o teclado cobre a tela

São duas coisas somadas:

**A activity `.Game` não declara `windowSoftInputMode`.** O `AndroidManifest.xml` só tem essa
declaração na linha 179, e ela pertence a `.preferences.AddComputerManually` — não à `.Game`.
Sem declaração, o modo é `SOFT_INPUT_ADJUST_UNSPECIFIED`.

**E a janela está em fullscreen legado**, o que faz o Android ignorar qualquer resize:

```
Game.java:359       addFlags(FLAG_FULLSCREEN)
Game.java:369       addFlags(FLAG_LAYOUT_IN_SCREEN)
Game.java:1655-66   SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | HIDE_NAVIGATION | IMMERSIVE_STICKY
Game.java:1649      // TODO: Do we want to use WindowInsetsController here on R+ ...
```

O `hideSystemUi` ainda é **reagendado a cada 2 s** sempre que as flags caem
(`Game.java:3914-3928`) — o que, sozinho, já brigaria com o IME aberto.

Por isso **adicionar `adjustResize` ao manifest não resolve**. É a tentativa que todo mundo
faz primeiro, e ela falha.

O lado bom: `StreamView.onMeasure()` já respeita `desiredAspectRatio` e `fillDisplay`. Se a
área encolher, **o vídeo se reescala sozinho** — não é preciso mexer em escala.

## Desenho proposto

### Parte 1 — a tela cede espaço ao teclado

Migrar do modelo legado de flags para o modelo de insets:

```java
WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

WindowInsetsControllerCompat c =
    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
c.hide(WindowInsetsCompat.Type.systemBars());   // NUNCA esconder Type.ime()
c.setSystemBarsBehavior(
    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

ViewCompat.setOnApplyWindowInsetsListener(streamContainer, (v, insets) -> {
    int ime = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
    v.setPadding(0, 0, 0, ime);      // onMeasure reescala o vídeo sozinho
    return insets;
});
```

E **suprimir o reagendamento do `hideSystemUi` enquanto `insets.isVisible(Type.ime())` for
verdadeiro** — senão ele reaplica as flags e desfaz o resize a cada 2 segundos.

**Restrições.** `minSdk` é 21; `WindowInsets.Type.ime()` é API 30+. `WindowInsetsCompat`
cobre versões antigas, mas o inset de IME **não é confiável abaixo da API 30**. Declare
`androidx.core` explicitamente no `app/build.gradle` — hoje ele só entra transitivamente
via `appcompat:1.7.1`, e depender de transitividade para uma API central é frágil.

Para API < 30, o fallback é `adjustResize` com as flags de fullscreen relaxadas enquanto o
teclado estiver aberto, restauradas ao fechar.

**Ofereça três modos**, como preferência: `cobrir` (atual, default até validar) ·
`redimensionar` · `deslocar`. Para jogo, manter o tamanho da imagem e apenas deslocar às
vezes vale mais que ver tudo.

**Verifique os efeitos colaterais** — cada um tem tratamento próprio no código:
modo imersivo (`Game.java:1646`), notch/cutout (`:447-451`), display externo
(`ExternalDisplayControlActivity.java`), modo retrato e `alignDisplayTopCenter` (`:469`),
o overlay de controle virtual (posicionado por coordenada absoluta), e Samsung, que
historicamente diverge (ver o comentário em `StreamView.onKeyPreIme()`).

### Parte 2 — campo de texto com envio de uma vez

1. **Corrigir o bug do flush** (acima). Sem isso, nada abaixo funciona.
2. **Ligar `enableCommitText` por padrão.** Com ele, digitação por gesto e ditado por voz já
   passam a funcionar pelo caminho Unicode.
3. **Adicionar um `EditText` em overlay**, acessível pelo `GameMenu` (já existe) ou pelo
   `floatingMenuButton` (`Game.java:300`): digita, revisa, envia. É o comportamento do
   AnyDesk e resolve digitar senha, comando ou URL no host.
   Mostre um indicador de progresso — a 50 ms de espera inicial mais um pacote por
   caractere, um parágrafo leva um tempo perceptível.
4. **Corrigir `deleteSurroundingText`** (`Game.java:4304-4310`): hoje emite um par
   KEY_DOWN/KEY_UP por caractere apagado, em rajada. Enfileire, como já se faz com o texto.
5. **Testar com Vibeshine.** `LiSendUtf8TextEvent` exige suporte do host. Vibeshine é fork
   do Sunshine e provavelmente suporta, mas **isso não foi verificado** — e é o maior risco
   não resolvido deste EPIC.

### Risco de segurança a respeitar

`ControlStream.c:704` monta o pacote em `char tempBuffer[256]` **na pilha**, e a única
proteção é `LC_ASSERT(sizeof(*packet) + paylen < sizeof(tempBuffer))` — que vira `assert()`
e é **anulado em release** por `NDEBUG` (`Android.mk:52-54`).

Isso nunca dispara hoje **porque o splitter por code point garante `paylen` de poucos
bytes**. É exatamente o código que alguém removeria ao tentar "mandar tudo num pacote só".

> **Não remova o splitter de code point.** Se algum dia isso for mesmo necessário, primeiro:
> aumentar ou alocar dinamicamente o `tempBuffer`, trocar o `LC_ASSERT` por checagem de
> runtime que retorna erro, e validar o tamanho em `LiSendUtf8TextEvent`.
> Lembrando que `moonlight-common-c` é submódulo — a mudança vai por PR upstream.

Reforçando o teto real: `InputStream.c:43` define `MAX_INPUT_PACKET_SIZE` como **128 bytes**,
e o buffer de criptografia em `InputStream.c:254` tem exatamente esse tamanho. O
`UTF8_CHUNK_SIZE = 512` de `Game.java:313` é **quatro vezes maior** que isso. Hoje não
estoura porque o splitter reduz cada pacote a um único code point, mas o número 512 no
cliente é enganoso e convida a erro. Alinhá-lo com o limite do protocolo — ou documentar
no local por que ele pode ser maior — é uma correção barata que evita um incidente futuro.

### Bug adicional encontrado na ponte

`simplejni.c:127` usa `GetStringUTFChars` + `strlen`. Isso devolve **Modified UTF-8**, não
UTF-8 padrão: caracteres suplementares (emoji, U+10000 e acima) saem como par de surrogates
em CESU-8, que o host não decodifica corretamente; e `strlen` trunca no primeiro `NUL`.

Correção: converter para UTF-8 real pelo lado Java (`text.getBytes(StandardCharsets.UTF_8)`)
e passar um `byte[]` com comprimento explícito, em vez de `jstring`.

### Parte 3 — layouts alternativos

O README do Artemis lista "Non-QWERTY keyboard layout support" (item 19) — existe algo em
`KeyboardTranslator`/`KeyMapper`. **Investigue o que já funciona antes de construir.**

O IME é escolhido pelo sistema, então "trocar de layout" na prática é trocar o teclado do
sistema. O que o cliente pode fazer:
- um seletor chamando `InputMethodManager.showInputMethodPicker()`
- garantir que qualquer layout produza o caractere certo no host — que é precisamente o que
  o caminho `sendUtf8Text` resolve, por não depender de scancode

## Ordem sugerida

| # | Trabalho | Tamanho | Risco |
|---|---|---|---|
| 0 | `curl` no teu Vibeshine: `actions/clipboard` responde? | minutos | **decide o desenho** |
| 1 | Corrigir o flush de `commitText` (`Game.java:4331`) | trivial | baixo |
| 2 | Testar `sendUtf8Text` contra Vibeshine | teste | **destrava o resto** |
| 3 | Ligar `enableCommitText` por padrão | trivial | baixo |
| 4 | Corrigir Modified UTF-8 em `simplejni.c:127` | pequeno | baixo (toca JNI) |
| 5 | Enfileirar os backspaces do `deleteSurroundingText` | pequeno | baixo |
| 6 | Campo de texto em overlay com envio e progresso | médio | baixo |
| 6b | Se o clipboard funcionar: caminho B com fallback para A | médio | baixo |
| 7 | Pular o sleep de 50 ms quando `IS_SUNSHINE()` | pequeno | médio (submódulo → PR upstream) |
| 8 | Insets do IME + preferência de três modos | grande | **alto** — mexe em janela |
| 9 | Investigar layouts alternativos | médio | médio |

O passo 0 leva minutos e muda o desenho dos passos 6/6b. Faça antes de escrever código:

```bash
curl -k -X POST --data "teste" -H "Content-Type: text/plain" "https://SEU_HOST:47984/actions/clipboard?type=text&uniqueid=..."
```

(a URL exata sai de `NvHTTP.getHttpsUrl()`; o mais simples é ligar o log do app e observar.)

Os itens 1 a 6 são incrementais, isolados e entregam a maior parte do ganho percebido.
O item 7 é o de maior valor visual e o de maior risco: flags de janela têm efeito global.
Faça-o isolado, atrás de preferência, com o comportamento atual como default até validar.

## Verificação

Insets de IME e comportamento de janela **não são verificáveis por teste unitário** —
exigem dispositivo. Considere pronto quando houver:

- gravação de tela mostrando o stream cedendo espaço ao teclado e voltando ao fechar
- texto com mais de 512 bytes enviado e recebido íntegro no host (é o caso do bug do flush)
- texto com acentos e cedilha corretos no host, com layout do host diferente do cliente
- modo imersivo intacto depois de fechar o teclado
- testado em pelo menos um Samsung

Para o item 1 dá para escrever teste unitário: `StreamViewCommitTextTest` já existe e mostra
o padrão. Um teste que enfileira mais de 512 bytes e verifica que tudo foi drenado
capturaria a regressão.

O subagente `android-input-specialist` carrega este contexto e o caminho completo do evento.
