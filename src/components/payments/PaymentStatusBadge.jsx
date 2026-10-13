import React from 'react';
import { PAYMENT_STATUSES } from '../../services/paymentService';

/**
 * Clean status badge for UPI payments with SVG vector icons.
 * Does not use emojis.
 *
 * @param {Object} props
 * @param {string} props.status - 'pending' | 'success' | 'failed' | 'cancelled' | 'expired'
 * @param {boolean} [props.showIcon=true]
 */
export default function PaymentStatusBadge({ status, showIcon = true }) {
  const normalizedStatus = (status || PAYMENT_STATUSES.PENDING).toLowerCase();

  const config = {
    [PAYMENT_STATUSES.PENDING]: {
      label: 'Awaiting Payment',
      className: 'badge-upi-pending',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    [PAYMENT_STATUSES.SUCCESS]: {
      label: 'Payment Verified',
      className: 'badge-upi-success',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
    },
    [PAYMENT_STATUSES.FAILED]: {
      label: 'Payment Failed',
      className: 'badge-upi-failed',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      ),
    },
    [PAYMENT_STATUSES.CANCELLED]: {
      label: 'Cancelled',
      className: 'badge-upi-cancelled',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ),
    },
    [PAYMENT_STATUSES.EXPIRED]: {
      label: 'QR Expired',
      className: 'badge-upi-expired',
      icon: (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  };

  const item = config[normalizedStatus] || config[PAYMENT_STATUSES.PENDING];

  return (
    <span className={`payment-status-badge ${item.className}`}>
      {showIcon && <span className="status-badge-icon">{item.icon}</span>}
      <span className="status-badge-label">{item.label}</span>
    </span>
  );
}
