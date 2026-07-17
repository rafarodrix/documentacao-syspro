import { useEffect, useRef, useState } from "react";
import { uistate } from "../../../wailsjs/go/models";
import { CopyButton } from "../../components/CopyButton";
import { ChatBubbleIcon, ShieldIcon } from "../../components/icons";
import { getSetupDetail, getSetupHeadline, getSetupHint, formatSetupCopy } from "../setup/setup-helpers";
import { mountChatwootEmbed, openChatwootInline } from "./chatwoot";

type SetupOverallState = "complete" | "error" | "running" | "idle";

type SupportScreenProps = {
  session: uistate.SupportSession | null;
  setupStatus: uistate.SetupStatus;
  activeStep?: uistate.SetupStep | null;
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
    session,
    setupStatus,
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
  const context = session?.context;
  const chatConfigured = Boolean(session?.base_url?.trim() && session?.website_token?.trim());
  const setupHeadline = getSetupHeadline(setupStatus, activeStep, setupOverallState);
  const setupDetail = getSetupDetail(setupStatus, activeStep, setupOverallState);
  const setupHint = getSetupHint(setupStatus, activeStep);

  const remoteId = context?.rustdeskId ?? "";
  const remotePassword = context?.remoteAccessPassword ?? "";
  const remoteReady = Boolean(remoteId);
  const companyName = context?.companyDisplayName ?? "Cliente Trilink";
  const machineName = context?.machineName || context?.hostname || "Maquina em preparacao";
  const operatorName = context?.localUsername || "Operador local";
  const remoteStateLabel = remoteReady
    ? "Remoto pronto"
    : formatSetupCopy(context?.remoteStatusText) || setupHeadline;
  const chatStateLabel = !chatConfigured
    ? "Canal nao configurado"
    : chatwootLoading
      ? "Conectando atendimento"
      : chatwootReady
        ? "Canal pronto"
        : "Canal sob demanda";
  const buttonLabel = !chatConfigured
    ? "Canal nao configurado"
    : chatwootLoading
      ? "Conectando ao suporte..."
      : chatwootReady
        ? "Abrir conversa agora"
        : "Iniciar atendimento";

  useEffect(() => {
    if (!chatwootReady || !chatDrawerOpen) return;
    mountChatwootEmbed(chatContainerRef.current);
    openChatwootInline();
  }, [chatDrawerOpen, chatwootReady, session?.website_token]);

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
    <main className={`panel support-panel compact ${chatDrawerOpen ? "chat-open" : ""}`}>
      <section className="support-hero compact">
        <div className="support-hero-actions">
          <button
            type="button"
            className={`btn-secondary-inline support-action-button support-action-button-top ${remoteOpening ? "btn-loading" : ""}`}
            onClick={onOpenRemote}
            disabled={remoteOpening || !remoteReady}
          >
            {remoteOpening && remoteReady ? <span className="btn-spinner btn-spinner-dark" /> : null}
            <span>
              {!remoteReady ? "Instalacao pendente" : remoteOpening ? "Abrindo..." : "Abrir remoto"}
            </span>
          </button>
        </div>
      </section>

      <section className="support-body compact">
        {!remoteReady || !setupStatus.complete ? (
          <div className={`support-diagnostic-card state-${setupOverallState}`}>
            <div className="support-diagnostic-header">
              <div className="support-diagnostic-copy">
                <span className="support-summary-label">Diagnostico atual</span>
                <div className="support-diagnostic-title">{setupHeadline}</div>
              </div>
              <button type="button" className="timeline-toggle" onClick={onOpenSetup}>
                <span className="timeline-toggle-icon">+</span>
                Ver setup
              </button>
            </div>
            <div className="support-diagnostic-detail">{setupDetail}</div>
            {context?.remoteStatusText ? (
              <div className="support-diagnostic-meta">
                Estado reportado pelo agent: {formatSetupCopy(context.remoteStatusText)}
              </div>
            ) : null}
            {setupHint ? <div className="support-diagnostic-callout">{setupHint}</div> : null}
            {setupStatus.last_error ? (
              <div className="support-diagnostic-error">
                Ultimo erro: {formatSetupCopy(setupStatus.last_error)}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="support-summary-grid support-summary-grid-compact">
          <div className="support-summary-card support-summary-card-primary">
            <span className="support-summary-label">Empresa</span>
            <span className="support-summary-value">{companyName}</span>
            <div className="support-summary-meta-row">
              <span className="support-summary-meta-item">
                <span className="support-summary-meta-label">Maquina</span>
                <span className="support-summary-meta-value">{machineName}</span>
              </span>
              <span className="support-summary-meta-item support-summary-meta-item-right">
                <span className="support-summary-meta-label">Operador</span>
                <span className="support-summary-meta-value">{operatorName}</span>
              </span>
            </div>
          </div>
          <div className="support-summary-card support-summary-card-accent">
            <span className="support-summary-label">ID RustDesk</span>
            <div className="support-summary-inline">
              <span className="support-summary-value mono">{remoteId || "Aguardando"}</span>
              {remoteId ? <CopyButton value={remoteId} label="Copiar ID remoto" /> : null}
            </div>
          </div>
          <div className="support-summary-card support-summary-card-accent">
            <span className="support-summary-label">Senha</span>
            <div className="support-summary-inline">
              <span className="support-summary-value mono">
                {remotePassword ||
                  (context?.remoteStatus === "ready" || context?.remoteStatus === "pending"
                    ? "Sincronizando"
                    : "Aguardando")}
              </span>
              {remotePassword ? <CopyButton value={remotePassword} label="Copiar senha" /> : null}
            </div>
          </div>
        </div>

        <div className="support-chat-shell" hidden>
          <div className="support-chat-shell-header">
            <div>
              <div className="support-chat-shell-title">Chat Trilink</div>
              <div className="support-chat-shell-subtitle">
                {chatStateLabel}
                {remoteStateLabel ? ` • ${remoteStateLabel}` : ""}
              </div>
            </div>
            <button
              type="button"
              className={`btn-primary btn-primary-inline ${chatwootLoading ? "btn-loading" : ""}`}
              onClick={onOpenSupport}
              disabled={chatwootLoading || !chatConfigured}
            >
              {chatwootLoading ? <span className="btn-spinner" /> : null}
              <span>{buttonLabel}</span>
            </button>
          </div>

          <div className="support-chat-embed">
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
          <span className="support-chat-launcher-copy">
            {chatDrawerOpen ? "Ocultar atendimento" : "Atendimento"}
          </span>
        </button>
      </div>
    </main>
  );
}
