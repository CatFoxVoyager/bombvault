import type { ReactNode } from "react";
import { useT } from "../../lib/i18n";
import { Button } from "../Button";

// MobileDetailShell is the ONE frame both phone detail views render: the
// back row (the shared Button, its accessible name leading with the entry
// so a screen-reader user coming from the card knows exactly what they are
// leaving) and the title heading. Everything below is the caller's
// controls, so the two pages' details cannot grow different frames.
export function MobileDetailShell({
  title,
  onBack,
  children,
}: {
  /** The entry's display name, the heading, and the back row's accessible
   *  name lead ("<title>, Back"). */
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-4 glim-content-fade">
      <Button
        label={`${title}, ${t("common.back")}`}
        labelKey={null}
        tone="subtle"
        glyph={
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path fill="currentColor" d="M8 1.3 3.5 6 8 10.7Z" />
          </svg>
        }
        onClick={onBack}
        keepLabel
        className="-ms-2 min-h-[2.75rem]"
      />
      <h2 className="text-lg font-semibold text-carbon-text">{title}</h2>
      {children}
    </div>
  );
}
