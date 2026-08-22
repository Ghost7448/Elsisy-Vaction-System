// ============================================================
//  handlers/leaveButton.js  –  Opens the leave modal
// ============================================================

import { buildLeaveModal } from '../config/components.js';

export async function handleLeaveButton(interaction) {
  try {
    await interaction.showModal(buildLeaveModal());
  } catch (err) {
    console.error('[leaveButton] Error:', err.message);
  }
}
