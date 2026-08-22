// ============================================================
//  handlers/extendModal.js
//  SECURITY FIXES:
//  - customId message ID validated as snowflake
//  - new end date validated: must be after current end date
//  - cannot extend a cancelled/ended vacation
//  - re-permission check (user could submit stale modal)
// ============================================================

import { applyExtended, buildExtendedLog, buildExtendedUserPanel } from '../config/embeds.js';
import { buildApprovedActionButtons }                from '../config/components.js';
import { CUSTOM_IDS, extractUserId, fieldValue, parseDate, parseDDMMYYYY, isApprover, isValidSnowflake, validateDateRange } from '../config/constants.js';
import { scheduleReminder, cancelReminder }          from '../config/reminderMap.js';
import { updateEndDate }                             from '../config/vacationStore.js';
import { getRequestFromPanel }                       from '../config/pendingMap.js';

export async function handleExtendModal(interaction) {
  const { member, customId, guild } = interaction;

  try { await interaction.deferReply({ flags: 64 }); }
  catch (err) { console.error('[extendModal] defer:', err.message); return; }

  // ── Extract and validate panelMsgId from customId ─────────────
  const panelMsgId = customId.replace(CUSTOM_IDS.EXTEND_MODAL + '_', '');
  if (!isValidSnowflake(panelMsgId)) {
    await interaction.editReply({ content: '❌ Invalid request ID.' }).catch(() => {});
    return;
  }

  const requestMsgId = getRequestFromPanel(panelMsgId);

  // ── Read and validate new end date ────────────────────────────
  let rawNewEnd = '';
  try { rawNewEnd = interaction.fields.getTextInputValue('new_end_date').trim(); }
  catch (err) { await interaction.editReply({ content: '❌ Error reading date.' }).catch(() => {}); return; }

  const newEndDate = parseDate(rawNewEnd);
  if (!parseDDMMYYYY(newEndDate)) {
    await interaction.editReply({ content: '❌ تاريخ غير صالح.\n|  Invalid date format. Use DD/MM/YYYY.' }).catch(() => {});
    return;
  }

  // ── Fetch panel message ───────────────────────────────────────
  let panelMsg = null;
  try { panelMsg = await interaction.channel.messages.fetch(panelMsgId); }
  catch (err) { console.warn('[extendModal] Could not fetch panel msg:', err.message); }

  // ── Re-validate permission from panel embed ───────────────────
  const panelEmbed = panelMsg?.embeds[0];
  const ownerId    = panelEmbed ? extractUserId(panelEmbed) : null;

  if (!isValidSnowflake(ownerId)) {
    await interaction.editReply({ content: '❌ Could not identify vacation owner.' }).catch(() => {});
    return;
  }

  const isOwner   = member.user.id === ownerId;
  const isOfficer = isApprover(member);

  if (!isOwner && !isOfficer) {
    await interaction.editReply({ content: '❌ You are not allowed to manage this vacation.' }).catch(() => {});
    return;
  }

  // ── Guard: vacation not cancelled ────────────────────────────
  if (panelEmbed) {
    const statusField = panelEmbed.fields?.find(f => f.name.includes('الحالة') || f.name.includes('Status'));
    if (statusField && (statusField.value.includes('Cancelled') || statusField.value.includes('ملغي') ||
                        statusField.value.includes('Rejected')  || statusField.value.includes('مرفوض'))) {
      await interaction.editReply({ content: '⚠️ لا يمكن تمديد أجازة ملغية أو مرفوضة.\n|  Cannot extend a cancelled or rejected vacation.' }).catch(() => {});
      return;
    }
  }

  // ── Validate new end > current end ───────────────────────────
  const currentEndDate = panelEmbed ? (fieldValue(panelEmbed, 'تاريخ الانتهاء') || fieldValue(panelEmbed, 'End Date') || fieldValue(panelEmbed, 'الانتهاء')) : '—';
  const startDate      = panelEmbed ? (fieldValue(panelEmbed, 'تاريخ البداية')  || fieldValue(panelEmbed, 'Start Date') || fieldValue(panelEmbed, 'البداية')) : '—';

  if (!validateDateRange(currentEndDate, newEndDate)) {
    await interaction.editReply({
      content: '❌ تاريخ الانتهاء الجديد يجب أن يكون بعد التاريخ الحالي (' + currentEndDate + ').\n|  New end date must be after current end (' + currentEndDate + ').',
    }).catch(() => {});
    return;
  }

  const officerTag = member.user.tag;
  const name       = panelEmbed ? (fieldValue(panelEmbed, 'الاسم') || fieldValue(panelEmbed, 'Name')) : '—';

  // ── Update panel embed ────────────────────────────────────────
  if (panelMsg && panelMsg.embeds[0]) {
    try {
      await panelMsg.edit({
        embeds:     [buildExtendedUserPanel(panelMsg.embeds[0], newEndDate)],
        components: [buildApprovedActionButtons()],
      });
    } catch (err) { console.error('[extendModal] edit panel:', err.message); }
  }

  // ── Update request embed in REQUESTS_CHANNEL ─────────────────
  if (requestMsgId && isValidSnowflake(requestMsgId)) {
    try {
      const requestsCh = await guild.channels.fetch(process.env.REQUESTS_CHANNEL_ID);
      const requestMsg = await requestsCh.messages.fetch(requestMsgId);
      await requestMsg.edit({
        embeds:     [applyExtended(requestMsg.embeds[0], officerTag, newEndDate)],
        components: [buildApprovedActionButtons()],
      });
    } catch (err) { console.warn('[extendModal] edit request embed:', err.message); }
  }

  // ── Update vacation store ─────────────────────────────────────
  updateEndDate(ownerId, newEndDate);

  // ── Reschedule reminder with new end date ─────────────────────
  const reminderKey = requestMsgId ?? panelMsgId;
  cancelReminder(reminderKey);
  scheduleReminder({ requestMsgId: reminderKey, ownerId, startDateStr: startDate, endDateStr: newEndDate, client: guild.client });

  // ── DM owner if extended by officer ──────────────────────────
  if (member.user.id !== ownerId) {
    try {
      const u = await guild.client.users.fetch(ownerId);
      await u.send('🔄 **تم تمديد أجازتك!**\n📅 تاريخ الانتهاء الجديد: ' + newEndDate + '\n\n🔄 **Your vacation has been extended!**\n📅 New end date: ' + newEndDate);
    } catch (err) { console.warn('[extendModal] DM:', err.message); }
  }

  await interaction.editReply({
    content: '🔄 **تم التمديد.**\n👤 <@' + ownerId + '>\n📅 ' + currentEndDate + ' → ' + newEndDate,
  }).catch(() => {});

  try {
    const logsCh = await guild.channels.fetch(process.env.LOGS_CHANNEL_ID);
    await logsCh.send({ embeds: [buildExtendedLog({ name, oldEndDate: currentEndDate, newEndDate, decidedBy: officerTag })] });
  } catch (err) { console.error('[extendModal] logs:', err.message); }
}
