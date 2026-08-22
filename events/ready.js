// ============================================================
//  events/ready.js  –  EMS Leave Management System
// ============================================================

import { Events, ActivityType } from 'discord.js';
import { recoverReminders }     from '../config/reminderRecovery.js';

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
    console.error('[READY] Could not set presence:', err.message);
  }

  await recoverReminders(client);
}
