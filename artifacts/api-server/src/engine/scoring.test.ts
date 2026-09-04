import { describe, expect, it } from "vitest";
import {
  buildSignals,
  calculateAttentionScore,
  isMeaningfulEvent,
  severityForScore,
} from "./scoring";

describe("attention scoring", () => {
  it("matches the documented 80/100 example", () => {
    const result = calculateAttentionScore({
      priceMovePercent: 4.2,
      volumeRatio: 3.1,
      thresholdCrossed: true,
      sectorMovePercent: 1.8,
      reliableEvent: false,
    });
    expect(result.total).toBe(80);
    expect(result.severity).toBe("IMPORTANT");
    expect(result.contributions).toMatchObject({
      PRICE_MOVE: 30,
      VOLUME_ANOMALY: 25,
      THRESHOLD_CROSSED: 20,
      SECTOR_MOVE: 5,
    });
  });

  it("uses the exact score bands", () => {
    expect(severityForScore(39)).toBe("NORMAL");
    expect(severityForScore(40)).toBe("WORTH_WATCHING");
    expect(severityForScore(70)).toBe("IMPORTANT");
    expect(severityForScore(90)).toBe("HIGH_ATTENTION");
  });

  it("does not treat context alone as a meaningful event", () => {
    expect(
      isMeaningfulEvent({
        priceMovePercent: 1.2,
        volumeRatio: 1.1,
        thresholdCrossed: false,
        reliableEvent: false,
      }),
    ).toBe(false);
    expect(
      isMeaningfulEvent({
        priceMovePercent: 1.2,
        volumeRatio: 1.1,
        thresholdCrossed: false,
        reliableEvent: true,
      }),
    ).toBe(true);
  });

  it("marks missing volume as unavailable without adding points", () => {
    const signals = buildSignals({
      priceMovePercent: 3.1,
      volumeRatio: null,
      thresholdPercent: 5,
      sectorMovePercent: 0.4,
      marketMovePercent: 0.2,
    });
    expect(signals.find((signal) => signal.type === "VOLUME_ANOMALY")).toMatchObject({
      available: false,
      contribution: 0,
    });
  });
});