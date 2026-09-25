import { NO_EVIDENCE_MESSAGE, formatGroundedOutput, safeExcerpt } from './legalSafety';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'can', 'could', 'did', 'do', 'does', 'for', 'from', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'should', 'so', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'up', 'was', 'we', 'what', 'when', 'where', 'which', 'who', 'will', 'with', 'would', 'you', 'your', 'document', 'agreement', 'contract', 'party', 'parties', 'section', 'clause',
]);

const SEMANTIC_GROUPS = [
  ['terminate', 'termination', 'cancel', 'cancellation', 'end', 'exit', 'surrender', 'expiration', 'expire'],
  ['renew', 'renewal', 'extend', 'extension', 'successive', 'term'],
  ['pay', 'payment', 'rent', 'fee', 'salary', 'compensation', 'invoice', 'charge', 'amount', 'monthly'],
  ['notice', 'notify', 'notification', 'written', 'days', 'deadline', 'prior'],
  ['confidential', 'confidentiality', 'nda', 'privacy', 'non-public', 'trade secret'],
  ['obligated', 'obligation', 'duty', 'shall', 'must', 'responsible', 'require'],
  ['compare', 'changed', 'different', 'modified', 'version'],
];

function normalizedToken(token) {
  return token
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(?:ies)$/i, 'y')
    .replace(/(?:es)$/i, '')
    .replace(/(?:ing)$/i, '')
    .replace(/(?:ed)$/i, '');
}

export function tokenizeQuery(query) {
  return String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map(normalizedToken)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function semanticTokens(tokens) {
  const expanded = new Set(tokens);
  for (const group of SEMANTIC_GROUPS) {
    if (tokens.some((token) => group.includes(token))) {
      group.forEach((token) => expanded.add(normalizedToken(token)));
    }
  }
  return [...expanded];
}

export function indexDocumentPassages(clauses) {
  if (!Array.isArray(clauses)) return [];
  return clauses.flatMap((clause) => {
    const sourceText = String(clause.originalText || clause.text || '').trim();
    if (sourceText.length < 8) return [];
    return [{
      passageId: clause.id,
      clauseId: clause.id,
      section: clause.heading,
      clauseCategory: clause.clauseCategory,
      text: sourceText,
      page: clause.sourceLocation?.page ?? null,
      startOffset: clause.sourceLocation?.startOffset ?? null,
      plainEnglish: clause.plainEnglish || '',
      importance: clause.importance || 'Important clause',
    }];
  });
}

export function scorePassage(queryTokens, passage) {
  if (!Array.isArray(queryTokens) || !queryTokens.length || !passage?.text) return 0;
  const expanded = semanticTokens(queryTokens);
  const text = `${passage.section || ''} ${passage.text}`.toLowerCase();
  const words = new Set(text.match(/[a-z0-9]+/g) || []);
  let overlap = 0;
  for (const token of expanded) {
    if (words.has(token)) overlap += 1;
    else if (token.length > 3 && [...words].some((word) => word.startsWith(token) || token.startsWith(word))) overlap += 0.55;
  }
  const coverage = overlap / Math.max(1, expanded.length);
  const phrase = String(queryTokens.join(' '));
  const phraseBoost = phrase && text.includes(phrase) ? 0.6 : 0;
  const headingBoost = queryTokens.some((token) => String(passage.section || '').toLowerCase().includes(token)) ? 0.22 : 0;
  const sectionText = String(passage.section || '').toLowerCase();
  const topicBoost = queryTokens.some((token) => ['terminate', 'termination', 'cancel', 'end'].includes(token)) && /termination|renewal/.test(sectionText)
    ? 0.7
    : queryTokens.some((token) => ['pay', 'rent', 'fee', 'salary', 'invoice', 'amount', 'due'].includes(token)) && /payment|rent|compensation|fee/.test(sectionText)
      ? 0.5
      : 0;
  return Math.min(1.5, coverage + phraseBoost + headingBoost + topicBoost);
}

export function retrieveRelevantPassages(query, passages, topK = 4) {
  const queryTokens = tokenizeQuery(query);
  if (!queryTokens.length || !Array.isArray(passages) || !passages.length) return [];
  const ranked = passages
    .map((passage) => ({ ...passage, score: scorePassage(queryTokens, passage) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.score || 0;
  if (best < 0.24) return [];
  return ranked.filter((passage) => passage.score >= Math.max(0.24, best * 0.45)).slice(0, topK);
}

function queryHas(query, expressions) {
  const lower = String(query || '').toLowerCase();
  return expressions.some((expression) => lower.includes(expression));
}

function selectSentences(query, passages) {
  const patterns = {
    termination: /terminat|cancel|surrender|expire|exit|end the agreement/i,
    renewal: /renew|successive|extend|expiration/i,
    payment: /pay|rent|fee|salary|compensation|invoice|charge|amount|due/i,
    notice: /notice|notify|days|deadline|prior/i,
    confidentiality: /confidential|privacy|non-public|trade secret/i,
    obligations: /shall|must|obligat|duty|responsib|agree/i,
  };
  const kind = Object.keys(patterns).find((key) => queryHas(query, key === 'termination' ? ['terminate', 'termination', 'cancel', 'end'] : key === 'renewal' ? ['renew', 'renewal'] : key === 'payment' ? ['pay', 'rent', 'fee', 'salary', 'invoice', 'charge', 'cost'] : key === 'notice' ? ['notice', 'notify', 'deadline'] : key === 'confidentiality' ? ['confidential', 'privacy', 'nda'] : ['obligat', 'shall', 'must', 'duty', 'responsible'])) || null;
  const selected = [];
  for (const passage of passages) {
    if (kind && patterns[kind].test(passage.text)) selected.push(passage.text);
  }
  return [...new Set(selected.length ? selected : passages.map((passage) => passage.text))].slice(0, 2);
}

function answerForQuestion(query, relevant) {
  const excerpts = selectSentences(query, relevant);
  if (!excerpts.length) return NO_EVIDENCE_MESSAGE;
  const lower = query.toLowerCase();
  const first = excerpts[0];
  if (queryHas(lower, ['terminate', 'termination', 'cancel', 'end'])) {
    return `The document says: “${safeExcerpt(first, 420)}”\n\nThis identifies the stated ending conditions or notice terms. The document does not, by itself, answer whether a particular situation qualifies.`;
  }
  if (queryHas(lower, ['renew', 'renewal', 'extend'])) {
    return `The document says: “${safeExcerpt(first, 420)}”\n\nCheck the stated notice deadline and delivery method before relying on a renewal outcome.`;
  }
  if (queryHas(lower, ['pay', 'rent', 'fee', 'salary', 'invoice', 'charge', 'cost'])) {
    return `The document states the following payment term: “${safeExcerpt(first, 420)}”\n\nThe excerpt is reproduced as a document fact; confirm the surrounding definitions and schedules before treating it as the complete payment obligation.`;
  }
  if (queryHas(lower, ['notice', 'notify', 'deadline', 'when'])) {
    return `The relevant document language is: “${safeExcerpt(first, 420)}”\n\nThe stated period and delivery method are important to verify.`;
  }
  return `The document states: “${excerpts.map((excerpt) => safeExcerpt(excerpt, 300)).join('” “')}”\n\nThis is a document-grounded reading. Review the surrounding section for definitions, exceptions, and conditions.`;
}

export function answerDocumentQuestionGrounding(query, passages, options = {}) {
  const relevant = retrieveRelevantPassages(query, passages, options.topK || 4);
  if (!relevant.length) {
    return formatGroundedOutput({
      answer: NO_EVIDENCE_MESSAGE,
      confidence: 'low',
      sources: [],
      limitations: ['The query did not match a passage with enough evidence in this document.'],
    });
  }

  const bestScore = relevant[0].score || 0;
  const confidence = bestScore >= 0.5 ? 'high' : bestScore >= 0.3 ? 'medium' : 'low';
  const sources = relevant.map((passage) => ({
    section: passage.section,
    page: passage.page,
    excerpt: passage.text,
    passageId: passage.passageId,
  }));
  const limitations = confidence === 'low'
    ? ['The retrieved wording is limited; verify the full section and related definitions.']
    : [];
  return formatGroundedOutput({
    answer: answerForQuestion(query, relevant),
    confidence,
    sources,
    limitations,
  });
}
