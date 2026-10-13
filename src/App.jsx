import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import SalesEntryView from './components/SalesEntryView';
import KhataView from './components/KhataView';
import InventoryView from './components/InventoryView';
import LoginView from './components/LoginView';
import AIView from './components/ai/AIView';
import { getDemoSession, logoutDemo } from './services/authService';
import { subscribeToDashboardMetrics } from './services/dashboardService';
import { subscribeToCustomers } from './services/customerService';
import { subscribeToProducts } from './services/productService';
import { seedSampleKiranaData } from './services/seedService';
import { getLanguageConfig } from './i18n/languages';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Synchronously initialize demo session from localStorage (avoids flash of dashboard)
  const [session, setSession] = useState(() => getDemoSession());

  // Real-time store state
  const [dashboardData, setDashboardData] = useState({
    loading: true,
    metrics: {
      todaySales: 0,
      todayCashCollected: 0,
      todayCreditSales: 0,
      totalOutstandingCredit: 0,
      salesCount: 0,
      customerCount: 0,
    },
    recentTransactions: [],
    lowStockProducts: [],
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [seeding, setSeeding] = useState(false);

  // Synchronize document dir and lang on mount and language change
  useEffect(() => {
    const config = getLanguageConfig(i18n.language);
    document.documentElement.lang = config.code;
    document.documentElement.dir = config.dir;
  }, [i18n.language]);

  // Subscribe to store data ONLY when authenticated
  useEffect(() => {
    if (!session) return;

    // 1. Dashboard metrics subscription
    const unsubDashboard = subscribeToDashboardMetrics(
      (data) => {
        setDashboardData(data);
      },
      (err) => {
        console.error('[Dashboard subscription error]', err);
      }
    );

    // 2. Customers subscription
    const unsubCustomers = subscribeToCustomers(
      (custList) => {
        setCustomers(custList);
      },
      (err) => {
        console.error('[Customers subscription error]', err);
      }
    );

    // 3. Products subscription
    const unsubProducts = subscribeToProducts(
      (prodList) => {
        setProducts(prodList);
      },
      (err) => {
        console.error('[Products subscription error]', err);
      }
    );

    return () => {
      unsubDashboard();
      unsubCustomers();
      unsubProducts();
    };
  }, [session]);

  const handleLogout = () => {
    logoutDemo();
    setSession(null);
    setActiveTab('dashboard');
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await seedSampleKiranaData();
    } catch (err) {
      alert(t('dashboard.errSeedFailed', 'Error loading sample data: ') + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // If not authenticated, render LoginView with protected boundary
  if (!session) {
    return (
      <div className="dukaan-app">
        <LoginView onLoginSuccess={(user) => setSession(user)} />
        <footer style={{ marginTop: 'auto', borderTop: '1px solid #d5eee2', background: '#ffffff', padding: '1.25rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
          <div>
            {t('common.footerText', 'DukaanSathi • Smart Kirana Management')}
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="dukaan-app">
      {/* Top Kirana Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {/* App Body */}
      <main className="app-content">
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={dashboardData.metrics}
            recentTransactions={dashboardData.recentTransactions}
            lowStockProducts={dashboardData.lowStockProducts}
            loading={dashboardData.loading}
            setActiveTab={setActiveTab}
            onSeedData={handleSeedData}
            seeding={seeding}
          />
        )}

        {activeTab === 'sales' && (
          <SalesEntryView
            products={products}
            customers={customers}
            onSaleCompleted={() => {
              // Stay on sales for rapid checkout
            }}
          />
        )}

        {activeTab === 'khata' && (
          <KhataView customers={customers} />
        )}

        {activeTab === 'inventory' && (
          <InventoryView products={products} />
        )}

        {activeTab === 'ai' && (
          <AIView
            shopContext={{
              todaySales: dashboardData.metrics.todaySales,
              todayCashCollected: dashboardData.metrics.todayCashCollected,
              totalOutstandingCredit: dashboardData.metrics.totalOutstandingCredit,
              customerCount: dashboardData.metrics.customerCount,
              salesCount: dashboardData.metrics.salesCount,
              lowStockProducts: dashboardData.lowStockProducts,
              recentTransactions: dashboardData.recentTransactions,
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid #d5eee2', background: '#ffffff', padding: '1.25rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
        <div>
          {t('common.footerText', 'DukaanSathi • Smart Kirana Management')}
        </div>
      </footer>
    </div>
  );
}

export default App;
