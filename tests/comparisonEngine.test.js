import { describe, it, expect } from 'vitest';
import { compareDocumentsStructured } from '../src/services/comparisonEngine';

describe('ClauseGuard Comparison Engine', () => {
  const docA = `SECTION 1. TERM AND NOTICE
This agreement shall last for 12 months. Either party may terminate with 30 days written notice.

SECTION 2. PAYMENT TERMS
Client shall pay $5,000 per month within 15 days of invoice.

SECTION 3. NON-COMPETE
Employee shall not compete for 24 months globally.`;

  const docB = `SECTION 1. TERM AND NOTICE
This agreement shall last for 12 months. Either party may terminate with 60 days written notice.

SECTION 2. PAYMENT TERMS
Client shall pay $5,000 per month within 15 days of invoice.

SECTION 4. CONFIDENTIALITY
Both parties agree to hold trade secrets in confidence.`;

  it('generates structured rows comparing common legal areas', () => {
    const comparison = compareDocumentsStructured(docA, docB, 'Draft 1', 'Draft 2');

    expect(comparison.structuredRows.length).toBeGreaterThan(0);
    expect(comparison.titleA).toBe('Draft 1');
    expect(comparison.titleB).toBe('Draft 2');
  });

  it('correctly identifies unchanged, modified, removed, and added areas with neutral labels', () => {
    const comparison = compareDocumentsStructured(docA, docB);

    const paymentRow = comparison.structuredRows.find(r => r.area.includes('Payment'));
    expect(paymentRow).toBeDefined();
    expect(paymentRow.changeStatus).toBe('Unchanged');

    const termRow = comparison.structuredRows.find(r => r.area.includes('Term'));
    expect(termRow).toBeDefined();
    expect(termRow.changeStatus).toMatch(/Modified|Potentially important change/);

    const nonCompeteRow = comparison.structuredRows.find(r => r.area.includes('Non-Compete'));
    expect(nonCompeteRow).toBeDefined();
    expect(nonCompeteRow.changeStatus).toBe('Removed');

    const confRow = comparison.structuredRows.find(r => r.area.includes('Confidentiality'));
    expect(confRow).toBeDefined();
    expect(confRow.changeStatus).toBe('Added');
  });
});
