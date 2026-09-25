/**
 * PII Sanitizer & Masking Service
 * Ensures sensitive data (names, SSN, PAN, emails, phone numbers, addresses, salaries)
 * is shielded locally in the browser before any document processing or LLM transmission.
 */

export function sanitizePII(text) {
  if (!text) return { sanitizedText: '', tokensReplaced: 0, piiMap: {}, categoriesFound: [] };

  const piiMap = {};
  let counter = 1;
  const categories = new Set();

  function recordToken(type, original) {
    categories.add(type);
    const token = `[${type}_${counter++}]`;
    piiMap[token] = original;
    return token;
  }

  let sanitized = text;

  // 1. Email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (match) => {
    return recordToken('CONFIDENTIAL_EMAIL', match);
  });

  // 2. Phone numbers (US & international patterns)
  sanitized = sanitized.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, (match) => {
    return recordToken('CONFIDENTIAL_PHONE', match);
  });

  // 3. Social Security Numbers (SSN: XXX-XX-XXXX)
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, (match) => {
    return recordToken('SSN_REDACTED', match);
  });

  // 4. Indian PAN card format (5 letters, 4 digits, 1 letter)
  sanitized = sanitized.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, (match) => {
    return recordToken('TAX_ID_REDACTED', match);
  });

  // 5. Aadhaar-like 12-digit number (XXXX XXXX XXXX or XXXXXXXXXXXX)
  sanitized = sanitized.replace(/\b\d{4}\s\d{4}\s\d{4}\b/g, (match) => {
    return recordToken('NATIONAL_ID_REDACTED', match);
  });

  // 6. Dollar / Currency salary figures ($120,000, $5,000/month, etc.)
  sanitized = sanitized.replace(/\$\s?[\d,]+(?:\.\d{2})?(?:\s*(?:per year|\/year|per month|\/mo|annually|hourly))?/gi, (match) => {
    return recordToken('COMPENSATION_AMOUNT', match);
  });

  // 7. Common party placeholders (e.g. John Doe, Jane Smith when following standard contract cues)
  sanitized = sanitized.replace(/(?:by and between|Employee:\s*|Tenant:\s*|Landlord:\s*|Contractor:\s*|Client:\s*)([A-Z][a-z]+ [A-Z][a-z]+)/g, (match, name) => {
    const token = recordToken('PARTY_NAME', name);
    return match.replace(name, token);
  });

  // 8. Physical addresses (e.g., 123 Main Street, Suite 400, City, State 12345)
  sanitized = sanitized.replace(/\b\d{1,5}\s+[A-Za-z0-9\s,.'-]{3,40}(?:Avenue|Lane|Road|Boulevard|Drive|Street|Blvd|St|Ave|Rd|Dr|Suite|Apt)\b[A-Za-z0-9\s,.'-]*(?:\b\d{5}(?:-\d{4})?\b)?/gi, (match) => {
    return recordToken('PHYSICAL_ADDRESS', match.trim());
  });

  const tokensReplaced = Object.keys(piiMap).length;

  return {
    sanitizedText: sanitized,
    tokensReplaced,
    piiMap,
    categoriesFound: Array.from(categories),
  };
}

export function restorePII(sanitizedText, piiMap) {
  if (!sanitizedText || !piiMap) return sanitizedText;
  let restored = sanitizedText;
  for (const [token, original] of Object.entries(piiMap)) {
    restored = restored.replaceAll(token, original);
  }
  return restored;
}
