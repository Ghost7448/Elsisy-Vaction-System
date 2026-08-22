// ============================================================
//  config/vacationStore.js
//  In-memory store of currently active vacations.
//  Used by:
//    - /vacation-list  (who is on vacation)
//    - /stats          (counts)
//    - extend handler  (update end date)
//    - auto role removal on vacation end
// ============================================================

/**
 * @typedef {Object} VacationEntry
 * @property {string} ownerId
 * @property {string} name
 * @property {string} badge
 * @property {string} startDate   DD/MM/YYYY
 * @property {string} endDate     DD/MM/YYYY
 * @property {string} requestMsgId
 * @property {number} approvedAt   timestamp
 */

/** @type {Map<string, VacationEntry>} ownerId → entry */
const active = new Map();

/** Daily stats counters — reset on bot restart */
const stats = {
  submitted: 0,
  approved:  0,
  rejected:  0,
};

// ── Active vacation CRUD ──────────────────────────────────────

export function addVacation(entry) {
  active.set(entry.ownerId, { ...entry, approvedAt: Date.now() });
}

export function removeVacation(ownerId) {
  active.delete(ownerId);
}

export function getVacation(ownerId) {
  return active.get(ownerId) ?? null;
}

export function updateEndDate(ownerId, newEndDate) {
  const entry = active.get(ownerId);
  if (!entry) return false;
  active.set(ownerId, { ...entry, endDate: newEndDate });
  return true;
}

/** @returns {VacationEntry[]} */
export function getAllVacations() {
  return Array.from(active.values());
}

export function vacationCount() {
  return active.size;
}

// ── Stats ─────────────────────────────────────────────────────

export function incSubmitted() { stats.submitted++; }
export function incApproved()  { stats.approved++;  }
export function incRejected()  { stats.rejected++;  }

export function getStats() {
  return { ...stats, active: active.size };
}
