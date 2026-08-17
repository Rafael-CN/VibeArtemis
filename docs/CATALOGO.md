# Catálogo de propostas

> Índice único de tudo que foi proposto para este fork. **Cite o código** para
> começar a trabalhar em um item.

Origem: análise multi-agente de 2026-08-16 (14 subsistemas, 1.059 leituras de
arquivo), consolidada e deduplicada. Propostas que apareceram em mais de uma
análise estão marcadas — são as de maior confiança.

| Prefixo | Significado | Onde está o plano |
|---|---|---|
| **E** | EPIC — várias frentes | [planos/EPICS.md](planos/EPICS.md) |
| **M** | Melhoria — escopo definido | [planos/MELHORIAS.md](planos/MELHORIAS.md) |
| **Q** | Ganho rápido | [planos/QUICK-WINS.md](planos/QUICK-WINS.md) |
| **B** | Bug confirmado | [planos/BUGS.md](planos/BUGS.md) |

## Em andamento

| Código | Proposta | Estado |
|---|---|---|
| [**E01**](epics/E01-teclado-anydesk.md) | Teclado no padrão AnyDesk | implementado, pendente de validação em dispositivo |

## EPICs

| Código | Proposta | Tamanho | Subsistema |
|---|---|---|---|
| [**E02**](planos/EPICS.md#e02) | EPIC — Empacotar múltiplos code points por pacote UTF-8 quando o host for Sunshine/Apollo | epic | Rede, Protocolo e Descoberta de Hosts |
| [**E03**](planos/EPICS.md#e03) | Modelo explícito de capacidades do host — **prioridade elevada**, o clipboard aparece sem funcionar no Vibeshine | epic | Rede |
| [**E04**](planos/EPICS.md#e04) | EPIC: Camada de audio resiliente a mudancas de layout e ciclo de vida (pre-requisito da featur… | epic | Pipeline de Audio |
| [**E05**](planos/EPICS.md#e05) | Passagem de microfone do cliente — ⚠ **não recomendado**, o protocolo não tem canal ascendente | epic | Áudio |
| [**E06**](planos/EPICS.md#e06) | EPIC: Extrair MediaCodecDecoderRenderer em componentes testáveis | epic | Pipeline de Vídeo e Decodificação |
| [**E07**](planos/EPICS.md#e07) | Perfis por host e por app (resolução automática de perfil) | epic | Preferências, Configuração e Perfis |
| [**E08**](planos/EPICS.md#e08) | EPIC — decidir explicitamente o que NÃO portar do V+ e fechar o escopo do fork | epic | Comparação Artemis |
| [**E09**](planos/EPICS.md#e09) | EPIC — Mover a identidade criptografica do cliente para o Android Keystore | epic | Segurança, Privacidade e Robustez |

## Melhorias

| Código | Proposta | Tamanho | Subsistema |
|---|---|---|---|
| [**M01**](planos/MELHORIAS.md#m01) | Endurecer o parsing de MAC e adicionar broadcast dirigido no Wake-on-LAN | small | Rede, Protocolo e Descoberta de Hosts |
| [**M02**](planos/MELHORIAS.md#m02) | Deduplicar entradas de mDNS por nome de serviço e evictar em serviceRemoved | small | Rede, Protocolo e Descoberta de Hosts |
| [**M03**](planos/MELHORIAS.md#m03) | Propagar o comprimento decodificado do Opus ate o AudioTrack | small | Pipeline de Audio |
| [**M04**](planos/MELHORIAS.md#m04) | Instrumentacao de audio no overlay de performance | small | Pipeline de Audio |
| [**M05**](planos/MELHORIAS.md#m05) | Habilitar o modo de gravacao de audio para diagnostico | small | Pipeline de Audio |
| [**M06**](planos/MELHORIAS.md#m06) | Pinar e reproduzir o build da libopus | small | Pipeline de Audio |
| [**M07**](planos/MELHORIAS.md#m07) | Reset defensivo de estado sintético em cancelamento e perda de foco | small | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**M08**](planos/MELHORIAS.md#m08) | Fallback automático quando o host não suporta toque/caneta nativos | small | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**M09**](planos/MELHORIAS.md#m09) | Corrigir o rastreamento de latência de decodificação (thread-safety + vazamento) | small | Pipeline de Vídeo e Decodificação |
| [**M10**](planos/MELHORIAS.md#m10) | Mover o watchdog de decoder C2 para dentro do loop e fazê-lo funcionar | small | Pipeline de Vídeo e Decodificação |
| [**M11**](planos/MELHORIAS.md#m11) | Sanear o dimensionamento da SurfaceView (setFixedSize, setFrameRate, modos 3D) | small | Pipeline de Vídeo e Decodificação |
| [**M12**](planos/MELHORIAS.md#m12) | Reduzir consumo de CPU do loop de renderização | small | Pipeline de Vídeo e Decodificação |
| [**M13**](planos/MELHORIAS.md#m13) | Remover a penalidade de 50 ms do caminho UTF-8 em hosts Sunshine/Apollo | small | Camada Nativa |
| [**M14**](planos/MELHORIAS.md#m14) | Propagar códigos de erro dos wrappers JNI de input para o Java | small | Camada Nativa |
| [**M15**](planos/MELHORIAS.md#m15) | Documentar formalmente o contrato do teclado/UTF-8 num arquivo de referência do repo | small | Camada Nativa |
| [**M16**](planos/MELHORIAS.md#m16) | Registrar proveniência e hashes das bibliotecas estáticas pré-compiladas | small | Camada Nativa |
| [**M17**](planos/MELHORIAS.md#m17) | Cache de PreferenceConfiguration com invalidação por listener | small | Preferências, Configuração e Perfis |
| [**M18**](planos/MELHORIAS.md#m18) | Corrigir o pipeline de frame pacing e reconciliar as opções warp/cap-fps | small | Preferências, Configuração e Perfis |
| [**M19**](planos/MELHORIAS.md#m19) | Preset 'Apollo/Vibeshine + display virtual' como perfil de fábrica | small | Preferências, Configuração e Perfis |
| [**M20**](planos/MELHORIAS.md#m20) | Corrigir o ciclo de vida de toque dos sticks 'Free' (cancel + relogio + centro obsoleto) | small | Entrada de Controle/Gamepad |
| [**M21**](planos/MELHORIAS.md#m21) | Deteccao de mudanca no envio do OSC + revisao do hack de retransmissao | small | Entrada de Controle/Gamepad |
| [**M22**](planos/MELHORIAS.md#m22) | Reservar um controllerNumber dedicado para o OSC quando multiController estiver ativo | small | Entrada de Controle/Gamepad |
| [**M23**](planos/MELHORIAS.md#m23) | Documentar o contrato de extras do Game em um único lugar e tipar consistentemente | small | Arquitetura Geral e Ciclo de Vida do App |
| [**M24**](planos/MELHORIAS.md#m24) | Migrar AdapterFragment e as transações de fragment para AndroidX | small | Arquitetura Geral e Ciclo de Vida do App |
| [**M25**](planos/MELHORIAS.md#m25) | Adicionar um CLAUDE.md / docs de arquitetura com o mapa de componentes e os pontos de extensão… | small | Arquitetura Geral e Ciclo de Vida do App |
| [**M26**](planos/MELHORIAS.md#m26) | Conectar a SearchPreference já presente no build à tela de 151 preferências | small | UI, Recursos e Internacionalização |
| [**M27**](planos/MELHORIAS.md#m27) | Passada de acessibilidade: contentDescriptions e rótulos de box art | small | UI, Recursos e Internacionalização |
| [**M28**](planos/MELHORIAS.md#m28) | Substituir dispatch por rótulo no GameMenu e remover o hack de OnGlobalLayoutListener | small | UI, Recursos e Internacionalização |
| [**M29**](planos/MELHORIAS.md#m29) | Soltar todas as teclas/modificadores pendentes ao perder foco, pausar ou esconder overlays | small | Entrada de Teclado |
| [**M30**](planos/MELHORIAS.md#m30) | Deduplicar eventos de teclado com throttle nos analógicos/D-Pad virtuais | small | Entrada de Teclado |
| [**M31**](planos/MELHORIAS.md#m31) | Corrigir a coerência entre forceQwerty e a flag SS_KBE_FLAG_NON_NORMALIZED, e restaurar o fall… | small | Entrada de Teclado |
| [**M32**](planos/MELHORIAS.md#m32) | Unificar as três cópias de InputConnection e remover StreamView (código morto) | small | Entrada de Teclado |
| [**M33**](planos/MELHORIAS.md#m33) | Duplo-ESC para abrir o menu e acordes ESC+dígito → F1..F12 | small | Comparação Artemis |
| [**M34**](planos/MELHORIAS.md#m34) | Fechar a superficie exportada: PosterContentProvider, PcView e o par art:// + pin/passphrase | small | Segurança, Privacidade e Robustez |
| [**M35**](planos/MELHORIAS.md#m35) | Corrigir a fronteira JNI do envio de texto: byte[] UTF-8 real em vez de GetStringUTFChars | small | Segurança, Privacidade e Robustez |
| [**M36**](planos/MELHORIAS.md#m36) | Enxugar DeviceUtils e o AccessibilityService ao escopo realmente usado | small | Segurança, Privacidade e Robustez |
| [**M37**](planos/MELHORIAS.md#m37) | Corrigir e documentar a matriz de compatibilidade de host (Apollo vs Sunshine/Vibeshine) | small | Delta Artemis vs Moonlight upstream |
| [**M38**](planos/MELHORIAS.md#m38) | Fechar as lacunas do gate: lint, links de docs e relatório honesto de estágios pulados | small | Build, CI, Testes e Qualidade |
| [**M39**](planos/MELHORIAS.md#m39) | Reapontar o teste de commitText para o caminho vivo e remover StreamView | small | Build, CI, Testes e Qualidade |
| [**M40**](planos/MELHORIAS.md#m40) | Adicionar signingConfigs lido de variáveis de ambiente | small | Build, CI, Testes e Qualidade |
| [**M41**](planos/MELHORIAS.md#m41) | Instrumentar cobertura com JaCoCo, medindo antes de exigir | small | Build, CI, Testes e Qualidade |
| [**M42**](planos/MELHORIAS.md#m42) | Matriz de SDK no Robolectric como base do EPIC do teclado | small | Build, CI, Testes e Qualidade |
| [**M43**](planos/MELHORIAS.md#m43) | Unificar as três implementações de InputConnection em uma só ✱ | medium | Arquitetura Geral e Ciclo de Vida do App |
| [**M44**](planos/MELHORIAS.md#m44) | Reaproveitar SSLContext/OkHttpClient e trocar as threads de poll por um pool | medium | Rede, Protocolo e Descoberta de Hosts |
| [**M45**](planos/MELHORIAS.md#m45) | Persistir capacidades e httpsPort no banco para eliminar o round-trip HTTP de descoberta de po… | medium | Rede, Protocolo e Descoberta de Hosts |
| [**M46**](planos/MELHORIAS.md#m46) | Resync explicito do AudioTrack em vez de descarte cego | medium | Pipeline de Audio |
| [**M47**](planos/MELHORIAS.md#m47) | Audio focus e reconfiguracao dinamica ao trocar de dispositivo de saida | medium | Pipeline de Audio |
| [**M48**](planos/MELHORIAS.md#m48) | Expor controles de latencia/qualidade de audio nas preferencias | medium | Pipeline de Audio |
| [**M49**](planos/MELHORIAS.md#m49) | Corrigir o descasamento entre zoom/pan e coordenadas de toque/caneta | medium | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**M50**](planos/MELHORIAS.md#m50) | Gestos multi-dedo configuráveis e unificados | medium | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**M51**](planos/MELHORIAS.md#m51) | Suportar mais de 2 pontos de toque nos modos de emulação | medium | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**M52**](planos/MELHORIAS.md#m52) | Testes JVM para a máquina de estados dos TouchContexts | medium | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**M53**](planos/MELHORIAS.md#m53) | Unificar o loop de saída: um caminho por modo de pacing | medium | Pipeline de Vídeo e Decodificação |
| [**M54**](planos/MELHORIAS.md#m54) | Faxina de código morto no pipeline de vídeo | medium | Pipeline de Vídeo e Decodificação |
| [**M55**](planos/MELHORIAS.md#m55) | Estatísticas de vídeo confiáveis: rendered FPS real e agregação thread-safe | medium | Pipeline de Vídeo e Decodificação |
| [**M56**](planos/MELHORIAS.md#m56) | Usar o caminho PBO assíncrono já implementado no Stereo3DRenderer | medium | Pipeline de Vídeo e Decodificação |
| [**M57**](planos/MELHORIAS.md#m57) | Habilitar AV1 no modo AUTO e expor override manual de decoder | medium | Pipeline de Vídeo e Decodificação |
| [**M58**](planos/MELHORIAS.md#m58) | HDR10: colorspace BT.2020 e transfer ST2084 corretos | medium | Pipeline de Vídeo e Decodificação |
| [**M59**](planos/MELHORIAS.md#m59) | Bridgear o callback setAdaptiveTriggers da DualSense | medium | Camada Nativa |
| [**M60**](planos/MELHORIAS.md#m60) | Adicionar bindings faltantes de APIs Li* já disponíveis no C | medium | Camada Nativa |
| [**M61**](planos/MELHORIAS.md#m61) | Perfis como delta + limpeza de chaves de runtime | medium | Preferências, Configuração e Perfis |
| [**M62**](planos/MELHORIAS.md#m62) | Busca e navegação dentro das configurações | medium | Preferências, Configuração e Perfis |
| [**M63**](planos/MELHORIAS.md#m63) | Export/import de configuração completa (incluindo perfis) | medium | Preferências, Configuração e Perfis |
| [**M64**](planos/MELHORIAS.md#m64) | Tornar o teclado virtual próprio e o IME configuráveis de forma coerente | medium | Preferências, Configuração e Perfis |
| [**M65**](planos/MELHORIAS.md#m65) | Camada de 'release-all' unificada para OSC, overlay de teclado e gamepads fisicos | medium | Entrada de Controle/Gamepad |
| [**M66**](planos/MELHORIAS.md#m66) | Implementar calibracao de IMU do Switch Pro Controller | medium | Entrada de Controle/Gamepad |
| [**M67**](planos/MELHORIAS.md#m67) | Testes de regressao para o mapeamento de botoes e a matriz de quirks | medium | Entrada de Controle/Gamepad |
| [**M68**](planos/MELHORIAS.md#m68) | Substituir os singletons estáticos de Activity por um GameBridge (ou binder de sessão) | medium | Arquitetura Geral e Ciclo de Vida do App |
| [**M69**](planos/MELHORIAS.md#m69) | Extrair ComputerManagerConnection e eliminar as três cópias do boilerplate de bind | medium | Arquitetura Geral e Ciclo de Vida do App |
| [**M70**](planos/MELHORIAS.md#m70) | Revisão e conclusão da tradução pt-BR (36% -> 100%) | medium | UI, Recursos e Internacionalização |
| [**M71**](planos/MELHORIAS.md#m71) | Introduzir tokens de cor e migrar temas para Material3 antes de qualquer trabalho de tema | medium | UI, Recursos e Internacionalização |
| [**M72**](planos/MELHORIAS.md#m72) | Reativar o seletor nativo de idioma do Android 13+ e migrar para AppCompatDelegate.setApplicat… | medium | UI, Recursos e Internacionalização |
| [**M73**](planos/MELHORIAS.md#m73) | Adicionar recursos alternativos para tablets e foldables (sw600dp) e revisar o suporte a TV | medium | UI, Recursos e Internacionalização |
| [**M74**](planos/MELHORIAS.md#m74) | Modernizar CachedAppAssetLoader: sair de AsyncTask e corrigir os defeitos de robustez do cache | medium | UI, Recursos e Internacionalização |
| [**M75**](planos/MELHORIAS.md#m75) | Suporte a dead keys e composição de IME no caminho de tecla individual | medium | Entrada de Teclado |
| [**M76**](planos/MELHORIAS.md#m76) | Indicador de estado e feedback visual do teclado (modificadores ativos, texto em envio) | medium | Entrada de Teclado |
| [**M77**](planos/MELHORIAS.md#m77) | Testes automatizados do pipeline de teclado | medium | Entrada de Teclado |
| [**M78**](planos/MELHORIAS.md#m78) | Teclado overlay com modificadores sticky, modo mini e opacidade — avaliar contra o teclado que… | medium | Comparação Artemis |
| [**M79**](planos/MELHORIAS.md#m79) | Extrair o teclado de Game.java para uma classe própria, seguindo o exemplo estrutural do V+ | medium | Comparação Artemis |
| [**M80**](planos/MELHORIAS.md#m80) | Varrer os catch silenciosos e remover a reflexao cargo-cult de Game.java | medium | Segurança, Privacidade e Robustez |
| [**M81**](planos/MELHORIAS.md#m81) | Controle e transparencia da sincronizacao de clipboard | medium | Segurança, Privacidade e Robustez |
| [**M82**](planos/MELHORIAS.md#m82) | Testes de regressao para os caminhos de entrada nao confiavel | medium | Segurança, Privacidade e Robustez |
| [**M83**](planos/MELHORIAS.md#m83) | Esconder na UI as features que o host não suporta em vez de só avisar depois | medium | Delta Artemis vs Moonlight upstream |
| [**M84**](planos/MELHORIAS.md#m84) | Suíte de smoke tests para o caminho de teclado | medium | Delta Artemis vs Moonlight upstream |
| [**M85**](planos/MELHORIAS.md#m85) | Endurecer a resolução de dependências e documentar a proveniência dos binários nativos | medium | Build, CI, Testes e Qualidade |
| [**M86**](planos/MELHORIAS.md#m86) | Consumir o pacote de controle 0x3001 (Set Clipboard) do Apollo e eliminar o polling HTTP de cl… | large | Rede, Protocolo e Descoberta de Hosts |
| [**M87**](planos/MELHORIAS.md#m87) | Extrair a camada de protocolo (nvstream.http) para testes headless | large | Rede, Protocolo e Descoberta de Hosts |
| [**M88**](planos/MELHORIAS.md#m88) | Migrar a saida de audio para AAudio/Oboe | large | Pipeline de Audio |
| [**M89**](planos/MELHORIAS.md#m89) | Eliminar a cópia por frame no caminho de vídeo (DirectByteBuffer ou modelo pull) | large | Camada Nativa |
| [**M90**](planos/MELHORIAS.md#m90) | Gerar o catálogo de preferências a partir de uma única fonte (eliminar defaults duplicados) | large | Preferências, Configuração e Perfis |
| [**M91**](planos/MELHORIAS.md#m91) | Extrair uma base comum para os dois overlays (gamepad e teclado) | large | Entrada de Controle/Gamepad |
| [**M92**](planos/MELHORIAS.md#m92) | Extrair GameWindowController e GameInputRouter de Game.java | large | Arquitetura Geral e Ciclo de Vida do App |
| [**M93**](planos/MELHORIAS.md#m93) | Migrar os grids de GridView+android.app.Fragment para RecyclerView+androidx.fragment | large | UI, Recursos e Internacionalização |
| [**M94**](planos/MELHORIAS.md#m94) | Migrar o teclado virtual próprio para layouts orientados a dados, com AltGr e localização | large | Entrada de Teclado |
| [**M95**](planos/MELHORIAS.md#m95) | EPIC — Camada de confianca explicita: fim do downgrade silencioso e visibilidade do estado TLS | large | Segurança, Privacidade e Robustez |
| [**M96**](planos/MELHORIAS.md#m96) | Enxugar o fork: remover Stereo3D/IA se não for usado | large | Delta Artemis vs Moonlight upstream |
| [**M97**](planos/MELHORIAS.md#m97) | Tratar "Remote Monitor" e "Remote Input" como funções, não como jogos | medium | UI, Rede |

## Ganhos rápidos

| Código | Proposta | Tamanho | Subsistema |
|---|---|---|---|
| [**Q01**](planos/QUICK-WINS.md#q01) | Corrigir o aninhamento do STUN em populateExternalAddress | quick-win | Rede, Protocolo e Descoberta de Hosts |
| [**Q02**](planos/QUICK-WINS.md#q02) | Validar a resposta de /actions/clipboard antes de escrever no clipboard do Android | quick-win | Rede, Protocolo e Descoberta de Hosts |
| [**Q03**](planos/QUICK-WINS.md#q03) | Tornar AddressTuple imutável | quick-win | Rede, Protocolo e Descoberta de Hosts |
| [**Q04**](planos/QUICK-WINS.md#q04) | Corrigir a troca de preferencia enableAudioFx/playHostAudio | quick-win | Pipeline de Audio |
| [**Q05**](planos/QUICK-WINS.md#q05) | Mute local do stream durante a sessao (e cumprir o //静音 todo) | quick-win | Pipeline de Audio |
| [**Q06**](planos/QUICK-WINS.md#q06) | Rastrear o botão ativo do drag no TrackpadContext (corrige botão preso) | quick-win | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**Q07**](planos/QUICK-WINS.md#q07) | Aplicar sensibilidade/swap de eixo também ao trackpad de touchscreen | quick-win | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**Q08**](planos/QUICK-WINS.md#q08) | Indicador visual de modo de toque ativo | quick-win | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**Q09**](planos/QUICK-WINS.md#q09) | Corrigir o loop infinito de configuração em NVIDIA/MediaTek | quick-win | Pipeline de Vídeo e Decodificação |
| [**Q10**](planos/QUICK-WINS.md#q10) | Restaurar o respeito ao frame pacing escolhido pelo usuário | quick-win | Pipeline de Vídeo e Decodificação |
| [**Q11**](planos/QUICK-WINS.md#q11) | Corrigir a codificação de sendUtf8Text: trocar String por byte[] UTF-8 real | quick-win | Camada Nativa |
| [**Q12**](planos/QUICK-WINS.md#q12) | Adicionar binding de LiGetHostFeatureFlags para o app conhecer as capacidades do host | quick-win | Camada Nativa |
| [**Q13**](planos/QUICK-WINS.md#q13) | Higienizar preferências mortas e órfãs | quick-win | Preferências, Configuração e Perfis |
| [**Q14**](planos/QUICK-WINS.md#q14) | Sincronizar os controles duplicados de bitrate e validar limites | quick-win | Preferências, Configuração e Perfis |
| [**Q15**](planos/QUICK-WINS.md#q15) | Telemetria de configuração no DebugInfoActivity | quick-win | Preferências, Configuração e Perfis |
| [**Q16**](planos/QUICK-WINS.md#q16) | Corrigir supportedButtonFlags dos drivers USB | quick-win | Entrada de Controle/Gamepad |
| [**Q17**](planos/QUICK-WINS.md#q17) | Cachear PreferenceConfiguration nos elementos do OSC e remover leituras de prefs do onDraw | quick-win | Entrada de Controle/Gamepad |
| [**Q18**](planos/QUICK-WINS.md#q18) | De-duplicar eventos do stick-para-teclado e remover codigo morto | quick-win | Entrada de Controle/Gamepad |
| [**Q19**](planos/QUICK-WINS.md#q19) | Quick win — Corrigir o flush de commitText para payloads >512 bytes | quick-win | Arquitetura Geral e Ciclo de Vida do App |
| [**Q20**](planos/QUICK-WINS.md#q20) | Quick win — Remover código morto: ui/StreamView.java, ui/ApertureViewGroup.java, app/src/game/ | quick-win | Arquitetura Geral e Ciclo de Vida do App |
| [**Q21**](planos/QUICK-WINS.md#q21) | Endurecer o PosterContentProvider (URI matching + validação de path) | quick-win | Arquitetura Geral e Ciclo de Vida do App |
| [**Q22**](planos/QUICK-WINS.md#q22) | Corrigir enqueueCommitText: textos acima de 512 bytes são descartados silenciosamente | quick-win | UI, Recursos e Internacionalização |
| [**Q23**](planos/QUICK-WINS.md#q23) | Ressincronizar a lista de idiomas: liberar polonês, turco, búlgaro e português europeu | quick-win | UI, Recursos e Internacionalização |
| [**Q24**](planos/QUICK-WINS.md#q24) | Limpeza de recursos e dependências órfãs + habilitar shrinkResources | quick-win | UI, Recursos e Internacionalização |
| [**Q25**](planos/QUICK-WINS.md#q25) | Alternância de teclado por N dedos também no modo de toque nativo (único porte de teclado do V… | quick-win | Comparação Artemis |
| [**Q26**](planos/QUICK-WINS.md#q26) | Registrar em ADR que cherry-pick do V+ é inviável e que todo porte é reimplementação | quick-win | Comparação Artemis |
| [**Q27**](planos/QUICK-WINS.md#q27) | Blindar o backup: excluir chave privada, uniqueid e banco de hosts | quick-win | Segurança, Privacidade e Robustez |
| [**Q28**](planos/QUICK-WINS.md#q28) | Fechar os vazamentos de recurso pontuais ja mapeados | quick-win | Segurança, Privacidade e Robustez |
| [**Q29**](planos/QUICK-WINS.md#q29) | Consertar o retorno de OverlaySharedPreferences.edit() | quick-win | Delta Artemis vs Moonlight upstream |
| [**Q30**](planos/QUICK-WINS.md#q30) | Documentar o delta CRLF para não desperdiçar leitura de diff | quick-win | Delta Artemis vs Moonlight upstream |
| [**Q31**](planos/QUICK-WINS.md#q31) | Mover robolectric.properties para o classpath de teste e centralizar a configuração | quick-win | Build, CI, Testes e Qualidade |
| [**Q32**](planos/QUICK-WINS.md#q32) | Higiene de build: limpar código morto e acelerar a iteração local | quick-win | Build, CI, Testes e Qualidade |

## Bugs

| Código | Proposta | Tamanho | Subsistema |
|---|---|---|---|
| [**B01**](planos/BUGS.md#b01) | Loop infinito de configuração do decoder em SoCs NVIDIA e MediaTek | small | Pipeline de Vídeo e Decodificação |
| [**B02**](planos/BUGS.md#b02) | Buffer de 256 bytes no caminho de criptografia do control stream é uma armadilha de stack smas… | small | Camada Nativa |
| [**B03**](planos/BUGS.md#b03) | frame_pacing do usuário é sobrescrito incondicionalmente para BALANCED em runtime | small | Preferências, Configuração e Perfis |
| [**B04**](planos/BUGS.md#b04) | enqueueCommitText nunca dispara o flush quando o texto gera mais de um chunk: textos > 512 byt… | small | UI, Recursos e Internacionalização |
| [**B05**](planos/BUGS.md#b05) | Fila de commitText nunca é drenada quando o texto gera mais de um bloco (>512 bytes UTF-8) — e… | small | Entrada de Teclado |
| [**B06**](planos/BUGS.md#b06) | Modelo de janela legado (FLAG_FULLSCREEN + IMMERSIVE_STICKY) impede qualquer adjustResize/inse… | small | Entrada de Teclado |
| [**B07**](planos/BUGS.md#b07) | Chave privada do cliente, uniqueid e banco de hosts entram no backup de nuvem e no device-tran… | small | Segurança, Privacidade e Robustez |
| [**B08**](planos/BUGS.md#b08) | OpenSSL 1.1.1q estaticamente linkado, EOL desde setembro de 2023 | small | Build, CI, Testes e Qualidade |
| [**B09**](planos/BUGS.md#b09) | targetSdk 34 com compileSdk 36 bloqueia publicação e distorce a base do EPIC do teclado | small | Build, CI, Testes e Qualidade |
| [**B10**](planos/BUGS.md#b10) | Activity Game não declara windowSoftInputMode: o teclado virtual sempre cobre o stream ✱ | small | UI, Recursos e Internacionalização |
| [**B11**](planos/BUGS.md#b11) | STUN de descoberta de endereço externo só executa quando o usuário está em VPN | small | Rede, Protocolo e Descoberta de Hosts |
| [**B12**](planos/BUGS.md#b12) | Eventos UTF-8 são fragmentados em um pacote ENet por code point, com 50 ms de latência inicial | small | Rede, Protocolo e Descoberta de Hosts |
| [**B13**](planos/BUGS.md#b13) | Pacotes de controle 0x3001 (Set Clipboard) e 0x3002 (File transfer nonce) do Apollo são declar… | small | Rede, Protocolo e Descoberta de Hosts |
| [**B14**](planos/BUGS.md#b14) | Preferencia errada passada ao AndroidAudioRenderer: playHostAudio ocupa o lugar de enableAudio… | small | Pipeline de Audio |
| [**B15**](planos/BUGS.md#b15) | Flick/inércia libera o botão de mouse errado, deixando botão direito/meio preso no host | small | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**B16**](planos/BUGS.md#b16) | Coordenadas de toque absoluto e de caneta ignoram o zoom/pan do vídeo | small | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**B17**](planos/BUGS.md#b17) | Modo "Track pad (Natural)" na tela ignora sensibilidade e swap de eixo configurados | small | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**B18**](planos/BUGS.md#b18) | ACTION_CANCEL no trackpad emulado deixa o botão esquerdo pressionado no host | small | Entrada de Toque, Trackpad, Mouse e Caneta |
| [**B19**](planos/BUGS.md#b19) | framePacing escolhido pelo usuário é sobrescrito para BALANCED em todos os casos | small | Pipeline de Vídeo e Decodificação |
| [**B20**](planos/BUGS.md#b20) | Caminho LATEST_ONLY tem a condição invertida e faz bypass do Choreographer, corrompendo o paci… | small | Pipeline de Vídeo e Decodificação |
| [**B21**](planos/BUGS.md#b21) | Caminho LATEST_ONLY pula doCodecRecoveryIfRequired(), podendo travar a recuperação de codec | small | Pipeline de Vídeo e Decodificação |
| [**B22**](planos/BUGS.md#b22) | enqueueNsByPtsUs (LongSparseArray) é acessado de duas threads sem sincronização e vaza entradas | small | Pipeline de Vídeo e Decodificação |
| [**B23**](planos/BUGS.md#b23) | sendUtf8Text envia Modified UTF-8 (CESU-8), não UTF-8 real — emoji e caracteres do plano suple… | small | Camada Nativa |
| [**B24**](planos/BUGS.md#b24) | O 'texto em bloco' não existe no fio: moonlight-common-c fragmenta todo pacote UTF-8 em um cod… | small | Camada Nativa |
| [**B25**](planos/BUGS.md#b25) | Penalidade fixa de ~50 ms + espera por ACK em CADA pacote UTF-8, inclusive em hosts Sunshine/A… | small | Camada Nativa |
| [**B26**](planos/BUGS.md#b26) | Chave do JoyCon fix divergente entre XML e código: toggle inerte | small | Preferências, Configuração e Perfis |
| [**B27**](planos/BUGS.md#b27) | checkbox_forceTightThresholds é uma preferência 100% morta, lida por reflection sobre um campo… | small | Preferências, Configuração e Perfis |
| [**B28**](planos/BUGS.md#b28) | OverlaySharedPreferences.edit() grava na base: escritas feitas com perfil ativo são silenciosa… | small | Preferências, Configuração e Perfis |
| [**B29**](planos/BUGS.md#b29) | Perfil é snapshot completo das prefs globais, não delta — inclui lixo de runtime e congela con… | small | Preferências, Configuração e Perfis |
| [**B30**](planos/BUGS.md#b30) | Não existe preferência nem suporte para redimensionar o stream quando o IME abre | small | Preferências, Configuração e Perfis |
| [**B31**](planos/BUGS.md#b31) | Gamepads dos drivers USB anunciam supportedButtonFlags = 0 ao host | small | Entrada de Controle/Gamepad |
| [**B32**](planos/BUGS.md#b32) | AnalogStickFree e keyAnalogStickFree nao tratam ACTION_CANCEL: stick trava pressionado | small | Entrada de Controle/Gamepad |
| [**B33**](planos/BUGS.md#b33) | PreferenceConfiguration.readPreferences() e chamado dentro de onDraw() de elementos do OSC | small | Entrada de Controle/Gamepad |
| [**B34**](planos/BUGS.md#b34) | DigitalPad.rotateDrawable() aloca dois Bitmaps e um Canvas por frame desenhado | small | Entrada de Controle/Gamepad |
| [**B35**](planos/BUGS.md#b35) | Overlay de stick-para-teclado dispara 4 KeyEvents por amostra de toque, sem deteccao de mudanca | small | Entrada de Controle/Gamepad |
| [**B36**](planos/BUGS.md#b36) | VirtualController le SharedPreferences a cada evento de entrada do OSC | small | Entrada de Controle/Gamepad |
| [**B37**](planos/BUGS.md#b37) | Game.java é uma god-class de 4348 linhas implementando 12 interfaces | small | Arquitetura Geral e Ciclo de Vida do App |
| [**B38**](planos/BUGS.md#b38) | A janela do Game é configurada de forma que o IME nunca pode redimensionar o stream (causa rai… | small | Arquitetura Geral e Ciclo de Vida do App |
| [**B39**](planos/BUGS.md#b39) | onSystemUiVisibilityChange reimpõe immersive sticky 2s depois, brigando com o IME | small | Arquitetura Geral e Ciclo de Vida do App |
| [**B40**](planos/BUGS.md#b40) | Game.onStop() chama finish() incondicionalmente e a Activity é noHistory+singleTask | small | Arquitetura Geral e Ciclo de Vida do App |
| [**B41**](planos/BUGS.md#b41) | Bug no agendamento do flush de commitText: textos com mais de um chunk nunca são enviados | small | Arquitetura Geral e Ciclo de Vida do App |
| [**B42**](planos/BUGS.md#b42) | ui/StreamView.java é código morto, mas é a única classe coberta pelo teste de commitText | small | Arquitetura Geral e Ciclo de Vida do App |
| [**B43**](planos/BUGS.md#b43) | Sete idiomas traduzidos são inalcançáveis: values-bg, values-pl, values-tr, values-pt, values-… | small | UI, Recursos e Internacionalização |
| [**B44**](planos/BUGS.md#b44) | App sem android:supportsRtl apesar de ter locale hebraico ativo | small | UI, Recursos e Internacionalização |
| [**B45**](planos/BUGS.md#b45) | Dead keys e composição de IME são descartadas silenciosamente — impossível digitar acentos (cr… | small | Entrada de Teclado |
| [**B46**](planos/BUGS.md#b46) | Flag SS_KBE_FLAG_NON_NORMALIZED é calculada independentemente de forceQwerty — cliente mente a… | small | Entrada de Teclado |
| [**B47**](planos/BUGS.md#b47) | Teclas com mapeamento normalizado mas fora do switch são descartadas em vez de usar o fallback… | small | Entrada de Teclado |
| [**B48**](planos/BUGS.md#b48) | UTF8_CHUNK_SIZE = 512 excede MAX_INPUT_PACKET_SIZE = 128 do moonlight-common-c (stack overflow… | small | Entrada de Teclado |
| [**B49**](planos/BUGS.md#b49) | Preferência ignoreSynthEvents desativa TODOS os teclados virtuais próprios e o AccessibilitySe… | small | Entrada de Teclado |
| [**B50**](planos/BUGS.md#b50) | Não existe nenhum campo de entrada de texto (EditText) em toda a UI de streaming | small | Entrada de Teclado |
| [**B51**](planos/BUGS.md#b51) | enqueueCommitText nunca inicia o dreno quando o texto gera 2+ chunks — texto longo fica preso… | small | Comparação Artemis |
| [**B52**](planos/BUGS.md#b52) | Bloqueio da dor #1 do dono: activity .Game sem windowSoftInputMode e com IMMERSIVE_STICKY reap… | small | Comparação Artemis |
| [**B53**](planos/BUGS.md#b53) | Divergência de submódulo moonlight-common-c torna impossível portar qualquer feature de protoc… | small | Comparação Artemis |
| [**B54**](planos/BUGS.md#b54) | ContentProvider exportado sem permissao permite path traversal e leitura do cache por qualquer… | small | Segurança, Privacidade e Robustez |
| [**B55**](planos/BUGS.md#b55) | PcView exportada aceita pin/passphrase por Intent e dispara pareamento automatico sem confirma… | small | Segurança, Privacidade e Robustez |
| [**B56**](planos/BUGS.md#b56) | AccessibilityService declara leitura de conteudo de tela para uma funcao que so precisa filtra… | small | Segurança, Privacidade e Robustez |
| [**B57**](planos/BUGS.md#b57) | Downgrade silencioso para HTTP em texto claro quando o certificado fixado nao confere | small | Segurança, Privacidade e Robustez |
| [**B58**](planos/BUGS.md#b58) | StreamView.java é código morto mas o CLAUDE.md aponta para ele como o caminho do commit-text | small | Delta Artemis vs Moonlight upstream |
| [**B59**](planos/BUGS.md#b59) | Activity Game não declara windowSoftInputMode e não observa insets de IME — bloqueio raiz do c… | small | Delta Artemis vs Moonlight upstream |
| [**B60**](planos/BUGS.md#b60) | O único teste do envio de texto inteiro cobre uma classe morta | small | Build, CI, Testes e Qualidade |
| [**B61**](planos/BUGS.md#b61) | Três implementações duplicadas do mesmo InputConnection de commitText | small | Build, CI, Testes e Qualidade |
| [**B62**](planos/BUGS.md#b62) | Configuração de shadows do Robolectric fora do classpath — nunca é lida | small | Build, CI, Testes e Qualidade |
| [**B63**](planos/BUGS.md#b63) | Repositório sem nenhum CI; o único arquivo de pipeline é herança quebrada do upstream | small | Build, CI, Testes e Qualidade |
| [**B64**](planos/BUGS.md#b64) | AppVeyor publica um artefato de lint com nome de flavor inexistente | small | Build, CI, Testes e Qualidade |


✱ = levantado por mais de uma análise independente.
