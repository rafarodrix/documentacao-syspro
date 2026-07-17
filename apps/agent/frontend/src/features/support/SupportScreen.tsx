import { useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "../../components/CopyButton";
import { ChatBubbleIcon, ShieldIcon } from "../../components/icons";
import type {
  AgentSetupViewModel,
  AgentSupportViewModel,
  OpenRemoteAccessResultView,
  SetupStepView,
} from "../../types/agent-ui";
import { formatSetupCopy, getSetupDetail, getSetupHeadline, getSetupHint } from "../setup/setup-helpers";
import {
  buildOperationalStatusRows,
  formatAgentVersion,
  formatRelativeTime,
  formatRemoteId,
  getRemoteActionLabel,
  summarizeOperationalHealth,
  truncateIdentifier,
} from "./support-helpers";
import { mountChatwootEmbed, openChatwootInline } from "./chatwoot";

type SetupOverallState = "complete" | "error" | "running" | "idle";
type AgentView = "home" | "diagnostics" | "details" | "about";

type SupportScreenProps = {
  supportView: AgentSupportViewModel | null;
  setupView: AgentSetupViewModel;
  activeStep?: SetupStepView | null;
  setupOverallState: SetupOverallState;
  chatwootReady: boolean;
  chatwootLoading: boolean;
  remoteOpening: boolean;
  remoteActionResult: OpenRemoteAccessResultView | null;
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
    remoteActionResult,
    onOpenRemote,
    onOpenSetup,
    onOpenSupport,
  } = props;

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [chatDrawerExpanded, setChatDrawerExpanded] = useState(false);
  const [activeView, setActiveView] = useState<AgentView>("home");

  const remote = supportView?.capabilities.remote ?? null;
  const chatConfigured = Boolean(supportView?.channel.configured);
  const setupHeadline = getSetupHeadline(setupView, activeStep, setupOverallState);
  const setupDetail = getSetupDetail(setupView, activeStep, setupOverallState);
  const setupHint = getSetupHint(setupView, activeStep);

  const remoteReady = Boolean(remote?.ready && remote?.externalId);
  const companyName = supportView?.installation.companyName ?? "Cliente Trilink";
  const machineName = supportView?.device.machineName || supportView?.device.hostname || "Dispositivo em preparacao";
  const rawAgentVersion = supportView?.device.agentVersion || "-";
  const agentVersion = formatAgentVersion(rawAgentVersion);
  const lastCommunication = formatRelativeTime(remote?.lastSyncAt);
  const healthSummary = summarizeOperationalHealth(setupView, supportView);
  const statusRows = useMemo(() => buildOperationalStatusRows(setupView, supportView), [setupView, supportView]);
  const showInitializingState = supportView === null && setupView.complete;
  const chatStateLabel = !chatConfigured
    ? "Canal nao configurado"
    : chatwootLoading
      ? "Abrindo atendimento..."
      : chatwootReady
        ? "Atendimento pronto"
        : "Atendimento sob demanda";

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

  return (
    <main className={`panel support-panel operational ${chatDrawerOpen ? "chat-open" : ""}`}>
      <section className="support-hero operational compact">
        <div className="support-hero-copy operational compact">
          <h1 className="support-hero-title operational compact">{machineName}</h1>
          <p className="support-hero-subtitle operational compact">{companyName}</p>
          <p className="support-hero-meta operational compact">
            {buildCommunicationLine(setupView.complete, lastCommunication)}
          </p>
        </div>
      </section>

      <section className={`support-body operational compact ${activeView === "home" ? "view-home" : "view-secondary"}`}>
        {activeView === "home" ? (
          <>
            {showInitializingState ? (
              <section className="support-detail-panel">
                <div className="support-card-kicker">Inicializando</div>
                <div className="support-panel-title">Conectando ao servico do agente...</div>
                <div className="support-panel-copy">Aguardando o estado operacional atual do dispositivo.</div>
              </section>
            ) : (
              <>
                {!setupView.complete ? (
                  <div className={`support-diagnostic-card compact state-${setupOverallState}`}>
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
                      {remoteReady ? "RustDesk disponivel" : remote?.status === "pending" ? "RustDesk em configuracao" : "Acesso remoto indisponivel"}
                    </div>
                  </div>

                  <div className="support-remote-id-row compact">
                    <div className="support-remote-id-value mono">{formatRemoteId(remote?.externalId)}</div>
                    {remote?.externalId ? (
                      <CopyButton
                        value={remote.externalId}
                        label="Copiar ID do RustDesk"
                        copiedText="ID copiado"
                        showCopiedText
                      />
                    ) : null}
                  </div>

                  <div className="support-remote-actions compact">
                    <button
                      type="button"
                      className={`btn-primary btn-primary-inline compact ${remoteOpening ? "btn-loading" : ""}`}
                      onClick={onOpenRemote}
                      disabled={remoteOpening || !remoteReady}
                    >
                      {remoteOpening ? <span className="btn-spinner" /> : null}
                      <span>{getRemoteActionLabel(remote, remoteOpening, remoteActionResult)}</span>
                    </button>
                    {remoteActionResult?.message ? (
                      <div
                        className={`support-action-feedback ${remoteActionResult.opened ? "success" : "warn"}`}
                        aria-live="polite"
                      >
                        {remoteActionResult.message}
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="support-support-card compact">
                  <button
                    type="button"
                    className={`btn-secondary-inline support-support-button compact ${chatwootLoading ? "btn-loading" : ""}`}
                    onClick={openSupportDrawer}
                    disabled={chatwootLoading || !chatConfigured}
                  >
                    {chatwootLoading ? <span className="btn-spinner btn-spinner-dark" /> : <ChatBubbleIcon />}
                    <span>{chatwootLoading ? "Abrindo atendimento..." : "Chat com o suporte"}</span>
                  </button>
                </section>

                <button
                  type="button"
                  className="support-status-link"
                  onClick={() => setActiveView("diagnostics")}
                  aria-label="Abrir diagnostico do agente"
                >
                  <span className={`support-health-bullet tone-${healthSummary.tone}`} />
                  <span>{healthSummary.summary}</span>
                </button>

                <nav className="support-footer-actions compact" aria-label="Navegacao do agente">
                  <button type="button" className="support-footer-link inline emphasized" onClick={() => setActiveView("diagnostics")}>
                    Diagnostico
                  </button>
                  <span className="support-footer-separator">.</span>
                  <button type="button" className="support-footer-link inline" onClick={() => setActiveView("details")}>
                    Detalhes
                  </button>
                  <span className="support-footer-separator">.</span>
                  <button type="button" className="support-footer-link inline" onClick={() => setActiveView("about")}>
                    Sobre
                  </button>
                </nav>
              </>
            )}
          </>
        ) : null}

        {activeView === "diagnostics" ? (
          <section className="support-detail-panel secondary">
            <SecondaryHeader title="Diagnostico" onBack={() => setActiveView("home")} />
            <div className="support-panel-copy">
              {healthSummary.issues.length > 0 ? "Resumo atual dos componentes que exigem atencao." : "Todos os componentes essenciais estao operacionais."}
            </div>
            <div className="support-component-list compact">
              {statusRows.map((row) => (
                <div key={row.label} className="support-component-row compact">
                  <span className="support-component-label">{row.label}</span>
                  <span className={`support-component-value tone-${row.tone}`}>{row.value}</span>
                </div>
              ))}
            </div>
            {healthSummary.issues.length > 0 ? (
              <div className="support-issue-list">
                {healthSummary.issues.map((issue) => (
                  <div key={issue} className="support-issue-row">
                    <span className="support-health-bullet tone-warn" />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="support-inline-buttons">
              <button type="button" className="support-footer-link emphasized" onClick={onOpenSetup}>
                Historico do provisionamento
              </button>
            </div>
          </section>
        ) : null}

        {activeView === "details" ? (
          <section className="support-detail-panel secondary">
            <SecondaryHeader title="Detalhes" onBack={() => setActiveView("home")} />
            <div className="support-details-list">
              <TechnicalRow label="Dispositivo" value={machineName} />
              <TechnicalRow label="Empresa" value={companyName} />
              <TechnicalRow label="Operador local" value={supportView?.device.localUsername || "-"} />
              <TechnicalRow label="Versao do agente" value={agentVersion} />
              <TechnicalRow label="Sistema operacional" value={supportView?.device.os || "-"} />
              <TechnicalRow label="Host alias" value={supportView?.installation.hostAlias || "-"} />
              <TechnicalRow
                label="Device ID"
                value={truncateIdentifier(supportView?.device.deviceId)}
                copyValue={supportView?.device.deviceId || undefined}
                copyLabel="Copiar device ID"
              />
              <TechnicalRow
                label="Host ID"
                value={truncateIdentifier(supportView?.installation.hostId)}
                copyValue={supportView?.installation.hostId || undefined}
                copyLabel="Copiar host ID"
              />
            </div>
            {rawAgentVersion !== agentVersion ? (
              <div className="support-panel-copy">Build interno: {rawAgentVersion}</div>
            ) : null}
          </section>
        ) : null}

        {activeView === "about" ? (
          <section className="support-detail-panel secondary">
            <SecondaryHeader title="Sobre" onBack={() => setActiveView("home")} />
            <div className="support-issue-list">
              <div className="support-issue-row">
                <span className="support-technical-label">Aplicacao</span>
                <span className="support-technical-value">Trilink Agent</span>
              </div>
              <div className="support-issue-row">
                <span className="support-technical-label">Versao do servico</span>
                <span className="support-technical-value">{agentVersion}</span>
              </div>
              {rawAgentVersion !== agentVersion ? (
                <div className="support-issue-row">
                  <span className="support-technical-label">Build interno</span>
                  <span className="support-technical-value">{rawAgentVersion}</span>
                </div>
              ) : null}
              <div className="support-issue-row">
                <span className="support-technical-label">Atendimento</span>
                <span className="support-technical-value">{chatConfigured ? "Disponivel sob demanda" : "Nao configurado"}</span>
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
              {remoteReady ? "RustDesk disponivel" : "Atendimento sob demanda"}
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

function SecondaryHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="support-secondary-header">
      <button type="button" className="support-back-button" onClick={onBack}>
        Voltar
      </button>
      <div className="support-panel-title">{title}</div>
    </div>
  );
}

function TechnicalRow({
  label,
  value,
  copyValue,
  copyLabel,
}: {
  label: string;
  value: string;
  copyValue?: string;
  copyLabel?: string;
}) {
  return (
    <div className="support-technical-row compact">
      <span className="support-technical-label">{label}</span>
      <span className="support-technical-value">{value}</span>
      {copyValue ? <CopyButton value={copyValue} label={copyLabel} /> : null}
    </div>
  );
}

function buildCommunicationLine(complete: boolean, lastCommunication: string): string {
  if (!complete) {
    return lastCommunication ? `Ultima comunicacao ${lastCommunication}` : "Conectando ao servico do agente";
  }
  if (!lastCommunication) {
    return "Ultima comunicacao indisponivel";
  }
  return `Ultima comunicacao ${lastCommunication}`;
}
