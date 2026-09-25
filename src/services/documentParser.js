/**
 * @fileoverview ClauseGuard Comprehensive Document Parser & Extraction Engine
 * Ingests TXT, Markdown, DOCX (via mammoth), and PDF text in-memory.
 * Extracts structured metadata, key facts, parties, obligations, deadlines, and review areas.
 * @module documentParser
 */

import mammoth from 'mammoth';
import { CALIBRATED_LABELS, calibrateLanguage } from './legalSafety';
import { analyzeReadability } from './readabilityService';

/** Maximum allowed file size in bytes (10 MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Supported document MIME types and extensions */
export const SUPPORTED_FILE_EXTENSIONS = ['.txt', '.md', '.text', '.docx', '.pdf'];

/**
 * Validates an uploaded file for security, extension, and size limits.
 * @param {File} file - Browser File object
 * @returns {{ valid: boolean, error: string|null, sanitizedName: string }}
 */
export function validateDocumentFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided.', sanitizedName: '' };
  }

  // Safe filename handling (prevent path traversal / control characters)
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
      sanitizedName,
    };
  }

  const extension = '.' + sanitizedName.split('.').pop().toLowerCase();
  if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type (${extension}). Please upload a PDF, DOCX, TXT, or Markdown document.`,
      sanitizedName,
    };
  }

  return { valid: true, error: null, sanitizedName };
}

/**
 * Extracts raw plain text from ArrayBuffer of a PDF file using stream decoding.
 * Handles standard text-encoded PDF files in-browser without large external binaries.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {string} Extracted text content
 */
export function extractTextFromPdfArrayBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  // Chunk reading to prevent call-stack overflow on large arrays
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }

  // Look for text streams enclosed in BT (Begin Text) ... ET (End Text) or Tj/TJ tokens
  const textMatches = [];
  const textStreamRegex = /\(([^)]+)\)\s*Tj/g;
  let match;
  while ((match = textStreamRegex.exec(binary)) !== null) {
    textMatches.push(match[1]);
  }

  // Also extract text inside array TJ operators [(Text) 10 (More)] TJ
  const arrayTjRegex = /\[([^\]]+)\]\s*TJ/g;
  while ((match = arrayTjRegex.exec(binary)) !== null) {
    const inner = match[1];
    const subMatches = inner.match(/\(([^)]+)\)/g);
    if (subMatches) {
      subMatches.forEach(m => textMatches.push(m.slice(1, -1)));
    }
  }

  if (textMatches.length > 0) {
    return textMatches.join(' ').replace(/\\r|\\n/g, '\n').replace(/\\([()\\])/g, '$1');
  }

  // Fallback: extract legible ASCII strings from stream objects
  const asciiStrings = binary.match(/[\x20-\x7E\r\n\t]{4,}/g) || [];
  const filtered = asciiStrings.filter(s =>
    !s.startsWith('/Font') && !s.startsWith('/Filter') && !s.startsWith('/ProcSet') && s.length > 20
  );

  return filtered.join('\n\n');
}

/**
 * Asynchronously parses a File object into plain text and document metadata.
 * @param {File} file - Uploaded File
 * @returns {Promise<{ rawText: string, metadata: Object }>}
 */
export async function parseDocumentFile(file) {
  const validation = validateDocumentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const extension = '.' + validation.sanitizedName.split('.').pop().toLowerCase();
  let rawText = '';

  if (extension === '.docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    rawText = result.value || '';
  } else if (extension === '.pdf') {
    const arrayBuffer = await file.arrayBuffer();
    rawText = extractTextFromPdfArrayBuffer(arrayBuffer);
    if (!rawText || rawText.trim().length < 20) {
      throw new Error(
        "We couldn't extract readable text from this PDF. It may be a scanned or image-only PDF. Try uploading a text-based PDF, DOCX, or TXT file."
      );
    }
  } else {
    // TXT, Markdown, Text
    rawText = await file.text();
  }

  if (!rawText || rawText.trim().length === 0) {
    throw new Error('The uploaded document is empty. Please provide a document containing text.');
  }

  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 400));

  const metadata = {
    filename: validation.sanitizedName,
    documentType: extension.slice(1).toUpperCase(),
    sizeBytes: file.size,
    characterCount: rawText.length,
    wordCount,
    estimatedPages,
    uploadedAt: new Date().toISOString(),
  };

  return { rawText, metadata };
}

/**
 * Extracts Key Facts from legal text (parties, agreement type, governing law, etc.)
 * Strictly grounds extraction on document text without hallucinations.
 * @param {string} text - Raw document text
 * @returns {Object} Extracted key facts
 */
export function extractKeyFacts(text) {
  const lower = text.toLowerCase();

  // 1. Agreement Type
  let agreementType = 'General Agreement';
  if (/residential lease|lease agreement|tenancy agreement|rental agreement/i.test(text)) {
    agreementType = 'Residential Lease Agreement';
  } else if (/employment agreement|employment contract|offer of employment/i.test(text)) {
    agreementType = 'Employment Agreement';
  } else if (/master services agreement|independent contractor agreement|freelance agreement|consulting agreement/i.test(text)) {
    agreementType = 'Independent Contractor / Services Agreement';
  } else if (/non-disclosure agreement|confidentiality agreement|\bnda\b/i.test(text)) {
    agreementType = 'Non-Disclosure Agreement (NDA)';
  } else if (/software as a service|terms of service|terms and conditions|saas agreement/i.test(text)) {
    agreementType = 'SaaS Subscription & Terms of Service';
  }

  // 2. Parties
  const parties = [];
  const partyPatterns = [
    /(?:by and between|between)\s+([^,;\n]+?)(?:,|\s+and\s+)(?:and\s+)?([^,;\n]+?)(?:\.|\n|dated)/i,
    /Landlord:\s*([^\n]+)/i,
    /Tenant:\s*([^\n]+)/i,
    /Employer:\s*([^\n]+)/i,
    /Employee:\s*([^\n]+)/i,
    /Client:\s*([^\n]+)/i,
    /Contractor:\s*([^\n]+)/i,
  ];

  for (const regex of partyPatterns) {
    const match = text.match(regex);
    if (match) {
      if (match[2]) {
        parties.push(match[1].trim());
        parties.push(match[2].trim());
        break;
      } else if (match[1]) {
        parties.push(match[1].trim());
      }
    }
  }

  // 3. Effective / Commencement Date
  let effectiveDate = 'Not explicitly stated in preamble';
  const dateMatch = text.match(/(?:effective as of|dated as of|entered into as of|commencing on|dated)\s+([A-Z][a-z]+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (dateMatch) {
    effectiveDate = dateMatch[1].trim();
  }

  // 4. Term / Duration
  let term = 'Ongoing / Specified in sections';
  const termMatch = text.match(/(?:term of|period of)\s+(\d+\s+(?:months|years|days)|one \(\d+\) year|twelve \(\d+\) months|at-will)/i);
  if (termMatch) {
    term = termMatch[1].trim();
  }

  // 5. Renewal Provisions
  let renewal = 'No automatic renewal detected';
  if (/automatic(?:ally)? renew|successive terms|subsequent terms/i.test(text)) {
    const renewMatch = text.match(/(?:automatically renew[^.\n]*|renew[^.\n]*notice[^.\n]*)/i);
    renewal = renewMatch ? renewMatch[0].trim() : 'Automatic renewal active upon expiration of term';
  }

  // 6. Governing Law & Jurisdiction
  let governingLaw = 'Not explicitly specified';
  const govLawMatch = text.match(/(?:laws of the (?:state|commonwealth) of|laws of )\s*([A-Z][a-z]+)/i) ||
    text.match(/(?:governed by and construed in accordance with the laws of the state of|governed by the laws of the state of)\s+([A-Z][a-z]+)/i);
  if (govLawMatch) {
    governingLaw = govLawMatch[1].trim();
  }

  // 7. Payment Terms & Currency Amounts
  let paymentTerms = 'Subject to milestones / invoices';
  const payMatch = text.match(/(?:monthly rent of|rent of|rent shall be|salary of|fee of|compensation of|payment within)\s+(\$?\s?[\d,]+(?:\.\d{2})?(?:[^\n,;.]*)?)/i);
  if (payMatch) {
    paymentTerms = payMatch[1].trim();
  }

  // 8. Termination Notice Window
  let terminationNotice = 'Standard written notice required';
  const noticeMatch = text.match(/((?:\d+|sixty|thirty|ninety)(?:\s*\(\d+\))?\s+(?:calendar\s+|business\s+)?days['’]?\s+(?:prior\s+)?written notice)/i);
  if (noticeMatch) {
    terminationNotice = noticeMatch[1].trim();
  }

  return {
    agreementType,
    parties: parties.length > 0 ? parties.slice(0, 4) : ['Parties not identified in preamble'],
    effectiveDate,
    term,
    renewal,
    governingLaw,
    paymentTerms,
    terminationNotice,
  };
}

/**
 * Extracts and categorizes obligations into "Your Obligations" vs "Other Party's Obligations"
 * @param {string} text - Raw document text
 * @param {string} agreementType - Identified agreement category
 * @returns {{ yourObligations: Array<Object>, otherPartyObligations: Array<Object> }}
 */
export function extractStructuredObligations(text, agreementType) {
  const yourObligations = [];
  const otherPartyObligations = [];

  const lines = text.split('\n');
  let currentSection = 'General Obligations';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect section headers
    if (/^(SECTION|ARTICLE|PARAGRAPH|\d+\.)/i.test(trimmed)) {
      currentSection = trimmed.slice(0, 60);
      continue;
    }

    // Tenant / Employee / Contractor / Customer obligations (Your obligations)
    if (/\b(?:tenant shall|employee covenants|employee agrees|contractor shall|contractor must|customer shall|customer will|you agree to|you shall)\b/i.test(trimmed)) {
      const deadline = trimmed.match(/\b(?:\d+|two|three|five|ten|thirty|sixty|ninety)\s+(?:days|months|hours)\b/i);
      yourObligations.push({
        obligation: trimmed.slice(0, 240),
        responsibleParty: 'You (Tenant / Employee / Contractor)',
        deadline: deadline ? deadline[0] : 'Per agreement schedule',
        source: currentSection,
      });
    }

    // Landlord / Company / Client obligations (Other party's obligations)
    if (/\b(?:landlord shall|landlord will|company shall|company will|client shall|client agrees|provider shall)\b/i.test(trimmed)) {
      const deadline = trimmed.match(/\b(?:\d+|two|three|five|ten|thirty|sixty|ninety)\s+(?:days|months|hours)\b/i);
      otherPartyObligations.push({
        obligation: trimmed.slice(0, 240),
        responsibleParty: 'Other Party (Landlord / Company / Client)',
        deadline: deadline ? deadline[0] : 'Per agreement schedule',
        source: currentSection,
      });
    }
  }

  return {
    yourObligations: yourObligations.slice(0, 8),
    otherPartyObligations: otherPartyObligations.slice(0, 8),
  };
}

/**
 * Extracts explicit dates, deadlines, and time periods from the document.
 * @param {string} text
 * @returns {Array<Object>} List of dates and deadlines
 */
export function extractDatesAndDeadlines(text) {
  const deadlines = [];

  // Hard calendar dates (e.g. October 1, 2025, September 30, 2026, 12/01/2026)
  const calendarDateMatches = text.matchAll(/(?:as of|commencing on|expiring on|on or before|by|effective|dated as of)\s+([A-Z][a-z]+ \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{4})/gi);
  for (const m of calendarDateMatches) {
    deadlines.push({
      type: 'CALENDAR_DATE',
      label: m[0].trim(),
      dateString: m[1].trim(),
      category: 'Fixed Date',
      sourceSnippet: m.input ? m.input.slice(Math.max(0, m.index - 30), Math.min(m.input.length, m.index + 80)).trim() : '',
    });
  }

  // Periodic notice windows (e.g. sixty (60) days prior to lease expiration, 30 days written notice)
  const windowMatches = text.matchAll(/((?:\d+|one|two|three|five|ten|thirty|sixty|ninety)(?:\s*\(\d+\))?\s+(?:calendar\s+|business\s+)?(?:days|months|hours))\s+(?:prior to|written notice|grace period|to cure|to terminate)/gi);
  for (const w of windowMatches) {
    deadlines.push({
      type: 'NOTICE_WINDOW',
      label: w[0].trim(),
      dateString: w[1].trim(),
      category: 'Notice / Cure Window',
      sourceSnippet: w.input ? w.input.slice(Math.max(0, w.index - 30), Math.min(w.input.length, w.index + 80)).trim() : '',
    });
  }

  // De-duplicate by label
  const unique = [];
  const seen = new Set();
  for (const d of deadlines) {
    if (!seen.has(d.label)) {
      seen.add(d.label);
      unique.push(d);
    }
  }

  return unique.slice(0, 10);
}

/**
 * Segments raw text into structured clauses and assigns calibrated review signals.
 * @param {string} rawText
 * @returns {Array<Object>} Processed clauses
 */
export function parseDocumentClauses(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split('\n');
  const clauses = [];
  let currentHeader = 'Preamble / General Terms';
  let currentContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeader = /^(SECTION\s+\d+|ARTICLE\s+\d+|PARAGRAPH\s+\d+|\d+\.\s+[A-Z\s]{3,}|[A-Z\s]{4,}:?$)/i.test(line.trim());

    if (isHeader) {
      if (currentContent.join('').trim().length > 0) {
        clauses.push({
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
    clauses.push({
      heading: currentHeader.trim(),
      text: currentContent.join('\n').trim(),
    });
  }

  // Fallback if no explicit headers found
  if (clauses.length <= 1) {
    const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim().length > 30);
    return paragraphs.map((p, idx) => analyzeClauseStructure(`Clause ${idx + 1}`, p.trim(), idx));
  }

  return clauses.map((c, idx) => analyzeClauseStructure(c.heading, c.text, idx));
}

/**
 * Analyzes an individual clause for plain English translation, importance, and review signals.
 * Follows calibrated language guidelines.
 * @param {string} heading
 * @param {string} text
 * @param {number} index
 * @returns {Object} Structured clause representation
 */
export function analyzeClauseStructure(heading, text, index) {
  const lower = (heading + ' ' + text).toLowerCase();

  let reviewSignal = CALIBRATED_LABELS.STANDARD_TERM;
  let clauseCategory = 'General Provision';
  let plainEnglish = '';
  let whyItMatters = '';
  let whatToCheck = 'Verify that the terms match verbal representations.';

  if (lower.includes('non-compete') || lower.includes('non-competition') || lower.includes('competing entity')) {
    reviewSignal = CALIBRATED_LABELS.HIGH_ATTENTION;
    clauseCategory = 'Restrictive Covenant (Non-Compete)';
    plainEnglish =
      'This clause restricts your ability to work for competing businesses or start a related company after leaving.';
    whyItMatters =
      'Broad geographical or multi-year duration restrictions can limit professional mobility and career opportunities.';
    whatToCheck =
      'Check whether the duration is capped (e.g. 6 months), if geographic boundaries are reasonable, and whether state law restricts non-competes.';
  } else if (lower.includes('intellectual property') || lower.includes('inventions assignment') || lower.includes('work-for-hire')) {
    reviewSignal = CALIBRATED_LABELS.HIGH_ATTENTION;
    clauseCategory = 'Intellectual Property Assignment';
    plainEnglish =
      'Assigns ownership of your creations, designs, software, or inventions to the other party.';
    whyItMatters =
      'Broad language might attempt to claim rights over personal projects created outside working hours or on personal devices.';
    whatToCheck =
      'Confirm there is a clear carve-out for pre-existing inventions and off-hours personal side projects.';
  } else if (lower.includes('indemnif') || lower.includes('hold harmless')) {
    reviewSignal = CALIBRATED_LABELS.HIGH_ATTENTION;
    clauseCategory = 'Indemnification & Liability Allocation';
    plainEnglish =
      'Requires one party to reimburse or defend the other for legal claims, damages, or attorney fees arising from the contract.';
    whyItMatters =
      'Unilateral (one-sided) or uncapped indemnity can shift severe financial liabilities onto an individual or small contractor.';
    whatToCheck =
      'Ensure indemnification is mutual and liability exposure is capped at the contract value.';
  } else if (lower.includes('arbitration') || lower.includes('jury waiver') || lower.includes('class action waiver')) {
    reviewSignal = CALIBRATED_LABELS.MODERATE_ATTENTION;
    clauseCategory = 'Dispute Resolution & Arbitration';
    plainEnglish =
      'Disputes will be decided by a private arbitrator rather than in a public court before a jury.';
    whyItMatters =
      'Private arbitration may involve split filing costs and waives your option to participate in class actions.';
    whatToCheck =
      'Verify whether small claims court disputes are exempted and who covers arbitration filing fees.';
  } else if (lower.includes('automatic renewal') || lower.includes('automatically renew')) {
    reviewSignal = CALIBRATED_LABELS.MODERATE_ATTENTION;
    clauseCategory = 'Automatic Renewal';
    plainEnglish =
      'The contract will automatically renew for another term unless you provide written cancellation notice in advance.';
    whyItMatters =
      'Missing the required notice deadline can lock you into payment for another full contract cycle.';
    whatToCheck =
      'Note the exact calendar deadline required to give notice of non-renewal (e.g. 30 or 60 days before expiration).';
  } else if (lower.includes('security deposit') || lower.includes('non-refundable')) {
    reviewSignal = CALIBRATED_LABELS.HIGH_ATTENTION;
    clauseCategory = 'Deposit & Deductions';
    plainEnglish =
      'Details how deposit funds are retained, inspection conditions, and deduction authorizations.';
    whyItMatters =
      'Mandatory non-refundable turnover fees or extended return deadlines may conflict with statutory tenant protections.';
    whatToCheck =
      'Compare deposit return timelines against local state laws (typically 14 to 30 days) and require itemized receipts.';
  } else if (lower.includes('right of entry') || lower.includes('with or without prior notice')) {
    reviewSignal = CALIBRATED_LABELS.HIGH_ATTENTION;
    clauseCategory = 'Right of Entry & Privacy';
    plainEnglish =
      'Specifies when the landlord or company representatives may enter the leased premises.';
    whyItMatters =
      'Entering without advance written notice may breach your statutory quiet enjoyment rights.';
    whatToCheck =
      'Confirm a mandatory 24-hour advance written notice requirement except in bona fide emergencies.';
  } else if (lower.includes('early termination') || lower.includes('liquidated damages')) {
    reviewSignal = CALIBRATED_LABELS.HIGH_ATTENTION;
    clauseCategory = 'Early Termination Penalties';
    plainEnglish =
      'Outlines fees and obligations if either party terminates the agreement prior to the scheduled expiration.';
    whyItMatters =
      'Multi-month penalty fees and waivers of the duty to mitigate damages can result in heavy unexpected expenses.';
    whatToCheck =
      'Request reasonable early release fees capped at 1-2 months with a mutual duty to mitigate.';
  } else {
    plainEnglish = `Outlines procedural obligations regarding ${heading.toLowerCase()}.`;
    whyItMatters = 'Defines mutual operational expectations between the contracting parties.';
    whatToCheck = 'Ensure the expectations and notice periods are reciprocal.';
  }

  const readabilityOriginal = analyzeReadability(text);

  return {
    id: `clause-${index + 1}`,
    heading,
    clauseCategory,
    originalText: text,
    plainEnglish: calibrateLanguage(plainEnglish),
    whyItMatters: calibrateLanguage(whyItMatters),
    whatToCheck: calibrateLanguage(whatToCheck),
    reviewSignal,
    readability: readabilityOriginal,
    sourceLocation: {
      section: heading,
      clauseIndex: index + 1,
      estimatedPage: Math.max(1, Math.ceil((index + 1) / 3)),
    },
  };
}

/**
 * Master parser entry point: transforms raw text into the complete ClauseGuard Document Model.
 * @param {string} rawText
 * @param {Object} [metadata={}]
 * @returns {Object} Complete structured document model
 */
export function processDocument(rawText, metadata = {}) {
  const clauses = parseDocumentClauses(rawText);
  const keyFacts = extractKeyFacts(rawText);
  const obligations = extractStructuredObligations(rawText, keyFacts.agreementType);
  const datesAndDeadlines = extractDatesAndDeadlines(rawText);
  const readability = analyzeReadability(rawText);

  // Group review areas
  const reviewAreas = clauses.filter(
    c => c.reviewSignal.severity === 'attention' || c.reviewSignal.severity === 'review' || c.reviewSignal.severity === 'ambiguous'
  );

  // Generate grounded executive summary
  const executiveSummary =
    `This document is identified as a ${keyFacts.agreementType} between ${keyFacts.parties.join(' and ')}. ` +
    `It contains ${clauses.length} structured clauses with an estimated length of ${metadata.estimatedPages || 1} page(s). ` +
    `Our analysis identified ${reviewAreas.length} specific review area(s) warranting closer attention prior to signing, ` +
    `notably regarding ${reviewAreas.slice(0, 3).map(r => r.clauseCategory).join(', ') || 'general operating obligations'}.`;

  return {
    metadata: {
      ...metadata,
      parsedAt: new Date().toISOString(),
    },
    rawText,
    executiveSummary,
    keyFacts,
    clauses,
    obligations,
    datesAndDeadlines,
    reviewAreas,
    readability,
    totalClauses: clauses.length,
    reviewAreaCount: reviewAreas.length,
  };
}
