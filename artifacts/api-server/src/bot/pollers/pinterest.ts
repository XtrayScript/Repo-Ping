import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
import { readData, writeData } from "../storage.js";
import { logger } from "../../lib/logger.js";

interface Pin {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  image?: string;
  description?: string;
}

async function fetchPins(username: string): Promise<Pin[]> {
  const url = `https://www.pinterest.com/${encodeURIComponent(username)}/feed.rss`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; XtrayBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Pinterest feed HTTP ${res.status}`);
  const xml = await res.text();

  const pins: Pin[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1];
    const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? "";
    const idMatch = link.match(/\/pin\/(\d+)\//);
    const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)?.[1]?.trim() ?? "";
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    const image = item.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1] ?? item.match(/<img[^>]+src="([^"]+)"/)?.[1];
    const description = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.replace(/<[^>]*>/g, "").trim().slice(0, 300);
    const id = idMatch?.[1] ?? link;
    if (id) pins.push({ id, title, link, pubDate, image, description });
  }
  return pins;
}

async function poll(client: Client): Promise<void> {
  const data = readData();
  if (!data.pinterest) return;
  const cfg = data.pinterest;

  try {
    const pins = await fetchPins(cfg.username);
    if (pins.length === 0) return;

    if (cfg.lastId === undefined) {
      data.pinterest = { ...cfg, lastId: pins[0].id };
      writeData(data);
      logger.info({ username: cfg.username }, "Pinterest: polling pertama, simpan lastId");
      return;
    }

    const newPins: Pin[] = [];
    for (const pin of pins) {
      if (pin.id === cfg.lastId) break;
      newPins.push(pin);
    }
    if (newPins.length === 0) return;

    data.pinterest = { ...cfg, lastId: newPins[0].id };
    writeData(data);

    const ch = client.channels.cache.get(cfg.discordChannelId) as TextChannel | undefined;
    if (!ch) { logger.warn({ discordChannelId: cfg.discordChannelId }, "Pinterest: channel Discord tidak ditemukan"); return; }

    for (const pin of newPins.reverse()) {
      const embed = new EmbedBuilder()
        .setColor(0xE60023)
        .setTitle(pin.title || `Pin baru dari ${cfg.username}`)
        .setURL(pin.link)
        .setDescription(pin.description ?? `Pin baru dari **${cfg.username}** di Pinterest`)
        .setTimestamp()
        .setFooter({ text: "Xtray Ping Bot • Pinterest" });
      if (pin.image) embed.setImage(pin.image);
      await ch.send({ embeds: [embed] });
    }
    logger.info({ count: newPins.length }, "Pinterest: kirim notifikasi");
  } catch (err) {
    logger.error({ err, username: cfg.username }, "Pinterest polling error");
  }
}

export function startPinterestPoller(client: Client): void {
  poll(client).catch(() => {});
  setInterval(() => poll(client).catch(() => {}), 15 * 60 * 1000);
  logger.info("Pinterest poller dimulai (interval 15 menit)");
}
