import {
  type MessageReaction,
  type PartialMessageReaction,
  type User,
  type PartialUser,
  type Client,
} from "discord.js";
import { readReactionRoles, emojiMatches } from "../reactionRoleStorage.js";
import { logger } from "../../lib/logger.js";

async function resolveReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
): Promise<{ reaction: MessageReaction; user: User } | null> {
  try {
    const fullReaction = reaction.partial ? await reaction.fetch() : reaction;
    const fullUser = user.partial ? await user.fetch() : user;
    return { reaction: fullReaction, user: fullUser };
  } catch (err) {
    logger.error({ err }, "Gagal fetch partial reaction/user");
    return null;
  }
}

export async function handleReactionAdd(
  rawReaction: MessageReaction | PartialMessageReaction,
  rawUser: User | PartialUser,
): Promise<void> {
  const resolved = await resolveReaction(rawReaction, rawUser);
  if (!resolved) return;
  const { reaction, user } = resolved;

  if (user.bot) return;

  const data = readReactionRoles();
  const entry = data[reaction.message.id];
  if (!entry) return;

  if (!emojiMatches(entry.emoji, reaction.emoji)) return;

  try {
    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id);
    if (!member) return;

    await member.roles.add(entry.roleId);
    logger.info({ userId: user.id, roleId: entry.roleId }, "Reaction role diberikan");
  } catch (err) {
    logger.warn({ err, userId: user.id, roleId: entry.roleId }, "Gagal memberikan reaction role");
  }
}

export async function handleReactionRemove(
  rawReaction: MessageReaction | PartialMessageReaction,
  rawUser: User | PartialUser,
): Promise<void> {
  const resolved = await resolveReaction(rawReaction, rawUser);
  if (!resolved) return;
  const { reaction, user } = resolved;

  if (user.bot) return;

  const data = readReactionRoles();
  const entry = data[reaction.message.id];
  if (!entry) return;

  if (!emojiMatches(entry.emoji, reaction.emoji)) return;

  try {
    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id);
    if (!member) return;

    await member.roles.remove(entry.roleId);
    logger.info({ userId: user.id, roleId: entry.roleId }, "Reaction role dicabut");
  } catch (err) {
    logger.warn({ err, userId: user.id, roleId: entry.roleId }, "Gagal mencabut reaction role");
  }
}

export async function loadReactionRoleMessages(client: Client): Promise<void> {
  const data = readReactionRoles();
  const entries = Object.entries(data);
  if (entries.length === 0) return;

  let loaded = 0;
  for (const [messageId, entry] of entries) {
    try {
      const guild = await client.guilds.fetch(entry.guildId);
      const channel = await guild.channels.fetch(entry.channelId);
      if (!channel?.isTextBased()) continue;
      await (channel as import("discord.js").TextChannel).messages.fetch(messageId);
      loaded++;
    } catch {
      // Pesan mungkin sudah dihapus — lewati saja
    }
  }
  if (loaded > 0) logger.info({ loaded, total: entries.length }, "Reaction role messages dimuat ulang");
}
