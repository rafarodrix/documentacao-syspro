/** Comparação semver X.Y.Z usada por upgrade gerenciado do agent. */

export function parseAgentSemver(version: string | null | undefined): [number, number, number] | null {
  const match = version?.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** -1 se a < b, 0 se iguais, 1 se a > b. null se algum lado inválido. */
export function compareAgentSemver(
  left: string | null | undefined,
  right: string | null | undefined,
): number | null {
  const a = parseAgentSemver(left);
  const b = parseAgentSemver(right);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i += 1) {
    if (a[i]! < b[i]!) return -1;
    if (a[i]! > b[i]!) return 1;
  }
  return 0;
}

export function isAgentVersionBelowTarget(
  current: string | null | undefined,
  target: string | null | undefined,
): boolean {
  const cmp = compareAgentSemver(current, target);
  return cmp === -1;
}

/** Upgrade gerenciado via portal exige agent >= 1.0.85. */
export function supportsManagedAgentUpgrade(agentVersion: string | null | undefined): boolean {
  const parsed = parseAgentSemver(agentVersion);
  if (!parsed) return false;
  const [major, minor, patch] = parsed;
  return major > 1 || (major === 1 && (minor > 0 || (minor === 0 && patch >= 85)));
}
