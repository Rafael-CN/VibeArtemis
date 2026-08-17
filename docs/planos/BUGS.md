# Bugs confirmados por leitura de código

> Defeitos de severidade crítica ou alta, com âncora de arquivo:linha. **Nenhum foi reproduzido em dispositivo** — confirme antes de corrigir.

Cada item tem um código estável. Para começar a trabalhar em um deles, basta
citar o código.

## Índice

| Código | Item | Tamanho |
|---|---|---|
| **B01** | [Loop infinito de configuração do decoder em SoCs NVIDIA e MediaTek](#b01) | small |
| **B02** | [Buffer de 256 bytes no caminho de criptografia do control stream é uma armadilha de stack…](#b02) | small |
| **B03** | [frame_pacing do usuário é sobrescrito incondicionalmente para BALANCED em runtime](#b03) | small |
| **B04** | [enqueueCommitText nunca dispara o flush quando o texto gera mais de um chunk: textos > 51…](#b04) | small |
| **B05** | [Fila de commitText nunca é drenada quando o texto gera mais de um bloco (>512 bytes UTF-8…](#b05) | small |
| **B06** | [Modelo de janela legado (FLAG_FULLSCREEN + IMMERSIVE_STICKY) impede qualquer adjustResize…](#b06) | small |
| **B07** | [Chave privada do cliente, uniqueid e banco de hosts entram no backup de nuvem e no device…](#b07) | small |
| **B08** | [OpenSSL 1.1.1q estaticamente linkado, EOL desde setembro de 2023](#b08) | small |
| **B09** | [targetSdk 34 com compileSdk 36 bloqueia publicação e distorce a base do EPIC do teclado](#b09) | small |
| **B10** | [Activity Game não declara windowSoftInputMode: o teclado virtual sempre cobre o stream](#b10) | small |
| **B11** | [STUN de descoberta de endereço externo só executa quando o usuário está em VPN](#b11) | small |
| **B12** | [Eventos UTF-8 são fragmentados em um pacote ENet por code point, com 50 ms de latência in…](#b12) | small |
| **B13** | [Pacotes de controle 0x3001 (Set Clipboard) e 0x3002 (File transfer nonce) do Apollo são d…](#b13) | small |
| **B14** | [Preferencia errada passada ao AndroidAudioRenderer: playHostAudio ocupa o lugar de enable…](#b14) | small |
| **B15** | [Flick/inércia libera o botão de mouse errado, deixando botão direito/meio preso no host](#b15) | small |
| **B16** | [Coordenadas de toque absoluto e de caneta ignoram o zoom/pan do vídeo](#b16) | small |
| **B17** | [Modo "Track pad (Natural)" na tela ignora sensibilidade e swap de eixo configurados](#b17) | small |
| **B18** | [ACTION_CANCEL no trackpad emulado deixa o botão esquerdo pressionado no host](#b18) | small |
| **B19** | [framePacing escolhido pelo usuário é sobrescrito para BALANCED em todos os casos](#b19) | small |
| **B20** | [Caminho LATEST_ONLY tem a condição invertida e faz bypass do Choreographer, corrompendo o…](#b20) | small |
| **B21** | [Caminho LATEST_ONLY pula doCodecRecoveryIfRequired(), podendo travar a recuperação de cod…](#b21) | small |
| **B22** | [enqueueNsByPtsUs (LongSparseArray) é acessado de duas threads sem sincronização e vaza en…](#b22) | small |
| **B23** | [sendUtf8Text envia Modified UTF-8 (CESU-8), não UTF-8 real — emoji e caracteres do plano…](#b23) | small |
| **B24** | [O 'texto em bloco' não existe no fio: moonlight-common-c fragmenta todo pacote UTF-8 em u…](#b24) | small |
| **B25** | [Penalidade fixa de ~50 ms + espera por ACK em CADA pacote UTF-8, inclusive em hosts Sunsh…](#b25) | small |
| **B26** | [Chave do JoyCon fix divergente entre XML e código: toggle inerte](#b26) | small |
| **B27** | [checkbox_forceTightThresholds é uma preferência 100% morta, lida por reflection sobre um…](#b27) | small |
| **B28** | [OverlaySharedPreferences.edit() grava na base: escritas feitas com perfil ativo são silen…](#b28) | small |
| **B29** | [Perfil é snapshot completo das prefs globais, não delta — inclui lixo de runtime e congel…](#b29) | small |
| **B30** | [Não existe preferência nem suporte para redimensionar o stream quando o IME abre](#b30) | small |
| **B31** | [Gamepads dos drivers USB anunciam supportedButtonFlags = 0 ao host](#b31) | small |
| **B32** | [AnalogStickFree e keyAnalogStickFree nao tratam ACTION_CANCEL: stick trava pressionado](#b32) | small |
| **B33** | [PreferenceConfiguration.readPreferences() e chamado dentro de onDraw() de elementos do OSC](#b33) | small |
| **B34** | [DigitalPad.rotateDrawable() aloca dois Bitmaps e um Canvas por frame desenhado](#b34) | small |
| **B35** | [Overlay de stick-para-teclado dispara 4 KeyEvents por amostra de toque, sem deteccao de m…](#b35) | small |
| **B36** | [VirtualController le SharedPreferences a cada evento de entrada do OSC](#b36) | small |
| **B37** | [Game.java é uma god-class de 4348 linhas implementando 12 interfaces](#b37) | small |
| **B38** | [A janela do Game é configurada de forma que o IME nunca pode redimensionar o stream (caus…](#b38) | small |
| **B39** | [onSystemUiVisibilityChange reimpõe immersive sticky 2s depois, brigando com o IME](#b39) | small |
| **B40** | [Game.onStop() chama finish() incondicionalmente e a Activity é noHistory+singleTask](#b40) | small |
| **B41** | [Bug no agendamento do flush de commitText: textos com mais de um chunk nunca são enviados](#b41) | small |
| **B42** | [ui/StreamView.java é código morto, mas é a única classe coberta pelo teste de commitText](#b42) | small |
| **B43** | [Sete idiomas traduzidos são inalcançáveis: values-bg, values-pl, values-tr, values-pt, va…](#b43) | small |
| **B44** | [App sem android:supportsRtl apesar de ter locale hebraico ativo](#b44) | small |
| **B45** | [Dead keys e composição de IME são descartadas silenciosamente — impossível digitar acento…](#b45) | small |
| **B46** | [Flag SS_KBE_FLAG_NON_NORMALIZED é calculada independentemente de forceQwerty — cliente me…](#b46) | small |
| **B47** | [Teclas com mapeamento normalizado mas fora do switch são descartadas em vez de usar o fal…](#b47) | small |
| **B48** | [UTF8_CHUNK_SIZE = 512 excede MAX_INPUT_PACKET_SIZE = 128 do moonlight-common-c (stack ove…](#b48) | small |
| **B49** | [Preferência ignoreSynthEvents desativa TODOS os teclados virtuais próprios e o Accessibil…](#b49) | small |
| **B50** | [Não existe nenhum campo de entrada de texto (EditText) em toda a UI de streaming](#b50) | small |
| **B51** | [enqueueCommitText nunca inicia o dreno quando o texto gera 2+ chunks — texto longo fica p…](#b51) | small |
| **B52** | [Bloqueio da dor #1 do dono: activity .Game sem windowSoftInputMode e com IMMERSIVE_STICKY…](#b52) | small |
| **B53** | [Divergência de submódulo moonlight-common-c torna impossível portar qualquer feature de p…](#b53) | small |
| **B54** | [ContentProvider exportado sem permissao permite path traversal e leitura do cache por qua…](#b54) | small |
| **B55** | [PcView exportada aceita pin/passphrase por Intent e dispara pareamento automatico sem con…](#b55) | small |
| **B56** | [AccessibilityService declara leitura de conteudo de tela para uma funcao que so precisa f…](#b56) | small |
| **B57** | [Downgrade silencioso para HTTP em texto claro quando o certificado fixado nao confere](#b57) | small |
| **B58** | [StreamView.java é código morto mas o CLAUDE.md aponta para ele como o caminho do commit-t…](#b58) | small |
| **B59** | [Activity Game não declara windowSoftInputMode e não observa insets de IME — bloqueio raiz…](#b59) | small |
| **B60** | [O único teste do envio de texto inteiro cobre uma classe morta](#b60) | small |
| **B61** | [Três implementações duplicadas do mesmo InputConnection de commitText](#b61) | small |
| **B62** | [Configuração de shadows do Robolectric fora do classpath — nunca é lida](#b62) | small |
| **B63** | [Repositório sem nenhum CI; o único arquivo de pipeline é herança quebrada do upstream](#b63) | small |
| **B64** | [AppVeyor publica um artefato de lint com nome de flavor inexistente](#b64) | small |

---

## B01

### Loop infinito de configuração do decoder em SoCs NVIDIA e MediaTek

**Tamanho:** small · **Severidade:** critical · **Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:541 e :672 (loop em MediaCodecDecoderRenderer.java:756)`

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

O loop `for (int tryNumber = 0;; tryNumber++)` em initializeDecoder() só termina quando tryConfigureDecoder() tem sucesso OU quando setDecoderLowLatencyOptions() retorna false (`if (!newFormat) return -5;`). Porém o bloco NVIDIA (MediaCodecHelper.java:541-547) não tem nenhum guard de `tryNumber` e faz `setNewOption = true` incondicionalmente; e no bloco MediaTek a linha `setNewOption = true;` (:672) está FORA do `if (tryNumber < 4)` (:637). Em qualquer decoder omx.nvidia/c2.nvidia/omx.mtk/c2.mtk, setNewOption é sempre true, então se o configure() nunca tiver sucesso (Surface inválido, resolução não suportada, decoder ocupado) o loop roda para sempre criando e destruindo instâncias de MediaCodec. Como initializeDecoder() é chamado tanto de setup() quanto do caminho de recuperação (:905), isso trava a thread de conexão ou a thread que estiver fazendo a recuperação, com log 'Decoder configuration try: N' crescendo sem fim.

**Plano de implementação**

Envolver o bloco NVIDIA em `if (tryNumber < N)` e mover `setNewOption = true;` do MTK para dentro do `if (tryNumber < 4)`. Adicionalmente, colocar um teto absoluto no loop de initializeDecoder (ex.: `if (tryNumber > 8) return -5;`) como rede de segurança.

**Risco**

Severidade critical.

---

## B02

### Buffer de 256 bytes no caminho de criptografia do control stream é uma armadilha de stack smash para qualquer tentativa de enviar texto em bloco

**Tamanho:** small · **Severidade:** critical · **Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c:704`

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

`sendMessageEnet` monta o pacote em claro dentro de `char tempBuffer[256]` na pilha e faz `memcpy(&packet[1], payload, paylen)` em ControlStream.c:727. A única proteção é `LC_ASSERT(sizeof(*packet) + paylen < sizeof(tempBuffer))` em ControlStream.c:723 — e `LC_ASSERT` expande para `assert()` (Platform.h:96), que é anulado por NDEBUG em release, já que `-DLC_DEBUG` só é passado quando `NDK_DEBUG=1` (Android.mk:52-54). Hoje isso nunca dispara porque o splitter por code point garante paylen <= 12, mas é exatamente o código que alguém vai remover ao implementar 'mandar o texto inteiro num pacote'. Com `NVCTL_ENET_PACKET_HEADER_V2` de 4 bytes, o teto seguro é paylen <= 251, ou seja `PACKET_SIZE(holder) <= 251` → texto UTF-8 <= 243 bytes. No caminho legado não-encriptado (GFE < 7.1.431), o teto é ainda menor: `MAX_INPUT_PACKET_SIZE` = 128 (InputStream.c:43, buffer em InputStream.c:254).

**Plano de implementação**

Antes de qualquer feature de 'texto em bloco': (1) aumentar `tempBuffer` para o tamanho máximo real de pacote ou alocar dinamicamente; (2) trocar o LC_ASSERT por uma checagem de runtime que retorna false e loga; (3) adicionar validação de tamanho em LiSendUtf8TextEvent (InputStream.c:1005) rejeitando payloads acima do teto negociado. Documentar o teto de 243 bytes/pacote em qualquer design de extensão de protocolo.

**Risco**

Severidade critical.

---

## B03

### frame_pacing do usuário é sobrescrito incondicionalmente para BALANCED em runtime

**Tamanho:** small · **Severidade:** critical · **Local:** `app/src/main/java/com/limelight/Game.java:692-703`

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

Game.java executa `prefConfig.framePacing = PreferenceConfiguration.FRAME_PACING_BALANCED;` nos DOIS ramos do if (preferLowerDelays true e false), logo após o valor ter sido corretamente lido de `frame_pacing` em PreferenceConfiguration.java:637-666. Com isso os modos 'latency' (FRAME_PACING_MIN_LATENCY, default), 'cap-fps' e 'smoothness' nunca chegam ao MediaCodecDecoderRenderer, que decide política de release por prefs.framePacing (MediaCodecDecoderRenderer.java:1136,1182,1284-1296). A ListPreference `frame_pacing` (preferences.xml:53-60) fica cosmética; só o efeito colateral warp/warp2 (framePacingWarpFactor, PreferenceConfiguration.java:863-868 → Game.java:775-777) e a checagem de cap-fps em Game.java:757-765 (que também é reescrita para BALANCED) sobrevivem parcialmente.

**Plano de implementação**

Remover as duas atribuições de prefConfig.framePacing em Game.java:696 e 702; fazer preferLowerDelays apenas configurar decoderRenderer.setPreferLowerDelays()/setPreferLowerDelaysTimeoutUs() e manter o framePacing lido da preferência. Se a intenção era que pref_low_latency_frame_balance implique BALANCED, aplicar somente quando prefConfig.framePacing == FRAME_PACING_MIN_LATENCY e documentar no summary da preferência.

**Risco**

Severidade critical.

---

## B04

### enqueueCommitText nunca dispara o flush quando o texto gera mais de um chunk: textos > 512 bytes são silenciosamente descartados

**Tamanho:** small · **Severidade:** critical · **Local:** `app/src/main/java/com/limelight/Game.java:4331`

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

enqueueCommitText (Game.java:4314) fatia o texto em chunks de 512 bytes e os adiciona a commitTextQueue; no final, só agenda o flush com 'if (commitTextQueue.size() == 1) { commitTextHandler.post(flushCommitTextQueue); }'. Se a fila estava vazia e uma única chamada produz 2 ou mais chunks (qualquer texto acima de 512 bytes UTF-8 — colagem, ditado longo, teclado com predição agressiva), size() vale 2+ e o Runnable NUNCA é postado: o texto fica parado na fila e nada é enviado ao host. Só volta a fluir se uma próxima chamada por acaso deixar a fila com exatamente 1 elemento, o que é improvável. Isso corta pela raiz justamente a feature de 'enviar texto inteiro pela conexão'.

**Plano de implementação**

Trocar a condição por um flag booleano de 'flush agendado' ou simplesmente por 'if (!flushScheduled) { flushScheduled = true; commitTextHandler.post(flushCommitTextQueue); }', limpando o flag quando a fila esvazia dentro de flushCommitTextQueue (Game.java:317-330). Alternativa mínima: guardar o tamanho da fila antes do loop e postar se 'sizeAntes == 0'. Adicionar teste unitário cobrindo payloads de 1, 512, 513 e 5000 bytes.

**Risco**

Severidade critical.

---

## B05

### Fila de commitText nunca é drenada quando o texto gera mais de um bloco (>512 bytes UTF-8) — e trava permanentemente

**Tamanho:** small · **Severidade:** critical · **Local:** `app/src/main/java/com/limelight/Game.java:4331`

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

`enqueueCommitText()` fatia o texto em N blocos e depois faz `if (commitTextQueue.size() == 1) commitTextHandler.post(flushCommitTextQueue);`. Se o texto produzir 2+ blocos, `size()` nunca é 1 no momento do teste, o Runnable NUNCA é postado e nada é enviado. Pior: a fila fica permanentemente com itens residuais, de modo que qualquer commit posterior (mesmo de 1 bloco) também falha na condição `size() == 1` — o recurso de commitText fica morto até o fim da sessão. Isso mata exatamente o caso de uso 'enviar texto inteiro em bloco' que o dono do fork quer.

**Plano de implementação**

Substituir o contador pela flag de agendamento: adicionar `private boolean commitFlushScheduled = false;` e usar `if (!commitFlushScheduled) { commitFlushScheduled = true; commitTextHandler.post(flushCommitTextQueue); }`; no Runnable (Game.java:317-331), setar `commitFlushScheduled = false` quando a fila esvaziar e mantê-la true ao reagendar. Alternativa mínima: trocar por `if (!commitTextHandler.hasCallbacks(flushCommitTextQueue))` (API 29+) ou simplesmente `commitTextHandler.removeCallbacks(flushCommitTextQueue); commitTextHandler.post(flushCommitTextQueue);`.

**Risco**

Severidade critical.

---

## B06

### Modelo de janela legado (FLAG_FULLSCREEN + IMMERSIVE_STICKY) impede qualquer adjustResize/insets do IME

**Tamanho:** small · **Severidade:** critical · **Local:** `app/src/main/java/com/limelight/Game.java:357`

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

onCreate adiciona `FLAG_FULLSCREEN` e `SYSTEM_UI_FLAG_LAYOUT_STABLE|LAYOUT_HIDE_NAVIGATION|LAYOUT_FULLSCREEN` (357-367) mais `FLAG_LAYOUT_IN_SCREEN` (369); o Runnable `hideSystemUi` (1646-1669) reaplica `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` e é re-agendado por `onSystemUiVisibilityChange` a cada 2000 ms sempre que as flags caem (3914-3928). Existe um TODO explícito na linha 1649 ('Do we want to use WindowInsetsController here on R+ instead of SYSTEM_UI_FLAG_IMMERSIVE_STICKY?') que nunca foi implementado. Nenhum `setDecorFitsSystemWindows`, `OnApplyWindowInsetsListener` ou `WindowInsetsCompat.Type.ime()` existe em Game.java — só em ExternalDisplayControlActivity.java:169-176. Consequência: mesmo declarando adjustResize, o IME continuaria sobrepondo, e o loop de immersive-sticky brigaria com o teclado (que em immersive é tratado como barra transitória).

**Plano de implementação**

Migrar Game.java para o modelo moderno: (1) `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`; (2) trocar `hideSystemUi` por `WindowInsetsControllerCompat.hide(WindowInsetsCompat.Type.systemBars())` + `setSystemBarsBehavior(BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)` — NUNCA esconder `Type.ime()`; (3) suprimir o re-agendamento de `hideSystemUi` enquanto `insets.isVisible(Type.ime())` for true; (4) copiar o padrão já existente em ExternalDisplayControlActivity.java:169-176.

**Risco**

Severidade critical.

---

## B07

### Chave privada do cliente, uniqueid e banco de hosts entram no backup de nuvem e no device-transfer

**Tamanho:** small · **Severidade:** critical · **Local:** `app/src/main/AndroidManifest.xml:48`

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

`android:allowBackup="true"` esta ativo e as duas regras de backup excluem apenas o dominio `sharedpref`: `backup_rules.xml:4` (`<exclude domain="sharedpref" path="."/>`) e `backup_rules_s.xml` (mesma exclusao em `cloud-backup` e `device-transfer`). Como `AndroidCryptoProvider` grava `files/client.key` em PKCS#8 DER puro (AndroidCryptoProvider.java:61-62,:181) e `IdentityManager` grava `files/uniqueid` (IdentityManager.java:15,:61), e como `ComputerDatabaseManager` cria `databases/computers4.db` com os certificados fixados dos hosts (ComputerDatabaseManager.java:26,:49,:129), todos esses artefatos sao copiados para o Google Drive do usuario e transferidos em uma migracao de aparelho. A chave privada e a unica credencial de autenticacao do cliente contra o host: quem a obtem se autentica como esse cliente pareado, sem PIN. O comentario nas regras ('Don't sync preferences because it often contains device-specific data') mostra que a intencao era o oposto do efeito. Ironicamente, o que foi excluido (preferencias) e o que menos importa, e o que ficou incluido (chave privada) e o que mais importa.

**Plano de implementação**

Excluir explicitamente os artefatos de identidade em ambos os arquivos de regra: em `backup_rules.xml`, adicionar `<exclude domain="file" path="client.key"/>`, `<exclude domain="file" path="client.crt"/>`, `<exclude domain="file" path="uniqueid"/>` e `<exclude domain="database" path="computers4.db"/>`; replicar em `backup_rules_s.xml` dentro de `<cloud-backup>` e `<device-transfer>`. Alternativa mais forte: mover a chave privada para o Android Keystore (`KeyGenParameterSpec` com `setUserAuthenticationRequired(false)` e alias dedicado) — mas isso exige um caminho de migracao, porque o par existente precisa continuar valido para os hosts ja pareados; sem migracao o usuario perde todos os pareamentos.

**Risco**

Severidade critical.

---

## B08

### OpenSSL 1.1.1q estaticamente linkado, EOL desde setembro de 2023

**Tamanho:** small · **Severidade:** critical · **Local:** `app/src/main/jni/moonlight-core/openssl/include/openssl/opensslv.h:43`

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

Os .a de libcrypto/libssl commitados no repositório (22 MB, 4 ABIs) são da OpenSSL 1.1.1q, de 05/07/2022. A linha 1.1.1 chegou a fim de vida em 11/09/2023 e o binário está preso várias correções atrás do último release da série (1.1.1w), incluindo CVE-2023-0286 (type confusion em GENERAL_NAME_cmp ao comparar endereços X.400, severidade alta), CVE-2023-0215 (use-after-free em BIO_new_NDEF), CVE-2023-2650 (DoS em OBJ_obj2txt), CVE-2023-3446 e CVE-2023-3817 (DoS em DH_check) e CVE-2023-5678. Esta é a base criptográfica do pareamento e do canal de controle com o host. Agravante de auditoria: os binários entraram no repositório sem nenhum registro de proveniência — não há README, checksum, script de build nem tag da versão de origem; o único indício da versão é o header. Não há como um agente ou revisor verificar como foram produzidos. O AGENTS.md classifica openssl/ como vendorizada e proíbe edição, o que está certo como regra de higiene, mas tem o efeito colateral de tornar a defasagem invisível — ninguém olha para lá.

**Plano de implementação**

Curto prazo: criar app/src/main/jni/moonlight-core/openssl/PROVENANCE.md registrando versão, origem, data e SHA-256 de cada .a, e abrir issue de atualização. Prazo real: migrar para OpenSSL 3.x ou BoringSSL com script de build reprodutível (docker + NDK) versionado em tools/, gerando os .a em CI em vez de commitá-los. Verificar antes se moonlight-common-c usa APIs removidas na 3.x (RSA/EVP legadas) — o upstream do moonlight-common-c já enfrentou essa migração e é a melhor fonte de comparação.

**Risco**

Severidade critical.

---

## B09

### targetSdk 34 com compileSdk 36 bloqueia publicação e distorce a base do EPIC do teclado

**Tamanho:** small · **Severidade:** critical · **Local:** `app/build.gradle:12`

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

O projeto compila contra a API 36 mas declara targetSdk 34. Isso tem duas consequências independentes. (1) Distribuição: a Play Console exige API 35 para novos envios e atualizações desde 31/08/2025, e sobe para 36 em 31/08/2026 — o app é impublicável hoje. (2) E esta é a mais importante para o dono do fork: targetSdk 34 mantém o app FORA do enforcement edge-to-edge do Android 15. Quando o targetSdk subir para 35, o Android passa a desenhar por baixo das barras de sistema por padrão, setDecorFitsSystemWindows deixa de ser respeitado e todo o cálculo de insets/IME muda. Qualquer solução de 'empurrar o stream quando o teclado abre' construída sobre targetSdk 34 tem grande chance de quebrar no salto para 35. A ordem correta é subir o targetSdk primeiro e só então projetar o redimensionamento — não o inverso. Nota de processo: o AGENTS.md lista 'mudar minSdk/targetSdk' entre os itens que exigem ADR, o que é acertado — este achado é justamente o insumo desse ADR, não autorização para mudar direto.

**Plano de implementação**

Tratar a subida de targetSdk como pré-requisito (não sequela) do EPIC do teclado, via ADR em docs/adr/. Passo 1: subir para 35 em branch descartável, rodar o app e catalogar as regressões de inset/fullscreen em Game.java. Passo 2: substituir FLAG_FULLSCREEN e SYSTEM_UI_FLAG_IMMERSIVE_STICKY por WindowInsetsControllerCompat + WindowCompat.setDecorFitsSystemWindows(window, false), que é a API compatível com minSdk 21 via androidx. Passo 3: implementar o resize por ime() insets sobre essa base. Adicionar teste Robolectric com @Config(sdk = {30, 34, 35}) cobrindo o cálculo de insets.

**Risco**

Severidade critical.

---

## B10

### Activity Game não declara windowSoftInputMode: o teclado virtual sempre cobre o stream

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/AndroidManifest.xml:193`

**Subsistema:** UI, Recursos e Internacionalização, Entrada de Teclado — ver [referência](../reference/ui-e-i18n.md), [referência](../reference/input-teclado.md)

> Levantado de forma independente por 2 análises.

**Por quê**

A <activity android:name=".Game"> (linhas 193-216) não declara android:windowSoftInputMode. Combinada com as flags legadas SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | SYSTEM_UI_FLAG_IMMERSIVE_STICKY aplicadas em Game.java:1652-1667, a janela nunca é redimensionada quando o IME aparece. Não existe nenhum setOnApplyWindowInsetsListener na Game (o único do repo está em ExternalDisplayControlActivity.java:171). Resultado: o teclado sobe por cima da imagem do stream, escondendo exatamente a região onde o usuário está digitando. Esta é literalmente a dor nº1 relatada pelo dono do fork (comportamento AnyDesk).

**Plano de implementação**

Adicionar android:windowSoftInputMode="adjustResize" na .Game e, em Game.onCreate (após setContentView na linha 378), instalar ViewCompat.setOnApplyWindowInsetsListener no findViewById(android.R.id.content) que leia insets.getInsets(WindowInsetsCompat.Type.ime()).bottom e aplique como bottom padding no root FrameLayout. Como StreamContainer.onMeasure (StreamContainer.java:114-150) já implementa fit por aspect ratio, o stream vai se re-letterboxar sozinho no espaço restante. Em API 30+, preferir WindowCompat.setDecorFitsSystemWindows(false) + WindowInsetsControllerCompat em vez de setSystemUiVisibility, e usar WindowInsetsAnimationCompat para acompanhar a animação do teclado. Gate atrás de uma nova preferência (ex.: checkbox_resize_on_ime) para não regredir quem prefere o overlay.

**Risco**

Severidade high.

---

## B11

### STUN de descoberta de endereço externo só executa quando o usuário está em VPN

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/computers/ComputerManagerService.java:333-392`

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

Todo o corpo de populateExternalAddress() está aninhado dentro de `if (activeNetworkIsVpn)` (abre em :340, fecha em :391). A requisição STUN em :369-376 é guardada por `if (!activeNetworkIsVpn || boundToNetwork)` — condição escrita para ser avaliada FORA do if externo (o comentário em :368 diz literalmente 'Perform the STUN request if we're not on a VPN or if we bound to a network'). Dentro do bloco, `!activeNetworkIsVpn` é sempre false, então em Wi-Fi/Ethernet normal (o caso comum) a função é um no-op e `details.remoteAddress` nunca é populado por STUN.

**Plano de implementação**

Desaninhar: manter apenas o bloco de bind de rede (:347-366) dentro de `if (activeNetworkIsVpn)`, e mover a requisição STUN (:368-376), o unbind (:378-385) e o unlock (:387-390) para o escopo do método, como no upstream do moonlight-android. Adicionar um log em ambos os ramos para verificar em campo.

**Risco**

Severidade high.

---

## B12

### Eventos UTF-8 são fragmentados em um pacote ENet por code point, com 50 ms de latência inicial

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:591-651`

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

LiSendUtf8TextEvent (:1005) enfileira a string inteira num único PACKET_HOLDER, mas a thread de envio detecta o magic UTF8_TEXT_EVENT_MAGIC e, antes de enviar, chama flushInputOnControlStream(), faz busy-wait de 10 ms enquanto isControlDataInTransit() e dorme PltSleepMs(50) fixos; depois envia um pacote confiável separado para CADA code point (:610-648). Um texto de 60 caracteres custa ~50 ms de setup + 60 round-trips ENet confiáveis. Isso é o motivo direto de a digitação por teclado virtual/swipe parecer lenta e é o obstáculo técnico do requisito 'enviar o texto inteiro de uma vez'. A camada Java já tenta mitigar fatiando em blocos de 512 bytes com 15 ms de intervalo (Game.java:312-331, 4314-4334), mas isso só multiplica o número de janelas de 50 ms.

**Plano de implementação**

No fork de moonlight-common-c, empacotar múltiplos code points por pacote respeitando UTF8_TEXT_EVENT_MAX_COUNT (Input.h:33, hoje 32 bytes) e a fronteira de code point, aplicando o comportamento antigo (1 code point por pacote) apenas quando !IS_SUNSHINE() (Limelight-internal.h:86) — o hack de sincronização foi escrito explicitamente para o GFE. Adicionalmente, aplicar o sleep de 50 ms uma vez por rajada e não por chamada, e aumentar UTF8_TEXT_EVENT_MAX_COUNT para hosts Apollo se o parser do host suportar.

**Risco**

Severidade high.

---

## B13

### Pacotes de controle 0x3001 (Set Clipboard) e 0x3002 (File transfer nonce) do Apollo são declarados mas não tratados, disparando LC_ASSERT(false)

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c:1021-1095`

**Subsistema:** Rede, Protocolo e Descoberta de Hosts — ver [referência](../reference/rede.md)

**Por quê**

needsAsyncCallback() retorna true para packetTypes[IDX_SET_CLIPBOARD] e packetTypes[IDX_FILE_TRANSFER_NONCE_REQUEST] (:1027-1028), que na tabela Gen7Enc valem 0x3001 e 0x3002 (extensões Apollo, :234-236). Porém a cadeia if/else de queueAsyncCallback() (:1046-1089) não tem ramo para nenhum dos dois, caindo no `else { LC_ASSERT(false); free(queuedCb); return; }` (:1090-1095). Em build de debug isso aborta; em release o pacote é silenciosamente descartado. Ou seja, se o host Apollo/Vibeshine empurrar o clipboard pelo control stream, o cliente ignora — e o app é forçado a fazer polling HTTP de /actions/clipboard.

**Plano de implementação**

Implementar os ramos faltantes em queueAsyncCallback() e as callbacks correspondentes em CONNECTION_LISTENER_CALLBACKS, expondo-as ao Java via MoonBridge (ex.: `bridgeClipboardReceived(String)`), e então remover a necessidade do getClipboard() por foco em Game.java:2233-2243. Se não for implementar agora, remover os dois tipos de needsAsyncCallback() para não disparar o assert.

**Risco**

Severidade high.

---

## B14

### Preferencia errada passada ao AndroidAudioRenderer: playHostAudio ocupa o lugar de enableAudioFx

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:876`

**Subsistema:** Pipeline de Audio — ver [referência](../reference/audio.md)

**Por quê**

O construtor e `AndroidAudioRenderer(Context context, boolean enableAudioFx)` (AndroidAudioRenderer.java:23), mas Game.java:876 passa `prefConfig.playHostAudio`. Sao duas preferencias completamente diferentes: `checkbox_host_audio` ("Play audio on PC", PreferenceConfiguration.java:56,884) e `checkbox_enable_audiofx` ("Enable system equalizer support", PreferenceConfiguration.java:89,1015). Consequencias reais: (1) quando o usuario liga "tocar audio tambem no PC", o cliente silenciosamente PULA todas as tentativas de AudioTrack de baixa latencia (AndroidAudioRenderer.java:157-159) e passa a usar buffer/modo padrao, aumentando a latencia de audio; (2) o cliente passa a fazer broadcast das intents ACTION_OPEN/CLOSE_AUDIO_EFFECT_CONTROL_SESSION (AndroidAudioRenderer.java:203-223) sem que o usuario tenha pedido, deixando equalizadores do sistema processarem o audio do jogo; (3) a preferencia `checkbox_enable_audiofx` que aparece na UI (res/xml/preferences.xml:233-238, com strings traduzidas em ~20 idiomas) e completamente inerte — `config.enableAudioFx` (PreferenceConfiguration.java:370) e escrito e nunca lido em lugar nenhum do app. Confirmado por `git log -S`: o upstream usava `prefConfig.enableAudioFx` (commits fe322590 e 6d51185d) e a troca foi introduzida pelo commit 08dd5406 "3d mode v1" (Janyger, 2025-07-23), que reescreveu o bloco de start da conexao dentro do callback `streamContainer.setOnSurfaceAvailable`.

**Plano de implementação**

Trocar por `new AndroidAudioRenderer(Game.this, prefConfig.enableAudioFx)` em Game.java:876. Adicionalmente, para tornar a classe imune a esse tipo de troca, mudar a assinatura para receber o `PreferenceConfiguration` inteiro ou usar um parametro nomeado/objeto de config em vez de um boolean solto.

**Risco**

Severidade high.

---

## B15

### Flick/inércia libera o botão de mouse errado, deixando botão direito/meio preso no host

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:99-102`

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

`momentumRunnable` finaliza a inércia chamando `conn.sendMouseButtonUp(getMouseButtonIndex())`. `getMouseButtonIndex()` (linha 170-179) decide o botão a partir do campo `pointerCount` ATUAL, mas quando a inércia termina todos os dedos já saíram e `pointerCount` vale 0, retornando sempre BUTTON_LEFT. Se o drag tinha sido iniciado com 2 dedos (BUTTON_RIGHT) ou 3 (BUTTON_MIDDLE), o cliente envia um `up` de LEFT e nunca solta o botão realmente pressionado. Agrava porque `setPointerCount()` (linha 447) pula a liberação justamente quando `isFlicking` é verdadeiro.

**Plano de implementação**

Guardar o byte do botão no momento em que `confirmedDrag` vira true (ex.: campo `activeDragButton`) e usar esse valor em `momentumRunnable`, `cancelTouch()` e `setPointerCount()`, em vez de recalcular por `getMouseButtonIndex()`. Adicionalmente, em `cancelTouch()` (linha 415-426) parar a inércia ANTES de decidir o botão.

**Risco**

Severidade high.

---

## B16

### Coordenadas de toque absoluto e de caneta ignoram o zoom/pan do vídeo

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:2532-2540`

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

`PanZoomHandler` é construído com `streamContainer.getSurfaceView()` como alvo da transformação (Game.java:481-487; PanZoomHandler.java:28-40, 129-133, 151-152), ou seja, escala e translação são aplicadas na SurfaceView INTERNA. Já `getNormalizedCoordinates()` lê `streamView.getScaleX()/getX()` do `streamContainer` (o pai, que nunca é escalado pelo PanZoomHandler), e `getStreamViewRelativeNormalizedXY` (2523-2527) e `AbsoluteTouchContext.updatePosition` (AbsoluteTouchContext.java:126-129) normalizam pelas dimensões do container. Resultado: com zoom > 1 ou pan ativo, o ponto tocado na tela não corresponde ao pixel do host — o erro cresce proporcionalmente ao fator de escala.

**Plano de implementação**

Centralizar a conversão numa única função que use a view realmente transformada (`streamContainer.getSurfaceView()`): `x_video = (x_tela - surface.getX()) / surface.getScaleX()`, dividindo depois por `surface.getWidth()`. Passar essa view (e não o container) para `AbsoluteTouchContext`/`RelativeTouchContext` em `applyMouseMode` (Game.java:4182-4184) e para os cálculos de `sendTouchEventForPointer`/`sendPenEventForPointer`.

**Risco**

Severidade high.

---

## B17

### Modo "Track pad (Natural)" na tela ignora sensibilidade e swap de eixo configurados

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:4186`

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

Em `applyMouseMode`, o trackpad de touchscreen é criado com `new TrackpadContext(conn, i)` — o construtor de 2 argumentos (TrackpadContext.java:55-59), que deixa `sensitivityX = sensitivityY = 1` e `swapAxis = false`. Já os contextos de trackpad físico são criados com o construtor completo (Game.java:817). Consequência: os sliders `seekbar_trackpad_sensitivity_x/y` e o checkbox `checkbox_trackpad_swap_axis` (preferences.xml:411-452), anunciados como "Trackpad Sensitivity", não têm nenhum efeito no modo de trackpad por tela — que é justamente o modo padrão forçado em display externo e em sessão input-only (Game.java:824).

**Plano de implementação**

Usar `new TrackpadContext(conn, i, prefConfig.trackpadSwapAxis, prefConfig.trackpadSensitivityX, prefConfig.trackpadSensitivityY)` também na linha 4186, ou introduzir prefs separadas (ex.: `virtual_trackpad_sensitivity_*`) e documentar a diferença entre trackpad físico e virtual.

**Risco**

Severidade high.

---

## B18

### ACTION_CANCEL no trackpad emulado deixa o botão esquerdo pressionado no host

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:2914-2962`

**Subsistema:** Entrada de Toque, Trackpad, Mouse e Caneta — ver [referência](../reference/input-touch.md)

**Por quê**

O emulador de clique/drag para dedo em touchpad sem captura mantém os estados `synthClickPending`, `pendingDrag` e `isDragging` e envia `sendMouseButtonDown(BUTTON_LEFT)` na linha 2909 quando o drag-and-drop é confirmado. O `switch (eventAction)` das linhas 2914-2962 trata MOVE/DOWN/UP/BUTTON_PRESS/BUTTON_RELEASE mas NÃO trata `MotionEvent.ACTION_CANCEL` (cai no `default: break`). Se o gesto for cancelado pelo sistema (ex.: janela perde foco, gesto do sistema, `cancelStaleTouchState`), o `up` correspondente nunca é enviado e o botão esquerdo fica travado no host.

**Plano de implementação**

Adicionar `case MotionEvent.ACTION_CANCEL:` junto ao ramo de UP, ou extrair um método `resetSynthTrackpadState()` que envie `sendMouseButtonUp(BUTTON_LEFT)` quando `isDragging` e zere `isDragging/pendingDrag/synthClickPending/pointerSwiping`, chamando-o também em `onWindowFocusChanged`, `onPause` e em `cancelStaleTouchState`.

**Risco**

Severidade high.

---

## B19

### framePacing escolhido pelo usuário é sobrescrito para BALANCED em todos os casos

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:696 e :702`

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

Ambos os ramos do bloco de 'latency profile selection' fazem `prefConfig.framePacing = PreferenceConfiguration.FRAME_PACING_BALANCED;`. Isso acontece DEPOIS da leitura das preferências (PreferenceConfiguration.java:859) e ANTES do ajuste de CAP_FPS (Game.java:757), portanto os modos FRAME_PACING_MIN_LATENCY (0), FRAME_PACING_CAP_FPS (2) e FRAME_PACING_MAX_SMOOTHNESS (3) nunca chegam ao renderer. Consequência: todo o bloco de pacing adaptativo de MediaCodecDecoderRenderer.java:1284-1429 (~145 linhas com EWMA, lateStreak, cooldown de drop) é código morto em runtime, a UI de configuração de frame pacing não tem efeito, e o ajuste 'chosenFrameRate = roundedRefreshRate - 1' de Game.java:769 nunca dispara. Só o perf log continua reportando o nome do pacing escolhido (Game.java:1848), o que torna qualquer diagnóstico enganoso.

**Plano de implementação**

Remover as duas atribuições e deixar preferLowerDelays afetar apenas o timeout/política de release. Se a intenção era realmente forçar BALANCED, isso deve ser feito na UI (desabilitando as outras opções) e não silenciosamente em runtime.

**Risco**

Severidade high.

---

## B20

### Caminho LATEST_ONLY tem a condição invertida e faz bypass do Choreographer, corrompendo o pacing e as estatísticas

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1213`

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

O bloco marcado `/* LATEST_ONLY_LOW_LATENCY */` executa quando `!preferLowerDelays`, isto é, no perfil BALANCED (padrão), e NÃO quando o usuário pede menor latência — o oposto do que o nome e os comentários das linhas 60-62 dizem. Como Game.java força framePacing=BALANCED, os dois caminhos de saída (latest-only em :1212-1247 e o enfileiramento BALANCED em :1430-1451) competem pelo mesmo dequeueOutputBuffer a cada iteração de forma não determinística: quando o poll de 0 µs pega o frame, ele é apresentado na hora e `continue` pula tudo; quando não pega, o dequeue de 2000 µs pega e o frame vai para outputBufferQueue para o Choreographer. Efeitos colaterais concretos: (a) frames apresentados pelo latest-only não incrementam `activeWindowVideoStats.totalFramesRendered` (só :1113 e :1428 incrementam), então o 'Rendering FPS' do perf overlay fica muito abaixo do real; (b) não incrementam `numFramesOut`, corrompendo a heurística de RendererException (:2304-2308); (c) INFO_OUTPUT_FORMAT_CHANGED drenado nesse loop é descartado silenciosamente, então `outputFormat` pode ficar null e a exceção reportar 'PreOutputConfigError' incorretamente; (d) o alinhamento a vsync do Choreographer é aplicado só a uma fração dos frames, produzindo micro-stutter.

**Plano de implementação**

Escolher UM caminho de saída por modo de pacing. Sugestão: manter o latest-only apenas quando preferLowerDelays==true E framePacing==MIN_LATENCY, e nunca combiná-lo com o caminho do Choreographer. Se mantido, incrementar totalFramesRendered/numFramesOut e tratar INFO_OUTPUT_FORMAT_CHANGED dentro dele.

**Risco**

Severidade high.

---

## B21

### Caminho LATEST_ONLY pula doCodecRecoveryIfRequired(), podendo travar a recuperação de codec

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1243`

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

`doCodecRecoveryIfRequired(CR_FLAG_RENDER_THREAD)` só é chamado no `finally` do try que começa em :1250 (linha 1475). O `continue` da linha 1243, dentro do bloco latest-only, sai da iteração sem passar por esse finally. Se a recuperação for solicitada (por HDR mode change em :1673 ou por CodecException na input thread) enquanto o latest-only ainda consegue drenar frames com sucesso, a render thread nunca marca CR_FLAG_RENDER_THREAD; a thread de input fica presa em `codecRecoveryMonitor.wait(1000)` (:936) logando 'Waiting to quiesce decoder threads' indefinidamente e o stream congela sem recuperar. O comentário do próprio código na linha 152-153 diz explicitamente que toda thread que toca o MediaCodec deve chamar doCodecRecoveryIfRequired() regularmente.

**Plano de implementação**

Chamar `doCodecRecoveryIfRequired(CR_FLAG_RENDER_THREAD)` imediatamente antes do `continue` da linha 1243, ou reestruturar o loop para que a chamada esteja num finally que cubra a iteração inteira.

**Risco**

Severidade high.

---

## B22

### enqueueNsByPtsUs (LongSparseArray) é acessado de duas threads sem sincronização e vaza entradas

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:58, :87-89, :1688`

**Subsistema:** Pipeline de Vídeo e Decodificação — ver [referência](../reference/video.md)

**Por quê**

`LongSparseArray` não é thread-safe. `put()` acontece na thread de input (queueNextInputBuffer, :1688) e `get()/delete()` na render thread (updateDecodeLatencyStats, :87-89), sem lock nem volatile. Uma realocação interna do array concorrente com uma leitura pode devolver valores errados, lançar ArrayIndexOutOfBoundsException dentro do `try{}catch(Throwable)` mudo da linha 1688 (mascarando a corrupção) ou corromper a estrutura. Além disso, entradas só são removidas quando updateDecodeLatencyStats() é chamado para aquele PTS — frames descartados (releaseOutputBuffer(idx,false) nas linhas 1223, 1287, 1314, 1387, 1441) nunca removem sua entrada, então o mapa cresce sem limite durante toda a sessão. Numa sessão de 1 hora a 120 fps com 5% de drop isso são ~21 mil entradas órfãs; o custo de busca do LongSparseArray é O(log n) mas a memória e o GC pressure crescem monotonicamente.

**Plano de implementação**

Trocar por `ConcurrentHashMap<Long,Long>` ou por um ring buffer de tamanho fixo indexado por (pts % N), e remover a entrada em TODOS os caminhos de release (inclusive os de descarte). Alternativa mais simples: guardar o enqueue time no próprio BufferInfo via um array circular de N=32 posições.

**Risco**

Severidade high.

---

## B23

### sendUtf8Text envia Modified UTF-8 (CESU-8), não UTF-8 real — emoji e caracteres do plano suplementar chegam corrompidos ou são descartados

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/jni/moonlight-core/simplejni.c:126-131`

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

`GetStringUTFChars` NÃO retorna UTF-8 padrão: retorna Modified UTF-8 (CESU-8), no qual (a) U+0000 é codificado como 0xC0 0x80 (overlong, inválido em UTF-8) e (b) qualquer code point acima de U+FFFF é codificado como o PAR DE SURROGATES UTF-16, cada surrogate virando uma sequência de 3 bytes 0xED 0xA0-0xBF 0x80-0xBF (6 bytes no total). O splitter em InputStream.c:612-648 lê o primeiro byte 0xED, classifica como 'code point de 3 bytes' e envia um surrogate SOLTO como se fosse um code point válido. O host recebe duas sequências UTF-8 inválidas em pacotes separados e não tem como remontar o caractere original. Resultado prático: emoji e ideogramas fora do BMP nunca funcionam no campo de texto, e o comportamento parece aleatório dependendo do IME. Nota: o Java já faz a conversão CORRETA em Game.java:4318 (`text.getBytes(StandardCharsets.UTF_8)`) apenas para calcular o chunking — e depois joga fora esses bytes e passa a String de volta para o JNI, que refaz a conversão errada.

**Plano de implementação**

Mudar a assinatura JNI para receber os bytes já convertidos: `public static native void sendUtf8Text(byte[] utf8Text, int length)` em MoonBridge.java:396, e no C usar `GetByteArrayElements` + `LiSendUtf8TextEvent((const char*)buf, length)`. Isso elimina a conversão CESU-8, elimina o `strlen()` e permite reaproveitar o array de bytes que Game.enqueueCommitText já produz (Game.java:4318). Alternativa menos invasiva: manter a String mas usar `GetStringChars` (UTF-16) e converter UTF-16→UTF-8 manualmente no C.

**Risco**

Severidade high.

---

## B24

### O 'texto em bloco' não existe no fio: moonlight-common-c fragmenta todo pacote UTF-8 em um code point por pacote

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:610-648`

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

A API `LiSendUtf8TextEvent(text, length)` aceita uma string arbitrária, mas a thread de envio a desmonta: para cada code point ela copia o holder, reescreve `header.size` para `4 + codePointLength` e envia um pacote UTF8_TEXT separado (InputStream.c:636-647). O comentário em InputStream.c:610-611 explica o motivo ('never straddle a packet boundary (which will cause a parsing error on the host)'). Consequência para o objetivo do fork: mesmo mudando a UI para um campo de texto que envia tudo de uma vez, o cliente continua produzindo N pacotes ENet confiáveis para N caracteres. O ganho de 'digitar e enviar inteiro' hoje é apenas de UX (não passar pelo IME por caractere) — não é ganho de protocolo. Isso é código upstream do cgutman, não uma modificação do ClassicOldSong (verificado via `git log -- src/InputStream.c` no submódulo).

**Plano de implementação**

Para ganho real de latência é preciso uma extensão de protocolo bilateral (cliente + host Apollo/Vibeshine): novo magic no namespace Apollo carregando até ~240 bytes de UTF-8 por pacote, anunciado por uma nova flag em `x-ss-general.featureFlags` (RtspConnection.c:1131), com fallback para o caminho por code point quando a flag estiver ausente. Enquanto isso não existe, ajustar expectativa: a feature é de UX, não de throughput.

**Risco**

Severidade high.

---

## B25

### Penalidade fixa de ~50 ms + espera por ACK em CADA pacote UTF-8, inclusive em hosts Sunshine/Apollo onde o workaround não se aplica

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:598-608`

**Subsistema:** Camada Nativa — ver [referência](../reference/jni-e-nativo.md)

**Por quê**

Antes de enviar qualquer texto, a thread faz `flushInputOnControlStream()`, depois um busy-wait de 10 em 10 ms enquanto `isControlDataInTransit()`, e por fim um `PltSleepMs(50)` incondicional. O comentário (InputStream.c:598-601) diz explicitamente que é um HACK para o GFE, que não sincroniza eventos de teclado com eventos UTF-8. Não há guard `IS_SUNSHINE()` — o mesmo custo é pago no Vibeshine/Apollo. Impacto concreto: (a) cada caractere sem mapeamento VK digitado num teclado físico (Game.java:2095) custa >= 50 ms antes do primeiro byte sair; (b) um texto colado de 2 KB é fatiado em 4 chunks pelo Java (UTF8_CHUNK_SIZE=512, Game.java:313) e cada chunk é um holder → 4 x 50 ms só de sleep, mais 15 ms de postDelayed entre chunks (Game.java:328), mais um pacote confiável por code point com espera de até 10 ms por envio (ControlStream.c:776-790).

**Plano de implementação**

No submódulo ClassicOldSong/moonlight-common-c, envolver InputStream.c:602-608 em `if (!IS_SUNSHINE()) { ... }`. É a maior alavanca isolada de latência percebida de digitação e não requer mudança no host. Requer commit no fork do submódulo + bump do ponteiro de submódulo no repo Artemis.

**Risco**

Severidade high.

---

## B26

### Chave do JoyCon fix divergente entre XML e código: toggle inerte

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:951`

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

O código lê `prefs.getBoolean("checkbox_joycon_fix", false)` mas a CheckBoxPreference declarada é `checkbox_enable_joyconfix` (preferences.xml:322). Resultado: config.enableJoyConFix é sempre false e o workaround de D-pad para Joy-Con L/R (ControllerHandler.java:1435 e :1459, vendorId 0x057e, productId 0x2006/0x2007) nunca ativa; a chave gravada pelo usuário fica órfã no arquivo de prefs.

**Plano de implementação**

Trocar o literal em PreferenceConfiguration.java:951 para CHECKBOX_ENABLE_JOYCONFIX = "checkbox_enable_joyconfix" (promovendo a uma constante como as demais) e, opcionalmente, migrar o valor antigo `checkbox_joycon_fix` no bloco de migrações (linhas 723-831) para não perder quem já marcou a opção.

**Risco**

Severidade high.

---

## B27

### checkbox_forceTightThresholds é uma preferência 100% morta, lida por reflection sobre um campo hardcoded

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:233`

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

`public boolean forceTightThresholds = false; // default off` nunca é preenchido a partir de SharedPreferences, apesar de existir CheckBoxPreference `checkbox_forceTightThresholds` (preferences.xml:74-79) com título/summary traduzidos em en/ru/zh-rCN/zh-rTW (strings.xml:563-564). Pior: Game.java:673-687 obtém esse mesmo campo via java.lang.reflect.Field.getDeclaredField("forceTightThresholds") dentro de try/catch silencioso e repassa a decoderRenderer.setForceTightThresholds() — ou seja, um acesso por reflection a um campo público da própria classe, que sempre devolve false.

**Plano de implementação**

Adicionar `config.forceTightThresholds = prefs.getBoolean("checkbox_forceTightThresholds", false);` em readPreferences e substituir o bloco de reflection de Game.java:673-687 por `decoderRenderer.setForceTightThresholds(prefConfig.forceTightThresholds);`. Se a feature for considerada instável, remover a preferência do XML e as 4 traduções em vez de deixá-la visível e inerte.

**Risco**

Severidade high.

---

## B28

### OverlaySharedPreferences.edit() grava na base: escritas feitas com perfil ativo são silenciosamente sombreadas

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/profiles/ProfilesManager.java:251`

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

`@Override public Editor edit() { return base.edit(); }`. Como quase todo o app obtém prefs por getOverlayingSharedPreferences(), várias escritas caem no arquivo base enquanto a leitura continua vindo do patch do perfil: (a) migrações legacy e defaults calculados de readPreferences (PreferenceConfiguration.java:727,781-785,804-807,812-815,821,830,842); (b) resetStreamingSettings() (PreferenceConfiguration.java:683-697), chamado após 3 crashes de decoder (UiHelper.java:193) — o reset de segurança não funciona com perfil ativo, o usuário fica em loop de crash; (c) memorização do modo de mouse com rememberMouseMode (Game.java:4126-4133) — o usuário troca de modo, o app 'salva' e no próximo stream volta ao modo do perfil.

**Plano de implementação**

Ou tornar o overlay honestamente read-only (lançar UnsupportedOperationException em edit() e obrigar os call sites a escolher explicitamente base vs. perfil), ou implementar um Editor que escreva no Map do perfil ativo e persista profiles.json. No mínimo: em resetStreamingSettings e nas migrações usar PreferenceManager.getDefaultSharedPreferences diretamente E remover as mesmas chaves do perfil ativo.

**Risco**

Severidade high.

---

## B29

### Perfil é snapshot completo das prefs globais, não delta — inclui lixo de runtime e congela configurações

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/EditProfileActivity.java:74`

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

Ao criar um perfil novo: `new InMemorySharedPreferences(PreferenceManager.getDefaultSharedPreferences(this).getAll())` copia TODAS as chaves, e saveProfile() (:121) grava o mapa inteiro em SettingsProfile.options. Consequências: (1) o JSON do perfil carrega estado de runtime irrelevante como `performance_log` (JSON de logs de performance acumulado, PerformanceDataTracker.java:16,119), `number_zoom_scale`, `number_pan_offset_x/y`, podendo inflar profiles.json em centenas de KB; (2) toda alteração posterior de configuração global fica invisível enquanto o perfil estiver ativo, porque o patch sombreia a chave — o usuário edita Settings e 'nada acontece'; (3) o método diff() (:232-248), que já existe, é usado apenas para colocar '*' no título (:314-328), não para reduzir o patch.

**Plano de implementação**

Aplicar diff() no saveProfile (guardar apenas chaves cujo valor difere do global no momento do save) e manter uma denylist de chaves de runtime (performance_log, number_zoom_scale, number_pan_offset_x, number_pan_offset_y, CrashCount). Documentar na UI que o perfil só sobrescreve o que foi alterado.

**Risco**

Severidade high.

---

## B30

### Não existe preferência nem suporte para redimensionar o stream quando o IME abre

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/AndroidManifest.xml:193`

**Subsistema:** Preferências, Configuração e Perfis — ver [referência](../reference/preferencias.md)

**Por quê**

A Activity .Game não declara android:windowSoftInputMode (default do sistema) e usa StreamTheme (fullscreen), e StreamContainer/StreamView medem sempre contra o tamanho total da janela mantendo aspect ratio (StreamContainer.java:120-150, StreamView.java:61-90). Não há nenhuma chave em preferences.xml relacionada a comportamento do teclado do sistema — as chaves 'onscreen_keyboard_*' (preferences.xml:567-602) dizem respeito ao TECLADO VIRTUAL PRÓPRIO do app (KeyBoardLayoutController.java:327-338), não ao IME. O único código do repositório que reage a WindowInsetsCompat.Type.ime() está em ExternalDisplayControlActivity.java:170-176 e apenas mostra/esconde o teclado próprio.

**Plano de implementação**

Adicionar android:windowSoftInputMode="adjustResize" a .Game, chamar WindowCompat.setDecorFitsSystemWindows(window,false) e um OnApplyWindowInsetsListener em Game que aplique bottom padding = insets.getInsets(Type.ime()).bottom no streamContainer, com nova preferência (ex.: list_ime_behavior = overlay|resize|pan, default overlay para preservar comportamento atual) na category_input_settings.

**Risco**

Severidade high.

---

## B31

### Gamepads dos drivers USB anunciam supportedButtonFlags = 0 ao host

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/input/driver/AbstractXboxController.java:32`

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

O construtor atribui a mascara completa de botoes a `this.buttonFlags` (o estado ATUAL de botoes pressionados) em vez de `this.supportedButtonFlags`. Consequencias: (1) `AbstractController.getSupportedButtonFlags()` (AbstractController.java:34-36) devolve 0, e `UsbDeviceContext.sendControllerArrival()` (ControllerHandler.java:3468-3469) informa ao Apollo/Sunshine que o gamepad nao suporta nenhum botao — o host pode entao expor um gamepad virtual capado; (2) entre `notifyDeviceAdded()` (AbstractXboxController.java:55) e o primeiro `handleRead()`, o driver considera 15 botoes simultaneamente pressionados. `ProConController` (ProConController.java:49-55) tambem nunca escreve `supportedButtonFlags`, ficando em 0.

**Plano de implementação**

Trocar `this.buttonFlags =` por `this.supportedButtonFlags =` em AbstractXboxController.java:32 e adicionar a mascara equivalente (A/B/X/Y/DPAD/LB/RB/LS_CLK/RS_CLK/BACK/PLAY/SPECIAL/MISC) ao construtor de ProConController.java:49. Adicionar um teste unitario que instancia cada driver e assegura getSupportedButtonFlags() != 0 e buttonFlags == 0.

**Risco**

Severidade high.

---

## B32

### AnalogStickFree e keyAnalogStickFree nao tratam ACTION_CANCEL: stick trava pressionado

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:372`

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

O switch de `onElementTouchEvent` cobre ACTION_DOWN/POINTER_DOWN, ACTION_MOVE e ACTION_UP/POINTER_UP, mas nao ACTION_CANCEL. Como `VirtualControllerElement.onTouchEvent` (VirtualControllerElement.java:237-299) nunca chama `super.onTouchEvent()`, o estado `pressed` do View nao e limpo pelo framework. Se o gesto for cancelado (IME abrindo, PiP, dialogo, ViewGroup pai interceptando o toque), `bIsFingerOnScreen` fica true, `isPressed()` fica true e o bloco final (:429) segue chamando `updatePosition()` — o stick fica gravado no ultimo valor ate o proximo toque. O mesmo defeito existe em keyboard/keyAnalogStickFree.java:390. A variante classica AnalogStick.java:327 trata ACTION_CANCEL corretamente, o que confirma que e regressao da variante 'Free'.

**Plano de implementação**

Adicionar `case MotionEvent.ACTION_CANCEL:` junto ao bloco ACTION_UP em AnalogStickFree.java:419 e keyAnalogStickFree.java:394, forcando `setPressed(false); bIsFingerOnScreen = false;` independentemente do pointerId.

**Risco**

Severidade high.

---

## B33

### PreferenceConfiguration.readPreferences() e chamado dentro de onDraw() de elementos do OSC

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java:162`

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

`DigitalButton.onElementDraw()` chama `PreferenceConfiguration.readPreferences(getContext())` em ate 3 pontos (linhas 162, 165, 175); `DigitalPad.onElementDraw()` chama 2 vezes (DigitalPad.java:56-57); `keyboard/KeyBoardDigitalButton.onElementDraw()` 1 vez (linha 168). Cada chamada aloca um wrapper `OverlaySharedPreferences` (ProfilesManager.java:200-207) e executa 123 leituras `prefs.get*` (PreferenceConfiguration.java:712 em diante). Com o layout padrao (~14 elementos de gamepad, e dezenas no overlay de teclado) isso significa milhares de lookups em SharedPreferences por frame, no thread de UI, durante o gameplay — jank direto na experiencia que o dono do fork ja considera ruim.

**Plano de implementação**

Ler a config uma vez no construtor do elemento (como ja e feito em KeyBoardTouchPadButton.java:126) ou, melhor, passar a `PreferenceConfiguration` ja carregada de VirtualControllerConfigurationLoader.createDefaultLayout() (VirtualControllerConfigurationLoader.java:213) para cada elemento, e invalidar via um metodo `applyPreferences(PreferenceConfiguration)` chamado por refreshLayout().

**Risco**

Severidade high.

---

## B34

### DigitalPad.rotateDrawable() aloca dois Bitmaps e um Canvas por frame desenhado

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalPad.java:250`

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

`rotateDrawable()` cria `Bitmap.createBitmap(...)`, um `Canvas`, uma `Matrix` e um segundo `Bitmap` rotacionado, e e chamado de dentro de `onElementDraw()` nas linhas 89, 97, 105, 113, 128 e 136 sempre que a direcao do D-pad nao for a neutra. Alem disso `getResources().getDrawable(id)` (API depreciada) e chamado em todos os ramos. Enquanto o dedo desliza no D-pad ha invalidate() a cada ACTION_MOVE (DigitalPad.java:294), logo essa alocacao acontece na cadencia do touch (60-240 Hz), gerando pressao de GC durante o jogo.

**Plano de implementação**

Pre-rotacionar os 8 drawables uma unica vez em onSizeChanged() e guardar num array indexado pela bitmask de direcao; ou substituir a rotacao por `canvas.save(); canvas.rotate(angle, cx, cy); d.draw(canvas); canvas.restore();`.

**Risco**

Severidade high.

---

## B35

### Overlay de stick-para-teclado dispara 4 KeyEvents por amostra de toque, sem deteccao de mudanca

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButton.java:118`

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

O laco `for (int i = 0; i < 4; i++) listener.onkeyEvent(stickSender[i], stickBool[i]);` roda a cada callback `onMovement`, mesmo quando o vetor `stickBool` nao mudou. Cada chamada vira um `KeyEvent` novo -> `KeyBoardController.sendKeyEvent()` (KeyBoardController.java:366) -> `Game.instance.onKey()` -> `conn.sendKeyboardInput()`. Com um dedo movendo o stick a 120 Hz sao ~480 pacotes de teclado por segundo enviados ao host, a maioria repeticoes identicas. O array `stickIndex` (linhas 39-59) e calculado e nunca lido — codigo morto que sugere que a deteccao de mudanca foi removida em algum refactor.

**Plano de implementação**

Guardar `boolean[] lastStickBool` e so emitir onkeyEvent quando `stickBool[i] != lastStickBool[i]`; remover `stickIndex` inteiramente. Mesmo tratamento em KeyBoardAnalogStickButtonFree.java.

**Risco**

Severidade high.

---

## B36

### VirtualController le SharedPreferences a cada evento de entrada do OSC

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java:249`

**Subsistema:** Entrada de Controle/Gamepad — ver [referência](../reference/input-gamepad.md)

**Por quê**

`sendControllerInputContext(long,int)` executa `PreferenceConfiguration.readPreferences(context).enableKeyboardVibrate` a cada envio — ou seja, a cada movimento de stick virtual, cada toque de D-pad e cada pressao de botao. Como visto acima, cada readPreferences custa 123 lookups + alocacao de wrapper. `KeyBoardController.vibrate()` (KeyBoardController.java:390) faz o mesmo por tecla virtual. Isso esta no caminho critico de latencia da entrada.

**Plano de implementação**

Guardar uma `PreferenceConfiguration` (ou apenas o boolean enableKeyboardVibrate) como campo final lido no construtor de VirtualController/KeyBoardController, atualizando em refreshLayout().

**Risco**

Severidade high.

---

## B37

### Game.java é uma god-class de 4348 linhas implementando 12 interfaces

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:139`

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

A classe declara `implements SurfaceHolder.Callback, OnGenericMotionListener, OnTouchListener, NvConnectionListener, EvdevListener, OnSystemUiVisibilityChangeListener, GameGestures, StreamContainer.InputCallbacks, ExternalControllerView.InputCallbacks, PerfOverlayListener, UsbDriverService.UsbDriverStateListener, View.OnKeyListener` e acumula pelo menos 12 responsabilidades distintas: negociação de display mode/refresh rate (:1455), configuração do decoder (:652), montagem da StreamConfiguration (:779), ciclo de vida da NvConnection (:867, :3439), roteamento de teclado (:2030-2208), mouse/touch/stylus (:2756-3420), gamepad (delegado mas orquestrado aqui), clipboard sync (:2246-2390), PiP (:1288-1400), overlays flutuantes e drag deles (:938-1090), zoom/pan (:3992) e menus (:4245). Só o onCreate tem ~595 linhas. Qualquer alteração de teclado/IME obriga a mexer nessa classe, e não há como testá-la isoladamente (o único teste que a toca é StartupCrashTest via Robolectric).

**Plano de implementação**

Extrair colaboradores com fronteiras claras antes de implementar as features de teclado: `GameWindowController` (flags de janela, insets, immersive, orientação, PiP), `GameInputRouter` (todo handleKey*/handleMotionEvent), `StreamSessionController` (NvConnection + decoder + StreamConfiguration) e `GameOverlayController` (botões flutuantes, OSC, teclados virtuais). Começar pelo GameWindowController, que é exatamente o escopo do EPIC de teclado ancorado.

**Risco**

Severidade high.

---

## B38

### A janela do Game é configurada de forma que o IME nunca pode redimensionar o stream (causa raiz do requisito AnyDesk #1)

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:357`

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

Em onCreate a Activity adiciona `WindowManager.LayoutParams.FLAG_FULLSCREEN` (:359), aplica `SYSTEM_UI_FLAG_LAYOUT_STABLE|LAYOUT_HIDE_NAVIGATION|LAYOUT_FULLSCREEN` (:363-366) e depois `FLAG_LAYOUT_IN_SCREEN` (:369). A declaração no manifest (`AndroidManifest.xml:193-216`) não define nenhum `android:windowSoftInputMode`, e o tema `StreamTheme` (`res/values/styles.xml:34`) também não. Com FLAG_FULLSCREEN + LAYOUT_IN_SCREEN, o Android não aplica `adjustResize` — o IME simplesmente sobrepõe a janela. Uma busca por `SOFT_INPUT|windowSoftInputMode|adjustResize|setDecorFitsSystemWindows|WindowInsets.*ime()` em todo `app/src/main` retorna zero ocorrências no caminho do Game; o único uso de `WindowInsetsCompat.Type.ime()` no projeto inteiro está em `utils/ExternalDisplayControlActivity.java:172` e serve apenas para não escurecer a tela por inatividade.

**Plano de implementação**

Introduzir um modo 'teclado ancorado': quando o IME abrir, (a) `getWindow().clearFlags(FLAG_FULLSCREEN)` e trocar os SYSTEM_UI_FLAG_* por `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)` + `WindowInsetsControllerCompat`; (b) registrar `ViewCompat.setOnApplyWindowInsetsListener` no `android.R.id.content` lendo `insets.getInsets(Type.ime()).bottom`; (c) aplicar esse valor como bottom padding/margin do `@id/streamContainer` — `StreamContainer.onMeasure` (`ui/StreamContainer.java:114`) já reprojeta o vídeo mantendo aspect ratio dentro do espaço disponível, então o vídeo encolhe sozinho; (d) chamar `panZoomHandler.handleSurfaceChange()` depois do relayout. Manter tudo atrás de uma preference nova para não regredir jogos em fullscreen.

**Risco**

Severidade high.

---

## B39

### onSystemUiVisibilityChange reimpõe immersive sticky 2s depois, brigando com o IME

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:3915`

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

Sempre que os flags de system UI mudam e `SYSTEM_UI_FLAG_FULLSCREEN` ou `SYSTEM_UI_FLAG_HIDE_NAVIGATION` some, o callback agenda `hideSystemUi(2000)` (:3923/:3926), que reaplica `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` (`:1660-1666`). Abrir o teclado virtual muda a visibilidade da navigation bar, então dois segundos depois o app força immersive de volta — provocando flicker, perda de foco do IME e, em alguns OEMs, fechamento do teclado. É um obstáculo direto para qualquer solução de teclado ancorado.

**Plano de implementação**

Manter um flag `imeVisible` (alimentado pelo OnApplyWindowInsetsListener) e fazer `hideSystemUi(int)` (`Game.java:1671`) retornar imediatamente enquanto o IME estiver visível; reagendar quando o IME fechar.

**Risco**

Severidade high.

---

## B40

### Game.onStop() chama finish() incondicionalmente e a Activity é noHistory+singleTask

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:1855`

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

`onStop()` derruba a conexão (`stopConnection()`, :1782) e termina com `finish()` sem nenhuma condição (:1855). Combinado com `android:noHistory="true"`, `android:launchMode="singleTask"` e `android:excludeFromRecents="true"` (`AndroidManifest.xml:196-201`), qualquer coisa que leve a Activity a onStop mata o stream. Isso impede arquiteturas óbvias para a feature de 'campo de texto': não é possível abrir uma Activity/Dialog em outra task, nem um overlay em janela separada, sem encerrar a sessão. Também torna o modo multi-janela/split-screen frágil.

**Plano de implementação**

Trocar o `finish()` incondicional por uma decisão explícita: manter a sessão viva quando `isChangingConfigurations()` ou quando um flag `suppressStopTeardown` (usado por diálogos internos e pelo futuro campo de texto) estiver ligado. Se um campo de texto for necessário, implementá-lo como View dentro do próprio `activity_game.xml` (não como Activity separada) justamente por causa dessa restrição.

**Risco**

Severidade high.

---

## B41

### Bug no agendamento do flush de commitText: textos com mais de um chunk nunca são enviados

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:4331`

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

`enqueueCommitText` fatia o texto em chunks de até 512 bytes UTF-8 e só agenda o flush se `commitTextQueue.size() == 1` (:4331). Se a fila estava vazia e o texto gerou 2 ou mais chunks (>512 bytes, ex.: colar um parágrafo ou uma senha longa via ditado), a condição é falsa e `flushCommitTextQueue` nunca é postado — o texto fica parado na fila até que um commit pequeno posterior dispare o flush, e aí sai fora de ordem temporal. Isso ataca exatamente o caso de uso do dono do fork (enviar texto inteiro de uma vez).

**Plano de implementação**

Substituir por um flag de 'flush agendado': `boolean wasEmpty = commitTextQueue.isEmpty();` antes do loop e `if (wasEmpty) commitTextHandler.post(flushCommitTextQueue);` depois — ou simplesmente `commitTextHandler.removeCallbacks(flushCommitTextQueue); commitTextHandler.post(flushCommitTextQueue);`.

**Risco**

Severidade high.

---

## B42

### ui/StreamView.java é código morto, mas é a única classe coberta pelo teste de commitText

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/ui/StreamView.java:15`

**Subsistema:** Arquitetura Geral e Ciclo de Vida do App — ver [referência](../reference/arquitetura.md)

**Por quê**

`StreamView` não aparece em nenhum layout XML (`res/layout/activity_game.xml` usa `com.limelight.ui.StreamContainer`) nem é instanciada por nenhuma classe de produção — grep por `StreamView` só retorna comentários em Game.java, nomes de métodos privados (`getStreamViewRelativeNormalizedXY`) e o próprio arquivo + `app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java`. Ou seja: o único teste automatizado do caminho de commitText valida uma classe que o app não usa, dando falsa confiança sobre a feature de envio de texto.

**Plano de implementação**

Apagar `ui/StreamView.java` e reescrever `StreamViewCommitTextTest` contra `StreamContainer` (e/ou contra a fábrica de InputConnection unificada proposta abaixo), incluindo um caso com payload >512 bytes que reproduza o bug de flush.

**Risco**

Severidade high.

---

## B43

### Sete idiomas traduzidos são inalcançáveis: values-bg, values-pl, values-tr, values-pt, values-eo ausentes de arrays.xml e locales_config.xml

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/res/values/arrays.xml:58`

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

Existem 28 diretórios values-<locale>/strings.xml no disco, mas language_names/language_values (arrays.xml:58-107) e xml/locales_config.xml listam apenas 21 idiomas + Default. Ficam de fora: bg (134 strings traduzidas), pl (252), tr (253), pt (233), eo (36), além dos stubs vazios ckb e fa. Consequência dupla: (a) o seletor in-app nunca oferece esses idiomas; (b) por não estarem em localeConfig, o seletor nativo de idioma por app do Android 13+ também não os mostra. O trabalho de tradução de polonês, turco e búlgaro está efetivamente morto. Os próprios comentários em arrays.xml:57 e locales_config.xml:3 admitem que os dois arquivos precisam ser mantidos em sincronia manualmente.

**Plano de implementação**

Adicionar bg/pl/tr/pt aos dois arquivos (mantendo a mesma ordem nos dois arrays de arrays.xml, que são posicionalmente acoplados). Remover values-ckb/ e values-fa/ (ambos são <resources></resources> vazios) ou traduzi-los. Criar um teste de unidade (já existe Robolectric no build.gradle) que falhe se o conjunto de diretórios values-*/ divergir de language_values e de locales_config.xml.

**Risco**

Severidade high.

---

## B44

### App sem android:supportsRtl apesar de ter locale hebraico ativo

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/AndroidManifest.xml:46`

**Subsistema:** UI, Recursos e Internacionalização — ver [referência](../reference/ui-e-i18n.md)

**Por quê**

O bloco <application> (linhas 46-59) não declara android:supportsRtl="true". Existe values-iw/strings.xml com 133 strings em hebraico (idioma RTL) declarado tanto em arrays.xml quanto em locales_config.xml, e diretórios stub values-fa (persa) e values-ckb (curdo sorani), também RTL. Sem supportsRtl, o layoutDirection nunca é resolvido para RTL e todos os atributos Start/End se comportam como Left/Right: a tela inicial, os menus de contexto, a lista de perfis e a tela de settings ficam espelhados errado para usuários de hebraico.

**Plano de implementação**

Adicionar android:supportsRtl="true" no <application>. Em seguida auditar os layouts que ainda usam apenas Left/Right sem par Start/End (activity_add_computer_manually.xml:26-27 usa toLeftOf+toStartOf corretamente, mas pc_grid_item.xml e app_grid_item.xml usam layout_centerHorizontal/gravity fixos) e rodar o app com 'Force RTL layout direction' das opções de desenvolvedor.

**Risco**

Severidade high.

---

## B45

### Dead keys e composição de IME são descartadas silenciosamente — impossível digitar acentos (crítico para pt-BR/ABNT2)

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:2093`

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

Em `handleKeyDown`, quando `translate()` devolve 0, o código só envia UTF-8 se `(unicodeChar & KeyCharacterMap.COMBINING_ACCENT) == 0 && (unicodeChar & COMBINING_ACCENT_MASK) != 0` — ou seja, acentos combinantes (´ ` ~ ^ ¨) são explicitamente ignorados (o comentário nas linhas 2088-2089 admite: 'not a dead character (which we don't support)'). `handleKeyUp` (2176-2177) repete a checagem apenas para reportar handled. Não existe nenhuma chamada a `setComposingText`, `KeyCharacterMap.getDeadChar()` ou acumulação de estado de composição em todo o repo. Resultado prático num teclado ABNT2/pt-BR: é impossível digitar á, ã, ç (via ´+c), â, õ etc. pelo caminho de tecla individual.

**Plano de implementação**

(a) Curto prazo: manter o estado do acento morto em Game (`pendingDeadChar`), e no próximo KeyEvent usar `KeyCharacterMap.getDeadChar(pendingDeadChar, nextChar)` para compor e enviar o resultado via `conn.sendUtf8Text()`. (b) Correto: sobrescrever `setComposingText()` no BaseInputConnection do StreamContainer (StreamContainer.java:192) para acumular e só enviar em `finishComposingText()`. (c) Estratégico: o campo de injeção de texto (EPIC) resolve tudo isso de graça, porque um EditText real dá composição/IME nativos.

**Risco**

Severidade high.

---

## B46

### Flag SS_KBE_FLAG_NON_NORMALIZED é calculada independentemente de forceQwerty — cliente mente ao host quando forceQwerty está desligado

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:2108`

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

`conn.sendKeyboardInput(..., keyboardTranslator.hasNormalizedMapping(event.getKeyCode(), deviceId) ? 0 : MoonBridge.SS_KBE_FLAG_NON_NORMALIZED)` (idem em 2181-2182). Mas `hasNormalizedMapping()` (KeyboardTranslator.java:161-175) só verifica se EXISTE um mapa de normalização para o device, enquanto `translate()` (KeyboardTranslator.java:188) só APLICA a normalização se `prefConfig.forceQwerty` for true. Com `forceQwerty = false` (opção exposta em res/xml/preferences.xml:455) num device API 33+ com layout não-US, o cliente envia o VK derivado do keycode NÃO normalizado mas informa flags=0 (=normalizado), fazendo o host (Sunshine/Apollo) interpretar o código como posição US-QWERTY e produzir o caractere errado.

**Plano de implementação**

Extrair a decisão para o próprio KeyboardTranslator (ex.: `translate()` devolver também a flag, ou um método `getKeyFlags(keycode, deviceId)` que retorne 0 apenas quando `prefConfig.forceQwerty && hasNormalizedMapping(...)`). Aplicar nos dois call sites (Game.java:2108-2109 e 2181-2182).

**Risco**

Severidade high.

---

## B47

### Teclas com mapeamento normalizado mas fora do switch são descartadas em vez de usar o fallback por scancode

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java:412`

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

No fim de `translate()`: `if (translated == 0) { if (hasNormalizedMapping(keycode, deviceId)) return 0; translated = KeyMapper.getWindowsKeyCode(scancode); ... }`. Ou seja, em qualquer device API 33+ com layout de teclado reconhecido, toda tecla que não está no switch (ex.: a tecla 102ª/`<>` de teclados ABNT2 e ISO, KEYCODE_RO, KEYCODE_YEN, teclas de mídia, KEYCODE_NUMPAD_ENTER, KEYCODE_NUMPAD_EQUALS, KEYCODE_NUMPAD_COMMA) é ABANDONADA — nem VK, nem UTF-8 (porque `handleKeyDown` só cai no UTF-8 quando translate devolve 0, o que ocorre, mas aí a tecla costuma ter unicodeChar 0 ou ser acento morto). O fallback `KeyMapper.getWindowsKeyCode(scancode)` (que cobre KEY_102ND=86 -> VK_OEM_102, KEY_KPENTER, KEY_KPCOMMA etc., KeyMapper.java:1060-1061) fica inacessível justamente nos aparelhos mais novos.

**Plano de implementação**

Inverter a ordem: tentar sempre `KeyMapper.getWindowsKeyCode(scancode)` primeiro quando `translated == 0`, e só devolver 0 se o scancode também não mapear. Manter `hasNormalizedMapping` apenas para decidir a flag, não para descartar a tecla.

**Risco**

Severidade high.

---

## B48

### UTF8_CHUNK_SIZE = 512 excede MAX_INPUT_PACKET_SIZE = 128 do moonlight-common-c (stack overflow no caminho de criptografia legado)

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:313`

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

`enqueueCommitText` gera blocos de até 512 bytes -> `LiSendUtf8TextEvent` monta um pacote de 512+8 bytes. Em `sendInputPacket` (InputStream.c:235-300), quando `encryptedControlStream == false` (host com AppVersion < 7.1.431, i.e. GFE antigo — InputStream.c:105), o código faz `char encryptedBuffer[MAX_INPUT_PACKET_SIZE]` (=128, InputStream.c:43,254) e `encryptData()` copia o plaintext inteiro para `unsigned char paddedData[ROUND_TO_PKCS7_PADDED_LEN(128)]` com `memcpy(paddedData, plaintext, plaintextLen)` sem checar tamanho (InputStream.c:180-182) — smash de pilha determinístico. Com Apollo/Sunshine (>=7.1.431) o caminho ENet é usado e não há overflow, mas o risco existe para qualquer host legado e é uma bomba-relógio.

**Plano de implementação**

Reduzir `UTF8_CHUNK_SIZE` para <= 100 bytes (mantém margem para o header de 8 bytes e o padding PKCS7 dentro dos 128). Opcionalmente adicionar validação de tamanho em `LiSendUtf8TextEvent` (InputStream.c:1005) e/ou fragmentar lá. Blocos menores também reduzem jitter na fila `MAX_QUEUED_INPUT_PACKETS = 150`.

**Risco**

Severidade high.

---

## B49

### Preferência ignoreSynthEvents desativa TODOS os teclados virtuais próprios e o AccessibilityService

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:2036`

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

`if (prefConfig.ignoreSynthEvents && deviceId <= 0) return false;` em `handleKeyDown` (2036-2039) e `handleKeyUp` (2127-2130). Todos os KeyEvent sintetizados pelo fork usam `new KeyEvent(action, keyCode)` (KeyBoardLayoutController.java:204, KeyBoardControllerConfigurationLoader.java:74-107,121,173,189,198,209,324,341), cujo deviceId é o do teclado virtual (<= 0). Se o usuário ligar `checkbox_ignore_synth_events` (res/xml/preferences.xml:473) para resolver problemas de mouse/gamepad, os DOIS teclados on-screen e o KeyboardAccessibilityService param de funcionar silenciosamente, sem nenhum aviso na UI.

**Plano de implementação**

Marcar os eventos sintéticos do próprio app (ex.: construir o KeyEvent com `KeyEvent(downTime, eventTime, action, code, repeat, metaState, deviceId, scancode, flags, source)` usando um `source` próprio, ou passar um parâmetro `boolean internal` para handleKeyDown/Up) e pular o filtro de ignoreSynthEvents para eles. Documentar a interação no summary da preferência.

**Risco**

Severidade high.

---

## B50

### Não existe nenhum campo de entrada de texto (EditText) em toda a UI de streaming

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:2401`

**Subsistema:** Entrada de Teclado — ver [referência](../reference/input-teclado.md)

**Por quê**

Grep confirma que a única forma de mandar texto ao host é (a) tecla a tecla, (b) `sendUtf8Text` disparado por commitText/ACTION_MULTIPLE do IME quando o usuário digita no vazio sobre o vídeo, ou (c) sincronização de clipboard (Game.java:2245-2389). Não há EditText, nem barra de composição, nem preview do que está sendo digitado. Somado ao IME que cobre a tela e às dead keys descartadas, é exatamente a experiência que o dono do fork descreve como ruim comparada ao AnyDesk.

**Plano de implementação**

Ver o EPIC 'Barra de injeção de texto' em improvementIdeas — a infraestrutura de envio (enqueueCommitText/sendUtf8Text) já existe; falta a UI e a correção do bug da fila.

**Risco**

Severidade high.

---

## B51

### enqueueCommitText nunca inicia o dreno quando o texto gera 2+ chunks — texto longo fica preso na fila

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/Game.java:4331`

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

O laço em Game.java:4320-4329 enfileira TODOS os chunks antes da checagem de arranque, e a checagem é `if (commitTextQueue.size() == 1)`. Se a fila estava vazia e o texto passa de 512 bytes UTF-8, o laço produz 2 ou mais chunks, `size()` vale >= 2, o `commitTextHandler.post(flushCommitTextQueue)` NUNCA é executado e o texto inteiro fica parado na `commitTextQueue` até que um commit posterior de exatamente um chunk dispare o dreno — momento em que o texto antigo sai na frente, fora de ordem. Com digitação normal (commits curtos) sempre nasce 1 chunk, o que mascara o defeito. Isso cai exatamente sobre a dor (2) do dono do fork: colar/enviar um bloco grande de texto é o caso que quebra. Note que o V+ não tem esse bug apenas porque não tem a feature.

**Plano de implementação**

Capturar o estado da fila ANTES de enfileirar e arrancar com base nele: `boolean wasIdle = commitTextQueue.isEmpty();` no topo de enqueueCommitText, e no fim `if (wasIdle) commitTextHandler.post(flushCommitTextQueue);`. Alternativamente manter um flag booleano `flushScheduled` setado no post e limpo no fim do runnable quando a fila esvazia. Cobrir com teste unitário Robolectric alimentando >512 bytes.

**Risco**

Severidade high.

---

## B52

### Bloqueio da dor #1 do dono: activity .Game sem windowSoftInputMode e com IMMERSIVE_STICKY reaplicado

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/AndroidManifest.xml:194`

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

A declaração de `.Game` (AndroidManifest.xml:194-203) não traz `android:windowSoftInputMode`, e a janela recebe FLAG_FULLSCREEN em Game.java:359 mais SYSTEM_UI_FLAG_IMMERSIVE_STICKY reaplicado pelo runnable hideSystemUi em Game.java:1666. Nessa combinação o Android ignora adjustResize e o IME simplesmente cobre o stream — que é precisamente o comportamento que o dono quer eliminar. Confirmei que o Moonlight V+ tem EXATAMENTE a mesma configuração (V+ AndroidManifest.xml:288-298 sem windowSoftInputMode; Game.kt:272 FLAG_FULLSCREEN; Game.kt:1291 IMMERSIVE_STICKY), portanto não existe implementação de referência a portar — a feature precisa ser escrita do zero. Registro como finding e não só como ideia porque a expectativa de encontrar a solução pronta no V+ é falsa e conduziria o planejamento ao erro.

**Plano de implementação**

Não tentar adjustResize com os flags legados. Migrar a Game para WindowInsetsCompat: setDecorFitsSystemWindows(false) (padrão que o V+ já usa em Game.kt:267), registrar ViewCompat.setOnApplyWindowInsetsListener no container, ler insets.getInsets(WindowInsetsCompat.Type.ime()) e aplicar a altura como padding/height do StreamContainer, deixando o StreamView remedir pelo onMeasure já existente (StreamView.java:62). Guardar por Build.VERSION.SDK_INT >= 30 com WindowInsetsCompat para respeitar o minSdk 21.

**Risco**

Severidade high.

---

## B53

### Divergência de submódulo moonlight-common-c torna impossível portar qualquer feature de protocolo do V+

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/jni/moonlight-core/moonlight-common-c`

**Subsistema:** Comparação Artemis — ver [referência](../reference/comparacao-vplus.md)

**Por quê**

O Artemis fixa o submódulo em ClassicOldSong/moonlight-common-c @ c999436858471dfefa7617af3b7dc03ec1644ce4; o V+ usa qiin2333/moonlight-common-c branch `mic` @ 72733e3a47fc7823e7e0b1b0cef2e3d101b0399b (confirmado em .gitmodules e ls-tree de ambos os refs). São linhagens distintas do protocolo. Todas as features de wire do V+ — microfone (MoonBridge.java:599-605), clipboard 0x5508 (:556), eventos de touchpad (:523-527), HDR10+ via dataspace (:625-626), cursor shapes (:588/:591) — dependem dessa árvore nativa. Trocar o submódulo pelo do V+ derrubaria as features Apollo que só o Artemis tem (sendExecServerCmd em MoonBridge.java:357, sendEmptyPayload em :359), das quais o Artemis depende (o backgroundPing em Game.java:333-338 chama sendEmptyPayload). Isso define um teto rígido de portabilidade que precisa estar documentado antes de qualquer planejamento de backlog.

**Plano de implementação**

Tratar como restrição de arquitetura, não como tarefa: registrar um ADR declarando que features de protocolo do V+ estão fora de escopo enquanto o submódulo for o do ClassicOldSong. Se alguma se tornar essencial, a rota é portar o patch específico para o fork do ClassicOldSong (upstream próprio), nunca trocar o submódulo inteiro.

**Risco**

Severidade high.

---

## B54

### ContentProvider exportado sem permissao permite path traversal e leitura do cache por qualquer app

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/PosterContentProvider.java:34`

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

O provider e declarado `android:exported="true"` sem `android:permission` e sem `grantUriPermissions` (AndroidManifest.xml:61-66). `openFile()` calcula `sUriMatcher.match(uri)` e entao chama `openBoxArtFile(uri, mode)` **nos dois ramos** (:37-41), tornando o matcher completamente inerte — inclusive o `sUriMatcher.addURI(AUTHORITY, BOXART_PATH, BOXART_URI_ID)` (:31) sequer casaria com uma URI de tres segmentos. Em seguida, `openBoxArtFile` (:44) passa o segmento `uuid` cru para `DiskAssetLoader.getFile` (DiskAssetLoader.java:146), que delega a `CacheHelper.openPath` (CacheHelper.java:16-31) — este concatena componentes com `new File(f, component)` sem qualquer normalizacao contra `..`. Um app malicioso resolve `content://poster.com.limelight.noir/boxart/..%2F..%2Fqualquer%2Fdir/0` e le qualquer arquivo `<inteiro>.png` acessivel ao processo. Mesmo sem traversal, o provider ja expoe todo o cache de box art a qualquer app instalado, revelando quais jogos e quais hosts (UUID) o usuario tem — vazamento de perfil de uso. Alem disso, `Integer.parseInt(appId)` (:57) nao esta protegido: uma URI com appId nao numerico lanca `NumberFormatException` que se propaga pelo binder e derruba o processo do app.

**Plano de implementação**

Tres correcoes no mesmo arquivo: (1) em `openFile`, retornar `null`/lancar `FileNotFoundException` quando `match != BOXART_URI_ID`, e registrar o padrao correto `sUriMatcher.addURI(AUTHORITY, BOXART_PATH + "/*/#", BOXART_URI_ID)`; (2) validar o segmento uuid com `UUID.fromString(uuid)` dentro de try/catch antes de usa-lo, e envolver `Integer.parseInt(appId)` em try/catch lancando `FileNotFoundException`; (3) canonicalizar o resultado com `file.getCanonicalPath().startsWith(cacheDir.getCanonicalPath() + File.separator)` antes de abrir. Independentemente disso, avaliar trocar `exported="true"` por `exported="false"` + `grantUriPermissions="true"` e conceder a URI via `Intent.FLAG_GRANT_READ_URI_PERMISSION` no `PreviewProgram` — o launcher de TV suporta esse modelo e ele elimina o acesso irrestrito. Endurecer `CacheHelper.openPath` para rejeitar componentes contendo `..` ou `/` beneficia todos os chamadores.

**Risco**

Severidade high.

---

## B55

### PcView exportada aceita pin/passphrase por Intent e dispara pareamento automatico sem confirmacao

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/PcView.java:255`

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

`PcView` e `android:exported="true"` por ser a activity LAUNCHER (AndroidManifest.xml:91-95). Em `onCreate` ela le `hostname`, `port`, `pin` e `passphrase` diretamente dos extras do Intent (:257-260) e, se os tres ultimos estiverem presentes, arma `pendingPairingAddress` (:263). O listener de polling em `startComputerUpdates` (:307-319) chama `doPair(details, pendingPairingPin, pendingPairingPassphrase)` assim que um host online bater com aquele endereco — **sem nenhum dialogo de confirmacao**, porque a confirmacao existe apenas em `AddComputerManually` (:378-391), que fica fora desse caminho. Qualquer app instalado (sem permissao nenhuma) pode `startActivity` em `PcView` com esses extras e forcar o cliente a executar um pareamento — uma operacao que altera estado de seguranca (fixa um certificado de servidor e concede acesso de streaming). Encadeado com o deep link `art://` (AndroidManifest.xml:186-191), uma pagina web consegue: adicionar um host controlado pelo atacante (uma confirmacao, cujo texto exibe um `name` fornecido pelo proprio atacante em `AddComputerManually.java:371-380`) e, na sequencia, parear automaticamente com PIN e passphrase que o atacante conhece — sem segunda confirmacao. Alem disso, `new ComputerDetails.AddressTuple(hostname, port)` (:263) lanca `IllegalArgumentException` para `port <= 0` (ComputerDetails.java:23-25), ou seja, um Intent com `port=0` derruba a activity de lancamento do app.

**Plano de implementação**

Exigir confirmacao explicita do usuario antes de qualquer `doPair` originado de Intent externo: em `PcView.onCreate`, so armar `pendingPairingAddress` apos um `AlertDialog` que mostre host, porta e a origem (`getReferrer()`), com botao afirmativo neutro (nao default). Melhor ainda: mover a leitura desses extras para uma activity dedicada nao-launcher com `exported="false"`, e fazer `AddComputerManually` inicia-la via Intent explicito — assim nenhum app de terceiros alcanca esse caminho. Independentemente, envolver a construcao de `AddressTuple` em try/catch e validar `port` em `1..65535` antes.

**Risco**

Severidade high.

---

## B56

### AccessibilityService declara leitura de conteudo de tela para uma funcao que so precisa filtrar teclas

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/res/xml/keyboard_accessibility_service.xml:8`

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

O XML de configuracao declara `android:canRetrieveWindowContent="true"`, `android:accessibilityFlags="flagDefault|flagRequestFilterKeyEvents|flagRetrieveInteractiveWindows"` e sete tipos de evento (`typeWindowContentChanged`, `typeViewFocused`, `typeViewClicked`, ...) **sem restringir `android:packageNames`**. Isso e o que o Android usa para montar o dialogo de consentimento: o usuario ve o aviso de 'controle total do dispositivo / ler o conteudo da tela'. O codigo real so precisa de `onKeyEvent` para reencaminhar teclas fisicas ao stream (KeyboardAccessibilityService.java:22-49); `onAccessibilityEvent` esta vazio (:64-66). Em runtime, `onServiceConnected` (:52-61) reduz o escopo — `info.packageNames = { BuildConfig.APPLICATION_ID }` e `info.flags = FLAG_REQUEST_FILTER_KEY_EVENTS` apenas — mas isso e tardio e nao altera a capacidade concedida nem o que o usuario autorizou. Ha ainda uma incoerencia: `info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK` (:56) pede todos os eventos para um callback que nao faz nada, e `feedbackType = FEEDBACK_SPOKEN` (:59) declara feedback falado que o servico nao produz. Alem do risco tecnico, isso e um problema pratico de distribuicao: a politica de Accessibility API do Google Play exige justificativa para servicos com esse escopo.

**Plano de implementação**

Reduzir o XML ao minimo funcional: `android:accessibilityEventTypes="typeWindowStateChanged"` (ou nenhum), `android:accessibilityFlags="flagRequestFilterKeyEvents"`, remover `android:canRetrieveWindowContent`, remover `flagRetrieveInteractiveWindows` e adicionar `android:packageNames="com.limelight"` (o applicationId com sufixo do flavor). Em `onServiceConnected`, trocar `info.eventTypes = TYPES_ALL_MASK` por `AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED` e `feedbackType` por `FEEDBACK_GENERIC`. Documentar no dialogo/tela de ajuda por que o servico e necessario, ja que o usuario vera um aviso assustador de qualquer forma.

**Risco**

Severidade high.

---

## B57

### Downgrade silencioso para HTTP em texto claro quando o certificado fixado nao confere

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:359`

**Subsistema:** Segurança, Privacidade e Robustez — ver [referência](../reference/seguranca.md)

**Por quê**

Em `getServerInfo(boolean)`, uma `SSLHandshakeException` cuja causa e `CertificateException` — exatamente o sintoma de um MITM apresentando outro certificado — e convertida em um `HostHttpResponseException(401, "Server certificate mismatch")` sintetico (:361-365), e o handler logo abaixo (:375-379) refaz a requisicao `serverinfo` sobre `baseUrlHttp`, isto e, **HTTP sem TLS**, sem avisar o usuario. O comentario diz que a intencao e permitir reparear quando o host trocou de certificado, mas o efeito colateral e que um atacante na rede que apenas apresente um certificado invalido forca o cliente a falar em claro. O `serverinfo` obtido nesse caminho alimenta decisoes sensiveis: `PairStatus` (ComputerDetails.java:79), `HttpsPort` (NvHTTP.java:652), `ExternalIP`/`LocalIP` e `appversion` — que por sua vez escolhe SHA-1 vs SHA-256 no pareamento (PairingManager.java:190-199). Um atacante que consiga esse downgrade pode responder `appversion` com major < 7 e empurrar o pareamento para SHA-1. A `network_security_config.xml` permite cleartext globalmente (`cleartextTrafficPermitted="true"`, sem `domain-config`), entao nada na plataforma barra isso.

**Plano de implementação**

Nao fazer o fallback automatico: propagar o erro e mostrar ao usuario um dialogo especifico ('o certificado deste host mudou — se voce nao reinstalou o host, isso pode ser um ataque'), exigindo acao explicita para limpar o cert fixado e reparear (o unico caso legitimo). Em `PairingManager.pair`, recusar o hash SHA-1 quando o host ja foi visto anteriormente com major >= 7 (guardar a versao junto do cert em `ComputerDatabaseManager`). Na `network_security_config.xml`, manter `cleartextTrafficPermitted` apenas onde e inevitavel: o pareamento HTTP em IPs de LAN nao pode ser restrito por dominio, mas vale documentar isso em um comentario no XML para que ninguem 'conserte' o arquivo sem entender.

**Risco**

Severidade high.

---

## B58

### StreamView.java é código morto mas o CLAUDE.md aponta para ele como o caminho do commit-text

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/ui/StreamView.java:130-157`

**Subsistema:** Delta Artemis vs Moonlight upstream — ver [referência](../reference/artemis-vs-moonlight.md)

**Por quê**

O activity_game.xml trocou <com.limelight.ui.StreamView> por <com.limelight.ui.StreamContainer> e o Game.java só referencia `streamContainer` (Game.java:209, 461-464). Nenhum layout ou classe de produção instancia StreamView — a única referência viva é o teste app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java. Isso significa que (a) o teste valida um caminho que não roda, e (b) qualquer agente que siga o CLAUDE.md atual ("StreamView.onCreateInputConnection() já intercepta commitText") vai editar o arquivo errado e concluir que a mudança não teve efeito.

**Plano de implementação**

Ou apagar StreamView.java e reapontar o teste para StreamContainer, ou, se quiser manter por compatibilidade, marcar @Deprecated com um comentário explícito apontando para StreamContainer. Em qualquer caso corrigir o CLAUDE.md/AGENTS.md para citar StreamContainer.java:185-202 como o ponto vivo.

**Risco**

Severidade high.

---

## B59

### Activity Game não declara windowSoftInputMode e não observa insets de IME — bloqueio raiz do comportamento AnyDesk

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/AndroidManifest.xml:194-203`

**Subsistema:** Delta Artemis vs Moonlight upstream — ver [referência](../reference/artemis-vs-moonlight.md)

**Por quê**

A entrada de .Game no manifest não tem android:windowSoftInputMode, e Game.java não tem nenhum setOnApplyWindowInsetsListener nem leitura de WindowInsetsCompat.Type.ime() (grep confirmado: as únicas ocorrências de WindowInsets em Game.java são o comentário TODO da linha 1649). Combinado com FLAG_FULLSCREEN (Game.java:359), FLAG_LAYOUT_IN_SCREEN (Game.java:369) e SYSTEM_UI_FLAG_IMMERSIVE_STICKY (Game.java:1666), o Android ignora adjustResize e o teclado simplesmente cobre o stream. O ExternalDisplayControlActivity prova que o padrão correto já é conhecido no codebase (setDecorFitsSystemWindows(false) + insets.isVisible(Type.ime()) em ExternalDisplayControlActivity.java:169-176).

**Plano de implementação**

Adicionar android:windowSoftInputMode="adjustResize" na Activity Game; quando prefConfig.fullScreen estiver ligado, não usar FLAG_FULLSCREEN e sim WindowInsetsControllerCompat.hide(Type.systemBars()) com BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE; registrar um ViewCompat.setOnApplyWindowInsetsListener no decorView que aplique bottom padding/margin no container quando Type.ime() estiver visível. Usar WindowInsetsCompat (não WindowInsets.Type.ime(), que é API 30+) por causa do minSdk 21.

**Risco**

Severidade high.

---

## B60

### O único teste do envio de texto inteiro cobre uma classe morta

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java:31`

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

StreamViewCommitTextTest instancia `new StreamView(ctx)` e valida que commitText é encaminhado a handleCommitText. Mas StreamView não é usado em produção: não aparece em nenhum layout XML (a única referência de layout é com.limelight.ui.StreamContainer em app/src/main/res/layout/activity_game.xml:14) e não é instanciado em nenhum arquivo de app/src/main/java nem dos source sets de flavor — a busca por StreamView fora do próprio arquivo só encontra comentários e métodos de nome parecido em Game.java (getStreamViewRelativeNormalizedXY etc.). Game.java:141-142 implementa StreamContainer.InputCallbacks e ExternalControllerView.InputCallbacks, nunca StreamView.InputCallbacks. Resultado: o teste que dá cobertura à feature nº2 do dono do fork (enviar texto inteiro) passa verde sobre código que nunca executa, e os dois caminhos vivos — StreamContainer.onCreateInputConnection (StreamContainer.java:186-202) e ExternalControllerView.onCreateInputConnection (ExternalControllerView.java:59-85) — têm cobertura zero.

**Plano de implementação**

Reapontar o teste para StreamContainer, inflando activity_game.xml ou instanciando StreamContainer diretamente, e duplicá-lo para ExternalControllerView. Depois excluir app/src/main/java/com/limelight/ui/StreamView.java. Acrescentar casos que o teste atual não cobre e que são exatamente os que quebram na prática: texto multibyte e emoji, composição do IME (setComposingText seguido de finishComposingText, o caminho normal de teclados preditivos como Gboard), string vazia e deleteSurroundingText. Verificar em cada caso que MoonBridge.sendUtf8Text recebe o texto completo de uma vez, e não fragmentado.

**Risco**

Severidade high.

---

## B61

### Três implementações duplicadas do mesmo InputConnection de commitText

**Tamanho:** small · **Severidade:** high · **Local:** `app/src/main/java/com/limelight/ui/StreamContainer.java:186`

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

O bloco onCheckIsTextEditor + onCreateInputConnection + BaseInputConnection anônimo sobrescrevendo commitText/deleteSurroundingText existe copiado em três classes: StreamContainer.java:180-202, StreamView.java:125-157 e ExternalControllerView.java:59-85. Cada uma declara sua própria interface InputCallbacks com a mesma assinatura (StreamContainer.java:28-31, StreamView.java:159-166, ExternalControllerView.java:87-90), obrigando Game.java:141-142 a implementar duas delas. Uma das três é morta; as outras duas estão vivas e divergem em detalhe (StreamView usa if/return explícito, StreamContainer condensa em `a && b || super`). Toda correção no teclado precisa ser aplicada em dois lugares e testada em dois, e o risco de um agente encontrar o primeiro por grep e declarar pronto é alto — o sintoma seria a feature funcionando no display interno e quebrada no externo.

**Plano de implementação**

Extrair para com.limelight.ui.CommitTextInputConnection (ou uma factory estática) que receba a View hospedeira e um único callback compartilhado, e unificar as três interfaces InputCallbacks em uma só em com.limelight.ui. StreamContainer e ExternalControllerView passam a delegar; Game.java deixa de implementar duas interfaces e passa a implementar uma. Fazer isso DEPOIS de reapontar os testes, para que eles sirvam de rede de segurança.

**Risco**

Severidade high.

---

## B62

### Configuração de shadows do Robolectric fora do classpath — nunca é lida

**Tamanho:** small · **Severidade:** high · **Local:** `robolectric.properties:1`

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

O arquivo robolectric.properties está na raiz do repositório e declara shadows=com.limelight.shadows.ShadowBackdropFrameRenderer. O Robolectric resolve robolectric.properties pelo classpath de teste — no plugin Android isso significa app/src/test/resources/robolectric.properties. Esse diretório não existe: app/src/test contém apenas java/. Consequentemente a propriedade nunca é carregada e ShadowBackdropFrameRenderer (app/src/test/java/com/limelight/shadows/ShadowBackdropFrameRenderer.java:6), cujo comentário diz existir para evitar o crash do Choreographer, nunca é registrado. É código de teste morto e uma proteção que os desenvolvedores acreditam ter e não têm — perigoso justamente porque testes que dependem de janela e redimensionamento, o território do EPIC do teclado, são os que vão esbarrar nesse crash.

**Plano de implementação**

Mover para app/src/test/resources/robolectric.properties. Aproveitar para centralizar o que hoje é repetido: sdk=33 e a lista completa de shadows (ShadowMoonBridge, ShadowGameManager, ShadowBackdropFrameRenderer), removendo os @Config duplicados de StartupTest.java:24, StartupCrashTest.java:26, SimpleStartupTest.java:20, ProfilesManagerTest.java:22, ProfilesOverlayTest.java:24, OverlayPreferencesTest.java:26, ProfilesActivityUiTest.java:33, ProfilesNavigationTest.java:30 e LayoutInflationTest.java:17. Validar que o shadow passou a ser aplicado — um log em seu run() é a prova mais direta, já que hoje ele nunca é carregado.

**Risco**

Severidade high.

---

## B63

### Repositório sem nenhum CI; o único arquivo de pipeline é herança quebrada do upstream

**Tamanho:** small · **Severidade:** high · **Local:** `appveyor.yml:14`

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

Não existe .github/workflows/ — o .github/ tem apenas CONTRIBUTING.md e três templates de issue. O histórico confirma que nem o upstream ClassicOldSong (upstream/moonlight-noir) nem o moonlight-stream/master jamais tiveram GitHub Actions. Sobra o appveyor.yml, herdado e nunca adaptado ao fork, com três defeitos independentes descritos nos achados seguintes. O fork mitigou parcialmente com tools/validate.mjs, que é um bom gate local — mas depende do mesmo toolchain ausente: a máquina do dono não tem JDK nem Android SDK (verificado: java, javac, ANDROID_HOME e JAVA_HOME ausentes), então os estágios build e test são sempre pulados (validate.mjs:63) e a validação é estruturalmente parcial. Para um repositório que será trabalhado por agentes de IA durante meses, essa é a lacuna mais cara: um CI é o único lugar onde build e testes de fato rodam.

**Plano de implementação**

Adicionar .github/workflows/ci.yml conforme a proposta detalhada em improvementIdeas, reaproveitando tools/validate.mjs como o passo único de verificação — no runner, com SDK presente, ele executa os 4 estágios de verdade. O fork Moonlight V+, disponível como remote `vplus`, tem pipeline funcional em vplus/master:.github/workflows/android-ci.yml; usar como base, adaptando os nomes de tarefa para o flavor nonRoot_game (o V+ usa nonRoot) e removendo os passos de Kotlin, androidTest e google-services que não se aplicam.

**Risco**

Severidade high.

---

## B64

### AppVeyor publica um artefato de lint com nome de flavor inexistente

**Tamanho:** small · **Severidade:** high · **Local:** `appveyor.yml:17`

**Subsistema:** Build, CI, Testes e Qualidade — ver [referência](../reference/build-e-ci.md)

**Por quê**

O passo after_build faz `appveyor PushArtifact app\build\reports\lint-results-nonRootDebug.html`. Esse nome corresponde ao flavor `nonRoot` do Moonlight upstream. Neste fork o flavor chama-se `nonRoot_game` (app/build.gradle:48), portanto o AGP gera lint-results-nonRoot_gameDebug.html. O caminho referenciado nunca existe e o único output que o pipeline se propunha a entregar jamais é publicado — um pipeline que, mesmo se rodasse, não produziria nada.

**Plano de implementação**

Se o appveyor.yml for mantido, corrigir para lint-results-nonRoot_gameDebug.html. A recomendação, porém, é remover o appveyor.yml junto com a adoção do GitHub Actions — dois pipelines dos quais um está morto são dois sinais contraditórios, pior que um só.

**Risco**

Severidade high.

---

