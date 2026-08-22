// ============================================================
//  config/pendingMap.js
//
//  Three maps:
//  1. pending:        requestMsgId → submitMsgId      (pre-decision "under review" msg)
//  2. userPanel:      requestMsgId → panelMsgId       (post-approval panel in SUBMIT_CHANNEL)
//  3. panelToRequest: panelMsgId   → requestMsgId     (reverse lookup for extend/cancel)
// ============================================================

const TTL = 72 * 60 * 60 * 1000;

/** @type {Map<string, { submitMsgId: string|null, timer: NodeJS.Timeout }>} */
const pendingStore = new Map();

/** @type {Map<string, string>} requestMsgId → panelMsgId */
const userPanelStore = new Map();

/** @type {Map<string, string>} panelMsgId → requestMsgId */
const panelToRequest = new Map();

// ── Pre-decision pending message ──────────────────────────────

export function storePending(requestMsgId, submitMsgId) {
  const existing = pendingStore.get(requestMsgId);
  if (existing) clearTimeout(existing.timer);
  const timer = setTimeout(() => pendingStore.delete(requestMsgId), TTL);
  if (timer.unref) timer.unref();
  pendingStore.set(requestMsgId, { submitMsgId, timer });
}

export function popPending(requestMsgId) {
  const entry = pendingStore.get(requestMsgId);
  if (!entry) return null;
  clearTimeout(entry.timer);
  pendingStore.delete(requestMsgId);
  return entry.submitMsgId;
}

// ── Post-approval user panel ──────────────────────────────────

export function storeUserPanel(requestMsgId, panelMsgId) {
  userPanelStore.set(requestMsgId, panelMsgId);
  panelToRequest.set(panelMsgId, requestMsgId);
}

export function getUserPanel(requestMsgId) {
  return userPanelStore.get(requestMsgId) ?? null;
}

/** Given the panel message ID, get the original request message ID. */
export function getRequestFromPanel(panelMsgId) {
  return panelToRequest.get(panelMsgId) ?? null;
}

export function removeUserPanel(requestMsgId) {
  const panelMsgId = userPanelStore.get(requestMsgId);
  if (panelMsgId) panelToRequest.delete(panelMsgId);
  userPanelStore.delete(requestMsgId);
}

/** Remove by panel message ID (when cancel triggered from the panel itself). */
export function removeUserPanelByPanelId(panelMsgId) {
  const requestMsgId = panelToRequest.get(panelMsgId);
  if (requestMsgId) userPanelStore.delete(requestMsgId);
  panelToRequest.delete(panelMsgId);
}
