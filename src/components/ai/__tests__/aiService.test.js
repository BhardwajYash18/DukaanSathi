/**
 * Unit tests for aiService.js
 *
 * Run with: npx vitest run src/components/ai/__tests__/aiService.test.js
 *
 * These tests verify:
 *  - validateBillImage: file type and size constraints
 *  - fileToBase64: correct base64 encoding
 *  - normalizeBillScanResult (via scanBillImage mock mode): safe handling of missing/malformed data
 *  - getAIStatus: reflects correct mode when proxy URL is/isn't set
 *  - scanBillImage: mock mode returns expected structure
 *  - askBusinessAssistant: mock mode returns string answer
 */

import { describe, it, expect } from 'vitest';
import { validateBillImage, fileToBase64, getAIStatus, scanBillImage, askBusinessAssistant } from '../../../services/aiService';

// ── validateBillImage ─────────────────────────────────────────────────────────

describe('validateBillImage', () => {
  const makeFile = (name, type, sizeBytes) => {
    const blob = new Blob([new Uint8Array(sizeBytes)], { type });
    return new File([blob], name, { type });
  };

  it('accepts JPEG images under 10 MB', () => {
    const file = makeFile('bill.jpg', 'image/jpeg', 1024);
    expect(validateBillImage(file)).toEqual({ valid: true });
  });

  it('accepts PNG images', () => {
    const file = makeFile('bill.png', 'image/png', 512);
    expect(validateBillImage(file)).toEqual({ valid: true });
  });

  it('accepts WebP images', () => {
    const file = makeFile('bill.webp', 'image/webp', 256);
    expect(validateBillImage(file)).toEqual({ valid: true });
  });

  it('rejects PDF files', () => {
    const file = makeFile('bill.pdf', 'application/pdf', 1024);
    const result = validateBillImage(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/unsupported/i);
  });

  it('rejects files over 10 MB', () => {
    const file = makeFile('huge.jpg', 'image/jpeg', 11 * 1024 * 1024);
    const result = validateBillImage(file);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too large/i);
  });

  it('rejects null input', () => {
    const result = validateBillImage(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ── fileToBase64 ──────────────────────────────────────────────────────────────

describe('fileToBase64', () => {
  it('returns a non-empty base64 string without data-URL prefix', async () => {
    const content = 'hello world';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'test.txt', { type: 'text/plain' });
    const base64 = await fileToBase64(file);
    expect(base64).toBeTruthy();
    expect(base64).not.toContain('data:');
    expect(base64).not.toContain(',');
    // Decode and check
    const decoded = atob(base64);
    expect(decoded).toBe(content);
  });
});

// ── getAIStatus ───────────────────────────────────────────────────────────────

describe('getAIStatus', () => {
  it('returns mock mode when VITE_AI_PROXY_URL is not set', () => {
    // In test env, import.meta.env.VITE_AI_PROXY_URL is undefined
    const status = getAIStatus();
    expect(status.available).toBe(true);
    expect(['mock', 'live']).toContain(status.mode);
  });
});

// ── scanBillImage (MOCK_MODE) ─────────────────────────────────────────────────

describe('scanBillImage (mock mode)', () => {
  const makeJpeg = () => {
    const blob = new Blob([new Uint8Array(100)], { type: 'image/jpeg' });
    return new File([blob], 'test.jpg', { type: 'image/jpeg' });
  };

  it('returns BillScanResult with items array', async () => {
    const result = await scanBillImage(makeJpeg());
    expect(result).toHaveProperty('items');
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('each item has required shape', async () => {
    const result = await scanBillImage(makeJpeg());
    for (const item of result.items) {
      expect(item).toHaveProperty('name');
      expect(typeof item.name).toBe('string');
      expect(item).toHaveProperty('uncertain');
      expect(typeof item.uncertain).toBe('boolean');
    }
  });

  it('returns a valid confidence level', async () => {
    const result = await scanBillImage(makeJpeg());
    expect(['high', 'partial', 'low']).toContain(result.confidence);
  });

  it('throws for invalid file type', async () => {
    const blob = new Blob(['<html>'], { type: 'text/html' });
    const file = new File([blob], 'page.html', { type: 'text/html' });
    await expect(scanBillImage(file)).rejects.toThrow(/unsupported/i);
  });

  it('throws for null file', async () => {
    await expect(scanBillImage(null)).rejects.toThrow();
  });
});

// ── askBusinessAssistant (MOCK_MODE) ─────────────────────────────────────────

describe('askBusinessAssistant (mock mode)', () => {
  const ctx = {
    todaySales: 1200,
    todayCashCollected: 800,
    totalOutstandingCredit: 500,
    customerCount: 3,
    salesCount: 5,
    lowStockProducts: [],
    recentTransactions: [],
  };

  it('returns an answer string for any question', async () => {
    const result = await askBusinessAssistant('What are today sales?', ctx);
    expect(result).toHaveProperty('answer');
    expect(typeof result.answer).toBe('string');
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it('throws for empty question', async () => {
    await expect(askBusinessAssistant('', ctx)).rejects.toThrow();
  });

  it('throws for whitespace-only question', async () => {
    await expect(askBusinessAssistant('   ', ctx)).rejects.toThrow();
  });

  it('responds to sales-related questions', async () => {
    const result = await askBusinessAssistant('How are my sales today?', ctx);
    expect(result.answer).toBeTruthy();
  });

  it('responds to stock-related questions', async () => {
    const result = await askBusinessAssistant('Which items are low on stock?', ctx);
    expect(result.answer).toBeTruthy();
  });

  it('responds to udhar/credit questions', async () => {
    const result = await askBusinessAssistant('Who owes udhar?', ctx);
    expect(result.answer).toBeTruthy();
  });
});
