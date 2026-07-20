import { HealthStatus, RuntimeStatus, ComponentReason } from '../../managed-services/health/managed-service-health-evaluator';

export interface SysproInstanceHealthState {
  healthStatus: HealthStatus;
  runtimeStatus: RuntimeStatus;
  reasons: ComponentReason[];
}

export class SysproInstanceHealthEvaluator {
  public evaluate(
    expectedState: 'RUNNING' | 'STOPPED',
    currentState: RuntimeStatus
  ): SysproInstanceHealthState {
    let healthStatus: HealthStatus = 'HEALTHY';
    const reasons: ComponentReason[] = [];

    if (expectedState === 'RUNNING' && currentState === 'STOPPED') {
      healthStatus = 'CRITICAL';
      reasons.push({
        code: 'INSTANCE_UNEXPECTEDLY_STOPPED',
        severity: 'CRITICAL',
        title: 'Instância Parada',
        description: 'A instância deveria estar rodando, mas está parada.',
      });
    } else if (currentState === 'UNKNOWN') {
      healthStatus = 'UNKNOWN';
    }

    return {
      healthStatus,
      runtimeStatus: currentState,
      reasons,
    };
  }
}
