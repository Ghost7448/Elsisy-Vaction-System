// ============================================================
// commands/deploy.js - Legacy manual deploy command
// Commands are now synced automatically when the bot starts.
// This file is kept only for backward compatibility.
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
    .setDescription('Show all Elsisy staff currently on leave | عرض المنتسبين في أجازة حالياً')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Show Elsisy leave statistics | إحصائيات نظام الأجازات')
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log('✅ Commands registered. Automatic startup sync is enabled too.');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
})();
