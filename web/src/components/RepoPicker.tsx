import { useEffect, useState } from "react";
import { listRepos, type NamedRepo } from "../lib/api";
import { useT } from "../lib/i18n";
import { InfoBubble } from "./InfoBubble";
import { SelectField } from "./SelectField";

// RepoPicker — "which repository do this item's backups go to" (#204).
//
// One control for containers, VMs and folder sets, because the question and the
// consequence of getting it wrong are identical in all three. Issue #204 asked
// to back a VM or a folder up straight to a B2 bucket or a NAS share, past the
// domain's own repository; the first cut was a free-text location typed into
// each item, which meant typing the same bucket path into ten containers and
// then finding all ten again to correct it. So locations are written down once
// in Settings and PICKED here.
//
// The empty value is the default and is spelled out rather than left blank: "the
// domain repository" is a real answer, and a blank line in a picker reads as an
// unanswered question.
//
// LOCKED once the item has backups. They stay in the repository they were
// written to and nothing re-homes them, so pointing the item elsewhere would
// split its history across two places with nothing on screen to say so. The
// server refuses it too; this only keeps the interface from offering something
// that cannot happen.
export function RepoPicker({
  value,
  onChange,
  locked = false,
  hintKey = "repos.itemHint",
  labelKey = "repos.itemLabel",
  defaultLabelKey = "repos.itemDefault",
  lockedKey = "repos.itemLocked",
  disabled = false,
}: {
  /** The chosen repository's id, or "" for the domain repository. */
  value: string;
  onChange: (next: string) => void;
  /** True once the item has backups: the choice is frozen with a reason. */
  locked?: boolean;
  hintKey?: "repos.itemHint" | "files.repoHint";
  labelKey?: "repos.itemLabel" | "files.repo";
  defaultLabelKey?: "repos.itemDefault" | "files.repoPlaceholder";
  /** Why the choice is frozen. A folder set says it in its own words ("delete
   *  this set's backups first, or create a new set"), which is more use than
   *  the generic sentence. */
  lockedKey?: "repos.itemLocked" | "files.repoLocked";
  disabled?: boolean;
}) {
  const { t } = useT();
  const [repos, setRepos] = useState<NamedRepo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listRepos()
      .then((r) => {
        if (!alive) return;
        setRepos(r.ok ? (r.repos ?? []) : []);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  // A repository that is switched off cannot be picked, but one ALREADY chosen
  // stays listed even when off: hiding it would silently show "the domain
  // repository" for an item that is not on it, which is the misreading this
  // whole control exists to prevent.
  const options = [
    { value: "", label: t(defaultLabelKey) },
    ...repos
      .filter((r) => r.enabled || r.id === value)
      .map((r) => ({
        value: r.id,
        // "switched off", NOT "not in use": those are opposite statements. The
        // badge in Settings counts the ITEMS pointing at a repository; this says
        // its switch is off. Labelling an off repository "not in use" told the
        // one person who most needs the truth - the owner of the item that IS on
        // it - that nothing uses it.
        label: r.enabled ? r.name : `${r.name} (${t("repos.off")})`,
        disabled: !r.enabled && r.id !== value,
      })),
  ];
  // A stored id whose repository is gone must not disappear into the default
  // entry: the item is NOT on the domain repository, and its next backup will
  // fail rather than land there. Name it so the state is visible.
  if (value !== "" && !repos.some((r) => r.id === value)) {
    options.push({ value, label: value, disabled: false });
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1 text-xs text-carbon-textSub">
        {t(labelKey)}
        <InfoBubble tip={t(hintKey)} />
        {locked && <InfoBubble tip={t(lockedKey)} />}
      </label>
      <SelectField
        value={value}
        onChange={onChange}
        options={options}
        label={t(labelKey)}
        disabled={disabled || locked || !loaded}
        className="rounded-control bg-carbon-surface2 text-carbon-text text-sm px-3 py-1.5 glim-field-focus text-start"
      />
    </div>
  );
}
