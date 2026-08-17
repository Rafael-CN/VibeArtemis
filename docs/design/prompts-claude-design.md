# Prompts para o Claude Design

Um por tese. Escritos em **português**, ao contrário dos prompts de geração de imagem —
o Claude lida bem com português e a interface é em pt-BR, então descrever em inglês só
adicionaria uma tradução no caminho.

## Antes de colar

Aponte o Claude Design para este repositório na configuração inicial. Ele lê
`docs/design/DESIGN-SYSTEM.md` e os protótipos em `docs/design/*.html`, e a base entra
sozinha — o prompt fica curto e sobra espaço para a exploração.

Se não puder apontar para o repo, cole a seção 2 a 4 do `DESIGN-SYSTEM.md` antes do
prompt.

## Como esses prompts são diferentes

O Claude Design gera código funcional e aceita refinamento por conversa, comentário
inline e knobs. Então o prompt **não** precisa descrever pixels — precisa estabelecer a
tese, marcar o que é invariante e dizer onde explorar. O ajuste fino vem depois, na
ferramenta, que é onde ela é melhor que qualquer prompt.

Peça **uma tela por vez**. Aprove ou ajuste antes da próxima; o design system se
consolida ao longo da conversa e as telas seguintes herdam.

---

## Sinal

```
Estou desenhando um cliente Android de game streaming chamado VibeArtemis. Leia
docs/design/DESIGN-SYSTEM.md no repositório — ele traz o produto, as restrições e o que
já está decidido.

Quero explorar a tese "Sinal".

A TESE
Este app é um instrumento de medição. O vocabulário vem de equipamento de broadcast:
waveform monitor, vectorscópio, barras de teste. A pergunta que o usuário faz ao abrir é
"está bom?" — ele quer o número, não uma impressão. Densidade alta, nada decorativo,
cada pixel carrega dado.

O QUE NÃO MUDA
- Cor em OKLCH, contraste verificado por APCA, um único acento significando estado
- Números em tabular, senão a leitura dança em tempo real
- Conteúdo real do design system, em português
- A feature exclusiva desta tese: osciloscópio de latência ao vivo com linha de
  referência, mais um botão de capturar 30 segundos para comparar antes e depois de
  mexer na rede

EXPLORE À VONTADE
- A face tipográfica. Nada foi escolhido, e é a maior lacuna de personalidade. Uma
  monoespaçada com caráter pode ser a voz desta identidade inteira.
- Como organizar densidade sem virar sopa. Cards provavelmente não servem aqui —
  instrumento organiza em canais, linhas, réguas. Encontre a estrutura certa.
- Uma assinatura formal própria. O Âmbar usa chanfro de canto; esta tese merece a sua,
  ou nenhuma se a densidade já bastar.
- A paleta de partida (fundo oklch(16% .014 235), acento oklch(78% .145 200)) é ponto de
  partida. Se encontrar melhor para a mesma tese, use.

A TELA
Comece pela tela principal: host conectado, leitura de latência, as três saídas de vídeo
com seus modos, e as ações. Uma tela só, resolvida a fundo.

CRITÉRIO
Precisa parecer software que um profissional usa todo dia, não peça de portfólio. E
precisa caber mais informação que qualquer app de streaming comum — se couber pouco, a
tese falhou.
```

---

## Grafite

```
Estou desenhando um cliente Android de game streaming chamado VibeArtemis. Leia
docs/design/DESIGN-SYSTEM.md no repositório.

Quero explorar a tese "Grafite".

A TESE
Este app é uma ferramenta de trabalho, não um brinquedo. A referência é documentação
técnica e desenho de engenharia. A pergunta ao abrir é "abre meu setup" — a pessoa usa o
tablet como notebook durante o dia, com teclado acoplado, e alterna entre modos de uso.
Aposta contra a corrente: claro por padrão, quando praticamente todo cliente de
streaming é escuro.

O QUE NÃO MUDA
- Cor em OKLCH, contraste por APCA, um único acento
- Legibilidade diurna é o requisito de origem desta tese
- Conteúdo real do design system, em português
- A feature exclusiva: fichas de sessão. Papel (monitor remoto / só entrada / sessão
  principal), posição, modo de vídeo e preferências salvos como um documento nomeado que
  a pessoa abre — em vez de reconfigurar toda vez. Com atalho de teclado, porque o
  teclado está ali.

EXPLORE À VONTADE
- A tipografia. Considerei serifa nos títulos porque nenhum app do gênero usa e documento
  técnico usa — mas é hipótese, não decisão. Explore o pareamento que der mais caráter
  sem perder a sobriedade.
- Como uma "ficha" deve parecer e se comportar. É o objeto central desta identidade.
- Navegação. Sumário numerado como documento foi uma ideia; pode haver melhor.
- Densidade e ritmo. Documento tem respiração diferente de app.
- A paleta de partida (papel oklch(97.5% .004 250), tinta oklch(48% .155 258)) é ponto de
  partida.
- O modo escuro. Esta é a única tese em que ele exige tanto trabalho quanto o claro — se
  virar afterthought, a identidade desmonta no uso noturno.

A TELA
Comece pela tela de fichas de sessão: as fichas salvas, o que cada uma contém, e como
abrir uma. É a tela que define a identidade inteira.

CRITÉRIO
Precisa parecer instrumento de trabalho de alguém que leva a sério o que faz. Nada
lúdico. E precisa ser confortável de ler à luz do dia.
```

---

## Vidro

```
Estou desenhando um cliente Android de game streaming chamado VibeArtemis. Leia
docs/design/DESIGN-SYSTEM.md no repositório.

Quero explorar a tese "Vidro".

A TESE
Este app é um ambiente, não um painel. A pergunta ao abrir é "me põe dentro" — a pessoa
não quer pensar no app, quer estar do outro lado. Elegância, poucas opções visíveis,
sensação de material e profundidade. É a tese que abre mão de controle em troca de
tranquilidade.

O QUE NÃO MUDA
- Cor em OKLCH, contraste por APCA, um único acento
- Conteúdo real do design system, em português
- A restrição de plataforma importa aqui mais que nas outras: blur em tempo real disputa
  GPU com o decodificador de vídeo. Translucidez precisa ser barata ou usada com parcimônia.
- A feature exclusiva: antecipação. O app aprende horário e hábito e sugere a ação
  provável no topo — "você faz isso quase toda noite por volta desta hora". As outras
  teses esperam a pessoa escolher; esta chuta primeiro.
- A decisão mais radical desta tese: nenhum número técnico na tela inicial. Sem latência,
  sem resolução, sem taxa. Se aparecer, virou outra identidade.

EXPLORE À VONTADE
- Como a antecipação se apresenta sem parecer intrusiva ou palpite errado.
- A tipografia e a escala. Título grande é da gramática do iOS, mas isso não obriga a
  imitar a Apple — encontre o que é seu.
- Profundidade e material. Onde há camada, quanto blur, e como isso sobrevive à restrição
  de GPU.
- Movimento. É a tese que mais depende dele, e nada foi decidido. Transições contínuas e
  física de mola valem mais aqui que em qualquer outra.
- A paleta de partida (fundo oklch(8% .008 280), acento oklch(64% .180 250)) é ponto de
  partida.

A TELA
Comece pela tela inicial com a sugestão contextual, o que continuar de onde parou, e os
apps. Sem nenhum dado técnico.

CRITÉRIO
Precisa dar vontade de tocar. Se parecer imitação malfeita de app da Apple, falhou — a
gramática pode ser emprestada, a identidade não.
```

---

## Âmbar

```
Estou desenhando um cliente Android de game streaming chamado VibeArtemis. Leia
docs/design/DESIGN-SYSTEM.md no repositório.

Quero explorar a tese "Âmbar", que é a mais desenvolvida — veja
docs/design/ambar-v2.html e docs/design/quatro-teses.html.

A TESE
Este app não lista computadores: ele dá acesso a uma sala, um PC com telas dispostas no
espaço, uma delas na sua mão. A pergunta ao abrir é "onde essa tela entra". Luz quente
numa sala escura, tungstênio em vez de neon.

O QUE NÃO MUDA
- Cor em OKLCH, contraste por APCA, um único acento
- Conteúdo real do design system, em português
- A feature exclusiva: o mapa espacial das telas é o controle, não ilustração. Toque numa
  tela para assumi-la. A disposição é declarada pelo usuário e guardada por host — o
  protocolo não expõe topologia, e mostrar dado que o app não tem já custou uma rodada.
- Estado pela qualidade da linha: contorno cheio é tela em uso, tracejado é disponível.
  Isso mantém a hierarquia legível para quem não distingue o âmbar.

EXPLORE À VONTADE
- A tipografia, que é o que mais falta. Esta tese tem quase nenhum texto, então cada
  palavra que sobra precisa ser bem desenhada.
- O chanfro de canto funcionou como assinatura, com uma gramática de tamanhos (11px
  primária, 7px secundária, nenhum em superfície informativa). Mantenha, refine ou
  substitua por algo melhor — não é lei.
- Como a luz se comporta. Halo, derramamento no chão, brilho no que está ativo: a
  metáfora é forte mas a execução pode ir muito além do que fiz.
- A tela de arrumar os monitores. É o ritual de setup desta identidade e mal foi
  desenhado. Arrastar retângulos numa grade, nomear, marcar o principal.
- A paleta de partida (fundo oklch(11% .010 55), acento oklch(80% .145 68)) é ponto de
  partida.

A TELA
Comece pela sala: o mapa das telas ocupando a maior parte do display, com o mínimo de
texto ao redor. Se a sala precisar de explicação, o desenho falhou.

CRITÉRIO
Alguém que abra o app deve entender a própria configuração em menos de um segundo, sem
ler nada.
```

---

## Depois da primeira tela

Aprovada a tela principal, peça as demais **uma por vez**, para o sistema se consolidar:

1. Biblioteca de aplicativos, com as funções de sessão em destaque
2. O estado “este aparelho virou uma tela do PC” — só existe neste produto
3. Estados de vazio, conectando e erro
4. Configuração de topologia, no caso do Âmbar

Use os **comentários inline** para acertos pontuais e os **knobs** para espaçamento e
cor. Reserve o chat para mudanças estruturais — reescrever o prompt inteiro perde o
sistema construído até ali.

## Ao trazer de volta

O bundle exportado é HTML/CSS/React e o app é Android nativo, então o código não se
aproveita direto. O que atravessa é o sistema: valores de cor, escala tipográfica,
espaçamento, comportamento dos componentes e os estados. Traga o bundle aqui e eu
traduzo para `styles.xml`, `themes.xml` e os componentes.
