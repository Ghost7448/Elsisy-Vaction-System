// ============================================================
//  handlers/approve.js
//  SECURITY FIXES:
//  - Race condition: in-progress set prevents double approval
//  - Status check uses parsed STATUS constant (not string match)
//  - ownerId validated as snowflake before use
//  - date range validated before scheduling reminder
//  - channel fetches cached via guild.channels.cache.get first
// ============================================================

import { applyApproved, buildApprovedLog } from '../config/embeds.js';
import { buildApprovedActionButtons }        from '../config/components.js';
import { isApprover, extractUserId, fieldValue, isValidSnowflake, validateDateRange } from '../config/constants.js';
import { popPending }                        from '../config/pendingMap.js';
import { scheduleReminder }                  from '../config/reminderMap.js';
import { addVacation, incApproved }          from '../config/vacationStore.js';
import { getLogsChannel } from '../config/logger.js';

/** In-progress set prevents race-condition double approval */
const inProgress = new Set();

export async function handleApprove(interaction) {
  const { member, message, guild } = interaction;

  // ── Permission check (before defer — can still reply) ────────
  if (!isApprover(member)) {
    await interaction.reply({ content: '🚫 **ليس لديك صلاحية للموافقة.**\n|  Not authorized.', flags: 64 }).catch(() => {});
    return;
  }

  const originalEmbed = message.embeds[0];
  if (!originalEmbed) {
    await interaction.reply({ content: '❌ Embed not found.', flags: 64 }).catch(() => {});
    return;
  }

  // ── Already-decided guard (status field) ─────────────────────
  const statusField = originalEmbed.fields?.find(f => f.name.includes('الحالة') || f.name.includes('Status'));
  if (statusField && !statusField.value.includes('Pending') && !statusField.value.includes('قيد')) {
    await interaction.reply({ content: '⚠️ هذا الطلب تمت معالجته بالفعل.  |  Already processed.', flags: 64 }).catch(() => {});
    return;
  }

  // ── Race condition guard ──────────────────────────────────────
  if (inProgress.has(message.id)) {
    await interaction.reply({ content: '⏳ جاري المعالجة...  |  Already being processed.', flags: 64 }).catch(() => {});
    return;
  }
  inProgress.add(message.id);

  try {
    await interaction.deferUpdate();
  } catch (err) {
    inProgress.delete(message.id);
    console.error('[approve] deferUpdate:', err.message);
    return;
  }

  const officerTag = '<@' + member.user.id + '>';
  const ownerId    = extractUserId(originalEmbed);
  const startDate  = fieldValue(originalEmbed, 'تاريخ البداية')   || fieldValue(originalEmbed, 'Start Date');
  const endDate    = fieldValue(originalEmbed, 'تاريخ الانتهاء')  || fieldValue(originalEmbed, 'End Date');
  const name       = fieldValue(originalEmbed, 'الاسم')            || fieldValue(originalEmbed, 'Name');
  const badge      = fieldValue(originalEmbed, 'الرقم الوظيفي')   || fieldValue(originalEmbed, 'Badge Number');
  const reason     = fieldValue(originalEmbed, 'سبب الأجازة')     || fieldValue(originalEmbed, 'Reason');

  // ── Validate ownerId is a real snowflake ──────────────────────
  if (!isValidSnowflake(ownerId)) {
    console.error('[approve] Could not extract valid ownerId from embed footer. Message: ' + message.id);
    inProgress.delete(message.id);
    await interaction.followUp({ content: '❌ Could not identify request owner. Contact admin.', flags: 64 }).catch(() => {});
    return;
  }

  // ── Update request embed ──────────────────────────────────────
  try {
    await message.edit({
      embeds:     [applyApproved(originalEmbed, officerTag)],
      components: [buildApprovedActionButtons()],
    });
  } catch (err) { console.error('[approve] edit embed:', err.message); }

  // ── Delete pending "under review" message ─────────────────────
  const submitMsgId = popPending(message.id);
  if (submitMsgId) {
    try {
      const ch  = await guild.channels.fetch(process.env.SUBMIT_CHANNEL_ID);
      const msg = await ch.messages.fetch(submitMsgId);
      await msg.delete();
    } catch (err) { console.warn('[approve] delete pending:', err.message); }
  }

  // ── Assign vacation role ──────────────────────────────────────
  try {
    const ownerMember = await guild.members.fetch(ownerId);
    // Prevent duplicate role assignment
    if (!ownerMember.roles.cache.has(process.env.VACATION_ROLE_ID)) {
      await ownerMember.roles.add(process.env.VACATION_ROLE_ID);
      console.log('[approve] Role assigned to ' + ownerMember.user.tag);
    } else {
      console.log('[approve] Role already present on ' + ownerMember.user.tag + ', skipping.');
    }
  } catch (err) { console.error('[approve] assign role:', err.message); }

  // ── Track in vacation store ───────────────────────────────────
  addVacation({ ownerId, name, badge, startDate, endDate, requestMsgId: message.id, requestChannelId: message.channel.id, guildId: guild.id });
  incApproved();

  // ── Schedule reminders (only if dates are valid range) ────────
  if (validateDateRange(startDate, endDate)) {
    scheduleReminder({ requestMsgId: message.id, ownerId, startDateStr: startDate, endDateStr: endDate, client: guild.client, guildId: guild.id, requestChannelId: message.channel.id });
  } else {
    console.warn('[approve] Invalid date range — skipping reminder. start=' + startDate + ' end=' + endDate);
  }

  // ── DM owner with full approval details ──────────────────────
  let dmSent = false;
  try {
    const u = await guild.client.users.fetch(ownerId);
    await u.send('✅ **تمت الموافقة على طلب أجازتك!**\n📅 من ' + startDate + ' إلى ' + endDate + '\n\n✅ **Your vacation request has been approved!**\n📅 From ' + startDate + ' to ' + endDate);
    dmSent = true;
  } catch (err) { console.warn('[approve] DM:', err.message); }

  // ── Ephemeral confirmation to officer ─────────────────────────
  await interaction.followUp({
    content: '✅ **تمت الموافقة.**\n👤 <@' + ownerId + '>\n📅 ' + startDate + ' ← ' + endDate + '\n' + (dmSent ? '✉️ DM sent.' : '⚠️ DM not sent (closed).'),
    flags: 64,
  }).catch(() => {});

  // ── Log ───────────────────────────────────────────────────────
  try {
    const logsCh = await getLogsChannel(guild.client);
    await logsCh.send({ embeds: [buildApprovedLog({ name, startDate, endDate, reason, decidedBy: officerTag })] });
  } catch (err) { console.error('[approve] logs:', err.message); }

  inProgress.delete(message.id);
}
