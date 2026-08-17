---
name: jni-change
description: Guia o fluxo completo de adicionar ou alterar um método native na fronteira Java/C do Artemis, com verificação em cada passo. Use quando o usuário pedir para adicionar um método nativo, expor uma função do moonlight-common-c ao Java, mudar assinatura de método na MoonBridge, ou disser "preciso chamar X do lado nativo", "adiciona um native", "expõe essa função pro Java".
allowed-tools: Bash, Read, Edit, Grep
---

# Alterar a fronteira JNI

Um erro aqui **compila nos dois lados** e falha em runtime. Siga os passos na ordem; cada
um tem verificação.

## Antes

```bash
node tools/codemap/query.mjs --jni <nome-aproximado>   # os dois lados do que já existe
node tools/codemap/jni-check.mjs                        # baseline limpo
```

Se a baseline já estiver suja, conserte antes — senão você não saberá o que quebrou.

## Passos

**1. Declare em Java** — `app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`

```java
public static native void sendAlgo(int valor);
```

**2. Implemente em C** — `app/src/main/jni/moonlight-core/simplejni.c`

```c
JNIEXPORT void JNICALL
Java_com_limelight_nvstream_jni_MoonBridge_sendAlgo(JNIEnv *env, jclass clazz, jint valor) {
    LiSendAlgo(valor);
}
```

Mangling: underscore no nome Java vira `_1` no símbolo C. `sendUtf8Text` não tem
underscore, então vira `..._sendUtf8Text` direto.

**3. Verifique a simetria**

```bash
node tools/codemap/jni-check.mjs
```

**4. Se o método vier de `moonlight-common-c`**, confirme que a função existe em
`Limelight.h` e que o submódulo está no commit certo. **Não edite o submódulo.**

**5. Regenere os mapas**

```bash
node tools/codemap/codemap.mjs
```

**6. Rode o gate**

```bash
node tools/validate.mjs
```

**7. Peça auditoria** ao subagente `jni-bridge-auditor` — ele verifica o que o
`jni-check.mjs` não pega: ciclo de vida de referências, `ExceptionCheck` após chamadas,
pareamento de `Get`/`Release` em caminhos de erro, e threading.

## Se for um callback C → Java

O caso mais perigoso. Em `callbacks.c` o descritor é uma **string literal**:

```c
BridgeAlgoMethod = (*env)->GetStaticMethodID(env, clazz, "bridgeAlgo", "(IIII)I");
```

Nada além do `jni-check.mjs` verifica que `"(IIII)I"` corresponde ao método Java real.
Descritores: `V` void · `Z` boolean · `B` byte · `C` char · `S` short · `I` int · `J` long ·
`F` float · `D` double · `[` array · `Ljava/lang/String;` String.

## Lembre-se

Os testes Robolectric **não** exercitam nada disto — `ShadowMoonBridge` impede o
carregamento da lib nativa. Suíte verde não é evidência aqui.
