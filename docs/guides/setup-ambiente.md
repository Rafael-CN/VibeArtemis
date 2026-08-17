# Guia — Preparar o ambiente de build

> Estado verificado em 2026-08-16 na máquina do dono do fork: **nem JDK nem Android SDK
> estavam instalados**. Sem eles nada compila e nenhum teste roda, então nenhum agente
> consegue provar que uma mudança funciona. Resolver isto é pré-requisito de qualquer
> trabalho de código.

## O que o projeto exige

Extraído de `app/build.gradle` e `gradle/wrapper/gradle-wrapper.properties`:

| Componente | Versão exigida | Onde está declarado |
|---|---|---|
| Gradle | 8.13 | `gradle/wrapper/gradle-wrapper.properties` |
| Android Gradle Plugin | 8.13.0 | `build.gradle` (raiz) |
| JDK | 17 (o código-fonte tem nível 11) | `appveyor.yml`; `compileOptions` usa `VERSION_11` |
| `compileSdk` | 36 | `app/build.gradle` |
| `targetSdk` | 34 | `app/build.gradle` |
| `minSdk` | 21 | `app/build.gradle` |
| NDK | 27.0.12077973 | `app/build.gradle` (`ndkVersion`) |

O `minSdk 21` é uma restrição de projeto que aparece com frequência: APIs modernas de
janela e de IME exigem checagem de versão ou o equivalente em `androidx`.

## Instalação

O caminho mais curto é o Android Studio, que traz SDK, NDK e um JDK embutido.

```bash
winget install -e --id Google.AndroidStudio
```

Se preferir só a linha de comando (suficiente para build e testes unitários):

```bash
winget install -e --id Microsoft.OpenJDK.17 --id Google.AndroidSDK.CommandlineTools
```

Depois, aceite as licenças e instale as plataformas:

```bash
sdkmanager --install "platforms;android-36" "build-tools;36.0.0" "ndk;27.0.12077973"
```

## Configuração do repositório

O projeto precisa de um `local.properties` (que é — corretamente — ignorado pelo git):

```bash
printf 'sdk.dir=%s\nndk.dir=%s\n' "$LOCALAPPDATA/Android/Sdk" "$LOCALAPPDATA/Android/Sdk/ndk/27.0.12077973" > local.properties
```

Os submódulos já devem estar inicializados. Se não estiverem:

```bash
git submodule update --init --recursive
```

## Verificar que funcionou

```bash
./gradlew assembleNonRoot_gameDebug
```

Os *build variants* vêm do `flavorDimensions "root"`:

- `nonRoot_game` — o normal, `applicationId com.limelight`
- `root` — versão para dispositivos rooteados, limitada a `maxSdk 25`

Combinados com `debug` (sufixo `.noirdebug`, rotulado "Diana") e `release`
(sufixo `.noir`, rotulado "Artemis").

## Rodar os testes

```bash
./gradlew test
```

A tarefa `test` na raiz é agregadora: o `build.gradle` raiz coleta toda tarefa terminada em
`UnitTest` de todos os subprojetos. Os testes usam Robolectric 4.16 (JVM, sem emulador),
JUnit 4.13.2 e Mockito 5.19.0.

A suíte atual tem 15 arquivos e é **rasa** — cobre inicialização, inflação de layout,
perfis e um único teste de input (`StreamViewCommitTextTest`). Não há cobertura de rede,
decodificação de vídeo, nem da tradução de teclado. Tratar "os testes passam" como prova de
correção é enganoso neste repositório; ver `docs/reference/testes.md`.

## Nota sobre a camada nativa

`app/src/main/jni/` compila via `ndkBuild` (`Android.mk`), não CMake. O submódulo
`moonlight-common-c` traz o protocolo. As dependências pesadas — OpenSSL e libopus — vêm
**pré-compiladas** como `.a` por ABI, então não são recompiladas localmente.

O build gera 4 ABIs (`x86`, `x86_64`, `armeabi-v7a`, `arm64-v8a`) via `splits`. Para iterar
rápido, restrinja a uma só:

```bash
./gradlew assembleNonRoot_gameDebug -Pandroid.injected.build.abi=arm64-v8a
```
