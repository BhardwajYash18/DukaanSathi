import { localStore } from './localStore';

/**
 * Subscribes to customer updates.
 * @param {Function} onUpdate - callback receiving customers array
 * @param {Function} onError - callback receiving error
 * @returns {Function} unsubscribe function
 */
export function subscribeToCustomers(onUpdate, onError) {
  try {
    return localStore.subscribe((data) => {
      // Sort alphabetically by name
      const sorted = [...data.customers].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );
      onUpdate(sorted);
    });
  } catch (err) {
    console.error('[subscribeToCustomers error]', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Creates a new customer with zero initial outstanding balance.
 * @param {Object} data - { name, phone, address }
 * @returns {Promise<string>} created customer ID
 */
export async function createCustomer({ name, phone = '', address = '' }) {
  if (!name || !name.trim()) {
    throw new Error('Customer name is required');
  }

  const now = new Date().toISOString();
  const newCustomer = {
    id: `cust-${Date.now()}`,
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    outstandingCredit: 0,
    createdAt: now,
    updatedAt: now,
  };

  localStore.data.customers.push(newCustomer);
  localStore.save();
  return newCustomer.id;
}

/**
 * Records a customer repayment (Khata Jama) atomically.
 * Decreases the customer's outstandingCredit and creates a repayment log.
 * @param {Object} params - { customerId, amount, paymentMode, notes }
 * @returns {Promise<{ repaymentId: string, newBalance: number }>}
 */
export async function recordRepayment({
  customerId,
  amount,
  paymentMode = 'cash',
  notes = '',
}) {
  const paymentAmount = Number(amount);
  if (!customerId) throw new Error('Customer ID is required');
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Repayment amount must be greater than zero');
  }

  const customer = localStore.data.customers.find((c) => c.id === customerId);
  if (!customer) {
    throw new Error('Customer record not found');
  }

  const currentCredit = Number(customer.outstandingCredit) || 0;
  const finalBalance = Math.max(0, currentCredit - paymentAmount);
  const now = new Date().toISOString();

  const repaymentId = `repay-${Date.now()}`;
  const newRepayment = {
    id: repaymentId,
    customerId,
    customerName: customer.name,
    amount: paymentAmount,
    paymentMode,
    notes: (notes || '').trim(),
    createdAt: now,
  };

  // Atomically update customer balance and record repayment
  customer.outstandingCredit = finalBalance;
  customer.updatedAt = now;
  localStore.data.repayments.unshift(newRepayment);

  localStore.save();

  return {
    repaymentId,
    newBalance: finalBalance,
  };
}

/**
 * Fetches combined ledger history (credit sales and repayments) for a customer.
 * @param {string} customerId
 * @returns {Promise<Array>} ledger entries sorted newest first
 */
export async function getCustomerLedger(customerId) {
  if (!customerId) return [];

  const customerSales = localStore.data.sales.filter(
    (s) => s.customerId === customerId && Number(s.creditAmount) > 0
  );

  const customerRepayments = localStore.data.repayments.filter(
    (r) => r.customerId === customerId
  );

  const ledger = [];

  customerSales.forEach((s) => {
    ledger.push({
      id: s.id,
      type: 'credit_purchase',
      title: 'उधार सामान (Credit Purchase)',
      amount: s.creditAmount,
      totalSaleAmount: s.totalAmount,
      cashPaid: s.cashReceived || 0,
      items: s.items || [],
      notes: s.notes || '',
      createdAt: s.createdAt,
    });
  });

  customerRepayments.forEach((r) => {
    ledger.push({
      id: r.id,
      type: 'repayment',
      title: 'जमा राशि (Payment Received)',
      amount: r.amount,
      paymentMode: r.paymentMode || 'cash',
      notes: r.notes || '',
      createdAt: r.createdAt,
    });
  });

  ledger.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return ledger;
}
