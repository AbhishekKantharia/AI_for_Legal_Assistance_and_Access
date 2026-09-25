/**
 * Heuristic Legal Analysis Engine
 * Provides deterministic, offline-capable legal clause segmentation, risk categorization,
 * plain-English simplification, deadline/obligation extraction, and negotiation counter-proposals.
 */

import { analyzeReadability } from './readabilityService';

// Clause categorization patterns
const CLAUSE_PATTERNS = [
  {
    type: 'NON_COMPETE',
    keywords: ['non-competition', 'non-compete', 'covenants not to compete', 'restrictive covenants', 'competing entity'],
    riskLevel: 'CRITICAL',
    title: 'Non-Compete & Restrictive Covenant',
    plainSummary: 'Restricts your ability to work for competitors or start a similar business after leaving. May prevent you from earning a livelihood in your field.',
    trapExplanation: 'Broad non-competes (e.g. 24 months, nationwide or global) can severely constrain career mobility. Many states (such as California, Minnesota, and FTC guidelines) render unreasonable non-competes unenforceable.',
    counterProposal: 'Limit non-compete duration to 6 months, restrict geographic scope strictly to direct local competitors within a 25-mile radius, and require company to pay severance during any non-compete period.',
  },
  {
    type: 'IP_ASSIGNMENT',
    keywords: ['intellectual property assignment', 'inventions assignment', 'work-for-hire', 'proprietary inventions', 'moral rights', 'assigned to company', 'belong exclusively'],
    riskLevel: 'CRITICAL',
    title: 'Intellectual Property & Inventions Forfeiture',
    plainSummary: 'Assigns ownership of your inventions, code, designs, or ideas to the other party—often including work done during off-hours or on personal equipment.',
    trapExplanation: 'If the clause claims creations made during evenings, weekends, or unrelated to company business, you forfeit rights to your own side-projects, open-source work, or portfolio pieces.',
    counterProposal: 'Explicitly carve out inventions created entirely on your own personal time, using personal equipment, without using company confidential information or trade secrets.',
  },
  {
    type: 'INDEMNIFICATION',
    keywords: ['indemnify', 'indemnification', 'hold harmless', 'defend, indemnify', 'unlimited liability'],
    riskLevel: 'CRITICAL',
    title: 'Unilateral Indemnification & Liability Transfer',
    plainSummary: 'Forces you to pay all legal fees, damages, and claims incurred by the other party if any dispute or lawsuit arises.',
    trapExplanation: 'Uncapped unilateral indemnity can bankrupt a freelancer or small business for third-party claims beyond their direct control.',
    counterProposal: 'Make indemnification mutual, cap total indemnity exposure strictly to the total fees paid under the contract, and exclude indirect or consequential damages.',
  },
  {
    type: 'ARBITRATION_WAIVER',
    keywords: ['arbitration', 'jury trial waiver', 'class action waiver', 'jams', 'binding arbitration'],
    riskLevel: 'CAUTION',
    title: 'Mandatory Binding Arbitration & Class Action Waiver',
    plainSummary: 'You give up your constitutional right to take disputes to a public court before a jury, and waive the right to join collective class actions.',
    trapExplanation: 'Private arbitration is costly, limits discovery evidence, and keeps company misconduct confidential.',
    counterProposal: 'Retain the right to resolve small claims disputes in local Small Claims Court, and require the company to pay all arbitration filing and hearing fees.',
  },
  {
    type: 'AUTO_RENEWAL',
    keywords: ['automatic renewal', 'automatically renew', 'successive terms', 'notice of intent not to renew'],
    riskLevel: 'CAUTION',
    title: 'Automatic Renewal Trap',
    plainSummary: 'Your subscription or contract will automatically renew for another full period and charge you unless you cancel within a narrow prior window.',
    trapExplanation: 'If you miss the 60-day or 30-day notice deadline, you are trapped into paying for another full year with no refund right.',
    counterProposal: 'Require written notice reminder from the vendor 30 days prior to renewal, allow monthly flexibility, or permit cancellation with 30 days pro-rated notice.',
  },
  {
    type: 'SECURITY_DEPOSIT',
    keywords: ['security deposit', 'non-refundable fee', 'turnover fee', 'sole and unappealable discretion', 'ninety (90) days'],
    riskLevel: 'CRITICAL',
    title: 'Security Deposit & Excessive Deductions',
    plainSummary: 'Outlines deductions from your deposit, inspection procedures, and refund timelines.',
    trapExplanation: 'Mandatory non-refundable cleaning fees and 90-day return windows often violate state tenant protection laws (many states mandate deposit return within 14 to 30 days with itemized receipts).',
    counterProposal: 'Demand compliance with statutory return deadlines (21-30 days), remove non-refundable cleaning fees, and require itemized contractor receipts before deductions.',
  },
  {
    type: 'RIGHT_OF_ENTRY',
    keywords: ['right of entry', 'enter the leased premises', 'with or without prior notice', 'waives any statutory requirement'],
    riskLevel: 'CRITICAL',
    title: 'Unannounced Entry & Loss of Privacy',
    plainSummary: 'Allows the landlord or third parties to enter your private home at will without advance warning.',
    trapExplanation: 'Waiving 24-hour advance notice breaches statutory quiet enjoyment. Landlords could enter unexpectedly between 8 AM and 8 PM.',
    counterProposal: 'Re-insert mandatory 24-hour advance written notice requirement except in bona fide immediate emergencies (e.g. fire or active water flooding).',
  },
  {
    type: 'LATE_CHARGES',
    keywords: ['late charges', 'escalating late', 'liquidated fee of $', 'per day until payment'],
    riskLevel: 'CAUTION',
    title: 'Escalating Penalties & Compounding Late Fees',
    plainSummary: 'Imposes immediate and compounding daily fines if payment is even a few hours delayed.',
    trapExplanation: 'Daily penalty fees can quickly balloon into hundreds of dollars. Many jurisdictions cap late fees at 5% of monthly rent.',
    counterProposal: 'Request a standard 5-day grace period before any late fee applies, and cap late fee to a flat 5% or $50 maximum with no daily compounding.',
  },
  {
    type: 'PAYMENT_TERMS',
    keywords: ['net-90', 'net-60', 'undisputed invoice', 'unlimited revisions', 'subjective satisfaction'],
    riskLevel: 'CAUTION',
    title: 'Delayed Payment (Net-90) & Scope Creep',
    plainSummary: 'Forces the contractor to wait 90 days after delivery before receiving payment, while allowing unlimited client revisions.',
    trapExplanation: 'Net-90 delays create severe cash flow strain for independent contractors. "Subjective satisfaction" allows clients to withhold payment indefinitely.',
    counterProposal: 'Change payment terms to Net-15 or Net-30, limit revisions to two rounds, and define objective acceptance criteria.',
  },
  {
    type: 'AI_DATA_TRAINING',
    keywords: ['training', 'artificial intelligence', 'machine learning models', 'ingest, process, synthesize', 'customer data'],
    riskLevel: 'CAUTION',
    title: 'Customer Data Use for AI Model Training',
    plainSummary: 'Vendor claims broad rights to feed your proprietary business data, code, or personal inputs into their commercial AI training sets.',
    trapExplanation: 'Confidential business data or personal workflows may leak into publicly accessible generative models or competitor outputs.',
    counterProposal: 'Add an explicit opt-out stating customer data shall not be used for model training or retained beyond service execution.',
  },
  {
    type: 'EARLY_TERMINATION',
    keywords: ['early termination', 'liquidated damages', 'three (3) months', 'duty to mitigate'],
    riskLevel: 'CRITICAL',
    title: 'Draconian Early Termination & Break Fees',
    plainSummary: 'Prevents you from terminating early without paying thousands in penalties, and waives the other party\'s legal duty to mitigate damages.',
    trapExplanation: 'Waiving the landlord\'s duty to find a replacement tenant means you could be on the hook for rent for the entire lease term.',
    counterProposal: 'Establish an early termination fee capped at 1-2 months\' rent with mandatory duty to mitigate and re-list unit promptly.',
  },
];

// Helper to segment raw legal text into logical clauses
export function segmentDocumentIntoClauses(rawText) {
  if (!rawText || rawText.trim().length === 0) return [];

  // Match common headings: SECTION X, ARTICLE X, PARAGRAPH X, CLAUSE X, 1., 2., etc.
  const regex = /(?:^|\n\n+)(SECTION\s+\d+[^.\n]*|ARTICLE\s+\d+[^.\n]*|PARAGRAPH\s+\d+[^.\n]*|\d+\.\s+[A-Z\s]{4,}|[A-Z\s]{5,}:?)(?:\.|\n|\s{2,})/gi;

  const rawClauses = [];
  const lines = rawText.split('\n');
  let currentHeader = 'Preamble / General Provisions';
  let currentContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeader = /^(SECTION\s+\d+|ARTICLE\s+\d+|PARAGRAPH\s+\d+|\d+\.\s+[A-Z\s]{3,}|[A-Z\s]{4,}:?$)/i.test(line.trim());

    if (isHeader) {
      if (currentContent.join('').trim().length > 0) {
        rawClauses.push({
          heading: currentHeader.trim(),
          text: currentContent.join('\n').trim(),
        });
      }
      currentHeader = line.trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.join('').trim().length > 0) {
    rawClauses.push({
      heading: currentHeader.trim(),
      text: currentContent.join('\n').trim(),
    });
  }

  // If segmentation yielded too few, fallback to double-newline paragraphs
  if (rawClauses.length <= 1) {
    const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 30);
    return paragraphs.map((p, idx) => ({
      heading: `Clause ${idx + 1}`,
      text: p.trim(),
    }));
  }

  return rawClauses;
}

// Extract obligations, dates, deadlines, and dollar figures
export function extractKeyObligations(text) {
  const obligations = [];

  // Dollar figures
  const dollarMatches = text.match(/\$\s?[\d,]+(?:\.\d{2})?/g);
  if (dollarMatches) {
    dollarMatches.forEach(amt => {
      obligations.push({
        type: 'FINANCIAL',
        label: `Payment / Financial Exposure: ${amt}`,
        icon: 'dollar-sign',
        urgency: 'high',
      });
    });
  }

  // Days / Deadlines
  const dayMatches = text.match(/\b(?:\d+|two|three|five|ten|fifteen|thirty|sixty|ninety)\s+(?:\(\d+\)\s+)?(?:business\s+|calendar\s+)?(?:days|months|hours|years)\b/gi);
  if (dayMatches) {
    const uniqueDays = Array.from(new Set(dayMatches)).slice(0, 5);
    uniqueDays.forEach(period => {
      obligations.push({
        type: 'DEADLINE',
        label: `Notice / Timeline Window: ${period}`,
        icon: 'clock',
        urgency: 'medium',
      });
    });
  }

  // Prohibitions & Affirmative covenants
  if (/shall not|covenants not to|must not|prohibited/i.test(text)) {
    obligations.push({
      type: 'PROHIBITION',
      label: 'Strict Negative Covenant / Activity Restriction',
      icon: 'slash',
      urgency: 'high',
    });
  }

  return obligations;
}

// Generate plain-English clause breakdown
export function analyzeClause(heading, clauseText, index) {
  const lowerText = (heading + ' ' + clauseText).toLowerCase();
  let matchedPattern = null;

  for (const pattern of CLAUSE_PATTERNS) {
    const hasMatch = pattern.keywords.some(kw => lowerText.includes(kw));
    if (hasMatch) {
      matchedPattern = pattern;
      break;
    }
  }

  let riskLevel = 'FAIR';
  let title = heading || `Clause ${index + 1}`;
  let plainSummary = '';
  let trapExplanation = '';
  let counterProposal = '';

  if (matchedPattern) {
    riskLevel = matchedPattern.riskLevel;
    title = `${heading} (${matchedPattern.title})`;
    plainSummary = matchedPattern.plainSummary;
    trapExplanation = matchedPattern.trapExplanation;
    counterProposal = matchedPattern.counterProposal;
  } else {
    // Generate intelligent heuristic summary for generic clauses
    if (lowerText.includes('govern') || lowerText.includes('jurisdiction') || lowerText.includes('venue')) {
      riskLevel = 'FAIR';
      title = heading || 'Governing Law & Jurisdiction';
      plainSummary = 'Specifies which state or country\'s legal system will interpret this contract and where any court proceedings will take place.';
      trapExplanation = 'If the designated state is far away from your physical residence, litigating there could be expensive and inconvenient.';
      counterProposal = 'Select your local home jurisdiction or mutual state.';
    } else if (lowerText.includes('severab') || lowerText.includes('entire agreement')) {
      riskLevel = 'FAIR';
      title = heading || 'Standard Boilerplate Provisions';
      plainSummary = 'Confirms this written document is the complete agreement, replacing any prior verbal promises. If one clause is declared invalid, the rest remains active.';
      trapExplanation = 'Ensure any oral assurances made during negotiation are explicitly written into this document, or they will be legally void.';
      counterProposal = 'Add any verbal commitments made by the other party as formal written exhibits.';
    } else {
      riskLevel = lowerText.includes('shall') || lowerText.includes('must') ? 'CAUTION' : 'FAIR';
      title = heading || `Section ${index + 1}`;
      plainSummary = `Outlines the parties' procedural requirements regarding ${heading.toLowerCase()}. Both parties must adhere to the defined timeline and documentation rules.`;
      trapExplanation = 'Verify that all obligations are reciprocal rather than one-sided.';
      counterProposal = 'Ensure obligations are balanced with standard reciprocal notice periods.';
    }
  }

  const readabilityOriginal = analyzeReadability(clauseText);
  const readabilityPlain = analyzeReadability(plainSummary);

  return {
    id: `clause-${index + 1}`,
    heading,
    title,
    type: matchedPattern ? matchedPattern.type : 'GENERAL',
    originalText: clauseText,
    plainSummary,
    riskLevel, // 'CRITICAL' | 'CAUTION' | 'FAIR'
    trapExplanation,
    counterProposal,
    readabilityOriginal,
    readabilityPlain,
    keyObligations: extractKeyObligations(clauseText),
  };
}

// Main document analysis routine
export function analyzeDocumentOffline(rawText, title = 'Legal Document') {
  const clausesRaw = segmentDocumentIntoClauses(rawText);
  const clauses = clausesRaw.map((c, i) => analyzeClause(c.heading, c.text, i));

  // Risk Score calculation
  let criticalCount = 0;
  let cautionCount = 0;
  let fairCount = 0;

  clauses.forEach(c => {
    if (c.riskLevel === 'CRITICAL') criticalCount++;
    else if (c.riskLevel === 'CAUTION') cautionCount++;
    else fairCount++;
  });

  // Calculate score (0 = completely safe, 100 = heavily hazardous)
  let rawScore = criticalCount * 26 + cautionCount * 12;
  const overallRiskScore = Math.min(100, Math.max(10, rawScore));

  let riskCategory = 'Fair & Standard';
  let riskBadgeColor = 'emerald';
  if (overallRiskScore >= 65) {
    riskCategory = 'High Risk / Asymmetric Exposure';
    riskBadgeColor = 'crimson';
  } else if (overallRiskScore >= 35) {
    riskCategory = 'Moderate Risk / Cautious Review Advised';
    riskBadgeColor = 'amber';
  }

  const overallReadabilityOriginal = analyzeReadability(rawText);
  const combinedPlain = clauses.map(c => c.plainSummary).join(' ');
  const overallReadabilityPlain = analyzeReadability(combinedPlain);

  // Compile prioritized actionable checklist
  const actionableChecklist = [
    {
      id: 'chk-1',
      task: 'Verify state and local statutory protections against identified penalty clauses',
      priority: 'HIGH',
      completed: false,
    },
    {
      id: 'chk-2',
      task: 'Mark proposed counter-language for any clause flagged with Critical Risk',
      priority: criticalCount > 0 ? 'HIGH' : 'MEDIUM',
      completed: false,
    },
    {
      id: 'chk-3',
      task: 'Calendar all hard notice deadlines and automatic renewal cancellation windows',
      priority: 'HIGH',
      completed: false,
    },
    {
      id: 'chk-4',
      task: 'Review intellectual property carve-outs to safeguard your personal side projects',
      priority: 'MEDIUM',
      completed: false,
    },
    {
      id: 'chk-5',
      task: 'Export Lawyer Consultation Dossier to review high-impact ambiguities with counsel',
      priority: 'HIGH',
      completed: false,
    },
  ];

  // Top Red Flags
  const redFlags = clauses
    .filter(c => c.riskLevel === 'CRITICAL' || c.riskLevel === 'CAUTION')
    .map(c => ({
      heading: c.heading,
      riskLevel: c.riskLevel,
      trap: c.trapExplanation,
      counter: c.counterProposal,
    }));

  return {
    title,
    overallRiskScore,
    riskCategory,
    riskBadgeColor,
    criticalCount,
    cautionCount,
    fairCount,
    totalClauses: clauses.length,
    clauses,
    redFlags,
    overallReadabilityOriginal,
    overallReadabilityPlain,
    actionableChecklist,
  };
}
