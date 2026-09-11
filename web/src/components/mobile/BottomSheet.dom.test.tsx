// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { en, I18nProvider } from "../../lib/i18n";

// Behavioral proof for PRIM-01 (plan 05-03 Task 3): every mechanism lifted
// from useConfirm.tsx is asserted here as observable behavior (queries +
// fired events), never as class-string snapshots:
//   (a) portal into document.body, nothing rendered when closed
//   (b) document-level Escape closes
//   (c) scrim click (target === currentTarget) closes; a click originating
//       inside the panel does not (possible at all only because scrim and
//       panel are siblings — see BottomSheet.tsx's header deviation note)
//   (d) the close button is found by its accessible name (common.close) and
//       closes — the ConfirmDialog strict-mode discipline
//   (e) Tab/Shift+Tab wrap over the FULL FOCUSABLE_SELECTOR candidate set
//       (header close button + body controls) in both directions
//   (f) focus is captured from the trigger at open (and moved inside, the
//       ConfirmDialog autoFocus parity) and restored to the trigger on close
//
// Deliberately self-sufficient: BottomSheet touches no matchMedia /
// visualViewport API, so this suite passes whether or not plan 02's
// vitest setupFiles stub is installed — nothing here relies on it.

function SheetHarness({
  onClose,
  initialOpen = false,
}: {
  onClose: () => void;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <I18nProvider>
      <button onClick={() => setOpen(true)}>trigger</button>
      <BottomSheet
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        // The production sheet title, taken straight from the en table: the
        // same single nav.more key the More trigger will use (SHELL-02).
        title={en["nav.more"]}
      >
        <button>body one</button>
        <button>body two</button>
      </BottomSheet>
    </I18nProvider>
  );
}

describe("BottomSheet", () => {
  afterEach(cleanup);

  it("renders the dialog into document.body via the portal, not the test container", () => {
    const { container, unmount } = render(<SheetHarness onClose={vi.fn()} initialOpen />);
    const panel = screen.getByRole("dialog");
    // The panel lives under <body> directly, outside RTL's container: any
    // ancestor with a CSS transform would otherwise trap the fixed backdrop
    // (useConfirm.tsx's portal rationale).
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(panel.parentElement).toBe(document.body);
    unmount();
  });

  it("renders nothing when closed", () => {
    render(<SheetHarness onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: en["common.close"] })).toBeNull();
  });

  it("closes on a document-level Escape keydown", () => {
    const onClose = vi.fn();
    render(<SheetHarness onClose={onClose} initialOpen />);
    // Fired on `document` itself: the listener must work no matter where
    // focus currently sits (the documented-broken inline onKeyDown does not).
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a scrim click but not on a click originating inside the panel", () => {
    const onClose = vi.fn();
    render(<SheetHarness onClose={onClose} initialOpen />);
    // The scrim is the aria-hidden sibling of the panel under <body>.
    const scrim = document.body.querySelector<HTMLElement>(":scope > [aria-hidden='true']");
    expect(scrim).not.toBeNull();
    fireEvent.click(scrim!);
    expect(onClose).toHaveBeenCalledTimes(1);
    // A click on a control inside the panel bubbles up through the panel —
    // and never reaches the scrim's handler, because the panel is NOT a child
    // of the scrim. This is the target === currentTarget guard doing its job.
    const onClose2 = vi.fn();
    cleanup();
    render(<SheetHarness onClose={onClose2} initialOpen />);
    fireEvent.click(screen.getByRole("button", { name: "body one" }));
    expect(onClose2).not.toHaveBeenCalled();
    // ...and the sheet is still open after the interior click.
    expect(screen.getByRole("dialog")).not.toBeNull();
  });

  it("closes via the header close button found by its accessible name", () => {
    const onClose = vi.fn();
    render(<SheetHarness onClose={onClose} initialOpen />);
    const close = screen.getByRole("button", { name: en["common.close"] });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus inside the sheet on open", () => {
    render(<SheetHarness onClose={vi.fn()} initialOpen />);
    // ConfirmDialog parity: focus starts INSIDE the aria-modal surface (its
    // Cancel button; the sheet's safe equivalent is the header close button).
    expect(document.activeElement).toBe(screen.getByRole("button", { name: en["common.close"] }));
  });

  it("wraps Tab and Shift+Tab focus inside the sheet in both directions", () => {
    render(<SheetHarness onClose={vi.fn()} initialOpen />);
    const close = screen.getByRole("button", { name: en["common.close"] });
    const two = screen.getByRole("button", { name: "body two" });
    // Tab from the LAST focusable wraps to the FIRST (the header close button).
    two.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    // Shift+Tab from the FIRST focusable wraps to the LAST.
    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(two);
    // Note: forward movement from a MID-list control is native browser Tab
    // navigation (the trap handler only acts at the edges, per the verbatim
    // useConfirm lift), which jsdom does not implement — so only the two
    // wrap directions are assertable here, which is exactly the trap's
    // contract.
  });

  it("captures focus from the trigger at open and restores it on close", () => {
    const onClose = vi.fn();
    render(<SheetHarness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "trigger" });
    trigger.focus();
    fireEvent.click(trigger); // opens the sheet
    expect(document.activeElement).toBe(screen.getByRole("button", { name: en["common.close"] }));
    fireEvent.keyDown(document, { key: "Escape" }); // closes via Escape
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(trigger); // restored
  });
});
