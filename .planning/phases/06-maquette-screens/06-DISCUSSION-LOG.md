# Phase 6: Maquette Screens - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-12
**Phase:** 06-Maquette Screens
**Mode:** `--auto` (no interactive prompts; recommended defaults selected and logged)
**Areas discussed:** Arbre touch (SCRN-03), Navigation sans nouvelle route, Home trigger + PRIM-03, Tap-popover + PRIM-04

---

## Arbre touch (SCRN-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Mode d'interaction dans le composant ONE | Props/mode `touch` sur SelectionTree ; state model APG identique ; seuls hit-areas/mutings diffèrent | ✓ |
| Fork d'un SecondTree touch | Deux composants — rejeté : double maintenance, divergence sémantique garantie | |
| Wrapper qui duplique le rendu | Wrapper réimplémentant le rendu — rejeté : le state model vivrait en deux exemplaires | |

**User's choice:** [auto] Mode d'interaction dans le composant unique (recommended default)
**Notes:** La contrainte "never a fork" est déjà verbatim dans SCRN-03 (REQUIREMENTS.md). Hit semantics : tap rangée = check, chevron ≥44×44px dédié = expand/collapse ; `touch-action: manipulation`. Save bar sticky-in-flow avec compteur live + CACHEDIR.TAG, file de sauvegarde sérialisée existante.

---

## Navigation sans nouvelle route

| Option | Description | Selected |
|--------|-------------|----------|
| Container detail = vue empilée locale ; run detail = full-screen BottomSheet | Détail conteneur en état local de page (hauteur totale + Save bar) ; run detail en sheet PRIM-01 | ✓ |
| Nouvelles routes /runs/:id, /containers/:name | Rejeté : `router.tsx` gelé (contrainte milestone) | |
| Tout en BottomSheets | Rejeté : le chrome sheet (scrim, dismiss) combat l'arbre plein écran + Save bar persistante | |

**User's choice:** [auto] Vue empilée locale (containers) + full-screen sheet (run detail) (recommended default)
**Notes:** Le researcher/planner doit cartographier les composants desktop existants portant le contenu run-detail (complétion, durée, snapshot id mono, triade, log d'activité, verify/browse/restore) pour réutilisation sans duplication.

---

## Home trigger + PRIM-03

| Option | Description | Selected |
|--------|-------------|----------|
| Action bar sticky basse + useConfirm une implémentation, présentation sheet fail-tone mobile | Bouton primaire pleine largeur sticky-in-flow au-dessus de la bar ; bascule de présentation via useIsDesktop | ✓ |
| FAB flottant | Rejeté : FAB = expression PLAT-01 (phase 7) ; couche flottante contredit la discipline in-flow | |
| Confirme par modal desktop inchangé sur mobile | Rejeté : PRIM-03 mandate la sheet fail-tone sous le breakpoint | |

**User's choice:** [auto] Action bar sticky + présentation sheet fail-tone (recommended default)
**Notes:** Destructif jamais default-focused (focus sur l'action sûre). FLOW-03 : BackupButton semantics inchangées (async-start, useBackupWatch, deep-link) sur containers et file sets — présentation seule.

---

## Tap-popover + PRIM-04

| Option | Description | Selected |
|--------|-------------|----------|
| Popover ancré au trigger ; PRIM-04 en hook dédié | Ancré, flip viewport, tap-outside dismiss, focus léger ; hook de visibilité autour des consommateurs live | ✓ |
| Popover = petite BottomSheet | Rejeté : perd l'ancrage au contrôle (PRIM-02 dit "tap-anchored") | |
| PRIM-04 dans progress.ts | Rejeté : `web/src/lib/progress.ts` gelé | |

**User's choice:** [auto] Popover ancré + hook visibilité dédié (recommended default)
**Notes:** Consommateurs PRIM-02 cette phase : InfoBubble, FilterPopover, ColorPickerPopover. Desktop hover inchangé (`hover:` déjà gated). PRIM-04 : hidden → pas de SSE/timers ; visible → refetch + reconnect ; la réconciliation passe par la corrélation baseline-id de useBackupWatch (état serveur, jamais l'horloge client).

---

## Claude's Discretion

Aucune — mode `--auto` : chaque décision est une option recommandée choisie selon les contraintes déjà verrouillées (fichiers gelés, REQUIREMENTS verbatim, décisions phase 5). Revue possible dans 06-CONTEXT.md avant exécution.

## Deferred Ideas

Aucune — le scope est resté dans la phase. (FAB/navpill/large title = PLAT-01 phase 7 ; guided restore = SCRN-06 phase 8.)
