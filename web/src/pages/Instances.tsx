// ---------------------------------------------------------------------------
// Instances - one door to the three surfaces that are about ANOTHER BombVault.
//
// jdp, on seeing Receiver, Fleet and Pull as three sidebar rows: "die sind doch
// fast das gleiche. Können wir die beiden seiten nicht mergen?" He was right
// about the navigation and wrong about the objects, and this page is what that
// distinction looks like.
//
// The objects stay apart, because they answer different questions and a person
// can want one without the other:
//
//   Receiver  a repository that already LIES here, sent by somebody else.
//             A location plus their APP_KEY. The far side may be off forever.
//   Fleet     another instance that is RUNNING, asked over HTTP for its
//             protection scorecard. A URL plus a bearer token. The far side
//             must be awake and must have issued that token first.
//   Pull      somebody else's repository that this box FETCHES FROM. A location
//             plus their APP_KEY, like a receiver, but it moves data onto this
//             disk instead of only reading.
//
// For the same neighbouring box you may well need two of those rows, which is
// exactly why they are not one table. What they share is the answer to "where
// do I go for something to do with another instance", and that is a navigation
// question, not a data question. So: one entry, three tabs, three unchanged
// pages underneath.
//
// Each tab is still gated on its own setting. The strip shows only what is
// switched on, and with a single one on there is no strip at all - a row of
// tabs where only one can ever be chosen is furniture, not navigation.
// ---------------------------------------------------------------------------
import { useEffect, useState, type CSSProperties } from "react";
import { getSettings } from "../lib/api";
import type { Settings } from "../lib/api";
import { useT } from "../lib/i18n";
import { PAGE_SHELL } from "../lib/pageShell";
import { Selector } from "../components/Selector";
import { IconReceiver, IconFleet, IconDownload } from "../components/navGlyphs";
import { Receiver } from "./Receiver";
import { Fleet } from "./Fleet";
import { Pull } from "./Pull";

export const INSTANCE_TABS = ["receiver", "fleet", "pull"] as const;
export type InstanceTab = (typeof INSTANCE_TABS)[number];

const TAB_ICON: Record<InstanceTab, React.ReactNode> = {
  receiver: <IconReceiver />,
  fleet: <IconFleet />,
  // Not IconReceiver: with three rows collapsed into one strip, two segments
  // wearing the same glyph would be indistinguishable in glyph mode. Pull is
  // the one that moves data toward this box, and the download arrow says so.
  pull: <IconDownload />,
};

function isTab(v: string): v is InstanceTab {
  return (INSTANCE_TABS as readonly string[]).includes(v);
}

/** Which tab a fresh mount should show: the one in the URL hash if it names
 *  one, else the first. Settings has not loaded yet at this point, so the
 *  choice is corrected below once it has. */
function tabFromHash(): InstanceTab {
  try {
    const h = window.location.hash.replace(/^#/, "");
    return isTab(h) ? h : "receiver";
  } catch {
    return "receiver";
  }
}

export function Instances() {
  const { t } = useT();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<InstanceTab>(tabFromHash);
  const [tabDir, setTabDir] = useState<1 | -1>(1);

  useEffect(() => {
    getSettings()
      .then((res) => {
        if (res.ok && res.settings) setSettings(res.settings);
      })
      .catch(() => undefined);
  }, []);

  // A hash typed or pasted into the address bar switches the tab, the same way
  // Settings' own strip behaves.
  useEffect(() => {
    function onHash() {
      const h = window.location.hash.replace(/^#/, "");
      if (isTab(h)) setTab(h);
    }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Written out one key at a time, on purpose. Composing the key from the tab
  // id would hand i18n.orphans.test.ts a pattern shaped "anything dot title",
  // and that pattern marks every page title in the app as used, so no page
  // title could ever be reported dead again. (Its scanner reads source TEXT,
  // so even naming the composed form in a comment here is enough to trip it,
  // which is how this was found.)
  const tabLabel: Record<InstanceTab, string> = {
    receiver: t("receiver.title"),
    fleet: t("fleet.title"),
    pull: t("pull.title"),
  };

  const enabled: Record<InstanceTab, boolean> = {
    receiver: settings?.receiverEnabled ?? false,
    fleet: settings?.fleetEnabled ?? false,
    pull: settings?.pullEnabled ?? false,
  };
  const visible = INSTANCE_TABS.filter((k) => enabled[k]);

  // Before settings arrive, `visible` is empty and nothing renders; afterwards a
  // tab the URL asked for but the settings switched off falls back to the first
  // one that IS on, rather than showing a blank panel under a live heading.
  const active: InstanceTab | null = visible.includes(tab) ? tab : (visible[0] ?? null);

  function choose(next: InstanceTab) {
    const from = visible.indexOf(active ?? next);
    const to = visible.indexOf(next);
    if (from !== -1 && to !== -1) setTabDir(to > from ? 1 : -1);
    setTab(next);
    try {
      window.history.replaceState(null, "", `#${next}`);
    } catch {
      /* history unavailable - the tab still switches */
    }
  }

  return (
    <div className={PAGE_SHELL}>
      <div>
        <h1 className="text-2xl font-semibold text-carbon-text">{t("instances.title")}</h1>
        <p className="mt-1 text-sm text-carbon-textSub">{t("instances.subtitle")}</p>
      </div>

      {visible.length > 1 && (
        <div className="inline-flex self-start max-w-full">
          <Selector
            items={visible.map((k) => ({
              id: k,
              label: tabLabel[k],
              icon: TAB_ICON[k],
              title: tabLabel[k],
            }))}
            label={t("instances.title")}
            select="one"
            active={active}
            onChange={(id) => {
              if (isTab(id)) choose(id);
            }}
            size="lg"
            equalWidth
          />
        </div>
      )}

      {/* Keyed on the active tab so the slide replays on every switch: a class
          on a node that is never recreated only ever animates once. Same
          mechanism as the Settings strip, and the same --tab-dir so the panel
          travels in the direction the click went. */}
      {active && (
        <div key={active} className="glim-tab-slide flex flex-col" style={{ "--tab-dir": tabDir } as CSSProperties}>
          {active === "receiver" && <Receiver embedded />}
          {active === "fleet" && <Fleet embedded />}
          {active === "pull" && <Pull embedded />}
        </div>
      )}
    </div>
  );
}
