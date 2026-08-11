import { describe, expect, it } from "vitest";
import { getCanvasPlacement } from "./pdfCanvasSizing";

describe("getCanvasPlacement", () => {
  it("upscales a 300 DPI Scryfall image to a 900 DPI card slot", () => {
    const result = getCanvasPlacement(745, 1040, 2232, 3118);

    expect(result.upscale).toBe(true);
    expect(result.sourceHeight).toBe(1040);
    expect(result.sourceWidth).toBeCloseTo(744.47, 1);
    expect(result.sourceX).toBeGreaterThanOrEqual(0);
    expect(result.sourceY).toBe(0);
  });

  it("crops an oversized canvas at one-to-one scale", () => {
    expect(getCanvasPlacement(2500, 3400, 2232, 3118)).toEqual({
      sourceX: 134,
      sourceY: 141,
      sourceWidth: 2232,
      sourceHeight: 3118,
      upscale: false,
    });
  });

  it("uses a centered cover crop when an undersized source has a different aspect ratio", () => {
    const result = getCanvasPlacement(700, 1040, 2232, 3118);

    expect(result.upscale).toBe(true);
    expect(result.sourceWidth).toBe(700);
    expect(result.sourceHeight).toBeLessThan(1040);
    expect(result.sourceY).toBeGreaterThan(0);
  });
});