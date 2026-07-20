import { describe, it, expect } from 'vitest';
import { FirebirdHealthEvaluator } from '../firebird-health-evaluator';

describe('FirebirdHealthEvaluator', () => {
  const evaluator = new FirebirdHealthEvaluator();

  it('should return HEALTHY when running and has databases', () => {
    const result = evaluator.evaluate(true, true);
    expect(result.healthStatus).toBe('HEALTHY');
    expect(result.reasons).toHaveLength(0);
  });

  it('should return CRITICAL when service is stopped', () => {
    const result = evaluator.evaluate(false, true);
    expect(result.healthStatus).toBe('CRITICAL');
    expect(result.reasons[0].code).toBe('FIREBIRD_STOPPED');
  });

  it('should return WARNING when running but no databases configured', () => {
    const result = evaluator.evaluate(true, false);
    expect(result.healthStatus).toBe('WARNING');
    expect(result.reasons[0].code).toBe('NO_DATABASES');
  });
});
