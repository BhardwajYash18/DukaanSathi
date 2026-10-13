# DukaanSathi — UPI Payments & Reconciliation Integration Guide

**Owner:** Person 2 (UPI Payments & Reconciliation)  
**Target Audience:** Person 4 (POS & Digital Khata Integration), Backend Developers, and Hackathon Judges  
**Branch:** `feature/upi`

---

## 1. Executive Summary

In Indian kirana stores, shopkeepers commonly use static Merchant UPI QR codes (via PhonePe Business, Paytm for Business, BharatPe, or Google Pay for Business soundboxes). 

This module provides a **reliable, robust, and idempotent UPI payment and reconciliation subsystem** that:
1. Supports two distinct business workflows:
   - **`new_sale`**: Reconciles digital checkout directly into the store sales ledger.
   - **`udhaar_repayment`**: Reconciles digital customer repayment into the customer's Khata balance without recording a duplicate sale.
2. Generates standard NPCI dynamic UPI deep-links and vector QR codes.
3. Provides bulletproof **idempotency protection** to prevent replay attacks or duplicate ledger entries.
4. Isolates a clearly marked **Demo Simulation Mode** for hackathon evaluation while defining a strict server-side webhook integration boundary for production payment gateways.

---

## 2. Security & Accounting Principles

> [!CAUTION]
> **Core Rule 1: A customer scanning the QR or claiming "I paid" is NEVER proof of payment.**  
> In retail kirana operations, customers often attempt to deceive merchants with fake payment screenshots or simulated confirmation apps. Payment confirmation must come either from:
> - Verified soundbox/SMS confirmation observed by the shopkeeper.
> - An authenticated server-side webhook from the payment provider (PhonePe, Paytm, Setu, or Razorpay).

> [!IMPORTANT]
> **Core Rule 2: Zero Client-Side Provider Secrets.**  
> Never embed provider API secret keys or private webhook secrets in client-side React code. Real provider verification must occur server-side.

> [!NOTE]
> **Core Rule 3: Strict Purpose Separation.**  
> Udhaar repayments **must never** count as new sales, as doing so would inflate daily revenue metrics. Repayments only reduce customer credit and increase cash/digital collection totals.

---

## 3. Architecture & Data Model

### Payment Order Model (`PaymentOrder`)

All pending and completed UPI payments are tracked with the following schema:

```typescript
interface PaymentOrder {
  id: string;                      // Unique ID: e.g. "pay_upi_1728812345678_7a2b"
  referenceId: string;             // Idempotency key: e.g. "DS-UPI-1728812345678-7A2B"
  amount: number;                  // Positive amount in INR
  purpose: 'new_sale' | 'udhaar_repayment';
  customerId: string | null;       // Mandatory if udhaar_repayment
  customerName: string;            // Display name
  customerPhone?: string;          // Optional phone
  merchantVpa: string;             // e.g. "dukaansathi.kirana@phonepe"
  merchantName: string;            // e.g. "DukaanSathi Kirana Store"
  upiUri: string;                  // NPCI URI: "upi://pay?pa=...&am=...&tr=..."
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'expired';
  createdAt: string;               // ISO 8601 timestamp
  updatedAt: string;
  expiresAt: string;               // 15-minute validity window
  reconciled: boolean;             // True only after atomic ledger write
  reconciledAt: string | null;
  reconciledRecordId: string | null; // Created saleId or repaymentId
  verificationSource: 'simulated_demo' | 'provider_webhook' | 'merchant_manual';
  notes?: string;
  metadata?: {
    items?: Array<{ productId: string; productName: string; quantity: number; price: number; subtotal: number }>;
    utrNumber?: string;            // Bank 12-digit UTR
    bankReference?: string;
    failureReason?: string;
  };
}
```

---

## 4. NPCI UPI URI Specification

The generated dynamic QR code complies with NPCI UPI 2.0 specifications:

```
upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn={note}&tr={referenceId}&mc=5411
```

- **`pa`**: Merchant Virtual Payment Address (e.g. `dukaansathi.kirana@phonepe`).
- **`pn`**: Merchant display name.
- **`am`**: Formatted amount with 2 decimal places (e.g. `245.00`).
- **`cu`**: Fixed currency `INR`.
- **`tn`**: Transaction purpose memo.
- **`tr`**: Unique transaction reference (idempotency key, up to 35 chars).
- **`mc`**: Merchant Category Code (`5411` for Grocery/Kirana).

---

## 5. Reconciliation & Idempotency Guarantees

The `paymentService.reconcilePayment(paymentId, verificationData)` method enforces strict transactional invariants:

```
                  ┌────────────────────────┐
                  │ Pending Payment Order  │
                  └───────────┬────────────┘
                              │
                    reconcilePayment()
                              │
               ┌──────────────┴──────────────┐
               │ Is payment.reconciled true? │
               └──────────────┬──────────────┘
                     YES      │      NO
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
[Return Existing Result]                  [Check Order Purpose]
(Idempotent return, zero ledger changes)            │
                                         ┌──────────┴──────────┐
                                         ▼                     ▼
                                    'new_sale'        'udhaar_repayment'
                                         │                     │
                                   createSale()         recordRepayment()
                                         │                     │
                               Creates sale record    Reduces customer credit
                                         │            Creates repayment record
                                         └──────────┬──────────┘
                                                    │
                                         Mark payment.reconciled = true
                                         Mark payment.status = 'success'
                                         Store reconciledRecordId & UTR
```

---

## 6. Handoff to Person 4: UI Integration Guide

Person 4 can seamlessly integrate the UPI payment workflow into **New Sale (POS)** and **Digital Khata** without writing low-level payment or QR logic.

### 6.1. Installation & Imports

```jsx
import {
  UPIPaymentModal,
  PaymentHistoryDrawer,
  PAYMENT_PURPOSES,
} from './components/payments';
```

### 6.2. Integrating with New Sale (POS)

When the cashier chooses **UPI** as the payment method in `SalesEntryView`:

```jsx
const [showUpiModal, setShowUpiModal] = useState(false);

// Inside SalesEntryView when cashier clicks "Checkout via UPI":
<UPIPaymentModal
  isOpen={showUpiModal}
  onClose={() => setShowUpiModal(false)}
  amount={totalBillAmount}
  purpose={PAYMENT_PURPOSES.NEW_SALE}
  customerName={selectedCustomer?.name || 'Cash Customer'}
  metadata={{
    items: cartItems.map(it => ({
      productId: it.productId,
      productName: it.productName,
      quantity: it.quantity,
      price: it.price,
      subtotal: it.subtotal,
    })),
  }}
  onSuccess={(result) => {
    // result.reconciledRecordId contains the newly created saleId
    console.log('Sale created successfully via UPI:', result.reconciledRecordId);
    clearCart();
    setShowUpiModal(false);
    showSuccessReceipt(result.reconciledRecordId);
  }}
/>
```

### 6.3. Integrating with Digital Khata (Udhaar Repayment)

When a customer pays down their outstanding balance via UPI in `KhataView`:

```jsx
<UPIPaymentModal
  isOpen={showRepaymentUpiModal}
  onClose={() => setShowRepaymentUpiModal(false)}
  amount={enteredRepaymentAmount}
  purpose={PAYMENT_PURPOSES.UDHAAR_REPAYMENT}
  customerId={selectedCustomer.id}
  customerName={selectedCustomer.name}
  customerPhone={selectedCustomer.phone}
  notes="Khata settlement via UPI"
  onSuccess={(result) => {
    // result.reconciledRecordId contains repaymentId
    // result.newBalance contains updated customer credit balance
    console.log('Udhaar payment reconciled. New balance:', result.newBalance);
    setShowRepaymentUpiModal(false);
  }}
/>
```

### 6.4. Integrating the Reconciliation Audit Drawer

To show shopkeepers an audit log of all digital transactions:

```jsx
<PaymentHistoryDrawer
  isOpen={showAuditDrawer}
  onClose={() => setShowAuditDrawer(false)}
/>
```

---

## 7. Production Gateway Integration Boundary

In production, DukaanSathi will integrate with an RBI/NPCI-authorized merchant aggregator (such as **Setu UPI DeepLinks**, **PhonePe PG**, or **Paytm Business Webhooks**).

### Production Architecture

```
[Customer Mobile] ---> Scans QR / Pays via UPI App
                                │
[NPCI / Bank]        ---> Webhook dispatched
                                │
[Firebase Cloud Function / Server Endpoint: POST /api/webhooks/upi]
        │
        ├── 1. Verify HMAC-SHA256 signature using provider secret
        ├── 2. Extract client reference (tr) & bank UTR
        ├── 3. Query Firestore payments collection by referenceId
        └── 4. Invoke reconcilePayment() inside Firestore runTransaction()
```

### Server-Side Webhook Verification Specification

```javascript
// Example server-side cloud function (Node.js / Express):
import crypto from 'node:crypto';

export async function handleProviderWebhook(req, res) {
  const signature = req.headers['x-provider-signature'];
  const rawBody = req.rawBody;
  const webhookSecret = process.env.UPI_WEBHOOK_SECRET;

  // 1. Verify HMAC-SHA256 Signature
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const { referenceId, utr, status, amount } = req.body;

  if (status === 'SUCCESS') {
    // 2. Reconcile atomically
    await paymentService.reconcilePayment(referenceId, {
      source: 'provider_webhook',
      utrNumber: utr,
    });
  }

  return res.status(200).json({ received: true });
}
```

---

## 8. Automated Test Summary

The test suite in `tests/paymentService.test.js` exercises all critical business requirements:

| # | Test Scenario | Result |
| :--- | :--- | :--- |
| 1 | NPCI URI builder generates valid deep links | **PASSED** |
| 2 | Creates unique pending order for `new_sale` | **PASSED** |
| 3 | Rejects invalid amounts and missing customer for repayment | **PASSED** |
| 4 | Reconciles new sale into sales collection exactly once | **PASSED** |
| 5 | Blocks duplicate confirmation on new sale (idempotency) | **PASSED** |
| 6 | Reduces customer balance on udhaar repayment without creating a sale | **PASSED** |
| 7 | Blocks duplicate confirmation on repayment (idempotency) | **PASSED** |
| 8 | Marks failed payments with zero ledger impact | **PASSED** |
| 9 | Handles cancelled payment orders cleanly | **PASSED** |
| 10 | Aggregates daily digital metrics accurately | **PASSED** |

Run tests anytime with:
```bash
node tests/paymentService.test.js
```
