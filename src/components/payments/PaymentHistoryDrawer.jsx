import React, { useState, useEffect } from 'react';
import {
  paymentService,
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
} from '../../services/paymentService';
import PaymentStatusBadge from './PaymentStatusBadge';
import './payments.css';

/**
 * PaymentHistoryDrawer
 * Displays UPI transaction history, reconciliation audit trail, and stats.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 */
export default function PaymentHistoryDrawer({ isOpen, onClose }) {
  const [payments, setPayments] = useState([]);
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState(paymentService.getPaymentStats());

  useEffect(() => {
    if (!isOpen) return;

    const unsub = paymentService.subscribe((all) => {
      setPayments([...all]);
      setStats(paymentService.getPaymentStats());
    });

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPayments = payments.filter((p) => {
    if (purposeFilter !== 'all' && p.purpose !== purposeFilter) return false;
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    return true;
  });

  const formatInr = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="upi-drawer-overlay">
      <div className="upi-drawer-panel">
        {/* Drawer Header */}
        <div className="upi-drawer-header">
          <div>
            <h3>UPI Payment Reconciliation Log</h3>
            <span className="drawer-subtitle">
              Audit trail of digital UPI transactions and ledger reconciliation
            </span>
          </div>
          <button
            type="button"
            className="btn-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Stats Row */}
        <div className="upi-drawer-stats">
          <div className="stat-card">
            <span className="stat-label">Today's UPI Total</span>
            <strong className="stat-val text-green">{formatInr(stats.totalUpiCollectedToday)}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Sales Reconciled</span>
            <strong className="stat-val">{stats.upiSalesCount}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Udhaar Repayments</span>
            <strong className="stat-val">{stats.upiRepaymentsCount}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pending Orders</span>
            <strong className="stat-val text-orange">{stats.pendingCount}</strong>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="upi-drawer-filters">
          <div className="filter-group">
            <label>Purpose:</label>
            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              className="drawer-select"
            >
              <option value="all">All Purposes</option>
              <option value={PAYMENT_PURPOSES.NEW_SALE}>New Sale</option>
              <option value={PAYMENT_PURPOSES.UDHAAR_REPAYMENT}>Udhaar Repayment</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="drawer-select"
            >
              <option value="all">All Statuses</option>
              <option value={PAYMENT_STATUSES.SUCCESS}>Verified & Reconciled</option>
              <option value={PAYMENT_STATUSES.PENDING}>Pending</option>
              <option value={PAYMENT_STATUSES.FAILED}>Failed</option>
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="upi-drawer-body">
          {filteredPayments.length === 0 ? (
            <div className="drawer-empty-state">
              <p>No UPI transactions matching current filters.</p>
            </div>
          ) : (
            <div className="upi-txn-list">
              {filteredPayments.map((p) => (
                <div key={p.id} className={`upi-txn-card ${p.status}`}>
                  <div className="txn-card-top">
                    <div className="txn-amount-block">
                      <span className="txn-amount">{formatInr(p.amount)}</span>
                      <span
                        className={`txn-purpose-badge ${
                          p.purpose === PAYMENT_PURPOSES.NEW_SALE ? 'badge-sale' : 'badge-khata'
                        }`}
                      >
                        {p.purpose === PAYMENT_PURPOSES.NEW_SALE ? 'Sale' : 'Khata Repayment'}
                      </span>
                    </div>
                    <PaymentStatusBadge status={p.status} />
                  </div>

                  <div className="txn-card-details">
                    <div className="txn-meta-item">
                      <span className="meta-key">Customer:</span>
                      <span className="meta-val">{p.customerName || 'Cash Customer'}</span>
                    </div>
                    <div className="txn-meta-item">
                      <span className="meta-key">Reference:</span>
                      <code className="meta-val">{p.referenceId}</code>
                    </div>
                    {p.metadata?.utrNumber && (
                      <div className="txn-meta-item">
                        <span className="meta-key">Bank UTR:</span>
                        <code className="meta-val">{p.metadata.utrNumber}</code>
                      </div>
                    )}
                    <div className="txn-meta-item">
                      <span className="meta-key">Created:</span>
                      <span className="meta-val">{formatDate(p.createdAt)}</span>
                    </div>
                  </div>

                  {p.reconciled && (
                    <div className="txn-reconciled-banner">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      <span>
                        Reconciled into{' '}
                        {p.purpose === PAYMENT_PURPOSES.NEW_SALE
                          ? `Sales (Record #${p.reconciledRecordId})`
                          : `Digital Khata (Repayment #${p.reconciledRecordId})`}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
