# VibeArtemis — base de design

Documento de entrada para o Claude Design. Não é um manual fechado: é a divisão entre
**o que já está decidido** e **onde há liberdade real**.

A tentação num documento desses é especificar tudo. Isso mata a razão de usar uma
ferramenta criativa — sobra execução, não design. Então cada seção diz explicitamente se
é invariante ou território aberto.

---

## 1 · O produto

Cliente Android de game streaming. Você aponta para um PC em casa e ele vira a tela do
teu tablet ou celular. Fork do Artemis (linhagem Moonlight), pareado com hosts Sunshine,
Vibeshine ou Apollo.

O que o distingue de qualquer outro cliente: o host **Vibeshine 1.19** permite que até
quatro aparelhos conectem como **monitores independentes** do mesmo PC — cada um com sua
resolução e taxa, posicionados no espaço como monitores de verdade. O tablet não é um
espelho; é uma tela a mais.

**Uso real do dono:** um tablet Samsung S8 Ultra que serve de segunda tela do PC durante
o trabalho de dia e de tela de jogo à noite, mais um celular como terceira tela. Metade
do uso é produtividade, metade é jogo.

## 2 · Restrições duras — invariante

Não são preferências. São a plataforma.

| Restrição | Consequência |
|---|---|
| Android nativo, XML + Java | O código gerado é **referência visual**, não implementação. O que atravessa é o sistema: tokens, escala, comportamento. |
| `minSdk 21` | APIs modernas precisam de fallback. Blur em tempo real não é garantido. |
| Compete com o decodificador pela GPU | Efeito caro durante o stream tira quadro do vídeo. Blur e sombra grande custam. |
| Toque em movimento | Alvos generosos. A pessoa está deitada, com o tablet apoiado, às vezes com uma mão. |
| Ambiente escuro predomina | Mas não é exclusivo — o uso de trabalho é diurno. |

## 3 · Fundamentos — invariante

Quatro decisões que valem em qualquer direção visual. Já foram pesquisadas e resolvidas;
não vale reabrir.

**Cor em OKLCH.** HSL mente sobre luminosidade — amarelo e azul com o mesmo *lightness*
não parecem igualmente claros, então rampas saem tortas. OKLCH é perceptualmente
uniforme e alcança P3, que as telas Samsung têm.

**Contraste por APCA.** O app vive no escuro, e é aí que WCAG 2 não orienta: a fórmula
não distingue polaridade e o olho distingue. WCAG como piso legal, APCA como teto de
legibilidade.

**Uma cor faz o trabalho.** Quase tudo neutro, um acento carregando significado. Aqui não
é estética: a cor precisa dizer **estado** — online, ativo, atenção. Se tudo é colorido,
nada informa.

**Números em tabular.** Latência, resolução e taxa mudam em tempo real. Sem
`font-variant-numeric: tabular-nums` a linha inteira dança a cada leitura.

## 4 · Conteúdo real — invariante

Nada de texto de preenchimento. Estes são os dados verdadeiros:

- Hosts: `PC-RAFAEL` (online), `Notebook`, `Sala`, `Trabalho`
- Endereço: `192.168.0.14` · Host: `Vibeshine 1.19`
- Telas: `S8 Ultra` 2960×1848 120 Hz · `Dell 27"` 2560×1440 165 Hz · `Este aparelho` 2340×1080 120 Hz
- Rede: `18 ms`, mediana `21 ms`
- Funções de sessão: `Remote Monitor`, `Remote Input`, `Resume`, `Terminate`
- Apps: `Steam`, `Desktop`, `RetroArch`, `OBS`
- Interface em **português do Brasil**

## 5 · As quatro teses

Cada uma responde a uma pergunta diferente e tem uma feature que as outras não teriam
motivo de carregar. **A tese é invariante; a expressão dela é aberta.**

### Sinal — “está bom?”
Instrumento de medição, vocabulário de broadcast. Feature própria: osciloscópio de
latência ao vivo e captura de 30 s para comparar antes e depois. Densidade máxima, sem
cards, mono inclusive em títulos.
Tokens de partida: fundo `oklch(16% .014 235)` · acento `oklch(78% .145 200)` · texto `oklch(93% .008 235)`

### Grafite — “abre meu setup”
Documento técnico. Feature própria: fichas de sessão — papel, posição e preferências
salvos como documento nomeado que você abre. Claro por padrão, serifa nos títulos,
atalhos de teclado visíveis.
Tokens de partida: papel `oklch(97.5% .004 250)` · tinta `oklch(48% .155 258)` · texto `oklch(24% .014 250)`

### Vidro — “me põe dentro”
Ambiente. Feature própria: antecipação — sugere a ação provável pelo horário e hábito.
Superfície contínua, sem abas, nenhum número técnico na tela inicial.
Tokens de partida: fundo `oklch(8% .008 280)` · acento `oklch(64% .180 250)` · translucidez sobre halos de cor

### Âmbar — “onde essa tela entra”
A sala. Feature própria: o mapa espacial das telas é o controle — toque numa tela para
assumi-la. Quase sem texto, luz como linguagem, estado pela qualidade da linha.
Tokens de partida: fundo `oklch(11% .010 55)` · acento `oklch(80% .145 68)` · texto `oklch(95% .010 70)`

## 6 · Território aberto

Aqui é onde vale explorar, e onde eu explicitamente **não** decidi:

**Tipografia.** Nenhuma face foi escolhida — os protótipos rodam com a do sistema, o que é
a maior lacuna de personalidade que resta. Escala, pesos, pareamento e a face em si estão
em aberto. Restrição única: números em tabular.

**Forma e assinatura.** O chanfro de canto surgiu no Âmbar e funcionou, mas é uma
hipótese, não lei. Cada tese pode ter a sua marca formal — ou nenhuma, se a densidade já
bastar.

**Movimento.** Só três momentos foram definidos para o Âmbar (acender, o número que
assenta, a pressão no toque). Para as outras três não há nada decidido. Material 3
Expressive traz física de molas nativa e pode ser aproveitado.

**Layout e hierarquia.** As telas dos protótipos são propostas, não gabaritos. Se a tese
pede outra organização, mude.

**Os tokens acima são ponto de partida.** Se a exploração encontrar uma paleta melhor
para a mesma tese, use — desde que respeite OKLCH, APCA e a regra de um acento só.

**Estados.** Vazio, conectando, erro, host dormindo, e o estado próprio deste produto —
“este aparelho virou uma tela”. Pouco foi desenhado. É onde há mais espaço e mais valor.

## 7 · Como saber que deu certo

- Duas identidades **não podem** parecer intercambiáveis. Se parecerem, uma errou a tese.
- A tela precisa parecer software que alguém usa, não peça de portfólio.
- Alguém que não distingue o acento ainda deve ler a hierarquia.
- Nenhuma informação que o app não consegue obter (ver seção 8).

## 8 · O que o app não sabe — invariante

Erro já cometido, custou uma rodada inteira:

- **O protocolo não expõe a topologia de monitores.** Nem quantidade, nem disposição. A
  organização das telas é **declarada pelo usuário** e guardada por host.
- **Latência só existe durante a sessão.** Fora dela, o que dá para medir é o tempo de
  resposta do polling HTTP — e precisa ser rotulado como “rede”, não como latência de
  vídeo.
- **Clipboard, virtual display e server commands exigem Apollo.** O dono usa Vibeshine,
  então esses recursos não devem aparecer como se funcionassem.

Referências completas em `docs/reference/` e `docs/design/` neste repositório.
