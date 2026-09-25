/**
 * Contract Comparator & Redline Diff Engine
 * Compares two versions of a legal document (e.g. Original Draft vs Counteroffer Revision)
 * and highlights additions, deletions, modified obligations, and changes in risk exposure.
 */

import { segmentDocumentIntoClauses, analyzeClause } from './heuristicEngine';

export function compareContractVersions(docAText, docBText, titleA = 'Version A (Original)', titleB = 'Version B (Revised)') {
  const clausesA = segmentDocumentIntoClauses(docAText);
  const clausesB = segmentDocumentIntoClauses(docBText);

  const analyzedA = clausesA.map((c, i) => analyzeClause(c.heading, c.text, i));
  const analyzedB = clausesB.map((c, i) => analyzeClause(c.heading, c.text, i));

  const comparisons = [];
  const matchedBIndices = new Set();

  // Match clauses by heading similarity or order
  analyzedA.forEach((cA, idxA) => {
    // Find matching clause in B
    let bestMatchIdx = -1;

    analyzedB.forEach((cB, idxB) => {
      if (matchedBIndices.has(idxB)) return;

      const normA = cA.heading.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normB = cB.heading.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normA === normB || normA.includes(normB) || normB.includes(normA)) {
        bestMatchIdx = idxB;
      }
    });

    if (bestMatchIdx === -1 && idxA < analyzedB.length && !matchedBIndices.has(idxA)) {
      bestMatchIdx = idxA;
    }

    if (bestMatchIdx !== -1) {
      matchedBIndices.add(bestMatchIdx);
      const cB = analyzedB[bestMatchIdx];

      // Check text difference
      const isIdentical = cA.originalText.trim() === cB.originalText.trim();
      let riskTrend = 'UNCHANGED';

      const riskRank = { CRITICAL: 3, CAUTION: 2, FAIR: 1 };
      if (riskRank[cB.riskLevel] < riskRank[cA.riskLevel]) {
        riskTrend = 'IMPROVED'; // Risk lowered!
      } else if (riskRank[cB.riskLevel] > riskRank[cA.riskLevel]) {
        riskTrend = 'WORSENED'; // Risk increased!
      }

      comparisons.push({
        status: isIdentical ? 'IDENTICAL' : 'MODIFIED',
        clauseA: cA,
        clauseB: cB,
        riskTrend,
        summaryDiff: generateSimpleWordDiff(cA.originalText, cB.originalText),
      });
    } else {
      comparisons.push({
        status: 'REMOVED_IN_B',
        clauseA: cA,
        clauseB: null,
        riskTrend: cA.riskLevel === 'CRITICAL' ? 'IMPROVED' : 'MODIFIED',
        summaryDiff: null,
      });
    }
  });

  // Check for any clauses present in B but not in A (Newly Added)
  analyzedB.forEach((cB, idxB) => {
    if (!matchedBIndices.has(idxB)) {
      comparisons.push({
        status: 'ADDED_IN_B',
        clauseA: null,
        clauseB: cB,
        riskTrend: cB.riskLevel === 'CRITICAL' ? 'WORSENED' : 'MODIFIED',
        summaryDiff: null,
      });
    }
  });

  // Calculate summary metrics
  const modifiedCount = comparisons.filter(c => c.status === 'MODIFIED').length;
  const addedCount = comparisons.filter(c => c.status === 'ADDED_IN_B').length;
  const removedCount = comparisons.filter(c => c.status === 'REMOVED_IN_B').length;
  const improvedRiskCount = comparisons.filter(c => c.riskTrend === 'IMPROVED').length;
  const worsenedRiskCount = comparisons.filter(c => c.riskTrend === 'WORSENED').length;

  return {
    titleA,
    titleB,
    modifiedCount,
    addedCount,
    removedCount,
    improvedRiskCount,
    worsenedRiskCount,
    comparisons,
  };
}

// Compute word-level addition/deletion tokens for visual redlining
export function generateSimpleWordDiff(textA, textB) {
  if (!textA || !textB) return [];

  const wordsA = textA.split(/\s+/);
  const wordsB = textB.split(/\s+/);

  const diff = [];
  let i = 0;
  let j = 0;

  while (i < wordsA.length || j < wordsB.length) {
    if (i < wordsA.length && j < wordsB.length && wordsA[i] === wordsB[j]) {
      diff.push({ type: 'EQUAL', word: wordsA[i] });
      i++;
      j++;
    } else if (j < wordsB.length && (!wordsA[i] || !wordsA.slice(i, i + 4).includes(wordsB[j]))) {
      diff.push({ type: 'ADDED', word: wordsB[j] });
      j++;
    } else if (i < wordsA.length) {
      diff.push({ type: 'REMOVED', word: wordsA[i] });
      i++;
    } else {
      break;
    }
  }

  return diff;
}
