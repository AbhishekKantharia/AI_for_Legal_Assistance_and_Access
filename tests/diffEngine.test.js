import { describe, it, expect } from 'vitest';
import { compareContractVersions, generateSimpleWordDiff } from '../src/services/diffEngine';

describe('diffEngine', () => {
  const versionA = `SECTION 1. TERM
The term shall be 12 months.

SECTION 2. NON-COMPETE
Employee shall not work for any competitor for 24 months globally.`;

  const versionB = `SECTION 1. TERM
The term shall be 12 months.

SECTION 2. NON-COMPETE
Employee shall not work for direct local competitors for 6 months within 25 miles.`;

  it('detects modified clauses between versions', () => {
    const result = compareContractVersions(versionA, versionB);

    expect(result.comparisons.length).toBe(2);
    expect(result.comparisons[0].status).toBe('IDENTICAL');
    expect(result.comparisons[1].status).toBe('MODIFIED');
  });

  it('generates word-level additions and removals', () => {
    const diff = generateSimpleWordDiff('The term is 24 months.', 'The term is 6 months.');
    const added = diff.filter(d => d.type === 'ADDED');
    const removed = diff.filter(d => d.type === 'REMOVED');

    expect(added.some(a => a.word === '6')).toBe(true);
    expect(removed.some(r => r.word === '24')).toBe(true);
  });
});
