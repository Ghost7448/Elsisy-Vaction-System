// ============================================================
//  commands/stats.js  –  /stats
// ============================================================

import { SlashCommandBuilder } from 'discord.js';
import { buildStatsEmbed } from '../config/embeds.js';
import { getStats } from '../config/vacationStore.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('Show leave management statistics  |  إحصائيات نظام الإجازات');

export async function execute(interaction) {
  try {
    await interaction.reply({
      embeds: [buildStatsEmbed(getStats())],
      flags: 64,
    });
  } catch (err) {
    console.error('[stats]', err.message);
    await interaction.reply({ content: '❌ Error fetching stats.', flags: 64 }).catch(() => {});
  }
}
