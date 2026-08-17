# Segurança, Privacidade e Robustez (crypto/pairing, armazenamento de credenciais, permissões, superfície exportada, tratamento de erros e vazamento de recursos)

> Semeado pela análise multi-agente de 2026-08-16 e mantido à mão desde então.
> Se você encontrar algo errado aqui, **corrija na hora** — documentação
> desatualizada é pior que ausente, porque é acreditada.

## Índice

1. [Como funciona](#como-funciona)
2. [Arquivos-chave](#arquivos-chave)
3. [Fluxo](#fluxo)
4. [Interfaces externas](#interfaces-externas)
5. [Problemas conhecidos](#problemas-conhecidos) (23)
6. [Ideias de melhoria](#ideias-de-melhoria) (10)
7. [Glossário](#glossário)

## Como funciona

A identidade criptográfica do cliente é um par RSA-2048 autoassinado gerado por BouncyCastle em `AndroidCryptoProvider` e persistido em texto claro no diretório privado do app (`files/client.crt` e `files/client.key`, PKCS#8 DER puro, sem Android Keystore e sem EncryptedFile). O pareamento (`PairingManager.pair()`) segue o protocolo NVIDIA GameStream: sal aleatório de 16 bytes + PIN → chave AES-128 (SHA-1 para servidor gen<7, SHA-256 para gen>=7), desafio/resposta bidirecional e verificação de assinatura do certificado do servidor. Todo o handshake de pareamento roda sobre HTTP em texto claro na porta 47989; a confidencialidade vem do PIN, não do transporte. O fork adiciona um campo `otpauth` (SHA-256 de PIN+salt+passphrase) para o pareamento OTP do Apollo. Depois do pareamento, o certificado do servidor é fixado (TOFU) e guardado como BLOB DER na tabela `Computers` do SQLite `computers4.db`; `NvHTTP` monta um `X509TrustManager` que primeiro tenta a cadeia de CAs do sistema e, se falhar, exige igualdade byte-a-byte com o certificado fixado, além de um `HostnameVerifier` que aceita qualquer hostname quando o certificado é o fixado. Há um caminho de downgrade explícito: em `getServerInfo()`, um erro de validação TLS (401 sintético) faz o cliente refazer `serverinfo` sobre HTTP puro. A `network_security_config.xml` habilita `cleartextTrafficPermitted="true"` globalmente, sem escopo por domínio. O ponto mais grave de armazenamento é o backup: `android:allowBackup="true"` com regras que excluem apenas `sharedpref`, ou seja, `files/client.key`, `files/uniqueid` e `databases/computers4.db` entram no backup de nuvem e no device-transfer. A superfície exportada é maior do que o necessário: `PosterContentProvider` é `exported="true"` sem permissão e ignora o resultado do `UriMatcher`, `AddComputerManually` aceita deep link `art://` com `pin`/`passphrase`, e `PcView` (a activity LAUNCHER, portanto exportada) aceita extras `hostname`/`pin`/`passphrase` que disparam pareamento automático sem nenhuma confirmação. Há um `AccessibilityService` declarado com `canRetrieveWindowContent="true"` e `flagRetrieveInteractiveWindows` só para filtrar teclas físicas. O tratamento de erros é irregular: 86 blocos `catch (Exception|Throwable)` genéricos em 24 arquivos, com um cluster de `catch (Throwable ignored) {}` em `Game.java` e `MediaCodecDecoderRenderer.java` que engole falhas silenciosamente — inclusive uma chamada por reflexão a `SurfaceView.setFrameRate` que não existe e portanto é código morto invisível. Mensagens ao usuário oscilam entre strings de recurso genéricas ("Pairing failed" para quatro causas distintas, incluindo detecção de MITM) e `e.getMessage()` cru em Toast. Vazamentos de recurso confirmados: `ComputerDatabaseManager` aberto e nunca fechado em `ShortcutTrampoline`, `FileUriUtils.openUriForWrite` sem `finally`, `Stereo3DRenderer.loadModelFile` sem fechar o `FileInputStream`, `PerformanceDataTracker` criando um `ExecutorService` por instância sem shutdown, e `ExternalDisplayControlActivity.initViews` que continua reagendando `postDelayed` depois de chamar `finish()`. Reflexão aparece em nove pontos, dois deles injustificáveis (leitura de um campo público do próprio pacote e um método inexistente). As dependências estão atualizadas (BouncyCastle 1.81, OkHttp 4.12.0, Gson 2.13.1), com exceção de jcodec 0.2.5, usado para parsear SPS H.264 vindo da rede.

## Arquivos-chave

| Arquivo | Linhas | Papel |
|---|--:|---|
| [`app/src/main/java/com/limelight/binding/crypto/AndroidCryptoProvider.java`](../../app/src/main/java/com/limelight/binding/crypto/AndroidCryptoProvider.java) | 259 | Gera, carrega e persiste a identidade criptográfica do cliente: par RSA-2048 autoassinado com validade de 20 anos, CN fixo 'NVIDIA GameStream Client'. Salva o certificado em PEM com line endings UNIX e a chave privada em PKCS#8 DER puro no filesDir. Toda a geracao/carga eh serializada por um lock estatico global. |
| [`app/src/main/java/com/limelight/nvstream/http/PairingManager.java`](../../app/src/main/java/com/limelight/nvstream/http/PairingManager.java) | 356 | Implementa o handshake de pareamento GameStream/Apollo: derivacao de chave AES a partir de sal+PIN, desafio/resposta bidirecional, verificacao de assinatura do certificado do servidor e extensao otpauth do fork. Retorna um PairState que a UI traduz em mensagem. |
| [`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`](../../app/src/main/java/com/limelight/nvstream/http/NvHTTP.java) | 938 | Cliente HTTP/HTTPS do host. Constroi o SSLContext com KeyManager (cert do cliente) e TrustManager customizado (CA do sistema, com fallback para pinning byte-a-byte), define o HostnameVerifier permissivo para o cert fixado e implementa o downgrade para HTTP puro quando a validacao TLS falha. Tambem monta a URL de launch com a chave RI em hexadecimal. |
| [`app/src/main/AndroidManifest.xml`](../../app/src/main/AndroidManifest.xml) | 268 | Declara permissoes, componentes exportados, regras de backup e a config de seguranca de rede. Ponto de partida obrigatorio para qualquer analise de superfície de ataque do app. |
| [`app/src/main/java/com/limelight/PcView.java`](../../app/src/main/java/com/limelight/PcView.java) | 933 | Tela principal (LAUNCHER, exportada). Le extras hostname/port/pin/passphrase do Intent de entrada e agenda pareamento automatico quando o host correspondente ficar online. Contem doPair()/doUnpair() e a traducao de PairState para mensagem ao usuario. |
| [`app/src/main/java/com/limelight/PosterContentProvider.java`](../../app/src/main/java/com/limelight/PosterContentProvider.java) | 107 | ContentProvider exportado que serve arquivos de box art do cache para a home do Android TV. openFile() ignora o resultado do UriMatcher e delega sempre para openBoxArtFile(), que monta o caminho concatenando o segmento uuid sem normalizacao. |
| [`app/src/main/java/com/limelight/utils/CacheHelper.java`](../../app/src/main/java/com/limelight/utils/CacheHelper.java) | 86 | Helper de caminhos de cache usado pelo PosterContentProvider e pelo DiskAssetLoader. openPath() concatena componentes com new File(parent, component) sem nenhuma normalizacao ou validacao contra '..'. |
| [`app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java`](../../app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java) | 235 | Persistencia dos hosts em SQLite (computers4.db). Guarda o certificado fixado do servidor como BLOB DER. Usa queries parametrizadas e try-with-resources nos Cursors — o codigo de DB e o mais correto do repositorio. |
| [`app/src/main/java/com/limelight/computers/IdentityManager.java`](../../app/src/main/java/com/limelight/computers/IdentityManager.java) | 73 | Gera e persiste o identificador de cliente (files/uniqueid) usado como parametro uniqueid em todas as requisicoes HTTP ao host. Usa java.util.Random, nao SecureRandom. |
| [`app/src/main/java/com/limelight/ShortcutTrampoline.java`](../../app/src/main/java/com/limelight/ShortcutTrampoline.java) | 530 | Activity exportada que recebe atalhos e arquivos .art (scheme content/file, mimeType */*). Parseia o .art linha a linha e resolve host/app; abre um ComputerDatabaseManager que nunca fecha. |
| [`app/src/main/java/com/limelight/preferences/AddComputerManually.java`](../../app/src/main/java/com/limelight/preferences/AddComputerManually.java) | 407 | Activity exportada com intent-filter BROWSABLE para o scheme art://. Extrai host, pin e passphrase da URL, mostra um dialogo de confirmacao e, apos adicionar o host, encaminha as credenciais para PcView disparando pareamento automatico. |
| [`app/src/main/java/com/limelight/Game.java`](../../app/src/main/java/com/limelight/Game.java) | 4348 | God-class da activity de stream. Concentra sincronizacao de clipboard com o host, envio de texto UTF-8 em lote (commitText), ciclo de vida dos recursos de stream e um cluster de catch(Throwable ignored) com reflexao desnecessaria. |
| [`app/src/main/java/com/limelight/KeyboardAccessibilityService.java`](../../app/src/main/java/com/limelight/KeyboardAccessibilityService.java) | 71 | AccessibilityService cujo unico proposito e interceptar teclas fisicas que o sistema captura antes do app (Home, Esc em tablets Xiaomi). Restringe packageNames em onServiceConnected, mas o XML declara capacidade de ler conteudo de janela. |
| [`app/src/main/jni/moonlight-core/simplejni.c`](../../app/src/main/jni/moonlight-core/simplejni.c) | 271 | Cola JNI Java->C. Contem sendUtf8Text, que converte a jstring com GetStringUTFChars (UTF-8 modificado/CESU-8) sem checar NULL antes de strlen. Caminho direto da feature de envio de texto que o dono do fork quer. |
| [`app/src/main/java/com/limelight/utils/DeviceUtils.java`](../../app/src/main/java/com/limelight/utils/DeviceUtils.java) | 410 | Utilitario copiado de uma biblioteca generica de fingerprinting de dispositivo. Somente getModel(), getManufacturer() e getSDKVersionName() sao usados; o resto (ANDROID_ID, MAC, root, ADB, emulador, /proc/cpuinfo via ProcessBuilder) e codigo morto com peso de privacidade. |
| [`app/src/main/java/com/limelight/utils/FileUriUtils.java`](../../app/src/main/java/com/limelight/utils/FileUriUtils.java) | 102 | Leitura e escrita de arquivos por Uri (import/export de configuracao de teclado). openUriForWrite nao fecha o stream em caso de excecao e descarta o erro chamando getLocalizedMessage() como statement isolado. |
| [`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`](../../app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java) | 566 | Activity de controle para display externo. Mantem uma referencia estatica a si mesma e reagenda initViews() indefinidamente via Handler mesmo depois de chamar finish(). |
| [`app/src/main/java/com/limelight/utils/Dialog.java`](../../app/src/main/java/com/limelight/utils/Dialog.java) | 113 | Dialogos de erro globais. Mantem uma ArrayList estatica de Dialog, cada um segurando uma Activity; so e limpa por closeDialogs() chamado em onStop das activities que se lembram de faze-lo. |
| [`app/src/main/java/com/limelight/utils/ServerHelper.java`](../../app/src/main/java/com/limelight/utils/ServerHelper.java) | 274 | Monta Intents de start/quit e faz o teste de conectividade. Contem a unica string de erro hardcoded em ingles no fluxo de quit e propaga e.getMessage() cru para Toast. |
| [`app/src/main/java/com/limelight/utils/Stereo3DRenderer.java`](../../app/src/main/java/com/limelight/utils/Stereo3DRenderer.java) | 1148 | Renderizador 3D com TFLite (modelo midas de 17 MB em assets) e OpenCV. A cadeia de fallback GPU->NNAPI->CPU chama close() em delegates que podem ser null e o carregador do modelo nao fecha o FileInputStream. |
| [`app/src/main/res/xml/backup_rules.xml`](../../app/src/main/res/xml/backup_rules.xml) | 5 | Regra de backup legado (API < 31). Exclui apenas o dominio sharedpref, deixando files/ (client.key, client.crt, uniqueid) e databases/ (computers4.db) inclusos no backup. |
| [`app/src/main/res/xml/network_security_config.xml`](../../app/src/main/res/xml/network_security_config.xml) | 8 | Permite trafego em texto claro globalmente (cleartextTrafficPermitted=true) sem escopo por dominio, necessario para o pareamento HTTP na porta 47989 mas sem nenhuma restricao. |
| [`app/src/main/res/xml/provider_file_paths.xml`](../../app/src/main/res/xml/provider_file_paths.xml) | 16 | Configuracao do FileProvider. Expoe files-path '.' (o mesmo diretorio de client.key) e external-path '.' (raiz do armazenamento externo) como raizes compartilhaveis. |
| [`app/src/main/res/xml/keyboard_accessibility_service.xml`](../../app/src/main/res/xml/keyboard_accessibility_service.xml) | 13 | Configuracao do AccessibilityService. Declara canRetrieveWindowContent=true e flagRetrieveInteractiveWindows, alem de sete tipos de evento, para uma funcionalidade que so precisa de filtro de teclas. |

<details>
<summary>Símbolos importantes por arquivo</summary>

**`app/src/main/java/com/limelight/binding/crypto/AndroidCryptoProvider.java`**
- `globalCryptoLock :54`
- `bcProvider :56`
- `AndroidCryptoProvider(Context) :58`
- `loadFileToBytes(File) :65`
- `loadCertKeyPair() :82`
- `generateCertKeyPair() :114`
- `saveCertKeyPair() :160`
- `getClientCertificate() :191`
- `getClientPrivateKey() :218`
- `getPemEncodedClientCertificate() :245`

**`app/src/main/java/com/limelight/nvstream/http/PairingManager.java`**
- `PairState (enum) :30`
- `extractPlainCert(String) :70`
- `saltPin(byte[],String) :97`
- `verifySignature(byte[],byte[],Certificate) :115`
- `signData(byte[],PrivateKey) :127`
- `performBlockCipher(BlockCipher,byte[]) :139`
- `decryptAes/encryptAes :153,:159`
- `generatePinString() :176`
- `pair(String,String,String) :187`
- `Sha1PairingHash :323`
- `Sha256PairingHash :340`

**`app/src/main/java/com/limelight/nvstream/http/NvHTTP.java`**
- `getDefaultTrustManager() :95`
- `initializeHttpState(LimelightCryptoProvider) :114`
- `checkServerTrusted(...) :138`
- `HostnameVerifier.verify(...) :161`
- `getHttpsUrl(boolean) :194`
- `getServerInfo(boolean) :342`
- `performAndroidTlsHack(OkHttpClient) :462`
- `openHttpConnection(...) :488`
- `openHttpConnectionToString(...) :524`
- `executePairingCommand(String,boolean) :799`
- `unpair() :809`
- `launchApp(...) :849`
- `getClipboard() :922`
- `sendClipboard(String) :929`

**`app/src/main/AndroidManifest.xml`**
- `uses-permission INTERNET/ACCESS_NETWORK_STATE :4-5`
- `REORDER_TASKS :7`
- `ACCESS_WIFI_STATE :10`
- `READ_EPG_DATA/WRITE_EPG_DATA :11-12`
- `allowBackup=true :48`
- `fullBackupContent=@xml/backup_rules :49`
- `networkSecurityConfig :51`
- `PosterContentProvider exported=true :61-66`
- `PcView exported=true (LAUNCHER) :90-108`
- `ShortcutTrampoline exported=true (.art) :110-129`
- `AddComputerManually exported=true (art://) :175-192`
- `KeyboardAccessibilityService :242-254`
- `FileProvider :257-265`

**`app/src/main/java/com/limelight/PcView.java`**
- `pendingPairingAddress/Pin/Passphrase :79-80`
- `onCreate le extras pin/passphrase :255-267`
- `startComputerUpdates() :286`
- `auto-doPair no listener :307-319`
- `doPair(ComputerDetails,String,String) :470`
- `doOTPPair(ComputerDetails) :584`
- `doWakeOnLan(ComputerDetails) :629`

**`app/src/main/java/com/limelight/PosterContentProvider.java`**
- `AUTHORITY :20`
- `sUriMatcher (bloco static) :29-33`
- `openFile(Uri,String) :34`
- `openBoxArtFile(Uri,String) :44`
- `createBoxArtUri(String,String) :97`

**`app/src/main/java/com/limelight/utils/CacheHelper.java`**
- `openPath(boolean,File,String...) :16`
- `deleteCacheFile(File,String...) :37`
- `openCacheFileForInput(File,String...) :45`
- `writeInputStreamToOutputStream(InputStream,OutputStream,long) :53`
- `readInputStreamToString(InputStream) :66`

**`app/src/main/java/com/limelight/computers/ComputerDatabaseManager.java`**
- `COMPUTER_DB_NAME :26`
- `ComputerDatabaseManager(Context) :46`
- `close() :58`
- `initializeDb(Context) :62`
- `updateComputer(ComputerDetails) :110`
- `getComputerFromCursor(Cursor) :141`
- `getAllComputers() :183`
- `getComputerByUUID(String) :222`

**`app/src/main/java/com/limelight/computers/IdentityManager.java`**
- `UNIQUE_ID_FILE_NAME :15`
- `loadUniqueId(Context) :33`
- `generateNewUniqueId(Context) :55`

**`app/src/main/java/com/limelight/ShortcutTrampoline.java`**
- `parseArtFileData(Uri) :311`
- `validateHostInput(String,String) :242`
- `validateAppInput(String,String,String) :277`
- `onCreate(Bundle) :353`
- `dbManager (local, nunca fechado) :360`
- `WakeOnLanSender.sendWolPacket(computer) :114`

**`app/src/main/java/com/limelight/preferences/AddComputerManually.java`**
- `parseRawUserInputToUri(String) :103`
- `doAddPc(String) :121`
- `encaminha pin/passphrase para PcView :205-216`
- `onCreate deep link handling :283-321`
- `handleDoneEvent() :396`

**`app/src/main/java/com/limelight/Game.java`**
- `instance (static Activity) :144`
- `UTF8_CHUNK_SIZE :313`
- `flushCommitTextQueue :317`
- `serverCert do Intent :576-589`
- `reflexao em forceTightThresholds :674-688`
- `reflexao SurfaceView.setFrameRate (metodo inexistente) :929`
- `onDestroy() :1702`
- `onStop() :1761`
- `handleFocusChange(boolean) :2233`
- `getClipboardContent(boolean) :2246`
- `sendClipboard(boolean) :2304`
- `getClipboard(int) :2339`
- `stageFailed(String,int,int) :3472`
- `connectionTerminated(int) :3548`
- `handleCommitText(CharSequence) :4290`
- `enqueueCommitText(String) :4314`

**`app/src/main/java/com/limelight/KeyboardAccessibilityService.java`**
- `BLACKLIST_KEYS :15`
- `onKeyEvent(KeyEvent) :22`
- `onServiceConnected() :52`
- `onAccessibilityEvent(AccessibilityEvent) :64`

**`app/src/main/jni/moonlight-core/simplejni.c`**
- `sendUtf8Text :127`
- `stopConnection :134`
- `findExternalAddressIP4 :149`
- `testClientConnectivity :183`
- `stringifyPortFlags :205`
- `getLaunchUrlQueryParameters :227`

**`app/src/main/java/com/limelight/utils/DeviceUtils.java`**
- `isDeviceRooted() :41`
- `isAdbEnabled(Context) :60`
- `getAndroidID(Context) :91`
- `getMacAddress(Context) :109`
- `getModel() :283`
- `isEmulator(Context) :326`
- `readCpuInfo() :380`
- `isDevelopmentSettingsEnabled(Context) :405`

**`app/src/main/java/com/limelight/utils/FileUriUtils.java`**
- `openUriForRead(Context,Uri) :21`
- `openUriForWrite(Context,Uri,String) :64`
- `writerFileString(File,String) :83`

**`app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java`**
- `instance (static, @SuppressLint StaticFieldLeak) :62`
- `toggleKeyboard() :93`
- `onCreate(Bundle) :114`
- `initViews() :148`
- `onDestroy() :215`
- `checkNotificationPermission() :518`

**`app/src/main/java/com/limelight/utils/Dialog.java`**
- `rundownDialogs (static) :20`
- `closeDialogs() :30`
- `displayDialog(Activity,String,String,boolean) :43`
- `run() :60`

**`app/src/main/java/com/limelight/utils/ServerHelper.java`**
- `CONNECTION_TEST_SERVER :36`
- `createStartIntent(...) :93`
- `doNetworkTest(Activity) :157`
- `doQuit(...) com string hardcoded :189-244`

**`app/src/main/java/com/limelight/utils/Stereo3DRenderer.java`**
- `AI_MODEL :55`
- `inicializacao TFLite com fallback :690-723`
- `reinitializeTfLiteOnCpu() :725`
- `loadModelFile(Context,String) :746`

**`app/src/main/res/xml/backup_rules.xml`**
- `exclude domain=sharedpref :4`

**`app/src/main/res/xml/network_security_config.xml`**
- `base-config cleartextTrafficPermitted=true :3`

**`app/src/main/res/xml/provider_file_paths.xml`**
- `external-path . :3-5`
- `cache-path . :9-11`
- `files-path . :15-17`

**`app/src/main/res/xml/keyboard_accessibility_service.xml`**
- `accessibilityEventTypes :6`
- `accessibilityFlags flagRetrieveInteractiveWindows :8`
- `canRequestFilterKeyEvents :9`
- `canRetrieveWindowContent :10`

</details>

## Fluxo

FLUXO 1 — Identidade do cliente. Na primeira chamada a `PlatformBinding.getCryptoProvider()`, `AndroidCryptoProvider.getClientCertificate()` (AndroidCryptoProvider.java:191) toma `globalCryptoLock` (:54), tenta `loadCertKeyPair()` (:82) lendo `files/client.crt` e `files/client.key`; se faltarem, `generateCertKeyPair()` (:114) gera RSA-2048 via BouncyCastle, monta um X509v3 autoassinado com CN "NVIDIA GameStream Client" e serial de 8 bytes de `SecureRandom` (:115-116), validade 20 anos (:129-133), e `saveCertKeyPair()` (:160) grava o PEM (com CR removidos, :173-177) e `key.getEncoded()` PKCS#8 cru (:181). Nenhuma criptografia em repouso, nenhum uso de Android Keystore. Em paralelo, `IdentityManager` (IdentityManager.java:20) le/gera `files/uniqueid` com `new Random().nextLong()` (:58).

FLUXO 2 — Descoberta e polling. `ComputerManagerService` (ComputerManagerService.java:45) liga-se ao `DiscoveryService`; `createDiscoveryListener()` (:394) recebe hosts via mDNS e chama `addComputerBlocking()` (:469), que faz `pollComputer` -> `tryPollIp` (:544). `tryPollIp` cria um `NvHTTP` com o `serverCert` guardado (:552) e chama `http.getComputerDetails()` -> `getServerInfo(boolean)` (NvHTTP.java:342). Se ha cert fixado, tenta HTTPS; se o handshake falhar por `CertificateException`, converte em `HostHttpResponseException(401)` (:364) e o handler em :376-379 **refaz a requisicao sobre HTTP puro**. O XML de resposta e parseado por `getXmlString`/`getXmlArray` (:241,:285) e alimenta `ComputerDetails` (uuid, permission, httpsPort, mac, LocalIP, ExternalIP, PairStatus, state). O resultado e persistido por `runPoll` (:90) via `existingComputer.update(details)` (ComputerDetails.java:123) + `dbManager.updateComputer()`.

FLUXO 3 — Pareamento. `PcView.doPair()` (PcView.java:470) roda em thread propria, cria `NvHTTP`, e chama `PairingManager.pair(serverInfo, pin, passphrase)` (PairingManager.java:187). Passos: (a) escolhe SHA-1 ou SHA-256 pela versao major do servidor (:192-199); (b) gera sal de 16 bytes (:202) e deriva a chave AES por `generateAesKey(hashAlgo, saltPin(salt,pin))` (:205) — apenas os 16 primeiros bytes do hash; (c) se ha passphrase, calcula `SHA-256(pin+saltHex+passphrase)` e anexa como `otpauth` (:213-227); (d) `http.executePairingCommand(...)` (NvHTTP.java:799) envia **sobre `baseUrlHttp`, ou seja, HTTP em texto claro**, incluindo `clientcert` em hexadecimal (:209-210); (e) `extractPlainCert()` (:70) le o `plaincert` da resposta e `http.setServerCert()` (:246) fixa o certificado para o resto da sessao; (f) desafio cifrado com `encryptAes` (:250) — `performBlockCipher` (:139) processa bloco a bloco sem IV e sem encadeamento, isto e, **modo ECB**; (g) `verifySignature(serverSecret, serverSignature, serverCert)` (:282) — se falhar, `http.unpair()` e retorna `FAILED` com o comentario "Looks like a MITM" (:286); (h) compara o hash de desafio para detectar PIN errado (:292) retornando `PIN_WRONG`; (i) `clientpairingsecret` assinado com a chave privada (:301) e `executePairingChallenge()` sobre HTTPS (:804). De volta em `PcView.doPair` (:533-543), o `PairState` vira mensagem: `PIN_WRONG` -> `R.string.pair_incorrect_pin`, `FAILED` -> `R.string.pair_fail` ("Pairing failed"), colapsando falha de assinatura (MITM) com quatro outras causas. Em sucesso, `managerBinder.getComputer(uuid).serverCert = pm.getPairedCert()` (:539) grava o cert em memoria; o proximo `runPoll` o persiste no SQLite.

FLUXO 4 — Deep link art:// -> pareamento automatico. Uma pagina web abre `art://<host>:<porta>?name=X&pin=NNNN&passphrase=YYYY`. O intent-filter em AndroidManifest.xml:186-191 entrega a `AddComputerManually.onCreate` (:283), que monta `server`+`query` (:316-317) e exibe um AlertDialog de confirmacao com o nome fornecido pelo atacante (:378-391). Ao confirmar, `computersToAdd.add(server+'?'+query)` (:385) alimenta a thread de adicao (:224) -> `doAddPc` (:121) -> `managerBinder.addComputerBlocking`. Em caso de sucesso, :205-216 extrai `pin` e `passphrase` da URI e inicia `PcView` com esses extras. `PcView.onCreate` (:255-267) os copia para `pendingPairingPin/Passphrase` e `startComputerUpdates()` (:286) dispara `doPair(details, pin, passphrase)` (:313) **sem segundo dialogo** assim que o host aparece online no endereco esperado. Como `PcView` e exportada (LAUNCHER), qualquer app local pode pular a etapa de confirmacao e chamar `PcView` diretamente com esses extras.

FLUXO 5 — Clipboard. `StreamView.onWindowFocusChanged` (StreamView.java:117) chama `inputCallbacks.handleFocusChange()` -> `Game.handleFocusChange` (Game.java:2233). Com `prefConfig.smartClipboardSync` ligado: ganho de foco -> `sendClipboard(false)` (:2304) le a area de transferencia local via `getClipboardContent` (:2246) e faz POST em `actions/clipboard` (NvHTTP.java:929); perda de foco -> `getClipboard(0)` (:2339) busca o clipboard do host e chama `clipboardManager.setPrimaryClip` (:2374), marcando `IS_SENSITIVE` se `hideClipboardContent`. O default de `smartClipboardSync` e `false` (PreferenceConfiguration.java:199).

FLUXO 6 — Envio de texto (feature do dono do fork). IME -> `StreamView.onCreateInputConnection` (StreamView.java:131) devolve um `BaseInputConnection` cujo `commitText` (:142) chama `Game.handleCommitText` (Game.java:4290) -> `enqueueCommitText` (:4314), que fatia o texto em blocos de 512 bytes UTF-8 respeitando fronteiras de code point (:4320-4329) e enfileira; `flushCommitTextQueue` (:317) despacha um bloco a cada 15 ms via `conn.sendUtf8Text` -> `MoonBridge.sendUtf8Text` -> `Java_..._sendUtf8Text` (simplejni.c:127), que faz `GetStringUTFChars` **sem checar NULL** e `strlen` (:128-129) antes de `LiSendUtf8TextEvent`.

FLUXO 7 — Box art exportado. `TvChannelHelper` (:148) gera `content://poster.com.limelight.noir/boxart/<uuid>/<appId>`. Qualquer app resolve essa URI: `PosterContentProvider.openFile` (:34) calcula `sUriMatcher.match(uri)` mas **retorna `openBoxArtFile(uri, mode)` nos dois ramos** (:37-41), tornando o matcher inerte; `openBoxArtFile` (:44) exige 3 segmentos, faz `Integer.parseInt(appId)` sem try/catch (:57) e passa o `uuid` cru para `DiskAssetLoader.getFile` (:146) -> `CacheHelper.openPath` (CacheHelper.java:16), que concatena com `new File(f, component)` sem normalizar.

## Interfaces externas

- Android Keystore/JCA: java.security.KeyPairGenerator, KeyFactory, CertificateFactory, Signature, MessageDigest, SecureRandom (AndroidCryptoProvider.java:120,:96,:93; PairingManager.java:104-137,:214,:330,:346)
- BouncyCastle 1.81 (bcprov-jdk18on + bcpkix-jdk18on): BouncyCastleProvider, X509v3CertificateBuilder, JcaX509CertificateConverter, JcaContentSignerBuilder, JcaPEMWriter, AESLightEngine, KeyParameter (AndroidCryptoProvider.java:27-36,:56; PairingManager.java:5-7)
- javax.net.ssl: SSLContext, X509TrustManager, X509KeyManager, HostnameVerifier, TrustManagerFactory, SSLHandshakeException, SSLPeerUnverifiedException (NvHTTP.java:31-41,:114-192,:462-472)
- OkHttp 4.12.0: OkHttpClient, ConnectionPool, HttpUrl, Request, RequestBody, Response, ResponseBody, Proxy.NO_PROXY (NvHTTP.java:54-61,:177-192)
- org.xmlpull.v1 (XmlPullParser/XmlPullParserFactory) para parsear XML do host, sem desativacao explicita de entidades externas (NvHTTP.java:43-45,:241-322)
- Protocolo GameStream/Apollo sobre HTTP porta 47989 (pairing, unpair, serverinfo) e HTTPS porta 47984 (applist, launch, resume, cancel, appasset, actions/clipboard) (NvHTTP.java:69-73,:799-937)
- SQLite via android.database.sqlite.SQLiteDatabase / Context.openOrCreateDatabase, banco computers4.db (ComputerDatabaseManager.java:49; LegacyDatabaseReader*.java)
- android.content.ContentProvider + UriMatcher + ParcelFileDescriptor, authority poster.${applicationId} exportada (PosterContentProvider.java)
- androidx.core.content.FileProvider, authority ${applicationId}.fileprovider, com paths files-path '.' e external-path '.' (AndroidManifest.xml:257-265; res/xml/provider_file_paths.xml)
- android.accessibilityservice.AccessibilityService com FLAG_REQUEST_FILTER_KEY_EVENTS e canRetrieveWindowContent (KeyboardAccessibilityService.java; res/xml/keyboard_accessibility_service.xml)
- android.content.ClipboardManager / ClipData / ClipDescription / PersistableBundle, incluindo a extra nao documentada 'android.content.extra.IS_SENSITIVE' (Game.java:2246-2389)
- android.view.inputmethod.BaseInputConnection / EditorInfo / InputType para interceptar commitText do IME (StreamView.java:131-157)
- JNI: MoonBridge <-> moonlight-common-c (submodulo ClassicOldSong/moonlight-common-c, commit c999436858471dfefa7617af3b7dc03ec1644ce4), com GetStringUTFChars/ReleaseStringUTFChars, NewGlobalRef, SetByteArrayRegion, GetPrimitiveArrayCritical, AttachCurrentThread (simplejni.c, callbacks.c)
- OpenSSL compilado localmente para o modulo nativo (jni/moonlight-core/openssl, build-openssl.sh)
- STUN: stun.moonlight-stream.org:3478 via LiFindExternalAddressIP4 (ComputerManagerService.java:370; simplejni.c:149)
- Teste de conectividade: android.conntest.moonlight-stream.org:443 via LiTestClientConnectivity (ServerHelper.java:36,:166)
- Wake-on-LAN via DatagramSocket UDP para portas 9, 47009 e 47998-48010 (WakeOnLanSender.java:14-59)
- jmDNS 3.6.2 (JmmDNS, ServiceInfo, NetworkTopologyDiscovery com ClassDelegate substituido) e NsdManager em API 34+ (JmDNSDiscoveryAgent.java:109-149)
- jcodec 0.2.5: H264Utils.readSPS/writeSPS e SeqParameterSet aplicados a bitstream vindo da rede (MediaCodecDecoderRenderer.java:12-14,:1911,:2023,:2195)
- TensorFlow Lite / LiteRT 1.4.0 (Interpreter, GpuDelegate, NnApiDelegate) + OpenCV 4.12.0, modelo midas-midas-v2-w8a8.tflite de 17,7 MB embarcado em assets (Stereo3DRenderer.java:690-753)
- Gson 2.13.1 para perfis (profiles.json) e para import/export de configuracao de teclado (ProfilesManager.java:78-118; KeyConfigHelper.java:41; StreamSettings.java:1065,:1079)
- android.webkit.WebView com JavaScript habilitado, carregando URL do Intent (HelpActivity.java:41-78)
- com.samsung.android.view.SemWindowManager via reflexao para capturar meta keys (Game.java:1352-1360)
- android.hardware.input.InputManager.setCursorVisibility via reflexao em dispositivos Shield (ShieldCaptureProvider.java:29)
- ProcessBuilder executando /system/bin/cat /proc/cpuinfo (DeviceUtils.java:380-397)

## Problemas conhecidos

| Sev | Categoria | Problema | Local |
|---|---|---|---|
| 🔴 crítico | security | Chave privada do cliente, uniqueid e banco de hosts entram no backup de nuvem e no device-transfer | `app/src/main/AndroidManifest.xml:48` |
| 🟠 alto | security | ContentProvider exportado sem permissao permite path traversal e leitura do cache por qualquer app | `app/src/main/java/com/limelight/PosterContentProvider.java:34` |
| 🟠 alto | security | PcView exportada aceita pin/passphrase por Intent e dispara pareamento automatico sem confirmacao | `app/src/main/java/com/limelight/PcView.java:255` |
| 🟠 alto | security | AccessibilityService declara leitura de conteudo de tela para uma funcao que so precisa filtrar teclas | `app/src/main/res/xml/keyboard_accessibility_service.xml:8` |
| 🟠 alto | security | Downgrade silencioso para HTTP em texto claro quando o certificado fixado nao confere | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:359` |
| 🟡 médio | ux | Falha de verificacao de assinatura do servidor (MITM detectado) e reportada como 'Pairing failed' generico | `app/src/main/java/com/limelight/nvstream/http/PairingManager.java:282` |
| 🟡 médio | bug | ComputerDatabaseManager aberto e nunca fechado em ShortcutTrampoline | `app/src/main/java/com/limelight/ShortcutTrampoline.java:360` |
| 🟡 médio | bug | initViews continua reagendando a si mesmo apos finish(), vazando a Activity indefinidamente | `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java:148` |
| 🟡 médio | maintainability | Reflexao desnecessaria para ler um campo publico e chamada de metodo que nao existe, ambas com catch(Throwable ignored) | `app/src/main/java/com/limelight/Game.java:674` |
| 🟡 médio | bug | openUriForWrite vaza o OutputStream e descarta a excecao com uma chamada sem efeito | `app/src/main/java/com/limelight/utils/FileUriUtils.java:64` |
| 🟡 médio | bug | GetStringUTFChars sem checagem de NULL e envio de CESU-8 em vez de UTF-8 no caminho de texto | `app/src/main/jni/moonlight-core/simplejni.c:127` |
| 🟡 médio | bug | Fallback de inicializacao do TFLite chama close() em delegates que podem ser null e vaza o descritor do modelo | `app/src/main/java/com/limelight/utils/Stereo3DRenderer.java:702` |
| 🟡 médio | security | DeviceUtils carrega 400 linhas de fingerprinting de dispositivo das quais so 3 metodos triviais sao usados | `app/src/main/java/com/limelight/utils/DeviceUtils.java:41` |
| ⚪ baixo | security | uniqueId do cliente gerado com java.util.Random em vez de SecureRandom | `app/src/main/java/com/limelight/computers/IdentityManager.java:58` |
| ⚪ baixo | bug | Parse do SPS H.264 indexa o buffer da rede sem checar tamanho | `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1904` |
| ⚪ baixo | bug | ShortcutTrampoline usa WoL do computer errado e pode passar macAddress null | `app/src/main/java/com/limelight/ShortcutTrampoline.java:111` |
| ⚪ baixo | bug | parseArtFileData pode lancar NPE nao capturada e retorna dados parciais apos erro | `app/src/main/java/com/limelight/ShortcutTrampoline.java:318` |
| ⚪ baixo | security | FileProvider expoe files-path '.' — a mesma raiz onde vive client.key | `app/src/main/res/xml/provider_file_paths.xml:15` |
| ⚪ baixo | security | Chave RI do stream aparece em logcat nas builds de debug | `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:530` |
| ⚪ baixo | maintainability | Referencias estaticas a Activity em Game e ExternalDisplayControlActivity | `app/src/main/java/com/limelight/Game.java:144` |
| ⚪ baixo | performance | PerformanceDataTracker cria um ExecutorService por instancia e nunca faz shutdown | `app/src/main/java/com/limelight/utils/PerformanceDataTracker.java:32` |
| ⚪ baixo | bug | OverlaySharedPreferences faz casts nao verificados sobre dados desserializados por Gson | `app/src/main/java/com/limelight/profiles/ProfilesManager.java:212` |
| ⚪ baixo | performance | ArtemisApplication faz I/O de arquivo e parse Gson na main thread durante o startup | `app/src/main/java/com/limelight/ArtemisApplication.java:13` |

### Detalhe

#### 🔴 crítico Chave privada do cliente, uniqueid e banco de hosts entram no backup de nuvem e no device-transfer

**Local:** `app/src/main/AndroidManifest.xml:48` · **Categoria:** security

`android:allowBackup="true"` esta ativo e as duas regras de backup excluem apenas o dominio `sharedpref`: `backup_rules.xml:4` (`<exclude domain="sharedpref" path="."/>`) e `backup_rules_s.xml` (mesma exclusao em `cloud-backup` e `device-transfer`). Como `AndroidCryptoProvider` grava `files/client.key` em PKCS#8 DER puro (AndroidCryptoProvider.java:61-62,:181) e `IdentityManager` grava `files/uniqueid` (IdentityManager.java:15,:61), e como `ComputerDatabaseManager` cria `databases/computers4.db` com os certificados fixados dos hosts (ComputerDatabaseManager.java:26,:49,:129), todos esses artefatos sao copiados para o Google Drive do usuario e transferidos em uma migracao de aparelho. A chave privada e a unica credencial de autenticacao do cliente contra o host: quem a obtem se autentica como esse cliente pareado, sem PIN. O comentario nas regras ('Don't sync preferences because it often contains device-specific data') mostra que a intencao era o oposto do efeito. Ironicamente, o que foi excluido (preferencias) e o que menos importa, e o que ficou incluido (chave privada) e o que mais importa.

**Correção sugerida:** Excluir explicitamente os artefatos de identidade em ambos os arquivos de regra: em `backup_rules.xml`, adicionar `<exclude domain="file" path="client.key"/>`, `<exclude domain="file" path="client.crt"/>`, `<exclude domain="file" path="uniqueid"/>` e `<exclude domain="database" path="computers4.db"/>`; replicar em `backup_rules_s.xml` dentro de `<cloud-backup>` e `<device-transfer>`. Alternativa mais forte: mover a chave privada para o Android Keystore (`KeyGenParameterSpec` com `setUserAuthenticationRequired(false)` e alias dedicado) — mas isso exige um caminho de migracao, porque o par existente precisa continuar valido para os hosts ja pareados; sem migracao o usuario perde todos os pareamentos.

#### 🟠 alto ContentProvider exportado sem permissao permite path traversal e leitura do cache por qualquer app

**Local:** `app/src/main/java/com/limelight/PosterContentProvider.java:34` · **Categoria:** security

O provider e declarado `android:exported="true"` sem `android:permission` e sem `grantUriPermissions` (AndroidManifest.xml:61-66). `openFile()` calcula `sUriMatcher.match(uri)` e entao chama `openBoxArtFile(uri, mode)` **nos dois ramos** (:37-41), tornando o matcher completamente inerte — inclusive o `sUriMatcher.addURI(AUTHORITY, BOXART_PATH, BOXART_URI_ID)` (:31) sequer casaria com uma URI de tres segmentos. Em seguida, `openBoxArtFile` (:44) passa o segmento `uuid` cru para `DiskAssetLoader.getFile` (DiskAssetLoader.java:146), que delega a `CacheHelper.openPath` (CacheHelper.java:16-31) — este concatena componentes com `new File(f, component)` sem qualquer normalizacao contra `..`. Um app malicioso resolve `content://poster.com.limelight.noir/boxart/..%2F..%2Fqualquer%2Fdir/0` e le qualquer arquivo `<inteiro>.png` acessivel ao processo. Mesmo sem traversal, o provider ja expoe todo o cache de box art a qualquer app instalado, revelando quais jogos e quais hosts (UUID) o usuario tem — vazamento de perfil de uso. Alem disso, `Integer.parseInt(appId)` (:57) nao esta protegido: uma URI com appId nao numerico lanca `NumberFormatException` que se propaga pelo binder e derruba o processo do app.

**Correção sugerida:** Tres correcoes no mesmo arquivo: (1) em `openFile`, retornar `null`/lancar `FileNotFoundException` quando `match != BOXART_URI_ID`, e registrar o padrao correto `sUriMatcher.addURI(AUTHORITY, BOXART_PATH + "/*/#", BOXART_URI_ID)`; (2) validar o segmento uuid com `UUID.fromString(uuid)` dentro de try/catch antes de usa-lo, e envolver `Integer.parseInt(appId)` em try/catch lancando `FileNotFoundException`; (3) canonicalizar o resultado com `file.getCanonicalPath().startsWith(cacheDir.getCanonicalPath() + File.separator)` antes de abrir. Independentemente disso, avaliar trocar `exported="true"` por `exported="false"` + `grantUriPermissions="true"` e conceder a URI via `Intent.FLAG_GRANT_READ_URI_PERMISSION` no `PreviewProgram` — o launcher de TV suporta esse modelo e ele elimina o acesso irrestrito. Endurecer `CacheHelper.openPath` para rejeitar componentes contendo `..` ou `/` beneficia todos os chamadores.

#### 🟠 alto PcView exportada aceita pin/passphrase por Intent e dispara pareamento automatico sem confirmacao

**Local:** `app/src/main/java/com/limelight/PcView.java:255` · **Categoria:** security

`PcView` e `android:exported="true"` por ser a activity LAUNCHER (AndroidManifest.xml:91-95). Em `onCreate` ela le `hostname`, `port`, `pin` e `passphrase` diretamente dos extras do Intent (:257-260) e, se os tres ultimos estiverem presentes, arma `pendingPairingAddress` (:263). O listener de polling em `startComputerUpdates` (:307-319) chama `doPair(details, pendingPairingPin, pendingPairingPassphrase)` assim que um host online bater com aquele endereco — **sem nenhum dialogo de confirmacao**, porque a confirmacao existe apenas em `AddComputerManually` (:378-391), que fica fora desse caminho. Qualquer app instalado (sem permissao nenhuma) pode `startActivity` em `PcView` com esses extras e forcar o cliente a executar um pareamento — uma operacao que altera estado de seguranca (fixa um certificado de servidor e concede acesso de streaming). Encadeado com o deep link `art://` (AndroidManifest.xml:186-191), uma pagina web consegue: adicionar um host controlado pelo atacante (uma confirmacao, cujo texto exibe um `name` fornecido pelo proprio atacante em `AddComputerManually.java:371-380`) e, na sequencia, parear automaticamente com PIN e passphrase que o atacante conhece — sem segunda confirmacao. Alem disso, `new ComputerDetails.AddressTuple(hostname, port)` (:263) lanca `IllegalArgumentException` para `port <= 0` (ComputerDetails.java:23-25), ou seja, um Intent com `port=0` derruba a activity de lancamento do app.

**Correção sugerida:** Exigir confirmacao explicita do usuario antes de qualquer `doPair` originado de Intent externo: em `PcView.onCreate`, so armar `pendingPairingAddress` apos um `AlertDialog` que mostre host, porta e a origem (`getReferrer()`), com botao afirmativo neutro (nao default). Melhor ainda: mover a leitura desses extras para uma activity dedicada nao-launcher com `exported="false"`, e fazer `AddComputerManually` inicia-la via Intent explicito — assim nenhum app de terceiros alcanca esse caminho. Independentemente, envolver a construcao de `AddressTuple` em try/catch e validar `port` em `1..65535` antes.

#### 🟠 alto AccessibilityService declara leitura de conteudo de tela para uma funcao que so precisa filtrar teclas

**Local:** `app/src/main/res/xml/keyboard_accessibility_service.xml:8` · **Categoria:** security

O XML de configuracao declara `android:canRetrieveWindowContent="true"`, `android:accessibilityFlags="flagDefault|flagRequestFilterKeyEvents|flagRetrieveInteractiveWindows"` e sete tipos de evento (`typeWindowContentChanged`, `typeViewFocused`, `typeViewClicked`, ...) **sem restringir `android:packageNames`**. Isso e o que o Android usa para montar o dialogo de consentimento: o usuario ve o aviso de 'controle total do dispositivo / ler o conteudo da tela'. O codigo real so precisa de `onKeyEvent` para reencaminhar teclas fisicas ao stream (KeyboardAccessibilityService.java:22-49); `onAccessibilityEvent` esta vazio (:64-66). Em runtime, `onServiceConnected` (:52-61) reduz o escopo — `info.packageNames = { BuildConfig.APPLICATION_ID }` e `info.flags = FLAG_REQUEST_FILTER_KEY_EVENTS` apenas — mas isso e tardio e nao altera a capacidade concedida nem o que o usuario autorizou. Ha ainda uma incoerencia: `info.eventTypes = AccessibilityEvent.TYPES_ALL_MASK` (:56) pede todos os eventos para um callback que nao faz nada, e `feedbackType = FEEDBACK_SPOKEN` (:59) declara feedback falado que o servico nao produz. Alem do risco tecnico, isso e um problema pratico de distribuicao: a politica de Accessibility API do Google Play exige justificativa para servicos com esse escopo.

**Correção sugerida:** Reduzir o XML ao minimo funcional: `android:accessibilityEventTypes="typeWindowStateChanged"` (ou nenhum), `android:accessibilityFlags="flagRequestFilterKeyEvents"`, remover `android:canRetrieveWindowContent`, remover `flagRetrieveInteractiveWindows` e adicionar `android:packageNames="com.limelight"` (o applicationId com sufixo do flavor). Em `onServiceConnected`, trocar `info.eventTypes = TYPES_ALL_MASK` por `AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED` e `feedbackType` por `FEEDBACK_GENERIC`. Documentar no dialogo/tela de ajuda por que o servico e necessario, ja que o usuario vera um aviso assustador de qualquer forma.

#### 🟠 alto Downgrade silencioso para HTTP em texto claro quando o certificado fixado nao confere

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:359` · **Categoria:** security

Em `getServerInfo(boolean)`, uma `SSLHandshakeException` cuja causa e `CertificateException` — exatamente o sintoma de um MITM apresentando outro certificado — e convertida em um `HostHttpResponseException(401, "Server certificate mismatch")` sintetico (:361-365), e o handler logo abaixo (:375-379) refaz a requisicao `serverinfo` sobre `baseUrlHttp`, isto e, **HTTP sem TLS**, sem avisar o usuario. O comentario diz que a intencao e permitir reparear quando o host trocou de certificado, mas o efeito colateral e que um atacante na rede que apenas apresente um certificado invalido forca o cliente a falar em claro. O `serverinfo` obtido nesse caminho alimenta decisoes sensiveis: `PairStatus` (ComputerDetails.java:79), `HttpsPort` (NvHTTP.java:652), `ExternalIP`/`LocalIP` e `appversion` — que por sua vez escolhe SHA-1 vs SHA-256 no pareamento (PairingManager.java:190-199). Um atacante que consiga esse downgrade pode responder `appversion` com major < 7 e empurrar o pareamento para SHA-1. A `network_security_config.xml` permite cleartext globalmente (`cleartextTrafficPermitted="true"`, sem `domain-config`), entao nada na plataforma barra isso.

**Correção sugerida:** Nao fazer o fallback automatico: propagar o erro e mostrar ao usuario um dialogo especifico ('o certificado deste host mudou — se voce nao reinstalou o host, isso pode ser um ataque'), exigindo acao explicita para limpar o cert fixado e reparear (o unico caso legitimo). Em `PairingManager.pair`, recusar o hash SHA-1 quando o host ja foi visto anteriormente com major >= 7 (guardar a versao junto do cert em `ComputerDatabaseManager`). Na `network_security_config.xml`, manter `cleartextTrafficPermitted` apenas onde e inevitavel: o pareamento HTTP em IPs de LAN nao pode ser restrito por dominio, mas vale documentar isso em um comentario no XML para que ninguem 'conserte' o arquivo sem entender.

#### 🟡 médio Falha de verificacao de assinatura do servidor (MITM detectado) e reportada como 'Pairing failed' generico

**Local:** `app/src/main/java/com/limelight/nvstream/http/PairingManager.java:282` · **Categoria:** ux

`verifySignature(serverSecret, serverSignature, serverCert)` falhando significa que a resposta nao foi assinada pela chave do certificado que o host apresentou — o codigo inclusive comenta `// Looks like a MITM` (:286). Mas o retorno e `PairState.FAILED`, o mesmo valor usado quando o host responde `paired != 1` em quatro pontos distintos do handshake (:233,:256,:273,:305,:312). Em `PcView.doPair` (:522-528), `FAILED` vira `R.string.pair_fail` = "Pairing failed" (strings.xml:61) ou, se ha jogo rodando, `R.string.pair_pc_ingame`. O usuario nunca fica sabendo que uma verificacao criptografica falhou. O mesmo padrao aparece no fluxo de erro em geral: `ServerHelper.doQuit` mostra `e.getMessage()` cru em Toast (:215,:225,:240), `PcView.doPair` faz `message = e.getMessage()` para `XmlPullParserException | IOException` (:556), e `ShortcutTrampoline.parseArtFileData` monta a mensagem com string hardcoded em ingles `"Error reading .art file: " + e.getMessage()` (:347) — violando a regra do CLAUDE.md de que strings vao para `strings.xml`. `ServerHelper.java:210-212` tem outra string longa hardcoded em ingles.

**Correção sugerida:** Adicionar `PairState.SIGNATURE_MISMATCH` ao enum (PairingManager.java:30-36), retorna-lo em :287, e tratar em `PcView.doPair` com uma string nova do tipo `pair_signature_mismatch` ("O host respondeu com uma assinatura invalida. Isso pode indicar um ataque na rede — verifique se voce esta conectado ao host certo."). Separar tambem os `FAILED` por etapa (getservercert / clientchallenge / serverchallengeresp / clientpairingsecret) para que o log e a mensagem indiquem onde parou. Extrair as strings hardcoded de `ServerHelper.java:210-212` e `ShortcutTrampoline.java:347` para `res/values/strings.xml`.

#### 🟡 médio ComputerDatabaseManager aberto e nunca fechado em ShortcutTrampoline

**Local:** `app/src/main/java/com/limelight/ShortcutTrampoline.java:360` · **Categoria:** bug

`ComputerDatabaseManager dbManager = new ComputerDatabaseManager(this);` e uma variavel local em `onCreate`; o construtor abre o banco (`c.openOrCreateDatabase`, ComputerDatabaseManager.java:49) e roda tres migracoes legadas (`initializeDb`, :62-82). `dbManager.close()` nunca e chamado, em nenhum dos multiplos `return` antecipados (:409,:422,:459,:476,:498) nem no caminho feliz. Cada lancamento de atalho vaza uma conexao SQLite aberta, com o `SQLiteDatabase` finalizer emitindo o warning 'A SQLiteConnection object for database was leaked'. Ha um agravante: `dbManager` so e usado no ramo `hostUUID == null || hostUUID.isEmpty()` (:414) — na maioria dos lancamentos o banco e aberto, migrado e vazado sem nem ser consultado. E toda essa I/O acontece na main thread de `onCreate`.

**Correção sugerida:** Envolver em try-with-resources (`ComputerDatabaseManager` ja tem `close()`, so precisa implementar `Closeable`), ou mover a criacao para dentro do ramo `if (hostUUID == null || hostUUID.isEmpty())` com `try { ... } finally { dbManager.close(); }`. Como a leitura so serve para resolver nome->UUID, considerar move-la para o `ComputerManagerBinder` (que ja mantem a lista em memoria via `getComputer`), eliminando o acesso a disco na main thread.

#### 🟡 médio initViews continua reagendando a si mesmo apos finish(), vazando a Activity indefinidamente

**Local:** `app/src/main/java/com/limelight/utils/ExternalDisplayControlActivity.java:148` · **Categoria:** bug

O bloco de retry em `initViews()` esta assim: `if (Game.instance == null) { if (failCount > 10) { Toast...; finish(); } handler.postDelayed(this::initViews, 500); failCount++; return; }` (:149-158). Falta um `return` dentro do `if (failCount > 10)`: apos exibir o Toast e chamar `finish()`, o codigo **ainda executa o `postDelayed`**. Como `Game.instance` continua null (a Activity ja esta finalizando), o ciclo se repete a cada 500 ms para sempre, e cada agendamento mantem viva uma referencia forte a Activity destruida via o method reference `this::initViews` — vazamento permanente de Activity mais um wakeup a cada meio segundo. O `handler` e um campo de instancia (`new Handler(Looper.getMainLooper())`, :72) e `onDestroy` (:215-218) so faz `instance = null`, sem `handler.removeCallbacksAndMessages(null)`.

**Correção sugerida:** Adicionar `return;` logo apos `finish();` na linha 152, e em `onDestroy` chamar `handler.removeCallbacksAndMessages(null)` antes de `instance = null`. Vale tambem checar `isFinishing() || isDestroyed()` no inicio de `initViews` para abortar retries pendentes.

#### 🟡 médio Reflexao desnecessaria para ler um campo publico e chamada de metodo que nao existe, ambas com catch(Throwable ignored)

**Local:** `app/src/main/java/com/limelight/Game.java:674` · **Categoria:** maintainability

Dois casos no mesmo bloco. (1) Linhas 677-682 leem `forceTightThresholds` de `prefConfig` via `getClass().getDeclaredField("forceTightThresholds")` + `setAccessible(true)` + `f.get(prefConfig)`, dentro de `catch (Throwable ignored) {}`. O campo e `public boolean forceTightThresholds = false;` em `PreferenceConfiguration.java:233` — acessivel diretamente, como o proprio codigo faz dez linhas abaixo com `prefConfig.preferLowerDelays` (:692). A reflexao nao adiciona nada e converte qualquer renomeacao futura em uma feature que desliga em silencio. (2) Linhas 928-931 fazem `SurfaceView.class.getMethod("setFrameRate", float.class, int.class)` — `android.view.SurfaceView` **nao possui** esse metodo; quem possui e `android.view.Surface` (API 30), usado corretamente em `Game.java:3821` e `MediaCodecDecoderRenderer.java:2417`. O `getMethod` sempre lanca `NoSuchMethodException`, engolido pelo `catch (Throwable ignored)`: o bloco inteiro (incluindo a deteccao de MTK em :917-926) e codigo morto que ninguem percebe. Esse padrao se repete: 9 `catch (Throwable ignored) {}` so em `Game.java` (:682,:684,:688,:705,:900,:901,:902,:913,:931,:934) e 8 em `MediaCodecDecoderRenderer.java`, num total de 86 catches genericos em 24 arquivos.

**Correção sugerida:** Substituir :677-682 por `boolean forceTight = prefConfig != null && prefConfig.forceTightThresholds;`. Em :928-931, trocar por `streamSurfaceView.getHolder().getSurface().setFrameRate(...)` guardado por `Build.VERSION.SDK_INT >= Build.VERSION_CODES.R` (o bloco ja esta dentro dessa checagem em :905) — ou remover o bloco, ja que `Game.java:3821` faz a mesma coisa corretamente. Como regra de higiene, trocar `catch (Throwable ignored) {}` por `catch (Throwable t) { LimeLog.warning("...: " + t); }` nos pontos onde a falha muda comportamento: um catch silencioso em codigo de decoder e exatamente o que a regra `.claude/rules/decoder.md` alerta que esconde regressao.

#### 🟡 médio openUriForWrite vaza o OutputStream e descarta a excecao com uma chamada sem efeito

**Local:** `app/src/main/java/com/limelight/utils/FileUriUtils.java:64` · **Categoria:** bug

`openUriForWrite` abre `context.getContentResolver().openOutputStream(uri)` (:71) e chama `write`/`flush`/`close` em sequencia sem `finally` (:73-75): se `write` ou `flush` lancar, o stream nunca fecha e o descritor vaza. Pior, o `catch (Exception e)` (:77-79) contem apenas `e.getLocalizedMessage();` — uma expressao cujo valor e descartado, ou seja, o erro desaparece por completo, sem log, sem rethrow, e a funcao retorna `false` sem qualquer rastro. `openOutputStream` tambem pode retornar `null`, o que dispararia um NPE capturado pelo mesmo catch mudo. O irmao `openUriForRead` (:21-62) fecha os tres streams mas em blocos `finally` aninhados na ordem errada (fecha `reader` antes de `bufferedReader`, :39-59), o que na pratica funciona mas e ruido; `writerFileString` (:83) tem o mesmo padrao.

**Correção sugerida:** Reescrever com try-with-resources: `try (OutputStream out = context.getContentResolver().openOutputStream(uri)) { if (out == null) return false; out.write(content.getBytes(StandardCharsets.UTF_8)); return true; } catch (IOException e) { LimeLog.warning("openUriForWrite failed: " + e); return false; }`. Aplicar o mesmo tratamento em `openUriForRead` e `writerFileString`, e usar `StandardCharsets.UTF_8` explicito em vez de `getBytes()` com charset da plataforma.

#### 🟡 médio GetStringUTFChars sem checagem de NULL e envio de CESU-8 em vez de UTF-8 no caminho de texto

**Local:** `app/src/main/jni/moonlight-core/simplejni.c:127` · **Categoria:** bug

`Java_com_limelight_nvstream_jni_MoonBridge_sendUtf8Text` faz `const char* utf8Text = (*env)->GetStringUTFChars(env, text, NULL); LiSendUtf8TextEvent(utf8Text, strlen(utf8Text));` (:128-129) sem verificar se o retorno e NULL — a JNI pode devolver NULL em OOM, e `strlen(NULL)` e crash nativo imediato. O mesmo padrao aparece em `findExternalAddressIP4` (:152), `testClientConnectivity` (:185) e `stringifyPortFlags` (:206). Ha um segundo problema, mais relevante para a feature de teclado do dono do fork: `GetStringUTFChars` devolve **UTF-8 modificado (CESU-8)**, nao UTF-8 real. Caracteres fora do BMP (emoji, por exemplo) sao codificados em Java como par surrogate e saem como duas sequencias de 3 bytes cada, o que e invalido em UTF-8. `LiSendUtf8TextEvent` repassa esses bytes ao host, e o Sunshine/Apollo espera UTF-8 valido — o resultado e texto corrompido no host. O lado Java ja fatia corretamente em `Game.enqueueCommitText` usando `text.getBytes(StandardCharsets.UTF_8)` (Game.java:4318), ou seja, a fronteira JNI desfaz a codificacao correta que o Java produziu.

**Correção sugerida:** Duas mudancas. (1) Checar NULL apos cada `GetStringUTFChars` e retornar cedo (nas funcoes com retorno, devolver o valor de erro apropriado). (2) Para o texto, parar de usar `GetStringUTFChars`: mudar a assinatura de `MoonBridge.sendUtf8Text` para receber `byte[]` ja codificado em UTF-8 real pelo Java (`text.getBytes(StandardCharsets.UTF_8)`) e usar `GetByteArrayElements`/`GetArrayLength` no lado C, liberando com `ReleaseByteArrayElements(..., JNI_ABORT)`. Isso elimina o CESU-8 e o `strlen`. Atencao a regra `.claude/rules/jni-boundary.md`: alterar os dois lados e rodar `node tools/codemap/jni-check.mjs` e `node tools/codemap/codemap.mjs`.

#### 🟡 médio Fallback de inicializacao do TFLite chama close() em delegates que podem ser null e vaza o descritor do modelo

**Local:** `app/src/main/java/com/limelight/utils/Stereo3DRenderer.java:702` · **Categoria:** bug

A cadeia GPU->NNAPI->CPU tem dois defeitos. (1) No `catch` do bloco GPU, a primeira instrucao e `gpuDelegate.close()` (:704) — mas se a excecao veio de `new GpuDelegate(gpuOptions)` (:697), `gpuDelegate` ainda e null e o `close()` lanca NPE **de dentro do catch**, que nao e capturado e escapa. O mesmo vale para `nnApiDelegate.close()` (:713) se `new NnApiDelegate()` (:706) falhar. Em dispositivos sem delegate GPU — justamente o caso que o fallback existe para cobrir — o app quebra em vez de cair para CPU. (2) `loadModelFile` (:746-753) abre `AssetFileDescriptor` e `FileInputStream` e retorna o `MappedByteBuffer` sem fechar nenhum dos dois; como a funcao e chamada ate quatro vezes na cadeia de fallback (:701,:708,:716,:739), sao ate quatro descritores vazados por inicializacao. Ha ainda um bug de log: o catch interno imprime `e.getMessage()` do erro externo, nao `exception.getMessage()` (:712).

**Correção sugerida:** Guardar os `close()` com null-check (`if (gpuDelegate != null) { gpuDelegate.close(); gpuDelegate = null; }`), envolver cada `close()` em try/catch proprio, e corrigir a variavel no log da linha 712. Em `loadModelFile`, usar try-with-resources: `try (AssetFileDescriptor fd = context.getAssets().openFd(modelPath); FileInputStream in = new FileInputStream(fd.getFileDescriptor())) { return in.getChannel().map(READ_ONLY, fd.getStartOffset(), fd.getDeclaredLength()); }` — o `MappedByteBuffer` sobrevive ao fechamento do canal. Melhor ainda: carregar o modelo uma unica vez e reutilizar o buffer entre as tentativas.

#### 🟡 médio DeviceUtils carrega 400 linhas de fingerprinting de dispositivo das quais so 3 metodos triviais sao usados

**Local:** `app/src/main/java/com/limelight/utils/DeviceUtils.java:41` · **Categoria:** security

Uma varredura por `DeviceUtils.<metodo>` em todo o codigo retorna apenas `getModel` (2 usos), `getManufacturer` (1) e `getSDKVersionName` (1). O restante e codigo morto que le identificadores persistentes e estado de seguranca do dispositivo: `getAndroidID` (:91, le `Settings.Secure.ANDROID_ID`), `getMacAddress` (:109 e :147, le o MAC de hardware do Wi-Fi), `isDeviceRooted` (:41, sonda 11 caminhos por um binario `su`), `isAdbEnabled` (:60), `isDevelopmentSettingsEnabled` (:405), `isEmulator` (:326) e `readCpuInfo` (:380, que faz `new ProcessBuilder({"/system/bin/cat", "/proc/cpuinfo"}).start()` e nunca chama `process.destroy()` nem fecha `getErrorStream`/`getOutputStream` — vazamento de descritores se algum dia for chamado). ANDROID_ID e MAC sao identificadores persistentes na taxonomia de Data Safety do Google Play: a mera presenca desse codigo em um APK ja e material para revisao de politica, e um leitor do codigo nao consegue distinguir 'nao usamos' de 'usamos em algum lugar que nao achei'. `getMacAddress` inclusive esta anotado `@RequiresPermission(allOf = {ACCESS_WIFI_STATE, CHANGE_WIFI_STATE})` (:108), e `CHANGE_WIFI_STATE` **nao esta declarada** no AndroidManifest — se alguem chamar, ganha `SecurityException`.

**Correção sugerida:** Reduzir `DeviceUtils` aos tres metodos efetivamente usados (`getModel`, `getManufacturer`, `getSDKVersionName`) e apagar o resto. Se algum for necessario no futuro, reintroduzir individualmente com justificativa. Isso remove ~370 linhas, elimina a leitura de dois identificadores persistentes e um `ProcessBuilder` do binario, e simplifica a declaracao de Data Safety.

#### ⚪ baixo uniqueId do cliente gerado com java.util.Random em vez de SecureRandom

**Local:** `app/src/main/java/com/limelight/computers/IdentityManager.java:58` · **Categoria:** security

`generateNewUniqueId` usa `String.format((Locale)null, "%016x", new Random().nextLong())`. `java.util.Random` e um LCG de 48 bits semeado por padrao com o relogio — dois clientes iniciados no mesmo milissegundo produzem o mesmo id, e um observador que veja um id consegue inferir os proximos de um mesmo processo. Esse valor vai em toda requisicao HTTP como parametro `uniqueid` (NvHTTP.java:479) e e o que o host usa para distinguir clientes. Nao e credencial de autenticacao — quem autentica e o certificado — mas colisao entre clientes causa confusao de estado de pareamento no host, e a previsibilidade permite a um observador da LAN forjar requisicoes `serverinfo` com o id de outro cliente. O contraste dentro do proprio codebase e evidente: `PairingManager.generatePinString` (:176-181) e `generateRandomBytes` (:90-95) usam `SecureRandom` corretamente, e `AndroidCryptoProvider` tambem (:116).

**Correção sugerida:** Trocar `new Random()` por `new SecureRandom()` na linha 58. A mudanca e compativel: ids ja gravados continuam sendo lidos por `loadUniqueId` (:33), so os novos mudam de fonte de entropia.

#### ⚪ baixo Parse do SPS H.264 indexa o buffer da rede sem checar tamanho

**Local:** `app/src/main/java/com/limelight/binding/video/MediaCodecDecoderRenderer.java:1904` · **Categoria:** bug

`int startSeqLen = decodeUnitData[2] == 0x01 ? 3 : 4;` acessa o indice 2 de um array cujo conteudo e tamanho vem do host pela rede, sem verificar `decodeUnitData.length >= 3`. Um SPS truncado (host com bug, corrupcao no caminho, ou host hostil) causa `ArrayIndexOutOfBoundsException` na thread de decode. Logo depois, `H264Utils.readSPS(spsBuf)` (:1911) entrega o bitstream ao jcodec 0.2.5 — biblioteca sem manutencao desde 2018 — que nao tem contrato documentado de robustez contra entrada malformada e pode lancar `RuntimeException`/`BufferUnderflowException`. A chamada nao esta em try/catch: o comentario acima dela afirma que `readSPS` 'safely handles Annex B NALUs' (:1909-1910), o que cobre escape sequences, nao entrada truncada. O impacto e crash do app durante o stream (negacao de servico), nao execucao de codigo — o parse e todo em Java.

**Correção sugerida:** Adicionar guarda antes da linha 1904: `if (decodeUnitData.length < 5) { LimeLog.warning("SPS truncado (" + decodeUnitData.length + " bytes), descartando"); return MoonBridge.DR_NEED_IDR; }` e envolver `H264Utils.readSPS`/`writeSPS` (:1911,:2023,:2195) em try/catch de `Exception` que loga e pede um novo IDR em vez de propagar. Considerar tambem se jcodec ainda se justifica: o uso e restrito a ler/reescrever o SPS, e um parser proprio de algumas dezenas de linhas eliminaria uma dependencia sem manutencao no caminho de dados da rede.

#### ⚪ baixo ShortcutTrampoline usa WoL do computer errado e pode passar macAddress null

**Local:** `app/src/main/java/com/limelight/ShortcutTrampoline.java:111` · **Categoria:** bug

A condicao testa `details.macAddress != null` mas a chamada usa outro objeto: `WakeOnLanSender.sendWolPacket(computer)` (:114), onde `computer` e o campo da classe preenchido em :77 por `managerBinder.getComputer(uuidString)`. Os dois podem divergir — `details` vem fresco do polling, `computer` e o snapshot em memoria. Se `computer.macAddress` for null, `createWolPayload` (WakeOnLanSender.java:131) chama `macStringToBytes(null)` (:133), que faz `new Scanner(null)` (:117) e lanca `NullPointerException`. A NPE ocorre dentro do `try` que so captura `IOException` (:112-124), entao escapa para a thread de callback do `ComputerManagerListener` e derruba o app durante o lancamento de um atalho. A checagem de nulidade e a chamada precisam operar sobre o mesmo objeto.

**Correção sugerida:** Trocar a linha 114 para `WakeOnLanSender.sendWolPacket(details);` (o objeto cujo `macAddress` foi verificado). Como defesa em profundidade, adicionar em `WakeOnLanSender.createWolPayload` uma checagem `if (computer.macAddress == null) throw new IOException("No MAC address for " + computer.name);` — assim o erro vira `IOException`, que o chamador ja trata.

#### ⚪ baixo parseArtFileData pode lancar NPE nao capturada e retorna dados parciais apos erro

**Local:** `app/src/main/java/com/limelight/ShortcutTrampoline.java:318` · **Categoria:** bug

O try-with-resources inicializa `InputStream inputStream = getContentResolver().openInputStream(fileUri)` e, na mesma clausula, `new InputStreamReader(inputStream)` (:318-319). `openInputStream` pode retornar `null` (provider externo que nao consegue abrir a URI), e `new InputStreamReader(null)` lanca `NullPointerException` — que **nao** e capturada pelo `catch (IOException e)` (:343) e escapa de `onCreate`, derrubando a activity. Como o intent-filter aceita `scheme content`/`file` com `mimeType */*` de qualquer app (AndroidManifest.xml:119-128), a URI vem de fonte nao confiavel. Alem disso, quando o `IOException` e capturado, o metodo exibe um dialogo mas **retorna `artData` mesmo assim** (:350) — o mapa parcialmente preenchido com as linhas lidas antes do erro — e `onCreate` prossegue com `artData != null` (:376), operando sobre dados truncados de um arquivo que ja se sabe invalido.

**Correção sugerida:** Separar a abertura do stream: `InputStream in = getContentResolver().openInputStream(fileUri); if (in == null) { mostrar erro; return null; }` e so entao o try-with-resources sobre `in`. Trocar `catch (IOException e)` por `catch (IOException | RuntimeException e)` e, dentro do catch, `return null` em vez de cair no `return artData` — deixando `onCreate` no caminho de erro ja existente (:376).

#### ⚪ baixo FileProvider expoe files-path '.' — a mesma raiz onde vive client.key

**Local:** `app/src/main/res/xml/provider_file_paths.xml:15` · **Categoria:** security

O `provider_file_paths.xml` declara cinco raizes com `path="."`, incluindo `<files-path name="files" path="."/>` (que e exatamente `getFilesDir()`, onde `AndroidCryptoProvider` grava `client.key` e `client.crt`, AndroidCryptoProvider.java:61-62) e `<external-path name="external" path="."/>` (raiz do armazenamento externo). Na pratica, o `FileProvider` so concede acesso a URIs explicitamente geradas por `getUriForFile` — hoje sao duas: o log de performance em `getCacheDir()` (StreamSettings.java:793-800) e o JSON de teclado em `getExternalCacheDir()` (:827-840). Ou seja, nao ha exposicao ativa. O problema e de defesa em profundidade: qualquer codigo futuro que chame `getUriForFile` com um caminho parcialmente controlado por entrada externa passa a poder compartilhar a chave privada, e nada no arquivo de configuracao sinaliza esse risco. Relacionado: o export de teclado grava em `getExternalCacheDir()` (:827), diretorio legivel por outros apps em versoes antigas do Android — dado pouco sensivel (layout de teclado), mas desnecessario.

**Correção sugerida:** Restringir as raizes ao minimo real: remover `files-path` e `external-path` do XML, manter apenas `<cache-path name="cache" path="logs/"/>` e `<external-cache-path name="external_cache" path="export_settings/"/>`, ajustando os dois chamadores para gravar nesses subdiretorios. Mover tambem o export de teclado de `getExternalCacheDir()` para `getCacheDir()`, ja que ele e compartilhado via FileProvider e nao precisa estar no armazenamento externo.

#### ⚪ baixo Chave RI do stream aparece em logcat nas builds de debug

**Local:** `app/src/main/java/com/limelight/nvstream/http/NvHTTP.java:530` · **Categoria:** security

`openHttpConnectionToString` loga a URL completa quando `verbose` e o path nao e `serverinfo`: `LimeLog.info(getCompleteUrl(baseUrl, path, query) + " -> " + respString)` (:530-532). `verbose` e `BuildConfig.DEBUG` (:76), entao isso so ocorre em debug. Porem a URL de `launchApp` (:878-893) carrega `rikey=` + `bytesToHex(context.riKey.getEncoded())` — a chave AES-128 que cifra o canal de controle do stream — e `rikeyid=`. Em uma build de debug, essa chave e o corpo inteiro da resposta vao para o logcat, legivel por qualquer processo com permissao de leitura de log no dispositivo de desenvolvimento. A URL de `pair` (:799-802) tambem e logada, incluindo o certificado do cliente em hexadecimal. Nao afeta usuarios de release, mas afeta qualquer um que rode a build de debug (`Diana`) — inclusive o dono do fork durante desenvolvimento.

**Correção sugerida:** Redigir parametros sensiveis antes de logar: criar um helper que substitua os valores de `rikey` e `clientcert` por `<redacted>` na `HttpUrl` antes do `LimeLog.info`, ou simplesmente logar apenas `baseUrl + path` sem a query. Aplicar o mesmo tratamento na linha 537 (caminho de erro).

#### ⚪ baixo Referencias estaticas a Activity em Game e ExternalDisplayControlActivity

**Local:** `app/src/main/java/com/limelight/Game.java:144` · **Categoria:** maintainability

`public static Game instance;` (Game.java:144) e `public static ExternalDisplayControlActivity instance;` (ExternalDisplayControlActivity.java:62, com `@SuppressLint("StaticFieldLeak")` reconhecendo o problema) mantem a Activity acessivel globalmente. Ambos sao anulados em `onDestroy` (Game.java:1705; ExternalDisplayControlActivity.java:217), entao o vazamento nao e permanente no caminho normal — mas `Game.onDestroy` chama `super.onDestroy()` **antes** da limpeza (:1703), e se qualquer instrucao entre :1706 e :1742 lancar (por exemplo `inputCaptureProvider.destroy()` com o campo null), o resto da limpeza nao roda; `instance` ja foi anulado, mas os wifi locks (:1718-1723) e o `unbindService` (:1737) ficariam pendurados. O padrao tambem cria acoplamento global: `KeyboardAccessibilityService` (:27,:32,:35,:40,:43), `StartExternalDisplayControlReceiver` (:45,:47,:49,:51) e `ExternalDisplayControlActivity` (:149,:191,:192) todos dependem de `Game.instance` sem qualquer garantia de ciclo de vida — cada acesso e um NPE em potencial se a Activity for destruida entre a checagem e o uso.

**Correção sugerida:** No minimo, trocar por `WeakReference<Game>` e mover `super.onDestroy()` para o fim de `Game.onDestroy` com a limpeza envolvida em try/finally. A solucao estrutural e substituir o acesso global por um `LocalBroadcastManager`/`Flow` de eventos ou um binder de servico, mas isso e refatoracao de porte medio (Game.java tem fan-out 44) e merece um ADR.

#### ⚪ baixo PerformanceDataTracker cria um ExecutorService por instancia e nunca faz shutdown

**Local:** `app/src/main/java/com/limelight/utils/PerformanceDataTracker.java:32` · **Categoria:** performance

`private final ExecutorService executorService = Executors.newSingleThreadExecutor();` e um campo de instancia, e a classe e instanciada com `new PerformanceDataTracker()` em tres pontos: `Game.java:1836` (ao final de cada sessao de stream), `StreamSettings.java:734` e `:777`. Nenhum chamador guarda a referencia nem chama `shutdown()`. Cada instancia cria uma thread nao-daemon que fica viva ate o processo morrer. No caso do `Game.java:1836` isso significa uma thread vazada por sessao de streaming. A thread fica ociosa (nao consome CPU), mas mantem viva a pilha e, via o lambda `saveToPreferences(context, ...)` (:49-50), uma referencia ao `Context` passado — que em `Game.java:1836` provavelmente e a Activity.

**Correção sugerida:** Tornar `executorService` estatico e compartilhado (`private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor(r -> { Thread t = new Thread(r, "perf-log"); t.setDaemon(true); return t; });`), ou dar `shutdown()` apos o `execute` em `savePerformanceStatistics`. Passar `context.getApplicationContext()` no lambda para nao segurar a Activity.

#### ⚪ baixo OverlaySharedPreferences faz casts nao verificados sobre dados desserializados por Gson

**Local:** `app/src/main/java/com/limelight/profiles/ProfilesManager.java:212` · **Categoria:** bug

`OverlaySharedPreferences` sobrepoe as preferencias reais com um `Map<String, Object>` vindo de `profiles.json` via Gson (`ProfilesData` desserializado em :80). Gson mapeia JSON generico para `Double`, `String`, `Boolean` e `ArrayList` — nunca `Integer`, `Long`, `Float` ou `Set`. Os metodos fazem casts diretos: `(String) patch.get(key)` (:225), `(Boolean) patch.get(key)` (:241) e `(Set<String>) patch.get(key)` (:246). O ultimo e garantidamente errado para qualquer preferencia do tipo string-set — Gson entrega `ArrayList`, e o cast lanca `ClassCastException`. `getInt/getLong/getFloat` se salvam porque castam para `Number` (:229,:233,:237). Como o snapshot em `EditProfileActivity.java:121` copia `getAll()` inteiro das preferencias padrao, basta existir uma preferencia string-set no app para que um perfil salvo e recarregado quebre na leitura. O `load()` (:49) captura `Exception` (:93) e retorna false, mas os casts acontecem depois, na leitura, fora de qualquer try — e `ArtemisApplication.onCreate` (:13) so trata a falha de carregamento, nao a de leitura.

**Correção sugerida:** Tornar os getters defensivos: verificar `instanceof` antes de cada cast e cair no `base.getX(key, defValue)` quando o tipo nao bate. Para `getStringSet`, aceitar tambem `Collection<?>` e converter (`new HashSet<>(...)` com `String.valueOf` em cada elemento). Adicionar um teste Robolectric que faca round-trip de um perfil por Gson e leia todos os tipos de preferencia.

#### ⚪ baixo ArtemisApplication faz I/O de arquivo e parse Gson na main thread durante o startup

**Local:** `app/src/main/java/com/limelight/ArtemisApplication.java:13` · **Categoria:** performance

`onCreate` chama `profilesManager.load(this)` de forma sincrona, que abre `files/profiles/profiles.json` com `FileReader` e desserializa com Gson (ProfilesManager.java:77-87). `Application.onCreate` roda na main thread antes de qualquer Activity: o custo entra direto no tempo de cold start, e como o arquivo contem um snapshot completo das preferencias (`EditProfileActivity.java:121` copia `getAll()`), ele cresce com a quantidade de perfis. Em dispositivos lentos ou com armazenamento degradado isso e um ANR em potencial no pior caso, e sempre um atraso mensuravel no melhor. Alem disso, `Toast.makeText(...)` na falha (:14) e chamado de `Application.onCreate`, quando nao ha janela — em algumas versoes do Android o Toast nao aparece.

**Correção sugerida:** Carregar preguicosamente: manter `ProfilesManager.getInstance()` mas so ler o arquivo na primeira chamada de `getActive()`/`getProfiles()`, ou disparar o `load` em um executor de background e bloquear apenas quem realmente precisar do resultado. Substituir o Toast por `LimeLog.warning` e reportar o erro na primeira tela que use perfis.


## Ideias de melhoria

### Blindar o backup: excluir chave privada, uniqueid e banco de hosts

**Tamanho:** quick-win

**Por quê:** E a correcao com maior reducao de risco por linha alterada em todo o repositorio. Hoje a chave privada do cliente vai para o Google Drive do usuario. Duas linhas em dois arquivos XML fecham o buraco, sem tocar em codigo Java e sem risco de regressao funcional.

**Como:** Editar `app/src/main/res/xml/backup_rules.xml` adicionando `<exclude domain="file" path="client.key"/>`, `<exclude domain="file" path="client.crt"/>`, `<exclude domain="file" path="uniqueid"/>` e `<exclude domain="database" path="computers4.db"/>` ao lado do exclude existente. Replicar as mesmas exclusoes em `app/src/main/res/xml/backup_rules_s.xml` dentro de `<cloud-backup>` e `<device-transfer>`. Os nomes vem de `AndroidCryptoProvider.java:61-62`, `IdentityManager.java:15` e `ComputerDatabaseManager.java:26`. Verificar com `adb shell bmgr backupnow com.limelight.noir` seguido de inspecao do conjunto de backup.

**Risco:** Praticamente nulo. O unico efeito visivel e que um usuario que restaure um backup precisara reparear os hosts — comportamento correto e, na pratica, ja e o que acontece hoje porque `sharedpref` (que carrega parte do estado) ja e excluido.

### Fechar os vazamentos de recurso pontuais ja mapeados

**Tamanho:** quick-win

**Por quê:** Cinco correcoes independentes, cada uma de poucas linhas, todas com localizacao exata e sem ambiguidade de design. Sao o tipo de divida que nunca vira prioridade sozinha mas que degrada o app silenciosamente ao longo de uma sessao longa.

**Como:** (1) `ShortcutTrampoline.java:360`: fechar o `ComputerDatabaseManager` (ou move-lo para dentro do ramo que o usa, :414). (2) `FileUriUtils.java:64-81`: try-with-resources e substituir `e.getLocalizedMessage();` por um log de verdade. (3) `Stereo3DRenderer.java:702-722`: null-check nos `close()` dos delegates e corrigir a variavel do log em :712; `loadModelFile` (:746) com try-with-resources. (4) `ExternalDisplayControlActivity.java:152`: adicionar `return;` apos `finish()` e `handler.removeCallbacksAndMessages(null)` em `onDestroy` (:215). (5) `PerformanceDataTracker.java:32`: executor estatico com thread daemon. Cada uma pode ser um commit separado.

**Risco:** Minimo. O unico que pede atencao e (4): confirmar que nenhum outro caminho depende do retry continuo de `initViews` — a leitura do codigo indica que nao, mas vale testar conectando e desconectando um display externo durante um stream ativo.

### Fechar a superficie exportada: PosterContentProvider, PcView e o par art:// + pin/passphrase

**Tamanho:** small

**Por quê:** Sao tres achados de severidade alta que compartilham a mesma raiz — componentes exportados aceitando entrada sem validacao nem confirmacao. Corrigi-los juntos evita tres rodadas de revisao e mantem o raciocinio de seguranca em um lugar so.

**Como:** (1) `PosterContentProvider.java:34-41`: fazer `openFile` respeitar o `UriMatcher`, registrar o padrao `boxart/*/#`, validar o uuid com `UUID.fromString` e canonicalizar o caminho contra `getCacheDir()` antes de abrir; envolver `Integer.parseInt` (:57) em try/catch. (2) `CacheHelper.openPath` (CacheHelper.java:16): rejeitar componentes com `..` ou separador de caminho — beneficia tambem `DiskAssetLoader`. (3) `PcView.java:255-267`: exigir um `AlertDialog` de confirmacao (mostrando host, porta e `getReferrer()`) antes de armar `pendingPairingAddress`, e envolver `new ComputerDetails.AddressTuple(hostname, port)` em try/catch. Adicionar testes Robolectric que chamem o provider com URIs maliciosas e que iniciem `PcView` com extras forjados.

**Risco:** O fluxo de deep link `art://?pin=&passphrase=` ganha um dialogo a mais — pode incomodar quem usa QR code de pareamento do Apollo. Mitigar deixando o dialogo com texto curto e botao afirmativo em destaque. O canal de TV (`TvChannelHelper.java:148`) precisa ser testado em um dispositivo Android TV real depois da mudanca no provider, porque o launcher resolve a URI a partir de outro processo.

### Corrigir a fronteira JNI do envio de texto: byte[] UTF-8 real em vez de GetStringUTFChars

**Tamanho:** small

**Por quê:** Ataca diretamente a dor numero 2 do dono do fork (enviar texto inteiro pela conexao). Hoje o caminho funciona para ASCII e corrompe qualquer coisa fora do BMP, porque `GetStringUTFChars` devolve CESU-8 e o host espera UTF-8. Alem disso remove um `strlen(NULL)` em potencial. Sem essa correcao, o campo de texto tipo AnyDesk vai funcionar ate o primeiro emoji.

**Como:** Mudar `MoonBridge.sendUtf8Text(String)` (MoonBridge.java:396) para `sendUtf8Text(byte[] utf8)`; em `NvConnection.sendUtf8Text` (:619-621) passar `text.getBytes(StandardCharsets.UTF_8)`. No lado C (simplejni.c:127-131), trocar `GetStringUTFChars`/`strlen` por `GetByteArrayElements` + `GetArrayLength`, com `ReleaseByteArrayElements(..., JNI_ABORT)` em todos os caminhos, e checar NULL. Aproveitar para adicionar checagem de NULL nos outros tres `GetStringUTFChars` (:152,:185,:206). `Game.enqueueCommitText` (:4314-4329) ja fatia em bytes UTF-8, entao pode passar os blocos direto sem reconverter para String. Seguir `.claude/rules/jni-boundary.md`: alterar os dois lados, rodar `node tools/codemap/jni-check.mjs` e depois `node tools/codemap/codemap.mjs`.

**Risco:** Erro de assinatura JNI nao e pego pelo compilador e quebra em runtime no meio do stream — por isso o `jni-check.mjs` e obrigatorio. Os testes Robolectric nao exercitam esse caminho (`ShadowMoonBridge` anula o carregamento nativo), entao a validacao precisa ser manual, com um host real, testando ASCII, acentos e emoji.

### Enxugar DeviceUtils e o AccessibilityService ao escopo realmente usado

**Tamanho:** small

**Por quê:** Duas fontes independentes de exposicao desnecessaria que se resolvem por deducao, nao por construcao. `DeviceUtils` tem ~370 linhas mortas que leem ANDROID_ID, MAC e estado de root; o AccessibilityService pede leitura de conteudo de tela para reencaminhar teclas. Ambos aparecem em revisao de politica do Google Play e ambos assustam quem le o codigo pela primeira vez.

**Como:** Em `DeviceUtils.java`, manter apenas `getModel()` (:283), `getManufacturer()` (:273) e `getSDKVersionName()` (:72) — confirmados como os unicos usados por varredura de `DeviceUtils.` no codigo — e apagar o restante, incluindo `readCpuInfo` (:380) com seu `ProcessBuilder`. Em `res/xml/keyboard_accessibility_service.xml`, remover `canRetrieveWindowContent`, remover `flagRetrieveInteractiveWindows`, reduzir `accessibilityEventTypes` a `typeWindowStateChanged` e adicionar `android:packageNames`. Em `KeyboardAccessibilityService.onServiceConnected` (:52-61), trocar `TYPES_ALL_MASK` por o mesmo tipo unico e `FEEDBACK_SPOKEN` por `FEEDBACK_GENERIC`.

**Risco:** Baixo em `DeviceUtils` (codigo comprovadamente nao chamado). No AccessibilityService, o risco real e que a reducao de flags quebre a captura de teclas em algum aparelho — `flagRequestFilterKeyEvents` e o que importa e permanece, mas convem testar em um tablet Xiaomi (o caso citado no comentario da linha 30) e em um dispositivo com teclado fisico antes de publicar.

### Varrer os catch silenciosos e remover a reflexao cargo-cult de Game.java

**Tamanho:** medium

**Por quê:** Sao 86 catches genericos em 24 arquivos, e ja se sabe que pelo menos um esconde codigo morto completo (`SurfaceView.setFrameRate`, que nao existe). A regra `.claude/rules/decoder.md` avisa que regressao invisivel e o modo de falha caracteristico desse subsistema; catch silencioso e exatamente o mecanismo que a torna invisivel. Fazer a varredura de uma vez cria uma linha de base para o lint reclamar dali em diante.

**Como:** Comecar pelos casos ja identificados: `Game.java:677-682` (trocar reflexao por `prefConfig.forceTightThresholds` direto), `Game.java:928-931` (remover o bloco ou usar `getHolder().getSurface().setFrameRate` como em :3821), e os 8 `catch (Throwable ignored)` de `MediaCodecDecoderRenderer.java` (:1171,:1191,:1223,:1240,:1245,:1486,:1491,:1494). Regra de decisao: se o catch cobre uma chamada de API opcional por dispositivo, manter mas logar via `LimeLog.warning`; se cobre logica propria, deixar a excecao subir. Em seguida, adicionar `EmptyCatchBlock` ao `app/lint.xml` como erro para impedir reintroducao. Usar `docs/maps/HOTSPOTS.md` para priorizar os arquivos com maior concentracao.

**Risco:** Deixar excecoes subirem onde antes eram engolidas pode revelar crashes que estavam mascarados em dispositivos especificos — o que e o objetivo, mas exige uma janela de teste com os aparelhos da errata (`decoder-errata.txt`) antes de release. Fazer em PRs pequenos por arquivo, nunca em um unico commit gigante.

### Controle e transparencia da sincronizacao de clipboard

**Tamanho:** medium

**Por quê:** O clipboard e o dado mais sensivel que o app move: gerenciadores de senha colocam credenciais ali. Hoje, com `smartClipboardSync` ligado, todo ganho de foco da janela envia o clipboard local inteiro ao host (`Game.java:2233-2243` -> `:2304`), sem filtro e sem indicacao de que ocorreu (o toast e opcional, `smartClipboardSyncToast`). O default e `false` (`PreferenceConfiguration.java:199`), o que e a decisao certa — mas quem liga a opcao nao tem como saber o que esta sendo enviado. Isso ganha peso quando o campo de texto tipo AnyDesk existir, porque colar sera o fluxo natural.

**Como:** Tres camadas. (1) Respeitar a flag de sensibilidade: em `getClipboardContent` (`Game.java:2246`), checar `clipDescription.getExtras().getBoolean("android.content.extra.IS_SENSITIVE")` (API 33+) e `ClipDescription.EXTRA_IS_SENSITIVE`, e nunca enviar clipboard marcado como sensivel — gerenciadores de senha marcam. (2) Trocar o envio automatico no foco por envio explicito: manter `getClipboard` (host->cliente) automatico, mas exigir acao do usuario para `sendClipboard` (cliente->host), que ja existe no menu (`GameMenu.java:295-296`). (3) Verificar a permissao do host antes de tentar: `ComputerDetails.permission` ja carrega os bits `clipboard_set`/`clipboard_read` (documentados em `ComputerDetails.java:187-188`) e hoje nao sao consultados — checar evita requisicoes inuteis contra hosts que nao autorizam.

**Risco:** Mudar o envio automatico para manual e regressao de conveniencia para quem usa a feature hoje. Mitigar com uma sub-preferencia ('enviar automaticamente ao focar' vs 'somente pelo menu'), com o padrao no modo manual. A checagem de `IS_SENSITIVE` depende da versao do Android e do gerenciador de senha cooperar — e defesa parcial, nao garantia.

### Testes de regressao para os caminhos de entrada nao confiavel

**Tamanho:** medium

**Por quê:** Quase todos os achados de seguranca deste relatorio estao em codigo que processa entrada externa (URIs de provider, deep links, arquivos .art, JSON de perfil, XML do host, SPS da rede) e nenhum deles tem teste. Sao exatamente os caminhos onde uma correcao silenciosamente regride, porque ninguem exercita entrada malformada manualmente. A infraestrutura ja existe: Robolectric 4.16 e JUnit 4.13.2 estao no `build.gradle` e `./gradlew test` roda sem emulador.

**Como:** Criar uma suite `app/src/test/java/com/limelight/security/` com casos derivados dos achados: (1) `PosterContentProviderTest` — URIs com `..`, appId nao numerico, contagem de segmentos errada. (2) `AddComputerManuallyTest`/`PcViewTest` — Intents com `port=0`, `port=-1`, `hostname` vazio, `pin` sem `passphrase`. (3) `ShortcutTrampolineTest` — arquivos .art truncados, com linhas invalidas, e `openInputStream` devolvendo null (via ShadowContentResolver). (4) `ProfilesManagerTest` — round-trip Gson lendo todos os tipos de preferencia, incluindo string-set. (5) `NvHTTPTest` — XML do host malformado, `status_code` fora da faixa, `HttpsPort` nao numerico, aproveitando que `getXmlString`/`getXmlArray` sao estaticos e testaveis isoladamente. Rodar via `./gradlew test`, conforme a definicao de pronto do CLAUDE.md.

**Risco:** Baixo — sao testes novos, nao alteram producao. O unico atrito e que alguns exigem Shadows do Robolectric (ContentResolver, PackageManager) que podem exigir configuracao em `robolectric.properties`. Comecar pelos casos puramente estaticos (`NvHTTP`, `ProfilesManager`, `CacheHelper`), que nao precisam de shadow nenhum, e so depois avancar para os que instanciam componentes Android.

### EPIC — Camada de confianca explicita: fim do downgrade silencioso e visibilidade do estado TLS

**Tamanho:** large

**Por quê:** O cliente hoje toma tres decisoes de seguranca em silencio: cai para HTTP quando o certificado nao confere (`NvHTTP.java:359-379`), aceita qualquer hostname para o certificado fixado (`:161-174`), e colapsa 'MITM detectado' em 'Pairing failed' (`PairingManager.java:282-287`). Nenhuma delas e visivel ao usuario. Para quem usa Vibeshine com display virtual em rede domestica o risco pratico e baixo, mas o custo de nao ter essa camada aparece no dia em que o host trocar de certificado e ninguem souber distinguir isso de um ataque.

**Como:** Introduzir um `TrustState` por host, persistido em `ComputerDatabaseManager` junto do certificado (nova coluna: data do pareamento, fingerprint SHA-256, versao major do servidor observada). Fase 1 — remover o fallback automatico de `getServerInfo` (:375-379) e substituir por uma excecao tipada `ServerCertificateChangedException` que a UI trata com um dialogo dedicado ('o certificado deste host mudou'), com acao explicita de 'confiar no novo certificado' que limpa o pin e refaz o pareamento. Fase 2 — adicionar `PairState.SIGNATURE_MISMATCH` e mensagem propria em `PcView.doPair` (:522-528). Fase 3 — recusar downgrade de hash: se a versao major persistida for >= 7, nao aceitar SHA-1 em `PairingManager.pair` (:192-199). Fase 4 — expor o fingerprint do host na tela de detalhes (ja existe `ComputerDetails.toString()` usado pelo DebugInfoActivity) para que o usuario possa comparar com o que o Apollo/Vibeshine mostra.

**Risco:** Mudanca de comportamento visivel: hosts que legitimamente trocam de certificado (reinstalacao do Sunshine/Apollo, container recriado) passam a exigir acao do usuario onde antes reconectavam sozinhos. Isso e correto do ponto de vista de seguranca mas e uma regressao de conveniencia — precisa de texto de dialogo muito claro. Requer migracao de schema do SQLite (nova coluna), o que significa mais um `LegacyDatabaseReader` ou um `ALTER TABLE` idempotente em `initializeDb`.

### EPIC — Mover a identidade criptografica do cliente para o Android Keystore

**Tamanho:** epic

**Por quê:** Corrige a categoria inteira do problema em vez do sintoma: hoje a chave privada e um arquivo em disco legivel por qualquer processo com root, extraivel por backup e copiavel por qualquer ferramenta de dump de dados de app. Com o Keystore, a chave passa a ser nao-exportavel e as operacoes de assinatura acontecem dentro do TEE. E o unico caminho que torna irrelevante uma futura regressao nas regras de backup ou um novo componente exportado.

**Como:** Fase 1 — introduzir uma segunda implementacao de `LimelightCryptoProvider` (a interface ja existe em `nvstream/http/LimelightCryptoProvider.java`) baseada em `KeyPairGenerator.getInstance("RSA", "AndroidKeyStore")` com `KeyGenParameterSpec` (PURPOSE_SIGN, sem autenticacao de usuario, alias fixo). O certificado autoassinado continua gerado por BouncyCastle, mas assinado por um `ContentSigner` que delega ao `Signature` do Keystore. Fase 2 — `PlatformBinding.getCryptoProvider` escolhe a implementacao Keystore quando `Build.VERSION.SDK_INT >= 23` e um novo par ainda nao existe. Fase 3 — migracao: manter o par em arquivo funcionando para hosts ja pareados (a chave existente nao pode ser importada no Keystore de forma nao-exportavel), e oferecer na UI um 'regenerar identidade' que gera a nova chave no Keystore e exige reparear. Fase 4 — depois de uma versao de convivencia, apagar o caminho de arquivo. `NvHTTP.initializeHttpState` (:114-128) nao precisa mudar: o `X509KeyManager` ja obtem a chave pela interface.

**Risco:** Alto e concentrado na migracao. `minSdk` e 21, entao o caminho legado precisa continuar existindo para API 21-22. Chaves do Keystore sao perdidas em alguns cenarios (restauracao de fabrica parcial, troca de lock screen em versoes antigas do Android) — o app precisa detectar `KeyPermanentlyInvalidatedException`/`UnrecoverableKeyException` e guiar o usuario ao repareamento em vez de crashar. Exige um ADR em `docs/adr/` antes de comecar, porque muda o contrato de identidade do cliente com todos os hosts ja pareados.


## Glossário

- TOFU (Trust On First Use): modelo de confianca adotado no pareamento — o certificado que o host apresenta na primeira vez e memorizado (`http.setServerCert`, PairingManager.java:246; persistido em ComputerDatabaseManager.java:129) e passa a ser exigido byte-a-byte nas conexoes seguintes. Nao ha CA; a autenticidade da primeira conexao vem do PIN digitado pelo usuario.
- Certificate pinning por igualdade de objeto: em `NvHTTP.checkServerTrusted` (:138-157) o cliente primeiro tenta a cadeia de CAs do sistema e, se falhar, compara `certs[0].equals(serverCert)`. Nao ha comparacao de fingerprint nem validacao de cadeia — e igualdade de certificado inteiro.
- PairState: enum de resultado do pareamento (PairingManager.java:30-36) com cinco valores — NOT_PAIRED, PAIRED, PIN_WRONG, FAILED, ALREADY_IN_PROGRESS. FAILED agrega causas muito diferentes, incluindo falha de verificacao de assinatura (possivel MITM).
- otpauth: extensao do fork ao protocolo de pareamento (PairingManager.java:213-227). Envia `SHA-256(pin + saltHex + passphrase)` em hexadecimal para permitir o pareamento por senha do Apollo, sem digitar o PIN no host. Ausente no protocolo GameStream original.
- plaincert: campo XML da resposta de `pair?phrase=getservercert` contendo o certificado do host em hexadecimal (PairingManager.java:73). Vem vazio quando outro cliente ja esta pareando, o que o codigo traduz em ALREADY_IN_PROGRESS.
- riKey / riKeyId: chave AES-128 e identificador gerados por conexao (`NvConnection.generateRiAesKey`, :74-86) e enviados ao host na URL de launch em hexadecimal (`NvHTTP.launchApp`, :884-885). Cifram o canal de controle de entrada do stream.
- uniqueId: identificador de cliente persistido em `files/uniqueid` (IdentityManager.java:15), enviado como query param em toda requisicao HTTP (`NvHTTP.getCompleteUrl`, :479). Nao e credencial de autenticacao — o certificado e — mas o host o usa para distinguir clientes.
- AESLightEngine em modo ECB: `PairingManager.performBlockCipher` (:139-151) cifra bloco a bloco sem IV e sem encadeamento, ou seja, ECB. E o modo exigido pelo protocolo GameStream original; mudar quebra a interoperabilidade com GFE/Sunshine/Apollo.
- Downgrade para cleartext: comportamento em `NvHTTP.getServerInfo` (:359-379) que refaz a requisicao `serverinfo` sobre HTTP puro quando a validacao TLS falha. Existe para permitir repareamento apos troca de certificado do host.
- cleartextTrafficPermitted: atributo em `res/xml/network_security_config.xml:3` que libera trafego HTTP sem TLS para qualquer destino. Necessario porque o pareamento GameStream ocorre na porta 47989 sem TLS, contra IPs arbitrarios de LAN que nao podem ser enumerados por dominio.
- allowBackup / fullBackupContent / dataExtractionRules: trio que controla o que entra no backup de nuvem e no device-transfer (AndroidManifest.xml:48-50). As regras atuais excluem apenas `sharedpref`, deixando `files/` e `databases/` inclusos.
- Exported component: componente alcancavel por outros apps. Neste repo sao `PosterContentProvider` (:61-66), `PcView` (:90-108), `ShortcutTrampoline` (:110-129) e `AddComputerManually` (:175-192). Os servicos (`DiscoveryService`, `ComputerManagerService`, `UsbDriverService`) e o `StartExternalDisplayControlReceiver` nao tem intent-filter e portanto nao sao exportados.
- Deep link art://: scheme proprietario registrado por `AddComputerManually` com categoria BROWSABLE (AndroidManifest.xml:186-191). Aceita host, porta e os query params `name`, `pin` e `passphrase`; e o unico caminho externo que passa por um dialogo de confirmacao.
- Arquivo .art: formato texto simples de atalho, uma chave por linha no formato `[chave] valor`, parseado por `ShortcutTrampoline.parseArtFileData` (:311-351). O intent-filter aceita qualquer mimeType via scheme content ou file.
- CESU-8 / UTF-8 modificado: codificacao que `GetStringUTFChars` devolve na JNI. Difere de UTF-8 real ao codificar caracteres fora do BMP como dois pares surrogate de 3 bytes cada. Relevante em `simplejni.c:127-131`, onde o texto do teclado e enviado ao host.
- commitText: metodo do `InputConnection` pelo qual o IME entrega texto pronto ao app (StreamView.java:142). E a base da feature de envio de texto inteiro; a preferencia `checkbox_enable_commit_text` nasce desligada (PreferenceConfiguration.java:208).
- smartClipboardSync: preferencia que sincroniza a area de transferencia com o host em cada mudanca de foco de janela (Game.java:2233-2243). Default `false` (PreferenceConfiguration.java:199); exige host Apollo, inativa em Sunshine/Vibeshine.
- IS_SENSITIVE: extra `android.content.extra.IS_SENSITIVE` colocada na `ClipDescription` (Game.java:2369) para que o sistema nao mostre previa do conteudo colado. O app a escreve ao receber clipboard do host, mas nao a le ao enviar.
- ComputerDetails.permission: bitmask de permissoes que o host Apollo envia no `serverinfo` (documentada em ComputerDetails.java:175-204). Cobre input, clipboard, arquivos, comandos de servidor e acoes. O cliente exibe mas nao consulta antes de agir.
- PollingTuple: par (ComputerDetails, Thread) mantido em memoria por `ComputerManagerService` (:61). E onde o certificado recem-pareado e escrito por `PcView.doPair` (:539) antes de o proximo poll persisti-lo no SQLite.
- LimelightCryptoProvider: interface (nvstream/http/LimelightCryptoProvider.java) que abstrai a origem do certificado e da chave privada do cliente. Ponto de extensao natural para uma implementacao baseada em Android Keystore.
- GWP-ASan: sampler de deteccao de corrupcao de heap nativo ativado por `android:gwpAsanMode="always"` (AndroidManifest.xml:55). Endurecimento ja presente no codigo nativo.
- Catch silencioso: padrao `catch (Throwable ignored) {}` — 86 ocorrencias de catch generico em 24 arquivos, concentradas em Game.java e MediaCodecDecoderRenderer.java. E o mecanismo pelo qual regressoes de decoder ficam invisiveis, conforme alerta `.claude/rules/decoder.md`.
