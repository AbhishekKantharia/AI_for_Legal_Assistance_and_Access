import { describe, it, expect } from 'vitest';
import { classifyIntent, INTENTS, routeUserQuery } from '../src/services/intentRouter';
import { processDocument } from '../src/services/documentParser';
import { indexDocumentPassages, answerDocumentQuestionGrounding } from '../src/services/retrievalEngine';
import { SYNTHETIC_DOCUMENTS } from '../src/data/syntheticContracts';

describe('ClauseGuard Smart Intent Router', () => {
  it('correctly classifies user requests across core intents', () => {
    expect(classifyIntent('Can you summarize this agreement for me?').intent).toBe(INTENTS.SUMMARY);
    expect(classifyIntent('Explain section 3 in simple words').intent).toBe(INTENTS.EXPLAIN_CLAUSE);
    expect(classifyIntent('Where does it mention confidentiality?').intent).toBe(INTENTS.FIND_INFORMATION);
    expect(classifyIntent('What are my obligations under this contract?').intent).toBe(INTENTS.OBLIGATIONS);
    expect(classifyIntent('What are the key deadlines and notice periods?').intent).toBe(INTENTS.DEADLINES);
    expect(classifyIntent('What are the main risks and red flags?').intent).toBe(INTENTS.RISK_REVIEW);
    expect(classifyIntent('Compare these two agreements and show what changed').intent).toBe(INTENTS.COMPARE_DOCUMENTS);
    expect(classifyIntent('What questions should I ask my lawyer?').intent).toBe(INTENTS.PREPARE_FOR_LAWYER);
    expect(classifyIntent('Show me a pre-signing checklist').intent).toBe(INTENTS.CHECKLIST);
    expect(classifyIntent('How do I make chocolate chip cookies?').intent).toBe(INTENTS.OUT_OF_SCOPE);
  });

  it('routes query to specialized workflow and returns grounded responses', () => {
    const lease = SYNTHETIC_DOCUMENTS[0];
    const model = processDocument(lease.text, { filename: 'lease.txt' });
    const passages = indexDocumentPassages(model.clauses);

    const summaryResult = routeUserQuery('Summarize this contract', model, passages, answerDocumentQuestionGrounding);
    expect(summaryResult.intent).toBe(INTENTS.SUMMARY);
    expect(summaryResult.answer).toContain('Residential Lease');

    const obligationsResult = routeUserQuery('What am I obligated to do?', model, passages, answerDocumentQuestionGrounding);
    expect(obligationsResult.intent).toBe(INTENTS.OBLIGATIONS);
    expect(obligationsResult.answer).toContain('Obligations');

    const safetyResult = routeUserQuery('Is this agreement legally binding and enforceable?', model, passages, answerDocumentQuestionGrounding);
    expect(safetyResult.intent).toBe('LEGAL_ADVICE_REDIRECT');
    expect(safetyResult.answer).toContain('ClauseGuard cannot determine legal validity');
  });
});
