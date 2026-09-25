import React, { useState } from 'react';
import {
  FileText,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Landmark,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  HelpCircle,
  Eye
} from 'lucide-react';

export default function DocumentDashboard({ documentModel, onSelectClauseForExplain }) {
  const [selectedSourceClause, setSelectedSourceClause] = useState(null);

  if (!documentModel) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No document loaded. Please upload or select a document first.</p>
      </div>
    );
  }

  const {
    executiveSummary,
    keyFacts,
    clauses,
    obligations,
    datesAndDeadlines,
    reviewAreas,
    readability,
    totalClauses,
    reviewAreaCount,
  } = documentModel;

  const getImportanceBadge = (signal) => {
    switch (signal?.severity) {
      case 'attention':
        return (
          <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
            <ShieldAlert size={12} /> Requires Attention
          </span>
        );
      case 'review':
        return (
          <span className="badge badge-caution" style={{ fontSize: '0.7rem' }}>
            <AlertTriangle size={12} /> Potential Issue
          </span>
        );
      case 'ambiguous':
        return (
          <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
            <HelpCircle size={12} /> Unclear Wording
          </span>
        );
      default:
        return (
          <span className="badge badge-fair" style={{ fontSize: '0.7rem' }}>
            <CheckCircle2 size={12} /> Standard Provision
          </span>
        );
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* A. Executive Summary & Complexity Reduction Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid var(--border-color-focus)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--brand-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Executive Document Summary</h3>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <span className="badge badge-info">
              {totalClauses} Structured Clauses
            </span>
            <span className={reviewAreaCount > 0 ? 'badge badge-caution' : 'badge badge-fair'}>
              {reviewAreaCount} Review Area(s) Detected
            </span>
            {readability && (
              <span className="badge badge-fair">
                Readability: Grade {readability.fleschKincaidGrade} ({readability.gradeLabel})
              </span>
            )}
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
          {executiveSummary}
        </p>
      </div>

      {/* B. Key Facts Grid */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Info size={18} color="var(--brand-primary)" />
          Key Contractual Facts (Document Grounded)
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
        }}>
          {/* Agreement Type */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Agreement Type</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {keyFacts?.agreementType || 'General Contract'}
            </div>
          </div>

          {/* Parties */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Identified Parties</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
              {keyFacts?.parties?.join(' • ') || 'Not explicitly stated in preamble'}
            </div>
          </div>

          {/* Effective Date & Term */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Effective Date & Term</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
              {keyFacts?.effectiveDate || 'N/A'} ({keyFacts?.term || 'Duration per terms'})
            </div>
          </div>

          {/* Payment Terms */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Payment Terms</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
              {keyFacts?.paymentTerms || 'Specified in schedule'}
            </div>
          </div>

          {/* Termination Notice */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Termination Notice</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
              {keyFacts?.terminationNotice || 'Written notice required'}
            </div>
          </div>

          {/* Renewal Provisions */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Renewal Terms</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
              {keyFacts?.renewal || 'No auto-renewal detected'}
            </div>
          </div>

          {/* Governing Law */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Governing Law</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
              {keyFacts?.governingLaw || 'State / jurisdiction not stated'}
            </div>
          </div>
        </div>
      </div>

      {/* C. Important Clauses */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--brand-primary)" />
              Important Clauses ({clauses?.length || 0})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Click "View Source" to examine verbatim contract wording and page location.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {(clauses || []).map((clause) => (
            <div
              key={clause.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                    {clause.heading}
                  </h4>
                  {getImportanceBadge(clause.reviewSignal)}
                </div>

                <p style={{ margin: '0 0 10px', fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {clause.plainEnglish}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-color-subtle)' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Estimated Page {clause.sourceLocation?.estimatedPage || 1}
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedSourceClause(clause)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.725rem', padding: '4px 8px' }}
                  >
                    <Eye size={12} />
                    <span>View Source</span>
                  </button>

                  {onSelectClauseForExplain && (
                    <button
                      onClick={() => onSelectClauseForExplain(clause)}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.725rem', padding: '4px 8px' }}
                    >
                      <span>Explain</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* D. Structured Obligations: Your Obligations vs Other Party Obligations */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Users size={18} color="var(--brand-primary)" />
          Extracted Obligations (Bilateral Separation)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {/* Your Obligations */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--brand-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Your Obligations (Tenant / Employee / Contractor)</span>
            </div>

            {(!obligations?.yourObligations || obligations.yourObligations.length === 0) ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No explicit unilateral obligations detected.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {obligations.yourObligations.map((o, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>{o.obligation}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span>Source: {o.source}</span>
                      <span style={{ color: 'var(--status-caution)' }}>Deadline: {o.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Other Party's Obligations */}
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--status-fair)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Other Party's Obligations (Landlord / Company / Client)</span>
            </div>

            {(!obligations?.otherPartyObligations || obligations.otherPartyObligations.length === 0) ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No specific counter-party obligations extracted in primary sections.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {obligations.otherPartyObligations.map((o, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>{o.obligation}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span>Source: {o.source}</span>
                      <span>Timeline: {o.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* E. Dates & Deadlines */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Clock size={18} color="var(--brand-primary)" />
          Dates & Time-Based Obligations ({datesAndDeadlines?.length || 0})
        </h3>

        {(!datesAndDeadlines || datesAndDeadlines.length === 0) ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No explicit calendar deadlines extracted from this document.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {datesAndDeadlines.map((d, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.dateString}</span>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>{d.category}</span>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {d.sourceSnippet}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* F. Review Areas (Calibrated Review Signals) */}
      <div className="card" style={{ borderLeft: '4px solid var(--status-caution)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="var(--status-caution)" />
              Review Areas Deserving Human Attention ({reviewAreas?.length || 0})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              These are objective review signals, not legal determinations. Consider reviewing these with a legal professional.
            </p>
          </div>
        </div>

        {(!reviewAreas || reviewAreas.length === 0) ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No elevated review areas flagged in primary clauses.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reviewAreas.map((area) => (
              <div
                key={area.id}
                style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {area.heading}
                  </span>
                  {getImportanceBadge(area.reviewSignal)}
                </div>

                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.45 }}>
                  <strong>Why it matters:</strong> {area.whyItMatters}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--status-caution)', lineHeight: 1.4 }}>
                  <strong>What to check:</strong> {area.whatToCheck}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Source Citation Modal */}
      {selectedSourceClause && (
        <div className="modal-overlay" onClick={() => setSelectedSourceClause(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Verbatim Source Excerpt</h3>
              <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                Page {selectedSourceClause.sourceLocation?.estimatedPage || 1}
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
              Section: <strong>{selectedSourceClause.heading}</strong>
            </div>

            <div style={{
              background: 'var(--bg-input)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.825rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              maxHeight: '360px',
              overflowY: 'auto',
              marginBottom: '18px',
            }}>
              {selectedSourceClause.originalText}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedSourceClause(null)} className="btn btn-secondary">
                Close Source View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
