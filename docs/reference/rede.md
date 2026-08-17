# Rede, Protocolo e Descoberta de Hosts (nvstream/http, nvstream/mdns, nvstream/wol, computers/, discovery/, NvConnection)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (20)
6. [Ideias de melhoria](#ideias-de-melhoria) (12)
7. [Glossário](#glossário)

## Como funciona

O subsistema de rede do Artemis herda a arquitetura do Moonlight Android: um plano de controle HTTP/HTTPS "GameStream" (NvHTTP) para descoberta de capacidades, pareamento e launch, e um plano de dados nativo (moonlight-common-c via JNI/MoonBridge) para RTSP/ENet/vídeo/áudio/input. NvHTTP.java fala com dois endpoints: HTTP em 47989 (DEFAULT_HTTP_PORT, NvHTTP.java:70) para /serverinfo e /pair quando ainda não há certificado pinado, e HTTPS numa porta dinâmica descoberta via tag `HttpsPort` do XML (default 47984, NvHTTP.java:69,652-662) para /applist, /appasset, /launch, /resume, /cancel e /actions/clipboard. Toda a autenticação é mTLS com certificado auto-assinado do cliente (AndroidCryptoProvider gera RSA-2048 válido por 20 anos, AndroidCryptoProvider.java:114-158) e pinning do certificado do servidor obtido no pareamento (NvHTTP.java:131-158 e o HostnameVerifier em :160-175). O pareamento (PairingManager.java:187-316) é o handshake clássico da NVIDIA: salt+PIN → chave AES-128 (SHA-1 para gen<7, SHA-256 para gen>=7), troca de desafios cifrados em AES-ECB puro (performBlockCipher, :139-163), verificação de assinatura do servidor e envio do segredo do cliente assinado; o fork adiciona a extensão Apollo `otpauth` = SHA-256(pin+saltHex+passphrase) (:212-227), usada pelo fluxo "Pair with OTP" da PcView (PcView.java:584-627) e pelo deep link `art://host:porta?pin=..&passphrase=..` (AddComputerManually.java:103-119,205-216 + AndroidManifest scheme "art"). ComputerManagerService é o orquestrador de estado: mantém uma lista de PollingTuple (uma por PC conhecido), cada uma com sua própria thread de polling que chama runPoll a cada 1500 ms (SERVERINFO_POLLING_PERIOD_MS, :46) e um networkLock que serializa requisições ao mesmo host. Cada poll dispara parallelPollPc (:627-699), que abre até 4 threads simultâneas (localAddress, manualAddress, remoteAddress, ipv6Address) e escolhe o primeiro endereço que responder na ordem de precedência local > manual > remoto > IPv6 — dedupe por HashSet<AddressTuple> (:635). O estado só vira OFFLINE após 3 falhas consecutivas (OFFLINE_POLL_TRIES) ou 2 no primeiro contato (INITIAL_POLL_TRIES, :50-51), e há um TTL de 30 s para invalidar estado velho ao retomar o polling (:53,209-213). A descoberta automática usa mDNS no serviço `_nvstream._tcp`: jmDNS antes do Android 14 e NsdManager a partir do 14 (DiscoveryService.java:58-71), com MdnsDiscoveryAgent.reportNewComputer criando um MdnsComputer por endereço IPv4 mais o melhor IPv6 global (MdnsDiscoveryAgent.java:24-53, seleção IPv6 sofisticada em :86-147 descartando 6to4/Teredo/ULA). O Wake-on-LAN dispara o magic packet para portas estáticas (9, 47009) e portas dinâmicas offsetadas pela porta HTTP base (47998..48010 - 47989 + httpPort) em todos os endereços conhecidos mais 255.255.255.255 (WakeOnLanSender.java:14-59,61-111). A persistência fica em SQLite `computers4.db` com colunas UUID/nome/JSON de endereços/MAC/cert DER (ComputerDatabaseManager.java:26-67) — atributos transitórios (pairState, httpsPort, permission, vDisplay*, serverCommands) NÃO são persistidos (ComputerDetails.java:63-90). A detecção de capacidades do host é implícita e espalhada: `state` contendo "MJOLNIR" identifica GFE/NVIDIA (NvHTTP.java:444), `ExternalPort` identifica Sunshine (NvHTTP.java:664-676), e as tags `Permission`, `VirtualDisplayCapable`, `VirtualDisplayDriverReady` e `ServerCommand` são extensões exclusivas do Apollo/Vibeshine (NvHTTP.java:412-437, 550-570); no lado nativo a única distinção é a macro IS_SUNSHINE() = AppVersionQuad[3] < 0 (moonlight-common-c/src/Limelight-internal.h:86). Não existe flag booleana explícita "isApollo" em lugar nenhum. Para o problema de teclado do dono do fork, os dois caminhos de texto relevantes são: (a) LiSendUtf8TextEvent via canal ENet CTRL_CHANNEL_UTF8 (0x06), que a thread de envio QUEBRA em um pacote por code point e ainda faz flush + espera do control stream + PltSleepMs(50) antes de começar (moonlight-common-c/src/InputStream.c:591-651, 1005-1032); e (b) o endpoint HTTP `actions/clipboard` do Apollo (NvHTTP.java:922-937), que envia o texto INTEIRO de uma vez via POST text/plain — é a única primitiva já existente com semântica "manda tudo de uma vez".

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`](../../app/src/main/java/com/limelight/nvstream/http/NvHTTP.java) | 938 | Cliente HTTP/HTTPS do protocolo GameStream. Concentra descoberta de capacidades (serverinfo), pareamento (transporte), applist, box art, launch/resume/cancel e as extensões Apollo de clipboard. É onde qualquer nova capacidade de host precisa ser lida/negociada. |
| [`app/src/main/java/com/limelight/computers/ComputerManagerService.java`](../../app/src/main/java/com/limelight/computers/ComputerManagerService.java) | 968 | Service Android que mantém o estado de todos os PCs conhecidos: polling paralelo multi-endereço, integração com mDNS, STUN, banco SQLite e o poller de applist. É o coração do gerenciamento de estado de rede. |
| [`app/src/main/java/com/limelight/nvstream/http/PairingManager.java`](../../app/src/main/java/com/limelight/nvstream/http/PairingManager.java) | 356 | Implementa o handshake criptográfico de pareamento NVIDIA (salt+PIN→AES, desafio/resposta, assinaturas) e a extensão OTP/passphrase do Apollo. |
| [`app/src/main/java/com/limelight/nvstream/NvConnection.java`](../../app/src/main/java/com/limelight/nvstream/NvConnection.java) | 628 | Orquestra o início da sessão de streaming: serverinfo, negociação de HDR/resolução/pacote, detecção local-vs-remoto, launch/resume/quit e a chamada final para MoonBridge.startConnection. Também expõe todos os send* de input incluindo sendUtf8Text. |
| [`app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java`](../../app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java) | 239 | Modelo de dados do host. Separa atributos persistentes (uuid, nome, endereços, MAC, cert) de transitórios (state, permission, httpsPort, pairState, vDisplay*, serverCommands). Documenta o bitmask de permissões do Apollo. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c) | 0 | (submódulo) Fila e envio de pacotes de input pelo control stream ENet. Contém a lógica que fatia eventos UTF-8 em um pacote por code point — gargalo central para digitação de texto. |
| [`app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c`](../../app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c) | 0 | (submódulo) Control stream ENet: tabelas de tipos de pacote por geração, incluindo as extensões de protocolo do Apollo (0x3000 Exec Server Command, 0x3001 Set Clipboard, 0x3002 File transfer nonce). |
| [`app/src/main/java/com/limelight/nvstream/mdns/MdnsDiscoveryAgent.java`](../../app/src/main/java/com/limelight/nvstream/mdns/MdnsDiscoveryAgent.java) | 148 | Base abstrata dos agentes mDNS. Converte o resultado do resolve em MdnsComputer (um por IPv4) e implementa a heurística de escolha do melhor endereço IPv6 global. |
| [`app/src/main/java/com/limelight/nvstream/mdns/JmDNSDiscoveryAgent.java`](../../app/src/main/java/com/limelight/nvstream/mdns/JmDNSDiscoveryAgent.java) | 269 | Agente mDNS baseado em jmDNS para Android < 14. Usa MulticastLock, listener estático com refcount e um override de NetworkTopologyDiscovery que ignora o teste de suporte a multicast. |
| [`app/src/main/java/com/limelight/nvstream/mdns/NsdManagerDiscoveryAgent.java`](../../app/src/main/java/com/limelight/nvstream/mdns/NsdManagerDiscoveryAgent.java) | 234 | Agente mDNS via NsdManager para Android 14+. Necessário em ambientes com proxy mDNS (ChromeOS, WSA, emulador). |
| [`app/src/main/java/com/limelight/nvstream/wol/WakeOnLanSender.java`](../../app/src/main/java/com/limelight/nvstream/wol/WakeOnLanSender.java) | 149 | Envio do magic packet WOL para múltiplas portas e endereços. |
| [`app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java`](../../app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java) | 235 | Persistência SQLite (computers4.db) dos PCs pareados: UUID, nome, JSON de endereços, MAC e certificado DER. Faz migração de 3 bancos legados. |
| [`app/src/main/java/com/limelight/binding/crypto/AndroidCryptoProvider.java`](../../app/src/main/java/com/limelight/binding/crypto/AndroidCryptoProvider.java) | 259 | Gera e persiste o par cert/chave do cliente (client.crt PEM com line endings UNIX obrigatórios, client.key PKCS8). Identidade criptográfica usada em todo mTLS e no pareamento. |
| [`app/src/main/java/com/limelight/computers/IdentityManager.java`](../../app/src/main/java/com/limelight/computers/IdentityManager.java) | 73 | Gera/persiste o uniqueId hex de 8 bytes enviado como query param em toda requisição HTTP. |
| [`app/src/main/java/com/limelight/discovery/DiscoveryService.java`](../../app/src/main/java/com/limelight/discovery/DiscoveryService.java) | 90 | Service que encapsula o agente mDNS escolhido por versão de Android e repassa callbacks ao ComputerManagerService. |
| [`app/src/main/java/com/limelight/PcView.java`](../../app/src/main/java/com/limelight/PcView.java) | 933 | UI principal de hosts: menu de contexto, pareamento normal e OTP (extensão Apollo), unpair, WOL, abrir página de gerenciamento e detalhes. |
| [`app/src/main/java/com/limelight/utils/ServerHelper.java`](../../app/src/main/java/com/limelight/utils/ServerHelper.java) | 274 | Ponte entre a camada de rede e as Activities: monta o Intent de launch com host/porta/httpsPort/cert/serverCommands, executa quit e o teste de rede. |
| [`app/src/main/java/com/limelight/preferences/AddComputerManually.java`](../../app/src/main/java/com/limelight/preferences/AddComputerManually.java) | 0 | Adição manual de host e handler do deep link art:// (com pin+passphrase para auto-pareamento OTP). |
| [`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`](../../app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java) | 0 | Fronteira JNI. Declara todos os natives de rede/input, incluindo sendUtf8Text, sendExecServerCmd, findExternalAddressIP4, testClientConnectivity e getLaunchUrlQueryParameters. |
| [`app/src/main/java/com/limelight/nvstream/http/NvApp.java`](../../app/src/main/java/com/limelight/nvstream/http/NvApp.java) | 100 | Modelo de app do host. Contém o UUID mágico do modo InputOnly do Apollo, que altera a lógica de launch/quit em NvConnection. |
| [`app/src/main/java/com/limelight/nvstream/ConnectionContext.java`](../../app/src/main/java/com/limelight/nvstream/ConnectionContext.java) | 34 | Estado negociado da conexão compartilhado entre NvConnection e NvHTTP (versões do servidor, rikey, rtspSessionUrl, dimensões negociadas). |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`**
- `DEFAULT_HTTPS_PORT=47984 :69`
- `DEFAULT_HTTP_PORT=47989 :70`
- `SHORT/LONG_CONNECTION_TIMEOUT/READ_TIMEOUT :71-73`
- `verbose=BuildConfig.DEBUG :76`
- `initializeHttpState() :114`
- `trustManager com pinning :131-158`
- `HostnameVerifier :160-175`
- `getHttpsUrl() :194`
- `NvHTTP(AddressTuple,...) :204`
- `getXmlString() :241/:281`
- `getXmlArray() :285/:320`
- `verifyResponseStatus() :324`
- `getServerInfo() :342`
- `getComputerDetails(String) :401`
- `performAndroidTlsHack() :462`
- `getCompleteUrl() :474`
- `openHttpConnection() :488`
- `getServerSupportsVDisplay() :550`
- `getServerVDisplayDriverReady() :559`
- `getServerCmds() :568`
- `getPairState() :572/:576`
- `getHttpsPort() :652`
- `getExternalPort() :664`
- `getAppListByReader() :717`
- `getAppListRaw() :783`
- `executePairingCommand() :799`
- `executePairingChallenge() :804`
- `unpair() :809`
- `launchApp() :849`
- `quitApp() :905`
- `getClipboard() :922`
- `sendClipboard() :929`

**`app/src/main/java/com/limelight/computers/ComputerManagerService.java`**
- `SERVERINFO_POLLING_PERIOD_MS=1500 :46`
- `APPLIST_POLLING_PERIOD_MS=30000 :47`
- `MDNS_QUERY_PERIOD_MS=1000 :49`
- `OFFLINE_POLL_TRIES=3 / INITIAL_POLL_TRIES=2 :50-51`
- `POLL_DATA_TTL_MS=30000 :53`
- `runPoll() :90`
- `createPollingThread() :164`
- `ComputerManagerBinder.startPolling() :197`
- `ComputerManagerBinder.invalidateStateForComputer() :293`
- `onUnbind() :309`
- `populateExternalAddress() :333`
- `createDiscoveryListener() :394`
- `addTuple() :438`
- `addComputerBlocking() :469`
- `removeComputer() :503`
- `tryPollIp() :544`
- `startParallelPollThread() :601`
- `parallelPollPc() :627`
- `pollComputer() :701`
- `onCreate() :716`
- `ApplistPoller :799`
- `PollingTuple :948`

**`app/src/main/java/com/limelight/nvstream/http/PairingManager.java`**
- `PairState enum :30-36`
- `extractPlainCert() :70`
- `saltPin() :97`
- `getSha256SignatureInstanceForKey() :104`
- `verifySignature() :115`
- `signData() :127`
- `performBlockCipher() (AES-ECB) :139`
- `decryptAes/encryptAes :153/:159`
- `generateAesKey() :165`
- `generatePinString() :176`
- `pair(serverInfo,pin,passphrase) :187`
- `bloco otpauth (extensão Apollo) :212-227`
- `Sha1PairingHash :323`
- `Sha256PairingHash :340`

**`app/src/main/java/com/limelight/nvstream/NvConnection.java`**
- `connectionAllowed Semaphore :51`
- `generateRiAesKey() :74`
- `generateRiKeyId() :88`
- `stop() :92`
- `resolveServerAddress() :107`
- `detectServerConnectionType() :130`
- `startApp() :225`
- `quitAndLaunch() :353`
- `launchNotRunningApp() :375`
- `start() :388`
- `sendExecServerCmd() :484`
- `sendKeyboardInput() :537`
- `sendUtf8Text() :619`
- `findExternalAddressForMdns() :625`

**`app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java`**
- `State enum :11`
- `AddressTuple :15`
- `AddressTuple.hashCode/equals :36-49`
- `campos persistentes :63-71`
- `campos transitórios :73-83`
- `vDisplaySupported/vDisplayDriverReady :86-87`
- `serverCommands :90`
- `guessExternalPort() :102`
- `update() :123`
- `toString() com decodificação do bitmask PERM do Apollo :170-238`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c`**
- `MAX_INPUT_PACKET_SIZE=128 :43`
- `allocatePacketHolder() :204`
- `split de pacote UTF-8 + flush + PltSleepMs(50) :591-651`
- `LiSendKeyboardEvent2 flags Sunshine :986`
- `LiSendUtf8TextEvent() :1005`
- `CTRL_CHANNEL_UTF8 :1018`
- `UTF8_TEXT_EVENT_MAGIC :1023`

**`app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c`**
- `IDX_EXEC_SERVER_CMD=12 :141`
- `IDX_SET_CLIPBOARD=13 :142`
- `IDX_FILE_TRANSFER_NONCE_REQUEST=14 :143`
- `packetTypesGen7Enc (0x3000/0x3001/0x3002 = extensões Apollo) :221-238`
- `initializeControlStream() seleção por AppVersionQuad :321-360`
- `needsAsyncCallback() :1021`
- `queueAsyncCallback() else LC_ASSERT(false) :1090-1095`
- `LiSendExecServerCmd() :2054`
- `LiSendEmptyPayload() :2067`

**`app/src/main/java/com/limelight/nvstream/mdns/MdnsDiscoveryAgent.java`**
- `computers HashSet :14`
- `reportNewComputer() :24`
- `getLocalAddress() :61`
- `getLinkLocalAddress() :75`
- `getBestIpv6Address() (descarta 6to4/Teredo/ULA, casa sufixo SLAAC) :86`

**`app/src/main/java/com/limelight/nvstream/mdns/JmDNSDiscoveryAgent.java`**
- `SERVICE_TYPE="_nvstream._tcp.local." :23`
- `MyNetworkTopologyDiscovery.useInetAddress() :82-107`
- `referenceResolver()/dereferenceResolver() :119/:132`
- `startDiscovery() loop 1s :169`
- `stopDiscovery() :227`
- `serviceAdded() com pendingResolution :243`

**`app/src/main/java/com/limelight/nvstream/mdns/NsdManagerDiscoveryAgent.java`**
- `SERVICE_TYPE="_nvstream._tcp" :22`
- `createDiscoveryListener() :30`
- `onServiceFound + registerServiceInfoCallback :92-129`
- `startDiscovery(ignora intervalo) :156`
- `stopDiscovery() :167`
- `getV4Addrs/getV6Addrs :195/:215`

**`app/src/main/java/com/limelight/nvstream/wol/WakeOnLanSender.java`**
- `STATIC_PORTS_TO_TRY {9,47009} :14`
- `DYNAMIC_PORTS_TO_TRY {47998..48010} :20`
- `sendPacketsForAddress() :24`
- `sendWolPacket() :61`
- `macStringToBytes() :113`
- `createWolPayload() :131`

**`app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java`**
- `COMPUTER_DB_NAME="computers4.db" :26`
- `AddressFields :31`
- `initializeDb() + migrações legadas :62`
- `tupleToJson/tupleFromJson :88/:100`
- `updateComputer() :110`
- `getComputerFromCursor() :141`
- `getAllComputers() :183`
- `getComputerByUUID() :222`

**`app/src/main/java/com/limelight/binding/crypto/AndroidCryptoProvider.java`**
- `certFile/keyFile :47-48,61-62`
- `globalCryptoLock :54`
- `loadCertKeyPair() :82`
- `generateCertKeyPair() RSA-2048/20 anos/CN=NVIDIA GameStream Client :114`
- `saveCertKeyPair() :160`
- `getClientCertificate() :191`
- `getPemEncodedClientCertificate() :245`

**`app/src/main/java/com/limelight/computers/IdentityManager.java`**
- `UNIQUE_ID_FILE_NAME="uniqueid" :15`
- `UID_SIZE_IN_BYTES=8 :16`
- `loadUniqueId() :33`
- `generateNewUniqueId() (usa java.util.Random) :55`

**`app/src/main/java/com/limelight/discovery/DiscoveryService.java`**
- `DiscoveryBinder :22`
- `onCreate() seleção jmDNS vs NsdManager :41-72`

**`app/src/main/java/com/limelight/PcView.java`**
- `intent hostname/pin/passphrase :255-267`
- `startComputerUpdates() + auto-pair pendente :286-325`
- `onCreateContextMenu() :399`
- `doPair() :470`
- `doOTPPair() :584`
- `doWakeOnLan() :629`
- `doUnpair() :662`
- `onContextItemSelected() :733`
- `ComputerObject.guessManagementUrl() :928`

**`app/src/main/java/com/limelight/utils/ServerHelper.java`**
- `CONNECTION_TEST_SERVER :36`
- `getCurrentAddressFromComputer() :38`
- `createStartIntent() :93`
- `doStart() :141`
- `doNetworkTest() :157`
- `doQuit() :189/:246`

**`app/src/main/java/com/limelight/preferences/AddComputerManually.java`**
- `isWrongSubnetSiteLocalAddress() :60`
- `parseRawUserInputToUri() ("art://") :103`
- `doAddPc() :121`
- `handoff de pin/passphrase para PcView :205-216`

**`app/src/main/java/com/limelight/nvstream/jni/MoonBridge.java`**
- `ML_PORT_FLAG_* :66-73`
- `ML_TEST_RESULT_INCONCLUSIVE :75`
- `startConnection() :343`
- `sendExecServerCmd() :357`
- `sendEmptyPayload() :359`
- `sendKeyboardInput() :390`
- `sendUtf8Text() :396`
- `findExternalAddressIP4() :400`
- `testClientConnectivity() :406`
- `getLaunchUrlQueryParameters() :417`

**`app/src/main/java/com/limelight/nvstream/http/NvApp.java`**
- `REMOTE_INPUT_UUID="8CB5C136-DA67-4F99-B4A1-F9CD35005CF4" :6`
- `setAppId(String) :36`
- `isInitialized() :87`

**`app/src/main/java/com/limelight/nvstream/ConnectionContext.java`**
- `isNvidiaServerSoftware :12`
- `riKey/riKeyId :16-17`
- `serverAppVersion/serverGfeVersion/serverCodecModeSupport :20-22`
- `rtspSessionUrl :25`
- `negotiatedRemoteStreaming/negotiatedPacketSize :30-31`

</details>

## Fluxo

1) BOOT / DESCOBERTA: PcView.completeOnCreate() faz bindService de ComputerManagerService (PcView.java:278-279). ComputerManagerService.onCreate() (ComputerManagerService.java:716-774) faz bind em DiscoveryService, instancia IdentityManager (gera/lê o hex de 8 bytes em `uniqueid`, IdentityManager.java:33-72), abre o SQLite e chama addTuple() para cada PC salvo (:734-737), e registra um NetworkCallback que zera o estado para UNKNOWN em onAvailable e OFFLINE em onLost (:742-773).
2) mDNS: PcView.onResume → startComputerUpdates → binder.startPolling() (ComputerManagerService.java:197-225) chama discoveryBinder.startDiscovery(1000 ms). DiscoveryService escolhe JmDNSDiscoveryAgent (<API 34) ou NsdManagerDiscoveryAgent (>=34) (DiscoveryService.java:66-71). jmDNS faz requestServiceInfo("_nvstream._tcp.local.") num loop de 1 s (JmDNSDiscoveryAgent.java:189-215) e adquire MulticastLock (:174). O resolve chama MdnsDiscoveryAgent.reportNewComputer (MdnsDiscoveryAgent.java:24-53) → MdnsDiscoveryListener.notifyComputerAdded em ComputerManagerService.createDiscoveryListener() (:394-436), que monta um ComputerDetails só com localAddress/ipv6Address e chama addComputerBlocking.
3) PRIMEIRO CONTATO: addComputerBlocking (ComputerManagerService.java:469-501) chama pollComputer (sem cert pinado), depois procura o cert já salvo na pollingTuples (:476-483) e refaz runPoll(newPc=true) para obter PairStatus correto sobre HTTPS; se ONLINE, addTuple cria a thread de polling.
4) POLL: createPollingThread (:164-194) → runPoll (:90-162) → pollComputer (:701-714) → parallelPollPc (:627-699) → tryPollIp por endereço (:544-579). tryPollIp instancia um NvHTTP novo (:552) e chama http.getComputerDetails(isLikelyOnline).
5) SERVERINFO: NvHTTP.getComputerDetails(boolean) → getServerInfo(likelyOnline) (NvHTTP.java:342-391). Se há serverCert pinado, tenta HTTPS via getHttpsUrl() (que, se httpsPort==0, faz PRIMEIRO um GET HTTP /serverinfo só para ler a tag HttpsPort, :194-202); em SSLHandshakeException com CertificateException converte para HostHttpResponseException(401) e cai de volta para HTTP (:359-379). Cada requisição passa por openHttpConnection (:488-514), que monta a URL com getCompleteUrl (path + query + devicename=Build.MODEL + uniqueid + uuid aleatório, :474-482) e por performAndroidTlsHack (:462-472), que cria um SSLContext e um OkHttpClient NOVOS a cada chamada.
6) PARSE: getComputerDetails(String) (:401-450) extrai hostname, uniqueid (obrigatório), Permission, HttpsPort, mac, LocalIP, ExternalPort/ExternalIP, VirtualDisplayCapable, VirtualDisplayDriverReady, ServerCommand[], PairStatus, currentgame, currentgameuuid, state (MJOLNIR → nvidiaServer) e marca state=ONLINE. verifyResponseStatus (:324-340) valida o atributo status_code da tag <root>.
7) MERGE/PERSIST: runPoll faz dbManager.getComputerByUUID, ComputerDetails.update() (ComputerDetails.java:123-168) mescla campos e dbManager.updateComputer grava; se o PC é novo e o activeAddress é site-local, chama populateExternalAddress (STUN) (:143-149). Depois listener.notifyComputerUpdated(details) → PcView.updateComputer → PcGridAdapter.
8) PAREAMENTO: PcView.doPair (:470-582) para o polling, cria NvHTTP com activeAddress, checa getPairState() e chama PairingManager.pair(serverInfo, pin, passphrase). O handshake usa NvHTTP.executePairingCommand (POST/GET em HTTP plano, baseUrlHttp, :799-802) para as 4 fases (getservercert → clientchallenge → serverchallengeresp → clientpairingsecret) e NvHTTP.executePairingChallenge sobre HTTPS (:804-807). Sucesso → managerBinder.getComputer(uuid).serverCert = pm.getPairedCert() e invalidateStateForComputer (PcView.java:539-543).
9) APPLIST: AppView cria um ApplistPoller (ComputerManagerService.java:799-945) que a cada 30 s (ou 2 s enquanto falha) faz http.getAppListRaw() sobre HTTPS segurando o networkLock do PollingTuple (:874-885), parseia com getAppListByReader (NvHTTP.java:717-781) e cacheia em disco via CacheHelper.
10) LAUNCH: ServerHelper.createStartIntent (ServerHelper.java:93-138) empacota host/porta/httpsPort/uniqueId/cert DER/serverCommands/vDisplay em Intent extras → Game.onCreate lê tudo (Game.java:564-589) e monta seu próprio NvHTTP (:585). NvConnection.start() (NvConnection.java:388-482) chama startApp() (:225-351): serverinfo → checagem de PairState → negociação de HDR/resolução → detectServerConnectionType() (:130-223, inspeciona LinkProperties/RouteInfo/NAT64 e faz um TCP connect de teste em resolveServerAddress(), :107-128) → h.launchApp() (NvHTTP.java:849-903) com rikey/rikeyid AES-128 gerados por conexão, virtualDisplay, sops, gcmap etc. Retry até 5x com sleep de 2 s (NvConnection.java:399-440). Em seguida MoonBridge.setupBridge + MoonBridge.startConnection entram no plano nativo.
11) TEXTO/TECLADO: Game.handleKeyMultiple/onKeyDown chamam conn.sendUtf8Text (Game.java:2095,2206) e o InputConnection do ExternalControllerView (ExternalControllerView.java:59-85) chama handleCommitText → enqueueCommitText (Game.java:4314-4334), que fatia em blocos de 512 bytes UTF-8 respeitando fronteiras de code point e drena a fila com 15 ms entre blocos (Game.java:312-331). Cada bloco desce por MoonBridge.sendUtf8Text (simplejni.c:127-132) → LiSendUtf8TextEvent (InputStream.c:1005) que enfileira UM pacote com a string inteira; mas a thread de envio (InputStream.c:591-651) faz flushInputOnControlStream(), espera isControlDataInTransit() virar false, dorme 50 ms e então envia UM PACOTE ENet confiável POR CODE POINT no canal CTRL_CHANNEL_UTF8.
12) CLIPBOARD (caminho alternativo de texto inteiro): Game.sendClipboard (Game.java:2304-2337) → NvHTTP.sendClipboard (NvHTTP.java:929-937) POST HTTPS /actions/clipboard?type=text com o texto inteiro no corpo; Game.getClipboard (Game.java:2339-2389) → NvHTTP.getClipboard (:922-926) GET do mesmo endpoint. Disparados por foco (handleFocusChange, Game.java:2233-2243, pref smartClipboardSync) e pelo GameMenu (GameMenu.java:295-300).
13) WOL: PcView.doWakeOnLan (:629-660) → WakeOnLanSender.sendWolPacket (WakeOnLanSender.java:61-111), UDP para 255.255.255.255 e para cada endereço resolvido, nas portas 9, 47009 e 47998/47999/48000/48002/48010 deslocadas pelo offset da porta HTTP.

## Interfaces externas

- OkHttp3 (okhttp3.OkHttpClient/HttpUrl/Request/RequestBody/Response/ConnectionPool) — único cliente HTTP, configurado em NvHTTP.initializeHttpState (NvHTTP.java:177-191) com Proxy.NO_PROXY e ConnectionPool(0,1,MILLISECONDS)
- javax.net.ssl (SSLContext "TLS", X509KeyManager, X509TrustManager, HostnameVerifier, HttpsURLConnection.getDefaultHostnameVerifier) — mTLS + pinning em NvHTTP.java:114-192, 462-472
- BouncyCastle (org.bouncycastle.jce.provider.BouncyCastleProvider, X509v3CertificateBuilder, JcaPEMWriter, JcaContentSignerBuilder SHA256withRSA) — geração do par cliente em AndroidCryptoProvider.java:114-189
- BouncyCastle lightweight crypto (AESLightEngine, KeyParameter, BlockCipher) — AES-ECB do pareamento em PairingManager.java:139-163
- org.xmlpull.v1 (XmlPullParser/XmlPullParserFactory) — parse de todo XML GameStream em NvHTTP.java:241-322, 717-781
- jmDNS (javax.jmdns.JmmDNS, ServiceInfo, ServiceListener, NetworkTopologyDiscoveryImpl) — descoberta mDNS em Android < 14 (JmDNSDiscoveryAgent.java)
- android.net.nsd.NsdManager (+ ServiceInfoCallback, API 34) — descoberta mDNS em Android >= 14 (NsdManagerDiscoveryAgent.java)
- android.net.wifi.WifiManager.MulticastLock — necessário para receber tráfego mDNS (JmDNSDiscoveryAgent.java:145-148, 174)
- android.net.ConnectivityManager + NetworkCapabilities + LinkProperties + RouteInfo + IpPrefix (NAT64) — classificação local/remoto e bind de processo a rede (NvConnection.java:130-223; ComputerManagerService.java:333-392, 742-773; NetHelper.java:11-30)
- android.database.sqlite.SQLiteDatabase — banco computers4.db (ComputerDatabaseManager.java:46-67)
- java.net.DatagramSocket/DatagramPacket — magic packet WOL (WakeOnLanSender.java:66-104)
- JNI MoonBridge → libmoonlight-core (app/src/main/jni/moonlight-core/simplejni.c) → moonlight-common-c fork de ClassicOldSong (.gitmodules)
- ENet (submódulo de moonlight-common-c) — control stream multicanal; canais definidos em Limelight-internal.h:57-67 (GENERIC/URGENT/KEYBOARD/MOUSE/PEN/TOUCH/UTF8/SERVERCTL/GAMEPAD_BASE/SENSOR_BASE)
- STUN — LiFindExternalAddressIP4 contra stun.moonlight-stream.org:3478 (ComputerManagerService.java:370; NvConnection.java:625-627; simplejni.c:247-260)
- Teste de conectividade de portas — MoonBridge.testClientConnectivity contra android.conntest.moonlight-stream.org:443 (ServerHelper.java:36,166; AddComputerManually.java:169-170)
- Protocolo GameStream HTTP: /serverinfo, /pair, /unpair, /applist, /appasset, /launch, /resume, /cancel, /actions/clipboard (extensão Apollo)
- Serviço mDNS _nvstream._tcp (JmDNSDiscoveryAgent.java:23, NsdManagerDiscoveryAgent.java:22)
- Deep link URI scheme "art" para adicionar+parear PC (AndroidManifest.xml:186-191, AddComputerManually.java:205-216)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🟠 alto | bug | STUN de descoberta de endereço externo só executa quando o usuário está em VPN | `app/src/main/java/com/limelight/computers/ComputerManagerService.java:333-392` |
| 🟠 alto | performance | Eventos UTF-8 são fragmentados em um pacote ENet por code point, com 50 ms de latência inicial | `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:591-651` |
| 🟠 alto | bug | Pacotes de controle 0x3001 (Set Clipboard) e 0x3002 (File transfer nonce) do Apollo são declarados mas não tratados, disparando LC_ASSERT(false) | `app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c:1021-1095` |
| 🟡 médio | bug | getClipboard() não valida a resposta do host e grava o corpo de erro no clipboard do Android | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:922-926` |
| 🟡 médio | performance | Um SSLContext e um OkHttpClient novos são criados a cada requisição HTTP | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:462-472` |
| 🟡 médio | performance | Cada ciclo de poll cria e destrói 4 threads por PC | `app/src/main/java/com/limelight/computers/ComputerManagerService.java:601-625` |
| 🟡 médio | bug | ComputerDetails.update() muta o campo port de um AddressTuple já usado como chave de HashSet | `app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java:138-143` |
| 🟡 médio | compatibility | Hash da passphrase OTP usa o charset padrão da plataforma | `app/src/main/java/com/limelight/nvstream/http/PairingManager.java:216` |
| 🟡 médio | security | Passphrase OTP protegida apenas por um hash sem stretching, enviada em HTTP puro | `app/src/main/java/com/limelight/nvstream/http/PairingManager.java:209-231` |
| 🟡 médio | maintainability | Detecção de capacidades do host (Apollo vs Sunshine vs GFE) é implícita e espalhada, sem modelo único | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:401-450` |
| ⚪ baixo | security | Builds de debug logam a URL completa das requisições de pareamento, incluindo certificado, desafios e segredo do cliente | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:530-539` |
| ⚪ baixo | bug | MAC address de WOL só aceita separador ':' e falha silenciosamente gerando payload inválido | `app/src/main/java/com/limelight/nvstream/wol/WakeOnLanSender.java:113-129` |
| ⚪ baixo | bug | WOL não envia broadcast dirigido à sub-rede, apenas 255.255.255.255 | `app/src/main/java/com/limelight/nvstream/wol/WakeOnLanSender.java:79` |
| ⚪ baixo | bug | case OPEN_MANAGEMENT_PAGE_ID sem return, cai no default | `app/src/main/java/com/limelight/PcView.java:811-820` |
| ⚪ baixo | bug | URL da página de gerenciamento mistura endereço ativo com porta externa | `app/src/main/java/com/limelight/PcView.java:928-931` |
| ⚪ baixo | tech-debt | Camada nvstream.http, que deveria ser platform-agnostic, depende de Android | `app/src/main/java/com/limelight/nvstream/http/PairingManager.java:3` |
| ⚪ baixo | maintainability | NsdManagerDiscoveryAgent.startDiscovery ignora o parâmetro de intervalo | `app/src/main/java/com/limelight/nvstream/mdns/NsdManagerDiscoveryAgent.java:156-165` |
| ⚪ baixo | bug | HashSet de computers do mDNS nunca sofre evicção e acumula entradas obsoletas | `app/src/main/java/com/limelight/nvstream/mdns/MdnsDiscoveryAgent.java:14-53` |
| ⚪ baixo | security | uniqueId do cliente é gerado com java.util.Random em vez de SecureRandom | `app/src/main/java/com/limelight/computers/IdentityManager.java:58` |
| ⚪ baixo | ux | Estado de pareamento, httpsPort e capacidades não são persistidos, forçando um round-trip antes de qualquer decisão de UI | `app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java:110-139` |

### Detalhe

#### 🟠 alto STUN de descoberta de endereço externo só executa quando o usuário está em VPN

**Local:** `app/src/main/java/com/limelight/computers/ComputerManagerService.java:333-392` · **Categoria:** bug

Todo o corpo de populateExternalAddress() está aninhado dentro de `if (activeNetworkIsVpn)` (abre em :340, fecha em :391). A requisição STUN em :369-376 é guardada por `if (!activeNetworkIsVpn || boundToNetwork)` — condição escrita para ser avaliada FORA do if externo (o comentário em :368 diz literalmente 'Perform the STUN request if we're not on a VPN or if we bound to a network'). Dentro do bloco, `!activeNetworkIsVpn` é sempre false, então em Wi-Fi/Ethernet normal (o caso comum) a função é um no-op e `details.remoteAddress` nunca é populado por STUN.

**Correção sugerida:** Desaninhar: manter apenas o bloco de bind de rede (:347-366) dentro de `if (activeNetworkIsVpn)`, e mover a requisição STUN (:368-376), o unbind (:378-385) e o unlock (:387-390) para o escopo do método, como no upstream do moonlight-android. Adicionar um log em ambos os ramos para verificar em campo.

#### 🟠 alto Eventos UTF-8 são fragmentados em um pacote ENet por code point, com 50 ms de latência inicial

**Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/InputStream.c:591-651` · **Categoria:** performance

LiSendUtf8TextEvent (:1005) enfileira a string inteira num único PACKET_HOLDER, mas a thread de envio detecta o magic UTF8_TEXT_EVENT_MAGIC e, antes de enviar, chama flushInputOnControlStream(), faz busy-wait de 10 ms enquanto isControlDataInTransit() e dorme PltSleepMs(50) fixos; depois envia um pacote confiável separado para CADA code point (:610-648). Um texto de 60 caracteres custa ~50 ms de setup + 60 round-trips ENet confiáveis. Isso é o motivo direto de a digitação por teclado virtual/swipe parecer lenta e é o obstáculo técnico do requisito 'enviar o texto inteiro de uma vez'. A camada Java já tenta mitigar fatiando em blocos de 512 bytes com 15 ms de intervalo (Game.java:312-331, 4314-4334), mas isso só multiplica o número de janelas de 50 ms.

**Correção sugerida:** No fork de moonlight-common-c, empacotar múltiplos code points por pacote respeitando UTF8_TEXT_EVENT_MAX_COUNT (Input.h:33, hoje 32 bytes) e a fronteira de code point, aplicando o comportamento antigo (1 code point por pacote) apenas quando !IS_SUNSHINE() (Limelight-internal.h:86) — o hack de sincronização foi escrito explicitamente para o GFE. Adicionalmente, aplicar o sleep de 50 ms uma vez por rajada e não por chamada, e aumentar UTF8_TEXT_EVENT_MAX_COUNT para hosts Apollo se o parser do host suportar.

#### 🟠 alto Pacotes de controle 0x3001 (Set Clipboard) e 0x3002 (File transfer nonce) do Apollo são declarados mas não tratados, disparando LC_ASSERT(false)

**Local:** `app/src/main/jni/moonlight-core/moonlight-common-c/src/ControlStream.c:1021-1095` · **Categoria:** bug

needsAsyncCallback() retorna true para packetTypes[IDX_SET_CLIPBOARD] e packetTypes[IDX_FILE_TRANSFER_NONCE_REQUEST] (:1027-1028), que na tabela Gen7Enc valem 0x3001 e 0x3002 (extensões Apollo, :234-236). Porém a cadeia if/else de queueAsyncCallback() (:1046-1089) não tem ramo para nenhum dos dois, caindo no `else { LC_ASSERT(false); free(queuedCb); return; }` (:1090-1095). Em build de debug isso aborta; em release o pacote é silenciosamente descartado. Ou seja, se o host Apollo/Vibeshine empurrar o clipboard pelo control stream, o cliente ignora — e o app é forçado a fazer polling HTTP de /actions/clipboard.

**Correção sugerida:** Implementar os ramos faltantes em queueAsyncCallback() e as callbacks correspondentes em CONNECTION_LISTENER_CALLBACKS, expondo-as ao Java via MoonBridge (ex.: `bridgeClipboardReceived(String)`), e então remover a necessidade do getClipboard() por foco em Game.java:2233-2243. Se não for implementar agora, remover os dois tipos de needsAsyncCallback() para não disparar o assert.

#### 🟡 médio getClipboard() não valida a resposta do host e grava o corpo de erro no clipboard do Android

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:922-926` · **Categoria:** bug

sendClipboard() tem um guard heurístico ('For handling the 200ed 404 from Sunshine', :931-936) que devolve false quando a resposta não é vazia. getClipboard() não tem guard equivalente: devolve a string bruta, e Game.getClipboard (Game.java:2360-2374) faz `ClipData.newPlainText(CLIPBOARD_IDENTIFIER, clipboardContent)` e `setPrimaryClip` incondicionalmente. Num host Sunshine vanilla (sem o endpoint) ou num Apollo que negue a permissão clipboard_read (bit 0x00020000, ComputerDetails.java:215), o conteúdo de uma página de erro HTML/XML sobrescreve silenciosamente a área de transferência do usuário — e isso acontece automaticamente a cada perda de foco quando smartClipboardSync está ligado.

**Correção sugerida:** Validar a resposta antes de aplicar: rejeitar se começar com '<' (XML/HTML de erro), se contiver o padrão de erro do Sunshine, ou preferencialmente gatear a chamada por uma capacidade detectada uma única vez no serverinfo (ver ideia 'HostCapabilities'). Também checar `details.permission & 0x00020000` antes de chamar.

#### 🟡 médio Um SSLContext e um OkHttpClient novos são criados a cada requisição HTTP

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:462-472` · **Categoria:** performance

performAndroidTlsHack() faz `SSLContext.getInstance("TLS")` + `sc.init(...)` + `client.newBuilder().sslSocketFactory(...).build()` e é chamado dentro de openHttpConnection() em :495, ou seja, uma vez por requisição. Combinado com o ConnectionPool(0, 1, MILLISECONDS) em :178 (que efetivamente desliga reuso de conexão) e com o polling de 1500 ms × até 4 endereços × N PCs (ComputerManagerService.java:46, 627-639), o app faz dezenas de handshakes TLS completos por minuto em idle, cada um com inicialização de contexto SSL. Impacto direto em bateria e em CPU de dispositivos fracos (TV boxes).

**Correção sugerida:** Construir o SSLContext/SSLSocketFactory uma vez em initializeHttpState() (o keyManager e o trustManager já são estáveis por instância de NvHTTP) e aplicá-lo aos três OkHttpClient no builder. Se o 'hack' realmente precisar ser por socket, usar um SSLSocketFactory customizado em vez de recriar o cliente inteiro. Avaliar também aumentar o ConnectionPool para permitir keep-alive.

#### 🟡 médio Cada ciclo de poll cria e destrói 4 threads por PC

**Local:** `app/src/main/java/com/limelight/computers/ComputerManagerService.java:601-625` · **Categoria:** performance

startParallelPollThread() instancia um `new Thread()` por endereço candidato (local, manual, remoto, IPv6) em parallelPollPc (:627-639), e isso se repete a cada SERVERINFO_POLLING_PERIOD_MS = 1500 ms (:46) por PC pareado. Com 3 PCs salvos são até 12 criações de thread a cada 1,5 s (~480/minuto). Além disso as threads perdedoras são interrompidas (:689-696) mas podem ficar bloqueadas em I/O de rede até o timeout de 3-5 s, acumulando threads em voo.

**Correção sugerida:** Substituir por um ThreadPoolExecutor compartilhado (ou CompletionService) dimensionado por número de PCs, reutilizando as threads; e/ou lembrar o endereço vencedor e sondar apenas ele enquanto o PC estiver ONLINE, revalidando os demais só quando falhar ou quando a rede mudar (o NetworkCallback em :742-773 já dá o gatilho).

#### 🟡 médio ComputerDetails.update() muta o campo port de um AddressTuple já usado como chave de HashSet

**Local:** `app/src/main/java/com/limelight/nvstream/http/ComputerDetails.java:138-143` · **Categoria:** bug

`this.remoteAddress.port = details.externalPort;` altera in-place um AddressTuple cujo hashCode()/equals() dependem de `port` (ComputerDetails.java:36-49). O mesmo objeto é inserido no HashSet `uniqueAddresses` do algoritmo de deduplicação de poll (ComputerManagerService.java:604, 635) e é compartilhado entre o objeto do banco e o objeto exibido na UI. Mutar o port depois da inserção quebra o contrato de HashSet (o elemento fica irrecuperável) e pode fazer a deduplicação sondar o mesmo endereço duas vezes ou pular um endereço válido.

**Correção sugerida:** Tornar AddressTuple imutável (campos final) e substituir a mutação por `this.remoteAddress = new ComputerDetails.AddressTuple(this.remoteAddress.address, details.externalPort);`.

#### 🟡 médio Hash da passphrase OTP usa o charset padrão da plataforma

**Local:** `app/src/main/java/com/limelight/nvstream/http/PairingManager.java:216` · **Categoria:** compatibility

`byte[] hash = digest.digest(plainText.getBytes());` — sem charset explícito, ao contrário de saltPin() (:100) que usa "UTF-8". O host Apollo calcula o mesmo SHA-256 sobre bytes UTF-8. Em qualquer dispositivo/locale cujo default charset não seja UTF-8, uma passphrase com caracteres não-ASCII (acentos, CJK) produz um hash diferente e o pareamento OTP falha de forma inexplicável para o usuário.

**Correção sugerida:** `plainText.getBytes(StandardCharsets.UTF_8)`. Vale também revisar saltPin() (:97-102), que dimensiona o array com `pin.length()` (contagem de chars) mas copia `pin.getBytes("UTF-8")` — correto só enquanto o PIN for ASCII.

#### 🟡 médio Passphrase OTP protegida apenas por um hash sem stretching, enviada em HTTP puro

**Local:** `app/src/main/java/com/limelight/nvstream/http/PairingManager.java:209-231` · **Categoria:** security

O parâmetro `otpauth` = SHA-256(pin + saltHex + passphrase) é anexado à query da fase 'getservercert' do pareamento, que trafega via NvHTTP.executePairingCommand() sobre `baseUrlHttp` — HTTP em texto claro na porta 47989 (NvHTTP.java:799-802). Salt e PIN também vão em claro na mesma URL. Um observador passivo na LAN captura salt, PIN e o hash, e pode montar um ataque de dicionário offline contra a passphrase (SHA-256 simples, sem KDF/iterações). A UI exige apenas 4 caracteres de passphrase (PcView.java:620).

**Correção sugerida:** Documentar explicitamente a limitação (é imposta pelo protocolo do host — mudar exige mudança no Apollo). No cliente, no mínimo elevar o mínimo da passphrase e exibir aviso quando o pareamento OTP for feito fora de uma rede confiável. A longo prazo, propor ao upstream do Apollo um KDF (PBKDF2/Argon2) para o campo otpauth.

#### 🟡 médio Detecção de capacidades do host (Apollo vs Sunshine vs GFE) é implícita e espalhada, sem modelo único

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:401-450` · **Categoria:** maintainability

A identidade e as capacidades do host são inferidas em pontos distintos e por heurísticas frágeis: `state` contendo 'MJOLNIR' → nvidiaServer (:444); ausência da tag `ExternalPort` → 'expected on non-Sunshine servers' (:664-676); presença de `VirtualDisplayCapable`/`ServerCommand`/`Permission` → Apollo (:412-437, 550-570); no nativo, IS_SUNSHINE() = AppVersionQuad[3] < 0 (Limelight-internal.h:86); e para clipboard não há detecção nenhuma — tenta-se o endpoint e interpreta-se resposta vazia como sucesso (:929-936). Não existe um `boolean isApollo` nem um objeto de capacidades. Qualquer feature nova dependente do Apollo (injeção de texto, clipboard bidirecional, file transfer) precisa reinventar a detecção.

**Correção sugerida:** Introduzir uma classe HostCapabilities preenchida uma única vez em getComputerDetails(String) a partir do serverinfo (flags: isNvidia, isSunshine, isApollo, supportsClipboardSet/Read, supportsServerCmd, supportsVirtualDisplay, permissionMask), guardá-la em ComputerDetails, propagá-la nos Intent extras de ServerHelper.createStartIntent (ServerHelper.java:93-138) e consumi-la em Game/GameMenu em vez de tentar-e-torcer.

#### ⚪ baixo Builds de debug logam a URL completa das requisições de pareamento, incluindo certificado, desafios e segredo do cliente

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:530-539` · **Categoria:** security

`verbose = BuildConfig.DEBUG` (:76) e openHttpConnectionToString() loga `getCompleteUrl(...)+" -> "+respString` para qualquer path diferente de 'serverinfo'. Como o pareamento passa todos os segredos na query string (clientcert, clientchallenge, serverchallengeresp, clientpairingsecret, otpauth — PairingManager.java:209-302), o logcat de um build de debug contém o material completo do handshake, além do conteúdo do clipboard sincronizado (path 'actions/clipboard').

**Correção sugerida:** Excluir 'pair' e 'actions/clipboard' do log verboso, ou redigir os valores dos parâmetros sensíveis antes de logar (manter só o nome do parâmetro e o tamanho).

#### ⚪ baixo MAC address de WOL só aceita separador ':' e falha silenciosamente gerando payload inválido

**Local:** `app/src/main/java/com/limelight/nvstream/wol/WakeOnLanSender.java:113-129` · **Categoria:** bug

macStringToBytes() usa `new Scanner(macAddress).useDelimiter(":")`. MACs no formato '00-11-22-33-44-55' (comum em relatórios do Windows) ou sem separadores produzem NumberFormatException, o loop faz `break` (:123) e o array parcialmente zerado é usado mesmo assim em createWolPayload() (:133). O usuário recebe o toast de sucesso ('wol_waking_msg', PcView.java:646) enquanto um magic packet inválido foi transmitido.

**Correção sugerida:** Normalizar o input (remover ':', '-', '.', espaços) e parsear 12 dígitos hex; validar que 6 bytes foram lidos e lançar/propagar erro para PcView exibir a mensagem correta. O campo vem do XML do host (`mac`, NvHTTP.java:423), então também aceitar variações que Apollo/Sunshine possam emitir.

#### ⚪ baixo WOL não envia broadcast dirigido à sub-rede, apenas 255.255.255.255

**Local:** `app/src/main/java/com/limelight/nvstream/wol/WakeOnLanSender.java:79` · **Categoria:** bug

O único broadcast usado é o limited broadcast 255.255.255.255, que muitos roteadores e APs Wi-Fi não encaminham para clientes cabeados/dormindo, além de ser bloqueado por isolamento de cliente. Os demais envios vão para os endereços unicast resolvidos, que dependem de uma entrada ARP válida — exatamente o que costuma estar ausente com a máquina dormindo (o comentário em :68-69 reconhece o problema).

**Correção sugerida:** Calcular o broadcast dirigido a partir de NetworkInterface.getInterfaceAddresses()/InterfaceAddress.getBroadcast() para cada interface ativa e adicionar esses destinos à lista, além do 255.255.255.255.

#### ⚪ baixo case OPEN_MANAGEMENT_PAGE_ID sem return, cai no default

**Local:** `app/src/main/java/com/limelight/PcView.java:811-820` · **Categoria:** bug

O bloco do case OPEN_MANAGEMENT_PAGE_ID (:811-817) não termina com `return true;` nem `break;`, então o fluxo cai em `default: return super.onContextItemSelected(item);` (:819-820). Na prática a página abre e em seguida a superclasse recebe o item já tratado — comportamento indefinido dependendo da implementação da Activity base, e o compilador não avisa porque fall-through é legal.

**Correção sugerida:** Adicionar `return true;` ao final do case.

#### ⚪ baixo URL da página de gerenciamento mistura endereço ativo com porta externa

**Local:** `app/src/main/java/com/limelight/PcView.java:928-931` · **Categoria:** bug

`guessManagementUrl()` monta `https://<activeAddress.address>:<guessExternalPort()+1>`. guessExternalPort() (ComputerDetails.java:102-121) prioriza `externalPort`/`remoteAddress.port`, que refletem o mapeamento WAN. Quando o host está sendo acessado localmente mas tem ExternalPort diferente do HTTP local (cenário comum de port forwarding), o link gerado aponta para IP local + porta WAN+1 e não abre. A heurística '+1' também é uma suposição sobre o layout de portas do Sunshine/Apollo, não algo lido do serverinfo.

**Correção sugerida:** Usar `activeAddress.port + 1` quando activeAddress for local, e externalPort+1 apenas quando o activeAddress for o remoteAddress. Idealmente ler a porta da UI web do serverinfo se Apollo expuser uma tag para isso.

#### ⚪ baixo Camada nvstream.http, que deveria ser platform-agnostic, depende de Android

**Local:** `app/src/main/java/com/limelight/nvstream/http/PairingManager.java:3` · **Categoria:** tech-debt

PairingManager importa `android.widget.Toast` (import morto, não usado em nenhum ponto do arquivo). NvHTTP importa `com.limelight.BuildConfig` (:47) e `com.limelight.utils.DeviceUtils` (:52). O pacote nvstream foi desenhado no upstream como núcleo portável (existe LimelightCryptoProvider justamente para abstrair a plataforma); essas dependências impedem reuso/teste unitário fora do Android e dificultam extrair a camada de protocolo para testes headless.

**Correção sugerida:** Remover o import morto de Toast; injetar o nome do dispositivo e a flag de verbosidade pelo construtor de NvHTTP (ou por um setter estático) em vez de referenciar BuildConfig/DeviceUtils diretamente.

#### ⚪ baixo NsdManagerDiscoveryAgent.startDiscovery ignora o parâmetro de intervalo

**Local:** `app/src/main/java/com/limelight/nvstream/mdns/NsdManagerDiscoveryAgent.java:156-165` · **Categoria:** maintainability

A assinatura da abstração é `startDiscovery(int discoveryIntervalMs)` (MdnsDiscoveryAgent.java:20) e o ComputerManagerService passa MDNS_QUERY_PERIOD_MS = 1000 (:49, :205), mas a implementação NsdManager descarta o argumento — NsdManager gerencia o re-query internamente. O contrato da API mente sobre o comportamento em Android 14+, o que já causa confusão ao depurar diferenças de latência de descoberta entre versões de Android.

**Correção sugerida:** Documentar no javadoc de MdnsDiscoveryAgent.startDiscovery que o intervalo é uma dica ignorada por implementações que delegam ao SO, ou remover o parâmetro e movê-lo para o construtor do JmDNSDiscoveryAgent.

#### ⚪ baixo HashSet de computers do mDNS nunca sofre evicção e acumula entradas obsoletas

**Local:** `app/src/main/java/com/limelight/nvstream/mdns/MdnsDiscoveryAgent.java:14-53` · **Categoria:** bug

`computers` é um HashSet que só cresce (:34, :47). MdnsComputer.equals() compara nome + porta + endereço local + endereço IPv6 (MdnsComputer.java:41-65), mas hashCode() é só `name.hashCode()` (:37). Quando o host troca de IP (renovação DHCP, troca de Wi-Fi para Ethernet), o novo MdnsComputer é considerado diferente, é adicionado e notifyComputerAdded dispara de novo — o antigo permanece para sempre no set, e serviceRemoved (JmDNSDiscoveryAgent.java:260-263) só loga sem remover nada. Com o tempo o set fica com N entradas por host e o pipeline de addComputerBlocking é reexecutado desnecessariamente.

**Correção sugerida:** Chavear o set por nome de serviço (Map<String, MdnsComputer>) substituindo a entrada quando o endereço mudar, e remover a entrada em serviceRemoved/onServiceLost. Alternativamente limpar o set em stopDiscovery().

#### ⚪ baixo uniqueId do cliente é gerado com java.util.Random em vez de SecureRandom

**Local:** `app/src/main/java/com/limelight/computers/IdentityManager.java:58` · **Categoria:** security

`String.format("%016x", new Random().nextLong())` usa um PRNG não criptográfico semeado pelo relógio. Esse uniqueId é enviado em toda requisição HTTP (NvHTTP.java:480) e é o identificador que o host usa para correlacionar o cliente (inclusive nas permissões por cliente do Apollo). Não é material secreto no protocolo atual, mas é previsível e colidível.

**Correção sugerida:** Trocar por `new SecureRandom().nextLong()`. Migração transparente: só afeta instalações novas.

#### ⚪ baixo Estado de pareamento, httpsPort e capacidades não são persistidos, forçando um round-trip antes de qualquer decisão de UI

**Local:** `app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java:110-139` · **Categoria:** ux

updateComputer() grava apenas UUID, nome, JSON de endereços, MAC e cert; getComputerFromCursor() (:141-181) devolve `state = UNKNOWN` explicitamente (:178). Logo, ao abrir o app, o menu de contexto e o grid não sabem se o PC está pareado, qual a httpsPort, se suporta display virtual ou quais serverCommands existem até o primeiro poll bem-sucedido (que pode levar 3-5 s por causa dos timeouts em NvHTTP.java:71-72). Isso também obriga getHttpsUrl() a fazer um GET HTTP extra só para descobrir a porta HTTPS (NvHTTP.java:194-202).

**Correção sugerida:** Adicionar colunas (ou um blob JSON de 'lastKnownCapabilities') para httpsPort, permission, vDisplaySupported/DriverReady e serverCommands, marcadas como cache com timestamp; usá-las para pré-preencher a UI em estado 'stale' e para evitar o GET HTTP extra de descoberta de porta.


## Ideias de melhoria

### Corrigir o aninhamento do STUN em populateExternalAddress

**Tamanho:** quick-win

**Por quê:** Bug de uma linha de indentação que desativa completamente a descoberta de endereço externo fora de VPN, quebrando o acesso remoto automático para todo mundo que parear na LAN.

**Como:** Em ComputerManagerService.java:333-392, fechar o `if (activeNetworkIsVpn)` logo após o loop de bind de rede (:366) e deixar o bloco STUN (:368-376), o unbind (:378-385) e o unlock (:387-390) no escopo do método. Adicionar LimeLog.info com o endereço resolvido para verificação em campo.

**Risco:** Muito baixo. Passa a haver uma requisição STUN por PC novo detectado via mDNS (ComputerManagerService.java:407-409), como o upstream sempre pretendeu — verificar que não há regressão de latência no primeiro contato.

### Validar a resposta de /actions/clipboard antes de escrever no clipboard do Android

**Tamanho:** quick-win

**Por quê:** Evita que uma página de erro do host sobrescreva silenciosamente a área de transferência do usuário a cada perda de foco quando smartClipboardSync está ligado.

**Como:** Em NvHTTP.getClipboard() (NvHTTP.java:922-926) devolver null quando a resposta estiver vazia ou começar com '<'; em Game.getClipboard() (Game.java:2360-2374) só chamar setPrimaryClip quando o conteúdo for não-nulo. Gatear a chamada por `details.permission & 0x00020000` (clipboard_read) quando o campo Permission estiver presente.

**Risco:** Baixo. Um host que legitimamente tenha '<' no início do clipboard perderia a sincronização — usar uma heurística mais específica (detectar o corpo de erro exato do Sunshine) se isso incomodar.

### Tornar AddressTuple imutável

**Tamanho:** quick-win

**Por quê:** AddressTuple é usado como chave de HashSet na deduplicação de poll (ComputerManagerService.java:604,635) e ComputerDetails.update() muta o campo port in-place (ComputerDetails.java:142), quebrando o contrato de hashCode.

**Como:** Marcar `address` e `port` como final em ComputerDetails.AddressTuple (:16-17), remover a normalização mutante do construtor para uma variável local (:28-34) e trocar a atribuição em update() (:142) por criação de um novo tuple.

**Risco:** Baixo; o compilador aponta todos os pontos de mutação. Verificar LegacyDatabaseReader*/ComputerDatabaseManager para atribuições diretas.

### Endurecer o parsing de MAC e adicionar broadcast dirigido no Wake-on-LAN

**Tamanho:** small

**Por quê:** Duas falhas silenciosas que fazem o WOL 'dizer que funcionou' sem acordar a máquina — cenário frequente para quem usa host com display virtual e mantém o PC dormindo.

**Como:** Em WakeOnLanSender.macStringToBytes (:113-129) normalizar removendo ':', '-', '.', espaços e validar 12 dígitos hex, propagando erro em vez de fazer break silencioso. Em sendWolPacket (:61-111) enumerar NetworkInterface.getNetworkInterfaces()/InterfaceAddress.getBroadcast() e adicionar cada broadcast dirigido à lista de destinos, além de 255.255.255.255. Em PcView.doWakeOnLan (:629-660) só mostrar 'wol_waking_msg' quando pelo menos um pacote tiver sido enviado com MAC válido.

**Risco:** Baixo. getNetworkInterfaces() lança NPE em dispositivos Android quebrados — envolver em try/catch como já é feito em AddComputerManually.isWrongSubnetSiteLocalAddress (:95-100).

### Deduplicar entradas de mDNS por nome de serviço e evictar em serviceRemoved

**Tamanho:** small

**Por quê:** O HashSet de MdnsDiscoveryAgent só cresce e re-notifica a cada mudança de IP do host (MdnsDiscoveryAgent.java:14,31-52; JmDNSDiscoveryAgent.java:260-263 só loga).

**Como:** Trocar HashSet<MdnsComputer> por Map<String,MdnsComputer> chaveado pelo nome do serviço, substituindo a entrada quando o endereço mudar e notificando só nesse caso; implementar remoção real em JmDNSDiscoveryAgent.serviceRemoved (:260) e em NsdManagerDiscoveryAgent.onServiceLost (:131-147); limpar o mapa em stopDiscovery().

**Risco:** Baixo. Cuidado com hosts que legitimamente expõem múltiplos IPv4 (multi-homed) — o desenho atual cria um MdnsComputer por IPv4 de propósito (MdnsDiscoveryAgent.java:31-39); a chave precisa ser nome+IPv4 nesse caso, e só o conjunto por nome é evictado.

### Reaproveitar SSLContext/OkHttpClient e trocar as threads de poll por um pool

**Tamanho:** medium

**Por quê:** O polling em idle é o maior consumidor de CPU/bateria do app fora do stream: handshake TLS completo + criação de SSLContext por requisição (NvHTTP.java:462-472,495), pool de conexões desabilitado (:178) e 4 threads novas por PC a cada 1,5 s (ComputerManagerService.java:601-625,46).

**Como:** 1) Mover a criação do SSLContext/SSLSocketFactory para initializeHttpState() (NvHTTP.java:114-192) e aplicá-lo nos três clientes; medir se o 'SSLv3 fallback' citado no comentário (:463-464) ainda ocorre em minSdk atual. 2) Aumentar o ConnectionPool para permitir keep-alive entre polls consecutivos. 3) Substituir os `new Thread()` de startParallelPollThread por um ExecutorService compartilhado. 4) Sondar apenas o activeAddress enquanto o PC estiver ONLINE, revalidando os outros só em falha ou quando o NetworkCallback (:742-773) disparar.

**Risco:** O comentário em NvHTTP.java:462-464 sugere que o hack existe por um bug histórico de Android; remover sem testar em dispositivos antigos pode reintroduzir falhas de handshake. Fazer a mudança atrás de um flag e testar em Android 7-9. A otimização de 'sondar só o endereço ativo' atrasa a detecção de troca LAN↔WAN — mitigar com revalidação periódica a cada N ciclos.

### Persistir capacidades e httpsPort no banco para eliminar o round-trip HTTP de descoberta de porta

**Tamanho:** medium

**Por quê:** getHttpsUrl() faz um GET HTTP /serverinfo extra sempre que httpsPort==0 (NvHTTP.java:194-202), e tryPollIp passa 0 sempre que a porta do endereço não bate com a do activeAddress (ComputerManagerService.java:549-552). Além disso a UI abre sem saber pairState/capacidades porque getComputerFromCursor força state=UNKNOWN (ComputerDatabaseManager.java:178).

**Como:** Adicionar uma coluna JSON 'Capabilities' em computers4.db (ComputerDatabaseManager.java:62-67, com CREATE TABLE IF NOT EXISTS + ALTER TABLE tolerante) contendo httpsPort, permission, vDisplaySupported/DriverReady, serverCommands e um timestamp. Popular em updateComputer() (:110-139), ler em getComputerFromCursor() (:141-181) marcando como stale, e usar o httpsPort cacheado como palpite inicial em tryPollIp.

**Risco:** Migração de schema — versões antigas do app não entendem a coluna nova (aceitável, é aditivo). Cache stale pode apontar para uma porta HTTPS antiga; manter o fallback de redescoberta quando o handshake falhar.

### Consumir o pacote de controle 0x3001 (Set Clipboard) do Apollo e eliminar o polling HTTP de clipboard

**Tamanho:** large

**Por quê:** O tipo de pacote já existe na tabela Gen7Enc (ControlStream.c:234) e já é declarado como needsAsyncCallback (:1027), mas não há handler — cai no LC_ASSERT(false) (:1090-1095). Implementar fecha o loop de clipboard bidirecional em push, eliminando o getClipboard() disparado por foco (Game.java:2233-2243) que hoje pode sobrescrever o clipboard do usuário com corpo de erro.

**Como:** No submódulo: adicionar o ramo de IDX_SET_CLIPBOARD em queueAsyncCallback() (ControlStream.c:1046-1089), definir a callback em CONNECTION_LISTENER_CALLBACKS e expô-la em simplejni.c como um bridge para o Java (mesmo padrão de bridgeClRumble etc.). No Java, adicionar o callback em MoonBridge e encaminhar para Game, reutilizando a lógica de cloneClipData/CLIPBOARD_IDENTIFIER já existente (Game.java:2290-2302, 2361-2374). Manter o caminho HTTP como fallback para hosts sem a extensão.

**Risco:** Exige mudança em submódulo e no JNI, com risco de crash se o parsing do payload divergir do que o Apollo envia. Necessita host Apollo/Vibeshine para teste. Enquanto não for implementado, remover os dois tipos de needsAsyncCallback() para não deixar o LC_ASSERT armado.

### Extrair a camada de protocolo (nvstream.http) para testes headless

**Tamanho:** large

**Por quê:** Todo o protocolo GameStream — parsing de XML, pareamento, negociação de capacidades — está hoje acoplado ao Android (BuildConfig, DeviceUtils, import de Toast em PairingManager.java:3) e não tem nenhum teste. Qualquer mudança de protocolo para suportar novas features do Apollo é validada só manualmente contra um host real.

**Como:** Remover os imports Android de nvstream.http (injetar deviceName e verbose pelo construtor de NvHTTP, NvHTTP.java:204-239), criar um módulo de teste JVM com fixtures XML de serverinfo/applist para GFE, Sunshine vanilla e Apollo, e cobrir getComputerDetails (NvHTTP.java:401-450), getAppListByReader (:717-781), verifyResponseStatus (:324-340) e as fases de PairingManager.pair (:187-316) com um NvHTTP mockado.

**Risco:** Esforço alto e sem valor visível ao usuário no curto prazo; mas é pré-requisito para mexer com confiança no protocolo (EPICs de texto/clipboard). Fixtures precisam ser capturadas de hosts reais, incluindo Vibeshine.

### EPIC — Barra de texto estilo AnyDesk: enviar a string inteira via clipboard do Apollo + Ctrl+V

**Tamanho:** epic

**Por quê:** É o requisito (2) do dono do fork e a única primitiva JÁ existente com semântica 'texto inteiro de uma vez' é o endpoint HTTP /actions/clipboard do Apollo (NvHTTP.java:922-937), que faz um único POST text/plain. O caminho atual (sendUtf8Text) é fundamentalmente incremental: um pacote ENet por code point com 50 ms de setup (InputStream.c:591-651).

**Como:** 1) Criar um overlay de entrada de texto no Game (ao lado dos botões flutuantes já existentes em Game.java:300-310) com um EditText local — a digitação NÃO gera tráfego. 2) No 'Enviar', chamar NvHTTP.sendClipboard(texto) (NvHTTP.java:929) numa thread de I/O, esperar o retorno true, e então emitir Ctrl+V via Game.sendKeys/conn.sendKeyboardInput (Game.java:2210-2230 e NvConnection.java:537) usando os códigos do KeyboardTranslator. 3) Preservar e restaurar o clipboard anterior do host (getClipboard antes, sendClipboard depois) para não destruir o conteúdo do usuário. 4) Gatear pela capacidade do host: bit clipboard_set = 0x00010000 do campo Permission (ComputerDetails.java:190, 214) e pela heurística de resposta vazia já implementada em NvHTTP.java:931-936. 5) Fallback automático para conn.sendUtf8Text quando o host não suportar clipboard.

**Risco:** Depende de o app em foco no host aceitar Ctrl+V (não funciona em campos que bloqueiam colagem, nem em jogos com input raw). O restore do clipboard cria uma janela de corrida se o usuário copiar algo no host no meio. Requer permissão clipboard_set concedida no Apollo — precisa de mensagem de erro clara quando negada.

### EPIC — Empacotar múltiplos code points por pacote UTF-8 quando o host for Sunshine/Apollo

**Tamanho:** epic

**Por quê:** Ataca a causa raiz da lentidão de digitação sem depender do clipboard: hoje cada code point é um pacote ENet confiável separado, e o hack de flush + PltSleepMs(50) foi escrito explicitamente para contornar um bug do GFE (comentário em InputStream.c:601-606), não do Sunshine/Apollo.

**Como:** No submódulo app/src/main/jni/moonlight-core/moonlight-common-c: em InputStream.c:591-651, condicionar o caminho de fragmentação a !IS_SUNSHINE() (Limelight-internal.h:86). Para hosts Sunshine/Apollo, montar pacotes com o máximo de code points completos que caibam em UTF8_TEXT_EVENT_MAX_COUNT (Input.h:33, hoje 32 bytes) — mantendo a garantia de nunca cortar no meio de um code point — e aplicar o flush+sleep uma única vez por rajada em vez de por chamada de LiSendUtf8TextEvent. Validar contra o parser do host antes de aumentar UTF8_TEXT_EVENT_MAX_COUNT acima de 32. Depois, simplificar a fila de 512 bytes/15 ms do lado Java (Game.java:312-331, 4314-4334), que passa a ser redundante.

**Risco:** Mudança em submódulo compartilhado — precisa ser validada contra Sunshine vanilla, Apollo e Vibeshine. Se o parser do host assumir 1 code point por pacote, o texto chega corrompido. Requer teste com acentuação, emoji (4 bytes) e CJK. Mitigar com um preference de opt-in ('modo de texto rápido') durante a validação.

### EPIC — Modelo explícito de capacidades do host (HostCapabilities) e propagação até o Game

**Tamanho:** epic

**Por quê:** Hoje a distinção Apollo/Vibeshine vs Sunshine vanilla vs GFE está espalhada por heurísticas frágeis (NvHTTP.java:444 MJOLNIR, :664-676 ExternalPort, :550-570 VirtualDisplay*/ServerCommand, Limelight-internal.h:86 IS_SUNSHINE) e o clipboard sequer é detectado — é tentativa e erro (NvHTTP.java:931-936). Toda feature nova dependente do Apollo (injeção de texto, clipboard, file transfer, comandos de servidor) pagará esse custo de novo.

**Como:** Criar com.limelight.nvstream.http.HostCapabilities preenchida em NvHTTP.getComputerDetails(String) (NvHTTP.java:401-450) a partir do serverinfo: isNvidia (state contém MJOLNIR), isSunshineFamily (appversion quad[3] < 0, mesma regra do nativo), isApollo (presença de Permission/VirtualDisplayCapable/ServerCommand), permissionMask e flags derivadas (clipboardSet 0x10000, clipboardRead 0x20000, serverCmd 0x100000, conforme o comentário em ComputerDetails.java:173-204). Armazenar em ComputerDetails, persistir como cache no SQLite (ComputerDatabaseManager.java:110-139), propagar em ServerHelper.createStartIntent (ServerHelper.java:93-138) e consumir em GameMenu (GameMenu.java:288-305) para habilitar/desabilitar itens em vez de mostrar toasts de erro depois.

**Risco:** Mudança de schema do banco (precisa de migração ou de coluna nova tolerante a null). Requer alinhamento com o significado real dos bits de permissão do Apollo — o comentário em ComputerDetails.java:173-204 é a única fonte e pode envelhecer se o Apollo mudar o enum.


## Glossário

- GameStream/NVHTTP: protocolo HTTP+XML original da NVIDIA usado para descoberta, pareamento e launch. Endpoints: /serverinfo, /pair, /unpair, /applist, /appasset, /launch, /resume, /cancel. Implementado em NvHTTP.java.
- serverinfo: documento XML retornado por GET /serverinfo. Fonte única de verdade sobre o host: uniqueid, hostname, appversion (quad), PairStatus, HttpsPort, ExternalPort/ExternalIP, LocalIP, mac, state, currentgame/currentgameuuid, MaxLumaPixels*, ServerCodecModeSupport e (só no Apollo) Permission, VirtualDisplayCapable, VirtualDisplayDriverReady, ServerCommand. Parseado em NvHTTP.getComputerDetails (NvHTTP.java:401-450).
- AppVersionQuad: versão do host em 4 números (ex.: 7.1.431.0). Determina a geração do protocolo de control stream (ControlStream.c:331-360) e o algoritmo de hash do pareamento (PairingManager.java:190-199). O quarto elemento negativo é a marca de Sunshine/Apollo: IS_SUNSHINE() = AppVersionQuad[3] < 0 (Limelight-internal.h:86).
- Sunshine: host open-source compatível com GameStream. Adiciona ExternalPort, portas dinâmicas, buttonFlags2, teclado com flags e canais ENet extras.
- Apollo: fork do Sunshine mantido por ClassicOldSong; é o host-alvo do Artemis. Extensões visíveis no cliente: tags Permission/VirtualDisplayCapable/VirtualDisplayDriverReady/ServerCommand no serverinfo, pareamento OTP com passphrase (otpauth), endpoint /actions/clipboard, tipos de pacote de controle 0x3000-0x3002.
- Vibeshine: fork do Sunshine usado pelo dono do repositório, com display virtual automático. Do ponto de vista do cliente responde às mesmas extensões do Apollo (VirtualDisplayCapable/DriverReady).
- Pairing / PIN / salt: handshake de 5 fases em PairingManager.pair (:187-316). O cliente gera salt de 16 bytes, deriva AES-128 de hash(salt||PIN), e as partes trocam desafios cifrados; ao final o certificado do servidor fica pinado em ComputerDetails.serverCert.
- OTP pairing / passphrase: extensão Apollo. Além do PIN, envia otpauth = SHA-256(pin + saltHex + passphrase) na fase getservercert (PairingManager.java:212-227). UI em PcView.doOTPPair (:584-627); também acionável por deep link art://.
- Certificate pinning: após parear, o certificado X.509 do host é salvo no SQLite e usado como único trust anchor aceito (NvHTTP.trustManager :131-158 e o HostnameVerifier :160-175, que aceita qualquer hostname se o cert bater).
- uniqueId: identificador hex de 8 bytes do cliente, persistido no arquivo 'uniqueid' (IdentityManager.java:15-16) e enviado como query param em toda requisição (NvHTTP.java:480).
- rikey / rikeyid: chave AES-128 e id de 32 bits gerados por conexão (NvConnection.java:74-90) e passados na URL de /launch em hex (NvHTTP.java:884-885); usados para cifrar o control stream/input.
- AddressTuple: par (endereço, porta) com normalização de IPv6 entre colchetes (ComputerDetails.java:15-61). O ComputerDetails guarda quatro: localAddress, remoteAddress, manualAddress, ipv6Address.
- activeAddress: o AddressTuple que respondeu ao último poll bem-sucedido, definido em parallelPollPc (ComputerManagerService.java:649,661,673,685). É o endereço usado para tudo depois (launch, pairing, clipboard).
- PollingTuple: par (ComputerDetails, Thread de polling) mais um networkLock que serializa requisições HTTP ao mesmo host e um timestamp de último poll bem-sucedido (ComputerManagerService.java:948-959).
- parallelPollPc: estratégia de sondagem simultânea dos 4 endereços com escolha por ordem de precedência local > manual > remoto > IPv6 (ComputerManagerService.java:627-699).
- POLL_DATA_TTL_MS: 30 s — após esse tempo sem poll bem-sucedido, o estado do PC volta a UNKNOWN ao retomar o polling (ComputerManagerService.java:53, 209-213).
- mDNS / _nvstream._tcp: serviço DNS-SD anunciado pelo host. Descoberto por jmDNS (<Android 14) ou NsdManager (>=14) — DiscoveryService.java:58-71.
- MulticastLock: lock do WifiManager necessário para o Android entregar pacotes multicast ao app; sem ele o mDNS via jmDNS não funciona (JmDNSDiscoveryAgent.java:145-148,174).
- STUN: usado apenas para descobrir o IP WAN do próprio cliente (que na LAN é o mesmo do host) e preencher remoteAddress. Servidor: stun.moonlight-stream.org:3478 via LiFindExternalAddressIP4 (ComputerManagerService.java:370).
- Wake-on-LAN magic packet: 6 bytes 0xFF seguidos de 16 repetições do MAC (WakeOnLanSender.createWolPayload :131-148), enviado por UDP a portas 9, 47009 e às portas GFE 47998-48010 deslocadas pelo offset da porta HTTP base 47989 (:20-22, 43-53).
- Permission bitmask (Apollo): campo Permission do serverinfo, decodificado em ComputerDetails.toString (:173-222). Grupos: input (controller 0x100, touch 0x200, pen 0x400, mouse 0x800, kbd 0x1000), operation (clipboard_set 0x10000, clipboard_read 0x20000, file_upload 0x40000, file_download 0x80000, server_cmd 0x100000) e action (list 0x1000000, view 0x2000000, launch 0x4000000).
- ServerCommand: lista de comandos remotos expostos pelo host Apollo (tag ServerCommand no serverinfo, NvHTTP.getServerCmds :568-570). Executados por índice via MoonBridge.sendExecServerCmd → LiSendExecServerCmd, pacote 0x3000 no canal CTRL_CHANNEL_SERVERCTL (ControlStream.c:2054-2065).
- Virtual Display (vDisplay): capacidade Apollo/Vibeshine de criar um monitor virtual para a sessão. Sinalizada por VirtualDisplayCapable + VirtualDisplayDriverReady no serverinfo e enviada como &virtualDisplay=1 no /launch (NvHTTP.java:887).
- REMOTE_INPUT_UUID: UUID mágico 8CB5C136-DA67-4F99-B4A1-F9CD35005CF4 do app 'InputOnly' do Apollo. Quando é o app alvo, NvConnection não tenta encerrar a sessão em andamento (NvConnection.java:321-323).
- CTRL_CHANNEL_*: canais lógicos do control stream ENet (Limelight-internal.h:57-67). GENERIC 0x00, URGENT 0x01, KEYBOARD 0x02, MOUSE 0x03, PEN 0x04, TOUCH 0x05, UTF8 0x06, SERVERCTL 0x08 (Apollo), GAMEPAD_BASE 0x10, SENSOR_BASE 0x20.
- UTF8_TEXT_EVENT_MAGIC / UTF8_TEXT_EVENT_MAX_COUNT: magic 0x00000017 e limite de 32 bytes de texto por pacote (Input.h:32-37). O envio fragmenta em um code point por pacote (InputStream.c:610-648).
- LiSendUtf8TextEvent: API nativa que envia texto Unicode como evento de input (InputStream.c:1005). É o caminho usado por conn.sendUtf8Text a partir de Game.handleKeyMultiple e do InputConnection do teclado virtual.
- commitText / enqueueCommitText: caminho do teclado virtual Android. ExternalControllerView expõe um InputConnection quando commitTextEnabled (ExternalControllerView.java:59-85); Game.enqueueCommitText fatia em blocos de 512 bytes UTF-8 e drena com 15 ms de intervalo (Game.java:4314-4334, 312-331).
- smartClipboardSync: preferência que sincroniza o clipboard automaticamente em ganho/perda de foco da Activity de stream (Game.handleFocusChange :2233-2243; PreferenceConfiguration.java:259-261).
- CLIPBOARD_IDENTIFIER: marcador colocado nos extras do ClipDescription para o app reconhecer o conteúdo que ele mesmo escreveu e evitar loop de sincronização (Game.java:2246-2302).
- HostHttpResponseException: IOException tipada com código de erro do host. Códigos relevantes: 401 (cert mismatch, força fallback para HTTP em NvHTTP.java:376-379), 418 (dispositivo de áudio ausente no GFE, :332-336), 470 (resume de sessão de outro dispositivo), 525 (app minimizado), 599 (quit de sessão alheia, sintetizado em NvHTTP.quitApp :916).
- STREAM_CFG_LOCAL / REMOTE / AUTO: classificação da conexão que define o tamanho de pacote (1024 bytes em remoto) e o comportamento do moonlight-common-c. Decidida em NvConnection.detectServerConnectionType (:130-223) inspecionando NetworkCapabilities, NAT64 prefix e RouteInfo.
- art:// : URI scheme do Artemis para adicionar e parear um host por link (AndroidManifest.xml:186-191). Parâmetros de query pin e passphrase disparam o pareamento OTP automático (AddComputerManually.java:205-216 → PcView.java:255-267,307-319).
