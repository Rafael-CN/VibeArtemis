# ADR 0002 — Base do fork e topologia de remotes

- **Status:** aceito
- **Data:** 2026-08-16
- **Decisor:** Rafael (dono do fork)

## Contexto

O ponto de partida da investigação foi `MobinYengejehi/Artemis`. A inspeção via API do
GitHub mostrou que esse repositório é um fork **puro e congelado**: `0 commits à frente,
333 commits atrás` do upstream, último push em 2025-02-11. Ele não contém nenhuma alteração
própria — é apenas um snapshot desatualizado.

O Artemis real é `ClassicOldSong/moonlight-android` (3.9 mil estrelas), na branch
`moonlight-noir`. Ele por sua vez é fork de `moonlight-stream/moonlight-android`.

Levantamento do ecossistema em 2026-08-16:

| Repositório | Papel | Último push | Situação |
|---|---|---|---|
| `ClassicOldSong/moonlight-android` | **Artemis** — nossa base | 2025-10-18 | Hibernando (~10 meses) |
| `moonlight-stream/moonlight-android` | Moonlight original | 2026-08-11 | Ativo |
| `qiin2333/moonlight-vplus` | Moonlight V+ (fork chinês) | 2026-08-16 | Muito ativo |
| `ClassicOldSong/Apollo` | Host pareado ao Artemis | 2026-05-21 | Ativo |
| `Nonary/vibeshine` | Host em uso pelo dono do fork | 2026-08-14 | Ativo |

## Decisão

Forkar `ClassicOldSong/moonlight-android` (não o snapshot), e configurar remotes de leitura
para as outras linhagens:

```
origin     https://github.com/Rafael-CN/moonlight-android.git   (nosso fork, onde publicamos)
upstream   https://github.com/ClassicOldSong/moonlight-android  (Artemis — base)
moonlight  https://github.com/moonlight-stream/moonlight-android (Moonlight original)
vplus      https://github.com/qiin2333/moonlight-vplus          (V+, fonte de cherry-picks)
```

Branch de trabalho: `dev`, criada a partir de `moonlight-noir`.

## Consequências

- A hibernação do upstream é, na prática, **favorável**: divergir dele custa pouco porque
  ele quase não avança. O risco de conflito de merge é baixo.
- Ter `moonlight` e `vplus` como remotes permite `git log`/`cherry-pick` entre linhagens
  sem clonar repositórios adicionais. O V+ derivou do Moonlight original, não do Artemis,
  então qualquer port dali exige adaptação — não é cherry-pick limpo.
- O fork publicado herdou o nome `moonlight-android`. Renomear para `Artemis` no GitHub é
  possível a qualquer momento (o GitHub mantém redirecionamento), mas não foi feito para
  não quebrar links já emitidos.

## Nota sobre o host

O dono do fork usa **Vibeshine** (fork do Sunshine), não Apollo. Várias features do Artemis
dependem explicitamente do Apollo — virtual display, server commands, clipboard sync. Ao
planejar qualquer trabalho, verificar em `docs/reference/host-compatibility.md` se a feature
tocada exige Apollo, porque no setup atual ela estará inativa.
