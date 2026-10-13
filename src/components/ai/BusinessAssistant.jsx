import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { askBusinessAssistant } from '../../services/aiService';
import { formatCurrency } from '../../utils/formatters';

/**
 * BusinessAssistant — Conversational AI chat for shop insights.
 *
 * Reads shop context from props (live data from localStore) and sends
 * it alongside each question so Gemini can give personalised answers
 * about the actual store, not generic advice.
 *
 * Does NOT modify any store data — read-only.
 *
 * @param {{ shopContext: import('../../services/aiService').ShopContext }} props
 */
export default function BusinessAssistant({ shopContext }) {
  const { t } = useTranslation();
  const messagesEndRef = useRef(null);
  const msgIdCounter = useRef(0);

  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const quickPrompts = [
    t('ai.prompt1', "What are today's sales?"),
    t('ai.prompt2', 'Which items are low on stock?'),
    t('ai.prompt3', 'Who owes the most udhar?'),
    t('ai.prompt4', 'How much cash collected today?'),
    t('ai.prompt5', 'Tell me about outstanding credit.'),
  ];

  const handleSendQuestion = useCallback(
    async (q) => {
      const text = (q || question || '').trim();
      if (!text || loading) return;

      msgIdCounter.current += 1;
      const userMsg = {
        id: `u-${msgIdCounter.current}`,
        role: 'user',
        content: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setQuestion('');
      setLoading(true);
      setError(null);

      try {
        const { answer } = await askBusinessAssistant(text, shopContext);
        msgIdCounter.current += 1;
        const aiMsg = {
          id: `a-${msgIdCounter.current}`,
          role: 'ai',
          content: answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        setError(err.message || t('ai.assistantError', 'Failed to get an answer. Please try again.'));
      } finally {
        setLoading(false);
      }
    },
    [loading, question, shopContext, t]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  return (
    <div className="business-assistant">
      {/* Card */}
      <div className="assistant-card">
        {/* Header */}
        <div className="assistant-card-header">
          <span style={{ fontSize: '1.4rem' }}>🤖</span>
          <div>
            <h3>{t('ai.assistantTitle', 'Kirana Business Assistant')}</h3>
            <p className="assistant-card-sub">
              {t('ai.assistantSub', 'Ask anything about your shop — sales, credit, stock, customers.')}
            </p>
          </div>
        </div>

        {/* Live context chips */}
        {shopContext && (
          <div className="assistant-context-row" role="region" aria-label={t('ai.contextLabel', 'Live shop data provided to AI')}>
            <div className="context-chip">
              📊 {t('ai.chipSales', "Today's Sales:")}{' '}
              <span className="context-chip-value">{formatCurrency(shopContext.todaySales)}</span>
            </div>
            <div className="context-chip">
              📒 {t('ai.chipUdhar', 'Total Udhar:')}{' '}
              <span className="context-chip-value">{formatCurrency(shopContext.totalOutstandingCredit)}</span>
            </div>
            <div className="context-chip">
              📦 {t('ai.chipLowStock', 'Low Stock:')}{' '}
              <span className="context-chip-value">{shopContext.lowStockProducts?.length || 0} {t('ai.items', 'items')}</span>
            </div>
            <div className="context-chip">
              👥 {t('ai.chipCustomers', 'Customers:')}{' '}
              <span className="context-chip-value">{shopContext.customerCount || 0}</span>
            </div>
          </div>
        )}

        {/* Quick prompts */}
        <div className="quick-prompts-section">
          <p className="quick-prompts-label">{t('ai.quickPromptsLabel', 'Quick Questions')}</p>
          <div className="quick-prompts-list">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                className="quick-prompt-btn"
                onClick={() => handleSendQuestion(prompt)}
                disabled={loading}
                aria-label={prompt}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div
          className="assistant-messages"
          role="log"
          aria-live="polite"
          aria-label={t('ai.messagesLabel', 'Conversation')}
        >
          {messages.length === 0 && !loading && (
            <div className="assistant-empty">
              <span className="empty-icon">💬</span>
              <p>{t('ai.assistantEmpty', 'Ask a question above or tap a quick prompt to get started.')}</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.role}`}>
              <div className={`message-avatar ${msg.role === 'user' ? 'user-avatar' : 'ai-avatar'}`}>
                {msg.role === 'user' ? '🧑' : '🤖'}
              </div>
              <div>
                <div className="message-content">{msg.content}</div>
                <div className="message-time">{msg.time}</div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="message-bubble ai">
              <div className="message-avatar ai-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="scan-error-box" style={{ margin: '0 1.15rem 0.75rem' }} role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Input */}
        <div className="assistant-input-area">
          <textarea
            id="assistant-question-input"
            className="assistant-textarea"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai.assistantPlaceholder', 'Ask about sales, udhar, stock... (Enter to send)')}
            rows={2}
            disabled={loading}
            aria-label={t('ai.assistantInputLabel', 'Type your question')}
          />
          <button
            id="btn-ask-assistant"
            type="button"
            className="btn-ask"
            onClick={() => handleSendQuestion()}
            disabled={loading || !question.trim()}
            aria-label={t('ai.askBtnLabel', 'Send question')}
          >
            {loading ? '⏳' : '➤'} {t('ai.askBtn', 'Ask')}
          </button>
        </div>
      </div>
    </div>
  );
}
