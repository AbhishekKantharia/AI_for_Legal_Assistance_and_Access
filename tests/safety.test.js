import { describe, it, expect } from 'vitest';
import {
  checkLegalAdviceRequest,
  calibrateLanguage,
  formatGroundedOutput,
  LEGAL_DISCLAIMER_TEXT,
} from '../src/services/legalSafety';

describe('ClauseGuard Legal Safety System', () => {
  it('detects requests for definitive signing advice and redirects appropriately', () => {
    const check1 = checkLegalAdviceRequest('Should I sign this employment contract?');
    expect(check1.isLegalAdviceRequest).toBe(true);
    expect(check1.adviceCategory).toBe('SIGNING_DECISION');
    expect(check1.redirectGuidance).toContain('ClauseGuard cannot tell you whether to sign');

    const check2 = checkLegalAdviceRequest('Can I sign this without reading?');
    expect(check2.isLegalAdviceRequest).toBe(true);
  });

  it('detects requests for legal enforceability determinations and redirects', () => {
    const check = checkLegalAdviceRequest('Is this non-compete clause illegal or unenforceable in California?');
    expect(check.isLegalAdviceRequest).toBe(true);
    expect(check.adviceCategory).toBe('LEGAL_ENFORCEABILITY');
    expect(check.redirectGuidance).toContain('ClauseGuard cannot determine legal validity');
  });

  it('detects litigation outcome predictions and redirects', () => {
    const check = checkLegalAdviceRequest('Will I win if I sue my landlord for entering?');
    expect(check.isLegalAdviceRequest).toBe(true);
    expect(check.adviceCategory).toBe('LITIGATION_OUTCOME');
  });

  it('allows informational document questions through without flagging', () => {
    const check = checkLegalAdviceRequest('What is the notice period required for termination?');
    expect(check.isLegalAdviceRequest).toBe(false);
  });

  it('calibrates aggressive conclusions into neutral review language', () => {
    const raw = 'This contract is illegal and you will definitely lose. You must not sign this!';
    const calibrated = calibrateLanguage(raw);

    expect(calibrated).not.toContain('This contract is illegal');
    expect(calibrated).not.toContain('you will definitely lose');
    expect(calibrated).not.toContain('You must not sign this');
    expect(calibrated).toContain('statutory restrictions worth verifying');
    expect(calibrated).toContain('pause and discuss this specific clause with legal counsel');
  });

  it('attaches standard disclaimer to all formatted grounded outputs', () => {
    const output = formatGroundedOutput({
      answer: 'The term is 12 months.',
      sources: [{ section: 'Section 1', page: 1, excerpt: 'term is 12 months' }],
    });

    expect(output.disclaimer).toBeDefined();
    expect(output.sources.length).toBe(1);
  });
});
