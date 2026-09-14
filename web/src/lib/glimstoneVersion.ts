/**
 * The version of the GlimStone reference files this app carries.
 *
 * A COPY of `reference/react/version.ts` from the design language's own repo,
 * and that is the whole point of it existing (GlimStone 1.8.0). The number used
 * to be a constant beside the About card, which made it and the files it
 * describes two things somebody had to change together by hand, and did not:
 * this card claimed 1.7.5 while index.css and lib/appearance.ts had moved on,
 * and 1.7.5 was never cut as a release at all, so the one screen that exists to
 * say what you are looking at linked to a 404 (measured, not assumed).
 *
 * It lives beside the other copied files (appearance.ts, controls.ts,
 * useLabelMode.ts, useTipBubble.tsx) rather than in the About card, so a
 * re-copy carries the number with it instead of leaving it behind.
 *
 * THE NUMBER MUST NAME A PUBLISHED RELEASE, not a changelog heading: the card
 * turns it into a link to that tag's release page. `gh release list` in the
 * glimstone repo is the check, and it is the check that found the 404 above.
 *
 * That check is also why this says 2.0.0 rather than 2.1.0 today. The app has
 * taken 2.1.0's two rules as well - the Security card lost its sign-out row,
 * and both enrolment cards say the app's own word for "set up" - but 2.1.0 was
 * written in the same round and its tag is not cut yet. A number naming an
 * unpublished tag is the exact 404 this doc was written about, so the constant
 * follows the tag rather than the adoption, and moves the moment the release
 * exists. Everything 2.0.0 describes IS carried: the storm level and its
 * gesture, the per-intensity travel/scale/curve tokens, the selectors that name
 * the quiet levels rather than the lively one, and the card titled with the
 * established name of the thing.
 */
export const GLIMSTONE_VERSION = "2.0.0";
