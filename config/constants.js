// ============================================================
//  config/constants.js  –  EMS Leave Management System
// ============================================================

export const COLORS = {
  PENDING:   0xF39C12,  // Orange  – مميز للإسعاف
  APPROVED:  0x1ABC9C,  // Teal
  REJECTED:  0xE74C3C,  // Red
  EXTENDED:  0x3498DB,  // Blue
  CANCELLED: 0x95A5A6,  // Grey
  INFO:      0x1A252F,  // Dark
  STATS:     0x2980B9,  // Steel Blue
};

export const CUSTOM_IDS = {
  LEAVE_BUTTON:  'leave_button',
  LEAVE_MODAL:   'leave_modal',
  APPROVE_LEAVE: 'approve_leave',
  REJECT_LEAVE:  'reject_leave',
  REJECT_MODAL:  'reject_modal',
  EXTEND_LEAVE:  'extend_leave',
  EXTEND_MODAL:  'extend_modal',
  CANCEL_LEAVE:  'cancel_leave',
};

export const STATUS = {
  PENDING:   '⏳ قيد المراجعة  |  Pending',
  APPROVED:  '✅ تمت الموافقة  |  Approved',
  REJECTED:  '❌ مرفوض  |  Rejected',
  EXTENDED:  '🔄 تم التمديد  |  Extended',
  CANCELLED: '🚫 ملغي  |  Cancelled',
};

const CAIRO_OFFSET_MS = 2 * 60 * 60 * 1000;

export function cairoEndOfDay(formatted) {
  const parsed = parseDDMMYYYY(formatted);
  if (!parsed) return null;
  return parsed.getTime() - CAIRO_OFFSET_MS + 86399999;
}

export function parseDate(raw) {
  if (!raw) return '';
  const trimmed = raw.trim();
  try {
    let day, month, year;
    if (/[\/\-\.\s]/.test(trimmed)) {
      const parts = trimmed.split(/[^0-9]+/).filter(Boolean);
      if (parts.length < 3) throw new Error('not enough parts');
      [day, month, year] = parts;
    } else {
      const digits = trimmed.replace(/\D/g, '');
      if      (digits.length === 6) { day = digits[0];         month = digits[1];         year = digits.slice(2);               }
      else if (digits.length === 7) { day = digits.slice(0,2); month = digits[2];         year = digits.slice(3);               }
      else if (digits.length === 8) { day = digits.slice(0,2); month = digits.slice(2,4); year = digits.slice(4);               }
      else if (digits.length >= 9)  { day = digits.slice(0,2); month = digits.slice(2,4); year = digits.slice(digits.length-4); }
      else return trimmed;
    }
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return trimmed;
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2000 || y > 2100) return trimmed;
    const check = new Date(Date.UTC(y, m - 1, d));
    if (check.getUTCDate() !== d || check.getUTCMonth() !== m - 1) return trimmed;
    return String(d).padStart(2,'0') + '/' + String(m).padStart(2,'0') + '/' + y;
  } catch { return trimmed; }
}

export function parseDDMMYYYY(formatted) {
  if (!formatted || typeof formatted !== 'string') return null;
  const parts = formatted.split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCDate() !== d || date.getUTCMonth() !== m - 1) return null;
  return date;
}

export function validateDateRange(startStr, endStr) {
  const s = parseDDMMYYYY(startStr);
  const e = parseDDMMYYYY(endStr);
  if (!s || !e) return false;
  return e.getTime() > s.getTime();
}

export function extractUserId(embed) {
  if (!embed) return null;
  const text = embed.footer?.text ?? '';
  const match = text.match(/\bID:\s*(\d{17,20})\b/);
  return match ? match[1] : null;
}

export function isApprover(member) {
  if (!member?.roles?.cache) return false;
  const raw = process.env.APPROVER_ROLE_IDS ?? '';
  if (!raw.trim()) return false;
  const roles = raw.split(',').map(r => r.trim()).filter(Boolean);
  return member.roles.cache.some(r => roles.includes(r.id));
}

export function fieldValue(embed, keyword) {
  if (!embed?.fields) return '—';
  const field = embed.fields.find(f => f.name.includes(keyword));
  if (!field?.value) return '—';
  return field.value.replace(/```/g, '').trim() || '—';
}

export function isValidSnowflake(id) {
  return typeof id === 'string' && /^\d{17,20}$/.test(id);
}
