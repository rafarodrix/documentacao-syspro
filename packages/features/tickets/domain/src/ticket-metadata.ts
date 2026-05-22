export function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const record = metadata as Record<string, unknown>;
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
