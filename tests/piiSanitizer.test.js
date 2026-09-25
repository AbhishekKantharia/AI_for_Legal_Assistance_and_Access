import { describe, it, expect } from 'vitest';
import { sanitizePII, restorePII } from '../src/services/piiSanitizer';

describe('piiSanitizer', () => {
  it('masks emails, phone numbers, and SSNs', () => {
    const input = 'Contact John at lawyer@firm.com or call 555-123-4567. SSN is 123-45-6789.';
    const result = sanitizePII(input);

    expect(result.tokensReplaced).toBeGreaterThanOrEqual(3);
    expect(result.sanitizedText).not.toContain('lawyer@firm.com');
    expect(result.sanitizedText).not.toContain('555-123-4567');
    expect(result.sanitizedText).not.toContain('123-45-6789');
    expect(result.sanitizedText).toContain('[CONFIDENTIAL_EMAIL_');
    expect(result.sanitizedText).toContain('[CONFIDENTIAL_PHONE_');
    expect(result.sanitizedText).toContain('[SSN_REDACTED_');
  });

  it('masks salary and currency compensation amounts', () => {
    const input = 'Base salary shall be $175,000.00 per year with rent of $2,150.00.';
    const result = sanitizePII(input);

    expect(result.sanitizedText).toContain('[COMPENSATION_AMOUNT_');
    expect(result.sanitizedText).not.toContain('$175,000.00');
  });

  it('restores original text using the token map', () => {
    const input = 'Email me at tenant@example.com for inquiries.';
    const { sanitizedText, piiMap } = sanitizePII(input);
    const restored = restorePII(sanitizedText, piiMap);

    expect(restored).toBe(input);
  });
});
