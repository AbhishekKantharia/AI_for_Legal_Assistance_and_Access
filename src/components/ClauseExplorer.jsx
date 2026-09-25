import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Search,
  Sparkles,
  Landmark,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  Building2
} from 'lucide-react';
import { fetchFederalRegulations, getSearchTermForClauseType } from '../services/federalRegisterService';

export default function ClauseExplorer({ clauses }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'CAUTION' | 'FAIR'
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [activeSpeechClauseId, setActiveSpeechClauseId] = useState(null);

  // Live Federal Regulations Lookup State
  const [activeRegClauseId, setActiveRegClauseId] = useState(null);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [regCache, setRegCache] = useState({});

  if (!clauses || clauses.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>No clauses to display. Please analyze a document first.</p>
      </div>
    );
  }

  const filteredClauses = clauses.filter((c) => {
    if (filter !== 'ALL' && c.riskLevel !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.heading.toLowerCase().includes(q) ||
        c.originalText.toLowerCase().includes(q) ||
        c.plainSummary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeakClause = (clause) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported in this browser.');
      return;
    }

    if (activeSpeechClauseId === clause.id) {
      window.speechSynthesis.cancel();
      setActiveSpeechClauseId(null);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${clause.heading}. Plain English Summary: ${clause.plainSummary}. Potential Trap: ${clause.trapExplanation}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onend = () => setActiveSpeechClauseId(null);
      utterance.onerror = () => setActiveSpeechClauseId(null);

      window.speechSynthesis.speak(utterance);
      setActiveSpeechClauseId(clause.id);
    }
  };

  const handleToggleRegulations = async (clause) => {
    if (activeRegClauseId === clause.id) {
      setActiveRegClauseId(null);
      return;
    }

    setActiveRegClauseId(clause.id);

    // If already in cache, do not re-fetch
    if (regCache[clause.id]) return;

    setLoadingRegs(true);
    const searchTerm = getSearchTermForClauseType(clause.type || 'GENERAL');

    try {
      const data = await fetchFederalRegulations(searchTerm, { perPage: 2 });
      setRegCache((prev) => ({ ...prev, [clause.id]: data.results || [] }));
    } catch (err) {
      console.error('Failed to load federal regulations for clause:', err);
      setRegCache((prev) => ({ ...prev, [clause.id]: [] }));
    } finally {
      setLoadingRegs(false);
    }
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="badge badge-critical">
            <ShieldAlert size={13} /> Critical Trap
          </span>
        );
      case 'CAUTION':
        return (
          <span className="badge badge-caution">
            <AlertTriangle size={13} /> Caution
          </span>
        );
      default:
        return (
          <span className="badge badge-fair">
            <CheckCircle2 size={13} /> Standard Term
          </span>
        );
    }
  };

  return (
    <div className="fade-in">
      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {/* Risk Level Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter('ALL')}
            className={`btn btn-sm ${filter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Clauses ({clauses.length})
          </button>
          <button
            onClick={() => setFilter('CRITICAL')}
            className={`btn btn-sm ${filter === 'CRITICAL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              borderColor: filter === 'CRITICAL' ? 'transparent' : 'var(--status-critical-border)',
              color: filter === 'CRITICAL' ? '#ffffff' : 'var(--status-critical)',
            }}
          >
            Critical Traps ({clauses.filter(c => c.riskLevel === 'CRITICAL').length})
          </button>
          <button
            onClick={() => setFilter('CAUTION')}
            className={`btn btn-sm ${filter === 'CAUTION' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              borderColor: filter === 'CAUTION' ? 'transparent' : 'var(--status-caution-border)',
              color: filter === 'CAUTION' ? '#ffffff' : 'var(--status-caution)',
            }}
          >
            Caution Items ({clauses.filter(c => c.riskLevel === 'CAUTION').length})
          </button>
          <button
            onClick={() => setFilter('FAIR')}
            className={`btn btn-sm ${filter === 'FAIR' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              borderColor: filter === 'FAIR' ? 'transparent' : 'var(--status-fair-border)',
              color: filter === 'FAIR' ? '#ffffff' : 'var(--status-fair)',
            }}
          >
            Standard ({clauses.filter(c => c.riskLevel === 'FAIR').length})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search clauses or topics..."
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

      {/* Clause Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredClauses.map((clause) => (
          <div
            key={clause.id}
            className="card"
            style={{
              borderLeft: `4px solid ${
                clause.riskLevel === 'CRITICAL'
                  ? 'var(--status-critical)'
                  : clause.riskLevel === 'CAUTION'
                  ? 'var(--status-caution)'
                  : 'var(--status-fair)'
              }`,
            }}
          >
            {/* Clause Header Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '14px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.05rem', margin: 0 }}>
                  {clause.heading}
                </h3>
                {getRiskBadge(clause.riskLevel)}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Live Federal Register Lookup Button */}
                <button
                  onClick={() => handleToggleRegulations(clause)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    borderColor: activeRegClauseId === clause.id ? 'var(--brand-primary)' : 'var(--border-color)',
                    color: activeRegClauseId === clause.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  }}
                  title="Check live U.S. Federal Register regulations for this clause type"
                >
                  <Landmark size={14} />
                  <span>Federal Rules</span>
                  {activeRegClauseId === clause.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {/* Read Aloud button */}
                <button
                  onClick={() => handleSpeakClause(clause)}
                  className="btn btn-secondary btn-sm"
                  title="Read clause summary aloud (TTS)"
                >
                  {activeSpeechClauseId === clause.id ? <VolumeX size={15} color="var(--brand-primary)" /> : <Volume2 size={15} />}
                  <span>{activeSpeechClauseId === clause.id ? 'Stop Audio' : 'Listen'}</span>
                </button>
              </div>
            </div>

            {/* Live Federal Register Regulations Accordion Panel */}
            {activeRegClauseId === clause.id && (
              <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--brand-primary)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                marginBottom: '16px',
                fontSize: '0.825rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                    <Landmark size={15} />
                    <span>Official Federal Register Precedents & Agency Guidance</span>
                  </div>
                  <span className="badge badge-fair" style={{ fontSize: '0.65rem' }}>
                    Live API Verified
                  </span>
                </div>

                {loadingRegs ? (
                  <div style={{ color: 'var(--text-muted)', padding: '10px 0' }}>
                    Fetching relevant federal regulations from federalregister.gov...
                  </div>
                ) : (regCache[clause.id] || []).length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>
                    No specific federal rulemaking found for this category query.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {regCache[clause.id].map((reg) => (
                      <div
                        key={reg.document_number}
                        style={{
                          background: 'var(--bg-input)',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {reg.title}
                            </div>
                            <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                              <span>Doc #{reg.document_number}</span>
                              <span>•</span>
                              <span>{reg.agencies.map(a => a.name).join(', ') || 'Federal Agency'}</span>
                              <span>•</span>
                              <span>{reg.publication_date}</span>
                            </div>
                          </div>
                          {reg.html_url && (
                            <a
                              href={reg.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                            >
                              <ExternalLink size={12} />
                              <span>View Rule</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Side-by-Side Comparison: Legalese vs Plain English */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '18px',
            }}>
              {/* Left Column: Original Legal Prose */}
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>Original Legal Text</span>
                  <span style={{ fontSize: '0.7rem' }}>
                    Grade {clause.readabilityOriginal?.fleschKincaidGrade || 'N/A'}
                  </span>
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

              {/* Right Column: Plain English Translation & Analysis */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Plain English Translation Card */}
                <div style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  border: '1px solid var(--border-color-focus)',
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--brand-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <Sparkles size={14} />
                    <span>Plain English Translation</span>
                  </div>
                  <p style={{ fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
                    {clause.plainSummary}
                  </p>
                </div>

                {/* Practical Trap & Why It Matters */}
                {clause.trapExplanation && (
                  <div style={{
                    background: clause.riskLevel === 'CRITICAL' ? 'var(--status-critical-bg)' : 'var(--status-caution-bg)',
                    border: `1px solid ${clause.riskLevel === 'CRITICAL' ? 'var(--status-critical-border)' : 'var(--status-caution-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    fontSize: '0.85rem',
                  }}>
                    <div style={{
                      fontWeight: 700,
                      color: clause.riskLevel === 'CRITICAL' ? 'var(--status-critical)' : 'var(--status-caution)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                    }}>
                      <AlertTriangle size={15} />
                      <span>Potential Trap & Risk Exposure</span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {clause.trapExplanation}
                    </div>
                  </div>
                )}

                {/* Recommended Counter-Proposal Language */}
                {clause.counterProposal && (
                  <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--status-fair-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    fontSize: '0.85rem',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--status-fair)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={15} /> Suggested Negotiation Amendment
                      </span>
                      <button
                        onClick={() => handleCopy(clause.id, clause.counterProposal)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        title="Copy amendment language to clipboard"
                      >
                        {copiedId === clause.id ? <Check size={13} color="var(--status-fair)" /> : <Copy size={13} />}
                        <span>{copiedId === clause.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div style={{
                      fontStyle: 'italic',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}>
                      "{clause.counterProposal}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
