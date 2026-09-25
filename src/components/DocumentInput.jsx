import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Lock,
  Sparkles,
  Home,
  Briefcase,
  Code,
  Cloud,
  FileCheck2,
  CheckCircle2,
  Eye,
  Info
} from 'lucide-react';
import { SAMPLE_DOCUMENTS } from '../data/sampleDocuments';
import { sanitizePII } from '../services/piiSanitizer';

export default function DocumentInput({
  documentText,
  setDocumentText,
  onAnalyze,
  isAnalyzing,
  piiShieldEnabled,
  setPiiShieldEnabled,
  selectedPresetId,
  setSelectedPresetId,
}) {
  const [showPiiPreview, setShowPiiPreview] = useState(false);
  const piiStats = sanitizePII(documentText);

  const handlePresetSelect = (preset) => {
    setSelectedPresetId(preset.id);
    setDocumentText(preset.text);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setSelectedPresetId('custom');
        setDocumentText(content);
      }
    };
    reader.readAsText(file);
  };

  const getPresetIcon = (id) => {
    switch (id) {
      case 'residential-lease': return <Home size={18} />;
      case 'tech-employment': return <Briefcase size={18} />;
      case 'freelance-msa': return <Code size={18} />;
      case 'saas-terms': return <Cloud size={18} />;
      case 'mutual-nda': return <FileCheck2 size={18} />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <div className="card fade-in" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <FileText size={22} color="var(--brand-primary)" />
            Select or Upload Legal Agreement
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Choose a representative consumer/small-business agreement or paste your custom contract.
          </p>
        </div>

        {/* PII Sanitization Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-secondary)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={piiShieldEnabled}
              onChange={(e) => setPiiShieldEnabled(e.target.checked)}
              style={{ accentColor: 'var(--brand-primary)', width: '16px', height: '16px' }}
            />
            <Lock size={15} color={piiShieldEnabled ? 'var(--status-fair)' : 'var(--text-muted)'} />
            <span>Client-Side PII Shield</span>
          </label>

          {piiShieldEnabled && (
            <span
              onClick={() => setShowPiiPreview(!showPiiPreview)}
              className="badge badge-fair"
              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
              title="Click to view masked tokens"
            >
              {piiStats.tokensReplaced} Elements Masked <Eye size={12} style={{ marginLeft: '4px' }} />
            </span>
          )}
        </div>
      </div>

      {/* Preset Buttons Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '10px',
        marginBottom: '16px',
      }}>
        {SAMPLE_DOCUMENTS.map((doc) => {
          const isSelected = selectedPresetId === doc.id;
          return (
            <button
              key={doc.id}
              onClick={() => handlePresetSelect(doc)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                background: isSelected ? 'var(--brand-gradient-subtle)' : 'var(--bg-secondary)',
                border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-fast)',
              }}
            >
              <div style={{
                color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                marginTop: '2px',
              }}>
                {getPresetIcon(doc.id)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? '#ffffff' : 'var(--text-primary)' }}>
                  {doc.title}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {doc.category}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* PII Masking Preview Banner */}
      {showPiiPreview && piiShieldEnabled && piiStats.tokensReplaced > 0 && (
        <div style={{
          background: 'var(--status-fair-bg)',
          border: '1px solid var(--status-fair-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '0.825rem',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--status-fair)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={16} />
            Privacy Protection Active: Detected & Masked {piiStats.tokensReplaced} Sensitive Tokens
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '0.775rem' }}>
            Categories Shielded: {piiStats.categoriesFound.join(', ')}. No real personal identifiers, phone numbers, or exact compensation figures leave this device.
          </div>
        </div>
      )}

      {/* Raw Text Input Area */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={documentText}
          onChange={(e) => {
            setSelectedPresetId('custom');
            setDocumentText(e.target.value);
          }}
          placeholder="Paste agreement text or contract terms here..."
          rows={7}
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '14px',
      }}>
        {/* Upload Custom File */}
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          <Upload size={15} />
          <span>Upload File (.txt, .md)</span>
          <input
            type="file"
            accept=".txt,.md,.text"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>

        {/* Word / Character Count info */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {documentText.split(/\s+/).filter(Boolean).length} words • {documentText.length} characters
        </div>

        {/* Run Analysis CTA */}
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing || !documentText.trim()}
          className="btn btn-primary"
          style={{
            padding: '12px 24px',
            fontSize: '0.95rem',
            fontWeight: 700,
          }}
        >
          {isAnalyzing ? (
            <>
              <div className="spinner" style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              <span>Analyzing Document...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Analyze & Simplify Document</span>
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
