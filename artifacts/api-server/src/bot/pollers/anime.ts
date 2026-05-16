import { EmbedBuilder, type Client, type TextChannel } from "discord.js";
import { readData, writeData } from "../storage.js";
import { logger } from "../../lib/logger.js";

interface AniListMedia {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { large: string | null };
  siteUrl: string;
  episodes: number | null;
  nextAiringEpisode: { episode: number; airingAt: number } | null;
}

interface RecentEpisode {
  airingAt: number;
  episode: number;
  media: {
    id: number;
    title: { romaji: string; english: string | null };
    coverImage: { large: string | null };
    siteUrl: string;
  };
}

async function searchAnime(query: string): Promise<AniListMedia | null> {
  const gql = `
    query ($search: String) {
      Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id title { romaji english }
        coverImage { large }
        siteUrl episodes
        nextAiringEpisode { episode airingAt }
      }
    }`;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables: { search: query } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { Media?: AniListMedia } };
  return json.data?.Media ?? null;
}

async function getRecentEpisodes(anilistId: number): Promise<RecentEpisode[]> {
  const gql = `
    query ($mediaId: Int, $airingAt_greater: Int) {
      Page(page: 1, perPage: 5) {
        airingSchedules(mediaId: $mediaId, airingAt_greater: $airingAt_greater, sort: TIME_DESC) {
          airingAt episode
          media {
            id title { romaji english }
            coverImage { large }
            siteUrl
          }
        }
      }
    }`;
  const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 2;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: gql, variables: { mediaId: anilistId, airingAt_greater: since } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: { Page?: { airingSchedules?: RecentEpisode[] } } };
  return json.data?.Page?.airingSchedules ?? [];
}

async function poll(client: Client): Promise<void> {
  const data = readData();
  if (!data.anime) return;
  const cfg = data.anime;

  try {
    if (!cfg.anilistId) {
      const media = await searchAnime(cfg.query);
      if (!media) { logger.warn({ query: cfg.query }, "Anime: tidak ditemukan di AniList"); return; }
      data.anime = { ...cfg, anilistId: media.id };
      writeData(data);
      logger.info({ query: cfg.query, anilistId: media.id }, "Anime: ditemukan di AniList");
    }

    const anilistId = data.anime.anilistId!;
    const episodes = await getRecentEpisodes(anilistId);

    if (cfg.lastEpisode === undefined) {
      const latestEp = episodes[0]?.episode ?? 0;
      data.anime = { ...data.anime!, lastEpisode: latestEp };
      writeData(data);
      logger.info({ anilistId, latestEp }, "Anime: polling pertama, simpan lastEpisode");
      return;
    }

    const newEps = episodes.filter(e => e.episode > cfg.lastEpisode! && e.airingAt <= Math.floor(Date.now() / 1000));
    if (newEps.length === 0) return;

    const maxEp = Math.max(...newEps.map(e => e.episode));
    data.anime = { ...data.anime!, lastEpisode: maxEp };
    writeData(data);

    const ch = client.channels.cache.get(cfg.discordChannelId) as TextChannel | undefined;
    if (!ch) { logger.warn({ discordChannelId: cfg.discordChannelId }, "Anime: channel Discord tidak ditemukan"); return; }

    for (const ep of newEps.sort((a, b) => a.episode - b.episode)) {
      const title = ep.media.title.english ?? ep.media.title.romaji;
      const embed = new EmbedBuilder()
        .setColor(0x7B4FFF)
        .setTitle(`${title} — Episode ${ep.episode}`)
        .setURL(ep.media.siteUrl)
        .setDescription(`Episode **${ep.episode}** dari **${title}** sudah tayang!`)
        .setTimestamp()
        .setFooter({ text: "Xtray Ping Bot • Anime (AniList)" });
      if (ep.media.coverImage.large) embed.setThumbnail(ep.media.coverImage.large);
      await ch.send({ embeds: [embed] });
    }
    logger.info({ count: newEps.length }, "Anime: kirim notifikasi episode baru");
  } catch (err) {
    logger.error({ err, query: cfg.query }, "Anime polling error");
  }
}

export function startAnimePoller(client: Client): void {
  poll(client).catch(() => {});
  setInterval(() => poll(client).catch(() => {}), 30 * 60 * 1000);
  logger.info("Anime poller dimulai (interval 30 menit)");
}
