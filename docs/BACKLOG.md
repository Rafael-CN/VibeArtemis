# Backlog

> Semeado pela análise multi-agente de 2026-08-16 (14 subsistemas, 1.059 leituras
> de arquivo). Mantido à mão desde então.

**308 problemas** — 10 críticos, 55 altos, 140 médios, 103 baixos.
**161 ideias de melhoria.**

Nada aqui foi verificado em dispositivo. Trate como hipótese bem fundamentada com
âncora de `arquivo:linha`, não como fato confirmado — confirme antes de agir.

## Por onde começar

1. [EPIC E01 — teclado](epics/E01-teclado-anydesk.md) — a dor que motivou o fork.
2. Os críticos abaixo, principalmente os que também afetam o teclado.
3. Os quick-wins, para ganhar tração no codebase.

## Problemas críticos

### Loop infinito de configuração do decoder em SoCs NVIDIA e MediaTek

`app/src/main/java/com/limelight/binding/video/MediaCodecHelper.java:541 e :672 (loop em MediaCodecDecoderRenderer.java:756)` · bug · [Pipeline de Vídeo e Decodificação](reference/video.md)

O loop `for (int tryNumber = 0;; tryNumber++)` em initializeDecoder() só termina quando tryConfigureDecoder() tem sucesso OU quando setDecoderLowLatencyOptions() retorna false (`if (!newFormat) return -5;`). Porém o bloco NVIDIA (MediaCodecHelper.java:541-547) não tem nenhum guard de `tryNumber` e faz `setNewOption = true` incondicionalmente; e no bloco MediaTek a linha `setNewOption = true;` (:672) está FORA do `if (tryNumber < 4)` (:637). Em qualquer decoder omx.nvidia/c2.nvidia/omx.mtk/c2.mtk, setNewOption é sempre true, então se o configure() nunca tiver sucesso (Surface inválido, resolução não suportada, decoder ocupado) o loop roda para sempre criando e destruindo instâncias de MediaCodec. Como initializeDecoder() é chamado tanto de setup() quanto do caminho de recuperação (:905), isso trava a thread de conexão ou a thread que estiver fazendo a recuperação, com log 'Decoder configuration try: N' crescendo sem fim.

**Correção:** Envolver o bloco NVIDIA em `if (tryNumber < N)` e mover `setNewOption = true;` do MTK para dentro do `if (tryNumber < 4)`. Adicionalmente, colocar um teto absoluto no loop de initializeDecoder (ex.: `if (tryNumber > 8) return -5;`) como rede de segurança.

### Buffer de 256 bytes no caminho de criptografia do control stream é uma armadilha de stack smash para qualquer tentativa de enviar texto em bloco

`app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c:704` · security · [Camada Nativa](reference/jni-e-nativo.md)

`sendMessageEnet` monta o pacote em claro dentro de `char tempBuffer[256]` na pilha e faz `memcpy(&packet[1], payload, paylen)` em ControlStream.c:727. A única proteção é `LC_ASSERT(sizeof(*packet) + paylen < sizeof(tempBuffer))` em ControlStream.c:723 — e `LC_ASSERT` expande para `assert()` (Platform.h:96), que é anulado por NDEBUG em release, já que `-DLC_DEBUG` só é passado quando `NDK_DEBUG=1` (Android.mk:52-54). Hoje isso nunca dispara porque o splitter por code point garante paylen <= 12, mas é exatamente o código que alguém vai remover ao implementar 'mandar o texto inteiro num pacote'. Com `NVCTL_ENET_PACKET_HEADER_V2` de 4 bytes, o teto seguro é paylen <= 251, ou seja `PACKET_SIZE(holder) <= 251` → texto UTF-8 <= 243 bytes. No caminho legado não-encriptado (GFE < 7.1.431), o teto é ainda menor: `MAX_INPUT_PACKET_SIZE` = 128 (InputStream.c:43, buffer em InputStream.c:254).

**Correção:** Antes de qualquer feature de 'texto em bloco': (1) aumentar `tempBuffer` para o tamanho máximo real de pacote ou alocar dinamicamente; (2) trocar o LC_ASSERT por uma checagem de runtime que retorna false e loga; (3) adicionar validação de tamanho em LiSendUtf8TextEvent (InputStream.c:1005) rejeitando payloads acima do teto negociado. Documentar o teto de 243 bytes/pacote em qualquer design de extensão de protocolo.

### frame_pacing do usuário é sobrescrito incondicionalmente para BALANCED em runtime

`app/src/main/java/com/limelight/Game.java:692-703` · bug · [Preferências, Configuração e Perfis](reference/preferencias.md)

Game.java executa `prefConfig.framePacing = PreferenceConfiguration.FRAME_PACING_BALANCED;` nos DOIS ramos do if (preferLowerDelays true e false), logo após o valor ter sido corretamente lido de `frame_pacing` em PreferenceConfiguration.java:637-666. Com isso os modos 'latency' (FRAME_PACING_MIN_LATENCY, default), 'cap-fps' e 'smoothness' nunca chegam ao MediaCodecDecoderRenderer, que decide política de release por prefs.framePacing (MediaCodecDecoderRenderer.java:1136,1182,1284-1296). A ListPreference `frame_pacing` (preferences.xml:53-60) fica cosmética; só o efeito colateral warp/warp2 (framePacingWarpFactor, PreferenceConfiguration.java:863-868 → Game.java:775-777) e a checagem de cap-fps em Game.java:757-765 (que também é reescrita para BALANCED) sobrevivem parcialmente.

**Correção:** Remover as duas atribuições de prefConfig.framePacing em Game.java:696 e 702; fazer preferLowerDelays apenas configurar decoderRenderer.setPreferLowerDelays()/setPreferLowerDelaysTimeoutUs() e manter o framePacing lido da preferência. Se a intenção era que pref_low_latency_frame_balance implique BALANCED, aplicar somente quando prefConfig.framePacing == FRAME_PACING_MIN_LATENCY e documentar no summary da preferência.

### enqueueCommitText nunca dispara o flush quando o texto gera mais de um chunk: textos > 512 bytes são silenciosamente descartados

`app/src/main/java/com/limelight/Game.java:4331` · bug · [UI, Recursos e Internacionalização](reference/ui-e-i18n.md)

enqueueCommitText (Game.java:4314) fatia o texto em chunks de 512 bytes e os adiciona a commitTextQueue; no final, só agenda o flush com 'if (commitTextQueue.size() == 1) { commitTextHandler.post(flushCommitTextQueue); }'. Se a fila estava vazia e uma única chamada produz 2 ou mais chunks (qualquer texto acima de 512 bytes UTF-8 — colagem, ditado longo, teclado com predição agressiva), size() vale 2+ e o Runnable NUNCA é postado: o texto fica parado na fila e nada é enviado ao host. Só volta a fluir se uma próxima chamada por acaso deixar a fila com exatamente 1 elemento, o que é improvável. Isso corta pela raiz justamente a feature de 'enviar texto inteiro pela conexão'.

**Correção:** Trocar a condição por um flag booleano de 'flush agendado' ou simplesmente por 'if (!flushScheduled) { flushScheduled = true; commitTextHandler.post(flushCommitTextQueue); }', limpando o flag quando a fila esvazia dentro de flushCommitTextQueue (Game.java:317-330). Alternativa mínima: guardar o tamanho da fila antes do loop e postar se 'sizeAntes == 0'. Adicionar teste unitário cobrindo payloads de 1, 512, 513 e 5000 bytes.

### Fila de commitText nunca é drenada quando o texto gera mais de um bloco (>512 bytes UTF-8) — e trava permanentemente

`app/src/main/java/com/limelight/Game.java:4331` · bug · [Entrada de Teclado](reference/input-teclado.md)

`enqueueCommitText()` fatia o texto em N blocos e depois faz `if (commitTextQueue.size() == 1) commitTextHandler.post(flushCommitTextQueue);`. Se o texto produzir 2+ blocos, `size()` nunca é 1 no momento do teste, o Runnable NUNCA é postado e nada é enviado. Pior: a fila fica permanentemente com itens residuais, de modo que qualquer commit posterior (mesmo de 1 bloco) também falha na condição `size() == 1` — o recurso de commitText fica morto até o fim da sessão. Isso mata exatamente o caso de uso 'enviar texto inteiro em bloco' que o dono do fork quer.

**Correção:** Substituir o contador pela flag de agendamento: adicionar `private boolean commitFlushScheduled = false;` e usar `if (!commitFlushScheduled) { commitFlushScheduled = true; commitTextHandler.post(flushCommitTextQueue); }`; no Runnable (Game.java:317-331), setar `commitFlushScheduled = false` quando a fila esvaziar e mantê-la true ao reagendar. Alternativa mínima: trocar por `if (!commitTextHandler.hasCallbacks(flushCommitTextQueue))` (API 29+) ou simplesmente `commitTextHandler.removeCallbacks(flushCommitTextQueue); commitTextHandler.post(flushCommitTextQueue);`.

### Activity .Game não declara windowSoftInputMode — o teclado do sistema sobrepõe o stream (o problema nº1 do dono do fork)

`app/src/main/AndroidManifest.xml:193` · ux · [Entrada de Teclado](reference/input-teclado.md)

O bloco `<activity android:name=".Game" ...>` (linhas 193-216) não tem `android:windowSoftInputMode`. Com `SOFT_INPUT_ADJUST_UNSPECIFIED`, o WindowManager escolhe pan/nada; e como a janela adiciona `FLAG_FULLSCREEN` (Game.java:359) e `FLAG_LAYOUT_IN_SCREEN` (Game.java:369), o Android NUNCA redimensiona a janela para o IME — o teclado simplesmente desenha por cima do vídeo. O único `windowSoftInputMode` do manifesto está em `.preferences.AddComputerManually` (linha 179).

**Correção:** Adicionar `android:windowSoftInputMode="adjustResize"` à Activity .Game E remover FLAG_FULLSCREEN em favor de `WindowInsetsControllerCompat.hide(Type.systemBars())`, senão o adjustResize é ignorado (ver finding seguinte). O configChanges já inclui `screenSize|screenLayout` (linha 195), então o resize não recria a Activity.

### Modelo de janela legado (FLAG_FULLSCREEN + IMMERSIVE_STICKY) impede qualquer adjustResize/insets do IME

`app/src/main/java/com/limelight/Game.java:357` · tech-debt · [Entrada de Teclado](reference/input-teclado.md)

onCreate adiciona `FLAG_FULLSCREEN` e `SYSTEM_UI_FLAG_LAYOUT_STABLE|LAYOUT_HIDE_NAVIGATION|LAYOUT_FULLSCREEN` (357-367) mais `FLAG_LAYOUT_IN_SCREEN` (369); o Runnable `hideSystemUi` (1646-1669) reaplica `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` e é re-agendado por `onSystemUiVisibilityChange` a cada 2000 ms sempre que as flags caem (3914-3928). Existe um TODO explícito na linha 1649 ('Do we want to use WindowInsetsController here on R+ instead of SYSTEM_UI_FLAG_IMMERSIVE_STICKY?') que nunca foi implementado. Nenhum `setDecorFitsSystemWindows`, `OnApplyWindowInsetsListener` ou `WindowInsetsCompat.Type.ime()` existe em Game.java — só em ExternalDisplayControlActivity.java:169-176. Consequência: mesmo declarando adjustResize, o IME continuaria sobrepondo, e o loop de immersive-sticky brigaria com o teclado (que em immersive é tratado como barra transitória).

**Correção:** Migrar Game.java para o modelo moderno: (1) `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`; (2) trocar `hideSystemUi` por `WindowInsetsControllerCompat.hide(WindowInsetsCompat.Type.systemBars())` + `setSystemBarsBehavior(BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)` — NUNCA esconder `Type.ime()`; (3) suprimir o re-agendamento de `hideSystemUi` enquanto `insets.isVisible(Type.ime())` for true; (4) copiar o padrão já existente em ExternalDisplayControlActivity.java:169-176.

### Chave privada do cliente, uniqueid e banco de hosts entram no backup de nuvem e no device-transfer

`app/src/main/AndroidManifest.xml:48` · security · [Segurança, Privacidade e Robustez](reference/seguranca.md)

`android:allowBackup="true"` esta ativo e as duas regras de backup excluem apenas o dominio `sharedpref`: `backup_rules.xml:4` (`<exclude domain="sharedpref" path="."/>`) e `backup_rules_s.xml` (mesma exclusao em `cloud-backup` e `device-transfer`). Como `AndroidCryptoProvider` grava `files/client.key` em PKCS#8 DER puro (AndroidCryptoProvider.java:61-62,:181) e `IdentityManager` grava `files/uniqueid` (IdentityManager.java:15,:61), e como `ComputerDatabaseManager` cria `databases/computers4.db` com os certificados fixados dos hosts (ComputerDatabaseManager.java:26,:49,:129), todos esses artefatos sao copiados para o Google Drive do usuario e transferidos em uma migracao de aparelho. A chave privada e a unica credencial de autenticacao do cliente contra o host: quem a obtem se autentica como esse cliente pareado, sem PIN. O comentario nas regras ('Don't sync preferences because it often contains device-specific data') mostra que a intencao era o oposto do efeito. Ironicamente, o que foi excluido (preferencias) e o que menos importa, e o que ficou incluido (chave privada) e o que mais importa.

**Correção:** Excluir explicitamente os artefatos de identidade em ambos os arquivos de regra: em `backup_rules.xml`, adicionar `<exclude domain="file" path="client.key"/>`, `<exclude domain="file" path="client.crt"/>`, `<exclude domain="file" path="uniqueid"/>` e `<exclude domain="database" path="computers4.db"/>`; replicar em `backup_rules_s.xml` dentro de `<cloud-backup>` e `<device-transfer>`. Alternativa mais forte: mover a chave privada para o Android Keystore (`KeyGenParameterSpec` com `setUserAuthenticationRequired(false)` e alias dedicado) — mas isso exige um caminho de migracao, porque o par existente precisa continuar valido para os hosts ja pareados; sem migracao o usuario perde todos os pareamentos.

### OpenSSL 1.1.1q estaticamente linkado, EOL desde setembro de 2023

`app/src/main/jni/moonlight-core/openssl/include/openssl/opensslv.h:43` · security · [Build, CI, Testes e Qualidade](reference/build-e-ci.md)

Os .a de libcrypto/libssl commitados no repositório (22 MB, 4 ABIs) são da OpenSSL 1.1.1q, de 05/07/2022. A linha 1.1.1 chegou a fim de vida em 11/09/2023 e o binário está preso várias correções atrás do último release da série (1.1.1w), incluindo CVE-2023-0286 (type confusion em GENERAL_NAME_cmp ao comparar endereços X.400, severidade alta), CVE-2023-0215 (use-after-free em BIO_new_NDEF), CVE-2023-2650 (DoS em OBJ_obj2txt), CVE-2023-3446 e CVE-2023-3817 (DoS em DH_check) e CVE-2023-5678. Esta é a base criptográfica do pareamento e do canal de controle com o host. Agravante de auditoria: os binários entraram no repositório sem nenhum registro de proveniência — não há README, checksum, script de build nem tag da versão de origem; o único indício da versão é o header. Não há como um agente ou revisor verificar como foram produzidos. O AGENTS.md classifica openssl/ como vendorizada e proíbe edição, o que está certo como regra de higiene, mas tem o efeito colateral de tornar a defasagem invisível — ninguém olha para lá.

**Correção:** Curto prazo: criar app/src/main/jni/moonlight-core/openssl/PROVENANCE.md registrando versão, origem, data e SHA-256 de cada .a, e abrir issue de atualização. Prazo real: migrar para OpenSSL 3.x ou BoringSSL com script de build reprodutível (docker + NDK) versionado em tools/, gerando os .a em CI em vez de commitá-los. Verificar antes se moonlight-common-c usa APIs removidas na 3.x (RSA/EVP legadas) — o upstream do moonlight-common-c já enfrentou essa migração e é a melhor fonte de comparação.

### targetSdk 34 com compileSdk 36 bloqueia publicação e distorce a base do EPIC do teclado

`app/build.gradle:12` · compatibility · [Build, CI, Testes e Qualidade](reference/build-e-ci.md)

O projeto compila contra a API 36 mas declara targetSdk 34. Isso tem duas consequências independentes. (1) Distribuição: a Play Console exige API 35 para novos envios e atualizações desde 31/08/2025, e sobe para 36 em 31/08/2026 — o app é impublicável hoje. (2) E esta é a mais importante para o dono do fork: targetSdk 34 mantém o app FORA do enforcement edge-to-edge do Android 15. Quando o targetSdk subir para 35, o Android passa a desenhar por baixo das barras de sistema por padrão, setDecorFitsSystemWindows deixa de ser respeitado e todo o cálculo de insets/IME muda. Qualquer solução de 'empurrar o stream quando o teclado abre' construída sobre targetSdk 34 tem grande chance de quebrar no salto para 35. A ordem correta é subir o targetSdk primeiro e só então projetar o redimensionamento — não o inverso. Nota de processo: o AGENTS.md lista 'mudar minSdk/targetSdk' entre os itens que exigem ADR, o que é acertado — este achado é justamente o insumo desse ADR, não autorização para mudar direto.

**Correção:** Tratar a subida de targetSdk como pré-requisito (não sequela) do EPIC do teclado, via ADR em docs/adr/. Passo 1: subir para 35 em branch descartável, rodar o app e catalogar as regressões de inset/fullscreen em Game.java. Passo 2: substituir FLAG_FULLSCREEN e SYSTEM_UI_FLAG_IMMERSIVE_STICKY por WindowInsetsControllerCompat + WindowCompat.setDecorFitsSystemWindows(window, false), que é a API compatível com minSdk 21 via androidx. Passo 3: implementar o resize por ime() insets sobre essa base. Adicionar teste Robolectric com @Config(sdk = {30, 34, 35}) cobrindo o cálculo de insets.

## Problemas de severidade alta

| Problema | Categoria | Local | Subsistema |
|---|---|---|---|
| STUN de descoberta de endereço externo só executa quando o usuário está em VPN | bug | `app/src/main/java/com/limelight/computers/ComputerManagerService.java:333-392` | [Rede, Protocolo e Descoberta de Hosts](reference/rede.md) |
| Eventos UTF-8 são fragmentados em um pacote ENet por code point, com 50 ms de latência inicial | performance | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:591-651` | [Rede, Protocolo e Descoberta de Hosts](reference/rede.md) |
| Pacotes de controle 0x3001 (Set Clipboard) e 0x3002 (File transfer nonce) do Apollo são declarados mas não tratados, disparando LC_ASSERT(false) | bug | `app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c:1021-1095` | [Rede, Protocolo e Descoberta de Hosts](reference/rede.md) |
| Preferencia errada passada ao AndroidAudioRenderer: playHostAudio ocupa o lugar de enableAudioFx | bug | `app/src/main/java/com/limelight/Game.java:876` | [Pipeline de Audio](reference/audio.md) |
| Flick/inércia libera o botão de mouse errado, deixando botão direito/meio preso no host | bug | `app/src/main/java/com/limelight/binding/input/touch/TrackpadContext.java:99-102` | [Entrada de Toque, Trackpad, Mouse e Caneta](reference/input-touch.md) |
| Coordenadas de toque absoluto e de caneta ignoram o zoom/pan do vídeo | bug | `app/src/main/java/com/limelight/Game.java:2532-2540` | [Entrada de Toque, Trackpad, Mouse e Caneta](reference/input-touch.md) |
| Modo "Track pad (Natural)" na tela ignora sensibilidade e swap de eixo configurados | ux | `app/src/main/java/com/limelight/Game.java:4186` | [Entrada de Toque, Trackpad, Mouse e Caneta](reference/input-touch.md) |
| ACTION_CANCEL no trackpad emulado deixa o botão esquerdo pressionado no host | bug | `app/src/main/java/com/limelight/Game.java:2914-2962` | [Entrada de Toque, Trackpad, Mouse e Caneta](reference/input-touch.md) |
| framePacing escolhido pelo usuário é sobrescrito para BALANCED em todos os casos | bug | `app/src/main/java/com/limelight/Game.java:696 e :702` | [Pipeline de Vídeo e Decodificação](reference/video.md) |
| Caminho LATEST_ONLY tem a condição invertida e faz bypass do Choreographer, corrompendo o pacing e as estatísticas | bug | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1213` | [Pipeline de Vídeo e Decodificação](reference/video.md) |
| Caminho LATEST_ONLY pula doCodecRecoveryIfRequired(), podendo travar a recuperação de codec | bug | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1243` | [Pipeline de Vídeo e Decodificação](reference/video.md) |
| enqueueNsByPtsUs (LongSparseArray) é acessado de duas threads sem sincronização e vaza entradas | bug | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:58, :87-89, :1688` | [Pipeline de Vídeo e Decodificação](reference/video.md) |
| sendUtf8Text envia Modified UTF-8 (CESU-8), não UTF-8 real — emoji e caracteres do plano suplementar chegam corrompidos ou são descartados | bug | `app/src/main/jni/moonlight-core/simplejni.c:126-131` | [Camada Nativa](reference/jni-e-nativo.md) |
| O 'texto em bloco' não existe no fio: moonlight-common-c fragmenta todo pacote UTF-8 em um code point por pacote | tech-debt | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:610-648` | [Camada Nativa](reference/jni-e-nativo.md) |
| Penalidade fixa de ~50 ms + espera por ACK em CADA pacote UTF-8, inclusive em hosts Sunshine/Apollo onde o workaround não se aplica | performance | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:598-608` | [Camada Nativa](reference/jni-e-nativo.md) |
| Chave do JoyCon fix divergente entre XML e código: toggle inerte | bug | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:951` | [Preferências, Configuração e Perfis](reference/preferencias.md) |
| checkbox_forceTightThresholds é uma preferência 100% morta, lida por reflection sobre um campo hardcoded | tech-debt | `app/src/main/java/com/limelight/preferences/PreferenceConfiguration.java:233` | [Preferências, Configuração e Perfis](reference/preferencias.md) |
| OverlaySharedPreferences.edit() grava na base: escritas feitas com perfil ativo são silenciosamente sombreadas | bug | `app/src/main/java/com/limelight/profiles/ProfilesManager.java:251` | [Preferências, Configuração e Perfis](reference/preferencias.md) |
| Perfil é snapshot completo das prefs globais, não delta — inclui lixo de runtime e congela configurações | tech-debt | `app/src/main/java/com/limelight/EditProfileActivity.java:74` | [Preferências, Configuração e Perfis](reference/preferencias.md) |
| Não existe preferência nem suporte para redimensionar o stream quando o IME abre | ux | `app/src/main/AndroidManifest.xml:193` | [Preferências, Configuração e Perfis](reference/preferencias.md) |
| Gamepads dos drivers USB anunciam supportedButtonFlags = 0 ao host | bug | `app/src/main/java/com/limelight/binding/input/driver/AbstractXboxController.java:32` | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| AnalogStickFree e keyAnalogStickFree nao tratam ACTION_CANCEL: stick trava pressionado | bug | `app/src/main/java/com/limelight/binding/input/virtual_controller/AnalogStickFree.java:372` | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| PreferenceConfiguration.readPreferences() e chamado dentro de onDraw() de elementos do OSC | performance | `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalButton.java:162` | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| DigitalPad.rotateDrawable() aloca dois Bitmaps e um Canvas por frame desenhado | performance | `app/src/main/java/com/limelight/binding/input/virtual_controller/DigitalPad.java:250` | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| Overlay de stick-para-teclado dispara 4 KeyEvents por amostra de toque, sem deteccao de mudanca | performance | `app/src/main/java/com/limelight/binding/input/virtual_controller/keyboard/KeyBoardAnalogStickButton.java:118` | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| VirtualController le SharedPreferences a cada evento de entrada do OSC | performance | `app/src/main/java/com/limelight/binding/input/virtual_controller/VirtualController.java:249` | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| Game.java é uma god-class de 4348 linhas implementando 12 interfaces | maintainability | `app/src/main/java/com/limelight/Game.java:139` | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| A janela do Game é configurada de forma que o IME nunca pode redimensionar o stream (causa raiz do requisito AnyDesk #1) | ux | `app/src/main/java/com/limelight/Game.java:357` | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| onSystemUiVisibilityChange reimpõe immersive sticky 2s depois, brigando com o IME | bug | `app/src/main/java/com/limelight/Game.java:3915` | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| Game.onStop() chama finish() incondicionalmente e a Activity é noHistory+singleTask | tech-debt | `app/src/main/java/com/limelight/Game.java:1855` | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| Bug no agendamento do flush de commitText: textos com mais de um chunk nunca são enviados | bug | `app/src/main/java/com/limelight/Game.java:4331` | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| ui/StreamView.java é código morto, mas é a única classe coberta pelo teste de commitText | tech-debt | `app/src/main/java/com/limelight/ui/StreamView.java:15` | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| Activity Game não declara windowSoftInputMode: o teclado virtual sempre cobre o stream | ux | `app/src/main/AndroidManifest.xml:193` | [UI, Recursos e Internacionalização](reference/ui-e-i18n.md) |
| Sete idiomas traduzidos são inalcançáveis: values-bg, values-pl, values-tr, values-pt, values-eo ausentes de arrays.xml e locales_config.xml | tech-debt | `app/src/main/res/values/arrays.xml:58` | [UI, Recursos e Internacionalização](reference/ui-e-i18n.md) |
| App sem android:supportsRtl apesar de ter locale hebraico ativo | compatibility | `app/src/main/AndroidManifest.xml:46` | [UI, Recursos e Internacionalização](reference/ui-e-i18n.md) |
| Dead keys e composição de IME são descartadas silenciosamente — impossível digitar acentos (crítico para pt-BR/ABNT2) | bug | `app/src/main/java/com/limelight/Game.java:2093` | [Entrada de Teclado](reference/input-teclado.md) |
| Flag SS_KBE_FLAG_NON_NORMALIZED é calculada independentemente de forceQwerty — cliente mente ao host quando forceQwerty está desligado | bug | `app/src/main/java/com/limelight/Game.java:2108` | [Entrada de Teclado](reference/input-teclado.md) |
| Teclas com mapeamento normalizado mas fora do switch são descartadas em vez de usar o fallback por scancode | bug | `app/src/main/java/com/limelight/binding/input/KeyboardTranslator.java:412` | [Entrada de Teclado](reference/input-teclado.md) |
| UTF8_CHUNK_SIZE = 512 excede MAX_INPUT_PACKET_SIZE = 128 do moonlight-common-c (stack overflow no caminho de criptografia legado) | security | `app/src/main/java/com/limelight/Game.java:313` | [Entrada de Teclado](reference/input-teclado.md) |
| Preferência ignoreSynthEvents desativa TODOS os teclados virtuais próprios e o AccessibilityService | bug | `app/src/main/java/com/limelight/Game.java:2036` | [Entrada de Teclado](reference/input-teclado.md) |
| Não existe nenhum campo de entrada de texto (EditText) em toda a UI de streaming | ux | `app/src/main/java/com/limelight/Game.java:2401` | [Entrada de Teclado](reference/input-teclado.md) |
| enqueueCommitText nunca inicia o dreno quando o texto gera 2+ chunks — texto longo fica preso na fila | bug | `app/src/main/java/com/limelight/Game.java:4331` | [Comparação Artemis](reference/comparacao-vplus.md) |
| Bloqueio da dor #1 do dono: activity .Game sem windowSoftInputMode e com IMMERSIVE_STICKY reaplicado | ux | `app/src/main/AndroidManifest.xml:194` | [Comparação Artemis](reference/comparacao-vplus.md) |
| Divergência de submódulo moonlight-common-c torna impossível portar qualquer feature de protocolo do V+ | tech-debt | `app/src/main/jni/moonlight-core/moonlight-common-c` | [Comparação Artemis](reference/comparacao-vplus.md) |
| ContentProvider exportado sem permissao permite path traversal e leitura do cache por qualquer app | security | `app/src/main/java/com/limelight/PosterContentProvider.java:34` | [Segurança, Privacidade e Robustez](reference/seguranca.md) |
| PcView exportada aceita pin/passphrase por Intent e dispara pareamento automatico sem confirmacao | security | `app/src/main/java/com/limelight/PcView.java:255` | [Segurança, Privacidade e Robustez](reference/seguranca.md) |
| AccessibilityService declara leitura de conteudo de tela para uma funcao que so precisa filtrar teclas | security | `app/src/main/res/xml/keyboard_accessibility_service.xml:8` | [Segurança, Privacidade e Robustez](reference/seguranca.md) |
| Downgrade silencioso para HTTP em texto claro quando o certificado fixado nao confere | security | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:359` | [Segurança, Privacidade e Robustez](reference/seguranca.md) |
| StreamView.java é código morto mas o CLAUDE.md aponta para ele como o caminho do commit-text | maintainability | `app/src/main/java/com/limelight/ui/StreamView.java:130-157` | [Delta Artemis vs Moonlight upstream](reference/artemis-vs-moonlight.md) |
| Activity Game não declara windowSoftInputMode e não observa insets de IME — bloqueio raiz do comportamento AnyDesk | ux | `app/src/main/AndroidManifest.xml:194-203` | [Delta Artemis vs Moonlight upstream](reference/artemis-vs-moonlight.md) |
| O único teste do envio de texto inteiro cobre uma classe morta | maintainability | `app/src/test/java/com/limelight/ui/StreamViewCommitTextTest.java:31` | [Build, CI, Testes e Qualidade](reference/build-e-ci.md) |
| Três implementações duplicadas do mesmo InputConnection de commitText | tech-debt | `app/src/main/java/com/limelight/ui/StreamContainer.java:186` | [Build, CI, Testes e Qualidade](reference/build-e-ci.md) |
| Configuração de shadows do Robolectric fora do classpath — nunca é lida | bug | `robolectric.properties:1` | [Build, CI, Testes e Qualidade](reference/build-e-ci.md) |
| Repositório sem nenhum CI; o único arquivo de pipeline é herança quebrada do upstream | maintainability | `appveyor.yml:14` | [Build, CI, Testes e Qualidade](reference/build-e-ci.md) |
| AppVeyor publica um artefato de lint com nome de flavor inexistente | bug | `appveyor.yml:17` | [Build, CI, Testes e Qualidade](reference/build-e-ci.md) |

## Ganhos rápidos

| Melhoria | Subsistema |
|---|---|
| Corrigir o aninhamento do STUN em populateExternalAddress | [Rede, Protocolo e Descoberta de Hosts](reference/rede.md) |
| Validar a resposta de /actions/clipboard antes de escrever no clipboard do Android | [Rede, Protocolo e Descoberta de Hosts](reference/rede.md) |
| Tornar AddressTuple imutável | [Rede, Protocolo e Descoberta de Hosts](reference/rede.md) |
| Corrigir a troca de preferencia enableAudioFx/playHostAudio | [Pipeline de Audio](reference/audio.md) |
| Mute local do stream durante a sessao (e cumprir o //静音 todo) | [Pipeline de Audio](reference/audio.md) |
| Rastrear o botão ativo do drag no TrackpadContext (corrige botão preso) | [Entrada de Toque, Trackpad, Mouse e Caneta](reference/input-touch.md) |
| Aplicar sensibilidade/swap de eixo também ao trackpad de touchscreen | [Entrada de Toque, Trackpad, Mouse e Caneta](reference/input-touch.md) |
| Indicador visual de modo de toque ativo | [Entrada de Toque, Trackpad, Mouse e Caneta](reference/input-touch.md) |
| Corrigir o loop infinito de configuração em NVIDIA/MediaTek | [Pipeline de Vídeo e Decodificação](reference/video.md) |
| Restaurar o respeito ao frame pacing escolhido pelo usuário | [Pipeline de Vídeo e Decodificação](reference/video.md) |
| Corrigir a codificação de sendUtf8Text: trocar String por byte[] UTF-8 real | [Camada Nativa](reference/jni-e-nativo.md) |
| Adicionar binding de LiGetHostFeatureFlags para o app conhecer as capacidades do host | [Camada Nativa](reference/jni-e-nativo.md) |
| Higienizar preferências mortas e órfãs | [Preferências, Configuração e Perfis](reference/preferencias.md) |
| Sincronizar os controles duplicados de bitrate e validar limites | [Preferências, Configuração e Perfis](reference/preferencias.md) |
| Telemetria de configuração no DebugInfoActivity | [Preferências, Configuração e Perfis](reference/preferencias.md) |
| Corrigir supportedButtonFlags dos drivers USB | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| Cachear PreferenceConfiguration nos elementos do OSC e remover leituras de prefs do onDraw | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| De-duplicar eventos do stick-para-teclado e remover codigo morto | [Entrada de Controle/Gamepad](reference/input-gamepad.md) |
| Quick win — Corrigir o flush de commitText para payloads >512 bytes | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| Quick win — Remover código morto: ui/StreamView.java, ui/ApertureViewGroup.java, app/src/game/ | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| Endurecer o PosterContentProvider (URI matching + validação de path) | [Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md) |
| Corrigir enqueueCommitText: textos acima de 512 bytes são descartados silenciosamente | [UI, Recursos e Internacionalização](reference/ui-e-i18n.md) |
| Ressincronizar a lista de idiomas: liberar polonês, turco, búlgaro e português europeu | [UI, Recursos e Internacionalização](reference/ui-e-i18n.md) |
| Limpeza de recursos e dependências órfãs + habilitar shrinkResources | [UI, Recursos e Internacionalização](reference/ui-e-i18n.md) |
| Corrigir o bug da fila de commitText (quick win que destrava o envio de texto em bloco) | [Entrada de Teclado](reference/input-teclado.md) |
| Alternância de teclado por N dedos também no modo de toque nativo (único porte de teclado do V+ que compensa) | [Comparação Artemis](reference/comparacao-vplus.md) |
| Registrar em ADR que cherry-pick do V+ é inviável e que todo porte é reimplementação | [Comparação Artemis](reference/comparacao-vplus.md) |
| Blindar o backup: excluir chave privada, uniqueid e banco de hosts | [Segurança, Privacidade e Robustez](reference/seguranca.md) |
| Fechar os vazamentos de recurso pontuais ja mapeados | [Segurança, Privacidade e Robustez](reference/seguranca.md) |
| Unificar as três cópias de InputConnection num único componente | [Delta Artemis vs Moonlight upstream](reference/artemis-vs-moonlight.md) |
| Consertar o retorno de OverlaySharedPreferences.edit() | [Delta Artemis vs Moonlight upstream](reference/artemis-vs-moonlight.md) |
| Documentar o delta CRLF para não desperdiçar leitura de diff | [Delta Artemis vs Moonlight upstream](reference/artemis-vs-moonlight.md) |
| Mover robolectric.properties para o classpath de teste e centralizar a configuração | [Build, CI, Testes e Qualidade](reference/build-e-ci.md) |
| Higiene de build: limpar código morto e acelerar a iteração local | [Build, CI, Testes e Qualidade](reference/build-e-ci.md) |

## EPICs propostos

### EPIC — Barra de texto estilo AnyDesk: enviar a string inteira via clipboard do Apollo + Ctrl+V

[Rede, Protocolo e Descoberta de Hosts](reference/rede.md)

**Por quê:** É o requisito (2) do dono do fork e a única primitiva JÁ existente com semântica 'texto inteiro de uma vez' é o endpoint HTTP /actions/clipboard do Apollo (NvHTTP.java:922-937), que faz um único POST text/plain. O caminho atual (sendUtf8Text) é fundamentalmente incremental: um pacote ENet por code point com 50 ms de setup (InputStream.c:591-651).

**Como:** 1) Criar um overlay de entrada de texto no Game (ao lado dos botões flutuantes já existentes em Game.java:300-310) com um EditText local — a digitação NÃO gera tráfego. 2) No 'Enviar', chamar NvHTTP.sendClipboard(texto) (NvHTTP.java:929) numa thread de I/O, esperar o retorno true, e então emitir Ctrl+V via Game.sendKeys/conn.sendKeyboardInput (Game.java:2210-2230 e NvConnection.java:537) usando os códigos do KeyboardTranslator. 3) Preservar e restaurar o clipboard anterior do host (getClipboard antes, sendClipboard depois) para não destruir o conteúdo do usuário. 4) Gatear pela capacidade do host: bit clipboard_set = 0x00010000 do campo Permission (ComputerDetails.java:190, 214) e pela heurística de resposta vazia já implementada em NvHTTP.java:931-936. 5) Fallback automático para conn.sendUtf8Text quando o host não suportar clipboard.

**Risco:** Depende de o app em foco no host aceitar Ctrl+V (não funciona em campos que bloqueiam colagem, nem em jogos com input raw). O restore do clipboard cria uma janela de corrida se o usuário copiar algo no host no meio. Requer permissão clipboard_set concedida no Apollo — precisa de mensagem de erro clara quando negada.

### EPIC — Empacotar múltiplos code points por pacote UTF-8 quando o host for Sunshine/Apollo

[Rede, Protocolo e Descoberta de Hosts](reference/rede.md)

**Por quê:** Ataca a causa raiz da lentidão de digitação sem depender do clipboard: hoje cada code point é um pacote ENet confiável separado, e o hack de flush + PltSleepMs(50) foi escrito explicitamente para contornar um bug do GFE (comentário em InputStream.c:601-606), não do Sunshine/Apollo.

**Como:** No submódulo app/src/main/jni/moonlight-core/moonlight-common-c: em InputStream.c:591-651, condicionar o caminho de fragmentação a !IS_SUNSHINE() (Limelight-internal.h:86). Para hosts Sunshine/Apollo, montar pacotes com o máximo de code points completos que caibam em UTF8_TEXT_EVENT_MAX_COUNT (Input.h:33, hoje 32 bytes) — mantendo a garantia de nunca cortar no meio de um code point — e aplicar o flush+sleep uma única vez por rajada em vez de por chamada de LiSendUtf8TextEvent. Validar contra o parser do host antes de aumentar UTF8_TEXT_EVENT_MAX_COUNT acima de 32. Depois, simplificar a fila de 512 bytes/15 ms do lado Java (Game.java:312-331, 4314-4334), que passa a ser redundante.

**Risco:** Mudança em submódulo compartilhado — precisa ser validada contra Sunshine vanilla, Apollo e Vibeshine. Se o parser do host assumir 1 code point por pacote, o texto chega corrompido. Requer teste com acentuação, emoji (4 bytes) e CJK. Mitigar com um preference de opt-in ('modo de texto rápido') durante a validação.

### EPIC — Modelo explícito de capacidades do host (HostCapabilities) e propagação até o Game

[Rede, Protocolo e Descoberta de Hosts](reference/rede.md)

**Por quê:** Hoje a distinção Apollo/Vibeshine vs Sunshine vanilla vs GFE está espalhada por heurísticas frágeis (NvHTTP.java:444 MJOLNIR, :664-676 ExternalPort, :550-570 VirtualDisplay*/ServerCommand, Limelight-internal.h:86 IS_SUNSHINE) e o clipboard sequer é detectado — é tentativa e erro (NvHTTP.java:931-936). Toda feature nova dependente do Apollo (injeção de texto, clipboard, file transfer, comandos de servidor) pagará esse custo de novo.

**Como:** Criar com.limelight.nvstream.http.HostCapabilities preenchida em NvHTTP.getComputerDetails(String) (NvHTTP.java:401-450) a partir do serverinfo: isNvidia (state contém MJOLNIR), isSunshineFamily (appversion quad[3] < 0, mesma regra do nativo), isApollo (presença de Permission/VirtualDisplayCapable/ServerCommand), permissionMask e flags derivadas (clipboardSet 0x10000, clipboardRead 0x20000, serverCmd 0x100000, conforme o comentário em ComputerDetails.java:173-204). Armazenar em ComputerDetails, persistir como cache no SQLite (ComputerDatabaseManager.java:110-139), propagar em ServerHelper.createStartIntent (ServerHelper.java:93-138) e consumir em GameMenu (GameMenu.java:288-305) para habilitar/desabilitar itens em vez de mostrar toasts de erro depois.

**Risco:** Mudança de schema do banco (precisa de migração ou de coluna nova tolerante a null). Requer alinhamento com o significado real dos bits de permissão do Apollo — o comentário em ComputerDetails.java:173-204 é a única fonte e pode envelhecer se o Apollo mudar o enum.

### EPIC: Camada de audio resiliente a mudancas de layout e ciclo de vida (pre-requisito da feature de teclado tipo AnyDesk)

[Pipeline de Audio](reference/audio.md)

**Por quê:** O objetivo n.1 do dono do fork — empurrar/redimensionar o stream quando o teclado virtual abre — esbarra numa arquitetura onde a destruicao da Surface derruba a conexao INTEIRA, audio incluso (Game.java:3832-3844 + ui/StreamContainer.java:249-258). Qualquer prototipo que troque de container, use um modo de render alternativo, ou entre/saia de multi-window vai matar o audio junto com o video e exigir reconexao, arruinando a experiencia que ele quer replicar. Desacoplar o ciclo de vida do audio do ciclo de vida da Surface e o que torna a feature viavel.

**Como:** Fase 1 — Blindar o caminho seguro: usar `windowSoftInputMode="adjustResize"` no `<activity android:name=".Game">` (AndroidManifest.xml:193-216; o configChanges ja cobre keyboardHidden|screenSize|screenLayout, logo a Activity NAO e recriada) e alterar apenas LayoutParams da SurfaceView existente; revisar o `setFixedSize(vw, vh)` de Game.java:900 para acompanhar a area util. Fase 2 — Guard de ciclo de vida: em `Game.surfaceDestroyed` (linha 3832), so chamar `stopConnection()` se `isFinishing() || isChangingConfigurations()==false && realmente saindo`, evitando teardown em transicoes de layout. Fase 3 — Separar os teardowns: hoje `stopAudioStream()` e `stopVideoStream()` sao inseparaveis dentro de `LiStopConnection`; documentar isso e, se necessario, introduzir um modo "video suspenso, audio ativo" (o decoder de video ja tem `prepareForStop()`, Game.java:3839) para que perder a Surface temporariamente nao interrompa o audio. Fase 4 — Testes de regressao cobrindo: abrir/fechar IME, rotacao, split-screen, PiP (`supportsPictureInPicture="true"`, AndroidManifest.xml:197) e external display, verificando em cada um que o log de `BridgeArInit`/`BridgeArCleanup` nao aparece.

**Risco:** Alto. Mexer no guard de `surfaceDestroyed` pode deixar a conexao viva com uma Surface morta, o que trava o decoder de video. A fase 3 pode exigir patch no submodulo moonlight-common-c (divergindo do upstream, com custo de merge futuro). Recomendo entregar as fases 1 e 2 primeiro, medindo com o modo de gravacao de audio habilitado (ver ideia correspondente) para provar que o audio nao e interrompido pelo resize.

### EPIC: Passagem de microfone do cliente para o host

[Pipeline de Audio](reference/audio.md)

**Por quê:** Nao existe nenhuma captura de audio no app — grep por `AudioRecord`, `RECORD_AUDIO` e `MODIFY_AUDIO_SETTINGS` em `app/src/main/java` e no AndroidManifest.xml nao retorna nada. Forks do Sunshine (incluindo a linhagem Apollo/Vibeshine que o dono do fork usa) tem suporte a sink de microfone. Para um cliente que ja mira uso tipo desktop remoto (teclado, texto), voz e o proximo degrau natural.

**Como:** Requer trabalho dos dois lados. Cliente: permissao RECORD_AUDIO, um `AudioRecord` a 48 kHz mono, encoder Opus (a libopus embarcada e decoder-only no uso atual, mas a .a completa normalmente inclui o encoder — verificar simbolos em `libopus/*/libopus.a` antes de assumir), e um novo canal de envio. Transporte: nao existe canal de audio ascendente no protocolo Moonlight atual — `Limelight-internal.h:56-67` lista os canais ENet (generic, urgent, keyboard, mouse, pen, touch, UTF8, serverctl, gamepad, sensor) e nenhum e para audio. Seria preciso um canal novo negociado por feature flag com o host, ou um socket RTP dedicado. Comecar validando o que o Vibeshine/Apollo ja expoe do lado host antes de escrever qualquer linha no cliente.

**Risco:** Muito alto. Envolve mudanca de protocolo (divergencia do moonlight-common-c upstream, com custo de manutencao permanente), permissao sensivel de privacidade (RECORD_AUDIO exige justificativa em lojas de app), verificacao de que o encoder Opus esta presente na .a prebuilt, e um caminho de latencia totalmente novo. So justificavel se o host ja tiver a contraparte pronta.

### EPIC: Layout ciente do IME — empurrar/redimensionar o stream quando o teclado virtual abre (paridade AnyDesk)

[Entrada de Toque, Trackpad, Mouse e Caneta](reference/input-touch.md)

**Por quê:** É a dor #1 declarada do dono do fork. Hoje o IME simplesmente cobre o vídeo porque a `.Game` não declara `windowSoftInputMode` e não há listener de insets de IME. Além do layout, o subsistema de toque precisa ser reavaliado no mesmo instante, senão o usuário ganha um vídeo redimensionado com toques desalinhados e botões de mouse presos.

**Como:** 1) `AndroidManifest.xml:193` — adicionar `android:windowSoftInputMode="adjustResize"` na activity `.Game`. 2) `Game.java` (perto de 455-515, onde `streamContainer` e `backgroundTouchView` são configurados) — `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)` e `ViewCompat.setOnApplyWindowInsetsListener(rootView, ...)` lendo `insets.getInsets(WindowInsetsCompat.Type.ime()).bottom`; usar `WindowInsetsAnimationCompat.Callback` para acompanhar a animação do teclado em vez de saltar. 3) Aplicar o inset como `bottomMargin` do `streamContainer` (ele já refaz o aspect-fit em `StreamContainer.onMeasure:114-150`, então o vídeo re-letterboxa sozinho). 4) Após cada layout, chamar `panZoomHandler.handleSurfaceChange()` (PanZoomHandler.java:79) e cancelar contextos ativos (`touchContextMap[i].cancelTouch()`) para não deixar botão pressionado. 5) Ajustar `hideSystemUi` (Game.java:1646-1670) para não reimpor `SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN` enquanto o IME estiver visível. 6) Adicionar pref `checkbox_resize_stream_for_keyboard` (preferences.xml, categoria `category_input_settings` linha 363) para quem prefere o comportamento atual. 7) Como o `AbsoluteTouchContext` já lê `targetView.getWidth()/getHeight()` a cada evento (AbsoluteTouchContext.java:126-129), o mapeamento se corrige sozinho depois que o bug de zoom (finding #2) for resolvido.

**Risco:** Alto acoplamento com o modo imersivo e com PiP/display externo; em `ScaleMode.STRETCH` a mudança de aspecto pode exigir renegociação com o host (Vibeshine com display virtual pode reagir bem, mas GFE não). Risco de flicker do SurfaceView durante a animação do IME. Mitigar com a pref de opt-in e testar em DeX, ChromeOS e display externo.

### EPIC: Redimensionar o stream quando o teclado virtual abre (comportamento AnyDesk)

[Pipeline de Vídeo e Decodificação](reference/video.md)

**Por quê:** Requisito nº1 do dono do fork. Hoje o IME sobrepõe o vídeo porque a activity é fullscreen sem tratamento de insets. A boa notícia: nenhuma mudança no decoder é necessária — o buffer do Surface é fixo (setFixedSize) e o SurfaceFlinger já escala para os bounds da view, então basta encolher a view.

**Como:** 1) Em Game.onCreate, após streamContainer = findViewById (Game.java:459), registrar ViewCompat.setOnApplyWindowInsetsListener na raiz lendo WindowInsetsCompat.Type.ime(). 2) Aplicar o bottom inset como altura reduzida do StreamContainer (LayoutParams.height = parentHeight - imeHeight) ou como padding da raiz — o StreamContainer.onMeasure() existente (StreamContainer.java:113-150) já recalcula o letterbox corretamente com o novo heightSize, tanto em FIT quanto em FILL. 3) Adicionar android:windowSoftInputMode="adjustResize" ao <activity .Game> (AndroidManifest.xml:193) e, enquanto o IME estiver visível, limpar FLAG_FULLSCREEN e sair do immersive sticky (o mesmo padrão já usado em Game.onMultiWindowModeChanged, :1688-1693) — senão o adjustResize é ignorado. 4) Chamar panZoomHandler.handleSurfaceChange() (PanZoomHandler.java:79) a partir de um OnLayoutChangeListener no StreamContainer, porque com setFixedSize ativo o SurfaceHolder.Callback.surfaceChanged NÃO dispara em mudança de bounds e o pan/zoom ficaria com bounds obsoletos. 5) Para os modos 3D, cachear width/height em onSurfaceChanged (Stereo3DRenderer.java:756) e usá-los em drawBothEyes (:349-350) no lugar de glSurfaceView.getWidth(). 6) Suprimir auto-PiP enquanto o IME estiver aberto via suppressPipRefCount (Game.java:1338).

**Risco:** Médio. Sair do fullscreen faz a status/navigation bar reaparecer momentaneamente (aceitável, é o que o AnyDesk faz). Cuidado com WindowInsetsAnimation em Android 11+ para evitar 'pulos' de layout. Em modo STRETCH (Game.java:1619 não define aspect ratio) o vídeo vai distorcer ao encolher — deve-se forçar FIT enquanto o IME estiver aberto, ou aplicar o aspect ratio sempre.

### EPIC: Extrair MediaCodecDecoderRenderer em componentes testáveis

[Pipeline de Vídeo e Decodificação](reference/video.md)

**Por quê:** 2433 linhas misturam seleção de decoder, patching de bitstream, loop de saída, pacing, recuperação de erro, coleta de estatísticas e formatação de UI (inclusive strings de R.string dentro do renderer, :1798-1876). Nada disso é testável isoladamente e cada mudança arrisca regressão em devices que ninguém tem.

**Como:** Dividir em: (a) DecoderSelector — findAvc/Hevc/Av1Decoder + performance points (:199-359); (b) BitstreamPatcher — todo o patching de SPS/CSD de :1726-1741 e :1900-2103, testável em JVM pura com jcodec e SPS capturados; (c) OutputPacer — as estratégias do loop de saída + doFrame; (d) CodecRecoveryCoordinator — :809-1066; (e) VideoStatsCollector + PerfOverlayFormatter (tirando R.string do renderer). Manter MediaCodecDecoderRenderer como fachada que implementa VideoDecoderRenderer. Adicionar testes Robolectric (o projeto já tem robolectric.properties na raiz) para BitstreamPatcher e VideoStatsCollector.

**Risco:** Alto em esforço, baixo em risco se feito incrementalmente e com o BitstreamPatcher primeiro (é a parte mais pura e mais perigosa de quebrar por acidente).

### EPIC — Canal de texto em bloco: extensão de protocolo Apollo para enviar até ~240 bytes de UTF-8 por pacote

[Camada Nativa](reference/jni-e-nativo.md)

**Por quê:** É a única forma de tornar o 'envia o texto inteiro' real no fio, em vez de um pacote confiável por code point com espera de ACK (InputStream.c:610-648, ControlStream.c:776-790). Combina com o campo de texto da UI para reproduzir a experiência do AnyDesk. Requer trabalho coordenado cliente+host.

**Como:** CLIENTE: (1) definir novo magic no namespace Apollo em Input.h (o namespace 0x8000xxxx já é usado por AP_SERVER_CMD_MAGIC em Input.h:198) com struct de texto de tamanho variável; (2) definir nova flag LI_FF_BULK_TEXT em Limelight.h:971 e lê-la de `x-ss-general.featureFlags` (RtspConnection.c:1131 já popula SunshineFeatureFlags); (3) em LiSendUtf8TextEvent (InputStream.c:1005) escolher o magic novo quando a flag estiver presente; (4) no inputSendThreadProc (InputStream.c:593) adicionar branch que envia o payload inteiro sem split e SEM o sleep de 50 ms; (5) fatiar em pedaços de no máximo 243 bytes respeitando fronteiras de code point (o teto vem de tempBuffer[256] em ControlStream.c:704 menos 4 bytes de header V2 menos 8 de NV_INPUT_HEADER); (6) ANTES de tudo, corrigir o tempBuffer conforme o achado crítico. HOST (Vibeshine/Apollo): implementar o parser do novo magic e anunciar a flag no SDP. FALLBACK: se a flag ausente, usar o caminho por code point de hoje.

**Risco:** Alto. Exige mudanças em três repos (Artemis, fork do moonlight-common-c, host Vibeshine) e um contrato de versão. O risco de segurança é concreto: qualquer erro de bounds no novo caminho é um stack smash em release (LC_ASSERT é no-op, Platform.h:83-96). Exige fuzzing do parser no host e teste com payloads no limite.

### Perfis por host e por app (resolução automática de perfil)

[Preferências, Configuração e Perfis](reference/preferencias.md)

**Por quê:** Perfis são globais e ativados à mão (ProfilesManager.java:158, ProfilesAdapter.java:54-63); ninguém lembra de trocar o perfil ao mudar de PC/jogo, o que gera bitrate/resolução errados silenciosamente. É a evolução natural do sistema já existente.

**Como:** 1) Estender SettingsProfile (app/src/main/java/com/limelight/profiles/SettingsProfile.java:6-21) com Set<String> hostUuids e Set<Integer> appIds (Gson tolera campos ausentes, então profiles.json antigo continua carregando). 2) Criar ProfilesManager.resolveFor(ComputerDetails, NvApp) com precedência app > host > ativo global e usá-la em getOverlayingSharedPreferences (ProfilesManager.java:200-207) por meio de um 'contexto de perfil' setado em ServerHelper.doStart e em Game.onCreate (Game.java:354). 3) UI: menu de contexto em AppView.onCreateContextMenu (AppView.java:443-480, onde já há 'hide app') com 'Atribuir perfil', e no PcView.onCreateContextMenu para hosts. 4) Mostrar o perfil resolvido no FAB de PcView/AppView (PcView.java:345-359).

**Risco:** Alto: mexe no ponto por onde toda a configuração é lida; um bug ali afeta o app inteiro. Exige cuidado com o singleton mutável e com estado por-thread. Fazer feature-flag e cobrir com testes de resolução de precedência.

### EPIC: Redimensionar o stream quando o teclado virtual abre (comportamento AnyDesk) sem quebrar o OSC

[Entrada de Controle/Gamepad](reference/input-gamepad.md)

**Por quê:** E a dor numero 1 do dono do fork. Hoje o IME simplesmente cobre o stream porque o Game roda em modo imersivo/fullscreen e todos os overlays (OSC de gamepad, overlay de teclado, botao flutuante) sao filhos absolutamente posicionados do FrameLayout raiz (Game.java:466, 1092, 1102, 1108), com margens em pixels calculadas sobre DisplayMetrics de tela cheia. Qualquer solucao que so mexa no SurfaceView vai desalinhar o OSC.

**Como:** 1) No Game, instalar `ViewCompat.setOnApplyWindowInsetsListener` no rootView e observar `WindowInsets.Type.ime()`; 2) aplicar a altura do IME como bottom padding/altura ao `streamContainer` (res/layout/activity_game.xml, id streamContainer) e recalcular o aspect ratio do SurfaceView; 3) informar o novo tamanho ao host — o Vibeshine/Sunshine ja aceita mudanca de resolucao/viewport, e o fork ja tem caminho de reconfiguracao em Game.onConfigurationChanged (Game.java:1194) que chama `virtualController.refreshLayout()` e `keyBoardController.refreshLayout()`; 4) tornar as posicoes do OSC relativas ao container (ver finding sobre VirtualControllerConfigurationLoader.java:212) para que refreshLayout() reposicione corretamente na area reduzida; 5) adicionar preferencia 'resize stream when keyboard opens' com fallback pro comportamento atual.

**Risco:** Redimensionar o SurfaceView durante o stream provoca recriacao de superficie no decoder (Game/MediaCodecDecoderRenderer) — precisa de debounce e teste em varios fabricantes. A migracao de layouts do OSC de pixels absolutos para fracoes exige migracao dos perfis salvos em SharedPreferences 'OSC' e 'OSC_Keyboard' (VirtualControllerElement.java:336-359, keyBoardVirtualControllerElement.java:396-427), senao usuarios perdem seus layouts.

### EPIC — Modo 'Teclado Ancorado': redimensionar o stream quando o IME abre (paridade AnyDesk #1)

[Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md)

**Por quê:** É o requisito nº 1 do dono do fork. Hoje o teclado virtual sempre cobre o vídeo porque a janela do Game é fullscreen+immersive e não há nenhum tratamento de WindowInsets.Type.ime() no caminho de streaming. A boa notícia é que a infraestrutura de layout já existe: StreamContainer.onMeasure recalcula o vídeo mantendo aspect ratio dentro do espaço disponível, então basta reduzir o espaço.

**Como:** 1) Nova preference `checkbox_ime_anchored_mode` em res/xml/preferences.xml + campo em preferences/PreferenceConfiguration.java (seguir o padrão de CHECKBOX_ENABLE_COMMIT_TEXT em :139/:208/:337/:991). 2) Extrair de Game.java um `GameWindowController` que centralize os flags hoje espalhados em Game.java:357-369 (FLAG_FULLSCREEN, SYSTEM_UI_FLAG_*, FLAG_LAYOUT_IN_SCREEN), Game.java:1646-1677 (hideSystemUi) e Game.java:3915-3928 (onSystemUiVisibilityChange). 3) Quando o modo estiver ligado: `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`, `getWindow().clearFlags(FLAG_FULLSCREEN)` ao detectar IME, e registrar `ViewCompat.setOnApplyWindowInsetsListener` no root (`findViewById(android.R.id.content)`, já que activity_game.xml usa <merge>). 4) Ler `insets.getInsets(WindowInsetsCompat.Type.ime()).bottom` e aplicar como bottom margin do `@id/streamContainer` (res/layout/activity_game.xml) — o `onMeasure` de ui/StreamContainer.java:114 reprojeta o vídeo sozinho. 5) Suprimir `hideSystemUi()` enquanto `imeVisible` (ver finding correspondente). 6) Após o relayout, chamar `panZoomHandler.handleSurfaceChange()` (utils/PanZoomHandler.java:79) e revalidar as coordenadas normalizadas de toque (Game.getStreamViewRelativeNormalizedXY, Game.java:2503 — elas usam width/height da view, então já acompanham). 7) Reaplicar fullscreen quando o IME fechar. Referência de implementação existente no próprio repo: utils/ExternalDisplayControlActivity.java:169-176 já faz setDecorFitsSystemWindows(false)+listener de insets com Type.ime().

**Risco:** Alto se aplicado sem flag: mexer nos flags de janela do Game afeta PiP (Game.java:1288), multi-window (Game.java:1681), display externo (que usa outra Activity) e o `setFixedSize` da SurfaceView (Game.java:900). Mitigação: manter atrás de preference, desligado por padrão, e testar explicitamente os cenários PiP/multi-window/display externo. Cuidado extra com `videoScaleMode == STRETCH` e `shouldIgnoreInsetsForResolution` (Game.java:1425), que assumem que a view ocupa a tela inteira.

### EPIC — Barra de composição de texto: digitar num campo e enviar a string inteira (paridade AnyDesk #2)

[Arquitetura Geral e Ciclo de Vida do App](reference/arquitetura.md)

**Por quê:** O transporte já existe e é confiável (LiSendUtf8TextEvent sobre canal ENet RELIABLE, moonlight-common-c/src/InputStream.c:1005), assim como o pipeline Java (Game.handleCommitText:4290 → enqueueCommitText:4314 → NvConnection.sendUtf8Text:619). O que falta é (a) uma UI de composição e (b) corrigir os dois bugs do caminho (agendamento do flush e modified-UTF-8 no JNI). Diferente do requisito #1, este é majoritariamente aditivo.

**Como:** 1) Corrigir primeiro o bug de agendamento em Game.java:4331 e a conversão UTF-8 em jni/moonlight-core/simplejni.c:127 (ver findings). 2) Adicionar um `EditText` + botão 'enviar' em res/layout/activity_game.xml, ancorado ao bottom, inicialmente `visibility=gone` e com `android:imeOptions=actionSend`. 3) Novo item no GameMenu (padrão de GameMenu.java:317, string em res/values/strings.xml) para alternar a barra; opcionalmente também um botão flutuante seguindo o padrão de Game.initFloatingButton (Game.java:1038). 4) No envio, chamar `handleCommitText(editText.getText())` — reusa o chunker e a fila existentes — e limpar o campo. 5) Como o EditText tem seu próprio InputConnection real, o `enableCommitText` do StreamContainer pode ficar desligado nesse modo, evitando a interferência com jogos que dependem de key-by-key (o próprio summary da preference em res/values/strings.xml:696 avisa disso). 6) Combinar com o EPIC de teclado ancorado para que o campo + IME empurrem o vídeo em vez de cobri-lo. 7) Opcional: um modo 'streaming' que envia a cada N ms enquanto digita, e um histórico de últimas strings.

**Risco:** Médio-baixo. O principal risco é o EditText roubar foco de teclas físicas e do gamepad durante o stream — mitigar liberando o foco (clearFocus + streamContainer.requestFocus()) assim que a barra fecha, e não interceptar onKeyPreIme quando a barra estiver visível. Cuidado com Game.onStop()->finish() (Game.java:1855): a barra precisa ser uma View dentro da própria Activity, nunca uma Activity/Dialog em outra task.

### EPIC: Modo 'IME docked' — empurrar/redimensionar o stream quando o teclado abre (comportamento AnyDesk)

[UI, Recursos e Internacionalização](reference/ui-e-i18n.md)

**Por quê:** É a dor nº1 explicitada pelo dono do fork. Hoje o IME cobre o stream porque a .Game não declara windowSoftInputMode e usa immersive sticky com LAYOUT_FULLSCREEN. O caminho é curto porque toda a infraestrutura de re-medição já existe: StreamContainer.onMeasure já faz fit por aspect ratio, e o layout raiz é um <merge> inflado direto no FrameLayout de android.R.id.content, então um bottom padding no content view redimensiona o container inteiro.

**Como:** 1) AndroidManifest.xml:193 — adicionar android:windowSoftInputMode="adjustResize" na .Game. 2) Game.java, logo após setContentView (:378), instalar ViewCompat.setOnApplyWindowInsetsListener no findViewById(android.R.id.content) lendo insets.getInsets(WindowInsetsCompat.Type.ime()).bottom e aplicando como bottom padding — usar exatamente o padrão já validado em ExternalDisplayControlActivity.java:169-176. 3) Substituir o Runnable hideSystemUi (Game.java:1646-1668) por WindowInsetsControllerCompat com BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE + WindowCompat.setDecorFitsSystemWindows(false), mantendo o caminho legado sob Build.VERSION_CODES.R para minSdk 21. 4) Adicionar WindowInsetsAnimationCompat.Callback para o padding acompanhar a animação do teclado em vez de saltar. 5) Aplicar a MESMA lógica ao teclado próprio: KeyBoardLayoutController.refreshLayout (:330) hoje faz addView com Gravity.BOTTOM sobre o stream — fazer o controller reportar sua altura via ViewCallbacks (:375) e o Game aplicar o mesmo padding. 6) Corrigir os imeOptions (StreamContainer.java:191) adicionando IME_FLAG_NO_FULLSCREEN para evitar extract mode em landscape. 7) Nova preferência checkbox_resize_stream_on_keyboard em preferences.xml (categoria category_input_settings, linha 363) com strings title_/summary_ novas. 8) Ao redimensionar, reavaliar se o pan/zoom (PanZoomHandler, criado em Game.java:481) precisa ser resetado ou reancorado.

**Risco:** Médio-alto. adjustResize interage mal com immersive sticky legado em algumas OEMs (MIUI, One UI) e pode fazer o SurfaceView recriar a superfície, disparando surfaceChanged (StreamContainer.java:240) e potencialmente um reconfigure do decoder — precisa testar se o pipeline de vídeo aguenta resize sem reconectar. Em modo 3D (GLSurfaceView) o onMeasure faz early-return (StreamContainer.java:115-118), então o caminho 3D precisa de tratamento separado. Também há risco de conflito com supportsPictureInPicture e com o display externo (isOnExternalDisplay). Recomenda-se ficar atrás de preferência e testar em Samsung/Xiaomi/Pixel.

### EPIC — Reflow do stream com os insets do IME (comportamento AnyDesk: teclado empurra a tela)

[Entrada de Teclado](reference/input-teclado.md)

**Por quê:** É a dor nº1 declarada do dono do fork. Hoje o teclado virtual cobre metade inferior do vídeo, escondendo justamente o campo onde ele está digitando no host. Todo o encanamento necessário já existe no repo: o padrão de insets está implementado em ExternalDisplayControlActivity, o SurfaceView já usa setFixedSize (o decoder não é reconfigurado ao redimensionar a View), o StreamContainer.onMeasure já recalcula o letterbox a partir do heightMeasureSpec, e o mapeamento de toque já normaliza contra as dimensões do streamContainer. É trabalho de janela/layout, não de vídeo.

**Como:** 1) AndroidManifest.xml:195 — adicionar `android:windowSoftInputMode="adjustResize"` à Activity .Game (configChanges já cobre screenSize|screenLayout, então não há recriação). 2) Game.java:357-369 — remover `FLAG_FULLSCREEN` e as `SYSTEM_UI_FLAG_*`; adicionar `WindowCompat.setDecorFitsSystemWindows(getWindow(), false)`. 3) Game.java:1645-1677 — reescrever `hideSystemUi` como `WindowInsetsControllerCompat(getWindow(), streamContainer)` com `hide(WindowInsetsCompat.Type.systemBars())` + `setSystemBarsBehavior(BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE)`, NUNCA escondendo `Type.ime()`; guardar um campo `imeVisible` e fazer `hideSystemUi(int)` (1671) virar no-op enquanto `imeVisible == true`. 4) Game.java:3914-3928 — `onSystemUiVisibilityChange` deixa de re-agendar quando imeVisible (ou é substituído inteiramente pelo listener de insets). 5) Instalar em onCreate (perto de Game.java:466, onde `rootView` já é obtido) um `ViewCompat.setOnApplyWindowInsetsListener((View)rootView, (v, insets) -> { int imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom; applyImeInset(imeBottom); return insets; })` — copiando literalmente o padrão de ExternalDisplayControlActivity.java:169-176. 6) `applyImeInset(int px)`: setar `bottomMargin = px` no `FrameLayout.LayoutParams` do `streamContainer` e chamar `requestLayout()`. `StreamContainer.onMeasure` (StreamContainer.java:113-150) recalcula sozinho o letterbox por aspect ratio no espaço restante; `PanZoomHandler.handleSurfaceChange()` (PanZoomHandler.java:79-108) já é chamado por `Game.surfaceChanged` (3786) e reposiciona o pan/zoom. 7) Animação: em API 30+, usar `WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP)` para interpolar o bottomMargin junto com a animação do IME; abaixo disso aplicar direto. 8) Overlays: `keyBoardLayoutController`, `keyBoardController`, `floatingMenuButton` e `overlayToggleZoomButton` são irmãos do streamContainer no FrameLayout de conteúdo (Game.java:466 + res/layout/activity_game.xml <merge>) — decidir por elemento se acompanham o reflow (botões flutuantes: sim; teclado on-screen próprio: deve ficar por cima do espaço liberado, não empurrar de novo). 9) Preferência nova `checkbox_ime_push_stream` (res/xml/preferences.xml, perto da linha 479) com default ON, para permitir voltar ao overlay. 10) Modo alternativo 'translate-only' (não redimensiona, só sobe o vídeo com `setTranslationY(-min(imeBottom, folgaInferior))`) para quem prefere manter o tamanho do vídeo — é ainda mais barato porque nem dispara layout.

**Risco:** Alto acoplamento com o modelo de janela: remover FLAG_FULLSCREEN pode alterar o comportamento de notch (Game.java:439-453), de PiP (getPictureInPictureParams usa getLocationOnScreen do streamContainer, Game.java:1287-1331) e de multi-window (onMultiWindowModeChanged, 1679-1699). O `setFixedSize` (Game.java:900) precisa continuar ativo, senão o resize da View reconfigura o buffer e pode causar glitch/reinicialização do decoder em MTK. Redimensionar o SurfaceView durante o stream pode gerar um frame preto em alguns SoCs — mitigar preferindo o modo translate-only como default em devices problemáticos. Testar especificamente com renderMode != 2D (GLSurfaceView, StreamContainer.java:86-94) e na tela externa.

### EPIC — Barra de injeção de texto (digitar num campo e enviar o texto inteiro via sendUtf8Text)

[Entrada de Teclado](reference/input-teclado.md)

**Por quê:** Segunda dor declarada do dono do fork e a solução definitiva para dead keys/IME/acentos: num EditText real o Android faz composição, predição, autocorreção, ditado por voz e swipe nativamente, e o cliente só precisa enviar o resultado final. A camada de transporte já existe e está parcialmente pronta (enqueueCommitText + fila com chunking UTF-8 + sendUtf8Text); o que falta é UI, um bug de fila e polimento.

**Como:** 1) PRÉ-REQUISITO: corrigir o bug de Game.java:4331 (fila nunca drenada com 2+ blocos) e reduzir `UTF8_CHUNK_SIZE` (Game.java:313) de 512 para <= 100 bytes. 2) Criar `com.limelight.ui.TextInjectionBar` (ou `binding/input/TextInjectionController`) espelhando a arquitetura já validada de `KeyBoardLayoutController`: recebe o `FrameLayout` raiz (`rootView`, Game.java:466), infla um layout novo `res/layout/text_injection_bar.xml` (EditText multiline + botões Enviar / Enter / Limpar / Colar-do-clipboard / Fechar) e se ancora com `FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT)` + `Gravity.BOTTOM` — exatamente como KeyBoardLayoutController.refreshLayout (linhas 321-357). 3) Entrada: novo `MenuOption` em GameMenu.java ao lado da linha 317 (`game::toggleKeyboard`), e opcionalmente um gesto (o slot de 3 dedos hoje chama toggleKeyboard, Game.java:3237/3318 — pode virar 'abre a barra de texto' se a preferência estiver ligada). 4) Ao abrir: `editText.requestFocus()` + `WindowInsetsControllerCompat.show(Type.ime())`; chamar `setInputGrabState(false)` (Game.java:1864) e `inputCaptureProvider.showCursor()` para liberar o pointer capture (ver finding correspondente) e suspender as recapturas de AndroidNativePointerCaptureProvider.java:88-109. Como o foco sai do `streamContainer`, `onKeyPreIme` (StreamContainer.java:161) deixa de interceptar e a digitação vai naturalmente para o EditText — nenhum guard extra é necessário no pipeline de teclado. 5) Ao 'Enviar': quebrar o texto em `\n`, e para cada segmento chamar `enqueueCommitText(segmento)` seguido de `conn.sendKeyboardInput((short)0x800D, KEY_DOWN/KEY_UP, getModifierState(), (byte)0)` (VK_RETURN) — `sendUtf8Text` não produz Enter na maioria dos hosts. Limpar o campo e manter o foco (opção 'manter aberto após enviar'). 6) Modo 'live' opcional: um TextWatcher que envia incrementalmente ao final de cada palavra, para quem quer ver o texto aparecer no host enquanto digita. 7) Para blocos muito grandes (> ~4 KB): oferecer o caminho de clipboard já existente — setar o clipboard local e chamar `sendClipboard` (Game.java:2288+) e depois enviar Ctrl+V via `sendKeys(new short[]{VK_LCONTROL, VK_V})` (padrão idêntico ao GameMenu.java:172), muito mais rápido que 100 bytes/15 ms. 8) Ligar `streamContainer.setCommitTextEnabled(true)` temporariamente não é necessário — o EditText é o editor. 9) Reaplicar `setInputGrabState(true)` ao fechar, e enviar KEY_UP dos modificadores pendentes.

**Risco:** Conflito de foco com pointer capture e com o `focusedByDefault` do streamContainer (res/layout/activity_game.xml) — precisa de teste com mouse/teclado físico conectados. Se o EPIC de reflow não estiver pronto, a barra ficará escondida atrás do IME (mitigável ancorando a barra pelos insets do IME, que é justamente o mesmo listener do EPIC 1 — os dois se apoiam mutuamente). Envio de texto grande pode estourar `MAX_QUEUED_INPUT_PACKETS = 150` (InputStream.c:46) se o chunking/throttle não for respeitado. Em tela externa é preciso duplicar a barra na ExternalDisplayControlActivity (que já tem o ExternalControllerView como raiz).

### EPIC — decidir explicitamente o que NÃO portar do V+ e fechar o escopo do fork

[Comparação Artemis](reference/comparacao-vplus.md)

**Por quê:** O dono migrou para o Artemis justamente para fugir do excesso de features do V+ (registrado no CLAUDE.md). O V+ tem hoje 157 chaves de preferência contra 133 do Artemis, com 113 exclusivas dele, incluindo módulos inteiros: framegen (Vulkan/LSFG-VK + shaders AMD FSR), EasyTier VPN, microfone, audio haptics, HDR10+, handbook offline, float ball, QR pairing, sync de configuração. Sem uma decisão escrita, cada análise futura vai reabrir a discussão de portar cada uma delas.

**Como:** Produzir um documento de escopo classificando as 113 preferências exclusivas do V+ em três baldes: (a) FORA — tudo que depende do submódulo qiin2333/moonlight-common-c (microfone, clipboard 0x5508, touchpad, HDR10+, cursor shapes) ou de módulo Gradle novo (framegen, haptics), por conflitar com as features Apollo do Artemis (sendExecServerCmd em MoonBridge.java:357, sendEmptyPayload em :359); (b) TALVEZ — melhorias de UI/QoL puramente Java-portáveis (toggle de teclado por N dedos, duplo-ESC, backup/restore de configuração); (c) JÁ TEMOS OU MELHOR — commitText (o Artemis tem, o V+ não), teclado virtual (4.186 vs 629 linhas), gestos multi-dedo, display virtual Apollo, perfis. Cruzar com a lista de chaves exclusivas de cada lado levantada nesta análise.

**Risco:** Baixo tecnicamente, mas é decisão de produto e não de engenharia: precisa do dono do fork. O risco é o documento nascer desatualizado, dado o ritmo de release do V+ (12.11.0 a 12.11.4 entre 23/07 e 14/08/2026) — mitigar datando e revisando por amostragem, não continuamente.

### EPIC — Mover a identidade criptografica do cliente para o Android Keystore

[Segurança, Privacidade e Robustez](reference/seguranca.md)

**Por quê:** Corrige a categoria inteira do problema em vez do sintoma: hoje a chave privada e um arquivo em disco legivel por qualquer processo com root, extraivel por backup e copiavel por qualquer ferramenta de dump de dados de app. Com o Keystore, a chave passa a ser nao-exportavel e as operacoes de assinatura acontecem dentro do TEE. E o unico caminho que torna irrelevante uma futura regressao nas regras de backup ou um novo componente exportado.

**Como:** Fase 1 — introduzir uma segunda implementacao de `LimelightCryptoProvider` (a interface ja existe em `nvstream/http/LimelightCryptoProvider.java`) baseada em `KeyPairGenerator.getInstance("RSA", "AndroidKeyStore")` com `KeyGenParameterSpec` (PURPOSE_SIGN, sem autenticacao de usuario, alias fixo). O certificado autoassinado continua gerado por BouncyCastle, mas assinado por um `ContentSigner` que delega ao `Signature` do Keystore. Fase 2 — `PlatformBinding.getCryptoProvider` escolhe a implementacao Keystore quando `Build.VERSION.SDK_INT >= 23` e um novo par ainda nao existe. Fase 3 — migracao: manter o par em arquivo funcionando para hosts ja pareados (a chave existente nao pode ser importada no Keystore de forma nao-exportavel), e oferecer na UI um 'regenerar identidade' que gera a nova chave no Keystore e exige reparear. Fase 4 — depois de uma versao de convivencia, apagar o caminho de arquivo. `NvHTTP.initializeHttpState` (:114-128) nao precisa mudar: o `X509KeyManager` ja obtem a chave pela interface.

**Risco:** Alto e concentrado na migracao. `minSdk` e 21, entao o caminho legado precisa continuar existindo para API 21-22. Chaves do Keystore sao perdidas em alguns cenarios (restauracao de fabrica parcial, troca de lock screen em versoes antigas do Android) — o app precisa detectar `KeyPermanentlyInvalidatedException`/`UnrecoverableKeyException` e guiar o usuario ao repareamento em vez de crashar. Exige um ADR em `docs/adr/` antes de comecar, porque muda o contrato de identidade do cliente com todos os hosts ja pareados.

### EPIC — Teclado estilo AnyDesk: empurrar o stream em vez de cobri-lo

[Delta Artemis vs Moonlight upstream](reference/artemis-vs-moonlight.md)

**Por quê:** É a dor número 1 do dono do fork e nenhum cliente Moonlight resolve. O codebase já tem o padrão certo implementado em outra Activity, então não é pesquisa e sim portabilidade.

**Como:** Fase 1 — desacoplar o full-screen: substituir FLAG_FULLSCREEN (Game.java:359) e o SYSTEM_UI_FLAG_IMMERSIVE_STICKY (Game.java:1660-1666) por WindowInsetsControllerCompat.hide(Type.systemBars()) com BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE, exatamente como ExternalDisplayControlActivity.java:160-167; corrigir de passagem o addFlags incondicional em Game.java:1693. Fase 2 — declarar android:windowSoftInputMode="adjustResize" na Activity Game (AndroidManifest.xml:194-203) e WindowCompat.setDecorFitsSystemWindows(getWindow(), false). Fase 3 — registrar ViewCompat.setOnApplyWindowInsetsListener no decorView (espelhando ExternalDisplayControlActivity.java:171-175), ler insets.getInsets(WindowInsetsCompat.Type.ime()).bottom e aplicar como bottomMargin/padding no StreamContainer, chamando requestLayout(); StreamContainer.onMeasure (StreamContainer.java:113-150) já recalcula o aspect ratio a partir do espaço disponível, então o vídeo se reajusta sozinho. Fase 4 — reavaliar o mapeamento de coordenadas: getStreamViewRelativeNormalizedXY (Game.java:2503) e updateMousePosition (Game.java:3353) usam a geometria da view, então devem seguir corretos, mas precisam de teste com teclado aberto. Fase 5 — fazer o mesmo para o teclado próprio do Artemis (KeyBoardLayoutController.refreshLayout, KeyBoardLayoutController.java:321-357), que hoje também sobrepõe. Guardar tudo atrás de uma preferência nova (ex.: checkbox_resize_on_ime) para não regredir o caso de uso de jogo.

**Risco:** Alto. As flags de janela do Game são exatamente o tipo de coisa que quebra em runtime e não em compilação, e variam muito por OEM (Samsung DeX, Xiaomi, dobráveis). Interage com PiP (getPictureInPictureParams, Game.java:1288), com o modo display externo (Game.java:397-416) e com o pan/zoom (PanZoomHandler.handleSurfaceChange, PanZoomHandler.java:79-109). Exige teste em dispositivo real com IME aberto/fechado, rotação e PiP.

### EPIC — Pipeline de CI em GitHub Actions reaproveitando tools/validate.mjs

[Build, CI, Testes e Qualidade](reference/build-e-ci.md)

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

[Build, CI, Testes e Qualidade](reference/build-e-ci.md)

**Por quê:** Encadeia duas coisas que parecem separadas e não são. O targetSdk 34 impede a publicação na Play Store desde agosto de 2025 e, ao mesmo tempo, mantém o app fora do enforcement edge-to-edge do Android 15 — o regime em que todo o cálculo de insets muda. Construir o resize do teclado sobre targetSdk 34 e só depois subir significa refazer o trabalho; subir primeiro significa projetar uma vez sobre a base definitiva.

**Como:** Fase 0 — ADR: o AGENTS.md exige ADR para mudar targetSdk, e com razão. Registrar a decisão e o encadeamento com o EPIC do teclado em docs/adr/ antes de qualquer commit de código.

Fase 1 — inventário: subir targetSdk para 35 em app/build.gradle:12 num branch descartável, compilar, rodar e catalogar cada regressão de janela. As candidatas conhecidas estão em Game.java: FLAG_FULLSCREEN e SYSTEM_UI_FLAG_IMMERSIVE_STICKY, que é o que hoje faz o Android ignorar adjustResize. Registrar em docs/epics/E01-teclado-anydesk.md — arquivo que o AGENTS.md já referencia e que ainda não existe.

Fase 2 — migrar para APIs compatíveis: substituir as flags legadas por WindowCompat.setDecorFitsSystemWindows e WindowInsetsControllerCompat. O que torna isso viável com minSdk 21 é que as variantes androidx funcionam em todos os níveis — a regra 2 do AGENTS.md sobre WindowInsets.Type.ime() ser API 30+ vale para a API da plataforma, não para WindowInsetsCompat.

Fase 3 — implementar o resize: OnApplyWindowInsetsListener no StreamContainer lendo WindowInsetsCompat.Type.ime() e ajustando a altura da superfície do stream ao espaço restante. É aqui que o comportamento do AnyDesk é reproduzido.

Fase 4 — validar: testes Robolectric com @Config(sdk = {21, 30, 33, 35}) sobre o cálculo de insets, mais teste manual em dispositivo com Gboard, com teclado físico e com display externo (ExternalDisplayControlActivity é um caminho paralelo que tende a ser esquecido).

Fase 5 — subir para 36, já que o prazo da Play Store para API 36 é 31/08/2026.

**Risco:** Alto, concentrado na Fase 2. Game.java tem 4.349 linhas e fan-out 44; o gerenciamento de janela está entrelaçado com ciclo de vida, overlays e virtual controller. Edge-to-edge afeta todas as activities, não só o stream — PcView, AppView e as telas de preferência também. Mitigações: inventário da Fase 1 em branch descartável antes de qualquer commit real; consultar docs/maps/HOTSPOTS.md e query.mjs --callers antes de tocar Game.java; e ter o CI já funcionando, porque este é precisamente o tipo de mudança em que a suíte de testes é a única defesa contra regressão silenciosa. O AGENTS.md também manda usar plan mode para flags de janela em Game.java — aplicável integralmente aqui.


## Problemas médios e baixos

Ficam em `docs/reference/<subsistema>.md`, na seção "Problemas conhecidos" de cada um.
Não foram promovidos aqui para este arquivo continuar utilizável.
