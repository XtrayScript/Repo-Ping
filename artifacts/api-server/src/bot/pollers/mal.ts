import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
import { readData, writeData } from "../storage.js";
import { logger } from "../../lib/logger.js";

interface JikanAnimeEntry {
  mal_id: number;
  title: string;
  images: { jpg: { image_url: string } };
  url: string;
  episodes: number | null;
  watched_episodes: number;
  score: number | null;
  updated: string;
}

async function fetchWatchingList(username: string): Promise<JikanAnimeEntry[]> {
  const url = `https://api.jikan.moe/v4/users/${encodeURIComponent(username)}/animelist?status=watching&order_by=last_updated&sort=desc&limit=10`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
  const json = (await res.json()) as { data?: Array<{ node?: JikanAnimeEntry; list_status?: { num_episodes_watched: number; score: number | null; updated_at: string } }> };
  if (!json.data) return [];

  return json.data.map(item => ({
    mal_id: (item as { node?: { mal_id?: number } }).node?.mal_id ?? 0,
    title: (item as { node?: { title?: string } }).node?.title ?? "",
    images: (item as { node?: { images?: { jpg: { image_url: string } } } }).node?.images ?? { jpg: { image_url: "" } },
    url: `https://myanimelist.net/anime/${(item as { node?: { mal_id?: number } }).node?.mal_id ?? 0}`,
    episodes: (item as { node?: { num_episodes?: number | null } }).node?.num_episodes ?? null,
    watched_episodes: (item as { list_status?: { num_episodes_watched: number } }).list_status?.num_episodes_watched ?? 0,
    score: (item as { list_status?: { score: number | null } }).list_status?.score ?? null,
    updated: (item as { list_status?: { updated_at: string } }).list_status?.updated_at ?? "",
  }));
}

async function poll(client: Client): Promise<void> {
  const data = readData();
  if (!data.mal) return;
  const cfg = data.mal;

  try {
    const entries = await fetchWatchingList(cfg.username);
    if (entries.length === 0) return;

    const latestId = `${entries[0].mal_id}-${entries[0].watched_episodes}`;

    if (cfg.lastId === undefined) {
      data.mal = { ...cfg, lastId: latestId };
      writeData(data);
      logger.info({ username: cfg.username }, "MAL: polling pertama, simpan lastId");
      return;
    }

    if (latestId === cfg.lastId) return;

    const prevMalId = parseInt(cfg.lastId.split("-")[0] ?? "0", 10);
    const prevEp = parseInt(cfg.lastId.split("-")[1] ?? "0", 10);
    const latest = entries[0];

    data.mal = { ...cfg, lastId: latestId };
    writeData(data);

    const ch = client.channels.cache.get(cfg.discordChannelId) as TextChannel | undefined;
    if (!ch) { logger.warn({ discordChannelId: cfg.discordChannelId }, "MAL: channel Discord tidak ditemukan"); return; }

    const isSameAnime = latest.mal_id === prevMalId;
    const desc = isSameAnime
      ? `**${cfg.username}** menonton episode **${latest.watched_episodes}** dari **${latest.title}**${latest.episodes ? ` (dari ${latest.episodes} eps)` : ""}`
      : `**${cfg.username}** sekarang menonton **${latest.title}** (episode ${latest.watched_episodes})`;

    const embed = new EmbedBuilder()
      .setColor(0x2E51A2)
      .setTitle(`Update MAL: ${latest.title}`)
      .setURL(latest.url)
      .setDescription(desc)
      .setTimestamp()
      .setFooter({ text: "Xtray Ping Bot • MyAnimeList" });
    if (latest.images.jpg.image_url) embed.setThumbnail(latest.images.jpg.image_url);

    await ch.send({ embeds: [embed] });
    logger.info({ username: cfg.username }, "MAL: kirim notifikasi");
  } catch (err) {
    logger.error({ err, username: cfg.username }, "MAL polling error");
  }
}

export function startMALPoller(client: Client): void {
  poll(client).catch(() => {});
  setInterval(() => poll(client).catch(() => {}), 30 * 60 * 1000);
  logger.info("MAL poller dimulai (interval 30 menit)");
}
