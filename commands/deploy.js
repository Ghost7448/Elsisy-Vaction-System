// ============================================================
//  commands/deploy.js  –  Run once: node commands/deploy.js
// ============================================================

import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Post the Elsisy Leave Management panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('leave-list')
    .setDescription('Show all Elsisy staff currently on leave  |  عرض المنتسبين في أجازة حالياً')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show Elsisy leave statistics  |  إحصائيات نظام الأجازات')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('⏳ Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Commands registered: /setup  /leave-list  /stats');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
})();
