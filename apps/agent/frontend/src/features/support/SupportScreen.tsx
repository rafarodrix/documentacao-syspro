import { useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "../../components/CopyButton";
import { ShieldIcon } from "../../components/icons";
import type { AgentSetupViewModel, SetupStepView, AgentSupportViewModel } from "../../types/agent-ui";
import { formatSetupCopy, getSetupDetail, getSetupHeadline, getSetupHint } from "../setup/setup-helpers";
import {
  buildOperationalStatusRows,
  formatRelativeTime,
  formatRemoteId,
  getRemoteActionLabel,
  getRemoteOperationalHint,
  summarizeOperationalHealth,
  truncateIdentifier,
} from "./support-helpers";
import { mountChatwootEmbed, openChatwootInline } from "./chatwoot";

type SetupOverallState = "complete" | "error" | "running" | "idle";
type SupportPanel = "diagnostics" | "details" | "about" | null;

type SupportScreenProps = {
  supportView: AgentSupportViewModel | null;
  setupView: AgentSetupViewModel;
  activeStep?: SetupStepView | null;
  setupOverallState: SetupOverallState;
  chatwootReady: boolean;
  chatwootLoading: boolean;
  remoteOpening: boolean;
  onOpenRemote: () => void;
  onOpenSetup: () => void;
  onOpenSupport: () => void;
};

export function SupportScreen(props: SupportScreenProps) {
  const {
    supportView,
    setupView,
    activeStep,
    setupOverallState,
    chatwootReady,
    chatwootLoading,
    remoteOpening,
    onOpenRemote,
    onOpenSetup,
    onOpenSupport,
  } = props;
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [chatDrawerExpanded, setChatDrawerExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<SupportPanel>(null);
  const remote = supportView?.capabilities.remote ?? null;
  const chatConfigured = Boolean(supportView?.channel.configured);
  const setupHeadline = getSetupHeadline(setupView, activeStep, setupOverallState);
  const setupDetail = getSetupDetail(setupView, activeStep, setupOverallState);
  const setupHint = getSetupHint(setupView, activeStep);

  const remoteReady = Boolean(remote?.ready && remote?.externalId);
  const companyName = supportView?.installation.companyName ?? "Cliente Trilink";
  const machineName = supportView?.device.machineName || supportView?.device.hostname || "Dispositivo em preparacao";
  const agentVersion = supportView?.device.agentVersion || "-";
  const lastCommunication = formatRelativeTime(remote?.lastSyncAt);
  const connectivityLine = buildConnectivityLine(setupView.complete, lastCommunication);
  const remoteActionLabel = getRemoteActionLabel(remote, remoteOpening);
  const remoteOperationalHint = getRemoteOperationalHint(remote);
  const healthSummary = summarizeOperationalHealth(setupView, supportView);
  const statusRows = useMemo(() => buildOperationalStatusRows(setupView, supportView), [setupView, supportView]);
  const chatStateLabel = !chatConfigured
    ? "Canal nao configurado"
    : chatwootLoading
      ? "Conectando atendimento"
      : chatwootReady
        ? "Canal pronto"
        : "Canal sob demanda";

  useEffect(() => {
    if (!chatwootReady || !chatDrawerOpen) return;
    mountChatwootEmbed(chatContainerRef.current);
    openChatwootInline();
  }, [chatDrawerOpen, chatwootReady, supportView?.channel.websiteToken]);

  const openSupportDrawer = () => {
    setChatDrawerOpen(true);
    setChatDrawerExpanded(false);
    onOpenSupport();
  };

  const togglePanel = (panel: SupportPanel) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  return (
    <main className={`panel support-panel operational ${chatDrawerOpen ? "chat-open" : ""}`}>
      <section className="support-hero operational compact">
        <div className="support-hero-copy operational compact">
          <h1 className="support-hero-title operational compact">{machineName}</h1>
          <p className="support-hero-subtitle operational compact">{companyName}</p>
          <p className="support-hero-meta operational compact">{connectivityLine}</p>
        </div>
      </section>

      <section className="support-body operational compact">
        {!setupView.complete ? (
          <div className={`support-diagnostic-card state-${setupOverallState}`}>
            <div className="support-diagnostic-header">
              <div className="support-diagnostic-copy">
                <span className="support-summary-label">Provisionamento em andamento</span>
                <div className="support-diagnostic-title">{setupHeadline}</div>
              </div>
              <button type="button" className="timeline-toggle" onClick={onOpenSetup}>
                <span className="timeline-toggle-icon">+</span>
                Ver setup
              </button>
            </div>
            <div className="support-diagnostic-detail">{setupDetail}</div>
            {remote?.statusText ? (
              <div className="support-diagnostic-meta">Estado reportado pelo agent: {formatSetupCopy(remote.statusText)}</div>
            ) : null}
            {setupHint ? <div className="support-diagnostic-callout">{setupHint}</div> : null}
            {setupView.lastError ? (
              <div className="support-diagnostic-error">Ultimo erro: {formatSetupCopy(setupView.lastError)}</div>
            ) : null}
          </div>
        ) : null}

        <section className="support-remote-card compact">
          <div className="support-card-kicker">Acesso remoto</div>
          <div className="support-remote-state-row">
            <div className={`support-health-bullet tone-${healthSummary.tone}`} />
            <div className="support-remote-state-text">
              {remoteReady ? "RustDesk disponivel" : remote?.status === "pending" ? "RustDesk em configuracao" : "RustDesk indisponivel"}
            </div>
          </div>

          <div className="support-remote-id-row compact">
            <div className="support-remote-id-value mono">{formatRemoteId(remote?.externalId)}</div>
            {remote?.externalId ? <CopyButton value={remote.externalId} label="Copiar ID remoto" /> : null}
          </div>

          <div className="support-remote-actions compact">
            <button
              type="button"
              className={`btn-primary btn-primary-inline ${remoteOpening ? "btn-loading" : ""}`}
              onClick={onOpenRemote}
              disabled={remoteOpening || !remoteReady}
            >
              {remoteOpening ? <span className="btn-spinner" /> : null}
              <span>{remoteActionLabel}</span>
            </button>
          </div>
        </section>

        <section className="support-health-card compact">
          <button
            type="button"
            className="support-health-summary"
            onClick={() => togglePanel("diagnostics")}
          >
            <span className={`support-health-bullet tone-${healthSummary.tone}`} />
            <span className="support-health-summary-text">{healthSummary.summary}</span>
          </button>
        </section>

        <section className="support-support-card compact">
          <button
            type="button"
            className={`btn-secondary-inline support-support-button ${chatwootLoading ? "btn-loading" : ""}`}
            onClick={openSupportDrawer}
            disabled={chatwootLoading || !chatConfigured}
          >
            {chatwootLoading ? <span className="btn-spinner btn-spinner-dark" /> : null}
            <span>Solicitar suporte</span>
          </button>
        </section>

        <div className="support-footer-actions">
          <button type="button" className="support-footer-link" onClick={() => togglePanel("diagnostics")}>
            Diagnostico
          </button>
          <span className="support-footer-separator">·</span>
          <button type="button" className="support-footer-link" onClick={() => togglePanel("details")}>
            Detalhes
          </button>
          <span className="support-footer-separator">·</span>
          <button type="button" className="support-footer-link" onClick={() => togglePanel("about")}>
            Sobre
          </button>
        </div>

        {activePanel === "diagnostics" ? (
          <section className="support-detail-panel">
            <div className="support-card-kicker">Diagnostico</div>
            <div className="support-panel-title">{healthSummary.summary}</div>
            {healthSummary.issues.length > 0 ? (
              <div className="support-issue-list">
                {healthSummary.issues.map((issue) => (
                  <div key={issue} className="support-issue-row">
                    <span className="support-health-bullet tone-warn" />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="support-panel-copy">Nenhuma excecao operacional relevante no momento.</div>
            )}

            <div className="support-component-list compact">
              {statusRows.map((row) => (
                <div key={row.label} className="support-component-row compact">
                  <span className="support-component-label">{row.label}</span>
                  <span className={`support-component-value tone-${row.tone}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {!remoteReady ? <div className="support-panel-copy">{remoteOperationalHint}</div> : null}
          </section>
        ) : null}

        {activePanel === "details" ? (
          <section className="support-detail-panel">
            <div className="support-card-kicker">Detalhes</div>
            <div className="support-panel-title">Detalhes do agent</div>
            <div className="support-technical-grid compact">
              <div className="support-technical-row compact">
                <span className="support-technical-label">Dispositivo</span>
                <span className="support-technical-value">{machineName}</span>
              </div>
              <div className="support-technical-row compact">
                <span className="support-technical-label">Empresa</span>
                <span className="support-technical-value">{companyName}</span>
              </div>
              <div className="support-technical-row compact">
                <span className="support-technical-label">Operador local</span>
                <span className="support-technical-value">{supportView?.device.localUsername || "-"}</span>
              </div>
              <div className="support-technical-row compact">
                <span className="support-technical-label">Versao do agent</span>
                <span className="support-technical-value">{agentVersion}</span>
              </div>
              <div className="support-technical-row compact">
                <span className="support-technical-label">Sistema operacional</span>
                <span className="support-technical-value">{supportView?.device.os || "-"}</span>
              </div>
              <div className="support-technical-row compact">
                <span className="support-technical-label">Host alias</span>
                <span className="support-technical-value">{supportView?.installation.hostAlias || "-"}</span>
              </div>
              <div className="support-technical-row compact">
                <span className="support-technical-label">Device ID</span>
                <span className="support-technical-value mono">{truncateIdentifier(supportView?.device.deviceId)}</span>
                {supportView?.device.deviceId ? <CopyButton value={supportView.device.deviceId} label="Copiar device ID" /> : null}
              </div>
              <div className="support-technical-row compact">
                <span className="support-technical-label">Host ID</span>
                <span className="support-technical-value mono">{truncateIdentifier(supportView?.installation.hostId)}</span>
                {supportView?.installation.hostId ? <CopyButton value={supportView.installation.hostId} label="Copiar host ID" /> : null}
              </div>
            </div>

            <div className="support-inline-buttons">
              <button type="button" className="support-footer-link emphasized" onClick={onOpenSetup}>
                Historico do provisionamento
              </button>
            </div>
          </section>
        ) : null}

        {activePanel === "about" ? (
          <section className="support-detail-panel">
            <div className="support-card-kicker">Sobre</div>
            <div className="support-panel-title">Trilink Agent</div>
            <div className="support-issue-list">
              <div className="support-issue-row">
                <span className="support-technical-label">Versao do servico</span>
                <span className="support-technical-value">{agentVersion}</span>
              </div>
              <div className="support-issue-row">
                <span className="support-technical-label">Canal de suporte</span>
                <span className="support-technical-value">{chatConfigured ? "Disponivel sob demanda" : "Nao configurado"}</span>
              </div>
              <div className="support-issue-row">
                <span className="support-technical-label">Acesso remoto</span>
                <span className="support-technical-value">{remoteReady ? "RustDesk disponivel" : "Dependente de configuracao"}</span>
              </div>
            </div>
            <div className="support-panel-copy">
              Uma solicitacao de suporte pode exigir sua confirmacao no RustDesk.
            </div>
          </section>
        ) : null}
      </section>

      <div
        className={`support-chat-scrim ${chatDrawerOpen ? "open" : ""}`}
        onClick={() => {
          setChatDrawerOpen(false);
          setChatDrawerExpanded(false);
        }}
      />

      <div className={`support-chat-drawer ${chatDrawerOpen ? "open" : ""} ${chatDrawerExpanded ? "expanded" : ""}`}>
        <div className="support-chat-shell-header">
          <div className="support-chat-shell-header-copy">
            <div className="support-chat-shell-title">Chat Trilink</div>
            <div className="support-chat-shell-subtitle">{chatStateLabel}</div>
          </div>
          <div className="support-chat-shell-actions">
            <span className={`support-chat-state-pill ${chatwootReady ? "ready" : chatwootLoading ? "loading" : "idle"}`}>
              {remoteReady ? "RustDesk disponivel" : "Suporte sob demanda"}
            </span>
            <button
              type="button"
              className="support-chat-drawer-action"
              onClick={() => setChatDrawerExpanded((value) => !value)}
              title={chatDrawerExpanded ? "Recolher atendimento" : "Expandir atendimento"}
            >
              {chatDrawerExpanded ? "Recolher" : "Expandir"}
            </button>
            <button
              type="button"
              className="support-chat-drawer-close"
              onClick={() => {
                setChatDrawerOpen(false);
                setChatDrawerExpanded(false);
              }}
              title="Ocultar atendimento"
            >
              Fechar
            </button>
          </div>
        </div>

        <div ref={chatContainerRef} className="support-chat-embed">
          {!chatwootReady ? (
            <div className="support-chat-placeholder">
              <ShieldIcon />
              <div className="support-chat-placeholder-copy">
                <div className="support-chat-placeholder-title">{chatStateLabel}</div>
                <div className="support-chat-placeholder-text">
                  {chatConfigured
                    ? "A conversa sera exibida diretamente nesta area."
                    : "Configure o Chatwoot para habilitar o atendimento neste painel."}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function buildConnectivityLine(ready: boolean, lastCommunication: string): string {
  if (!ready) {
    return lastCommunication ? `Provisionando · atualizado ${lastCommunication}` : "Provisionando";
  }
  if (!lastCommunication) {
    return "Online";
  }
  return `Online · atualizado ${lastCommunication}`;
}
