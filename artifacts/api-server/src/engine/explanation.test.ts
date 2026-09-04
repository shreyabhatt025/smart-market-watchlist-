import { describe, expect, it } from "vitest";
import { buildExplanation } from "./explanation";
import { buildSignals } from "./scoring";

describe("deterministic explanations", () => {
  it("only describes supplied observations and labels unknown causes", () => {
    const observation = {
      symbol: "TATAMOTORS",
      companyName: "Tata Motors",
      exchange: "NSE",
      sector: "Automobile",
      price: 984.35,
      changePercent: 4.2,
      volumeRatio: 3.1,
      sectorChangePercent: 1.8,
      marketChangePercent: 0.6,
      observedAt: new Date("2026-09-04T10:00:00.000Z").toISOString(),
      source: "MOCK" as const,
      isStale: false,
      marketState: "OPEN" as const,
    };
    const explanation = buildExplanation(
      observation,
      buildSignals({
        priceMovePercent: 4.2,
        volumeRatio: 3.1,
        thresholdPercent: 5,
        sectorMovePercent: 1.8,
        marketMovePercent: 0.6,
      }),
    );
    expect(explanation.fact).toContain("984.35");
    expect(explanation.signal).toContain("3.1×");
    expect(explanation.unknown).toContain("unknown");
    expect(explanation.source).toBe("DETERMINISTIC");
  });
});