import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "flag-icons/css/flag-icons.min.css";
import { AppRouter } from "./app/router";
import { AdvancedProvider } from "./lib/advanced";
import { applyStoredTheme } from "./lib/theme";
import { applyStoredLanguage } from "./lib/i18n";
import { applyStoredAccent } from "./lib/accent";
import { applyStoredRainbow } from "./lib/appearance";
import { applyStoredShape, armShapeTransitions } from "./lib/shape";
import { applyStoredMotionIntensity } from "./lib/motion";
import { applyStoredDisco } from "./lib/disco";
import { applyStoredLabelModes } from "./lib/controls";
import { ADOPTED_EVENT, sync as syncDisplayPrefs } from "./lib/displayPrefs";

// Apply persisted preferences before first paint (flash prevention).
applyStoredTheme();
applyStoredLanguage();
applyStoredAccent();
applyStoredRainbow();
applyStoredShape();
applyStoredMotionIntensity();
applyStoredLabelModes();
// After the rainbow: the walk only starts when there are hued elements to
// walk, so it reads the rainbow state this line just set.
applyStoredDisco();

// Every axis above reads localStorage exactly once, which is all a page needs
// while nothing changes underneath it. When the server hands this browser a
// different look a moment from now, the values in localStorage change and
// nobody is looking, so each one has to be applied again — the same calls, in
// the same order (#191). Registered BEFORE the sync that can fire it.
// `{ animate: false }` on the rainbow (#228): this is the same look arriving
// late, not somebody flipping a mode. Animated, it walked every hued element
// from the flat accent to its own rainbow hue across the whole page a moment
// after paint, which is what "the screen flashes green when switching options"
// was. The value still lands here; only the excursion is skipped.
window.addEventListener(ADOPTED_EVENT, () => {
  applyStoredTheme();
  applyStoredAccent();
  applyStoredRainbow({ animate: false });
  applyStoredShape();
  applyStoredMotionIntensity();
  applyStoredLabelModes();
  applyStoredDisco();
});

// Then reconcile with the server, which is where the look actually lives
// (#191). Deliberately AFTER the calls above and deliberately not awaited: the
// point of those is that they are synchronous, so the page paints in the right
// theme instead of flashing the default one, and no network round trip can be.
// On a browser that still has its cache this changes nothing; on one that was
// cleared it brings the stored look back a moment after paint.
void syncDisplayPrefs();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AdvancedProvider>
      <AppRouter />
    </AdvancedProvider>
  </React.StrictMode>
);

// GlimStone motion-engine, animation 1 (shape-morph) — armed two animation
// frames after the render call above, never before: see armShapeTransitions()'s
// own comment in lib/shape.ts for why two frames, not zero or one.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    armShapeTransitions();
  });
});
