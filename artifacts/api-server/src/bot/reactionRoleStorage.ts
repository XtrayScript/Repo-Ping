import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "reactionRoles.json");

export interface ReactionRoleEntry {
  emoji: string;
  roleId: string;
  guildId: string;
  channelId: string;
}

export type ReactionRoleData = Record<string, ReactionRoleEntry>;

function ensureFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "{}", "utf-8");
}

export function readReactionRoles(): ReactionRoleData {
  ensureFile();
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as ReactionRoleData;
  } catch {
    return {};
  }
}

export function saveReactionRole(messageId: string, entry: ReactionRoleEntry): void {
  ensureFile();
  const data = readReactionRoles();
  data[messageId] = entry;
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function deleteReactionRole(messageId: string): void {
  ensureFile();
  const data = readReactionRoles();
  delete data[messageId];
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function emojiMatches(storedEmoji: string, reactionEmoji: { name: string | null; id: string | null }): boolean {
  if (!reactionEmoji.name) return false;
  if (reactionEmoji.name === storedEmoji) return true;
  if (reactionEmoji.id && storedEmoji.includes(reactionEmoji.id)) return true;
  return false;
}
