import {
  type Interaction,
  type ChatInputCommandInteraction,
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
