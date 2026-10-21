/**
 * Backend Timezone Utilities for SocialSync AI
 * Standardized to Sri Lanka Standard Time (SLST / Asia/Colombo / GMT+05:30)
 */

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Colombo';
export const TIMEZONE_CODE = 'SLST';
export const TIMEZONE_LABEL = 'Sri Lanka Time (SLST)';
export const TIMEZONE_FULL_LABEL = 'Sri Lanka Standard Time (Asia/Colombo, GMT+05:30)';
export const TIMEZONE_OFFSET_STR = '+05:30';

/**
 * Format any Date into readable Sri Lanka Time for system logs and notifications
 * Example: "2026-10-20 14:30:00 SLST"
 * @param {Date|string|number} [date]
 * @returns {string}
 */
export function formatSriLankaTime(date = new Date()) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return 'Invalid Date';

  const formatter = new Intl.DateTimeFormat('en-GB', {
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

  let hour = partMap.hour || '00';
  if (hour === '24') hour = '00';

  return `${partMap.year}-${partMap.month}-${partMap.day} ${hour}:${partMap.minute}:${partMap.second} ${TIMEZONE_CODE}`;
}

/**
 * Get date parts in Sri Lanka Time
 * @param {Date|string|number} [date]
 */
export function getSriLankaDateParts(date = new Date()) {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) {
    return getSriLankaDateParts(new Date());
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
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

  let hour = partMap.hour || '00';
  if (hour === '24') hour = '00';

  return {
    year: partMap.year,
    month: partMap.month,
    day: partMap.day,
    hour,
    minute: partMap.minute,
    second: partMap.second,
    dateStr: `${partMap.year}-${partMap.month}-${partMap.day}`,
    timeStr: `${hour}:${partMap.minute}`
  };
}

/**
 * Parse a Sri Lanka local date and time string into a UTC Date object
 * @param {string} dateStr 'YYYY-MM-DD'
 * @param {string} timeStr 'HH:mm'
 * @returns {Date}
 */
export function parseSriLankaDateTime(dateStr, timeStr) {
  const normalizedTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  const isoWithOffset = `${dateStr}T${normalizedTime}+05:30`;
  const d = new Date(isoWithOffset);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid Sri Lanka date or time: ${dateStr} ${timeStr}`);
  }
  return d;
}

/**
 * Get date range for reporting periods (today, 7d, 30d, month, year, all) anchored to Sri Lanka Standard Time
 * @param {string} period 'today' | '7d' | '30d' | 'month' | 'year' | 'all'
 */
export function getReportingPeriodDateRange(period = 'all') {
  const now = new Date();
  const normalized = String(period || 'all').toLowerCase();
  const parts = getSriLankaDateParts(now);

  if (normalized === 'today') {
    const startOfToday = parseSriLankaDateTime(parts.dateStr, '00:00');
    return { period: 'today', startDate: startOfToday, endDate: now };
  }

  if (normalized === '7d') {
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { period: '7d', startDate: start7d, endDate: now };
  }

  if (normalized === '30d') {
    const start30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { period: '30d', startDate: start30d, endDate: now };
  }

  if (normalized === 'month' || normalized === 'this_month') {
    const startOfMonth = parseSriLankaDateTime(`${parts.year}-${parts.month}-01`, '00:00');
    return { period: 'month', startDate: startOfMonth, endDate: now };
  }

  if (normalized === 'year' || normalized === 'this_year') {
    const startOfYear = parseSriLankaDateTime(`${parts.year}-01-01`, '00:00');
    return { period: 'year', startDate: startOfYear, endDate: now };
  }

  return { period: 'all', startDate: null, endDate: now };
}

/**
 * Get standard SLST calendar boundaries (start of current month, start of current year, now)
 */
export function getSriLankaReportingBoundaries() {
  const now = new Date();
  const parts = getSriLankaDateParts(now);
  const startOfMonth = parseSriLankaDateTime(`${parts.year}-${parts.month}-01`, '00:00');
  const startOfYear = parseSriLankaDateTime(`${parts.year}-01-01`, '00:00');
  return { now, startOfMonth, startOfYear };
}

/**
 * Calculate the exact timestamp 1 calendar month ahead in Sri Lanka Time (SLST / Asia/Colombo)
 * E.g., activation on 20 October at 11:30:00 -> 20 November at 11:30:00
 * Handles month-end clamping (e.g. 31 Jan -> 28 Feb)
 * @param {Date|string|number} [fromDate]
 * @returns {Date}
 */
export function calculateOneCalendarMonthAhead(fromDate = new Date()) {
  const parts = getSriLankaDateParts(fromDate);
  let year = parseInt(parts.year, 10);
  let month = parseInt(parts.month, 10); // 1-12
  let day = parseInt(parts.day, 10);

  // Increment month
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }

  // Get max days in target month
  const daysInTargetMonth = new Date(year, month, 0).getDate();
  if (day > daysInTargetMonth) {
    day = daysInTargetMonth;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const targetDateStr = `${year}-${pad(month)}-${pad(day)}`;
  const timeStr = `${parts.hour}:${parts.minute}:${parts.second}`;
  return new Date(`${targetDateStr}T${timeStr}+05:30`);
}

