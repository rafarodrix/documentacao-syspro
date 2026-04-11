import { NextResponse } from "next/server";
import { remoteErrorResponse } from "@/app/api/remote/_shared/remote-domain-error";
import { requireRemotePermission } from "@/app/api/remote/_shared/remote-access";
import { fetchRemoteModuleSettingsGateway } from "@/features/settings/infrastructure/settings.gateway";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireRemotePermission("tools:all", "Sem permissao.");
  if (!access.ok) {
    return access.response;
  }

  try {
    const settingsResponse = await fetchRemoteModuleSettingsGateway();
    if (!settingsResponse.success || !settingsResponse.data) {
      return remoteErrorResponse("Nao foi possivel carregar o perfil do cliente RustDesk.", 500);
    }

    const settings = settingsResponse.data;
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
          bootstrapEndpoint: `${portalBaseUrl}/api/remote/rustdesk/bootstrap`,
          syncEndpoint: `${portalBaseUrl}/api/remote/rustdesk/sync`,
          ackEndpoint: `${portalBaseUrl}/api/remote/rustdesk/ack`,
        },
        notes: [
          "Use o bootstrap autenticado para emissao de agentToken e inicio do ciclo de sync.",
          "No cliente customizado, aplique serverIdRelay/serverApi/key/serverConfig como defaults.",
          "O fluxo discover permanece apenas para triagem sem autenticar operacao recorrente.",
        ],
      },
    });
  } catch {
    return remoteErrorResponse("Nao foi possivel carregar o perfil do cliente RustDesk.", 500);
  }
}
