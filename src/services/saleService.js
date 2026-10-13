import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const SALES_COLLECTION = 'sales';
const PRODUCTS_COLLECTION = 'products';
const CUSTOMERS_COLLECTION = 'customers';

/**
 * Subscribes to real-time sales feed (ordered newest first).
 * @param {Function} onUpdate - callback receiving sales array
 * @param {Function} onError - callback receiving error
 * @returns {Function} unsubscribe function
 */
export function subscribeToSales(onUpdate, onError) {
  const q = query(collection(db, SALES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const sales = [];
      snapshot.forEach((d) => {
        sales.push({ id: d.id, ...d.data() });
      });
      onUpdate(sales);
    },
    (err) => {
      console.error('[subscribeToSales error]', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Atomically records a sale:
 * 1. Decrements stock for inventoried items.
 * 2. Updates customer's outstanding credit if credit is given.
 * 3. Saves the sale document.
 *
 * @param {Object} saleData
 * @param {string} saleData.paymentType - 'cash' | 'credit' | 'partial'
 * @param {number} saleData.totalAmount
 * @param {number} saleData.cashReceived
 * @param {number} saleData.creditAmount
 * @param {string} [saleData.customerId]
 * @param {string} [saleData.customerName]
 * @param {Array} saleData.items - [{ productId, productName, quantity, price, subtotal }]
 * @param {string} [saleData.notes]
 * @returns {Promise<string>} sale document ID
 */
export async function createSale({
  paymentType = 'cash',
  totalAmount,
  cashReceived = 0,
  creditAmount = 0,
  customerId = null,
  customerName = '',
  items = [],
  notes = '',
}) {
  const total = Number(totalAmount) || 0;
  const cash = Number(cashReceived) || 0;
  const credit = Number(creditAmount) || 0;

  if (total <= 0) {
    throw new Error('Total sale amount must be greater than zero');
  }

  if (credit > 0 && !customerId) {
    throw new Error('A customer must be selected for credit (udhar) sales');
  }

  if (Math.abs(cash + credit - total) > 0.01) {
    throw new Error('Cash received plus credit amount must equal the total sale amount');
  }

  const saleDocRef = doc(collection(db, SALES_COLLECTION));
  const saleNumber = `BILL-${Date.now().toString().slice(-6)}`;

  await runTransaction(db, async (transaction) => {
    // 1. If customer credit is involved, read customer record first
    let currentCustomerSnap = null;
    let customerRef = null;
    if (customerId && credit > 0) {
      customerRef = doc(db, CUSTOMERS_COLLECTION, customerId);
      currentCustomerSnap = await transaction.get(customerRef);
      if (!currentCustomerSnap.exists()) {
        throw new Error('Selected customer record does not exist');
      }
    }

    // 2. Read products if any item has a productId to decrement stock
    const productUpdates = [];
    for (const item of items) {
      if (item.productId) {
        const prodRef = doc(db, PRODUCTS_COLLECTION, item.productId);
        const prodSnap = await transaction.get(prodRef);
        if (prodSnap.exists()) {
          const prodData = prodSnap.data();
          const currentStock = Number(prodData.stockQuantity) || 0;
          const newStock = Math.max(0, currentStock - Number(item.quantity || 1));
          productUpdates.push({ ref: prodRef, newStock });
        }
      }
    }

    // 3. Perform Writes
    // Apply product stock updates
    for (const pUp of productUpdates) {
      transaction.update(pUp.ref, {
        stockQuantity: pUp.newStock,
        updatedAt: serverTimestamp(),
      });
    }

    // Apply customer credit update
    if (customerRef && currentCustomerSnap) {
      const currentOutstanding = Number(currentCustomerSnap.data().outstandingCredit) || 0;
      transaction.update(customerRef, {
        outstandingCredit: currentOutstanding + credit,
        updatedAt: serverTimestamp(),
      });
    }

    // Save sale record
    transaction.set(saleDocRef, {
      saleNumber,
      paymentType,
      totalAmount: total,
      cashReceived: cash,
      creditAmount: credit,
      customerId: customerId || null,
      customerName: customerName || (currentCustomerSnap ? currentCustomerSnap.data().name : 'Cash Customer'),
      items,
      notes: notes.trim(),
      createdAt: serverTimestamp(),
    });
  });

  return saleDocRef.id;
}
