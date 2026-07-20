import { HealthStatus, ComponentReason } from '../../managed-services/health/managed-service-health-evaluator';

export interface SysproInstallationHealthState {
  healthStatus: HealthStatus;
  validationStatus: string;
  reasons: ComponentReason[];
}

export class SysproInstallationHealthEvaluator {
  public evaluate(validationStatus: string, hasValidExecutables: boolean, version: string | null): SysproInstallationHealthState {
    let healthStatus: HealthStatus = 'HEALTHY';
    const reasons: ComponentReason[] = [];

    if (!hasValidExecutables) {
      healthStatus = 'CRITICAL';
      reasons.push({
        code: 'MISSING_EXECUTABLES',
        severity: 'CRITICAL',
        title: 'Arquivos ausentes',
        description: 'Os executáveis principais não foram encontrados no diretório.',
      });
    } else if (validationStatus !== 'VALIDATED') {
      healthStatus = 'WARNING';
      reasons.push({
        code: 'VALIDATION_FAILED',
        severity: 'WARNING',
        title: 'Falha na Validação',
        description: 'A instalação não pôde ser validada com sucesso.',
      });
    }

    if (!version && healthStatus !== 'CRITICAL') {
      healthStatus = 'WARNING';
      reasons.push({
        code: 'UNKNOWN_VERSION',
        severity: 'WARNING',
        title: 'Versão desconhecida',
        description: 'Não foi possível determinar a versão do ERP.',
      });
    }

    return {
      healthStatus,
      validationStatus,
      reasons,
    };
  }
}
