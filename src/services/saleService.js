import { localStore } from './localStore';

/**
 * Subscribes to real-time sales feed (ordered newest first).
 * @param {Function} onUpdate - callback receiving sales array
 * @param {Function} onError - callback receiving error
 * @returns {Function} unsubscribe function
 */
export function subscribeToSales(onUpdate, onError) {
  try {
    return localStore.subscribe((data) => {
      const sorted = [...data.sales].sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      onUpdate(sorted);
    });
  } catch (err) {
    console.error('[subscribeToSales error]', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Atomically records a sale in local store:
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

  const now = new Date().toISOString();
  const saleId = `sale-${Date.now()}`;
  const saleNumber = `BILL-${Date.now().toString().slice(-6)}`;

  // 1. If customer credit is given, update customer outstanding credit
  let resolvedCustomerName = customerName;
  if (customerId && credit > 0) {
    const customer = localStore.data.customers.find((c) => c.id === customerId);
    if (!customer) {
      throw new Error('Selected customer record does not exist');
    }
    customer.outstandingCredit = (Number(customer.outstandingCredit) || 0) + credit;
    customer.updatedAt = now;
    resolvedCustomerName = customer.name;
  }

  // 2. Decrement stock for inventory products
  for (const item of items) {
    if (item.productId) {
      const product = localStore.data.products.find((p) => p.id === item.productId);
      if (product) {
        const qty = Number(item.quantity) || 1;
        product.stockQuantity = Math.max(0, (Number(product.stockQuantity) || 0) - qty);
        product.updatedAt = now;
      }
    }
  }

  // 3. Create sale record
  const newSale = {
    id: saleId,
    saleNumber,
    paymentType,
    totalAmount: total,
    cashReceived: cash,
    creditAmount: credit,
    customerId: customerId || null,
    customerName: resolvedCustomerName || (paymentType === 'cash' ? 'Cash Customer' : 'Customer'),
    items: items.map((it) => ({
      productId: it.productId || null,
      productName: it.productName || 'Kirana Item',
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      subtotal: Number(it.subtotal) || 0,
    })),
    notes: (notes || '').trim(),
    createdAt: now,
  };

  localStore.data.sales.unshift(newSale);
  localStore.save();

  return saleId;
}
