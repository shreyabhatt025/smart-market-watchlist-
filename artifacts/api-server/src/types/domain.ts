export type MockScenario =
  | "NORMAL"
  | "HIGH_ATTENTION"
  | "MARKET_WIDE"
  | "UNAVAILABLE";

export type SignalType =
  | "PRICE_MOVE"
  | "VOLUME_ANOMALY"
  | "THRESHOLD_CROSSED"
  | "SECTOR_MOVE"
  | "MARKET_MOVE"
  | "EVENT";

export type Severity =
  | "NORMAL"
  | "WORTH_WATCHING"
  | "IMPORTANT"
  | "HIGH_ATTENTION";

export type EventStatus = "ACTIVE" | "ACKNOWLEDGED";

export type MarketState = "OPEN" | "PRE-MARKET" | "POST-MARKET" | "CLOSED";

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

export interface WatchlistItemRecord {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  thresholdPercent: number;
  lastViewedAt: string | null;
  lastAcknowledgedEventId: string | null;
  lastCheckpointPrice: number | null;
  lastCheckpointTimestamp: string | null;
}

export interface Signal {
  type: SignalType;
  label: string;
  value: number;
  severity: string;
  contribution: number;
  available: boolean;
}

export interface Explanation {
  fact: string;
  signal: string;
  context: string;
  explanation: string;
  unknown: string;
  source: "DETERMINISTIC" | "LLM";
}

export interface MarketObservation {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  price: number;
  changePercent: number;
  volumeRatio: number | null;
  sectorChangePercent: number;
  marketChangePercent: number;
  observedAt: string;
  source: "MOCK" | "REAL";
  isStale: boolean;
  marketState: MarketState;
}

export interface AttentionResult {
  score: number;
  severity: Severity;
  sinceLastCheckPercent: number;
  sinceLastCheckAt: string | null;
  signals: Signal[];
  explanation: Explanation;
}

export interface EventRecord {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  detectedAt: string;
  score: number;
  severity: Severity;
  status: EventStatus;
  acknowledgedAt: string | null;
  explanation: Explanation;
  signals: Signal[];
  observation: MarketObservation;
}

export interface StockCatalogEntry {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
}

export const STOCK_CATALOG: StockCatalogEntry[] = [
  { symbol: "TATAMOTORS", companyName: "Tata Motors", exchange: "NSE", sector: "Automobile" },
  { symbol: "RELIANCE", companyName: "Reliance Industries", exchange: "NSE", sector: "Energy" },
  { symbol: "INFY", companyName: "Infosys", exchange: "NSE", sector: "Technology" },
  { symbol: "HDFCBANK", companyName: "HDFC Bank", exchange: "NSE", sector: "Financial Services" },
  { symbol: "ICICIBANK", companyName: "ICICI Bank", exchange: "NSE", sector: "Financial Services" },
  { symbol: "SBIN", companyName: "State Bank of India", exchange: "NSE", sector: "Financial Services" },
  { symbol: "HINDUNILVR", companyName: "Hindustan Unilever", exchange: "NSE", sector: "Consumer Goods" },
];