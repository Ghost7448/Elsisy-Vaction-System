// ============================================================
//  commands/setup.js  –  EMS Leave Management System
// ============================================================

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { buildPanelEmbed }   from '../config/embeds.js';
import { buildSubmitButton } from '../config/components.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Post the Elsisy Leave Management panel  |  نشر لوحة نظام إدارة أجازات الإسعاف')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  try {
    const submitChannel = await interaction.guild.channels
      .fetch(process.env.SUBMIT_CHANNEL_ID)
      .catch(() => null);

    if (!submitChannel) {
      return interaction.reply({ content: '❌ SUBMIT_CHANNEL_ID not found. Check your .env file.', flags: 64 });
    }

    await submitChannel.send({
      embeds:     [buildPanelEmbed()],
      components: [buildSubmitButton()],
    });

    await interaction.reply({
      content: '✅ تم نشر لوحة أجازات الإسعاف في <#' + submitChannel.id + '>\n|  Elsisy Leave panel posted in <#' + submitChannel.id + '>',
      flags: 64,
    });
  } catch (err) {
    console.error('[setup] Error:', err.message);
    await interaction.reply({ content: '❌ An error occurred.', flags: 64 }).catch(() => {});
  }
}
