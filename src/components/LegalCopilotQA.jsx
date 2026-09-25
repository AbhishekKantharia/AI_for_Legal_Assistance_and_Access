import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  FileQuestion,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { askDocumentQuestion } from '../services/geminiService';

const SUGGESTED_QUESTIONS = [
  'Can I work for a competitor after leaving or starting a side business?',
  'What happens if I terminate early or break this contract?',
  'Is my deposit refundable and what deductions can be made?',
  'Who owns the code, inventions, or intellectual property I create?',
  'What are the hidden penalty fees or escalating late charges?',
  'Can the other party enter my premises or access my data without notice?',
];

export default function LegalCopilotQA({ documentText }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        `Hello! I am your **ClauseGuard Legal Copilot**. I have analyzed your document and can answer specific questions grounded strictly in its clauses.\n\n` +
        `Feel free to click one of the suggested questions below or type your own question regarding liabilities, termination, IP rights, or fees.`,
      source: 'ClauseGuard Copilot',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleAsk = async (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isThinking) return;

    const userMsg = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsThinking(true);

    try {
      const result = await askDocumentQuestion({
        documentText,
        question: q,
      });

      const assistantMsg = {
        role: 'assistant',
        content: result.answer,
        source: result.source,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an issue analyzing this question. Please ensure the document is loaded.',
          source: 'System',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="card fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Bot size={22} color="var(--brand-primary)" />
            Context-Grounded Legal Copilot
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Ask direct plain-English questions. Every response is strictly grounded with clause citations.
          </p>
        </div>
        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>
          <ShieldCheck size={13} /> Grounded in Document
        </span>
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="var(--brand-primary)" />
          Quick Question Presets (Tailored to common contract traps):
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              disabled={isThinking}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.775rem',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                textAlign: 'left',
              }}
            >
              <FileQuestion size={13} color="var(--brand-primary)" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        maxHeight: '440px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        marginBottom: '16px',
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: msg.role === 'user' ? '85%' : '90%',
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: msg.role === 'user' ? 'var(--brand-gradient)' : 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {msg.role === 'user' ? <User size={16} color="#ffffff" /> : <Bot size={16} color="var(--brand-primary)" />}
            </div>

            <div style={{
              background: msg.role === 'user' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
              color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
              whiteSpace: 'pre-line',
            }}>
              <div>{msg.content}</div>

              {msg.source && (
                <div style={{
                  fontSize: '0.7rem',
                  color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <BookOpen size={11} /> Source: {msg.source}
                </div>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
            <Bot size={18} color="var(--brand-primary)" />
            <span>Scanning document clauses and compiling answer...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        style={{ display: 'flex', gap: '10px' }}
      >
        <input
          type="text"
          placeholder="Ask anything about this document (e.g. 'Can they raise my rent without warning?')..."
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          disabled={isThinking}
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={isThinking || !inputQuery.trim()}
          className="btn btn-primary"
        >
          <Send size={16} />
          <span>Ask Copilot</span>
        </button>
      </form>
    </div>
  );
}
