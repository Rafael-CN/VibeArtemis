---
paths:
  - "app/src/main/jni/**"
  - "**/nvstream/jni/*.java"
---

# Fronteira JNI — o compilador não vai te salvar aqui

Um erro nesta fronteira **compila nos dois lados** e falha em runtime, geralmente no meio
de um stream, com mensagem que não aponta para a causa.

Rode isto antes e depois de qualquer mudança:

```bash
node tools/codemap/jni-check.mjs
```

Ele verifica simetria de símbolos e todos os descritores de callback C→Java. Leva dois
segundos e pega a classe inteira de erro de assinatura.

## Geografia

| Arquivo | Papel |
|---|---|
| `nvstream/jni/MoonBridge.java` | declara os 34 métodos `native` e os 21 callbacks `bridge*` |
| `moonlight-core/simplejni.c` | implementa os `Java_*` — chamadas Java → C |
| `moonlight-core/callbacks.c` | chama Java de volta via `GetStaticMethodID` — C → Java |
| `moonlight-common-c/` | submódulo, não edite (ver `vendored.md`) |

A direção **C → Java** é a perigosa. Os descritores em `callbacks.c` são strings literais
(`"(IIII)I"`). Nada verifica que batem com o método Java — exceto o `jni-check.mjs`.

## Regras

- **R1** referência local nunca sobrevive ao retorno da função. Guardar em estático é
  ponteiro solto.
- **R2** compare referências com `IsSameObject`, nunca `==`.
- **R3** laço que cria referências locais precisa de `DeleteLocalRef`. A tabela estoura em
  torno de 512.
- **M1** todo `Get*ArrayElements` precisa de `Release*` em **todos** os caminhos, inclusive
  retorno antecipado e erro.
- **M3** todo `GetStringUTFChars` precisa de `ReleaseStringUTFChars`.
- **E1** depois de `Call*Method`, faça `ExceptionCheck` antes da próxima chamada JNI. Com
  exceção pendente, o comportamento é indefinido.
- **T1** thread nativa precisa de `AttachCurrentThread`. `JNIEnv*` é por-thread; só o
  `JavaVM*` é global.

## Ao adicionar um método native

1. Declare em `MoonBridge.java`.
2. Implemente `Java_com_limelight_nvstream_jni_MoonBridge_<nome>` em `simplejni.c`.
   Underscore no nome Java vira `_1` no símbolo C.
3. Rode `node tools/codemap/jni-check.mjs`.
4. Rode `node tools/codemap/codemap.mjs` para regerar `docs/maps/JNI_BRIDGE.md`.
5. Peça revisão ao subagente `jni-bridge-auditor`.

Os testes Robolectric **não** exercitam nada disso: `ShadowMoonBridge` anula o carregamento
da biblioteca nativa. Suíte verde não é evidência sobre a fronteira.
