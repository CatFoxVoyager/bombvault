// ---------------------------------------------------------------------------
// Every job name the scheduler can emit has a label in this language.
//
// The scheduler names its jobs in Go and the activity log translates them in
// TypeScript, and nothing connects the two. jobDomainFromName is the single
// place that decides the vocabulary; JOB_KEYS is the single place that has to
// answer it. When the two drift, jobLabel falls back to the raw string on
// purpose, so the failure is a bare English word on an otherwise translated
// dashboard - visible to a user in Japanese, invisible to every test, to
// `tsc` (JOB_KEYS is a Record<string, string>, so any key type-checks) and to
// the i18n parity guard (which compares tables to each other, and a key that
// exists in none of them is missing from none of them).
//
// It has now drifted three times: "receiver", then "fleet", then "pull". The
// table's own comment records the first two. This guard is the answer to the
// third, and it reads the Go source rather than a copy of it, because a copy
// is the thing that goes stale.
// ---------------------------------------------------------------------------
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { en } from "./i18n";
import { JOB_KEYS } from "./activityLog";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEDULE_GO = join(HERE, "..", "..", "..", "internal", "schedule", "schedule.go");

/** Every job literal jobDomainFromName can return, read out of the Go source. */
function jobNamesFromGo(): string[] {
  const src = readFileSync(SCHEDULE_GO, "utf8");
  const start = src.indexOf("func jobDomainFromName(");
  expect(start, "jobDomainFromName not found - has it been renamed?").toBeGreaterThan(-1);
  // The function ends at the first closing brace in column 0 after it, which is
  // how gofmt writes every top-level function.
  const end = src.indexOf("\n}", start);
  expect(end, "could not find the end of jobDomainFromName").toBeGreaterThan(start);
  const body = src.slice(start, end);

  // Only the FIRST string of each return is the job; the second is the domain.
  const names = new Set<string>();
  for (const m of body.matchAll(/return\s+"([^"]+)"/g)) {
    names.add(m[1]);
  }
  return [...names].sort();
}

describe("schedule job names reach a translation", () => {
  it("finds the job names in the Go source at all", () => {
    const names = jobNamesFromGo();
    // Anti-vacuity: if the parse ever silently yields nothing, the assertions
    // below would all pass over an empty list and this file would guard air.
    expect(names.length).toBeGreaterThanOrEqual(7);
    expect(names).toContain("backup");
    expect(names).toContain("pull");
  });

  it("gives every job name an entry in JOB_KEYS", () => {
    const missing = jobNamesFromGo().filter((n) => !JOB_KEYS[n]);
    expect(
      missing,
      `The scheduler emits ${missing.join(", ")}, and JOB_KEYS in activityLog.ts has no entry. ` +
        "jobLabel falls back to the raw string, so the dashboard's next-up line would show the " +
        "bare English identifier in all 42 languages. Add the key here and to every locale table.",
    ).toEqual([]);
  });

  it("points every JOB_KEYS entry at a string the English table actually has", () => {
    const dangling = Object.entries(JOB_KEYS)
      .filter(([, key]) => !(key in en))
      .map(([job, key]) => `${job} -> ${key}`);
    expect(
      dangling,
      `These JOB_KEYS entries name a translation key that does not exist: ${dangling.join(", ")}. ` +
        "resolveName would return the key itself, which renders as a dotted identifier on screen.",
    ).toEqual([]);
  });
});
