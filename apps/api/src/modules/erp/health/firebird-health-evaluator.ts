import { HealthStatus, RuntimeStatus, ComponentReason } from '../../managed-services/health/managed-service-health-evaluator';

export interface FirebirdHealthState {
  healthStatus: HealthStatus;
  runtimeStatus: RuntimeStatus;
  reasons: ComponentReason[];
}

export class FirebirdHealthEvaluator {
  public evaluate(
    isServiceRunning: boolean,
    hasDatabasesConfigured: boolean
  ): FirebirdHealthState {
    let healthStatus: HealthStatus = 'HEALTHY';
    const reasons: ComponentReason[] = [];
    const runtimeStatus: RuntimeStatus = isServiceRunning ? 'RUNNING' : 'STOPPED';

    if (!isServiceRunning) {
      healthStatus = 'CRITICAL';
      reasons.push({
        code: 'FIREBIRD_STOPPED',
        severity: 'CRITICAL',
        title: 'Serviço Parado',
        description: 'O serviço do Firebird (fbserver) não está em execução.',
      });
    } else if (!hasDatabasesConfigured) {
      healthStatus = 'WARNING';
      reasons.push({
        code: 'NO_DATABASES',
        severity: 'WARNING',
        title: 'Nenhum Banco Configurado',
        description: 'O serviço está rodando, mas nenhum banco de dados válido foi detectado para o ERP.',
      });
    }

    return {
      healthStatus,
      runtimeStatus,
      reasons,
    };
  }
}
