export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' | 'UPDATING' | 'DISABLED';
export type RuntimeStatus = 'RUNNING' | 'STOPPED' | 'UNKNOWN';
export type ComplianceStatus = 'COMPLIANT' | 'OUT_OF_SYNC' | 'NOT_APPLICABLE';

export interface ComponentReason {
  code: string;
  severity: HealthStatus;
  title: string;
  description?: string;
}

export interface ManagedServiceHealthState {
  runtimeStatus: RuntimeStatus;
  healthStatus: HealthStatus;
  complianceStatus: ComplianceStatus;
  reasons: ComponentReason[];
}

export class ManagedServiceHealthEvaluator {
  /**
   * Evaluates the health of a standard Trilink managed service.
   * If it's stopped, it's critical. If out of sync, it's a warning.
   */
  public evaluate(
    runtimeStatus: RuntimeStatus,
    complianceStatus: ComplianceStatus,
    customReasons: ComponentReason[] = []
  ): ManagedServiceHealthState {
    let healthStatus: HealthStatus = 'HEALTHY';
    const reasons: ComponentReason[] = [...customReasons];

    if (runtimeStatus === 'STOPPED') {
      healthStatus = 'CRITICAL';
      reasons.push({
        code: 'SERVICE_STOPPED',
        severity: 'CRITICAL',
        title: 'Serviço Parado',
        description: 'O serviço não está em execução no host.',
      });
    } else if (runtimeStatus === 'UNKNOWN') {
      healthStatus = 'UNKNOWN';
    }

    if (complianceStatus === 'OUT_OF_SYNC' && healthStatus !== 'CRITICAL') {
      healthStatus = 'WARNING';
      reasons.push({
        code: 'OUT_OF_SYNC',
        severity: 'WARNING',
        title: 'Configuração Divergente',
        description: 'A configuração local diverge do portal.',
      });
    }

    return {
      runtimeStatus,
      healthStatus,
      complianceStatus,
      reasons,
    };
  }
}
