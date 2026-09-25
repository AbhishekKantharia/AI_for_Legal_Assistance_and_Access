import { describe, it, expect } from 'vitest';
import {
  fetchFederalRegulations,
  fetchDocumentByNumber,
  sanitizeSearchInput,
  getSearchTermForClauseType,
} from '../src/services/federalRegisterService';

describe('Federal Register Live API Integration (Zero Mocks - Verified Live Government API)', () => {
  it('sanitizes query parameters to prevent injection', () => {
    const dirty = 'non-compete <script>alert(1)</script> {test}';
    const clean = sanitizeSearchInput(dirty);
    expect(clean).not.toContain('<');
    expect(clean).not.toContain('>');
    expect(clean).not.toContain('{');
    expect(clean).toContain('non-compete');
  });

  it('maps clause types to targeted legal search terms', () => {
    const term = getSearchTermForClauseType('NON_COMPETE');
    expect(term).toContain('non-compete');
    expect(term).toContain('employee');
  });

  // REAL LIVE NETWORK TEST: Hits the actual Federal Register API at https://www.federalregister.gov/api/v1
  it('fetches real-time live regulations for "non-compete" from the official Federal Register API', async () => {
    const result = await fetchFederalRegulations('non-compete', { perPage: 3 });

    // Validate real live API structure
    expect(result).toBeDefined();
    expect(typeof result.count).toBe('number');
    expect(result.count).toBeGreaterThan(0);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);

    const doc = result.results[0];
    expect(doc).toHaveProperty('title');
    expect(typeof doc.title).toBe('string');
    expect(doc.title.length).toBeGreaterThan(5);
    expect(doc).toHaveProperty('document_number');
    expect(doc).toHaveProperty('html_url');
    expect(doc.html_url).toContain('federalregister.gov');
    expect(Array.isArray(doc.agencies)).toBe(true);
  }, 15000);

  // REAL LIVE NETWORK TEST: Hits the actual Federal Register API for consumer protection rules
  it('fetches real-time live regulations for "consumer protection late fee" from Federal Register API', async () => {
    const result = await fetchFederalRegulations('consumer protection late fee', { perPage: 2 });

    expect(result.count).toBeGreaterThan(0);
    expect(result.results.length).toBeGreaterThan(0);
    const doc = result.results[0];
    expect(doc.document_number).toBeDefined();
    expect(doc.publication_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }, 15000);
});
