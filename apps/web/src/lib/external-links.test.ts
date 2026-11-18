import { describe, expect, it, vi } from "vitest";
import { getSafeHttpUrl, openExternalUrl, prepareExternalAnchor } from "./external-links";

const current = "https://tabitabi.example/itineraries/abc";

function anchor(href: string) {
  const element = document.createElement("a");
  element.setAttribute("href", href);
  return element;
}

describe("external link handling", () => {
  it("opens HTTP(S) external links in a safe new tab", () => {
    const element = anchor("https://hotel.example/reservation");
    element.rel = "nofollow sponsored";
    expect(prepareExternalAnchor(element, current)).toBe(true);
    expect(element.target).toBe("_blank");
    expect(element.relList.contains("noopener")).toBe(true);
    expect(element.relList.contains("noreferrer")).toBe(true);
    expect(element.relList.contains("nofollow")).toBe(true);
    expect(element.relList.contains("sponsored")).toBe(true);
  });

  it("keeps internal, hash, and non-HTTP links unchanged", () => {
    for (const href of ["/explore", "#details", "https://tabitabi.example/docs", "mailto:a@example.com", "javascript:alert(1)"]) {
      const element = anchor(href);
      expect(prepareExternalAnchor(element, current)).toBe(false);
      expect(element.target).toBe("");
    }
  });

  it("respects downloads, opt-outs, and explicit named targets", () => {
    const download = anchor("https://files.example/receipt");
    download.setAttribute("download", "");
    expect(prepareExternalAnchor(download, current)).toBe(false);

    const optOut = anchor("https://login.example/");
    optOut.dataset.externalNewTab = "false";
    expect(prepareExternalAnchor(optOut, current)).toBe(false);

    const named = anchor("https://hotel.example/");
    named.target = "reservationWindow";
    expect(prepareExternalAnchor(named, current)).toBe(true);
    expect(named.target).toBe("reservationWindow");
  });

  it("only opens safe web URLs from click handlers", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    expect(openExternalUrl("javascript:alert(1)")).toBe(false);
    expect(openExternalUrl("/explore")).toBe(false);
    expect(openExternalUrl("https://hotel.example/")).toBe(true);
    expect(open).toHaveBeenCalledExactlyOnceWith("https://hotel.example/", "_blank", "noopener,noreferrer");
    open.mockRestore();
  });

  it("does not accept non-web protocols", () => {
    expect(getSafeHttpUrl("data:text/html,hi")).toBeNull();
    expect(getSafeHttpUrl("https://booking.example/")?.hostname).toBe("booking.example");
  });
});
