import { useSyncExternalStore } from "react";
import { rainbowState, subscribeRainbow, type RainbowState } from "./appearance";

/**
 * useRainbow subscribes a component to the rainbow state in appearance.ts,
 * which stays framework-free. Call it once per list to re-render on changes,
 * then read rainbowAt() and hueVars() during render.
 *
 * useSyncExternalStore rather than an effect with local state: the palette is
 * read during render, so learning about a change one paint late would show the
 * old colour for a frame.
 */
export function useRainbow(): RainbowState {
  return useSyncExternalStore(subscribeRainbow, rainbowState, () => rainbowState());
}
