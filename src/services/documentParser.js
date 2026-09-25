import mammoth from 'mammoth';
import { analyzeReadability } from './readabilityService';
import { CALIBRATED_LABELS, calibrateLanguage, safeExcerpt } from './legalSafety';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_FILE_EXTENSIONS = ['.txt', '.md', '.text', '.docx', '.pdf'];
export const MAX_EXTRACTED_CHARACTERS = 4_000_000;

const PAGE_MARKER_PATTERN = /(?:^|\n)\s*(?:---\s*Page\s+(\d+)\s*---|\[Page\s+(\d+)\])\s*(?=\n|$)/gi;
const HEADING_PATTERN = /^(?:SECTION|ARTICLE|PARAGRAPH|CLAUSE)\s+[0-9IVXLC]+[^\n]*$/i;
const NUMBERED_HEADING_PATTERN = /^\d+(?:\.\d+)*[.)]?\s+[A-Z][A-Z\s&/,'-]{3,}$/;
const ROLE_PATTERNS = [
  { role: 'Tenant', pattern: /\btenant\b/i },
  { role: 'Landlord', pattern: /\blandlord\b/i },
  { role: 'Employee', pattern: /\bemployee\b/i },
  { role: 'Employer', pattern: /\b(?:company|employer)\b/i },
  { role: 'Contractor', pattern: /\bcontractor\b/i },
  { role: 'Client', pattern: /\bclient\b/i },
  { role: 'Party A', pattern: /\bparty a\b/i },
  { role: 'Party B', pattern: /\bparty b\b/i },
];

const CLAUSE_RULES = [
  {
    category: 'Termination and early exit',
    patterns: [/termination/i, /terminate/i, /cancel(?:lation)?/i, /surrender/i],
    signal: 'attention',
    plain: 'This section explains when or how the agreement may end and what happens afterward.',
    why: 'Termination timing and conditions can affect planning, notice, and any remaining payments or duties.',
    check: 'Confirm the permitted termination events, notice period, delivery method, and any stated consequences.',
  },
  {
    category: 'Renewal',
    patterns: [/automatic(?:ally)? renew/i, /successive term/i, /non-renewal/i, /renewal/i],
    signal: 'review',
    plain: 'This section addresses renewal and the notice needed to prevent a later term.',
    why: 'A renewal window can affect whether the agreement continues automatically.',
    check: 'Record the renewal date, non-renewal deadline, and the required delivery method.',
  },
  {
    category: 'Payment and late fees',
    patterns: [/payment/i, /\brent\b/i, /\bsalary\b/i, /\bcompensation\b/i, /late fee/i, /invoice/i],
    signal: 'review',
    plain: 'This section sets out money owed, when it is due, or what happens after a late payment.',
    why: 'Payment amounts and timing should be easy to verify against the rest of the document.',
    check: 'Check the amount, due date, permitted deductions, and the stated late-payment consequence.',
  },
  {
    category: 'Notice',
    patterns: [/notice/i, /notify/i, /notification/i],
    signal: 'review',
    plain: 'This section describes when and how a party must give notice.',
    why: 'Notice requirements often determine whether a deadline or change is effective.',
    check: 'Confirm the required form, recipient, address or channel, and counting period.',
  },
  {
    category: 'Access and privacy',
    patterns: [/right of entry/i, /enter the premises/i, /inspection/i, /access to/i],
    signal: 'review',
    plain: 'This section describes access to a home, workplace, or other property.',
    why: 'Access rules can affect privacy, scheduling, and emergency exceptions.',
    check: 'Compare the notice period, permitted purposes, and emergency exception with what you expect.',
  },
  {
    category: 'Confidentiality',
    patterns: [/confidential/i, /non-disclosure/i, /trade secret/i],
    signal: 'review',
    plain: 'This section limits how non-public information may be used or shared.',
    why: 'The duration, permitted disclosures, and exceptions determine how long the duty continues.',
    check: 'Check the definition, duration, permitted recipients, and return or destruction language.',
  },
  {
    category: 'Intellectual property',
    patterns: [/intellectual property/i, /invention/i, /work[- ]for[- ]hire/i, /copyright/i],
    signal: 'attention',
    plain: 'This section addresses ownership or use rights for work product and inventions.',
    why: 'Ownership language can affect who may use work created during the relationship.',
    check: 'Ask whether the clause covers pre-existing work, personal projects, and work outside the stated scope.',
  },
  {
    category: 'Liability and indemnity',
    patterns: [/indemnif/i, /hold harmless/i, /limitation of liability/i, /unlimited liability/i, /consequential damages/i],
    signal: 'attention',
    plain: 'This section describes responsibility for losses, claims, or legal costs.',
    why: 'The allocation of responsibility can have a significant financial effect.',
    check: 'Ask about caps, exclusions, defense duties, mutual treatment, and the events that trigger the obligation.',
  },
  {
    category: 'Dispute resolution',
    patterns: [/arbitration/i, /jury/i, /class action/i, /dispute resolution/i, /venue/i],
    signal: 'review',
    plain: 'This section explains where and how disputes are intended to be handled.',
    why: 'The process can change where a dispute is heard, who pays costs, and what options are available.',
    check: 'Confirm the forum, required steps, fees, emergency relief, and any waivers.',
  },
  {
    category: 'Governing law',
    patterns: [/governing law/i, /laws of the state/i, /construed in accordance/i],
    signal: 'review',
    plain: 'This section names the legal framework the parties selected for the agreement.',
    why: 'The selected law and forum may matter when interpreting or resolving a dispute.',
    check: 'Confirm the named jurisdiction and ask a local professional how it may affect the provision.',
  },
  {
    category: 'Data and privacy',
    patterns: [/personal data/i, /privacy/i, /data protection/i, /customer data/i, /training.*model/i],
    signal: 'attention',
    plain: 'This section addresses personal data, confidentiality, or permitted data use.',
    why: 'Data terms can affect what information is collected, shared, retained, or used.',
    check: 'Check the permitted purposes, retention period, security duties, and user rights.',
  },
  {
    category: 'Restrictive covenant',
    patterns: [/non-compete/i, /non-competition/i, /non-solicit/i, /restrictive covenant/i],
    signal: 'attention',
    plain: 'This section restricts an activity or relationship after the agreement or work ends.',
    why: 'Duration, geography, and covered activities may affect future work or business choices.',
    check: 'Ask a qualified professional how the scope, duration, geography, and exceptions may apply where you are.',
  },
];

function normalizeText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extensionOf(name) {
  const safeName = String(name || '').split(/[\\/]/).pop();
  const index = safeName.lastIndexOf('.');
  return index >= 0 ? safeName.slice(index).toLowerCase() : '';
}

function safeFilename(name) {
  return String(name || 'document.txt')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 120) || 'document.txt';
}

export function validateDocumentFile(file) {
  if (!file || typeof file !== 'object') {
    return { valid: false, error: 'No file provided.', sanitizedName: '' };
  }

  const sanitizedName = safeFilename(file.name);
  const extension = extensionOf(sanitizedName);
  const size = Number(file.size);

  if (!Number.isFinite(size) || size < 0) {
    return { valid: false, error: 'The file size could not be verified.', sanitizedName };
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10 MB limit (${(size / (1024 * 1024)).toFixed(1)} MB).`,
      sanitizedName,
    };
  }

  if (!SUPPORTED_FILE_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type (${extension || 'unknown'}). Upload a PDF, DOCX, TXT, or Markdown document.`,
      sanitizedName,
    };
  }

  return { valid: true, error: null, sanitizedName };
}

function decodePdfEscapes(value) {
  return value
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\[0-7]{1,3}/g, (octal) => String.fromCharCode(parseInt(octal.slice(1), 8)));
}

export function extractTextFromPdfArrayBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
  }

  const pieces = [];
  const textOperator = /\(((?:\\.|[^\\)])*)\)\s*(?:Tj|')/g;
  const arrayOperator = /\[((?:\\.|[^\\\]])*)\]\s*TJ/g;
  let match;
  while ((match = textOperator.exec(binary)) !== null) {
    pieces.push(decodePdfEscapes(match[1]));
  }
  while ((match = arrayOperator.exec(binary)) !== null) {
    const strings = match[1].match(/\((?:\\.|[^\\)])*\)/g) || [];
    pieces.push(strings.map((item) => decodePdfEscapes(item.slice(1, -1))).join(' '));
  }

  let text = pieces.join('\n');
  if (!text.trim()) {
    const readable = binary.match(/[\x20-\x7e\n\r\t]{4,}/g) || [];
    text = readable
      .filter((item) => !/^\/(?:Font|Filter|ProcSet|Length|Type|Subtype)/.test(item.trim()))
      .join('\n');
  }

  return normalizeText(text.replace(/\u0000/g, ''));
}

function pageAtOffset(text, offset) {
  let page = null;
  PAGE_MARKER_PATTERN.lastIndex = 0;
  let match;
  while ((match = PAGE_MARKER_PATTERN.exec(text)) !== null && match.index < offset) {
    page = Number(match[1] || match[2]) || null;
  }
  return page;
}

function pageMarkers(text) {
  const markers = [];
  PAGE_MARKER_PATTERN.lastIndex = 0;
  let match;
  while ((match = PAGE_MARKER_PATTERN.exec(text)) !== null) {
    markers.push({ page: Number(match[1] || match[2]) || null, index: match.index });
  }
  return markers;
}

function isHeading(line) {
  const value = line.trim();
  if (!value || value.length > 140) return false;
  if (HEADING_PATTERN.test(value) || NUMBERED_HEADING_PATTERN.test(value)) return true;
  if (/^[A-Z][A-Z\s&/,'-]{4,}:?$/.test(value) && value.split(/\s+/).length >= 2) return true;
  return false;
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/g)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function topicFromHeading(heading) {
  return heading
    .replace(/^(?:section|article|paragraph|clause)\s+[0-9ivxlc]+[.:-]?\s*/i, '')
    .replace(/[^a-zA-Z0-9\s&-]/g, '')
    .trim()
    .toLowerCase() || 'this section';
}

function ruleForClause(heading, text) {
  const combined = `${heading} ${text}`;
  for (const rule of CLAUSE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(combined))) return rule;
  }
  if (/\b(?:reasonable|as needed|as appropriate|promptly|sole discretion|without limitation)\b/i.test(text)) {
    return {
      category: 'Terms that may need clarification',
      signal: 'ambiguous',
      plain: 'This section uses language that may leave some details for the parties to decide.',
      why: 'Open-ended wording can make responsibilities or expectations less predictable.',
      check: 'Ask whether a measurable standard, approval process, or written clarification is available.',
    };
  }
  return {
    category: 'General provision',
    signal: 'standard',
    plain: `This section sets out terms about ${topicFromHeading(heading)}.`,
    why: 'The provision may affect how the parties perform or exercise the stated rights.',
    check: 'Compare the section with the rest of the agreement and confirm the parties’ intended understanding.',
  };
}

export function analyzeClauseStructure(heading, text, index, sourceLocation = {}) {
  const rule = ruleForClause(heading, text);
  const combined = `${heading} ${text}`;
  let signal = rule.signal;
  if (/\b(?:unlimited|uncapped|sole discretion|without prior notice|waives?|no duty to mitigate)\b/i.test(text) && signal === 'standard') {
    signal = 'attention';
  }
  const signalDetails = {
    attention: CALIBRATED_LABELS.HIGH_ATTENTION,
    review: CALIBRATED_LABELS.MODERATE_ATTENTION,
    ambiguous: CALIBRATED_LABELS.UNCLEAR_WORDING,
    standard: CALIBRATED_LABELS.STANDARD_TERM,
  }[signal];
  const source = {
    section: heading,
    clauseIndex: index + 1,
    page: Number.isInteger(sourceLocation.page) ? sourceLocation.page : null,
    startOffset: sourceLocation.startOffset ?? null,
    endOffset: sourceLocation.endOffset ?? null,
  };

  return {
    id: `clause-${index + 1}`,
    heading,
    clauseCategory: rule.category,
    originalText: text,
    text,
    plainEnglish: calibrateLanguage(rule.plain),
    whyItMatters: calibrateLanguage(rule.why),
    whatToCheck: calibrateLanguage(rule.check),
    reviewSignal: signalDetails,
    importance: signal === 'attention' ? 'High attention' : signal === 'review' ? 'Review' : signal === 'ambiguous' ? 'Clarify' : 'Important clause',
    sourceLocation: source,
    definedTerms: [...text.matchAll(/["“]([^"”]{2,80})["”]/g)].map((match) => match[1].trim()).filter(Boolean),
    monetaryAmounts: [...text.matchAll(/\$\s?[\d,]+(?:\.\d{2})?/g)].map((match) => match[0]),
    keywords: combined.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0, 12),
    readability: analyzeReadability(text),
  };
}

export function parseDocumentClauses(rawText) {
  const text = normalizeText(rawText);
  if (!text) return [];

  const lines = text.split('\n');
  const entries = [];
  let current = { heading: 'Preamble and general terms', startOffset: 0, lines: [] };
  let offset = 0;

  for (const line of lines) {
    const lineStart = offset;
    offset += line.length + 1;
    const trimmed = line.trim();
    const marker = trimmed.match(/^(?:---\s*Page\s+(\d+)\s*---|\[Page\s+(\d+)\])$/i);
    if (marker) {
      if (current.lines.join('\n').trim()) {
        current.endOffset = lineStart;
        entries.push({ ...current, text: current.lines.join('\n').trim() });
      }
      current = { heading: current.heading, startOffset: offset, lines: [] };
      continue;
    }

    if (isHeading(trimmed)) {
      if (current.lines.join('\n').trim()) {
        current.endOffset = lineStart;
        entries.push({ ...current, text: current.lines.join('\n').trim() });
      }
      current = { heading: trimmed, startOffset: lineStart, lines: [] };
    } else {
      current.lines.push(line);
    }
  }

  if (current.lines.join('\n').trim()) {
    current.endOffset = text.length;
    entries.push({ ...current, text: current.lines.join('\n').trim() });
  }

  const usable = entries.filter((entry) => entry.text.replace(/\s/g, '').length > 8);
  const sourceEntries = usable.length > 0 ? usable : splitLongText(text);
  return sourceEntries.map((entry, index) => analyzeClauseStructure(
    entry.heading,
    entry.text,
    index,
    {
      page: pageAtOffset(text, entry.startOffset || 0),
      startOffset: entry.startOffset ?? 0,
      endOffset: entry.endOffset ?? text.length,
    },
  ));
}

function splitLongText(text) {
  return text.split(/\n\s*\n/).filter((part) => part.trim().length > 20).map((part, index) => ({
    heading: `Clause ${index + 1}`,
    text: part.trim(),
    startOffset: text.indexOf(part),
    endOffset: text.indexOf(part) + part.length,
  }));
}

function findSentence(text, pattern) {
  const sentences = splitSentences(text);
  return sentences.find((sentence) => pattern.test(sentence)) || null;
}

function extractParties(text) {
  const parties = [];
  const roles = [];
  const labeled = /between\s+(.+?)\s*\("([^"]+)"\)\s+and\s+(.+?)\s*\("([^"]+)"\)/i.exec(text);
  if (labeled) {
    parties.push(labeled[1].trim(), labeled[3].trim());
    roles.push(labeled[2].trim(), labeled[4].trim());
  } else {
    const between = /between\s+(.+?)\s+and\s+(.+?)(?:\.|\n|dated|$)/i.exec(text);
    if (between) {
      parties.push(between[1].trim(), between[2].trim());
    }
    for (const item of ROLE_PATTERNS) {
      const match = text.match(new RegExp(`${item.role}:\\s*([^\\n]+)`, 'i'));
      if (match) parties.push(match[1].trim());
    }
  }
  const unique = [...new Set(parties.map((party) => party.replace(/[",]/g, '').trim()).filter((party) => party && party.length < 180))];
  return { parties: unique.slice(0, 6), roles: roles.slice(0, 6) };
}

function agreementTypeFor(text) {
  if (/rental agreement|residential lease|lease agreement/i.test(text)) return 'Rental or residential lease agreement';
  if (/employment agreement|employment contract|offer of employment/i.test(text)) return 'Employment agreement';
  if (/services agreement|service agreement|statement of work|consulting agreement/i.test(text)) return 'Services agreement';
  if (/non-disclosure agreement|confidentiality agreement|\bnda\b/i.test(text)) return 'Non-disclosure agreement';
  if (/policy|terms of use|terms of service/i.test(text)) return 'Policy or terms document';
  return 'Legal agreement';
}

export function extractKeyFacts(text) {
  const source = normalizeText(text);
  const partyData = extractParties(source);
  const effective = source.match(/(?:effective as of|dated as of|made on|made on|entered into on|dated)\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/i);
  const term = source.match(/(?:term of|for a term of|lease begins|remains in effect for)\s+([^.!?\n]{3,100})/i);
  const renewalSentence = findSentence(source, /automatic(?:ally)? renew|non-renewal|successive term/i);
  const law = source.match(/laws of the\s+(?:state|commonwealth|province)?\s*of\s+([A-Z][a-z]+)/i) || source.match(/governing law(?: is)?\s+([A-Z][a-z]+)/i);
  const paymentSentence = findSentence(source, /monthly rent|annual salary|pay(?:ment|able)|fee of|compensation|rent of/i);
  const terminationSentence = findSentence(source, /terminat(?:e|ion)|non-renewal|notice/i);
  const noticeWindow = terminationSentence?.match(/((?:\d+|one|two|three|four|ten|fifteen|twenty|thirty|forty-five|sixty|seventy-five|ninety)[\s-]*(?:\(\d+\))?\s+(?:calendar\s+|business\s+)?(?:days?|months?|weeks?|hours?))/i);

  return {
    agreementType: agreementTypeFor(source),
    parties: partyData.parties,
    partyRoles: partyData.roles,
    effectiveDate: effective?.[1] || null,
    term: term?.[1]?.trim() || null,
    renewal: renewalSentence || null,
    governingLaw: law?.[1] || null,
    paymentTerms: paymentSentence ? safeExcerpt(paymentSentence, 220) : null,
    terminationNotice: noticeWindow?.[1] || (terminationSentence ? 'Termination language is present; no fixed notice period was identified.' : null),
    definedTerms: [...source.matchAll(/["“]([^"”]{2,80})["”]/g)].map((match) => match[1].trim()).filter(Boolean).slice(0, 30),
    monetaryAmounts: [...source.matchAll(/\$\s?[\d,]+(?:\.\d{2})?/g)].map((match) => match[0]),
  };
}

function roleForSentence(sentence, agreementType, userRole) {
  const matched = ROLE_PATTERNS.find(({ pattern }) => pattern.test(sentence));
  const inferred = matched?.role || (agreementType.toLowerCase().includes('rental') ? 'Tenant' : agreementType.toLowerCase().includes('employment') ? 'Employee' : agreementType.toLowerCase().includes('services') ? 'Contractor' : 'Party A');
  if (!userRole) return inferred;
  return inferred.toLowerCase() === userRole.toLowerCase() ? inferred : inferred;
}

function defaultRoleFor(agreementType) {
  const lower = agreementType.toLowerCase();
  if (lower.includes('rental') || lower.includes('lease')) return 'Tenant';
  if (lower.includes('employment')) return 'Employee';
  if (lower.includes('service')) return 'Contractor';
  return 'Party A';
}

export function extractStructuredObligations(text, agreementType = '', options = {}) {
  const clauses = parseDocumentClauses(text);
  const role = options.userRole || defaultRoleFor(agreementType || extractKeyFacts(text).agreementType);
  const yourObligations = [];
  const otherPartyObligations = [];
  const seen = new Set();

  for (const clause of clauses) {
    for (const sentence of splitSentences(clause.originalText)) {
      if (!/\b(?:shall|must|agrees? to|is required to|will)\b/i.test(sentence) || sentence.length < 20) continue;
      const responsible = roleForSentence(sentence, agreementType, role);
      const deadline = sentence.match(/((?:\d+|one|two|three|four|ten|fifteen|twenty|thirty|forty-five|sixty|seventy-five|ninety)[\s-]*(?:\(\d+\))?\s+(?:calendar\s+|business\s+)?(?:days?|months?|weeks?|hours?))/i);
      const key = `${clause.id}:${sentence.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const item = {
        obligation: safeExcerpt(sentence, 300),
        responsibleParty: responsible.toLowerCase() === role.toLowerCase() ? `Your side (${responsible})` : `${responsible}`,
        deadline: deadline?.[1] || 'No specific deadline stated',
        source: clause.heading,
        page: clause.sourceLocation.page,
        clauseId: clause.id,
      };
      if (item.responsibleParty.startsWith('Your side')) yourObligations.push(item);
      else otherPartyObligations.push(item);
    }
  }

  return {
    yourObligations: yourObligations.slice(0, 12),
    otherPartyObligations: otherPartyObligations.slice(0, 12),
    selectedRole: role,
  };
}

export function extractDatesAndDeadlines(text) {
  const source = normalizeText(text);
  const results = [];
  const seen = new Set();
  const add = (match, type, category, dateString) => {
    const value = dateString.trim();
    const key = `${type}:${value.toLowerCase()}`;
    if (!value || seen.has(key)) return;
    seen.add(key);
    const index = match.index ?? 0;
    const start = Math.max(0, index - 55);
    const end = Math.min(source.length, index + Math.max(match[0].length, 90));
    results.push({
      type,
      category,
      dateString: value,
      label: safeExcerpt(match[0], 180),
      sourceSnippet: safeExcerpt(source.slice(start, end), 260),
      page: pageAtOffset(source, index),
    });
  };

  const datePattern = /(?:\b(?:on|before|after|by|effective|expiring|expires|dated|commencing)\s+)([A-Z][a-z]+\s+\d{1,2},\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})/gi;
  let match;
  while ((match = datePattern.exec(source)) !== null) add(match, 'Calendar date', 'Fixed date', match[1]);

  const periodPattern = /((?:\d+|one|two|three|four|ten|fifteen|twenty|thirty|forty-five|sixty|seventy-five|ninety)[\s-]*(?:\(\d+\))?\s+(?:calendar\s+|business\s+)?(?:days?|months?|weeks?|hours?))(?=\s+(?:prior|before|after|written|notice|to\b))/gi;
  while ((match = periodPattern.exec(source)) !== null) add(match, 'Notice or time window', 'Deadline or frequency', match[1]);

  return results.slice(0, 20);
}

function groundedChecklist(model) {
  const items = [];
  if (model.keyFacts.parties.length) items.push({ id: 'parties', text: 'Confirm that the named parties and their roles are correct.', source: 'Preamble' });
  if (model.keyFacts.paymentTerms) items.push({ id: 'payment', text: 'Verify the payment amount, due date, and any late-payment term.', source: 'Payment provisions' });
  if (model.keyFacts.terminationNotice) items.push({ id: 'termination', text: 'Review termination events, notice period, delivery method, and consequences.', source: 'Termination provisions' });
  if (model.keyFacts.renewal) items.push({ id: 'renewal', text: 'Record the renewal date and any deadline to prevent renewal.', source: 'Renewal provisions' });
  if (model.keyFacts.governingLaw) items.push({ id: 'law', text: 'Confirm the selected governing law and forum.', source: 'Governing law' });
  for (const area of model.reviewAreas.slice(0, 5)) {
    items.push({ id: `review-${area.id}`, text: `Discuss ${area.heading}: ${area.whatToCheck}`, source: area.heading });
  }
  return items.slice(0, 10);
}

export function processDocument(rawText, metadata = {}) {
  const text = normalizeText(rawText);
  if (!text) throw new Error('The document is empty. Upload a document containing readable text.');

  const clauses = parseDocumentClauses(text);
  const keyFacts = extractKeyFacts(text);
  const obligations = extractStructuredObligations(text, keyFacts.agreementType, { userRole: metadata.userRole });
  const datesAndDeadlines = extractDatesAndDeadlines(text);
  const readability = analyzeReadability(text);
  const reviewAreas = clauses.filter((clause) => clause.reviewSignal.severity !== 'standard');
  const importantClauses = [...clauses].sort((a, b) => {
    const rank = { attention: 0, review: 1, ambiguous: 2, standard: 3 };
    return rank[a.reviewSignal.severity] - rank[b.reviewSignal.severity];
  });
  const markers = pageMarkers(text);
  const model = {
    metadata: {
      ...metadata,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      characterCount: text.length,
      estimatedPages: markers.length || Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 400)),
      pageCount: markers.length || null,
      pageCountIsEstimated: markers.length === 0,
      parsedAt: new Date().toISOString(),
    },
    rawText: text,
    executiveSummary: `${keyFacts.agreementType} identified from the document. ${keyFacts.parties.length ? `The document names ${keyFacts.parties.join(' and ')}.` : 'The parties are not clearly identified in the text.'} ${clauses.length} structured sections were found. ${reviewAreas.length ? `${reviewAreas.length} review signals are surfaced for closer reading; they are prompts for human review, not legal conclusions.` : 'No elevated review signals were detected by the deterministic checks.'}`,
    keyFacts,
    clauses,
    importantClauses,
    obligations,
    datesAndDeadlines,
    reviewAreas,
    readability,
    totalClauses: clauses.length,
    reviewAreaCount: reviewAreas.length,
  };
  model.checklist = groundedChecklist(model);
  model.missingInformation = [
    keyFacts.parties.length ? null : 'Party names or roles',
    keyFacts.effectiveDate ? null : 'Effective date',
    keyFacts.governingLaw ? null : 'Governing law or forum',
  ].filter(Boolean);
  return model;
}

export async function parseDocumentFile(file) {
  const validation = validateDocumentFile(file);
  if (!validation.valid) throw new Error(validation.error);
  const extension = extensionOf(validation.sanitizedName);
  let rawText = '';
  try {
    if (extension === '.docx') {
      if (typeof file.arrayBuffer !== 'function') throw new Error('The DOCX could not be read in this browser.');
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      rawText = result?.value || '';
    } else if (extension === '.pdf') {
      if (typeof file.arrayBuffer !== 'function') throw new Error('The PDF could not be read in this browser.');
      rawText = extractTextFromPdfArrayBuffer(await file.arrayBuffer());
    } else {
      if (typeof file.text !== 'function') throw new Error('The text file could not be read in this browser.');
      rawText = await file.text();
    }
  } catch {
    throw new Error('We could not extract readable text from this file. Try a text-based PDF, DOCX, or TXT file.');
  }

  rawText = normalizeText(rawText);
  if (!rawText || rawText.length < 8) {
    throw new Error(extension === '.pdf'
      ? "We couldn't extract readable text from this PDF. It may be a scanned or image-only PDF. Try a text-based PDF, DOCX, or TXT file."
      : 'The uploaded document is empty or does not contain readable text.');
  }
  if (rawText.length > MAX_EXTRACTED_CHARACTERS) throw new Error('The extracted document is too large to process safely.');

  return {
    rawText,
    metadata: {
      filename: validation.sanitizedName,
      documentType: extension.slice(1).toUpperCase(),
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    },
  };
}

export function getPageAtOffset(text, offset) {
  return pageAtOffset(normalizeText(text), offset);
}

export { normalizeText, splitSentences, safeFilename };
