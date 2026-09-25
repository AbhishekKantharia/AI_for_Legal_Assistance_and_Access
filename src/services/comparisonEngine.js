/**
 * @fileoverview ClauseGuard Two-Document Contract Comparison Engine
 * Compares Document A vs Document B and generates structured tabular diffs with neutral labels:
 * Added, Removed, Modified, Unchanged, Potentially important change.
 * Links each change back to verbatim source text.
 * @module comparisonEngine
 */

import { parseDocumentClauses } from './documentParser';
import { generateSimpleWordDiff } from './diffEngine';

/**
 * Common legal areas evaluated during side-by-side contract comparison.
 */
export const COMPARISON_AREAS = [
  { key: 'TERM_TERMINATION', label: 'Term & Termination Notice', keywords: ['term', 'termination', 'notice', 'cancel', 'expire'] },
  { key: 'PAYMENT', label: 'Payment Terms & Fees', keywords: ['payment', 'rent', 'salary', 'fee', 'invoice', 'compensation', 'late charge'] },
  { key: 'RESTRICTIVE_COVENANT', label: 'Non-Compete & Non-Solicit', keywords: ['non-compete', 'non-competition', 'competing', 'solicit'] },
  { key: 'INDEMNITY_LIABILITY', label: 'Indemnity & Liability Allocation', keywords: ['indemnif', 'hold harmless', 'liability', 'limitation of liability'] },
  { key: 'INTELLECTUAL_PROPERTY', label: 'Intellectual Property & Inventions', keywords: ['intellectual property', 'invention', 'work-for-hire', 'copyright'] },
  { key: 'DISPUTE_RESOLUTION', label: 'Governing Law & Dispute Resolution', keywords: ['governing law', 'jurisdiction', 'arbitration', 'jury waiver'] },
  { key: 'AUTO_RENEWAL', label: 'Automatic Renewal Provisions', keywords: ['automatic renewal', 'automatically renew', 'successive term'] },
  { key: 'CONFIDENTIALITY', label: 'Confidentiality & Non-Disclosure', keywords: ['confidential', 'proprietary', 'trade secret'] },
];

/**
 * Finds the best matching clause in a list for a given comparison area or heading.
 * @param {Object} area
 * @param {Array<Object>} clauses
 * @returns {Object|null} Matching clause or null
 */
function findMatchingClauseForArea(area, clauses) {
  for (const clause of clauses) {
    const combined = (clause.heading + ' ' + clause.originalText).toLowerCase();
    if (area.keywords.some(kw => combined.includes(kw))) {
      return clause;
    }
  }
  return null;
}

/**
 * Compares two documents and generates a structured comparison matrix.
 * Neutral classification: never declares which is "better".
 * @param {string} docAText - Verbatim text of Document A
 * @param {string} docBText - Verbatim text of Document B
 * @param {string} [titleA='Document A']
 * @param {string} [titleB='Document B']
 * @returns {Object} Structured comparison analysis
 */
export function compareDocumentsStructured(docAText, docBText, titleA = 'Document A', titleB = 'Document B') {
  const clausesA = parseDocumentClauses(docAText);
  const clausesB = parseDocumentClauses(docBText);

  const structuredRows = [];

  // 1. Compare predefined critical commercial areas
  for (const area of COMPARISON_AREAS) {
    const clauseA = findMatchingClauseForArea(area, clausesA);
    const clauseB = findMatchingClauseForArea(area, clausesB);

    if (!clauseA && !clauseB) continue;

    let changeStatus = 'Unchanged';
    let reviewSignificance = 'Standard terms aligned between both documents.';
    let wordDiff = [];

    if (clauseA && !clauseB) {
      changeStatus = 'Removed';
      reviewSignificance = `Present in ${titleA} (${clauseA.heading}) but omitted in ${titleB}.`;
    } else if (!clauseA && clauseB) {
      changeStatus = 'Added';
      reviewSignificance = `Newly introduced in ${titleB} (${clauseB.heading}). Not present in ${titleA}.`;
    } else if (clauseA && clauseB) {
      const isIdentical = clauseA.originalText.trim() === clauseB.originalText.trim();
      if (isIdentical) {
        changeStatus = 'Unchanged';
        reviewSignificance = 'Verbatim identical text in both versions.';
      } else {
        wordDiff = generateSimpleWordDiff(clauseA.originalText, clauseB.originalText);
        const significantKeywordShift =
          (clauseA.originalText.toLowerCase().includes('30 days') && clauseB.originalText.toLowerCase().includes('60 days')) ||
          (clauseA.originalText.toLowerCase().includes('unilateral') !== clauseB.originalText.toLowerCase().includes('mutual')) ||
          (clauseA.reviewSignal?.severity !== clauseB.reviewSignal?.severity);

        changeStatus = significantKeywordShift ? 'Potentially important change' : 'Modified';
        reviewSignificance = significantKeywordShift
          ? 'Noticeable shift in operational obligations, notice windows, or liability scope.'
          : 'Refined phrasing or minor adjustments between drafts.';
      }
    }

    structuredRows.push({
      area: area.label,
      docA: clauseA ? { heading: clauseA.heading, text: clauseA.originalText, page: clauseA.sourceLocation?.estimatedPage || 1 } : null,
      docB: clauseB ? { heading: clauseB.heading, text: clauseB.originalText, page: clauseB.sourceLocation?.estimatedPage || 1 } : null,
      changeStatus, // 'Added' | 'Removed' | 'Modified' | 'Unchanged' | 'Potentially important change'
      reviewSignificance,
      wordDiff,
    });
  }

  // 2. Count metrics
  const addedCount = structuredRows.filter(r => r.changeStatus === 'Added').length;
  const removedCount = structuredRows.filter(r => r.changeStatus === 'Removed').length;
  const modifiedCount = structuredRows.filter(r => r.changeStatus === 'Modified' || r.changeStatus === 'Potentially important change').length;
  const importantChangesCount = structuredRows.filter(r => r.changeStatus === 'Potentially important change').length;
  const unchangedCount = structuredRows.filter(r => r.changeStatus === 'Unchanged').length;

  return {
    titleA,
    titleB,
    totalAreasCompared: structuredRows.length,
    addedCount,
    removedCount,
    modifiedCount,
    importantChangesCount,
    unchangedCount,
    structuredRows,
  };
}
