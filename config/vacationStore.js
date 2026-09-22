// ============================================================
// config/vacationStore.js
// Persistent active-vacation store + statistics.
// ============================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DATA_FILE = join(DATA_DIR, 'vacations.json');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const active = new Map();
const stats = { submitted: 0, approved: 0, rejected: 0 };

function persist() {
  try {
    writeFileSync(DATA_FILE, JSON.stringify({
      active: Object.fromEntries(active),
      stats,
    }, null, 2), 'utf8');
  } catch (err) {
    console.error('[store] Failed to persist:', err.message);
  }
}

function load() {
  try {
    if (!existsSync(DATA_FILE)) return;
    const raw = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    if (raw?.active && typeof raw.active === 'object') {
      for (const [ownerId, entry] of Object.entries(raw.active)) active.set(ownerId, entry);
    }
    if (raw?.stats && typeof raw.stats === 'object') {
      stats.submitted = Number(raw.stats.submitted) || 0;
      stats.approved = Number(raw.stats.approved) || 0;
      stats.rejected = Number(raw.stats.rejected) || 0;
    }
    console.log('[store] Loaded ' + active.size + ' active vacation(s).');
  } catch (err) {
    console.error('[store] Failed to load:', err.message);
  }
}

load();

export function addVacation(entry) {
  active.set(entry.ownerId, { ...entry, approvedAt: entry.approvedAt || Date.now() });
  persist();
}

export function removeVacation(ownerId) {
  active.delete(ownerId);
  persist();
}

export function getVacation(ownerId) {
  return active.get(ownerId) ?? null;
}

export function updateEndDate(ownerId, newEndDate) {
  const entry = active.get(ownerId);
  if (!entry) return false;
  active.set(ownerId, { ...entry, endDate: newEndDate });
  persist();
  return true;
}

export function getAllVacations() {
  return Array.from(active.values());
}

export function vacationCount() {
  return active.size;
}

export function incSubmitted() { stats.submitted++; persist(); }
export function incApproved()  { stats.approved++;  persist(); }
export function incRejected()  { stats.rejected++;  persist(); }

export function getStats() {
  return { ...stats, active: active.size };
}
