// ============================================================
//  handlers/rejectModal.js
//  SECURITY FIXES:
//  - messageId validated as snowflake
//  - re-checks status hasn't changed between reject click and submit
//  - race condition guard
// ============================================================

import { applyRejected, buildRejectedLog }       from '../config/embeds.js';
import { buildDisabledButtons }                   from '../config/components.js';
import { CUSTOM_IDS, extractUserId, fieldValue, isValidSnowflake } from '../config/constants.js';
import { popPending }                             from '../config/pendingMap.js';
import { incRejected }                            from '../config/vacationStore.js';
import { getLogsChannel } from '../config/logger.js';

const inProgress = new Set();

export async function handleRejectModal(interaction) {
  const { member, customId, channel, guild } = interaction;

  try { await interaction.deferReply({ flags: 64 }); }
  catch (err) { console.error('[rejectModal] defer:', err.message); return; }

  // ── Extract and validate messageId ───────────────────────────
  const messageId = customId.replace(CUSTOM_IDS.REJECT_MODAL + '_', '');
  if (!isValidSnowflake(messageId)) {
    await interaction.editReply({ content: '❌ Invalid request ID.' }).catch(() => {});
    return;
  }

  // ── Race condition guard ──────────────────────────────────────
  if (inProgress.has(messageId)) {
    await interaction.editReply({ content: '⏳ جاري المعالجة...  |  Already being processed.' }).catch(() => {});
    return;
  }
  inProgress.add(messageId);

  let rejectionReason = '';
  try { rejectionReason = interaction.fields.getTextInputValue('rejection_reason').trim(); }
  catch (err) {
    inProgress.delete(messageId);
    await interaction.editReply({ content: '❌ Error reading reason.' }).catch(() => {});
    return;
  }

  // Sanitize: strip @mentions from rejection reason to prevent pings
  rejectionReason = rejectionReason.replace(/<@[!&]?\d+>/g, '[mention]');

  let targetMsg = null;
  try { targetMsg = await channel.messages.fetch(messageId); }
  catch (err) {
    inProgress.delete(messageId);
    await interaction.editReply({ content: '❌ Could not find request message.' }).catch(() => {});
    return;
  }

  const originalEmbed = targetMsg.embeds[0];
  if (!originalEmbed) {
    inProgress.delete(messageId);
    await interaction.editReply({ content: '❌ No embed found.' }).catch(() => {});
    return;
  }

  // ── Re-check status (may have changed since reject button was clicked) ─
  const statusField = originalEmbed.fields?.find(f => f.name.includes('الحالة') || f.name.includes('Status'));
  if (statusField && !statusField.value.includes('Pending') && !statusField.value.includes('قيد')) {
    inProgress.delete(messageId);
    await interaction.editReply({ content: '⚠️ هذا الطلب تمت معالجته بالفعل.  |  Already processed.' }).catch(() => {});
    return;
  }

  const officerTag = '<@' + member.user.id + '>';
  const ownerId    = extractUserId(originalEmbed);
  const name       = fieldValue(originalEmbed, 'الاسم')            || fieldValue(originalEmbed, 'Name');
  const startDate  = fieldValue(originalEmbed, 'تاريخ البداية')   || fieldValue(originalEmbed, 'Start Date');
  const endDate    = fieldValue(originalEmbed, 'تاريخ الانتهاء')  || fieldValue(originalEmbed, 'End Date');
  const reason     = fieldValue(originalEmbed, 'سبب الأجازة')     || fieldValue(originalEmbed, 'Reason');

  try {
    await targetMsg.edit({ embeds: [applyRejected(originalEmbed, officerTag, rejectionReason)], components: [buildDisabledButtons()] });
  } catch (err) { console.error('[rejectModal] edit:', err.message); }

  const submitMsgId = popPending(targetMsg.id);
  if (submitMsgId) {
    try {
      const ch  = await guild.channels.fetch(process.env.SUBMIT_CHANNEL_ID);
      const msg = await ch.messages.fetch(submitMsgId);
      await msg.delete();
    } catch (err) { console.warn('[rejectModal] delete pending:', err.message); }
  }

  incRejected();

  let dmSent = false;
  if (isValidSnowflake(ownerId)) {
    try {
      const u = await guild.client.users.fetch(ownerId);
      await u.send('❌ **تم رفض طلب أجازتك.**\n📝 السبب: ' + rejectionReason + '\n\n❌ **Your vacation request has been rejected.**\n📝 Reason: ' + rejectionReason);
      dmSent = true;
    } catch (err) { console.warn('[rejectModal] DM:', err.message); }
  }

  await interaction.editReply({
    content: '❌ **تم الرفض.**\n👤 ' + (isValidSnowflake(ownerId) ? '<@' + ownerId + '>' : name) + '\n📝 ' + rejectionReason + '\n' + (dmSent ? '✉️ DM sent.' : '⚠️ DM not sent (closed).'),
  }).catch(() => {});

  try {
    const logsCh = await getLogsChannel(guild.client);
    await logsCh.send({ embeds: [buildRejectedLog({ name, startDate, endDate, reason, decidedBy: officerTag, rejectionReason })] });
  } catch (err) { console.error('[rejectModal] logs:', err.message); }

  inProgress.delete(messageId);
}
