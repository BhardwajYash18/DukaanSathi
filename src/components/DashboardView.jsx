import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { adjustProductStock } from '../services/productService';

export default function DashboardView({
  metrics,
  recentTransactions,
  lowStockProducts,
  loading,
  setActiveTab,
  onSeedData,
  seeding,
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="view-loading">
        <div className="spinner"></div>
        <p>{t('dashboard.loadingData', 'Loading store data...')}</p>
      </div>
    );
  }

  const handleRestock = async (productId) => {
    try {
      await adjustProductStock(productId, 10);
    } catch (err) {
      alert(t('inventory.errStockAdjust', { message: err.message }));
    }
  };

  return (
    <div className="dashboard-view">
      {/* Top Banner / Welcome Bar */}
      <div className="dashboard-welcome">
        <div>
          <h2>{t('dashboard.title', 'Store Overview')}</h2>
          <p className="subtitle">{t('dashboard.subtitle', 'Daily sales, cash collection, and credit tracking')}</p>
        </div>
        <div className="quick-actions">
          <button
            type="button"
            className="btn btn-action-sale"
            onClick={() => setActiveTab('sales')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
            </svg>
            <span>{t('dashboard.newSaleBtn', '+ New Sale')}</span>
          </button>
          <button
            type="button"
            className="btn btn-action-khata"
            onClick={() => setActiveTab('khata')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
            </svg>
            <span>{t('dashboard.viewKhataBtn', 'View Khata')}</span>
          </button>
        </div>
      </div>

      {/* 4 Main Financial KPI Cards with Pastel Tints & Colored Circular Badges */}
      <div className="kpi-grid">
        <div className="kpi-card sales-kpi">
          <div className="kpi-header">
            <div className="kpi-icon-badge badge-blue" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z" />
              </svg>
            </div>
            <span className="kpi-title">{t('dashboard.todaySales', "Today's Sales")}</span>
          </div>
          <div className="kpi-value">{formatCurrency(metrics.todaySales)}</div>
          <div className="kpi-subtext">
            {t('dashboard.billsCount', { count: metrics.salesCount || 0 })}
          </div>
        </div>

        <div className="kpi-card cash-kpi">
          <div className="kpi-header">
            <div className="kpi-icon-badge badge-green" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
            </div>
            <span className="kpi-title">{t('dashboard.cashCollected', 'Cash Collected')}</span>
          </div>
          <div className="kpi-value">{formatCurrency(metrics.todayCashCollected)}</div>
          <div className="kpi-subtext">{t('dashboard.cashSubtext', 'Sales + Credit Repayments')}</div>
        </div>

        <div className="kpi-card credit-today-kpi">
          <div className="kpi-header">
            <div className="kpi-icon-badge badge-purple" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
              </svg>
            </div>
            <span className="kpi-title">{t('dashboard.creditToday', 'Credit Given Today')}</span>
          </div>
          <div className="kpi-value">{formatCurrency(metrics.todayCreditSales)}</div>
          <div className="kpi-subtext">{t('dashboard.creditTodaySubtext', "Today's credit sales")}</div>
        </div>

        <div className="kpi-card total-credit-kpi">
          <div className="kpi-header">
            <div className="kpi-icon-badge badge-orange" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            </div>
            <span className="kpi-title">{t('dashboard.totalKhata', 'Total Khata Udhar')}</span>
          </div>
          <div className="kpi-value">{formatCurrency(metrics.totalOutstandingCredit)}</div>
          <div className="kpi-subtext">
            {t('dashboard.totalKhataSubtext', { count: metrics.customerCount || 0 })}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <div className="alert-card low-stock-alert">
          <div className="alert-header">
            <span className="alert-badge">
              {t('dashboard.lowStockAlert', { count: lowStockProducts.length })}
            </span>
            <span className="alert-subtext">
              {t('dashboard.lowStockSubtext', 'These items are running out of stock')}
            </span>
          </div>
          <div className="low-stock-grid">
            {lowStockProducts.slice(0, 4).map((p) => {
              const unitKey = `units.${p.unit || 'packet'}`;
              const unitLabel = t(unitKey, p.unit || 'packet');
              return (
                <div key={p.id} className="low-stock-item">
                  <div className="stock-info">
                    <strong>{p.name}</strong>
                    <span className="stock-count danger">
                      {t('dashboard.onlyLeft', {
                        count: p.stockQuantity,
                        unit: unitLabel,
                        min: p.minStockThreshold,
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => handleRestock(p.id)}
                  >
                    {t('dashboard.restock10', '+10 Restock')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Bottom Section: Recent Ledger & Quick Help */}
      <div className="dashboard-bottom-grid">
        <div className="recent-transactions-card">
          <div className="card-header-flex">
            <h3>{t('dashboard.recentTransactions', 'Recent Transactions')}</h3>
            <span className="badge-count">
              {t('dashboard.txCount', { count: recentTransactions.length })}
            </span>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="empty-state">
              <p>{t('dashboard.noTransactions', 'No transactions recorded yet.')}</p>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveTab('sales')}
              >
                {t('dashboard.recordFirstSale', 'Record First Sale')}
              </button>
            </div>
          ) : (
            <div className="transaction-list">
              {recentTransactions.map((tx) => {
                let txTitle = t('dashboard.cashSale', 'Cash Sale');
                let txTag = t('dashboard.tagCash', 'Cash');
                if (tx.type === 'credit') {
                  txTitle = t('dashboard.creditSale', 'Credit Sale');
                  txTag = t('dashboard.tagCredit', 'Credit');
                } else if (tx.type === 'repayment') {
                  txTitle = t('dashboard.creditRepayment', 'Credit Repayment');
                  txTag = t('dashboard.tagRepayment', 'Received');
                }

                return (
                  <div key={tx.id} className={`transaction-row ${tx.kind}`}>
                    <div className="tx-left">
                      <span className={`tx-dot ${tx.type}`} aria-hidden="true"></span>
                      <div>
                        <div className="tx-title">{txTitle}</div>
                        <div className="tx-customer">
                          {tx.customerName} • {formatDateTime(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="tx-right">
                      <div className="tx-amount">
                        {tx.type === 'repayment' ? '+' : ''}
                        {formatCurrency(tx.amount)}
                      </div>
                      <span
                        className={`tx-tag ${
                          tx.type === 'credit'
                            ? 'tag-udhar'
                            : tx.type === 'repayment'
                            ? 'tag-jama'
                            : 'tag-cash'
                        }`}
                      >
                        {txTag}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Kirana Shortcuts & Demo Seeder */}
        <div className="side-card">
          <div className="side-card-section tips-box">
            <h4>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '6px' }}>
                <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
              </svg>
              {t('dashboard.tipsTitle', 'Kirana Sathi Tips')}
            </h4>
            <ul className="tips-list">
              <li>
                <strong>{t('dashboard.tip1')}</strong>
              </li>
              <li>
                <strong>{t('dashboard.tip2')}</strong>
              </li>
              <li>
                <strong>{t('dashboard.tip3')}</strong>
              </li>
            </ul>
          </div>

          {metrics.customerCount === 0 && (
            <div className="side-card-section seed-box">
              <h4>{t('dashboard.seedTitle', 'Store Setup Assistance')}</h4>
              <p>{t('dashboard.seedDesc', 'Quickly load common kirana products and customers to start using the store.')}</p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={seeding}
                onClick={onSeedData}
              >
                {seeding ? t('common.loading', 'Loading...') : t('dashboard.seedBtn', 'Load Sample Kirana Data')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
