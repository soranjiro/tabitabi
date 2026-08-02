import { get } from "svelte/store";
import { afterEach, describe, expect, it } from "vitest";
import {
  closePrintStudio,
  openPrintStudio,
  printStudioOpen,
} from "./controller";

describe("print studio controller", () => {
  afterEach(closePrintStudio);

  it("opens the print studio from any theme", () => {
    openPrintStudio();
    expect(get(printStudioOpen)).toBe(true);
  });

  it("closes the print studio", () => {
    openPrintStudio();
    closePrintStudio();
    expect(get(printStudioOpen)).toBe(false);
  });
});
