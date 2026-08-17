# Glossário

> Termos do domínio de game streaming e apelidos internos do codebase.
> 410 termos, consolidados da análise de 2026-08-16.

**-dontobfuscate** — diretiva em proguard-rules.pro:2 que faz o R8 apenas encolher, sem renomear classes. Stack traces de produção permanecem legíveis, mas as regras -keep continuam necessárias para reflexão, JNI e Gson.

**.noir / .noirdebug** — applicationIdSuffix de release e debug (app/build.gradle:137, :98). O AGENTS.md proíbe alterá-los — remover o sufixo faria o fork colidir com o applicationId oficial do Moonlight, cujo mantenedor recebe os crashes no Play Console dele (comentário longo em app/build.gradle:107-136).

**ACTION_MULTIPLE** — ação de KeyEvent (formalmente deprecated desde a API 29, mas ainda emitida) que carrega uma String em `getCharacters()` quando não há keycode correspondente. Caminho de texto multi-caractere: Game.java:2202-2207.

**actions/clipboard** — endpoint HTTP exclusivo do Apollo usado pelo clipboard sync do Artemis (NvHTTP.java:922-937). Retorna 404 em Sunshine, logo inerte no host Vibeshine do dono.

**activeAddress** — o AddressTuple que respondeu ao último poll bem-sucedido, definido em parallelPollPc (ComputerManagerService.java:649,661,673,685). É o endereço usado para tudo depois (launch, pairing, clipboard).

**activeGamepadMask / currentControllers / initialControllers** — bitmask de 16 bits (short) dos slots de jogador ocupados; enviada em todo pacote via getActiveControllerMask() (ControllerHandler.java:1076).

**AdapterFragment / AdapterFragmentCallbacks** — par de classes que desacopla PcView/AppView do GridView. A Activity implementa AdapterFragmentCallbacks e devolve o layout id via getAdapterFragmentLayoutId(); o Fragment infla e devolve o AbsListView via receiveAbsListView(). Usa android.app.Fragment (framework, deprecado), não AndroidX.

**Adaptive playback (FEATURE_AdaptivePlayback)** — capacidade de mudar resolução sem reconfigurar o codec; habilita KEY_MAX_WIDTH/HEIGHT (:544-547) e fused IDR. Blacklistado em omx.intel e omx.mtk (MediaCodecHelper.java:125-131).

**AddressTuple** — par (endereço, porta) com normalização de IPv6 entre colchetes (ComputerDetails.java:15-61). O ComputerDetails guarda quatro: localAddress, remoteAddress, manualAddress, ipv6Address.

**adjustResize (windowSoftInputMode)** — modo em que o Android reduz a janela para caber acima do IME. Ausente na Activity .Game (AndroidManifest.xml:193) e, mesmo se declarado, ignorado enquanto FLAG_FULLSCREEN estiver ativo.

**adjustResize / windowSoftInputMode** — atributo de manifesto que faria a janela encolher quando o IME abre. Ausente na activity .Game dos DOIS forks — é o bloqueio da dor #1.

**adjustResize vs adjustPan** — valores de android:windowSoftInputMode. adjustResize encolhe a janela para o teclado (comportamento AnyDesk desejado); adjustPan apenas rola a janela. A Activity .Game não declara nenhum dos dois, e o immersive fullscreen legado faz com que nenhum deles tenha efeito sem migração para a API de insets.

**AESLightEngine em modo ECB** — `PairingManager.performBlockCipher` (:139-151) cifra bloco a bloco sem IV e sem encadeamento, ou seja, ECB. E o modo exigido pelo protocolo GameStream original; mudar quebra a interoperabilidade com GFE/Sunshine/Apollo.

**allowBackup / fullBackupContent / dataExtractionRules** — trio que controla o que entra no backup de nuvem e no device-transfer (AndroidManifest.xml:48-50). As regras atuais excluem apenas `sharedpref`, deixando `files/` e `databases/` inclusos.

**allowDiscontinuity** — flag do bloco FEC que autoriza entregar o audio disponivel mesmo com buracos (RtpAudioQueue.c:546). Os buracos viram pacotes de tamanho 0, que AudioStream.c:166-168 converte em decodeAndPlaySample(NULL,0), acionando o PLC (packet loss concealment) do Opus.

**analog_scrolling** — String none|right|left, default "right" → enum AnalogStickForScrolling (:668-681)

**Annex B** — formato de bitstream com start codes 0x000001/0x00000001. jcodec (H264Utils.readSPS/writeSPS) lida com as escape sequences de emulação corretamente.

**Anti-deadzone** — valor NEGATIVO de seekbar_deadzone (faixa -20..20, res/xml/preferences.xml:252) que faz handleDeadZone() (ControllerHandler.java:1682-1697) EXPANDIR o sinal (mapeando [0,1] para [|dz|,1]) em vez de cortar o centro — recurso do fork.

**Apollo** — fork do Sunshine (host de streaming em PC) com o qual o Artemis pareia. Adiciona display virtual automático, sincronização de clipboard bidirecional, pareamento por OTP+passphrase e comandos de servidor. Várias strings do app dizem explicitamente 'requires Apollo' (ex.: summary_smart_clipboard_sync em values/strings.xml:547).

**Apollo / Vibeshine** — forks do Sunshine usados como host por este ecossistema; do ponto de vista do protocolo comportam-se como Sunshine (IS_SUNSHINE() true, AppVersion >= 7.1.431), o que habilita o campo `flags` do pacote de teclado e o control stream criptografado.

**APP_SUPPORT_FLEXIBLE_PAGE_SIZES** — flag em app/src/main/jni/Application.mk:7 que alinha as bibliotecas nativas para páginas de 16 KB — requisito de compatibilidade do Android 15 em ARM64. Não mexer sem entender a implicação.

**ApplistPoller** — poller dedicado, criado pelo AppView, que atualiza a lista de apps de um PC específico a cada 30s (ComputerManagerService.java:799).

**AppVersionQuad** — versão do host em 4 números (ex.: 7.1.431.0). Determina a geração do protocolo de control stream (ControlStream.c:331-360) e o algoritmo de hash do pareamento (PairingManager.java:190-199). O quarto elemento negativo é a marca de Sunshine/Apollo: IS_SUNSHINE() = AppVersionQuad[3] < 0 (Limelight-internal.h:86).

**arquivo .art** — formato de texto próprio do Artemis para exportar um 'launcher' de app/PC (linhas do tipo `[chave] valor`). Parseado em ShortcutTrampoline.parseArtFileData (:311) e escrito por utils/ShortcutHelper.

**Arquivo .art** — formato texto simples de atalho, uma chave por linha no formato `[chave] valor`, parseado por `ShortcutTrampoline.parseArtFileData` (:311-351). O intent-filter aceita qualquer mimeType via scheme content ou file.

**art** — // e arquivo .art: esquema de deep link e formato de arquivo de atalho do Artemis (host_uuid/host_name/app_uuid/app_name/app_id em texto). Exportado por ShortcutHelper.exportLauncherFile (ShortcutHelper.java:225-275); art://launch?... e art://host?pin=&passphrase= são tratados por AddComputerManually.

**Artemis** — nome do fork de ClassicOldSong do Moonlight Android. O applicationId é com.limelight com suffix .noir (release) ou .noirdebug (debug, rotulado 'Diana'). O label vem de resValue app_label definido em app/build.gradle por buildType, e é aplicado pelos manifests de flavor (app/src/nonRoot_game/AndroidManifest.xml, app/src/root/AndroidManifest.xml, app/src/game/AndroidManifest.xml), não pelo manifest main.

**Artemis (ClassicOldSong/moonlight-android)** — fork do Moonlight que pareia com o host Apollo. Java puro, sem Kotlin, módulo Gradle único. Branch de trabalho local: dev (idêntica a moonlight-noir, commit 3397ec77).

**AudioConfiguration (int magico)** — inteiro que codifica canais e mascara como ((channelMask<<16)|(channelCount<<8)|0xCA). O byte 0xCA e um magic byte validado tanto no Java (MoonBridge.java:156) quanto no C (Connection.c:286) para distinguir de valores hardcoded de versoes antigas. Construido por MAKE_AUDIO_CONFIGURATION (Limelight.h:204).

**AudioEncryptionEnabled** — quando true, cada pacote de audio e AES-128-CBC com IV = BE32(avRiKeyId + sequenceNumber) (AudioStream.c:186-197). Ligado em SdpGenerator.c:196 porque callbacks.c:482 sempre pede ENCFLG_AUDIO; vira ENCFLG_ALL se o CPU tiver AES por hardware (callbacks.c:498).

**AudioPacketDuration** — duracao em ms do audio por pacote RTP, 5 ou 10. Decidida em SdpGenerator.c:492-523 e anunciada como x-nv-aqos.packetDuration. Determina samplesPerFrame = 48 * AudioPacketDuration (AudioStream.c:438) e a granularidade de LiGetPendingAudioDuration.

**AudioPingThread** — thread que envia um ping UDP a cada 500 ms para a porta de audio (AudioStream.c:38-65). Precisa comecar ANTES do handshake RTSP porque GFE 3.22 nao responde ao PLAY sem ele (comentario em AudioStream.c:94).

**AudioTrack** — API Java do Android para saida de PCM. Aqui usada em MODE_STREAM com ENCODING_PCM_16BIT; e o unico sink de audio do app. Criada em AndroidAudioRenderer.createAudioTrack (AndroidAudioRenderer.java:28).

**backgroundTouchView** — View transparente de tela cheia (activity_game.xml:8-12) que recebe os toques fora da área do vídeo, permitindo que o trackpad funcione nas bordas letterboxed sem quebrar o touch splitting do controle virtual.

**backMenuPending / QUICK_MENU_FIRST_STAGE_MS** — gesto de dois estagios no botao Start — toque rapido seguido de nova pressao mantida por 750 ms abre o menu do jogo em vez de alternar emulacao de mouse (ControllerHandler.java:2730-2515).

**Base comum (merge-base)** — f10085f552b367cf7203007693d91c322a0a2936, 'Update to libopus v1.5.2', 27/07/2024 — ponto onde Artemis e V+ divergiram. Contadores atuais: 568 commits Artemis / 615 commits V+.

**BaseInputConnection em 'dummy mode'** — `new BaseInputConnection(view, false)` — conexão sem editor real; o Android sintetiza KeyEvent (inclusive ACTION_MULTIPLE com `getCharacters()`) a partir do texto. É o que faz `handleKeyMultiple` (Game.java:2193) funcionar mesmo com enableCommitText desligado.

**bindAllUsb** — preferencia que forca reivindicar o dispositivo USB mesmo quando o kernel ja o suporta (UsbDriverService.java:149).

**branch e remotes** — o checkout local está em `dev`, a branch de trabalho declarada no AGENTS.md. Remotes: origin (Rafael-CN), upstream (ClassicOldSong/Artemis), moonlight (moonlight-stream original) e vplus (Moonlight V+, fonte de ideias e do workflow de CI de referência).

**bridgeAr*** — familia de metodos estaticos Java (bridgeArInit/Start/Stop/Cleanup/PlaySample, MoonBridge.java:231-263) invocados pelo C via CallStaticVoidMethod/CallStaticIntMethod. Sao o unico ponto de entrada do audio no mundo Java — o Opus nunca chega ate la, so PCM.

**CAPABILITY_DIRECT_SUBMIT (0x1)** — flag que faria o decode acontecer direto na thread de recepcao. Este fork NAO a declara para audio (callbacks.c:413), logo existe uma thread AudioDec separada e uma LinkedBlockingQueue intermediaria — que e justamente o que LiGetPendingAudioDuration mede.

**CAPABILITY_SLOW_OPUS_DECODER (0x8)** — flag NAO declarada aqui. Se declarada, forcaria 10 ms por pacote e proibiria high quality surround (SdpGenerator.c:494,509). E o gancho oficial para expor uma preferencia de 'priorizar banda/CPU'.

**CAPABILITY_SUPPORTS_ARBITRARY_AUDIO_DURATION (0x10)** — flag declarada por este fork (callbacks.c:413). Significa que o renderer promete ler samplesPerFrame em vez de assumir 240, e habilita o host a usar pacotes de 10 ms em bitrates baixos (SdpGenerator.c:510-513).

**Catch silencioso** — padrao `catch (Throwable ignored) {}` — 86 ocorrencias de catch generico em 24 arquivos, concentradas em Game.java e MediaCodecDecoderRenderer.java. E o mecanismo pelo qual regressoes de decoder ficam invisiveis, conforme alerta `.claude/rules/decoder.md`.

**Certificate pinning** — após parear, o certificado X.509 do host é salvo no SQLite e usado como único trust anchor aceito (NvHTTP.trustManager :131-158 e o HostnameVerifier :160-175, que aceita qualquer hostname se o cert bater).

**Certificate pinning por igualdade de objeto** — em `NvHTTP.checkServerTrusted` (:138-157) o cliente primeiro tenta a cadeia de CAs do sistema e, se falhar, compara `certs[0].equals(serverCert)`. Nao ha comparacao de fingerprint nem validacao de cadeia — e igualdade de certificado inteiro.

**CESU-8 / UTF-8 modificado** — codificacao que `GetStringUTFChars` devolve na JNI. Difere de UTF-8 real ao codificar caracteres fora do BMP como dois pares surrogate de 3 bytes cada. Relevante em `simplejni.c:127-131`, onde o texto do teclado e enviado ao host.

**Chave legacy** — chave antiga migrada e removida em readPreferences — list_resolution_fps, checkbox_51_surround, checkbox_stretch_video, checkbox_enforce_refresh_rate, seekbar_bitrate, checkbox_disable_frame_drop (PreferenceConfiguration.java:37-45,69)

**checkbox_absolute_mouse_mode** — boolean, default false (:1005); removido da UI em pré-Oreo e em NVIDIA Shield (StreamSettings.java:356-361)

**checkbox_auto_invert_video_resolution** — boolean, default true (:942), dependente de checkbox_auto_orientation no XML (:96); usado em Game.java:429 (portraitMode && autoInvertVideoResolution)

**checkbox_auto_orientation** — boolean, default false (:941) → autoOrientation (modo retrato)

**checkbox_back_as_guide** — boolean, default false (:1010); Back vira botão Guide do gamepad

**checkbox_back_as_meta** — boolean, default false (:1008); tecla Back física vira Meta/Win

**checkbox_disable_warnings** — boolean, default false (:879) → disableWarnings (suprime toasts)

**checkbox_enable_analog_stick_new** — boolean, default false (:964) → enableNewAnalogStick (analógico livre); seekbar_osc_free_analog_stick_opacity int % default 20 (:957)

**checkbox_enable_audiofx** — boolean, default false (:1015); habilita AudioEffect no AudioTrack

**checkbox_enable_clear_default_special_button** — boolean, default false (:987) → disableDefaultExtraKeys (GameMenu.java:158)

**checkbox_enable_commit_text** — boolean, default false (:991) → enableCommitText; habilita InputConnection em StreamView/StreamContainer (StreamView.java:36, StreamContainer.java:156) e o envio de texto inteiro por conn.sendUtf8Text em chunks de 512 bytes (Game.java:313-330, 4289-4335) — é o mecanismo mais próximo do 'enviar texto inteiro' pedido

**checkbox_enable_fullexdisplay** — boolean, default false (:966) → enableFullExDisplay; modo display externo (ServerHelper.java:66,99,126)

**checkbox_enable_global_touch_sensitivity** — boolean, default false (:976) → touchSensitivityGlobal

**checkbox_enable_hdr** — boolean, default false (:921); anulado em firmware Shield ATV quebrado (isShieldAtvFirmwareWithBrokenHdr :705) e escondido sem HDR10 no display (StreamSettings.java:633-668)

**checkbox_enable_joyconfix** — chave do XML (preferences.xml:322) que NINGUÉM lê; o código lê checkbox_joycon_fix (:951) — par órfão

**checkbox_enable_keyboard** — boolean, default false (:947) → enableKeyboard (teclado virtual próprio / botões especiais na tela)

**checkbox_enable_keyboard_square** — boolean, default false (:993); botões quadrados no teclado virtual

**checkbox_enable_perf_logging** — boolean, default false (:924); ao desligar, apaga o log (StreamSettings.java:728-740)

**checkbox_enable_perf_overlay** — boolean, default false (:923); mestre de checkbox_enable_perf_overlay_lite (:925), _lite_dialog (:985), _bottom (:926) e checkbox_enable_perf_logging (:924)

**checkbox_enable_pip** — boolean, default false (:922); removido da UI em pré-Oreo, sem suporte a PiP ou em Fire OS (StreamSettings.java:390-396)

**checkbox_enable_post_stream_toast** — boolean, default false (:937) → enableLatencyToast (estatísticas ao fim do stream)

**checkbox_enable_quit_dialog** — boolean, default true, literal hardcoded no getter (:938) → enableBackMenu; checkbox_enable_floating_button (false, :939) depende dele no XML

**checkbox_enable_rumble** — boolean, default true (:1022); checkbox_vibrate_fallback (false, :933) e checkbox_enable_device_rumble (false, :989) dependem dele; seekbar_vibrate_fallback_strength int 1..200 default 100 (:934)

**checkbox_enable_sops** — boolean, default true (:883); deixa o host otimizar as configurações do jogo

**checkbox_enable_sticky_modifier_key_virtual_keyboard** — boolean, default true (:1014) → stickyModifierKey; modificadores fixos no teclado virtual (KeyBoardLayoutController.java:91)

**checkbox_enable_touch_sensitivity** — boolean, default false (:978); mestre da categoria de trackpad virtual

**checkbox_enable_touch_sensitivity_rotation_auto** — boolean, default true (:974) → touchSensitivityRotationAuto

**checkbox_enable_view_top_center** — boolean, default false (:968) → alignDisplayTopCenter (alinhamento do vídeo no topo)

**checkbox_enforce_display_mode** — boolean, default false (:880); força o Display.Mode do stream (Game.java:1554)

**checkbox_flip_face_buttons** — boolean, default false (:935); troca A/B, X/Y

**checkbox_force_qwerty** — boolean, default true (:1007); força layout QWERTY na tradução de teclas

**checkbox_forceTightThresholds** — boolean declarado em preferences.xml:76 e NUNCA lido; campo forceTightThresholds fixo em false (PreferenceConfiguration.java:233) — preferência morta

**checkbox_full_range** — boolean, default false (:1017); full range color

**checkbox_full_screen** — boolean, default true (:888) → fullScreen

**checkbox_gamepad_enable_battery_report** — boolean, default true (:1006)

**checkbox_gamepad_motion_fallback / checkbox_force_device_motion** — boolean, default false (:1020,:1021); usa sensores do próprio aparelho

**checkbox_gamepad_motion_sensors** — boolean, default true (:1019); forçado a false uma única vez no Android 12 por bug do InputDeviceSensorManager (:824-831)

**checkbox_gamepad_touchpad_as_mouse** — boolean, default false (:1018)

**checkbox_hide_osc_when_has_gamepad** — boolean, default true (:918)

**checkbox_host_audio** — boolean, default false (:884); mantém áudio tocando também no host

**checkbox_ignore_synth_events** — boolean, default false (:1009); ignora eventos sintéticos de input

**checkbox_mouse_emulation** — boolean, default true (:928); emulação de mouse pelo gamepad

**checkbox_mouse_local_cursor** — boolean, default false (:980); cursor local desenhado pelo cliente

**checkbox_mouse_nav_buttons** — boolean, default false (:929); botões voltar/avançar do mouse

**checkbox_multi_controller** — boolean, default true (:886); múltiplos gamepads

**checkbox_multi_touch_gestures** — boolean, default false (:982)

**checkbox_only_show_L3R3** — boolean, default false (:919)

**checkbox_onscreen_style_official** — boolean, default false (:955); estilo oficial dos botões virtuais (DigitalButton.java:162)

**checkbox_prevent_packet_loss** — boolean, default false (:1023)

**checkbox_reduce_refresh_rate** — boolean, default false (:1016)

**checkbox_remember_mouse_mode** — boolean, default false (:930); persiste o modo escolhido no menu do jogo

**checkbox_remember_zoom_pan** — boolean, default false (:1030); persiste number_zoom_scale/number_pan_offset_x/number_pan_offset_y em Game.onDestroy (Game.java:1726-1733)

**checkbox_resume_without_confirm** — boolean, default false (:945); retoma sessão sem diálogo

**checkbox_show_guide_button** — boolean, default true (:920)

**checkbox_show_onscreen_controls** — boolean, default false (:917) → onscreenController; é a dependência XML de quase toda a categoria de OSC

**checkbox_show_overlay_zoom_toggle_button** — boolean, default false (:940)

**checkbox_small_icon_mode** — boolean com default calculado por getDefaultSmallMode (TV/leanback = false; smallestScreenWidthDp<500 = true), gravado em disco na primeira leitura (:558-576, :818-822, :885)

**checkbox_smart_clipboard_sync** — boolean, default false (:1011); sincronização de clipboard (Game.java:2234,4215); checkbox_smart_clipboard_sync_toast (true, :1012) e checkbox_hide_clipboard_content (true, :1013) o acompanham

**checkbox_trackpad_drag_drop_vibration / seekbar_trackpad_drag_drop_threshold** — boolean false e int ms default 250 (0..2000) (:1001,:1002); limiar de drag-and-drop no trackpad (Game.java:2895)

**checkbox_trackpad_swap_axis** — boolean, default false (:1003)

**checkbox_ultra_low_latency** — boolean, default false (:882) → StreamConfiguration.setEnableUltraLowLatency (Game.java:789) e opções low-latency do MediaCodec

**checkbox_unlock_fps** — boolean, default false (:931); ao mudar, recria a tela de settings (StreamSettings.java:620-630) e libera opções de FPS acima do suportado

**checkbox_usb_driver / checkbox_usb_bind_all** — boolean, default true/false (:887,:927); driver USB próprio (Xbox) e bind de todos os dispositivos

**checkbox_use_virtual_display** — boolean, default false (:881); inverte o menu de start do AppView (AppView.java:453,464,755-768) e é passado a ServerHelper.doStart

**checkbox_vibrate_keyboard** — boolean, default false (:949) → enableKeyboardVibrate

**checkbox_vibrate_osc** — boolean, default true (:932); vibração dos controles na tela

**Choreographer** — API Android que entrega callbacks sincronizados ao vsync. Usado numa HandlerThread dedicada com THREAD_PRIORITY_URGENT_DISPLAY (:1142) para alinhar a apresentação ao refresh do display.

**CLASSIFICATION_TWO_FINGER_SWIPE** — classificação do Android 10+ que indica que o sistema converteu um swipe de 2 dedos do trackpad num arrasto de 1 dedo na tela; o fork a detecta em Game.java:2875 e re-sintetiza dois ponteiros.

**cleartextTrafficPermitted** — atributo em `res/xml/network_security_config.xml:3` que libera trafego HTTP sem TLS para qualquer destino. Necessario porque o pareamento GameStream ocorre na porta 47989 sem TLS, contra IPs arbitrarios de LAN que nao podem ser enumerados por dominio.

**CLIPBOARD_IDENTIFIER** — marcador colocado nos extras do ClipDescription para o app reconhecer o conteúdo que ele mesmo escreveu e evitar loop de sincronização (Game.java:2246-2302).

**Code point splitting** — comportamento em InputStream.c:610-648 onde um único LiSendUtf8TextEvent com N code points vira N pacotes UTF8_TEXT separados no fio, cada um com exatamente um code point. Feito para nunca cruzar fronteira de pacote (o host falharia no parse). É a razão pela qual 'enviar texto inteiro' não existe no protocolo hoje.

**Codec recovery (FLUSH/RESTART/RESET)** — escada de recuperação de erro do MediaCodec (:144-159). Exige que as três threads que tocam o codec (input, render, choreographer) fiquem quiesced antes da operação.

**codemap** — gerador de mapas em tools/codemap/codemap.mjs, que produz docs/maps/. Requer Node (v24 no ambiente). `--check` falha se os mapas estiverem defasados — ótimo portão de CI porque não depende de JDK nem de Android SDK. Consultar com query.mjs em vez de ler SYMBOLS.md (215 KB) ou code-index.json inteiros.

**commit-text** — caminho pelo qual texto multi-caractere do teclado virtual (swipe, predição, ditado) é enviado inteiro ao host via LiSendUtf8TextEvent, em vez de caractere a caractere. Preferência checkbox_enable_commit_text, default DESLIGADA. Ponto vivo: StreamContainer.java:185-202 (StreamView.java é código morto).

**commitText** — caminho de texto do IME (StreamContainer.onCreateInputConnection:186) em que o teclado entrega uma CharSequence inteira; Game.enqueueCommitText fatia em blocos UTF-8 de 512 bytes e envia por LiSendUtf8TextEvent — é a base existente para o campo de texto estilo AnyDesk.

**commitText / commit-text input** — mecanismo pelo qual um IME entrega texto de múltiplos caracteres de uma vez (swipe typing, predição, ditado por voz) em vez de KeyEvents individuais. No Artemis é ativado pela preferência checkbox_enable_commit_text (preferences.xml:479) e implementado sobrescrevendo BaseInputConnection.commitText em StreamContainer/ExternalControllerView, terminando em Game.handleCommitText -> enqueueCommitText -> conn.sendUtf8Text.

**commitText / enableCommitText** — caminho pelo qual texto multi-caractere do IME (swipe typing, predição, ditado) é enviado como UTF-8 inteiro em vez de tecla-a-tecla. Preference `checkbox_enable_commit_text`, default false (PreferenceConfiguration.java:139/:208).

**commitText / enqueueCommitText** — caminho do teclado virtual Android. ExternalControllerView expõe um InputConnection quando commitTextEnabled (ExternalControllerView.java:59-85); Game.enqueueCommitText fatia em blocos de 512 bytes UTF-8 e drena com 15 ms de intervalo (Game.java:4314-4334, 312-331).

**ComputerDetails.permission** — bitmask de permissoes que o host Apollo envia no `serverinfo` (documentada em ComputerDetails.java:175-204). Cobre input, clipboard, arquivos, comandos de servidor e acoes. O cliente exibe mas nao consulta antes de agir.

**ComputerManagerBinder** — Binder local do CMS. Métodos-chave: waitForReady(), startPolling(listener), getComputer(uuid), invalidateStateForComputer(uuid), createAppListPoller(), getUniqueId().

**ComputerManagerService (CMS)** — bound service que é a fonte única de verdade sobre PCs conhecidos — polling por thread-por-PC, mDNS, SQLite. Toda Activity de browsing se liga a ele via ComputerManagerBinder.

**confirmedMove / confirmedDrag / confirmedScroll** — flags da máquina de estados dos contextos que classificam o gesto em curso; enquanto nenhuma estiver ligada o gesto ainda pode virar um tap.

**Constrained High Profile** — constraint_set4/5 flags que garantem ausência de B-frames, permitindo ao decoder reduzir buffering. Aplicado apenas em omx.intel (MediaCodecHelper.java:133-134).

**Control packet 0x5508** — pacote do control stream para clipboard sync, do moonlight-common-c PR #5. Usado pelo V+ (ClipboardSyncManager.kt). Indisponível no Artemis por divergência de submódulo.

**controllerNumber** — indice de jogador 0..15 atribuido por assignControllerNumberIfNeeded (ControllerHandler.java:457); varios InputDevices podem compartilhar o mesmo numero (caso DS4 touchpad + joystick).

**CSD (Codec Specific Data)** — VPS/SPS/PPS agrupados num único input buffer com MediaCodec.BUFFER_FLAG_CODEC_CONFIG, conforme recomendação do AOSP. Ver MediaCodecDecoderRenderer.java:2062-2090.

**CTRL_CHANNEL_*** — IDs de canal ENet (Limelight-internal.h:57-67). Teclado usa 0x02, texto UTF-8 usa 0x06, mouse 0x03, pen 0x04, touch 0x05, comandos Apollo 0x08, gamepads 0x10-0x1F, sensores 0x20-0x2F. Canais diferentes NÃO têm ordenação garantida entre si — relevante para a interação teclado↔texto. Em hosts GFE todos os canais colapsam para 0 (ControlStream.c:763-765).

**CTRL_CHANNEL_KEYBOARD / CTRL_CHANNEL_UTF8** — canais ENet distintos usados para pacotes de teclado e de texto; ambos com ENET_PACKET_FLAG_RELIABLE (InputStream.c:937-938, 1018-1019).

**cursorVisible / enableMouseLocalCursor** — modo em que a captura continua ativa mas o cursor do Android permanece visível sobre o stream (Game.java:4140-4151), útil em DeX/ChromeOS.

**custom_refresh_rate** — String float, default XML "59.94", lido como null (:1027) → customRefreshRate; injeta entrada Custom de FPS (StreamSettings.java:444-454)

**Dead key / acento morto** — tecla que não produz caractere sozinha (´ ` ~ ^ ¨) e compõe com a próxima. Sinalizada por `KeyCharacterMap.COMBINING_ACCENT` (bit 0x80000000) em `getUnicodeChar()`. O Artemis DESCARTA dead keys (Game.java:2093-2100).

**Decode Unit (DU)** — unidade entregue pelo moonlight-common-c ao renderer; corresponde a um frame, fatiada em entradas de buffer (parameter sets separados + PICDATA concatenado) em callbacks.c:146-197.

**DecodedAudioBuffer** — jshortArray global alocado uma unica vez no init (callbacks.c:226) com channelCount*samplesPerFrame shorts, reutilizado a cada pacote via GetPrimitiveArrayCritical. E o buffer cujo comprimento efetivo se perde (ver finding sobre decodeLen).

**DecoderTombstone** — arquivo de prefs com CrashCount/LastNotifiedCrashCount; a cada 3 crashes dispara resetStreamingSettings (Game.java:355, UiHelper.java:183-205)

**Deep link art** — //: scheme proprietario registrado por `AddComputerManually` com categoria BROWSABLE (AndroidManifest.xml:186-191). Aceita host, porta e os query params `name`, `pin` e `passphrase`; e o unico caminho externo que passa por um dialogo de confirmacao.

**desiredAspectRatio / fillDisplay** — os dois parâmetros que governam StreamContainer.onMeasure(). São definidos em Game.prepareDisplayForRendering (:1621-1622) e são o ponto de entrada para qualquer mudança de dimensionamento do stream.

**Diana / Artemis** — rótulos de app injetados por resValue. Diana é o build de debug, Artemis o de release (app/build.gradle:99-101, :138-140). Aparecem como nome no launcher, permitindo ter os dois instalados lado a lado.

**DIBR (Depth Image Based Rendering)** — técnica usada pelo Stereo3DRenderer para sintetizar o par estéreo a partir de um único frame + depth map, com deslocamento horizontal proporcional à profundidade (shader FRAGMENT_SHADER_3D).

**Direct submit** — capacidade de chamar submitDecodeUnit direto da thread de recepção de rede, sem thread intermediária. Concedida a decoders com latência de input buffer baixa (MediaCodecHelper.java:59-74).

**Downgrade para cleartext** — comportamento em `NvHTTP.getServerInfo` (:359-379) que refaz a requisicao `serverinfo` sobre HTTP puro quando a validacao TLS falha. Existe para permitir repareamento apos troca de certificado do host.

**DPB (Decoded Picture Buffer)** — buffer de imagens decodificadas do decoder. max_dec_frame_buffering e num_ref_frames controlam seu tamanho e são a raiz de várias erratas de latência.

**EasyTier (V+)** — VPN embutida via JNI (pacote com.easytier.jni) para streaming remoto. Exclusiva do V+.

**edit_diy_bitrate** — String em Mbps, default XML "20"; valor próprio nunca é lido — só grava seekbar_bitrate_kbps via listener (StreamSettings.java:868-880)

**edit_diy_w_h** — String "LxA", default XML "1920x1080", lido como null por padrão (:1026) → customResolution; injeta entrada Custom na lista (StreamSettings.java:431-441)

**EID_* (elementId)** — identificadores dos elementos do OSC de gamepad, usados como chave em SharedPreferences 'OSC' (VirtualControllerElement.java:25-41); no overlay de teclado o elementId e uma String ('key_<code>', 'm_<code>', 'custom_<id>').

**EMULATING_SPECIAL / EMULATING_SELECT / EMULATING_TOUCHPAD** — flags (ControllerHandler.java:69-71) que marcam que um botao esta sendo sintetizado por um combo (Start+LB, Start+Select, Select+LB) e precisa ser solto quando o combo se desfaz.

**enableAudioFx** — preferencia checkbox_enable_audiofx que abre uma sessao de AudioEffect do sistema (equalizador) sobre a sessao do AudioTrack e, como efeito colateral obrigatorio, desabilita o modo low-latency (AndroidAudioRenderer.java:157-159, porque o pipeline de efeitos do Android e incompativel com low latency ate o Android 13).

**enableFullExDisplay / modo display externo** — quando ligado e há um display secundário, o Game roda no display externo e a ExternalDisplayControlActivity roda no primário como touchpad/controle, reencaminhando input via Game.instance.

**enableMultiTouchScreen / touchscreenTrackpad** — par de booleans derivados do mouse_mode_list; enableMultiTouchScreen=true habilita o envio de toque nativo, touchscreenTrackpad=true seleciona os contextos relativos (Trackpad/Relative).

**encryptedControlStream** — flag (InputStream.c:105, ControlStream.c:330) igual a APP_VERSION_AT_LEAST(7,1,431). Verdadeira para todo Sunshine/Apollo/Vibeshine. Quando ativa, o input NÃO é cifrado no InputStream — vai em claro para o control stream, que cifra o pacote inteiro com AES-GCM (ControlStream.c:701-738).

**escState (V+)** — máquina de estados de 3 posições (0 ocioso / 1 ESC pressionado / 2 acorde ativo) que implementa ESC+dígito → F1..F12, com Runnable de confirmação em 200ms. KeyboardInputHandler.kt:154-232.

**evdev / EvdevCaptureProvider** — caminho de captura de baixo nível disponível apenas em builds root (app/src/root/...), lendo /dev/input diretamente e traduzindo evdev -> keycode Android via EvdevTranslator antes de chamar Game.keyboardEvent().

**evdev_reader** — executável nativo separado (não é uma .so) construído só no flavor `root` (evdev_reader/Android.mk:9). Roda em shell root, faz EVIOCGRAB exclusivo em /dev/input/event* e streama os eventos evdev crus por socket TCP em 127.0.0.1. É o mecanismo pré-Android-O de captura de mouse/teclado.

**EvdevCaptureProvider** — provider exclusivo de builds root que abre o device evdev via `su` e libevdev_reader.so, dando mouse relativo verdadeiro em Androids antigos; alimenta Game via callbacks EvdevListener (mouseMove/mouseButtonEvent/mouseVScroll/mouseHScroll).

**EvdevCaptureProviderShim** — ponte por reflexão (binding/input/evdev/EvdevCaptureProviderShim.java) que permite ao flavor não-root compilar sem a classe EvdevCaptureProvider, que só existe no source set root.

**EWMA (Exponentially Weighted Moving Average)** — média móvel usada nas heurísticas de drop do renderer (EWMA_ALPHA=0.25, :1194). Duas das três variáveis EWMA estão mortas (ver findings).

**Exported component** — componente alcancavel por outros apps. Neste repo sao `PosterContentProvider` (:61-66), `PcView` (:90-108), `ShortcutTrampoline` (:110-129) e `AddComputerManually` (:175-192). Os servicos (`DiscoveryService`, `ComputerManagerService`, `UsbDriverService`) e o `StartExternalDisplayControlReceiver` nao tem intent-filter e portanto nao sao exportados.

**Extensões Apollo** — tipos de control stream 0x3000 (Execute Server Command), 0x3001 (Set Clipboard) e 0x3002 (File transfer nonce request), declarados em ControlStream.c:234-236. Só o 0x3000 tem binding no Artemis (MoonBridge.sendExecServerCmd → GameMenu.java:280). Clipboard e file transfer estão declarados mas não implementados no cliente.

**ExternalControllerView** — FrameLayout raiz da ExternalDisplayControlActivity; terceira cópia da lógica de InputConnection.

**ExternalDisplayControlActivity** — Activity singleInstance com taskAffinity vazio que fica no display PRIMÁRIO servindo de touchpad/controle enquanto o Game roda no display SECUNDÁRIO. Toda a UI é criada programaticamente. É a única classe do repo que usa WindowInsetsCompat.Type.ime().

**FEATURE_LowLatency** — capacidade oficial do Android 11+ que indica modo de baixa latência real. Usada como critério de qualidade tanto para preferir o decoder (findKnownSafeDecoder round 1) quanto para liberar HEVC e HEVC RFI.

**flavor dimension "root"** — única dimensão de product flavor do projeto (app/build.gradle:21). Não tem relação com o diretório raiz — separa a build para dispositivos rooteados da build normal.

**flavor root vs nonRoot_game** — os dois únicos product flavors. `root` (maxSdk 25, applicationId com.limelight.root, BuildConfig.ROOT_BUILD=true) inclui o binário nativo evdev_reader e a classe EvdevCaptureProvider; `nonRoot_game` (applicationId com.limelight) não. Cruzados com debug/release dão 4 variants.

**Flick / momentum** — inércia do TrackpadContext — se a velocidade EMA na hora de levantar o dedo passa de 0.8 px/ms, o cursor (ou o scroll) continua se movendo em frames de 10ms com atrito 0.93 até parar (TrackpadContext.java:75-144).

**FPS fracionário** — taxas como 59.94 são codificadas como fps×1000 (59940) por StreamConfiguration.getLaunchRefreshRate (StreamConfiguration.java:190-196) e enviadas no &mode=WxHxFPS. Só o Apollo decodifica; em outros hosts o valor seria interpretado literalmente.

**Frame pacing** — estratégia de quando apresentar cada frame decodificado. Quatro modos em PreferenceConfiguration.java:217-220 — MIN_LATENCY(0), BALANCED(1), CAP_FPS(2), MAX_SMOOTHNESS(3). BALANCED usa o Choreographer; os outros apresentam direto na render thread.

**frame_pacing** — String, default "latency"; valores latency|balanced|cap-fps|smoothness|warp|warp2 (arrays.xml:130-137); warp/warp2 setam framePacingWarpFactor 2/4 (:863-868); valor é sobrescrito para BALANCED em Game.java:696,702

**framegen (V+)** — módulo Gradle próprio com pipeline Vulkan de geração de quadros (LSFG-VK) e upscaling AMD FSR. Submódulo separado, fora do alcance do Artemis.

**Fused IDR frame** — enviar CSD junto com o IDR no mesmo input buffer, possível quando o decoder anuncia FEATURE_AdaptivePlayback (MediaCodecHelper.decoderSupportsFusedIdrFrame, :704).

**game (source set)** — diretório app/src/game/ que NÃO corresponde a nenhum flavor ou buildType existente. Nunca é mesclado em build algum. Resíduo do layout do upstream; editar lá não tem efeito e não gera erro.

**GameStream/NVHTTP** — protocolo HTTP+XML original da NVIDIA usado para descoberta, pareamento e launch. Endpoints: /serverinfo, /pair, /unpair, /applist, /appasset, /launch, /resume, /cancel. Implementado em NvHTTP.java.

**getDefaultBitrate** — interpolação linear da tabela pixels→fator (360p=1 … 4K=40) multiplicada pelo fator de frame rate, resultado em kbps (PreferenceConfiguration.java:495-556)

**GlPreferences** — arquivo de prefs separado com Renderer e Fingerprint, usado por MediaCodecHelper para quirks de decoder (GlPreferences.java:10-13)

**grabbedInput** — flag global que decide se o input é consumido pelo stream ou devolvido ao Android (Game.java:202, guard em 2758); alternado por Ctrl+Alt+Shift+Z e ao abrir menus.

**grabbedInput / setInputGrabState** — estado que determina se o cliente captura mouse+teclado para o stream ou os devolve ao Android (Game.java:1864-1890, 2077). Alternado pelo combo Ctrl+Alt+Shift+Z.

**GWP-ASan** — sampler de deteccao de corrupcao de heap nativo ativado por `android:gwpAsanMode="always"` (AndroidManifest.xml:55). Endurecimento ja presente no codigo nativo.

**handleKeyMultiple** — callback de KeyEvent.ACTION_MULTIPLE que carrega uma string em event.characters. Único caminho de texto em lote do V+ (KeyboardInputHandler.kt:467-473) e também presente no Artemis (Game.java:2206). Raramente dispara em IMEs modernos.

**hat axes (AXIS_HAT_X/AXIS_HAT_Y)** — forma analogica do D-pad; quando presentes, os KEYCODE_DPAD_* duplicados sao suprimidos via hatXAxisUsed/hatYAxisUsed (ControllerHandler.java:2527).

**HiddenApps** — arquivo de prefs com StringSet por UUID de host contendo appIds ocultos — o único estado hoje realmente per-host/per-app (AppView.java:85,323,348)

**HighQualitySurroundEnabled** — modo em que o host envia surround com streams desacoplados e maior bitrate. Ligado em SdpGenerator.c:500 quando bitrate de video >= 15 Mbps, canais > 2, o host suportar e o renderer nao declarar decoder lento. Faz startAudioStream usar HighQualityOpusConfig em vez de NormalQualityOpusConfig (AudioStream.c:426-436).

**HostHttpResponseException** — IOException tipada com código de erro do host. Códigos relevantes: 401 (cert mismatch, força fallback para HTTP em NvHTTP.java:376-379), 418 (dispositivo de áudio ausente no GFE, :332-336), 470 (resume de sessão de outro dispositivo), 525 (app minimizado), 599 (quit de sessão alheia, sintetizado em NvHTTP.quitApp :916).

**IDR (Instantaneous Decoder Refresh)** — keyframe que reseta as referências. MoonBridge.FRAME_TYPE_IDR=1. Dispara o reset das listas de CSD (:1764-1768).

**ignoreSynthEvents** — preferência que descarta eventos com deviceId <= 0 (Game.java:2036). Efeito colateral pouco óbvio: mata todos os teclados virtuais próprios e o AccessibilityService.

**IME_FLAG_NO_EXTRACT_UI vs IME_FLAG_NO_FULLSCREEN** — flags de EditorInfo.imeOptions. A primeira (única usada hoje, StreamContainer.java:191) esconde o campo de extração do IME; a segunda, ausente, é a que impede o IME de entrar em modo fullscreen em telas baixas/landscape.

**IMMERSIVE_STICKY** — modo de tela cheia legado que esconde as barras e as reexibe transitoriamente. Reaplicado a cada 2 s por `onSystemUiVisibilityChange` (Game.java:3914-3928); briga diretamente com o IME.

**import_keyboard_file / export_keyboard_file** — Preferences de ação (sem valor) que importam/exportam o JSON do layout via ACTION_OPEN_DOCUMENT e FileProvider (StreamSettings.java:743-756, 822-847); ocultas no editor de perfil (EditProfileActivity.java:284-291)

**import_special_button_file** — ação que grava o JSON de botões especiais no arquivo "specialPrefs", chave "special_key" (StreamSettings.java:1036-1038; GameMenu.java:38,40)

**InMemoryPreferenceDataStore** — PreferenceDataStore que roteia todos os widgets do preferences.xml para o SharedPreferences em memória do perfil (EditProfileActivity.java:196-230)

**InMemorySharedPreferences** — implementação de SharedPreferences em memória usada pelo editor de perfil (EditProfileActivity.java:334-475)

**InputCaptureProvider** — abstração de captura de ponteiro/mouse com 4 implementações escolhidas por InputCaptureManager (Android nativo API 26+, PointerIcon, Shield, Null) + a variante evdev do flavor root.

**InputConnection / BaseInputConnection / onCheckIsTextEditor** — trio de APIs Android que faz uma View não-editável ser alvo do IME. Usado em StreamView.java:126-157. Ausente no V+.

**inputMap** — bitfield de botoes no formato ControllerPacket (A_FLAG, B_FLAG, ..., PADDLE1_FLAG, TOUCHPAD_FLAG, MISC_FLAG) mantido por contexto e agregado antes do envio.

**InputOnly / REMOTE_INPUT_UUID** — app virtual do Apollo com UUID fixo 8CB5C136-DA67-4F99-B4A1-F9CD35005CF4 (NvApp.java:6) que dá só entrada remota sem vídeo; o Artemis não termina o app corrente ao lançá-lo (NvConnection.java:321) e força modo trackpad (Game.java:820-824).

**invertAxis / swapAxis** — dois níveis independentes de troca X↔Y. `swapAxis` é do TrackpadContext (construtor, TrackpadContext.java:328-340) e vale para trackpad físico; `invertAxis` é o parâmetro de handleTouchInput (Game.java:3160) aplicado nos swipes sintéticos para CANCELAR o swapAxis (dupla inversão = sem inversão).

**invertResolution / autoInvertVideoResolution** — em retrato, inverte a resolução pedida ao host para obter um display virtual em pé. Aplicado em Game.java:431-432 e re-aplicado (invertendo de novo) em MediaCodecDecoderRenderer.setup(:800-801).

**IS_SENSITIVE** — extra `android.content.extra.IS_SENSITIVE` colocada na `ClipDescription` (Game.java:2369) para que o sistema nao mostre previa do conteudo colado. O app a escreve ao receber clipboard do host, mas nao a le ao enviar.

**IS_SUNSHINE()** — macro em Limelight-internal.h:86 definida como `AppVersionQuad[3] < 0`. Sunshine e seus forks (Apollo, Vibeshine) reportam um quarto componente negativo no `appversion` do /serverinfo. É o discriminador usado em todo o código para habilitar extensões e desabilitar workarounds do GFE.

**isPanZoomMode** — modo em que os toques deixam de ir para o host e alimentam o PanZoomHandler (pinça e arrasto do vídeo local); alternado pelo botão flutuante de zoom ou pelo menu (Game.java:3992).

**isSquarishScreen** — heurística de tela quase quadrada (razão < 1.3) que faz o app oferecer resoluções em retrato e paisagem (PreferenceConfiguration.java:421-442)

**KEY_PREFIX (0x80)** — byte alto adicionado pelo Moonlight ao VK antes de enviar — `(short)((0x80 << 8) | vk)` (KeyboardTranslator.java:27,425). Herança do GFE; Sunshine/Apollo mascara com `& 0x00FF` e o ignora.

**keyboard_axi_list** — String, default "OSC_Keyboard", valores OSC_Keyboard..OSC_Keyboard_5 — o valor É o nome do arquivo SharedPreferences do layout; lido fora do overlay de perfis (KeyBoardControllerConfigurationLoader.java:39,554,570)

**KeyboardAccessibilityService** — AccessibilityService com FLAG_REQUEST_FILTER_KEY_EVENTS que intercepta teclas do sistema (Home, Alt+Tab...) e as reinjeta em Game.handleKeyDown/Up, para que cheguem ao host em vez de serem consumidas pelo Android.

**KeyBoardController** — overlay separado de TECLAS ESPECIAIS, editável (mover/redimensionar/desabilitar/adicionar teclas), configurado por assets/config/keyboard.json e specialbuttons.json. Não confundir com o KeyBoardLayoutController.

**KeyBoardController vs KeyBoardLayoutController** — dois overlays de teclado próprios do app. O primeiro (binding/input/virtual_controller/keyboard/KeyBoardController.java) são teclas especiais configuráveis; o segundo (KeyBoardLayoutController.java) é um teclado completo inflado de R.layout.layout_axixi_keyboard. Ambos SOBREPÕEM o vídeo — nenhum empurra a tela.

**KeyBoardLayoutController** — TECLADO QWERTY COMPLETO on-screen do fork, inflado de res/layout/layout_axixi_keyboard.xml (82 teclas). Menu: 'Toggle On-screen full keyboard'. É um OVERLAY (Gravity.BOTTOM) — sobrepõe o vídeo, não o empurra.

**KeyBoardLayoutController vs KeyBoardController** — dois arquivos diferentes no mesmo pacote. KeyBoardLayoutController (379 linhas) gerencia o teclado FULL estático de layout_axixi_keyboard.xml. KeyBoardController (795 linhas) gerencia o teclado de teclas especiais CONFIGURÁVEL, salvo em JSON e posicionável pelo usuário.

**keyBoardVirtualControllerElement** — classe base (View) de todos os elementos do KeyBoardController; implementa os modos Active/MoveButtons/ResizeButtons/DisableEnableButtons e serializa posição/tamanho em JSON nas SharedPreferences.

**KeyEvent (Android)** — evento de tecla do sistema. Campos relevantes aqui: `keyCode` (KEYCODE_* Android), `scanCode` (código evdev do Linux, usado no fallback de KeyboardTranslator.java:419), `deviceId` (<=0 para eventos sintéticos/virtuais), `metaState` (bits de modificador), `flags` (FLAG_VIRTUAL_HARD_KEY), `repeatCount` e `unicodeChar`.

**layer (DigitalButton)** — grupo de botoes entre os quais o dedo pode deslizar; checkMovement() so propaga pressao entre botoes do mesmo layer (DigitalButton.java:70-111).

**LBQ (LinkedBlockingQueue nativa)** — fila entre a thread AudioRecv e a AudioDec, limitada a 30 itens (AudioStream.c:69). Ao estourar, descarta TODOS os itens (AudioStream.c:151-156), nao apenas o mais antigo.

**LC_ASSERT** — macro de asserção do moonlight-common-c (Platform.h:80-96). Expande para assert() e é ANULADA em release, pois -DLC_DEBUG só é passado quando NDK_DEBUG=1 (Android.mk:52-54). Toda verificação de segurança escrita como LC_ASSERT não existe no APK publicado.

**level_idc** — nível do perfil H.264. Rebaixado deliberadamente (31/32/42) para forçar o decoder a alocar menos buffers e reduzir latência (:1918-1935). Só quando RFI está inativo.

**LI_CCAP_*** — bitmask de capacidades informada no arrival (ANALOG_TRIGGERS, RUMBLE, TRIGGER_RUMBLE, TOUCHPAD, ACCEL, GYRO, BATTERY_STATE, RGB_LED), MoonBridge.java:106-113.

**LI_CTYPE_*** — tipo de controle informado ao host (UNKNOWN/XBOX/PS/NINTENDO), MoonBridge.java:101-104.

**LI_ERR_UNSUPPORTED** — constante -5501 (MoonBridge.java:79) devolvida por LiSendTouchEvent/LiSendPenEvent quando o host não suporta a extensão; é o sinal usado por trySendTouchEvent/trySendPenEvent para cair no fallback de mouse.

**Li* (LiSendKeyboardEvent2, LiSendUtf8TextEvent, ...)** — prefixo de todas as funções públicas do moonlight-common-c, declaradas em Limelight.h. 'Li' vem de Limelight, o nome original do projeto Moonlight.

**LiGetPendingAudioDuration** — API nativa que retorna itens na LBQ * AudioPacketDuration (AudioStream.c:474-476). Exposta via JNI em simplejni.c:172 e usada como UNICO sinal de backpressure pelo cliente (AndroidAudioRenderer.java:191). Nao inclui o que ja esta bufferizado dentro do AudioTrack.

**LimelightCryptoProvider** — interface (nvstream/http/LimelightCryptoProvider.java) que abstrai a origem do certificado e da chave privada do cliente. Ponto de extensao natural para uma implementacao baseada em Android Keystore.

**lint baseline** — arquivo XML que registra os problemas de lint existentes para que só os novos falhem o build. Sem ele, 'não introduzir avisos novos' não é verificável, porque não há referência de 'antigo'. Este projeto não tem baseline.

**lintVitalRelease** — tarefa que o AGP roda automaticamente em assembleRelease, verificando apenas issues de severidade fatal. É a razão pela qual um erro de lint pode quebrar o release sem ter quebrado nenhum build de debug.

**LiSendEmptyPayload** — extensão do fork ClassicOldSong (ControlStream.c:2067-2075, commit c999436 do submódulo) que manda um pacote type 0x00 com payload 0xAA55AA55. Usado pelo Artemis como keep-alive a cada 20 ms (Game.java:333-338) para impedir que o WiFi do Android entre em power save durante o stream.

**LiSendKeyboardEvent2** — primitivo do protocolo para tecla individual, com o parâmetro extra `flags` do Sunshine (InputStream.c:924). Monta o NV_KEYBOARD_PACKET com magic 0x03 (down) / 0x04 (up).

**LiSendUtf8TextEvent** — API nativa que envia texto Unicode como evento de input (InputStream.c:1005). É o caminho usado por conn.sendUtf8Text a partir de Game.handleKeyMultiple e do InputConnection do teclado virtual.

**list_audio_config** — String "2"|"51"|"71", default "2" → MoonBridge.AUDIO_CONFIGURATION_* (:845-854)

**list_fps** — String, default "60" (XML :22 / Java :142), lido em :799 → config.fps (float; aceita valores custom como 59.94)

**list_languages** — String, default "default" (:876); 23 idiomas espelhados em locales_config.xml; mudança força restart em pré-Android 13 (StreamSettings.java:143-162)

**list_onscreen_keyboard_align_mode** — String left|center|right, default "center" (:962); alinhamento do teclado virtual próprio (KeyBoardLayoutController.java:338)

**list_resolution** — String, default "1280x720" (XML :13 / Java :141), lido em PreferenceConfiguration.java:789 → config.width/height; entradas nativas são anexadas em runtime

**list_video_scale_mode** — String, default "fit"; fit|fill|stretch → enum ScaleMode (:607-624)

**LoaderTuple** — chave lógica (ComputerDetails + NvApp) que identifica uma box art no pipeline de cache. Definida como classe estática interna em CachedAppAssetLoader:372. Sobrescreve equals mas não hashCode.

**localAudioPlayMode** — parametro do /launch que pede ao host para TAMBEM tocar o audio nos alto-falantes dele (NvHTTP.java:888). Controlado pela preferencia checkbox_host_audio. Nao tem relacao nenhuma com efeitos de audio no cliente — a confusao entre os dois e exatamente o bug de Game.java:876.

**locales_config.xml + language_names/language_values** — DUAS fontes de verdade paralelas para a lista de idiomas. locales_config.xml (referenciado por android:localeConfig no manifest) alimenta o seletor nativo do Android 13+; os dois string-arrays de values/arrays.xml alimentam o seletor in-app e são POSICIONALMENTE ACOPLADOS entre si. Os próprios arquivos têm comentários lembrando de sincronizá-los; hoje estão sincronizados entre si mas dessincronizados dos diretórios values-*/ existentes.

**magic 0xB2 0xA1** — marcador que indica que existe calibracao feita pelo USUARIO na flash do ProCon, sobrepondo a de fabrica (ProConController.java:371).

**MAX_INPUT_PACKET_SIZE (128)** — teto do buffer de pilha usado no caminho de criptografia legado do moonlight-common-c (InputStream.c:43). É a razão pela qual UTF8_CHUNK_SIZE = 512 (Game.java:313) é perigoso.

**maxPointerCountInGesture** — maior número de dedos visto durante o gesto atual; usado por isTap() para garantir que um toque de N dedos gere apenas UM clique (só o contexto de índice N-1 reporta o tap).

**mDNS / _nvstream._tcp** — serviço DNS-SD anunciado pelo host. Descoberto por jmDNS (<Android 14) ou NsdManager (>=14) — DiscoveryService.java:58-71.

**Media performance class (Build.VERSION.MEDIA_PERFORMANCE_CLASS)** — nota de conformidade de mídia do device (Android 12+). >= S libera HEVC automaticamente (MediaCodecHelper.java:832-838).

**MiDaS** — modelo de estimativa monocular de profundidade (midas-midas-v2-w8a8.tflite, int8 quantizado, entrada 256x256) executado por TFLite com delegate GPU→NNAPI→CPU (Stereo3DRenderer.java:689-723).

**MODE_AI_3D / MODE_AI_3D_MOVIE** — modos de render do StreamContainer que rodam o MiDaS v2 (TFLite, 256x256, quantizado w8a8) para estimar profundidade e sintetizar SBS 3D com DIBR, principalmente para displays externos/óculos.

**Modified UTF-8 / CESU-8** — o que GetStringUTFChars realmente retorna (simplejni.c:128). Difere de UTF-8 padrão em dois pontos: U+0000 vira 0xC0 0x80 (overlong) e code points acima de U+FFFF viram o par de surrogates UTF-16 codificado como duas sequências de 3 bytes. Causa raiz da corrupção de emoji no campo de texto.

**modifierFlags (Game.java** — 201): bitmask GLOBAL de Shift/Ctrl/Alt/Meta mantido por `handleSpecialKeys()` (Game.java:1917-1922). Existe porque alguns IMEs não emitem KeyEvent real para Shift; é combinado com o metaState do evento em `getModifierState(KeyEvent)` (Game.java:2001-2018).

**MoonBridge** — classe Java (com.limelight.nvstream.jni.MoonBridge) que é a ÚNICA fronteira JNI do app. 34 métodos `native` para Java→C e 21 métodos estáticos `bridge*` para C→Java. Se um dado cruza a fronteira nativa, passa por aqui.

**Moonlight V+ (qiin2333)** — outro fork Android, disponível como remote `vplus` neste repositório. É o cliente que o dono usava antes e o único fork da árvore com CI em GitHub Actions funcional (vplus/master:.github/workflows/android-ci.yml) — referência direta para o pipeline proposto. Atenção: o V+ usa flavor `nonRoot` (sem _game), tem Kotlin e tem androidTest; o Artemis não.

**Moonlight V+ (qiin2333/moonlight-vplus)** — fork chinês muito ativo do moonlight-android, ~3,3k estrelas, versão 12.11.4 (14/08/2026). Reescrito majoritariamente em Kotlin (355 arquivos .kt) com Jetpack Compose e Firebase. Derivou do upstream moonlight-stream, NÃO do Artemis.

**Moonlight V+ / qiin2333** — outro fork de cliente Moonlight Android, usado hoje pelo dono do fork como referência de comportamento de teclado.

**moonlight-common-c** — submódulo git em app/src/main/jni/moonlight-core/moonlight-common-c, apontando para o fork ClassicOldSong/moonlight-common-c @ c999436 (não o upstream cgutman). Implementa todo o protocolo GameStream: RTSP, control stream ENet, input, depacketização de vídeo/áudio.

**moonlight-common-c (submódulo)** — NÃO aponta para o upstream moonlight-stream e sim para ClassicOldSong/moonlight-common-c. Traz LiSendExecServerCmd e LiSendEmptyPayload, inexistentes no upstream. Editá-lo diverge do upstream duas vezes.

**Mouse relativo vs absoluto** — relativo envia deltas (LiSendMouseMoveEvent, usado em jogos com mouse-look); absoluto envia posição normalizada com referência de tamanho (LiSendMousePositionEvent, usado em desktop). A pref checkbox_absolute_mouse_mode converte deltas em posição via LiSendMouseMoveAsMousePositionEvent.

**mouse_mode_list** — preferência inteira 0..5 que define o modo de toque. 0=Multi touch (toque nativo Sunshine), 1=Absolute touch, 2=Track pad Natural (duplo-toque arrasta), 3=Track pad Gaming (long press arrasta), 4=Desabilitado, 5=Absolute touch com botões trocados. Mapeada em PreferenceConfiguration.java:897-916 e Game.applyMouseMode:4153.

**mouseEmulation** — modo em que o gamepad vira mouse; sticks movem o cursor via mouseEmulationRunnable a 50 ms (ControllerHandler.java:3061-3087), A/B viram botoes e o D-pad vira scroll.

**movingButton** — referencia ao botao que originou o gesto de arraste, usada para que apenas ele possa 'entregar' e 'retirar' a pressao de botoes vizinhos (DigitalButton.java:63, 80-91).

**MulticastLock** — lock do WifiManager necessário para o Android entregar pacotes multicast ao app; sem ele o mDNS via jmDNS não funciona (JmDNSDiscoveryAgent.java:145-148,174).

**Native resolution entry** — entrada de resolução injetada em runtime a partir de Display.getSupportedModes/DisplayCutout, marcada com prefixo Native/Custom (StreamSettings.java:196-240)

**ndk.debugSymbolLevel = 'FULL'** — gera símbolos nativos completos (app/build.gradle:18) para que o Play Console consiga simbolicar crashes em C. Aumenta o tempo de build e o tamanho dos outputs intermediários.

**ndkBuild** — o sistema de build nativo deste projeto — Android.mk e Application.mk, NÃO CMake. Adicionar um .c novo exige editá-lo à mão em app/src/main/jni/moonlight-core/Android.mk:12-41; não há glob. Trocar por CMake exige ADR segundo o AGENTS.md.

**needsClickpadEmulation** — ativado quando o cliente finge ser um controle PlayStation para habilitar sensores num gamepad Xbox (ControllerHandler.java:3336); libera o combo Select+LB como botao de clickpad.

**nonRoot_game** — o flavor principal e o que interessa ao dono do fork. applicationId com.limelight, sem limite de SDK. Nomes de tarefa derivam dele com a primeira letra maiúscula: assembleNonRoot_gameDebug, testNonRoot_gameDebugUnitTest, lintNonRoot_gameDebug. O underscore faz parte do nome e é fonte recorrente de erro — appveyor.yml:17 usa o nome do upstream (nonRoot) e por isso nunca acha o artefato.

**Normalização QWERTY / forceQwerty** — remapear o keycode produzido pelo layout do teclado do usuário para a POSIÇÃO física equivalente num teclado US-QWERTY, via `InputDevice.getKeyCodeForKeyLocation()` (API 33+). Preferência `checkbox_force_qwerty`, default true (PreferenceConfiguration.java:194).

**number_zoom_scale / number_pan_offset_x / number_pan_offset_y** — float de runtime nas prefs default (defaults 1.0/0.0/0.0, :1031-1033); não aparecem em preferences.xml

**NvConnection** — fachada Java da sessão de streaming (nvstream/NvConnection.java). Faz o handshake HTTP de launch/resume e depois só encaminha input para o MoonBridge. Apesar do pacote, depende de APIs Android.

**NvHTTP / PairingManager** — cliente HTTP(S) do protocolo de controle do host (serverinfo, applist, launch, resume, quit) e a máquina de pareamento (PIN clássico e OTP+passphrase do Apollo).

**Obtainium** — gerenciador de apps Android que instala direto de GitHub Releases. A URL embutida em app/build.gradle:57 configura o filtro de APK do fork (apkFilterRegEx nonRoot), que hoje casa com as 4 ABIs simultaneamente.

**OMX vs C2 (Codec2)** — duas gerações de HAL de codec no Android. Prefixos 'omx.*' são a antiga, 'c2.*' a nova. Em vários devices as duas coexistem e a que tem FEATURE_LowLatency não é a primeira listada (errata #15).

**onKeyPreIme** — callback de View invocado pelo ViewRootImpl ANTES de o evento ir ao IME. É o primeiro ponto de contato do teclado no Artemis (StreamContainer.java:161) e é o que permite roubar teclas que o IME consumiria (ex.: Shift+Space da Samsung).

**onscreen_keyboard_autofit** — boolean, default false (:960) → campo onscreenKeyboardAutoFitDisabled (semântica invertida em relação ao nome); quando marcado, habilita altura/largura manuais (KeyBoardLayoutController.java:327-329)

**option_reset_osc** — DialogPreference que limpa o arquivo do layout de teclado selecionado (ConfirmDeleteKeyboardPreference.java:46-52)

**option_reset_osc_preference** — DialogPreference que limpa o arquivo SharedPreferences "OSC" (ConfirmDeleteOscPreference.java:46); sem valor persistido

**option_view_shared_pref_logs / option_help_custom_keys / option_software_release / option_follow_update** — WebLauncherPreference com URL fixa no atributo 'url' (wiki, teclas especiais, releases, Obtainium)

**Opus multistream** — modo do Opus para >2 canais, onde N canais sao transportados como S streams (alguns 'coupled', isto e, estereo) mais um array de mapping. Parametros vem do host via RTSP DESCRIBE (RtspConnection.c:664 parseOpusConfigFromParamString).

**OSC** — arquivo de prefs com o layout do gamepad virtual (VirtualControllerConfigurationLoader.java:20,416,431)

**OSC (On-Screen Controller)** — overlay de gamepad virtual desenhado sobre o stream; classe raiz VirtualController (virtual_controller/VirtualController.java:28), habilitado por prefConfig.onscreenController.

**OSC (On-Screen Controls)** — controles virtuais desenhados sobre o stream — gamepad virtual (com.limelight.binding.input.virtual_controller) e teclado virtual (subpacote keyboard). Prefixo usado em várias strings (title_reset_osc, suffix_osc_opacity, seekbar_keyboard_axi_opacity).

**OTP pairing** — pareamento do Apollo com PIN de 4 dígitos + passphrase; o cliente envia otpauth = SHA-256(pin + saltHex + passphrase) em hex maiúsculo (PairingManager.java:214-223). Em hosts sem suporte, cai no pareamento clássico por PIN.

**OTP pairing / passphrase** — extensão Apollo. Além do PIN, envia otpauth = SHA-256(pin + saltHex + passphrase) na fase getservercert (PairingManager.java:212-227). UI em PcView.doOTPPair (:584-627); também acionável por deep link art://.

**otpauth** — extensao do fork ao protocolo de pareamento (PairingManager.java:213-227). Envia `SHA-256(pin + saltHex + passphrase)` em hexadecimal para permitir o pareamento por senha do Apollo, sem digitar o PIN no host. Ausente no protocolo GameStream original.

**Overlay de perfil** — SharedPreferences decorator (ProfilesManager.OverlaySharedPreferences, ProfilesManager.java:212-258) que sobrepõe o Map<String,Object> do perfil ativo às prefs default nas LEITURAS; escritas caem no arquivo base (edit() :251)

**Overlay de teclado (KeyBoardController)** — overlay PARALELO e independente do OSC que injeta teclas/mouse em vez de bits de gamepad; habilitado por prefConfig.enableKeyboard (Game.java:1091).

**PACKET_HOLDER** — struct em InputStream.c:66-93 que embrulha um pacote de input com sua entrada de fila, flags ENet e channelId. A union de payloads tem NV_UNICODE_PACKET como último membro justamente para permitir alocação estendida de tamanho variável.

**packetsToDrop** — resync inicial que descarta 500/AudioPacketDuration pacotes de dados no comeco do stream (AudioStream.c:248), mais um ajuste pelo tempo decorrido (linha 302), para nao tocar o backlog acumulado pelo host antes do cliente estar pronto.

**Pairing / PIN / salt** — handshake de 5 fases em PairingManager.pair (:187-316). O cliente gera salt de 16 bytes, deriva AES-128 de hash(salt||PIN), e as partes trocam desafios cifrados; ao final o certificado do servidor fica pinado em ComputerDetails.serverCert.

**PairState** — enum de resultado do pareamento (PairingManager.java:30-36) com cinco valores — NOT_PAIRED, PAIRED, PIN_WRONG, FAILED, ALREADY_IN_PROGRESS. FAILED agrega causas muito diferentes, incluindo falha de verificacao de assinatura (possivel MITM).

**PanZoomHandler** — utils/PanZoomHandler.java — aplica scale/translate no SurfaceView para zoom e pan do vídeo. Precisa ser reavaliado (handleSurfaceChange) sempre que o layout do stream mudar de tamanho.

**parallax_depth / convergence_ratio / balance_shift** — int 0..100, default 50, divididos por 100 em runtime (:1035-1037); parâmetros do render 3D SBS

**parallelPollPc** — estratégia de sondagem simultânea dos 4 endereços com escolha por ordem de precedência local > manual > remoto > IPv6 (ComputerManagerService.java:627-699).

**Patch/options do perfil** — Map<String,Object> em SettingsProfile.options (SettingsProfile.java:11) serializado em files/profiles/profiles.json; hoje é um snapshot completo, não um delta

**PBO (Pixel Buffer Object)** — buffer GL que permite glReadPixels assíncrono. Implementado em readPixelsForAI_Async (:660) mas não utilizado — onDrawFrame chama a versão síncrona.

**Perf overlay lite vs big** — dois formatos do HUD de performance, montados como String dentro de submitDecodeUnit (:1794-1877) e entregues via PerfOverlayListener.onPerfUpdate a TextViews do activity_game.xml.

**Perfil (SettingsProfile) / ProfilesManager** — recurso exclusivo do fork que salva conjuntos completos de preferências e permite alternar entre eles. UI em ProfilesActivity + EditProfileActivity (que reusa a mesma preferences.xml via um PreferenceDataStore em memória). Todas as strings usam o prefixo profile_manager_.

**Perfil ativo** — UUID em ProfilesManager.activeProfileId (ProfilesManager.java:36), persistido junto dos perfis; null = sem perfil, prefs default puras

**Performance Point** — API do Android 10 (VideoCapabilities.PerformancePoint) que declara combinações resolução×fps que o decoder garante. Usada para decidir se vale trocar AVC→HEVC→AV1 (:208-286).

**performance_log** — String JSON gravada nas prefs default por PerformanceDataTracker.java:16,119; não aparece em preferences.xml e é copiada para dentro de perfis novos

**Permission bitmap** — inteiro devolvido pelo Apollo em <Permission> no /serverinfo, decodificado em ComputerDetails.toString() (ComputerDetails.java:170-238). Grupos: input (0x100-0x1000), operation/clipboard/file/server_cmd (0x10000-0x100000), action list/view/launch (0x1000000-0x4000000). -1 = host não informou.

**Permission bitmask (Apollo)** — campo Permission do serverinfo, decodificado em ComputerDetails.toString (:173-222). Grupos: input (controller 0x100, touch 0x200, pen 0x400, mouse 0x800, kbd 0x1000), operation (clipboard_set 0x10000, clipboard_read 0x20000, file_upload 0x40000, file_download 0x80000, server_cmd 0x100000) e action (list 0x1000000, view 0x2000000, launch 0x4000000).

**plaincert** — campo XML da resposta de `pair?phrase=getservercert` contendo o certificado do host em hexadecimal (PairingManager.java:73). Vem vazio quando outro cliente ja esta pareando, o que o codigo traduz em ALREADY_IN_PROGRESS.

**PLC (Packet Loss Concealment)** — sintese de audio pelo proprio Opus quando se chama opus_multistream_decode com data=NULL. Aqui e o caminho de AudioStream.c:167 -> callbacks.c:259 com sampleData NULL.

**Pointer capture** — recurso Android 8+ (View.requestPointerCapture) que entrega o mouse em modo relativo e esconde o cursor do sistema; sob captura, SOURCE_MOUSE vira SOURCE_MOUSE_RELATIVE e SOURCE_TOUCHPAD passa a preencher AXIS_RELATIVE_X/Y.

**POLL_DATA_TTL_MS** — 30 s — após esse tempo sem poll bem-sucedido, o estado do PC volta a UNKNOWN ao retomar o polling (ComputerManagerService.java:53, 209-213).

**PollingTuple** — par (ComputerDetails, Thread) mantido em memoria por `ComputerManagerService` (:61). E onde o certificado recem-pareado e escrito por `PcView.doPair` (:539) antes de o proximo poll persisti-lo no SQLite.

**pref_debug_info** — ação que abre DebugInfoActivity (StreamSettings.java:849-859)

**pref_low_latency_frame_balance** — boolean, default false (:635) → preferLowerDelays; controla timeout de dequeue do decoder (500us vs 2000us, Game.java:692-703)

**PreferenceConfiguration** — DTO que materializa todo o SharedPreferences em campos públicos. Lido via readPreferences(Context) em 40 call-sites; sempre passa pelo overlay do perfil ativo.

**preferLowerDelays** — perfil de latência do fork (PreferenceConfiguration.java:361). Controla o timeout do dequeue de saída e a política de release. ATENÇÃO: a condição do bloco latest-only (:1213) está invertida em relação ao nome.

**prevent packet loss** — workaround client-side (checkbox_prevent_packet_loss) que envia LiSendEmptyPayload a cada 20 ms para impedir o Wi-Fi do Android de dormir (Game.java:333-338, 3701-3702). Independe do host, mas depende do fork do moonlight-common-c.

**PRODUCT_FLAVOR** — variável passada do Gradle ao ndkBuild via externalNativeBuild.ndkBuild.arguments (app/build.gradle:35, :50). É como o makefile do evdev_reader sabe se deve compilar.

**profiles.json** — files/profiles/profiles.json com {profiles:[SettingsProfile], activeProfileId} serializado por Gson (ProfilesManager.java:30-31,102-131)

**ProfilesManager / OverlaySharedPreferences** — sistema de perfis do fork. Perfis ficam em filesDir/profiles/profiles.json (Gson); o perfil ativo é aplicado como um decorator de SharedPreferences que sobrepõe chaves (ProfilesManager.java:212).

**releaseOutputBuffer(index, timestampNs)** — variante que agenda a apresentação do frame para um instante futuro (usada no pacing); a variante (index, boolean) apresenta imediatamente (true) ou descarta (false).

**REMOTE_INPUT_UUID** — UUID mágico 8CB5C136-DA67-4F99-B4A1-F9CD35005CF4 do app 'InputOnly' do Apollo. Quando é o app alvo, NvConnection não tenta encerrar a sessão em andamento (NvConnection.java:321-323).

**render_mode_list** — String "0"|"1"|"2" (2D, 3D SBS, 3D SBS filme), default "0" (:890) → config.renderMode

**resetStreamingSettings** — limpeza de emergência de bitrate/resolução/fps/formato/HDR/unlock_fps/full_range após 3 crashes de decoder (PreferenceConfiguration.java:683-697)

**resolutionScaleFactor** — percentual (default 100) que o host multiplica na resolução do display virtual sem mudar a resolução do stream — melhora nitidez em alguns jogos. Só o Apollo entende (&scaleFactor=, NvHTTP.java:882).

**RFI (Reference Frame Invalidation)** — capacidade de pedir ao host que invalide frames de referência específicos em vez de mandar um IDR completo após perda de pacote. Anunciada em getCapabilities() (:2205); incompatível com o patch num_ref_frames=1 (:1947).

**rikey / rikeyid** — chave AES-128 e id de 32 bits gerados por conexão (NvConnection.java:74-90) e passados na URL de /launch em hex (NvHTTP.java:884-885); usados para cifrar o control stream/input.

**riKey / riKeyId** — chave AES-128 e identificador gerados por conexao (`NvConnection.generateRiAesKey`, :74-86) e enviados ao host na URL de launch em hexadecimal (`NvHTTP.launchApp`, :884-885). Cifram o canal de controle de entrada do stream.

**robolectric.properties** — configuração de shadows e SDK padrão, lida do CLASSPATH de teste (app/src/test/resources/). Um arquivo com esse nome em qualquer outro lugar — inclusive na raiz do repositório, que é onde ele está hoje — é silenciosamente ignorado.

**root (flavor)** — build para dispositivos rooteados, applicationId com.limelight.root, limitada a maxSdk 25 porque o Android O trouxe captura de mouse nativa. É o único flavor que compila o binário evdev_reader — app/src/main/jni/evdev_reader/Android.mk usa ifeq (root,$(PRODUCT_FLAVOR)).

**RTP_AUDIO_QUEUE / FEC block** — estrutura de reordenacao e recuperacao com Reed-Solomon 4 data + 2 paridade (RtpAudioQueue.h:11-13). O tempo maximo de espera por pacote fora de ordem e AudioPacketDuration*4 + 10 ms (RtpAudioQueue.c:534), contribuicao direta ao budget de latencia de audio.

**samplesPerFrame** — numero de samples POR CANAL por frame decodificado. 240 a 5 ms, 480 a 10 ms (48 kHz fixo, RtspConnection.c:740). Usado para dimensionar o jshortArray global (callbacks.c:226) e o buffer do AudioTrack (AndroidAudioRenderer.java:96).

**ScaledBitmap** — wrapper simples (originalWidth, originalHeight, Bitmap) usado para detectar box arts placeholder do GFE por dimensão exata (130x180 no GFE 2.0, 628x888 no GFE 3.0) em CachedAppAssetLoader.isBitmapPlaceholder:328.

**ScaleMode (FIT/FILL/STRETCH)** — política de escala do vídeo. FIT letterboxa preservando o aspect ratio, FILL preenche cortando, STRETCH deforma. Definido em PreferenceConfiguration.java:14-18 e aplicado em StreamContainer.onMeasure().

**scalingDivisor** — fator calculado em AppGridAdapter.updateLayoutWithPreferences:97 como ART_WIDTH_PX(300) / (larguraDaCélulaEmDp * densidade), usado para fazer downsampling da box art na decodificação. Nunca menor que 1.0.

**SceManager** — API proprietaria do NVIDIA Shield (dependencia com.github.cgutman:ShieldControllerExtensions) para rumble e leitura de bateria de controles Shield (ControllerHandler.java:2196, 1116).

**Scroll de alta resolução** — LiSendHighResScrollEvent trabalha em unidades onde 120 (LI_WHEEL_DELTA) equivale a um clique de roda; o scroll horizontal (LiSendHighResHScrollEvent) é extensão exclusiva do Sunshine (InputStream.c:1269-1272).

**seekbar_bitrate_kbps** — int em kbps, sem default no XML, default = getDefaultBitrate(res,fps) (:495-556, :834); range 500..300000, step 500

**seekbar_deadzone** — int %, default 5, XML permite -20..20 (preferences.xml:246-254) → stickDeadzone (ControllerHandler.java:182)

**seekbar_keyboard_axi_opacity** — int %, default 90 (:953) → oscKeyboardOpacity (opacidade do teclado virtual próprio)

**seekbar_metered_bitrate_kbps** — int em kbps, default efetivo = bitrate/4 quando 0 (:839-843); usado em rede tarifada

**seekbar_onscreen_keyboard_height / _width** — int dp, defaults 200 (150..400) e 1000 (150..1000) (:959,:961); dependem de onscreen_keyboard_autofit

**seekbar_osc_opacity** — int %, default 90 (:874) → oscOpacity

**seekbar_resolution_scale_factor** — int %, default 100, range 20..200 (:943) → StreamConfiguration.setResolutionScaleFactor (Game.java:787)

**seekbar_touch_sensitivity_opacity_x / _y** — int %, default 100, range 10..300 (:970,:972) → touchSensitivityX/Y (Game.java:2474,2507); nome 'opacity' é herança de copy-paste

**seekbar_touchpad_sensitivity_opacity / _y_opacity** — int %, default 100, range 10..300 (:995,:997) → touchPadSensitivity / touchPadYSensitity

**seekbar_trackpad_sensitivity_x / _y** — int %, default 100, XML permite -200..200 (preferences.xml:411-430) → TrackpadContext (Game.java:817)

**SeekBarPreference custom** — Preference do projeto com namespace http://schemas.moonlight-stream.com/apk/res/seekbar e atributos min/step/divisor/keyStep (SeekBarPreference.java:20-69)

**sendControllerArrival** — handshake em que o cliente descreve ao host tipo, botoes suportados e capacidades do gamepad; disparado uma unica vez por contexto em assignControllerNumberIfNeeded (ControllerHandler.java:568).

**sendUtf8Text** — método de NvConnection que envia uma string UTF-8 pelo protocolo Moonlight para ser injetada como texto no host. É o transporte que permite 'enviar texto inteiro pela conexão'. Usado em Game.java:325 (flush do commitTextQueue), :2095 (caractere único) e :2206 (KeyEvent.getCharacters).

**sendUtf8Text / LiSendUtf8TextEvent** — primitivo do protocolo que envia uma string UTF-8 inteira ao host (magic 0x17, canal CTRL_CHANNEL_UTF8). NvConnection.java:619 -> simplejni.c:127 -> InputStream.c:1005. É a base do envio 'em bloco' desejado.

**Server Command** — comando arbitrário definido no host e listado em <ServerCommand> no /serverinfo; o cliente dispara pelo índice via LiSendExecServerCmd no control stream. Exige Apollo + a permissão server_cmd (bit 0x00100000).

**ServerCommand** — lista de comandos remotos expostos pelo host Apollo (tag ServerCommand no serverinfo, NvHTTP.getServerCmds :568-570). Executados por índice via MoonBridge.sendExecServerCmd → LiSendExecServerCmd, pacote 0x3000 no canal CTRL_CHANNEL_SERVERCTL (ControlStream.c:2054-2065).

**serverinfo** — documento XML retornado por GET /serverinfo. Fonte única de verdade sobre o host: uniqueid, hostname, appversion (quad), PairStatus, HttpsPort, ExternalPort/ExternalIP, LocalIP, mac, state, currentgame/currentgameuuid, MaxLumaPixels*, ServerCodecModeSupport e (só no Apollo) Permission, VirtualDisplayCapable, VirtualDisplayDriverReady, ServerCommand. Parseado em NvHTTP.getComputerDetails (NvHTTP.java:401-450).

**setDecorFitsSystemWindows(false)** — pré-requisito do tratamento moderno de insets. V+ usa em Game.kt:267; Artemis só em ExternalDisplayControlActivity.java:170.

**setFixedSize (SurfaceHolder)** — fixa o tamanho do BUFFER da Surface independentemente do tamanho da View (Game.java:900, com prefConfig.width/height). Chave para o reflow: redimensionar a View não reconfigura o decoder, só muda o retângulo de composição.

**setFixedSize(w,h)** — fixa o tamanho do buffer da Surface independentemente dos bounds da view, deixando o SurfaceFlinger escalar. Consequência importante: mudanças de layout NÃO disparam SurfaceHolder.Callback.surfaceChanged.

**SettingsProfile / OverlaySharedPreferences** — perfis de configuração persistidos em files/profiles/profiles.json; o overlay sobrepõe um Map<String,Object> por cima das SharedPreferences reais na LEITURA (a escrita, hoje, vaza para o global).

**Shadow (Robolectric)** — classe anotada com @Implements que substitui o comportamento de outra em tempo de teste — o mecanismo que permite rodar código Android na JVM. ShadowMoonBridge existe exclusivamente para anular o System.loadLibrary que causaria UnsatisfiedLinkError sem NDK.

**share_performance_logs** — ação que grava artemistics_logs.txt no cacheDir e dispara ACTION_SEND por e-mail (StreamSettings.java:771-820)

**SharedPreferences default** — arquivo <applicationId>_preferences.xml gerenciado por androidx PreferenceManager.getDefaultSharedPreferences; é a única fonte persistente da configuração do Artemis (PreferenceConfiguration.java:718)

**ShortcutTrampoline** — Activity noHistory que reconstrói a back-stack [PcView, AppView, Game] a partir de atalhos de launcher, arquivos .art ou deep links art://. É o único lugar que chama startActivities() com uma pilha.

**shouldClaimDevice** — decisao de 'roubar' um dispositivo USB do kernel, cruzando canClaimDevice de cada driver com isRecognizedInputDevice e heuristicas de versao de kernel (UsbDriverService.java:288).

**shouldDuplicateMovement** — hack em handleTouchInput (Game.java:3135) que faz os dois contextos lerem o mesmo ponteiro quando o número real de ponteiros é menor que o número simulado — usado no swipe de 2 dedos sintetizado pelo Android.

**simplejni.c** — app/src/main/jni/moonlight-core/simplejni.c — implementação C dos métodos native do MoonBridge (envio de input). callbacks.c faz o caminho inverso (nativo -> Java).

**smallIconMode** — preferência booleana que troca simultaneamente o layout de item (app_grid_item vs app_grid_item_small) e o de grid (app_grid_view 170dp vs app_grid_view_small 110dp). É o único mecanismo de adaptação de densidade de conteúdo do app.

**smartClipboardSync** — preferencia que sincroniza a area de transferencia com o host em cada mudanca de foco de janela (Game.java:2233-2243). Default `false` (PreferenceConfiguration.java:199); exige host Apollo, inativa em Sunshine/Vibeshine.

**Sobreposição de caminhos** — apenas 7 dos 152 arquivos Java do Artemis existem no mesmo caminho no V+ (4,6%) — os 6 de binding/input/virtual_controller/ e nvstream/jni/MoonBridge.java. É a métrica que inviabiliza cherry-pick.

**Source 12290 (DeX)** — valor de InputDevice source usado pelo Samsung DeX para o mouse de desktop (SOURCE_MOUSE | SOURCE_TOUCHSCREEN); recebe tratamento especial de clique no Game.java:2932-2939.

**specialPrefs / special_key** — arquivo e chave com o JSON dos botões especiais do GameMenu (GameMenu.java:38,40,203)

**splits.abi** — gera um APK por arquitetura em vez de um APK gordo (app/build.gradle:153-159). Reduz o download mas multiplica os artefatos por 4 e exige versionCode distinto por ABI para a Play Store — o que este projeto não faz.

**SPS/PPS/VPS** — Sequence/Picture/Video Parameter Set. No Artemis o SPS H.264 é desserializado, patchado e reserializado com jcodec (MediaCodecDecoderRenderer.java:1911-2028); os de HEVC são passados intactos.

**SS_KBE_FLAG_NON_NORMALIZED (0x01)** — bit no campo `flags` do NV_KEYBOARD_PACKET (Input.h:26, Limelight.h:711) que diz ao host 'este keyCode NÃO foi normalizado para um scancode US-English; interprete como está'. É extensão Sunshine: LiSendKeyboardEvent2 força flags=0 quando !IS_SUNSHINE() (InputStream.c:986). No Artemis o valor vem de `keyboardTranslator.hasNormalizedMapping()` (Game.java:2109,2182).

**Stick 'Free' (AnalogStickFree / keyAnalogStickFree)** — variante flutuante do stick virtual (prefConfig.enableNewAnalogStick) em que o centro nasce no ponto de toque; contrasta com AnalogStick/KeyAnalogStick, de centro fixo.

**sticky modifier** — modificador (Ctrl/Shift/Alt/Meta) que fica travado apos long-click no overlay de teclado, controlado por prefConfig.stickyModifierKey (KeyBoardControllerConfigurationLoader.java:165-193).

**Sticky modifier** — modificador do teclado virtual que fica travado após long-press de 300 ms, para permitir combos com um dedo. Estado em `KeyBoardLayoutController.modifierKeyStates` (BitSet) e em `KeyBoardDigitalButton.sticky`. Preferência: checkbox_enable_sticky_modifier_key_virtual_keyboard.

**Sticky modifier (V+)** — modificador do teclado overlay com 3 estados MOD_NEUTRAL / MOD_SINGLE / MOD_LOCKED. KeyboardUIController.kt:431-435 e :502-507. O Artemis tem conceito equivalente via checkbox_enable_sticky_modifier_key_virtual_keyboard.

**STREAM_CFG_LOCAL / REMOTE / AUTO** — classificação da conexão que define o tamanho de pacote (1024 bytes em remoto) e o comportamento do moonlight-common-c. Decidida em NvConnection.detectServerConnectionType (:130-223) inspecionando NetworkCapabilities, NAT64 prefix e RouteInfo.

**StreamContainer** — FrameLayout customizado (com.limelight.ui.StreamContainer) que hospeda o SurfaceView (modo 2D) ou o GLSurfaceView (modos 3D SBS) do stream e implementa onMeasure com aspect ratio fit/fill. É o componente ativo. NÃO confundir com StreamView, que é a classe antiga e morta no mesmo pacote.

**StreamContainer vs SurfaceView interna** — StreamContainer é o FrameLayout que faz o aspect-fit (letterbox); dentro dele há a SurfaceView/GLSurfaceView que o PanZoomHandler escala e translada. Toda normalização de toque hoje usa o container, o que é a causa do bug de zoom.

**StreamView** — classe legada com.limelight.ui.StreamView, 167 linhas, sem nenhuma referência no projeto. Foi substituída por StreamContainer. Ambas declaram uma interface interna chamada InputCallbacks, com assinaturas diferentes — fonte comum de confusão.

**Strings de 'Compliance'** — bloco no final de values/strings.xml (linhas 675-676) com category_basic_settings e title_checkbox_stretch_video declaradas VAZIAS (<string name=... />). São chaves que foram removidas do uso mas mantidas como stub para não quebrar as 24 traduções que ainda as contêm.

**STUN** — usado apenas para descobrir o IP WAN do próprio cliente (que na LAN é o mesmo do host) e preencher remoteAddress. Servidor: stun.moonlight-stream.org:3478 via LiFindExternalAddressIP4 (ComputerManagerService.java:370).

**subcomando ProCon 0x10 (SPI flash read)** — mecanismo usado para ler calibracao de sticks/IMU gravada na flash do controle (ProConController.java:346).

**Sunshine** — host open-source compatível com GameStream. Adiciona ExternalPort, portas dinâmicas, buttonFlags2, teclado com flags e canais ENet extras.

**SunshineFeatureFlags** — uint32 global (Connection.c:35) extraído do atributo SDP `x-ss-general.featureFlags` no handshake RTSP (RtspConnection.c:1131), 0 se ausente. Gateia touch/pen (LI_FF_PEN_TOUCH_EVENTS 0x01) e controller touch/motion (LI_FF_CONTROLLER_TOUCH_EVENTS 0x02). NÃO gateia teclado nem UTF-8.

**surround-params** — string no SDP do DESCRIBE no formato 'a=fmtp:97 surround-params=<channelCount><streams><coupledStreams><mapping[0..N]>', cada campo um digito. Parseada em RtspConnection.c:759-798. Pode aparecer duas vezes: a primeira e a config normal, a segunda a de high quality.

**surroundAudioInfo** — parametro do /launch HTTP enviado ao host, formato channelMask<<16|channelCount (MoonBridge.getSurroundAudioInfo :165, usado em NvHTTP.java:889). Diferente do AudioConfiguration por nao carregar o magic byte.

**switchDown / enableSwitchDown** — modo toggle de um botao do overlay de teclado (elementIds prefixados 'key_s_' ou 'm_s_'), em que o UP e suprimido ate o proximo toque (KeyBoardDigitalButton.java:215-251).

**SYSTEM_UI_FLAG_IMMERSIVE_STICKY + FLAG_FULLSCREEN** — combinação que faz o Android ignorar adjustResize. Artemis em Game.java:359 e Game.java:1666; V+ em Game.kt:272 e Game.kt:1291. Idênticos.

**tarefa agregadora `test`** — tarefa sintética criada em build.gradle:21-32 que faz dependsOn de toda tarefa *UnitTest de todos os variants. `./gradlew test` executa a suíte 4 vezes (2 flavors × 2 buildTypes). Preferir sempre :app:testNonRoot_gameDebugUnitTest, que é o que o AGENTS.md e o validate.mjs usam.

**Teclado 'axi' / axixi** — nome interno do teclado full on-screen do fork. res/layout/layout_axixi_keyboard.xml (31KB) é um LinearLayout estático com 84 TextViews SEM NENHUM android:id — cada tecla é identificada por android:tag contendo o keycode Android em string ('111' = ESC, '131' = F1) ou a string literal 'hide'. Inflado e controlado por KeyBoardLayoutController.

**TOFU (Trust On First Use)** — modelo de confianca adotado no pareamento — o certificado que o host apresenta na primeira vez e memorizado (`http.setServerCert`, PairingManager.java:246; persistido em ComputerDatabaseManager.java:129) e passa a ser exigido byte-a-byte nas conexoes seguintes. Nao ha CA; a autenticidade da primeira conexao vem do PIN digitado pelo usuario.

**toggleKeyboard() vs toggleFullKeyboard()** — o primeiro (Game.java:2402) abre o IME do sistema via InputMethodManager.toggleSoftInput; o segundo (Game.java:1122) alterna o teclado próprio do app (KeyBoardLayoutController).

**tombstonePrefs / DecoderTombstone** — SharedPreferences que conta crashes do MediaCodec entre execuções (Game.java:355, UiHelper.showDecoderCrashDialog:182).

**tools/validate.mjs** — o gate do fork, prescrito pelo AGENTS.md como definição de pronto. Quatro estágios em ordem — codemap --check, jni-check, assembleNonRoot_gameDebug, testNonRoot_gameDebugUnitTest. `--fast` pula os que precisam de Android SDK. Não cobre lint. Quando pula estágios, avisa quais (linhas 105-107) — esse aviso é o que impede reportar como verificado o que não rodou.

**Toque nativo (native touch)** — envio dos pontos de contato crus ao host via LiSendTouchEvent com coordenadas normalizadas 0..1, pressão, área de contato e rotação; só funciona com Sunshine/Apollo que anuncie a feature flag LI_FF_PEN_TOUCH_EVENTS, caso contrário retorna LI_ERR_UNSUPPORTED (-5501).

**TouchContext** — interface de 7 métodos (TouchContext.java) que abstrai o comportamento de um dedo individual; existem exatamente 2 instâncias por mapa (índice 0 = dedo primário, índice 1 = secundário).

**touchContextMap vs trackpadContextMap** — dois arrays de TouchContext em Game.java:149-150. O primeiro atende dedos na TELA (modo definido por mouse_mode_list); o segundo atende um TRACKPAD FÍSICO (SOURCE_TOUCHPAD) e é sempre TrackpadContext com sensibilidade/swap das prefs.

**triggersIdleNegative** — quando os eixos de gatilho repousam em -1 em vez de 0 (controles com eixos centrados em zero), exige a conversao (v+1)/2 (ControllerHandler.java:1732-1739).

**ultra low latency / warp factor** — opções de tuning do decoder do fork. enableUltraLowLatency escalona flags de fabricante por tryNumber em MediaCodecHelper.setDecoderLowLatencyOptions; framePacingWarpFactor multiplica o frame rate alvo (Game.java:775-777).

**uniqueId** — identificador de cliente persistido em `files/uniqueid` (IdentityManager.java:15), enviado como query param em toda requisicao HTTP (`NvHTTP.getCompleteUrl`, :479). Nao e credencial de autenticacao — o certificado e — mas o host o usa para distinguir clientes.

**UTF8_TEXT_EVENT_MAGIC (0x00000017)** — magic do pacote de texto Unicode (Input.h:32). Está no namespace NVIDIA original (não em 0x55xxxxxx de Sunshine nem 0x8000xxxx de Apollo), o que indica que é feature de protocolo base — por isso LiSendUtf8TextEvent não negocia suporte com o host.

**UTF8_TEXT_EVENT_MAGIC / UTF8_TEXT_EVENT_MAX_COUNT** — magic 0x00000017 e limite de 32 bytes de texto por pacote (Input.h:32-37). O envio fragmenta em um code point por pacote (InputStream.c:610-648).

**UTF8_TEXT_EVENT_MAX_COUNT (32)** — tamanho declarado do array `text` em NV_UNICODE_PACKET (Input.h:33,36). É enganoso: NÃO é o limite real. O campo é o último membro da union PACKET_HOLDER de propósito, e allocatePacketHolder(length) sobre-aloca para permitir textos maiores (InputStream.c:71-73, 210-216). O limite REAL é o tempBuffer[256] de ControlStream.c:704.

**values-iw** — código de locale LEGADO para hebraico usado pelo Android (o ISO moderno é 'he'). O projeto usa 'iw' consistentemente em values-iw/, arrays.xml e locales_config.xml — não trocar para 'he' sem verificar os três lugares.

**vDisplay / Virtual Display** — display virtual criado pelo host, casado com a resolução/refresh do cliente. No Artemis é um flag por-launch (&virtualDisplay=1, NvHTTP.java:887) somado a uma preferência default (checkbox_use_virtual_display) e a um item de menu de contexto por app (AppView START_WITH_VDISPLAY).

**Vendor extension keys** — chaves não documentadas no namespace 'vendor.<extensão>.<parâmetro>' aceitas pelo MediaCodec desde Android 8. Cada SoC tem as suas; a lista conhecida está em MediaCodecHelper.java:221-227 e as aplicações em :533-702.

**vendorizadas** — openssl/, libopus/, enet/ e reedsolomon/ — código de terceiros copiado para dentro do repo. O AGENTS.md proíbe editá-las. Efeito colateral a ter em mente: a proibição também faz ninguém olhar para lá, e é onde está a OpenSSL EOL.

**Vibeshine** — fork do Sunshine usado pelo dono deste fork, com display virtual automático por cliente. NÃO é o Apollo — nenhuma tag Apollo-específica é garantida; toda feature marcada 'requires Apollo' deve ser considerada inativa até verificação no /serverinfo real.

**video_format** — String auto|forceav1|forceh265|neverh265, default "auto" → enum FormatOption (:585-605)

**Virtual Display (vDisplay)** — capacidade Apollo/Vibeshine de criar um monitor virtual para a sessão. Sinalizada por VirtualDisplayCapable + VirtualDisplayDriverReady no serverinfo e enviada como &virtualDisplay=1 no /launch (NvHTTP.java:887).

**virtual display / vDisplay** — recurso do Apollo/Vibeshine em que o host cria um monitor virtual com a resolução do cliente. No app é o extra Game.EXTRA_VDISPLAY e a preference useVirtualDisplay; AppView oferece variantes de menu 'start with vdisplay'.

**VK_* / Virtual-Key code** — código de tecla do Windows (ex.: VK_ESCAPE = 0x1B, VK_LSHIFT = 0xA0). É o que o host Sunshine/Apollo espera. Tabela completa em app/src/main/java/com/limelight/utils/KeyMapper.java:750-937.

**Wake-on-LAN magic packet** — 6 bytes 0xFF seguidos de 16 repetições do MAC (WakeOnLanSender.createWolPayload :131-148), enviado por UDP a portas 9, 47009 e às portas GFE 47998-48010 deslocadas pelo offset da porta HTTP base 47989 (:20-22, 43-53).

**WindowInsets.Type.ime()** — API moderna (API 30+) que reporta a altura ocupada pelo teclado do sistema. Usada hoje apenas em ExternalDisplayControlActivity.java:172; é a peça central do reflow estilo AnyDesk.

**WindowInsetsCompat.Type.ime()** — API androidx (nativa em API 30+) para medir a altura do teclado virtual. É a rota correta para a dor #1 no minSdk 21. Nenhum dos dois forks usa na Game.

