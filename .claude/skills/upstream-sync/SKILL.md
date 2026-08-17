---
name: upstream-sync
description: Sincroniza o fork com os repositórios de origem e avalia o risco antes de qualquer merge — busca os remotes, lista o que mudou no Artemis, no Moonlight original e no Moonlight V+, e classifica cada arquivo conflitante como nosso ou herdado. Use quando o usuário pedir "sincroniza com o upstream", "tem novidade lá em cima?", "traz as mudanças do Artemis", "o V+ tem alguma feature nova?", ou antes de começar trabalho grande.
allowed-tools: Bash, Read, Grep
---

# Sincronizar com o upstream

## Topologia

```
origin     Rafael-CN/moonlight-android          nosso fork
upstream   ClassicOldSong/moonlight-android     Artemis (branch moonlight-noir) — nossa base
moonlight  moonlight-stream/moonlight-android   Moonlight original
vplus      qiin2333/moonlight-vplus             Moonlight V+ — fonte de ideias, não de merge
```

Linhagem: `moonlight-stream` → `ClassicOldSong` (Artemis) → nós.
O **V+ derivou do Moonlight original, não do Artemis.** Nada dali é cherry-pick limpo;
todo port exige adaptação. Diga isso sempre que sugerir trazer algo de lá.

## Levantamento

```bash
git fetch upstream moonlight vplus
git log --oneline HEAD..upstream/moonlight-noir          # o que o Artemis avançou
git log --oneline upstream/moonlight-noir..HEAD          # o que é nosso
git diff --stat HEAD...upstream/moonlight-noir
git submodule status
```

Estado conhecido em 2026-08-16: o Artemis está **em hibernação desde 2025-10-18**, e os
últimos commits eram só traduções. Isso é bom para nós (pouco conflito), mas significa que
**não espere correções vindas de lá**.

## Antes de fazer merge

Para cada arquivo em conflito, use o subagente `upstream-diff-scout` e classifique:

- **região intocada desde o Moonlight original** → maior risco futuro; é onde o upstream
  ainda mexe
- **região já divergente** → barato; já divergimos mesmo
- **região nossa** → decida se a mudança deles substitui ou complementa

## Depois do merge

```bash
git submodule update --init --recursive
node tools/codemap/codemap.mjs
node tools/validate.mjs
```

O submódulo é o detalhe esquecido com mais frequência: um merge pode mover o ponteiro do
`moonlight-common-c` e o build passa a divergir sem aviso.

## Nunca

Fazer push sem o usuário pedir. Resolver conflito no submódulo editando arquivos dentro
dele — o certo é escolher o commit correto do ponteiro.
