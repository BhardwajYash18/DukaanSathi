import React, { useState, useEffect } from 'react';
import {
  paymentService,
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
  VERIFICATION_SOURCES,
} from '../../services/paymentService';
import UPIQrCard from './UPIQrCard';
import PaymentStatusBadge from './PaymentStatusBadge';
import './payments.css';

/**
 * DukaanSathi — Reusable UPI Payment & Reconciliation Modal
 *
 * Designed for Person 2 (UPI Payments) and easily integrated by Person 4.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Modal close handler
 * @param {number} props.amount - Amount in INR
 * @param {'new_sale' | 'udhaar_repayment'} props.purpose - Payment purpose
 * @param {string} [props.customerId] - Required for udhaar_repayment
 * @param {string} [props.customerName] - Customer display name
 * @param {string} [props.customerPhone] - Customer contact
 * @param {Object} [props.metadata] - Attached saleData or repaymentData
 * @param {string} [props.notes] - Note/memo
 * @param {Function} [props.onSuccess] - Callback when reconciled
 * @param {Function} [props.onFailure] - Callback if failed
 */
export default function UPIPaymentModal({
  isOpen,
  onClose,
  amount,
  purpose = PAYMENT_PURPOSES.NEW_SALE,
  customerId = null,
  customerName = '',
  customerPhone = '',
  metadata = {},
  notes = '',
  onSuccess,
  onFailure,
}) {
  const [currentPayment, setCurrentPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulatingAction, setSimulatingAction] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [reconciliationResult, setReconciliationResult] = useState(null);

  // Initialize or reset payment order when modal opens with new amount/purpose
  useEffect(() => {
    if (!isOpen) {
      setCurrentPayment(null);
      setReconciliationResult(null);
      setActionError(null);
      return;
    }

    try {
      setLoading(true);
      setActionError(null);
      setReconciliationResult(null);

      const order = paymentService.createPaymentOrder({
        amount,
        purpose,
        customerId,
        customerName,
        customerPhone,
        metadata,
        notes,
      });

      setCurrentPayment(order);
    } catch (err) {
      console.error('[UPIPaymentModal] Error creating payment order:', err);
      setActionError(err.message || 'Failed to initialize UPI payment order');
    } finally {
      setLoading(false);
    }
  }, [isOpen, amount, purpose, customerId, customerName, customerPhone, metadata, notes]);

  // Subscribe to live status updates of current payment order
  useEffect(() => {
    if (!currentPayment?.id) return;

    const unsub = paymentService.subscribeToPayment(currentPayment.id, (updated) => {
      setCurrentPayment({ ...updated });
    });

    return () => unsub();
  }, [currentPayment?.id]);

  if (!isOpen) return null;

  // Handles simulated success (Demo Hackathon Flow)
  const handleSimulateSuccess = async () => {
    if (!currentPayment) return;
    setSimulatingAction(true);
    setActionError(null);

    try {
      const res = await paymentService.confirmPaymentSimulated(currentPayment.id);
      setReconciliationResult(res);

      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      console.error('[UPIPaymentModal] Simulation reconciliation failed:', err);
      setActionError(err.message || 'Reconciliation failed');
    } finally {
      setSimulatingAction(false);
    }
  };

  // Handles simulated failure
  const handleSimulateFailure = () => {
    if (!currentPayment) return;
    try {
      const failed = paymentService.failPaymentSimulated(
        currentPayment.id,
        'Simulated bank decline: Transaction timed out or rejected by customer in UPI app'
      );
      setCurrentPayment({ ...failed });

      if (onFailure) {
        onFailure(failed);
      }
    } catch (err) {
      setActionError(err.message);
    }
  };

  // Handles manual cancellation by merchant
  const handleCancelPayment = () => {
    if (currentPayment && !currentPayment.reconciled) {
      try {
        paymentService.cancelPayment(currentPayment.id, 'Cancelled by shopkeeper at POS counter');
      } catch (e) {
        console.warn(e);
      }
    }
    onClose();
  };

  // Regenerates a fresh payment order if expired or failed
  const handleRetryNewOrder = () => {
    try {
      setLoading(true);
      setActionError(null);
      setReconciliationResult(null);

      const newOrder = paymentService.createPaymentOrder({
        amount,
        purpose,
        customerId,
        customerName,
        customerPhone,
        metadata,
        notes,
      });
      setCurrentPayment(newOrder);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = currentPayment?.status === PAYMENT_STATUSES.SUCCESS;
  const isFailed = currentPayment?.status === PAYMENT_STATUSES.FAILED;
  const isExpired = currentPayment?.status === PAYMENT_STATUSES.EXPIRED;
  const isCancelled = currentPayment?.status === PAYMENT_STATUSES.CANCELLED;
  const isPending = currentPayment?.status === PAYMENT_STATUSES.PENDING;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);

  return (
    <div className="upi-modal-overlay">
      <div className="upi-modal-container">
        {/* Modal Header */}
        <div className="upi-modal-header">
          <div className="header-title-block">
            <div className="upi-icon-badge" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
              </svg>
            </div>
            <div>
              <h3>UPI Digital Payment</h3>
              <span className="upi-modal-subtitle">
                {purpose === PAYMENT_PURPOSES.NEW_SALE
                  ? 'New Sale Bill Checkout'
                  : 'Digital Khata Udhaar Repayment'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="upi-modal-close"
            onClick={isSuccess ? onClose : handleCancelPayment}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="upi-modal-body">
          {actionError && (
            <div className="upi-error-banner" role="alert">
              <span className="error-dot">!</span>
              <span>{actionError}</span>
            </div>
          )}

          {/* Amount & Purpose Header Strip */}
          <div className="upi-summary-strip">
            <div className="summary-amount-block">
              <span className="summary-label">Amount Payable:</span>
              <span className="summary-amount">{formattedAmount}</span>
            </div>
            <div className="summary-purpose-block">
              <span className={`purpose-tag ${purpose === PAYMENT_PURPOSES.NEW_SALE ? 'tag-sale' : 'tag-khata'}`}>
                {purpose === PAYMENT_PURPOSES.NEW_SALE ? 'New Sale' : 'Udhaar Jama'}
              </span>
              {currentPayment && (
                <PaymentStatusBadge status={currentPayment.status} />
              )}
            </div>
          </div>

          {/* Customer Metadata row if applicable */}
          {customerName && (
            <div className="upi-customer-meta">
              <span className="meta-label">Customer:</span>
              <strong>{customerName}</strong>
              {customerPhone && <span className="meta-phone">({customerPhone})</span>}
            </div>
          )}

          {/* STATE: PENDING — Display QR and Verification Controls */}
          {isPending && currentPayment && (
            <div className="upi-pending-layout">
              <UPIQrCard
                paymentOrder={currentPayment}
                onExpire={() => {
                  paymentService.checkPaymentExpiration(currentPayment.id);
                }}
              />

              {/* Security Guidance Box */}
              <div className="upi-security-note">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                <span>
                  <strong>Accounting Rule:</strong> Customer showing a screenshot or clicking "I paid" is not proof of credit. Real merchant payments reconcile automatically via server webhooks.
                </span>
              </div>

              {/* Demo-Only Simulation Controls (Clearly Isolated & Labelled) */}
              <div className="upi-demo-simulation-card">
                <div className="demo-card-header">
                  <span className="demo-chip">DEMO ONLY</span>
                  <h4>Hackathon Provider Simulation</h4>
                </div>
                <p className="demo-card-desc">
                  Simulate live payment notification from PhonePe / Paytm Business soundbox without requiring production gateway credentials.
                </p>
                <div className="demo-action-buttons">
                  <button
                    type="button"
                    className="btn-demo-success"
                    disabled={simulatingAction}
                    onClick={handleSimulateSuccess}
                  >
                    {simulatingAction ? 'Reconciling Ledger...' : 'Simulate Payment Success'}
                  </button>
                  <button
                    type="button"
                    className="btn-demo-failure"
                    disabled={simulatingAction}
                    onClick={handleSimulateFailure}
                  >
                    Simulate Decline / Fail
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STATE: SUCCESS — Ledger Reconciled Confirmation */}
          {isSuccess && currentPayment && (
            <div className="upi-success-view">
              <div className="success-icon-badge" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>

              <h3>Payment Verified & Reconciled!</h3>
              <p className="success-amount-text">{formattedAmount} received via UPI</p>

              <div className="reconciliation-audit-card">
                <div className="audit-row">
                  <span>Payment Ref:</span>
                  <code>{currentPayment.referenceId}</code>
                </div>
                <div className="audit-row">
                  <span>Bank UTR:</span>
                  <code>{currentPayment.metadata?.utrNumber || 'UTR-VERIFIED'}</code>
                </div>
                <div className="audit-row">
                  <span>Verification:</span>
                  <span className="source-tag">
                    {currentPayment.verificationSource === VERIFICATION_SOURCES.SIMULATED_DEMO
                      ? 'Simulated Demo Confirmation'
                      : 'Provider Verified Webhook'}
                  </span>
                </div>
                <div className="audit-row">
                  <span>Reconciled Action:</span>
                  <strong>
                    {purpose === PAYMENT_PURPOSES.NEW_SALE
                      ? `Sale Created (ID: ${currentPayment.reconciledRecordId})`
                      : `Khata Balance Reduced (Repayment ID: ${currentPayment.reconciledRecordId})`}
                  </strong>
                </div>
                {reconciliationResult?.newBalance !== undefined && (
                  <div className="audit-row highlight-balance">
                    <span>Updated Customer Balance:</span>
                    <strong className="text-balance">
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                        reconciliationResult.newBalance
                      )}
                    </strong>
                  </div>
                )}
              </div>

              <div className="success-action-row">
                <button
                  type="button"
                  className="btn btn-primary btn-block btn-done"
                  onClick={onClose}
                >
                  Done / Return to Counter
                </button>
              </div>
            </div>
          )}

          {/* STATE: FAILED or CANCELLED or EXPIRED */}
          {(isFailed || isExpired || isCancelled) && currentPayment && (
            <div className="upi-failed-view">
              <div className="failed-icon-badge" aria-hidden="true">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>

              <h3>
                {isExpired
                  ? 'Payment QR Expired'
                  : isCancelled
                  ? 'Payment Cancelled'
                  : 'Payment Not Received'}
              </h3>
              <p className="failed-reason">
                {currentPayment.metadata?.failureReason ||
                  currentPayment.metadata?.cancelledReason ||
                  'The transaction was not completed within the allowed timeframe.'}
              </p>

              <div className="accounting-safety-callout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span>Zero Ledger Impact: No sale records were created and customer balances remain untouched.</span>
              </div>

              <div className="failed-action-buttons">
                <button
                  type="button"
                  className="btn btn-primary btn-retry"
                  onClick={handleRetryNewOrder}
                >
                  Generate New QR / Retry
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Close & Choose Another Payment Method
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer for Pending State */}
        {isPending && (
          <div className="upi-modal-footer">
            <button
              type="button"
              className="btn btn-secondary btn-cancel-upi"
              onClick={handleCancelPayment}
            >
              Cancel / Pay in Cash
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
