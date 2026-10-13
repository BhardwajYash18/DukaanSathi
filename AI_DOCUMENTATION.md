# DukaanSathi — AI Features Documentation

## Overview

Two AI features have been added to DukaanSathi on the `feature/ai` branch:

1. **Bill Scanner** — Upload a supplier invoice image; Gemini extracts product names, quantities, and prices into an editable review table.
2. **Business Assistant** — Ask natural-language questions about the shop and get answers grounded in live store data (sales, udhar, stock).

---

## Security Architecture

> **The Gemini API key is NEVER placed in browser code or any `VITE_` environment variable.**

All Gemini requests are routed through a minimal server-side Express proxy (`server/aiProxy.js`). The proxy reads `GEMINI_API_KEY` from a server-side environment variable and the frontend never receives it.

```
Browser → POST /api/ai/scan-bill  → server/aiProxy.js → Gemini API
                                            (GEMINI_API_KEY kept here)
```

For local development without a backend, leave `VITE_AI_PROXY_URL` unset to activate **MOCK_MODE** which returns realistic demo data with no server required.

---

## File Inventory

### New Files (feature/ai only)

| File | Purpose |
|------|---------|
| `src/services/aiService.js` | Core AI service: `scanBillImage()`, `askBusinessAssistant()`, `getAIStatus()` |
| `src/components/ai/AIView.jsx` | Top-level AI tab — state machine + tab routing |
| `src/components/ai/BillScanner.jsx` | File upload, drag-drop, validation, scanning progress |
| `src/components/ai/BillReviewScreen.jsx` | Editable review table + approve/discard workflow |
| `src/components/ai/BusinessAssistant.jsx` | Chat UI with context chips and quick prompts |
| `src/components/ai/ai.css` | All AI-specific styles (extends existing mint-green theme) |
| `src/components/ai/__tests__/aiService.test.js` | Unit tests for aiService |
| `server/aiProxy.js` | Minimal Express proxy (server-side, not bundled into browser) |
| `AI_DOCUMENTATION.md` | This file |

### Modified Files

| File | Change | Notes |
|------|--------|-------|
| `src/App.jsx` | Added `AIView` import + `activeTab === 'ai'` render | Minimum integration only |
| `src/components/Navbar.jsx` | Added AI tab entry | Required for navigation |
| `src/App.css` | Added `.tab-badge-ai` color | One CSS rule |
| `src/i18n/locales/en.json` | Added `ai.*` and `nav.ai` keys | ~85 strings |
| `src/i18n/locales/hi.json` | Added translated `ai.*` and `nav.ai` keys | Hindi translations |
| `src/i18n/locales/*.json` (11 files) | Added `ai.*` keys (English fallback) | Other 11 languages |
| `.env.example` | Documented `VITE_AI_PROXY_URL` | No keys in source |

---

## Setup Instructions

### A. Demo / Development Mode (No Backend Required)

This is the default mode. No configuration needed — mock data is returned automatically.

```bash
npm run dev
# → Navigate to "AI Tools" tab
# → Upload any image to see demo bill scanning
# → Use Business Assistant to ask questions
```

### B. Live Mode with Real Gemini AI

**Step 1: Get a Gemini API Key**
- Go to https://aistudio.google.com/
- Create an API key for the `gemini-1.5-flash` model

**Step 2: Install proxy dependencies** (server is a separate Node process)
```bash
# In project root (or create a separate server package):
npm install express cors dotenv
```

**Step 3: Configure the proxy**
```bash
# Create server/.env (never commit this file)
GEMINI_API_KEY=AIza...your_key_here...
PORT=3001
ALLOWED_ORIGIN=http://localhost:5173
```

**Step 4: Start the proxy**
```bash
node server/aiProxy.js
```

**Step 5: Tell the frontend about the proxy**
```bash
# In root .env (frontend, safe — this is just a URL, not a secret)
VITE_AI_PROXY_URL=http://localhost:3001
```

**Step 6: Start the frontend**
```bash
npm run dev
```

### C. Production Deployment

Deploy `server/aiProxy.js` to Render, Railway, Fly.io, or any Node.js host:

1. Set `GEMINI_API_KEY` as a **secret** environment variable on the platform.
2. Set `ALLOWED_ORIGIN` to your frontend URL.
3. Set `VITE_AI_PROXY_URL` to the deployed proxy URL in your frontend build config.
4. Run `npm run build` for the frontend.

---

## Integration Contract

### `scanBillImage(file: File): Promise<BillScanResult>`

```ts
type BillItem = {
  name: string;
  qty: number | null;
  unitPrice: number | null;
  total: number | null;
  uncertain: boolean;       // AI confidence is low for this row
};

type BillScanResult = {
  items: BillItem[];
  grandTotal: number | null;
  confidence: 'high' | 'partial' | 'low';
  rawText?: string;
  warning?: string;
};
```

### `askBusinessAssistant(question: string, shopContext: ShopContext): Promise<{ answer: string }>`

```ts
type ShopContext = {
  todaySales: number;
  todayCashCollected: number;
  totalOutstandingCredit: number;
  customerCount: number;
  salesCount: number;
  lowStockProducts: { name: string; stockQuantity: number; minStockThreshold: number }[];
  recentTransactions: { customerName: string; amount: number; type: string }[];
};
```

### `AIView` Component Props

```jsx
<AIView
  shopContext={ShopContext}           // Required: live shop data for assistant
  onApprovedBill={                    // Optional: called when shopkeeper confirms bill
    (items: BillItem[], grandTotal: number) => void
  }
/>
```

`AIView` does **not** write to the data store itself. It passes approved bill data to `onApprovedBill` and the caller decides what to do (e.g., pre-fill New Sale, update inventory).

---

## Error Handling

| Scenario | Handling |
|----------|---------|
| Blurry image | `confidence: 'low'`, all uncertain items flagged |
| Missing values on bill | Fields set to `null`, user must fill manually |
| Malformed AI response | `normalizeBillScanResult()` returns safe empty state |
| API rate limit (429) | User-friendly "service busy" message |
| Network failure | Clear error with retry suggestion |
| No file selected | Client-side validation before any API call |
| File too large / wrong type | Client-side validation via `validateBillImage()` |
| No GEMINI_API_KEY on server | 503 with clear error; frontend shows "not configured" |
| Missing VITE_AI_PROXY_URL | Activates MOCK_MODE automatically |

---

## Remaining Limitations

1. **No real Gemini calls in browser build** — the proxy must be deployed separately. For a fully self-contained hackathon demo, consider a Cloud Function or a Render free-tier service.
2. **Approved bill data is not auto-imported** — `onApprovedBill` is exposed but the integration layer (Product 4 / integration team) needs to wire it to `addProduct` or pre-fill the Sales screen.
3. **Assistant language** — Gemini responds in English regardless of the app's UI language. A follow-up task would send the UI language code to the proxy so Gemini can respond in Hindi/Tamil/etc.
4. **No image compression** — Large images (close to 10 MB) may be slow to transmit. A client-side resize step (e.g., via Canvas API) would improve speed.
5. **No conversation history in assistant** — Each question is sent independently. Adding message history to the context would enable follow-up questions.
6. **Tests require a test runner** — The test files are written for Vitest. Run `npx vitest` once Vitest is added to devDependencies.

---

## Running Tests

```bash
# Install vitest if not already present:
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom

# Run AI-specific tests:
npx vitest run src/components/ai/__tests__/
```

---

## Git

All changes are on branch `feature/ai`. Do not merge directly into `main`.

```bash
git log --oneline feature/ai
git diff main..feature/ai --name-only
```
