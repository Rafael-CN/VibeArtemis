# Prompts para geração de mockup — GPT Image 2

Quatro prompts, dois por identidade, para gerar mockups visuais mais ricos que os
protótipos em HTML. Escritos em **inglês** de propósito: o vocabulário técnico de design
(*optical alignment*, *tabular figures*, *hairline rule*) é muito mais estável em inglês
nesses modelos, e nomes de cor em português puxam interpretações estranhas.

## Por que estão estruturados assim

Do guia de prompting da OpenAI para geração de imagem, o que mais muda o resultado:

- **Ordem fixa**: cena → sujeito → detalhes → restrições. Bagunçar isso faz o modelo
  priorizar errado.
- **Descrever como produto que já existe**, nunca como conceito ou estudo. Linguagem de
  concept art produz ilustração; linguagem de produto produz interface.
- **Segmentos curtos e rotulados** em vez de um parágrafo longo.
- **Texto literal entre aspas**, com instrução de renderizar verbatim. É a única forma de
  ter alguma chance de tipografia correta.
- **Nomear o trabalho e definir o que é sucesso** — o modelo preserva estrutura melhor
  quando sabe para que serve a imagem.
- **Sem "lorem ipsum"** dito explicitamente, senão ele preenche com isso.
- Evitar palavras de estúdio ("award-winning", "8k", "trending") — puxam brilho genérico,
  que é o oposto do que queremos.

Cada prompt tem uma seção **Creative latitude**, que é onde o modelo pode inventar. Sem
ela o resultado fica igual ao HTML e não há ganho; com ela demais, perde a identidade.

## Como usar

Rode um por vez, em `quality: high` (layout denso com texto embutido). Depois refine em
conversa — o modelo aceita ajuste incremental melhor que um prompt reescrito. Se o texto
sair torto, mexa só no trecho do texto e mantenha o resto.

Gere cada um 3–4 vezes. A variação entre execuções é grande, e a melhor costuma aparecer
por volta da terceira.

---

## ÂMBAR — 1 de 2 · tela de hosts

```
Design job: a single high-fidelity mobile app screen for a product that already ships.
This is a UI mockup for a design review, not concept art.

Scene: a modern Android phone screen filling the frame, straight-on, no perspective, no
hand, no desk, no reflections. Flat presentation, the screen is the whole image.

Subject: the "Hosts" screen of VibeArtemis, a game-streaming client that turns tablets
and phones into extra monitors for a gaming PC. The user is a power user at home at
night.

Design thesis: this interface is light in a dark room. Deep warm-neutral background, and
surfaces that read as lit from behind rather than painted. Cinematic, calm, confident —
never clinical, never neon.

Layout and hierarchy, top to bottom:
- thin status bar, "21:04" left, battery right
- small uppercase wordmark "VIBEARTEMIS" in amber, wide letter-spacing
- large screen title "Hosts", tight letter-spacing, generous space below
- two host cards, stacked, rounded 14px, one clearly active and one dormant
- the active card carries a small amber dot with a soft glow; the dormant one a dim grey
  dot with no glow
- each card: computer name in medium weight, one line of quiet supporting text below
- ample breathing room, roughly 24px between cards, wide outer margins

Color, exact:
- background #16120E, warm near-black with a subtle radial lift toward the top
- card surface #211C16 with a 1px border #2E2820
- amber accent #F4A340, used ONLY on the wordmark and the active state
- primary text #F6F1EA, secondary text #B3A797

Typography: one clean geometric sans across the whole screen. Three weights only —
regular for supporting text, medium for names, semibold for the title. Letter-spacing
tightens as size grows. No serif, no rounded playful faces, no condensed.

Exact text, render verbatim with no extra characters:
"VIBEARTEMIS", "Hosts", "PC-RAFAEL", "Online · 3 monitores", "Notebook", "Offline"

Creative latitude: you may invent the wordmark's letterforms, the exact quality of the
background light, the glow falloff on the active dot, and one small restrained detail
that gives the screen character — as long as it stays minimal and nothing competes with
the amber accent.

Constraints: no lorem ipsum. No placeholder boxes. No drop shadows under text. No
gradient text. No more than one accent hue. No icons made of emoji. Nothing skeuomorphic.
The screen must look like software someone shipped, not a dribbble shot.
```

---

## ÂMBAR — 2 de 2 · biblioteca com sessão ativa

```
Design job: a single high-fidelity mobile app screen for a product that already ships.
UI mockup for design review, not concept art.

Scene: a modern Android phone screen filling the frame, straight-on, flat, no device
body, no hand, no environment.

Subject: the app library screen of VibeArtemis, a game-streaming client. This host is
already connected, and the top of the screen offers session functions before the app
grid — because turning the tablet into a second monitor is something this user does
several times a day.

Design thesis: light in a dark room. Warm near-black ground, surfaces lit from behind,
a single amber accent that means "active". Cinematic rather than clinical.

Layout and hierarchy, top to bottom:
- thin status bar
- small uppercase label "PC-RAFAEL" in amber, wide letter-spacing
- large title "Biblioteca", tight letter-spacing
- quiet section label "SESSÃO", small, uppercase, muted
- two wide amber action buttons side by side, rounded 12px, dark text on amber fill —
  these are the visual anchor of the screen
- quiet section label "APLICATIVOS"
- a 2-column grid of four app tiles, rounded 13px, each with a muted colored artwork area
  above and a name below on a dark strip
- tile artwork colors must be desaturated and dark so nothing competes with the amber

Color, exact:
- background #16120E with a subtle warm radial lift at the top
- surfaces #211C16, borders #2E2820
- amber accent #F4A340 for the section buttons and the label
- primary text #F6F1EA, secondary #B3A797
- tile artwork: muted deep blue #24303F, muted deep green #23332A, muted plum #322431,
  muted slate #2A2E36

Typography: one geometric sans, three weights. Section labels small, uppercase, wide
tracking, low contrast. Titles tight. Numbers never used here.

Exact text, render verbatim with no extra characters:
"PC-RAFAEL", "Biblioteca", "SESSÃO", "Remote Monitor", "Remote Input", "APLICATIVOS",
"Steam", "Desktop", "RetroArch", "OBS"

Creative latitude: invent the app tile artwork as abstract minimal marks rather than
literal logos — simple geometric forms that read at small size. You may also decide how
the amber buttons express their weight (fill, soft inner light, or a fine bright edge).
Choose one and commit.

Constraints: no lorem ipsum. No real brand logos. No emoji. No glassmorphism blur. No
neon glow spill. No text over busy artwork. One accent hue only. Must read as a shipped
product screen.
```

---

## GRAFITE — 1 de 2 · hosts em tablet

```
Design job: a single high-fidelity tablet app screen for a product that already ships.
UI mockup for design review, not concept art.

Scene: a large Android tablet screen in landscape, filling the frame, straight-on, flat,
no bezel, no hand, no desk. Daylight product, not a dark room.

Subject: the "Hosts" screen of VibeArtemis, a game-streaming client. This user works on
the tablet as a laptop during the day and streams at night, so the interface is designed
for daylight first.

Design thesis: this is a work tool, not a toy. The reference is technical documentation
and engineering drawing — light ground, strong type, high contrast, a single ink color.
Deliberately the opposite of every dark gaming client.

Layout and hierarchy:
- narrow left column with the wordmark "VIBEARTEMIS" small, uppercase, in ink blue, and
  three quiet nav entries below it
- main area with a large bold title "Hosts" at top left
- below it, a list of three host rows as flat white cards with hairline borders, no
  shadows — paper on paper
- the online host carries a 3px ink-blue rule on its left edge; the others do not
- each row: name in semibold, a line of small technical detail below in grey, and a small
  outlined status tag on the right reading the state as a word, not just a color
- wide margins, an 8px rhythm, more whitespace than feels necessary

Color, exact:
- page #F7F8FA, card surface #FFFFFF, hairline borders #DFE2E8
- ink blue #2F5BC4, used only for the wordmark, the active rule and the online tag
- primary text #2A2E36, secondary text #6B7280

Typography: one clean grotesque sans. Heavier weights than a dark UI would use, because
text needs more body on a light ground — semibold for names, bold for the title, regular
for detail. Technical detail (IP address, latency) in a monospaced face with tabular
figures so digits do not shift.

Exact text, render verbatim with no extra characters:
"VIBEARTEMIS", "Hosts", "PC-RAFAEL", "192.168.0.14 · 3 telas", "Online", "Notebook",
"visto 2h atrás", "Offline", "Sala", "192.168.0.22", "Offline"

Creative latitude: invent the wordmark, the nav iconography as minimal line marks, and
one structural device that makes it feel like a technical document — a faint grid, a
measurement tick, a fine rule with a label. Exactly one such device, used consistently.

Constraints: no lorem ipsum. No drop shadows. No gradients. No rounded friendly fonts. No
emoji. No color other than the single ink blue plus greys. No card elevation. It must
look like a precision tool someone uses for work.
```

---

## GRAFITE — 2 de 2 · biblioteca em tablet

```
Design job: a single high-fidelity tablet app screen for a product that already ships.
UI mockup for design review, not concept art.

Scene: a large Android tablet screen in landscape, filling the frame, straight-on, flat,
no bezel, no hand, no environment.

Subject: the app library of VibeArtemis, a game-streaming client, seen on a connected
host. Session functions come first, then the application grid.

Design thesis: a work tool built on the language of technical documentation — light
ground, strong type, one ink color, structure you can read at a glance. The opposite of
a dark gaming launcher.

Layout and hierarchy:
- narrow left nav column, wordmark "VIBEARTEMIS" at top in ink blue, quiet nav below
- main area: small breadcrumb-like label "PC-RAFAEL", then a large bold title "Biblioteca"
- a labelled band "SESSÃO" with two solid ink-blue buttons, white text, 6px radius
- a labelled band "APLICATIVOS" with a 4-column grid of app cards
- each card: a pale tinted artwork area with a minimal abstract mark, then a white strip
  with the app name in semibold
- hairline borders everywhere, no shadows, strict 8px rhythm, generous outer margin

Color, exact:
- page #F7F8FA, surfaces #FFFFFF, hairlines #DFE2E8
- ink blue #2F5BC4 for the wordmark, section buttons and any active state
- primary text #2A2E36, secondary #6B7280
- card artwork tints, all pale: #E6ECF7, #E6F1EA, #F4EAF0, #EDEFF3

Typography: one grotesque sans, semibold for names, bold for the title, regular for
labels. Section labels small, uppercase, wide tracking, grey. Any number in a monospaced
face with tabular figures.

Exact text, render verbatim with no extra characters:
"VIBEARTEMIS", "PC-RAFAEL", "Biblioteca", "SESSÃO", "Remote Monitor", "Remote Input",
"APLICATIVOS", "Steam", "Desktop", "RetroArch", "OBS", "Firefox", "Blender"

Creative latitude: invent the abstract marks for each app card as simple geometric
line-based forms in the ink blue at low opacity — they should feel drawn with the same
pen, like a consistent icon set. You may also introduce one quiet structural detail
borrowed from technical drawing, used consistently.

Constraints: no lorem ipsum. No real brand logos. No shadows, no gradients, no glass. No
emoji. Only the single ink blue plus greys and the pale tints. Nothing playful. It must
read as an instrument for work, professionally art-directed.
```

---

## Se o resultado vier genérico

Quase sempre é uma destas três causas:

1. **Faltou a tese.** Sem a seção *Design thesis*, o modelo cai no default de app bonito
   genérico. É a parte que mais carrega identidade — não corte para encurtar.
2. **Latitude criativa larga demais.** Se pedir "seja criativo" sem dizer *onde*, ele
   inventa no lugar errado, normalmente adicionando cor. Latitude sempre vem com escopo.
3. **Restrições insuficientes.** A lista de *Constraints* é o que impede sombra,
   gradiente e brilho de voltarem — são o default do modelo, e precisam ser negados
   nominalmente.

Para variar sem perder a identidade, mude **uma** coisa por vez: o ângulo (retrato →
paisagem), a tela (hosts → configurações), ou o estado (vazio, conectando, erro). Um
estado de erro bem resolvido diz mais sobre um design system que uma tela feliz.
