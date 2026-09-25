import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  HelpCircle,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Edit3
} from 'lucide-react';
import { generateLawyerDossierMarkdown, downloadTextFile } from '../services/exportService';

export default function LawyerPrepDossier({ analysis }) {
  const [customNotes, setCustomNotes] = useState(
    'Key goals for consultation: Push back on non-compete duration and ensure return of security deposit timeline complies with state regulations.'
  );
  const [copied, setCopied] = useState(false);

  if (!analysis) return null;

  const dossierMarkdown = generateLawyerDossierMarkdown(analysis, customNotes);

  const handleDownload = () => {
    downloadTextFile('ClauseGuard_Legal_Consultation_Dossier.md', dossierMarkdown);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(dossierMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fade-in">
      {/* Dossier Header and Action Buttons */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <FileText size={22} color="var(--brand-primary)" />
              Lawyer Consultation Briefing Dossier
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Take this structured briefing into your attorney consultation to save hours of billable time ($300-$500/hr) and negotiate strategically.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={handleCopy} className="btn btn-secondary btn-sm">
              {copied ? <Check size={14} color="var(--status-fair)" /> : <Copy size={14} />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Briefing'}</span>
            </button>
            <button onClick={handleDownload} className="btn btn-secondary btn-sm">
              <Download size={14} />
              <span>Download (.md)</span>
            </button>
            <button onClick={handlePrint} className="btn btn-primary btn-sm">
              <Printer size={14} />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Structured Briefing Document Display (Formatted for Screen and Print) */}
      <div className="card" style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}>
        {/* Title and Meta */}
        <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span className="badge badge-info" style={{ marginBottom: '8px' }}>
                Attorney Consultation Dossier
              </span>
              <h2 style={{ fontSize: '1.4rem', margin: '4px 0' }}>
                {analysis.title || 'Legal Agreement Review'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Generated via ClauseGuard • Informational & Negotiation Preparation
              </p>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              textAlign: 'right',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Exposure Rating</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--status-critical)' }}>
                {analysis.overallRiskScore} / 100
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {analysis.riskCategory}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div>
          <h4 style={{ fontSize: '1.05rem', color: 'var(--brand-primary)', marginBottom: '10px' }}>
            1. Executive Risk Breakdown
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            fontSize: '0.85rem',
          }}>
            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <strong>Clauses Analyzed:</strong> {analysis.totalClauses}
            </div>
            <div style={{ background: 'var(--status-critical-bg)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--status-critical)' }}>
              <strong>Critical Red Flags:</strong> {analysis.criticalCount}
            </div>
            <div style={{ background: 'var(--status-caution-bg)', padding: '12px', borderRadius: 'var(--radius-sm)', color: 'var(--status-caution)' }}>
              <strong>Caution Clauses:</strong> {analysis.cautionCount}
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <strong>Original Complexity:</strong> Grade {analysis.overallReadabilityOriginal.fleschKincaidGrade}
            </div>
          </div>
        </div>

        {/* Section 2: Top Red Flags & Suggested Amendments */}
        <div>
          <h4 style={{ fontSize: '1.05rem', color: 'var(--brand-primary)', marginBottom: '12px' }}>
            2. Priority Red Flags & Proposed Counter-Amendments
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {analysis.redFlags?.map((rf, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${rf.riskLevel === 'CRITICAL' ? 'var(--status-critical-border)' : 'var(--status-caution-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '0.95rem' }}>{idx + 1}. {rf.heading}</strong>
                  <span className={`badge ${rf.riskLevel === 'CRITICAL' ? 'badge-critical' : 'badge-caution'}`} style={{ fontSize: '0.65rem' }}>
                    {rf.riskLevel}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  <strong>The Trap:</strong> {rf.trap}
                </p>
                <div style={{
                  background: 'var(--bg-input)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  fontStyle: 'italic',
                  borderLeft: '3px solid var(--status-fair)',
                }}>
                  <strong style={{ fontStyle: 'normal', color: 'var(--status-fair)' }}>Recommended Amendment Language:</strong><br />
                  "{rf.counter}"
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: 5 Key Questions for the Attorney */}
        <div>
          <h4 style={{ fontSize: '1.05rem', color: 'var(--brand-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} />
            3. Targeted Questions to Ask Your Lawyer
          </h4>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
            <li>
              <strong>Enforceability Check:</strong> Are the restrictive covenants, non-competes, or liquidated damage fees fully enforceable in my jurisdiction?
            </li>
            <li>
              <strong>Worst-Case Liability:</strong> Under the indemnification and limitation of liability clauses, what is my maximum financial liability if an unforeseen breach happens?
            </li>
            <li>
              <strong>Negotiation Precedent:</strong> How standard is the proposed counter-language for these red-flagged clauses in industry practice?
            </li>
            <li>
              <strong>Termination Rights:</strong> Do I have reciprocal rights to terminate for cause if the other party fails to deliver or breaches terms?
            </li>
            <li>
              <strong>Dispute Forum:</strong> Does the mandatory arbitration or venue clause significantly prejudice my rights compared to local small claims court?
            </li>
          </ol>
        </div>

        {/* Section 4: Personal Notes & Context Area */}
        <div>
          <h4 style={{ fontSize: '1.05rem', color: 'var(--brand-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={18} />
            4. Personal Notes & Specific Context (Saved in Dossier)
          </h4>
          <textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            rows={3}
            placeholder="Type any specific details, personal priorities, or deadlines to mention to your attorney..."
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-body)',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
