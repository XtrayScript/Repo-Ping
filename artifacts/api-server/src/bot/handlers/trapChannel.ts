import { type Message, type PartialMessage } from "discord.js";
import { getTrapChannel } from "../trapChannelStorage.js";
import { logger } from "../../lib/logger.js";

export async function handleTrapChannel(
  message: Message | PartialMessage,
): Promise<void> {
  if (message.partial) {
    try { await message.fetch(); } catch { return; }
  }

  if (!message.guild || !message.member || message.author?.bot) return;

  const entry = getTrapChannel(message.guild.id);
  if (!entry) return;
  if (message.channelId !== entry.channelId) return;

  const member = message.member;

  if (
    member.permissions.has("Administrator") ||
    member.permissions.has("ModerateMembers")
  ) return;

  try {
    if (entry.deleteMessage) {
      await message.delete().catch(() => {});
    }

    const durationMs = entry.durationMinutes * 60 * 1000;
    await member.timeout(durationMs, entry.reason);

    logger.info(
      { userId: member.id, guildId: message.guild.id, durationMinutes: entry.durationMinutes },
      "Trap channel: user di-timeout",
    );

    try {
      await member.send(
        `🚫 Kamu telah di-**timeout** selama **${entry.durationMinutes} menit** karena mengirim pesan di channel yang dilarang.\n\n**Alasan:** ${entry.reason}`,
      );
    } catch {
      // DM mungkin diblokir user — tidak masalah
    }
  } catch (err) {
    logger.warn(
      { err, userId: member.id },
      "Trap channel: gagal timeout user (mungkin bot tidak punya permission atau role user terlalu tinggi)",
    );
  }
}
