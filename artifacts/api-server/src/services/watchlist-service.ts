import { buildExplanation } from "../engine/explanation";
import { buildSignals, calculateAttentionScore, isMeaningfulEvent } from "../engine/scoring";
import { createMarketProvider } from "../providers/market";
import {
  acknowledgeEvent as acknowledgeStoredEvent,
  createItem,
  createOrUpdateEvent,
  findItem,
  getEvent,
  getEvents,
  getItems,
  removeItem,
  updateItem,
} from "../store";
import type {
  AttentionResult,
  EventRecord,
  MarketObservation,
  Signal,
  StockCatalogEntry,
  WatchlistItemRecord,
} from "../types/domain";
import { STOCK_CATALOG } from "../types/domain";

const market = createMarketProvider();

export class ServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function checkpointPercent(observation: MarketObservation, item: WatchlistItemRecord): { percent: number; at: string | null } {
  if (item.lastCheckpointPrice && item.lastCheckpointPrice > 0) {
    return {
      percent: ((observation.price - item.lastCheckpointPrice) / item.lastCheckpointPrice) * 100,
      at: item.lastCheckpointTimestamp,
    };
  }
  return { percent: observation.changePercent, at: null };
}

function evaluate(item: WatchlistItemRecord, observation: MarketObservation): AttentionResult {
  const since = checkpointPercent(observation, item);
  const signals = buildSignals({
    priceMovePercent: since.percent,
    volumeRatio: observation.volumeRatio,
    thresholdPercent: item.thresholdPercent,
    sectorMovePercent: observation.sectorChangePercent,
    marketMovePercent: observation.marketChangePercent,
  });
  const scored = calculateAttentionScore({
    priceMovePercent: since.percent,
    volumeRatio: observation.volumeRatio,
    thresholdCrossed: Math.abs(since.percent) >= item.thresholdPercent,
    sectorMovePercent: observation.sectorChangePercent,
    reliableEvent: false,
  });
  return {
    score: scored.total,
    severity: scored.severity,
    sinceLastCheckPercent: since.percent,
    sinceLastCheckAt: since.at,
    signals,
    explanation: buildExplanation(observation, signals),
  };
}

function isMeaningful(attention: AttentionResult): boolean {
  const price = attention.signals.find((signal) => signal.type === "PRICE_MOVE");
  const volume = attention.signals.find((signal) => signal.type === "VOLUME_ANOMALY");
  const threshold = attention.signals.find((signal) => signal.type === "THRESHOLD_CROSSED");
  return isMeaningfulEvent({
    priceMovePercent: price?.value ?? 0,
    volumeRatio: volume?.available ? volume.value : null,
    thresholdCrossed: threshold?.contribution === 20,
    reliableEvent: false,
  });
}

function itemToApi(item: WatchlistItemRecord) {
  return {
    id: item.id,
    symbol: item.symbol,
    companyName: item.companyName,
    exchange: item.exchange,
    thresholdPercent: item.thresholdPercent,
    lastViewedAt: item.lastViewedAt,
    lastCheckpointPrice: item.lastCheckpointPrice,
    lastCheckpointTimestamp: item.lastCheckpointTimestamp,
  };
}

function marketToApi(
  item: WatchlistItemRecord,
  observation: MarketObservation,
  attention: AttentionResult,
  activeEventId: string | null,
) {
  return {
    symbol: observation.symbol,
    companyName: observation.companyName,
    exchange: observation.exchange,
    sector: observation.sector,
    price: observation.price,
    changePercent: observation.changePercent,
    volumeRatio: observation.volumeRatio,
    sectorChangePercent: observation.sectorChangePercent,
    marketChangePercent: observation.marketChangePercent,
    observedAt: observation.observedAt,
    source: observation.source,
    isStale: observation.isStale,
    marketState: observation.marketState,
    attention,
    activeEventId,
    thresholdPercent: item.thresholdPercent,
  };
}

async function observeAndPersist(userId: string, item: WatchlistItemRecord) {
  let observation: MarketObservation;
  try {
    observation = await market.getObservation(item.symbol);
  } catch {
    throw new ServiceError(
      "PROVIDER_ERROR",
      "Market data is temporarily unavailable. Please retry shortly.",
      503,
    );
  }
  const attention = evaluate(item, observation);
  let event: EventRecord | null = null;
  if (isMeaningful(attention)) {
    event = await createOrUpdateEvent({
      userId,
      symbol: item.symbol,
      companyName: item.companyName,
      detectedAt: observation.observedAt,
      score: attention.score,
      severity: attention.severity,
      explanation: attention.explanation,
      signals: attention.signals,
      observation,
    });
  }
  return { item, observation, attention, event };
}

export async function searchStocks(query: string): Promise<StockCatalogEntry[]> {
  return market.searchStocks(query);
}

export async function listWatchlist(userId: string) {
  const items = await getItems(userId);
  return {
    id: `${userId}-watchlist`,
    name: "My watchlist",
    items: items.map(itemToApi),
  };
}

export async function addWatchlistItem(userId: string, symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  const stock = STOCK_CATALOG.find((candidate) => candidate.symbol === normalized);
  if (!stock) throw new ServiceError("NOT_FOUND", "That stock is not supported.", 404);
  if (await findItem(userId, normalized)) {
    throw new ServiceError("DUPLICATE_RESOURCE", "That stock is already on your watchlist.", 409);
  }
  const item = await createItem({
    userId,
    symbol: stock.symbol,
    companyName: stock.companyName,
    exchange: stock.exchange,
    sector: stock.sector,
    thresholdPercent: 5,
  });
  return itemToApi(item);
}

export async function deleteWatchlistItem(userId: string, symbol: string) {
  if (!(await removeItem(userId, symbol.trim().toUpperCase()))) {
    throw new ServiceError("NOT_FOUND", "That stock is not on your watchlist.", 404);
  }
}

export async function updateSettings(userId: string, symbol: string, thresholdPercent: number) {
  if (thresholdPercent < 1 || thresholdPercent > 25) {
    throw new ServiceError("VALIDATION_ERROR", "Threshold must be between 1% and 25%.");
  }
  const item = await updateItem(userId, symbol.toUpperCase(), { thresholdPercent });
  if (!item) throw new ServiceError("NOT_FOUND", "That stock is not on your watchlist.", 404);
  return itemToApi(item);
}

export async function getDashboard(userId: string) {
  const items = await getItems(userId);
  const evaluated = await Promise.all(items.map((item) => observeAndPersist(userId, item)));
  const apiItems = evaluated.map(({ item, observation, attention, event }) =>
    marketToApi(item, observation, attention, event?.status === "ACTIVE" ? event.id : null),
  );
  const attentionItems = apiItems
    .filter((item) => item.attention.score >= 40)
    .sort((a, b) => b.attention.score - a.attention.score);
  return {
    marketState: apiItems[0]?.marketState ?? "CLOSED",
    updatedAt: new Date().toISOString(),
    items: apiItems,
    attentionItems,
  };
}

export async function getDetail(userId: string, symbol: string) {
  const item = await findItem(userId, symbol.toUpperCase());
  if (!item) throw new ServiceError("NOT_FOUND", "That stock is not on your watchlist.", 404);
  const evaluated = await observeAndPersist(userId, item);
  const events = (await getEvents(userId)).filter((event) => event.symbol === item.symbol).slice(0, 8);
  const timeline = [
    ...(item.lastCheckpointTimestamp
      ? [
          {
            timestamp: item.lastCheckpointTimestamp,
            label: "Last meaningful checkpoint",
            detail: `Price was ${item.lastCheckpointPrice?.toFixed(2) ?? "unavailable"}.`,
            kind: "CHECKPOINT",
          },
        ]
      : []),
    ...evaluated.attention.signals
      .filter((signal) => signal.contribution > 0 || signal.type === "MARKET_MOVE")
      .map((signal) => ({
        timestamp: evaluated.observation.observedAt,
        label: signal.type.replaceAll("_", " "),
        detail: signal.label,
        kind: signal.type,
      })),
    ...events.map((event) => ({
      timestamp: event.detectedAt,
      label: `${event.severity.replaceAll("_", " ")} event`,
      detail: `${event.score}/100 attention score`,
      kind: event.status,
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return {
    item: marketToApi(item, evaluated.observation, evaluated.attention, evaluated.event?.id ?? null),
    checkpoint: {
      lastViewedAt: item.lastViewedAt,
      lastCheckpointPrice: item.lastCheckpointPrice,
      lastCheckpointTimestamp: item.lastCheckpointTimestamp,
    },
    timeline,
  };
}

export async function checkpointStock(userId: string, symbol: string) {
  const item = await findItem(userId, symbol.toUpperCase());
  if (!item) throw new ServiceError("NOT_FOUND", "That stock is not on your watchlist.", 404);
  const observation = await market.getObservation(item.symbol).catch(() => {
    throw new ServiceError("PROVIDER_ERROR", "Market data is temporarily unavailable. Please retry shortly.", 503);
  });
  const now = new Date().toISOString();
  const updated = await updateItem(userId, item.symbol, {
    lastViewedAt: now,
    lastCheckpointPrice: observation.price,
    lastCheckpointTimestamp: now,
  });
  return {
    lastViewedAt: updated?.lastViewedAt ?? now,
    lastCheckpointPrice: updated?.lastCheckpointPrice ?? observation.price,
    lastCheckpointTimestamp: updated?.lastCheckpointTimestamp ?? now,
  };
}

export async function listEvents(userId: string) {
  return (await getEvents(userId)).map(eventToApi);
}

export async function getEventDetail(userId: string, id: string) {
  const event = await getEvent(userId, id);
  if (!event) throw new ServiceError("NOT_FOUND", "Event not found.", 404);
  return eventToApi(event);
}

export async function acknowledge(userId: string, id: string) {
  const event = await acknowledgeStoredEvent(userId, id);
  if (!event) throw new ServiceError("NOT_FOUND", "Event not found.", 404);
  const item = await findItem(userId, event.symbol);
  if (item) {
    const now = new Date().toISOString();
    await updateItem(userId, event.symbol, {
      lastViewedAt: now,
      lastCheckpointPrice: event.observation.price,
      lastCheckpointTimestamp: now,
      lastAcknowledgedEventId: event.id,
    });
  }
  return eventToApi(event);
}

function eventToApi(event: EventRecord) {
  return {
    id: event.id,
    symbol: event.symbol,
    companyName: event.companyName,
    detectedAt: event.detectedAt,
    score: event.score,
    severity: event.severity,
    status: event.status,
    acknowledgedAt: event.acknowledgedAt,
    explanation: event.explanation,
    signals: event.signals,
  };
}