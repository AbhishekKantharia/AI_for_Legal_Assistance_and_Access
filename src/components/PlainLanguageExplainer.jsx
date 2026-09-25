import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Volume2,
  VolumeX,
  Copy,
  Check,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Landmark,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { fetchFederalRegulations, getSearchTermForClauseType } from '../services/federalRegisterService';

export default function PlainLanguageExplainer({ clauses, activeClauseOverride }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL'); // 'ALL' | 'attention' | 'review' | 'standard'
  const [copiedId, setCopiedId] = useState(null);
  const [activeSpeechId, setActiveSpeechId] = useState(null);

  // Federal Register live precedent state
  const [activeFedRegClauseId, setActiveFedRegClauseId] = useState(null);
  const [fedRegCache, setFedRegCache] = useState({});
  const [loadingFedReg, setLoadingFedReg] = useState(false);

  if (!clauses || clauses.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No clauses to simplify. Please upload a document first.</p>
      </div>
    );
  }

  const filteredClauses = clauses.filter((c) => {
    if (filterSeverity !== 'ALL' && c.reviewSignal?.severity !== filterSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.heading.toLowerCase().includes(q) ||
        c.plainEnglish.toLowerCase().includes(q) ||
        c.originalText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleAudio = (clause) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (activeSpeechId === clause.id) {
      window.speechSynthesis.cancel();
      setActiveSpeechId(null);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${clause.heading}. Plain English Translation: ${clause.plainEnglish}. Why it matters: ${clause.whyItMatters}. What to check: ${clause.whatToCheck}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onend = () => setActiveSpeechId(null);
      utterance.onerror = () => setActiveSpeechId(null);

      window.speechSynthesis.speak(utterance);
      setActiveSpeechId(clause.id);
    }
  };

  const handleToggleFedReg = async (clause) => {
    if (activeFedRegClauseId === clause.id) {
      setActiveFedRegClauseId(null);
      return;
    }

    setActiveFedRegClauseId(clause.id);
    if (fedRegCache[clause.id]) return;

    setLoadingFedReg(true);
    const searchTerm = getSearchTermForClauseType(clause.clauseCategory || 'GENERAL');

    try {
      const data = await fetchFederalRegulations(searchTerm, { perPage: 2 });
      setFedRegCache((prev) => ({ ...prev, [clause.id]: data.results || [] }));
    } catch (err) {
      console.error('Failed to load federal regulations:', err);
      setFedRegCache((prev) => ({ ...prev, [clause.id]: [] }));
    } finally {
      setLoadingFedReg(false);
    }
  };

  const getSeverityBadge = (signal) => {
    switch (signal?.severity) {
      case 'attention':
        return (
          <span className="badge badge-critical">
            <ShieldAlert size={12} /> Requires Attention
          </span>
        );
      case 'review':
        return (
          <span className="badge badge-caution">
            <AlertTriangle size={12} /> Potential Issue
          </span>
        );
      case 'ambiguous':
        return (
          <span className="badge badge-info">
            <HelpCircle size={12} /> Unclear Wording
          </span>
        );
      default:
        return (
          <span className="badge badge-fair">
            <CheckCircle2 size={12} /> Standard Term
          </span>
        );
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Severity Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterSeverity('ALL')}
            className={`btn btn-sm ${filterSeverity === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Clauses ({clauses.length})
          </button>
          <button
            onClick={() => setFilterSeverity('attention')}
            className={`btn btn-sm ${filterSeverity === 'attention' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ color: filterSeverity === 'attention' ? '#fff' : 'var(--status-critical)' }}
          >
            Requires Attention ({clauses.filter(c => c.reviewSignal?.severity === 'attention').length})
          </button>
          <button
            onClick={() => setFilterSeverity('review')}
            className={`btn btn-sm ${filterSeverity === 'review' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ color: filterSeverity === 'review' ? '#fff' : 'var(--status-caution)' }}
          >
            Potential Issues ({clauses.filter(c => c.reviewSignal?.severity === 'review').length})
          </button>
          <button
            onClick={() => setFilterSeverity('standard')}
            className={`btn btn-sm ${filterSeverity === 'standard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ color: filterSeverity === 'standard' ? '#fff' : 'var(--status-fair)' }}
          >
            Standard ({clauses.filter(c => c.reviewSignal?.severity === 'standard').length})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search clause text or translations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px 8px 36px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Clause Simplification Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredClauses.map((clause) => (
          <div
            key={clause.id}
            className="card"
            style={{
              borderLeft: `4px solid ${
                clause.reviewSignal?.severity === 'attention'
                  ? 'var(--status-critical)'
                  : clause.reviewSignal?.severity === 'review'
                  ? 'var(--status-caution)'
                  : 'var(--status-fair)'
              }`,
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '12px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
                  {clause.heading}
                </h3>
                {getSeverityBadge(clause.reviewSignal)}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Estimated Page {clause.sourceLocation?.estimatedPage || 1}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Federal Rules Lookup */}
                <button
                  onClick={() => handleToggleFedReg(clause)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.75rem',
                    color: activeFedRegClauseId === clause.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    borderColor: activeFedRegClauseId === clause.id ? 'var(--brand-primary)' : 'var(--border-color)',
                  }}
                  title="Check live U.S. Federal Register rules for this clause category"
                >
                  <Landmark size={13} />
                  <span>Federal Rules</span>
                  {activeFedRegClauseId === clause.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {/* Audio TTS */}
                <button
                  onClick={() => handleToggleAudio(clause)}
                  className="btn btn-secondary btn-sm"
                  title="Read plain English explanation aloud"
                >
                  {activeSpeechId === clause.id ? <VolumeX size={14} color="var(--brand-primary)" /> : <Volume2 size={14} />}
                  <span>{activeSpeechId === clause.id ? 'Stop' : 'Listen'}</span>
                </button>

                {/* Copy Plain English */}
                <button
                  onClick={() => handleCopy(clause.id, clause.plainEnglish)}
                  className="btn btn-secondary btn-sm"
                  title="Copy plain English summary"
                >
                  {copiedId === clause.id ? <Check size={13} color="var(--status-fair)" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Live Federal Register Accordion */}
            {activeFedRegClauseId === clause.id && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--brand-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '0.8rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    <Landmark size={14} />
                    <span>Official Federal Register Precedents & Agency Guidance</span>
                  </div>
                  <span className="badge badge-fair" style={{ fontSize: '0.65rem' }}>Live API Verified</span>
                </div>

                {loadingFedReg ? (
                  <div style={{ color: 'var(--text-muted)', padding: '6px 0' }}>Querying federalregister.gov...</div>
                ) : (fedRegCache[clause.id] || []).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No specific federal agency actions found for this category query.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {fedRegCache[clause.id].map((reg) => (
                      <div key={reg.document_number} style={{ background: 'var(--bg-input)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{reg.title}</span>
                          {reg.html_url && (
                            <a href={reg.html_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
                              <ExternalLink size={11} /> <span>Rule</span>
                            </a>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Doc #{reg.document_number} • {reg.agencies.map(a => a.name).join(', ')} • {reg.publication_date}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Side-by-Side: Original vs Plain English & Review Guidance */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '18px',
            }}>
              {/* Left Column: Original Source Text */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span>Original Source Text</span>
                  <span>Section {clause.sourceLocation?.clauseIndex}</span>
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.825rem',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {clause.originalText}
                </div>
              </div>

              {/* Right Column: Plain English, Why It Matters, What To Check */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Plain English Translation */}
                <div style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  border: '1px solid var(--border-color-focus)',
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--brand-primary)',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <Sparkles size={14} />
                    <span>Plain English Explanation</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                    {clause.plainEnglish}
                  </p>
                </div>

                {/* Why It Matters */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.825rem',
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Why It Matters:
                  </div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {clause.whyItMatters}
                  </div>
                </div>

                {/* What To Check */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  border: '1px solid var(--status-caution-border)',
                  fontSize: '0.825rem',
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--status-caution)', marginBottom: '4px' }}>
                    What To Check / Investigate:
                  </div>
                  <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {clause.whatToCheck}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
