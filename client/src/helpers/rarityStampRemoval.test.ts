import { describe, expect, it } from "vitest";
import { hasActiveAdjustments } from "./adjustmentUtils";
import { overridesToRenderParams } from "./cardCanvasWorker";
import { ADJUSTMENT_FRAGMENT } from "../shaders/adjustmentShader";

describe("experimental rarity stamp removal", () => {
  it("activates the adjustment pipeline", () => {
    expect(hasActiveAdjustments({ removeRarityStamp: true })).toBe(true);
    expect(hasActiveAdjustments({ removeRarityStamp: false })).toBe(false);
  });

  it("maps the persisted override into worker render parameters", () => {
    expect(overridesToRenderParams({ removeRarityStamp: true }).removeRarityStamp).toBe(true);
    expect(overridesToRenderParams({}).removeRarityStamp).toBe(false);
  });

  it("is included in the shared preview and export shader", () => {
    expect(ADJUSTMENT_FRAGMENT).toContain("uRemoveRarityStamp");
    expect(ADJUSTMENT_FRAGMENT).toContain("applyRarityStampRemoval");
  });
});
