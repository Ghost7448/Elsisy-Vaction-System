// ============================================================
// config/logger.js - Centralized log-channel resolver
// Logs can live in a different Discord server than the main system.
// ============================================================

export async function getLogsChannel(client) {
  const guildId = process.env.LOG_GUILD_ID || process.env.GUILD_ID;
  const channelId = process.env.LOGS_CHANNEL_ID;

  if (!channelId) throw new Error('LOGS_CHANNEL_ID is not configured');

  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) throw new Error('Log guild not found: ' + guildId);

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) throw new Error('Log channel not found: ' + channelId);

  return channel;
}
