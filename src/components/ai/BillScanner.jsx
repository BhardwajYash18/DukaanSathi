import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { scanBillImage, validateBillImage } from '../../services/aiService';

/**
 * BillScanner — Upload-and-scan component.
 *
 * Responsibilities:
 *  - Accept a bill image via drag-drop or file picker.
 *  - Validate file type and size before sending.
 *  - Show scanning progress.
 *  - Pass successful BillScanResult to onScanComplete.
 *  - Display user-friendly errors for all failure modes.
 *
 * @param {{ onScanComplete: (result: import('../../services/aiService').BillScanResult) => void }} props
 */
export default function BillScanner({ onScanComplete }) {
  const { t } = useTranslation();

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;
    const validation = validateBillImage(selectedFile);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setError(null);
    setFile(selectedFile);
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  }, []);

  const handleInputChange = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleScan = async () => {
    if (!file || scanning) return;
    setScanning(true);
    setError(null);
    try {
      const result = await scanBillImage(file);
      onScanComplete(result);
    } catch (err) {
      setError(err.message || t('ai.scanError', 'Failed to scan bill. Please try again.'));
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setError(null);
    setScanning(false);
  };

  return (
    <div className="bill-scanner">
      <div className="bill-scanner-card">
        <div className="bill-scanner-card-header">
          <span style={{ fontSize: '1.2rem' }}>🧾</span>
          <h3>{t('ai.scannerTitle', 'Upload Supplier Bill / Invoice')}</h3>
        </div>

        <div className="bill-scanner-card-body">
          {/* SCANNING STATE */}
          {scanning && (
            <div className="scanning-indicator">
              <div className="scanning-pulse">🔍</div>
              <div className="scanning-text">
                {t('ai.scanning', 'Scanning bill with AI...')}
              </div>
              <div className="scanning-sub">
                {t('ai.scanningHint', 'Gemini is reading product names, quantities, and prices from your bill.')}
              </div>
            </div>
          )}

          {/* UPLOAD STATE — no file selected */}
          {!scanning && !file && (
            <div
              className={`drop-zone${dragOver ? ' drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              role="button"
              aria-label={t('ai.dropZoneLabel', 'Drop bill image or click to upload')}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.currentTarget.querySelector('input').click();
                }
              }}
            >
              <input
                id="bill-image-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={handleInputChange}
                aria-label={t('ai.fileInputLabel', 'Select bill image')}
              />
              <span className="drop-zone-icon">📷</span>
              <p className="drop-zone-title">
                {t('ai.dropZoneTitle', 'Drop bill image here or click to browse')}
              </p>
              <p className="drop-zone-hint">
                {t('ai.dropZoneHint', 'JPEG, PNG, or WebP • Max 10 MB • Supplier receipts, purchase orders, invoices')}
              </p>
            </div>
          )}

          {/* PREVIEW STATE — file selected */}
          {!scanning && file && (
            <div className="bill-preview-area">
              <div className="bill-preview-img-wrap">
                <img
                  src={previewUrl}
                  alt={t('ai.previewAlt', 'Bill preview')}
                />
              </div>
              <div className="bill-preview-name">
                📎 {file.name} ({(file.size / 1024).toFixed(0)} KB)
              </div>
              <div className="scan-controls">
                <button
                  id="btn-scan-bill"
                  type="button"
                  className="btn-scan"
                  onClick={handleScan}
                  disabled={scanning}
                  aria-label={t('ai.scanBtnLabel', 'Scan this bill with AI')}
                >
                  ✨ {t('ai.scanBtn', 'Scan with AI')}
                </button>
                <button
                  type="button"
                  className="btn-scan-secondary"
                  onClick={handleReset}
                  aria-label={t('ai.changeImageBtn', 'Change image')}
                >
                  🔄 {t('ai.changeImage', 'Change Image')}
                </button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="scan-error-box" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bill-scanner-card">
        <div className="bill-scanner-card-header">
          <span style={{ fontSize: '1rem' }}>💡</span>
          <h3 style={{ fontSize: '0.9rem' }}>{t('ai.scanTipsTitle', 'Tips for best results')}</h3>
        </div>
        <div className="bill-scanner-card-body" style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
          <ul style={{ margin: 0, paddingInlineStart: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {[
              t('ai.tip1', 'Keep the bill flat and well-lit when photographing.'),
              t('ai.tip2', 'Ensure all text is sharp and readable — avoid blurry photos.'),
              t('ai.tip3', 'Include the full bill in one frame — avoid cropping product lines.'),
              t('ai.tip4', 'Works best with printed supplier invoices and receipts.'),
              t('ai.tip5', 'Always review and edit extracted data before saving.'),
            ].map((tip, i) => (
              <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
