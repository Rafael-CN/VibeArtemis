---
name: validate
description: Roda o gate de qualidade completo do Artemis — build, testes unitários, integridade da fronteira JNI e atualização dos mapas de código — e reporta o resultado com evidência. Use quando o usuário pedir "valida", "ta pronto?", "roda o gate", "pode commitar?", ou antes de declarar qualquer tarefa de código concluída.
allowed-tools: Bash, Read
---

# Gate de validação

```bash
node tools/validate.mjs
```

Os estágios rodam em ordem e param no primeiro erro:

1. `codemap --check` — os mapas em `docs/maps/` refletem o código atual
2. `jni-check` — simetria de símbolos e descritores da fronteira JNI
3. `assembleNonRoot_gameDebug` — compila
4. `testNonRoot_gameDebugUnitTest` — testes unitários

O resultado detalhado fica em `.claude/.cache/validate.json`, com as falhas já filtradas
por arquivo — use isso para corrigir sem reler o log inteiro do Gradle.

## Ao reportar

Diga o que **de fato** rodou. Se o Android SDK não estiver presente, os estágios 3 e 4 são
pulados e o script avisa; nesse caso o resultado é **parcial** e você precisa dizer isso.
Reportar "tudo passou" quando build e testes não rodaram é o erro mais caro possível aqui.

Inclua também a ressalva permanente da suíte: `ShadowMoonBridge` impede o carregamento da
biblioteca nativa, então **nenhuma linha de C executa nos testes**. Verde não é evidência
sobre a fronteira JNI — para isso vale o `jni-check` e o subagente `jni-bridge-auditor`.

## Se falhar

Conserte a causa. É proibido ficar verde por `@Ignore`, enfraquecendo assert, suprimindo
lint ou apagando teste. Se um teste falha, ou o código está errado ou o teste está errado —
decida qual e explique.
