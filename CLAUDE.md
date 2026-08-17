@AGENTS.md

## Específico do Claude Code

O conteúdo canônico está em `AGENTS.md`, importado acima — mantenha as instruções lá para
que outras ferramentas também as leiam. Aqui fica só o que é exclusivo deste harness.

- **Use plan mode** antes de alterar qualquer coisa sob `app/src/main/jni/**` ou as flags de
  janela em `Game.java`. Os dois quebram em runtime, não em compilação.
- **Guardrails que precisam sobreviver a `/compact`**: não editar o submódulo
  `moonlight-common-c/`, não fazer push sem o usuário pedir, não declarar build ou teste
  como passando sem tê-los executado.
- `.claude/rules/` carrega automaticamente por caminho tocado — você não precisa abri-las.
- Os hooks já rodam `jni-check` após edições na fronteira e o gate completo ao encerrar.
  Se um hook reclamar, o achado é real: conserte em vez de contornar.
