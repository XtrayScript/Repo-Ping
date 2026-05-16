import {
  Client,
  GatewayIntentBits,
  Events,
  Partials,
} from "discord.js";
import { logger } from "../lib/logger.js";
import { registerCommands } from "./commands.js";
import { handleInteraction } from "./handlers/interaction.js";
import { handleReactionAdd, handleReactionRemove, loadReactionRoleMessages } from "./handlers/reactionRole.js";
import { handleTrapChannel } from "./handlers/trapChannel.js";
import { startYouTubePoller } from "./pollers/youtube.js";
import { startTikTokPoller } from "./pollers/tiktok.js";
import { startTwitterPoller } from "./pollers/twitter.js";
import { startTelegramPoller } from "./pollers/telegram.js";
import { startPinterestPoller } from "./pollers/pinterest.js";
import { startAnimePoller } from "./pollers/anime.js";
import { startMALPoller } from "./pollers/mal.js";

export async function startBot(): Promise<void> {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    logger.error("DISCORD_BOT_TOKEN tidak diset — bot Discord tidak dijalankan");
    return;
  }

  await registerCommands();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.Reaction,
      Partials.User,
      Partials.GuildMember,
    ],
  });

  client.once(Events.ClientReady, async (c) => {
    logger.info({ tag: c.user.tag }, "Bot Discord siap");

    await loadReactionRoleMessages(client);

    startYouTubePoller(client);
    startTikTokPoller(client);
    startTwitterPoller(client);
    startTelegramPoller(client);
    startPinterestPoller(client);
    startAnimePoller(client);
    startMALPoller(client);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    handleInteraction(interaction).catch((err) => {
      logger.error({ err }, "Uncaught error di interactionCreate");
    });
  });

  client.on(Events.MessageReactionAdd, (reaction, user) => {
    handleReactionAdd(reaction, user).catch((err) => {
      logger.error({ err }, "Error di MessageReactionAdd");
    });
  });

  client.on(Events.MessageReactionRemove, (reaction, user) => {
    handleReactionRemove(reaction, user).catch((err) => {
      logger.error({ err }, "Error di MessageReactionRemove");
    });
  });

  client.on(Events.MessageCreate, (message) => {
    handleTrapChannel(message).catch((err) => {
      logger.error({ err }, "Error di MessageCreate (trap channel)");
    });
  });

  client.on(Events.Error, (err) => {
    logger.error({ err }, "Discord client error");
  });

  await client.login(token);
}
