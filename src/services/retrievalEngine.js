/**
 * @fileoverview ClauseGuard Retrieval-Grounded Anti-Hallucination Engine (RAG)
 * Chunks documents, indexes passages with exact source citations, computes relevance scores,
 * and produces strictly grounded answers with verifiable section/clause citations.
 * @module retrievalEngine
 */

import { formatGroundedOutput, LEGAL_DISCLAIMER_SHORT } from './legalSafety';

/** Minimum relevance score required to consider a passage grounded */
const CONFIDENCE_THRESHOLD = 0.25;

/**
 * Splits document text into structured indexed passages.
 * Each passage retains its section heading, clause ID, estimated page number, and offset.
 * @param {Array<Object>} clauses - Structured clauses from documentParser
 * @returns {Array<Object>} Indexed passages
 */
export function indexDocumentPassages(clauses) {
  if (!clauses || !Array.isArray(clauses)) return [];

  const passages = [];

  clauses.forEach((clause, clauseIdx) => {
    // Break long clauses into paragraph-level sub-passages
    const paragraphs = clause.originalText
      .split(/\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    if (paragraphs.length === 0) {
      passages.push({
        id: `p-${clause.id}-0`,
        section: clause.heading,
        clauseId: clause.id,
        text: clause.originalText,
        page: clause.sourceLocation?.estimatedPage || 1,
        clauseCategory: clause.clauseCategory,
        plainEnglish: clause.plainEnglish,
      });
    } else {
      paragraphs.forEach((p, pIdx) => {
        passages.push({
          id: `p-${clause.id}-${pIdx}`,
          section: clause.heading,
          clauseId: clause.id,
          text: p,
          page: clause.sourceLocation?.estimatedPage || 1,
          clauseCategory: clause.clauseCategory,
          plainEnglish: clause.plainEnglish,
        });
      });
    }
  });

  return passages;
}

/**
 * Tokenizes a query string into clean keywords, removing punctuation and stop words.
 * @param {string} query
 * @returns {Array<string>}
 */
export function tokenizeQuery(query) {
  if (!query) return [];
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'by', 'for',
    'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'can', 'will', 'just', 'should', 'now', 'what', 'does', 'do',
    'this', 'that', 'these', 'those', 'i', 'you', 'my', 'your', 'me', 'either',
    'party', 'parties', 'contract', 'agreement', 'shall', 'said', 'hereunder', 'lease'
  ]);

  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Calculates a relevance score between a query and a candidate passage.
 * Combines exact keyword overlap, heading relevance, and legal synonym matching.
 * @param {Array<string>} queryTokens
 * @param {Object} passage
 * @returns {number} Score between 0.0 and 1.0+
 */
export function scorePassage(queryTokens, passage) {
  if (queryTokens.length === 0) return 0;

  const passageTextLower = passage.text.toLowerCase();
  const sectionLower = passage.section.toLowerCase();

  let matches = 0;
  let headerMatches = 0;

  for (const token of queryTokens) {
    if (passageTextLower.includes(token)) {
      matches++;
      // Count frequency
      const freq = (passageTextLower.match(new RegExp('\\b' + token + '\\b', 'g')) || []).length;
      if (freq > 1) matches += 0.3 * Math.min(3, freq);
    }
    if (sectionLower.includes(token)) {
      headerMatches += 1.5;
    }
  }

  // Synonym / Semantic boosts
  const synonymMap = {
    rent: ['payment', 'monthly', 'due', 'amount'],
    terminate: ['cancel', 'break', 'end', 'leave', 'surrender', 'expiration'],
    pay: ['rent', 'fee', 'salary', 'compensation', 'invoice', 'charges', 'amount', 'dollar'],
    renew: ['renewal', 'extension', 'successive', 'term'],
    compete: ['competition', 'competitor', 'restrictive', 'covenant', 'solicit'],
    deposit: ['escrow', 'deduction', 'refund', 'turnover', 'security'],
    privacy: ['entry', 'inspection', 'access', 'landlord', 'unannounced'],
    deadline: ['notice', 'days', 'calendar', 'grace', 'window', 'cure'],
    ip: ['intellectual property', 'invention', 'copyright', 'patent', 'work-for-hire', 'code'],
  };

  let synonymBoost = 0;
  for (const token of queryTokens) {
    for (const [key, syns] of Object.entries(synonymMap)) {
      if (token === key || syns.includes(token)) {
        if (passageTextLower.includes(key) || syns.some(s => passageTextLower.includes(s))) {
          synonymBoost += 0.3;
        }
      }
    }
  }

  const tokenCoverage = matches / queryTokens.length;
  const headerBonus = (headerMatches / queryTokens.length) * 1.2;

  return tokenCoverage + headerBonus + synonymBoost;
}

/**
 * Retrieves the top-K relevant passages for a query.
 * @param {string} query - User search question
 * @param {Array<Object>} passages - Indexed document passages
 * @param {number} [topK=3] - Number of passages to return
 * @returns {Array<Object>} Ranked passages with scores
 */
export function retrieveRelevantPassages(query, passages, topK = 3) {
  const queryTokens = tokenizeQuery(query);
  if (queryTokens.length === 0 || !passages || passages.length === 0) {
    return [];
  }

  const scored = passages.map(p => ({
    ...p,
    score: scorePassage(queryTokens, p),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.filter(p => p.score >= CONFIDENCE_THRESHOLD).slice(0, topK);
}

/**
 * Synthesizes a document-grounded answer based on retrieved passages.
 * Strictly adheres to anti-hallucination standards:
 * If evidence is insufficient, explicitly states so rather than inventing terms.
 * @param {string} query - User query
 * @param {Array<Object>} passages - Indexed passages from the active document
 * @returns {Object} Grounded response object with citations and confidence
 */
export function answerDocumentQuestionGrounding(query, passages) {
  const relevant = retrieveRelevantPassages(query, passages, 3);

  // Anti-Hallucination Guard: If no passage meets the confidence threshold
  if (relevant.length === 0) {
    return formatGroundedOutput({
      answer: "I couldn't find enough information in the provided document to answer that reliably.",
      confidence: 'low',
      sources: [],
      limitations: [
        'The query terms did not match any substantive provisions in the document.',
        'This agreement may not address this topic, or it may use different defined terminology.',
      ],
    });
  }

  const bestPassage = relevant[0];
  const sources = relevant.map(r => ({
    section: r.section,
    page: r.page,
    excerpt: r.text.length > 280 ? r.text.slice(0, 280) + '...' : r.text,
  }));

  const confidence = bestPassage.score >= 1.2 ? 'high' : bestPassage.score >= 0.6 ? 'medium' : 'low';

  // Construct grounded plain-English answer
  let answer = '';
  if (bestPassage.plainEnglish && bestPassage.score >= 0.8) {
    answer = `Based on ${bestPassage.section}: ${bestPassage.plainEnglish} \n\nRelevant document provision: "${bestPassage.text}"`;
  } else {
    answer = `According to ${bestPassage.section} (page ${bestPassage.page}): "${bestPassage.text}"`;
  }

  return formatGroundedOutput({
    answer,
    confidence,
    sources,
    limitations: confidence === 'low' ? ['Evidence in the document is limited; verify full section with counsel.'] : [],
  });
}
