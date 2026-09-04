import type {
  MarketObservation,
  MockScenario,
  StockCatalogEntry,
} from "../types/domain";
import { STOCK_CATALOG } from "../types/domain";

export interface MarketDataProvider {
  searchStocks(query: string): Promise<StockCatalogEntry[]>;
  getObservation(symbol: string): Promise<MarketObservation>;
}

const basePrices: Record<string, number> = {
  TATAMOTORS: 984.35,
  RELIANCE: 2940.1,
  INFY: 1822.4,
  HDFCBANK: 1688.75,
  ICICIBANK: 1215.2,
  SBIN: 812.4,
  HINDUNILVR: 2510.3,
};

export class MockMarketDataProvider implements MarketDataProvider {
  constructor(private readonly scenario: MockScenario = "HIGH_ATTENTION") {}

  async searchStocks(query: string): Promise<StockCatalogEntry[]> {
    const normalized = query.trim().toLowerCase();
    return STOCK_CATALOG.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(normalized) ||
        stock.companyName.toLowerCase().includes(normalized),
    ).slice(0, 8);
  }

  async getObservation(symbol: string): Promise<MarketObservation> {
    if (this.scenario === "UNAVAILABLE") {
      throw new Error("MARKET_PROVIDER_UNAVAILABLE");
    }
    const stock =
      STOCK_CATALOG.find((candidate) => candidate.symbol === symbol) ??
      STOCK_CATALOG[0];
    const scenarioValues = {
      NORMAL: { change: 0.4, volume: 1.1, sector: 0.2, market: 0.1 },
      HIGH_ATTENTION: { change: 4.2, volume: 3.1, sector: 1.8, market: 0.6 },
      MARKET_WIDE: { change: 3.5, volume: 2.1, sector: 2.1, market: 2.4 },
      UNAVAILABLE: { change: 0, volume: null, sector: 0, market: 0 },
    } as const;
    const values = scenarioValues[this.scenario];
    return {
      symbol: stock.symbol,
      companyName: stock.companyName,
      exchange: stock.exchange,
      sector: stock.sector,
      price: basePrices[stock.symbol] ?? 1000,
      changePercent: values.change,
      volumeRatio: values.volume,
      sectorChangePercent: values.sector,
      marketChangePercent: values.market,
      observedAt: new Date().toISOString(),
      source: "MOCK",
      isStale: false,
      marketState: "OPEN",
    };
  }
}

export class RealMarketDataProvider implements MarketDataProvider {
  private readonly apiKey = process.env.MARKET_API_KEY;

  async searchStocks(query: string): Promise<StockCatalogEntry[]> {
    return STOCK_CATALOG.filter(
      (stock) =>
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.companyName.toLowerCase().includes(query.toLowerCase()),
    ).slice(0, 8);
  }

  async getObservation(symbol: string): Promise<MarketObservation> {
    if (!this.apiKey || !process.env.MARKET_API_URL) {
      throw new Error("REAL_MARKET_PROVIDER_NOT_CONFIGURED");
    }
    const response = await fetch(
      `${process.env.MARKET_API_URL}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(this.apiKey)}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error("REAL_MARKET_PROVIDER_ERROR");
    const payload = (await response.json()) as {
      price?: number;
      changePercent?: number;
      volumeRatio?: number;
      sectorChangePercent?: number;
      marketChangePercent?: number;
      marketState?: MarketObservation["marketState"];
    };
    const stock = STOCK_CATALOG.find((candidate) => candidate.symbol === symbol);
    if (!stock || typeof payload.price !== "number") {
      throw new Error("REAL_MARKET_PROVIDER_INVALID_RESPONSE");
    }
    return {
      symbol: stock.symbol,
      companyName: stock.companyName,
      exchange: stock.exchange,
      sector: stock.sector,
      price: payload.price,
      changePercent: payload.changePercent ?? 0,
      volumeRatio: payload.volumeRatio ?? null,
      sectorChangePercent: payload.sectorChangePercent ?? 0,
      marketChangePercent: payload.marketChangePercent ?? 0,
      observedAt: new Date().toISOString(),
      source: "REAL",
      isStale: false,
      marketState: payload.marketState ?? "OPEN",
    };
  }
}

export class CachedMarketDataProvider implements MarketDataProvider {
  private readonly cache = new Map<string, { observation: MarketObservation; expiresAt: number }>();
  private readonly inFlight = new Map<string, Promise<MarketObservation>>();
  constructor(
    private readonly provider: MarketDataProvider,
    private readonly ttlMs = Number(process.env.MARKET_CACHE_TTL_MS ?? 45_000),
  ) {}

  searchStocks(query: string): Promise<StockCatalogEntry[]> {
    return this.provider.searchStocks(query);
  }

  async getObservation(symbol: string): Promise<MarketObservation> {
    const cached = this.cache.get(symbol);
    if (cached && cached.expiresAt > Date.now()) return cached.observation;
    const active = this.inFlight.get(symbol);
    if (active) return active;
    const request = this.provider
      .getObservation(symbol)
      .then((observation) => {
        this.cache.set(symbol, { observation, expiresAt: Date.now() + this.ttlMs });
        this.inFlight.delete(symbol);
        return observation;
      })
      .catch((error) => {
        this.inFlight.delete(symbol);
        if (cached) {
          return { ...cached.observation, isStale: true };
        }
        throw error;
      });
    this.inFlight.set(symbol, request);
    return request;
  }
}

export function createMarketProvider(): CachedMarketDataProvider {
  const scenario = (process.env.MOCK_SCENARIO ?? "HIGH_ATTENTION").toUpperCase() as MockScenario;
  const provider =
    process.env.MARKET_PROVIDER === "real"
      ? new RealMarketDataProvider()
      : new MockMarketDataProvider(scenario);
  return new CachedMarketDataProvider(provider);
}