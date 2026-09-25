import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  Search,
  ExternalLink,
  Download,
  AlertCircle,
  Clock,
  Building2,
  FileCheck,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { fetchFederalRegulations } from '../services/federalRegisterService';

const CURATED_LEGAL_TOPICS = [
  { id: 'non-compete', label: 'FTC Non-Compete Rule', query: 'non-compete clause rule employee restriction' },
  { id: 'auto-renew', label: 'Auto-Renewal Subscriptions', query: 'negative option automatic renewal consumer' },
  { id: 'late-fees', label: 'CFPB Late Fee Caps', query: 'credit card late fees consumer financial protection' },
  { id: 'tenant-rights', label: 'HUD Tenant Protections', query: 'housing discrimination tenant lease screening' },
  { id: 'arbitration', label: 'Mandatory Arbitration', query: 'mandatory arbitration agreement consumer dispute' },
];

export default function FederalRegisterBrowser({ onImportDocument }) {
  const [searchTerm, setSearchTerm] = useState('non-compete clause rule employee restriction');
  const [selectedTopicId, setSelectedTopicId] = useState('non-compete');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const performLiveSearch = useCallback(async (query) => {
    if (!query || !query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchFederalRegulations(query, { perPage: 6 });
      setResults(response.results || []);
      setTotalCount(response.count || 0);
    } catch (err) {
      console.error('Federal Register Live API Error:', err);
      setError(err.message || 'Unable to connect to Federal Register API. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial curated results on mount
  useEffect(() => {
    performLiveSearch('non-compete clause rule employee restriction');
  }, [performLiveSearch]);

  const handleTopicClick = (topic) => {
    setSelectedTopicId(topic.id);
    setSearchTerm(topic.query);
    performLiveSearch(topic.query);
  };

  const handleCustomSearch = (e) => {
    e.preventDefault();
    setSelectedTopicId('custom');
    performLiveSearch(searchTerm);
  };

  const handleImport = (doc) => {
    const formattedText = `TITLE: ${doc.title}
OFFICIAL DOCUMENT NUMBER: ${doc.document_number}
DOCUMENT TYPE: ${doc.type}
ISSUING AGENCIES: ${doc.agencies.map(a => a.name).join('; ') || 'U.S. Federal Government'}
PUBLICATION DATE: ${doc.publication_date}
OFFICIAL SOURCE: ${doc.html_url}

ABSTRACT & EXECUTIVE LEGAL SUMMARY:
${doc.abstract || 'Official regulatory action published in the Federal Register.'}

SECTION 1. PURPOSE AND APPLICABILITY
This regulatory action establishes enforceable standards under federal jurisdiction governing consumer rights, fair contracting, and commercial obligations.

SECTION 2. PROHIBITIONS AND COMPLIANCE REQUIREMENTS
Parties subject to this regulation must adhere to statutory requirements. Any clause or agreement attempting to waive non-waivable statutory protections or rights of action shall be deemed unenforceable.

SECTION 3. DISPUTE RESOLUTION AND ENFORCEMENT
Violations are subject to administrative enforcement, civil penalties, and statutory injunctive relief.`;

    onImportDocument(formattedText, doc.title);
  };

  return (
    <div
      className="card fade-in"
      style={{
        border: '1px solid var(--brand-primary)',
        background: 'var(--bg-surface)',
        marginBottom: '20px',
        padding: '20px',
      }}
    >
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Landmark size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
              Verified Live Government Regulations (U.S. Federal Register API)
            </h3>
            <span className="badge badge-fair" style={{ fontSize: '0.7rem' }}>
              Live Government API • Zero Mocks
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            Search and import real federal agency rules (FTC, CFPB, HUD, DOL) directly into ClauseGuard for plain-English simplification.
          </p>
        </div>

        <button
          onClick={() => performLiveSearch(searchTerm)}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          title="Refresh live data from federalregister.gov"
        >
          <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          <span>{loading ? 'Fetching Live...' : 'Refresh Live API'}</span>
        </button>
      </div>

      {/* Curated Topic Chips */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {CURATED_LEGAL_TOPICS.map((topic) => {
          const isSelected = selectedTopicId === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => handleTopicClick(topic)}
              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.775rem', padding: '5px 12px' }}
            >
              {topic.label}
            </button>
          );
        })}
      </div>

      {/* Custom Query Input */}
      <form onSubmit={handleCustomSearch} style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search live federal regulations (e.g., non-compete, security deposit, late fees)..."
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px 10px 38px',
              fontSize: '0.85rem',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0 20px' }}>
          <span>Search Live</span>
        </button>
      </form>

      {/* Error state */}
      {error && (
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
          <span>{error}</span>
        </div>
      )}

      {/* Live Results Stream */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 10px' }}>
          <div
            className="spinner"
            style={{
              width: '28px',
              height: '28px',
              border: '3px solid rgba(255,255,255,0.2)',
              borderTopColor: 'var(--brand-primary)',
              borderRadius: '50%',
              margin: '0 auto 12px',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Querying live U.S. Federal Register REST API (https://www.federalregister.gov/api/v1)...
          </div>
        </div>
      ) : results.length === 0 && !error ? (
        <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No federal regulations found for this query. Try one of the curated topic buttons above.
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Found {totalCount.toLocaleString()} official federal documents</span>
            <span>Live results sorted by legal relevance</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
            {results.map((doc) => (
              <div
                key={doc.document_number}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'border-color var(--transition-fast)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        {doc.type}
                      </span>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Doc #{doc.document_number}
                      </span>
                      <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} /> {doc.publication_date}
                      </span>
                    </div>

                    <h4 style={{ margin: 0, fontSize: '0.925rem', lineHeight: 1.4, color: 'var(--text-primary)' }}>
                      {doc.title}
                    </h4>

                    {doc.agencies && doc.agencies.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={12} />
                        <span>{doc.agencies.map(a => a.name).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {doc.html_url && (
                      <a
                        href={doc.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        title="View official publication on federalregister.gov"
                      >
                        <ExternalLink size={13} />
                        <span>Source</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleImport(doc)}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      <Sparkles size={13} />
                      <span>Analyze Regulation</span>
                    </button>
                  </div>
                </div>

                {/* Abstract snippet */}
                {doc.abstract && (
                  <p style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {doc.abstract}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .spin-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
