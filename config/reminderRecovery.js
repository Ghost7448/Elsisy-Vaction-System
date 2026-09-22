// ============================================================
// config/reminderRecovery.js - Recover active vacations after restart.
// ============================================================

import { getAllVacations } from './vacationStore.js';
import { scheduleReminder, fireVacationEnd } from './reminderMap.js';
import { cairoEndOfDay, parseDDMMYYYY, isValidSnowflake } from './constants.js';

export async function recoverReminders(client) {
  const vacations = getAllVacations();
  if (!vacations.length) {
    console.log('[recovery] No active vacations to recover.');
    return;
  }

  console.log('[recovery] Checking ' + vacations.length + ' persisted vacation(s)...');
  for (const entry of vacations) {
    if (!isValidSnowflake(entry.ownerId) || !isValidSnowflake(entry.requestMsgId)) continue;
    if (!parseDDMMYYYY(entry.startDate) || !parseDDMMYYYY(entry.endDate)) continue;

    const endMs = cairoEndOfDay(entry.endDate);
    if (endMs === null) continue;

    if (endMs <= Date.now()) {
      await fireVacationEnd({
        ownerId: entry.ownerId,
        client,
        requestMsgId: entry.requestMsgId,
        guildId: entry.guildId,
        requestChannelId: entry.requestChannelId,
        panelMsgId: entry.panelMsgId,
        panelChannelId: entry.panelChannelId,
      });
      continue;
    }

    scheduleReminder({
      requestMsgId: entry.requestMsgId,
      ownerId: entry.ownerId,
      startDateStr: entry.startDate,
      endDateStr: entry.endDate,
      client,
      guildId: entry.guildId,
      requestChannelId: entry.requestChannelId,
      panelMsgId: entry.panelMsgId,
      panelChannelId: entry.panelChannelId,
    });
  }
}
