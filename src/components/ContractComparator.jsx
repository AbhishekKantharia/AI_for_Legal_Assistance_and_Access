import React, { useState } from 'react';
import {
  GitCompare,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { compareContractVersions } from '../services/diffEngine';

const SAMPLE_REVISIONS = {
  'lease-revision': {
    title: 'Residential Lease: Landlord Draft vs Tenant Protective Counteroffer',
    docA: `SECTION 1. TERM AND OCCUPANCY
Any guest remaining on the premises in excess of forty-eight (48) consecutive hours without Landlord's written consent shall be deemed an unauthorized subtenant, subjecting Tenant to an immediate liquidated fee of $150 per day.

SECTION 2. RENT AND ESCALATING LATE CHARGES
If rent is not received by Landlord by 5:00 PM on the second (2nd) day of the month, a late fee of $100.00 shall immediately accrue, with an additional assessment of $25.00 for each subsequent calendar day until payment in full is tendered. Landlord reserves the unilateral right to increase rent by up to 12% upon providing fifteen (15) days written notice.

SECTION 3. SECURITY DEPOSIT AND NON-REFUNDABLE CHARGES
Tenant acknowledges that a mandatory, non-refundable administrative and turnover cleaning fee of $750.00 shall be deducted from said deposit upon lease expiration regardless of unit cleanliness. Landlord shall have ninety (90) days to return any remaining balance.

SECTION 4. RIGHT OF ENTRY AND INSPECTIONS
Landlord shall have the right to enter the leased premises at any time, with or without prior notice, between 8:00 AM and 8:00 PM. Tenant hereby expressly waives any statutory requirement of advance notice.`,
    docB: `SECTION 1. TERM AND OCCUPANCY
Guests may stay up to fourteen (14) consecutive days without Landlord's consent. Any extension beyond 14 days may be requested in writing without liquidated fee penalties.

SECTION 2. RENT AND ESCALATING LATE CHARGES
Rent is due on the first day of the month with a five (5) day grace period. If rent is unpaid by the 6th of the month, a flat late fee of $50.00 shall apply, with no daily compounding. Rent increases require sixty (60) days advance written notice in accordance with local municipal caps.

SECTION 3. SECURITY DEPOSIT AND NON-REFUNDABLE CHARGES
No non-refundable cleaning fees shall be deducted. Security deposit shall be returned within thirty (30) days of move-out accompanied by itemized receipts for any bona fide repairs beyond normal wear and tear.

SECTION 4. RIGHT OF ENTRY AND INSPECTIONS
Landlord shall provide at least twenty-four (24) hours advance written notice prior to entering the premises, except in bona fide immediate emergencies (fire or active water leakage).`,
  },
  'employment-revision': {
    title: 'Employment Offer: Hostile Non-Compete vs Balanced Fair Terms',
    docA: `ARTICLE 3. COMPREHENSIVE INTELLECTUAL PROPERTY ASSIGNMENT
All inventions, discoveries, designs, algorithms, codebases conceived, authored, or reduced to practice by Employee—whether during regular working hours or during evenings and weekends, whether using Company equipment or personal computers—shall belong exclusively and perpetually to Company.

ARTICLE 4. NON-COMPETITION RESTRICTIONS
For a period of twenty-four (24) consecutive months following termination, Employee shall not engage in, consult with, or be employed by any entity that provides cloud computing or software globally.`,
    docB: `ARTICLE 3. COMPREHENSIVE INTELLECTUAL PROPERTY ASSIGNMENT
Employee assigns rights only to inventions created during working hours or using Company confidential resources that directly relate to Company's current products. Employee retains 100% sole ownership of all personal off-hours side-projects and pre-existing open-source contributions.

ARTICLE 4. NON-COMPETITION RESTRICTIONS
Non-compete covenant is waived or limited strictly to 6 months within a 20-mile local radius of Company's direct named competitors, subject to continued payment of full salary as garden leave during any restriction period.`,
  }
};

export default function ContractComparator({ defaultDocText }) {
  const [selectedPreset, setSelectedPreset] = useState('lease-revision');
  const [docA, setDocA] = useState(SAMPLE_REVISIONS['lease-revision'].docA);
  const [docB, setDocB] = useState(SAMPLE_REVISIONS['lease-revision'].docB);
  const [diffResult, setDiffResult] = useState(() =>
    compareContractVersions(SAMPLE_REVISIONS['lease-revision'].docA, SAMPLE_REVISIONS['lease-revision'].docB, 'Original Draft', 'Revised Counteroffer')
  );

  const handleSelectPreset = (key) => {
    setSelectedPreset(key);
    const p = SAMPLE_REVISIONS[key];
    setDocA(p.docA);
    setDocB(p.docB);
    setDiffResult(compareContractVersions(p.docA, p.docB, 'Original Draft', 'Revised Counteroffer'));
  };

  const handleRunDiff = () => {
    const result = compareContractVersions(docA, docB, 'Draft Version A', 'Draft Version B');
    setDiffResult(result);
  };

  return (
    <div className="fade-in">
      {/* Top Banner and Preset Selector */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <GitCompare size={22} color="var(--brand-primary)" />
              Contract Redline & Version Comparator
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Compare two versions of an agreement (e.g., Landlord/Client original vs Tenant/Contractor counteroffer) to verify removed risks and additions.
            </p>
          </div>

          {/* Quick Presets */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSelectPreset('lease-revision')}
              className={`btn btn-sm ${selectedPreset === 'lease-revision' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Lease Counteroffer Demo
            </button>
            <button
              onClick={() => handleSelectPreset('employment-revision')}
              className={`btn btn-sm ${selectedPreset === 'employment-revision' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Employment Offer Diff Demo
            </button>
          </div>
        </div>

        {/* Text Areas for Document A and B */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginTop: '16px',
        }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-caution)', display: 'block', marginBottom: '6px' }}>
              Version A: Original Draft (Incoming)
            </label>
            <textarea
              value={docA}
              onChange={(e) => setDocA(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-fair)', display: 'block', marginBottom: '6px' }}>
              Version B: Proposed Counteroffer / Revision
            </label>
            <textarea
              value={docB}
              onChange={(e) => setDocB(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button onClick={handleRunDiff} className="btn btn-primary btn-sm">
            <RefreshCw size={15} /> Re-Compute Redline Diff
          </button>
        </div>
      </div>

      {/* Diff Metrics Bar */}
      {diffResult && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}>
          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-fair)' }}>
              {diffResult.improvedRiskCount}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-fair)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <TrendingDown size={14} /> Risks Successfully Lowered
            </div>
          </div>

          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
              {diffResult.modifiedCount}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Modified Clauses
            </div>
          </div>

          <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-caution)' }}>
              {diffResult.worsenedRiskCount}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-caution)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> Increased Exposure
            </div>
          </div>
        </div>
      )}

      {/* Clause-by-Clause Redline Diff View */}
      {diffResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {diffResult.comparisons.map((comp, idx) => (
            <div key={idx} className="card">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '14px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h4 style={{ fontSize: '1rem', margin: 0 }}>
                    {comp.clauseA?.heading || comp.clauseB?.heading}
                  </h4>
                  {comp.riskTrend === 'IMPROVED' && (
                    <span className="badge badge-fair">
                      <TrendingDown size={12} /> Risk Reduced in Revision
                    </span>
                  )}
                  {comp.riskTrend === 'WORSENED' && (
                    <span className="badge badge-critical">
                      <TrendingUp size={12} /> Risk Increased
                    </span>
                  )}
                  {comp.riskTrend === 'UNCHANGED' && (
                    <span className="badge badge-info">
                      <Minus size={12} /> Risk Unchanged
                    </span>
                  )}
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Status: {comp.status}
                </span>
              </div>

              {/* Word-level diff stream */}
              {comp.summaryDiff && comp.summaryDiff.length > 0 && (
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  lineHeight: 1.8,
                  marginBottom: '14px',
                }}>
                  {comp.summaryDiff.map((token, tIdx) => {
                    if (token.type === 'ADDED') {
                      return (
                        <span
                          key={tIdx}
                          style={{
                            background: 'rgba(16, 185, 129, 0.25)',
                            color: '#34d399',
                            textDecoration: 'none',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            marginRight: '4px',
                            fontWeight: 600,
                          }}
                        >
                          +{token.word}
                        </span>
                      );
                    }
                    if (token.type === 'REMOVED') {
                      return (
                        <span
                          key={tIdx}
                          style={{
                            background: 'rgba(239, 68, 68, 0.25)',
                            color: '#f87171',
                            textDecoration: 'line-through',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            marginRight: '4px',
                          }}
                        >
                          -{token.word}
                        </span>
                      );
                    }
                    return (
                      <span key={tIdx} style={{ color: 'var(--text-primary)', marginRight: '4px' }}>
                        {token.word}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Side-by-Side Summary Comparison */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
                fontSize: '0.825rem',
              }}>
                <div style={{
                  background: 'var(--bg-input)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--status-caution)',
                }}>
                  <strong style={{ color: 'var(--status-caution)' }}>Version A Summary:</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {comp.clauseA?.plainSummary || 'Clause was not present in Version A.'}
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-input)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--status-fair)',
                }}>
                  <strong style={{ color: 'var(--status-fair)' }}>Version B Counteroffer:</strong>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {comp.clauseB?.plainSummary || 'Clause was deleted in Version B.'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
