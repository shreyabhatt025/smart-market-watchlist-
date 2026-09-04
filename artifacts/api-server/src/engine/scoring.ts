import type { Severity, Signal, SignalType } from "../types/domain";

export function priceContribution(absPercent: number): number {
  if (absPercent < 1) return 0;
  if (absPercent < 2) return 10;
  if (absPercent < 3) return 20;
  if (absPercent <= 5) return 30;
  return 35;
}

export function volumeContribution(ratio: number | null): number {
  if (ratio === null || ratio < 1.5) return 0;
  if (ratio < 2) return 10;
  if (ratio <= 3) return 18;
  return 25;
}

export function sectorContribution(absPercent: number): number {
  if (absPercent < 1) return 0;
  if (absPercent <= 2) return 5;
  return 10;
}

export function severityForScore(score: number): Severity {
  if (score >= 90) return "HIGH_ATTENTION";
  if (score >= 70) return "IMPORTANT";
  if (score >= 40) return "WORTH_WATCHING";
  return "NORMAL";
}

export function calculateAttentionScore(input: {
  priceMovePercent: number;
  volumeRatio: number | null;
  thresholdCrossed: boolean;
  sectorMovePercent: number;
  reliableEvent: boolean;
}): { total: number; severity: Severity; contributions: Record<SignalType, number> } {
  const contributions = {
    PRICE_MOVE: priceContribution(Math.abs(input.priceMovePercent)),
    VOLUME_ANOMALY: volumeContribution(input.volumeRatio),
    THRESHOLD_CROSSED: input.thresholdCrossed ? 20 : 0,
    SECTOR_MOVE: sectorContribution(Math.abs(input.sectorMovePercent)),
    MARKET_MOVE: 0,
    EVENT: input.reliableEvent ? 10 : 0,
  };
  const total = Math.min(
    100,
    contributions.PRICE_MOVE +
      contributions.VOLUME_ANOMALY +
      contributions.THRESHOLD_CROSSED +
      contributions.SECTOR_MOVE +
      contributions.EVENT,
  );
  return { total, severity: severityForScore(total), contributions };
}

export function isMeaningfulEvent(input: {
  priceMovePercent: number;
  volumeRatio: number | null;
  thresholdCrossed: boolean;
  reliableEvent: boolean;
}): boolean {
  return (
    Math.abs(input.priceMovePercent) >= 3 ||
    (input.volumeRatio !== null && input.volumeRatio >= 2) ||
    input.thresholdCrossed ||
    input.reliableEvent
  );
}

export function buildSignals(input: {
  priceMovePercent: number;
  volumeRatio: number | null;
  thresholdPercent: number;
  sectorMovePercent: number;
  marketMovePercent: number;
}): Signal[] {
  const price = priceContribution(Math.abs(input.priceMovePercent));
  const volume = volumeContribution(input.volumeRatio);
  const thresholdCrossed = Math.abs(input.priceMovePercent) >= input.thresholdPercent;
  const sector = sectorContribution(Math.abs(input.sectorMovePercent));
  return [
    {
      type: "PRICE_MOVE",
      label: `Price ${input.priceMovePercent >= 0 ? "up" : "down"} ${Math.abs(input.priceMovePercent).toFixed(1)}%`,
      value: input.priceMovePercent,
      severity: price > 0 ? "OBSERVED" : "QUIET",
      contribution: price,
      available: true,
    },
    {
      type: "VOLUME_ANOMALY",
      label:
        input.volumeRatio === null
          ? "Volume unavailable"
          : `${input.volumeRatio.toFixed(1)}× recent volume`,
      value: input.volumeRatio ?? 0,
      severity: volume > 0 ? "UNUSUAL" : "QUIET",
      contribution: volume,
      available: input.volumeRatio !== null,
    },
    {
      type: "THRESHOLD_CROSSED",
      label: thresholdCrossed
        ? `Your ${input.thresholdPercent.toFixed(0)}% threshold was crossed`
        : "Personal threshold not crossed",
      value: input.thresholdPercent,
      severity: thresholdCrossed ? "PERSONAL" : "QUIET",
      contribution: thresholdCrossed ? 20 : 0,
      available: true,
    },
    {
      type: "SECTOR_MOVE",
      label: `Sector ${input.sectorMovePercent >= 0 ? "up" : "down"} ${Math.abs(input.sectorMovePercent).toFixed(1)}%`,
      value: input.sectorMovePercent,
      severity: sector > 0 ? "CONTEXT" : "QUIET",
      contribution: sector,
      available: true,
    },
    {
      type: "MARKET_MOVE",
      label: `Market ${input.marketMovePercent >= 0 ? "up" : "down"} ${Math.abs(input.marketMovePercent).toFixed(1)}%`,
      value: input.marketMovePercent,
      severity: "CONTEXT",
      contribution: 0,
      available: true,
    },
  ];
}