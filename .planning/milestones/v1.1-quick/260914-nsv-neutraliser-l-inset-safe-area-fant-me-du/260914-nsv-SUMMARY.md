---
task: "260914-nsv — Neutraliser l'inset safe-area fantôme du bas (D-11, device réel Android) + contrôle platform dans Settings"
quick_id: 260914-nsv
status: complete
branch: docker-folders
date: 2026-09-14
commits: [65cc9d59, 987a4d0b, 0aa38372]
---

# Quick 260914-nsv — Safe-area bottom fantôme (D-11) + contrôle platform en Settings

## One-liner

Le phantom inset bas Android est tué par `:root[data-platform="material"] { --safe-area-bottom: 0px }`
gardé en source, et le contrôle Settings General material|cupertino devient le premier writer de
`bv-platform` (stockage puis application via le choke point, sans reload).

## Ce qui a été fait

- Task 1 (`65cc9d59`, 2 fichiers) : règle CSS D-11 + why-commentaire après le bloc `:root` SHELL-04 ;
  describe garde frère dans mobileShellSource.test.ts (texte strippé des commentaires ; positif material,
  périmètre bottom-only, négatif cupertino sur les 2 familles de règles, auto-gardes anti-vide). 4 tests.
- Task 2 (`987a4d0b`, 42 fichiers) : `settings.platform` / `settings.platformHint` /
  `settings.platform.material` / `settings.platform.cupertino` dans en + de (inline i18n.ts) et les 40
  modules locales, après `settings.motionHint` avant `settings.labels` ; Material/Cupertino verbatim
  partout ; hint traduit par langue, sans em/en dash ; bloc preseed phase-quick dans
  i18n.preseed.test.ts (en exact, de non-vide SANS not.toBe — déviation délibérée du plan, invariants),
  non-vide 42 tables, ban dash. Satisfait le gate orphans jusqu'au commit 3.
- Task 3 (`0aa38372`, 3 fichiers) : carte Platform dans l'onglet General après Motion (Card + Selector
  well/lg/equalWidth, `active={platform}` lu via usePlatform, SANS miroir local) ; onChange = write
  `bv-platform` PUIS `applyPlatform()` ; nouveau Settings.platformCard.dom.test.tsx (4 tests : rendu
  carte + 2 segments, défaut material, click Cupertino → attribut + storage, retour Material) ;
  web/dist/index.html régénéré par le build et committé.

## Fichiers touchés

- web/src/index.css, web/src/app/mobileShellSource.test.ts
- web/src/lib/i18n.ts, web/src/lib/i18n.preseed.test.ts, web/src/lib/locales/{ar..zh}.ts (40)
- web/src/pages/Settings.tsx, web/src/pages/Settings.platformCard.dom.test.tsx (nouveau), web/dist/index.html

## Décisions

- Placement i18n : après motionHint / avant labels dans les 42 tables = ordre des cartes General
  (Shape, Motion, Platform, Labels).
- Option labels Material/Cupertino invariants dans toutes les langues ; le pin preseed n'exige pas
  de différence de/en pour ce bloc (déviation plan documentée).
- Hint de carte rendu comme InfoBubble dans le h2 (aria-label = tip) : l'assert DOM passe par le nom
  accessible du heading, pas par getByText.
- Pas de miroir d'état local pour platform : usePlatform relit l'attribut appliqué sur l'annonce
  bv:platform-changed, un seul writer.

## Vérifications passées

- mobileShellSource.test.ts : 55/55 (dont 4 D-11)
- i18n preseed/parity/orphans/quality : 130/130
- Settings.platformCard.dom.test.tsx : 4/4
- Suite vitest complète : 2477/2477 (112 fichiers)
- tsc --noEmit : vert ; vite build : vert (dist régénérée puis committée)
- 3 commits atomiques (stats 2 / 42 / 3 fichiers), trailer unique par commit, zéro fichier interdit.

## Deviations from Plan

1. [Rule 1 - Bug] i18n.preseed.test.ts bloc 08-01 : l'assert de différence de comparait
   `PRESEED_EN[key]` (constante phase 7) au lieu de `PRESEED8_EN[key]` — copie-survie du template
   07-02, assertion tautologique pour les clés qu'elle nomme. Corrigé dans le commit Task 2
   (`PRESEED8_EN[key]`), vert (de "Weiter"/"Schritt {n} von {total}" diffèrent bien de en).
2. [Note] web/e2e/desktop-untouched.spec.ts figurait modifié au snapshot de départ de la session ;
   à la fin il est clean vs HEAD. Aucune commande de l'exécution n'a touché ce fichier (absent des
   3 commits, vérifié) ; état constaté, pas causé, par cette exécution.
