import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * BillReviewScreen — Editable review and approve component.
 *
 * Receives a BillScanResult from BillScanner, lets the shopkeeper
 * review and edit every field before approving. Calls onApprove
 * with the final reviewed items — never writes to the data layer itself.
 *
 * @param {{
 *   scanResult: import('../../services/aiService').BillScanResult,
 *   onApprove: (reviewedItems: import('../../services/aiService').BillItem[], grandTotal: number) => void,
 *   onDiscard: () => void,
 * }} props
 */
export default function BillReviewScreen({ scanResult, onApprove, onDiscard }) {
  const { t } = useTranslation();

  // Deep-clone scan items into editable state
  const [items, setItems] = useState(() =>
    (scanResult?.items || []).map((item, i) => ({ ...item, _id: i }))
  );
  const [approved, setApproved] = useState(false);

  // Derive computed grand total from editable items
  const computedTotal = items.reduce((sum, item) => {
    const lineTotal =
      item.total != null
        ? Number(item.total)
        : (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
    return sum + lineTotal;
  }, 0);

  // Field update handler
  const updateItem = useCallback((id, field, rawValue) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item._id !== id) return item;
        const updated = { ...item, [field]: rawValue };
        // Auto-recalculate total when qty or unitPrice changes
        if ((field === 'qty' || field === 'unitPrice') && updated.unitPrice != null && updated.qty != null) {
          const q = Number(updated.qty);
          const p = Number(updated.unitPrice);
          if (!isNaN(q) && !isNaN(p)) {
            updated.total = parseFloat((q * p).toFixed(2));
          }
        }
        // Clearing uncertain flag on any edit
        if (field !== 'uncertain') updated.uncertain = false;
        return updated;
      })
    );
  }, []);

  const addRow = () => {
    setItems((prev) => [
      ...prev,
      { _id: Date.now(), name: '', qty: 1, unitPrice: null, total: null, uncertain: false },
    ]);
  };

  const deleteRow = (id) => {
    setItems((prev) => prev.filter((item) => item._id !== id));
  };

  const handleApprove = () => {
    // Validate: at least one item with a name
    const validItems = items.filter((item) => item.name && item.name.trim());
    if (validItems.length === 0) {
      alert(t('ai.reviewErrNoItems', 'Please add at least one item with a name.'));
      return;
    }
    setApproved(true);
    onApprove(
      validItems.map((item) => ({
        name: item.name.trim(),
        qty: item.qty != null && item.qty !== '' ? Number(item.qty) : null,
        unitPrice: item.unitPrice != null && item.unitPrice !== '' ? Number(item.unitPrice) : null,
        total:
          item.total != null && item.total !== ''
            ? Number(item.total)
            : item.qty && item.unitPrice
            ? Number(item.qty) * Number(item.unitPrice)
            : null,
      })),
      computedTotal
    );
  };

  const confidenceLabel = {
    high: t('ai.confidenceHigh', 'High Confidence'),
    partial: t('ai.confidencePartial', 'Partial'),
    low: t('ai.confidenceLow', 'Low Confidence'),
  };

  if (approved) {
    return (
      <div className="bill-review">
        <div className="review-approved-banner">
          <span className="approve-icon">✅</span>
          <div>
            <h4>{t('ai.approvedTitle', 'Bill Approved!')}</h4>
            <p>
              {t('ai.approvedDesc', '{{count}} items totalling ₹{{total}} have been confirmed.', {
                count: items.filter((i) => i.name?.trim()).length,
                total: computedTotal.toFixed(2),
              })}
            </p>
            <p style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
              {t('ai.approvedNext', 'Use the New Sale screen to record the corresponding purchase or inventory update.')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-scan-secondary"
            onClick={onDiscard}
            style={{ marginTop: '0.5rem' }}
          >
            ← {t('ai.scanAnother', 'Scan Another Bill')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bill-review">
      {/* Header */}
      <div className="review-header">
        <button
          type="button"
          className="review-back-btn"
          onClick={onDiscard}
          aria-label={t('ai.backToUpload', 'Back to upload')}
        >
          ← {t('ai.back', 'Back')}
        </button>
        <h3 className="review-title">{t('ai.reviewTitle', 'Review Extracted Bill')}</h3>
        <span className={`confidence-badge ${scanResult?.confidence || 'low'}`}>
          {scanResult?.confidence === 'high' ? '✓ ' : '⚠ '}
          {confidenceLabel[scanResult?.confidence] || t('ai.confidenceLow', 'Low Confidence')}
        </span>
      </div>

      {/* Warning for partial/low confidence */}
      {(scanResult?.confidence !== 'high' || scanResult?.warning) && (
        <div className="review-warning-box" role="alert">
          <span>⚠️</span>
          <span>
            {scanResult?.warning ||
              t('ai.reviewWarning', 'Some values may be inaccurate. Please review each field carefully before approving.')}
          </span>
        </div>
      )}

      {/* Items table */}
      <div className="review-items-card">
        <div className="review-items-header">
          <h4>
            {t('ai.reviewItemsTitle', 'Bill Items')} ({items.length})
          </h4>
          <button
            type="button"
            className="btn-add-row"
            onClick={addRow}
            aria-label={t('ai.addRowLabel', 'Add empty item row')}
          >
            + {t('ai.addRow', 'Add Row')}
          </button>
        </div>

        <div className="review-table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th>{t('ai.colName', 'Product Name')}</th>
                <th>{t('ai.colQty', 'Qty')}</th>
                <th>{t('ai.colUnitPrice', 'Unit Price ₹')}</th>
                <th>{t('ai.colTotal', 'Total ₹')}</th>
                <th aria-label={t('ai.colActions', 'Actions')}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                    {t('ai.reviewEmpty', 'No items extracted. Add rows manually or go back to rescan.')}
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item._id} className={item.uncertain ? 'uncertain-row' : ''}>
                  <td>
                    <input
                      type="text"
                      className={`review-input name-input${item.uncertain ? ' uncertain' : ''}`}
                      value={item.name || ''}
                      onChange={(e) => updateItem(item._id, 'name', e.target.value)}
                      placeholder={t('ai.namePlaceholder', 'Product name')}
                      aria-label={t('ai.nameAriaLabel', 'Product name')}
                    />
                    {item.uncertain && (
                      <span
                        className="uncertain-icon"
                        title={t('ai.uncertainHint', 'AI confidence low — please verify')}
                        aria-label={t('ai.uncertainAriaLabel', 'Low confidence, please verify')}
                      >
                        ⚠️
                      </span>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      className={`review-input${item.uncertain ? ' uncertain' : ''}`}
                      value={item.qty ?? ''}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateItem(item._id, 'qty', e.target.value)}
                      placeholder="—"
                      aria-label={t('ai.qtyAriaLabel', 'Quantity')}
                      style={{ width: '70px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className={`review-input${item.uncertain ? ' uncertain' : ''}`}
                      value={item.unitPrice ?? ''}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateItem(item._id, 'unitPrice', e.target.value)}
                      placeholder="—"
                      aria-label={t('ai.unitPriceAriaLabel', 'Unit price')}
                      style={{ width: '90px' }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className={`review-input${item.uncertain ? ' uncertain' : ''}`}
                      value={item.total ?? ''}
                      min="0"
                      step="0.01"
                      onChange={(e) => updateItem(item._id, 'total', e.target.value)}
                      placeholder="—"
                      aria-label={t('ai.totalAriaLabel', 'Line total')}
                      style={{ width: '90px' }}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-delete-row"
                      onClick={() => deleteRow(item._id)}
                      aria-label={t('ai.deleteRowLabel', 'Delete this row')}
                      title={t('ai.deleteRow', 'Remove item')}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Grand total */}
        <div className="review-total-row">
          <span className="review-total-label">{t('ai.grandTotal', 'Grand Total:')}</span>
          <span className="review-total-value">₹{computedTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="review-actions">
        <button
          type="button"
          className="btn-discard"
          onClick={onDiscard}
          aria-label={t('ai.discardLabel', 'Discard and rescan')}
        >
          ✕ {t('ai.discardBtn', 'Discard')}
        </button>
        <button
          id="btn-approve-bill"
          type="button"
          className="btn-approve"
          onClick={handleApprove}
          disabled={items.length === 0}
          aria-label={t('ai.approveLabel', 'Approve reviewed bill items')}
        >
          ✓ {t('ai.approveBtn', 'Approve & Confirm')}
        </button>
      </div>
    </div>
  );
}
