---
name: map-refresh
description: Regenera os mapas de código do Artemis em docs/maps/ e reporta o que mudou na estrutura — arquivos novos, símbolos removidos, alterações no acoplamento entre pacotes e na fronteira JNI. Use depois de um git pull, depois de um merge com o upstream, quando o gate acusar mapas desatualizados, ou quando o usuário pedir "atualiza os mapas", "regenera o índice", "o mapa tá velho".
allowed-tools: Bash, Read
---

# Atualizar os mapas de código

```bash
node tools/codemap/codemap.mjs
node tools/codemap/jni-check.mjs
```

## O que é gerado

| Arquivo | Para quê | Como consumir |
|---|---|---|
| `code-index.json` | fonte da verdade | **nunca leia** — use `query.mjs` |
| `SYMBOLS.md` | símbolo → arquivo:linha | **só Grep** |
| `FILE_INDEX.md` | um registro por arquivo | Grep, ou leia a seção do pacote |
| `DEPENDENCY_GRAPH.md` | acoplamento entre pacotes | pode ler inteiro |
| `HOTSPOTS.md` | god-classes, fan-in/out, TODOs | pode ler inteiro |
| `JNI_BRIDGE.md` | travessias Java↔C | pode ler inteiro |

## Reportar o delta, não o conteúdo

Depois de regerar, diga o que **mudou** — é isso que tem valor:

```bash
git diff --stat docs/maps/
git diff docs/maps/DEPENDENCY_GRAPH.md | head -40
```

Sinais que merecem menção explícita ao usuário:

- **aresta nova no grafo de pacotes** — acoplamento que não existia; foi intencional?
- **fan-in subindo** num arquivo já central — o raio de impacto de mudanças cresceu
- **arquivo cruzando 800 linhas** — entrou na lista de god-classes
- **mudança em `JNI_BRIDGE.md`** — a fronteira nativa mudou; confirme que foi de propósito
- **TODO novo** — dívida acabou de ser registrada

## Depois

```bash
node tools/codemap/codemap.mjs --check    # deve sair 0
```

Os mapas são versionados de propósito (ver `docs/adr/0001-versionar-doc-de-agentes.md`),
então o diff deles entra no commit junto com a mudança de código que os causou.
