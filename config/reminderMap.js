// ============================================================
// config/reminderMap.js
// Reminder + automatic vacation expiration.
// ============================================================

import { cairoEndOfDay, parseDDMMYYYY, isValidSnowflake } from './constants.js';
import { removeVacation } from './vacationStore.js';
import { applyExpired, buildExpiredUserPanel } from './embeds.js';

const MAX_TIMEOUT_MS = 2147483647;
const handles = new Map();

function safeUnref(t) { if (t?.unref) t.unref(); }

function hasManageButtons(message) {
  if (!message?.components?.length) return false;
  let hasExtend = false;
  let hasCancel = false;
  for (const row of message.components) {
    for (const component of row.components ?? []) {
      if (component.customId === 'extend_leave') hasExtend = true;
      if (component.customId === 'cancel_leave') hasCancel = true;
    }
  }
  return hasExtend && hasCancel;
}

async function updateExpiredMessage(channel, messageId, isUserPanel = false) {
  if (!channel || !messageId) return false;
  try {
    const message = await channel.messages.fetch(messageId);
    if (!message.embeds?.[0]) return false;

    // IMPORTANT: only edit when BOTH management buttons still exist.
    if (!hasManageButtons(message)) {
      console.log('[expiry] Skipped edit for ' + messageId + ' — extend/cancel buttons are not both present.');
      return false;
    }

    const expiredEmbed = isUserPanel
      ? buildExpiredUserPanel(message.embeds[0])
      : applyExpired(message.embeds[0]);

    await message.edit({ embeds: [expiredEmbed], components: [] });
    console.log('[expiry] Updated message ' + messageId + ' to Expired and removed management buttons.');
    return true;
  } catch (err) {
    console.warn('[expiry] Could not update message ' + messageId + ': ' + err.message);
    return false;
  }
}

export function scheduleReminder({ requestMsgId, ownerId, startDateStr, endDateStr, client, guildId, requestChannelId, panelMsgId, panelChannelId }) {
  cancelReminder(requestMsgId);

  if (!isValidSnowflake(ownerId)) return;
  const endDate = parseDDMMYYYY(endDateStr);
  const startDate = parseDDMMYYYY(startDateStr);
  if (!endDate || !startDate || endDate.getTime() <= startDate.getTime()) return;

  const endMs = cairoEndOfDay(endDateStr);
  if (endMs === null) return;
  if (endMs <= Date.now()) {
    // Run expiration immediately for already-ended vacations.
    setTimeout(() => fireVacationEnd({ ownerId, client, requestMsgId, guildId, requestChannelId, panelMsgId, panelChannelId }), 1000).unref?.();
    return;
  }

  const now = Date.now();
  const endIn = endMs - now;
  const durationDays = Math.max(1, Math.ceil((cairoEndOfDay(endDateStr) - cairoEndOfDay(startDateStr)) / 86400000));
  const offsetMs = durationDays > 3 ? 86400000 : 43200000;
  const reminderIn = endMs - offsetMs - now;

  let reminderHandle = null;
  if (reminderIn > 0 && reminderIn <= MAX_TIMEOUT_MS) {
    reminderHandle = setTimeout(() => fireReminder({ ownerId, endDateStr, client, requestChannelId }), reminderIn);
    safeUnref(reminderHandle);
  } else if (reminderIn <= 0) {
    reminderHandle = setTimeout(() => fireReminder({ ownerId, endDateStr, client, requestChannelId }), 5000);
    safeUnref(reminderHandle);
  }

  let endHandle = null;
  if (endIn <= MAX_TIMEOUT_MS) {
    endHandle = setTimeout(() => {
      handles.delete(requestMsgId);
      fireVacationEnd({ ownerId, client, requestMsgId, guildId, requestChannelId, panelMsgId, panelChannelId });
    }, endIn);
    safeUnref(endHandle);
  }

  handles.set(requestMsgId, { reminder: reminderHandle, end: endHandle });
  console.log('[reminder] Scheduled expiration for ' + ownerId + ' on ' + endDateStr);
}

export function cancelReminder(requestMsgId) {
  const h = handles.get(requestMsgId);
  if (!h) return;
  if (h.reminder) clearTimeout(h.reminder);
  if (h.end) clearTimeout(h.end);
  handles.delete(requestMsgId);
}

async function fireReminder({ ownerId, endDateStr, client, requestChannelId }) {
  try {
    const user = await client.users.fetch(ownerId);
    await user.send('⏰ **أجازتك هتنتهي قريب!**\n📅 تاريخ الانتهاء: ' + endDateStr + '\n\n⏰ **Your vacation is about to end!**\n📅 End date: ' + endDateStr);
  } catch (err) { console.warn('[reminder] DM:', err.message); }

  try {
    const ch = await client.channels.fetch(requestChannelId || process.env.REQUESTS_CHANNEL_ID);
    if (ch?.isTextBased()) await ch.send('⏰ <@' + ownerId + '>\n**الأجازة قاربت على الانتهاء  |  Vacation ending soon**\n📅 ' + endDateStr);
  } catch (err) { console.warn('[reminder] channel notification:', err.message); }
}

export async function fireVacationEnd({ ownerId, client, requestMsgId, guildId, requestChannelId, panelMsgId, panelChannelId }) {
  console.log('[expiry] Vacation expired for ' + ownerId);

  // Update the actual leave request embed first, if possible.
  try {
    const requestChannel = await client.channels.fetch(requestChannelId || process.env.REQUESTS_CHANNEL_ID);
    await updateExpiredMessage(requestChannel, requestMsgId, false);
  } catch (err) { console.warn('[expiry] Request message:', err.message); }

  // Optional support for a separate user panel if one exists.
  if (panelMsgId && panelChannelId) {
    try {
      const panelChannel = await client.channels.fetch(panelChannelId);
      await updateExpiredMessage(panelChannel, panelMsgId, true);
    } catch (err) { console.warn('[expiry] User panel:', err.message); }
  }

  removeVacation(ownerId);

  // Remove vacation role only from the source/system guild.
  try {
    const sourceGuild = await client.guilds.fetch(guildId || process.env.GUILD_ID);
    const member = await sourceGuild.members.fetch(ownerId);
    if (member.roles.cache.has(process.env.VACATION_ROLE_ID)) {
      await member.roles.remove(process.env.VACATION_ROLE_ID);
    }
  } catch (err) { console.warn('[expiry] Role removal:', err.message); }

  try {
    const user = await client.users.fetch(ownerId);
    await user.send('🔔 **انتهت أجازتك. يرجى العودة للعمل.**\n\n🔔 **Your vacation has ended. Please return to duty.**');
  } catch (err) { console.warn('[expiry] End DM:', err.message); }
}
