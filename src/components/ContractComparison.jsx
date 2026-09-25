import React, { useState } from 'react';
import {
  GitCompare,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Eye,
  Plus,
  Minus
} from 'lucide-react';
import { compareDocumentsStructured } from '../services/comparisonEngine';

export default function ContractComparison({ defaultDocText }) {
  const [docAText, setDocAText] = useState(defaultDocText || '');
  const [docBText, setDocBText] = useState('');
  const [titleA, setTitleA] = useState('Document A (Original)');
  const [titleB, setTitleB] = useState('Document B (Revised Draft)');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [selectedWordDiffRow, setSelectedWordDiffRow] = useState(null);

  const handleRunComparison = () => {
    if (!docAText.trim() || !docBText.trim()) return;
    const result = compareDocumentsStructured(docAText, docBText, titleA, titleB);
    setComparisonResult(result);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Potentially important change':
        return (
          <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
            <AlertTriangle size={12} /> Important Change
          </span>
        );
      case 'Added':
        return (
          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
            <Plus size={12} /> Added in B
          </span>
        );
      case 'Removed':
        return (
          <span className="badge badge-caution" style={{ fontSize: '0.7rem' }}>
            <Minus size={12} /> Removed in B
          </span>
        );
      case 'Modified':
        return (
          <span className="badge badge-caution" style={{ fontSize: '0.7rem' }}>
            Modified
          </span>
        );
      default:
        return (
          <span className="badge badge-fair" style={{ fontSize: '0.7rem' }}>
            <CheckCircle2 size={12} /> Unchanged
          </span>
        );
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="card">
        <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitCompare size={20} color="var(--brand-primary)" />
          Two-Document Structured Comparison
        </h3>
        <p style={{ margin: '4px 0 16px', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
          Compare an initial draft against counter-proposals or revisions. Changes are evaluated neutrally without declaring which is "better".
        </p>

        {/* Two Text Inputs Side-by-Side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Document A */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <input
                type="text"
                value={titleA}
                onChange={(e) => setTitleA(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '2px 0',
                }}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                {docAText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              value={docAText}
              onChange={(e) => setDocAText(e.target.value)}
              placeholder="Paste text of Document A (e.g. Landlord's original lease or employer's offer)..."
              rows={7}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* Document B */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <input
                type="text"
                value={titleB}
                onChange={(e) => setTitleB(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '2px 0',
                }}
              />
              <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                {docBText.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              value={docBText}
              onChange={(e) => setDocBText(e.target.value)}
              placeholder="Paste text of Document B (e.g. Tenant's counteroffer or revised amendment)..."
              rows={7}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Compare Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleRunComparison}
            disabled={!docAText.trim() || !docBText.trim()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
          >
            <GitCompare size={16} />
            <span>Generate Structured Comparison</span>
          </button>
        </div>
      </div>

      {/* Comparison Results Table */}
      {comparisonResult && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
              Comparison Matrix ({comparisonResult.totalAreasCompared} Key Areas)
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {comparisonResult.importantChangesCount > 0 && (
                <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                  {comparisonResult.importantChangesCount} Important Changes
                </span>
              )}
              <span className="badge badge-caution" style={{ fontSize: '0.7rem' }}>
                {comparisonResult.modifiedCount} Modified
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                {comparisonResult.addedCount} Added
              </span>
              <span className="badge badge-fair" style={{ fontSize: '0.7rem' }}>
                {comparisonResult.unchangedCount} Unchanged
              </span>
            </div>
          </div>

          {/* Structured Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 14px', width: '18%' }}>Legal Area</th>
                  <th style={{ padding: '12px 14px', width: '26%' }}>{comparisonResult.titleA}</th>
                  <th style={{ padding: '12px 14px', width: '26%' }}>{comparisonResult.titleB}</th>
                  <th style={{ padding: '12px 14px', width: '15%' }}>Change Status</th>
                  <th style={{ padding: '12px 14px', width: '15%' }}>Review Significance</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResult.structuredRows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    }}
                  >
                    {/* Area */}
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {row.area}
                    </td>

                    {/* Doc A */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {row.docA ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {row.docA.heading}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            "{row.docA.text.slice(0, 100)}..."
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not present</span>
                      )}
                    </td>

                    {/* Doc B */}
                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {row.docB ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {row.docB.heading}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            "{row.docB.text.slice(0, 100)}..."
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not present</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      {getStatusBadge(row.changeStatus)}
                    </td>

                    {/* Review Significance & Redline View */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {row.reviewSignificance}
                      </div>
                      {row.wordDiff && row.wordDiff.length > 0 && (
                        <button
                          onClick={() => setSelectedWordDiffRow(row)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                        >
                          <Eye size={11} /> <span>Redline Diff</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Word-Level Diff Modal */}
      {selectedWordDiffRow && (
        <div className="modal-overlay" onClick={() => setSelectedWordDiffRow(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                Word-Level Redline Diff: {selectedWordDiffRow.area}
              </h3>
              {getStatusBadge(selectedWordDiffRow.changeStatus)}
            </div>

            <div style={{
              background: 'var(--bg-input)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem',
              lineHeight: 1.8,
              maxHeight: '360px',
              overflowY: 'auto',
              marginBottom: '16px',
            }}>
              {selectedWordDiffRow.wordDiff.map((token, i) => {
                if (token.type === 'ADDED') {
                  return (
                    <span key={i} style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#34d399', padding: '1px 3px', borderRadius: '3px', textDecoration: 'underline' }}>
                      {token.word}{' '}
                    </span>
                  );
                }
                if (token.type === 'REMOVED') {
                  return (
                    <span key={i} style={{ background: 'rgba(239, 68, 68, 0.25)', color: '#f87171', padding: '1px 3px', borderRadius: '3px', textDecoration: 'line-through' }}>
                      {token.word}{' '}
                    </span>
                  );
                }
                return <span key={i} style={{ color: 'var(--text-secondary)' }}>{token.word} </span>;
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedWordDiffRow(null)} className="btn btn-secondary">
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
