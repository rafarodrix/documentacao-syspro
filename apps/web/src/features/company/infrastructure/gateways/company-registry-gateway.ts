import {
  type CompanyRegistryProfile,
  type CompanyRegistryGatewayRepository,
} from "@/features/company/domain/repositories/company-registry.gateway";

const PROVIDER = process.env.COMPANY_REGISTRY_PROVIDER?.toLowerCase() ?? "none";
const AUTH_URL = process.env.COMPANY_REGISTRY_AUTH_URL;
const LOOKUP_URL = process.env.COMPANY_REGISTRY_LOOKUP_URL;
const CLIENT_ID = process.env.COMPANY_REGISTRY_CLIENT_ID;
const CLIENT_SECRET = process.env.COMPANY_REGISTRY_CLIENT_SECRET;
const SCOPE = process.env.COMPANY_REGISTRY_SCOPE;
const AUDIENCE = process.env.COMPANY_REGISTRY_AUDIENCE;
const TIMEOUT_MS = Number(process.env.COMPANY_REGISTRY_TIMEOUT_MS ?? 12000);

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("/");
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

type RegistryPayload = Record<string, unknown>;

function asRecord(value: unknown): RegistryPayload {
  return value && typeof value === "object" ? (value as RegistryPayload) : {};
}

function normalizeRegistryPayload(payload: unknown, fallbackCnpj: string): CompanyRegistryProfile {
  const payloadRecord = asRecord(payload);
  const addressSource = asRecord(
    payloadRecord.address ?? payloadRecord.endereco ?? payloadRecord.estabelecimento ?? payloadRecord,
  );
  const cnaeSource = asRecord(
    payloadRecord.primaryCnae ?? payloadRecord.cnaePrincipal ?? payloadRecord.atividade_principal ?? payloadRecord,
  );

  return {
    cnpj: onlyDigits(firstString(payloadRecord.cnpj, payloadRecord.documento, fallbackCnpj) ?? fallbackCnpj),
    legalName: firstString(
      payloadRecord.legalName,
      payloadRecord.razaoSocial,
      payloadRecord.razao_social,
      payloadRecord.nomeEmpresarial,
      payloadRecord.nome_empresarial,
      payloadRecord.name,
    ) ?? "",
    tradeName: firstString(payloadRecord.tradeName, payloadRecord.nomeFantasia, payloadRecord.nome_fantasia, payloadRecord.fantasia),
    status: firstString(payloadRecord.status, payloadRecord.situacaoCadastral, payloadRecord.situacao_cadastral),
    openingDate: normalizeDate(
      firstString(payloadRecord.openingDate, payloadRecord.dataAbertura, payloadRecord.data_abertura),
    ),
    primaryCnae: firstString(
      cnaeSource.code,
      cnaeSource.codigo,
      payloadRecord.cnae,
      payloadRecord.cnaePrincipalCodigo,
      payloadRecord.cnae_principal_codigo,
    ),
    primaryCnaeDescription: firstString(
      cnaeSource.description,
      cnaeSource.descricao,
      payloadRecord.cnaeDescricao,
      payloadRecord.cnae_descricao,
      payloadRecord.cnaePrincipalDescricao,
      payloadRecord.cnae_principal_descricao,
    ),
    email: firstString(payloadRecord.email, asRecord(payloadRecord.contato).email),
    phone: firstString(payloadRecord.phone, payloadRecord.telefone, asRecord(payloadRecord.contato).telefone),
    address: {
      cep: onlyDigits(firstString(addressSource.cep, payloadRecord.cep) ?? ""),
      street: firstString(addressSource.street, addressSource.logradouro),
      number: firstString(addressSource.number, addressSource.numero),
      complement: firstString(addressSource.complement, addressSource.complemento),
      district: firstString(addressSource.district, addressSource.bairro),
      city: firstString(addressSource.city, addressSource.cidade, addressSource.municipio),
      state: firstString(addressSource.state, addressSource.estado, addressSource.uf)?.toUpperCase(),
      country: firstString(addressSource.country, addressSource.pais) ?? "BR",
    },
    raw: payloadRecord,
  };
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

class DisabledCompanyRegistryGateway implements CompanyRegistryGatewayRepository {
  isConfigured() {
    return false;
  }

  getProviderLabel() {
    return "Nao configurado";
  }

  async getProfileByCnpj(): Promise<CompanyRegistryProfile> {
    throw new Error("Integracao oficial de CNPJ nao configurada.");
  }
}

class CustomOAuth2CompanyRegistryGateway implements CompanyRegistryGatewayRepository {
  isConfigured() {
    return Boolean(AUTH_URL && LOOKUP_URL && CLIENT_ID && CLIENT_SECRET);
  }

  getProviderLabel() {
    return "Integracao oficial de CNPJ";
  }

  private async getAccessToken() {
    if (!AUTH_URL || !CLIENT_ID || !CLIENT_SECRET) {
      throw new Error("Credenciais da integracao de CNPJ nao configuradas.");
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    if (SCOPE) body.set("scope", SCOPE);
    if (AUDIENCE) body.set("audience", AUDIENCE);

    const response = await fetchWithTimeout(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Falha ao autenticar no provedor CNPJ [${response.status}].`);
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      throw new Error("Token de acesso nao retornado pela integracao de CNPJ.");
    }

    return data.access_token;
  }

  async getProfileByCnpj(cnpj: string) {
    if (!this.isConfigured() || !LOOKUP_URL) {
      throw new Error("Integracao oficial de CNPJ nao configurada.");
    }

    const normalizedCnpj = onlyDigits(cnpj);
    const token = await this.getAccessToken();
    const resolvedUrl = LOOKUP_URL.includes("{cnpj}")
      ? LOOKUP_URL.replace("{cnpj}", normalizedCnpj)
      : `${LOOKUP_URL}${LOOKUP_URL.includes("?") ? "&" : "?"}cnpj=${normalizedCnpj}`;

    const response = await fetchWithTimeout(resolvedUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar CNPJ no provedor oficial [${response.status}].`);
    }

    const payload = await response.json();
    const normalized = normalizeRegistryPayload(payload, normalizedCnpj);
    if (!normalized.legalName) {
      throw new Error("O provedor retornou dados sem razao social normalizavel.");
    }

    return normalized;
  }
}

export const CompanyRegistryGateway: CompanyRegistryGatewayRepository =
  PROVIDER === "custom_oauth2"
    ? new CustomOAuth2CompanyRegistryGateway()
    : new DisabledCompanyRegistryGateway();

