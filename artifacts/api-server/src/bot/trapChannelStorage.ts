import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "trapChannels.json");

export interface TrapChannelEntry {
  channelId: string;
  durationMinutes: number;
  deleteMessage: boolean;
  reason: string;
}

export type TrapChannelData = Record<string, TrapChannelEntry>;

function ensureFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "{}", "utf-8");
}

export function readTrapChannels(): TrapChannelData {
  ensureFile();
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as TrapChannelData;
  } catch {
    return {};
  }
}

export function saveTrapChannel(guildId: string, entry: TrapChannelEntry): void {
  ensureFile();
  const data = readTrapChannels();
  data[guildId] = entry;
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function deleteTrapChannel(guildId: string): boolean {
  ensureFile();
  const data = readTrapChannels();
  if (!data[guildId]) return false;
  delete data[guildId];
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  return true;
}

export function getTrapChannel(guildId: string): TrapChannelEntry | undefined {
  return readTrapChannels()[guildId];
}
