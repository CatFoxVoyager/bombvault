// @vitest-environment jsdom
// ---------------------------------------------------------------------------
// The "Not installed (backups only)" section heading, shared by the Containers
// and VMs pages (#232).
//
// The issue's screenshot showed the heading badge covering the hint line under
// it: the badge is a notch, pulled up by half its height, and its lower half
// landed on that line. The hint now sits in the badge's own (i), the way every
// other card-less group heading carries its explanation (Recovery.tsx), so
// there is no line under the notch left to cover.
// ---------------------------------------------------------------------------
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NotInstalledHeading } from "./NotInstalledHeading";

const t = ((key: string) => key) as unknown as Parameters<typeof NotInstalledHeading>[0]["t"];

afterEach(() => {
  cleanup();
});

describe("NotInstalledHeading", () => {
  it("carries the hint in the badge's (i), not in a line under the notch", () => {
    render(<NotInstalledHeading tip="containers.notInstalledHint" hueIndex={0} t={t} />);
    const badge = screen.getByText("containers.notInstalledTitle");
    const bubble = screen.getByLabelText("containers.notInstalledHint");
    expect(badge.contains(bubble)).toBe(true);
    expect(screen.queryByText("containers.notInstalledHint")).toBeNull();
  });
});
