/**
 * @fileoverview ClauseGuard Lawyer Preparation & Consultation Package Generator
 * Generates an attorney consultation briefing dossier containing:
 * - Document Overview
 * - Key Questions to Ask a Lawyer (grounded in detected review areas)
 * - Specific Clauses to Discuss (with section and page citations)
 * - Important Dates & Deadlines
 * - Missing Information & Ambiguities
 * - Actionable Pre-Signing Checklist
 * Includes mandatory non-lawyer disclaimer and supports Markdown export and Print-to-PDF.
 * @module lawyerPrepService
 */

import { LEGAL_DISCLAIMER_TEXT } from './legalSafety';

/**
 * Generates questions tailored to the document's extracted review areas.
 * @param {Array<Object>} reviewAreas
 * @param {Object} keyFacts
 * @returns {Array<string>}
 */
export function generateLawyerQuestions(reviewAreas, keyFacts) {
  const questions = [
    `Given that this is a ${keyFacts.agreementType || 'commercial agreement'}, does it reflect customary commercial standards in ${keyFacts.governingLaw || 'our jurisdiction'}?`,
    'Are the termination notice windows and remedies reciprocal between both parties, or does one side hold unilateral rights?',
  ];

  for (const area of reviewAreas) {
    if (area.clauseCategory.includes('Non-Compete')) {
      questions.push(
        `Regarding ${area.heading}: Is the non-compete restriction enforceable under our local state law, and can we negotiate a narrow geographic and duration carve-out?`
      );
    } else if (area.clauseCategory.includes('Indemnif')) {
      questions.push(
        `Regarding ${area.heading}: What is my absolute worst-case financial liability under this indemnification clause, and can we add a liability cap tied to fees paid?`
      );
    } else if (area.clauseCategory.includes('Intellectual Property')) {
      questions.push(
        `Regarding ${area.heading}: Does the invention assignment clause threaten personal side-projects or code created outside working hours? How do we attach an Exhibit A carve-out?`
      );
    } else if (area.clauseCategory.includes('Deposit')) {
      questions.push(
        `Regarding ${area.heading}: Does the deposit deduction and refund timeline comply with mandatory statutory deposit return deadlines?`
      );
    } else if (area.clauseCategory.includes('Arbitration')) {
      questions.push(
        `Regarding ${area.heading}: Does the mandatory arbitration clause allow me to resolve small disputes in local Small Claims Court?`
      );
    }
  }

  return questions.slice(0, 7);
}

/**
 * Generates an actionable pre-signing checklist grounded in the actual document facts.
 * @param {Object} documentModel
 * @returns {Array<{ id: string, task: string, priority: string, source: string, completed: boolean }>}
 */
export function generateGroundedChecklist(documentModel) {
  const checklist = [
    {
      id: 'chk-parties',
      task: `Confirm legal names of all parties: ${documentModel.keyFacts?.parties?.join(' and ') || 'All entities'} are correctly identified.`,
      priority: 'HIGH',
      source: 'Preamble',
      completed: false,
    },
    {
      id: 'chk-payment',
      task: `Check payment terms and currency obligations: ${documentModel.keyFacts?.paymentTerms || 'Verify payment amounts and milestones'}.`,
      priority: 'HIGH',
      source: 'Financial Provisions',
      completed: false,
    },
    {
      id: 'chk-termination',
      task: `Review termination conditions: ${documentModel.keyFacts?.terminationNotice || 'Confirm written notice period before breaking agreement'}.`,
      priority: 'HIGH',
      source: 'Termination Section',
      completed: false,
    },
    {
      id: 'chk-renewal',
      task: `Verify renewal provisions: ${documentModel.keyFacts?.renewal || 'Check if contract auto-renews and mark cancellation calendar window'}.`,
      priority: documentModel.keyFacts?.renewal?.includes('automatic') ? 'HIGH' : 'MEDIUM',
      source: 'Term & Renewal',
      completed: false,
    },
    {
      id: 'chk-gov-law',
      task: `Confirm governing law and dispute jurisdiction: ${documentModel.keyFacts?.governingLaw || 'Select appropriate local venue'}.`,
      priority: 'MEDIUM',
      source: 'Governing Law',
      completed: false,
    },
  ];

  // Add items for detected review areas
  if (documentModel.reviewAreas && documentModel.reviewAreas.length > 0) {
    documentModel.reviewAreas.slice(0, 3).forEach((area, i) => {
      checklist.push({
        id: `chk-review-${i}`,
        task: `Discuss ${area.heading} with legal counsel: ${area.whatToCheck}`,
        priority: 'HIGH',
        source: area.heading,
        completed: false,
      });
    });
  }

  return checklist;
}

/**
 * Generates a complete Markdown briefing package for an attorney consultation.
 * @param {Object} documentModel - Parsed document model
 * @param {string} [userConcerns=''] - Custom notes provided by user
 * @returns {string} Markdown dossier
 */
export function generateLawyerConsultationMarkdown(documentModel, userConcerns = '') {
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const questions = generateLawyerQuestions(documentModel.reviewAreas || [], documentModel.keyFacts || {});
  const checklist = generateGroundedChecklist(documentModel);

  let md = `# CLAUSEGUARD — LEGAL CONSULTATION BRIEFING PACKAGE\n\n`;
  md += `> **NOTICE:** ${LEGAL_DISCLAIMER_TEXT}\n`;
  md += `> *This briefing is intended to help you prepare for a conversation with a qualified legal professional. It is not legal advice.*\n\n`;

  md += `---\n\n`;

  md += `## 1. DOCUMENT OVERVIEW & METADATA\n`;
  md += `- **Agreement Title / Type:** ${documentModel.keyFacts?.agreementType || 'Legal Agreement'}\n`;
  md += `- **Identified Parties:** ${documentModel.keyFacts?.parties?.join(' and ') || 'Not identified'}\n`;
  md += `- **Date of Review:** ${date}\n`;
  md += `- **Governing Law / Jurisdiction:** ${documentModel.keyFacts?.governingLaw || 'Not explicitly stated'}\n`;
  md += `- **Effective Date & Term:** ${documentModel.keyFacts?.effectiveDate || 'N/A'} (Term: ${documentModel.keyFacts?.term || 'N/A'})\n`;
  md += `- **Estimated Length:** ${documentModel.metadata?.estimatedPages || 1} page(s) (${documentModel.totalClauses || 0} clauses analyzed)\n\n`;

  md += `### Executive Summary\n${documentModel.executiveSummary || 'General document review.'}\n\n`;

  md += `## 2. KEY QUESTIONS TO ASK YOUR LAWYER\n`;
  questions.forEach((q, idx) => {
    md += `${idx + 1}. **${q}**\n`;
  });
  md += `\n`;

  md += `## 3. PROVISIONS TO DISCUSS (WITH SOURCE CITATIONS)\n`;
  if (documentModel.reviewAreas && documentModel.reviewAreas.length > 0) {
    documentModel.reviewAreas.forEach((area, idx) => {
      md += `### ${idx + 1}. ${area.heading} [${area.reviewSignal.badge}]\n`;
      md += `- **Source Location:** Section "${area.heading}" (Page ~${area.sourceLocation?.estimatedPage || 1})\n`;
      md += `- **Plain English Translation:** ${area.plainEnglish}\n`;
      md += `- **Why It Matters:** ${area.whyItMatters}\n`;
      md += `- **Recommended Investigation:** ${area.whatToCheck}\n`;
      md += `> Relevant Excerpt: "${area.originalText.slice(0, 200)}..."\n\n`;
    });
  } else {
    md += `No high-severity review areas flagged in primary clauses.\n\n`;
  }

  md += `## 4. IMPORTANT DATES & TIMELINES\n`;
  if (documentModel.datesAndDeadlines && documentModel.datesAndDeadlines.length > 0) {
    documentModel.datesAndDeadlines.forEach((d) => {
      md += `- **${d.label}** (${d.category}): ${d.sourceSnippet}\n`;
    });
    md += `\n`;
  } else {
    md += `No hard calendar deadlines extracted.\n\n`;
  }

  md += `## 5. ACTIONABLE PRE-SIGNING CHECKLIST\n`;
  checklist.forEach((item) => {
    md += `- [ ] **[${item.priority}]** ${item.task} *(Source: ${item.source})*\n`;
  });
  md += `\n`;

  if (userConcerns && userConcerns.trim().length > 0) {
    md += `## 6. CLIENT PERSONAL CONCERNS & GOALS\n`;
    md += `${userConcerns.trim()}\n\n`;
  }

  md += `---\n`;
  md += `*Generated via ClauseGuard — Understand your document. Spot what matters. Prepare for the next step.*\n`;

  return md;
}
