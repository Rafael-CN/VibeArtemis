# Artemis — fork Rafael-CN

Fonte canônica de instruções para agentes. Outras ferramentas leem este arquivo;
`CLAUDE.md` apenas o importa.

Cliente Android de game streaming. Fork de `ClassicOldSong/moonlight-android` (Artemis),
que é fork do Moonlight. **Java + C nativo via JNI. Não há Kotlin.**
63 mil linhas, 213 arquivos de código, pacote raiz `com.limelight`.

## Setup

```bash
git submodule update --init --recursive
node tools/codemap/codemap.mjs        # gera docs/maps/
```

Build exige JDK 17, Android SDK 36 e NDK `27.0.12077973`. **Confira se existem antes de
prometer um build** — se faltarem, siga `docs/guides/setup-ambiente.md` e diga ao usuário.
Nunca reporte como verificado o que você não executou.

## Comandos

```bash
./gradlew assembleNonRoot_gameDebug            # build (flavor padrão)
./gradlew :app:testNonRoot_gameDebugUnitTest   # testes (Robolectric, sem emulador)
./gradlew lint

node tools/validate.mjs                # o gate completo — build, testes, mapas, JNI
node tools/validate.mjs --fast         # só o que não precisa de SDK
node tools/codemap/codemap.mjs         # regerar mapas
node tools/codemap/jni-check.mjs       # integridade da fronteira JNI
node tools/test-hooks.mjs              # testar os hooks
```

## Mapa do repositório

```
app/src/main/java/com/limelight/
  Game.java                 activity do stream — 4.349 linhas, 148 métodos, fan-out 44
  PcView / AppView          lista de hosts / lista de apps
  binding/input/            teclado, gamepad, touch, drivers USB, overlay virtual
  binding/video/            MediaCodec, seleção de decoder, HDR
  binding/audio/ crypto/    áudio; pareamento e certificados
  nvstream/                 protocolo: http/ mdns/ wol/ input/
  nvstream/jni/MoonBridge   ⚠ a fronteira JNI inteira — 34 native, 21 callbacks
  preferences/              PreferenceConfiguration — fan-in 33, o mais dependido
  profiles/ ui/ utils/      perfis por host; StreamView/StreamContainer; utilitários
  computers/ grid/          descoberta e polling de PCs; grade de box art

app/src/main/jni/moonlight-core/
  simplejni.c               implementa os Java_* (Java → C)
  callbacks.c               chama Java de volta (C → Java) ⚠ descritores em string
  moonlight-common-c/       submódulo — NÃO EDITE
  openssl/ libopus/         vendorizadas, .a pré-compilados por ABI

app/src/root/               flavor root apenas (maxSdk 25) — evdev
app/src/test/               15 arquivos, Robolectric
```

## Onde ler antes de mexer

| Se você vai… | Leia antes | Não leia |
|---|---|---|
| achar uma classe ou método | `node tools/codemap/query.mjs --symbol X` | `SYMBOLS.md` inteiro |
| saber quem quebra se eu mudar X | `node tools/codemap/query.mjs --callers X` | `code-index.json` |
| entender um arquivo | `docs/maps/FILE_INDEX.md` (grep) | o arquivo todo, se for god-class |
| mexer na fronteira JNI | `docs/reference/jni.md` + rode `jni-check.mjs` | — |
| mexer em teclado / IME / janela | `docs/epics/E01-teclado-anydesk.md` | — |
| mexer em decoder / latência | `decoder-errata.txt` (raiz) | — |
| adicionar preferência | `docs/howto/adicionar-preferencia.md` | — |
| saber se algo é nosso ou do upstream | subagente `upstream-diff-scout` | histórico git cru |
| saber se a feature exige Apollo | `docs/reference/host-compatibility.md` | — |

`docs/maps/code-index.json` e `docs/maps/SYMBOLS.md` são **banco de dados, não documento**.
Consulte com `tools/codemap/query.mjs`. Lê-los inteiros custa mais contexto que a tarefa.

## Regras duras

1. **JNI não tem checagem em tempo de compilação.** Assinatura divergente compila nos dois
   lados e crasha em runtime. Rode `node tools/codemap/jni-check.mjs` antes e depois.
2. **`minSdk` é 21.** API mais nova exige `Build.VERSION.SDK_INT` ou equivalente `androidx`.
   `WindowInsets.Type.ime()` é API 30+ — use `WindowInsetsCompat`.
3. **Não edite `moonlight-common-c/`** (submódulo) nem `openssl/`, `libopus/`, `enet/`,
   `reedsolomon/` (vendorizadas). Ler é livre.
4. **Não edite `docs/maps/`** — é gerado. Edite o gerador.
5. **Não edite `res/values-*/strings.xml`** (traduções de contribuidores). Só `values/`.
6. **Strings em `strings.xml`**, nunca hardcoded — o app tem ~20 idiomas.
7. **Nem toda feature funciona com todo host.** Virtual display, server commands e clipboard
   sync exigem **Apollo**. O dono do fork usa **Vibeshine** (fork do Sunshine).
8. **Não mexa no `applicationId`** nem nos sufixos `.noir`/`.noirdebug`.

## Pergunte antes de

Introduzir Kotlin · trocar ndkBuild por CMake · mudar `minSdk`/`targetSdk` · adicionar
dependência nova · editar submódulo · fazer push · alterar o wrapper do Gradle.
Cada um desses é um ADR em `docs/adr/`, não uma decisão de conveniência.

## Estilo

Siga o arquivo que você está editando. Java antigo e consistente: 4 espaços, chaves na
mesma linha. Comentários explicam **por quê**, não o quê — o upstream faz isso bem, imite
o tom. `Game.java` tem convenções que variam por região; leia o método vizinho.

## Definição de pronto

`node tools/validate.mjs` passando, e:

- [ ] build e testes verdes (ou declarado explicitamente que não puderam rodar)
- [ ] `jni-check` limpo, se tocou a fronteira
- [ ] mapas regerados, se mudou estrutura
- [ ] strings extraídas, se tocou UI
- [ ] `docs/` atualizado, se o entendimento mudou

Documentação desatualizada é pior que ausente, porque é acreditada. Se achar erro em
`docs/`, corrija na hora.

## Subagentes disponíveis

`gradle-ndk-doctor` (build quebrado) · `jni-bridge-auditor` (fronteira JNI) ·
`robolectric-test-runner` (testes) · `diff-adversary` (revisão pré-merge) ·
`native-crash-triage` (crash nativo) · `stream-latency-analyst` (latência, sempre com
medição) · `android-input-specialist` (teclado, IME, insets) ·
`upstream-diff-scout` (proveniência e risco de merge).

Escalonamento: 1 arquivo Java sem fronteira nativa = nenhum subagente. Build quebrado =
`gradle-ndk-doctor`. Mudança cruzando JNI = `gradle-ndk-doctor` → `jni-bridge-auditor` →
`robolectric-test-runner`. Pré-merge = `diff-adversary` + `robolectric-test-runner`.

## Commits

Branch de trabalho: `dev`. Remotes: `origin` (nosso fork), `upstream` (Artemis),
`moonlight` (original), `vplus` (Moonlight V+, fonte de ideias).
Nunca faça push sem o usuário pedir.

## Contexto do dono do fork

Rafael usa host **Vibeshine** com display virtual automático por cliente, e hoje o cliente
**Moonlight V+** no Android. Veio para o Artemis fugindo do excesso de features do V+.

**Dor principal: o teclado.** Quer o comportamento do AnyDesk — (1) o teclado empurra e
redimensiona a tela em vez de cobri-la; (2) um campo de texto que envia o conteúdo inteiro
de uma vez. Boa parte de (2) já existe no código, desligada por padrão.
Ver `docs/epics/E01-teclado-anydesk.md`.
