---
quick_id: 260914-ugv
status: complete
date: 2026-09-14
branch: docker-folders
task: "Une ligne a 360px : rangees Integrity + segments Selector (D-11)"
commits: [0303b8dd, 2b08030b, 94ec762f]
duration: ~24min
---

# Quick 260914-ugv — Une ligne à 360px : rangées Integrity + segments Selector — Summary

Compaction MOBILE-ONLY (sous 48rem) des deux surfaces que le verdict device D-11 a
vues wrapper à ~360px (build déployé `mobilefix-877600d5`) : les rangées de domaines
d'`IntegrityCard` (drill + statut rejetés en 2e ligne) et les strips `Selector` de la
sous-section Labels (4e segment « Réactif » rejeté seul). Desktop byte-identique (tout
est derrière le variant mobile / le bloc miroir moteur), zéro scroll ajouté, le wrap
reste le fallback par design (« never scrolls » round 8 intact).

## Verdict étape 0 (mode rendu sur le device D-11)

**Mode cachant (glyph/reactive) — les boutons se reposent en glyphe seul (~48px).**

Preuve géométrique inversée depuis le verdict lui-même : au repos, la ligne 1
(label `w-24` 96px + 3 boutons d'action glyph-seul ~48px + gaps 8px) = 264px ≤ ~273px
utiles — elle tenait ; ajouter le drill (48px) = 320px > 273px → drill + statut
rejetés en 2e ligne. C'est EXACTEMENT la description D-11. En mode textuel
(text/textGlyph) les boutons d'action portent leur stage (min-width 88–240px) et la
ligne 1 seule aurait débordé — le verdict aurait décrit un wrap 3-lignes. La
parenthèse du plan (« Reactive », actif) cohère : le picker Buttons montrait
« Réactif » sélectionné. Les snapshots Playwright du repo (sessions dev) montrent le
default `textGlyph`, mais ils ne sont PAS le device ; la géométrie du verdict, si.

**Conséquence : interdit de cacher le glyph du drill** (boîte vide — règle
Button.tsx) — et de toute façon inutile : le drill se repose en glyphe, la compaction
passe par le gap, la colonne label, le statut idle et le padding moteur des 4 boutons.

## Ce qui a été fait par surface

### Surface 1 — IntegrityCard (0303b8dd)

- Rangée de domaines : gap resserré sous md ; colonne label réduite (96→64px) avec
  palier texte mobile (voir déviation 1) + troncature de sûreté ; statut idle borné
  (72px) + tronqué, `title` portant les MÊMES mots (clé unique `verify.never` ; pour
  la forme composée, la chaîne est composée UNE fois dans `lastStatus` et passée au
  title — mêmes mots, aucun nouveau string) ; spacer d'alignement de la rangée tamper
  réfléchit la largeur mobile (alignement conservé) ; gap de la rangée tamper suivi.
- Route moteur (l'arithmétique l'exigeait — voir preuve) : classe modificatrice
  `mob-integrity-btn` sur les 4 boutons de rangée (verify, unlock, prune, drill ;
  PAS le bouton tamper, hors garantie) + token `--mob-integrity-btn-pad-x: 0.25rem`
  défini dans les DEUX blocs plateforme (contrat both-attributes, valeur identique —
  token shape-only) + règle consommatrice dans le bloc miroir EXISTANT
  `@media not all and (width>=48rem)` d'index.css (CSS auteur unlayered, spécificité
  (0,2,0) sur `.glim-btn` — gagne ; desktop ne résout jamais le bloc). Glyph 20px et
  hauteur intacts ; le bleed tactile de Button (max-md) reste la zone de doigt.
- Le glyph du drill n'est PAS caché (verdict étape 0). La span raison d'échec stocké
  n'est PAS bornée volontairement (cacher du détail d'échec serait pire que le wrap
  que desktop pratique déjà).
- Pas de test DOM (branche « Sinon » de l'Action 7 — voir déviation 4) ; présence
  prouvée par le gate grep (6 lignes ≥ 4).

### Surface 2 — Selector (2b08030b)

- Const module-level `MOBILE_COMPACT` (pattern `MOBILE_BLEED` de Button) jointe aux
  classes de SEGMENT dans le tableau `cls` — chip et well, toutes les échelles. Le
  fix vit dans le composant : aucun call site touché, aucune dérive possible.
- Cible = les utilitaires du palier lg (texte 14→12px, padding-inline 12→4px par
  côté) : utilitaire vs utilitaire, le variant mobile gagne dans la couche utilities.
  Hauteurs moteur (`glim-seg`, `--badge-md` equalWidth) et groove 0.2rem du track
  INTACTS (compaction horizontale seulement) ; classes structurelles du test mobile 4
  (`flex-none justify-center text-center h-[var(--badge-md)]`) préservées — les 3
  suites Selector sont vertes (72 tests).
- Effet md accepté (décision 4) : le seul consommateur Selector `size="md"` est la
  bascule Local/Off-site de SourceToggle ; effet sm : padding resserré d'un ou deux
  crans sous md (voir déviation 2).

## Preuve géométrique one-line (360px)

**Largeur utile.** Dérivée des classes réelles : `main#bv-main` = `p-4` mobile
(16px×2 = 32px) + Card = `p-5` (20px×2 = 40px) → chrome 72px → **288px** de colonne
à 360px. L'ancre conservatrice du plan (suite mobile Selector : ~303px de colonne à
390px → ~87px de chrome → **~273px** à 360, marge pour scrollbar/arrondi) est tenue
comme plancher : chaque somme ci-dessous est prouvée contre 273px.

**Surface 1 — rangée Integrity** (repos : mode cachant, idle, advanced ON, fr) :

| Terme | Largeur | Nature |
|---|---|---|
| Label (`Conteneurs`, 12px ≈ 62px) | 64px | exact (cap `w-16`) |
| 5 gaps × 4px | 20px | exact |
| 4 boutons × (4+20 glyphe+4) | 112px | exact (token moteur) |
| Statut idle | 72px | exact (cap, ellipsis, title) |
| **Somme** | **268px** | **≤ 273px ✓ (marge 5px ; 20px vs 288)** |

Sans advanced (2 boutons d'action) : 240px ✓. Avant fix : ligne 1 = 264px tenait,
+drill = 320px > 273px → le wrap D-11, exactement. La fonte du label est la seule
valeur estimée (62px pour « Conteneurs ») et elle tient DANS son cap de toute façon.

**Surface 2 — strip Labels (lg, well, equalWidth, fr)** :

| Terme | Largeur | Nature |
|---|---|---|
| Contenus segments à 12px (Texte 30 / Texte et symbole 90 / Symbole 44 / Réactif 37) | ≈ 201px | estimation Inter ±5% |
| Padding 4 × 8px | 32px | exact |
| Track (p 0.2rem ×2 + 3 gaps 0.2rem) | 16px | exact |
| **Somme** | **≈ 249px** | **≤ 273px ✓ (marge 24px)** |

Avant fix : contenus ≈ 240px + padding px-3 (96px) + 16 ≈ 352px > 273px → « Réactif »
seul rejeté, le verdict D-11. Au cran nommé par le plan (équivalent padding 6px) la
somme était ≈ 265–270px, marge sous l'erreur d'estimation — le cran retenu (4px)
donne la marge robuste (voir déviation 2).

Le test DOM de présence du Task 1 n'a pas été écrit (déviation 4) : ce sont les
gates grep qui font foi pour la présence des classes.

## Commandes passées (depuis `web/`, node direct — shims npm/npx muets sur cette machine)

```sh
node node_modules/typescript/bin/tsc --noEmit          # 0 erreur (x3 : Task 1, 2, 3)
node node_modules/vitest/vitest.mjs run src/components/Selector.dom.test.tsx src/components/Selector.mobile.dom.test.tsx   # 50 verts (Task 1)
node node_modules/vitest/vitest.mjs run src/components/Selector.test.ts src/components/Selector.dom.test.tsx src/components/Selector.mobile.dom.test.tsx   # 72 verts (Task 2)
node node_modules/vite/bin/vite.js build               # exit 0, ✓ built in 1.02s (Task 3)
grep -c "max-md:" src/pages/settings/IntegrityCard.tsx # 6 lignes (≥ 4)
grep -c "max-md:" src/components/Selector.tsx          # 2 (≥ 1)
git status --porcelain                                 # seuls les fichiers du périmètre
```

Staging par chemin exact + comptage `git diff --cached --name-only` avant chaque
commit (2 / 1 / 1 fichiers, conformes) ; aucun stderr silencé.

## Fichiers touchés

- `web/src/pages/settings/IntegrityCard.tsx` (0303b8dd) — rangée, label, statuts,
  spacer tamper, classes modificatrices, commentaire why (D-11 + jdp, sans répéter
  les tokens comptés par les gates).
- `web/src/index.css` (0303b8dd) — token dans les 2 blocs plateforme + règle
  consommatrice dans le bloc miroir existant, commentée why.
- `web/src/components/Selector.tsx` (2b08030b) — const + jointure dans `cls`.
- `web/dist/index.html` (94ec762f) — régénéré, commité (pattern nsv ; assets hashés
  gitignorés).
- Intouchés : `web/e2e/desktop-untouched.spec.ts`, PROD, tout hors `web/src` +
  `web/dist` ; aucune clé i18n ajoutée/modifiée ; aucun string user nouveau.

## Deviations from Plan

Aucune déviation bloquante. Cinq points assumés, tous dans l'esprit du plan :

1. **[Levier additionnel, même mécanisme] Palier texte mobile sur le label de
   rangée.** Le plan listait largeur + troncature pour le label ; à `text-sm` le
   label fr le plus large (« Conteneurs », ~68px) ellipsisait à 64px en
   « Conteneur… » (singulier — dérive de sens). Le cran texte mobile (utilitaire sur
   une span — le mécanisme utilitaire-vs-utilitaire légal du plan) le fait tenir
   entier (~62px). La troncature reste en sûreté pour les locales plus longues.
2. **[Palier renforcé au-delà du cran nommé] `MOBILE_COMPACT` à 4px de padding par
   côté, pas 6px.** Au cran nommé par le plan (6px), l'arithmétique donnait ~265–270px
   contre l'ancre conservatrice 273px — marge inférieure à l'erreur d'estimation des
   largeurs de caractères ; le cran retenu donne ~249px (marge 24px). Effet de bord
   assumé sous md sur sm/md (padding inline resserré ; consommation md = SourceToggle)
   — couvert par la décision « le composant est l'unité de fix ».
3. **[Traçabilité] `web/src/index.css` touché au Task 1** alors que la ligne
   « Fichiers » du Task 1 ne nommait qu'IntegrityCard.tsx : c'est la route moteur que
   le plan lui-même prescrit (tableau des mécanismes + décision 7 qui met index.css
   dans le périmètre « si la route moteur est utilisée »). Pas un écart de mécanisme.
4. **[Branche « Sinon » de l'Action 7] Pas de `IntegrityCard.dom.test.tsx`.** Le
   fixture (3 contexts + 4 appels API au montage + objet Settings typé + save mock)
   dépasse le budget ~40 lignes ; la présence des classes est prouvée par le gate
   grep (6 ≥ 4), précédent : note de la suite mobile Selector (jsdom n'applique pas
   les media queries — seules la présence ou l'arithmétique sont prouvables en test).
5. **[Re-sondage] Numéros de ligne.** IntegrityCard : identiques au plan (aucun
   glissement). index.css : blocs décalés de quelques lignes (attendu par le plan) —
   éditions par contenu, pas par numéro. Le `title` de la forme composée du statut
   porte la chaîne composée (pas de clé unique existante) : mêmes mots, zéro nouveau
   string — l'esprit de la décision 2.

## Vérifications

- tsc 0 erreur aux trois gates ; suites Selector : 50 puis 72 verts (le test 4 mobile
  inclus, classes structurelles intactes) ; build vite exit 0 ; `web/dist/index.html`
  commité ; staging compté avant chaque commit ; desktop byte-identique (toute règle
  ajoutée derrière la media query miroir ou le variant mobile).
