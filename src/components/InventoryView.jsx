import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addProduct, adjustProductStock } from '../services/productService';
import { formatCurrency } from '../utils/formatters';

const CATEGORIES = [
  'All',
  'Atta & Flours',
  'Rice & Grains',
  'Spices & Salt',
  'Edible Oils',
  'Sugar & Jaggery',
  'Tea & Coffee',
  'Biscuits & Snacks',
  'Cleaning & Household',
  'Personal Care',
  'General',
];

export default function InventoryView({ products }) {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Product form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [unit, setUnit] = useState('packet');
  const [minStockThreshold, setMinStockThreshold] = useState('5');
  const [savingProduct, setSavingProduct] = useState(false);
  const [formError, setFormError] = useState('');

  // Stock adjustment in progress
  const [adjustingId, setAdjustingId] = useState(null);

  const handleStockDelta = async (productId, delta) => {
    setAdjustingId(productId);
    try {
      await adjustProductStock(productId, delta);
    } catch (err) {
      alert(t('inventory.errStockAdjust', { message: err.message }));
    } finally {
      setAdjustingId(null);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError(t('inventory.errNameRequired', 'Product name is required'));
      return;
    }
    const sPrice = Number(sellingPrice);
    if (isNaN(sPrice) || sPrice < 0) {
      setFormError(t('inventory.errValidPrice', 'Valid selling price is required'));
      return;
    }

    setSavingProduct(true);
    try {
      await addProduct({
        name,
        category,
        sellingPrice: sPrice,
        costPrice: Number(costPrice) || 0,
        stockQuantity: Number(stockQuantity) || 0,
        unit,
        minStockThreshold: Number(minStockThreshold) || 5,
      });

      setShowAddModal(false);
      setName('');
      setSellingPrice('');
      setCostPrice('');
      setStockQuantity('');
      setCategory('General');
    } catch (err) {
      setFormError(err.message || t('inventory.errAddFailed', 'Failed to add product'));
    } finally {
      setSavingProduct(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'All' ? true : p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = products.filter(
    (p) => Number(p.stockQuantity) <= Number(p.minStockThreshold || 5)
  ).length;

  return (
    <div className="inventory-view">
      {/* Top Header */}
      <div className="inventory-header">
        <div>
          <h2>📦 {t('inventory.title', 'Store Inventory')}</h2>
          <p className="subtitle">{t('inventory.subtitle', 'Stock quantities, selling prices, and low-stock alerts')}</p>
        </div>
        <div className="inventory-header-right">
          {lowStockCount > 0 && (
            <div className="low-stock-summary-pill">
              ⚠️ {t('inventory.lowStockSummary', { count: lowStockCount })}
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            {t('inventory.addProductBtn', '+ Add Product')}
          </button>
        </div>
      </div>

      {/* Filter and Category Controls */}
      <div className="inventory-controls-card">
        <div className="inventory-search-row">
          <input
            type="text"
            placeholder={t('inventory.searchPlaceholder', 'Search products or brands...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="category-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {t(`categories.${cat}`, cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="products-table-card">
        <div className="card-header-flex">
          <h4>{t('inventory.productList', 'Product List')}</h4>
          <span className="badge-count">
            {t('inventory.productCount', { count: filteredProducts.length })}
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <p>{t('inventory.noProductsFound', 'No products found. Click above to add a product.')}</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>{t('inventory.colName', 'Product Name')}</th>
                  <th>{t('inventory.colCategory', 'Category')}</th>
                  <th>{t('inventory.colPrice', 'Selling Price')}</th>
                  <th>{t('inventory.colStock', 'Available Stock')}</th>
                  <th>{t('inventory.colStatus', 'Stock Status')}</th>
                  <th>{t('inventory.colQuickAdjust', 'Quick Adjust (+ / -)')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const isLow =
                    Number(p.stockQuantity) <= Number(p.minStockThreshold || 5);
                  const isOut = Number(p.stockQuantity) <= 0;
                  const unitLabel = t(`units.${p.unit || 'packet'}`, p.unit || 'packet');
                  const categoryLabel = t(`categories.${p.category || 'General'}`, p.category || 'General');

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="prod-name-box">
                          <strong>{p.name}</strong>
                          {p.costPrice > 0 && (
                            <span className="cost-hint">
                              {t('inventory.costPriceHint', {
                                amount: formatCurrency(p.costPrice),
                              })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="category-badge">{categoryLabel}</span>
                      </td>
                      <td>
                        <strong className="selling-price">
                          {formatCurrency(p.sellingPrice)}
                        </strong>
                      </td>
                      <td>
                        <span className="stock-quantity-text">
                          {p.stockQuantity} {unitLabel}
                        </span>
                      </td>
                      <td>
                        {isOut ? (
                          <span className="badge-stock out">
                            {t('inventory.statusOut', 'Out')}
                          </span>
                        ) : isLow ? (
                          <span className="badge-stock low">
                            {t('inventory.statusLow', 'Low')}
                          </span>
                        ) : (
                          <span className="badge-stock in">
                            {t('inventory.statusInStock', 'In Stock')}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="stock-adjust-actions">
                          <button
                            type="button"
                            className="btn-stock-step"
                            disabled={adjustingId === p.id || p.stockQuantity <= 0}
                            onClick={() => handleStockDelta(p.id, -1)}
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            className="btn-stock-step"
                            disabled={adjustingId === p.id}
                            onClick={() => handleStockDelta(p.id, +1)}
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            className="btn-stock-step step-bulk"
                            disabled={adjustingId === p.id}
                            onClick={() => handleStockDelta(p.id, +10)}
                          >
                            +10
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Product */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{t('inventory.modalAddTitle', '+ Add New Kirana Product')}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="modal-body">
              <label>{t('inventory.nameLabel', 'Product Name: *')}</label>
              <input
                type="text"
                className="input-field"
                placeholder={t('inventory.namePlaceholder', 'e.g. Aashirvaad Atta (5kg)')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <div className="form-row-2">
                <div>
                  <label>{t('inventory.categoryLabel', 'Category:')}</label>
                  <select
                    className="input-field"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {t(`categories.${cat}`, cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>{t('inventory.unitLabel', 'Unit:')}</label>
                  <select
                    className="input-field"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="packet">{t('units.packet', 'packet')}</option>
                    <option value="kg">{t('units.kg', 'kg')}</option>
                    <option value="litre">{t('units.litre', 'litre')}</option>
                    <option value="pouch">{t('units.pouch', 'pouch')}</option>
                    <option value="piece">{t('units.piece', 'piece')}</option>
                    <option value="box">{t('units.box', 'box')}</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label>{t('inventory.sellingPriceLabel', 'Selling Price (₹): *')}</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="₹ 245"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    min="0"
                    step="any"
                    required
                  />
                </div>

                <div>
                  <label>{t('inventory.costPriceLabel', 'Cost Price (₹):')}</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="₹ 220"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    min="0"
                    step="any"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div>
                  <label>{t('inventory.initialStockLabel', 'Initial Stock:')}</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="20"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    min="0"
                  />
                </div>

                <div>
                  <label>{t('inventory.lowAlertLabel', 'Low Alert Level:')}</label>
                  <input
                    type="number"
                    className="input-field"
                    placeholder="5"
                    value={minStockThreshold}
                    onChange={(e) => setMinStockThreshold(e.target.value)}
                    min="1"
                  />
                </div>
              </div>

              {formError && <div className="form-error-banner">⚠️ {formError}</div>}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingProduct}
                >
                  {savingProduct
                    ? t('inventory.savingProduct', 'Saving...')
                    : t('inventory.saveProductBtn', 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
