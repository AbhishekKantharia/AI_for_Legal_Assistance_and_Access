/**
 * @fileoverview ClauseGuard Smart Intent Router
 * Classifies user queries into 11 distinct workflow intents and routes them
 * to the appropriate grounded reasoning engine or safety redirection.
 * @module intentRouter
 */

import { checkLegalAdviceRequest } from './legalSafety';

/**
 * Supported Intent Categories
 * @enum {string}
 */
export const INTENTS = {
  SUMMARY: 'SUMMARY',
  EXPLAIN_CLAUSE: 'EXPLAIN_CLAUSE',
  FIND_INFORMATION: 'FIND_INFORMATION',
  OBLIGATIONS: 'OBLIGATIONS',
  DEADLINES: 'DEADLINES',
  RISK_REVIEW: 'RISK_REVIEW',
  COMPARE_DOCUMENTS: 'COMPARE_DOCUMENTS',
  PREPARE_FOR_LAWYER: 'PREPARE_FOR_LAWYER',
  CHECKLIST: 'CHECKLIST',
  GENERAL_DOCUMENT_QUESTION: 'GENERAL_DOCUMENT_QUESTION',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE',
};

/**
 * Classifies a user's prompt into one of the recognized intents.
 * @param {string} prompt - Raw query from user
 * @returns {{ intent: string, confidence: number, targetClauseHint?: string }}
 */
export function classifyIntent(prompt) {
  if (!prompt || typeof prompt !== 'string') {
    return { intent: INTENTS.GENERAL_DOCUMENT_QUESTION, confidence: 0.5 };
  }

  const lower = prompt.toLowerCase().trim();

  // 1. Comparison Intent
  if (/\b(?:compare|comparison|difference|differences|diff|what changed|between (?:these|the two|both))\b/i.test(lower)) {
    return { intent: INTENTS.COMPARE_DOCUMENTS, confidence: 0.95 };
  }

  // 2. Lawyer Preparation Intent
  if (/\b(?:ask (?:my|a) lawyer|discuss with (?:a )?lawyer|attorney|consultation|legal advice questions|lawyer prep)\b/i.test(lower)) {
    return { intent: INTENTS.PREPARE_FOR_LAWYER, confidence: 0.95 };
  }

  // 3. Checklist Intent
  if (/\b(?:checklist|actionable checklist|before signing|sign checklist|steps before signing)\b/i.test(lower)) {
    return { intent: INTENTS.CHECKLIST, confidence: 0.9 };
  }

  // 4. Summary Intent
  if (/\b(?:summarize|summary|overview|what is this agreement about|give me a brief|tldr|nutshell)\b/i.test(lower)) {
    return { intent: INTENTS.SUMMARY, confidence: 0.9 };
  }

  // 5. Obligations Intent
  if (/\b(?:obligation|obligations|obligated|duties|duty|what am i required|responsible for|responsibilities|covenants?|what do i have to do)\b/i.test(lower)) {
    return { intent: INTENTS.OBLIGATIONS, confidence: 0.9 };
  }

  // 6. Deadlines & Dates Intent
  if (/\b(?:deadlines?|dates?|notice period|when does this expire|calendar|timeline|grace period|how many days)\b/i.test(lower)) {
    return { intent: INTENTS.DEADLINES, confidence: 0.9 };
  }

  // 7. Risk / Review Areas Intent
  if (/\b(?:risks?|traps?|red flags?|unusual|dangerous|what to watch out for|concerns?|review areas?|unfair)\b/i.test(lower)) {
    return { intent: INTENTS.RISK_REVIEW, confidence: 0.9 };
  }

  // 8. Explain Clause Intent
  const clauseMatch = lower.match(/(?:explain|simplify|break down|clarify)\s+(?:section|article|paragraph|clause)\s+(\d+|[a-z]+)/i);
  if (clauseMatch || /\b(?:explain section|explain clause|explain article|plain english of)\b/i.test(lower)) {
    return {
      intent: INTENTS.EXPLAIN_CLAUSE,
      confidence: 0.9,
      targetClauseHint: clauseMatch ? clauseMatch[1] : undefined,
    };
  }

  // 9. Find Specific Information
  if (/\b(?:where does it mention|find|does it mention|is there a mention of|search for)\b/i.test(lower)) {
    return { intent: INTENTS.FIND_INFORMATION, confidence: 0.85 };
  }

  // 10. Check if query is completely out of scope (e.g. recipe, cookies, weather, sports)
  if (/\b(?:weather|recipe|cook|bake|movie|sports score|cookies?|write code in c\+\+|python script)\b/i.test(lower)) {
    return { intent: INTENTS.OUT_OF_SCOPE, confidence: 0.9 };
  }

  // Default: General Document Question
  return { intent: INTENTS.GENERAL_DOCUMENT_QUESTION, confidence: 0.7 };
}

/**
 * Handles intent routing and returns specialized structured responses based on the parsed document model.
 * @param {string} prompt - User question
 * @param {Object} documentModel - Processed document model from documentParser
 * @param {Array<Object>} indexedPassages - Indexed passages from retrievalEngine
 * @param {Function} fallbackRAG - Grounded RAG function
 * @returns {Object} Structured response with answer, sources, and intent metadata
 */
export function routeUserQuery(prompt, documentModel, indexedPassages, fallbackRAG) {
  const safetyCheck = checkLegalAdviceRequest(prompt);
  const { intent, targetClauseHint } = classifyIntent(prompt);

  // If user asks for legal advice or enforceability conclusions, route safely
  if (safetyCheck.isLegalAdviceRequest) {
    return {
      intent: 'LEGAL_ADVICE_REDIRECT',
      answer: `${safetyCheck.redirectGuidance}\n\n**What the document says:**\n${fallbackRAG(prompt, indexedPassages).answer}`,
      sources: fallbackRAG(prompt, indexedPassages).sources,
      confidence: 'high',
      limitations: ['Definitive enforceability requires consultation with a licensed attorney in your jurisdiction.'],
    };
  }

  switch (intent) {
    case INTENTS.SUMMARY:
      return {
        intent,
        answer: documentModel.executiveSummary || 'Summary of the agreement.',
        sources: [{ section: 'Preamble & Key Facts', page: 1, excerpt: documentModel.keyFacts?.agreementType || '' }],
        confidence: 'high',
        limitations: [],
      };

    case INTENTS.OBLIGATIONS: {
      const yourObs = documentModel.obligations?.yourObligations || [];
      const formatted = yourObs.length > 0
        ? yourObs.map((o, i) => `${i + 1}. **${o.source}**: ${o.obligation} (Deadline: ${o.deadline})`).join('\n\n')
        : 'No explicit unilateral obligations identified in extracted sections.';
      return {
        intent,
        answer: `**Your Extracted Obligations:**\n\n${formatted}`,
        sources: yourObs.map(o => ({ section: o.source, page: 1, excerpt: o.obligation })),
        confidence: 'high',
        limitations: ['Review the full agreement for any implicit or referenced obligations.'],
      };
    }

    case INTENTS.DEADLINES: {
      const dates = documentModel.datesAndDeadlines || [];
      const formatted = dates.length > 0
        ? dates.map((d, i) => `${i + 1}. **${d.label}** (${d.category}): ${d.sourceSnippet}`).join('\n\n')
        : 'No specific calendar deadlines or hard notice windows were extracted.';
      return {
        intent,
        answer: `**Key Extracted Deadlines & Notice Windows:**\n\n${formatted}`,
        sources: dates.map(d => ({ section: d.category, page: 1, excerpt: d.sourceSnippet })),
        confidence: 'high',
        limitations: [],
      };
    }

    case INTENTS.RISK_REVIEW: {
      const areas = documentModel.reviewAreas || [];
      const formatted = areas.length > 0
        ? areas.map((a, i) => `${i + 1}. **${a.heading}** [${a.reviewSignal.badge}]: ${a.whyItMatters}\n*What to check:* ${a.whatToCheck}`).join('\n\n')
        : 'No significant elevated review areas were detected in the primary clauses.';
      return {
        intent,
        answer: `**Key Provisions Requiring Human Review:**\n\n${formatted}`,
        sources: areas.map(a => ({ section: a.heading, page: a.sourceLocation?.estimatedPage || 1, excerpt: a.plainEnglish })),
        confidence: 'high',
        limitations: ['These are calibrated review signals for educational discussion, not legal determinations.'],
      };
    }

    case INTENTS.OUT_OF_SCOPE:
      return {
        intent,
        answer: 'This inquiry appears unrelated to the loaded legal document. ClauseGuard is focused strictly on analyzing, explaining, and comparing legal agreements.',
        sources: [],
        confidence: 'low',
        limitations: ['Out-of-scope query.'],
      };

    default:
      // Fallback to grounded anti-hallucination RAG
      return {
        intent,
        ...fallbackRAG(prompt, indexedPassages),
      };
  }
}
