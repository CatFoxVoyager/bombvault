# Serwer MCP

BombVault ma wbudowany serwer Model Context Protocol (MCP), czyli protokołu, przez który asystenci AI tacy jak Claude Code i Claude Desktop sięgają po zewnętrzne narzędzia. Dzięki niemu asystent może sprawdzić, jak mają się twoje kopie zapasowe, a jeśli na to pozwolisz, uruchomić kopię albo anulować taką, którą sam uruchomił. Serwer jest wyłączony, dopóki nie utworzysz klucza: bez aktywnego klucza punkt końcowy `/mcp` odpowiada na wszystko `404`.

## Co asystent może, a czego nie {#tools}

| Narzędzie | Co robi | Rodzaj |
|---|---|---|
| `get_health` | Wersja, nazwa instancji, czy trwa kopia i co wolno temu kluczowi | odczyt |
| `get_status` | Stan ochrony w każdej domenie: ostatnia udana kopia, oczekiwany odstęp, weryfikacje i kontrole off-site, kolejne zaplanowane przebiegi | odczyt |
| `get_coverage` | Co BombVault chroni, a czego nie, z podanym powodem | odczyt |
| `list_items` | Każdy chroniony kontener, VM i zestaw folderów, pamięć flash i konfiguracja aplikacji, z harmonogramem, tym, co zatrzymuje kopia, ostatnią kopią i czasem jej trwania; kontenery baz danych podają też ostatni zrzut; są tu też zbiory danych ZFS z wynikiem ich ostatniej kontroli | odczyt |
| `list_runs` | Historia przebiegów od najnowszych, z filtrem według domeny, elementu, stanu, rodzaju i czasu | odczyt |
| `list_restore_points` | Punkty przywracania jednego elementu z jego głównego repozytorium, a dla kontenera także jego zrzuty baz danych; zbiór danych ZFS ma jeden punkt przywracania na kopię, ze snapshotem każdego zbioru danych pod nim | odczyt |
| `get_activity` | Co działa w tej chwili, z etapem i procentem | odczyt |
| `get_storage_stats` | Historia rozmiaru głównego repozytorium domeny i jego przyrost tygodniowy | odczyt |
| `list_anomalies` | Anomalie, które BombVault zauważył w kopiach, z filtrowaniem według stanu, wagi i domeny oraz podsumowaniem tego, co otwarte | odczyt |
| `get_anomaly` | Jedno z tych zgłoszeń wraz z notatką zostawioną przy jego potwierdzeniu | odczyt |
| `start_backup` | Od razu robi kopię jednego elementu | uruchomienie |
| `start_domain_backup` | Robi kopię każdego chronionego elementu jednej domeny | uruchomienie |
| `start_backup_everything` | Uruchamia przebieg Backup Everything | uruchomienie |
| `cancel_backup` | Anuluje trwającą kopię uruchomioną przez ten klucz | anulowanie |

W interfejsie WWW zostaje: przywracanie każdego rodzaju (także pobieranie, zapisywanie i import zrzutu bazy danych), usuwanie kopii, prune, unlock, kontrole i ćwiczenia, replikacja off-site, ustawienia, dane logowania i klucze MCP oraz anulowanie kopii uruchomionej przez harmonogram, interfejs WWW albo inny klucz. To samo dotyczy potwierdzenia anomalii lub oznaczenia jej jako oczekiwanej, co robi się na stronie **Anomalie**. Powód: odpowiedzi narzędzi zawierają nazwy i komunikaty błędów z twojego serwera, a w każdym z nich może się znaleźć tekst napisany po to, by sterować asystentem. Asystent, który się na to nabierze, może w najgorszym razie uruchomić kopię w granicach opisanych niżej albo anulować kopię, którą sam uruchomił.

Jeśli główne repozytorium elementu jest zdalne (S3, REST, SFTP, rclone), `list_restore_points` się z nim łączy i wywołanie może chwilę potrwać. Kopii off-site nie da się wylistować przez MCP. Na co patrzą kontrole anomalii, opisuje strona [Funkcje](features.md), a jak element ZFS trzyma jedną migawkę na każdy zbiór danych, strona [Zbiory danych ZFS](zfs-datasets.md#contents).

## Co robi uruchomiona kopia {#starting-backups}

Kopia uruchomiona przez asystenta to ta sama kopia, którą uruchamia interfejs WWW. Działający kontener zostaje zatrzymany do końca swojej kopii, razem z kontenerami ustawionymi do zatrzymania razem z nim. VM z metodą "graceful" jest wyłączana i uruchamiana ponownie. Zbiór danych ZFS zatrzymuje ustawione dla niego kontenery na czas wykonywania swojego snapshotu. Zestawy folderów, pamięć flash i konfiguracja działają dalej. Potem BombVault stosuje zasady przechowywania i może skopiować dane do repozytorium off-site. `list_items` mówi asystentowi, co zatrzymuje element i jak długo trwała jego ostatnia kopia, a opisy narzędzi proszą go, żeby powiedział ci o tym, zanim cokolwiek uruchomi.

Ponieważ kopia zatrzymuje usługi i wypycha stare punkty przywracania, uruchomienia przez MCP są ograniczone:

- 12 uruchomionych kopii na godzinę na klucz.
- 15 minut między dwoma uruchomieniami przez MCP tego samego elementu, tej samej domeny lub Backup Everything.
- Najwyżej 4 uruchomienia przez MCP tego samego elementu w ciągu 24 godzin.
- **Ochrona przechowywania.** Gdy domena przechowuje stałą liczbę punktów przywracania (tylko "zachowaj ostatnie N", bez reguły dziennej, tygodniowej ani miesięcznej, lokalnie lub w miejscu off-site), każda nowa kopia wypycha najstarszą. BombVault odrzuca wtedy uruchomienie przez MCP elementu, którego N-1 najnowszych udanych kopii uruchomiono przez MCP. Dzięki temu w zachowanym zestawie zawsze zostaje co najmniej jeden punkt przywracania utworzony przez harmonogram albo przez ciebie. Przy "zachowaj ostatnią 1" asystent nie może w ogóle skopiować tego elementu. Następna zaplanowana kopia znowu robi miejsce.

Uruchomienie domeny lub Backup Everything pomija elementy zatrzymane przez któryś limit i wymienia je w odpowiedzi. Żaden z tych limitów nie dotyczy interfejsu WWW ani harmonogramu. Budżet godzinowy jest trzymany w pamięci, więc restart BombVault go zeruje.

## Włączanie {#switch-on}

1. Otwórz **Ustawienia, System, Serwer MCP** i kliknij przycisk swojego klienta. Klient, którego nie ma na liście, łączy się przez **Inny klient**.
2. W sekcji **Klucz** zostaw **Nowy klucz** i proponowaną nazwę, czyli nazwę klienta, albo wpisz taką, która mówi, gdzie klucz jest używany, na przykład „Claude Code na laptopie”. Jeden klucz na klienta pozwala odwołać jeden bez ruszania pozostałych. **Istniejący klucz** daje klientowi klucz utworzony wcześniej.
3. Włącz **Pozwól uruchamiać kopie** dla klucza, który ma móc uruchamiać kopie; bez tego klucz może tylko czytać. Możesz to zmienić później na kafelku klucza, a zmiana obowiązuje od następnego żądania asystenta, bez ponownego łączenia.
4. Kliknij **Utwórz klucz**. Klucz jest pokazywany raz. BombVault trzyma tylko jego odcisk i nie pokaże go ponownie, więc skopiuj go teraz. Jeśli zamkniesz okno, zanim klient użyje klucza, karta nadal go pokazuje, dopóki nie potwierdzisz, że go skopiowałeś.

Bez hasła logowania sam interfejs WWW jest otwarty dla wszystkich w twojej sieci, a kto może go otworzyć, może też utworzyć klucz. Karta o tym informuje. Jeśli otworzysz BombVault pod nazwą wyglądającą na publiczną (na przykład `bombvault.example.com` za reverse proxy), a hasło logowania nie jest ustawione, z tego adresu nie da się tworzyć ani wymieniać kluczy, żeby żadna strona w internecie nie mogła skłonić twojej przeglądarki do utworzenia klucza. Ustaw hasło logowania albo otwórz BombVault przez adres IP lub lokalną nazwę, taką jak `tower` czy `tower.local`.

## Twoje klucze i ich dziennik {#keys}

Każdy klucz ma na karcie własny kafelek. Pokazuje nazwę klucza, czy może uruchamiać kopie, czy tylko czyta, cztery ostatnie znaki klucza, kiedy go utworzono lub ostatnio zastąpiono, kiedy klient ostatnio go użył i ile wywołań wykonał dzisiaj. Na kafelku zmieniasz nazwę klucza, jego uprawnienie, zastępujesz go albo unieważniasz. Unieważniony klucz trafia na listę unieważnionych kluczy, gdzie możesz go usunąć na zawsze, gdy żadne uruchomienie w historii już go nie wymienia.

Obok nazwy kafelek pokazuje logo klienta, dla którego utworzono klucz. Klucz utworzony przez **Inny klient** albo zanim karta zaczęła wymieniać klientów pokazuje zamiast tego klucz.

**Dziennik** na kafelku otwiera to, co zrobił ten klucz. Najpierw są kopie, które uruchomił, każda ze stanem i linkiem do tego uruchomienia w dzienniku aktywności na pulpicie. Pod nimi są jego wywołania, od najnowszych, z narzędziem i wynikiem. Odmowa podaje powód: klucz może tylko czytać, ochrona przechowywania wstrzymała kopię, trwała już inna kopia, element skopiowano przez MCP kilka minut temu albo klucz wysłał zbyt wiele żądań. Anulowanie prowadzi do uruchomienia, którego dotyczyło.

BombVault przechowuje wpisy każdego klucza przez najwyżej 30 dni: 500 najnowszych udanych uruchomień i anulowań, a obok nich 200 najnowszych pozostałych wywołań (odczyty, odmowy i błędy), więc asystent, który raz po raz odpytuje trwającą kopię albo ponawia odrzucone wywołanie, nie wypchnie z dziennika jej uruchomienia. Przy każdym wywołaniu zapisuje narzędzie, wynik i uruchomienie wskazane przez anulowanie. Nigdy nie zapisuje tego, co wysłał asystent, ani klucza czy jego odcisku. Pakiet diagnostyczny tylko liczy wpisy, a eksport ustawień je pomija.

## Podłączanie klienta {#clients}

Każdy klient ma na karcie przycisk, w grupie **Na tym komputerze** albo **W chmurze**. Przycisk otwiera okno w trzech krokach: klucz; konfiguracja dla tego klienta z adresem, pod którym otworzyłeś kartę, przyciskiem do jej skopiowania, miejscem, gdzie leży konfiguracja, a przy własnym certyfikacie BombVault także tym, czego klient potrzebuje, żeby mu zaufać; oraz czekanie na pierwsze wywołanie klienta. Okno śledzi ostatnie użycie klucza i robi się zielone, gdy to wywołanie nadejdzie.

Okno trzyma klucz z dala od każdego wiersza poleceń. Gdy klient potrafi odczytać go ze zmiennej środowiskowej (`BOMBVAULT_MCP_KEY`), z ukrytego zapytania albo z własnego pliku, konfiguracja tylko go wskazuje. Gdy klient nie ma takiej możliwości, klucz leży w jego pliku konfiguracyjnym albo ustawieniach, a okno to mówi. Gdy dokumentacja klienta nie mówi, jak traktuje nieznany certyfikat, okno opisuje ten krok jako to, co zrobić, jeśli klient odrzuci certyfikat BombVault.

| Klient | Konfiguracja | Skąd pochodzi klucz |
|---|---|---|
| AnythingLLM | plik konfiguracyjny | plik konfiguracyjny |
| Antigravity | plik konfiguracyjny | zmienna środowiskowa |
| Claude Code | polecenie | plik klucza |
| Claude Desktop | plik konfiguracyjny | plik konfiguracyjny |
| Cline | plik konfiguracyjny | plik konfiguracyjny |
| Codex CLI | plik konfiguracyjny | zmienna środowiskowa |
| Continue | plik konfiguracyjny | `~/.continue/.env` |
| Copilot CLI | plik konfiguracyjny | plik konfiguracyjny |
| Cursor | plik konfiguracyjny | zmienna środowiskowa |
| Gemini CLI | plik konfiguracyjny | zmienna środowiskowa |
| GitHub Copilot (VS Code) | plik konfiguracyjny | ukryte zapytanie |
| Goose | plik konfiguracyjny | zmienna środowiskowa |
| Jan | formularz w aplikacji | ustawienia aplikacji |
| JetBrains (AI Assistant, Junie) | plik konfiguracyjny | plik konfiguracyjny |
| Kimi Code | plik konfiguracyjny | plik konfiguracyjny |
| LM Studio | plik konfiguracyjny | plik konfiguracyjny |
| Mistral Vibe | plik konfiguracyjny | zmienna środowiskowa |
| Msty | formularz w aplikacji | ustawienia aplikacji |
| n8n | formularz w aplikacji | dane logowania n8n |
| Open WebUI | formularz w aplikacji | ustawienia aplikacji |
| opencode | plik konfiguracyjny | zmienna środowiskowa |
| Perplexity (Mac) | formularz w aplikacji | plik klucza |
| Qwen Code | plik konfiguracyjny | zmienna środowiskowa |
| Roo Code | plik konfiguracyjny | zmienna środowiskowa |
| Visual Studio | plik konfiguracyjny | plik konfiguracyjny |
| Warp | plik konfiguracyjny | plik konfiguracyjny |
| Windsurf | plik konfiguracyjny | zmienna środowiskowa |
| Zed | plik konfiguracyjny | plik konfiguracyjny |
| Grok | formularz, w chmurze | serwery dostawcy |
| Le Chat | formularz, w chmurze | serwery dostawcy |
| ChatGPT | w chmurze | tylko OAuth, zob. niżej |
| Claude (claude.ai) | w chmurze | OAuth w większości organizacji, zob. niżej |

Sekcje poniżej dokładniej opisują konfigurację Claude Code i Claude Desktop oraz to, czego potrzebuje każdy inny klient.

### Claude Code {#claude-code}

Claude Code łączy się z BombVault przez `mcp-remote`, który wymaga Node.js na tym komputerze. Najpierw zapisz klucz w osobnym pliku tekstowym, w jednym wierszu:

```text
X-API-Key: <your key>
```

Potem uruchom raz w terminalu polecenie z karty, ze ścieżką tego pliku. Za certyfikatem, któremu ufa twój komputer, wygląda tak:

```bash
claude mcp add bombvault --scope user -- npx -y mcp-remote@latest https://bombvault.example.com/mcp --header-file "<path of the file with your key>"
```

Z własnym certyfikatem BombVault (zobacz [TLS i certyfikaty](#tls)) polecenie dodatkowo wskazuje Node.js pobrany certyfikat:

```bash
claude mcp add bombvault --scope user -e "NODE_EXTRA_CA_CERTS=<path of the downloaded bombvault-cert.pem>" -- npx -y mcp-remote@latest https://192.168.1.10:3443/mcp --header-file "<path of the file with your key>"
```

Sprawdź połączenie poleceniem `/mcp` w Claude Code. `--scope user` udostępnia BombVault we wszystkich twoich projektach. Claude Code zapamiętuje tylko ścieżkę pliku z kluczem, więc klucz nie pojawia się ani w poleceniu i historii powłoki, ani na liście procesów. Trzymaj plik tam, gdzie tylko ty możesz go odczytać, i poza każdym folderem, który commitujesz. `@latest` sprawia, że `npx` pobiera aktualny `mcp-remote`; inaczej zostałby użyty starszy, zainstalowany globalnie, a ten nie zna `--header-file`.

Nie wpisuj `${BOMBVAULT_MCP_KEY}` do argumentów `mcp-remote` dla Claude Code. Claude Code podstawia takie odwołanie ze swojego środowiska, zanim uruchomi `mcp-remote`, więc klucz trafia do wiersza poleceń tego procesu, gdzie mogą go odczytać inne programy i użytkownicy komputera.

Bez Node.js Claude Code może połączyć się sam, ale tylko za certyfikatem, któremu ufa twój komputer. Umieść plik `.mcp.json` w folderze projektu:

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

Ustaw `BOMBVAULT_MCP_KEY` tam, gdzie startuje Claude Code, na przykład w `"env"` w `~/.claude/settings.json` albo w profilu powłoki, w edytorze tekstu, a nie wpisując w wierszu poleceń. Tutaj odwołanie jest bezpieczne, bo Claude Code nie uruchamia drugiego procesu, który by je przenosił. Z własnym certyfikatem BombVault to nie działa: połączenie, które Claude Code nawiązuje sam, odrzuca go nawet przy ustawionym `NODE_EXTRA_CA_CERTS`. Nigdy nie commituj `.mcp.json` z wpisanym kluczem.

### Claude Desktop {#claude-desktop}

Claude Desktop łączy się z BombVault przez `mcp-remote`, który wymaga Node.js na tym komputerze. Otwórz plik konfiguracji w Claude Desktop przez **Settings, Developer, Edit Config**. W Windows leży w `%APPDATA%\Claude\claude_desktop_config.json`, w macOS w `~/Library/Application Support/Claude/claude_desktop_config.json`. Dodaj wpis z karty wewnątrz `"mcpServers"`, obok serwerów, które już tam są, i uruchom ponownie Claude Desktop:

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

- `NODE_EXTRA_CA_CERTS` jest tylko dla własnego certyfikatu BombVault. Za certyfikatem, któremu twój komputer już ufa, usuń go.
- `--allow-http` dochodzi tylko przy zwykłym adresie `http://`.
- Nagłówek zapisuje się jako `X-API-Key:${BOMBVAULT_MCP_KEY}`, bez spacji po dwukropku i z kluczem w `env`. Na niektórych systemach `mcp-remote` dzieli wartość `--header` na pierwszej spacji, a klucz zapisany po spacji by przepadł.

### Klienci w chmurze {#cloud-clients}

ChatGPT, Claude na claude.ai, Grok i Le Chat wywołują BombVault z serwerów swoich dostawców, więc BombVault musi być osiągalny z internetu z publicznie zaufanym certyfikatem, na przykład za odwrotnym proxy; Le Chat odrzuca certyfikaty z podpisem własnym. Logowanie na proxy może chronić interfejs WWW, ale `/mcp` musi przechodzić do BombVault bez niego: te usługi nie potrafią zalogować się do proxy, a BombVault sam sprawdza ich klucz. Grok i Le Chat potrafią wysłać stały klucz, a ich przyciski konfigurują je tak jak pozostałych. ChatGPT łączy się tylko przez logowanie OAuth, a Claude na claude.ai przyjmuje nagłówek ze stałym kluczem tylko w niektórych organizacjach. BombVault dostanie logowanie OAuth w następnej aktualizacji; do tego czasu ich przyciski mówią o tym, zamiast oferować konfigurację.

### Inni klienci {#other-clients}

Nada się każdy klient, który mówi w Streamable HTTP:

- URL: adres interfejsu WWW plus `/mcp`, na przykład `https://192.168.1.10:3443/mcp`.
- Klucz w `Authorization: Bearer <key>` albo w `X-API-Key: <key>`. Jeśli przyjdą oba, muszą zawierać ten sam klucz.
- `POST` z `Content-Type: application/json` i `Accept: application/json, text/event-stream`.
- Jedna wiadomość JSON-RPC na żądanie; paczki (batch) są odrzucane.
- Wersje protokołu 2026-07-28, 2025-11-25, 2025-06-18 i 2025-03-26.

## TLS i certyfikaty {#tls}

BombVault udostępnia HTTPS z certyfikatem, który sam wystawił, a ten na początku wymienia tylko `localhost`, `127.0.0.1` i `::1`. Claude Code i `mcp-remote` odrzucają go na adresie w sieci lokalnej. Sposoby obejścia, w kolejności pasującej do większości instalacji Unraid:

1. **Dodaj adres w karcie MCP.** Gdy kartę otworzysz przez HTTPS pod adresem, którego certyfikat nie wymienia, karta o tym powie i zaproponuje **Dodaj ten adres do certyfikatu**. BombVault wystawi wtedy certyfikat ponownie z tym adresem (przeglądarka ostrzeże jeszcze raz, jak za pierwszym razem). Potem kliknij **Pobierz certyfikat**; fragmenty ustawiają `NODE_EXTRA_CA_CERTS` na pobrany plik, więc klient ufa dokładnie temu certyfikatowi. Oznacza to też, że każdy klient skonfigurowany z wcześniej pobranym plikiem przestaje się łączyć, gdy tylko certyfikat zostanie wystawiony ponownie, na tym komputerze i na każdym innym, dopóki nie dostanie nowego pliku.
2. **Reverse proxy z zaufanym certyfikatem** (Nginx Proxy Manager, SWAG, Caddy, Traefik). Klient widzi wtedy certyfikat proxy i nie potrzebuje niczego więcej, a karta nie ostrzega przed certyfikatem BombVault.
3. **Tailscale.** `tailscale serve` przed kontenerem albo integracja Tailscale w Unraid daje ci nazwę `ts.net` z zaufanym certyfikatem.
4. **`HTTP_ONLY=true`**, tylko za proxy kończącym TLS albo w sieci, której w pełni ufasz. Przełącza cały interfejs WWW na zwykłe HTTP, wymaga zmiany ustawień kontenera i wysyła klucz bez szyfrowania.

Nigdy nie ustawiaj `NODE_TLS_REJECT_UNAUTHORIZED=0`. To wyłącza sprawdzanie certyfikatów dla wszystkiego, z czym rozmawia ten proces Node.js.

Reverse proxy musi przekazać dalej nagłówek `Authorization` (albo `X-API-Key`), co proxy robią, dopóki nie każe się im inaczej, i nie może buforować ani przepisywać `/mcp`. Blok location dla Nginx lub Nginx Proxy Manager, który sprawdza też certyfikat BombVault:

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

Za proxy każde żądanie niesie adres proxy. Pięć złych kluczy od jednego źle skonfigurowanego klienta blokuje wtedy na minutę wszystkich klientów MCP za tym proxy. Wpisz proxy w `TRUSTED_PROXY` (zobacz [Konfiguracja](configuration.md)), żeby liczyć osobno dla każdego klienta.

## Model bezpieczeństwa {#security}

- Bez aktywnego klucza `/mcp` odpowiada `404`.
- Żaden adres nie jest wyjątkiem. Żądania z `localhost`, z hosta Unraid, z reverse proxy albo z `tailscale serve` potrzebują klucza jak każde inne, także wtedy, gdy interfejs WWW nie ma hasła logowania.
- Klucze są zapisywane tylko jako odciski, pokazywane raz i można je przemianować, wymienić i unieważnić. Do 10 aktywnych kluczy, każdy z własnym przełącznikiem **Pozwól uruchamiać kopie**.
- Każde utworzenie, wymiana, zmiana uprawnień i unieważnienie wysyła powiadomienie twoimi kanałami powiadomień, z adresem, z którego przyszło, chyba że powiadomienia są wyłączone.
- 5 złych kluczy na minutę z jednego adresu, potem `429`. 120 żądań na minutę i 12 uruchomionych kopii na godzinę na klucz, do tego opisane wyżej odczekanie i ochrona przechowywania.
- Żądania ze strony przeglądarki z innego originu są odrzucane.
- Dopóki nie ma hasła logowania, nie można tworzyć kluczy z nazwy hosta wyglądającej na publiczną.
- Każda kopia uruchomiona przez asystenta oraz wynikające z niej przebiegi prune i off-site są oznaczone "przez MCP" z nazwą klucza w dzienniku aktywności, w panelu błędów i w powiadomieniu o kopii.
- Każde wywołanie narzędzia trafia do logu kontenera z id klucza i jego czterema ostatnimi znakami (nigdy z nazwą) i jest liczone w `/metrics` (`bombvault_mcp_requests_total`, `bombvault_mcp_tool_calls_total`, `bombvault_mcp_active_keys`).
- Przywrócenie kopii konfiguracji unieważnia wszystkie klucze, bo przywrócona baza może zawierać klucze, które unieważniłeś po jej zapisaniu. Potem utwórz nowe.
- Klucz przestaje działać, gdy zmieni się `APP_KEY` (ponowna instalacja albo przywrócenie do innego kontenera). Karta to wykrywa i oznacza klucz, a **Wymień klucz** daje mu znowu ważny sekret.
- Traktuj klucz jak hasło. Klient, który nie potrafi odczytać klucza ze zmiennej środowiskowej, z zapytania ani z pliku klucza, trzyma go jawnym tekstem w swojej konfiguracji lub ustawieniach, a jego okno to mówi. Na komputerze, któremu mniej ufasz, lepiej użyj klucza tylko do odczytu.

## Co opuszcza maszynę {#privacy}

Wszystko, co czyta asystent, trafia do dostawcy AI, który za nim stoi: nazwy elementów, harmonogramy, historia przebiegów z komunikatami błędów, id i czasy punktów przywracania, nazwy silników baz danych i rozmiary zrzutów, bieżąca aktywność, dane o miejscu, pokrycie i stan. BombVault usuwa ścieżki hosta, lokalizacje repozytoriów, nazwy hostów, dane logowania, polecenia hooków i klucze, zanim cokolwiek wyjdzie.

## Rozwiązywanie problemów {#troubleshooting}

| Co widzisz | Co to znaczy |
|---|---|
| `404` | Brak aktywnego klucza albo zła ścieżka, na przykład `/api/mcp`. Punkt końcowy to `/mcp`. |
| `401` | Klucza brakuje, ma literówkę, jest unieważniony albo wymieniony. Być może proxy gubi nagłówek `Authorization` (spróbuj `X-API-Key`). Jeśli karta oznacza klucz jako już nieważny, zmienił się `APP_KEY`: wymień klucz. |
| `403` | Żądanie przyszło ze strony przeglądarki z innego originu. Użyj klienta desktopowego albo wiersza poleceń. |
| `405` przy GET | Normalne. Punkt końcowy przyjmuje tylko `POST`. |
| `400` "Accept must contain both 'application/json' and 'text/event-stream'" | Klient jest za stary na Streamable HTTP. Zaktualizuj go. |
| `400` "batch requests are not accepted" | Klient wysyła paczki JSON-RPC. Wysyłaj jedną wiadomość na żądanie. |
| `429` | Za dużo złych kluczy z tego adresu albo ponad 120 żądań na minutę z jednym kluczem. Odczekaj minutę i sprawdź, czy asystent nie utknął w pętli. |
| Błędy z "certificate", "self-signed" albo "unable to verify" | Klient nie ufa certyfikatowi BombVault. Zobacz [TLS i certyfikaty](#tls). |
| `busy` | Domenę zajmuje inna kopia albo zadanie konserwacji. Spróbuj ponownie, gdy się skończy. |
| `cooldown` | Ten element, ta domena albo Backup Everything został uruchomiony przez MCP mniej niż 15 minut temu. |
| `retention_guard` | Kolejna kopia przez MCP zostawiłaby w oknie "zachowaj ostatnie N" tylko punkty przywracania z MCP albo element dostał już 4 kopie przez MCP w ciągu ostatnich 24 godzin, licząc nieudane i anulowane. W pierwszym przypadku miejsce zrobi następna zaplanowana kopia, w drugim element zwolni się 24 godziny po najstarszej z tych kopii. W interfejsie WWW możesz ją uruchomić w każdej chwili. |
| `rate_limited` | Klucz zużył swoje 12 uruchomień na tę godzinę. |
| `not_permitted` przy uruchomieniu | Klucz może tylko czytać. Włącz w karcie **Pozwól uruchamiać kopie**; ponowne łączenie nie jest potrzebne. Przy anulowaniu oznacza to, że przebiegu nie uruchomił ten klucz. |
| `domain_off` | Ten rodzaj kopii jest wyłączony w ustawieniach. |
| `not_found` | BombVault nie chroni tego elementu. Najpierw dodaj go w interfejsie WWW; MCP nigdy nie tworzy konfiguracji. |

Nie ustawiaj na kontenerze zmiennej środowiskowej `MCPGODEBUG`. Zmienia ona działanie biblioteki MCP, a błędna wartość zatrzymuje BombVault przy starcie, zanim zapisze on choćby jedną linię logu.
