/**
 * DukaanSathi — UPI Payment & Reconciliation Test Suite
 * Author: Person 2 (UPI Payments & Reconciliation)
 *
 * Scenarios Tested:
 * 1. Creation of unique pending payment orders with standard NPCI UPI URIs.
 * 2. Reconciliation of new sale payment -> creates sale record exactly once.
 * 3. Duplicate confirmation attempt on new sale -> blocked (idempotency verified).
 * 4. Reconciliation of partial udhaar repayment -> reduces balance, no sale created.
 * 5. Reconciliation of full udhaar repayment -> reduces balance to zero, no sale created.
 * 6. Duplicate confirmation attempt on repayment -> blocked, balance not altered twice.
 * 7. Failed payment event -> no ledger or balance modifications.
 * 8. Cancelled payment event -> safely cancelled with zero ledger impact.
 * 9. Input validation -> rejection of non-positive amounts and missing customer references.
 */

import assert from 'node:assert';
import {
  paymentService,
  PAYMENT_PURPOSES,
  PAYMENT_STATUSES,
  buildUpiUri,
  generateReferenceId,
} from '../src/services/paymentService.js';
import { localStore } from '../src/services/localStore.js';

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✕ [FAIL] ${name}`);
    console.error(err);
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`✓ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`✕ [FAIL] ${name}`);
    console.error(err);
  }
}

console.log('\n--- STARTING DUKAANSATHI UPI PAYMENT & RECONCILIATION TESTS ---\n');

// Reset database and payments before tests
localStore.resetToDefaults();
paymentService.clearAllPaymentsForTesting();

// 1. NPCI UPI URI Builder Test
runTest('buildUpiUri generates valid NPCI-compliant deep link', () => {
  const uri = buildUpiUri({
    vpa: 'dukaansathi.kirana@phonepe',
    name: 'DukaanSathi Kirana',
    amount: 250.5,
    note: 'Kirana Sale Test',
    refId: 'DS-UPI-TEST-123',
  });

  assert(uri.startsWith('upi://pay?'), 'URI must begin with upi://pay?');
  assert(uri.includes('pa=dukaansathi.kirana%40phonepe') || uri.includes('pa=dukaansathi.kirana@phonepe'), 'Contains VPA');
  assert(uri.includes('am=250.50'), 'Contains formatted amount with two decimals');
  assert(uri.includes('cu=INR'), 'Currency is INR');
  assert(uri.includes('tr=DS-UPI-TEST-123'), 'Contains transaction reference');
});

// 2. Pending Payment Creation for New Sale
runTest('createPaymentOrder creates unique pending order for new_sale', () => {
  const order = paymentService.createPaymentOrder({
    amount: 450,
    purpose: PAYMENT_PURPOSES.NEW_SALE,
    customerName: 'Cash Customer',
    metadata: {
      items: [{ productId: 'prod-1', productName: 'Atta 5kg', quantity: 1, price: 245, subtotal: 245 }],
    },
  });

  assert(order.id.startsWith('pay_upi_'), 'Order ID has correct prefix');
  assert(order.referenceId.startsWith('DS-UPI-'), 'Reference ID has correct prefix');
  assert.strictEqual(order.amount, 450, 'Amount matches');
  assert.strictEqual(order.purpose, PAYMENT_PURPOSES.NEW_SALE, 'Purpose matches');
  assert.strictEqual(order.status, PAYMENT_STATUSES.PENDING, 'Initial status is pending');
  assert.strictEqual(order.reconciled, false, 'Initial reconciled is false');
  assert(order.upiUri.includes('am=450.00'), 'UPI URI reflects amount');
});

// 3. Validation: Rejects invalid amounts and missing customer on repayment
runTest('createPaymentOrder validates inputs strictly', () => {
  assert.throws(() => {
    paymentService.createPaymentOrder({ amount: 0, purpose: PAYMENT_PURPOSES.NEW_SALE });
  }, /amount greater than zero/);

  assert.throws(() => {
    paymentService.createPaymentOrder({ amount: -50, purpose: PAYMENT_PURPOSES.NEW_SALE });
  }, /amount greater than zero/);

  assert.throws(() => {
    paymentService.createPaymentOrder({ amount: 100, purpose: 'invalid_purpose' });
  }, /Invalid payment purpose/);

  assert.throws(() => {
    paymentService.createPaymentOrder({
      amount: 100,
      purpose: PAYMENT_PURPOSES.UDHAAR_REPAYMENT,
      customerId: null, // Missing customerId for repayment!
    });
  }, /customerId is strictly required/);
});

// 4. Reconciliation of New Sale Payment
await runAsyncTest('reconcilePayment creates sale record exactly once for new_sale', async () => {
  const salesBeforeCount = localStore.getSales().length;

  const order = paymentService.createPaymentOrder({
    amount: 350,
    purpose: PAYMENT_PURPOSES.NEW_SALE,
    customerName: 'Aarav Patel',
    metadata: {
      items: [
        { productId: 'prod-4', productName: 'Sugar 1kg', quantity: 2, price: 48, subtotal: 96 },
      ],
    },
  });

  const res = await paymentService.confirmPaymentSimulated(order.id, {
    utrNumber: 'UTR492019482019',
  });

  assert.strictEqual(res.success, true, 'Reconciliation succeeds');
  assert.strictEqual(res.alreadyReconciled, false, 'First reconciliation is not duplicate');
  assert(res.reconciledRecordId.startsWith('sale-'), 'Created a valid sale record');

  // Verify that the sale exists in sales collection
  const salesAfter = localStore.getSales();
  assert.strictEqual(salesAfter.length, salesBeforeCount + 1, 'Exactly one sale added');

  const createdSale = salesAfter.find((s) => s.id === res.reconciledRecordId);
  assert(createdSale, 'Sale record found in localStore');
  assert.strictEqual(createdSale.totalAmount, 350, 'Sale amount is 350');
  assert.strictEqual(createdSale.cashReceived, 350, 'Full payment collected');

  // Verify payment order status
  const updatedOrder = paymentService.getPaymentById(order.id);
  assert.strictEqual(updatedOrder.status, PAYMENT_STATUSES.SUCCESS);
  assert.strictEqual(updatedOrder.reconciled, true);
  assert.strictEqual(updatedOrder.reconciledRecordId, res.reconciledRecordId);
  assert.strictEqual(updatedOrder.metadata.utrNumber, 'UTR492019482019');
});

// 5. Idempotency on New Sale: Duplicate confirmation does not recreate sale
await runAsyncTest('reconcilePayment blocks duplicate confirmation on new_sale (idempotency)', async () => {
  const order = paymentService.createPaymentOrder({
    amount: 120,
    purpose: PAYMENT_PURPOSES.NEW_SALE,
  });

  const firstResult = await paymentService.confirmPaymentSimulated(order.id);
  const salesCountAfterFirst = localStore.getSales().length;

  // Attempt second confirmation with same order ID
  const duplicateResult = await paymentService.confirmPaymentSimulated(order.id);
  const salesCountAfterSecond = localStore.getSales().length;

  assert.strictEqual(duplicateResult.success, true, 'Returns success');
  assert.strictEqual(duplicateResult.alreadyReconciled, true, 'Flags alreadyReconciled as true');
  assert.strictEqual(duplicateResult.reconciledRecordId, firstResult.reconciledRecordId, 'Returns same record ID');
  assert.strictEqual(salesCountAfterSecond, salesCountAfterFirst, 'No additional sale was created');
});

// 6. Reconciliation of Partial Udhaar Repayment
await runAsyncTest('reconcilePayment reduces customer balance on udhaar_repayment without creating a sale', async () => {
  // cust-1 is Ramesh Sharma with outstandingCredit: 850 in defaults
  const customer = localStore.getCustomers().find((c) => c.id === 'cust-1');
  assert(customer, 'Customer Ramesh Sharma exists');
  const initialBalance = Number(customer.outstandingCredit);
  const repaymentAmount = 300;

  const salesCountBefore = localStore.getSales().length;
  const repaymentsCountBefore = localStore.getRepayments().length;

  const order = paymentService.createPaymentOrder({
    amount: repaymentAmount,
    purpose: PAYMENT_PURPOSES.UDHAAR_REPAYMENT,
    customerId: 'cust-1',
    customerName: customer.name,
  });

  const res = await paymentService.confirmPaymentSimulated(order.id, {
    utrNumber: 'UTR883920194820',
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.alreadyReconciled, false);
  assert(res.reconciledRecordId.startsWith('repay-'), 'Created repayment record ID');
  assert.strictEqual(res.newBalance, initialBalance - repaymentAmount, 'New balance is reduced by 300');

  // Verify customer balance updated in store
  const updatedCustomer = localStore.getCustomers().find((c) => c.id === 'cust-1');
  assert.strictEqual(updatedCustomer.outstandingCredit, initialBalance - repaymentAmount);

  // CRITICAL REQUIREMENT: Udhaar repayment must NOT create a new sale!
  const salesCountAfter = localStore.getSales().length;
  assert.strictEqual(salesCountAfter, salesCountBefore, 'No sale record was created for repayment');

  // Must increase repayments collection
  const repaymentsCountAfter = localStore.getRepayments().length;
  assert.strictEqual(repaymentsCountAfter, repaymentsCountBefore + 1, 'Exactly one repayment record created');
});

// 7. Duplicate Confirmation on Udhaar Repayment is Blocked
await runAsyncTest('reconcilePayment blocks duplicate confirmation on repayment (idempotency)', async () => {
  const customer = localStore.getCustomers().find((c) => c.id === 'cust-1');
  const balanceBefore = Number(customer.outstandingCredit);

  const order = paymentService.createPaymentOrder({
    amount: 150,
    purpose: PAYMENT_PURPOSES.UDHAAR_REPAYMENT,
    customerId: 'cust-1',
    customerName: customer.name,
  });

  await paymentService.confirmPaymentSimulated(order.id);
  const balanceAfterFirst = localStore.getCustomers().find((c) => c.id === 'cust-1').outstandingCredit;
  assert.strictEqual(balanceAfterFirst, balanceBefore - 150);

  // Trigger duplicate confirmation
  const duplicateRes = await paymentService.confirmPaymentSimulated(order.id);
  const balanceAfterSecond = localStore.getCustomers().find((c) => c.id === 'cust-1').outstandingCredit;

  assert.strictEqual(duplicateRes.alreadyReconciled, true, 'Detected duplicate reconciliation');
  assert.strictEqual(balanceAfterSecond, balanceAfterFirst, 'Customer balance was not deducted a second time');
});

// 8. Failed Payment Event Handling
runTest('failPaymentSimulated marks order as failed with zero ledger impact', () => {
  const salesCountBefore = localStore.getSales().length;
  const customer = localStore.getCustomers().find((c) => c.id === 'cust-1');
  const balanceBefore = customer.outstandingCredit;

  const order = paymentService.createPaymentOrder({
    amount: 500,
    purpose: PAYMENT_PURPOSES.NEW_SALE,
  });

  const failedOrder = paymentService.failPaymentSimulated(order.id, 'User declined on PhonePe app');

  assert.strictEqual(failedOrder.status, PAYMENT_STATUSES.FAILED);
  assert.strictEqual(failedOrder.reconciled, false);
  assert.strictEqual(failedOrder.metadata.failureReason, 'User declined on PhonePe app');

  // Verify zero ledger impact
  assert.strictEqual(localStore.getSales().length, salesCountBefore, 'No sales created');
  assert.strictEqual(localStore.getCustomers().find((c) => c.id === 'cust-1').outstandingCredit, balanceBefore, 'Balances untouched');
});

// 9. Cancelled Payment Event Handling
runTest('cancelPayment marks order as cancelled before reconciliation', () => {
  const order = paymentService.createPaymentOrder({
    amount: 200,
    purpose: PAYMENT_PURPOSES.NEW_SALE,
  });

  const cancelled = paymentService.cancelPayment(order.id, 'Customer changed mind and paid cash');

  assert.strictEqual(cancelled.status, PAYMENT_STATUSES.CANCELLED);
  assert.strictEqual(cancelled.reconciled, false);
});

// 10. Payment Stats and Daily Aggregates
runTest('getPaymentStats accurately computes daily digital totals', () => {
  const stats = paymentService.getPaymentStats();
  assert(typeof stats.totalUpiCollectedToday === 'number', 'totalUpiCollectedToday is a number');
  assert(stats.totalUpiCollectedToday > 0, 'Reflects today verified payments');
  assert(stats.upiSalesCount >= 2, 'Counts reconciled sales');
  assert(stats.upiRepaymentsCount >= 2, 'Counts reconciled repayments');
});

console.log(`\n--- TEST RESULTS: ${passed} / ${total} TESTS PASSED ---\n`);

if (passed === total) {
  console.log('ALL UPI PAYMENT AND RECONCILIATION SPECIFICATIONS VERIFIED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error(`FAILED: ${total - passed} tests failed.`);
  process.exit(1);
}
