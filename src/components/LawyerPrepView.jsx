import React, { useState } from 'react';
import {
  Briefcase,
  HelpCircle,
  CheckSquare,
  Square,
  Download,
  Copy,
  Check,
  Printer,
  Shield,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  generateLawyerQuestions,
  generateGroundedChecklist,
  generateLawyerConsultationMarkdown,
} from '../services/lawyerPrepService';
import { downloadTextFile } from '../services/exportService';
import { LEGAL_DISCLAIMER_TEXT } from '../services/legalSafety';

export default function LawyerPrepView({ documentModel }) {
  const [userNotes, setUserNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [checklistState, setChecklistState] = useState(() =>
    documentModel ? generateGroundedChecklist(documentModel) : []
  );

  if (!documentModel) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No document loaded. Please upload or analyze an agreement first.</p>
      </div>
    );
  }

  const questions = generateLawyerQuestions(documentModel.reviewAreas || [], documentModel.keyFacts || {});

  const handleToggleCheckItem = (id) => {
    setChecklistState((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  };

  const handleCopyMarkdown = () => {
    const md = generateLawyerConsultationMarkdown(documentModel, userNotes);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateLawyerConsultationMarkdown(documentModel, userNotes);
    const filename = `${(documentModel.keyFacts?.agreementType || 'Legal_Agreement').replace(/[^a-zA-Z0-9]/g, '_')}_Lawyer_Briefing.md`;
    downloadTextFile(filename, md);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Banner with Clear Non-Lawyer Disclaimer */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid var(--border-color-focus)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Briefcase size={22} color="var(--brand-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
              Prepare for a Legal Consultation (Attorney Briefing Package)
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handlePrintPdf} className="btn btn-secondary btn-sm" title="Print or save as PDF">
              <Printer size={14} /> <span>Print / Save PDF</span>
            </button>
            <button onClick={handleDownloadMarkdown} className="btn btn-secondary btn-sm" title="Download Markdown dossier">
              <Download size={14} /> <span>Export .MD</span>
            </button>
            <button onClick={handleCopyMarkdown} className="btn btn-primary btn-sm" title="Copy briefing package to clipboard">
              {copied ? <Check size={14} color="#fff" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Package'}</span>
            </button>
          </div>
        </div>

        <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          This package synthesizes your document's key facts, deadlines, and detected review areas into an executive summary so you can maximize billable efficiency during an attorney consultation.
        </p>

        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          borderLeft: '3px solid var(--status-caution)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          color: '#fbbf24',
        }}>
          <strong>Important Notice:</strong> {LEGAL_DISCLAIMER_TEXT}
        </div>
      </div>

      {/* 1. Document Overview */}
      <div className="card">
        <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FileText size={16} color="var(--brand-primary)" />
          1. Document Briefing Overview
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '0.825rem' }}>
          <div><strong>Agreement:</strong> {documentModel.keyFacts?.agreementType}</div>
          <div><strong>Parties:</strong> {documentModel.keyFacts?.parties?.join(' & ')}</div>
          <div><strong>Governing Law:</strong> {documentModel.keyFacts?.governingLaw}</div>
          <div><strong>Term / Notice:</strong> {documentModel.keyFacts?.term} ({documentModel.keyFacts?.terminationNotice})</div>
        </div>
      </div>

      {/* 2. Key Questions to Ask a Lawyer */}
      <div className="card">
        <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <HelpCircle size={16} color="var(--brand-primary)" />
          2. Tailored Questions to Ask Your Lawyer
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {questions.map((q, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-secondary)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                lineHeight: 1.45,
              }}
            >
              <strong style={{ color: 'var(--brand-primary)' }}>Q{idx + 1}:</strong> {q}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Clauses to Discuss (With Source Citations) */}
      <div className="card">
        <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={16} color="var(--status-caution)" />
          3. Specific Provisions to Flag & Discuss (Grounded Citations)
        </h4>

        {(!documentModel.reviewAreas || documentModel.reviewAreas.length === 0) ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No high-priority provisions flagged for consultation.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {documentModel.reviewAreas.map((area, idx) => (
              <div
                key={area.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {idx + 1}. {area.heading}
                  </span>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                    Page ~{area.sourceLocation?.estimatedPage || 1}
                  </span>
                </div>

                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <strong>Plain English Meaning:</strong> {area.plainEnglish}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--status-caution)', marginBottom: '8px' }}>
                  <strong>Consultation Focus:</strong> {area.whatToCheck}
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}>
                  "{area.originalText.slice(0, 160)}..."
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Actionable Pre-Signing Checklist */}
      <div className="card">
        <h4 style={{ fontSize: '0.95rem', margin: '0 0 12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckSquare size={16} color="var(--brand-primary)" />
          4. Actionable Pre-Signing Checklist
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {checklistState.map((item) => (
            <label
              key={item.id}
              onClick={() => handleToggleCheckItem(item.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                background: item.completed ? 'var(--status-fair-bg)' : 'var(--bg-secondary)',
                border: `1px solid ${item.completed ? 'var(--status-fair-border)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '0.825rem',
              }}
            >
              {item.completed ? (
                <CheckSquare size={16} color="var(--status-fair)" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ flex: 1 }}>
                <span style={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {item.task}
                </span>
                <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: 'var(--brand-primary)' }}>
                  ({item.source})
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 5. Client Custom Concerns & Context */}
      <div className="card">
        <h4 style={{ fontSize: '0.95rem', margin: '0 0 8px', color: 'var(--text-primary)' }}>
          5. Your Specific Goals, Questions & Negotiation Concerns
        </h4>
        <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Add your personal concerns or business requirements here. They will be included in the exported attorney briefing package.
        </p>

        <textarea
          value={userNotes}
          onChange={(e) => setUserNotes(e.target.value)}
          placeholder="e.g., I am planning to move out in 8 months, so I need an early termination break clause. Also, I have a pre-existing weekend open-source project that I must retain ownership of..."
          rows={4}
          style={{
            width: '100%',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            fontSize: '0.825rem',
            color: 'var(--text-primary)',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
