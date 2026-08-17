# Guia — Publicar uma release

## Como funciona

Empurrar uma tag `v*` dispara `.github/workflows/release.yml`, que compila, roda os testes,
valida a fronteira JNI e publica os APKs por ABI na página de releases.

```bash
git tag -a v20.2.6-vibe.1 -m "Teclado utilizável durante o stream"
git push origin v20.2.6-vibe.1
```

Também dá para disparar manualmente pela aba Actions, informando a tag.

## Assinatura

Sem os secrets configurados, o workflow compila com a chave de **debug** e marca a release
como **rascunho**. Isso instala e serve para testar, mas tem duas consequências: qualquer um
pode gerar um APK com a mesma assinatura, e você não consegue atualizar por cima de uma
versão assinada de verdade sem desinstalar antes (perdendo os dados do app).

### Gerar a keystore

Uma vez só. **Guarde o arquivo e as senhas** — perder a chave significa que ninguém mais
consegue atualizar o app instalado, só reinstalar do zero.

```bash
keytool -genkeypair -v -keystore vibeartemis.jks -keyalg RSA -keysize 4096 -validity 10000 -alias vibeartemis
```

### Configurar os secrets

Converta a keystore para base64:

```bash
base64 -w0 vibeartemis.jks > keystore.b64
```

Em **Settings → Secrets and variables → Actions**, crie:

| Secret | Conteúdo |
|---|---|
| `KEYSTORE_BASE64` | o conteúdo de `keystore.b64` |
| `KEYSTORE_PASSWORD` | a senha da keystore |
| `KEY_ALIAS` | `vibeartemis` |
| `KEY_PASSWORD` | a senha da chave |

**Nunca commite o `.jks` nem o base64.** O `.gitignore` já cobre `key/`, mas o cuidado é seu.

## Versionamento

`app/build.gradle` traz `versionName` e `versionCode` herdados do upstream (20.2.6 / 57).
A convenção sugerida para o fork é sufixar a versão do Artemis de origem:

```
v20.2.6-vibe.1    primeira release nossa sobre o Artemis 20.2.6
v20.2.6-vibe.2    seguinte
```

Isso deixa claro de qual base do upstream a release saiu — útil quando o Artemis voltar a
se mexer. Lembre de subir `versionCode` a cada release, ou o Android recusa a atualização.

## Antes de publicar

O workflow já roda os testes e o `jni-check`, mas ele não substitui teste em aparelho.
Especialmente para mudanças de janela, IME ou decodificação: **instale o APK de debug do CI
e use por alguns minutos** antes de marcar uma tag.

Os 5 testes que falham desde o upstream estão registrados em `tools/test-baseline.json` e
não bloqueiam a publicação. Se aparecer uma falha fora dessa lista, o workflow falha —
como deve ser.
