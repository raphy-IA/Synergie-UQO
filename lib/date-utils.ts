/**
 * Utility functions for formatting and parsing dates using Canada Eastern Time (Ottawa / Quebec / Montreal).
 * Official timezone: 'America/Toronto'
 */

export const DEFAULT_TIMEZONE = 'America/Toronto';

/**
 * Formats a date string or object into a French Canadian formatted date string in Ottawa timezone.
 */
export function formatDateOttawa(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-CA', {
    timeZone: DEFAULT_TIMEZONE,
    ...options,
  });
}

/**
 * Formats a date string or object into a French Canadian formatted time string (e.g., "14 h 00") in Ottawa timezone.
 */
export function formatTimeOttawa(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-CA', {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Converts a UTC or ISO date string into a local YYYY-MM-DDTHH:mm string formatted for HTML <input type="datetime-local">
 * according to the Ottawa / Quebec timezone.
 */
export function toDatetimeLocalOttawa(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  let hour = getPart('hour');
  if (hour === '24') hour = '00';
  const minute = getPart('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Converts a datetime-local input string ("YYYY-MM-DDTHH:mm") representing local Ottawa time into a UTC ISO string.
 * Accounts dynamically for Eastern Daylight Time (EDT -4h) vs Eastern Standard Time (EST -5h).
 */
export function parseOttawaDatetimeToISO(datetimeLocalStr: string): string {
  if (!datetimeLocalStr) return '';
  
  // If string already contains timezone indicator, convert directly
  if (datetimeLocalStr.includes('Z') || (datetimeLocalStr.includes('+') && datetimeLocalStr.length > 16)) {
    return new Date(datetimeLocalStr).toISOString();
  }

  const [datePart, timePart] = datetimeLocalStr.split('T');
  if (!datePart || !timePart) return new Date(datetimeLocalStr).toISOString();

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Construct initial UTC date based on year, month, day, hour, minute
  const initialUtcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // Determine what local time initialUtcDate is in America/Toronto
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const formattedStr = formatter.format(initialUtcDate);
  const localDateInOttawa = new Date(formattedStr);

  const diffMs = initialUtcDate.getTime() - localDateInOttawa.getTime();
  const actualUtcDate = new Date(initialUtcDate.getTime() + diffMs);

  return actualUtcDate.toISOString();
}
