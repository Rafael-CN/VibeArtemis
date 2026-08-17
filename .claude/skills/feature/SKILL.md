---
name: feature
description: Inicia uma feature nova no Artemis pelo fluxo spec-driven — escreve a especificação com requisitos verificáveis, o plano técnico ancorado em arquivo e linha, e a lista de tarefas com critério de aceite, antes de escrever código. Use quando o usuário pedir uma feature nova, uma mudança de comportamento com mais de um arquivo envolvido, ou disser "quero implementar", "vamos fazer", "nova feature", "preciso que o app faça X".
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

# Feature nova — especificar antes de implementar

Cria `docs/specs/NNN-slug/` com três arquivos. O objetivo não é burocracia: é que a próxima
sessão (ou o próximo agente) entenda **por que** o código ficou como ficou.

## 1. `spec.md` — o quê e por quê

Requisitos em forma verificável, um por linha, com identificador:

```markdown
## Requisitos

- **REQ-001** QUANDO o teclado virtual abrir, O SISTEMA DEVE reduzir a área do stream
  para a altura visível restante, mantendo a razão de aspecto.
- **REQ-002** QUANDO o teclado fechar, O SISTEMA DEVE restaurar a área original.
- **REQ-003** O SISTEMA DEVE preservar o modo imersivo enquanto o teclado estiver aberto.

## Fora de escopo
- Teclado físico via USB/Bluetooth (já funciona).

## Como verificar
| Requisito | Verificação |
|---|---|
| REQ-001 | dispositivo real, abrir teclado, medir área do SurfaceView |
```

Regra de corte: **zero itens `[A DEFINIR]`** antes de passar para o plano. Se algo depende
de decisão do usuário, pergunte agora — não no meio da implementação.

Para feature que toque a fronteira JNI, exija requisito explícito sobre: buffer nulo,
tamanho zero, exceção pendente e chamada a partir de thread não-Java.

## 2. `plan.md` — como

Ancore em `arquivo:linha` real. Use os mapas para achar:

```bash
node tools/codemap/query.mjs --symbol <X>
node tools/codemap/query.mjs --callers <Arquivo>
```

Inclua obrigatoriamente:
- os arquivos que serão tocados e por quê
- o raio de impacto (quem depende deles)
- riscos conhecidos e o que os mitiga
- compatibilidade: `minSdk 21`, flavors `root`/`nonRoot_game`, e **se exige host Apollo**
  (o dono do fork usa Vibeshine — feature que exija Apollo nasce inativa para ele)

## 3. `tasks.md` — passos

Cada tarefa com critério de aceite objetivo e o requisito que satisfaz. Tarefa sem critério
verificável é tarefa que ninguém sabe se terminou.

## Só então implemente

Ao final, `node tools/validate.mjs`, e revisão pelo subagente `diff-adversary`.

Se durante a implementação a spec se revelar errada, **corrija a spec** — não deixe o
código e o documento divergirem em silêncio.
