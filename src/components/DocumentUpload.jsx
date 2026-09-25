import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Lock,
  Sparkles,
  Home,
  Briefcase,
  Code,
  FileCheck2,
  CheckCircle2,
  Eye,
  Landmark,
  Layers,
  AlertCircle,
  FileCheck,
  Shield
} from 'lucide-react';
import { SYNTHETIC_DOCUMENTS } from '../data/syntheticContracts';
import { sanitizePII } from '../services/piiSanitizer';
import { parseDocumentFile, validateDocumentFile } from '../services/documentParser';
import FederalRegisterBrowser from './FederalRegisterBrowser';

export default function DocumentUpload({
  documentText,
  setDocumentText,
  documentMetadata,
  setDocumentMetadata,
  onAnalyze,
  isAnalyzing,
  piiShieldEnabled,
  setPiiShieldEnabled,
  selectedPresetId,
  setSelectedPresetId,
  setDocumentTitle,
  onSwitchToCompare,
}) {
  const [inputSource, setInputSource] = useState('demo'); // 'demo' | 'upload' | 'live-gov' | 'paste'
  const [showPiiPreview, setShowPiiPreview] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const piiStats = sanitizePII(documentText);

  const handlePresetSelect = (preset) => {
    setSelectedPresetId(preset.id);
    setDocumentText(preset.text);
    if (setDocumentTitle) setDocumentTitle(preset.title);
    if (setDocumentMetadata) {
      setDocumentMetadata({
        filename: `${preset.id}.txt`,
        documentType: 'TXT (Demo Contract)',
        characterCount: preset.text.length,
        wordCount: preset.text.split(/\s+/).filter(Boolean).length,
        estimatedPages: Math.max(1, Math.ceil(preset.text.split(/\s+/).filter(Boolean).length / 400)),
        isDemo: true,
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    setUploadError(null);
    setIsProcessingFile(true);

    try {
      const { rawText, metadata } = await parseDocumentFile(file);
      setSelectedPresetId('custom-file');
      setDocumentText(rawText);
      if (setDocumentTitle) setDocumentTitle(file.name.replace(/\.[^/.]+$/, ''));
      if (setDocumentMetadata) setDocumentMetadata(metadata);
      setInputSource('upload');
      if (onAnalyze) onAnalyze(rawText, file.name.replace(/\.[^/.]+$/, ''));
    } catch (err) {
      setUploadError(err.message || 'Failed to extract text from document.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleImportFromFederalRegister = (formattedText, title) => {
    setSelectedPresetId('federal-register-live');
    setDocumentText(formattedText);
    if (setDocumentTitle) setDocumentTitle(title);
    if (setDocumentMetadata) {
      setDocumentMetadata({
        filename: 'Federal_Register_Regulation.txt',
        documentType: 'Live Gov API (Federal Register)',
        characterCount: formattedText.length,
        wordCount: formattedText.split(/\s+/).filter(Boolean).length,
        estimatedPages: Math.max(1, Math.ceil(formattedText.split(/\s+/).filter(Boolean).length / 400)),
        isLiveGov: true,
      });
    }
    setInputSource('demo');
    if (onAnalyze) onAnalyze(formattedText, title);
  };

  const getPresetIcon = (id) => {
    switch (id) {
      case 'demo-residential-lease': return <Home size={18} />;
      case 'demo-tech-employment': return <Briefcase size={18} />;
      case 'demo-freelance-services': return <Code size={18} />;
      case 'demo-mutual-nda': return <FileCheck2 size={18} />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <div className="card fade-in" style={{ marginBottom: '24px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <FileText size={22} color="var(--brand-primary)" />
            Step 1 — Upload or Select Legal Document
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Upload your PDF, DOCX, or TXT file, choose a synthetic contract, or search live federal regulations.
          </p>
        </div>

        {/* Privacy & In-Memory Shield */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'var(--bg-secondary)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Shield size={14} color="var(--status-fair)" /> In-Memory Session (No Permanent Storage)
          </span>

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
            <Lock size={14} color={piiShieldEnabled ? 'var(--status-fair)' : 'var(--text-muted)'} />
            <span>PII Redactor</span>
          </label>

          {piiShieldEnabled && (
            <span
              onClick={() => setShowPiiPreview(!showPiiPreview)}
              className="badge badge-fair"
              style={{ cursor: 'pointer', fontSize: '0.7rem' }}
              title="Click to view masked tokens"
            >
              {piiStats.tokensReplaced} Masked <Eye size={12} style={{ marginLeft: '4px' }} />
            </span>
          )}
        </div>
      </div>

      {/* Input Source Mode Selector */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px',
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setInputSource('demo')}
          className={`btn btn-sm ${inputSource === 'demo' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Layers size={14} />
          <span>Synthetic Demo Agreements ({SYNTHETIC_DOCUMENTS.length})</span>
        </button>

        <button
          onClick={() => setInputSource('upload')}
          className={`btn btn-sm ${inputSource === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Upload size={14} />
          <span>Upload File (PDF, DOCX, TXT)</span>
        </button>

        <button
          onClick={() => setInputSource('live-gov')}
          className={`btn btn-sm ${inputSource === 'live-gov' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Landmark size={14} />
          <span>Verified Live Federal Register API</span>
          <span className="badge badge-fair" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Live</span>
        </button>

        <button
          onClick={() => setInputSource('paste')}
          className={`btn btn-sm ${inputSource === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FileText size={14} />
          <span>Paste Raw Agreement</span>
        </button>
      </div>

      {/* Live Government Federal Register Browser */}
      {inputSource === 'live-gov' && (
        <FederalRegisterBrowser onImportDocument={handleImportFromFederalRegister} />
      )}

      {/* Demo Agreements Grid */}
      {inputSource === 'demo' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
          marginBottom: '16px',
        }}>
          {SYNTHETIC_DOCUMENTS.map((doc) => {
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
                <div style={{ color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)', marginTop: '2px' }}>
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
      )}

      {/* Direct File Drag & Drop / Upload Area */}
      {inputSource === 'upload' && (
        <div style={{
          border: '2px dashed var(--border-color-focus)',
          borderRadius: 'var(--radius-md)',
          padding: '28px 20px',
          textAlign: 'center',
          background: 'var(--bg-input)',
          marginBottom: '16px',
        }}>
          <Upload size={32} color="var(--brand-primary)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '1rem', margin: '0 0 6px' }}>Upload your agreement (.pdf, .docx, .txt, .md)</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 auto 14px', maxWidth: '460px' }}>
            Supported: Text-based PDF, Microsoft Word (.docx), plain text (.txt, .md). Maximum file size: 10 MB. In-memory processing only.
          </p>

          <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} />
            <span>{isProcessingFile ? 'Extracting Text...' : 'Select Document File'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md,.text"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isProcessingFile}
            />
          </label>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div style={{
          background: 'var(--status-critical-bg)',
          border: '1px solid var(--status-critical-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'var(--status-critical)',
          fontSize: '0.85rem',
        }}>
          <AlertCircle size={18} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* PII Masking Notification Banner */}
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
            Privacy Protection Active: Masked {piiStats.tokensReplaced} Sensitive Tokens
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.775rem' }}>
            Categories Shielded: {piiStats.categoriesFound.join(', ')}. All sensitive identifiers stay in local memory.
          </div>
        </div>
      )}

      {/* Raw Text View / Custom Editor */}
      <div style={{ position: 'relative' }}>
        <textarea
          value={documentText}
          onChange={(e) => {
            setSelectedPresetId('custom');
            setDocumentText(e.target.value);
          }}
          placeholder="Paste agreement text or view extracted document contents here..."
          rows={6}
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.825rem',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>

      {/* Metadata & Primary Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '14px',
      }}>
        {/* Document Stats */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck size={15} color="var(--brand-primary)" />
          <span>
            {documentMetadata?.filename || 'Document'}: {documentText.split(/\s+/).filter(Boolean).length} words • {documentMetadata?.estimatedPages || Math.max(1, Math.ceil(documentText.split(/\s+/).filter(Boolean).length / 400))} page(s)
          </span>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onSwitchToCompare && (
            <button
              onClick={onSwitchToCompare}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              Compare Two Documents
            </button>
          )}

          <button
            onClick={() => onAnalyze()}
            disabled={isAnalyzing || !documentText.trim()}
            className="btn btn-primary"
            style={{
              padding: '10px 22px',
              fontSize: '0.925rem',
              fontWeight: 700,
            }}
          >
            {isAnalyzing ? (
              <>
                <div
                  className="spinner"
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <span>Analyzing Document...</span>
              </>
            ) : (
              <>
                <Sparkles size={17} />
                <span>Analyze Document</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
