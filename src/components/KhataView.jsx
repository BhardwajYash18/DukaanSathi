import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createCustomer,
  recordRepayment,
  getCustomerLedger,
} from '../services/customerService';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export default function KhataView({ customers }) {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [filterOnlyDue, setFilterOnlyDue] = useState(false);

  // New Customer Form State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creatingCust, setCreatingCust] = useState(false);
  const [custError, setCustError] = useState('');

  // Repayment / Jama State
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [repaymentNotes, setRepaymentNotes] = useState('');
  const [recordingRepayment, setRecordingRepayment] = useState(false);
  const [repaymentError, setRepaymentError] = useState('');

  // Ledger state for selected customer
  const [ledger, setLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Load customer ledger when selected
  useEffect(() => {
    if (selectedCustomer) {
      loadLedger(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Keep selectedCustomer updated with customers prop changes (e.g. balance updates)
  useEffect(() => {
    if (selectedCustomer) {
      const updated = customers.find((c) => c.id === selectedCustomer.id);
      if (updated) setSelectedCustomer(updated);
    }
  }, [customers]);

  const loadLedger = async (customerId) => {
    setLoadingLedger(true);
    try {
      const records = await getCustomerLedger(customerId);
      setLedger(records);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  // Add Customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setCustError('');
    if (!name.trim()) {
      setCustError(t('khata.errNameRequired', 'Customer name is required'));
      return;
    }

    setCreatingCust(true);
    try {
      const newId = await createCustomer({ name, phone, address });
      setShowAddCustomerModal(false);
      setName('');
      setPhone('');
      setAddress('');
      // Auto select newly created customer
      const newCust = { id: newId, name, phone, address, outstandingCredit: 0 };
      setSelectedCustomer(newCust);
    } catch (err) {
      setCustError(err.message || t('khata.errAddFailed', 'Failed to create customer'));
    } finally {
      setCreatingCust(false);
    }
  };

  // Record Repayment
  const handleRecordRepayment = async (e) => {
    e.preventDefault();
    setRepaymentError('');
    const amt = Number(repaymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setRepaymentError(t('khata.errValidAmount', 'Please enter a valid repayment amount'));
      return;
    }

    setRecordingRepayment(true);
    try {
      await recordRepayment({
        customerId: selectedCustomer.id,
        amount: amt,
        paymentMode,
        notes: repaymentNotes,
      });

      setShowRepaymentModal(false);
      setRepaymentAmount('');
      setRepaymentNotes('');
      // Reload ledger
      await loadLedger(selectedCustomer.id);
    } catch (err) {
      setRepaymentError(err.message || t('khata.errRepaymentFailed', 'Failed to record payment'));
    } finally {
      setRecordingRepayment(false);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));
    const matchesDue = filterOnlyDue ? (c.outstandingCredit || 0) > 0 : true;
    return matchesSearch && matchesDue;
  });

  // Calculate total outstanding udhar across all customers
  const totalUdhar = customers.reduce(
    (sum, c) => sum + (Number(c.outstandingCredit) || 0),
    0
  );

  return (
    <div className="khata-view">
      {/* Khata Top Summary Header */}
      <div className="khata-header">
        <div>
          <h2>📖 {t('khata.title', 'Digital Khata')}</h2>
          <p className="subtitle">{t('khata.subtitle', 'Customer credit, payments, and account history')}</p>
        </div>
        <div className="khata-header-right">
          <div className="total-udhar-pill">
            <span className="pill-label">{t('khata.totalOutstanding', 'Store Total Outstanding:')}</span>
            <span className="pill-amount">{formatCurrency(totalUdhar)}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddCustomerModal(true)}
          >
            {t('khata.addCustomerBtn', '+ Add Customer Account')}
          </button>
        </div>
      </div>

      <div className="khata-layout">
        {/* Left: Customer Directory */}
        <div className="customer-list-panel">
          <div className="customer-search-box">
            <input
              type="text"
              placeholder={t('khata.searchCustomer', 'Search customer (Name or Mobile)...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
            />
            <div className="filter-checkbox-row">
              <label>
                <input
                  type="checkbox"
                  checked={filterOnlyDue}
                  onChange={(e) => setFilterOnlyDue(e.target.checked)}
                />{' '}
                {t('khata.onlyDueFilter', 'Only with Udhar')}
              </label>
            </div>
          </div>

          <div className="customer-items-scroll">
            {filteredCustomers.length === 0 ? (
              <div className="empty-state">
                <p>{t('khata.noCustomersFound', 'No customers found.')}</p>
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                const credit = Number(cust.outstandingCredit) || 0;
                return (
                  <div
                    key={cust.id}
                    className={`customer-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCustomer(cust)}
                  >
                    <div className="cust-avatar">
                      {cust.name ? cust.name[0].toUpperCase() : 'U'}
                    </div>
                    <div className="cust-info">
                      <div className="cust-name">{cust.name}</div>
                      <div className="cust-phone">
                        {cust.phone || t('khata.noPhone', 'No phone number')}
                      </div>
                    </div>
                    <div className="cust-balance">
                      <div className={`balance-amount ${credit > 0 ? 'due' : 'settled'}`}>
                        {formatCurrency(credit)}
                      </div>
                      <span className="balance-label">
                        {credit > 0 ? t('khata.dueCredit', 'Due Credit') : t('khata.settled', 'Settled')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Customer Detail & Ledger View */}
        <div className="customer-detail-panel">
          {!selectedCustomer ? (
            <div className="select-prompt-card">
              <div className="prompt-icon-badge" aria-hidden="true">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>{t('khata.selectPromptTitle', 'Select a customer to view account details')}</h3>
              <p>{t('khata.selectPromptDesc', 'Click any customer from the left list or create a new account.')}</p>
            </div>
          ) : (
            <div className="customer-ledger-card">
              {/* Customer Info Card Header */}
              <div className="ledger-card-header">
                <div className="cust-primary-details">
                  <h3>{selectedCustomer.name}</h3>
                  <div className="cust-meta-row">
                    {selectedCustomer.phone && (
                      <span className="cust-meta-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                        <span>{selectedCustomer.phone}</span>
                      </span>
                    )}
                    {selectedCustomer.address && (
                      <span className="cust-meta-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                        </svg>
                        <span>{selectedCustomer.address}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="ledger-balance-box">
                  <div className="balance-tag">{t('khata.outstandingLabel', 'Outstanding Balance:')}</div>
                  <div className="balance-big-val">
                    {formatCurrency(selectedCustomer.outstandingCredit || 0)}
                  </div>
                  <button
                    type="button"
                    className="btn btn-success btn-record-repayment"
                    onClick={() => setShowRepaymentModal(true)}
                  >
                    💵 {t('khata.recordPaymentBtn', 'Receive Payment')}
                  </button>
                </div>
              </div>

              {/* Ledger Transactions History */}
              <div className="ledger-history-section">
                <div className="card-header-flex">
                  <h4>{t('khata.ledgerHistory', 'Ledger History')}</h4>
                  <span className="badge-count">
                    {t('khata.entriesCount', { count: ledger.length })}
                  </span>
                </div>

                {loadingLedger ? (
                  <div className="view-loading">
                    <p>{t('khata.loadingLedger', 'Loading ledger...')}</p>
                  </div>
                ) : ledger.length === 0 ? (
                  <div className="empty-state">
                    <p>{t('khata.noLedger', 'No past credit or repayment records for this customer.')}</p>
                  </div>
                ) : (
                  <div className="ledger-timeline">
                    {ledger.map((entry) => {
                      const isCredit = entry.type === 'credit_purchase';
                      return (
                        <div key={entry.id} className={`ledger-row ${entry.type}`}>
                          <div className="ledger-badge">
                            {isCredit
                              ? `🔴 ${t('khata.badgeCredit', 'Given (Udhar)')}`
                              : `🟢 ${t('khata.badgeRepayment', 'Received (Jama)')}`}
                          </div>
                          <div className="ledger-info">
                            <div className="ledger-title">
                              {isCredit
                                ? t('khata.creditPurchaseTitle', 'Credit Purchase')
                                : t('khata.repaymentTitle', 'Payment Received')}
                            </div>
                            <div className="ledger-date">
                              {formatDateTime(entry.createdAt)}
                            </div>
                            {entry.items && entry.items.length > 0 && (
                              <div className="ledger-items-list">
                                {t('khata.itemsLabel', {
                                  items: entry.items
                                    .map((it) => `${it.productName} (x${it.quantity})`)
                                    .join(', '),
                                })}
                              </div>
                            )}
                            {entry.notes && (
                              <div className="ledger-notes">
                                {t('khata.noteLabel', { note: entry.notes })}
                              </div>
                            )}
                          </div>
                          <div className="ledger-amount">
                            {isCredit ? '+' : '-'}
                            {formatCurrency(entry.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Customer */}
      {showAddCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{t('khata.modalAddTitle', '+ Add Customer Account')}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAddCustomerModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddCustomer} className="modal-body">
              <label>{t('khata.nameLabel', 'Customer Name: *')}</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('khata.namePlaceholder', 'e.g. Ramesh Kumar')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <label>{t('khata.phoneLabel', 'Mobile Number:')}</label>
              <input
                type="tel"
                className="input-field"
                placeholder={t('khata.phonePlaceholder', 'e.g. 9876543210')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <label>{t('khata.addressLabel', 'Address / Landmark:')}</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('khata.addressPlaceholder', 'e.g. Gali No. 3, Near Temple')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              {custError && <div className="form-error-banner">{custError}</div>}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingCust}
                >
                  {creatingCust ? t('khata.openingAccount', 'Creating account...') : t('khata.openAccountBtn', 'Open Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Repayment (Jama) */}
      {showRepaymentModal && selectedCustomer && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{t('khata.modalRepaymentTitle', 'Receive Payment (Jama)')}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowRepaymentModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRecordRepayment} className="modal-body">
              <div className="repay-customer-summary">
                <div>
                  {t('khata.customerLabel', { name: selectedCustomer.name })}
                </div>
                <div>
                  <span className="danger">
                    {t('khata.currentDue', {
                      amount: formatCurrency(selectedCustomer.outstandingCredit || 0),
                    })}
                  </span>
                </div>
              </div>

              <label>{t('khata.amountToReceive', 'Repayment Amount: *')}</label>
              <input
                type="number"
                className="input-field amount-input"
                placeholder={t('khata.amountPlaceholder', '₹ Enter amount')}
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(e.target.value)}
                min="1"
                step="any"
                required
              />

              <label>{t('khata.paymentModeLabel', 'Payment Mode:')}</label>
              <div className="payment-toggle-grid">
                <button
                  type="button"
                  className={`btn-toggle ${paymentMode === 'cash' ? 'active cash' : ''}`}
                  onClick={() => setPaymentMode('cash')}
                >
                  {t('khata.modeCash', 'Cash')}
                </button>
                <button
                  type="button"
                  className={`btn-toggle ${paymentMode === 'upi' ? 'active partial' : ''}`}
                  onClick={() => setPaymentMode('upi')}
                >
                  {t('khata.modeUPI', 'UPI / PhonePe / GPay')}
                </button>
              </div>

              <label>{t('common.notes', 'Notes')}:</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('common.optional', 'Optional')}
                value={repaymentNotes}
                onChange={(e) => setRepaymentNotes(e.target.value)}
              />

              {repaymentError && (
                <div className="form-error-banner">{repaymentError}</div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRepaymentModal(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={recordingRepayment}
                >
                  {recordingRepayment
                    ? t('khata.recordingPayment', 'Recording payment...')
                    : t('khata.confirmRepaymentBtn', 'Confirm Payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
