import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import type { Explanation, EventRecord, UserRecord, WatchlistItemRecord } from "../types/domain";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);
const itemSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true },
    companyName: { type: String, required: true },
    exchange: { type: String, required: true },
    sector: { type: String, required: true },
    thresholdPercent: { type: Number, required: true, default: 5 },
    lastViewedAt: { type: Date, default: null },
    lastAcknowledgedEventId: { type: String, default: null },
    lastCheckpointPrice: { type: Number, default: null },
    lastCheckpointTimestamp: { type: Date, default: null },
  },
  { timestamps: true },
);
itemSchema.index({ userId: 1, symbol: 1 }, { unique: true });
const eventSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    symbol: { type: String, required: true },
    companyName: { type: String, required: true },
    detectedAt: { type: Date, required: true },
    score: { type: Number, required: true },
    severity: { type: String, required: true },
    status: { type: String, required: true, index: true },
    acknowledgedAt: { type: Date, default: null },
    explanation: { type: Object, required: true },
    signals: { type: Array, required: true },
    observation: { type: Object, required: true },
  },
  { timestamps: true },
);
eventSchema.index({ userId: 1, status: 1 });
eventSchema.index({ userId: 1, symbol: 1, detectedAt: -1 });

const UserModel = mongoose.models.SmartUser ?? mongoose.model("SmartUser", userSchema);
const ItemModel = mongoose.models.SmartWatchlistItem ?? mongoose.model("SmartWatchlistItem", itemSchema);
const EventModel = mongoose.models.SmartEvent ?? mongoose.model("SmartEvent", eventSchema);

let databaseConnected = false;

const memoryUsers: UserRecord[] = [];
const memoryItems: WatchlistItemRecord[] = [];
const memoryEvents: EventRecord[] = [];

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    databaseConnected = true;
    return true;
  } catch {
    databaseConnected = false;
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return databaseConnected;
}

function toUser(value: any): UserRecord {
  return { id: String(value._id ?? value.id), name: value.name, email: value.email, passwordHash: value.passwordHash };
}

function toItem(value: any): WatchlistItemRecord {
  return {
    id: String(value._id ?? value.id),
    userId: String(value.userId),
    symbol: value.symbol,
    companyName: value.companyName,
    exchange: value.exchange,
    sector: value.sector,
    thresholdPercent: value.thresholdPercent,
    lastViewedAt: value.lastViewedAt ? new Date(value.lastViewedAt).toISOString() : null,
    lastAcknowledgedEventId: value.lastAcknowledgedEventId ?? null,
    lastCheckpointPrice: value.lastCheckpointPrice ?? null,
    lastCheckpointTimestamp: value.lastCheckpointTimestamp
      ? new Date(value.lastCheckpointTimestamp).toISOString()
      : null,
  };
}

function toEvent(value: any): EventRecord {
  return {
    id: String(value._id ?? value.id),
    userId: String(value.userId),
    symbol: value.symbol,
    companyName: value.companyName,
    detectedAt: new Date(value.detectedAt).toISOString(),
    score: value.score,
    severity: value.severity,
    status: value.status,
    acknowledgedAt: value.acknowledgedAt ? new Date(value.acknowledgedAt).toISOString() : null,
    explanation: value.explanation,
    signals: value.signals,
    observation: value.observation,
  };
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  if (databaseConnected) {
    const user = await UserModel.findOne({ email }).lean();
    return user ? toUser(user) : null;
  }
  return memoryUsers.find((user) => user.email === email) ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  if (databaseConnected) {
    const user = await UserModel.findById(id).lean();
    return user ? toUser(user) : null;
  }
  return memoryUsers.find((user) => user.id === id) ?? null;
}

export async function createUser(input: Omit<UserRecord, "id">): Promise<UserRecord> {
  if (databaseConnected) {
    const user = await UserModel.create(input);
    return toUser(user.toObject());
  }
  const user = { ...input, id: randomUUID() };
  memoryUsers.push(user);
  return user;
}

export async function getItems(userId: string): Promise<WatchlistItemRecord[]> {
  if (databaseConnected) {
    const items = await ItemModel.find({ userId }).sort({ createdAt: 1 }).lean();
    return items.map(toItem);
  }
  return memoryItems.filter((item) => item.userId === userId);
}

export async function findItem(userId: string, symbol: string): Promise<WatchlistItemRecord | null> {
  if (databaseConnected) {
    const item = await ItemModel.findOne({ userId, symbol }).lean();
    return item ? toItem(item) : null;
  }
  return memoryItems.find((item) => item.userId === userId && item.symbol === symbol) ?? null;
}

export async function createItem(input: Omit<WatchlistItemRecord, "id" | "lastViewedAt" | "lastAcknowledgedEventId" | "lastCheckpointPrice" | "lastCheckpointTimestamp">): Promise<WatchlistItemRecord> {
  const value = {
    ...input,
    lastViewedAt: null,
    lastAcknowledgedEventId: null,
    lastCheckpointPrice: null,
    lastCheckpointTimestamp: null,
  };
  if (databaseConnected) {
    const item = await ItemModel.create(value);
    return toItem(item.toObject());
  }
  const item = { ...value, id: randomUUID() };
  memoryItems.push(item);
  return item;
}

export async function removeItem(userId: string, symbol: string): Promise<boolean> {
  if (databaseConnected) return (await ItemModel.deleteOne({ userId, symbol })).deletedCount === 1;
  const index = memoryItems.findIndex((item) => item.userId === userId && item.symbol === symbol);
  if (index < 0) return false;
  memoryItems.splice(index, 1);
  return true;
}

export async function updateItem(
  userId: string,
  symbol: string,
  update: Partial<Pick<WatchlistItemRecord, "thresholdPercent" | "lastViewedAt" | "lastAcknowledgedEventId" | "lastCheckpointPrice" | "lastCheckpointTimestamp">>,
): Promise<WatchlistItemRecord | null> {
  if (databaseConnected) {
    const value = await ItemModel.findOneAndUpdate({ userId, symbol }, update, { new: true }).lean();
    return value ? toItem(value) : null;
  }
  const item = memoryItems.find((candidate) => candidate.userId === userId && candidate.symbol === symbol);
  if (!item) return null;
  Object.assign(item, update);
  return item;
}

export async function getActiveEvent(userId: string, symbol: string): Promise<EventRecord | null> {
  if (databaseConnected) {
    const event = await EventModel.findOne({ userId, symbol, status: "ACTIVE" }).sort({ detectedAt: -1 }).lean();
    return event ? toEvent(event) : null;
  }
  return memoryEvents.find((event) => event.userId === userId && event.symbol === symbol && event.status === "ACTIVE") ?? null;
}

export async function createOrUpdateEvent(input: Omit<EventRecord, "id" | "acknowledgedAt" | "status">): Promise<EventRecord> {
  const existing = await getActiveEvent(input.userId, input.symbol);
  if (existing) {
    if (input.score <= existing.score) return existing;
    if (databaseConnected) {
      const updated = await EventModel.findByIdAndUpdate(
        existing.id,
        { ...input, status: "ACTIVE", acknowledgedAt: null },
        { new: true },
      ).lean();
      return toEvent(updated);
    }
    Object.assign(existing, input, { status: "ACTIVE", acknowledgedAt: null });
    return existing;
  }
  const value = { ...input, status: "ACTIVE" as const, acknowledgedAt: null };
  if (databaseConnected) {
    const event = await EventModel.create(value);
    return toEvent(event.toObject());
  }
  const event = { ...value, id: randomUUID() };
  memoryEvents.push(event);
  return event;
}

export async function getEvents(userId: string): Promise<EventRecord[]> {
  if (databaseConnected) {
    const events = await EventModel.find({ userId }).sort({ detectedAt: -1 }).limit(50).lean();
    return events.map(toEvent);
  }
  return memoryEvents.filter((event) => event.userId === userId).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)).slice(0, 50);
}

export async function getEvent(userId: string, id: string): Promise<EventRecord | null> {
  if (databaseConnected) {
    const event = await EventModel.findOne({ _id: id, userId }).lean();
    return event ? toEvent(event) : null;
  }
  return memoryEvents.find((event) => event.userId === userId && event.id === id) ?? null;
}

export async function acknowledgeEvent(userId: string, id: string): Promise<EventRecord | null> {
  const existing = await getEvent(userId, id);
  if (!existing) return null;
  const acknowledgedAt = new Date().toISOString();
  if (databaseConnected) {
    const event = await EventModel.findOneAndUpdate(
      { _id: id, userId },
      { status: "ACKNOWLEDGED", acknowledgedAt },
      { new: true },
    ).lean();
    return event ? toEvent(event) : null;
  }
  existing.status = "ACKNOWLEDGED";
  existing.acknowledgedAt = acknowledgedAt;
  return existing;
}