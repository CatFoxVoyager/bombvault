# MCP-server

BombVault heeft een ingebouwde server voor het Model Context Protocol (MCP), het protocol waarmee AI-assistenten zoals Claude Code en Claude Desktop externe hulpmiddelen bereiken. Daarmee kan een assistent lezen hoe het met je back-ups staat en, als je dat toestaat, een back-up starten of er een annuleren die hij zelf heeft gestart. De server staat uit tot je een sleutel aanmaakt: zonder actieve sleutel antwoordt het eindpunt `/mcp` op alles met `404`.

## Wat een assistent wel en niet kan {#tools}

| Hulpmiddel | Wat het doet | Soort |
|---|---|---|
| `get_health` | Versie, naam van de instantie, of er een back-up loopt en wat deze sleutel mag | lezen |
| `get_status` | Beschermingsstatus per domein: laatste geslaagde back-up, verwacht interval, verificaties en off-site-controles, volgende geplande runs | lezen |
| `get_coverage` | Wat BombVault beschermt en wat niet, telkens met de reden | lezen |
| `list_items` | Elke beschermde container, VM en mappenset, de flashstick en de app-configuratie, met planning, wat een back-up ervan stopt, de laatste back-up en hoe lang die duurde; databasecontainers vermelden ook hun laatste dump; ZFS-datasets staan er ook in, met de uitkomst van hun laatste controle | lezen |
| `list_runs` | Runhistorie, nieuwste eerst, te filteren op domein, item, status, soort en tijd | lezen |
| `list_restore_points` | Herstelpunten van één item uit zijn primaire repository, en bij een container ook zijn databasedumps; een ZFS-dataset krijgt één herstelpunt per back-up, met een snapshot van elke dataset eronder | lezen |
| `get_activity` | Wat er nu loopt, met fase en percentage | lezen |
| `get_storage_stats` | Groottegeschiedenis van de primaire repository van een domein en de groei per week | lezen |
| `list_anomalies` | Anomalieën die BombVault in de back-ups heeft opgemerkt, te filteren op status, ernst en domein, met een overzicht van wat nog openstaat | lezen |
| `get_anomaly` | Eén van die meldingen, met de notitie die bij het bevestigen is achtergelaten | lezen |
| `start_backup` | Maakt nu een back-up van één item | starten |
| `start_domain_backup` | Maakt een back-up van elk beschermd item van een domein | starten |
| `start_backup_everything` | Start de Backup Everything-ronde | starten |
| `cancel_backup` | Annuleert een lopende back-up die deze sleutel heeft gestart | annuleren |

Dit blijft in de webinterface: herstel van elke soort (ook het downloaden, opslaan of importeren van een databasedump), back-ups verwijderen, prune, unlock, controles en oefeningen, off-site-replicatie, instellingen, inloggegevens en MCP-sleutels, en het annuleren van een back-up die de planning, de webinterface of een andere sleutel heeft gestart. Hetzelfde geldt voor het bevestigen van een anomalie of het markeren ervan als verwacht, wat op de pagina **Anomalieën** gebeurt. De reden: de antwoorden van de hulpmiddelen bevatten namen en foutmeldingen van je server, en in elk daarvan kan tekst staan die bedoeld is om de assistent te sturen. Een assistent die daarin trapt, kan in het ergste geval een back-up starten binnen de grenzen hieronder, of er een annuleren die hij zelf heeft gestart.

Staat de primaire repository van een item elders (S3, REST, SFTP, rclone), dan neemt `list_restore_points` daar contact mee op en kan de aanroep even duren. Off-site-kopieën zijn via MCP niet op te vragen. Waar de anomaliecontroles naar kijken, staat onder [Functies](features.md), en hoe een ZFS-item één snapshot per dataset bijhoudt, onder [ZFS-datasets](zfs-datasets.md#contents).

## Wat een gestarte back-up doet {#starting-backups}

De back-up van een assistent is dezelfde back-up die de webinterface start. Een draaiende container wordt gestopt tot zijn back-up klaar is, samen met de containers die met hem mee moeten stoppen. Een VM met de methode "graceful" wordt afgesloten en weer gestart. Een ZFS-dataset stopt de containers die ervoor zijn ingesteld zolang de snapshot wordt gemaakt. Mappensets, de flashstick en de configuratie blijven draaien. Daarna past BombVault het bewaarbeleid toe en kopieert het eventueel naar de off-site-repository. `list_items` vertelt de assistent wat een item stopt en hoe lang de laatste back-up duurde, en de beschrijvingen van de hulpmiddelen vragen hem dat aan jou te melden voor hij iets start.

Omdat een back-up dingen stilzet en oude herstelpunten eruit duwt, zijn starts via MCP begrensd:

- 12 gestarte back-ups per uur per sleutel.
- 15 minuten tussen twee MCP-starts van hetzelfde item, hetzelfde domein of Backup Everything.
- Hoogstens 4 MCP-starts van hetzelfde item in 24 uur.
- **Bewaarbeveiliging.** Houdt een domein een vast aantal herstelpunten (alleen "laatste N bewaren", zonder dagelijkse, wekelijkse of maandelijkse regel, lokaal of op een off-site-bestemming), dan duwt elke nieuwe back-up de oudste eruit. BombVault weigert dan een MCP-start van een item waarvan de nieuwste N-1 geslaagde back-ups allemaal via MCP zijn gestart. Er blijft dus altijd minstens één herstelpunt in de bewaarde set dat de planning of jij hebt gemaakt. Met "laatste 1 bewaren" kan een assistent van dat item helemaal geen back-up maken. De volgende geplande back-up maakt weer ruimte.

Een start van een domein of van Backup Everything laat de items weg die een grens tegenhoudt en noemt ze in het antwoord. De webinterface en de planning hebben met geen van deze grenzen te maken. Het uurbudget staat in het geheugen, dus een herstart van BombVault zet het op nul.

## Inschakelen {#switch-on}

1. Open **Instellingen, Systeem, MCP-server** en klik op de knop van je client. Een client die niet in de lijst staat, verbindt via **Andere client**.
2. Laat onder **Sleutel** de keuze **Nieuwe sleutel** en de voorgestelde naam staan, die van de client, of typ een naam die zegt waar de sleutel gebruikt wordt, bijvoorbeeld "Claude Code op de laptop". Eén sleutel per client laat je er één intrekken zonder de andere aan te raken. **Bestaande sleutel** geeft de client een sleutel die je eerder hebt gemaakt.
3. Zet **Back-ups laten starten** aan voor een sleutel die back-ups moet kunnen starten; zonder dat kan hij alleen lezen. Je kunt het later op de tegel van de sleutel wijzigen, en de wijziging geldt vanaf het volgende verzoek van de assistent, zonder opnieuw te verbinden.
4. Klik op **Sleutel aanmaken**. De sleutel wordt één keer getoond. BombVault bewaart er alleen een vingerafdruk van en kan hem niet nog eens tonen, dus kopieer hem nu. Sluit je het venster voordat de client de sleutel heeft gebruikt, dan blijft de kaart hem tonen tot je bevestigt dat je hem hebt gekopieerd.

Zonder inlogwachtwoord staat de webinterface zelf open voor iedereen in je netwerk, en wie hem kan openen, kan ook een sleutel aanmaken. De kaart zegt dat. Open je BombVault onder een naam die er openbaar uitziet (bijvoorbeeld `bombvault.example.com` achter een reverse proxy) en is er geen inlogwachtwoord ingesteld, dan kunnen vanaf dat adres geen sleutels worden aangemaakt of vervangen, zodat geen webpagina op internet je browser er een kan laten aanmaken. Stel een inlogwachtwoord in, of open BombVault via zijn IP-adres of een lokale naam zoals `tower` of `tower.local`.

## Je sleutels en hun logboek {#keys}

Elke sleutel heeft een eigen tegel op de kaart. Die toont de naam van de sleutel, of hij back-ups mag starten of alleen leest, de laatste vier tekens van de sleutel, wanneer hij is aangemaakt of voor het laatst vervangen, wanneer een client hem voor het laatst gebruikte en hoeveel aanroepen hij vandaag deed. Op de tegel geef je de sleutel een andere naam, wijzig je zijn recht, vervang je hem of trek je hem in. Een ingetrokken sleutel verhuist naar de lijst met ingetrokken sleutels, waar je hem voorgoed kunt verwijderen zodra geen run in de geschiedenis hem nog noemt.

Naast de naam toont de tegel het logo van de client waarvoor de sleutel is gemaakt. Een sleutel die via **Andere client** is gemaakt, of voordat de kaart clients opsomde, toont in plaats daarvan een sleutel.

**Logboek** op een tegel opent wat die sleutel deed. Eerst komen de back-ups die hij startte, elk met zijn stand en een link naar die run in het activiteitenlogboek op het dashboard. Daaronder staan zijn aanroepen, nieuwste eerst, met de tool en wat er van de aanroep werd. Een weigering zegt waarom: de sleutel mag alleen lezen, de bewaarbeveiliging hield de back-up tegen, er liep al een andere back-up, het item is een paar minuten geleden via MCP geback-upt, of de sleutel stuurde te veel verzoeken. Een annulering linkt naar de run waar het om ging.

BombVault bewaart de regels van elke sleutel hooguit 30 dagen: de nieuwste 500 geslaagde starts en annuleringen en daarnaast de nieuwste 200 overige aanroepen (leesacties, weigeringen en fouten), zodat een assistent die een lopende back-up steeds opnieuw opvraagt of een geweigerde aanroep steeds opnieuw probeert de start ervan niet uit het logboek kan drukken. Per aanroep bewaart het de tool, de uitkomst en de run die een annulering noemde. Wat de assistent stuurde bewaart het nooit, en de sleutel of zijn vingerafdruk evenmin. Het diagnosepakket telt de regels alleen, en een export van de instellingen laat ze weg.

## Een client koppelen {#clients}

Elke client heeft een knop op de kaart, onder **Op deze computer** of **In de cloud**. De knop opent een venster in drie stappen: de sleutel; de configuratie voor die client, met het adres waarop je de kaart hebt geopend, een knop om haar te kopiëren, de plek waar de configuratie staat en, bij het eigen certificaat van BombVault, wat de client nodig heeft om het te vertrouwen; en het wachten op de eerste aanroep van de client. Het venster volgt het laatste gebruik van de sleutel en wordt groen zodra die aanroep binnenkomt.

Het venster houdt de sleutel van elke opdrachtregel af. Waar de client hem uit een omgevingsvariabele (`BOMBVAULT_MCP_KEY`), een gemaskeerde vraag of een eigen bestand kan lezen, noemt de configuratie hem alleen. Waar de client dat niet kan, staat de sleutel in zijn configuratiebestand of instellingen, en het venster zegt dat. Waar de documentatie van een client niet zegt hoe hij met een onbekend certificaat omgaat, schrijft het venster die stap als wat je doet als de client het certificaat van BombVault weigert.

| Client | Installatie | Waar de sleutel vandaan komt |
|---|---|---|
| AnythingLLM | configuratiebestand | het configuratiebestand |
| Antigravity | configuratiebestand | omgevingsvariabele |
| Claude Code | opdracht | sleutelbestand |
| Claude Desktop | configuratiebestand | sleutelbestand |
| Cline | configuratiebestand | het configuratiebestand |
| Codex CLI | configuratiebestand | omgevingsvariabele |
| Continue | configuratiebestand | `~/.continue/.env` |
| Copilot CLI | configuratiebestand | het configuratiebestand |
| Cursor | configuratiebestand | omgevingsvariabele |
| Gemini CLI | configuratiebestand | omgevingsvariabele |
| GitHub Copilot (VS Code) | configuratiebestand | gemaskeerde vraag |
| Goose | configuratiebestand | omgevingsvariabele |
| Jan | formulier in de app | de instellingen van de app |
| JetBrains (AI Assistant, Junie) | configuratiebestand | het configuratiebestand |
| Kimi Code | configuratiebestand | het configuratiebestand |
| LM Studio | configuratiebestand | het configuratiebestand |
| Mistral Vibe | configuratiebestand | omgevingsvariabele |
| Msty | formulier in de app | de instellingen van de app |
| n8n | formulier in de app | de inloggegevens van n8n |
| Open WebUI | formulier in de app | de instellingen van de app |
| opencode | configuratiebestand | omgevingsvariabele |
| Perplexity (Mac) | formulier in de app | sleutelbestand |
| Qwen Code | configuratiebestand | omgevingsvariabele |
| Roo Code | configuratiebestand | omgevingsvariabele |
| Visual Studio | configuratiebestand | het configuratiebestand |
| Warp | configuratiebestand | het configuratiebestand |
| Windsurf | configuratiebestand | omgevingsvariabele |
| Zed | configuratiebestand | het configuratiebestand |
| Grok | formulier, in de cloud | de servers van de aanbieder |
| Le Chat | formulier, in de cloud | de servers van de aanbieder |
| ChatGPT | in de cloud | alleen OAuth, zie hieronder |
| Claude (claude.ai) | in de cloud | OAuth in de meeste organisaties, zie hieronder |

De onderdelen hieronder leggen de installatie van Claude Code en Claude Desktop nauwkeuriger uit en noemen wat elke andere client nodig heeft.

### Claude Code {#claude-code}

Claude Code bereikt BombVault via `mcp-remote`, dat Node.js op die computer nodig heeft. Sla de sleutel eerst op in een eigen tekstbestand, als één regel:

```text
X-API-Key: <your key>
```

Voer daarna het commando van de kaart één keer uit in een terminal, met het pad van dat bestand ingevuld. Achter een certificaat dat je computer vertrouwt, ziet het er zo uit:

```bash
claude mcp add bombvault --scope user -- npx -y mcp-remote@latest https://bombvault.example.com/mcp --header-file "<path of the file with your key>"
```

Met BombVaults eigen certificaat (zie [TLS en certificaten](#tls)) wijst het commando Node.js ook op het gedownloade certificaat:

```bash
claude mcp add bombvault --scope user -e "NODE_EXTRA_CA_CERTS=<path of the downloaded bombvault-cert.pem>" -- npx -y mcp-remote@latest https://192.168.1.10:3443/mcp --header-file "<path of the file with your key>"
```

Controleer de verbinding met `/mcp` in Claude Code. `--scope user` maakt BombVault beschikbaar in al je projecten. Claude Code onthoudt alleen het pad van het sleutelbestand, dus de sleutel verschijnt niet in het commando en je shellgeschiedenis, en niet in de proceslijst. Zet het bestand op een plek waar alleen jij het kunt lezen, en buiten elke map die je commit. Door `@latest` haalt `npx` een actuele `mcp-remote` op; anders zou een oudere, globaal geïnstalleerde versie worden gebruikt, en die kent `--header-file` niet.

Zet `${BOMBVAULT_MCP_KEY}` voor Claude Code niet in de argumenten van `mcp-remote`. Claude Code vult zo'n verwijzing in vanuit zijn eigen omgeving voordat het `mcp-remote` start, zodat de sleutel op de opdrachtregel van dat proces belandt, waar andere programma's en gebruikers van de computer hem kunnen lezen.

Zonder Node.js, en alleen achter een certificaat dat je computer vertrouwt, kan Claude Code zelf verbinding maken. Zet een `.mcp.json` in de projectmap:

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

Stel `BOMBVAULT_MCP_KEY` in waar Claude Code start, bijvoorbeeld onder `"env"` in `~/.claude/settings.json` of in je shellprofiel, bewerkt in een teksteditor in plaats van getypt aan de prompt. Hier is de verwijzing veilig, omdat Claude Code geen tweede proces start dat hem zou meekrijgen. Met BombVaults eigen certificaat werkt dit niet: de verbinding die Claude Code zelf opzet, weigert het, ook als `NODE_EXTRA_CA_CERTS` is ingesteld. Commit nooit een `.mcp.json` waarin de sleutel uitgeschreven staat.

### Claude Desktop {#claude-desktop}

Claude Desktop bereikt BombVault via `mcp-remote`, dat Node.js op die computer nodig heeft. Bewaar de sleutel eerst in een eigen tekstbestand, als één regel, zoals beschreven bij [Claude Code](#claude-code). Open het configuratiebestand in Claude Desktop via **Settings, Developer, Edit Config**. Het staat op Windows in `%APPDATA%\Claude\claude_desktop_config.json` en op macOS in `~/Library/Application Support/Claude/claude_desktop_config.json`. Zet de vermelding van de kaart binnen `"mcpServers"`, naast de servers die er al staan, en start Claude Desktop opnieuw:

```json
{
  "mcpServers": {
    "bombvault": {
      "command": "npx",
      "args": ["-y", "mcp-remote@latest", "https://192.168.1.10:3443/mcp", "--header-file", "<path of the file with your key>"],
      "env": {
        "NODE_EXTRA_CA_CERTS": "<path of the downloaded bombvault-cert.pem>"
      }
    }
  }
}
```

- `NODE_EXTRA_CA_CERTS` staat er alleen voor BombVaults eigen certificaat. Achter een certificaat dat je computer al vertrouwt, laat je het weg.
- `--allow-http` komt er alleen bij voor een gewoon `http://`-adres.
- Schrijf de paden op Windows met gewone schuine strepen, bijvoorbeeld `C:/Users/sam/bombvault-key.txt`, want een losse backslash is geen geldige JSON. Houd het pad van het sleutelbestand vrij van spaties: Claude Desktop op Windows geeft een pad met een spatie in twee stukken door aan `npx`.
- De configuratie noemt alleen het sleutelbestand, dus de sleutel verschijnt niet daarin en ook niet in de proceslijst. Zet het bestand op een plek waar alleen jij het kunt lezen.

### Clients in de cloud {#cloud-clients}

ChatGPT, Claude op claude.ai, Grok en Le Chat roepen BombVault aan vanaf de servers van hun aanbieder, dus BombVault moet vanaf internet bereikbaar zijn met een publiek vertrouwd certificaat, bijvoorbeeld achter een reverse proxy; Le Chat weigert zelfondertekende. Een aanmelding op de proxy mag de webinterface beschermen, maar `/mcp` moet zonder aanmelding door naar BombVault: deze diensten kunnen zich niet bij een proxy aanmelden, en BombVault controleert hun sleutel zelf. Grok en Le Chat kunnen een vaste sleutel sturen, en hun knoppen richten ze in zoals de andere. ChatGPT verbindt alleen via een OAuth-aanmelding, en Claude op claude.ai accepteert een vaste sleutelheader alleen in sommige organisaties. BombVault krijgt OAuth-aanmelding met de volgende update; tot dan zeggen hun knoppen dat in plaats van een installatie te bieden.

### Andere clients {#other-clients}

Elke client die Streamable HTTP spreekt, werkt:

- URL: het adres van de webinterface plus `/mcp`, bijvoorbeeld `https://192.168.1.10:3443/mcp`.
- De sleutel in `Authorization: Bearer <key>` of in `X-API-Key: <key>`. Komen ze allebei mee, dan moeten ze dezelfde sleutel bevatten.
- `POST` met `Content-Type: application/json` en `Accept: application/json, text/event-stream`.
- Eén JSON-RPC-bericht per verzoek; batches worden geweigerd.
- Protocolversies 2026-07-28, 2025-11-25, 2025-06-18 en 2025-03-26.

## TLS en certificaten {#tls}

BombVault levert HTTPS met een certificaat dat het zelf heeft uitgegeven, en dat certificaat noemt in het begin alleen `localhost`, `127.0.0.1` en `::1`. Claude Code en `mcp-remote` weigeren het op een LAN-adres. De uitwegen, in de volgorde die bij de meeste Unraid-installaties past:

1. **Het adres toevoegen in de MCP-kaart.** Open je de kaart via HTTPS op een adres dat het certificaat niet noemt, dan zegt de kaart dat en biedt ze **Dit adres aan het certificaat toevoegen** aan. BombVault geeft zijn certificaat dan opnieuw uit met dat adres erbij (je browser waarschuwt nog één keer, net als de eerste keer). Klik daarna op **Certificaat downloaden**; de fragmenten zetten `NODE_EXTRA_CA_CERTS` op het gedownloade bestand, zodat de client precies dat certificaat vertrouwt. Dat betekent ook dat elke client die met een eerder gedownload bestand is ingesteld geen verbinding meer maakt zodra het certificaat opnieuw is uitgegeven, op deze computer en op elke andere, tot hij het nieuwe bestand krijgt.
2. **Een reverse proxy met een vertrouwd certificaat** (Nginx Proxy Manager, SWAG, Caddy, Traefik). De client ziet dan het certificaat van de proxy en heeft niets extra's nodig, en de kaart waarschuwt niet over dat van BombVault.
3. **Tailscale.** `tailscale serve` voor de container, of de Tailscale-integratie van Unraid, geeft je een `ts.net`-naam met een vertrouwd certificaat.
4. **`HTTP_ONLY=true`**, alleen achter een proxy die TLS afhandelt of in een netwerk dat je volledig vertrouwt. Het zet de hele webinterface op gewoon HTTP, vraagt een wijziging in de containerinstellingen en stuurt de sleutel onversleuteld.

Zet nooit `NODE_TLS_REJECT_UNAUTHORIZED=0`. Dat schakelt de certificaatcontrole uit voor alles waarmee dat Node.js-proces praat.

Een reverse proxy moet de header `Authorization` (of `X-API-Key`) doorgeven, wat proxy's doen tenzij je ze anders opdraagt, en mag `/mcp` niet bufferen of herschrijven. Een location-blok voor Nginx of Nginx Proxy Manager dat ook het certificaat van BombVault controleert:

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

Achter een proxy draagt elk verzoek het adres van de proxy. Vijf verkeerde sleutels van één verkeerd ingestelde client sluiten dan elke MCP-client achter die proxy een minuut lang buiten. Zet de proxy in `TRUSTED_PROXY` (zie [Configuratie](configuration.md)) om per client te tellen.

## Beveiligingsmodel {#security}

- Zonder actieve sleutel antwoordt `/mcp` met `404`.
- Geen uitzonderingen voor adressen. Verzoeken van `localhost`, van de Unraid-host, van een reverse proxy of van `tailscale serve` hebben een sleutel nodig zoals elk ander, ook als de webinterface geen inlogwachtwoord heeft.
- Sleutels worden alleen als vingerafdruk opgeslagen, één keer getoond, en kunnen worden hernoemd, vervangen en ingetrokken. Tot 10 actieve sleutels, elk met een eigen schakelaar **Back-ups laten starten**.
- Elk aanmaken, vervangen, elke rechtenwijziging en elke intrekking stuurt een melding via je meldingskanalen, met het adres waar het vandaan kwam, tenzij meldingen uit staan.
- 5 verkeerde sleutels per minuut per adres, daarna `429`. 120 verzoeken per minuut en 12 gestarte back-ups per uur per sleutel, plus de wachttijd en de bewaarbeveiliging van hierboven.
- Verzoeken van een browserpagina met een andere origin worden geweigerd.
- Zolang er geen inlogwachtwoord is, kunnen er geen sleutels worden aangemaakt vanaf een hostnaam die er openbaar uitziet.
- Elke back-up die een assistent start, en de prune- en off-site-runs die eruit volgen, is gemarkeerd met "via MCP" en de naam van de sleutel: in het activiteitenlogboek, in het foutpaneel en in de back-upmelding.
- Elke aanroep van een hulpmiddel komt in het containerlog met de id van de sleutel en de laatste vier tekens (nooit de naam) en wordt geteld in `/metrics` (`bombvault_mcp_requests_total`, `bombvault_mcp_tool_calls_total`, `bombvault_mcp_active_keys`).
- Het herstellen van een configuratieback-up trekt elke sleutel in, omdat de herstelde database sleutels kan bevatten die je na het opslaan ervan hebt ingetrokken. Maak daarna nieuwe aan.
- Een sleutel werkt niet meer als `APP_KEY` verandert (een herinstallatie of een herstel in een andere container). De kaart merkt dat op en markeert de sleutel, en **Sleutel vervangen** geeft hem weer een geldig geheim.
- Behandel een sleutel als een wachtwoord. Een client die de sleutel niet uit een omgevingsvariabele, een vraag of een sleutelbestand kan lezen, bewaart hem als platte tekst in zijn configuratie of instellingen, en zijn venster zegt dat. Neem op een computer die je minder vertrouwt liever een sleutel die alleen mag lezen.

## Wat de machine verlaat {#privacy}

Wat een assistent leest, gaat naar de AI-aanbieder erachter: namen van items, planningen, runhistorie met foutmeldingen, id's en tijden van herstelpunten, namen van database-engines en groottes van dumps, lopende activiteit, opslagcijfers, dekking en status. BombVault haalt hostpaden, repositorylocaties, hostnamen, inloggegevens, hookcommando's en sleutels eruit voordat er iets vertrekt.

## Problemen oplossen {#troubleshooting}

| Wat je ziet | Wat het betekent |
|---|---|
| `404` | Geen actieve sleutel, of een verkeerd pad zoals `/api/mcp`. Het eindpunt is `/mcp`. |
| `401` | De sleutel ontbreekt, is verkeerd getypt, ingetrokken of vervangen. Misschien laat een proxy de header `Authorization` vallen (probeer `X-API-Key`). Markeert de kaart de sleutel als niet meer geldig, dan is `APP_KEY` veranderd: vervang de sleutel. |
| `403` | Het verzoek kwam van een browserpagina met een andere origin. Gebruik een desktop- of opdrachtregelclient. |
| `405` bij GET | Normaal. Het eindpunt neemt alleen `POST` aan. |
| `400` "Accept must contain both 'application/json' and 'text/event-stream'" | De client is te oud voor Streamable HTTP. Werk hem bij. |
| `400` "batch requests are not accepted" | De client stuurt JSON-RPC-batches. Stuur één bericht per verzoek. |
| `429` | Te veel verkeerde sleutels vanaf dit adres, of meer dan 120 verzoeken per minuut met één sleutel. Wacht een minuut en kijk of de assistent in een lus zit. |
| Fouten met "certificate", "self-signed" of "unable to verify" | De client vertrouwt het certificaat van BombVault niet. Zie [TLS en certificaten](#tls). |
| `busy` | Een andere back-up of een onderhoudstaak bezet dat domein. Probeer het opnieuw als die klaar is. |
| `cooldown` | Dit item, dit domein of Backup Everything is minder dan 15 minuten geleden via MCP gestart. |
| `retention_guard` | Nog een MCP-back-up zou in een venster "laatste N bewaren" alleen herstelpunten uit MCP overlaten, of het item heeft in de afgelopen 24 uur al 4 back-ups via MCP gehad, mislukte en afgebroken meegeteld. In het eerste geval maakt de volgende geplande back-up ruimte, in het tweede is het item 24 uur na de oudste van die back-ups weer vrij. In beide gevallen kun je hem in de webinterface starten. |
| `rate_limited` | De sleutel heeft zijn 12 starts voor dit uur opgebruikt. |
| `not_permitted` bij een start | De sleutel mag alleen lezen. Zet **Back-ups laten starten** aan in de kaart; een nieuwe verbinding is niet nodig. Bij een annulering betekent het dat deze sleutel de run niet heeft gestart. |
| `domain_off` | Dat soort back-up staat uit in de instellingen. |
| `not_found` | BombVault beschermt dat item niet. Voeg het eerst toe in de webinterface; MCP maakt nooit configuratie aan. |

Zet de omgevingsvariabele `MCPGODEBUG` niet op de container. Die verandert het gedrag van de MCP-bibliotheek, en een onjuiste waarde houdt BombVault bij het starten tegen voordat het ook maar één logregel schrijft.
