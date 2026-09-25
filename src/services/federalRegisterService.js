/**
 * @fileoverview Federal Register Live API Service
 * Fetches real-time legal regulations, rules, and enforcement actions from the
 * U.S. Federal Register API (https://www.federalregister.gov/developers/documentation/api/v1).
 * This is a verified, public, no-auth-required government API.
 * @module federalRegisterService
 */

/** @constant {string} Base URL for the Federal Register public REST API v1 */
const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';

/** @constant {number} Default number of results per request */
const DEFAULT_PER_PAGE = 5;

/** @constant {number} Maximum allowed request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 12000;

/** @constant {number} Maximum input length for search terms to prevent abuse */
const MAX_SEARCH_TERM_LENGTH = 200;

/**
 * @typedef {Object} FederalRegisterDocument
 * @property {string} title - Document title
 * @property {string} type - Document type (Rule, Proposed Rule, Notice, etc.)
 * @property {string|null} abstract - Summary abstract text
 * @property {string} document_number - Official document number
 * @property {string} html_url - URL to the full document on federalregister.gov
 * @property {string} pdf_url - URL to the PDF version
 * @property {string} publication_date - ISO date string (YYYY-MM-DD)
 * @property {Array<{name: string, url: string}>} agencies - Issuing agencies
 * @property {string} [excerpts] - Matching text excerpts with highlights
 */

/**
 * @typedef {Object} FederalRegisterResponse
 * @property {number} count - Total matching documents
 * @property {string|null} description - Search description
 * @property {number} total_pages - Total pages available
 * @property {FederalRegisterDocument[]} results - Array of matching documents
 */

/**
 * Sanitizes user input for API queries by removing potentially dangerous characters.
 * @param {string} input - Raw user input string
 * @returns {string} Sanitized string safe for API query parameters
 */
export function sanitizeSearchInput(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .slice(0, MAX_SEARCH_TERM_LENGTH)
    .replace(/[<>{}|\\^`]/g, '')
    .trim();
}

/**
 * Fetches documents from the Federal Register API with timeout and error handling.
 * @param {string} searchTerm - Legal topic to search (e.g., "non-compete", "tenant rights")
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.perPage=5] - Number of results to return (1-20)
 * @param {string} [options.documentType] - Filter by type: 'RULE', 'PRORULE', 'NOTICE', 'PRESDOCU'
 * @param {AbortSignal} [options.signal] - AbortController signal for cancellation
 * @returns {Promise<FederalRegisterResponse>} Parsed API response with documents
 * @throws {Error} If the network request fails or times out
 */
export async function fetchFederalRegulations(searchTerm, options = {}) {
  const sanitized = sanitizeSearchInput(searchTerm);
  if (!sanitized) {
    return { count: 0, description: null, total_pages: 0, results: [] };
  }

  const perPage = Math.min(20, Math.max(1, options.perPage || DEFAULT_PER_PAGE));

  const params = new URLSearchParams({
    'conditions[term]': sanitized,
    per_page: String(perPage),
    order: 'relevance',
  });

  if (options.documentType) {
    params.set('conditions[type][]', options.documentType);
  }

  const url = `${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Federal Register API returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      count: data.count || 0,
      description: data.description || null,
      total_pages: data.total_pages || 0,
      results: (data.results || []).map(doc => ({
        title: doc.title || 'Untitled Document',
        type: doc.type || 'Unknown',
        abstract: doc.abstract || null,
        document_number: doc.document_number || '',
        html_url: doc.html_url || '',
        pdf_url: doc.pdf_url || '',
        publication_date: doc.publication_date || '',
        agencies: (doc.agencies || []).map(a => ({
          name: a.name || 'Unknown Agency',
          url: a.url || '',
        })),
        excerpts: doc.excerpts
          ? doc.excerpts.replace(/<\/?span[^>]*>/g, '')
          : null,
      })),
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error(`Federal Register API request timed out after ${REQUEST_TIMEOUT_MS}ms`, { cause: err });
    }
    throw err;
  }
}

/**
 * Fetches a single document from the Federal Register by its official document number.
 * @param {string} documentNumber - Official FR document number (e.g., "2024-01234")
 * @returns {Promise<FederalRegisterDocument|null>} The document or null if not found
 */
export async function fetchDocumentByNumber(documentNumber) {
  if (!documentNumber || typeof documentNumber !== 'string') return null;

  const sanitized = documentNumber.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 30);
  const url = `${FEDERAL_REGISTER_API}/documents/${sanitized}.json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const doc = await response.json();
    return {
      title: doc.title || 'Untitled',
      type: doc.type || 'Unknown',
      abstract: doc.abstract || null,
      document_number: doc.document_number || documentNumber,
      html_url: doc.html_url || '',
      pdf_url: doc.pdf_url || '',
      publication_date: doc.publication_date || '',
      agencies: (doc.agencies || []).map(a => ({
        name: a.name || 'Unknown Agency',
        url: a.url || '',
      })),
      excerpts: null,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Maps a legal clause type to the most relevant Federal Register search terms.
 * @param {string} clauseType - Clause type identifier from the heuristic engine
 * @returns {string} Optimized search query for the Federal Register API
 */
export function getSearchTermForClauseType(clauseType) {
  /** @type {Record<string, string>} */
  const CLAUSE_SEARCH_MAP = {
    NON_COMPETE: 'non-compete agreement employee restriction',
    IP_ASSIGNMENT: 'intellectual property assignment employee invention',
    INDEMNIFICATION: 'indemnification liability consumer protection',
    ARBITRATION_WAIVER: 'mandatory arbitration consumer rights',
    AUTO_RENEWAL: 'automatic renewal subscription consumer',
    SECURITY_DEPOSIT: 'security deposit tenant rights protection',
    RIGHT_OF_ENTRY: 'landlord entry tenant privacy notice',
    LATE_CHARGES: 'late fee penalty consumer protection',
    PAYMENT_TERMS: 'payment terms independent contractor',
    AI_DATA_TRAINING: 'artificial intelligence data privacy consumer',
    EARLY_TERMINATION: 'early termination fee consumer contract',
  };

  return CLAUSE_SEARCH_MAP[clauseType] || 'consumer contract protection rights';
}
