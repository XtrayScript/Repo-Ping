import { REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits } from "discord.js";
import { logger } from "../lib/logger.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("Kelola pemantauan YouTube")
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set channel YouTube untuk dipantau")
        .addStringOption(opt =>
          opt.setName("channel_id")
            .setDescription("Channel ID YouTube (dimulai dengan UC...) atau URL channel")
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("discord_channel")
            .setDescription("Channel Discord untuk menerima notifikasi")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("stop").setDescription("Hentikan pemantauan YouTube")
    ),

  new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("Kelola pemantauan TikTok")
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set akun TikTok untuk dipantau")
        .addStringOption(opt =>
          opt.setName("username")
            .setDescription("Username TikTok (tanpa @)")
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("discord_channel")
            .setDescription("Channel Discord untuk menerima notifikasi")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("stop").setDescription("Hentikan pemantauan TikTok")
    ),

  new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("Kelola pemantauan Twitter/X")
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set akun Twitter untuk dipantau")
        .addStringOption(opt =>
          opt.setName("username")
            .setDescription("Username Twitter (tanpa @)")
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("discord_channel")
            .setDescription("Channel Discord untuk menerima notifikasi")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("stop").setDescription("Hentikan pemantauan Twitter/X")
    ),

  new SlashCommandBuilder()
    .setName("telegram")
    .setDescription("Kelola pemantauan Telegram")
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set channel Telegram untuk dipantau")
        .addStringOption(opt =>
          opt.setName("channel")
            .setDescription("Username channel Telegram (tanpa @)")
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("discord_channel")
            .setDescription("Channel Discord untuk menerima notifikasi")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("stop").setDescription("Hentikan pemantauan Telegram")
    ),

  new SlashCommandBuilder()
    .setName("pinterest")
    .setDescription("Kelola pemantauan Pinterest")
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set akun Pinterest untuk dipantau")
        .addStringOption(opt =>
          opt.setName("username")
            .setDescription("Username Pinterest")
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("discord_channel")
            .setDescription("Channel Discord untuk menerima notifikasi")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("stop").setDescription("Hentikan pemantauan Pinterest")
    ),

  new SlashCommandBuilder()
    .setName("anime")
    .setDescription("Kelola pemantauan episode anime baru (via AniList)")
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set anime untuk dipantau episode barunya")
        .addStringOption(opt =>
          opt.setName("judul")
            .setDescription("Judul anime (contoh: Demon Slayer)")
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("discord_channel")
            .setDescription("Channel Discord untuk menerima notifikasi")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("stop").setDescription("Hentikan pemantauan anime")
    ),

  new SlashCommandBuilder()
    .setName("mal")
    .setDescription("Kelola pemantauan aktivitas MyAnimeList")
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Set username MAL untuk dipantau aktivitas watchingnya")
        .addStringOption(opt =>
          opt.setName("username")
            .setDescription("Username MyAnimeList")
            .setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName("discord_channel")
            .setDescription("Channel Discord untuk menerima notifikasi")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("stop").setDescription("Hentikan pemantauan MAL")
    ),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Tampilkan semua konfigurasi pemantauan yang aktif"),

  new SlashCommandBuilder()
    .setName("trap")
    .setDescription("Kelola Trap Channel — siapa yang chat di sini langsung di-timeout")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub.setName("set")
        .setDescription("Aktifkan trap di sebuah channel")
        .addChannelOption(opt =>
          opt.setName("channel")
            .setDescription("Channel yang akan jadi trap")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName("durasi")
            .setDescription("Durasi timeout dalam menit")
            .setRequired(true)
            .addChoices(
              { name: "1 menit", value: 1 },
              { name: "5 menit", value: 5 },
              { name: "10 menit", value: 10 },
              { name: "30 menit", value: 30 },
              { name: "1 jam", value: 60 },
              { name: "6 jam", value: 360 },
              { name: "12 jam", value: 720 },
              { name: "1 hari", value: 1440 },
            )
        )
        .addBooleanOption(opt =>
          opt.setName("hapus_pesan")
            .setDescription("Hapus otomatis pesan yang dikirim di channel ini? (default: ya)")
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName("alasan")
            .setDescription("Alasan timeout yang tampil ke user (default: Channel ini dilarang)")
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName("remove")
        .setDescription("Nonaktifkan trap dari channel yang sudah diset")
    )
    .addSubcommand(sub =>
      sub.setName("info")
        .setDescription("Tampilkan channel mana yang sedang aktif sebagai trap")
    ),

  new SlashCommandBuilder()
    .setName("createrole")
    .setDescription("Buat pesan Reaction Role — member klik emoji untuk dapat role")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addRoleOption(opt =>
      opt.setName("role")
        .setDescription("Role yang akan diberikan saat member klik emoji")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("emoji")
        .setDescription("Emoji yang digunakan (contoh: 👍 atau nama custom emoji)")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("deskripsi")
        .setDescription("Teks penjelasan yang ditampilkan di pesan embed")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Dapatkan link untuk mengundang bot ke server Discord lain"),

  new SlashCommandBuilder()
    .setName("test")
    .setDescription("Kirim notifikasi uji coba ke channel Discord")
    .addStringOption(opt =>
      opt.setName("platform")
        .setDescription("Platform yang ingin diuji")
        .setRequired(true)
        .addChoices(
          { name: "YouTube", value: "youtube" },
          { name: "TikTok", value: "tiktok" },
          { name: "Twitter/X", value: "twitter" },
          { name: "Telegram", value: "telegram" },
          { name: "Pinterest", value: "pinterest" },
          { name: "Anime (AniList)", value: "anime" },
          { name: "MyAnimeList", value: "mal" },
        )
    ),
].map(cmd => cmd.toJSON());

export async function registerCommands(): Promise<void> {
  const token = process.env["DISCORD_BOT_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];
  if (!token || !clientId) {
    logger.error("DISCORD_BOT_TOKEN atau DISCORD_CLIENT_ID tidak diset");
    return;
  }

  const rest = new REST().setToken(token);
  try {
    logger.info("Mendaftarkan slash commands global Discord...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    logger.info("Slash commands berhasil didaftarkan (aktif ~1 jam)");
  } catch (err) {
    logger.error({ err }, "Gagal mendaftarkan slash commands");
  }
}
