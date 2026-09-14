---
task: "260914-nsv — Neutraliser l'inset safe-area fantôme du bas (D-11, device réel Android) + contrôle platform dans Settings"
quick_id: 260914-nsv
status: planned
branch: docker-folders
date: 2026-09-14
---

# Plan 260914-nsv — Safe-area bottom fantôme (D-11) + contrôle platform en Settings

## Contexte

Sur Android navigateur, `viewport-fit=cover` (requis par le shell, `web/index.html`) fait
rapporter à `env(safe-area-inset-bottom)` la hauteur de la barre système alors que la page
ne va pas réellement dessous → inset fantôme qui alimente `--safe-area-bottom`
(`:root`, `web/src/index.css:231-236`) et produit les 2 vides vus sur device :
`web/src/components/mobile/BottomNav.tsx:105` (~80px sous la nav) et
`web/src/components/mobile/StickyActionBar.tsx:32` (~67px dans la card Save).
Autres consumers : `web/src/components/mobile/BottomSheet.tsx:292/302`, `web/src/pages/Login.tsx:75`.

Décision user D-11 (2026-09-14, real-device pass — le venue que D-12 avait réservé) :
« zéro sous material + contrôle Settings ». Décisions actées, non rouvrables.

Faits vérifiés à la planification (à ne pas redécouvrir) :

- `web/src/lib/platform.ts` fournit TOUT le mécanisme : `PLATFORMS` (= `["material","cupertino"]`),
  `PLATFORM_STORAGE_KEY` (= `"bv-platform"`), `getPlatform()`, `applyPlatform()` (LE choke point
  unique `setAttribute("data-platform")`, garde PLAT-01 `mobileShellSource.test.ts:523-535`),
  `applyStoredPlatform()` (boot + adopted-event), `usePlatform()` (lit l'attribut, se re-rend sur
  l'annonce `bv:platform-changed` + cross-tab storage). **Aucun writer de persistance n'existe
  encore dans src/** (l'e2e sème `bv-platform` directement) — le contrôle Settings devient le
  premier writer : `localStorage.setItem(PLATFORM_STORAGE_KEY, id)` PUIS `applyPlatform(id)`.
- index.css a déjà deux blocs `:root[data-platform="material"|"cupertino"]` (lignes ~626/645,
  tokens `--mob-*` PLAT-01). La nouvelle règle est un bloc SÉPARÉ, placé juste après le bloc
  `:root` safe-area (ligne ~236), PAS fusionné dans le bloc `--mob-*` (axes différents ; garder
  l'histoire SHELL-04 au même endroit). Spécificité (0,2,0) bat le `:root` nu (0,1,0) :
  l'emplacement est de la lisibilité, pas de la cascade.
- Pattern contrôle existant : la carte Shape (`Settings.tsx:4822-4846`) et Motion (`:4872-4893`)
  — `Card` avec `title`/`hint`/`hueIndex={nextHue()}` + `Selector` `select="one"` `size="lg"`
  `variant="well" `equalWidth``, items mappés sur une const union avec clés
  `settings.<axe>.<valeur>` castées `as TranslationKey`.
- Tables i18n : **42 tables** = bloc `en` INLINE dans `web/src/lib/i18n.ts` (~ligne 917, zone
  `settings.shape*`) + bloc `de` INLINE dans le même fichier (~ligne 2668) + 40 modules
  `web/src/lib/locales/{ar..zh}.ts`. Convention : copies réellement traduites par langue
  (commit 1d664c5a : fr a reçu « Étape {n} sur {total} »). Aucune clé `settings.platform*`
  n'existe. Les clés pré-seedées sont couvertes contre le gate orphans tant qu'elles figurent
  dans une const preseed de `web/src/lib/i18n.preseed.test.ts` (mécanisme 07-02/08-01).
- Garde PLAT-01 : les needles `navigator.userAgent` / `userAgentData` sont bannis de tout src/
  (`mobileShellSource.test.ts:507-521`). AUCUNE détection OS nouvelle — le contrôle écrit la
  préférence, rien de plus. Le texte de garde sanctionné : needles dans le fichier de test
  uniquement.
- Windows : les shims npm/npx perdent node du PATH (observation #13) — TOUTES les commandes
  ci-dessous sont en invocation node directe, depuis `web/`.

Choix i18n arrêtés par le planner (décision documentée) :

- Clés : `settings.platform` (label), `settings.platformHint`, `settings.platform.material`,
  `settings.platform.cupertino`. Les 2 labels d'option sont des noms propres du design language :
  **invariants « Material » / « Cupertino » dans les 42 tables**.
- Copy de référence : en `"Platform"` / `"How the app's mobile chrome is shaped: Material
  follows Android's conventions, Cupertino follows iOS's."` ; fr `"Plateforme"` / `"La forme de
  l'interface mobile : Material suit les conventions d'Android, Cupertino celles d'iOS."` ;
  de `"Plattform"` / `"Die Form der mobilen Oberfläche: Material folgt Androids Konventionen,
  Cupertino denen von iOS."` Les 38 autres langues : traduire label + hint dans le registre de
  chaque table (le hint une phrase, pas plus), noms propres verbatim, **aucun em dash ni en dash**
  (`—`, `–` interdits partout, testé). Placement dans chaque table : à côté des clés
  `settings.motion*` existantes.

## Tasks

### Task 1 — CSS : `:root[data-platform="material"] { --safe-area-bottom: 0px }` + garde source

**Fichiers :** `web/src/index.css`, `web/src/app/mobileShellSource.test.ts`

**Quoi faire :**

1. `web/src/index.css` : immédiatement APRÈS le bloc `:root` safe-area (après la ligne 236,
   avant `.glim-card`), ajouter le bloc et son commentaire why au style maison (paragraphe
   narratif, c'est la convention signature du repo). Contenu du commentaire àporter (adapté
   librement mais gardez ces faits) : le fantôme Android sous `viewport-fit=cover` (le meta est
   requis par le shell, l'un est le contrat de l'autre — SHELL-04) ; D-11 au real-device pass du
   2026-09-14, le venue que D-12 avait réservé ; sur device les ~80px sous BottomNav et ~67px
   dans la StickyActionBar ; material est la plateforme d'Android donc il zero le bas ;
   **cupertino garde l'inset réel** (l'home indicator iPhone réclame réellement cet espace) ;
   `--safe-area-top/right/left` INCHANGÉS (aucun fantôme observé sur les autres axes) ; desktop
   inchangé (l'attribut est toujours tamponné au boot, défaut material, où env() lit déjà ~0).
   La règle : exactement `--safe-area-bottom: 0px;` — rien d'autre dans le bloc.
2. `web/src/app/mobileShellSource.test.ts` : étendre le `describe` SHELL-04 existant (ligne ~78)
   avec un `it` D-11 (ou petit describe frère) qui :
   - travaille sur le texte de index.css **strippé des commentaires**
     (`/* ... */` → `""`) — les mentions en prose du why-commentaire sont sanctionnées, la
     négation ne doit viser que les CORPS de règles (leçon tombstone : un ban non scanné compte
     les commentaires) ;
   - positif : une règle `:root[data-platform="material"]` dont le corps contient
     `--safe-area-bottom: 0px` existe (ex. regex
     `/:root\[data-platform="material"\]\s*\{[^}]*--safe-area-bottom:\s*0px/`) ;
   - périmètre : le corps de CETTE règle ne déclare aucun `--safe-area-top/right/left`
     (l'override ne touche que le bas) ;
   - négatif : pour CHAQUE règle dont le sélecteur contient `data-platform="cupertino"`
     (les blocs `--mob-*` existants ET la règle `main#bv-main h1` — extraire les corps par
     matchAll sur le texte strippé), le corps ne contient pas `--safe-area-bottom`.
   - Messages d'échec au style maison : dire QUOI restaurer et POURQUOI (D-11, cupertino garde
     l'inset réel). Note : le matchAll `--safe-area-[a-z]+:\s*max\(env\(safe-area-inset-` de
     DEFINITIONS (ligne ~80) ne matche PAS notre `0px` → le seuil `>= 4` existant reste vrai.
   - Aucun needle UA dans le nouveau code (le garde PLAT-01 scannerait src/ et échouerait).

**Vérifier (depuis `web/`) :**

```
node node_modules/vitest/vitest.mjs run src/app/mobileShellSource.test.ts
```

**Commit 1 (atomique, staging explicite uniquement — ne JAMAIS `git add -A`, ne jamais
silencier une erreur de `git add` avec `2>/dev/null`) :**

```
git add web/src/index.css web/src/app/mobileShellSource.test.ts
git commit -m "fix(web): zero the phantom Android safe-area bottom inset on material (D-11)" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

Relire `git show --stat` : exactement 2 fichiers. Habit post-commit (observation #17) : un
pathspec erroné fait échouer l'APPEL ENTIER de `git add` — vérifier le compte avant de committer.

### Task 2 — i18n : pré-seed `settings.platform*` dans les 42 tables + pin preseed

**Fichiers :** `web/src/lib/i18n.ts`, `web/src/lib/locales/ar.ts` … `web/src/lib/locales/zh.ts`
(les 40 modules), `web/src/lib/i18n.preseed.test.ts`

**Quoi faire :**

1. `web/src/lib/i18n.ts` : ajouter les 4 clés dans le bloc `en` (à côté de `settings.motion*`,
   ~ligne 925) ET dans le bloc `de` (~ligne 2668) avec les copy de référence ci-dessus.
2. Les 40 modules `web/src/lib/locales/*.ts` : les 4 clés dans chaque table —
   `settings.platform.material` = `"Material"` et `settings.platform.cupertino` = `"Cupertino"`
   verbatim partout ; `settings.platform` + `settings.platformHint` traduits par langue
   (fr/de exacts ci-dessus ; les 38 autres dans le registre de chaque table, phrase unique,
   sans dash). Pattern d'insertion : au voisinage des clés `settings.*` existantes de chaque
   table, même position relative que dans en (après motion, avant labels).
3. `web/src/lib/i18n.preseed.test.ts` : nouveau bloc phase-quick mirroring `PRESEED8_EN`
   (const des 4 clés avec la copy en exacte + describe) avec ces 4 asserts : en porte la copy
   exacte ; **de non-videl SANS le `not.toBe(en)`** (déviation délibérée du bloc 08-01 :
   « Material » est un invariant, l'assert de différence échouerait à tort) ; chaque locale
   porte chaque clé non vide ; aucune valeur en aucune langue ne porte `—` ni `–`. C'est ce
   bloc qui satisfait le gate orphans jusqu'au commit 3.

**Vérifier (depuis `web/`) :**

```
node node_modules/vitest/vitest.mjs run src/lib/i18n.preseed.test.ts src/lib/i18n.parity.test.ts src/lib/i18n.orphans.test.ts src/lib/i18n.quality.test.ts
```

**Commit 2 :**

```
git add web/src/lib/i18n.ts web/src/lib/i18n.preseed.test.ts web/src/lib/locales/*.ts
git commit -m "feat(web): pre-seed settings.platform* across all 42 locale tables" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

`web/src/lib/locales/*.ts` n'expand que les 40 modules trackés (aucun non-tracké n'y vit).
Relire `git show --stat` : 42 fichiers.

### Task 3 — Contrôle platform dans Settings + test DOM + build dist

**Fichiers :** `web/src/pages/Settings.tsx`, `web/src/pages/Settings.platformCard.dom.test.tsx`
(nouveau), `web/dist/` (build)

**Quoi faire :**

1. `web/src/pages/Settings.tsx` :
   - import : `import { PLATFORMS, PLATFORM_STORAGE_KEY, applyPlatform, usePlatform, type Platform } from "../lib/platform";` (à côté des imports `../lib/shape`/`../lib/motion`, lignes 53-54) ;
   - dans le corps du composant Settings, à côté des lectures shape/motion :
     `const platform = usePlatform();` — **pas de miroir d'état local** (contrairement à
     `setShapeLocal`) : `applyPlatform()` annonce `bv:platform-changed` et `usePlatform()`
     relit l'attribut → le `active` du Selector suit la valeur APPLIQUÉE, un seul writer ;
   - nouvelle carte directement APRÈS la carte Motion (après la ligne 4893, avant le bloc
     Labels) — même registre : `{tab === "general" && (<Card title={t("settings.platform")}
     hint={t("settings.platformHint")} hueIndex={nextHue()}>` avec un `Selector` copié sur
     Motion : `items={PLATFORMS.map((p) => ({ id: p, label: t(\`settings.platform.${p}\` as
     TranslationKey) }))}`, `label={t("settings.platform")}`, `select="one"`,
     `active={platform}`, `size="lg"`, `variant="well"`, `equalWidth`, et
     `onChange={(id) => { localStorage.setItem(PLATFORM_STORAGE_KEY, id);
     applyPlatform(id as Platform); }}`. Commentaire why au style maison au-dessus de la carte :
     D-11 — material zero l'inset fantôme du bas (la règle CSS de la task 1), le contrôle est
     l'UI du choix, PLAT-01 interdit toute détection OS ; pourquoi pas de miroir local.
2. `web/src/pages/Settings.platformCard.dom.test.tsx` (nouveau) : `// @vitest-environment jsdom`,
   harnais calqué sur `Settings.settingsWrites.dom.test.tsx` (montage de la page Settings avec
   les mocks api établis par ce fichier — les lire d'abord ; si son harnais s'avère trop
   couplé aux writes serveur, s'inspirer de `Settings.themeCard.dom.test.tsx` pour l'aspect
   I18nProvider + rendu). Asserts : la carte Platform rend dans l'onglet General ; les 2
   segments Material/Cupertino sont présents ; material est actif par défaut
   (`aria-selected`) ; cliquer Cupertino → `document.documentElement` porte
   `data-platform="cupertino"` ET `localStorage["bv-platform"] === "cupertino"` ; cliquer
   Material → retour à `"material"` des deux côtés. `localStorage.removeItem("bv-platform")`
   dans `beforeEach` (le pattern ThemeCard).
3. Suite complète puis build (l'ordre compte — dist embarque les 3 tasks) :

**Vérifier (depuis `web/`, dans l'ordre) :**

```
node node_modules/vitest/vitest.mjs run src/pages/Settings.platformCard.dom.test.tsx
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
```

La suite complète doit être verte (elle l'est au départ ; si un test hors périmètre tombe,
ne pas le patcher silencieusement — investiguer, c'est probablement un couplage réel).

**Commit 3 :**

```
git add web/src/pages/Settings.tsx web/src/pages/Settings.platformCard.dom.test.tsx web/dist
git commit -m "feat(web): platform control in Settings General (material|cupertino) (D-11)" -m "Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

`web/dist` est reconstruit à l'étape 3 : il embarque aussi le CSS de la task 1 (l'embed go lit
dist au `go build`, pas à chaque commit). `web/dist/index.html` est actuellement modifié
localement par un build antérieur : le rebuild le régénère cohérent, le stager est attendu.
Le `build` (vite) régénère les empreintes : ne stager QUE via `web/dist` après le build.

## Garde-fous transverses (chaque task)

- **Staging** : fichiers explicites uniquement. NE JAMAIS committer : les `*.png` non-trackés de
  la racine, `.playwright-mcp/`, `web/pw-*.log`, `web/e2e/desktop-untouched.spec.ts` (modifié
  localement), `web/e2e/guided-restore.spec.ts`, `web/src/pages/Recovery.mobile.dom.test.tsx`,
  `.gsd/`, les artefacts `.planning/` non commités (l'orchestrateur les commite), `ROADMAP.md`.
- **Branche** : rester sur `docker-folders` (déjà checkout). Un trailer
  `Co-Authored-By: Claude Code <noreply@anthropic.com>` par commit, pas plus.
- **Redeploy Unraid hors périmètre.** `DESKTOP_QUERY` (min-width: 48rem) : rien à changer, fix
  hors breakpoint. Zéro dépendance npm runtime. Aucun `navigator.userAgent`/`userAgentData`
  dans src/ (PLAT-01 — le garde échouera sinon).
- **Critères de done** : `--safe-area-bottom` vaut `0px` sous material (phantôme mort sur
  device Android), inchangé sous cupertino ; le contrôle Settings bascule material|cupertino
  avec persistance `bv-platform` + application attribut immédiate (sans reload) ; 4 clés i18n
  présentes non vides dans les 42 tables, pin preseed vert ; suite vitest complète verte ;
  tsc + vite build verts ; 3 commits atomiques, stats conformes.

## PLANNING COMPLETE
