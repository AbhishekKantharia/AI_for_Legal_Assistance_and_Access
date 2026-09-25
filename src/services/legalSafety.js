/**
 * @fileoverview ClauseGuard Legal Safety & Ethical Boundary System
 * Enforces responsible AI boundaries:
 * 1. ClauseGuard is an information and document understanding assistant, NOT a lawyer.
 * 2. It never provides definitive legal advice, guarantees outcomes, or dictates signing.
 * 3. It enforces calibrated review language (e.g. "Requires attention" vs "This is illegal").
 * 4. It redirects legal-advice inquiries to document facts and questions for a qualified professional.
 * @module legalSafety
 */

/**
 * Standard mandatory legal disclaimer required on all views and exported reports.
 */
export const LEGAL_DISCLAIMER_TEXT =
  'ClauseGuard provides document understanding and general information. It does not provide legal advice, determine whether a document is legally enforceable, or replace a qualified lawyer.';

export const LEGAL_DISCLAIMER_SHORT =
  'Informational document assistant only. Not formal legal advice.';

/**
 * Calibrated label mapping to ensure neutral, non-conclusory risk assessment.
 * Avoids unsupported legal conclusions like "This contract is illegal".
 */
export const CALIBRATED_LABELS = {
  HIGH_ATTENTION: {
    badge: 'Requires Attention',
    tone: 'Important clause with significant obligations or potential imbalance to review.',
    severity: 'attention',
  },
  MODERATE_ATTENTION: {
    badge: 'Potential Issue to Review',
    tone: 'Provision with notable terms, deadlines, or conditions worth verifying.',
    severity: 'review',
  },
  UNCLEAR_WORDING: {
    badge: 'Unclear Wording / Ambiguity',
    tone: 'Vague or open-ended terminology that may benefit from clarification.',
    severity: 'ambiguous',
  },
  STANDARD_TERM: {
    badge: 'Standard Provision',
    tone: 'Customary contractual provision adhering to typical commercial conventions.',
    severity: 'standard',
  },
};

/**
 * Detects whether a user prompt is asking for definitive legal advice or outcomes.
 * @param {string} prompt - User query or input
 * @returns {{ isLegalAdviceRequest: boolean, adviceCategory: string|null, redirectGuidance: string }}
 */
export function checkLegalAdviceRequest(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { isLegalAdviceRequest: false, adviceCategory: null, redirectGuidance: '' };
  }

  const lower = prompt.toLowerCase();

  // Pattern 1: Should I sign / accept?
  if (/\b(?:should i sign|can i sign|must i sign|should i refuse|should i accept|is it safe to sign)\b/i.test(lower)) {
    return {
      isLegalAdviceRequest: true,
      adviceCategory: 'SIGNING_DECISION',
      redirectGuidance:
        'ClauseGuard cannot tell you whether to sign or refuse this document. Signing decisions depend on your personal bargaining position and risk tolerance. Here is what the document says about key obligations, and specific questions you can ask an attorney before deciding.',
    };
  }

  // Pattern 2: Is this legal / enforceable / valid?
  if (/\b(?:is (?:this|the|that)|are (?:these|the))[^.?\n]*(?:legal|illegal|enforceable|unenforceable|valid|void|binding)\b/i.test(lower)) {
    return {
      isLegalAdviceRequest: true,
      adviceCategory: 'LEGAL_ENFORCEABILITY',
      redirectGuidance:
        'ClauseGuard cannot determine legal validity or enforceability. Enforceability depends on jurisdiction-specific statutes, recent case law, and factual context. Consider discussing these flagged clauses with a licensed legal professional.',
    };
  }

  // Pattern 3: Will I win / sue / liability guarantees?
  if (/\b(?:will i win|can i sue|will i lose|am i guaranteed|what are my chances in court)\b/i.test(lower)) {
    return {
      isLegalAdviceRequest: true,
      adviceCategory: 'LITIGATION_OUTCOME',
      redirectGuidance:
        'ClauseGuard cannot assess litigation outcomes or predict court decisions. If you are facing an active dispute or considering legal action, consult a qualified litigation attorney immediately.',
    };
  }

  return { isLegalAdviceRequest: false, adviceCategory: null, redirectGuidance: '' };
}

/**
 * Calibrates raw risk statements to eliminate biased or reckless language.
 * Ensures the assistant adheres to Section 3 of the Master Specification.
 * @param {string} rawExplanation - Raw analysis or summary text
 * @returns {string} Calibrated text using neutral, professional phraseology
 */
export function calibrateLanguage(rawExplanation) {
  if (!rawExplanation || typeof rawExplanation !== 'string') return '';

  return rawExplanation
    .replace(/\bthis contract is illegal\b/gi, 'this clause contains significant statutory restrictions worth verifying')
    .replace(/\byou will definitely lose\b/gi, 'this provision places high evidential and financial burden on you')
    .replace(/\bthis is completely unenforceable\b/gi, 'this provision may face enforceability challenges in several jurisdictions')
    .replace(/\byou must not sign this\b/gi, 'you may want to pause and discuss this specific clause with legal counsel')
    .replace(/\byou should sign this\b/gi, 'the terms appear aligned with standard baseline agreements')
    .replace(/\bdraconian\b/gi, 'stringent')
    .replace(/\btrap\b/gi, 'potential area to review');
}

/**
 * Formats a document-grounded response with explicit anti-hallucination disclaimers and source citations.
 * @param {Object} params
 * @param {string} params.answer - The plain-language answer text
 * @param {Array<{ section: string, page?: number, excerpt: string }>} params.sources - Grounded source citations
 * @param {string} [params.confidence='medium'] - 'high' | 'medium' | 'low'
 * @param {Array<string>} [params.limitations=[]] - Limitations or missing data points
 * @returns {Object} Structured grounded response
 */
export function formatGroundedOutput({
  answer,
  sources = [],
  confidence = 'medium',
  limitations = [],
}) {
  return {
    answer: calibrateLanguage(answer),
    confidence, // 'high' | 'medium' | 'low'
    sources: sources.map((s) => ({
      section: s.section || 'General Agreement',
      page: s.page || 1,
      excerpt: s.excerpt ? s.excerpt.slice(0, 300) : '',
    })),
    limitations: limitations || [],
    disclaimer: LEGAL_DISCLAIMER_SHORT,
  };
}
