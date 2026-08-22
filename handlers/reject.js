// ============================================================
//  handlers/reject.js  –  Opens the rejection-reason modal
// ============================================================

import { buildRejectionModal } from '../config/components.js';
import { isApprover } from '../config/constants.js';

export async function handleReject(interaction) {
  const { member, message } = interaction;

  // ── Permission check ─────────────────────────────────────────
  if (!isApprover(member)) {
    await interaction.reply({
      content: '🚫 **ليس لديك صلاحية لرفض الطلبات.**\n|  You are not allowed to reject requests.',
      flags: 64,
    }).catch(() => {});
    return;
  }

  // ── Guard: already decided ────────────────────────────────────
  const embed = message.embeds[0];
  if (embed) {
    const statusField = embed.fields?.find(
      f => f.name.includes('الحالة') || f.name.includes('Status')
    );
    if (statusField && !statusField.value.includes('Pending') && !statusField.value.includes('قيد')) {
      await interaction.reply({
        content: '⚠️ هذا الطلب تمت معالجته بالفعل.  |  This request has already been processed.',
        flags: 64,
      }).catch(() => {});
      return;
    }
  }

  try {
    await interaction.showModal(buildRejectionModal(message.id));
  } catch (err) {
    console.error('[reject] showModal failed:', err.message);
  }
}
