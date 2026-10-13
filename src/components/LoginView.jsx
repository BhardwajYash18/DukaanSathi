import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import { loginDemo, DEMO_CREDENTIALS } from '../services/authService';

export default function LoginView({ onLoginSuccess }) {
  const { t } = useTranslation();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = loginDemo(mobile, password);

    if (result.success) {
      if (onLoginSuccess) {
        onLoginSuccess(result.user);
      }
    } else {
      setError(
        result.errorKey
          ? t(result.errorKey, result.errorMessage)
          : result.errorMessage
      );
      setPassword('');
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setMobile(DEMO_CREDENTIALS.mobile);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-card">
        {/* Top Header Row with Logo & Language Selector */}
        <div className="login-card-header">
          <div className="login-brand">
            <div className="brand-store-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
                <ellipse cx="24" cy="44" rx="20" ry="3" fill="#D5EEE2" />
                <rect x="8" y="16" width="32" height="26" rx="3" fill="#EBF4FE" stroke="#3B82F6" strokeWidth="2" />
                <rect x="13" y="24" width="10" height="18" rx="2" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1.5" />
                <circle cx="20" cy="33" r="1.5" fill="#F58216" />
                <rect x="26" y="24" width="11" height="12" rx="2" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="1.5" />
                <line x1="31.5" y1="24" x2="31.5" y2="36" stroke="#DBEAFE" strokeWidth="1.5" />
                <line x1="26" y1="30" x2="37" y2="30" stroke="#DBEAFE" strokeWidth="1.5" />
                <path d="M6 16 L10 8 L15 8 L13 16 Z" fill="#3B82F6" />
                <path d="M13 16 L15 8 L20 8 L18 16 Z" fill="#FFFFFF" />
                <path d="M18 16 L20 8 L26 8 L24 16 Z" fill="#3B82F6" />
                <path d="M24 16 L26 8 L31 8 L29 16 Z" fill="#FFFFFF" />
                <path d="M29 16 L31 8 L36 8 L34 16 Z" fill="#3B82F6" />
                <path d="M34 16 L36 8 L42 8 L40 16 Z" fill="#FFFFFF" />
                <path d="M5 16 Q24 20 43 16" stroke="#3B82F6" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <div>
              <div className="login-brand-title">DukaanSathi</div>
              <div className="login-brand-sub">{t('nav.brandSubtitle', 'Smart Kirana Ledger')}</div>
            </div>
          </div>
          <div className="login-lang-wrapper">
            <LanguageSelector />
          </div>
        </div>

        {/* Welcome Heading */}
        <div className="login-intro">
          <h2>{t('auth.welcomeBack', 'Welcome Back')}</h2>
          <p className="subtitle">{t('auth.subtitle', 'Sign in to manage your Kirana store, khata, and daily sales')}</p>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="login-error-banner" role="alert">
            <span className="error-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="login-mobile" className="input-label">
              {t('auth.mobileLabel', 'Mobile Number')}
            </label>
            <div className="input-with-prefix">
              <span className="input-prefix" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </span>
              <input
                id="login-mobile"
                type="text"
                inputMode="numeric"
                className="input-field input-with-icon"
                placeholder={t('auth.mobilePlaceholder', '0123456789')}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="input-label">
              {t('auth.passwordLabel', 'Password')}
            </label>
            <div className="password-input-wrapper">
              <span className="input-prefix" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field input-with-icon password-field"
                placeholder={t('auth.passwordPlaceholder', 'Enter password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
              >
                {showPassword ? (
                  <span className="pwd-toggle-text">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    <span>{t('auth.hidePassword', 'Hide')}</span>
                  </span>
                ) : (
                  <span className="pwd-toggle-text">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>{t('auth.showPassword', 'Show')}</span>
                  </span>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-login"
            disabled={loading}
          >
            {loading ? t('auth.loggingIn', 'Signing in...') : t('auth.loginBtn', 'Login to Store')}
          </button>
        </form>

        {/* Demo Credentials Callout Box */}
        <div className="demo-credentials-box">
          <div className="demo-box-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#218653" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <strong>{t('auth.demoHintTitle', 'Hackathon Demo Credentials')}</strong>
          </div>
          <div className="demo-credentials-details">
            <div className="demo-cred-row">
              <span className="demo-label">{t('auth.mobileLabel', 'Mobile Number')}:</span>
              <code className="demo-code">0123456789</code>
            </div>
            <div className="demo-cred-row">
              <span className="demo-label">{t('auth.passwordLabel', 'Password')}:</span>
              <code className="demo-code">kirana123</code>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline btn-autofill"
            onClick={handleFillDemo}
          >
            {t('auth.autoFillDemo', 'Auto-fill Demo Credentials')}
          </button>
        </div>

        {/* Prototype Disclaimer */}
        <div className="demo-disclaimer">
          {t('auth.demoDisclaimer', 'Prototype Demo Mode • Temporary client authentication')}
        </div>
      </div>
    </div>
  );
}
