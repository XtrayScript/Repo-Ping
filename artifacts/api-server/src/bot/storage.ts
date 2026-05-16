import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const DATA_FILE = path.resolve(process.cwd(), "bot-data.json");

export interface PlatformConfig {
  discordChannelId: string;
  lastId?: string;
}

export interface YouTubeConfig extends PlatformConfig {
  channelId: string;
  channelName?: string;
}

export interface TikTokConfig extends PlatformConfig {
  username: string;
}

export interface TwitterConfig extends PlatformConfig {
  username: string;
}

export interface TelegramConfig extends PlatformConfig {
  channel: string;
}

export interface PinterestConfig extends PlatformConfig {
  username: string;
}

export interface AnimeConfig extends PlatformConfig {
  query: string;
  anilistId?: number;
  lastEpisode?: number;
}

export interface MALConfig extends PlatformConfig {
  username: string;
}

export interface BotData {
  youtube?: YouTubeConfig;
  tiktok?: TikTokConfig;
  twitter?: TwitterConfig;
  telegram?: TelegramConfig;
  pinterest?: PinterestConfig;
  anime?: AnimeConfig;
  mal?: MALConfig;
}

export function readData(): BotData {
  if (!existsSync(DATA_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as BotData;
  } catch {
    return {};
  }
}

export function writeData(data: BotData): void {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function updatePlatform<K extends keyof BotData>(
  platform: K,
  config: BotData[K],
): void {
  const data = readData();
  const existing = data[platform] as PlatformConfig | undefined;
  const incoming = config as PlatformConfig | undefined;
  if (existing && incoming) {
    incoming.lastId = existing.lastId;
  }
  data[platform] = config;
  writeData(data);
}

export function stopPlatform(platform: keyof BotData): void {
  const data = readData();
  delete data[platform];
  writeData(data);
}
