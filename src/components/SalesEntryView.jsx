import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSale } from '../services/saleService';
import { createCustomer } from '../services/customerService';
import { formatCurrency } from '../utils/formatters';

export default function SalesEntryView({ products, customers, onSaleCompleted }) {
  const { t } = useTranslation();

  // Cart items: [{ productId, productName, quantity, price, subtotal }]
  const [cart, setCart] = useState([]);
  
  // Custom item state
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');

  // Search & filter
  const [searchProduct, setSearchProduct] = useState('');

  // Payment method: 'cash' | 'credit' | 'partial'
  const [paymentType, setPaymentType] = useState('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [notes, setNotes] = useState('');

  // Quick Customer Creation modal/drawer
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  // Cart total calculations
  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);

  // Calculate cash & credit amounts based on payment type
  let computedCash = totalAmount;
  let computedCredit = 0;

  if (paymentType === 'credit') {
    computedCash = 0;
    computedCredit = totalAmount;
  } else if (paymentType === 'partial') {
    computedCash = Math.min(totalAmount, Math.max(0, Number(cashReceived) || 0));
    computedCredit = Math.max(0, totalAmount - computedCash);
  }

  // Adding product from inventory into cart
  const handleAddFromInventory = (product) => {
    setErrorMessage('');
    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * updated[existingIndex].price;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          price: product.sellingPrice,
          quantity: 1,
          unit: product.unit || 'packet',
          subtotal: product.sellingPrice,
        },
      ]);
    }
  };

  // Adding custom item to cart
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    setErrorMessage('');
    const name = customName.trim();
    const price = Number(customPrice);
    const qty = Number(customQty) || 1;

    if (!name) {
      setErrorMessage(t('sales.errEnterName', 'Please enter item name'));
      return;
    }
    if (isNaN(price) || price <= 0) {
      setErrorMessage(t('sales.errEnterPrice', 'Please enter valid price'));
      return;
    }

    setCart([
      ...cart,
      {
        productId: null,
        productName: name,
        price,
        quantity: qty,
        unit: 'unit',
        subtotal: price * qty,
      },
    ]);

    setCustomName('');
    setCustomPrice('');
    setCustomQty('1');
  };

  const updateQuantity = (index, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      const updated = [...cart];
      updated[index].quantity = newQty;
      updated[index].subtotal = newQty * updated[index].price;
      setCart(updated);
    }
  };

  const removeItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    setAddingCustomer(true);
    try {
      const newId = await createCustomer({
        name: newCustName,
        phone: newCustPhone,
      });
      setSelectedCustomerId(newId);
      setShowAddCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
    } catch (err) {
      alert(t('khata.errAddCustomerFailed', 'Error creating customer: ') + err.message);
    } finally {
      setAddingCustomer(false);
    }
  };

  // Submit Sale
  const handleSubmitSale = async () => {
    setErrorMessage('');
    if (cart.length === 0) {
      setErrorMessage(t('sales.errAddOneItem', 'Please add at least 1 item to the bill'));
      return;
    }
    if (computedCredit > 0 && !selectedCustomerId) {
      setErrorMessage(t('sales.errSelectCustomer', 'Selecting a customer is required for credit sales'));
      return;
    }

    setSubmitting(true);
    try {
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
      const saleId = await createSale({
        paymentType,
        totalAmount,
        cashReceived: computedCash,
        creditAmount: computedCredit,
        customerId: selectedCustomerId || null,
        customerName: selectedCustomer ? selectedCustomer.name : 'Cash Customer',
        items: cart,
        notes,
      });

      setSuccessReceipt({
        saleId,
        totalAmount,
        cashReceived: computedCash,
        creditAmount: computedCredit,
        customerName: selectedCustomer ? selectedCustomer.name : 'Cash Customer',
        paymentType,
        itemsCount: cart.length,
      });

      // Clear cart
      setCart([]);
      setCashReceived('');
      setNotes('');
      if (onSaleCompleted) onSaleCompleted();
    } catch (err) {
      console.error('Error submitting sale:', err);
      setErrorMessage(err.message || t('sales.errSubmitFailed', 'Failed to record sale'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchProduct.toLowerCase()))
  );

  return (
    <div className="sales-view">
      {/* Success Receipt Modal/Card */}
      {successReceipt && (
        <div className="receipt-success-card">
          <div className="receipt-badge">✓ {t('sales.saleRecorded', 'Sale Recorded Successfully')}</div>
          <div className="receipt-body">
            <h3>{t('sales.billTotal', { amount: formatCurrency(successReceipt.totalAmount) })}</h3>
            <p>
              {t('sales.paymentMethod', 'Payment Method')}:{' '}
              <strong>
                {successReceipt.paymentType === 'cash'
                  ? t('sales.fullCash', 'Full Cash')
                  : successReceipt.paymentType === 'credit'
                  ? t('sales.fullCredit', 'Full Credit (Udhar)')
                  : t('sales.partialPayment', 'Partial Cash + Credit')}
              </strong>
            </p>
            {successReceipt.creditAmount > 0 && (
              <p className="danger">
                {t('sales.creditAddedNotice', {
                  amount: formatCurrency(successReceipt.creditAmount),
                  name: successReceipt.customerName,
                })}
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSuccessReceipt(null)}
            >
              {t('sales.nextSaleBtn', '+ New Bill')}
            </button>
          </div>
        </div>
      )}

      <div className="sales-layout">
        {/* Left Column: Product Selection & Inventory catalog */}
        <div className="catalog-column">
          <div className="section-card">
            <div className="card-header-flex">
              <h3>📦 {t('sales.selectItems', 'Select Items')}</h3>
              <span className="badge-count">
                {t('sales.itemsAvailable', { count: products.length })}
              </span>
            </div>

            <div className="search-bar">
              <input
                type="text"
                placeholder={t('sales.searchPlaceholder', 'Search items (atta, dal, soap...)')}
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="product-catalog-grid">
              {filteredProducts.slice(0, 12).map((p) => {
                const isOutOfStock = p.stockQuantity <= 0;
                const unitLabel = t(`units.${p.unit || 'packet'}`, p.unit || 'packet');
                return (
                  <div
                    key={p.id}
                    className={`catalog-item-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                    onClick={() => !isOutOfStock && handleAddFromInventory(p)}
                  >
                    <div className="item-details">
                      <div className="item-name">{p.name}</div>
                      <div className="item-meta">
                        <span className="price-tag">{formatCurrency(p.sellingPrice)}</span>
                        <span className={`stock-tag ${p.stockQuantity <= (p.minStockThreshold || 5) ? 'low' : ''}`}>
                          {p.stockQuantity} {unitLabel}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-add-item"
                      disabled={isOutOfStock}
                    >
                      {isOutOfStock ? t('sales.outOfStock', 'Out') : t('sales.addBtn', '+ Add')}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Manual / Custom Item Form */}
            <div className="custom-item-box">
              <h4>{t('sales.customItemTitle', '+ Add Custom Item')}</h4>
              <form onSubmit={handleAddCustomItem} className="custom-item-form">
                <input
                  type="text"
                  placeholder={t('sales.customItemName', 'Item name (e.g. Loose Besan 1kg)')}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="input-field"
                />
                <div className="custom-item-inputs">
                  <input
                    type="number"
                    placeholder={t('sales.customItemPrice', 'Price (₹)')}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="input-field"
                    min="1"
                    step="any"
                  />
                  <input
                    type="number"
                    placeholder={t('sales.customItemQty', 'Qty')}
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="input-field qty-input"
                    min="1"
                  />
                  <button type="submit" className="btn btn-secondary">
                    {t('sales.addToBillBtn', 'Add to Bill')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Bill Cart & Payment Options */}
        <div className="cart-column">
          <div className="section-card cart-card">
            <h3>🛒 {t('sales.currentBill', 'Current Bill')}</h3>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <p>{t('sales.billEmpty', 'Bill is empty. Select items from the left.')}</p>
              </div>
            ) : (
              <div className="cart-table-wrapper">
                <table className="cart-table">
                  <thead>
                    <tr>
                      <th>{t('sales.itemHeader', 'Item')}</th>
                      <th>{t('sales.qtyHeader', 'Qty')}</th>
                      <th>{t('sales.priceHeader', 'Price')}</th>
                      <th>{t('sales.totalHeader', 'Total')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <strong>{item.productName}</strong>
                        </td>
                        <td>
                          <div className="qty-control">
                            <button
                              type="button"
                              className="btn-stepper"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                            >
                              -
                            </button>
                            <span className="qty-val">{item.quantity}</span>
                            <button
                              type="button"
                              className="btn-stepper"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>
                          <strong>{formatCurrency(item.subtotal)}</strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-remove"
                            onClick={() => removeItem(index)}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bill Summary */}
            <div className="cart-totals">
              <div className="total-row">
                <span>{t('sales.grandTotal', 'Grand Total:')}</span>
                <span className="total-number">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="payment-section">
              <label className="section-label">{t('sales.paymentTypeLabel', 'Payment Type:')}</label>
              <div className="payment-toggle-grid">
                <button
                  type="button"
                  className={`btn-toggle ${paymentType === 'cash' ? 'active cash' : ''}`}
                  onClick={() => setPaymentType('cash')}
                >
                  💵 {t('sales.fullCash', 'Full Cash')}
                </button>
                <button
                  type="button"
                  className={`btn-toggle ${paymentType === 'credit' ? 'active credit' : ''}`}
                  onClick={() => setPaymentType('credit')}
                >
                  📝 {t('sales.fullCredit', 'Full Credit (Udhar)')}
                </button>
                <button
                  type="button"
                  className={`btn-toggle ${paymentType === 'partial' ? 'active partial' : ''}`}
                  onClick={() => setPaymentType('partial')}
                >
                  ⚖️ {t('sales.partialPayment', 'Partial Cash + Credit')}
                </button>
              </div>

              {/* Partial Payment input */}
              {paymentType === 'partial' && (
                <div className="partial-box">
                  <label>{t('sales.cashReceivedLabel', 'Cash Received:')}</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder={t('sales.cashPlaceholder', '₹ Cash amount')}
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    max={totalAmount}
                  />
                  <div className="split-summary">
                    <span>{t('sales.cashSplit', { amount: formatCurrency(computedCash) })}</span>
                    <span className="danger">{t('sales.creditSplit', { amount: formatCurrency(computedCredit) })}</span>
                  </div>
                </div>
              )}

              {/* Customer selection for Credit / Partial */}
              {computedCredit > 0 && (
                <div className="customer-select-box">
                  <div className="label-with-action">
                    <label>{t('sales.selectCustomerLabel', 'Select Customer: *')}</label>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => setShowAddCustomer(!showAddCustomer)}
                    >
                      {t('sales.addNewCustomer', '+ Add Customer')}
                    </button>
                  </div>

                  {showAddCustomer && (
                    <div className="quick-add-customer-panel">
                      <input
                        type="text"
                        placeholder={t('sales.customerNamePlaceholder', 'Customer Name')}
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="input-field"
                      />
                      <input
                        type="tel"
                        placeholder={t('sales.mobilePlaceholder', 'Phone Number')}
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value)}
                        className="input-field"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={addingCustomer}
                        onClick={handleCreateCustomer}
                      >
                        {addingCustomer ? t('sales.addingCustomer', 'Adding...') : t('sales.addCustomerBtn', 'Add Customer')}
                      </button>
                    </div>
                  )}

                  <select
                    className="input-field select-customer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">{t('sales.selectCustomerPlaceholder', '-- Select Customer --')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} - {t('sales.customerBalanceHint', { amount: formatCurrency(c.outstandingCredit || 0) })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="notes-box">
                <input
                  type="text"
                  placeholder={t('sales.notesPlaceholder', 'Optional notes or bill memo')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                />
              </div>

              {errorMessage && (
                <div className="form-error-banner">
                  ⚠️ {errorMessage}
                </div>
              )}

              <button
                type="button"
                className="btn btn-primary btn-block btn-checkout"
                disabled={submitting || cart.length === 0}
                onClick={handleSubmitSale}
              >
                {submitting
                  ? t('sales.recordingBill', 'Recording bill...')
                  : t('sales.confirmBillBtn', { amount: formatCurrency(totalAmount) })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
