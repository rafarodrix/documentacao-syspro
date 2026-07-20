import { describe, it, expect } from 'vitest';
import { ManagedServiceHealthEvaluator } from '../managed-service-health-evaluator';

describe('ManagedServiceHealthEvaluator', () => {
  const evaluator = new ManagedServiceHealthEvaluator();

  it('should return HEALTHY when RUNNING and COMPLIANT', () => {
    const result = evaluator.evaluate('RUNNING', 'COMPLIANT');
    expect(result.healthStatus).toBe('HEALTHY');
    expect(result.reasons).toHaveLength(0);
  });

  it('should return CRITICAL when STOPPED', () => {
    const result = evaluator.evaluate('STOPPED', 'COMPLIANT');
    expect(result.healthStatus).toBe('CRITICAL');
    expect(result.reasons[0].code).toBe('SERVICE_STOPPED');
  });

  it('should return WARNING when RUNNING but OUT_OF_SYNC', () => {
    const result = evaluator.evaluate('RUNNING', 'OUT_OF_SYNC');
    expect(result.healthStatus).toBe('WARNING');
    expect(result.reasons[0].code).toBe('OUT_OF_SYNC');
  });

  it('should prioritize CRITICAL over WARNING when STOPPED and OUT_OF_SYNC', () => {
    const result = evaluator.evaluate('STOPPED', 'OUT_OF_SYNC');
    expect(result.healthStatus).toBe('CRITICAL');
    // It should have the STOPPED reason
    expect(result.reasons.some(r => r.code === 'SERVICE_STOPPED')).toBe(true);
  });
});
