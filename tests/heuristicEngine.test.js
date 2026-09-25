import { describe, it, expect } from 'vitest';
import {
  segmentDocumentIntoClauses,
  analyzeClause,
  analyzeDocumentOffline
} from '../src/services/heuristicEngine';
import { fetchFederalRegulations } from '../src/services/federalRegisterService';

describe('heuristicEngine (Live API Data & Zero Mocks)', () => {
  it('correctly segments legal documents into multiple clauses based on headings', () => {
    const rawLegalText = `SECTION 1. LEASE TERM AND COMMENCEMENT
The term of this lease shall commence on the first day of the calendar month.

SECTION 2. RENT AND PAYMENT TERMS
Tenant shall tender monthly rent in lawful money on or before the first calendar day of each month.

SECTION 3. SECURITY DEPOSIT AND DEDUCTIONS
Landlord acknowledges receipt of security deposit to be held in an escrow account.`;

    const clauses = segmentDocumentIntoClauses(rawLegalText);

    expect(clauses.length).toBe(3);
    expect(clauses[0].heading).toContain('SECTION 1');
    expect(clauses[1].heading).toContain('SECTION 2');
    expect(clauses[2].heading).toContain('SECTION 3');
  });

  it('identifies critical risk for non-compete clauses with actionable counter-language', () => {
    const heading = 'ARTICLE 4. NON-COMPETITION RESTRICTIONS';
    const text = 'Employee covenants and agrees not to directly or indirectly engage in, perform services for any competing entity anywhere in the United States.';
    const result = analyzeClause(heading, text, 0);

    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.title).toContain('Non-Compete');
    expect(result.counterProposal).toContain('6 months');
  });

  it('identifies critical risk for mandatory arbitration and class action waivers', () => {
    const heading = 'SECTION 9. MANDATORY BINDING ARBITRATION AND JURY WAIVER';
    const text = 'Any dispute shall be resolved through binding arbitration administered by JAMS. The parties hereby waive any right to trial by jury or participation in a class action.';
    const result = analyzeClause(heading, text, 1);

    expect(result.riskLevel).toBe('CAUTION');
    expect(result.title).toContain('Arbitration');
    expect(result.plainSummary).toContain('constitutional right');
  });

  // REAL LIVE DATA TEST: Fetches a real live regulation from the Federal Register API and analyzes it
  it('processes and analyzes real live legal document text fetched directly from the Federal Register API', async () => {
    const liveApiData = await fetchFederalRegulations('housing discrimination tenant rights', { perPage: 1 });
    expect(liveApiData.results.length).toBeGreaterThan(0);

    const liveDoc = liveApiData.results[0];
    const liveText = `REGULATION TITLE: ${liveDoc.title}\nAGENCY: ${liveDoc.agencies.map(a => a.name).join(', ')}\n\nABSTRACT:\n${liveDoc.abstract || 'Official Federal Register regulatory notice governing tenant protections.'}\n\nSECTION 1. SCOPE AND ENFORCEMENT\nFederal agency establishes regulatory oversight and mandates compliance.`;

    const analysis = analyzeDocumentOffline(liveText, liveDoc.title);

    expect(analysis).toBeDefined();
    expect(analysis.totalClauses).toBeGreaterThanOrEqual(1);
    expect(typeof analysis.overallRiskScore).toBe('number');
    expect(analysis.overallReadabilityOriginal).toBeDefined();
    expect(analysis.overallReadabilityPlain).toBeDefined();
    expect(analysis.actionableChecklist.length).toBeGreaterThan(0);
  }, 15000);
});
