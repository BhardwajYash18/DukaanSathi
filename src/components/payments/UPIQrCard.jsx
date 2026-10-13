import React, { useState, useEffect, useMemo } from 'react';
import { generateQrSvg } from './qrGenerator';

/**
 * High-resolution Merchant UPI QR Code Card.
 * Renders vector SVG QR, merchant VPA, dynamic amount, and expiration countdown.
 *
 * @param {Object} props
 * @param {Object} props.paymentOrder - The payment order object
 * @param {Function} [props.onExpire] - Callback when countdown expires
 */
export default function UPIQrCard({ paymentOrder, onExpire }) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // seconds

  const {
    amount = 0,
    merchantVpa = 'dukaansathi.kirana@phonepe',
    merchantName = 'DukaanSathi Kirana Store',
    referenceId = '',
    upiUri = '',
    expiresAt,
  } = paymentOrder || {};

  // Expiration countdown
  useEffect(() => {
    if (!expiresAt) return;

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const remainingSeconds = Math.max(0, Math.floor((expiry - now) / 1000));
      return remainingSeconds;
    };

    setTimeLeft(calculateRemaining());

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  // Generate vector QR SVG string
  const qrSvg = useMemo(() => {
    if (!upiUri) return '';
    return generateQrSvg(upiUri, 220);
  }, [upiUri]);

  const handleCopyVpa = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(merchantVpa);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="upi-qr-card">
      {/* Merchant Header */}
      <div className="upi-merchant-header">
        <div className="merchant-info">
          <span className="merchant-name">{merchantName}</span>
          <span className="merchant-vpa-pill" onClick={handleCopyVpa} title="Click to copy UPI ID">
            <code>{merchantVpa}</code>
            <button type="button" className="btn-copy-vpa" aria-label="Copy UPI ID">
              {copied ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F9D58" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </span>
          {copied && <span className="copy-feedback">Copied!</span>}
        </div>
      </div>

      {/* QR Code Container */}
      <div className="upi-qr-wrapper">
        <div
          className="upi-qr-svg-container"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        {timeLeft <= 0 && (
          <div className="upi-qr-expired-overlay">
            <span>QR Code Expired</span>
          </div>
        )}
      </div>

      {/* UPI Accepted Logos & Instructions */}
      <div className="upi-app-strip">
        <span className="upi-brand-label">Scan with Any UPI App</span>
        <div className="upi-app-badges">
          <span className="app-badge gpay">GPay</span>
          <span className="app-badge phonepe">PhonePe</span>
          <span className="app-badge paytm">Paytm</span>
          <span className="app-badge bhim">BHIM</span>
        </div>
      </div>

      {/* Footer Info: Expiry & Deep Link */}
      <div className="upi-card-footer">
        <div className="upi-timer-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Valid for: {formatTimer(timeLeft)}</span>
        </div>

        {upiUri && (
          <a
            href={upiUri}
            className="btn-open-upi-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pay with UPI App
          </a>
        )}
      </div>

      <div className="upi-reference-meta">
        <span>Ref: <code>{referenceId}</code></span>
      </div>
    </div>
  );
}
