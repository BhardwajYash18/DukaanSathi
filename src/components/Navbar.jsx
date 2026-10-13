import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

export default function Navbar({ activeTab, setActiveTab, onLogout }) {
  const { t } = useTranslation();

  const tabs = [
    {
      id: 'dashboard',
      label: t('nav.dashboard', 'Dashboard'),
      badgeClass: 'tab-badge-dashboard',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z" />
        </svg>
      ),
    },
    {
      id: 'sales',
      label: t('nav.sales', 'New Sale'),
      badgeClass: 'tab-badge-sales',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
        </svg>
      ),
    },
    {
      id: 'khata',
      label: t('nav.khata', 'Digital Khata'),
      badgeClass: 'tab-badge-khata',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
        </svg>
      ),
    },
    {
      id: 'inventory',
      label: t('nav.inventory', 'Inventory'),
      badgeClass: 'tab-badge-inventory',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-10-3h4v3h-4V4zm10 16H4V9h16v11z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="kirana-navbar">
      <div className="navbar-container">
        {/* Top Brand & Language Action Row */}
        <div className="navbar-top-row">
          <div className="brand-logo" onClick={() => setActiveTab('dashboard')}>
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

          <div className="navbar-top-actions">
            <LanguageSelector />
            {onLogout && (
              <button
                type="button"
                className="btn-logout"
                onClick={onLogout}
                title={t('auth.logout', 'Logout')}
                aria-label={t('auth.logout', 'Logout')}
              >
                <span>🚪</span>
                <span className="logout-text">{t('auth.logout', 'Logout')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Pill Bar */}
        <div className="nav-tabs-wrapper">
          <div className="nav-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`nav-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className={`tab-icon-badge ${tab.badgeClass}`}>
                  {tab.icon}
                </span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Status Indicator */}
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span className="status-text">{t('common.online', 'Store Online')}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

