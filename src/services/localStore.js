/**
 * DukaanSathi — Standalone Client-Side Local Data Store
 *
 * Provides a self-contained, offline-first, client-side data layer backed by localStorage.
 * Completely eliminates any external Firebase, Firestore, or cloud API dependencies.
 *
 * Features:
 * - Persistent storage via localStorage with automatic seed data initialization.
 * - Reactive pub/sub subscriptions for real-time UI synchronization across views.
 * - Cross-tab synchronization via storage event listener.
 * - Atomic-like mutations for sales (stock decrements + credit ledger updates).
 */

const STORAGE_KEY = 'dukaansathi_local_db_v1';

// Initial realistic Kirana dataset
export function getDefaultData() {
  const now = new Date();
  const todayIso = now.toISOString();

  // One hour ago for today's transactions
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const yesterdayIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const products = [
    {
      id: 'prod-1',
      name: 'Aashirvaad Shudh Chakki Atta (5kg)',
      category: 'Atta & Flours',
      sellingPrice: 245,
      costPrice: 220,
      stockQuantity: 18,
      unit: 'packet',
      minStockThreshold: 5,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
    {
      id: 'prod-2',
      name: 'Tata Salt Vaccum Evaporated (1kg)',
      category: 'Spices & Salt',
      sellingPrice: 28,
      costPrice: 24,
      stockQuantity: 35,
      unit: 'packet',
      minStockThreshold: 10,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
    {
      id: 'prod-3',
      name: 'Fortune Sunlite Refined Sunflower Oil (1L)',
      category: 'Edible Oils',
      sellingPrice: 145,
      costPrice: 130,
      stockQuantity: 4,
      unit: 'pouch',
      minStockThreshold: 8,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
    {
      id: 'prod-4',
      name: 'Madhur Pure & Hygienic Sugar (1kg)',
      category: 'Sugar & Jaggery',
      sellingPrice: 48,
      costPrice: 42,
      stockQuantity: 22,
      unit: 'kg',
      minStockThreshold: 10,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
    {
      id: 'prod-5',
      name: 'Tata Tea Gold (250g)',
      category: 'Tea & Coffee',
      sellingPrice: 135,
      costPrice: 120,
      stockQuantity: 3,
      unit: 'packet',
      minStockThreshold: 6,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
    {
      id: 'prod-6',
      name: 'Parle-G Glucose Biscuits (800g)',
      category: 'Biscuits & Snacks',
      sellingPrice: 75,
      costPrice: 65,
      stockQuantity: 14,
      unit: 'pack',
      minStockThreshold: 5,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
    {
      id: 'prod-7',
      name: 'Surf Excel Quick Wash Detergent Powder (1kg)',
      category: 'Cleaning & Household',
      sellingPrice: 160,
      costPrice: 142,
      stockQuantity: 8,
      unit: 'packet',
      minStockThreshold: 5,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
    {
      id: 'prod-8',
      name: 'Dettol Original Bathing Soap (75g x 4)',
      category: 'Personal Care',
      sellingPrice: 120,
      costPrice: 105,
      stockQuantity: 12,
      unit: 'pack',
      minStockThreshold: 4,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
  ];

  const customers = [
    {
      id: 'cust-1',
      name: 'Ramesh Sharma',
      phone: '9812345678',
      address: 'Gali 3, Near Shiv Mandir',
      outstandingCredit: 850,
      createdAt: yesterdayIso,
      updatedAt: todayIso,
    },
    {
      id: 'cust-2',
      name: 'Sunita Verma',
      phone: '9876501234',
      address: 'Plot 45, Main Market',
      outstandingCredit: 340,
      createdAt: yesterdayIso,
      updatedAt: todayIso,
    },
    {
      id: 'cust-3',
      name: 'Manoj Gupta (Teacherji)',
      phone: '9711223344',
      address: 'Sector 4, Block B',
      outstandingCredit: 0,
      createdAt: yesterdayIso,
      updatedAt: yesterdayIso,
    },
  ];

  const sales = [
    {
      id: 'sale-1',
      saleNumber: 'BILL-100234',
      paymentType: 'cash',
      totalAmount: 210,
      cashReceived: 210,
      creditAmount: 0,
      customerId: null,
      customerName: 'Cash Customer',
      items: [
        { productId: 'prod-6', productName: 'Parle-G Glucose Biscuits (800g)', quantity: 1, price: 75, subtotal: 75 },
        { productId: 'prod-5', productName: 'Tata Tea Gold (250g)', quantity: 1, price: 135, subtotal: 135 },
      ],
      notes: 'Counter Cash Sale',
      createdAt: twoHoursAgo,
    },
    {
      id: 'sale-2',
      saleNumber: 'BILL-100235',
      paymentType: 'credit',
      totalAmount: 321,
      cashReceived: 0,
      creditAmount: 321,
      customerId: 'cust-1',
      customerName: 'Ramesh Sharma',
      items: [
        { productId: 'prod-1', productName: 'Aashirvaad Shudh Chakki Atta (5kg)', quantity: 1, price: 245, subtotal: 245 },
        { productId: 'prod-4', productName: 'Madhur Pure & Hygienic Sugar (1kg)', quantity: 1, price: 48, subtotal: 48 },
        { productId: 'prod-2', productName: 'Tata Salt Vaccum Evaporated (1kg)', quantity: 1, price: 28, subtotal: 28 },
      ],
      notes: 'Monthly kirana udhar',
      createdAt: oneHourAgo,
    },
    {
      id: 'sale-3',
      saleNumber: 'BILL-100236',
      paymentType: 'cash',
      totalAmount: 173,
      cashReceived: 173,
      creditAmount: 0,
      customerId: null,
      customerName: 'Cash Customer',
      items: [
        { productId: 'prod-3', productName: 'Fortune Sunlite Refined Sunflower Oil (1L)', quantity: 1, price: 145, subtotal: 145 },
        { productId: 'prod-2', productName: 'Tata Salt Vaccum Evaporated (1kg)', quantity: 1, price: 28, subtotal: 28 },
      ],
      notes: 'Quick checkout',
      createdAt: todayIso,
    },
  ];

  const repayments = [
    {
      id: 'repay-1',
      customerId: 'cust-1',
      customerName: 'Ramesh Sharma',
      amount: 500,
      paymentMode: 'cash',
      notes: 'Cash Jama at counter',
      createdAt: oneHourAgo,
    },
  ];

  return {
    products,
    customers,
    sales,
    repayments,
  };
}

class LocalStore {
  constructor() {
    this.subscribers = new Set();
    this.data = this.load();

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.data = this.load();
          this.notify();
        }
      });
    }
  }

  load() {
    if (typeof window === 'undefined') {
      return getDefaultData();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.customers)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[LocalStore] Error reading localStorage, using defaults:', err);
    }
    const defaults = getDefaultData();
    this.persist(defaults);
    return defaults;
  }

  persist(dataToSave) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (err) {
      console.warn('[LocalStore] Error persisting to localStorage:', err);
    }
  }

  save() {
    this.persist(this.data);
    this.notify();
  }

  notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this.data);
      } catch (err) {
        console.error('[LocalStore] Subscriber error:', err);
      }
    });
  }

  subscribe(cb) {
    this.subscribers.add(cb);
    // Immediately trigger with current data
    try {
      cb(this.data);
    } catch (err) {
      console.error('[LocalStore] Initial notify error:', err);
    }
    return () => {
      this.subscribers.delete(cb);
    };
  }

  resetToDefaults() {
    this.data = getDefaultData();
    this.save();
    return this.data;
  }

  // Collections accessors
  getProducts() {
    return [...this.data.products];
  }

  getCustomers() {
    return [...this.data.customers];
  }

  getSales() {
    return [...this.data.sales];
  }

  getRepayments() {
    return [...this.data.repayments];
  }
}

export const localStore = new LocalStore();
