// ============================================================
//  events/interactionCreate.js  –  Central interaction router
// ============================================================

import { Events } from 'discord.js';
import { CUSTOM_IDS } from '../config/constants.js';
import { handleLeaveButton } from '../handlers/leaveButton.js';
import { handleLeaveModal }  from '../handlers/leaveModal.js';
import { handleApprove }     from '../handlers/approve.js';
import { handleReject }      from '../handlers/reject.js';
import { handleRejectModal } from '../handlers/rejectModal.js';
import { handleExtendLeave } from '../handlers/extendLeave.js';
import { handleExtendModal } from '../handlers/extendModal.js';
import { handleCancelLeave } from '../handlers/cancelLeave.js';

export const name = Events.InteractionCreate;
export const once = false;

export async function execute(interaction, client) {
  try {

    // ── Slash commands ────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd) await cmd.execute(interaction);
      return;
    }

    // ── Buttons ───────────────────────────────────────────────
    if (interaction.isButton()) {
      if (interaction.customId === CUSTOM_IDS.LEAVE_BUTTON)  { await handleLeaveButton(interaction); return; }
      if (interaction.customId === CUSTOM_IDS.APPROVE_LEAVE) { await handleApprove(interaction);     return; }
      if (interaction.customId === CUSTOM_IDS.REJECT_LEAVE)  { await handleReject(interaction);      return; }
      if (interaction.customId === CUSTOM_IDS.EXTEND_LEAVE)  { await handleExtendLeave(interaction); return; }
      if (interaction.customId === CUSTOM_IDS.CANCEL_LEAVE)  { await handleCancelLeave(interaction); return; }
      return;
    }

    // ── Modals ────────────────────────────────────────────────
    if (interaction.isModalSubmit()) {
      if (interaction.customId === CUSTOM_IDS.LEAVE_MODAL) {
        await handleLeaveModal(interaction);
        return;
      }
      if (interaction.customId.startsWith(CUSTOM_IDS.REJECT_MODAL + '_')) {
        await handleRejectModal(interaction);
        return;
      }
      if (interaction.customId.startsWith(CUSTOM_IDS.EXTEND_MODAL + '_')) {
        await handleExtendModal(interaction);
        return;
      }
      return;
    }

  } catch (err) {
    console.error('[interactionCreate] Error:', err.message, err.stack);
    const msg = { content: '❌ حدث خطأ غير متوقع.  |  An unexpected error occurred.', flags: 64 };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    } catch { /* expired */ }
  }
}
