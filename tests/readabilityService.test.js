import { describe, it, expect } from 'vitest';
import { countSyllables, analyzeReadability, compareReadability } from '../src/services/readabilityService';

describe('readabilityService', () => {
  it('correctly estimates syllables for common words', () => {
    expect(countSyllables('law')).toBe(1);
    expect(countSyllables('contract')).toBe(2);
    expect(countSyllables('indemnification')).toBeGreaterThanOrEqual(5);
  });

  it('correctly calculates Flesch Reading Ease and Grade Level for dense legal prose', () => {
    const legalText = `In witness whereof, the parties hereto have executed this Agreement as of the date first above written, and each party covenants that it possesses full power and lawful authority to enter into and perform the obligations incumbent upon it hereunder without encumbrance or limitation.`;
    const stats = analyzeReadability(legalText);

    expect(stats.wordCount).toBeGreaterThan(30);
    expect(stats.fleschKincaidGrade).toBeGreaterThan(12);
    expect(stats.fleschReadingEase).toBeLessThan(50);
  });

  it('correctly shows lower grade level for plain English', () => {
    const plainText = `Both people sign this contract today. Each person has the legal power to make this deal and follow through with its promises.`;
    const stats = analyzeReadability(plainText);

    expect(stats.fleschKincaidGrade).toBeLessThan(10);
    expect(stats.fleschReadingEase).toBeGreaterThan(60);
  });

  it('calculates improvement comparison between legal and plain text', () => {
    const original = analyzeReadability(`The party of the first part shall indemnify, defend, and hold harmless the party of the second part from any and all damages, encumbrances, and liabilities whatsoever.`);
    const simplified = analyzeReadability(`You will pay for any legal fees or damages that happen because of this work.`);
    const comparison = compareReadability(original, simplified);

    expect(comparison.gradeReduction).toBeGreaterThan(0);
    expect(comparison.percentageSimpler).toBeGreaterThan(0);
  });
});
