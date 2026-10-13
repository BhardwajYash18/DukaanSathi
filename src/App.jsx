import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import SalesEntryView from './components/SalesEntryView';
import KhataView from './components/KhataView';
import InventoryView from './components/InventoryView';
import LoginView from './components/LoginView';
import { getDemoSession, logoutDemo } from './services/authService';
import { subscribeToDashboardMetrics } from './services/dashboardService';
import { subscribeToCustomers } from './services/customerService';
import { subscribeToProducts } from './services/productService';
import { seedSampleKiranaData } from './services/seedService';
import { testFirestoreConnection } from './lib/firestoreTest';
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
  const [firestoreError, setFirestoreError] = useState(null);

  // Diagnostics modal/drawer
  const [diagResult, setDiagResult] = useState(null);
  const [testingDiag, setTestingDiag] = useState(false);

  // Synchronize document dir and lang on mount and language change
  useEffect(() => {
    const config = getLanguageConfig(i18n.language);
    document.documentElement.lang = config.code;
    document.documentElement.dir = config.dir;
  }, [i18n.language]);

  // Subscribe to Firestore data ONLY when authenticated
  useEffect(() => {
    if (!session) return;

    // 1. Dashboard metrics subscription
    const unsubDashboard = subscribeToDashboardMetrics(
      (data) => {
        setDashboardData(data);
        setFirestoreError(null);
      },
      (err) => {
        console.error('[Dashboard subscription error]', err);
        setFirestoreError(err);
      }
    );

    // 2. Customers subscription
    const unsubCustomers = subscribeToCustomers(
      (custList) => {
        setCustomers(custList);
      },
      (err) => {
        console.error('[Customers subscription error]', err);
        setFirestoreError(err);
      }
    );

    // 3. Products subscription
    const unsubProducts = subscribeToProducts(
      (prodList) => {
        setProducts(prodList);
      },
      (err) => {
        console.error('[Products subscription error]', err);
        setFirestoreError(err);
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

  const handleRunDiagnostic = async () => {
    setTestingDiag(true);
    setDiagResult(null);
    try {
      const res = await testFirestoreConnection();
      setDiagResult(res);
    } catch (err) {
      setDiagResult({ success: false, message: err?.message });
    } finally {
      setTestingDiag(false);
    }
  };

  // If not authenticated, render LoginView with protected boundary
  if (!session) {
    return (
      <div className="dukaan-app">
        <LoginView onLoginSuccess={(user) => setSession(user)} />
        <footer style={{ marginTop: 'auto', borderTop: '1px solid #d5eee2', background: '#ffffff', padding: '1.25rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
          <div>
            {t('common.footerText', 'DukaanSathi • Cloud Firestore Connected • Powered by React + Vite')}
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="dukaan-app">
      {/* Top Kirana Navbar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

      {/* Security Rule Warning Banner if permission denied */}
      {firestoreError && firestoreError.code === 'permission-denied' && (
        <div style={{ background: '#fef2f2', borderBottom: '2px solid #f87171', padding: '0.85rem 1.25rem', color: '#991b1b', textAlign: 'center', fontSize: '0.9rem' }}>
          <strong>⚠️ {t('common.permissionDenied', 'Firestore security rules permission denied')}:</strong>
          {' '}{t('common.permissionDeniedDesc', 'Please update Firestore security rules for dashboard, customer, and inventory collections.')}
        </div>
      )}

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
      </main>

      {/* Footer & Connection Diagnostic helper */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid #d5eee2', background: '#ffffff', padding: '1.25rem 1rem', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
        <div>
          {t('common.footerText', 'DukaanSathi • Cloud Firestore Connected • Powered by React + Vite')}
        </div>
        <div style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn-link"
            style={{ fontSize: '0.8rem', color: '#218653' }}
            onClick={handleRunDiagnostic}
            disabled={testingDiag}
          >
            {testingDiag ? t('common.runningDiagnostic', 'Running diagnostic...') : `🔍 ${t('common.runDiagnostic', 'Check Firebase Connection (Diagnostic)')}`}
          </button>
          {diagResult && (
            <span style={{ marginLeft: '10px', color: diagResult.success ? '#218653' : '#dc2626', fontWeight: 600 }}>
              {diagResult.success ? `✓ ${t('common.diagnosticOk', 'Connection verified')}` : `✕ ${t('common.diagnosticErr', { message: diagResult.message })}`}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
