import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
import { readData, writeData } from "../storage.js";
import { logger } from "../../lib/logger.js";

const NITTER_HOSTS = [
  "nitter.privacyredirect.com",
  "nitter.poast.org",
  "nitter.1d4.us",
  "nitter.kavin.rocks",
];

interface Tweet {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  content?: string;
}

async function fetchNitter(username: string): Promise<Tweet[]> {
  for (const host of NITTER_HOSTS) {
    try {
      const url = `https://${host}/${encodeURIComponent(username)}/rss`;
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const xml = await res.text();

      const tweets: Tweet[] = [];
      const itemRe = /<item>([\s\S]*?)<\/item>/g;
      let m: RegExpExecArray | null;
      while ((m = itemRe.exec(xml)) !== null) {
        const item = m[1];
        const link = item.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? "";
        const idMatch = link.match(/\/status\/(\d+)/);
        if (!idMatch) continue;
        const title = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)?.[1]?.trim() ?? "";
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";
        const content = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]?.replace(/<[^>]*>/g, "").trim();
        tweets.push({ id: idMatch[1], title, link, pubDate, content });
      }
      return tweets;
    } catch {
      continue;
    }
  }
  throw new Error("Semua Nitter host tidak bisa diakses");
}

async function poll(client: Client): Promise<void> {
  const data = readData();
  if (!data.twitter) return;
  const cfg = data.twitter;

  try {
    const tweets = await fetchNitter(cfg.username);
    if (tweets.length === 0) return;

    if (cfg.lastId === undefined) {
      data.twitter = { ...cfg, lastId: tweets[0].id };
      writeData(data);
      logger.info({ username: cfg.username }, "Twitter: polling pertama, simpan lastId");
      return;
    }

    const newTweets: Tweet[] = [];
    for (const t of tweets) {
      if (t.id === cfg.lastId) break;
      newTweets.push(t);
    }
    if (newTweets.length === 0) return;

    data.twitter = { ...cfg, lastId: newTweets[0].id };
    writeData(data);

    const ch = client.channels.cache.get(cfg.discordChannelId) as TextChannel | undefined;
    if (!ch) { logger.warn({ discordChannelId: cfg.discordChannelId }, "Twitter: channel Discord tidak ditemukan"); return; }

    for (const t of newTweets.reverse()) {
      const twitterLink = `https://twitter.com/${cfg.username}/status/${t.id}`;
      const embed = new EmbedBuilder()
        .setColor(0x1DA1F2)
        .setTitle(`Tweet baru dari @${cfg.username}`)
        .setURL(twitterLink)
        .setDescription(t.content ? t.content.slice(0, 400) : t.title.slice(0, 400))
        .setTimestamp()
        .setFooter({ text: "Xtray Ping Bot • Twitter/X" });
      await ch.send({ embeds: [embed] });
    }
    logger.info({ count: newTweets.length }, "Twitter: kirim notifikasi");
  } catch (err) {
    logger.error({ err, username: cfg.username }, "Twitter polling error");
  }
}

export function startTwitterPoller(client: Client): void {
  poll(client).catch(() => {});
  setInterval(() => poll(client).catch(() => {}), 15 * 60 * 1000);
  logger.info("Twitter poller dimulai (interval 15 menit)");
}
