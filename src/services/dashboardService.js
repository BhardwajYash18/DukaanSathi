import { localStore } from './localStore';
import { isToday } from '../utils/formatters';

/**
 * Subscribes to all data streams required to compute the Kirana dashboard metrics in real time.
 * @param {Function} onMetricsUpdate - receives { metrics, recentTransactions, lowStockProducts, loading }
 * @param {Function} onError - receives error
 * @returns {Function} unsubscribe function
 */
export function subscribeToDashboardMetrics(onMetricsUpdate, onError) {
  try {
    return localStore.subscribe((data) => {
      const salesData = data.sales || [];
      const repaymentsData = data.repayments || [];
      const customersData = data.customers || [];
      const productsData = data.products || [];

      // 1. Today's sales: sum of totalAmount of sales made today
      let todaySales = 0;
      let todaySalesCash = 0;
      let todayCreditSales = 0;
      let todaySalesCount = 0;

      salesData.forEach((s) => {
        if (isToday(s.createdAt)) {
          todaySales += Number(s.totalAmount) || 0;
          todaySalesCash += Number(s.cashReceived) || 0;
          todayCreditSales += Number(s.creditAmount) || 0;
          todaySalesCount += 1;
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
          itemsCount: 0,
          createdAt: r.createdAt,
        });
      });

      // Sort newest first
      combinedTransactions.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      onMetricsUpdate({
        loading: false,
        metrics: {
          todaySales,
          todayCashCollected,
          todayCreditSales,
          totalOutstandingCredit,
          salesCount: todaySalesCount,
          customerCount: customersData.length,
        },
        recentTransactions: combinedTransactions.slice(0, 10),
        lowStockProducts: lowStockProducts.slice(0, 8),
      });
    });
  } catch (err) {
    console.error('[subscribeToDashboardMetrics error]', err);
    if (onError) onError(err);
    return () => {};
  }
}
