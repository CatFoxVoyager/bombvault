// ---------------------------------------------------------------------------
// Phase 7 pre-seed pin (07-02) — the contract fence for the phase's ONE
// i18n commit, pinning the exact strings page plans 07-03..07-07 consume.
//
// WHY THIS TEST EXISTS (deviation logged in 07-02-SUMMARY.md): i18n keys are
// single-writer — the phase pre-seeds ALL of its new keys in one plan-owned
// commit (the phase 6 nav.mobileNavigation pattern) so the four parallel
// Wave-2 page plans stay key-neutral. But i18n.orphans.test.ts forbids any
// key nobody renders, and until the page plans land these nine keys have no
// referencing source. The orphan guard's own doc sanctions the way out: a key
// a test still names counts as used. This file IS that reference — and it
// pins the exact en copy so a consumer plan can quote a string without
// re-reading the table.
//
// THE RATCHET: this test may only ever TIGHTEN. Deleting a key here fails
// parity (all 42 tables must match en), and loosening an assertion while the
// key set is still unconsumed would strand the key as a 42x orphan — exactly
// what i18n.orphans.test.ts exists to prevent. When plans 07-03..07-07 wire
// the keys into pages, their source references supersede this file's
// naming-only role, but the exactness pins below stay as the copy contract.
//
// Pure logic, node environment (the i18n.parity.test.ts precedent: importing
// ./i18n only builds the tables; all DOM access in that module lives inside
// functions).
//
// PHASE 8 (08-01) extends this file with its own pre-seed block below: the
// guided-restore mobile flow's two new keys, pinned for the same two reasons
// (orphan gate until the Recovery.tsx mobile block consumes them, then the
// copy-contract ratchet).
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { de, en } from "./i18n";
import { allLocales as locales } from "./localesForTests";

// The COMPLETE phase 7 new-key list (UI-SPEC Component Inventory), en copy
// verbatim from the UI-SPEC Copywriting Contract.
const PRESEED_EN: Record<string, string> = {
  "common.loadMore": "Load more",
  "common.search": "Search",
  "settings.tabsNavigation": "Settings sections",
  "config.restoreChain.title": "What happens when the config is restored",
  "config.restoreChain.step1": "Your current settings choice is saved first.",
  "config.restoreChain.step2": "The latest config snapshot is restored from the repository.",
  "config.restoreChain.step3":
    "If the APP_KEY does not match the snapshot, you are asked before anything else happens.",
  "config.restoreChain.step4": "The restored configuration is checked against the live system.",
  "config.restoreChain.step5":
    "Enabled apps and services are restarted and the page reloads. With auto-restart off, you restart them yourself.",
};

const PRESEED_KEYS = Object.keys(PRESEED_EN);

describe("phase 7 pre-seed (07-02)", () => {
  it("en carries the exact contracted copy for every pre-seeded key", () => {
    for (const [key, expected] of Object.entries(PRESEED_EN)) {
      expect(en[key as keyof typeof en], key).toBe(expected);
    }
  });

  it("de carries every pre-seeded key with a non-empty German value", () => {
    for (const key of PRESEED_KEYS) {
      const value = de[key as keyof typeof de];
      expect(typeof value, key).toBe("string");
      expect(value.length, key).toBeGreaterThan(0);
      expect(value, key).not.toBe(PRESEED_EN[key]);
    }
  });

  it.each(PRESEED_KEYS)("every locale table carries %s non-empty", (key) => {
    for (const [code, table] of Object.entries(locales)) {
      const value = table[key as keyof typeof table];
      expect(typeof value, `${code}:${key}`).toBe("string");
      expect(value.length, `${code}:${key}`).toBeGreaterThan(0);
    }
  });

  it("no pre-seeded value in any language carries an em dash", () => {
    for (const [code, table] of Object.entries(locales)) {
      for (const key of PRESEED_KEYS) {
        expect(table[key as keyof typeof table], `${code}:${key}`).not.toMatch(/—|–/);
      }
    }
  });
});

describe("home.newBackupConfirm aligned copy (07-02 carried fix 3a)", () => {
  // Carried Fix 3a: the confirm now states the ONE-AT-A-TIME stop/restart
  // discipline. The alignment pin guards the clause in en + de; the 40 locale
  // modules were aligned in the same commit (their per-language copy is
  // reviewed text, not assertable token-for-token here).
  it("en states one-at-a-time and keeps the restore-scope sentence", () => {
    expect(en["home.newBackupConfirm"]).toContain("one at a time while their backup runs");
    expect(en["home.newBackupConfirm"]).toContain("Restore keeps only what the next run saves.");
  });

  it("de states one-at-a-time and keeps the restore-scope sentence", () => {
    expect(de["home.newBackupConfirm"]).toContain("während ihrer Sicherung nacheinander");
    expect(de["home.newBackupConfirm"]).toContain(
      "Eine Wiederherstellung behält nur, was der nächste Lauf sichert."
    );
  });

  it("no locale still carries the pre-fix stop/restart clause shape", () => {
    // The OLD en clause ("Containers are stopped and restarted. Restore …")
    // must not survive anywhere — a module that kept it renders a confirm
    // that contradicts the D-03 one-at-a-time guard chain.
    for (const [code, table] of Object.entries(locales)) {
      expect(table["home.newBackupConfirm"], code).not.toMatch(/restarted\./);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 8 pre-seed (08-01) — the guided-restore mobile flow's complete new-key
// list (08-UI-SPEC Copywriting Contract census: exactly these two keys for the
// whole phase). Same two roles as the phase-7 block above: orphan-gate cover
// until the Recovery.tsx mobile block consumes them, then the copy-contract
// ratchet. The {n}/{total} placeholder form is INVARIANT across locales (the
// position chip renders tabular-nums and the 320px sweep asserts single-line),
// which the parity test's placeholder assertion enforces structurally.
// ---------------------------------------------------------------------------
const PRESEED8_EN: Record<string, string> = {
  "recovery.mobile.stepOf": "Step {n} of {total}",
  "common.continue": "Continue",
};

const PRESEED8_KEYS = Object.keys(PRESEED8_EN);

describe("phase 8 pre-seed (08-01)", () => {
  it("en carries the exact contracted copy for every pre-seeded key", () => {
    for (const [key, expected] of Object.entries(PRESEED8_EN)) {
      expect(en[key as keyof typeof en], key).toBe(expected);
    }
  });

  it("de carries every pre-seeded key with a non-empty German value", () => {
    for (const key of PRESEED8_KEYS) {
      const value = de[key as keyof typeof de];
      expect(typeof value, key).toBe("string");
      expect(value.length, key).toBeGreaterThan(0);
      expect(value, key).not.toBe(PRESEED_EN[key]);
    }
  });

  it.each(PRESEED8_KEYS)("every locale table carries %s non-empty", (key) => {
    for (const [code, table] of Object.entries(locales)) {
      const value = table[key as keyof typeof table];
      expect(typeof value, `${code}:${key}`).toBe("string");
      expect(value.length, `${code}:${key}`).toBeGreaterThan(0);
    }
  });

  it("no pre-seeded value in any language carries an em dash", () => {
    for (const [code, table] of Object.entries(locales)) {
      for (const key of PRESEED8_KEYS) {
        expect(table[key as keyof typeof table], `${code}:${key}`).not.toMatch(/—|–/);
      }
    }
  });
});
