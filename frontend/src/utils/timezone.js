/**
 * Timezone Configuration & Utilities for SocialSync AI
 * Standardized to Sri Lanka Standard Time (SLST / Asia/Colombo / GMT+05:30)
 */

export const APP_TIMEZONE = 'Asia/Colombo';
export const TIMEZONE_CODE = 'SLST';
export const TIMEZONE_LABEL = 'Sri Lanka Time (SLST)';
export const TIMEZONE_FULL_LABEL = 'Sri Lanka Standard Time (Asia/Colombo, GMT+05:30)';
export const TIMEZONE_OFFSET_STR = '+05:30';
export const TIMEZONE_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

/**
 * Get current moment formatted in Sri Lanka timezone
 */
export function getSriLankaNow() {
  return new Date();
}

/**
 * Break down any Date / ISO string into year, month, day, hour, minute in Sri Lanka time (Asia/Colombo)
 * @param {Date|string|number} [date]
 * @returns {{ year: string, month: string, day: string, hour: string, minute: string, second: string, dateStr: string, timeStr: string }}
 */
export function getSriLankaDateParts(date = new Date()) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) {
    const fallback = new Date();
    return getSriLankaDateParts(fallback);
  }

  // Format to parts using Intl with timeZone: 'Asia/Colombo'
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(d);
  const partMap = {};
  for (const p of parts) {
    if (p.type !== 'literal') {
      partMap[p.type] = p.value;
    }
  }

  const year = partMap.year || '1970';
  const month = partMap.month || '01';
  const day = partMap.day || '01';
  // hour12: false in en-CA can output '24' for midnight in older environments, normalize
  let hour = partMap.hour || '00';
  if (hour === '24') hour = '00';
  const minute = partMap.minute || '00';
  const second = partMap.second || '00';

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hour}:${minute}`;

  return { year, month, day, hour, minute, second, dateStr, timeStr };
}

/**
 * Returns today's date string (YYYY-MM-DD) in Sri Lanka time
 * Ideal for `min` attribute on <input type="date">
 */
export function getSriLankaMinDate() {
  return getSriLankaDateParts(new Date()).dateStr;
}

/**
 * Convert user-picked Sri Lanka date and time to a timezone-aware UTC ISO timestamp
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} timeStr 'HH:mm'
 * @returns {string} ISO 8601 string in UTC (e.g. '2026-10-20T08:30:00.000Z')
 */
export function sriLankaTimeToUtcIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return '';
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  // Sri Lanka time has no DST, strictly UTC+05:30
  const isoWithOffset = `${dateStr}T${normalizedTime}+05:30`;
  const d = new Date(isoWithOffset);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date or time provided: ${dateStr} ${timeStr}`);
  }
  return d.toISOString();
}

/**
 * Check if the given Sri Lanka date and time represents a future moment
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} timeStr 'HH:mm'
 * @param {number} [bufferMs=0] Optional leeway in milliseconds
 * @returns {boolean}
 */
export function isFutureInSriLanka(dateStr, timeStr, bufferMs = 0) {
  try {
    const iso = sriLankaTimeToUtcIso(dateStr, timeStr);
    if (!iso) return false;
    return new Date(iso).getTime() > (Date.now() + bufferMs);
  } catch {
    return false;
  }
}

/**
 * Format any date/timestamp into Sri Lanka Standard Time display string
 * Example output: "Oct 20, 2026, 02:30 PM SLST"
 * @param {Date|string|number} date
 * @param {Object} [options]
 * @param {boolean} [options.includeTz=true]
 * @param {boolean} [options.includeSeconds=false]
 * @param {boolean} [options.shortMonth=true]
 * @returns {string}
 */
export function formatSriLankaDateTime(date, options = {}) {
  const { includeTz = true, includeSeconds = false, shortMonth = true } = options;
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: shortMonth ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true
  });

  const formatted = formatter.format(d);
  return includeTz ? `${formatted} ${TIMEZONE_CODE}` : formatted;
}

/**
 * Format only the date in Sri Lanka Time
 * Example: "Oct 20, 2026"
 */
export function formatSriLankaDate(date, shortMonth = true) {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: shortMonth ? 'short' : 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
}

/**
 * Format only the time in Sri Lanka Time
 * Example: "02:30 PM SLST"
 */
export function formatSriLankaTime(date, includeTz = true) {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(d);

  return includeTz ? `${timeStr} ${TIMEZONE_CODE}` : timeStr;
}

/**
 * Generate a smart default schedule for a new post in Sri Lanka time
 * Defaults to 2 hours from current moment in Sri Lanka
 */
export function getSriLankaDefaultSchedule() {
  const now = new Date();
  const future = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  const parts = getSriLankaDateParts(future);
  return {
    date: parts.dateStr,
    time: parts.timeStr
  };
}
