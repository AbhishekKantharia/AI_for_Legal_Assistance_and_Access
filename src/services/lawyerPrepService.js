import { LEGAL_DISCLAIMER_TEXT, safeExcerpt } from './legalSafety';

function sourcePage(area) {
  return Number.isInteger(area?.sourceLocation?.page) ? `page ${area.sourceLocation.page}` : 'page not available';
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

export function generateLawyerQuestions(reviewAreas = [], keyFacts = {}) {
  const agreement = keyFacts.agreementType || 'this agreement';
  const questions = [
    `What terms in this ${agreement} should I confirm before relying on them?`,
    keyFacts.governingLaw ? `What should I understand about the governing-law language naming ${keyFacts.governingLaw}?` : 'Which jurisdiction or governing-law terms are missing or unclear?',
    'Which dates, notice methods, and conditions should I put on a personal calendar?',
  ];

  for (const area of reviewAreas) {
    const category = `${area.clauseCategory || ''} ${area.heading || ''}`.toLowerCase();
    let question = `What should I understand about ${area.heading}, and what related facts should I verify?`;
    if (/termination|renewal|notice/.test(category)) question = `What options and notice steps does ${area.heading} describe, and what should I confirm about how it interacts with the rest of the agreement?`;
    else if (/payment|deposit|fee/.test(category)) question = `What amounts, due dates, and conditions are stated in ${area.heading}, and what supporting records should I keep?`;
    else if (/intellectual property|confidential/.test(category)) question = `What ownership, confidentiality, duration, or permitted-use boundaries are stated in ${area.heading}?`;
    else if (/liability|indemnity/.test(category)) question = `What responsibilities and limits are stated in ${area.heading}, and which terms should I discuss with a professional?`;
    questions.push(question);
  }

  return unique(questions).slice(0, 8);
}

export function generateGroundedChecklist(documentModel = {}) {
  const keyFacts = documentModel.keyFacts || {};
  const checklist = [];

  checklist.push({
    id: 'chk-parties',
    task: keyFacts.parties?.length ? `Confirm that the document names the expected parties: ${keyFacts.parties.join(' and ')}.` : 'Identify the parties and their roles in the document.',
    priority: 'High',
    source: 'Preamble',
    completed: false,
  });
  if (keyFacts.paymentTerms) checklist.push({
    id: 'chk-payment',
    task: `Verify the payment wording: ${safeExcerpt(keyFacts.paymentTerms, 180)}`,
    priority: 'High',
    source: 'Payment provisions',
    completed: false,
  });
  if (keyFacts.terminationNotice) checklist.push({
    id: 'chk-termination',
    task: `Review the stated termination and notice language: ${safeExcerpt(keyFacts.terminationNotice, 180)}`,
    priority: 'High',
    source: 'Termination provisions',
    completed: false,
  });
  if (keyFacts.renewal) checklist.push({
    id: 'chk-renewal',
    task: `Record the renewal language and any notice deadline: ${safeExcerpt(keyFacts.renewal, 180)}`,
    priority: 'High',
    source: 'Renewal provisions',
    completed: false,
  });
  if (keyFacts.governingLaw) checklist.push({
    id: 'chk-governing-law',
    task: `Confirm the governing-law and forum wording naming ${keyFacts.governingLaw}.`,
    priority: 'Medium',
    source: 'Governing law',
    completed: false,
  });

  (documentModel.reviewAreas || []).slice(0, 5).forEach((area, index) => {
    checklist.push({
      id: `chk-review-${index}`,
      task: `Discuss ${area.heading}: ${area.whatToCheck}`,
      priority: area.reviewSignal?.severity === 'attention' ? 'High' : 'Medium',
      source: area.heading,
      page: area.sourceLocation?.page ?? null,
      completed: false,
    });
  });

  return checklist;
}

function markdownValue(value) {
  return String(value || '').replace(/\r?\n/g, ' ').trim();
}

export function generateLawyerConsultationMarkdown(documentModel = {}, userConcerns = '') {
  const keyFacts = documentModel.keyFacts || {};
  const questions = generateLawyerQuestions(documentModel.reviewAreas || [], keyFacts);
  const checklist = generateGroundedChecklist(documentModel);
  const generatedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [
    '# ClauseGuard — lawyer consultation preparation',
    '',
    `> ${LEGAL_DISCLAIMER_TEXT}`,
    '> This package organizes document text and questions. It is not legal advice.',
    '',
    '## Document overview',
    `- **Agreement type:** ${markdownValue(keyFacts.agreementType || 'Not identified')}`,
    `- **Parties:** ${keyFacts.parties?.length ? keyFacts.parties.join(' and ') : 'Not identified'}`,
    `- **Effective date:** ${keyFacts.effectiveDate || 'Not explicitly identified'}`,
    `- **Term:** ${keyFacts.term || 'Not explicitly identified'}`,
    `- **Governing law:** ${keyFacts.governingLaw || 'Not explicitly identified'}`,
    `- **Prepared:** ${generatedDate}`,
    '',
    '## Executive summary',
    documentModel.executiveSummary || 'Document-grounded overview unavailable.',
    '',
    '## Questions to discuss with a qualified professional',
    ...questions.map((question, index) => `${index + 1}. ${question}`),
    '',
    '## Source-linked review areas',
  ];

  if ((documentModel.reviewAreas || []).length) {
    documentModel.reviewAreas.forEach((area, index) => {
      lines.push(
        `### ${index + 1}. ${area.heading}`,
        `- **Review signal:** ${area.reviewSignal?.badge || 'Review'}`,
        `- **Source:** ${area.heading} (${sourcePage(area)})`,
        `- **What it says:** ${safeExcerpt(area.originalText, 320)}`,
        `- **What to check:** ${area.whatToCheck}`,
        '',
      );
    });
  } else {
    lines.push('No elevated review signals were identified by the deterministic checks.', '');
  }

  lines.push('## Dates and time windows');
  if ((documentModel.datesAndDeadlines || []).length) {
    documentModel.datesAndDeadlines.forEach((date) => lines.push(`- **${date.dateString}** — ${date.category}: ${safeExcerpt(date.sourceSnippet, 240)}`));
  } else {
    lines.push('- No explicit calendar date or fixed time window was identified.');
  }
  lines.push('', '## Pre-consultation checklist');
  checklist.forEach((item) => lines.push(`- [ ] **${item.priority}:** ${item.task} *(Source: ${item.source})*`));
  if (userConcerns.trim()) lines.push('', '## My questions and concerns', userConcerns.trim());
  lines.push('', '---', 'Generated with ClauseGuard. Verify all details against the original document.');
  return lines.join('\n');
}

export function buildLawyerPrepPackage(documentModel = {}, userConcerns = '') {
  return {
    questions: generateLawyerQuestions(documentModel.reviewAreas || [], documentModel.keyFacts || {}),
    checklist: generateGroundedChecklist(documentModel),
    markdown: generateLawyerConsultationMarkdown(documentModel, userConcerns),
    disclaimer: LEGAL_DISCLAIMER_TEXT,
  };
}
