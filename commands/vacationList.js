// ============================================================
//  commands/vacationList.js  –  /leave-list
// ============================================================

import { SlashCommandBuilder } from 'discord.js';
import { buildVacationListEmbed } from '../config/embeds.js';
import { getAllVacations } from '../config/vacationStore.js';

export const data = new SlashCommandBuilder()
  .setName('leave-list')
  .setDescription('Show all Elsisy staff currently on leave  |  عرض المنتسبين في أجازة حالياً');

export async function execute(interaction) {
  try {
    await interaction.reply({ embeds: [buildVacationListEmbed(getAllVacations())], flags: 64 });
  } catch (err) {
    console.error('[leave-list]', err.message);
    await interaction.reply({ content: '❌ Error fetching leave list.', flags: 64 }).catch(() => {});
  }
}
