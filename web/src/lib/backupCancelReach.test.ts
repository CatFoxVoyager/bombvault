// ---------------------------------------------------------------------------
// Every domain that can run a backup can stop one.
//
// The server registers a cancel for all five - containers, VMs, folder sets,
// flash and config - and POST /api/backup/cancel has accepted every one of those
// keys since #200. The BUTTON existed on the Folders page alone, and nothing said
// so. The answer posted on that issue promised it for any running backup, which
// was true of one page out of five.
//
// That is a gap no unit test and no type checker can see: each page is correct on
// its own terms, and the only thing wrong is that four of them are missing
// something the fifth has. A source scan is the right instrument for "these
// distant files must agree", exactly as pageHeading.test.ts is for the headings.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const PAGES = join(dirname(fileURLToPath(import.meta.url)), "..", "pages");

// page -> the exact cancel key that page's card must send, as it appears in the
// source. The keys are the server's own, from registerBackupCancel.
const DOMAINS: { file: string; key: string }[] = [
  { file: "Containers.tsx", key: "`container:${container.name}`" },
  { file: "VMs.tsx", key: "`vm:${vm.libvirtName}`" },
  { file: "Files.tsx", key: "`files:${set.name}`" },
  { file: "Flash.tsx", key: '"flash"' },
  { file: "Config.tsx", key: '"config"' },
];

describe("the cancel control", () => {
  it.each(DOMAINS)("$file offers it, with the server's own key", ({ file, key }) => {
    const src = readFileSync(join(PAGES, file), "utf8");
    expect(
      src,
      `${file} has no BackupCancelButton. The server registers a cancel for this domain and the\n` +
        `endpoint accepts its key, so a running backup here can be stopped - there is just no way\n` +
        `to ask for it. Four of the five pages were in this state for a whole release.`,
    ).toContain("<BackupCancelButton");
    expect(
      src,
      `${file} renders the cancel button with a key other than ${key}. It must be the exact key\n` +
        `the backend registered the run under, or the POST answers cancelled:false and the button\n` +
        `silently does nothing - which is the original #200 defect, in a new place.`,
    ).toContain(`cancelKey={${key}}`);
  });

  it.each(DOMAINS)("$file does not offer it during a RESTORE", ({ file }) => {
    const src = readFileSync(join(PAGES, file), "utf8");
    const at = src.indexOf("<BackupCancelButton");
    expect(at, `${file} has no BackupCancelButton`).toBeGreaterThan(-1);
    // The guard sits immediately above the button; take the preceding few lines.
    const guard = src.slice(Math.max(0, at - 400), at);
    expect(
      guard,
      `${file} does not gate its cancel button on phase !== "restore". A restore has its own\n` +
        `cancel with its own warning about a half-restored target, and two cancels on one card\n` +
        `that mean different things is worse than none.`,
    ).toMatch(/phase\s*!==\s*"restore"/);
    expect(
      guard,
      `${file} does not gate its cancel button on progress.active, so a finished run's last\n` +
        `frame leaves a button that can only ever answer "nothing to cancel".`,
    ).toMatch(/\.active/);
  });
});
