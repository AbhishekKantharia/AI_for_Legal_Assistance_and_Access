import { describe, it, expect } from 'vitest';
import {
  indexDocumentPassages,
  retrieveRelevantPassages,
  answerDocumentQuestionGrounding,
} from '../src/services/retrievalEngine';
import { parseDocumentClauses } from '../src/services/documentParser';
import { SYNTHETIC_DOCUMENTS } from '../src/data/syntheticContracts';

describe('ClauseGuard Retrieval & Anti-Hallucination Engine', () => {
  const lease = SYNTHETIC_DOCUMENTS[0];
  const clauses = parseDocumentClauses(lease.text);
  const passages = indexDocumentPassages(clauses);

  it('indexes document clauses into searchable paragraph passages with source metadata', () => {
    expect(passages.length).toBeGreaterThanOrEqual(clauses.length);
    expect(passages[0]).toHaveProperty('section');
    expect(passages[0]).toHaveProperty('text');
    expect(passages[0]).toHaveProperty('page');
  });

  it('retrieves relevant passages for termination questions with high confidence', () => {
    const relevant = retrieveRelevantPassages('When can either party terminate this lease?', passages, 2);

    expect(relevant.length).toBeGreaterThan(0);
    const topSection = relevant[0].section.toLowerCase();
    expect(topSection.includes('termination') || topSection.includes('renewal')).toBe(true);
    expect(relevant[0].score).toBeGreaterThan(0.5);
  });

  it('retrieves relevant passages for deposit deduction questions', () => {
    const relevant = retrieveRelevantPassages('What deductions are made from the security deposit?', passages, 2);

    expect(relevant.length).toBeGreaterThan(0);
    expect(relevant[0].section.toLowerCase()).toContain('security deposit');
    expect(relevant[0].text).toContain('$450.00');
  });

  it('strictly returns anti-hallucination message when evidence is insufficient', () => {
    // Question about something completely absent in the lease (e.g. stock options / patents)
    const result = answerDocumentQuestionGrounding('How many stock option equity grants do I receive?', passages);

    expect(result.answer).toContain("I couldn't find enough information in the provided document to answer that reliably.");
    expect(result.confidence).toBe('low');
    expect(result.sources.length).toBe(0);
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it('includes exact section citations and quotes in grounded answers', () => {
    const result = answerDocumentQuestionGrounding('What is the rent amount and when is it due?', passages);

    expect(result.confidence).toBe('high');
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0].section).toContain('RENT AND PAYMENT TERMS');
    expect(result.sources[0].excerpt).toContain('$2,450.00');
    expect(result.disclaimer).toBeDefined();
  });
});
