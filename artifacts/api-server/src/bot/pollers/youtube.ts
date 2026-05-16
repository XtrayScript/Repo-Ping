import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
import { readData, writeData } from "../storage.js";
import { logger } from "../../lib/logger.js";

interface YTEntry {
  id: string;
  title: string;
  link: string;
  published: string;
  thumbnail?: string;
  author?: string;
}

async function fetchFeed(channelId: string): Promise<YTEntry[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`YouTube feed HTTP ${res.status}`);
  const xml = await res.text();

  const entries: YTEntry[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) !== null) {
    const e = m[1];
    const id = e.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ?? "";
    const title = e.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const link = e.match(/<link[^>]+href="([^"]+)"/)?.[1] ?? "";
    const published = e.match(/<published>(.*?)<\/published>/)?.[1] ?? "";
    const thumbnail = e.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1];
    const author = e.match(/<name>(.*?)<\/name>/)?.[1];
    if (id && title) entries.push({ id, title, link, published, thumbnail, author });
  }
  return entries;
}

async function poll(client: Client): Promise<void> {
  const data = readData();
  if (!data.youtube) return;
  const cfg = data.youtube;

  try {
    const entries = await fetchFeed(cfg.channelId);
    if (entries.length === 0) return;

    if (cfg.lastId === undefined) {
      data.youtube = { ...cfg, lastId: entries[0].id };
      writeData(data);
      logger.info({ channelId: cfg.channelId }, "YouTube: polling pertama, simpan lastId");
      return;
    }

    const newEntries: YTEntry[] = [];
    for (const entry of entries) {
      if (entry.id === cfg.lastId) break;
      newEntries.push(entry);
    }
    if (newEntries.length === 0) return;

    data.youtube = { ...cfg, lastId: newEntries[0].id };
    writeData(data);

    const ch = client.channels.cache.get(cfg.discordChannelId) as TextChannel | undefined;
    if (!ch) { logger.warn({ discordChannelId: cfg.discordChannelId }, "YouTube: channel Discord tidak ditemukan"); return; }

    for (const entry of newEntries.reverse()) {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(entry.title)
        .setURL(entry.link)
        .setDescription(`Video baru dari ${entry.author ?? cfg.channelId}`)
        .setTimestamp()
        .setFooter({ text: "Xtray Ping Bot • YouTube" });
      if (entry.thumbnail) embed.setImage(entry.thumbnail);
      await ch.send({ embeds: [embed] });
    }
    logger.info({ count: newEntries.length }, "YouTube: kirim notifikasi");
  } catch (err) {
    logger.error({ err, channelId: cfg.channelId }, "YouTube polling error");
  }
}

export function startYouTubePoller(client: Client): void {
  poll(client).catch(() => {});
  setInterval(() => poll(client).catch(() => {}), 5 * 60 * 1000);
  logger.info("YouTube poller dimulai (interval 5 menit)");
}
