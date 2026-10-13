/**
 * DukaanSathi — Payments Module Public API
 * Maintained by: Person 2 (UPI Payments & Reconciliation)
 *
 * Exported components and services for integration by Person 4 (POS / Khata).
 */

export { default as UPIPaymentModal } from './UPIPaymentModal';
export { default as UPIQrCard } from './UPIQrCard';
export { default as PaymentStatusBadge } from './PaymentStatusBadge';
export { default as PaymentHistoryDrawer } from './PaymentHistoryDrawer';

export {
  paymentService,
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
  VERIFICATION_SOURCES,
  DEFAULT_MERCHANT_CONFIG,
  buildUpiUri,
  generateReferenceId,
  generateMockUtr,
} from '../../services/paymentService';
