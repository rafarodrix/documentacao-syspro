function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isIpv4(value: string) {
  return /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/.test(value);
}

function isPrivateIpv4(value: string) {
  return (
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    /^127\./.test(value) ||
    /^169\.254\./.test(value) ||
    value === "0.0.0.0"
  );
}

function isValidPrimaryIpv4(value: string) {
  return isPrivateIpv4(value) && !/^127\./.test(value) && !/^169\.254\./.test(value) && value !== "0.0.0.0";
}

function walkValues(input: unknown, visit: (value: string, keyPath: string[]) => void, keyPath: string[] = []) {
  if (typeof input === "string") {
    visit(input, keyPath);
    return;
  }

  if (Array.isArray(input)) {
    input.forEach((value, index) => walkValues(value, visit, [...keyPath, String(index)]));
    return;
  }

  if (!isRecord(input)) return;

  Object.entries(input).forEach(([key, value]) => {
    const nextPath = [...keyPath, key];
    if (typeof value === "string") {
      visit(value, nextPath);
      return;
    }
    walkValues(value, visit, nextPath);
  });
}

function extractIpv4Candidates(input: unknown) {
  const ipv4Pattern = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
  const matches = new Set<string>();

  walkValues(input, (value) => {
    const found = value.match(ipv4Pattern) ?? [];
    found.forEach((entry) => matches.add(entry));
  });

  return Array.from(matches);
}

function extractPreferredString(input: unknown, preferredKeys: string[]) {
  const preferred = new Set(preferredKeys.map((key) => key.toLowerCase()));
  let found: string | null = null;

  walkValues(input, (value, keyPath) => {
    if (found) return;
    const lastKey = keyPath[keyPath.length - 1]?.toLowerCase();
    if (!lastKey || !preferred.has(lastKey)) return;
    const normalized = normalizeString(value);
    if (normalized) found = normalized;
  });

  return found;
}

function pickFirstIpv4(value: string | null, predicate?: (ip: string) => boolean) {
  if (!value) return null;
  const match = value.match(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/);
  if (!match) return null;
  const ip = match[0];
  if (!isIpv4(ip)) return null;
  if (predicate && !predicate(ip)) return null;
  return ip;
}

export type RemoteNetworkFields = {
  localIpv4: string | null;
  publicIpv4: string | null;
  localGateway: string | null;
};

export function resolveRemoteNetworkFields(input: {
  networkSnapshot: Record<string, unknown> | null;
  systemSnapshot: Record<string, unknown> | null;
  lastKnownIp: string | null;
}): RemoteNetworkFields {
  const { networkSnapshot, systemSnapshot, lastKnownIp } = input;

  const explicitLocal = pickFirstIpv4(
    extractPreferredString(networkSnapshot, [
      "localIp",
      "localIpv4",
      "ipv4",
      "ipV4",
      "primaryIp",
      "privateIp",
      "lanIp",
      "localAddress",
    ]),
    isValidPrimaryIpv4,
  );

  const explicitPublic = pickFirstIpv4(
    extractPreferredString(networkSnapshot, [
      "publicIp",
      "publicIpv4",
      "externalIp",
      "internetIp",
      "wanIp",
      "publicAddress",
      "externalAddress",
    ]),
    (ip) => !isPrivateIpv4(ip),
  );

  const explicitGateway = pickFirstIpv4(
    extractPreferredString(networkSnapshot, [
      "gateway",
      "defaultGateway",
      "gatewayIp",
      "routerIp",
      "routerGateway",
      "localGateway",
    ]),
    isValidPrimaryIpv4,
  );

  const allCandidates = [
    ...extractIpv4Candidates(networkSnapshot),
    ...extractIpv4Candidates(systemSnapshot),
  ];

  const validLocalCandidates = allCandidates.filter(isValidPrimaryIpv4);
  const publicCandidates = allCandidates.filter((ip) => !isPrivateIpv4(ip));
  const normalizedLastKnownIp = normalizeString(lastKnownIp);

  const localIpv4 =
    explicitLocal ??
    validLocalCandidates[0] ??
    (normalizedLastKnownIp && isValidPrimaryIpv4(normalizedLastKnownIp) ? normalizedLastKnownIp : null);

  const publicIpv4 =
    explicitPublic ??
    publicCandidates[0] ??
    (normalizedLastKnownIp && !isPrivateIpv4(normalizedLastKnownIp) ? normalizedLastKnownIp : null);

  const localGateway =
    explicitGateway ??
    validLocalCandidates.find((ip) => ip !== localIpv4) ??
    null;

  return {
    localIpv4,
    publicIpv4,
    localGateway,
  };
}
