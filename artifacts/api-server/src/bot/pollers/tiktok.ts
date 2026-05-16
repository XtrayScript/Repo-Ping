import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
import { readData, writeData } from "../storage.js";
import { logger } from "../../lib/logger.js";

interface TikTokVideo {
  video_id: string;
  title: string;
  cover: string;
  play: string;
  author: { unique_id: string; nickname: string };
}

async function fetchVideos(username: string): Promise<TikTokVideo[]> {
  const url = `https://www.tikwm.com/api/user/posts?unique_id=${encodeURIComponent(username)}&count=10`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`TikWM HTTP ${res.status}`);
  const json = (await res.json()) as { code: number; data?: { videos?: TikTokVideo[] } };
  if (json.code !== 0 || !json.data?.videos) return [];
  return json.data.videos;
}

async function poll(client: Client): Promise<void> {
  const data = readData();
  if (!data.tiktok) return;
  const cfg = data.tiktok;

  try {
    const videos = await fetchVideos(cfg.username);
    if (videos.length === 0) return;

    if (cfg.lastId === undefined) {
      data.tiktok = { ...cfg, lastId: videos[0].video_id };
      writeData(data);
      logger.info({ username: cfg.username }, "TikTok: polling pertama, simpan lastId");
      return;
    }

    const newVideos: TikTokVideo[] = [];
    for (const v of videos) {
      if (v.video_id === cfg.lastId) break;
      newVideos.push(v);
    }
    if (newVideos.length === 0) return;

    data.tiktok = { ...cfg, lastId: newVideos[0].video_id };
    writeData(data);

    const ch = client.channels.cache.get(cfg.discordChannelId) as TextChannel | undefined;
    if (!ch) { logger.warn({ discordChannelId: cfg.discordChannelId }, "TikTok: channel Discord tidak ditemukan"); return; }

    for (const v of newVideos.reverse()) {
      const link = `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`;
      const embed = new EmbedBuilder()
        .setColor(0x010101)
        .setTitle(v.title || `Video baru dari @${v.author.nickname}`)
        .setURL(link)
        .setDescription(`**@${v.author.nickname}** memposting video baru di TikTok`)
        .setTimestamp()
        .setFooter({ text: "Xtray Ping Bot • TikTok" });
      if (v.cover) embed.setImage(v.cover);
      await ch.send({ embeds: [embed] });
    }
    logger.info({ count: newVideos.length }, "TikTok: kirim notifikasi");
  } catch (err) {
    logger.error({ err, username: cfg.username }, "TikTok polling error");
  }
}

export function startTikTokPoller(client: Client): void {
  poll(client).catch(() => {});
  setInterval(() => poll(client).catch(() => {}), 10 * 60 * 1000);
  logger.info("TikTok poller dimulai (interval 10 menit)");
}
