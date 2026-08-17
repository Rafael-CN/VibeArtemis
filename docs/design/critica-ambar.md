# Crítica do protótipo Âmbar — o que sustenta e o que não

Avaliação do protótipo "A Sala" contra o que o cliente **de fato consegue saber**, mais
propostas de melhoria. Escrito depois de o dono do fork validar três elementos: o chanfro,
o mini-ícone do filamento e o display de latência.

## Verificações que mudam o desenho

**A topologia detectada não existe.** `Limelight.h` não expõe nada sobre monitores do
host — nem contagem, nem disposição. O Vibeshine sabe (tem o `DisplayTopologyEditor` na
web UI), mas isso é API própria dele, atrás de autenticação separada, e acoplaria o
cliente a um host específico. **O desenho atual mostra uma informação que o app não tem.**

**A latência na tela inicial não existe.** `MoonBridge.getEstimatedRttInfo()` só é chamado
de dentro do `MediaCodecDecoderRenderer` — existe durante a sessão, não antes. O número
grande de "18 ms" na home é ficção.

Ambos são o elemento mais forte do protótipo. Então a pergunta não é "como detectar", é
**como preservar a ideia sem a detecção**.

---

## Propostas

### P1 · A topologia vira declaração, não detecção — e melhora

Em vez de adivinhar, o usuário **arruma as telas uma vez**. Uma tela de configuração onde
ele arrasta os retângulos para a posição real, dá nome a cada um e marca qual é o
principal. O app guarda por host.

Por que isso é melhor e não um consolo:

- Vira um **ritual de setup memorável** — o momento em que o app mostra que entende a
  configuração dele. Apps ganham afeto nesses momentos, não na décima sessão.
- É **verdade**, não inferência frágil que erra e destrói confiança.
- Custo real: uma tela de arrastar retângulos numa grade + persistência em JSON. Nada de
  protocolo novo.
- E se algum dia o host expuser a topologia, o desenho já está pronto para preencher
  sozinho.

**Viável:** sim, inteiramente do lado do cliente.

### P2 · O número precisa de contexto, não de tamanho

`18 ms` sozinho não informa — ninguém sabe se é bom. O que informa é **18 comparado ao
histórico**. Hoje o sparkline está de apoio ao número; deveria ser o contrário.

Proposta: a faixa de histórico vira o elemento largo, com o número como leitura atual
sobreposta. E ganha um marcador da mediana da sessão. Assim um pico é visível como pico,
não como um número que mudou.

Na home, onde não há sessão, mostrar **o tempo de resposta do polling HTTP** — o
`ComputerManagerService` já faz requisições periódicas ao host, então medir é de graça.
Não é a latência de vídeo, e o rótulo precisa dizer isso ("rede", não "latência").

**Viável:** sim. O histórico já existe no overlay de performance; é reaproveitar.

### P3 · O chanfro precisa de gramática

Hoje está em tudo que é acionável, com o mesmo tamanho. Isso é aplicar uma marca, não
construir um sistema — e uniformidade demais vira textura, que é como decoração começa.

Proposta de regra:
- **11px** — ação primária, uma por tela no máximo
- **7px** — superfície acionável secundária
- **sem chanfro** — superfícies informativas, que não respondem ao toque

O chanfro passa a **significar interatividade** e a hierarquia fica legível sem cor. Isso
também ajuda acessibilidade: quem não distingue o âmbar ainda lê a hierarquia pela forma.

**Viável:** sim, é `clip-path` ou um `ShapeDrawable` no Android.

### P4 · Falta a face tipográfica

O protótipo usa `system-ui`. Nenhuma identidade sobrevive à fonte padrão do sistema — é
literalmente a mesma de todo app do aparelho. Este é provavelmente o maior ganho de
personalidade ainda disponível, e o mais barato.

Sugestões com licença aberta e boa métrica em telas densas:

- **Geist** (Vercel, OFL) — geométrica, moderna, tem par monoespaçado desenhado junto.
  Combina com a temperatura do Âmbar sem competir.
- **Space Grotesk** (OFL) — mais caráter, detalhes incomuns nos terminais. Risco: já
  ficou reconhecível demais em produto de tecnologia.
- **Instrument Sans** (OFL) — menos usada, ótimo equilíbrio entre neutra e expressiva.

Para os números, uma monoespaçada de verdade com **tabular figures** — o display de ms
depende disso para não dançar.

**Viável:** sim. Custo: ~200 KB no APK por família. Considerar variable font.

### P5 · Estados são onde o design prova que é sistema

Tela feliz qualquer um resolve. O protótipo não mostra: nenhum host encontrado,
conectando, host dormindo, erro de conexão, sessão tomada por outro cliente.

O caso mais interessante é **"conectando"**: é onde a metáfora da luz se paga sozinha —
o halo pode subir enquanto a conexão estabelece, e a topologia acender uma tela por vez.
Nenhum outro momento do app pede tanto por movimento.

E há um estado que só existe neste produto: **este dispositivo já é um monitor remoto**.
O catálogo do host encolhe para Resume/Disconnect, e a tela precisa dizer "você é uma
tela agora" em vez de mostrar uma grade quase vazia — que é o que acontece hoje.

**Viável:** sim, e o último é obrigatório se formos fazer o `M97`.

### P6 · Movimento, com escopo

O que dá alma em mobile é comportamento, e Material 3 Expressive já traz spring physics.
Três momentos que valem, e só eles:

1. **Acender ao conectar** — o halo cresce e a topologia ilumina em sequência
2. **O número que assenta** — a latência não troca de valor abruptamente; ela desliza
3. **Pressão no chanfro** — o corte cresce alguns pixels ao toque, e volta

O resto do app deve ser imóvel. Animação em lista é onde apps parecem baratos.

**Viável:** sim, e barato — são três animações, não um sistema de motion.

### P7 · Densidade não foi testada

A home foi desenhada com um host. Com cinco, o herói ocupa a tela inteira e o resto vira
rodapé espremido. Falta decidir: o herói é o **host ativo** (e some quando não há
nenhum), ou é sempre o **último usado**?

Proposta: o herói só existe quando há um host online e recente. Caso contrário a tela cai
para uma lista sóbria, e o design não finge protagonismo que não tem.

**Viável:** sim, é lógica de apresentação.

---

## O que eu faria primeiro

1. **P4 (tipografia)** — maior ganho de personalidade por unidade de esforço
2. **P3 (gramática do chanfro)** — transforma marca em sistema
3. **P1 (topologia declarada)** — preserva o rosto do app com honestidade
4. **P5 (estados)** — onde isso deixa de ser mockup e vira produto

P2 e P6 vêm depois, e P7 é ajuste que só dói quando o resto estiver de pé.
