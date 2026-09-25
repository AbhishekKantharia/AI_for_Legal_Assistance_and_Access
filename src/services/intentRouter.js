import { checkLegalAdviceRequest, formatGroundedOutput, safeExcerpt } from './legalSafety';

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

export function classifyIntent(prompt) {
  if (!prompt || typeof prompt !== 'string') return { intent: INTENTS.GENERAL_DOCUMENT_QUESTION, confidence: 0.5 };
  const lower = prompt.toLowerCase().trim();

  if (/\b(?:compare|comparison|what changed|difference|redline|version)\b/.test(lower)) return { intent: INTENTS.COMPARE_DOCUMENTS, confidence: 0.95 };
  if (/\b(?:ask|questions? for).{0,24}\b(?:lawyer|attorney|counsel)\b|\b(?:prepare|lawyer prep|consultation)\b/.test(lower)) return { intent: INTENTS.PREPARE_FOR_LAWYER, confidence: 0.95 };
  if (/\b(?:checklist|before signing|signing checklist|action items|steps before)\b/.test(lower)) return { intent: INTENTS.CHECKLIST, confidence: 0.92 };
  if (/\b(?:summarize|summary|overview|tldr|brief me|main points)\b/.test(lower)) return { intent: INTENTS.SUMMARY, confidence: 0.9 };
  if (/\b(?:obligation|obligated|duties?|responsibilities|required to|what do i have to do|what am i required)\b/.test(lower)) return { intent: INTENTS.OBLIGATIONS, confidence: 0.9 };
  if (/\b(?:deadline|dates?|timeline|notice period|when does|how many days|expiration)\b/.test(lower)) return { intent: INTENTS.DEADLINES, confidence: 0.88 };
  if (/\b(?:risk|risks|red flag|concern|review area|watch out|unusual|attention)\b/.test(lower)) return { intent: INTENTS.RISK_REVIEW, confidence: 0.88 };

  const clauseMatch = lower.match(/(?:explain|simplify|clarify|break down)\s+(?:section|article|paragraph|clause)\s+([0-9]+|[a-z]+)/i);
  if (clauseMatch || /\b(?:explain|simplify|clarify)\s+(?:section|article|paragraph|clause)\b/.test(lower)) {
    return { intent: INTENTS.EXPLAIN_CLAUSE, confidence: 0.9, targetClauseHint: clauseMatch?.[1] };
  }
  if (/\b(?:where does|find|does it mention|search for|locate)\b/.test(lower)) return { intent: INTENTS.FIND_INFORMATION, confidence: 0.86 };
  if (/\b(?:weather|recipe|cook|bake|movie|sports score|write code|stock market)\b/.test(lower)) return { intent: INTENTS.OUT_OF_SCOPE, confidence: 0.92 };
  return { intent: INTENTS.GENERAL_DOCUMENT_QUESTION, confidence: 0.7 };
}

function sourceForClause(clause) {
  return {
    section: clause.heading,
    page: clause.sourceLocation?.page ?? null,
    excerpt: clause.originalText,
    passageId: clause.id,
  };
}

function formatList(items, emptyText) {
  if (!items.length) return emptyText;
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n\n');
}

function findTargetClause(model, hint) {
  if (!hint) return null;
  const needle = String(hint).toLowerCase();
  return (model.clauses || []).find((clause) => {
    const heading = clause.heading.toLowerCase();
    return heading.includes(` ${needle}.`) || heading.includes(` ${needle} `) || heading.endsWith(` ${needle}`);
  }) || null;
}

export function routeUserQuery(prompt, documentModel, indexedPassages, fallbackRAG, options = {}) {
  const safety = checkLegalAdviceRequest(prompt);
  const classification = classifyIntent(prompt);
  const intent = classification.intent;
  const grounded = typeof fallbackRAG === 'function' ? fallbackRAG(prompt, indexedPassages, options) : { answer: 'The document model is not ready yet.', sources: [], confidence: 'low' };

  if (safety.isLegalAdviceRequest) {
    return formatGroundedOutput({
      answer: `${safety.redirectGuidance}\n\nWhat the document says:\n${grounded.answer}`,
      sources: grounded.sources || [],
      confidence: grounded.confidence || 'low',
      limitations: ['ClauseGuard does not assess enforceability, validity, or legal outcomes.'],
    });
  }

  const model = documentModel || { keyFacts: {}, clauses: [], reviewAreas: [], obligations: {}, datesAndDeadlines: [], checklist: [] };
  const facts = model.keyFacts || {};

  if (intent === INTENTS.OUT_OF_SCOPE) {
    return formatGroundedOutput({
      answer: 'That question appears unrelated to the loaded legal document. ClauseGuard is focused on explaining, extracting from, and comparing legal documents.',
      sources: [],
      confidence: 'low',
      limitations: ['No document-specific evidence was used for this out-of-scope request.'],
    });
  }

  if (intent === INTENTS.SUMMARY) {
    const sources = (model.clauses || []).slice(0, 2).map(sourceForClause);
    return formatGroundedOutput({
      answer: model.executiveSummary || 'The document was processed, but no summary text is available.',
      sources,
      confidence: sources.length ? 'medium' : 'low',
      limitations: ['This is a document-grounded overview, not legal advice.'],
    });
  }

  if (intent === INTENTS.EXPLAIN_CLAUSE) {
    const clause = findTargetClause(model, classification.targetClauseHint);
    if (!clause) {
      return grounded;
    }
    return formatGroundedOutput({
      answer: `Plain English: ${clause.plainEnglish}\n\nWhy it matters: ${clause.whyItMatters}\n\nWhat to check: ${clause.whatToCheck}`,
      sources: [sourceForClause(clause)],
      confidence: 'medium',
      limitations: ['The explanation is a reading aid, not a legal conclusion.'],
    });
  }

  if (intent === INTENTS.OBLIGATIONS) {
    const obligations = model.obligations || {};
    const your = obligations.yourObligations || [];
    const other = obligations.otherPartyObligations || [];
    const lines = [
      your.length ? `Your side (${obligations.selectedRole || 'selected role'}):\n${formatList(your.map((item) => `${item.obligation} — deadline: ${item.deadline}`), '')}` : 'No obligations were confidently assigned to your side. Select your role if the document names different parties.',
      other.length ? `Other named party obligations:\n${formatList(other.map((item) => `${item.obligation} — deadline: ${item.deadline}`), '')}` : 'No other-party obligations were confidently identified.',
    ];
    return formatGroundedOutput({
      answer: lines.join('\n\n'),
      sources: [...your, ...other].map((item) => ({ section: item.source, page: item.page, excerpt: item.obligation })),
      confidence: 'medium',
      limitations: ['Obligation labels depend on the role selected and on the wording in the document.'],
    });
  }

  if (intent === INTENTS.DEADLINES) {
    const dates = model.datesAndDeadlines || [];
    return formatGroundedOutput({
      answer: formatList(dates.map((item) => `${item.dateString} — ${item.category}: ${item.sourceSnippet}`), 'I did not find an explicit calendar date or fixed time window in the document.'),
      sources: dates.map((item) => ({ section: item.category, page: item.page, excerpt: item.sourceSnippet })),
      confidence: dates.length ? 'medium' : 'low',
      limitations: ['Relative windows are shown as written; no deadline is calculated from an assumed start date.'],
    });
  }

  if (intent === INTENTS.RISK_REVIEW) {
    const areas = model.reviewAreas || [];
    return formatGroundedOutput({
      answer: formatList(areas.map((area) => `${area.heading} — ${area.reviewSignal.badge}. ${area.whatToCheck}`), 'No elevated review signals were detected by the deterministic checks.'),
      sources: areas.map(sourceForClause),
      confidence: areas.length ? 'medium' : 'low',
      limitations: ['Review signals are prompts for human attention, not findings about legality or enforceability.'],
    });
  }

  if (intent === INTENTS.PREPARE_FOR_LAWYER) {
    const areas = model.reviewAreas || [];
    return formatGroundedOutput({
      answer: `Here are neutral questions to prepare with a qualified legal professional:\n\n${formatList(areas.map((area) => `What should I understand about ${area.heading}, including ${area.whatToCheck.toLowerCase()}?`), 'Which terms are missing, unclear, or dependent on facts I should verify with a professional?')}`,
      sources: areas.map(sourceForClause),
      confidence: areas.length ? 'medium' : 'low',
      limitations: ['The questions do not assume that any clause is invalid or enforceable.'],
    });
  }

  if (intent === INTENTS.CHECKLIST) {
    const checklist = model.checklist || [];
    return formatGroundedOutput({
      answer: formatList(checklist.map((item) => `${item.text} (source: ${item.source})`), 'No document-specific checklist items were identified.'),
      sources: (model.reviewAreas || []).map(sourceForClause),
      confidence: checklist.length ? 'medium' : 'low',
      limitations: ['Complete the checklist using the full document and advice from a qualified professional where appropriate.'],
    });
  }

  return {
    intent,
    ...grounded,
  };
}
