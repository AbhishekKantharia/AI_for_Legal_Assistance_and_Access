import { answerDocumentQuestionGrounding, indexDocumentPassages, retrieveRelevantPassages } from './retrievalEngine';
import { requestGroundedAnswer } from './aiService';
import { classifyIntent, routeUserQuery } from './intentRouter';

export function createDocumentContext(documentModel, context = {}) {
  return {
    documentModel,
    passages: indexDocumentPassages(documentModel?.clauses || []),
    objective: context.objective || '',
    jurisdiction: context.jurisdiction || '',
    role: context.role || documentModel?.obligations?.selectedRole || '',
  };
}

function localFallback(question, passages) {
  return answerDocumentQuestionGrounding(question, passages);
}

export async function askDocument({ question, documentModel, context = {}, passages: suppliedPassages }) {
  if (!documentModel) throw new Error('Load a document before asking a question.');
  const trimmedQuestion = String(question || '').trim();
  if (!trimmedQuestion) throw new Error('Enter a question about the document.');

  const documentContext = createDocumentContext(documentModel, context);
  const passages = suppliedPassages?.length ? suppliedPassages : documentContext.passages;
  const classification = classifyIntent(trimmedQuestion);
  const local = localFallback(trimmedQuestion, passages);
  let grounded = local;
  let usedLiveModel = false;

  if (classification.intent === 'GENERAL_DOCUMENT_QUESTION' || classification.intent === 'FIND_INFORMATION') {
    const relevant = retrieveRelevantPassages(trimmedQuestion, passages, 6);
    const live = await requestGroundedAnswer({
      question: trimmedQuestion,
      passages: relevant,
      context: {
        objective: documentContext.objective,
        jurisdiction: documentContext.jurisdiction,
        role: documentContext.role,
      },
    });
    if (live) {
      grounded = live;
      usedLiveModel = true;
    }
  }

  const routed = routeUserQuery(trimmedQuestion, documentModel, passages, () => grounded, {
    context: documentContext,
  });

  return {
    ...routed,
    intent: routed.intent || classification.intent,
    grounded: true,
    source: usedLiveModel ? 'ClauseGuard validated live model' : routed.source || 'ClauseGuard Grounded Engine',
    usedLiveModel,
    retrievedPassageCount: passages.length,
    context: {
      objective: documentContext.objective,
      jurisdiction: documentContext.jurisdiction,
      role: documentContext.role,
    },
  };
}
