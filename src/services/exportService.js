/**
 * Export Service - Generates structured Lawyer Consultation Dossiers
 * Formats Markdown & Print-to-PDF reports for attorney consultations and personal records.
 */

export function generateLawyerDossierMarkdown(analysis, customNotes = '') {
  if (!analysis) return '';

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# LEGAL CONSULTATION BRIEFING DOSSIER\n`;
  md += `**Document Analyzed:** ${analysis.title || 'Legal Agreement'}\n`;
  md += `**Date of AI Review:** ${date}\n`;
  md += `**Overall Exposure Score:** ${analysis.overallRiskScore} / 100 (${analysis.riskCategory})\n`;
  md += `**Notice:** Prepared with ClauseGuard for informational briefing only. Not formal legal advice.\n\n`;

  md += `---\n\n`;

  md += `## 1. EXECUTIVE SUMMARY & RISK PROFILE\n`;
  md += `- **Total Clauses Analyzed:** ${analysis.totalClauses}\n`;
  md += `- **Critical Risk Clauses:** ${analysis.criticalCount} (Immediate negotiation required)\n`;
  md += `- **Moderate Caution Clauses:** ${analysis.cautionCount} (Clarification recommended)\n`;
  md += `- **Standard / Fair Clauses:** ${analysis.fairCount}\n`;
  md += `- **Original Readability:** Flesch-Kincaid Grade ${analysis.overallReadabilityOriginal.fleschKincaidGrade} (${analysis.overallReadabilityOriginal.gradeLabel})\n`;
  md += `- **Plain English Readability:** Flesch-Kincaid Grade ${analysis.overallReadabilityPlain.fleschKincaidGrade} (${analysis.overallReadabilityPlain.gradeLabel})\n\n`;

  md += `## 2. KEY RED FLAGS & COUNTER-LANGUAGE RECOMMENDATIONS\n\n`;
  if (analysis.redFlags && analysis.redFlags.length > 0) {
    analysis.redFlags.forEach((rf, i) => {
      md += `### ${i + 1}. ${rf.heading} [${rf.riskLevel}]\n`;
      md += `**The Trap / Exposure:** ${rf.trap}\n\n`;
      md += `**Proposed Counter-Amendment:**\n> "${rf.counter}"\n\n`;
    });
  } else {
    md += `No critical red flags identified in this review.\n\n`;
  }

  md += `## 3. KEY QUESTIONS TO ASK YOUR ATTORNEY DURING CONSULTATION\n`;
  md += `1. **Statutory Enforceability:** Are the restrictive covenants or penalty clauses enforceable under our state or local jurisdiction?\n`;
  md += `2. **Liability Exposure:** Given the indemnity and limitation of liability clauses, what is my absolute worst-case financial exposure?\n`;
  md += `3. **Negotiation Leverage:** Which of the red-flagged clauses are customary to push back on, and what compromise language is typically accepted?\n`;
  md += `4. **Default & Termination:** If an unanticipated dispute arises, what are my legal rights to terminate without triggering liquidated damages?\n`;
  md += `5. **Arbitration vs Court:** Does the mandatory arbitration clause disadvantage me significantly compared to small claims or standard courts?\n\n`;

  md += `## 4. ACTIONABLE PRE-SIGNING CHECKLIST\n`;
  if (analysis.actionableChecklist) {
    analysis.actionableChecklist.forEach((item) => {
      const mark = item.completed ? '[x]' : '[ ]';
      md += `- ${mark} **[${item.priority}]** ${item.task}\n`;
    });
    md += `\n`;
  }

  if (customNotes && customNotes.trim().length > 0) {
    md += `## 5. CLIENT PERSONAL NOTES & CONTEXT\n`;
    md += `${customNotes}\n\n`;
  }

  md += `---\n`;
  md += `*Generated via ClauseGuard - Empowering Legal Access & Document Transparency.*\n`;

  return md;
}

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
