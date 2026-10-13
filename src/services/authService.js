/**
 * DukaanSathi — Demo Authentication Service
 *
 * IMPORTANT NOTICE:
 * This is a temporary, client-side hardcoded demo authentication mechanism
 * designed specifically for prototype evaluations and hackathon judging.
 * It is NOT secure production authentication and must not be used in production.
 *
 * This module is isolated here so it can be cleanly replaced with Firebase
 * Authentication (Phone Auth / SMS OTP or Firebase Auth SDK) in production phases.
 */

export const DEMO_CREDENTIALS = {
  mobile: '0123456789',
  password: 'kirana123',
};

export const AUTH_STORAGE_KEY = 'dukaansathi_demo_auth_session';

/**
 * Validates demo credentials and sets local demo session if valid.
 *
 * Rules:
 * - Mobile number is treated strictly as a string, preserving any leading zero.
 * - Surrounding whitespace on mobile number is trimmed.
 * - Password is not modified or trimmed in any way.
 * - Never returns or retains passwords in the session.
 *
 * @param {string} mobile
 * @param {string} password
 * @returns {{ success: boolean, user?: object, errorKey?: string, errorMessage?: string }}
 */
export function loginDemo(mobile, password) {
  const trimmedMobile = typeof mobile === 'string' ? mobile.trim() : '';

  if (!trimmedMobile || !password) {
    return {
      success: false,
      errorKey: 'auth.errEmptyFields',
      errorMessage: 'Please enter both mobile number and password.',
    };
  }

  // Exact comparison matching specified demo credentials
  if (trimmedMobile === DEMO_CREDENTIALS.mobile && password === DEMO_CREDENTIALS.password) {
    const sessionData = {
      mobile: trimmedMobile,
      storeName: 'DukaanSathi Kirana Store',
      loginTime: new Date().toISOString(),
      isDemoAuth: true,
    };

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      }
    } catch (e) {
      console.warn('[authService] Failed to persist demo session:', e);
    }

    return {
      success: true,
      user: sessionData,
    };
  }

  return {
    success: false,
    errorKey: 'auth.invalidCredentials',
    errorMessage: 'Incorrect mobile number or password. Please try again.',
  };
}

/**
 * Synchronously retrieves current active demo session from localStorage.
 * Avoids any UI flash between page load and authentication verification.
 *
 * @returns {object|null}
 */
export function getDemoSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session && session.mobile === DEMO_CREDENTIALS.mobile) {
      return session;
    }
  } catch (e) {
    console.warn('[authService] Failed to read demo session:', e);
  }
  return null;
}

/**
 * Clears demo session flag from localStorage.
 */
export function logoutDemo() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('[authService] Failed to clear demo session:', e);
    }
  }
}
