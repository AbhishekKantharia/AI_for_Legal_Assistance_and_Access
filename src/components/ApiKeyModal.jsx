import React, { useState } from 'react';
import { Key, ShieldCheck, X, ExternalLink, Cpu, Trash2 } from 'lucide-react';
import { getStoredApiKey, saveApiKey } from '../services/geminiService';

export default function ApiKeyModal({ isOpen, onClose }) {
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    saveApiKey(apiKeyInput);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    saveApiKey('');
    setApiKeyInput('');
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content fade-in" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Configure Google Gemini AI</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
          JurisEase AI connects directly to <strong>Google Gemini 1.5 Flash</strong> for real-time generative plain-English simplification and grounded legal Q&A.
        </p>

        <div style={{
          background: 'var(--status-info-bg)',
          border: '1px solid var(--status-info-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          marginBottom: '18px',
          fontSize: '0.8rem',
          color: 'var(--text-primary)',
        }}>
          <strong>Privacy Guarantee:</strong> Your API key is stored <em>only</em> inside your local browser storage (<code style={{ color: 'var(--brand-primary)' }}>localStorage</code>). It is never transmitted to any third-party server or database.
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Gemini API Key
          </label>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.75rem',
                color: 'var(--brand-primary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Get a free Gemini API key from Google AI Studio</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {savedSuccess && (
          <div style={{
            background: 'var(--status-fair-bg)',
            border: '1px solid var(--status-fair-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            textAlign: 'center',
            fontSize: '0.825rem',
            color: 'var(--status-fair)',
            fontWeight: 600,
            marginBottom: '16px',
          }}>
            Settings successfully updated!
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={handleClear}
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--status-critical)', borderColor: 'var(--status-critical-border)' }}
            title="Use Offline Local AI Engine"
          >
            <Cpu size={14} /> Clear / Use Local Engine
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary btn-sm">
              <ShieldCheck size={14} /> Save Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
