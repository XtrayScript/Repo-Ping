import { Client, GatewayIntentBits, Events } from "discord.js";
import { logger } from "../lib/logger.js";
import { registerCommands } from "./commands.js";
import { handleInteraction } from "./handlers/interaction.js";
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
    intents: [GatewayIntentBits.Guilds],
  });

  client.once(Events.ClientReady, (c) => {
    logger.info({ tag: c.user.tag }, "Bot Discord siap");

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

  client.on(Events.Error, (err) => {
    logger.error({ err }, "Discord client error");
  });

  await client.login(token);
}
