import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
import { readData, writeData } from "../storage.js";
import { logger } from "../../lib/logger.js";

interface TGMessage {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  description?: string;
}

async function fetchRSSHub(channel: string): Promise<TGMessage[]> {
  const url = `https://rsshub.app/telegram/channel/${encodeURIComponent(channel)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`RSSHub HTTP ${res.status}`);
  const xml = await res.text();

  const messages: TGMessage[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1];
    const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? "";
    const idMatch = link.match(/\/(\d+)$/);
    const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)?.[1]?.trim() ?? "";
    const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    const description = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.replace(/<[^>]*>/g, "").trim().slice(0, 500);
    const id = idMatch?.[1] ?? link;
    if (id) messages.push({ id, title, link, pubDate, description });
  }
  return messages;
}

async function poll(client: Client): Promise<void> {
  const data = readData();
  if (!data.telegram) return;
  const cfg = data.telegram;

  try {
    const messages = await fetchRSSHub(cfg.channel);
    if (messages.length === 0) return;

    if (cfg.lastId === undefined) {
      data.telegram = { ...cfg, lastId: messages[0].id };
      writeData(data);
      logger.info({ channel: cfg.channel }, "Telegram: polling pertama, simpan lastId");
      return;
    }

    const newMessages: TGMessage[] = [];
    for (const msg of messages) {
      if (msg.id === cfg.lastId) break;
      newMessages.push(msg);
    }
    if (newMessages.length === 0) return;

    data.telegram = { ...cfg, lastId: newMessages[0].id };
    writeData(data);

    const ch = client.channels.cache.get(cfg.discordChannelId) as TextChannel | undefined;
    if (!ch) { logger.warn({ discordChannelId: cfg.discordChannelId }, "Telegram: channel Discord tidak ditemukan"); return; }

    for (const msg of newMessages.reverse()) {
      const embed = new EmbedBuilder()
        .setColor(0x2AABEE)
        .setTitle(`Pesan baru dari @${cfg.channel}`)
        .setURL(msg.link || `https://t.me/${cfg.channel}`)
        .setDescription(msg.description ?? msg.title.slice(0, 400))
        .setTimestamp()
        .setFooter({ text: "Xtray Ping Bot • Telegram" });
      await ch.send({ embeds: [embed] });
    }
    logger.info({ count: newMessages.length }, "Telegram: kirim notifikasi");
  } catch (err) {
    logger.error({ err, channel: cfg.channel }, "Telegram polling error");
  }
}

export function startTelegramPoller(client: Client): void {
  poll(client).catch(() => {});
  setInterval(() => poll(client).catch(() => {}), 10 * 60 * 1000);
  logger.info("Telegram poller dimulai (interval 10 menit)");
}
