import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { getRemoteModuleSettingsSnapshot } from "@/features/remote/application/module-settings";

export const dynamic = "force-dynamic";

function canManageRemote(role: string) {
  return role === "ADMIN" || role === "SUPORTE" || role === "DEVELOPER";
}

export async function GET(request: Request) {
  const session = await getProtectedSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Nao autorizado." }, { status: 401 });
  }
  if (!canManageRemote(session.role)) {
    return NextResponse.json({ success: false, error: "Sem permissao." }, { status: 403 });
  }

  const settings = await getRemoteModuleSettingsSnapshot();
  const serverHost = settings.rustDeskServerHost.trim();
  const apiHost = serverHost;
  const key = settings.rustDeskPublicKey.trim();
  const serverConfig = settings.rustDeskServerConfig.trim();
  const targetVersion = settings.rustDeskVersion.trim();
  const defaultPassword = settings.defaultPassword;
  const portalBaseUrl = new URL(request.url).origin;

  return NextResponse.json({
    success: true,
    data: {
      contractVersion: "rustdesk.client-profile.v1",
      profile: {
        serverIdRelay: serverHost,
        serverApi: apiHost,
        key,
        serverConfig,
        targetVersion,
        defaultPassword,
      },
      commands: {
        hostInstallerTemplate: `${portalBaseUrl}/api/remote/hosts/{hostId}/installer`,
        bootstrapEndpoint: `${portalBaseUrl}/api/remote/rustdesk/bootstrap`,
        syncEndpoint: `${portalBaseUrl}/api/remote/rustdesk/sync`,
        ackEndpoint: `${portalBaseUrl}/api/remote/rustdesk/ack`,
      },
      notes: [
        "Use o instalador por host para emissao de agentToken e agendamento do sync.",
        "No cliente customizado, aplique serverIdRelay/serverApi/key/serverConfig como defaults.",
        "O fluxo discover permanece apenas para triagem sem autenticar operacao recorrente.",
      ],
    },
  });
}

