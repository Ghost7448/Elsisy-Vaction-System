// ============================================================
// events/ready.js
// Automatically registers/updates slash commands every startup.
// No manual `deploy` command is required anymore.
// ============================================================

import { Events, ActivityType, REST, Routes } from 'discord.js';
import { recoverReminders } from '../config/reminderRecovery.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  console.log('[READY] Online as: ' + client.user.tag);
  console.log('[READY] Serving ' + client.guilds.cache.size + ' guild(s)');

  try {
    client.user.setPresence({
      activities: [{ name: ' سيرفر السيسي  |  Elsisy Leave System', type: ActivityType.Watching }],
      status: 'online',
    });
  } catch (err) {
    console.error('[READY] Presence:', err.message);
  }

  // Register commands automatically on every startup.
  try {
    const commands = [...client.commands.values()].map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('[READY] Slash commands synced automatically: ' + commands.map(c => '/' + c.name).join(', '));
  } catch (err) {
    console.error('[READY] Failed to sync slash commands:', err.message);
  }

  await recoverReminders(client);
}
