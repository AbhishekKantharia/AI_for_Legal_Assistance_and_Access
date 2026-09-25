import { describe, it, expect } from 'vitest';
import { segmentDocumentIntoClauses, analyzeClause, analyzeDocumentOffline } from '../src/services/heuristicEngine';
import { SAMPLE_DOCUMENTS } from '../src/data/sampleDocuments';

describe('heuristicEngine', () => {
  it('correctly segments documents into multiple clauses based on headings', () => {
    const doc = SAMPLE_DOCUMENTS[0]; // Residential Lease
    const clauses = segmentDocumentIntoClauses(doc.text);

    expect(clauses.length).toBeGreaterThanOrEqual(5);
    expect(clauses.some(c => c.heading.includes('SECTION 1'))).toBe(true);
  });

  it('identifies critical risk for non-compete clauses', () => {
    const heading = 'ARTICLE 4. NON-COMPETITION RESTRICTIONS';
    const text = 'Employee covenants and agrees not to directly or indirectly engage in, perform services for any competing entity anywhere in the United States.';
    const result = analyzeClause(heading, text, 0);

    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.title).toContain('Non-Compete');
    expect(result.counterProposal).toContain('6 months');
  });

  it('correctly calculates overall risk score and extracts red flags for lease', () => {
    const lease = SAMPLE_DOCUMENTS[0];
    const analysis = analyzeDocumentOffline(lease.text, lease.title);

    expect(analysis.overallRiskScore).toBeGreaterThanOrEqual(60);
    expect(analysis.riskCategory).toContain('High Risk');
    expect(analysis.criticalCount).toBeGreaterThan(0);
    expect(analysis.redFlags.length).toBeGreaterThan(0);
  });
});
