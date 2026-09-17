import type { useT } from "../lib/i18n";
import { Badge } from "./Badge";
import { InfoBubble } from "./InfoBubble";

type T = ReturnType<typeof useT>["t"];

interface NotInstalledHeadingProps {
  /** The page's own explanation, already translated (containers and VMs word it differently). */
  tip: string;
  /** The page's `nextHue()`, so this notch never shares a colour with another on the page. */
  hueIndex: number;
  t: T;
}

// The heading over the "Not installed (backups only)" list, one component for
// the Containers and VMs pages so the two cannot drift apart again (#232).
//
// The explanation sits in the badge's own (i), like Recovery.tsx's card-less
// group heading. It used to be a line under the heading, and the notch, pulled
// up by half its height, covered that line with its lower half: the screenshot
// in #232. `relative` on the h2 because nothing else here anchors the notch,
// same as StacksPanel.
export function NotInstalledHeading({ tip, hueIndex, t }: NotInstalledHeadingProps) {
  return (
    <h2 className="relative flex items-center">
      <Badge tone="heading" size="heading" wrap hueIndex={hueIndex}>
        {t("containers.notInstalledTitle")}
        <InfoBubble tip={tip} onAccent />
      </Badge>
    </h2>
  );
}
