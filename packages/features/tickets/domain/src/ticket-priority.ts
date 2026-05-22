export function mapPriorityToLevel(priority: string | null | undefined): number {
  if (priority === 'LOW') return 1;
  if (priority === 'HIGH' || priority === 'CRITICAL') return 3;
  return 2;
}
