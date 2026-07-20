import { describe, it, expect } from 'vitest';
import { SysproInstanceHealthEvaluator } from '../syspro-instance-health-evaluator';

describe('SysproInstanceHealthEvaluator', () => {
  const evaluator = new SysproInstanceHealthEvaluator();

  it('should return HEALTHY when RUNNING and expected RUNNING', () => {
    const result = evaluator.evaluate('RUNNING', 'RUNNING');
    expect(result.healthStatus).toBe('HEALTHY');
    expect(result.reasons).toHaveLength(0);
  });

  it('should return CRITICAL when STOPPED but expected RUNNING', () => {
    const result = evaluator.evaluate('RUNNING', 'STOPPED');
    expect(result.healthStatus).toBe('CRITICAL');
    expect(result.reasons[0].code).toBe('INSTANCE_UNEXPECTEDLY_STOPPED');
  });

  it('should return HEALTHY when STOPPED and expected STOPPED', () => {
    const result = evaluator.evaluate('STOPPED', 'STOPPED');
    expect(result.healthStatus).toBe('HEALTHY');
    expect(result.reasons).toHaveLength(0);
  });
});
