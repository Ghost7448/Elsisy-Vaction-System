// ============================================================
//  handlers/leaveModal.js
// ============================================================

import { buildRequestEmbed } from '../config/embeds.js';
import { buildActionButtons } from '../config/components.js';
import { parseDate } from '../config/constants.js';
import { storePending } from '../config/pendingMap.js';
import { incSubmitted } from '../config/vacationStore.js';

export async function handleLeaveModal(interaction) {
  try { await interaction.deferReply({ flags: 64 }); }
  catch (err) { console.error('[leaveModal] defer:', err.message); return; }

  const { user, guild } = interaction;

  let badge, name, startDate, endDate, reason;
  try {
    badge     = interaction.fields.getTextInputValue('badge_number').trim();
    name      = interaction.fields.getTextInputValue('name').trim();
    startDate = parseDate(interaction.fields.getTextInputValue('start_date').trim());
    endDate   = parseDate(interaction.fields.getTextInputValue('end_date').trim());
    reason    = interaction.fields.getTextInputValue('reason').trim();
  } catch (err) {
    console.error('[leaveModal] read fields:', err.message);
    await interaction.editReply({ content: '❌ خطأ في قراءة البيانات.\n|  Error reading form data.' }).catch(() => {});
    return;
  }

  let requestsChannel = null;
  try { requestsChannel = await guild.channels.fetch(process.env.REQUESTS_CHANNEL_ID); }
  catch (err) { console.error('[leaveModal] fetch REQUESTS_CHANNEL:', err.message); }

  if (!requestsChannel) {
    await interaction.editReply({ content: '❌ قناة الطلبات غير موجودة.\n|  Requests channel not found.' }).catch(() => {});
    return;
  }

  let requestMsg = null;
  try {
    requestMsg = await requestsChannel.send({
      content:    '📬  طلب أجازة جديد من <@' + user.id + '>',
      embeds:     [buildRequestEmbed({ badge, name, startDate, endDate, reason, submittedBy: user.username + ' (' + user.tag + ')', userId: user.id, avatarUrl: user.displayAvatarURL({ dynamic: true }) })],
      components: [buildActionButtons()],
    });
  } catch (err) {
    console.error('[leaveModal] send request:', err.message);
    await interaction.editReply({ content: '❌ فشل إرسال الطلب.\n|  Failed to send request.' }).catch(() => {});
    return;
  }

  if (requestMsg) storePending(requestMsg.id, null);
  incSubmitted();

  await interaction.editReply({
    content: '📨 تم إرسال طلب إجازتك وهو قيد المراجعة.\n⏳ **Your leave request has been submitted and is under review.**',
  }).catch(() => {});
}
