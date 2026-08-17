# Build, CI, Testes e Qualidade (Gradle/AGP/NDK, suíte Robolectric, distribuição e pipeline)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (24)
6. [Ideias de melhoria](#ideias-de-melhoria) (11)
7. [Glossário](#glossário)

## Como funciona

O Artemis é um projeto Gradle de módulo único (`settings.gradle:1` inclui só `:app`) construído com AGP 8.13.0 (`build.gradle:8`) sobre Gradle 8.13 (`gradle/wrapper/gradle-wrapper.properties:3`), compilando Java 11 (`app/build.gradle:67-68`) com JDK 17 de runtime. O `compileSdk` é 36, o `targetSdk` é 34 e o `minSdk` é 21 (`app/build.gradle:6,11-12`) — a defasagem entre compileSdk e targetSdk é a decisão de build mais consequente do repositório, porque mantém o app fora do enforcement edge-to-edge do Android 15 e simultaneamente o torna impublicável na Play Store. Há uma única dimensão de flavor (`root`) com dois flavors, `root` (limitado a `maxSdk 25`, applicationId `com.limelight.root`) e `nonRoot_game` (applicationId `com.limelight`), cruzados com `debug` (sufixo `.noirdebug`, rótulo "Diana") e `release` (sufixo `.noir`, rótulo "Artemis") — 4 variantes, multiplicadas por `splits.abi` de 4 ABIs (`app/build.gradle:153-159`), resultando em 16 APKs por build completo. A camada nativa usa ndkBuild com NDK r27 (`app/build.gradle:4`, `app/src/main/jni/Android.mk`), com o protocolo vindo do submódulo `moonlight-common-c` (fixado em c999436) e OpenSSL/libopus entrando como `.a` pré-compilados e commitados no repo (22 MB + 9,8 MB). Não existe `signingConfigs` em lugar nenhum: `assembleRelease` produz APK não assinado. Não existe CI. O `.github/` tem apenas CONTRIBUTING e templates de issue; o único arquivo de CI é o `appveyor.yml` herdado do upstream, e ele está quebrado em três pontos independentes (nome de artefato de lint, propagação de variáveis de ambiente e `connectedCheck` sem source set `androidTest`). Nem o upstream ClassicOldSong nem o moonlight-stream têm GitHub Actions; o único fork da árvore com CI funcional é o Moonlight V+ (`vplus/master:.github/workflows/android-ci.yml`), que é o modelo mais próximo e reaproveitável. Localmente já existe um gate próprio do fork em `tools/validate.mjs` (120 linhas, 4 estágios: codemap --check, jni-check, assembleNonRoot_gameDebug, testNonRoot_gameDebugUnitTest, com `--fast` pulando o que exige SDK) — bem construído, mas não cobre lint e não substitui CI, porque a máquina do dono não tem JDK nem Android SDK instalados (verificado: `java`, `javac`, `ANDROID_HOME` e `JAVA_HOME` ausentes), de modo que os dois estágios que importam são sempre pulados. A suíte de testes tem 15 arquivos, 51 métodos `@Test` e 1.470 linhas contra 43.281 linhas de produção em 152 arquivos — 63% dos testes (32 de 51) são variações de "a activity não crasha", escritos como `try { ... } catch (Exception e) { fail(...) }`, que detecta exceção mas nunca comportamento errado. Não há JaCoCo, então cobertura nunca foi medida. Todos os testes fixam `@Config(sdk = {33})`: nenhum roda em API 21 (o mínimo suportado), 30 (onde `WindowInsets.Type.ime()` surge) ou 35 (edge-to-edge) — exatamente a matriz que o EPIC do teclado precisa exercitar. O ponto mais grave para o dono do fork: o único teste que cobre o envio de texto inteiro, `StreamViewCommitTextTest`, instancia `StreamView`, classe que não é referenciada por nenhum layout nem instanciada por nenhum código de produção; a produção usa `StreamContainer` (`activity_game.xml:14`, `Game.java:464`) e `ExternalControllerView`. O teste passa verde sobre código morto, e existem três implementações quase idênticas do mesmo `onCreateInputConnection`, das quais duas estão vivas e nenhuma é testada.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/build.gradle`](../../app/build.gradle) | 191 | Configuração central do módulo Android: SDKs, flavors, buildTypes, ProGuard, splits de ABI, ndkBuild e todas as dependências. Contém as decisões que geram a maior parte dos achados desta dimensão (targetSdk 34 vs compileSdk 36, minify no debug, ausência de signingConfig). |
| [`build.gradle`](../../build.gradle) | 47 | Build script raiz. Declara AGP, os repositórios (incluindo JitPack sem filtro de conteúdo) e uma tarefa agregadora `test` que dispara os testes unitários de todos os variants — motivo pelo qual `./gradlew test` roda a suíte Robolectric 4 vezes. |
| [`appveyor.yml`](../../appveyor.yml) | 19 | Único arquivo de CI do repositório, herdado do upstream Moonlight e nunca adaptado ao fork. Está quebrado em três pontos independentes e não roda nada de útil hoje. |
| [`tools/validate.mjs`](../../tools/validate.mjs) | 120 | Gate de validação próprio do fork, já prescrito pelo AGENTS.md como a definição de pronto. Encadeia 4 estágios e suporta --fast para pular os que exigem Android SDK. Bem construído; a lacuna é não incluir lint e, sem SDK na máquina, degradar para validação parcial. |
| [`app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java`](../../app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java) | 61 | Único teste que cobre o envio de texto inteiro (feature nº2 do dono do fork). Testa `StreamView`, que é código morto — a produção usa `StreamContainer`. Fornece falsa confiança exatamente na feature prioritária. |
| [`app/src/main/java/com/limelight/ui/StreamContainer.java`](../../app/src/main/java/com/limelight/ui/StreamContainer.java) | 273 | Container real do stream (referenciado em activity_game.xml:14 e configurado em Game.java:464). Implementa a interceptação de commitText que a produção efetivamente usa — e que não tem nenhum teste. |
| [`app/src/main/java/com/limelight/ui/StreamView.java`](../../app/src/main/java/com/limelight/ui/StreamView.java) | 167 | CÓDIGO MORTO. Não aparece em nenhum layout XML nem é instanciado em nenhum ponto de app/src/main/java ou dos source sets de flavor. Só sobrevive porque o teste o instancia diretamente. |
| [`robolectric.properties`](../../robolectric.properties) | 1 | Configuração de shadows do Robolectric — colocada na RAIZ do repositório, fora do classpath de teste. Robolectric só lê esse arquivo do classpath (app/src/test/resources/), portanto o shadow declarado nunca é aplicado. |
| [`app/src/test/java/com/limelight/StartupCrashTest.java`](../../app/src/test/java/com/limelight/StartupCrashTest.java) | 288 | Maior arquivo de teste (14 @Test). Exemplifica o padrão dominante da suíte: envolver tudo em try/catch e chamar fail() na exceção, sem asserção de comportamento. Testes como testMemoryLeakDuringStartup e testConcurrentStartup não podem falhar por motivos reais. |
| [`app/src/test/java/com/limelight/shadows/ShadowMoonBridge.java`](../../app/src/test/java/com/limelight/shadows/ShadowMoonBridge.java) | 38 | Shadow que neutraliza o System.loadLibrary("moonbr") do MoonBridge. É a peça que permite rodar testes JVM sem NDK. Duplica constantes de áudio à mão — divergem silenciosamente se o MoonBridge real mudar. |
| [`app/src/main/jni/moonlight-core/openssl/include/openssl/opensslv.h`](../../app/src/main/jni/moonlight-core/openssl/include/openssl/opensslv.h) | 101 | Revela a versão da OpenSSL estaticamente linkada nos .a commitados: 1.1.1q, de 05/07/2022, linha EOL desde 11/09/2023. É a base criptográfica do pareamento com o host. |
| [`app/src/main/jni/moonlight-core/Android.mk`](../../app/src/main/jni/moonlight-core/Android.mk) | 64 | Makefile ndkBuild do core nativo. Lista manualmente os .c do submódulo moonlight-common-c, enet e reedsolomon, e linka as libs estáticas pré-compiladas. Arquivo novo no submódulo precisa ser adicionado aqui à mão — não há glob. |
| [`app/src/main/jni/Application.mk`](../../app/src/main/jni/Application.mk) | 8 | Define a plataforma mínima nativa (android-21, consistente com o minSdk) e habilita suporte a páginas de 16 KB, requisito de compatibilidade para Android 15+ em dispositivos ARM64. |
| [`app/proguard-rules.pro`](../../app/proguard-rules.pro) | 48 | Regras de R8. Usa -dontobfuscate (só encolhe, não ofusca) e mantém explicitamente as classes JNI, de reflexão e de Gson. Regras faltantes aqui viram crash só em release. |
| [`android_test_setup.md`](../../android_test_setup.md) | 271 | Guia de escrita de testes Robolectric. Conteúdo conceitualmente correto (shadows, reset de singleton por reflexão, buildActivity), mas com versões e SDK desatualizados em relação ao build.gradle atual. |
| [`app/src/game/AndroidManifest.xml`](../../app/src/game/AndroidManifest.xml) | 11 | Source set órfão: não existe flavor nem buildType chamado `game`. Nunca é mesclado em build nenhum. Consome o único uso de @string/app_label_game. |
| [`docs/guides/setup-ambiente.md`](../../docs/guides/setup-ambiente.md) | 99 | Guia de preparação de ambiente já escrito para este fork; documenta corretamente que a máquina não tem JDK nem Android SDK. É o ponto de partida certo para o setup do CI, mas aponta para docs/reference/testes.md, que não existe. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/build.gradle`**
- `ndkVersion "27.0.12077973" :4`
- `compileSdk = 36 :6`
- `minSdk 21 :11`
- `targetSdk 34 :12`
- `versionName "20.2.6" / versionCode = 57 :14-15`
- `ndk.debugSymbolLevel = 'FULL' :18`
- `flavorDimensions.add("root") :21`
- `productFlavors { root } :28-46`
- `productFlavors { nonRoot_game } :48-62`
- `compileOptions VERSION_11 :65-69`
- `lint { disable 'MissingTranslation' } :71-74`
- `bundle { language/density enableSplit=false } :76-88`
- `buildTypes.debug minifyEnabled true :96-105`
- `buildTypes.release applicationIdSuffix ".noir" :106-144`
- `externalNativeBuild ndkBuild :147-151`
- `splits.abi :153-159`
- `testOptions.unitTests.includeAndroidResources :161-163`
- `dependencies :166-191`
- `testImplementation junit/androidx.test/robolectric/mockito :187-190`

**`build.gradle`**
- `classpath 'com.android.tools.build:gradle:8.13.0' :8`
- `repositories mavenCentral() antes de google() :4-5, :13-14`
- `maven { url = uri("https://jitpack.io") } :16`
- `gradle.projectsEvaluated { agg test task } :21-32`
- `p.tasks.matching { it.name.endsWith('UnitTest') } :28`
- `outputs.upToDateWhen { false } :37`
- `testLogging events/exceptionFormat/showStandardStreams :40-44`

**`appveyor.yml`**
- `git submodule update --init --recursive :8`
- `set ANDROID_HOME (não persiste entre steps) :9-10`
- `set JAVA_HOME=jdk17 :11`
- `build_script: gradlew.bat build connectedCheck :14`
- `PushArtifact lint-results-nonRootDebug.html (flavor errado) :17`

**`tools/validate.mjs`**
- `FAST flag :22`
- `gradlew resolver win/unix :24`
- `stage codemap --check :34-36`
- `stage jni-check :40-42`
- `stage build assembleNonRoot_gameDebug :46-48`
- `stage test testNonRoot_gameDebugUnitTest :52-54`
- `skip por needsSdk :63`
- `aviso de estágios não executados :105-107`

**`app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java`**
- `@Config(sdk = {33}) :20`
- `new StreamView(ctx) :31`
- `view.setCommitTextEnabled(true) :34`
- `ic.commitText("hello", 1) :40`
- `verify(cb, times(1)).handleCommitText("hello") :42`
- `commitText_notForwarded_whenDisabled() :46`

**`app/src/main/java/com/limelight/ui/StreamContainer.java`**
- `class StreamContainer extends FrameLayout :25`
- `interface InputCallbacks :28-31`
- `setInputCallbacks() :152`
- `setCommitTextEnabled(boolean) :156`
- `onKeyPreIme() :161`
- `onCheckIsTextEditor() :181`
- `onCreateInputConnection() :186-202`
- `commitText() override :194-196`

**`app/src/main/java/com/limelight/ui/StreamView.java`**
- `class StreamView extends SurfaceView :15`
- `setCommitTextEnabled() :36`
- `onCheckIsTextEditor() :126`
- `onCreateInputConnection() :130-157`
- `interface InputCallbacks :159-166`

**`robolectric.properties`**
- `shadows=com.limelight.shadows.ShadowBackdropFrameRenderer :1`

**`app/src/test/java/com/limelight/StartupCrashTest.java`**
- `@Config(sdk = {33}, shadows = {ShadowMoonBridge, ShadowGameManager}) :26`
- `testNativeLibraryLoadingFailure() :54`
- `testPreferenceConfigurationCrash() :82`
- `testSharedPreferencesCorruption() :119`
- `testMissingRequiredIntentExtras() tautologia :147-148`
- `testConcurrentStartup() :193`
- `testMemoryLeakDuringStartup() :208`
- `testActivityLifecycleTransitions() :227`

**`app/src/test/java/com/limelight/shadows/ShadowMoonBridge.java`**
- `@Implements(MoonBridge.class, isInAndroidSdk=false) :6`
- `__staticInitializer__() no-op :10-13`
- `AUDIO_CONFIGURATION_STEREO/51/71 :26-28`
- `DR_OK :30`
- `cleanupBridge() :37`

**`app/src/main/jni/moonlight-core/openssl/include/openssl/opensslv.h`**
- `OPENSSL_VERSION_NUMBER 0x1010111fL :42`
- `OPENSSL_VERSION_TEXT "OpenSSL 1.1.1q  5 Jul 2022" :43`

**`app/src/main/jni/moonlight-core/Android.mk`**
- `LOCAL_MODULE := moonlight-core :10`
- `LOCAL_SRC_FILES lista manual de .c :12-41`
- `LOCAL_CFLAGS -DHAS_SOCKLEN_T=1 -DLC_ANDROID :47`
- `LOCAL_STATIC_LIBRARIES := libopus libssl libcrypto cpufeatures :51`
- `import-module android/cpufeatures :64`

**`app/src/main/jni/Application.mk`**
- `APP_PLATFORM := android-21 :4`
- `APP_SUPPORT_FLEXIBLE_PAGE_SIZES := true :7`

**`app/proguard-rules.pro`**
- `-dontobfuscate :2`
- `-keep com.limelight.binding.input.evdev.* :5`
- `-keep com.limelight.utils.KeyMapper :8`
- `-keep org.tensorflow.lite.gpu.** / org.opencv.** :16-17`
- `-keep com.limelight.nvstream.jni.* :24`

**`android_test_setup.md`**
- `versões stale: androidx.test 1.5.0 / robolectric 4.11.1 / mockito 5.11.0 :14-17`
- `afirma compileSdk 34 (é 36) :54`
- `boilerplate @Config(sdk={33}) + shadows :27-52`
- `tarefas por flavor :6-9`

**`app/src/game/AndroidManifest.xml`**
- `android:label="@string/app_label_game" :7`

**`docs/guides/setup-ambiente.md`**
- `tabela de versões exigidas :12-20`
- `sdkmanager --install :42`
- `gradlew assembleNonRoot_gameDebug :62`
- `referência quebrada docs/reference/testes.md :86`
- `dica -Pandroid.injected.build.abi :98`

</details>

## Fluxo

FLUXO DE BUILD (do `git clone` ao APK):

1. `settings.gradle:1` inclui apenas `:app`. Não há `pluginManagement` nem `dependencyResolutionManagement`; todos os repositórios são declarados no bloco `allprojects` da raiz (`build.gradle:12-18`) — padrão legado que o Gradle 9 desencoraja.

2. `build.gradle:2-10` resolve o AGP 8.13.0. A ordem dos repositórios é `mavenCentral()` e só depois `google()` (`build.gradle:4-5`), invertida em relação ao padrão; toda resolução de artefato Android faz round-trip desnecessário ao Central primeiro.

3. `build.gradle:13-17` adiciona `jitpack.io` sem bloco `content {}`. Três dependências vêm de lá (`app/build.gradle:172,180,181`).

4. O AGP configura 4 variantes a partir de `flavorDimensions.add("root")` (`app/build.gradle:21`): `rootDebug`, `rootRelease`, `nonRoot_gameDebug`, `nonRoot_gameRelease`. Cada flavor injeta `PRODUCT_FLAVOR` no ndkBuild (`app/build.gradle:34-36, 49-51`) e define `BuildConfig.ROOT_BUILD` (`:45, :61`).

5. `externalNativeBuild.ndkBuild` (`app/build.gradle:147-151`) dispara `app/src/main/jni/Android.mk`, que faz `include $(call all-subdir-makefiles)` e recursa em dois módulos: `evdev_reader/Android.mk` — que se auto-desabilita via `ifeq (root,$(PRODUCT_FLAVOR))`, ou seja, só o flavor `root` compila o binário evdev — e `moonlight-core/Android.mk`, que compila 20 `.c` do submódulo `moonlight-common-c` + enet + reedsolomon + a cola JNI local (`simplejni.c`, `callbacks.c`, `minisdl.c`) e linka contra `libopus libssl libcrypto cpufeatures` (`Android.mk:51`). OpenSSL e libopus NÃO são compilados: entram como `PREBUILT_STATIC_LIBRARY` a partir de `.a` versionados no repositório (`openssl/Android.mk`, 4 ABIs cada).

6. `Application.mk:4` fixa `APP_PLATFORM := android-21` e `:7` habilita `APP_SUPPORT_FLEXIBLE_PAGE_SIZES` (páginas de 16 KB, exigência do Android 15 em ARM64).

7. `splits.abi` (`app/build.gradle:153-159`) explode cada variante em 4 APKs (x86, x86_64, armeabi-v7a, arm64-v8a). `universalApk` não é habilitado, então não existe APK universal. O `versionCode` NÃO é offsetado por ABI — os 4 APKs saem com `versionCode = 57` (`app/build.gradle:15`).

8. Tanto `debug` quanto `release` têm `minifyEnabled true` (`app/build.gradle:103, 142`), rodando R8 com `proguard-android.txt` + `app/proguard-rules.pro`. Como `-dontobfuscate` está ativo (`proguard-rules.pro:2`), é encolhimento sem ofuscação.

9. `ndk.debugSymbolLevel = 'FULL'` (`app/build.gradle:18`) gera símbolos nativos completos em todas as variantes.

10. Nenhum `signingConfigs` é definido em nenhum lugar (grep por `signingConfig|keystore|storeFile` em `*.gradle` retorna zero). O produto de `assembleRelease` é `app-<abi>-<flavor>-release-unsigned.apk`.

FLUXO DE TESTE (`./gradlew test` e `tools/validate.mjs`):

11. A tarefa raiz `test` é sintética: `build.gradle:21-32` registra a tarefa em `gradle.projectsEvaluated` e faz `dependsOn` de toda tarefa cujo nome termine em `UnitTest` (`:28`). Com 4 variantes, `./gradlew test` executa `testRootDebugUnitTest`, `testRootReleaseUnitTest`, `testNonRoot_gameDebugUnitTest` e `testNonRoot_gameReleaseUnitTest` — a mesma suíte Robolectric roda 4 vezes. O `AGENTS.md` já prescreve corretamente a forma estreita (`:app:testNonRoot_gameDebugUnitTest`).

12. `build.gradle:37` desliga up-to-date (`outputs.upToDateWhen { false }`) em todo `Test` task, garantindo re-execução total sempre; combinado com `showStandardStreams = true` (`:43`), a saída é longa e sem cache.

13. `testOptions.unitTests.includeAndroidResources = true` (`app/build.gradle:162`) mescla `res/` no classpath de teste, o que é o que permite `LayoutInflationTest` inflar todos os layouts reais.

14. Cada classe de teste declara seus próprios shadows na anotação (`@Config(sdk = {33}, shadows = {ShadowMoonBridge, ShadowGameManager})` — ex. `StartupTest.java:24`, `ProfilesManagerTest.java:22`). `ShadowMoonBridge` anula o `__staticInitializer__` do `MoonBridge` (`ShadowMoonBridge.java:10-13`), evitando o `System.loadLibrary` que causaria `UnsatisfiedLinkError` na JVM; `ShadowGameManager` neutraliza a busca no ServiceManager (`ShadowGameManager.java:13-16`).

15. O gate do fork, `tools/validate.mjs`, encadeia quatro estágios em ordem: `codemap --check` (`:34-36`), `jni-check` (`:40-42`), `assembleNonRoot_gameDebug` (`:46-48`) e `testNonRoot_gameDebugUnitTest` (`:52-54`). Estágios marcados `needsSdk` são pulados quando `--fast` é passado ou quando o SDK não é detectado (`:63-65`), e o script avisa quais não rodaram (`:105-107`). Como a máquina do dono não tem JDK nem Android SDK, na prática só os dois primeiros estágios executam — a validação é sempre parcial, e nenhum estágio cobre `lint`.

16. RUPTURA: `ShadowBackdropFrameRenderer` (`app/src/test/java/com/limelight/shadows/ShadowBackdropFrameRenderer.java:6`) só é declarado em `robolectric.properties:1`, arquivo que está na RAIZ do repositório. O Robolectric carrega `robolectric.properties` do classpath de teste (`app/src/test/resources/`), que não existe neste projeto (`app/src/test` só contém `java/`). O shadow, portanto, nunca é registrado, e a proteção contra o crash de Choreographer descrita no seu comentário não existe em runtime de teste.

17. RUPTURA: `StreamViewCommitTextTest.java:31` instancia `new StreamView(ctx)` e verifica `handleCommitText`. Porém o caminho de produção é outro: `activity_game.xml:14` declara `com.limelight.ui.StreamContainer`; `Game.java:464` chama `streamContainer.setCommitTextEnabled(prefConfig.enableCommitText)`; `Game.java:141-142` implementa `StreamContainer.InputCallbacks` e `ExternalControllerView.InputCallbacks` — nunca `StreamView.InputCallbacks`. O IME real entra por `StreamContainer.onCreateInputConnection()` (`StreamContainer.java:186-202`) ou, em display externo, por `ExternalControllerView.onCreateInputConnection()` (`ExternalControllerView.java:59-85`, instanciado em `ExternalDisplayControlActivity.java:388`). Nenhum desses dois é testado.

FLUXO DE CI E DISTRIBUIÇÃO:

18. `appveyor.yml:8` inicializa submódulos, `:9-11` tenta configurar `ANDROID_HOME` e `JAVA_HOME` via `set` dentro de `before_build`. No AppVeyor cada comando roda em processo próprio, então essas variáveis não alcançam o `build_script`.

19. `appveyor.yml:14` roda `gradlew.bat build connectedCheck`. `connectedCheck` não tem o que executar: não existe source set `androidTest` (`app/src/` contém apenas `game`, `main`, `nonRoot_game`, `root`, `test`) nem dependência `androidTestImplementation` em `app/build.gradle:166-191`, nem emulador no runner.

20. `appveyor.yml:17` publica `app\build\reports\lint-results-nonRootDebug.html`. O flavor chama-se `nonRoot_game`, então o arquivo real é `lint-results-nonRoot_gameDebug.html`. O artefato nunca existe.

21. Distribuição: `app/build.gradle:57` embute uma URL do Obtainium com `apkFilterRegEx: "nonRoot"`, que casa com os 4 APKs de ABI simultaneamente. `fastlane/metadata/android/en-US/changelogs/` contém 69 arquivos numerados de 195 a 314 (versionCodes do Moonlight upstream), mas o `versionCode` deste fork é 57 — o arquivo `57.txt` não existe, então nenhum changelog é resolvido por Fastlane/F-Droid.

## Interfaces externas

- Gradle 8.13 (wrapper, gradle/wrapper/gradle-wrapper.properties:3) — Gradle 9.x já é a linha corrente
- Android Gradle Plugin 8.13.0 (build.gradle:8) — exige JDK 17 de runtime
- JDK 17 de execução com bytecode alvo Java 11 (app/build.gradle:65-69); sem coreLibraryDesugaring
- Android NDK r27 (27.0.12077973) via ndkBuild/Android.mk, não CMake (app/build.gradle:4,147-151)
- Node.js (v24 no ambiente) — exigência real de build/validação: tools/validate.mjs, tools/codemap/codemap.mjs, tools/codemap/jni-check.mjs e os hooks em .claude/hooks/
- Submódulo git moonlight-common-c de ClassicOldSong, fixado em c999436858471dfefa7617af3b7dc03ec1644ce4 (.gitmodules)
- OpenSSL 1.1.1q estático pré-compilado, 4 ABIs, commitado no repo (app/src/main/jni/moonlight-core/openssl/, 22 MB)
- libopus estático pré-compilado, 4 ABIs, commitado no repo (app/src/main/jni/moonlight-core/libopus/, 9,8 MB)
- android/cpufeatures do NDK, importado via $(call import-module) (moonlight-core/Android.mk:64)
- Maven Central + Google Maven + JitPack (build.gradle:13-17); JitPack sem filtro de conteúdo
- JUnit 4.13.2 + Robolectric 4.16 + Mockito 5.19.0 + androidx.test:core 1.7.0 (app/build.gradle:187-190)
- Robolectric Shadow API (@Implements/@Implementation) para MoonBridge, GameManager e BackdropFrameRenderer
- R8 via minifyEnabled em debug e release, com proguard-android.txt + app/proguard-rules.pro
- Android Lint com lint.xml próprio (app/lint.xml) e MissingTranslation desabilitado (app/build.gradle:72)
- AppVeyor (image Visual Studio 2022) — único CI declarado, quebrado
- Fastlane/F-Droid metadata em fastlane/metadata/android/{de,en-US} — changelogs indexados por versionCode
- Obtainium, via URL embutida em resValue obtainium_app_url (app/build.gradle:57) com apkFilterRegEx nonRoot
- Google Play Console (política de targetSdk mínimo; ndk.debugSymbolLevel FULL existe para simbolicar crashes nativos lá)
- Google AI Edge LiteRT 1.4.0 + litert-gpu 1.4.0 e OpenCV 4.12.0 — AARs pesados que dominam o tamanho do APK
- Wireshark Lua dissectors em LuaScripts/ (NALParser.lua, NVStreamVideoPacket.lua, gridctl.lua) — ferramenta de depuração de protocolo, fora do build
- GitHub Actions no fork Moonlight V+ (vplus/master:.github/workflows/android-ci.yml) — referência de pipeline já validada nesta árvore de código

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🔴 crítico | security | OpenSSL 1.1.1q estaticamente linkado, EOL desde setembro de 2023 | `app/src/main/jni/moonlight-core/openssl/include/openssl/opensslv.h:43` |
| 🔴 crítico | compatibility | targetSdk 34 com compileSdk 36 bloqueia publicação e distorce a base do EPIC do teclado | `app/build.gradle:12` |
| 🟠 alto | maintainability | O único teste do envio de texto inteiro cobre uma classe morta | `app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java:31` |
| 🟠 alto | tech-debt | Três implementações duplicadas do mesmo InputConnection de commitText | `app/src/main/java/com/limelight/ui/StreamContainer.java:186` |
| 🟠 alto | bug | Configuração de shadows do Robolectric fora do classpath — nunca é lida | `robolectric.properties:1` |
| 🟠 alto | maintainability | Repositório sem nenhum CI; o único arquivo de pipeline é herança quebrada do upstream | `appveyor.yml:14` |
| 🟠 alto | bug | AppVeyor publica um artefato de lint com nome de flavor inexistente | `appveyor.yml:17` |
| 🟡 médio | bug | Variáveis de ambiente do AppVeyor definidas com `set` não alcançam o build | `appveyor.yml:9` |
| 🟡 médio | bug | CI executa connectedCheck sem nenhum teste instrumentado existente | `appveyor.yml:14` |
| 🟡 médio | maintainability | Nenhuma configuração de assinatura — releases saem sem assinar | `app/build.gradle:106` |
| 🟡 médio | security | JitPack declarado sem filtro de conteúdo e mavenCentral antes de google | `build.gradle:16` |
| 🟡 médio | maintainability | Suíte de testes rasa e concentrada em asserções que não podem falhar | `app/src/test/java/com/limelight/StartupCrashTest.java:193` |
| 🟡 médio | compatibility | Todos os testes fixados em API 33, sem cobrir nem o mínimo nem o alvo | `app/src/test/java/com/limelight/StartupTest.java:24` |
| 🟡 médio | tech-debt | Source set app/src/game órfão — nenhum flavor ou buildType com esse nome | `app/src/game/AndroidManifest.xml:7` |
| 🟡 médio | maintainability | Changelogs do Fastlane numerados pelo versionCode do upstream, não do fork | `fastlane/metadata/android/en-US/changelogs/195.txt:1` |
| 🟡 médio | compatibility | Splits de ABI sem versionCode distinto por ABI e sem APK universal | `app/build.gradle:153` |
| 🟡 médio | performance | minifyEnabled ativo no buildType debug | `app/build.gradle:103` |
| 🟡 médio | maintainability | Documentação de testes desatualizada e cinco referências apontando para arquivos inexistentes | `android_test_setup.md:14` |
| 🟡 médio | maintainability | Gate de validação não cobre lint, e o lint não tem baseline | `tools/validate.mjs:34` |
| 🟡 médio | tech-debt | Dependências arquivadas ou sem manutenção | `app/build.gradle:169` |
| ⚪ baixo | tech-debt | Arquivo de teste vazio versionado, com o helper que ele deveria conter duplicado cinco vezes | `app/src/test/java/com/limelight/ProfileTestHelper.java:1` |
| ⚪ baixo | tech-debt | Diretório de código-fonte do flavor root usa nome de pacote com ponto | `app/src/root/java/com.limelight/binding/input/evdev/EvdevReader.java:1` |
| ⚪ baixo | performance | `./gradlew test` executa a suíte Robolectric quatro vezes sem cache | `build.gradle:28` |
| ⚪ baixo | compatibility | Java 11 com minSdk 21 sem core library desugaring | `app/build.gradle:67` |

### Detalhe

#### 🔴 crítico OpenSSL 1.1.1q estaticamente linkado, EOL desde setembro de 2023

**Local:** `app/src/main/jni/moonlight-core/openssl/include/openssl/opensslv.h:43` · **Categoria:** security

Os .a de libcrypto/libssl commitados no repositório (22 MB, 4 ABIs) são da OpenSSL 1.1.1q, de 05/07/2022. A linha 1.1.1 chegou a fim de vida em 11/09/2023 e o binário está preso várias correções atrás do último release da série (1.1.1w), incluindo CVE-2023-0286 (type confusion em GENERAL_NAME_cmp ao comparar endereços X.400, severidade alta), CVE-2023-0215 (use-after-free em BIO_new_NDEF), CVE-2023-2650 (DoS em OBJ_obj2txt), CVE-2023-3446 e CVE-2023-3817 (DoS em DH_check) e CVE-2023-5678. Esta é a base criptográfica do pareamento e do canal de controle com o host. Agravante de auditoria: os binários entraram no repositório sem nenhum registro de proveniência — não há README, checksum, script de build nem tag da versão de origem; o único indício da versão é o header. Não há como um agente ou revisor verificar como foram produzidos. O AGENTS.md classifica openssl/ como vendorizada e proíbe edição, o que está certo como regra de higiene, mas tem o efeito colateral de tornar a defasagem invisível — ninguém olha para lá.

**Correção sugerida:** Curto prazo: criar app/src/main/jni/moonlight-core/openssl/PROVENANCE.md registrando versão, origem, data e SHA-256 de cada .a, e abrir issue de atualização. Prazo real: migrar para OpenSSL 3.x ou BoringSSL com script de build reprodutível (docker + NDK) versionado em tools/, gerando os .a em CI em vez de commitá-los. Verificar antes se moonlight-common-c usa APIs removidas na 3.x (RSA/EVP legadas) — o upstream do moonlight-common-c já enfrentou essa migração e é a melhor fonte de comparação.

#### 🔴 crítico targetSdk 34 com compileSdk 36 bloqueia publicação e distorce a base do EPIC do teclado

**Local:** `app/build.gradle:12` · **Categoria:** compatibility

O projeto compila contra a API 36 mas declara targetSdk 34. Isso tem duas consequências independentes. (1) Distribuição: a Play Console exige API 35 para novos envios e atualizações desde 31/08/2025, e sobe para 36 em 31/08/2026 — o app é impublicável hoje. (2) E esta é a mais importante para o dono do fork: targetSdk 34 mantém o app FORA do enforcement edge-to-edge do Android 15. Quando o targetSdk subir para 35, o Android passa a desenhar por baixo das barras de sistema por padrão, setDecorFitsSystemWindows deixa de ser respeitado e todo o cálculo de insets/IME muda. Qualquer solução de 'empurrar o stream quando o teclado abre' construída sobre targetSdk 34 tem grande chance de quebrar no salto para 35. A ordem correta é subir o targetSdk primeiro e só então projetar o redimensionamento — não o inverso. Nota de processo: o AGENTS.md lista 'mudar minSdk/targetSdk' entre os itens que exigem ADR, o que é acertado — este achado é justamente o insumo desse ADR, não autorização para mudar direto.

**Correção sugerida:** Tratar a subida de targetSdk como pré-requisito (não sequela) do EPIC do teclado, via ADR em docs/adr/. Passo 1: subir para 35 em branch descartável, rodar o app e catalogar as regressões de inset/fullscreen em Game.java. Passo 2: substituir FLAG_FULLSCREEN e SYSTEM_UI_FLAG_IMMERSIVE_STICKY por WindowInsetsControllerCompat + WindowCompat.setDecorFitsSystemWindows(window, false), que é a API compatível com minSdk 21 via androidx. Passo 3: implementar o resize por ime() insets sobre essa base. Adicionar teste Robolectric com @Config(sdk = {30, 34, 35}) cobrindo o cálculo de insets.

#### 🟠 alto O único teste do envio de texto inteiro cobre uma classe morta

**Local:** `app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java:31` · **Categoria:** maintainability

StreamViewCommitTextTest instancia `new StreamView(ctx)` e valida que commitText é encaminhado a handleCommitText. Mas StreamView não é usado em produção: não aparece em nenhum layout XML (a única referência de layout é com.limelight.ui.StreamContainer em app/src/main/res/layout/activity_game.xml:14) e não é instanciado em nenhum arquivo de app/src/main/java nem dos source sets de flavor — a busca por StreamView fora do próprio arquivo só encontra comentários e métodos de nome parecido em Game.java (getStreamViewRelativeNormalizedXY etc.). Game.java:141-142 implementa StreamContainer.InputCallbacks e ExternalControllerView.InputCallbacks, nunca StreamView.InputCallbacks. Resultado: o teste que dá cobertura à feature nº2 do dono do fork (enviar texto inteiro) passa verde sobre código que nunca executa, e os dois caminhos vivos — StreamContainer.onCreateInputConnection (StreamContainer.java:186-202) e ExternalControllerView.onCreateInputConnection (ExternalControllerView.java:59-85) — têm cobertura zero.

**Correção sugerida:** Reapontar o teste para StreamContainer, inflando activity_game.xml ou instanciando StreamContainer diretamente, e duplicá-lo para ExternalControllerView. Depois excluir app/src/main/java/com/limelight/ui/StreamView.java. Acrescentar casos que o teste atual não cobre e que são exatamente os que quebram na prática: texto multibyte e emoji, composição do IME (setComposingText seguido de finishComposingText, o caminho normal de teclados preditivos como Gboard), string vazia e deleteSurroundingText. Verificar em cada caso que MoonBridge.sendUtf8Text recebe o texto completo de uma vez, e não fragmentado.

#### 🟠 alto Três implementações duplicadas do mesmo InputConnection de commitText

**Local:** `app/src/main/java/com/limelight/ui/StreamContainer.java:186` · **Categoria:** tech-debt

O bloco onCheckIsTextEditor + onCreateInputConnection + BaseInputConnection anônimo sobrescrevendo commitText/deleteSurroundingText existe copiado em três classes: StreamContainer.java:180-202, StreamView.java:125-157 e ExternalControllerView.java:59-85. Cada uma declara sua própria interface InputCallbacks com a mesma assinatura (StreamContainer.java:28-31, StreamView.java:159-166, ExternalControllerView.java:87-90), obrigando Game.java:141-142 a implementar duas delas. Uma das três é morta; as outras duas estão vivas e divergem em detalhe (StreamView usa if/return explícito, StreamContainer condensa em `a && b || super`). Toda correção no teclado precisa ser aplicada em dois lugares e testada em dois, e o risco de um agente encontrar o primeiro por grep e declarar pronto é alto — o sintoma seria a feature funcionando no display interno e quebrada no externo.

**Correção sugerida:** Extrair para com.limelight.ui.CommitTextInputConnection (ou uma factory estática) que receba a View hospedeira e um único callback compartilhado, e unificar as três interfaces InputCallbacks em uma só em com.limelight.ui. StreamContainer e ExternalControllerView passam a delegar; Game.java deixa de implementar duas interfaces e passa a implementar uma. Fazer isso DEPOIS de reapontar os testes, para que eles sirvam de rede de segurança.

#### 🟠 alto Configuração de shadows do Robolectric fora do classpath — nunca é lida

**Local:** `robolectric.properties:1` · **Categoria:** bug

O arquivo robolectric.properties está na raiz do repositório e declara shadows=com.limelight.shadows.ShadowBackdropFrameRenderer. O Robolectric resolve robolectric.properties pelo classpath de teste — no plugin Android isso significa app/src/test/resources/robolectric.properties. Esse diretório não existe: app/src/test contém apenas java/. Consequentemente a propriedade nunca é carregada e ShadowBackdropFrameRenderer (app/src/test/java/com/limelight/shadows/ShadowBackdropFrameRenderer.java:6), cujo comentário diz existir para evitar o crash do Choreographer, nunca é registrado. É código de teste morto e uma proteção que os desenvolvedores acreditam ter e não têm — perigoso justamente porque testes que dependem de janela e redimensionamento, o território do EPIC do teclado, são os que vão esbarrar nesse crash.

**Correção sugerida:** Mover para app/src/test/resources/robolectric.properties. Aproveitar para centralizar o que hoje é repetido: sdk=33 e a lista completa de shadows (ShadowMoonBridge, ShadowGameManager, ShadowBackdropFrameRenderer), removendo os @Config duplicados de StartupTest.java:24, StartupCrashTest.java:26, SimpleStartupTest.java:20, ProfilesManagerTest.java:22, ProfilesOverlayTest.java:24, OverlayPreferencesTest.java:26, ProfilesActivityUiTest.java:33, ProfilesNavigationTest.java:30 e LayoutInflationTest.java:17. Validar que o shadow passou a ser aplicado — um log em seu run() é a prova mais direta, já que hoje ele nunca é carregado.

#### 🟠 alto Repositório sem nenhum CI; o único arquivo de pipeline é herança quebrada do upstream

**Local:** `appveyor.yml:14` · **Categoria:** maintainability

Não existe .github/workflows/ — o .github/ tem apenas CONTRIBUTING.md e três templates de issue. O histórico confirma que nem o upstream ClassicOldSong (upstream/moonlight-noir) nem o moonlight-stream/master jamais tiveram GitHub Actions. Sobra o appveyor.yml, herdado e nunca adaptado ao fork, com três defeitos independentes descritos nos achados seguintes. O fork mitigou parcialmente com tools/validate.mjs, que é um bom gate local — mas depende do mesmo toolchain ausente: a máquina do dono não tem JDK nem Android SDK (verificado: java, javac, ANDROID_HOME e JAVA_HOME ausentes), então os estágios build e test são sempre pulados (validate.mjs:63) e a validação é estruturalmente parcial. Para um repositório que será trabalhado por agentes de IA durante meses, essa é a lacuna mais cara: um CI é o único lugar onde build e testes de fato rodam.

**Correção sugerida:** Adicionar .github/workflows/ci.yml conforme a proposta detalhada em improvementIdeas, reaproveitando tools/validate.mjs como o passo único de verificação — no runner, com SDK presente, ele executa os 4 estágios de verdade. O fork Moonlight V+, disponível como remote `vplus`, tem pipeline funcional em vplus/master:.github/workflows/android-ci.yml; usar como base, adaptando os nomes de tarefa para o flavor nonRoot_game (o V+ usa nonRoot) e removendo os passos de Kotlin, androidTest e google-services que não se aplicam.

#### 🟠 alto AppVeyor publica um artefato de lint com nome de flavor inexistente

**Local:** `appveyor.yml:17` · **Categoria:** bug

O passo after_build faz `appveyor PushArtifact app\build\reports\lint-results-nonRootDebug.html`. Esse nome corresponde ao flavor `nonRoot` do Moonlight upstream. Neste fork o flavor chama-se `nonRoot_game` (app/build.gradle:48), portanto o AGP gera lint-results-nonRoot_gameDebug.html. O caminho referenciado nunca existe e o único output que o pipeline se propunha a entregar jamais é publicado — um pipeline que, mesmo se rodasse, não produziria nada.

**Correção sugerida:** Se o appveyor.yml for mantido, corrigir para lint-results-nonRoot_gameDebug.html. A recomendação, porém, é remover o appveyor.yml junto com a adoção do GitHub Actions — dois pipelines dos quais um está morto são dois sinais contraditórios, pior que um só.

#### 🟡 médio Variáveis de ambiente do AppVeyor definidas com `set` não alcançam o build

**Local:** `appveyor.yml:9` · **Categoria:** bug

O bloco before_build usa `set ANDROID_HOME=C:\android-sdk` (linha 10) e `set JAVA_HOME=C:\Program Files\Java\jdk17` (linha 11). O AppVeyor executa cada entrada da lista em um processo de shell separado, de modo que `set` só vale para aquele comando e nada chega ao build_script da linha 14. O Gradle acaba usando o JDK padrão da imagem e descobrindo o SDK por outro caminho — ou falhando de forma opaca. O symlink criado na linha 9 (mklink /D C:\android-sdk) sofre do mesmo problema conceitual: só o symlink persiste, a variável não.

**Correção sugerida:** Em AppVeyor, variáveis persistentes vão no bloco `environment:` de topo, não em `set`. Como a recomendação é migrar para GitHub Actions, o equivalente correto lá é actions/setup-java@v4 com java-version 17 e android-actions/setup-android@v3, que exportam JAVA_HOME e ANDROID_HOME para todos os steps subsequentes.

#### 🟡 médio CI executa connectedCheck sem nenhum teste instrumentado existente

**Local:** `appveyor.yml:14` · **Categoria:** bug

O build_script roda `gradlew.bat build connectedCheck`. Não existe source set androidTest — app/src/ contém apenas game, main, nonRoot_game, root e test — e app/build.gradle:166-191 não declara nenhuma dependência androidTestImplementation. Também não há emulador nem dispositivo na imagem do AppVeyor. A tarefa não tem nada a executar, então passa trivialmente. O efeito colateral é pior que a inutilidade: o pipeline anuncia execução de testes instrumentados que nunca existiram, e um agente lendo o appveyor.yml pode concluir que há cobertura de dispositivo.

**Correção sugerida:** Remover connectedCheck. Se algum dia houver cobertura instrumentada — e o caso mais valioso seria justamente o teclado real com IME, que Robolectric não simula fielmente — usar reactivecircus/android-emulator-runner@v2 no GitHub Actions, em job separado e opcional, porque emulador em CI é lento e instável.

#### 🟡 médio Nenhuma configuração de assinatura — releases saem sem assinar

**Local:** `app/build.gradle:106` · **Categoria:** maintainability

A busca por signingConfig, keystore e storeFile em todos os arquivos .gradle não retorna nada. O buildType release (app/build.gradle:106-144) define applicationIdSuffix, resValues e minify, mas nenhuma assinatura, de modo que assembleRelease produz APK unsigned. Isso torna o release automatizado impossível hoje. Existe uma armadilha concreta: o workflow do fork V+ (vplus/master:.github/workflows/android-ci.yml), que é o modelo natural a copiar, decodifica um keystore de secret e exporta KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS e KEY_PASSWORD — mas essas variáveis só funcionam porque o build.gradle do V+ as lê. Copiar aquele workflow para o Artemis sem antes adicionar o bloco signingConfigs geraria APKs não assinados silenciosamente, com o CI reportando sucesso.

**Correção sugerida:** Adicionar em app/build.gradle um signingConfigs.release que leia System.getenv(), aplicado condicionalmente para não quebrar builds locais sem as variáveis, e referenciá-lo em buildTypes.release também de forma condicional. Usar exatamente os nomes de variável do workflow do V+, para que ele seja copiável sem tradução. Manter key/ no .gitignore (já está, .gitignore:22) e guardar o keystore em GitHub Secrets como base64, nunca no repositório.

#### 🟡 médio JitPack declarado sem filtro de conteúdo e mavenCentral antes de google

**Local:** `build.gradle:16` · **Categoria:** security

O bloco allprojects.repositories (build.gradle:12-18) declara mavenCentral(), google() e jitpack.io, todos sem bloco content {}. O JitPack constrói e serve artefatos a partir de repositórios GitHub arbitrários, então qualquer coordenada que não seja encontrada nos repositórios anteriores pode ser resolvida de lá — superfície clássica de confusão de dependência. Três dependências reais vêm do JitPack: com.github.cgutman:ShieldControllerExtensions:1.0.1 (app/build.gradle:172), com.github.ByteHamster:SearchPreference:v2.5.1 (:180) e com.github.PhilJay:MPAndroidChart:v3.1.0 (:181). Secundariamente, mavenCentral() aparece antes de google() tanto no buildscript (:4-5) quanto em allprojects (:13-14), invertendo a ordem convencional. Não há lockfile nem verificação de checksum (gradle/verification-metadata.xml ausente), então nada detectaria a substituição de um artefato.

**Correção sugerida:** Restringir o JitPack ao seu namespace com content { includeGroupByRegex "com\\.github\\..*" }. Inverter para google() antes de mavenCentral(). Como reforço, habilitar verificação de dependências do Gradle (./gradlew --write-verification-metadata sha256 help) e versionar gradle/verification-metadata.xml — barato de gerar e faz o CI falhar se um artefato mudar de conteúdo.

#### 🟡 médio Suíte de testes rasa e concentrada em asserções que não podem falhar

**Local:** `app/src/test/java/com/limelight/StartupCrashTest.java:193` · **Categoria:** maintainability

São 51 métodos @Test em 1.470 linhas contra 43.281 linhas de produção em 152 arquivos. A distribuição é o problema: 32 dos 51 (63%) estão em StartupCrashTest (14), StartupTest (11) e SimpleStartupTest (7), todos verificando variações de 'a activity não crasha', quase sempre no padrão try { ...; assertNotNull(x) } catch (Exception e) { fail(...) }. Vários casos não têm poder de detecção nenhum: testConcurrentStartup (:193) apenas cria duas activities sequencialmente e as assere não-nulas, sem nenhuma concorrência; testMemoryLeakDuringStartup (:208) só falharia com OutOfMemoryError, que não é como vazamentos se manifestam; SimpleStartupTest.java:107 chega a assertTrue("Save operation should complete", true); StartupCrashTest.java:147-148 assere !activity.isFinishing() || activity.isFinishing(), uma tautologia. Não há cobertura alguma de tradução de teclado (KeyboardTranslator), decodificação de vídeo, rede/pareamento ou fronteira JNI. Sem JaCoCo em app/build.gradle, a cobertura real nunca foi medida.

**Correção sugerida:** Aplicar o plugin jacoco e gerar jacocoTestReport para a variante nonRoot_gameDebug, publicando o XML como artefato do CI — primeiro só para medir, sem limiar. Definir limiar depois, por pacote (com.limelight.ui, com.limelight.preferences, com.limelight.binding.input) e não global, que Game.java com 4.349 linhas e ControllerHandler com 3.473 tornariam inatingível — limiar inatingível é limiar que se desliga. Excluir ou converter em asserções reais as tautologias citadas.

#### 🟡 médio Todos os testes fixados em API 33, sem cobrir nem o mínimo nem o alvo

**Local:** `app/src/test/java/com/limelight/StartupTest.java:24` · **Categoria:** compatibility

Toda classe de teste anota @Config(sdk = {33}) — StartupTest.java:24, StartupCrashTest.java:26, SimpleStartupTest.java:20, ProfilesManagerTest.java:22, ProfilesOverlayTest.java:24, OverlayPreferencesTest.java:26, ProfilesActivityUiTest.java:33, ProfilesNavigationTest.java:30, LayoutInflationTest.java:17 e StreamViewCommitTextTest.java:20. O projeto suporta de API 21 a 36 (app/build.gradle:6,11) e o android_test_setup.md:54 justifica o 33 dizendo que 'combina com compileSdk 34' — justificativa que já não vale, porque o compileSdk é 36. Nenhum teste roda em API 21, onde as APIs modernas de janela não existem; em API 30, onde WindowInsets.Type.ime() surge e onde a solução do EPIC do teclado vai divergir; nem em 35, onde o edge-to-edge é imposto. Robolectric roda múltiplos SDKs no mesmo teste sem custo de emulador — a matriz está disponível e não é usada. É a lacuna de teste mais diretamente ligada à dor nº1 do dono do fork.

**Correção sugerida:** Definir sdk=33 como padrão em app/src/test/resources/robolectric.properties (após mover o arquivo) e anotar explicitamente com @Config(sdk = {21, 30, 33, 35}) os testes sensíveis a versão: os de janela, IME e insets, e todo teste novo do EPIC do teclado. Confirmar antes quais níveis a versão do Robolectric em uso (4.16) disponibiliza; se algum não estiver, registrar a lacuna no android_test_setup.md em vez de omiti-la silenciosamente — que é como a fixação em 33 nasceu.

#### 🟡 médio Source set app/src/game órfão — nenhum flavor ou buildType com esse nome

**Local:** `app/src/game/AndroidManifest.xml:7` · **Categoria:** tech-debt

Existe app/src/game/AndroidManifest.xml, mas não há flavor nem buildType chamado `game`: os flavors são root e nonRoot_game (app/build.gradle:28,48), os buildTypes são debug e release, e o build.gradle não sobrescreve sourceSets. Os nomes válidos seriam main, debug, release, root, nonRoot_game e as combinações — `game` não é um deles, então esse manifesto nunca é mesclado em build algum. É resíduo do layout de flavors do upstream, e seu conteúdo é quase idêntico ao de app/src/nonRoot_game/AndroidManifest.xml, diferindo só no label. Consequência em cascata: os resValue de app_label_game (app/build.gradle:101 e :140, definindo 'Diana (Game)' e 'Artemis (Game)') existem exclusivamente para esse manifesto morto e nunca aparecem para nenhum usuário. Custo real: um agente que precise alterar o manifesto do flavor não-root tem 50% de chance de editar o arquivo errado, e a edição não terá efeito nenhum, sem erro.

**Correção sugerida:** Remover app/src/game/ e as duas linhas de resValue app_label_game em app/build.gradle:101 e :140. Confirmar antes, com grep por app_label_game em app/src/main/res, que nenhuma tradução o referencia.

#### 🟡 médio Changelogs do Fastlane numerados pelo versionCode do upstream, não do fork

**Local:** `fastlane/metadata/android/en-US/changelogs/195.txt:1` · **Categoria:** maintainability

O diretório tem 69 arquivos nomeados de 195.txt a 314.txt — a sequência de versionCode do Moonlight upstream. O versionCode deste fork é 57 (app/build.gradle:15) e o versionName é 20.2.6. Fastlane e F-Droid resolvem o changelog pelo nome do arquivo igual ao versionCode do build, ou seja, procuram 57.txt, que não existe. Nenhum changelog é publicado, e os 69 arquivos presentes descrevem versões de outro produto — um agente que leia esse diretório para entender o histórico do fork será ativamente desinformado. Só há duas localidades (de, en-US) enquanto o app tem cerca de 20 traduções de UI, o que reforça que essa árvore não é mantida.

**Correção sugerida:** Decidir explicitamente e registrar em docs/adr/: ou o repositório distribui por Fastlane/F-Droid — e então limpar os 69 arquivos e passar a criar <versionCode>.txt a cada release — ou não distribui, e o diretório changelogs/ deve ser removido inteiro. A segunda opção parece mais coerente com a distribuição real por GitHub Release e Obtainium (app/build.gradle:57).

#### 🟡 médio Splits de ABI sem versionCode distinto por ABI e sem APK universal

**Local:** `app/build.gradle:153` · **Categoria:** compatibility

O bloco splits.abi gera 4 APKs por variante (x86, x86_64, armeabi-v7a, arm64-v8a) sem habilitar universalApk, e o build.gradle não faz nenhum ajuste de versionCode por ABI (não há applicationVariants.all nem versionCodeOverride). Os quatro APKs saem com versionCode 57 idêntico. Dois efeitos: a Play Store rejeita multi-APK com versionCodes iguais, e a URL do Obtainium embutida em app/build.gradle:57 usa apkFilterRegEx 'nonRoot', que casa com os quatro simultaneamente — o cliente não tem como escolher deterministicamente o APK da arquitetura certa. Como não há APK universal, também não existe um fallback único para distribuir manualmente.

**Correção sugerida:** Adicionar o offset canônico por ABI: mapear cada ABI para um multiplicador (armeabi-v7a=1, arm64-v8a=2, x86=3, x86_64=4) e aplicar output.versionCodeOverride = base * 10 + offset em applicationVariants.all. Alternativamente, se a distribuição for só GitHub e Obtainium, habilitar universalApk true e apertar o regex do Obtainium. A decisão depende de haver ou não intenção de publicar na Play Store — registrar em ADR.

#### 🟡 médio minifyEnabled ativo no buildType debug

**Local:** `app/build.gradle:103` · **Categoria:** performance

O buildType debug roda R8 com proguard-android.txt + proguard-rules.pro, igual ao release. Somado a ndk.debugSymbolLevel = 'FULL' (:18), aos 4 ABIs de splits (:153-159) e ao ndkBuild, o ciclo de iteração local fica muito mais lento do que precisa — e assembleNonRoot_gameDebug é justamente o estágio 3 de tools/validate.mjs, executado a cada gate. O gradle.properties também não habilita nenhuma otimização: org.gradle.parallel está comentado (gradle.properties:19), não há org.gradle.caching nem configuration cache, e o heap é fixo em 3 GB (:14). O impacto recai sobre o trabalho do EPIC do teclado, que é intrinsecamente iterativo. Nota: manter R8 no debug tem um benefício legítimo, detectar regras de keep faltantes antes do release — a proposta preserva essa checagem movendo-a para o CI.

**Correção sugerida:** Definir minifyEnabled false no debug e garantir que o CI construa a variante release, onde o R8 roda, preservando a detecção de regras faltantes sem penalizar a iteração local. Habilitar org.gradle.caching=true e org.gradle.parallel=true em gradle.properties. Documentar em docs/guides/setup-ambiente.md a flag de ABI única que o guia já menciona (-Pandroid.injected.build.abi=arm64-v8a, linha 98).

#### 🟡 médio Documentação de testes desatualizada e cinco referências apontando para arquivos inexistentes

**Local:** `android_test_setup.md:14` · **Categoria:** maintainability

O android_test_setup.md documenta androidx.test:core 1.5.0, robolectric 4.11.1 e mockito-core 5.11.0 (linhas 14-17), enquanto app/build.gradle:188-190 declara 1.7.0, 4.16 e 5.19.0. A linha 54 afirma 'matches compileSdk 34' quando o compileSdk é 36 (app/build.gradle:6). Além disso, cinco referências cruzadas apontam para arquivos que não existem: AGENTS.md remete a docs/reference/jni.md, docs/epics/E01-teclado-anydesk.md, docs/howto/adicionar-preferencia.md e docs/reference/host-compatibility.md, e docs/guides/setup-ambiente.md:86 remete a docs/reference/testes.md — mas docs/ contém apenas adr/, guides/ e maps/. As ferramentas citadas pelo AGENTS.md, em contraste, existem todas (tools/validate.mjs, tools/codemap/*.mjs, tools/test-hooks.mjs). O agravante é de contrato: o próprio AGENTS.md afirma que 'documentação desatualizada é pior que ausente, porque é acreditada', e a tabela 'Onde ler antes de mexer' é a primeira coisa que um agente consulta — quatro das suas nove entradas apontam para o vazio, e o android_test_setup.md faz um agente copiar versões erradas.

**Correção sugerida:** Atualizar versões e compileSdk no android_test_setup.md, preferencialmente substituindo os números literais por uma referência a app/build.gradle:187-190 para que não voltem a divergir. Criar os quatro documentos referenciados pelo AGENTS.md e o docs/reference/testes.md, ou remover as entradas até que existam. Adicionar ao tools/validate.mjs (ou ao codemap) uma verificação de links internos quebrados em *.md — barato, não precisa de SDK e portanto roda mesmo no modo --fast, que é o único disponível na máquina do dono.

#### 🟡 médio Gate de validação não cobre lint, e o lint não tem baseline

**Local:** `tools/validate.mjs:34` · **Categoria:** maintainability

tools/validate.mjs encadeia quatro estágios (codemap, jni, build, test — linhas 34-54) e é apresentado pelo AGENTS.md como a definição de pronto, mas nenhum deles roda lint, embora o AGENTS.md liste ./gradlew lint entre os comandos. Do lado do Gradle, o bloco lint (app/build.gradle:71-74) apenas desabilita MissingTranslation e aponta para app/lint.xml, que eleva MissingThemeAttr a error (app/lint.xml:6); não há lintBaseline nem abortOnError explícito. O padrão do AGP é abortOnError=true e checkReleaseBuilds=true, então lintVitalRelease roda em todo assembleRelease. Como nunca houve CI, ninguém sabe o estado atual do lint: se houver um único erro hoje, o primeiro release automatizado quebra sem aviso, e o agente que o disparar gasta o ciclo depurando dívida herdada em vez da própria mudança. Sem baseline, também não existe definição operacional de 'aviso novo'.

**Correção sugerida:** Gerar a baseline uma vez com lint { baseline = file("lint-baseline.xml") } e versioná-la, e a partir daí fazer qualquer issue fora da baseline falhar. Adicionar um quinto estágio a tools/validate.mjs rodando :app:lintNonRoot_gameDebug, marcado needsSdk como os demais. Isso converte a dívida existente em algo visível e redutível, sem bloquear o trabalho corrente, e torna verificável um item que hoje é só uma promessa.

#### 🟡 médio Dependências arquivadas ou sem manutenção

**Local:** `app/build.gradle:169` · **Categoria:** tech-debt

org.jcodec:jcodec:0.2.5 (:169) tem seu último release em 2019. com.github.PhilJay:MPAndroidChart:v3.1.0 (:181) também é de 2019, com o repositório arquivado, e vem via JitPack — combinação de abandono e resolução não filtrada. androidx.cardview:1.0.0 (:175) é de 2018 e foi substituída por MaterialCardView, já disponível via com.google.android.material:material:1.13.0 (:179), que o projeto também usa — as duas coexistem sem razão. com.squareup.okhttp3:okhttp:4.12.0 (:170) é de outubro de 2023, com a linha 5.x já corrente; não há CVE conhecida na 4.12.0, mas a versão está congelada há dois anos e não receberá correções indefinidamente. Em contraste, bouncycastle 1.81, gson 2.13.1, appcompat 1.7.1 e opencv 4.12.0 estão atuais — o problema é pontual, não sistêmico.

**Correção sugerida:** Rodar ./gradlew dependencyUpdates (plugin ben-manes) uma vez para o retrato completo, e tratar em ordem de risco: substituir androidx.cardview por MaterialCardView (mecânico, o material já está no classpath); avaliar se jcodec ainda é usado e por quê; migrar okhttp para 5.x; verificar quanto de MPAndroidChart é realmente exercido (provavelmente só o overlay de performance) antes de decidir entre trocar ou fixar. Nenhuma é urgente — o item urgente de dependência é a OpenSSL. Lembrar que o AGENTS.md exige ADR para adicionar dependência nova; substituir uma existente merece o mesmo tratamento.

#### ⚪ baixo Arquivo de teste vazio versionado, com o helper que ele deveria conter duplicado cinco vezes

**Local:** `app/src/test/java/com/limelight/ProfileTestHelper.java:1` · **Categoria:** tech-debt

O arquivo tem exatamente 1 byte (um único espaço). Não declara pacote, classe nem nada. Aparece na contagem de 15 arquivos de teste, inflando a percepção de tamanho da suíte — a suíte real são 10 classes de teste, 3 shadows e 1 utilitário (TestLogSuppressor). O nome sugere intenção de extrair helpers de perfis, hoje duplicados: deleteRecursively(File) está copiado em SimpleStartupTest.java:145, StartupTest.java:220, StartupCrashTest.java:276, ProfilesManagerTest.java:107 e ProfilesOverlayTest.java:85, e o reset por reflexão de ProfilesManager.instance aparece em três deles.

**Correção sugerida:** Preencher o arquivo com o que o nome promete — deleteRecursively e o reset do singleton — eliminando as cinco cópias. Preferível a simplesmente apagar, porque resolve duplicação real além do arquivo vazio.

#### ⚪ baixo Diretório de código-fonte do flavor root usa nome de pacote com ponto

**Local:** `app/src/root/java/com.limelight/binding/input/evdev/EvdevReader.java:1` · **Categoria:** tech-debt

O caminho é app/src/root/java/com.limelight/binding/... — o diretório chama-se literalmente 'com.limelight', com ponto, em vez da hierarquia com/limelight. A compilação funciona porque o Gradle passa a lista de .java explicitamente ao javac, que não exige correspondência entre diretório e pacote para arquivos listados. Mas ferramentas que assumem o layout convencional — indexadores, o próprio tools/codemap/codemap.mjs, refatorações de IDE, análise estática — podem tratar esses quatro arquivos como estando em outro pacote ou ignorá-los. Só afeta o flavor root, secundário para o dono do fork.

**Correção sugerida:** Renomear para app/src/root/java/com/limelight/binding/input/evdev/. É git mv puro, sem alteração de conteúdo, já que os arquivos já declaram package com.limelight.binding.input.evdev. Rodar tools/codemap/codemap.mjs depois e comparar a contagem de arquivos indexados — se mudar, confirma que o codemap estava perdendo esses arquivos.

#### ⚪ baixo `./gradlew test` executa a suíte Robolectric quatro vezes sem cache

**Local:** `build.gradle:28` · **Categoria:** performance

A tarefa agregadora `test` da raiz (build.gradle:21-32) faz dependsOn de toda tarefa terminada em 'UnitTest' em todos os subprojetos (linha 28). Com 2 flavors × 2 buildTypes, isso são testRootDebugUnitTest, testRootReleaseUnitTest, testNonRoot_gameDebugUnitTest e testNonRoot_gameReleaseUnitTest — a mesma suíte, quatro execuções. Somado a outputs.upToDateWhen { false } (linha 37), que desabilita up-to-date em todo Test task, e a showStandardStreams = true (linha 43), o comando fica lento e ruidoso. As variantes root e release quase não agregam informação: os testes não referenciam BuildConfig.ROOT_BUILD e unit tests não rodam contra classes minificadas. O AGENTS.md e tools/validate.mjs:52-54 já prescrevem corretamente a forma estreita (:app:testNonRoot_gameDebugUnitTest) — a armadilha é para quem digitar ./gradlew test por hábito.

**Correção sugerida:** Manter o agregador para uso pontual, mas remover outputs.upToDateWhen { false }: é justamente o cache que torna a re-execução barata, e o Gradle já invalida corretamente quando fontes ou classpath mudam. Considerar limitar o agregador às variantes debug.

#### ⚪ baixo Java 11 com minSdk 21 sem core library desugaring

**Local:** `app/build.gradle:67` · **Categoria:** compatibility

compileOptions declara sourceCompatibility e targetCompatibility em VERSION_11 (linhas 67-68), mas coreLibraryDesugaringEnabled não é habilitado e não há dependência coreLibraryDesugaring. Com minSdk 21, java.time, java.util.stream, java.util.Optional e java.nio.file não estão disponíveis em dispositivos antigos — o desugaring de linguagem (lambdas, method references) funciona, mas o de biblioteca não. Na prática o codebase é Java antigo e não usa essas APIs, então nada quebra hoje. O risco é um agente adicionar java.time.Duration em código novo, ver compilar e passar nos testes Robolectric — que rodam em JVM completa e mascaram o problema — e só descobrir o NoClassDefFoundError em um dispositivo API 21-25 real. A regra 2 do AGENTS.md cobre APIs do Android por SDK_INT, mas não cobre este caso, que é de biblioteca Java.

**Correção sugerida:** Ou habilitar o desugaring (coreLibraryDesugaringEnabled true + coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs'), removendo a armadilha de vez ao custo de alguns KB, ou acrescentar a restrição à regra 2 do AGENTS.md. A primeira é preferível justamente porque a segunda depende de o agente lembrar.


## Ideias de melhoria

### Mover robolectric.properties para o classpath de teste e centralizar a configuração

**Tamanho:** quick-win

**Por quê:** Correção de uma linha que restaura um shadow hoje inerte e, de quebra, elimina a repetição de @Config em dez arquivos. O shadow em questão protege contra crash de Choreographer em redimensionamento de janela — exatamente o território do EPIC do teclado, onde a ausência dessa proteção vai se manifestar como falhas confusas e difíceis de atribuir.

**Como:** git mv robolectric.properties app/src/test/resources/robolectric.properties. Expandir o conteúdo para sdk=33 e shadows=com.limelight.shadows.ShadowMoonBridge,com.limelight.shadows.ShadowGameManager,com.limelight.shadows.ShadowBackdropFrameRenderer. Depois remover as anotações @Config redundantes de StartupTest.java:24, StartupCrashTest.java:26, SimpleStartupTest.java:20, ProfilesManagerTest.java:22, ProfilesOverlayTest.java:24, OverlayPreferencesTest.java:26, ProfilesActivityUiTest.java:33, ProfilesNavigationTest.java:30 e LayoutInflationTest.java:17, mantendo @Config apenas onde o teste precisar de SDK diferente do padrão. Provar que ShadowBackdropFrameRenderer passou a ser aplicado — um log em seu run() basta, já que hoje ele nunca é carregado.

**Risco:** Baixo, mas não nulo: ao ativar ShadowBackdropFrameRenderer pela primeira vez, algum teste que hoje passa pelo caminho real pode mudar de comportamento. Rodar a suíte antes e depois e comparar a contagem de testes executados, não só o verde.

### Higiene de build: limpar código morto e acelerar a iteração local

**Tamanho:** quick-win

**Por quê:** Um punhado de correções mecânicas e independentes que juntas reduzem bastante o ruído para quem — humano ou agente — precisa se orientar no repositório. Cada uma isolada é trivial; o valor está em fazê-las de uma vez, num PR só de limpeza, sem misturar com mudança de comportamento.

**Como:** 1. Remover app/src/game/ (source set órfão) e as duas linhas resValue app_label_game de app/build.gradle:101 e :140. 2. Preencher app/src/test/java/com/limelight/ProfileTestHelper.java (hoje 1 byte) com deleteRecursively e o reset por reflexão de ProfilesManager.instance, eliminando as cinco cópias em SimpleStartupTest.java:145, StartupTest.java:220, StartupCrashTest.java:276, ProfilesManagerTest.java:107 e ProfilesOverlayTest.java:85. 3. Definir minifyEnabled false no debug (app/build.gradle:103), mantendo a checagem de R8 no job release-check. 4. Habilitar org.gradle.caching=true e org.gradle.parallel=true em gradle.properties. 5. Remover outputs.upToDateWhen { false } de build.gradle:37. 6. git mv app/src/root/java/com.limelight → app/src/root/java/com/limelight. 7. Decidir por ADR o destino dos 69 changelogs do Fastlane numerados pelo versionCode do upstream. 8. Rodar node tools/codemap/codemap.mjs ao final e commitar docs/maps/ regenerado — os itens 1 e 6 mudam a estrutura indexada.

**Risco:** Baixo, e cada item é reversível isoladamente. O único que merece verificação é o 3: se algum crash só se manifesta com R8 ativo, desligá-lo no debug o esconde localmente — daí a importância de o job release-check existir antes ou junto. Manter este PR sem nenhuma mudança de comportamento, para que a revisão seja trivial.

### Fechar as lacunas do gate: lint, links de docs e relatório honesto de estágios pulados

**Tamanho:** small

**Por quê:** tools/validate.mjs já é a definição de pronto operacional do repositório e já faz a coisa mais importante — avisar quais estágios não rodaram (validate.mjs:105-107), que é o que impede um agente de reportar como verificado o que não executou. Faltam dois estágios cuja ausência enfraquece exatamente os itens do checklist do AGENTS.md que hoje não são verificáveis, e ambos são baratos.

**Como:** 1. Adicionar um estágio `lint` rodando :app:lintNonRoot_gameDebug, marcado needsSdk como build e test, contra uma lint-baseline.xml versionada — sem a baseline o estágio é inútil, porque não há noção de 'aviso novo'.
2. Adicionar um estágio `docs` (sem needsSdk, portanto executando mesmo em --fast, o único modo disponível na máquina do dono) que verifique links internos quebrados em *.md. Hoje AGENTS.md aponta para quatro documentos inexistentes e setup-ambiente.md:86 para um quinto — esse estágio pega essa classe de deriva antes que ela envelhe.
3. Alinhar o checklist do AGENTS.md com os estágios reais, para que cada item da definição de pronto tenha um verificador correspondente e vice-versa: build, testes, jni-check, mapas, lint, links de docs. Itens que continuam manuais — strings extraídas, teste com teclado aberto em dispositivo — devem estar marcados como manuais, para que um agente saiba que precisa declará-los em vez de assumi-los.
4. Manter em destaque a regra que já existe e é a mais valiosa: se um estágio não pôde rodar, dizer explicitamente qual e por quê. Com o CI no lugar, o caminho preferencial passa a ser abrir o PR e ler os checks — a única prova que não depende da máquina local.

**Risco:** Baixo. O cuidado é gerar a baseline de lint antes de ligar o estágio, senão o gate passa a falhar por dívida herdada e a reação natural será desligar o estágio em vez de reduzir a dívida.

### Reapontar o teste de commitText para o caminho vivo e remover StreamView

**Tamanho:** small

**Por quê:** É o achado de maior impacto direto sobre a prioridade nº2 do dono do fork. Hoje existe a aparência de cobertura sobre o envio de texto inteiro, e a aparência é pior que a ausência: um agente que rode a suíte e a veja verde conclui que a feature está protegida, quando o código testado nunca executa.

**Como:** Passo 1: criar StreamContainerCommitTextTest espelhando os dois casos de StreamViewCommitTextTest.java:30 e :46, mas contra StreamContainer — inflando app/src/main/res/layout/activity_game.xml ou instanciando StreamContainer diretamente e chamando setCommitTextEnabled (StreamContainer.java:156) e onCreateInputConnection (:186). Passo 2: espelhar para ExternalControllerView (ExternalControllerView.java:59), o caminho de display externo instanciado em ExternalDisplayControlActivity.java:388. Passo 3: apagar StreamViewCommitTextTest e app/src/main/java/com/limelight/ui/StreamView.java. Passo 4: ampliar para os casos que realmente quebram e que o teste atual nem tenta — texto multibyte e emoji, o ciclo setComposingText/finishComposingText usado por todo teclado preditivo (Gboard, SwiftKey), string vazia e deleteSurroundingText — verificando em cada um que MoonBridge.sendUtf8Text recebe o texto completo de uma vez, que é o comportamento que o dono quer.

**Risco:** Baixo. StreamView é comprovadamente morto (sem referência em layout nem instanciação em nenhum source set), então a remoção não afeta runtime. O único risco é a inflação de activity_game.xml em Robolectric esbarrar em GLSurfaceView — se ocorrer, instanciar StreamContainer programaticamente em vez de inflar o layout.

### Adicionar signingConfigs lido de variáveis de ambiente

**Tamanho:** small

**Por quê:** Pré-requisito bloqueante do job de release do CI. Sem isso, qualquer automação de release produz APK não assinado — e, pior, produz com o CI verde, porque nada no build falha por falta de assinatura. É a armadilha concreta de copiar o workflow do V+, que exporta as variáveis de keystore assumindo que o build.gradle as lê.

**Como:** Em app/build.gradle, antes de buildTypes, adicionar signingConfigs.release condicional: se System.getenv('KEYSTORE_PATH') estiver definido, preencher storeFile, storePassword, keyAlias e keyPassword a partir do ambiente. Em buildTypes.release, aplicar signingConfig signingConfigs.release também condicionalmente, para que builds locais sem as variáveis continuem funcionando (produzindo unsigned, como hoje) em vez de falharem. Usar exatamente os nomes de variável que o workflow do V+ já usa (KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD), para que o workflow seja copiável sem tradução. O key/ já está no .gitignore (.gitignore:22); manter.

**Risco:** Baixo no build. O risco real é operacional: perder o keystore significa não poder mais atualizar o app para quem já o instalou, porque o Android exige a mesma assinatura. Guardar backup fora do GitHub antes de configurar o secret. Nunca commitar o keystore nem colar sua senha em arquivo versionado.

### Instrumentar cobertura com JaCoCo, medindo antes de exigir

**Tamanho:** small

**Por quê:** Hoje ninguém sabe a cobertura real — 51 testes passando transmite uma impressão otimista demais para 43 mil linhas de produção. Sem medição, 'testar mais' é especulação e a decisão de onde investir esforço não tem base.

**Como:** Aplicar o plugin jacoco em app/build.gradle e criar jacocoTestReport ligada a testNonRoot_gameDebugUnitTest, com XML e HTML. Excluir o ruído habitual (R.class, BuildConfig, classes geradas do AndroidX). Publicar o XML como artefato no job verify. Deliberadamente NÃO definir limiar no começo: rodar algumas semanas só para ter o número. Quando houver dado, definir limiar por pacote — com.limelight.ui, com.limelight.preferences e com.limelight.binding.input — e não global, porque Game.java (4.349 linhas) e ControllerHandler (3.473) arrastariam o total para um patamar inatingível, e limiar inatingível é limiar que se desliga.

**Risco:** Baixo. O cuidado é não perseguir o número: a suíte atual tem testes que executam muito código sem assertar nada (StartupCrashTest.java:193 e :208), então a cobertura vai parecer melhor que a proteção real. Ler o relatório como mapa do que nunca é executado, não como nota.

### Matriz de SDK no Robolectric como base do EPIC do teclado

**Tamanho:** small

**Por quê:** O comportamento de IME e insets muda em pontos específicos — API 30 introduz WindowInsets.Type.ime(), API 35 impõe edge-to-edge — e a suíte inteira roda fixada em 33, exatamente entre os dois. Sem essa matriz, a solução do teclado será validada num único nível e vai quebrar nos outros de forma que só aparece no dispositivo do usuário.

**Como:** Depois de mover robolectric.properties para o classpath, definir sdk=33 como padrão lá e anotar explicitamente os testes sensíveis a versão com @Config(sdk = {21, 30, 33, 35}). Aplicar a todo teste novo do EPIC do teclado e aos testes de commitText reapontados. Confirmar antes quais níveis o Robolectric 4.16 (app/build.gradle:189) disponibiliza; se algum não estiver, registrar a lacuna no android_test_setup.md em vez de omiti-la — que é exatamente como a fixação em 33 nasceu. Combinar com a subida de targetSdk: rodar a matriz antes e depois dá o diff exato de comportamento que a subida provoca, que é a informação mais valiosa para projetar o resize.

**Risco:** Baixo em si, mas testes multi-SDK são mais lentos (Robolectric instancia um jar de Android por nível) e podem revelar falhas preexistentes em API 21 — o que é o ponto, não um problema. Reservar tempo para triar essas falhas em vez de fixar de volta em 33.

### Unificar as três implementações de InputConnection em uma só

**Tamanho:** medium

**Por quê:** Consertar o teclado hoje significa aplicar a mesma mudança em dois lugares vivos e testá-la em dois. A probabilidade de um agente encontrar apenas o primeiro por grep e declarar pronto é alta — e o resultado é a feature funcionando no display interno e quebrada no externo, com sintoma difícil de diagnosticar porque os dois caminhos parecem idênticos à leitura.

**Como:** Criar com.limelight.ui.CommitTextInputConnection (ou uma factory estática) que receba a View hospedeira e um único callback, encapsulando o bloco onCheckIsTextEditor + onCreateInputConnection + BaseInputConnection anônimo. Unificar as três interfaces InputCallbacks hoje separadas (StreamContainer.java:28-31, StreamView.java:159-166, ExternalControllerView.java:87-90) em uma só. StreamContainer.java:186-202 e ExternalControllerView.java:59-85 passam a delegar; Game.java:141-142 deixa de implementar duas interfaces e passa a implementar uma. Fazer DEPOIS da ideia anterior, para que os testes já existam contra os dois caminhos e sirvam de rede de segurança — refatorar primeiro e testar depois inverte a ordem que dá garantia.

**Risco:** Médio. Game.java tem 4.349 linhas e fan-out 44; mexer nas interfaces que ela implementa toca uma god-class. Mitigação: dois commits — primeiro introduzir a interface unificada mantendo as antigas como extends dela (compatível), depois remover as antigas. Consultar `node tools/codemap/query.mjs --callers` antes, para confirmar quem mais depende dessas interfaces.

### Endurecer a resolução de dependências e documentar a proveniência dos binários nativos

**Tamanho:** medium

**Por quê:** São 22 MB de OpenSSL e 9,8 MB de libopus entrando no APK como binários opacos, mais três dependências resolvidas de um repositório que constrói repositórios GitHub arbitrários sem filtro. Nada disso é verificável hoje por um agente ou revisor — e a OpenSSL em questão está fora de suporte há dois anos e faz a criptografia do pareamento com o host. A regra do AGENTS.md que proíbe editar openssl/ e libopus/ está certa como higiene, mas tem o efeito colateral de tornar essa defasagem invisível.

**Como:** Curto prazo, barato e sem risco: (a) restringir o JitPack ao seu namespace em build.gradle:16 com content { includeGroupByRegex "com\\.github\\..*" }; (b) inverter para google() antes de mavenCentral() em build.gradle:4-5 e :13-14; (c) gerar e versionar gradle/verification-metadata.xml via ./gradlew --write-verification-metadata sha256 help, fazendo o CI falhar se o conteúdo de qualquer artefato mudar; (d) criar PROVENANCE.md em openssl/ e libopus/ registrando versão, origem, data e SHA-256 de cada .a — hoje o único indício de versão é opensslv.h:43.

Prazo real: substituir os .a commitados por build reprodutível. Script em tools/ (docker + NDK) que compile OpenSSL 3.x ou BoringSSL e libopus para as 4 ABIs, executado em CI e publicado como artefato, em vez de binários no git. Antes, verificar se moonlight-common-c usa APIs removidas na 3.x — o upstream já enfrentou essa migração e é a melhor fonte de comparação.

**Risco:** A migração de OpenSSL é a parte arriscada: mexe na criptografia do pareamento, e uma regressão quebra a conexão com o host de forma difícil de diagnosticar (falha no handshake, não no build). PR isolado, testar pareamento do zero com Vibeshine e com Apollo antes de mesclar, manter os .a antigos até validar em dispositivo real. Os itens (a) a (d) são independentes e podem ir antes, sem risco.

### EPIC — Pipeline de CI em GitHub Actions reaproveitando tools/validate.mjs

**Tamanho:** epic

**Por quê:** É a lacuna estrutural mais cara do repositório. O fork já tem um gate bem desenhado em tools/validate.mjs, mas ele depende de um toolchain que a máquina do dono não tem — sem JDK e sem Android SDK, os estágios build e test são sempre pulados (validate.mjs:63) e o gate degrada para validação parcial. Um CI é o único lugar onde esses estágios de fato executam. Resolve simultaneamente ambiente, regressão e definição de pronto: os itens do AGENTS.md deixam de ser promessas e viram checks de PR. E o fork Moonlight V+ já tem pipeline funcional na mesma árvore de código, o que reduz muito o risco de partir do zero.

**Como:** Criar .github/workflows/ci.yml. Base: vplus/master:.github/workflows/android-ci.yml, adaptado — o V+ usa flavor `nonRoot`, tem Kotlin e androidTest; o Artemis usa `nonRoot_game`, é Java puro e não tem androidTest. Estrutura em três jobs.

JOB 1 `verify` (PR e push, ubuntu-latest, timeout 45min):
- actions/checkout@v4 com submodules: recursive — obrigatório, moonlight-common-c fornece os .c listados em app/src/main/jni/moonlight-core/Android.mk e sem ele o ndkBuild falha.
- actions/setup-java@v4, distribution temurin, java-version 17 (exigido pelo AGP 8.13.0), cache gradle.
- actions/setup-node@v4 — necessário para validate.mjs e codemap.
- android-actions/setup-android@v3 com packages `platforms;android-36 build-tools;36.0.0 ndk;27.0.12077973`, versões tiradas de app/build.gradle:4,6.
- Passo único de verificação: `node tools/validate.mjs`. Sem --fast, e com SDK presente ele executa os quatro estágios de verdade (codemap --check, jni-check, assembleNonRoot_gameDebug, testNonRoot_gameDebugUnitTest). Isso mantém uma única definição de 'verde', compartilhada entre local e CI — o valor principal desta abordagem sobre replicar os comandos no YAML.
- `./gradlew :app:lintNonRoot_gameDebug` enquanto o lint não for o quinto estágio do validate (ver ideia separada).
- actions/upload-artifact@v4 com if: always() para app/build/reports/tests/**, app/build/reports/lint-results-nonRoot_gameDebug.html e os APKs. O always() é o que torna o CI útil em falha, que é quando os relatórios importam.

JOB 2 `release-check` (só em push para dev/main): `./gradlew :app:assembleNonRoot_gameRelease`. Existe para pegar duas classes de falha que só aparecem em release: regras de keep faltando no proguard-rules.pro (crash de R8 em runtime, invisível no debug) e erros de lintVitalRelease.

JOB 3 `release` (só em tags v*): depende de signingConfigs existir antes (ideia separada). Decodifica o keystore de secret em base64, roda assembleNonRoot_gameRelease com KEYSTORE_PATH/KEYSTORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD no env, publica no GitHub Release com SHA-256 de cada APK.

Usar concurrency com cancel-in-progress (o V+ já faz) e permissions: contents: read no job verify. Remover o appveyor.yml no mesmo PR.

**Risco:** O primeiro run quase certamente falha no lint, que nunca rodou em CI — por isso a baseline de lint deve entrar antes ou no mesmo PR, senão o CI nasce vermelho e passa a ser ignorado, que é o pior desfecho possível. O ndkBuild com 4 ABIs mais LiteRT e OpenCV torna o job lento (15-25 min no primeiro run, menos com cache do Gradle); se incomodar, restringir o assemble do PR a uma ABI com -Pandroid.injected.build.abi=arm64-v8a e deixar as 4 no release-check. Não criar o job de release antes de existir signingConfigs, sob pena de publicar APKs não assinados com o CI verde.

### EPIC — Subir targetSdk para 35 como fundação do resize de teclado

**Tamanho:** epic

**Por quê:** Encadeia duas coisas que parecem separadas e não são. O targetSdk 34 impede a publicação na Play Store desde agosto de 2025 e, ao mesmo tempo, mantém o app fora do enforcement edge-to-edge do Android 15 — o regime em que todo o cálculo de insets muda. Construir o resize do teclado sobre targetSdk 34 e só depois subir significa refazer o trabalho; subir primeiro significa projetar uma vez sobre a base definitiva.

**Como:** Fase 0 — ADR: o AGENTS.md exige ADR para mudar targetSdk, e com razão. Registrar a decisão e o encadeamento com o EPIC do teclado em docs/adr/ antes de qualquer commit de código.

Fase 1 — inventário: subir targetSdk para 35 em app/build.gradle:12 num branch descartável, compilar, rodar e catalogar cada regressão de janela. As candidatas conhecidas estão em Game.java: FLAG_FULLSCREEN e SYSTEM_UI_FLAG_IMMERSIVE_STICKY, que é o que hoje faz o Android ignorar adjustResize. Registrar em docs/epics/E01-teclado-anydesk.md — arquivo que o AGENTS.md já referencia e que ainda não existe.

Fase 2 — migrar para APIs compatíveis: substituir as flags legadas por WindowCompat.setDecorFitsSystemWindows e WindowInsetsControllerCompat. O que torna isso viável com minSdk 21 é que as variantes androidx funcionam em todos os níveis — a regra 2 do AGENTS.md sobre WindowInsets.Type.ime() ser API 30+ vale para a API da plataforma, não para WindowInsetsCompat.

Fase 3 — implementar o resize: OnApplyWindowInsetsListener no StreamContainer lendo WindowInsetsCompat.Type.ime() e ajustando a altura da superfície do stream ao espaço restante. É aqui que o comportamento do AnyDesk é reproduzido.

Fase 4 — validar: testes Robolectric com @Config(sdk = {21, 30, 33, 35}) sobre o cálculo de insets, mais teste manual em dispositivo com Gboard, com teclado físico e com display externo (ExternalDisplayControlActivity é um caminho paralelo que tende a ser esquecido).

Fase 5 — subir para 36, já que o prazo da Play Store para API 36 é 31/08/2026.

**Risco:** Alto, concentrado na Fase 2. Game.java tem 4.349 linhas e fan-out 44; o gerenciamento de janela está entrelaçado com ciclo de vida, overlays e virtual controller. Edge-to-edge afeta todas as activities, não só o stream — PcView, AppView e as telas de preferência também. Mitigações: inventário da Fase 1 em branch descartável antes de qualquer commit real; consultar docs/maps/HOTSPOTS.md e query.mjs --callers antes de tocar Game.java; e ter o CI já funcionando, porque este é precisamente o tipo de mudança em que a suíte de testes é a única defesa contra regressão silenciosa. O AGENTS.md também manda usar plan mode para flags de janela em Game.java — aplicável integralmente aqui.


## Glossário

- flavor dimension "root": única dimensão de product flavor do projeto (app/build.gradle:21). Não tem relação com o diretório raiz — separa a build para dispositivos rooteados da build normal.
- nonRoot_game: o flavor principal e o que interessa ao dono do fork. applicationId com.limelight, sem limite de SDK. Nomes de tarefa derivam dele com a primeira letra maiúscula: assembleNonRoot_gameDebug, testNonRoot_gameDebugUnitTest, lintNonRoot_gameDebug. O underscore faz parte do nome e é fonte recorrente de erro — appveyor.yml:17 usa o nome do upstream (nonRoot) e por isso nunca acha o artefato.
- root (flavor): build para dispositivos rooteados, applicationId com.limelight.root, limitada a maxSdk 25 porque o Android O trouxe captura de mouse nativa. É o único flavor que compila o binário evdev_reader — app/src/main/jni/evdev_reader/Android.mk usa ifeq (root,$(PRODUCT_FLAVOR)).
- game (source set): diretório app/src/game/ que NÃO corresponde a nenhum flavor ou buildType existente. Nunca é mesclado em build algum. Resíduo do layout do upstream; editar lá não tem efeito e não gera erro.
- .noir / .noirdebug: applicationIdSuffix de release e debug (app/build.gradle:137, :98). O AGENTS.md proíbe alterá-los — remover o sufixo faria o fork colidir com o applicationId oficial do Moonlight, cujo mantenedor recebe os crashes no Play Console dele (comentário longo em app/build.gradle:107-136).
- Diana / Artemis: rótulos de app injetados por resValue. Diana é o build de debug, Artemis o de release (app/build.gradle:99-101, :138-140). Aparecem como nome no launcher, permitindo ter os dois instalados lado a lado.
- ndkBuild: o sistema de build nativo deste projeto — Android.mk e Application.mk, NÃO CMake. Adicionar um .c novo exige editá-lo à mão em app/src/main/jni/moonlight-core/Android.mk:12-41; não há glob. Trocar por CMake exige ADR segundo o AGENTS.md.
- PRODUCT_FLAVOR: variável passada do Gradle ao ndkBuild via externalNativeBuild.ndkBuild.arguments (app/build.gradle:35, :50). É como o makefile do evdev_reader sabe se deve compilar.
- APP_SUPPORT_FLEXIBLE_PAGE_SIZES: flag em app/src/main/jni/Application.mk:7 que alinha as bibliotecas nativas para páginas de 16 KB — requisito de compatibilidade do Android 15 em ARM64. Não mexer sem entender a implicação.
- splits.abi: gera um APK por arquitetura em vez de um APK gordo (app/build.gradle:153-159). Reduz o download mas multiplica os artefatos por 4 e exige versionCode distinto por ABI para a Play Store — o que este projeto não faz.
- ndk.debugSymbolLevel = 'FULL': gera símbolos nativos completos (app/build.gradle:18) para que o Play Console consiga simbolicar crashes em C. Aumenta o tempo de build e o tamanho dos outputs intermediários.
- Shadow (Robolectric): classe anotada com @Implements que substitui o comportamento de outra em tempo de teste — o mecanismo que permite rodar código Android na JVM. ShadowMoonBridge existe exclusivamente para anular o System.loadLibrary que causaria UnsatisfiedLinkError sem NDK.
- robolectric.properties: configuração de shadows e SDK padrão, lida do CLASSPATH de teste (app/src/test/resources/). Um arquivo com esse nome em qualquer outro lugar — inclusive na raiz do repositório, que é onde ele está hoje — é silenciosamente ignorado.
- tools/validate.mjs: o gate do fork, prescrito pelo AGENTS.md como definição de pronto. Quatro estágios em ordem — codemap --check, jni-check, assembleNonRoot_gameDebug, testNonRoot_gameDebugUnitTest. `--fast` pula os que precisam de Android SDK. Não cobre lint. Quando pula estágios, avisa quais (linhas 105-107) — esse aviso é o que impede reportar como verificado o que não rodou.
- tarefa agregadora `test`: tarefa sintética criada em build.gradle:21-32 que faz dependsOn de toda tarefa *UnitTest de todos os variants. `./gradlew test` executa a suíte 4 vezes (2 flavors × 2 buildTypes). Preferir sempre :app:testNonRoot_gameDebugUnitTest, que é o que o AGENTS.md e o validate.mjs usam.
- lintVitalRelease: tarefa que o AGP roda automaticamente em assembleRelease, verificando apenas issues de severidade fatal. É a razão pela qual um erro de lint pode quebrar o release sem ter quebrado nenhum build de debug.
- lint baseline: arquivo XML que registra os problemas de lint existentes para que só os novos falhem o build. Sem ele, 'não introduzir avisos novos' não é verificável, porque não há referência de 'antigo'. Este projeto não tem baseline.
- -dontobfuscate: diretiva em proguard-rules.pro:2 que faz o R8 apenas encolher, sem renomear classes. Stack traces de produção permanecem legíveis, mas as regras -keep continuam necessárias para reflexão, JNI e Gson.
- moonlight-common-c: submódulo git (app/src/main/jni/moonlight-core/moonlight-common-c) com a implementação do protocolo, apontando para o fork ClassicOldSong e fixado em c999436. O AGENTS.md proíbe editá-lo — divergir do upstream complica os merges. Ler é livre.
- vendorizadas: openssl/, libopus/, enet/ e reedsolomon/ — código de terceiros copiado para dentro do repo. O AGENTS.md proíbe editá-las. Efeito colateral a ter em mente: a proibição também faz ninguém olhar para lá, e é onde está a OpenSSL EOL.
- Apollo / Vibeshine: forks do Sunshine no lado host. Apollo é o par oficial do Artemis; Vibeshine é o que o dono do fork usa, com display virtual automático. Virtual display, server commands e clipboard sync exigem Apollo e ficam inativos no Vibeshine.
- Moonlight V+ (qiin2333): outro fork Android, disponível como remote `vplus` neste repositório. É o cliente que o dono usava antes e o único fork da árvore com CI em GitHub Actions funcional (vplus/master:.github/workflows/android-ci.yml) — referência direta para o pipeline proposto. Atenção: o V+ usa flavor `nonRoot` (sem _game), tem Kotlin e tem androidTest; o Artemis não.
- Obtainium: gerenciador de apps Android que instala direto de GitHub Releases. A URL embutida em app/build.gradle:57 configura o filtro de APK do fork (apkFilterRegEx nonRoot), que hoje casa com as 4 ABIs simultaneamente.
- codemap: gerador de mapas em tools/codemap/codemap.mjs, que produz docs/maps/. Requer Node (v24 no ambiente). `--check` falha se os mapas estiverem defasados — ótimo portão de CI porque não depende de JDK nem de Android SDK. Consultar com query.mjs em vez de ler SYMBOLS.md (215 KB) ou code-index.json inteiros.
- branch e remotes: o checkout local está em `dev`, a branch de trabalho declarada no AGENTS.md. Remotes: origin (Rafael-CN), upstream (ClassicOldSong/Artemis), moonlight (moonlight-stream original) e vplus (Moonlight V+, fonte de ideias e do workflow de CI de referência).
