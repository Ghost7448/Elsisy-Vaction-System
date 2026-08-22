// ============================================================
//  config/reminderMap.js
//  Vacation reminder + auto end-of-vacation handler.
//
//  SECURITY/TIMING FIXES:
//  - End-of-day uses Cairo time (UTC+2) not raw UTC midnight
//  - setTimeout capped at MAX_SAFE_TIMEOUT (~24.8 days) to prevent
//    signed 32-bit overflow crash on Discloud (Node timer bug)
//  - Duplicate scheduling prevented via cancelReminder before set
//  - All async errors caught individually
// ============================================================

import { cairoEndOfDay, parseDDMMYYYY, isValidSnowflake } from './constants.js';
import { removeVacation } from './vacationStore.js';

// Node.js setTimeout uses a signed 32-bit int internally.
// Values > 2^31-1 ms (~24.8 days) overflow to 1 ms and fire immediately.
const MAX_TIMEOUT_MS = 2147483647; // 2^31 - 1

/** @type {Map<string, { reminder: NodeJS.Timeout|null, end: NodeJS.Timeout|null }>} */
const handles = new Map();

function safeUnref(t) { if (t?.unref) t.unref(); }

/**
 * Schedule a vacation-end reminder + auto role removal.
 * Safe to call multiple times — cancels existing timers first.
 */
export function scheduleReminder({ requestMsgId, ownerId, startDateStr, endDateStr, client }) {
  // Cancel any existing timers for this request first (prevents duplicates)
  cancelReminder(requestMsgId);

  // Validate inputs
  if (!isValidSnowflake(ownerId)) {
    console.warn('[reminder] Invalid ownerId for ' + requestMsgId + ': ' + ownerId);
    return;
  }

  const endDate   = parseDDMMYYYY(endDateStr);
  const startDate = parseDDMMYYYY(startDateStr);

  if (!endDate || !startDate) {
    console.warn('[reminder] Bad dates for ' + requestMsgId + ': "' + startDateStr + '" / "' + endDateStr + '"');
    return;
  }

  if (endDate.getTime() <= startDate.getTime()) {
    console.warn('[reminder] End date not after start date for ' + requestMsgId);
    return;
  }

  const now   = Date.now();
  const endMs = cairoEndOfDay(endDateStr);

  if (endMs === null) {
    console.warn('[reminder] cairoEndOfDay returned null for ' + endDateStr);
    return;
  }

  // Already ended — do nothing
  if (endMs <= now) {
    console.log('[reminder] End date already passed for ' + requestMsgId + ', skipping.');
    return;
  }

  const endIn = endMs - now;

  const durationDays = Math.ceil((cairoEndOfDay(endDateStr) - cairoEndOfDay(startDateStr)) / 86400000);
  const offsetMs     = durationDays > 3 ? 86400000 : 43200000;
  const reminderIn   = endMs - offsetMs - now;

  // Guard against 32-bit overflow — skip end timer but still schedule reminder if in range
  // Never skip silently: log clearly what is being scheduled
  let reminderHandle = null;

  if (reminderIn > 0) {
    if (reminderIn <= MAX_TIMEOUT_MS) {
      reminderHandle = setTimeout(async () => {
        await fireReminder({ ownerId, endDateStr, client });
      }, reminderIn);
      safeUnref(reminderHandle);
      console.log('[reminder] Near-end reminder in ' + Math.round(reminderIn / 60000) + ' min (' + Math.round(reminderIn / 86400000) + ' days) for ' + requestMsgId);
    } else {
      console.log('[reminder] Near-end reminder too far (' + Math.round(reminderIn / 86400000) + ' days) — will fire after next restart.');
    }
  } else {
    // reminderIn <= 0 means we are already inside the reminder window
    // Fire immediately but only if endMs is still in the future
    reminderHandle = setTimeout(async () => {
      await fireReminder({ ownerId, endDateStr, client });
    }, 5000); // small delay to let bot finish startup
    safeUnref(reminderHandle);
    console.log('[reminder] Already in reminder window — firing in 5s for ' + requestMsgId);
  }

  // End timer — only set if within 32-bit safe range
  let endHandle = null;
  if (endIn <= MAX_TIMEOUT_MS) {
    endHandle = setTimeout(async () => {
      handles.delete(requestMsgId);
      await fireVacationEnd({ ownerId, client });
    }, endIn);
    safeUnref(endHandle);
    console.log('[reminder] أجازة-end in ' + Math.round(endIn / 60000) + ' min (' + Math.round(endIn / 86400000) + ' days) for ' + requestMsgId);
  } else {
    console.log('[reminder] End timer too far (' + Math.round(endIn / 86400000) + ' days) — will reschedule on next restart.');
  }

  handles.set(requestMsgId, { reminder: reminderHandle, end: endHandle });
}

export function cancelReminder(requestMsgId) {
  const h = handles.get(requestMsgId);
  if (h) {
    if (h.reminder) clearTimeout(h.reminder);
    if (h.end)      clearTimeout(h.end);
    handles.delete(requestMsgId);
    console.log('[reminder] Cancelled timers for ' + requestMsgId);
  }
}

// ── Near-end reminder ─────────────────────────────────────────
async function fireReminder({ ownerId, endDateStr, client }) {
  console.log('[reminder] Firing near-end reminder for ' + ownerId);
  try {
    const user = await client.users.fetch(ownerId);
    await user.send(
      '⏰ **أجازتك هتنتهي قريب!**\n📅 تاريخ الانتهاء: ' + endDateStr + '\n\n' +
      '⏰ **Your vacation is about to end!**\n📅 End date: ' + endDateStr
    );
  } catch (err) {
    console.warn('[reminder] Could not DM ' + ownerId + ':', err.message);
  }
  try {
    const ch = await client.channels.fetch(process.env.REQUESTS_CHANNEL_ID);
    await ch.send('⏰ <@' + ownerId + '>\n**الأجازة قاربت على الانتهاء  |  Vacation ending soon**\n📅 ' + endDateStr);
  } catch (err) {
    console.warn('[reminder] Could not notify REQUESTS_CHANNEL:', err.message);
  }
}

// ── Vacation end: remove role + DM ───────────────────────────
async function fireVacationEnd({ ownerId, client }) {
  console.log('[reminder] أجازة ended for ' + ownerId);
  removeVacation(ownerId);

  for (const guild of client.guilds.cache.values()) {
    try {
      const member = await guild.members.fetch(ownerId);
      if (member.roles.cache.has(process.env.VACATION_ROLE_ID)) {
        await member.roles.remove(process.env.VACATION_ROLE_ID);
        console.log('[reminder] Vacation role removed from ' + member.user.tag);
      }
    } catch { /* user not in guild or role already removed — ignore */ }
  }

  try {
    const user = await client.users.fetch(ownerId);
    await user.send('🔔 **انتهت أجازتك. يرجى العودة للعمل.**\n\n🔔 **Your vacation has ended. Please return to duty.**');
  } catch (err) {
    console.warn('[reminder] Could not DM end notice to ' + ownerId + ':', err.message);
  }
}
