import type { Explanation, MarketObservation, Signal } from "../types/domain";

export function buildExplanation(
  observation: MarketObservation,
  signals: Signal[],
): Explanation {
  const price = signals.find((signal) => signal.type === "PRICE_MOVE");
  const volume = signals.find((signal) => signal.type === "VOLUME_ANOMALY");
  const sector = signals.find((signal) => signal.type === "SECTOR_MOVE");
  const market = signals.find((signal) => signal.type === "MARKET_MOVE");
  const volumeText =
    volume?.available && observation.volumeRatio !== null
      ? ` Trading volume is ${observation.volumeRatio.toFixed(1)}× its recent baseline.`
      : " Trading volume is not available for this observation.";
  return {
    fact: `The price is ${observation.price.toFixed(2)}, ${observation.changePercent >= 0 ? "up" : "down"} ${Math.abs(observation.changePercent).toFixed(1)}% in the current observation.`,
    signal: `${price?.label ?? "Price movement observed"}.${volumeText}`,
    context: `${observation.sector} is ${observation.sectorChangePercent >= 0 ? "up" : "down"} ${Math.abs(observation.sectorChangePercent).toFixed(1)}%; the broader market is ${observation.marketChangePercent >= 0 ? "up" : "down"} ${Math.abs(observation.marketChangePercent).toFixed(1)}%.`,
    explanation: `The move coincides with ${sector?.label?.toLowerCase() ?? "sector context"} and ${market?.label?.toLowerCase() ?? "market context"}. These are observable signals, not a confirmed cause.`,
    unknown: "No reliable event or news source is connected, so the underlying cause is unknown.",
    source: "DETERMINISTIC",
  };
}