import { answerDocumentQuestionGrounding, indexDocumentPassages, retrieveRelevantPassages } from './retrievalEngine';
import { processDocument } from './documentParser';
import { checkLegalAdviceRequest } from './legalSafety';
import { getAiStatus, requestGroundedAnswer } from './aiService';

export function getStoredApiKey() {
  return '';
}

export function saveApiKey() {
  return false;
}

function localResult(documentText, question) {
  const model = processDocument(documentText, { source: 'offline-grounded-engine' });
  const passages = indexDocumentPassages(model.clauses);
  const grounded = answerDocumentQuestionGrounding(question, passages);
  return {
    ...grounded,
    grounded: true,
    source: 'ClauseGuard Grounded Engine (Offline / Local)',
  };
}

export function generateOfflineGroundedAnswer(documentText, question) {
  try {
    return localResult(documentText, question);
  } catch {
    return {
      answer: "I couldn't find enough information in the provided document to answer that reliably.",
      confidence: 'low',
      sources: [],
      limitations: ['The document could not be prepared for grounded retrieval.'],
      grounded: true,
      source: 'ClauseGuard Grounded Engine (Offline / Local)',
    };
  }
}

export async function askDocumentQuestion({ documentText, question, conversationHistory = [] }) {
  void conversationHistory;
  let model;
  let passages;
  try {
    model = processDocument(documentText, { source: 'document-question' });
    passages = indexDocumentPassages(model.clauses);
  } catch {
    return generateOfflineGroundedAnswer('', question);
  }

  const safety = checkLegalAdviceRequest(question);
  const local = localResult(documentText, question);
  const relevant = retrieveRelevantPassages(question, passages, 5);
  const live = await requestGroundedAnswer({ question, passages: relevant, context: {} });
  const result = live || local;

  if (safety.isLegalAdviceRequest) {
    return {
      ...result,
      answer: `${safety.redirectGuidance}\n\nWhat the document says:\n${result.answer}`,
      grounded: true,
      source: live ? 'ClauseGuard validated live model' : result.source,
      limitations: [...(result.limitations || []), 'ClauseGuard does not determine legal validity, enforceability, or outcomes.'],
    };
  }

  return {
    ...result,
    grounded: true,
    source: live ? 'ClauseGuard validated live model' : result.source,
  };
}

export { getAiStatus };
