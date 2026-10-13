import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const CUSTOMERS_COLLECTION = 'customers';
const REPAYMENTS_COLLECTION = 'repayments';
const SALES_COLLECTION = 'sales';

/**
 * Subscribes to real-time customer updates.
 * @param {Function} onUpdate - callback receiving customers array
 * @param {Function} onError - callback receiving error
 * @returns {Function} unsubscribe function
 */
export function subscribeToCustomers(onUpdate, onError) {
  const q = query(collection(db, CUSTOMERS_COLLECTION), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const customers = [];
      snapshot.forEach((d) => {
        customers.push({ id: d.id, ...d.data() });
      });
      onUpdate(customers);
    },
    (err) => {
      console.error('[subscribeToCustomers error]', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Creates a new customer with zero initial outstanding balance.
 * @param {Object} data - { name, phone, address }
 * @returns {Promise<string>} created document ID
 */
export async function createCustomer({ name, phone = '', address = '' }) {
  if (!name || !name.trim()) {
    throw new Error('Customer name is required');
  }

  const newDoc = {
    name: name.trim(),
    phone: phone.trim(),
    address: address.trim(),
    outstandingCredit: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, CUSTOMERS_COLLECTION), newDoc);
  return ref.id;
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

  const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  const repaymentRef = doc(collection(db, REPAYMENTS_COLLECTION));

  let finalBalance = 0;

  await runTransaction(db, async (transaction) => {
    const custSnap = await transaction.get(customerRef);
    if (!custSnap.exists()) {
      throw new Error('Customer record not found');
    }

    const currentData = custSnap.data();
    const currentCredit = Number(currentData.outstandingCredit) || 0;
    finalBalance = Math.max(0, currentCredit - paymentAmount);

    // 1. Record repayment event
    transaction.set(repaymentRef, {
      customerId,
      customerName: currentData.name,
      amount: paymentAmount,
      paymentMode,
      notes: notes.trim(),
      createdAt: serverTimestamp(),
    });

    // 2. Atomically update customer outstanding balance
    transaction.update(customerRef, {
      outstandingCredit: finalBalance,
      updatedAt: serverTimestamp(),
    });
  });

  return {
    repaymentId: repaymentRef.id,
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

  // Query credit sales for this customer
  const salesQuery = query(
    collection(db, SALES_COLLECTION),
    where('customerId', '==', customerId)
  );

  // Query repayments for this customer
  const repaymentsQuery = query(
    collection(db, REPAYMENTS_COLLECTION),
    where('customerId', '==', customerId)
  );

  const [salesSnap, repaymentsSnap] = await Promise.all([
    getDocs(salesQuery),
    getDocs(repaymentsQuery),
  ]);

  const ledger = [];

  salesSnap.forEach((d) => {
    const data = d.data();
    // Only include if there was credit given
    if (data.creditAmount > 0) {
      ledger.push({
        id: d.id,
        type: 'credit_purchase',
        title: 'उधार सामान (Credit Purchase)',
        amount: data.creditAmount,
        totalSaleAmount: data.totalAmount,
        cashPaid: data.cashReceived || 0,
        items: data.items || [],
        notes: data.notes || '',
        createdAt: data.createdAt,
      });
    }
  });

  repaymentsSnap.forEach((d) => {
    const data = d.data();
    ledger.push({
      id: d.id,
      type: 'repayment',
      title: 'जमा राशि (Payment Received)',
      amount: data.amount,
      paymentMode: data.paymentMode || 'cash',
      notes: data.notes || '',
      createdAt: data.createdAt,
    });
  });

  // Sort by createdAt descending
  ledger.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (new Date(a.createdAt || 0)).getTime();
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (new Date(b.createdAt || 0)).getTime();
    return timeB - timeA;
  });

  return ledger;
}
