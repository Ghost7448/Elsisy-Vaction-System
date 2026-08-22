// ============================================================
//  index.js  –  Entry point
//  Production-ready for Discloud free plan (100MB RAM)
// ============================================================

// ── Global error handlers FIRST — before any async code ──────
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { join, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Validate required env vars ────────────────────────────────
const REQUIRED = [
  'TOKEN', 'CLIENT_ID', 'GUILD_ID',
  'SUBMIT_CHANNEL_ID', 'REQUESTS_CHANNEL_ID', 'LOGS_CHANNEL_ID',
  'APPROVER_ROLE_IDS', 'VACATION_ROLE_ID',
];

const missing = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('[STARTUP] Missing environment variables: ' + missing.join(', '));
  process.exit(1);
}

// ── Create client (minimal intents for low RAM) ───────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.GuildMember],
  rest: { timeout: 15000 },
});

// ── Load commands ─────────────────────────────────────────────
client.commands = new Collection();

try {
  const commandFiles = readdirSync(join(__dirname, 'commands'))
    .filter(f => f.endsWith('.js') && f !== 'deploy.js');

  for (const file of commandFiles) {
    try {
      const mod = await import(pathToFileURL(join(__dirname, 'commands', file)).href);
      if (!mod.data || !mod.execute) {
        console.warn('[STARTUP] Skipping commands/' + file + ' — missing data or execute');
        continue;
      }
      client.commands.set(mod.data.name, mod);
      console.log('[STARTUP] Command loaded: /' + mod.data.name);
    } catch (err) {
      console.error('[STARTUP] Failed to load commands/' + file + ':', err.message);
    }
  }
} catch (err) {
  console.error('[STARTUP] Could not read commands directory:', err.message);
}

// ── Load events ───────────────────────────────────────────────
try {
  const eventFiles = readdirSync(join(__dirname, 'events'))
    .filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    try {
      const event = await import(pathToFileURL(join(__dirname, 'events', file)).href);
      if (!event.name || !event.execute) {
        console.warn('[STARTUP] Skipping events/' + file + ' — missing name or execute');
        continue;
      }
      const handler = (...args) => event.execute(...args, client);
      event.once ? client.once(event.name, handler) : client.on(event.name, handler);
      console.log('[STARTUP] Event loaded: ' + event.name);
    } catch (err) {
      console.error('[STARTUP] Failed to load events/' + file + ':', err.message);
    }
  }
} catch (err) {
  console.error('[STARTUP] Could not read events directory:', err.message);
}

// ── Login ─────────────────────────────────────────────────────
console.log('[STARTUP] Logging in...');
client.login(process.env.TOKEN).catch((err) => {
  console.error('[STARTUP] Login failed:', err.message);
  process.exit(1);
});
