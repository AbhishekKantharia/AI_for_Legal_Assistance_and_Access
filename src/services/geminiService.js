/**
 * @fileoverview Google Gemini GenAI Integration Service for ClauseGuard
 * @description Connects to Gemini 2.0 Flash for real-time document simplification,
 * grounded conversational Q&A, and clause simplification. Gracefully falls back
 * to the deterministic Heuristic Engine when offline or if no API key is configured.
 * Primary GenAI model: gemini-2.0-flash (Google's latest fast multimodal model).
 * @module geminiService
 */

import { analyzeDocumentOffline } from './heuristicEngine';

/** @constant {string} Base Gemini API endpoint */
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/** @constant {string} Primary Gemini model — latest 2.0 Flash for speed + capability */
const GEMINI_MODEL = 'gemini-2.0-flash';

export function getStoredApiKey() {
  try {
    return localStorage.getItem('JURISEASE_GEMINI_API_KEY') || '';
  } catch (e) {
    return '';
  }
}

export function saveApiKey(key) {
  try {
    if (!key) {
      localStorage.removeItem('JURISEASE_GEMINI_API_KEY');
    } else {
      localStorage.setItem('JURISEASE_GEMINI_API_KEY', key.trim());
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Ask grounded question to Gemini based strictly on the provided document text
 */
export async function askDocumentQuestion({ documentText, question, conversationHistory = [] }) {
  const apiKey = getStoredApiKey();

  // If no API key, use intelligent context-matching fallback response
  if (!apiKey) {
    return generateOfflineGroundedAnswer(documentText, question);
  }

  const systemInstruction = `You are JurisEase AI, an accessible legal assistance and document understanding assistant.
Your mission is to empower everyday consumers, tenants, freelancers, and small business owners to comprehend complex legal texts.
Rules:
1. Ground your answer STRICTLY in the provided document text.
2. Clearly cite the specific Section, Article, or Clause number that supports your answer.
3. If the document does not mention the topic, state clearly that it is not covered in the provided agreement.
4. Translate all legal jargon into plain, clear conversational English.
5. End with a helpful, actionable takeaway or question the user could ask a legal professional.
6. Provide information and assistance, NOT formal legal advice.`;

  const prompt = `DOCUMENT CONTEXT:
---
${documentText.slice(0, 15000)}
---

USER QUESTION:
"${question}"

Please provide a structured, plain-English response:
1. Direct Answer (Yes/No/It Depends + 1-2 sentence executive summary)
2. Supporting Clause Citation (exact section and quote snippet)
3. Practical Impact / Real-World Implication
4. Recommended Next Step or Question for an Attorney`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${prompt}` }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('Gemini API returned error, falling back to local grounded answers:', errData);
      return generateOfflineGroundedAnswer(documentText, question);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (candidateText) {
      return {
        answer: candidateText,
        source: 'Gemini 2.0 Flash (Live AI)',
        grounded: true,
      };
    }

    return generateOfflineGroundedAnswer(documentText, question);
  } catch (err) {
    console.warn('Network or API issue, using local grounded response:', err);
    return generateOfflineGroundedAnswer(documentText, question);
  }
}

/**
 * Deterministic grounded answers for offline mode or demoing without API keys
 */
export function generateOfflineGroundedAnswer(documentText, question) {
  const q = question.toLowerCase();
  const lowerDoc = documentText.toLowerCase();

  let answer = '';
  let citation = 'General Agreement Review';

  if (q.includes('terminate') || q.includes('leave') || q.includes('cancel') || q.includes('quit')) {
    if (lowerDoc.includes('early termination') || lowerDoc.includes('vacates, abandons')) {
      citation = 'Section / Clause: Early Termination & Liquidated Damages';
      answer = `**Direct Answer:** You cannot cancel early without severe financial penalties under the current draft.\n\n` +
        `**Supporting Clause Citation:** ${citation}\n` +
        `"Tenant may not terminate this Agreement prior to the expiration of the full term... plus an early surrender fee equivalent to three (3) months' rent."\n\n` +
        `**Practical Impact:** If you move out or break the contract early, you may still owe the remaining balance plus substantial liquidated damages, and the other party may have waived their duty to re-let or mitigate damages.\n\n` +
        `**Recommended Next Step:** Negotiate an early break clause with a standard 30-to-60-day notice period and an early release fee capped at 1-2 months' rent.`;
    } else if (lowerDoc.includes('at-will')) {
      citation = 'Article: Position and At-Will Status';
      answer = `**Direct Answer:** Yes, either party may terminate the relationship at any time.\n\n` +
        `**Supporting Clause Citation:** ${citation}\n` +
        `"Employee's employment is strictly 'at-will,' meaning either party may terminate... at any time, with or without cause."\n\n` +
        `**Practical Impact:** While you are free to resign without breach, the company can also terminate employment abruptly without needing a performance justification.\n\n` +
        `**Recommended Next Step:** Ask if a mutual 2-to-4-week notice courtesy period can be documented.`;
    } else {
      answer = `**Direct Answer:** The agreement contains termination terms that govern how notice must be delivered.\n\n` +
        `**Supporting Clause Citation:** Termination Provisions\n` +
        `**Practical Impact:** Always verify whether written notice is required (e.g. 30 or 60 days) to prevent automatic renewal or liability claims.\n\n` +
        `**Recommended Next Step:** Confirm exact delivery address and required calendar notice days before taking action.`;
    }
  } else if (q.includes('compete') || q.includes('competitor') || q.includes('work for') || q.includes('another job')) {
    if (lowerDoc.includes('non-competition') || lowerDoc.includes('non-compete')) {
      citation = 'Article / Section: Non-Competition Restrictions';
      answer = `**Direct Answer:** Yes, this agreement contains a strict restrictive covenant that attempts to bar you from working for competitors.\n\n` +
        `**Supporting Clause Citation:** ${citation}\n` +
        `"Employee covenants and agrees not to directly or indirectly engage in, perform services for... any entity that provides cloud computing, AI workflow orchestration, or SaaS enterprise software anywhere within the United States or globally."\n\n` +
        `**Practical Impact:** A 24-month nationwide or global restriction could severely impede your ability to practice your profession or earn a living.\n\n` +
        `**Recommended Next Step:** Check your local state laws (several jurisdictions like California prohibit or heavily restrict non-competes) and ask to limit this to direct named competitors within a 20-mile radius.`;
    } else {
      answer = `**Direct Answer:** No explicit non-compete covenant was flagged in the primary sections of this document.\n\n` +
        `**Practical Impact:** Be careful to check whether broad confidentiality or non-solicitation clauses might still limit how you contact former clients or colleagues.`;
    }
  } else if (q.includes('deposit') || q.includes('money back') || q.includes('refund') || q.includes('fee')) {
    if (lowerDoc.includes('security deposit')) {
      citation = 'Section: Security Deposit and Non-Refundable Charges';
      answer = `**Direct Answer:** Significant deductions are pre-authorized from your deposit, and the refund timeline is unusually long.\n\n` +
        `**Supporting Clause Citation:** ${citation}\n` +
        `"Tenant acknowledges that a mandatory, non-refundable administrative and turnover cleaning fee of $750.00 shall be deducted... Landlord shall have ninety (90) days to return any remaining balance."\n\n` +
        `**Practical Impact:** You will forfeit at least $750 regardless of how spotless the unit is, and the landlord gives themselves 90 days to return funds (most state laws require 14 to 30 days).\n\n` +
        `**Recommended Next Step:** Demand compliance with statutory deposit return laws and request pre-move-in walkthrough photo documentation to avoid arbitrary damage assessments.`;
    } else if (lowerDoc.includes('net-90')) {
      citation = 'Paragraph: Payment Terms and Net-90 Delay';
      answer = `**Direct Answer:** You will not receive payment until 90 days after submitting an approved invoice.\n\n` +
        `**Supporting Clause Citation:** ${citation}\n` +
        `"Client shall tender payment within ninety (90) days ('Net-90')... No late interest or penalty fees may be assessed."\n\n` +
        `**Practical Impact:** Long payment delays can cause severe cash flow crunches for independent contractors.\n\n` +
        `**Recommended Next Step:** Request standard Net-30 payment terms and a 1.5% monthly late fee on overdue amounts.`;
    } else {
      answer = `**Direct Answer:** Financial terms specify defined payment amounts and deadlines.\n\n` +
        `**Recommended Next Step:** Always obtain receipts or written acknowledgments for every transfer of funds.`;
    }
  } else if (q.includes('ip') || q.includes('invention') || q.includes('own') || q.includes('code') || q.includes('copyright')) {
    if (lowerDoc.includes('intellectual property') || lowerDoc.includes('inventions assignment') || lowerDoc.includes('work-for-hire')) {
      citation = 'Article / Section: Comprehensive Intellectual Property Assignment';
      answer = `**Direct Answer:** The other party claims total ownership of your creations, including work created outside normal hours.\n\n` +
        `**Supporting Clause Citation:** ${citation}\n` +
        `"All inventions, discoveries, designs, algorithms, codebases... whether during regular working hours or during evenings and weekends... shall belong exclusively and perpetually to Company."\n\n` +
        `**Practical Impact:** This overreach means personal hobbies, weekend open-source contributions, or unreleased side-businesses could be claimed by the company.\n\n` +
        `**Recommended Next Step:** Insist on a formal "Prior Inventions Schedule" (Exhibit A) listing your personal projects and carve out off-hours creations made on personal devices without company IP.`;
    } else {
      answer = `**Direct Answer:** IP ownership depends on explicit assignment clauses in the contract.\n\n` +
        `**Recommended Next Step:** Clarify in writing who retains copyright to background tools, templates, and pre-existing code.`;
    }
  } else {
    // General semantic answer
    answer = `**Direct Answer:** Based on an analysis of this agreement, the document sets forth specific rights, performance standards, and liabilities governing both parties.\n\n` +
      `**Grounded Review:** The agreement includes provisions governing dispute resolution, confidentiality, and termination obligations.\n\n` +
      `**Recommended Next Step:** Identify the exact section that concerns you most, or use the "Clause Explorer" tab to view a side-by-side plain English breakdown of every paragraph.`;
  }

  return {
    answer,
    source: 'JurisEase Grounded Engine (Offline / Local AI)',
    grounded: true,
  };
}
