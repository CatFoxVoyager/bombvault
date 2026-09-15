---
task: "260914-ugv — Compacter mobile-only les rangées Integrity et les segments Selector pour tenir sur une ligne à 360px (verdict device D-11 : wrap 2-lignes)"
quick_id: 260914-ugv
status: planned
branch: docker-folders
date: 2026-09-14
---

# Plan 260914-ugv — Une ligne à 360px : rangées Integrity + segments Selector (D-11)

## Contexte

Verdict device D-11 (2026-09-14, build déployé `mobilefix-877600d5`, opérateur sur Android
~360 CSS px) : DEUX surfaces wrappent sur 2 lignes à ~360px.

1. **Rangées de domaines de `IntegrityCard`** (`web/src/pages/settings/IntegrityCard.tsx`) :
   à 360px le `flex-wrap` rejette le bouton drill + le statut inline en 2e ligne. Le
   commentaire 454-464 rappelle l'intention historique (jdp, live-review : « Die Buttons
   bei Container, VMs, etc sollen alle in einer Zeile stehen ») — le wrap actuel la
   contredit sur mobile. Direction choisie : COMPACTER mobile-only, tout sur UNE ligne.
2. **Segments `Selector`** (composant PARTAGÉ, `web/src/components/Selector.tsx`) :
   sous-section Labels de la carte Apparence (Settings General, 3 selectors Buttons /
   Sidebar / Tabs, options Text | Text and symbol | Symbol | Reactive) — à 360px le 4e
   segment (« Reactive », actif) est rejeté seul en 2e ligne. Direction : compacter les
   SEGMENTS dans le COMPOSANT (couvre tous les call sites), le mécanisme wrap RESTE le
   fallback (décision « never scrolls » round 8 intacte — AUCUN scroll ajouté).

Desktop intact : tout fix via le variant mobile uniquement. Aucune classe `md:`/desktop
modifiée.

## Faits vérifiés sur l'arbre à la planification (re-sonder les numéros de ligne à l'exécution, ils peuvent glisser)

**IntegrityCard.tsx** :

- Rangée :465 `<div className="flex items-center gap-2 flex-wrap">` ; label :466
  `<span className="text-sm text-carbon-textSub w-24 shrink-0">{label}</span>` (w-24 = 96px).
- Boutons d'action : tableau `actions` :295-328 — verify (`IconCheckCircle`), unlock
  (`IconKey`), prune (`IconPrune`) UNIQUEMENT si `advanced` (useAdvanced :52). Chaque
  bouton = `<Button label labelKey glyph tone="neutral" hueIndex title={t(integrity.*Hint)}>`
  (:471-483). AUCUN ne passe de prop de mode.
- Bouton drill :499-521 : label TEXTE (`t("drill.runDR")` / `t("verify.now")` selon
  `kind`), `labelKey` suit la même branche, `glyph={<IconCheckCircle />}`, title commute
  busy/hint :515-519.
- Statut inline :537-556 : idle seulement — `t("verify.never")` (:554) ou
  `drill.checkLocal`/`drill.checkOffsiteDr` + « · » + relativeTime + ✓/✗ (:540-546),
  `text-xs text-carbon-textMuted` ; en cas d'échec stocké, une 2e span reason :547-551.
- **Rangée tamper append-only :565-619** (domaines éligibles #109) : contient UN AUTRE
  `w-24 shrink-0` (:566, spacer d'alignement, sans le span label). Toute compaction de
  largeur du label principal doit être répercutée sur ce spacer, sinon le bouton tamper
  se désaligne du reste sur mobile.
- **Aucun test DOM existant ne rend IntegrityCard** (grep vérifié : 13 fichiers référencent
  le nom, tous source ; pas de `IntegrityCard.*test.*`). Props : `{t, settings,
  setSettings, save, hueIndex}` (:33-49) + hooks contextuels useAdvanced/useConfirm/useToast
  (:52-54).

**Selector.tsx** :

- Well track :969 `w-fit max-w-full flex-wrap gap-[0.2rem] rounded-control
  bg-carbon-surface3 p-[0.2rem]` ; défaut :970 `flex-wrap gap-1`. Commentaire :925 :
  « Wraps (flex-wrap), never scrolls » — décision round 8 documentée.
- **Ne pas toucher au groove 0.2rem** : commentaire :944-948 — la valeur est établie pour
  ce rôle exact ; le [0.15rem] du round 7 rendait l'anneau illisible. La compaction passe
  par les SEGMENTS, jamais par le groove.
- Segments — les classes atterrissent en TROIS endroits : `SIZE[size].text` :1065
  (`lg` = `text-sm`), padding : `SIZE[size].padding` :1132 (branche equalWidth) ou
  `segmentPadding(size, !!item.icon)` :1134/:1137 (const SIZE :464-474 ; `lg` =
  `px-3 glim-seg`). Les 3 selectors Labels passent `size="lg" variant="well" equalWidth`
  SANS glyphes (Settings.tsx:5032-5050) → branche :1132, hauteur entièrement portée par
  `glim-seg` (moteur).
- Sous 48rem le pinning `pinWidth` est SUPPRIMÉ (header 5d, :155-169, autorité
  `DESKTOP_QUERY` de useMediaQuery — même axe que les variants `max-md:`). Les segments
  equalWidth gardent leurs classes (`flex-none justify-center text-center
  h-[var(--badge-md)]`) mais perduent la largeur inline — c'est la présentation
  content-hugging qui wrap.
- Tests existants : `Selector.test.ts` (pur, sans jsdom), `Selector.dom.test.tsx`
  (desktop pinning), `Selector.mobile.dom.test.tsx` (suppression du pinning ; son test 4
  :144-157 asserte `flex-none`/`justify-center`/`h-[var(--badge-md)]` — à ne pas casser).
  **Aucun test n'asserte `text-sm` ni `px-3`** (grep vérifié). Note :24-28 de la suite
  mobile : jsdom n'applique PAS les media queries — la moitié `max-md:` d'un fix ne peut
  pas être prouvée par style calculé en test, seulement par présence de classes ou
  arithmétique.

**Mécanismes — la loi de cascade de ce repo (index.css:1756-1772, documentée sur place)** :

| Cible | Mécanisme qui MARCHE | Mécanisme MORT (ne pas tenter) |
|---|---|---|
| Label :466, gap :465, spans statut :540-554, spacer :566 | Utilitaires `max-md:` sur les éléments eux-mêmes (utilitaire vs utilitaire — le variant mobile gagne dans la couche utilities) | — |
| Glyph du bouton drill | Envelopper le ReactNode passé à `glyph` dans `<span className="max-md:hidden">…</span>` (l'utilitaire porte sur NOTRE span, pas sur le Button) — UNIQUEMENT si le mode rendu montre le texte (voir le piège plus bas) | — |
| Le Button lui-même (padding-inline / font-size / height) | **Route moteur** : règle dans le bloc `@media not all and (width>=48rem)` EXISTANT (index.css:691-728) ou bloc jumeau avec la même condition MIRRORÉE VERBATIM (c'est la forme exacte que Tailwind v4 compile pour `max-md:` — le bloc existant documente ce mirroring :688-690). CSS auteur non-layered, placé APRÈS `.glim-btn` (:275) → gagne. Scoper via une classe modificatrice posée uniquement sur les boutons visés (pattern `--mob-*` : tokens lus ONLY sous md, desktop intacts, T-07-02) | `max-md:px-*` / `max-md:text-*` / `max-md:h-*` dans le `className` du Button : `.glim-btn` (index.css:275) est UNLAYERED, les utilitaires vivent dans `@layer utilities` — unlayered bat layered QUELQUE SOIT l'ordre et la spécificité. Bataille perdue d'avance |
| Segments Selector | `max-md:` utilitaires ajoutés aux classes de segment (les propriétés visées `px-3`/`text-sm` sont des UTILITAIRES — même couche, le variant mobile gagne). Précédent maison : `MOBILE_BLEED` (Button.tsx:127, une const de classes `max-md:` jointe dans la liste). `glim-seg` (hauteur) est moteur : NE PAS essayer de réduire la hauteur par utilitaire — et c'est voulu (cible tactile préservée ; ces selectors sont déjà « sub-floor-by-design » D-11, 37.6px confirmés utilisables) | Toucher au groove `gap/p-[0.2rem]` du track (:944-948 l'interdit) ; ajouter tout mécanisme de scroll |

**Piège à trancher AVANT de choisir les leviers (Task 1, étape 0)** — tous les boutons de
la rangée partagent UN axe : `useLabelMode("buttons")` (Button.tsx:251, `effective`
:276-284, `showText`/`showGlyph` :289-290). Le brief décrit les boutons d'action comme
icônes seules MAIS le drill comme texte+glyphe ; or un seul axe les gouverne tous les
deux. L'executor doit d'abord établir le mode RENDU à 360px sur le device D-11 (captures
`ui-review-mobile-390-*.png` / `uat-*.png` à la racine du repo, ou lecture de
`hidesLabel`/defaults dans `web/src/lib/appearance.ts`) :

- Si le mode rendu montre le texte (drill textuel) : cacher le glyph du drill mobile est
  UNE option légale (le libellé porte le sens ; title/aria intacts car Button rend déjà
  le label pour l'accessibilité hors modes montrant le texte).
- Si le mode rendu est glyph (tout est icônes) : **INTERDIT de cacher le glyph du drill**
  — il resterait un bouton vide, exactement la boîte vide que Button.tsx:259-261 interdit
  (« an empty box is unusable »). La compaction vient alors du label (w-24 → plus
  étroit), du gap, du statut, et si l'arithmétique l'exige de la route moteur (padding
  des 4 boutons).

Quelle que soit l'issue : la garantie « UNE ligne à 360px » est scopée à la configuration
rendue observée par le D-11 (locale fr de l'opérateur). Les modes plus verbeux (labels
textuels sur les boutons d'action) et les locales plus longues (de : « Noch nie
überprüft ») restent couverts par le wrap, qui reste le fallback PAR DESIGN
(« never scrolls » intact). Le dire explicitement dans le commentaire why et le SUMMARY.

**Convention `web/dist` réconciliée** (le brief a été sondé, pas copié) :
`git ls-files web/dist` → `web/dist/index.html` est le SEUL fichier dist tracké (assets
hashés ignorés) ; il est d'ailleurs actuellement `M` dans le worktree (build
`mobilefix-877600d5` déployé). STATE.md:186 (note phase 8, « restore the placeholder
before committing ») est SUPERSÉDÉE par le pattern nsv cité par l'opérateur : on
committe l'index.html RÉGÉNÉRÉ (un vrai index.html satisfait `go:embed` aussi bien que
le placeholder — le placeholder n'était que le filet `go build` pré-Vite). Ne pas
restaurer le placeholder ; ne pas sweeper le worktree au `git add` (junk non-tracké
partout : pngs, logs) — staging par chemin exact uniquement.

## Décisions du planner (à suivre telles quelles)

1. **Tout via le variant mobile uniquement** (`max-md:` utilitaires, ou la route moteur
   miroir `@media not all and (width>=48rem)` si l'arithmétique l'exige). Aucune classe
   desktop modifiée. Preuve desktop = les suites Selector vertes + build + le fait que
   toute règle ajoutée est derrière la media query miroir.
2. **Zéro nouveau string user-visible.** Tous les textes (labels, statuts, hints, titles)
   réutilisent les clés i18n existantes. Si le statut reçoit un `title` pour une
   troncature mobile, sa valeur = la MÊME clé t() que le texte.
3. **Em-dash interdit dans le texte user** (lint non négociable) ; classes Tailwind sur
   tokens uniquement ; commentaires why chargés citant le verdict device D-11 et
   l'intention jdp « alle in einer Zeile stehen » (IntegrityCard :454-459). Ne PAS
   répéter dans les commentaires les tokens de classes exacts que les gates grep comptent
   (discipline comment-text : un grep de présence compte aussi les commentaires).
4. **Le fix Selector vit dans le composant** (une const de classes mobile jointe à la
   liste des classes de segment, pattern MOBILE_BLEED), PAS au call site. Il s'applique à
   toutes les tailles sous md — les tailles sm/md sont au no-op près (`text-xs` déjà là,
   `px-2` déjà là pour sm) ; l'effet de bord md (`px-3`→plus étroit mobile) est accepté,
   le composant est l'unité de fix (pattern j4p).
5. **Hauteur tactile préservée** : ni `glim-seg`, ni `--btn-h`, ni les hauteurs
   equalWidth ne bougent. Compaction HORIZONTALE seulement.
6. **Pas de scroll** : aucune classe de scroll nulle part ; `flex-wrap` reste en place
   comme fallback.
7. **Ne pas toucher** : `web/e2e/desktop-untouched.spec.ts`, PROD container, tout hors
   `web/src` + `web/dist` + tests. Si la route moteur est utilisée, `web/src/index.css`
   est dans le périmètre (le bloc :691 est le home naturel ; garder la condition
   miroir verbatim).
8. **Windows** : les shims npm/npx perdent node du PATH — TOUTES les commandes en
   invocation node directe, depuis `web/`.

## Task 1 — Compacter mobile-only les rangées Integrity (une ligne à 360px)

**Fichiers** : `web/src/pages/settings/IntegrityCard.tsx` (+ optionnellement
`web/src/pages/settings/IntegrityCard.dom.test.tsx` — voir critère)

**Action** :

1. **Étape 0 (trancher le piège)** : établir le mode `useLabelMode("buttons")` rendu sur
   le device D-11 (captures du repo ou defaults appearance.ts). Consigner le verdict en
   tête du commentaire why. C'est lui qui décide si le levier « glyph du drill caché
   mobile » est légal (mode textuel) ou interdit (mode glyph — boîte vide).
2. Sur la rangée :465 : resserrer le gap en mobile (`max-md:gap-1`, desktop `gap-2`
   intact).
3. Sur le label :466 : réduire la largeur mobile (`max-md:w-16` ou `max-md:w-20` — la
   valeur finale par l'arithmétique, avec `max-md:truncate` si le libellé le demande).
   Répercuter la MÊME largeur mobile sur le spacer :566 (alignement de la rangée tamper).
4. Sur le statut :537-556 : le garder visible (il porte « Never verified » / « last
   check ») ; si l'arithmétique l'exige, le borner en mobile (`max-md:max-w-*` +
   `max-md:truncate` + `title` = même clé t()) — ne jamais le supprimer.
5. Sur le bouton drill :499-521 : si le mode rendu est textuel, cacher le glyph mobile
   (envelopper le ReactNode du glyph, PAS le Button) ; sinon/et si l'arithmétique exige
   plus, route moteur : classe modificatrice sur CE bouton (via `className`) + règle
   dans le bloc miroir d'index.css réduisant padding-inline et/ou font-size SOUS md
   uniquement, commentée why (D-11 + T-07-02 + la loi unlayered de :1756-1772). Les 3
   boutons d'action glyph restent tels quels sauf si l'arithmétique prouve le contraire.
6. Commentaire why à jour au niveau de la rangée :465 : l'intention jdp historique
   (:454-459) + le verdict D-11 (wrap 2-lignes à 360px, build `mobilefix-877600d5`) +
   pourquoi la compaction est mobile-only et pourquoi le wrap reste le fallback des
   modes/locales plus verbeux. Ne pas répéter les tokens de classes exacts ajoutés.
7. Test DOM optionnel : si rendre IntegrityCard avec les providers
   (useAdvanced/useConfirm/useToast) coûte moins de ~40 lignes de fixtures, ajouter
   `IntegrityCard.dom.test.tsx` assertant la PRÉSENCE des classes mobiles sur rangée/
   label/drill (jsdom n'applique pas les media queries — présence seulement, note :24-28
   de la suite mobile Selector pour le précédent). Sinon : pas de test, et la présence
   est prouvée par les gates grep du verify ci-dessous.

**Verify** (depuis `web/`) :

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run src/components/Selector.dom.test.tsx src/components/Selector.mobile.dom.test.tsx
grep -c "max-md:" src/pages/settings/IntegrityCard.tsx   # >= 4 (présence ; un commentaire ne doit pas répéter les tokens, voir Action 6)
git status --porcelain                                   # seuls les fichiers listés ci-dessus sont modifiés
```

Staging : `git add` les chemins UN PAR UN (pathspecs relatifs à la racine du repo),
compter les fichiers stagés vs attendus AVANT le commit (un `git add` multi-chemins
échoue ENTIER sur un seul pathspec faux — ne jamais silencer stderr).

**Commit** : `feat(web): compacter mobile-only les rangees Integrity sur une ligne a 360px (D-11)`

**Done** : tsc 0 erreur ; suites Selector vertes ; les classes mobiles présentes sur
rangée + label + (statut ou drill selon les leviers retenus) ; le spacer :566 aligné ;
aucun fichier hors périmètre modifié.

## Task 2 — Compacter mobile-only les segments Selector (dans le composant)

**Fichiers** : `web/src/components/Selector.tsx`

**Action** :

1. Ajouter une const module-level de classes mobiles (pattern `MOBILE_BLEED`
   Button.tsx:127), p.ex. `text-xs` + padding-x réduit sous md (`max-md:text-xs
   max-md:px-2` comme point de départ — la valeur finale par l'arithmétique ; si ça ne
   tient pas encore, renforcer par paliers : `max-md:px-1.5`, ou troncature
   `max-md:truncate` du libellé de segment en dernier recours), avec le commentaire why :
   verdict D-11 (4e segment « Reactive » rejeté seul en 2e ligne à 360px sur la
   sous-section Labels), le fix vit dans le composant pour couvrir tous les call sites,
   le wrap « never scrolls » (round 8, :925) reste le fallback, le groove 0.2rem du
   track est intouché (:944-948), hauteur moteur `glim-seg` préservée (cible tactile).
2. Joindre cette const à la liste des classes de SEGMENT (le tableau `cls` construit à
   partir de :979 — elle doit s'appliquer aux deux variantes chip et well, les deux
   échelles). NE PAS toucher aux classes du track :966-974 ni aux branches
   equalWidth :1132 (`flex-none justify-center text-center h-[var(--badge-md)]` doivent
   rester — le test mobile 4 :144-157 les asserte).
3. Vérifier qu'aucun autre call site ne casse : les 3 suites Selector + un grep des
   call sites `size="md"` suffisent (l'effet md est un padding-x légèrement réduit
   mobile, accepté — décision 4).

**Verify** (depuis `web/`) :

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run src/components/Selector.test.ts src/components/Selector.dom.test.tsx src/components/Selector.mobile.dom.test.tsx
grep -c "max-md:" src/components/Selector.tsx   # >= 1
git status --porcelain                          # seul Selector.tsx est modifié
```

**Commit** : `feat(web): compacter mobile-only les segments Selector pour tenir sur une ligne a 360px (D-11)`

**Done** : les 3 suites Selector vertes (le test 4 mobile inclus) ; tsc 0 erreur ;
const mobile jointe aux classes de segment ; track et hauteurs intacts.

## Task 3 — Build complet + commit `web/dist/index.html` régénéré + preuve géométrique

**Fichiers** : `web/dist/index.html` (régénéré) ; `.planning/quick/260914-ugv-compacter-sur-une-ligne-mobile-integrity-et-labels/260914-ugv-SUMMARY.md`

**Action** :

1. Depuis `web/` : `node node_modules/typescript/bin/tsc --noEmit` PUIS
   `node node_modules/vite/bin/vite.js build` (exit 0 ; le `dist/` régénéré embarque le
   SPA — règle repo : committer `web/dist/index.html` régénéré, pattern nsv, élimine le
   piège de référence stale au deploy Unraid ; les assets hashés restent gitignorés).
2. **Preuve géométrique one-line, documentée dans le SUMMARY** (les deux surfaces).
   Méthode imposée :
   - Largeur UTILE réelle à 360px : la dériver des classes de padding réelles (page +
     Card), PAS de l'estimate ~320px du brief (l'ancre opposing : la suite mobile
     Selector mesure ~303px de colonne à 390px — soit ~87px de chrome ; à 360px cela
     donne ~273px ; si l'arithmétique réelle donne moins que l'estimate du brief, c'est
     ~273px qui gagne). Consigner le calcul.
   - Somme des contenus de rangée AVEC les classes mobiles retenues : label, N boutons
     glyph (mesurés/inférés : glyph + padding effectif après compaction), drill (texte
     et/ou glyph selon le verdict d'étape 0), statut, gaps. Caractériser chaque texte
     par font-size × longueur (locale fr de l'opérateur) et le dire.
   - Conclure `somme < utile` avec la marge affichée. Si une surface ne tient pas :
     renforcer les paliers (Task 1/2 Action) et rebuilder — ne pas conclure « ça
     suffira ».
   - Si un test DOM de présence a été écrit (Task 1), le citer ; sinon les gates grep
     font foi.
3. Committer `web/dist/index.html` : staging par chemin exact + comptage avant commit.
4. Écrire `260914-ugv-SUMMARY.md` (même répertoire) : ce qui a été fait par surface,
   le verdict d'étape 0 (mode rendu), les leviers retenus et pourquoi, l'arithmétique
   complète des deux surfaces, les commandes passées, toute déviation.

**Verify** (depuis `web/` pour les deux premières) :

```sh
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build
git status --porcelain   # web/dist/index.html présent dans les changements ; aucun asset hashé stagé
```

**Commit** : `chore(web): rebuild SPA — commit web/dist/index.html regenere (D-11)`
puis commit docs du SUMMARY : `docs(quick-260914-ugv): preuve geometrique one-line 360px (D-11)`

**Done** : build exit 0 ; `web/dist/index.html` committé ; SUMMARY avec l'arithmétique
complète des deux surfaces concluante (`somme < utile` aux deux) ; les 3 suites Selector
+ tsc verts sur l'ensemble.

## Ordre et dépendances

Task 1 → Task 2 → Task 3 (séquentiel ; 3 build les deux et porte la preuve). Chaque
task = commit atomique. Le gate de fin = Task 3 (pas de full-suite e2e — règle
milestone v1.1 : specs touchés seulement pendant les tâches s'il y en avait, full-suite
au gate de fin de phase ; ici aucun spec e2e ne couvre ces classes).

## Contraintes globales (rappel)

Desktop intact (tout derrière le variant mobile) ; pas de scroll ; pas de nouveau string
i18n ; conventions maison (commentaires why chargés citant D-11 + jdp, pas d'em-dash
user, tokens Tailwind) ; `web/e2e/desktop-untouched.spec.ts` et PROD container
intouchés ; périmètre = `web/src` + `web/dist` + tests uniquement ; commandes Windows en
node direct ; staging compté avant chaque commit.
