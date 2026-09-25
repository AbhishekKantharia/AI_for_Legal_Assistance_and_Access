export const LEGAL_DISCLAIMER_TEXT =
  'ClauseGuard provides document understanding and general information. It does not provide legal advice, determine whether a document is legally enforceable, or replace a qualified lawyer.';

export const LEGAL_DISCLAIMER_SHORT =
  'Informational document assistance only. Not legal advice.';

export const NO_EVIDENCE_MESSAGE =
  "I couldn't find enough information in the provided document to answer that reliably.";

export const REVIEW_SIGNALS = {
  attention: {
    badge: 'Requires Attention',
    severity: 'attention',
    tone: 'A notable obligation, condition, or allocation of responsibility to review.',
  },
  review: {
    badge: 'Potential issue to review',
    severity: 'review',
    tone: 'A provision with terms, deadlines, or scope worth checking.',
  },
  ambiguous: {
    badge: 'Unclear wording',
    severity: 'ambiguous',
    tone: 'The wording may need clarification or additional context.',
  },
  standard: {
    badge: 'Important clause',
    severity: 'standard',
    tone: 'A document provision identified for understanding; this is not a legal conclusion.',
  },
};

export const CALIBRATED_LABELS = {
  HIGH_ATTENTION: REVIEW_SIGNALS.attention,
  MODERATE_ATTENTION: REVIEW_SIGNALS.review,
  UNCLEAR_WORDING: REVIEW_SIGNALS.ambiguous,
  STANDARD_TERM: REVIEW_SIGNALS.standard,
};

export function checkLegalAdviceRequest(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { isLegalAdviceRequest: false, adviceCategory: null, redirectGuidance: '' };
  }

  const lower = prompt.toLowerCase();
  if (/\b(?:should|must|can|do)\s+i\s+(?:sign|refuse|accept)\b|\bis it safe to sign\b/.test(lower)) {
    return {
      isLegalAdviceRequest: true,
      adviceCategory: 'SIGNING_DECISION',
      redirectGuidance:
        'ClauseGuard cannot tell you whether to sign or refuse this document. Here is what the document says, what remains uncertain, and questions you can discuss with a qualified legal professional.',
    };
  }

  if (/\b(?:legal(?:ly)?|enforceable|unenforceable|valid|invalid|void|binding)\b[^.?!]*\?/.test(lower) ||
      /\b(?:is|are|does|do)\b[^.?!]*\b(?:illegal|valid|enforceable|binding)\b/.test(lower)) {
    return {
      isLegalAdviceRequest: true,
      adviceCategory: 'LEGAL_ENFORCEABILITY',
      redirectGuidance:
        'ClauseGuard cannot determine legal validity or enforceability. Those questions depend on applicable law, facts, and jurisdiction. Review the cited document terms and discuss them with a qualified legal professional.',
    };
  }

  if (/\b(?:will|can)\s+i\s+(?:win|lose|sue|be compensated)\b|\bwhat are my chances\b|\bguarantee(?:d)? outcome\b/.test(lower)) {
    return {
      isLegalAdviceRequest: true,
      adviceCategory: 'LITIGATION_OUTCOME',
      redirectGuidance:
        'ClauseGuard cannot predict a legal outcome or guarantee a result. If you face an active dispute or urgent deadline, consult an appropriately qualified professional.',
    };
  }

  return { isLegalAdviceRequest: false, adviceCategory: null, redirectGuidance: '' };
}

export function calibrateLanguage(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .replace(/this contract is illegal/gi, 'this provision may warrant review for statutory restrictions worth verifying under applicable law')
    .replace(/you will definitely lose/gi, 'the outcome cannot be predicted from the document alone')
    .replace(/this is completely unenforceable/gi, 'enforceability may depend on applicable law and facts')
    .replace(/you must not sign this/gi, 'you may want to pause and discuss this specific clause with legal counsel')
    .replace(/you should sign this/gi, 'you may want to discuss this specific clause with legal counsel')
    .replace(/you should not sign this/gi, 'you may want to pause and discuss this specific clause with legal counsel')
    .replace(/\bdraconian\b/gi, 'stringent')
    .replace(/\btrap\b/gi, 'potential area to review');
}

export function containsUnsupportedLegalClaim(value) {
  if (!value || typeof value !== 'string') return false;
  return /\b(?:is illegal|is unenforceable|is legally void|is definitely valid|is definitely invalid|guaranteed to win|you will win|you will lose|you must sign|do not sign)\b/i.test(value);
}

export function safeExcerpt(text, maxLength = 320) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (!value) return '';
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;
}

export function formatGroundedOutput({ answer, sources = [], confidence = 'medium', limitations = [] }) {
  const safeConfidence = ['high', 'medium', 'low'].includes(confidence) ? confidence : 'low';
  return {
    answer: calibrateLanguage(answer),
    confidence: safeConfidence,
    sources: (Array.isArray(sources) ? sources : []).map((source) => ({
      section: String(source?.section || 'Document source'),
      page: Number.isInteger(source?.page) && source.page > 0 ? source.page : null,
      excerpt: safeExcerpt(source?.excerpt),
      passageId: source?.passageId || null,
    })),
    limitations: Array.isArray(limitations) ? limitations : [],
    disclaimer: LEGAL_DISCLAIMER_SHORT,
  };
}

export function sourceLabel(source) {
  const page = Number.isInteger(source?.page) && source.page > 0 ? `page ${source.page}` : 'page not available';
  return `${source?.section || 'Document source'} — ${page}`;
}
