# MCP sunucusu

BombVault, Model Context Protocol (MCP) için yerleşik bir sunucu içerir. Bu protokol, Claude Code ve Claude Desktop gibi yapay zekâ asistanlarının dış araçlara ulaşmak için kullandığı protokoldür. Bu sunucu üzerinden bir asistan yedeklerinizin durumunu okuyabilir ve izin verirseniz bir yedekleme başlatabilir ya da kendi başlattığı bir yedeklemeyi iptal edebilir. Siz bir anahtar oluşturana kadar sunucu kapalıdır: etkin bir anahtar yokken `/mcp` uç noktası her şeye `404` ile yanıt verir.

## Bir asistanın yapabildikleri ve yapamadıkları {#tools}

| Araç | Ne yapar | Tür |
|---|---|---|
| `get_health` | Sürüm, örnek adı, bir yedeklemenin sürüp sürmediği ve bu anahtarın neye izni olduğu | okuma |
| `get_status` | Alan başına koruma durumu: son başarılı yedek, beklenen aralık, doğrulamalar ve off-site denetimleri, sıradaki zamanlanmış çalıştırmalar | okuma |
| `get_coverage` | BombVault'un neyi koruduğu ve neyi korumadığı, her biri için gerekçesiyle | okuma |
| `list_items` | Korunan her kapsayıcı, VM ve klasör kümesi, flash sürücü ve uygulama yapılandırması; zamanlama, bir yedeklemenin neyi durdurduğu, son yedek ve ne kadar sürdüğü ile; veritabanı kapsayıcıları son dökümlerini de gösterir; ZFS veri kümeleri de son denetimlerinin sonucuyla birlikte listelenir | okuma |
| `list_runs` | Çalıştırma geçmişi, en yeniler önce; alan, öğe, durum, tür ve zamana göre süzülebilir | okuma |
| `list_restore_points` | Bir öğenin birincil deposundaki geri yükleme noktaları, bir kapsayıcı için ayrıca veritabanı dökümleri; bir ZFS veri kümesinin her yedek için bir geri yükleme noktası vardır ve bu noktada altındaki her veri kümesinin anlık görüntüsü bulunur | okuma |
| `get_activity` | Şu anda neyin çalıştığı, aşama ve yüzdesiyle | okuma |
| `get_storage_stats` | Bir alanın birincil deposunun boyut geçmişi ve haftalık büyümesi | okuma |
| `list_anomalies` | BombVault'un yedeklerde fark ettiği anormallikler; duruma, önem derecesine ve alana göre süzülebilir, açık olanların özetiyle birlikte | okuma |
| `get_anomaly` | Bu bulgulardan biri, onaylanırken bırakılan notla birlikte | okuma |
| `start_backup` | Bir öğeyi hemen yedekler | başlatma |
| `start_domain_backup` | Bir alandaki korunan her öğeyi yedekler | başlatma |
| `start_backup_everything` | Backup Everything turunu çalıştırır | başlatma |
| `cancel_backup` | Bu anahtarın başlattığı, süren bir yedeklemeyi iptal eder | iptal |

Şunlar web arayüzünde kalır: her türlü geri yükleme (bir veritabanı dökümünü indirmek, kaydetmek ya da içe aktarmak dâhil), yedekleri silmek, prune, unlock, denetimler ve tatbikatlar, off-site çoğaltma, ayarlar, kimlik bilgileri ve MCP anahtarları ile zamanlamanın, web arayüzünün ya da başka bir anahtarın başlattığı bir yedeklemeyi iptal etmek. Bir anormalliği onaylamak ya da beklenen olarak işaretlemek de orada kalır; bu, **Anormallikler** sayfasında yapılır. Nedeni şu: araçların yanıtları sunucunuzdan gelen adları ve hata iletilerini içerir ve bunların herhangi biri asistanı yönlendirmek için yazılmış bir metin taşıyabilir. Böyle bir metne kanan bir asistan en kötü ihtimalle aşağıdaki sınırlar içinde bir yedekleme başlatabilir ya da kendi başlattığı bir yedeklemeyi iptal edebilir.

Bir öğenin birincil deposu başka bir yerdeyse (S3, REST, SFTP, rclone), `list_restore_points` ona bağlanır ve çağrı biraz sürebilir. Off-site kopyalar MCP üzerinden listelenemez. Anormallik denetimlerinin neye baktığı [Özellikler](features.md) sayfasında, bir ZFS öğesinin her veri kümesi için bir anlık görüntü tutması ise [ZFS veri kümeleri](zfs-datasets.md#contents) sayfasında anlatılır.

## Başlatılan bir yedekleme ne yapar {#starting-backups}

Bir asistanın başlattığı yedekleme, web arayüzünün başlattığı yedeklemenin aynısıdır. Çalışan bir kapsayıcı, yedeği bitene kadar, onunla birlikte durması ayarlanan kapsayıcılarla beraber durdurulur. "graceful" yöntemli bir VM kapatılır ve yeniden başlatılır. Bir ZFS veri kümesi, anlık görüntüsü alınırken kendisi için ayarlanan kapsayıcıları durdurur. Klasör kümeleri, flash sürücü ve yapılandırma çalışmaya devam eder. Ardından BombVault saklama politikasını uygular ve off-site depoya kopyalayabilir. `list_items`, asistana bir öğenin neyi durdurduğunu ve son yedeğinin ne kadar sürdüğünü söyler; araç açıklamaları da ondan bir şey başlatmadan önce bunu size söylemesini ister.

Bir yedekleme hizmetleri durdurduğu ve eski geri yükleme noktalarını dışarı ittiği için MCP üzerinden başlatmalar sınırlıdır:

- Anahtar başına saatte 12 başlatılmış yedekleme.
- Aynı öğenin, aynı alanın ya da Backup Everything'in iki MCP başlatması arasında 15 dakika.
- Aynı öğe için 24 saatte en fazla 4 MCP başlatması.
- **Saklama koruması.** Bir alan sabit sayıda geri yükleme noktası tuttuğunda (yalnızca "son N taneyi tut"; günlük, haftalık ya da aylık kural olmadan, yerelde ya da bir off-site hedefte), her yeni yedek en eskisini dışarı iter. BombVault bu durumda en yeni N-1 başarılı yedeğinin tamamı MCP üzerinden başlatılmış bir öğenin MCP başlatmasını reddeder. Böylece tutulan kümede her zaman zamanlamanın ya da sizin oluşturduğunuz en az bir geri yükleme noktası kalır. "Son 1 taneyi tut" ayarında bir asistan o öğeyi hiç yedekleyemez. Bir sonraki zamanlanmış yedekleme yeniden yer açar.

Bir alanın ya da Backup Everything'in başlatılması, bir sınırın geri tuttuğu öğeleri dışarıda bırakır ve yanıtında adlarını verir. Bu sınırların hiçbiri web arayüzünü ve zamanlamayı etkilemez. Saatlik kota bellekte tutulur, bu yüzden BombVault'un yeniden başlatılması onu sıfırlar.

## Açmak {#switch-on}

1. **Ayarlar, Sistem, MCP sunucusu** bölümünü aç ve istemcinin düğmesine tıkla. Listede olmayan bir istemci **Başka istemci** üzerinden bağlanır.
2. **Anahtar** altında **Yeni anahtar** seçimini ve önerilen adı, yani istemcinin adını bırak ya da anahtarın nerede kullanıldığını söyleyen bir ad yaz, örneğin "Dizüstündeki Claude Code". İstemci başına bir anahtar, diğerlerine dokunmadan birini iptal etmeni sağlar. **Mevcut anahtar** istemciye daha önce oluşturduğun bir anahtarı verir.
3. Yedekleme başlatabilmesi gereken bir anahtar için **Yedekleme başlatmaya izin ver** seçeneğini aç; açmazsan anahtar yalnızca okuyabilir. Bunu daha sonra anahtarın kutucuğunda değiştirebilirsin; değişiklik asistanın bir sonraki isteğinden itibaren, yeniden bağlanmadan geçerli olur.
4. **Anahtar oluştur** düğmesine tıkla. Anahtar bir kez gösterilir. BombVault yalnızca parmak izini saklar ve anahtarı bir daha gösteremez, bu yüzden şimdi kopyala. İstemci anahtarı kullanmadan pencereyi kapatırsan kart, kopyaladığını onaylayana kadar anahtarı göstermeye devam eder.

Giriş parolası yokken web arayüzünün kendisi ağınızdaki herkese açıktır ve onu açabilen herkes bir anahtar da oluşturabilir. Kart bunu söyler. BombVault'u herkese açık görünen bir adla açarsanız (örneğin bir ters vekil sunucunun arkasında `bombvault.example.com`) ve giriş parolası ayarlanmamışsa, o adresten anahtar oluşturulamaz ve değiştirilemez; böylece internetteki hiçbir web sayfası tarayıcınıza anahtar oluşturtamaz. Bir giriş parolası ayarlayın ya da BombVault'u IP adresiyle veya `tower` ya da `tower.local` gibi yerel bir adla açın.

## Anahtarlarınız ve günlükleri {#keys}

Her anahtarın kartta kendi kutucuğu vardır. Kutucuk anahtarın adını, yedekleme başlatabildiğini ya da yalnızca okuduğunu, anahtarın son dört karakterini, ne zaman oluşturulduğunu ya da en son değiştirildiğini, bir istemcinin onu en son ne zaman kullandığını ve bugün kaç çağrı yaptığını gösterir. Kutucuktan anahtarı yeniden adlandırır, iznini değiştirir, yenisiyle değiştirir ya da iptal edersiniz. İptal edilen anahtar iptal edilmiş anahtarlar listesine taşınır; geçmişteki hiçbir çalıştırma onu anmadığında oradan kalıcı olarak silebilirsiniz.

Kutucuk, adın yanında anahtarın oluşturulduğu istemcinin logosunu gösterir. **Başka istemci** üzerinden ya da kart istemcileri listelemeden önce oluşturulmuş bir anahtar bunun yerine bir anahtar simgesi gösterir.

Kutucuktaki **Günlük**, o anahtarın yaptıklarını açar. Önce başlattığı yedeklemeler gelir; her biri durumuyla ve panodaki etkinlik günlüğünde o çalıştırmaya giden bir bağlantıyla. Altında çağrıları vardır, en yenisi önce, aracı ve çağrının sonucuyla. Bir ret nedenini söyler: anahtar yalnızca okuyabilir, saklama koruması yedeklemeyi durdurdu, başka bir yedekleme zaten çalışıyordu, öğe birkaç dakika önce MCP üzerinden yedeklendi ya da anahtar çok fazla istek gönderdi. Bir iptal, ilgili çalıştırmaya bağlantı verir.

BombVault her anahtarın kayıtlarını en fazla 30 gün saklar: en yeni 500 başarılı başlatma ve iptali, bunların yanında da en yeni 200 diğer çağrıyı (okumalar, retler ve hatalar). Böylece süren bir yedeklemeyi tekrar tekrar sorgulayan ya da reddedilen bir çağrıyı tekrar tekrar deneyen bir asistan, o yedeklemenin başlatılmasını günlükten dışarı itemez. Her çağrı için aracı, sonucu ve bir iptalin andığı çalıştırmayı kaydeder. Asistanın gönderdiğini, anahtarı ya da parmak izini asla kaydetmez. Tanılama paketi kayıtları yalnızca sayar, ayar dışa aktarımı ise onları dışarıda bırakır.

## Bir istemci bağlamak {#clients}

Her istemcinin kartta, **Bu bilgisayarda** ya da **Bulutta** altında bir düğmesi vardır. Düğme üç adımlı bir pencere açar: anahtar; kartı açtığın adresle o istemcinin yapılandırması, kopyalama düğmesi, yapılandırmanın nerede durduğu ve BombVault'un kendi sertifikasıyla, istemcinin ona güvenmesi için gerekenler; ve istemcinin ilk çağrısının beklenmesi. Pencere anahtarın son kullanımını izler ve çağrı gelince yeşile döner.

Pencere anahtarı her komut satırından uzak tutar. İstemci anahtarı bir ortam değişkeninden (`BOMBVAULT_MCP_KEY`), gizli bir istemden ya da kendi dosyasından okuyabiliyorsa yapılandırma onu yalnızca anar. İstemcinin böyle bir yolu yoksa anahtar yapılandırma dosyasında ya da ayarlarında durur ve pencere bunu söyler. Bir istemcinin belgeleri tanımadığı bir sertifikaya nasıl davrandığını söylemiyorsa pencere o adımı, istemci BombVault'un sertifikasını reddederse ne yapılacağı olarak yazar.

| İstemci | Kurulum | Anahtarın geldiği yer |
|---|---|---|
| AnythingLLM | yapılandırma dosyası | yapılandırma dosyası |
| Antigravity | yapılandırma dosyası | ortam değişkeni |
| Claude Code | komut | anahtar dosyası |
| Claude Desktop | yapılandırma dosyası | yapılandırma dosyası |
| Cline | yapılandırma dosyası | yapılandırma dosyası |
| Codex CLI | yapılandırma dosyası | ortam değişkeni |
| Continue | yapılandırma dosyası | `~/.continue/.env` |
| Copilot CLI | yapılandırma dosyası | yapılandırma dosyası |
| Cursor | yapılandırma dosyası | ortam değişkeni |
| Gemini CLI | yapılandırma dosyası | ortam değişkeni |
| GitHub Copilot (VS Code) | yapılandırma dosyası | gizli istem |
| Goose | yapılandırma dosyası | ortam değişkeni |
| Jan | uygulamadaki form | uygulamanın ayarları |
| JetBrains (AI Assistant, Junie) | yapılandırma dosyası | yapılandırma dosyası |
| Kimi Code | yapılandırma dosyası | yapılandırma dosyası |
| LM Studio | yapılandırma dosyası | yapılandırma dosyası |
| Mistral Vibe | yapılandırma dosyası | ortam değişkeni |
| Msty | uygulamadaki form | uygulamanın ayarları |
| n8n | uygulamadaki form | n8n kimlik bilgileri |
| Open WebUI | uygulamadaki form | uygulamanın ayarları |
| opencode | yapılandırma dosyası | ortam değişkeni |
| Perplexity (Mac) | uygulamadaki form | anahtar dosyası |
| Qwen Code | yapılandırma dosyası | ortam değişkeni |
| Roo Code | yapılandırma dosyası | ortam değişkeni |
| Visual Studio | yapılandırma dosyası | yapılandırma dosyası |
| Warp | yapılandırma dosyası | yapılandırma dosyası |
| Windsurf | yapılandırma dosyası | ortam değişkeni |
| Zed | yapılandırma dosyası | yapılandırma dosyası |
| Grok | form, bulutta | sağlayıcının sunucuları |
| Le Chat | form, bulutta | sağlayıcının sunucuları |
| ChatGPT | bulutta | yalnızca OAuth, aşağıya bak |
| Claude (claude.ai) | bulutta | çoğu kuruluşta OAuth, aşağıya bak |

Aşağıdaki bölümler Claude Code ve Claude Desktop kurulumunu daha ayrıntılı anlatır ve diğer her istemcinin neye ihtiyaç duyduğunu listeler.

### Claude Code {#claude-code}

Claude Code BombVault'a, o bilgisayarda Node.js gerektiren `mcp-remote` üzerinden ulaşır. Önce anahtarı ayrı bir metin dosyasına tek satır olarak kaydedin:

```text
X-API-Key: <your key>
```

Ardından karttaki komutu, o dosyanın yolunu doldurarak bir terminalde bir kez çalıştırın. Bilgisayarınızın güvendiği bir sertifikayla şöyle görünür:

```bash
claude mcp add bombvault --scope user -- npx -y mcp-remote@latest https://bombvault.example.com/mcp --header-file "<path of the file with your key>"
```

BombVault'un kendi sertifikasıyla (bkz. [TLS ve sertifikalar](#tls)) komut ayrıca Node.js'i indirilen sertifikaya yönlendirir:

```bash
claude mcp add bombvault --scope user -e "NODE_EXTRA_CA_CERTS=<path of the downloaded bombvault-cert.pem>" -- npx -y mcp-remote@latest https://192.168.1.10:3443/mcp --header-file "<path of the file with your key>"
```

Bağlantıyı Claude Code içinde `/mcp` ile kontrol edin. `--scope user` BombVault'u tüm projelerinizde kullanılabilir yapar. Claude Code yalnızca anahtar dosyasının yolunu saklar; böylece anahtar ne komutta ve kabuk geçmişinizde, ne de süreç listesinde görünür. Dosyayı yalnızca sizin okuyabileceğiniz bir yerde ve commit ettiğiniz klasörlerin dışında tutun. `@latest`, `npx`'in güncel bir `mcp-remote` indirmesini sağlar; aksi halde global olarak kurulmuş daha eski bir sürüm kullanılır ve o sürüm `--header-file` seçeneğini tanımaz.

Claude Code için `mcp-remote` argümanlarına `${BOMBVAULT_MCP_KEY}` yazmayın. Claude Code böyle bir başvuruyu `mcp-remote`'u başlatmadan önce kendi ortamından doldurur; böylece anahtar o sürecin komut satırına düşer, orada bilgisayardaki diğer programlar ve kullanıcılar onu okuyabilir.

Node.js olmadan ve yalnızca bilgisayarınızın güvendiği bir sertifikayla Claude Code kendi başına bağlanabilir. Proje klasörüne bir `.mcp.json` koyun:

```json
{
  "mcpServers": {
    "bombvault": {
      "type": "http",
      "url": "https://bombvault.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${BOMBVAULT_MCP_KEY}"
      }
    }
  }
}
```

`BOMBVAULT_MCP_KEY` değişkenini Claude Code'un başladığı yerde ayarlayın, örneğin `~/.claude/settings.json` içindeki `"env"` altında ya da kabuk profilinizde; bunu istem satırına yazarak değil, bir metin düzenleyicide yapın. Burada başvuru güvenlidir, çünkü Claude Code anahtarın içine düşebileceği ikinci bir süreç başlatmaz. BombVault'un kendi sertifikası bu yolla çalışmaz: Claude Code'un kendi bağlantısı, `NODE_EXTRA_CA_CERTS` ayarlı olsa bile onu reddeder. Anahtarın açıkça yazıldığı bir `.mcp.json` dosyasını asla commit etmeyin.

### Claude Desktop {#claude-desktop}

Claude Desktop BombVault'a, o bilgisayarda Node.js gerektiren `mcp-remote` üzerinden ulaşır. Yapılandırma dosyasını Claude Desktop'ta **Settings, Developer, Edit Config** yoluyla açın. Dosya Windows'ta `%APPDATA%\Claude\claude_desktop_config.json`, macOS'ta `~/Library/Application Support/Claude/claude_desktop_config.json` konumundadır. Karttaki girdiyi `"mcpServers"` içine, orada zaten bulunan sunucuların yanına ekleyin ve Claude Desktop'u yeniden başlatın:

```json
{
  "mcpServers": {
    "bombvault": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://192.168.1.10:3443/mcp", "--header", "X-API-Key:${BOMBVAULT_MCP_KEY}"],
      "env": {
        "BOMBVAULT_MCP_KEY": "<your key>",
        "NODE_EXTRA_CA_CERTS": "<path of the downloaded bombvault-cert.pem>"
      }
    }
  }
}
```

- `NODE_EXTRA_CA_CERTS` yalnızca BombVault'un kendi sertifikası için oradadır. Bilgisayarınızın zaten güvendiği bir sertifikanın arkasında onu çıkarın.
- `--allow-http` yalnızca düz bir `http://` adresi için eklenir.
- Başlık, iki noktadan sonra boşluk olmadan ve anahtar `env` içinde olacak şekilde `X-API-Key:${BOMBVAULT_MCP_KEY}` olarak yazılır. Bazı sistemlerde `mcp-remote` bir `--header` değerini ilk boşlukta böler ve boşluktan sonra yazılan bir anahtar kaybolur.

### Buluttaki istemciler {#cloud-clients}

ChatGPT, claude.ai üzerindeki Claude, Grok ve Le Chat BombVault'u sağlayıcılarının sunucularından çağırır; bu yüzden BombVault herkesçe güvenilen bir sertifikayla internetten erişilebilir olmalı, örneğin bir ters proxy'nin arkasında; Le Chat kendinden imzalı sertifikaları reddeder. Proxy'deki bir oturum açma web arayüzünü koruyabilir, ama `/mcp` o olmadan BombVault'a kadar geçmeli: bu hizmetler bir proxy'de oturum açamaz ve anahtarlarını BombVault kendisi denetler. Grok ve Le Chat sabit bir anahtar gönderebilir ve düğmeleri onları diğerleri gibi kurar. ChatGPT yalnızca OAuth oturum açmasıyla bağlanır, claude.ai üzerindeki Claude ise sabit anahtarlı başlığı yalnızca bazı kuruluşlarda kabul eder. BombVault bir sonraki güncellemeyle OAuth oturum açma desteği alıyor; o zamana kadar düğmeleri kurulum sunmak yerine bunu söyler.

### Diğer istemciler {#other-clients}

Streamable HTTP konuşan her istemci olur:

- URL: web arayüzünün adresi artı `/mcp`, örneğin `https://192.168.1.10:3443/mcp`.
- Anahtar `Authorization: Bearer <key>` ya da `X-API-Key: <key>` içinde. İkisi birden gönderilirse aynı anahtarı taşımalıdır.
- `Content-Type: application/json` ve `Accept: application/json, text/event-stream` ile `POST`.
- İstek başına tek bir JSON-RPC iletisi; toplu istekler (batch) reddedilir.
- Protokol sürümleri 2026-07-28, 2025-11-25, 2025-06-18 ve 2025-03-26.

## TLS ve sertifikalar {#tls}

BombVault HTTPS'i kendi düzenlediği bir sertifikayla sunar ve başlangıçta bu sertifika yalnızca `localhost`, `127.0.0.1` ve `::1` adlarını içerir. Claude Code ve `mcp-remote` onu yerel ağ adresinde reddeder. Çözüm yolları, çoğu Unraid kurulumuna uyan sırayla:

1. **Adresi MCP kartına ekleyin.** Kartı sertifikanın içermediği bir adreste HTTPS ile açtığınızda kart bunu söyler ve **Bu adresi sertifikaya ekle** seçeneğini sunar. BombVault bunun üzerine sertifikasını o adresi de içerecek şekilde yeniden düzenler (tarayıcınız ilk seferdeki gibi bir kez daha uyarır). Ardından **Sertifikayı indir** düğmesine tıklayın; parçacıklar `NODE_EXTRA_CA_CERTS` değerini indirilen dosyaya ayarlar, böylece istemci tam olarak o sertifikaya güvenir. Bu aynı zamanda, daha önce indirilen bir dosyayla kurulmuş her istemcinin, sertifika yeniden düzenlendiği anda bu bilgisayarda ve diğer tüm bilgisayarlarda bağlanamaz hale geldiği anlamına gelir; yeni dosyayı alana kadar böyle kalır.
2. **Güvenilir sertifikalı bir ters vekil sunucu** (Nginx Proxy Manager, SWAG, Caddy, Traefik). İstemci bu durumda vekil sunucunun sertifikasını görür ve başka bir şeye ihtiyaç duymaz; kart da BombVault'un kendi sertifikası hakkında uyarmaz.
3. **Tailscale.** Kapsayıcının önündeki `tailscale serve` ya da Unraid'in Tailscale entegrasyonu size güvenilir sertifikalı bir `ts.net` adı verir.
4. **`HTTP_ONLY=true`**, yalnızca TLS'i sonlandıran bir vekil sunucunun arkasında ya da tamamen güvendiğiniz bir ağda. Tüm web arayüzünü düz HTTP'ye geçirir, kapsayıcı ayarlarında değişiklik gerektirir ve anahtarı şifrelemeden gönderir.

`NODE_TLS_REJECT_UNAUTHORIZED=0` değerini asla ayarlamayın. Bu, o Node.js işleminin konuştuğu her şey için sertifika denetimini kapatır.

Bir ters vekil sunucu `Authorization` (ya da `X-API-Key`) başlığını iletmelidir; vekil sunucular aksi söylenmedikçe bunu yapar. Ayrıca `/mcp` yolunu arabelleğe almamalı ve yeniden yazmamalıdır. Nginx ya da Nginx Proxy Manager için BombVault'un sertifikasını da denetleyen bir location bloğu:

```nginx
location /mcp {
    proxy_pass https://192.168.1.10:3443;
    proxy_ssl_verify on;
    proxy_ssl_trusted_certificate /data/bombvault-cert.pem;
    proxy_ssl_name localhost;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_set_header Host $host;
}
```

Bir vekil sunucunun arkasında her istek vekil sunucunun adresini taşır. Yanlış yapılandırılmış tek bir istemciden gelen beş yanlış anahtar, o vekil sunucunun arkasındaki bütün MCP istemcilerini bir dakika dışarıda bırakır. Sayımın istemci başına yapılması için vekil sunucuyu `TRUSTED_PROXY` içinde belirtin (bkz. [Yapılandırma](configuration.md)).

## Güvenlik modeli {#security}

- Etkin bir anahtar yokken `/mcp` `404` ile yanıt verir.
- Hiçbir adres muaf değildir. `localhost`, Unraid ana makinesi, bir ters vekil sunucu ya da `tailscale serve` üzerinden gelen istekler de diğerleri gibi anahtar ister; web arayüzünün giriş parolası olmasa bile.
- Anahtarlar yalnızca parmak izi olarak saklanır, bir kez gösterilir; yeniden adlandırılabilir, değiştirilebilir ve iptal edilebilir. En fazla 10 etkin anahtar, her birinin kendi **Yedekleme başlatmaya izin ver** anahtarıyla.
- Her oluşturma, değiştirme, izin değişikliği ve iptal, bildirimler kapalı değilse, geldiği adresle birlikte bildirim kanallarınız üzerinden bir bildirim gönderir.
- Adres başına dakikada 5 yanlış anahtar, ardından `429`. Anahtar başına dakikada 120 istek ve saatte 12 başlatılmış yedekleme; bunlara yukarıdaki bekleme süresi ve saklama koruması eklenir.
- Başka bir kaynaktan (origin) gelen tarayıcı sayfasının istekleri reddedilir.
- Giriş parolası ayarlanmadığı sürece herkese açık görünen bir ana makine adından anahtar oluşturulamaz.
- Bir asistanın başlattığı her yedekleme ve bundan doğan prune ve off-site çalıştırmaları, etkinlik günlüğünde, hata panelinde ve yedekleme bildiriminde anahtarın adıyla "MCP üzerinden" olarak işaretlenir.
- Her araç çağrısı, anahtarın kimliği ve son dört karakteriyle (adıyla asla) kapsayıcı günlüğüne yazılır ve `/metrics` içinde sayılır (`bombvault_mcp_requests_total`, `bombvault_mcp_tool_calls_total`, `bombvault_mcp_active_keys`).
- Bir yapılandırma yedeğini geri yüklemek tüm anahtarları iptal eder, çünkü geri yüklenen veritabanı, kaydedildikten sonra iptal ettiğiniz anahtarları içerebilir. Ardından yeni anahtarlar oluşturun.
- `APP_KEY` değiştiğinde (yeniden kurulum ya da başka bir kapsayıcıya geri yükleme) bir anahtar çalışmayı bırakır. Kart bunu fark eder ve anahtarı işaretler; **Anahtarı değiştir** ona yeniden geçerli bir gizli değer verir.
- Anahtara parola gibi davran. Anahtarı bir ortam değişkeninden, bir istemden ya da bir anahtar dosyasından okuyamayan istemci onu yapılandırmasında ya da ayarlarında düz metin olarak tutar ve penceresi bunu söyler. Daha az güvendiğin bir bilgisayarda yalnızca okuyabilen bir anahtarı tercih et.

## Makineden ne çıkar {#privacy}

Bir asistanın okuduğu her şey arkasındaki yapay zekâ sağlayıcısına gider: öğe adları, zamanlamalar, hata iletileriyle çalıştırma geçmişi, geri yükleme noktalarının kimlikleri ve zamanları, veritabanı motorlarının adları ve döküm boyutları, süren etkinlik, depolama rakamları, kapsam ve durum. BombVault, herhangi bir şey dışarı çıkmadan önce ana makine yollarını, depo konumlarını, ana makine adlarını, kimlik bilgilerini, hook komutlarını ve anahtarları çıkarır.

## Sorun giderme {#troubleshooting}

| Gördüğünüz | Anlamı |
|---|---|
| `404` | Etkin anahtar yok ya da `/api/mcp` gibi yanlış bir yol. Uç nokta `/mcp`'dir. |
| `401` | Anahtar eksik, yanlış yazılmış, iptal edilmiş ya da değiştirilmiş. Bir vekil sunucu `Authorization` başlığını düşürüyor olabilir (`X-API-Key` deneyin). Kart anahtarı artık geçersiz olarak işaretliyorsa `APP_KEY` değişmiştir: anahtarı değiştirin. |
| `403` | İstek, başka bir kaynaktan gelen bir tarayıcı sayfasından geldi. Masaüstü ya da komut satırı istemcisi kullanın. |
| GET'te `405` | Normal. Uç nokta yalnızca `POST` kabul eder. |
| `400` "Accept must contain both 'application/json' and 'text/event-stream'" | İstemci Streamable HTTP için fazla eski. Güncelleyin. |
| `400` "batch requests are not accepted" | İstemci JSON-RPC toplu istekleri gönderiyor. İstek başına tek ileti gönderin. |
| `429` | Bu adresten çok fazla yanlış anahtar ya da tek anahtarla dakikada 120'den fazla istek. Bir dakika bekleyin ve asistanın bir döngüye takılıp takılmadığını kontrol edin. |
| "certificate", "self-signed" ya da "unable to verify" içeren hatalar | İstemci BombVault'un sertifikasına güvenmiyor. Bkz. [TLS ve sertifikalar](#tls). |
| `busy` | O alanı başka bir yedekleme ya da bakım işi tutuyor. Bittiğinde yeniden deneyin. |
| `cooldown` | Bu öğe, bu alan ya da Backup Everything 15 dakikadan kısa süre önce MCP üzerinden başlatıldı. |
| `retention_guard` | Bir MCP yedeği daha, "son N taneyi tut" penceresinde yalnızca MCP'den gelen geri yükleme noktaları bırakırdı ya da öğe son 24 saatte MCP üzerinden zaten 4 yedek aldı; başarısız ve iptal edilenler de sayılır. İlk durumda bir sonraki zamanlanmış yedekleme yer açar, ikincisinde öğe bu yedeklerin en eskisinden 24 saat sonra yeniden serbest kalır. Web arayüzünden her zaman başlatabilirsiniz. |
| `rate_limited` | Anahtar bu saat için 12 başlatmasını kullandı. |
| Başlatmada `not_permitted` | Anahtar yalnızca okuyabilir. Kartta **Yedekleme başlatmaya izin ver** seçeneğini açın; yeniden bağlanmak gerekmez. İptalde, çalıştırmanın bu anahtar tarafından başlatılmadığı anlamına gelir. |
| `domain_off` | O yedekleme türü ayarlarda kapalı. |
| `not_found` | BombVault bu öğeyi korumuyor. Önce web arayüzünde ekleyin; MCP asla yapılandırma oluşturmaz. |

Kapsayıcıda `MCPGODEBUG` ortam değişkenini ayarlamayın. MCP kitaplığının davranışını değiştirir ve hatalı bir değer, BombVault'u tek bir günlük satırı yazmadan başlangıçta durdurur.
