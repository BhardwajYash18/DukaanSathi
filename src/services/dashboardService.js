import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isToday } from '../utils/formatters';

const SALES_COLLECTION = 'sales';
const REPAYMENTS_COLLECTION = 'repayments';
const CUSTOMERS_COLLECTION = 'customers';
const PRODUCTS_COLLECTION = 'products';

/**
 * Subscribes to all data streams required to compute the Kirana dashboard metrics in real time.
 * @param {Function} onMetricsUpdate - receives { metrics, recentTransactions, lowStockProducts, loading }
 * @param {Function} onError - receives error
 * @returns {Function} unsubscribe function
 */
export function subscribeToDashboardMetrics(onMetricsUpdate, onError) {
  let salesData = [];
  let repaymentsData = [];
  let customersData = [];
  let productsData = [];

  let salesLoaded = false;
  let repaymentsLoaded = false;
  let customersLoaded = false;
  let productsLoaded = false;

  const recompute = () => {
    if (!salesLoaded || !repaymentsLoaded || !customersLoaded || !productsLoaded) {
      return;
    }

    // 1. Today's sales: sum of totalAmount of sales made today
    let todaySales = 0;
    let todaySalesCash = 0;
    let todayCreditSales = 0;

    salesData.forEach((s) => {
      if (isToday(s.createdAt)) {
        todaySales += Number(s.totalAmount) || 0;
        todaySalesCash += Number(s.cashReceived) || 0;
        todayCreditSales += Number(s.creditAmount) || 0;
      }
    });

    // 2. Today's repayments: cash collected from credit clearing today
    let todayRepaymentsCash = 0;
    repaymentsData.forEach((r) => {
      if (isToday(r.createdAt)) {
        todayRepaymentsCash += Number(r.amount) || 0;
      }
    });

    // Total cash collected today = cash from sales + cash from repayments
    const todayCashCollected = todaySalesCash + todayRepaymentsCash;

    // 3. Total outstanding customer credit
    let totalOutstandingCredit = 0;
    customersData.forEach((c) => {
      totalOutstandingCredit += Number(c.outstandingCredit) || 0;
    });

    // 4. Low stock products
    const lowStockProducts = productsData.filter(
      (p) => Number(p.stockQuantity) <= Number(p.minStockThreshold || 5)
    );

    // 5. Recent transactions (combined sales and repayments)
    const combinedTransactions = [];

    salesData.slice(0, 15).forEach((s) => {
      combinedTransactions.push({
        id: s.id,
        kind: 'sale',
        type: s.paymentType,
        title: s.paymentType === 'credit' ? 'उधार बिक्री (Credit Sale)' : 'नकद बिक्री (Cash Sale)',
        customerName: s.customerName || 'Cash Customer',
        amount: s.totalAmount,
        cashReceived: s.cashReceived,
        creditAmount: s.creditAmount,
        itemsCount: s.items?.length || 0,
        createdAt: s.createdAt,
      });
    });

    repaymentsData.slice(0, 15).forEach((r) => {
      combinedTransactions.push({
        id: r.id,
        kind: 'repayment',
        type: 'repayment',
        title: 'उधार जमा (Credit Repayment)',
        customerName: r.customerName || 'Customer',
        amount: r.amount,
        cashReceived: r.amount,
        creditAmount: 0,
        createdAt: r.createdAt,
      });
    });

    combinedTransactions.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    onMetricsUpdate({
      loading: false,
      metrics: {
        todaySales,
        todayCashCollected,
        todayCreditSales,
        totalOutstandingCredit,
        salesCount: salesData.filter((s) => isToday(s.createdAt)).length,
        customerCount: customersData.length,
      },
      recentTransactions: combinedTransactions.slice(0, 10),
      lowStockProducts,
    });
  };

  const unsubSales = onSnapshot(
    query(collection(db, SALES_COLLECTION), orderBy('createdAt', 'desc'), limit(50)),
    (snapshot) => {
      salesData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      salesLoaded = true;
      recompute();
    },
    (err) => {
      console.error('[Dashboard sales listen error]', err);
      if (onError) onError(err);
    }
  );

  const unsubRepayments = onSnapshot(
    query(collection(db, REPAYMENTS_COLLECTION), orderBy('createdAt', 'desc'), limit(50)),
    (snapshot) => {
      repaymentsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      repaymentsLoaded = true;
      recompute();
    },
    (err) => {
      console.error('[Dashboard repayments listen error]', err);
      if (onError) onError(err);
    }
  );

  const unsubCustomers = onSnapshot(
    collection(db, CUSTOMERS_COLLECTION),
    (snapshot) => {
      customersData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      customersLoaded = true;
      recompute();
    },
    (err) => {
      console.error('[Dashboard customers listen error]', err);
      if (onError) onError(err);
    }
  );

  const unsubProducts = onSnapshot(
    collection(db, PRODUCTS_COLLECTION),
    (snapshot) => {
      productsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      productsLoaded = true;
      recompute();
    },
    (err) => {
      console.error('[Dashboard products listen error]', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubSales();
    unsubRepayments();
    unsubCustomers();
    unsubProducts();
  };
}
