---
quick_id: 260914-p9a
status: complete
date: 2026-09-14
branch: docker-folders
task: "Une carte Apparence unique dans Settings General (verdict device D-11)"
commits: [ca15e7a9, 877600d5]
duration: ~24min
---

# Quick 260914-p9a — Une carte « Apparence » unique dans Settings (D-11) — Summary

Fusion des six cartes d'apparence de l'onglet Général (Theme, Corners, Animations,
Platform, Labels, Colors) en une seule carte « Apparence » titrée `settings.appearance`
— 9 cartes → 4, zéro changement du design system partagé, desktop intact (même IA
partout, pas de DOM desktop figé).

## Ce qui a été fait

- **Task 1 (ca15e7a9)** : `settings.appearance` pré-seedée dans les 42 tables (en+de
  inline dans i18n.ts, 40 modules locales/) — position relative identique, immédiatement
  avant `"settings.theme"` (convention 987a4d0b) ; commentaire why D-11 dans `en` ;
  commentaire « stays removed » de i18n.ts réécrit pour narrer le retour en conservant
  l'historique de la four-way split ; pin `PRESEEDP9A_EN` ajouté à i18n.preseed.test.ts
  (4 rôles : copy en exacte, de non vide, 40 tables non vides, ban em/en dash).
- **Task 2 (877600d5)** : Settings.tsx — un seul bloc `tab === "general" && (() => {...})()`
  (forme IIFE de l'ex-Colors conservée) avec Card `title={t("settings.appearance")}` et
  UN `nextHue()` (les 5 appels morts theme/shape/motion/platform/labels supprimés,
  l'appel Colors remonté en tête d'IIFE) ; six sous-sections dans l'ordre Theme →
  Corners → Animations → Platform → Labels → Colors, mêmes contrôles/mêmes props,
  chacune précédée d'une rangée caption (span `text-xs text-carbon-textSub` +
  InfoBubble sur les 4 sections à hint d'origine, span nu pour theme/colors — les clés
  hint restent vivantes) ; ThemeCard passé body-only (précédent AccentCard) : wrapper
  Card + prop hueIndex retirés, sélecteur/state/system-flip verbatim ; commentaires de
  carte déplacés au-dessus de leur sous-section, seules les phrases devenues fausses
  corrigées ; bannière maîtresse réécrite (verdict D-11 + décision user + historique) ;
  tests DOM platform/theme adaptés.
- **Task 3** : suite vitest complète verte, build vite exit 0, web/dist/index.html
  restauré à l'état HEAD (convention du repo : index.html buildé committé, assets
  gitignorés — inchangé avant/après), hygiène d'arbre vérifiée (0 commit de non-trackés).

## Fichiers touchés

- Modifiés (commit 1, 42 fichiers) : `web/src/lib/i18n.ts`,
  `web/src/lib/i18n.preseed.test.ts`, `web/src/lib/locales/*.ts` (40 modules).
- Modifiés (commit 2, 4 fichiers) : `web/src/pages/Settings.tsx`,
  `web/src/pages/settings/ThemeCard.tsx`,
  `web/src/pages/Settings.platformCard.dom.test.tsx`,
  `web/src/pages/Settings.themeCard.dom.test.tsx`.
- Intouchés (contraintes respectées) : `web/src/components/`, ROADMAP.md, STATE.md,
  les autres onglets Settings, desktop-untouched.spec.ts.

## Décisions

- Traductions par registre de chaque table ; collisions évitées (ar « المظهر العام »
  vs theme « المظهر » ; eu « Kanpo-itxura » vs theme « Itxura »).
- Pas de `settings.appearanceHint` (décision planner) — les 4 hints d'origine vivent
  sur leurs bulles de sous-section.
- Spacing Colors préservé : groupe interne `flex flex-col gap-4` reconstitue l'écart
  exact de l'ex-Card (AccentCard ↔ bloc rainbow) ; le stack ToggleRows/palette garde
  son indentation d'origine verbatim (diff en splices uniquement).
- `describe()` du test platform renommé « the Platform sub-section (D-11) ».

## Vérifications

- preseed : 31/31 verts ; ciblé Task 2 : tsc exit 0 + 5 fichiers/37 tests verts ;
  complet : 112 fichiers / 2481 tests verts ; vite build exit 0.
- General = 4 cartes (Domains, Language, Apparence, Quiet toasts) ; ordre des six
  sous-sections conforme ; zéro `nextHue()` mort ; components/ intact ; aucune clé
  i18n renommée/supprimée ; 2 commits, un trailer chacun.

## Deviations from Plan

Aucun écart bloquant. Détails assumés et documentés :
- Les numéros de ligne du plan avaient glissé (annoncé par le plan lui-même) :
  re-sondés avant édition, comme ordonné.
- Le `M web/dist/index.html` préexistant à l'ouverture de session (résidu de build
  antérieur) restauré à l'état HEAD au Task 3 — conforme à la convention repo
  (l'état committé référençait déjà des assets hashés avant comme après nsv :
  pratique stable, rien à corriger).
- Trois retouches de commentaires au-delà du strict minimum listé, toutes des phrases
  devenues fausses par la fusion (corrigées au titre du plan item 4).
