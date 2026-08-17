---
paths:
  - "app/src/test/**"
---

# Testes — o que a suíte prova e o que ela não prova

Robolectric 4.16 na JVM (sem emulador), JUnit 4.13.2, Mockito 5.19.0.
Configuração em `robolectric.properties` e `testOptions.unitTests.includeAndroidResources`.

```bash
./gradlew :app:testNonRoot_gameDebugUnitTest --console=plain
```

A tarefa `test` na raiz é agregadora: o `build.gradle` raiz coleta toda tarefa terminada em
`UnitTest` de todos os subprojetos.

## O que a suíte NÃO prova

`ShadowMoonBridge` sobrescreve o inicializador estático de `MoonBridge` para que
`System.loadLibrary` nunca rode. **Nenhuma linha de C executa nos testes.** Suíte verde não
diz nada sobre a fronteira JNI, sobre o protocolo ou sobre decodificação.

Também **não existe** `app/src/androidTest/` — o `connectedCheck` do `appveyor.yml` é no-op.

Cobertura real: inicialização, inflação de layout, perfis e um teste de `commitText`.
Sem cobertura de rede, vídeo, áudio ou tradução de teclado.

Portanto: ao reportar resultado de teste, **declare a ressalva**. "Os testes passaram"
sozinho induz o leitor a uma garantia que não existe.

## Regras

- Proibido para ficar verde: `@Ignore`, enfraquecer assert, suprimir lint, apagar teste.
  Se um teste falha, ou o código está errado, ou o teste está errado — decida qual e diga.
- Teste novo que toque `MoonBridge` precisa do shadow. Se o shadow não cobrir o caminho,
  estenda-o em vez de chamar JNI real.
- Prefira testar a lógica pura. `Game.java` tem 4.349 linhas e é hostil a teste; extrair a
  lógica para uma classe testável é uma melhoria legítima, não desvio de escopo.

## Onde vale investir cobertura

Áreas de alto risco e custo baixo de teste, em ordem:

1. `KeyboardTranslator` e `KeyMapper` — tabelas puras, testáveis sem Android, e centrais
   para a dor aberta do fork.
2. `PreferenceConfiguration` — fan-in 33; um default errado se propaga por toda parte.
3. Parsing de XML do `NvHTTP` — entrada externa, hoje sem cobertura nenhuma.
