import { describe, it, expect } from 'vitest';
import { SysproInstallationHealthEvaluator } from '../syspro-installation-health-evaluator';

describe('SysproInstallationHealthEvaluator', () => {
  const evaluator = new SysproInstallationHealthEvaluator();

  it('should return HEALTHY for validated installation with executables and version', () => {
    const result = evaluator.evaluate('VALIDATED', true, '1.0.0');
    expect(result.healthStatus).toBe('HEALTHY');
    expect(result.reasons).toHaveLength(0);
  });

  it('should return CRITICAL when executables are missing', () => {
    const result = evaluator.evaluate('VALIDATED', false, '1.0.0');
    expect(result.healthStatus).toBe('CRITICAL');
    expect(result.reasons[0].code).toBe('MISSING_EXECUTABLES');
  });

  it('should return WARNING when validation failed', () => {
    const result = evaluator.evaluate('FAILED', true, '1.0.0');
    expect(result.healthStatus).toBe('WARNING');
    expect(result.reasons[0].code).toBe('VALIDATION_FAILED');
  });

  it('should return WARNING when version is unknown', () => {
    const result = evaluator.evaluate('VALIDATED', true, null);
    expect(result.healthStatus).toBe('WARNING');
    expect(result.reasons[0].code).toBe('UNKNOWN_VERSION');
  });
});
