const REQUIRED_EVOLUTION_SUBSCRIBE = ['MESSAGE', 'READ_RECEIPT', 'QRCODE', 'CONNECTION'] as const;

export function ensureRequiredEvolutionSubscribe(values?: string[]) {
  const current = new Set(
    (values?.length ? values : ['MESSAGE'])
      .map((value) => String(value ?? '').trim())
      .filter(Boolean),
  );

  if (current.has('ALL')) {
    return ['ALL'];
  }

  for (const required of REQUIRED_EVOLUTION_SUBSCRIBE) {
    current.add(required);
  }

  return Array.from(current);
}
