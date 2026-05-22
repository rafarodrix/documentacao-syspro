export function mapStatusLabel(status: string): string {
  switch (status) {
    case 'NEW': return 'Novo';
    case 'UNASSIGNED': return 'Sem dono';
    case 'TRIAGE': return 'Em analise';
    case 'IN_PROGRESS': return 'Em desenvolvimento';
    case 'WAITING_CUSTOMER': return 'Em analise';
    case 'WAITING_INTERNAL': return 'Em analise';
    case 'TESTING': return 'Em testes';
    case 'RESOLVED': return 'Resolvido';
    case 'ARCHIVED': return 'Arquivado';
    default: return status;
  }
}

export function formatTeamLabel(team?: string | null): string {
  if (team === 'DESENVOLVIMENTO') return 'Desenvolvimento';
  if (team === 'SUPORTE') return 'Suporte';
  return 'Nao definida';
}
