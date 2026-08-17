# ADR 0001 — Versionar a documentação de agentes no repositório

- **Status:** aceito
- **Data:** 2026-08-16
- **Decisor:** Rafael (dono do fork)

## Contexto

O upstream (`ClassicOldSong/moonlight-android`) lista `AGENTS.md` no `.gitignore`, sob a
seção `# agent files`. A intenção lá é razoável: o mantenedor não quer que arquivos de
ferramentas de IA de cada colaborador poluam a árvore compartilhada.

Neste fork a situação é o oposto. O fork existe justamente para ser trabalhado de forma
contínua por agentes de IA, ao longo de muitas sessões que não compartilham memória entre
si. A documentação de agentes **é** o produto principal de infraestrutura aqui — se ela não
for versionada, cada nova sessão recomeça do zero, relendo 63 mil linhas de código para
redescobrir o que já foi descoberto.

## Decisão

Remover `AGENTS.md` do `.gitignore` e versionar toda a documentação voltada a agentes:
`CLAUDE.md`, `AGENTS.md`, `docs/`, `.claude/agents/`, `.claude/skills/` e `tools/codemap/`.

## Consequências

**Positivas**
- Conhecimento acumula entre sessões em vez de evaporar.
- Os mapas em `docs/maps/` permitem que um agente localize código sem varrer o repositório,
  o que reduz drasticamente o consumo de tokens por sessão.
- Revisões de mudanças de documentação passam pelo mesmo fluxo de PR do código.

**Negativas**
- Cria divergência permanente com o upstream no `.gitignore`. É uma linha só, e o conflito
  de merge, se houver, é trivial de resolver.
- Os arquivos gerados (`docs/maps/`) entram no controle de versão e produzem diffs a cada
  mudança estrutural do código. Aceitamos isso: o diff dos mapas é sinal útil de revisão
  ("essa mudança alterou o acoplamento entre pacotes?"). O `--check` do codemap garante que
  eles não fiquem defasados.

## Alternativas consideradas

- **Manter os arquivos apenas localmente, fora do git.** Rejeitada: derrota o propósito do
  fork e não sobrevive a trocar de máquina.
- **Repositório separado só para documentação.** Rejeitada: a documentação referencia
  `arquivo:linha` do código. Separar os dois garante que dessincronizem.
- **Gerar os mapas em tempo de build em vez de versioná-los.** Rejeitada por ora: exigiria
  Node no ambiente de todo agente antes de qualquer leitura. Versionar é mais barato e
  torna os mapas legíveis direto no GitHub. Revisitar se o diff virar ruído.
