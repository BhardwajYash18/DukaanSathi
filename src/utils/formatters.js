import i18n from '../i18n';
import { getLanguageConfig } from '../i18n/languages';

/**
 * Resolves current locale string based on active i18n language
 * @returns {string} e.g. 'en-IN', 'hi-IN', 'ta-IN'
 */
function getActiveLocale() {
  const currentLang = i18n?.language || 'en';
  const config = getLanguageConfig(currentLang);
  return config?.locale || 'en-IN';
}

/**
 * Formats a numeric value into Indian Rupee format (e.g. ₹1,250.00)
 * Uses active locale while strictly retaining INR currency.
 * @param {number|string} amount
 * @param {boolean} [showDecimals=true]
 * @returns {string}
 */
export function formatCurrency(amount, showDecimals = true) {
  const num = Number(amount) || 0;
  const locale = getActiveLocale();

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: showDecimals ? (num % 1 === 0 ? 0 : 2) : 0,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    // Fallback if specific locale fails on system
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: showDecimals ? (num % 1 === 0 ? 0 : 2) : 0,
      maximumFractionDigits: 2,
    }).format(num);
  }
}

/**
 * Formats a Firestore Timestamp or Date object into human-readable date/time
 * in the active locale.
 * @param {any} timestamp
 * @returns {string}
 */
export function formatDateTime(timestamp) {
  const t = i18n?.t || ((k, d) => d);
  if (!timestamp) return t('common.justNow', 'Just now');
  let date;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return t('common.recently', 'Recently');
  }

  const locale = getActiveLocale();
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }
}

/**
 * Checks whether a timestamp represents today's date in local time.
 * @param {any} timestamp
 * @returns {boolean}
 */
export function isToday(timestamp) {
  if (!timestamp) return false;
  let date;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return false;
  }

  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}
