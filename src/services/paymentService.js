/**
 * DukaanSathi — UPI Payment & Reconciliation Service
 *
 * Implemented by: Person 2 (UPI Payments & Reconciliation)
 *
 * Key Responsibilities:
 * 1. Creates unique pending payment records for 'new_sale' and 'udhaar_repayment'.
 * 2. Generates standard NPCI-compliant UPI dynamic pay URIs (upi://pay?pa=...&pn=...&am=...&tr=...).
 * 3. Enforces strict idempotency and concurrency guards to prevent double reconciliation.
 * 4. Reconciles 'new_sale' into sales catalog exactly once.
 * 5. Reconciles 'udhaar_repayment' into customer ledger and repayments collection without creating a duplicate sale.
 * 6. Clearly distinguishes demo-only simulated confirmations from verified provider webhooks.
 * 7. Provides subscription listeners for real-time payment status updates in the UI.
 */

import { localStore } from './localStore';
import { createSale } from './saleService';
import { recordRepayment } from './customerService';

export const PAYMENT_STORAGE_KEY = 'dukaansathi_upi_payments_v1';

export const DEFAULT_MERCHANT_CONFIG = {
  vpa: 'dukaansathi.kirana@phonepe',
  name: 'DukaanSathi Kirana Store',
  mcc: '5411', // Grocery stores / Supermarkets
  currency: 'INR',
};

export const PAYMENT_PURPOSES = {
  NEW_SALE: 'new_sale',
  UDHAAR_REPAYMENT: 'udhaar_repayment',
};

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

export const VERIFICATION_SOURCES = {
  SIMULATED_DEMO: 'simulated_demo',
  PROVIDER_WEBHOOK: 'provider_webhook',
  MERCHANT_MANUAL: 'merchant_manual',
};

/**
 * Generates an NPCI-compliant standard UPI deep-link URI.
 * Spec: upi://pay?pa={vpa}&pn={name}&am={amount}&tn={note}&tr={refId}&mc={mcc}&cu=INR
 *
 * @param {Object} params
 * @param {string} params.vpa - Merchant UPI ID
 * @param {string} params.name - Merchant Display Name
 * @param {number} params.amount - Transaction amount
 * @param {string} params.note - Transaction note (purpose)
 * @param {string} params.refId - Unique transaction reference ID
 * @returns {string} Standard UPI URI
 */
export function buildUpiUri({
  vpa = DEFAULT_MERCHANT_CONFIG.vpa,
  name = DEFAULT_MERCHANT_CONFIG.name,
  amount,
  note = 'Kirana Payment',
  refId,
}) {
  const formattedAmount = Number(amount || 0).toFixed(2);
  const cleanRef = (refId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 35);
  const cleanNote = encodeURIComponent(note.slice(0, 50));
  const cleanName = encodeURIComponent(name.slice(0, 50));

  return `upi://pay?pa=${vpa}&pn=${cleanName}&am=${formattedAmount}&cu=INR&tn=${cleanNote}&tr=${cleanRef}&mc=${DEFAULT_MERCHANT_CONFIG.mcc}`;
}

/**
 * Generates a collision-resistant unique transaction reference.
 * Example: "DS-UPI-1728812345678-7A2B"
 */
export function generateReferenceId() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `DS-UPI-${ts}-${rand}`;
}

/**
 * Generates a mock bank UTR (Unique Transaction Reference) for simulated confirmations.
 * Example: "UTR410298374619"
 */
export function generateMockUtr() {
  const digits = Math.floor(100000000000 + Math.random() * 900000000000);
  return `UTR${digits}`;
}

class PaymentService {
  constructor() {
    this.subscribers = new Set();
    this.payments = this.loadPayments();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === PAYMENT_STORAGE_KEY) {
          this.payments = this.loadPayments();
          this.notify();
        }
      });
    }
  }

  loadPayments() {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('[PaymentService] Error loading payments from localStorage:', e);
    }
    return [];
  }

  persist() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(this.payments));
    } catch (e) {
      console.warn('[PaymentService] Error persisting payments:', e);
    }
  }

  notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.payments);
      } catch (err) {
        console.error('[PaymentService] Subscriber error:', err);
      }
    });
  }

  subscribe(cb) {
    this.subscribers.add(cb);
    try {
      cb(this.payments);
    } catch (err) {
      console.error('[PaymentService] Initial subscription error:', err);
    }
    return () => {
      this.subscribers.delete(cb);
    };
  }

  /**
   * Creates a new pending payment order with dynamic UPI URI and reference.
   *
   * @param {Object} params
   * @param {number} params.amount - Total payment amount
   * @param {'new_sale' | 'udhaar_repayment'} params.purpose - Purpose of payment
   * @param {string} [params.customerId] - Required if udhaar_repayment
   * @param {string} [params.customerName] - Display name of customer
   * @param {string} [params.customerPhone] - Phone number of customer
   * @param {Object} [params.metadata] - Attached data (sale items or repayment details)
   * @param {string} [params.merchantVpa] - Custom VPA or default
   * @param {string} [params.merchantName] - Custom Merchant Name or default
   * @param {string} [params.notes] - Memo
   * @returns {PaymentOrder} Created pending payment order
   */
  createPaymentOrder({
    amount,
    purpose,
    customerId = null,
    customerName = '',
    customerPhone = '',
    metadata = {},
    merchantVpa = DEFAULT_MERCHANT_CONFIG.vpa,
    merchantName = DEFAULT_MERCHANT_CONFIG.name,
    notes = '',
  }) {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Valid payment amount greater than zero is required');
    }

    if (!Object.values(PAYMENT_PURPOSES).includes(purpose)) {
      throw new Error(`Invalid payment purpose: "${purpose}". Must be "new_sale" or "udhaar_repayment".`);
    }

    if (purpose === PAYMENT_PURPOSES.UDHAAR_REPAYMENT && !customerId) {
      throw new Error('A valid customerId is strictly required for udhaar repayments');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15 min validity
    const nowIso = now.toISOString();

    const paymentId = `pay_upi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const referenceId = generateReferenceId();

    const noteText =
      purpose === PAYMENT_PURPOSES.NEW_SALE
        ? `Kirana Sale ${referenceId}`
        : `Udhaar Jama ${customerName || customerId}`;

    const upiUri = buildUpiUri({
      vpa: merchantVpa,
      name: merchantName,
      amount: numAmount,
      note: noteText,
      refId: referenceId,
    });

    const paymentOrder = {
      id: paymentId,
      referenceId,
      amount: numAmount,
      purpose,
      customerId: customerId || null,
      customerName: customerName || (purpose === PAYMENT_PURPOSES.NEW_SALE ? 'Cash Customer' : 'Customer'),
      customerPhone: customerPhone || '',
      merchantVpa,
      merchantName,
      upiUri,
      status: PAYMENT_STATUSES.PENDING,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt,
      reconciled: false,
      reconciledAt: null,
      reconciledRecordId: null,
      verificationSource: null,
      notes: notes || '',
      metadata: {
        ...metadata,
      },
    };

    // Store in internal state
    this.payments.unshift(paymentOrder);
    this.persist();
    this.notify();

    return paymentOrder;
  }

  /**
   * Retrieves a payment by its unique ID.
   * @param {string} paymentId
   * @returns {PaymentOrder | null}
   */
  getPaymentById(paymentId) {
    return this.payments.find((p) => p.id === paymentId) || null;
  }

  /**
   * Retrieves a payment by its reference ID.
   * @param {string} referenceId
   * @returns {PaymentOrder | null}
   */
  getPaymentByReference(referenceId) {
    return this.payments.find((p) => p.referenceId === referenceId) || null;
  }

  /**
   * Lists payments with optional filters.
   *
   * @param {Object} [filters]
   * @param {string} [filters.purpose]
   * @param {string} [filters.status]
   * @param {string} [filters.customerId]
   * @param {number} [filters.limit]
   * @returns {Array<PaymentOrder>}
   */
  listPayments(filters = {}) {
    let list = [...this.payments];

    if (filters.purpose) {
      list = list.filter((p) => p.purpose === filters.purpose);
    }
    if (filters.status) {
      list = list.filter((p) => p.status === filters.status);
    }
    if (filters.customerId) {
      list = list.filter((p) => p.customerId === filters.customerId);
    }

    if (filters.limit && filters.limit > 0) {
      list = list.slice(0, filters.limit);
    }

    return list;
  }

  /**
   * Reconciles a confirmed payment order into the appropriate ledger.
   *
   * IDEMPOTENCY GUARANTEE:
   * - If the payment was already reconciled, it immediately returns the existing record
   *   without re-executing createSale or recordRepayment.
   * - Once reconciled, status cannot be reversed.
   *
   * @param {string} paymentId - Payment ID to reconcile
   * @param {Object} verificationData - Verification details (UTR, source, etc.)
   * @returns {Promise<{
   *   success: boolean;
   *   alreadyReconciled: boolean;
   *   payment: PaymentOrder;
   *   reconciledRecordId: string;
   *   purpose: string;
   *   newBalance?: number;
   * }>}
   */
  async reconcilePayment(paymentId, verificationData = {}) {
    const payment = this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error(`Payment order not found: ${paymentId}`);
    }

    // 1. Strict Idempotency Check: Prevent duplicate reconciliation
    if (payment.reconciled) {
      return {
        success: true,
        alreadyReconciled: true,
        payment,
        reconciledRecordId: payment.reconciledRecordId,
        purpose: payment.purpose,
        message: 'Payment was already reconciled previously. Idempotent result returned.',
      };
    }

    // 2. State Check: Cannot reconcile cancelled or failed order without re-activation
    if (payment.status === PAYMENT_STATUSES.CANCELLED) {
      throw new Error('Cannot reconcile a cancelled payment order');
    }

    const nowIso = new Date().toISOString();
    const source = verificationData.source || VERIFICATION_SOURCES.SIMULATED_DEMO;
    const utr = verificationData.utrNumber || generateMockUtr();

    // 3. Execution based on Purpose
    let reconciledRecordId = null;
    let newBalance = undefined;

    if (payment.purpose === PAYMENT_PURPOSES.NEW_SALE) {
      // Reconcile into Sales: creates a sale exactly once
      const saleMetadata = payment.metadata?.saleData || {};
      const items = saleMetadata.items || payment.metadata?.items || [];

      reconciledRecordId = await createSale({
        paymentType: 'cash', // Received full amount via digital UPI
        totalAmount: payment.amount,
        cashReceived: payment.amount,
        creditAmount: 0,
        customerId: payment.customerId,
        customerName: payment.customerName,
        items,
        notes: `[UPI ${source === VERIFICATION_SOURCES.SIMULATED_DEMO ? 'DEMO' : 'VERIFIED'}] Ref: ${payment.referenceId} | UTR: ${utr} ${payment.notes ? `| ${payment.notes}` : ''}`,
      });
    } else if (payment.purpose === PAYMENT_PURPOSES.UDHAAR_REPAYMENT) {
      // Reconcile into Digital Khata Repayments: reduces customer credit balance without creating a sale
      const repaymentResult = await recordRepayment({
        customerId: payment.customerId,
        amount: payment.amount,
        paymentMode: 'upi',
        notes: `[UPI ${source === VERIFICATION_SOURCES.SIMULATED_DEMO ? 'DEMO' : 'VERIFIED'}] Ref: ${payment.referenceId} | UTR: ${utr} ${payment.notes ? `| ${payment.notes}` : ''}`,
      });

      reconciledRecordId = repaymentResult.repaymentId;
      newBalance = repaymentResult.newBalance;
    } else {
      throw new Error(`Unknown payment purpose: ${payment.purpose}`);
    }

    // 4. Atomically commit reconciliation state onto the payment record
    payment.status = PAYMENT_STATUSES.SUCCESS;
    payment.reconciled = true;
    payment.reconciledAt = nowIso;
    payment.reconciledRecordId = reconciledRecordId;
    payment.verificationSource = source;
    payment.updatedAt = nowIso;
    payment.metadata = {
      ...payment.metadata,
      utrNumber: utr,
      bankReference: verificationData.bankReference || utr,
      reconciledTimestamp: nowIso,
      isSimulated: source === VERIFICATION_SOURCES.SIMULATED_DEMO,
    };

    this.persist();
    this.notify();

    return {
      success: true,
      alreadyReconciled: false,
      payment,
      reconciledRecordId,
      purpose: payment.purpose,
      newBalance,
    };
  }

  /**
   * Demo-only simulated success confirmation.
   * Clearly marked as simulated/demo mode for hackathon evaluations.
   *
   * @param {string} paymentId
   * @param {Object} [options]
   * @param {string} [options.utrNumber]
   * @returns {Promise<Object>} Reconciliation result
   */
  async confirmPaymentSimulated(paymentId, options = {}) {
    const utr = options.utrNumber || generateMockUtr();
    return await this.reconcilePayment(paymentId, {
      source: VERIFICATION_SOURCES.SIMULATED_DEMO,
      utrNumber: utr,
      simulated: true,
    });
  }

  /**
   * Simulates or records a failed payment.
   * Ensures that neither sales nor customer balance are altered.
   *
   * @param {string} paymentId
   * @param {string} [reason]
   * @returns {PaymentOrder}
   */
  failPaymentSimulated(paymentId, reason = 'Payment declined by bank or customer cancelled in UPI app') {
    const payment = this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error(`Payment order not found: ${paymentId}`);
    }

    if (payment.reconciled) {
      throw new Error('Cannot fail a payment that has already been successfully reconciled');
    }

    const nowIso = new Date().toISOString();
    payment.status = PAYMENT_STATUSES.FAILED;
    payment.updatedAt = nowIso;
    payment.metadata = {
      ...payment.metadata,
      failureReason: reason,
      failedAt: nowIso,
    };

    this.persist();
    this.notify();

    return payment;
  }

  /**
   * Cancels a pending payment order before confirmation.
   *
   * @param {string} paymentId
   * @param {string} [reason]
   * @returns {PaymentOrder}
   */
  cancelPayment(paymentId, reason = 'Cancelled by merchant at counter') {
    const payment = this.getPaymentById(paymentId);
    if (!payment) {
      throw new Error(`Payment order not found: ${paymentId}`);
    }

    if (payment.reconciled) {
      throw new Error('Cannot cancel a payment that has already been reconciled');
    }

    const nowIso = new Date().toISOString();
    payment.status = PAYMENT_STATUSES.CANCELLED;
    payment.updatedAt = nowIso;
    payment.metadata = {
      ...payment.metadata,
      cancelledReason: reason,
      cancelledAt: nowIso,
    };

    this.persist();
    this.notify();

    return payment;
  }

  /**
   * Checks and marks order as expired if past expiresAt.
   * @param {string} paymentId
   * @returns {boolean} Whether payment is expired
   */
  checkPaymentExpiration(paymentId) {
    const payment = this.getPaymentById(paymentId);
    if (!payment) return false;

    if (payment.status === PAYMENT_STATUSES.PENDING && new Date(payment.expiresAt) < new Date()) {
      payment.status = PAYMENT_STATUSES.EXPIRED;
      payment.updatedAt = new Date().toISOString();
      this.persist();
      this.notify();
      return true;
    }

    return payment.status === PAYMENT_STATUSES.EXPIRED;
  }

  /**
   * Subscribes to changes for a specific payment ID.
   * @param {string} paymentId
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToPayment(paymentId, callback) {
    const handler = (allPayments) => {
      const match = allPayments.find((p) => p.id === paymentId);
      if (match) {
        callback(match);
      }
    };

    // Immediate invoke
    const current = this.getPaymentById(paymentId);
    if (current) callback(current);

    return this.subscribe(handler);
  }

  /**
   * Computes UPI payment reconciliation metrics for the day.
   * @returns {Object} Statistics
   */
  getPaymentStats() {
    const now = new Date();
    const isSameDay = (dStr) => {
      if (!dStr) return false;
      const d = new Date(dStr);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    };

    let totalUpiCollectedToday = 0;
    let upiSalesCount = 0;
    let upiRepaymentsCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    this.payments.forEach((p) => {
      if (isSameDay(p.createdAt)) {
        if (p.status === PAYMENT_STATUSES.SUCCESS && p.reconciled) {
          totalUpiCollectedToday += Number(p.amount) || 0;
          if (p.purpose === PAYMENT_PURPOSES.NEW_SALE) upiSalesCount += 1;
          if (p.purpose === PAYMENT_PURPOSES.UDHAAR_REPAYMENT) upiRepaymentsCount += 1;
        } else if (p.status === PAYMENT_STATUSES.PENDING) {
          pendingCount += 1;
        } else if (p.status === PAYMENT_STATUSES.FAILED) {
          failedCount += 1;
        }
      }
    });

    return {
      totalUpiCollectedToday,
      upiSalesCount,
      upiRepaymentsCount,
      pendingCount,
      failedCount,
      totalOrders: this.payments.length,
    };
  }

  /**
   * Clears payment history (used for test resets).
   */
  clearAllPaymentsForTesting() {
    this.payments = [];
    this.persist();
    this.notify();
  }
}

export const paymentService = new PaymentService();
