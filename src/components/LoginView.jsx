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

    // Call demo authentication service
    const res = loginDemo(mobile, password);

    if (res.success) {
      setLoading(false);
      onLoginSuccess(res.user);
    } else {
      setLoading(false);
      // Clear password field immediately for security and safety
      setPassword('');
      setError(t(res.errorKey, res.errorMessage));
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
        {/* Top Header with Brand and Language Selector */}
        <div className="login-header-row">
          <div className="brand-logo login-brand">
            <div className="brand-store-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
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
            <div className="brand-text-block">
              <div className="brand-title">DukaanSathi</div>
              <div className="brand-subtitle">{t('nav.brandSubtitle', 'Smart Kirana Ledger')}</div>
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
            <span className="error-icon" aria-hidden="true">⚠️</span>
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
              <span className="input-prefix" aria-hidden="true">📱</span>
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
              <span className="input-prefix" aria-hidden="true">🔒</span>
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
                  <span title={t('auth.hidePassword', 'Hide')}>👁️‍🗨️ {t('auth.hidePassword', 'Hide')}</span>
                ) : (
                  <span title={t('auth.showPassword', 'Show')}>👁️ {t('auth.showPassword', 'Show')}</span>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-login"
            disabled={loading}
          >
            {loading ? t('auth.loggingIn', 'Signing in...') : `🏪 ${t('auth.loginBtn', 'Login to Store')}`}
          </button>
        </form>

        {/* Demo Credentials Callout Box */}
        <div className="demo-credentials-box">
          <div className="demo-box-header">
            <span className="demo-bulb" aria-hidden="true">💡</span>
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
            ✨ {t('auth.autoFillDemo', 'Auto-fill Demo Credentials')}
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
