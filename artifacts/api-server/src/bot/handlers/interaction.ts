import {
  type Interaction,
  type ChatInputCommandInteraction,
  type TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";
import { readData, updatePlatform, stopPlatform } from "../storage.js";
import { saveReactionRole } from "../reactionRoleStorage.js";
import { saveTrapChannel, deleteTrapChannel, getTrapChannel } from "../trapChannelStorage.js";
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

    if (commandName === "invite") {
      await handleInvite(interaction);
    }

    if (commandName === "createrole") {
      await handleCreateRole(interaction);
    }

    if (commandName === "trap") {
      await handleTrap(interaction);
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

async function handleCreateRole(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.editReply({ content: "❌ Kamu butuh permission **Manage Roles** untuk menggunakan perintah ini." });
    return;
  }

  const role = interaction.options.getRole("role", true);
  const emoji = interaction.options.getString("emoji", true).trim();
  const deskripsi = interaction.options.getString("deskripsi", true).trim();

  if (!interaction.channel?.isTextBased()) {
    await interaction.editReply({ content: "❌ Perintah ini hanya bisa digunakan di text channel." });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle("🎭 Reaction Role")
    .setDescription(`${emoji} — ${deskripsi}\n\n**Role:** <@&${role.id}>\n\nKlik emoji di bawah untuk mendapatkan atau melepas role ini.`)
    .setTimestamp()
    .setFooter({ text: "Xtray Ping Bot • Reaction Role" });

  const channel = interaction.channel as TextChannel;
  const message = await channel.send({ embeds: [embed] });

  try {
    await message.react(emoji);
  } catch {
    await message.delete().catch(() => {});
    await interaction.editReply({ content: `❌ Emoji **${emoji}** tidak valid atau bot tidak bisa menambahkan reaksi tersebut. Coba gunakan emoji standar (contoh: 👍 ✅ 🎮).` });
    return;
  }

  saveReactionRole(message.id, {
    emoji,
    roleId: role.id,
    guildId: interaction.guildId ?? "",
    channelId: interaction.channelId,
  });

  await interaction.editReply({
    content: `✅ Reaction Role berhasil dibuat!\n\n**Role:** <@&${role.id}>\n**Emoji:** ${emoji}\n**Pesan:** [Klik di sini](${message.url})\n\nMember bisa klik emoji ${emoji} di pesan tersebut untuk mendapat atau melepas role.`,
  });
  logger.info({ roleId: role.id, emoji, messageId: message.id }, "Reaction role dibuat");
}

async function handleInvite(interaction: ChatInputCommandInteraction): Promise<void> {
  const clientId = process.env["DISCORD_CLIENT_ID"];
  if (!clientId) {
    await interaction.editReply({ content: "❌ CLIENT_ID tidak tersedia di environment." });
    return;
  }

  const inviteUrl =
    `https://discord.com/api/oauth2/authorize?client_id=${clientId}` +
    `&permissions=8&scope=bot+applications.commands`;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🤖 Undang Bot Ini")
    .setDescription(
      "Klik tombol di bawah untuk mengundang **Xtray Ping Bot** ke server Discord kamu!\n\n" +
      "Bot akan memantau YouTube, TikTok, Twitter/X, Telegram, Pinterest, Anime, dan MAL " +
      "lalu mengirim notifikasi otomatis ke channel yang kamu pilih.",
    )
    .addFields(
      { name: "✅ Fitur", value: "7 platform • Notifikasi otomatis • Slash commands", inline: true },
      { name: "🔒 Permission", value: "Administrator (untuk kirim pesan ke semua channel)", inline: true },
    )
    .setTimestamp()
    .setFooter({ text: "Xtray Ping Bot • Invite" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("Undang Bot")
      .setEmoji("🤖")
      .setStyle(ButtonStyle.Link)
      .setURL(inviteUrl),
  );

  await interaction.editReply({ embeds: [embed], components: [row] });
  logger.info("Invite link dikirim");
}

async function handleTrap(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.editReply({ content: "❌ Kamu butuh permission **Moderate Members** untuk menggunakan perintah ini." });
    return;
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.editReply({ content: "❌ Command ini hanya bisa digunakan di dalam server." });
    return;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "set") {
    const channel = interaction.options.getChannel("channel", true);
    const durasi = interaction.options.getInteger("durasi", true);
    const hapusPesan = interaction.options.getBoolean("hapus_pesan") ?? true;
    const alasan = interaction.options.getString("alasan") ?? "Kamu mengirim pesan di channel yang dilarang.";

    saveTrapChannel(guildId, {
      channelId: channel.id,
      durationMinutes: durasi,
      deleteMessage: hapusPesan,
      reason: alasan,
    });

    const durasiLabel = durasi < 60
      ? `${durasi} menit`
      : durasi < 1440
        ? `${durasi / 60} jam`
        : `${durasi / 1440} hari`;

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("⚠️ Trap Channel Diaktifkan")
      .setDescription(
        `Channel <#${channel.id}> sekarang adalah **trap channel**.\n\n` +
        `Siapa pun yang mengirim pesan di sana akan otomatis di-timeout.`
      )
      .addFields(
        { name: "⏱️ Durasi Timeout", value: durasiLabel, inline: true },
        { name: "🗑️ Hapus Pesan", value: hapusPesan ? "Ya" : "Tidak", inline: true },
        { name: "📋 Alasan", value: alasan, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: "Xtray Ping Bot • Trap Channel" });

    await interaction.editReply({ embeds: [embed] });
    logger.info({ guildId, channelId: channel.id, durasi }, "Trap channel diaktifkan");
  }

  else if (sub === "remove") {
    const deleted = deleteTrapChannel(guildId);
    if (!deleted) {
      await interaction.editReply({ content: "⚠️ Tidak ada trap channel yang aktif di server ini." });
      return;
    }
    await interaction.editReply({ content: "✅ Trap channel berhasil dinonaktifkan." });
    logger.info({ guildId }, "Trap channel dinonaktifkan");
  }

  else if (sub === "info") {
    const entry = getTrapChannel(guildId);
    if (!entry) {
      await interaction.editReply({ content: "ℹ️ Tidak ada trap channel yang aktif di server ini." });
      return;
    }

    const durasiLabel = entry.durationMinutes < 60
      ? `${entry.durationMinutes} menit`
      : entry.durationMinutes < 1440
        ? `${entry.durationMinutes / 60} jam`
        : `${entry.durationMinutes / 1440} hari`;

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle("⚠️ Info Trap Channel")
      .addFields(
        { name: "📢 Channel", value: `<#${entry.channelId}>`, inline: true },
        { name: "⏱️ Durasi Timeout", value: durasiLabel, inline: true },
        { name: "🗑️ Hapus Pesan", value: entry.deleteMessage ? "Ya" : "Tidak", inline: true },
        { name: "📋 Alasan", value: entry.reason, inline: false },
      )
      .setTimestamp()
      .setFooter({ text: "Xtray Ping Bot • Trap Channel" });

    await interaction.editReply({ embeds: [embed] });
  }
}
