import { describe, it, expect } from 'vitest';
import {
  validateDocumentFile,
  extractKeyFacts,
  extractStructuredObligations,
  extractDatesAndDeadlines,
  parseDocumentClauses,
  processDocument,
} from '../src/services/documentParser';
import { SYNTHETIC_DOCUMENTS } from '../src/data/syntheticContracts';

describe('ClauseGuard Document Parser', () => {
  it('validates file extensions and limits correctly', () => {
    const validTxt = new File(['Contract content'], 'agreement.txt', { type: 'text/plain' });
    const result = validateDocumentFile(validTxt);
    expect(result.valid).toBe(true);
    expect(result.sanitizedName).toBe('agreement.txt');

    const invalidExe = new File(['malicious'], 'script.exe', { type: 'application/x-msdownload' });
    const invalidResult = validateDocumentFile(invalidExe);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('Unsupported file type');

    const mismatchedType = new File(['Contract content'], 'agreement.txt', { type: 'application/x-msdownload' });
    const mismatchedResult = validateDocumentFile(mismatchedType);
    expect(mismatchedResult.valid).toBe(false);
    expect(mismatchedResult.error).toContain('MIME type');
  });

  it('rejects files larger than 10MB', () => {
    // Mock oversized file metadata
    const fakeLargeFile = {
      name: 'large.pdf',
      size: 15 * 1024 * 1024,
      type: 'application/pdf',
    };
    const result = validateDocumentFile(fakeLargeFile);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('10 MB limit');
  });

  it('extracts key facts accurately from a synthetic lease agreement', () => {
    const lease = SYNTHETIC_DOCUMENTS[0];
    const facts = extractKeyFacts(lease.text);

    expect(facts.agreementType).toContain('Residential Lease');
    expect(facts.parties.length).toBeGreaterThanOrEqual(1);
    expect(facts.effectiveDate).toContain('October 1, 2025');
    expect(facts.term).toContain('twelve (12) months');
    expect(facts.paymentTerms).toContain('$2,450.00');
    expect(facts.governingLaw).toContain('Ohio');
  });

  it('extracts and categorizes obligations into Your vs Other Party obligations', () => {
    const lease = SYNTHETIC_DOCUMENTS[0];
    const { yourObligations, otherPartyObligations } = extractStructuredObligations(lease.text, 'Residential Lease');

    expect(yourObligations.length).toBeGreaterThan(0);
    expect(yourObligations[0].responsibleParty).toContain('You');
    expect(otherPartyObligations.length).toBeGreaterThan(0);
    expect(otherPartyObligations[0].responsibleParty).toContain('Other Party');
  });

  it('extracts hard calendar dates and periodic notice windows', () => {
    const lease = SYNTHETIC_DOCUMENTS[0];
    const deadlines = extractDatesAndDeadlines(lease.text);

    expect(deadlines.length).toBeGreaterThan(0);
    expect(deadlines.some(d => d.dateString.includes('October 1, 2025'))).toBe(true);
    expect(deadlines.some(d => d.dateString.includes('60') || d.dateString.includes('sixty'))).toBe(true);
  });

  it('parses clauses and assigns calibrated review signals', () => {
    const lease = SYNTHETIC_DOCUMENTS[0];
    const clauses = parseDocumentClauses(lease.text);

    expect(clauses.length).toBeGreaterThanOrEqual(5);

    const depositClause = clauses.find(c => c.clauseCategory.includes('Deposit'));
    expect(depositClause).toBeDefined();
    expect(depositClause.reviewSignal.badge).toBe('Requires Attention');
    expect(depositClause.plainEnglish).toContain('deposit');
  });

  it('builds complete document model with executive summary and review areas', () => {
    const lease = SYNTHETIC_DOCUMENTS[0];
    const model = processDocument(lease.text, { filename: 'lease.txt' });

    expect(model.executiveSummary).toContain('Residential Lease');
    expect(model.totalClauses).toBeGreaterThanOrEqual(5);
    expect(model.reviewAreaCount).toBeGreaterThan(0);
    expect(model.readability).toBeDefined();
  });
});
