import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAIStatus } from '../../services/aiService';
import BillScanner from './BillScanner';
import BillReviewScreen from './BillReviewScreen';
import BusinessAssistant from './BusinessAssistant';
import './ai.css';

/**
 * AIView — Top-level AI feature tab.
 *
 * Manages:
 *  - Tab switching between Bill Scanner and Business Assistant.
 *  - Bill scanning state machine: upload → review → approved.
 *  - Passing live shop data to the Business Assistant.
 *
 * Integration contract:
 *  - Receives `shopContext` from App.jsx (metrics + low-stock + transactions).
 *  - Calls `onApprovedBill(items, grandTotal)` when the shopkeeper confirms extracted bill.
 *    The *caller* (App.jsx or an integration layer) decides what to do with the data
 *    (e.g. pre-fill New Sale, update inventory). AIView does NOT directly write to store.
 *
 * @param {{
 *   shopContext: import('../../services/aiService').ShopContext,
 *   onApprovedBill?: (items: import('../../services/aiService').BillItem[], grandTotal: number) => void,
 * }} props
 */
export default function AIView({ shopContext, onApprovedBill }) {
  const { t } = useTranslation();
  const aiStatus = getAIStatus();

  const [activeTab, setActiveTab] = useState('scanner');

  // Bill scanning state machine
  // 'idle' | 'reviewing' 
  const [scanState, setScanState] = useState('idle');
  const [scanResult, setScanResult] = useState(null);

  const handleScanComplete = (result) => {
    setScanResult(result);
    setScanState('reviewing');
  };

  const handleApprove = (items, grandTotal) => {
    if (onApprovedBill) {
      onApprovedBill(items, grandTotal);
    }
    // Stay on the review screen which shows the approved banner
  };

  const handleDiscard = () => {
    setScanState('idle');
    setScanResult(null);
  };

  return (
    <div className="ai-view">
      {/* Header */}
      <div className="ai-view-header">
        <div className="ai-view-title">
          <div className="ai-icon-badge scanner">✨</div>
          <div>
            <h2>{t('ai.viewTitle', 'AI Features')}</h2>
            <p className="ai-view-subtitle">
              {t('ai.viewSubtitle', 'Bill scanning and intelligent shop assistant powered by Google Gemini')}
            </p>
          </div>
        </div>
      </div>

      {/* Mode banner */}
      <div className={`ai-mode-banner ${aiStatus.mode}`} role="status" aria-label={t('ai.modeBannerLabel', 'AI mode status')}>
        <span>{aiStatus.mode === 'mock' ? '🔶' : '🟢'}</span>
        <span>
          {aiStatus.mode === 'mock'
            ? t('ai.modeMock', 'Demo Mode — showing sample data. Set VITE_AI_PROXY_URL to enable live Gemini AI.')
            : t('ai.modeLive', 'Live Mode — connected to Gemini AI via secure proxy.')}
        </span>
      </div>

      {/* Tab bar */}
      <div className="ai-tabs" role="tablist" aria-label={t('ai.tabsLabel', 'AI feature tabs')}>
        <button
          id="ai-tab-scanner"
          type="button"
          role="tab"
          aria-selected={activeTab === 'scanner'}
          className={`ai-tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => { setActiveTab('scanner'); handleDiscard(); }}
        >
          🧾 {t('ai.tabScanner', 'Bill Scanner')}
        </button>
        <button
          id="ai-tab-assistant"
          type="button"
          role="tab"
          aria-selected={activeTab === 'assistant'}
          className={`ai-tab-btn ${activeTab === 'assistant' ? 'active' : ''}`}
          onClick={() => setActiveTab('assistant')}
        >
          🤖 {t('ai.tabAssistant', 'Business Assistant')}
        </button>
      </div>

      {/* Tab content */}
      <div role="tabpanel" aria-label={activeTab === 'scanner' ? t('ai.tabScanner', 'Bill Scanner') : t('ai.tabAssistant', 'Business Assistant')}>
        {activeTab === 'scanner' && (
          <>
            {scanState === 'idle' && (
              <BillScanner onScanComplete={handleScanComplete} />
            )}
            {scanState === 'reviewing' && scanResult && (
              <BillReviewScreen
                scanResult={scanResult}
                onApprove={handleApprove}
                onDiscard={handleDiscard}
              />
            )}
          </>
        )}

        {activeTab === 'assistant' && (
          <BusinessAssistant shopContext={shopContext} />
        )}
      </div>
    </div>
  );
}
