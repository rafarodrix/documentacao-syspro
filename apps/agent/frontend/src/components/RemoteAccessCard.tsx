import { CopyButton } from "./CopyButton";
import { MonitorIcon } from "./icons";
import { formatRustDeskId, formatSetupCopy } from "../features/setup/setup-helpers";

type RemoteAccessCardProps = {
  rustdeskId?: string;
  status?: "ready" | "pending" | "offline";
  statusText?: string | null;
  lastSyncAt?: string | null;
};

export function RemoteAccessCard({ rustdeskId, status = "pending", statusText, lastSyncAt }: RemoteAccessCardProps) {
  const hasId = Boolean(rustdeskId);
  const formattedId = rustdeskId ? formatRustDeskId(rustdeskId) : null;
  const pillLabel = status === "ready" ? "Disponivel" : status === "offline" ? "Indisponivel" : hasId ? "Pronto para vinculo" : "Configurando";
  const detail = statusText?.trim()
    ? formatSetupCopy(statusText.trim())
    : status === "ready"
      ? "Acesso remoto pronto para uso."
      : hasId
        ? "Acesso remoto preparado nesta maquina. O portal ainda precisa concluir o vinculo empresarial."
        : "Aguardando bootstrap tecnico e sincronizacao inicial do RustDesk.";

  return (
    <div className="remote-access-card">
      <div className="remote-access-card-inner">
        <div className="remote-access-card-head">
          <div className="remote-access-card-title">
            <MonitorIcon />
            Acesso remoto
          </div>
          <span className={`remote-access-pill ${status === "ready" ? "ready" : status === "offline" ? "offline" : "configuring"}`}>
            <span className="remote-access-pill-dot" />
            {pillLabel}
          </span>
        </div>

        <div className="remote-access-detail">{detail}</div>

        <div className="remote-id-row">
          <div className={`remote-id-display ${!hasId ? "dim" : ""}`}>
            {formattedId ?? "Aguardando vinculacao"}
          </div>
          {hasId ? <CopyButton value={rustdeskId ?? ""} label="Copiar ID" tone="dark" /> : null}
        </div>

        <div className="remote-access-footer">
          <span className="remote-access-footer-label">ID RustDesk</span>
          <span className="remote-access-footer-value">
            {lastSyncAt?.trim() ? `Ultima comunicacao registrada em ${new Date(lastSyncAt).toLocaleString("pt-BR")}` : hasId ? "Sem sync autenticado ainda. O discover segue ativo ate o vinculo." : "Sem sincronizacao registrada ainda."}
          </span>
        </div>
      </div>
    </div>
  );
}
