import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Shield,
  HelpCircle,
  FileText,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { routeUserQuery } from '../services/intentRouter';
import { answerDocumentQuestionGrounding, indexDocumentPassages } from '../services/retrievalEngine';
import { askDocumentQuestion, getStoredApiKey } from '../services/geminiService';
import { LEGAL_DISCLAIMER_SHORT } from '../services/legalSafety';

const SAMPLE_SEEDED_QUESTIONS = [
  'Summarize this agreement.',
  'What am I obligated to do?',
  'When can this agreement be terminated?',
  'Does this agreement automatically renew?',
  'What deadlines should I know about?',
  'Explain the most important clauses in simple English.',
  'Which sections should I discuss with a lawyer?',
  'What deductions can be made from my deposit?',
];

export default function AskDocument({ documentModel }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am ClauseGuard, your document-understanding assistant. Ask me questions about obligations, deadlines, termination rules, or specific clauses in your loaded agreement.',
      sources: [],
      confidence: 'high',
      isWelcome: true,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const hasApiKey = Boolean(getStoredApiKey());
  const indexedPassages = documentModel ? indexDocumentPassages(documentModel.clauses || []) : [];

  const handleAskQuestion = async (questionText) => {
    const q = (questionText || query).trim();
    if (!q || !documentModel) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg = { id: userMessageId, role: 'user', text: q, sources: [], confidence: 'low', isWelcome: false };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      // If user has Gemini API key, use live LLM with grounded prompt
      if (hasApiKey) {
        const geminiRes = await askDocumentQuestion({
          documentText: documentModel.rawText,
          question: q,
        });

        // Also run retrieval grounding for citations
        const groundedCheck = answerDocumentQuestionGrounding(q, indexedPassages);

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text: geminiRes.answer,
            sources: groundedCheck.sources,
            confidence: groundedCheck.confidence,
            isWelcome: false,
            engine: 'Gemini 1.5 Flash (Grounded Live AI)',
          },
        ]);
      } else {
        // Deterministic RAG + Smart Intent Router
        const routedResult = routeUserQuery(
          q,
          documentModel,
          indexedPassages,
          answerDocumentQuestionGrounding
        );

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text: routedResult.answer,
            sources: routedResult.sources || [],
            confidence: routedResult.confidence || 'medium',
            limitations: routedResult.limitations || [],
            intent: routedResult.intent,
            isWelcome: false,
            engine: 'ClauseGuard Anti-Hallucination Engine (Grounded)',
          },
        ]);
      }
    } catch (error) {
      console.error('AskDocument Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          text: "I couldn't process that query against the document. Please try asking in different words.",
          sources: [],
          confidence: 'low',
          isWelcome: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleAskQuestion(query);
  };

  return (
    <div className="card fade-in" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={22} color="var(--brand-primary)" />
            Ask the Document (Document-Grounded Q&A)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Strictly anchored to your loaded document. Every answer includes verifiable section citations and excerpts.
          </p>
        </div>

        <span className="badge badge-fair" style={{ fontSize: '0.7rem' }}>
          Anti-Hallucination Guard Active
        </span>
      </div>

      {/* Seeded Question Chips */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
          Suggested questions to ask:
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SAMPLE_SEEDED_QUESTIONS.map((seed, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(seed)}
              disabled={isLoading}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.775rem', padding: '5px 11px' }}
            >
              {seed}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Thread */}
      <div style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        maxHeight: '440px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '16px',
      }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {/* Message Bubble */}
            <div
              style={{
                background: msg.role === 'user' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                fontSize: '0.875rem',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.text}
            </div>

            {/* Citations & Source Excerpts for Assistant Responses */}
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color-focus)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                fontSize: '0.75rem',
              }}>
                <div style={{ fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FileText size={12} />
                  <span>Verifiable Document Sources (Confidence: {msg.confidence?.toUpperCase() || 'HIGH'})</span>
                </div>
                {msg.sources.map((s, idx) => (
                  <div key={idx} style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                    <strong>{s.section}</strong> (Page ~{s.page || 1}):
                    <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginTop: '2px', paddingLeft: '8px', borderLeft: '2px solid var(--brand-primary)' }}>
                      "{s.excerpt}"
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Missing Evidence / Limitations notice */}
            {msg.role === 'assistant' && msg.limitations && msg.limitations.length > 0 && (
              <div style={{ fontSize: '0.725rem', color: 'var(--status-caution)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={12} />
                <span>{msg.limitations[0]}</span>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
            <div
              className="spinner"
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255,255,255,0.2)',
                borderTopColor: 'var(--brand-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span>Grounding answer against document passages...</span>
          </div>
        )}
      </div>

      {/* Query Input Box */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about obligations, termination, deadlines, fees..."
          disabled={isLoading || !documentModel}
          style={{
            flex: 1,
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />

        <button
          type="submit"
          disabled={isLoading || !query.trim() || !documentModel}
          className="btn btn-primary"
          style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Send size={16} />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
