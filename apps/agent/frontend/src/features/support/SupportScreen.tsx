import { useEffect, useRef, useState } from "react";
import { CopyButton } from "../../components/CopyButton";
import { ChatBubbleIcon, MonitorIcon, ShieldIcon } from "../../components/icons";
import type { AgentSetupViewModel, SetupStepView, AgentSupportViewModel } from "../../types/agent-ui";
import { formatSetupCopy, getSetupDetail, getSetupHeadline, getSetupHint } from "../setup/setup-helpers";
import {
  buildOperationalStatusRows,
  formatRelativeTime,
  formatRemoteId,
  getRemoteActionLabel,
  getRemoteOperationalHint,
  getRemoteOperationalLabel,
  resolveSupportBannerState,
  truncateIdentifier,
} from "./support-helpers";
import { mountChatwootEmbed, openChatwootInline } from "./chatwoot";

type SetupOverallState = "complete" | "error" | "running" | "idle";

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
  const remote = supportView?.capabilities.remote ?? null;
  const chatConfigured = Boolean(supportView?.channel.configured);
  const banner = resolveSupportBannerState(setupView, supportView);
  const setupHeadline = getSetupHeadline(setupView, activeStep, setupOverallState);
  const setupDetail = getSetupDetail(setupView, activeStep, setupOverallState);
  const setupHint = getSetupHint(setupView, activeStep);

  const remoteReady = Boolean(remote?.ready && remote?.externalId);
  const companyName = supportView?.installation.companyName ?? "Cliente Trilink";
  const machineName = supportView?.device.machineName || supportView?.device.hostname || "Dispositivo em preparacao";
  const operatorName = supportView?.device.localUsername || "Operador local";
  const lastCommunication = formatRelativeTime(remote?.lastSyncAt);
  const remoteActionLabel = getRemoteActionLabel(remote, remoteOpening);
  const remoteOperationalLabel = getRemoteOperationalLabel(remote);
  const remoteOperationalHint = getRemoteOperationalHint(remote);
  const remoteStateLabel = remoteOperationalLabel === "Operacional" ? "Acesso remoto disponivel" : remoteOperationalLabel;
  const chatStateLabel = !chatConfigured
    ? "Canal nao configurado"
    : chatwootLoading
      ? "Conectando atendimento"
      : chatwootReady
        ? "Canal pronto"
        : "Canal sob demanda";
  const statusRows = buildOperationalStatusRows(setupView, supportView);

  useEffect(() => {
    if (!chatwootReady || !chatDrawerOpen) return;
    mountChatwootEmbed(chatContainerRef.current);
    openChatwootInline();
  }, [chatDrawerOpen, chatwootReady, supportView?.channel.websiteToken]);

  const toggleSupportDrawer = () => {
    if (chatDrawerOpen) {
      setChatDrawerOpen(false);
      setChatDrawerExpanded(false);
      return;
    }

    setChatDrawerOpen(true);
    setChatDrawerExpanded(false);
    onOpenSupport();
  };

  return (
    <main className={`panel support-panel operational ${chatDrawerOpen ? "chat-open" : ""}`}>
      <section className="support-hero operational">
        <div className="support-hero-copy operational">
          <span className="support-hero-eyebrow operational">Painel operacional</span>
          <h1 className="support-hero-title operational">{machineName}</h1>
          <p className="support-hero-subtitle operational">{companyName}</p>
          <p className="support-hero-meta operational">
            {lastCommunication ? `Ultima comunicacao ${lastCommunication}` : "Sem confirmacao recente de comunicacao com o portal."}
          </p>
        </div>

        <div className={`support-operational-badge state-${banner.tone}`}>
          <span className="support-operational-badge-dot" />
          <span>{banner.label}</span>
        </div>
      </section>

      <section className="support-body operational">
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

        <section className="support-operational-grid">
          <article className="support-operational-card support-operational-card-primary">
            <div className="support-card-kicker">Dispositivo</div>
            <div className="support-card-title">{machineName}</div>
            <div className="support-card-detail">{banner.detail}</div>

            <div className="support-inline-facts">
              <div className="support-inline-fact">
                <span className="support-inline-fact-label">Empresa</span>
                <span className="support-inline-fact-value">{companyName}</span>
              </div>
              <div className="support-inline-fact">
                <span className="support-inline-fact-label">Operador local</span>
                <span className="support-inline-fact-value">{operatorName}</span>
              </div>
              <div className="support-inline-fact">
                <span className="support-inline-fact-label">Versao do agent</span>
                <span className="support-inline-fact-value">{supportView?.device.agentVersion || "-"}</span>
              </div>
              <div className="support-inline-fact">
                <span className="support-inline-fact-label">Canal</span>
                <span className="support-inline-fact-value">{chatConfigured ? "Suporte Trilink pronto" : "Sem suporte configurado"}</span>
              </div>
            </div>

            <div className="support-primary-actions">
              <button
                type="button"
                className={`btn-primary btn-primary-inline ${chatwootLoading ? "btn-loading" : ""}`}
                onClick={onOpenSupport}
                disabled={chatwootLoading || !chatConfigured}
              >
                {chatwootLoading ? <span className="btn-spinner" /> : null}
                <span>Solicitar suporte</span>
              </button>
              <button type="button" className="btn-secondary-inline" onClick={onOpenSetup}>
                Historico do provisionamento
              </button>
            </div>
          </article>

          <article className="support-operational-card support-operational-card-remote">
            <div className="support-card-kicker">Acesso remoto</div>
            <div className="support-card-title-row">
              <div className="support-card-title">{remoteStateLabel}</div>
              <span className={`support-state-pill state-${remote?.status ?? "offline"}`}>
                <span className="support-state-pill-dot" />
                {remoteOperationalLabel}
              </span>
            </div>
            <div className="support-card-detail">{remoteOperationalHint}</div>

            <div className="support-remote-id-card">
              <div className="support-remote-id-head">
                <span className="support-summary-label">ID RustDesk</span>
                {remote?.externalId ? <CopyButton value={remote.externalId} label="Copiar ID remoto" /> : null}
              </div>
              <div className="support-remote-id-value mono">{formatRemoteId(remote?.externalId)}</div>
            </div>

            <div className="support-remote-assist">
              <ShieldIcon />
              <span>Uma solicitacao de suporte pode exigir sua confirmacao no RustDesk.</span>
            </div>

            <div className="support-remote-actions">
              <button
                type="button"
                className={`btn-secondary-inline support-remote-open-button ${remoteOpening ? "btn-loading" : ""}`}
                onClick={onOpenRemote}
                disabled={remoteOpening || !remoteReady}
              >
                {remoteOpening ? <span className="btn-spinner btn-spinner-dark" /> : <MonitorIcon />}
                <span>{remoteActionLabel}</span>
              </button>
            </div>
          </article>
        </section>

        <section className="support-component-card">
          <div className="support-card-kicker">Status dos componentes</div>
          <div className="support-component-list">
            {statusRows.map((row) => (
              <div key={row.label} className="support-component-row">
                <span className="support-component-label">{row.label}</span>
                <span className={`support-component-value tone-${row.tone}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        <details className="support-technical-details">
          <summary>Detalhes tecnicos</summary>
          <div className="support-technical-grid">
            <div className="support-technical-row">
              <span className="support-technical-label">Device ID</span>
              <span className="support-technical-value mono">{truncateIdentifier(supportView?.device.deviceId)}</span>
              {supportView?.device.deviceId ? <CopyButton value={supportView.device.deviceId} label="Copiar device ID" /> : null}
            </div>
            <div className="support-technical-row">
              <span className="support-technical-label">Host ID</span>
              <span className="support-technical-value mono">{truncateIdentifier(supportView?.installation.hostId)}</span>
              {supportView?.installation.hostId ? <CopyButton value={supportView.installation.hostId} label="Copiar host ID" /> : null}
            </div>
            <div className="support-technical-row">
              <span className="support-technical-label">Host alias</span>
              <span className="support-technical-value">{supportView?.installation.hostAlias || "-"}</span>
            </div>
            <div className="support-technical-row">
              <span className="support-technical-label">Sistema operacional</span>
              <span className="support-technical-value">{supportView?.device.os || "-"}</span>
            </div>
          </div>
        </details>
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
              {remoteStateLabel}
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

      <div className={`support-chat-launcher-wrap ${chatDrawerOpen ? "hidden" : ""}`}>
        <button
          type="button"
          className={`support-chat-launcher ${chatDrawerOpen ? "open" : ""} ${chatwootLoading ? "loading" : ""}`}
          onClick={toggleSupportDrawer}
          disabled={chatwootLoading || !chatConfigured}
        >
          <span className="support-chat-launcher-icon">
            <ChatBubbleIcon />
          </span>
          <span className="support-chat-launcher-copy">{chatDrawerOpen ? "Ocultar atendimento" : "Atendimento"}</span>
        </button>
      </div>
    </main>
  );
}
