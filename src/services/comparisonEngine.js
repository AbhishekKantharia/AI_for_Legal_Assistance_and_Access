import { parseDocumentClauses } from './documentParser';
import { generateSimpleWordDiff } from './diffEngine';
import { LEGAL_DISCLAIMER_SHORT, safeExcerpt } from './legalSafety';

export const COMPARISON_AREAS = [
  { key: 'TERM_TERMINATION', label: 'Term & termination notice', keywords: ['term', 'termination', 'notice', 'cancel', 'expire'] },
  { key: 'PAYMENT', label: 'Payment terms & fees', keywords: ['payment', 'rent', 'salary', 'fee', 'invoice', 'compensation', 'late charge'] },
  { key: 'RESTRICTIVE_COVENANT', label: 'Non-Compete & Non-Solicit', keywords: ['non-compete', 'non-competition', 'competing', 'solicit'] },
  { key: 'INDEMNITY_LIABILITY', label: 'Indemnity & liability allocation', keywords: ['indemnif', 'hold harmless', 'liability', 'limitation of liability'] },
  { key: 'INTELLECTUAL_PROPERTY', label: 'Intellectual property & inventions', keywords: ['intellectual property', 'invention', 'work-for-hire', 'copyright'] },
  { key: 'DISPUTE_RESOLUTION', label: 'Governing law & dispute resolution', keywords: ['governing law', 'jurisdiction', 'arbitration', 'jury waiver'] },
  { key: 'AUTO_RENEWAL', label: 'Automatic renewal provisions', keywords: ['automatic renewal', 'automatically renew', 'successive term'] },
  { key: 'CONFIDENTIALITY', label: 'Confidentiality & non-disclosure', keywords: ['confidential', 'proprietary', 'trade secret'] },
];

function headingText(clause) {
  return `${clause?.heading || ''} ${clause?.originalText || ''}`.toLowerCase();
}

function findMatchingClauseForArea(area, clauses) {
  let best = null;
  let bestScore = 0;
  for (const clause of clauses) {
    const text = headingText(clause);
    const score = area.keywords.reduce((total, keyword) => total + (text.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = clause;
      bestScore = score;
    }
  }
  return best;
}

function sourceForClause(clause) {
  if (!clause) return null;
  return {
    section: clause.heading,
    page: clause.sourceLocation?.page ?? null,
    excerpt: safeExcerpt(clause.originalText, 500),
    passageId: clause.id,
  };
}

function importantTextShift(clauseA, clauseB) {
  const a = clauseA.originalText.toLowerCase();
  const b = clauseB.originalText.toLowerCase();
  const numberPattern = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty-five|sixty|ninety)(?:[- ]\(\d+\))?\s+(?:days?|months?|weeks?|hours?)/g;
  const aNumbers = [...a.matchAll(numberPattern)].map((match) => match[0].replace(/\s+/g, ' '));
  const bNumbers = [...b.matchAll(numberPattern)].map((match) => match[0].replace(/\s+/g, ' '));
  const amountsChanged = /\$[\d,]+/.test(a) && /\$[\d,]+/.test(b) && a.match(/\$[\d,]+/g)?.join('|') !== b.match(/\$[\d,]+/g)?.join('|');
  const noticeChanged = aNumbers.join('|') !== bNumbers.join('|');
  const scopeChanged = /\b(?:unlimited|sole discretion|without notice|without prior notice|mutual|unilateral|waives?)\b/.test(a) !== /\b(?:unlimited|sole discretion|without notice|without prior notice|mutual|unilateral|waives?)\b/.test(b);
  return noticeChanged || amountsChanged || scopeChanged || clauseA.reviewSignal?.severity !== clauseB.reviewSignal?.severity;
}

function buildRow(area, clauseA, clauseB, titleA, titleB) {
  if (!clauseA && !clauseB) return null;
  let changeStatus;
  let reviewSignificance;
  let wordDiff = [];

  if (clauseA && !clauseB) {
    changeStatus = 'Removed';
    reviewSignificance = `This area appears in ${titleA} but was not found in ${titleB}.`;
  } else if (!clauseA && clauseB) {
    changeStatus = 'Added';
    reviewSignificance = `This area appears in ${titleB} but was not found in ${titleA}.`;
  } else {
    const identical = clauseA.originalText.trim() === clauseB.originalText.trim();
    if (identical) {
      changeStatus = 'Unchanged';
      reviewSignificance = 'The matched source text is identical in both documents.';
    } else {
      wordDiff = generateSimpleWordDiff(clauseA.originalText, clauseB.originalText);
      changeStatus = importantTextShift(clauseA, clauseB) ? 'Potentially important change' : 'Modified';
      reviewSignificance = changeStatus === 'Potentially important change'
        ? 'The wording changes a time window, amount, scope, or review signal. Review both excerpts in context.'
        : 'The wording differs between the matched sections; compare the excerpts for meaning and scope.';
    }
  }

  return {
    area: area.label,
    areaKey: area.key,
    docA: sourceForClause(clauseA),
    docB: sourceForClause(clauseB),
    changeStatus,
    reviewSignificance,
    wordDiff,
  };
}

export function compareDocumentsStructured(docAText, docBText, titleA = 'Document A', titleB = 'Document B') {
  const clausesA = parseDocumentClauses(docAText);
  const clausesB = parseDocumentClauses(docBText);
  const structuredRows = COMPARISON_AREAS
    .map((area) => buildRow(area, findMatchingClauseForArea(area, clausesA), findMatchingClauseForArea(area, clausesB), titleA, titleB))
    .filter(Boolean);
  const addedCount = structuredRows.filter((row) => row.changeStatus === 'Added').length;
  const removedCount = structuredRows.filter((row) => row.changeStatus === 'Removed').length;
  const modifiedCount = structuredRows.filter((row) => ['Modified', 'Potentially important change'].includes(row.changeStatus)).length;
  const importantChangesCount = structuredRows.filter((row) => row.changeStatus === 'Potentially important change').length;
  const unchangedCount = structuredRows.filter((row) => row.changeStatus === 'Unchanged').length;

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
    summary: `${structuredRows.length} areas compared: ${addedCount} added, ${removedCount} removed, ${modifiedCount} modified, and ${unchangedCount} unchanged.`,
    disclaimer: LEGAL_DISCLAIMER_SHORT,
    limitations: ['Comparison labels describe text differences only; they do not determine which document is preferable or legally effective.'],
  };
}
