// ============================================================
//  handlers/extendLeave.js
//  Visible to everyone. Only owner or approver can USE it.
// ============================================================

import { buildExtendModal } from '../config/components.js';
import { isApprover, extractUserId } from '../config/constants.js';

export async function handleExtendLeave(interaction) {
  const { member, message } = interaction;

  const embed   = message.embeds[0];
  const ownerId = embed ? extractUserId(embed) : null;

  const isOwner   = ownerId && member.user.id === ownerId;
  const isOfficer = isApprover(member);

  if (!isOwner && !isOfficer) {
    await interaction.reply({
      content: '❌ You are not allowed to manage this vacation.',
      flags: 64,
    }).catch(() => {});
    return;
  }

  try {
    await interaction.showModal(buildExtendModal(message.id));
  } catch (err) {
    console.error('[extendLeave] showModal:', err.message);
  }
}
