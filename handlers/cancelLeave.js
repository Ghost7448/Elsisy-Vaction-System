// ============================================================
//  handlers/cancelLeave.js
//  SECURITY FIXES:
//  - Re-validates ownerId as snowflake
//  - Guards against cancelling already-cancelled/rejected
//  - Race condition guard
//  - Role removal checks current role state before removing
// ============================================================

import { applyCancelled, buildCancelledLog, buildCancelledUserPanel } from '../config/embeds.js';
import { buildDisabledButtons }                  from '../config/components.js';
import { isApprover, extractUserId, fieldValue, isValidSnowflake } from '../config/constants.js';
import { cancelReminder }                        from '../config/reminderMap.js';
import { removeVacation }                        from '../config/vacationStore.js';
import { getRequestFromPanel, removeUserPanelByPanelId } from '../config/pendingMap.js';
import { getLogsChannel } from '../config/logger.js';

const inProgress = new Set();

export async function handleCancelLeave(interaction) {
  const { member, message, guild } = interaction;

  const embed   = message.embeds[0];
  const ownerId = embed ? extractUserId(embed) : null;

  // ── Permission check ──────────────────────────────────────────
  if (!isValidSnowflake(ownerId)) {
    await interaction.reply({ content: '❌ Could not identify vacation owner.', flags: 64 }).catch(() => {});
    return;
  }

  const isOwner   = member.user.id === ownerId;
  const isOfficer = isApprover(member);

  if (!isOwner && !isOfficer) {
    await interaction.reply({ content: '❌ You are not allowed to manage this vacation.', flags: 64 }).catch(() => {});
    return;
  }

  // ── Guard: already final state ────────────────────────────────
  if (embed) {
    const statusField = embed.fields?.find(f => f.name.includes('الحالة') || f.name.includes('Status'));
    if (statusField && (statusField.value.includes('Cancelled') || statusField.value.includes('ملغي') ||
                        statusField.value.includes('Rejected')  || statusField.value.includes('مرفوض'))) {
      await interaction.reply({ content: '⚠️ هذه الأجازة ملغية أو مرفوضة بالفعل.\n|  This vacation is already cancelled or rejected.', flags: 64 }).catch(() => {});
      return;
    }
  }

  // ── Race condition guard ──────────────────────────────────────
  if (inProgress.has(message.id)) {
    await interaction.reply({ content: '⏳ جاري المعالجة...  |  Already being processed.', flags: 64 }).catch(() => {});
    return;
  }
  inProgress.add(message.id);

  try { await interaction.deferUpdate(); }
  catch (err) { inProgress.delete(message.id); console.error('[cancelLeave] defer:', err.message); return; }

  const officerTag = '<@' + member.user.id + '>';
  const panelMsgId = message.id;
  const name       = fieldValue(embed, 'الاسم') || fieldValue(embed, 'Name');

  // ── Update panel embed (SUBMIT_CHANNEL) ───────────────────────
  try {
    await message.edit({
      embeds:     [buildCancelledUserPanel(embed)],
      components: [buildDisabledButtons()],
    });
  } catch (err) { console.error('[cancelLeave] edit user panel:', err.message); }

  // ── Update request embed (REQUESTS_CHANNEL) ───────────────────
  const requestMsgId = getRequestFromPanel(panelMsgId) || panelMsgId;
  if (requestMsgId && isValidSnowflake(requestMsgId)) {
    try {
      const requestsCh = await guild.channels.fetch(process.env.REQUESTS_CHANNEL_ID);
      const requestMsg = await requestsCh.messages.fetch(requestMsgId);
      if (requestMsg.embeds[0]) {
        await requestMsg.edit({
          embeds:     [applyCancelled(requestMsg.embeds[0], officerTag)],
          components: [buildDisabledButtons()],
        });
      }
    } catch (err) { console.warn('[cancelLeave] update request embed:', err.message); }
  }

  // ── Cleanup maps + reminder ───────────────────────────────────
  removeUserPanelByPanelId(panelMsgId);
  cancelReminder(requestMsgId);
  removeVacation(ownerId);

  // ── Remove vacation role (check before removing) ──────────────
  try {
    const ownerMember = await guild.members.fetch(ownerId);
    if (ownerMember.roles.cache.has(process.env.VACATION_ROLE_ID)) {
      await ownerMember.roles.remove(process.env.VACATION_ROLE_ID);
      console.log('[cancelLeave] Role removed from ' + ownerMember.user.tag);
    }
  } catch (err) { console.error('[cancelLeave] remove role:', err.message); }

  // ── DM owner if cancelled by officer ─────────────────────────
  if (member.user.id !== ownerId) {
    try {
      const u = await guild.client.users.fetch(ownerId);
      await u.send('🚫 **تم إلغاء أجازتك من قِبَل الإدارة.**\n\n🚫 **Your vacation has been cancelled by an officer.**');
    } catch (err) { console.warn('[cancelLeave] DM:', err.message); }
  }

  await interaction.followUp({
    content: '🚫 **تم إلغاء الأجازة.**  |  Vacation cancelled.\n👤 <@' + ownerId + '>',
    flags: 64,
  }).catch(() => {});

  try {
    const logsCh = await getLogsChannel(guild.client);
    await logsCh.send({ embeds: [buildCancelledLog({ name, decidedBy: officerTag })] });
  } catch (err) { console.error('[cancelLeave] logs:', err.message); }

  inProgress.delete(message.id);
}
