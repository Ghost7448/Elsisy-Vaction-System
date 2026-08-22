// ============================================================
//  config/reminderRecovery.js
//  Restart-safe reminder recovery.
//
//  Called once on ClientReady. Iterates all active vacations
//  in vacationStore and re-schedules any reminders that were
//  lost when the process restarted.
//
//  NOTE: vacationStore is in-memory — on a COLD restart it is
//  empty and there is nothing to recover (this is expected).
//  This module handles the case of a HOT restart / crash-loop
//  where vacations were added in the same process lifetime but
//  timers were cleared (e.g. unhandled exception + nodemon restart).
//
//  For true persistence across cold restarts, vacationStore
//  would need a JSON / SQLite backing store. That is out of
//  scope here but this file is designed so the persistence
//  layer can be swapped in without changing this recovery logic.
// ============================================================

import { getAllVacations, removeVacation } from './vacationStore.js';
import { scheduleReminder, cancelReminder } from './reminderMap.js';
import { cairoEndOfDay, parseDDMMYYYY, isValidSnowflake } from './constants.js';

/**
 * Re-schedule reminders for all vacations currently in vacationStore.
 * Safe to call multiple times — scheduleReminder cancels duplicates.
 *
 * @param {import('discord.js').Client} client
 */
export async function recoverReminders(client) {
  const vacations = getAllVacations();

  if (vacations.length === 0) {
    console.log('[recovery] No active vacations to recover.');
    return;
  }

  console.log('[recovery] Found ' + vacations.length + ' active vacation(s) to check...');

  let restored = 0;
  let skipped  = 0;

  for (const entry of vacations) {
    const { ownerId, startDate, endDate, requestMsgId, name } = entry;

    // ── Basic sanity checks ───────────────────────────────────
    if (!isValidSnowflake(ownerId)) {
      console.warn('[recovery] Skipping entry with invalid ownerId: ' + String(ownerId));
      skipped++;
      continue;
    }

    if (!isValidSnowflake(requestMsgId)) {
      console.warn('[recovery] Skipping entry with invalid requestMsgId for owner ' + ownerId);
      skipped++;
      continue;
    }

    // ── Validate dates ────────────────────────────────────────
    if (!parseDDMMYYYY(startDate) || !parseDDMMYYYY(endDate)) {
      console.warn('[recovery] Skipping ' + name + ' (' + ownerId + ') — invalid dates: ' + startDate + ' / ' + endDate);
      skipped++;
      continue;
    }

    // ── Check vacation has not already ended ──────────────────
    const endMs = cairoEndOfDay(endDate);

    if (endMs === null) {
      console.warn('[recovery] Skipping ' + name + ' — cairoEndOfDay returned null for: ' + endDate);
      skipped++;
      continue;
    }

    if (endMs <= Date.now()) {
      console.log('[recovery] Skipped expired vacation for ' + name + ' (' + ownerId + ') — ended ' + endDate);
      // Clean up stale entry from store so vacation-list shows correctly
      removeVacation(ownerId);
      skipped++;
      continue;
    }

    // ── Cancel any stale handles before re-scheduling ─────────
    // scheduleReminder already calls cancelReminder internally,
    // but we call it explicitly here for clarity and logging.
    cancelReminder(requestMsgId);

    // ── Re-schedule ───────────────────────────────────────────
    scheduleReminder({
      requestMsgId,
      ownerId,
      startDateStr: startDate,
      endDateStr:   endDate,
      client,
    });

    console.log('[recovery] Restored reminder for ' + name + ' (' + ownerId + ') — ends ' + endDate);
    restored++;
  }

  console.log('[recovery] Done. Restored: ' + restored + '  Skipped: ' + skipped);
}
