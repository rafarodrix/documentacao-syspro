import { CopyButton } from "./CopyButton";
import { MonitorIcon } from "./icons";
import { formatRustDeskId } from "../features/setup/setup-helpers";

type RemoteAccessCardProps = {
  rustdeskId?: string;
};

export function RemoteAccessCard({ rustdeskId }: RemoteAccessCardProps) {
  const hasId = Boolean(rustdeskId);
  const formattedId = rustdeskId ? formatRustDeskId(rustdeskId) : null;

  return (
    <div className="remote-access-card">
      <div className="remote-access-card-inner">
        <div className="remote-access-card-head">
          <div className="remote-access-card-title">
            <MonitorIcon />
            ID de acesso remoto
          </div>
          <span className={`remote-access-pill ${hasId ? "ready" : "configuring"}`}>
            <span className="remote-access-pill-dot" />
            {hasId ? "Pronto" : "Configurando"}
          </span>
        </div>

        <div className="remote-id-row">
          <div className={`remote-id-display ${!hasId ? "dim" : ""}`}>
            {formattedId ?? "--- --- ---"}
          </div>
          {hasId ? <CopyButton value={rustdeskId ?? ""} label="Copiar ID" tone="dark" /> : null}
        </div>

        <div className="remote-pw-row">
          <span className="remote-pw-label">Senha</span>
          <span className="remote-pw-value">
            {hasId ? "Disponivel no app de suporte" : "Aguardando configuracao"}
          </span>
        </div>
      </div>
    </div>
  );
}
