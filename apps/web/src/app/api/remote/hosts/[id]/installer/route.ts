import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getRemoteTenantScope } from "@/features/remote/application/scope";

export const dynamic = "force-dynamic";

function canManageHost(role: string): boolean {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

function buildScopedWhere(companyIds: string[], isGlobalView: boolean) {
  return isGlobalView ? {} : { companyId: { in: companyIds.length ? companyIds : ["__none__"] } };
}

function escapePowerShell(value: string | null | undefined) {
  return (value ?? "").replace(/'/g, "''");
}

function buildInstallerScript(input: {
  portalBaseUrl: string;
  installToken: string;
  companyName: string;
  hostName: string;
  description: string | null;
  rustdeskId: string | null;
  environment: string | null;
}) {
  const description = input.description?.trim() || "Sem descricao operacional cadastrada.";
  const rustdeskId = input.rustdeskId?.trim() || "";
  const environment = input.environment?.trim() || "";

  return [
    "# Trilink Remote Agent OSS",
    `# Empresa: ${input.companyName}`,
    `# Host: ${input.hostName}`,
    `# Descricao da maquina: ${description}`,
    "",
    "$portalBaseUrl = '" + escapePowerShell(input.portalBaseUrl) + "'",
    "$installToken = '" + escapePowerShell(input.installToken) + "'",
    "$companyName = '" + escapePowerShell(input.companyName) + "'",
    "$hostName = '" + escapePowerShell(input.hostName) + "'",
    "$hostDescription = '" + escapePowerShell(description) + "'",
    "$machineName = $env:COMPUTERNAME",
    "$agentVersion = 'rustdesk-oss-local'",
    "$environment = '" + escapePowerShell(environment) + "'",
    "$rustDeskId = '" + escapePowerShell(rustdeskId) + "'",
    "",
    "if ([string]::IsNullOrWhiteSpace($rustDeskId)) {",
    "  Write-Host 'Informe o RustDesk ID da maquina antes de executar o registro.' -ForegroundColor Yellow",
    "  $rustDeskId = Read-Host 'RustDesk ID'",
    "}",
    "",
    "if ([string]::IsNullOrWhiteSpace($machineName)) {",
    "  $machineName = Read-Host 'Nome da maquina'",
    "}",
    "",
    "$payloadRegister = @{",
    "  installToken = $installToken",
    "  rustdeskId = (($rustDeskId -replace '\\s+', '').Trim())",
    "  machineName = $machineName",
    "  agentVersion = $agentVersion",
    "  environment = $environment",
    "}",
    "",
    "$payloadHeartbeat = @{",
    "  installToken = $installToken",
    "  rustdeskId = (($rustDeskId -replace '\\s+', '').Trim())",
    "  machineName = $machineName",
    "  agentVersion = $agentVersion",
    "}",
    "",
    "Write-Host \"Empresa: $companyName\"",
    "Write-Host \"Host: $hostName\"",
    "Write-Host \"Descricao: $hostDescription\"",
    "Write-Host \"Registrando agente no portal...\"",
    "Invoke-RestMethod -Method Post -Uri \"$portalBaseUrl/api/remote/agents/register\" -ContentType 'application/json' -Body ($payloadRegister | ConvertTo-Json -Depth 5)",
    "",
    "Write-Host 'Enviando heartbeat inicial...'",
    "Invoke-RestMethod -Method Post -Uri \"$portalBaseUrl/api/remote/agents/heartbeat\" -ContentType 'application/json' -Body ($payloadHeartbeat | ConvertTo-Json -Depth 5)",
    "",
    "Write-Host 'Registro concluido. Se quiser heartbeat continuo, use o script base em scripts/remote-agent-oss.ps1.' -ForegroundColor Green",
    "",
  ].join("\r\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }

  if (!canManageHost(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao para baixar instalador." }, { status: 403 });
  }

  const tenantScope = await getRemoteTenantScope();
  const { id } = await params;
  const scopedWhere = buildScopedWhere(tenantScope.companyIds, tenantScope.isGlobalView);
  const host = await prisma.remoteHost.findFirst({
    where: {
      id,
      ...scopedWhere,
    },
    include: {
      company: {
        select: {
          nomeFantasia: true,
          razaoSocial: true,
        },
      },
    },
  });

  if (!host) {
    return NextResponse.json({ success: false, error: "Host remoto nao encontrado." }, { status: 404 });
  }

  if (!host.installToken) {
    return NextResponse.json({ success: false, error: "Host sem installToken configurado." }, { status: 409 });
  }

  const portalBaseUrl = new URL(request.url).origin;
  const companyName = host.company.nomeFantasia ?? host.company.razaoSocial;
  const script = buildInstallerScript({
    portalBaseUrl,
    installToken: host.installToken,
    companyName,
    hostName: host.name,
    description: host.description,
    rustdeskId: host.agentExternalId,
    environment: host.environment,
  });

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="remote-agent-${host.id}.ps1"`,
      "Cache-Control": "no-store",
    },
  });
}
