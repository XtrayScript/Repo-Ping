import {
  type Interaction,
  type ChatInputCommandInteraction,
  type TextChannel,
  EmbedBuilder,
} from "discord.js";
import { readData, updatePlatform, stopPlatform } from "../storage.js";
import { logger } from "../../lib/logger.js";

export async function handleInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const sub = interaction.options.getSubcommand(false);

  await interaction.deferReply({ ephemeral: true });

  try {
    if (commandName === "status") {
      await handleStatus(interaction);
      return;
    }

    if (sub === "stop") {
      stopPlatform(commandName as keyof ReturnType<typeof readData>);
      await interaction.editReply({ content: `✅ Pemantauan **${commandName}** dihentikan.` });
      logger.info({ platform: commandName }, "Platform dihentikan via slash command");
      return;
    }

    if (sub === "set") {
      await handleSet(interaction, commandName);
    }

    if (commandName === "test") {
      await handleTest(interaction);
    }
  } catch (err) {
    logger.error({ err, commandName }, "Error handling interaction");
    await interaction.editReply({ content: "❌ Terjadi error, coba lagi." }).catch(() => {});
  }
}

async function handleSet(
  interaction: ChatInputCommandInteraction,
  commandName: string,
): Promise<void> {
  const discordChannel = interaction.options.getChannel("discord_channel");
  const discordChannelId = discordChannel?.id ?? "";

  if (!discordChannelId) {
    await interaction.editReply({ content: "❌ Channel Discord tidak valid." });
    return;
  }

  switch (commandName) {
    case "youtube": {
      let channelId = interaction.options.getString("channel_id", true).trim();
      const ucMatch = channelId.match(/UC[a-zA-Z0-9_-]{22}/);
      if (ucMatch) {
        channelId = ucMatch[0];
      } else if (channelId.startsWith("http") && !channelId.includes("/channel/")) {
        await interaction.editReply({
          content: "❌ Mohon masukkan Channel ID YouTube (dimulai dengan **UC...**).\nCara cek: buka channel YouTube → About → di URL ada `/channel/UCxxxxx`.",
        });
        return;
      }
      updatePlatform("youtube", { channelId, discordChannelId });
      await interaction.editReply({
        content: `✅ YouTube diset!\nMemantau channel \`${channelId}\` → <#${discordChannelId}>\nPolling setiap **5 menit**.`,
      });
      break;
    }
    case "tiktok": {
      const username = interaction.options.getString("username", true).replace(/^@/, "").trim();
      updatePlatform("tiktok", { username, discordChannelId });
      await interaction.editReply({
        content: `✅ TikTok diset!\nMemantau **@${username}** → <#${discordChannelId}>\nPolling setiap **10 menit**.`,
      });
      break;
    }
    case "twitter": {
      const username = interaction.options.getString("username", true).replace(/^@/, "").trim();
      updatePlatform("twitter", { username, discordChannelId });
      await interaction.editReply({
        content: `✅ Twitter/X diset!\nMemantau **@${username}** → <#${discordChannelId}>\nPolling setiap **15 menit**.`,
      });
      break;
    }
    case "telegram": {
      const channel = interaction.options.getString("channel", true).replace(/^@/, "").trim();
      updatePlatform("telegram", { channel, discordChannelId });
      await interaction.editReply({
        content: `✅ Telegram diset!\nMemantau **@${channel}** → <#${discordChannelId}>\nPolling setiap **10 menit**.`,
      });
      break;
    }
    case "pinterest": {
      const username = interaction.options.getString("username", true).trim();
      updatePlatform("pinterest", { username, discordChannelId });
      await interaction.editReply({
        content: `✅ Pinterest diset!\nMemantau **${username}** → <#${discordChannelId}>\nPolling setiap **15 menit**.`,
      });
      break;
    }
    case "anime": {
      const query = interaction.options.getString("judul", true).trim();
      updatePlatform("anime", { query, discordChannelId });
      await interaction.editReply({
        content: `✅ Anime diset!\nMemantau episode baru untuk **${query}** → <#${discordChannelId}>\nPolling setiap **30 menit** via AniList.`,
      });
      break;
    }
    case "mal": {
      const username = interaction.options.getString("username", true).trim();
      updatePlatform("mal", { username, discordChannelId });
      await interaction.editReply({
        content: `✅ MAL diset!\nMemantau aktivitas watching **${username}** → <#${discordChannelId}>\nPolling setiap **30 menit** via Jikan API.`,
      });
      break;
    }
    default:
      await interaction.editReply({ content: "❌ Perintah tidak dikenal." });
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const data = readData();

  const platforms: Array<{ key: keyof typeof data; label: string }> = [
    { key: "youtube", label: "🔴 YouTube" },
    { key: "tiktok", label: "⚫ TikTok" },
    { key: "twitter", label: "🔵 Twitter/X" },
    { key: "telegram", label: "🔵 Telegram" },
    { key: "pinterest", label: "🔴 Pinterest" },
    { key: "anime", label: "🟣 Anime (AniList)" },
    { key: "mal", label: "🔵 MyAnimeList" },
  ];

  const lines: string[] = [];
  for (const { key, label } of platforms) {
    const cfg = data[key] as { discordChannelId?: string } | undefined;
    if (cfg?.discordChannelId) {
      let detail = "";
      if (key === "youtube" && data.youtube) detail = `\`${data.youtube.channelId}\``;
      else if (key === "tiktok" && data.tiktok) detail = `@${data.tiktok.username}`;
      else if (key === "twitter" && data.twitter) detail = `@${data.twitter.username}`;
      else if (key === "telegram" && data.telegram) detail = `@${data.telegram.channel}`;
      else if (key === "pinterest" && data.pinterest) detail = data.pinterest.username;
      else if (key === "anime" && data.anime) detail = data.anime.query;
      else if (key === "mal" && data.mal) detail = data.mal.username;
      lines.push(`${label}: ${detail} → <#${cfg.discordChannelId}>`);
    } else {
      lines.push(`${label}: *tidak aktif*`);
    }
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("Status Pemantauan Xtray Ping Bot")
    .setDescription(lines.join("\n"))
    .setTimestamp()
    .setFooter({ text: "Xtray Ping Bot • Status" });

  await interaction.editReply({ embeds: [embed] });
}

const TEST_CONFIGS: Record<string, { color: number; title: string; desc: string; url: string; footer: string }> = {
  youtube: {
    color: 0xFF0000,
    title: "Video Baru: Xtray Bot Test #1",
    desc: "Video baru dari channel **XtrayTV** sudah tayang!",
    url: "https://www.youtube.com",
    footer: "Xtray Ping Bot • YouTube",
  },
  tiktok: {
    color: 0x010101,
    title: "Video baru dari @xtray_official",
    desc: "**@xtray_official** memposting video baru di TikTok",
    url: "https://www.tiktok.com",
    footer: "Xtray Ping Bot • TikTok",
  },
  twitter: {
    color: 0x1DA1F2,
    title: "Tweet baru dari @xtray_official",
    desc: "Ini adalah contoh tweet yang dipantau oleh bot. Notifikasi akan muncul seperti ini setiap ada tweet baru. 🔔",
    url: "https://twitter.com",
    footer: "Xtray Ping Bot • Twitter/X",
  },
  telegram: {
    color: 0x2AABEE,
    title: "Pesan baru dari @xtray_channel",
    desc: "Ini adalah contoh pesan channel Telegram yang dipantau oleh bot.",
    url: "https://t.me",
    footer: "Xtray Ping Bot • Telegram",
  },
  pinterest: {
    color: 0xE60023,
    title: "Pin baru dari xtray_official",
    desc: "Pin baru dari **xtray_official** di Pinterest",
    url: "https://www.pinterest.com",
    footer: "Xtray Ping Bot • Pinterest",
  },
  anime: {
    color: 0x7B4FFF,
    title: "Demon Slayer: Kimetsu no Yaiba — Episode 12",
    desc: "Episode **12** dari **Demon Slayer: Kimetsu no Yaiba** sudah tayang!",
    url: "https://anilist.co",
    footer: "Xtray Ping Bot • Anime (AniList)",
  },
  mal: {
    color: 0x2E51A2,
    title: "Update MAL: Attack on Titan",
    desc: "**xtray_user** menonton episode **25** dari **Attack on Titan** (dari 25 eps)",
    url: "https://myanimelist.net",
    footer: "Xtray Ping Bot • MyAnimeList",
  },
};

async function handleTest(interaction: ChatInputCommandInteraction): Promise<void> {
  const platform = interaction.options.getString("platform", true);
  const data = readData();
  const cfg = data[platform as keyof typeof data] as { discordChannelId?: string } | undefined;

  if (!cfg?.discordChannelId) {
    await interaction.editReply({
      content: `❌ Platform **${platform}** belum dikonfigurasi.\nGunakan \`/${platform} set\` terlebih dahulu.`,
    });
    return;
  }

  const testCfg = TEST_CONFIGS[platform];
  if (!testCfg) {
    await interaction.editReply({ content: "❌ Platform tidak dikenal." });
    return;
  }

  const ch = interaction.client.channels.cache.get(cfg.discordChannelId) as TextChannel | undefined;
  if (!ch) {
    await interaction.editReply({
      content: `❌ Channel Discord <#${cfg.discordChannelId}> tidak ditemukan. Pastikan bot punya akses ke channel tersebut.`,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(testCfg.color)
    .setTitle(`[TEST] ${testCfg.title}`)
    .setURL(testCfg.url)
    .setDescription(testCfg.desc)
    .addFields({ name: "ℹ️ Info", value: "Ini adalah notifikasi uji coba. Notifikasi nyata akan otomatis dikirim saat ada konten baru." })
    .setTimestamp()
    .setFooter({ text: testCfg.footer });

  await ch.send({ embeds: [embed] });
  await interaction.editReply({
    content: `✅ Notifikasi uji coba **${platform}** berhasil dikirim ke <#${cfg.discordChannelId}>!`,
  });
  logger.info({ platform, discordChannelId: cfg.discordChannelId }, "Test notifikasi dikirim");
}
