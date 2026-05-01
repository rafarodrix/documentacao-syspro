import { useEffect, useRef, useState } from "react";
import {
  GetSetupStatus,
  GetSupportSession,
  ListNotifications,
  OpenSupportConversation,
  SyncSupportConversationContext,
} from "./bindings";
import { EventsOn } from "./runtime";
import { uistate } from "../wailsjs/go/models";

type Route = "agent://setup" | "agent://support";

function formatRustDeskId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length === 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  if (digits.length >= 6) return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  return id;
}

function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 12h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M7 10v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CopyButtonDark({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };
  return (
    <button
      type="button"
      className={`btn-copy-dark ${copied ? "copied" : ""}`}
      onClick={() => void handleCopy()}
      title={label ?? "Copiar"}
      disabled={!value}
    >
      {copied ? <CopiedIcon /> : <CopyIcon />}
    </button>
  );
}

function RemoteAccessCard({ rustdeskId }: { rustdeskId?: string }) {
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
          {hasId && <CopyButtonDark value={rustdeskId!} label="Copiar ID" />}
        </div>

        <div className="remote-pw-row">
          <span className="remote-pw-label">Senha</span>
          <span className="remote-pw-value">
            {hasId ? "Disponível no app de suporte" : "Aguardando configuração"}
          </span>
        </div>
      </div>
    </div>
  );
}

const defaultSetupStatus = new uistate.SetupStatus({
  complete: false,
  stage: "Inicializando",
  title: "Provisionamento do Agente",
  summary: "Preparando contexto inicial do agente.",
  progress_pct: 0,
  steps: [],
});

function App() {
  const [route, setRoute] = useState<Route>("agent://setup");
  const [setupStatus, setSetupStatus] = useState<uistate.SetupStatus>(defaultSetupStatus);
  const [supportSession, setSupportSession] = useState<uistate.SupportSession | null>(null);
  const [, setNotifications] = useState<Array<uistate.Notification>>([]);
  const [chatwootReady, setChatwootReady] = useState(false);
  const [chatwootLoading, setChatwootLoading] = useState(false);
  const [chatwootBootNonce, setChatwootBootNonce] = useState(0);
  const syncedConversationIds = useRef<Record<string, boolean>>({});

  useEffect(() => {
    void Promise.all([
      GetSetupStatus().then(setSetupStatus).catch((err) => console.error("GetSetupStatus failed:", err)),
      ListNotifications().then(setNotifications).catch((err) => console.error("ListNotifications failed:", err)),
    ]);

    const unsubscribers = [
      EventsOn("agent:navigate", (payload: { target?: string }) => {
        const nextRoute = payload?.target === "agent://support" ? "agent://support" : "agent://setup";
        setRoute(nextRoute);

        if (nextRoute === "agent://support") {
          setChatwootReady(false);

          void GetSupportSession()
            .then((session) => {
              setSupportSession(session);
            })
            .catch((err) => console.error("GetSupportSession failed:", err));
        }
      }),
      EventsOn("agent:setup-status", (payload: uistate.SetupStatus) => {
        setSetupStatus(payload);
      }),
      EventsOn("agent:notifications", (payload: Array<uistate.Notification>) => {
        setNotifications(payload ?? []);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  // Polling: atualiza status remoto na SupportScreen a cada 15s
  useEffect(() => {
    if (route !== "agent://support") return;

    const poll = () => {
      void GetSupportSession()
        .then((session) => setSupportSession(session))
        .catch(() => {/* silencioso */});
    };

    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, [route]);

  useEffect(() => {
    if (route !== "agent://support" || !supportSession) {
      return;
    }

    let cancelled = false;
    const scriptId = "trilink-chatwoot-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    const onReady = () => {
      if (cancelled) return;
      hideChatwootBubble();
      identifyChatwootContact(supportSession.context);
      setChatwootReady(true);
      setChatwootLoading(false);
    };

    const onMessage = (event: Event) => {
      const detail = (event as CustomEvent).detail ?? {};
      const conversationId = String(
        detail.conversationId ||
          detail.conversation_id ||
          detail.id ||
          detail?.conversation?.id ||
          detail?.message?.conversation_id ||
          "",
      ).trim();

      if (!conversationId || syncedConversationIds.current[conversationId]) return;

      syncedConversationIds.current[conversationId] = true;
      void SyncSupportConversationContext(conversationId).catch(() => {
        syncedConversationIds.current[conversationId] = false;
      });
    };

    window.addEventListener("chatwoot:ready", onReady);
    window.addEventListener("chatwoot:on-message", onMessage);

    (window as unknown as { chatwootSettings?: Record<string, unknown> }).chatwootSettings = {
      hideMessageBubble: true,
      showUnreadMessagesDialog: false,
      welcomeTitle: "Suporte Trilink",
      welcomeDescription: "Canal oficial da Trilink com contexto tecnico do dispositivo.",
    };

    const bootChatwoot = () => {
      const sdk = (window as unknown as {
        chatwootSDK?: { run: (cfg: { websiteToken: string; baseUrl: string }) => void };
      }).chatwootSDK;

      if (sdk) {
        setChatwootLoading(true);
        sdk.run({
          websiteToken: supportSession.website_token,
          baseUrl: supportSession.base_url,
        });
      }
    };

    if (existingScript) {
      bootChatwoot();
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `${supportSession.base_url}/packs/js/sdk.js`;
      script.async = true;
      script.onload = bootChatwoot;
      script.onerror = () => {
        if (cancelled) return;
        setChatwootReady(false);
        setChatwootLoading(false);
      };
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("chatwoot:ready", onReady);
      window.removeEventListener("chatwoot:on-message", onMessage);
    };
  }, [route, supportSession, chatwootBootNonce]);

  const navigateToSetup = () => {
    setRoute("agent://setup");
    void GetSetupStatus().then(setSetupStatus).catch((err) => console.error("GetSetupStatus failed:", err));
  };

  const openSupport = () => {
    setRoute("agent://support");

    if (chatwootReady && openChatwoot()) {
      return;
    }

    if (supportSession) {
      setChatwootReady(false);
      setChatwootBootNonce((value) => value + 1);
      return;
    }

    void OpenSupportConversation();
  };

  const pendingSteps = setupStatus.steps.filter((step) => step.status !== "complete");
  const completedSteps = setupStatus.steps.filter((step) => step.status === "complete");
  const activeStep = pendingSteps[0] ?? null;

  const overallState: "complete" | "error" | "running" | "idle" = setupStatus.complete
    ? "complete"
    : setupStatus.last_error
      ? "error"
      : setupStatus.progress_pct > 0
        ? "running"
        : "idle";

  return (
    <div className={`shell route-${route === "agent://support" ? "support" : "setup"}`}>
      {/* Shared top navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <img
            src="/brand/logo-clara.png"
            alt="Trilink"
            className="navbar-logo"
            draggable={false}
          />
          <span className="navbar-divider" />
          <span className="navbar-product">Enterprise Agent</span>
        </div>
        <div className={`navbar-badge state-${overallState}`}>
          <span className={`navbar-badge-dot state-${overallState}`} />
          <span>
            {overallState === "complete" && "Ativo"}
            {overallState === "error" && "Erro"}
            {overallState === "running" && "Configurando"}
            {overallState === "idle" && "Iniciando"}
          </span>
        </div>
      </nav>

      {route === "agent://support" ? (
        <SupportScreen
          session={supportSession}
          chatwootReady={chatwootReady}
          chatwootLoading={chatwootLoading}
          onOpenSupport={openSupport}
          onOpenSetup={navigateToSetup}
        />
      ) : (
        <SetupScreen
          status={setupStatus}
          pendingSteps={pendingSteps}
          completedSteps={completedSteps}
          activeStep={activeStep}
          overallState={overallState}
        />
      )}
    </div>
  );
}

function SetupScreen(props: {
  status: uistate.SetupStatus;
  pendingSteps: uistate.SetupStep[];
  completedSteps: uistate.SetupStep[];
  activeStep?: uistate.SetupStep | null;
  overallState: "complete" | "error" | "running" | "idle";
}) {
  const { status, pendingSteps, completedSteps, activeStep, overallState } = props;
  const allSteps = [...pendingSteps, ...completedSteps];
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <main className="panel setup-panel">
      {/* Hero progress block */}
      <section className="setup-hero">
        <div className="setup-hero-left">
          <div className="setup-stage-label">
            {overallState === "complete" ? "Provisionamento concluido" : activeStep?.label ?? status.stage}
          </div>
          <div className="setup-stage-detail">
            {overallState === "complete"
              ? "Agente registrado e operacional."
              : activeStep?.detail ?? status.summary}
          </div>
        </div>

        <div className="setup-progress-ring">
          <svg className="ring-svg" viewBox="0 0 56 56" fill="none">
            <circle className="ring-track" cx="28" cy="28" r="24" strokeWidth="4" />
            <circle
              className={`ring-fill state-${overallState}`}
              cx="28"
              cy="28"
              r="24"
              strokeWidth="4"
              strokeDasharray={`${(status.progress_pct / 100) * 150.8} 150.8`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
            />
          </svg>
          <div className="ring-label">{status.progress_pct}<span>%</span></div>
        </div>
      </section>

      {/* Progress bar */}
      <div className="setup-bar-wrap">
        <div className={`setup-bar-fill state-${overallState}`} style={{ width: `${status.progress_pct}%` }} />
      </div>

      {/* Device metadata row */}
      {(status.company_name || status.host_id || status.rustdesk_id) && (
        <div className="device-row">
          {status.company_name && (
            <div className="device-chip">
              <span className="device-chip-label">Empresa</span>
              <span className="device-chip-value">{status.company_name}</span>
            </div>
          )}
          {status.host_id && (
            <div className="device-chip">
              <span className="device-chip-label">Host</span>
              <span className="device-chip-value mono">{status.host_id}</span>
            </div>
          )}
          <div className="device-chip">
            <span className="device-chip-label">Canal remoto</span>
            <span className={`device-chip-value ${status.rustdesk_id ? "ok-val" : "dim-val"}`}>
              {status.rustdesk_id ?? "Em preparo"}
            </span>
          </div>
        </div>
      )}

      {/* Remote Access Card */}
      <RemoteAccessCard rustdeskId={status.rustdesk_id} />

      {/* Error */}
      {status.last_error && (
        <div className="error-banner">
          <span className="error-icon">!</span>
          <span>{status.last_error}</span>
        </div>
      )}

      {/* Steps timeline */}
      <section className="timeline-section">
        <div className="timeline-header">
          <span className="timeline-title">Pipeline de provisionamento</span>
          <span className="timeline-count">
            {completedSteps.length}/{status.steps.length} etapas
          </span>
        </div>

        <div className="timeline">
          {/* Pending / active steps */}
          {pendingSteps.map((step, i) => (
            <TimelineItem key={step.key} step={step} isFirst={i === 0 && overallState === "running"} />
          ))}

          {/* Completed steps toggle */}
          {completedSteps.length > 0 && (
            <>
              <button
                type="button"
                className="timeline-toggle"
                onClick={() => setShowCompleted((v) => !v)}
              >
                <span className="timeline-toggle-icon">{showCompleted ? "▲" : "▼"}</span>
                {showCompleted ? "Ocultar" : "Ver"} {completedSteps.length} etapa
                {completedSteps.length !== 1 ? "s" : ""} concluida
                {completedSteps.length !== 1 ? "s" : ""}
              </button>

              {showCompleted &&
                completedSteps.map((step) => (
                  <TimelineItem key={step.key} step={step} isFirst={false} />
                ))}
            </>
          )}

          {/* Empty state */}
          {allSteps.length === 0 && (
            <div className="timeline-empty">Aguardando etapas de provisionamento...</div>
          )}
        </div>
      </section>
    </main>
  );
}

function TimelineItem({ step, isFirst }: { step: uistate.SetupStep; isFirst: boolean }) {
  return (
    <div className={`timeline-item ${step.status}${isFirst ? " active" : ""}`}>
      <div className="timeline-icon-wrap">
        <div className={`timeline-icon ${step.status}`}>
          {step.status === "complete" && <CheckIcon />}
          {step.status === "error" && <span>!</span>}
          {step.status === "pending" && <span />}
        </div>
        <div className="timeline-line" />
      </div>
      <div className="timeline-content">
        <div className="timeline-item-label">{step.label}</div>
        <div className="timeline-item-detail">{step.detail}</div>
      </div>
      <div className={`timeline-badge ${step.status}`}>{stepBadge(step.status)}</div>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <button
      type="button"
      className={`btn-copy ${copied ? "copied" : ""}`}
      onClick={() => void handleCopy()}
      title={label ?? "Copiar"}
      disabled={!value}
    >
      {copied ? <CopiedIcon /> : <CopyIcon />}
    </button>
  );
}

function SupportScreen(props: {
  session: uistate.SupportSession | null;
  chatwootReady: boolean;
  chatwootLoading: boolean;
  onOpenSupport: () => void;
  onOpenSetup: () => void;
}) {
  const { session, chatwootReady, chatwootLoading, onOpenSupport, onOpenSetup } = props;
  const context = session?.context;

  const remoteId = context?.rustdeskId ?? "";
  const remotePassword = context?.remoteAccessPassword ?? "";
  const formattedRemoteId = remoteId ? formatRustDeskId(remoteId) : "";

  const buttonLabel = chatwootLoading
    ? "Conectando..."
    : chatwootReady
      ? "Abrir atendimento"
      : "Iniciar atendimento";

  return (
    <main className="panel support-panel">
      <section className="support-hero">
        <div className="support-hero-text">
          <div className="support-hero-eyebrow">
            <span className="support-hero-eyebrow-dot" />
            Atendimento corporativo
          </div>
          <div className="support-hero-title">Central de Suporte</div>
          <div className="support-hero-subtitle">
            Acesso remoto governado pelo agente com contexto tecnico sincronizado em tempo real.
          </div>
        </div>
        <button type="button" className="btn-ghost btn-ghost-wide" onClick={onOpenSetup} title="Voltar ao status do agente">
          <StatusIcon />
          <span>Status</span>
        </button>
      </section>

      <section className="support-body">
        <div className="support-card">
          <div className="support-card-head">
            <div className="support-card-head-left">
              <span className="support-card-icon">
                <RemoteIcon />
              </span>
              <div>
                <div className="support-card-label">Acesso remoto</div>
                <div className="support-card-sub">Sessao tecnica autorizada</div>
              </div>
            </div>
            <span className={`support-status-pill ${context?.remoteStatus ?? "pending"}`}>
              <span className="support-status-pill-dot" />
              {context?.remoteStatusText ?? "Em analise"}
            </span>
          </div>

          <div className="support-fields">
            <div className="support-field">
              <div className="support-field-label">ID remoto</div>
              <div className="support-field-value-row">
                <div className="support-field-value mono">
                  {remoteId
                    ? <span className="support-remote-id">{formattedRemoteId}</span>
                    : "Aguardando identificacao"}
                </div>
                {remoteId && <CopyButton value={remoteId} label="Copiar ID remoto" />}
              </div>
            </div>
            <div className="support-field">
              <div className="support-field-label">Senha temporaria</div>
              <div className="support-field-value-row">
                <div className="support-field-value mono">
                  {remotePassword
                    ? <span className="support-remote-pw">{remotePassword}</span>
                    : (context?.remoteStatus === "ready" || context?.remoteStatus === "pending"
                      ? "Disponivel no RustDesk"
                      : "Aguardando configuracao")}
                </div>
                {remotePassword && <CopyButton value={remotePassword} label="Copiar senha" />}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`btn-primary ${chatwootLoading ? "btn-loading" : ""}`}
            onClick={onOpenSupport}
            disabled={chatwootLoading}
          >
            {chatwootLoading && <span className="btn-spinner" />}
            <span>{buttonLabel}</span>
          </button>
        </div>

        <div className="support-trust">
          <ShieldIcon />
          <span>
            Conexao protegida e auditada pela plataforma Trilink.
          </span>
        </div>
      </section>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M11.5 4.5 7 9l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 9H14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 8.5H2A1.5 1.5 0 0 1 .5 7V2A1.5 1.5 0 0 1 2 .5h5A1.5 1.5 0 0 1 8.5 2v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CopiedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RemoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 11.5V14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="7.25" r="1.6" fill="currentColor" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5 2 3.5v3.2c0 3 2.1 5.4 5 5.8 2.9-.4 5-2.8 5-5.8V3.5L7 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="m5.2 7.2 1.4 1.4 2.6-2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function stepBadge(status: uistate.SetupStep["status"]) {
  if (status === "complete") return "Concluido";
  if (status === "error") return "Erro";
  return "Pendente";
}

function openChatwoot() {
  const chatwoot = (window as unknown as {
    $chatwoot?: {
      toggle?: (mode: string) => void;
      toggleBubbleVisibility?: (mode: string) => void;
      popoutChatWindow?: () => void;
    };
  }).$chatwoot;

  if (!chatwoot) return false;

  try {
    chatwoot.toggle?.("open");
    chatwoot.toggleBubbleVisibility?.("hide");
    chatwoot.popoutChatWindow?.();
    return true;
  } catch {
    return false;
  }
}

function hideChatwootBubble() {
  const chatwoot = (window as unknown as {
    $chatwoot?: { toggleBubbleVisibility?: (mode: string) => void };
  }).$chatwoot;

  try {
    chatwoot?.toggleBubbleVisibility?.("hide");
  } catch {
    // ignore
  }
}

function identifyChatwootContact(context: uistate.SupportContext | undefined) {
  if (!context) return;

  const chatwoot = (window as unknown as {
    $chatwoot?: {
      setUser?: (identifier: string, attributes: Record<string, string>) => void;
    };
  }).$chatwoot;

  if (!chatwoot?.setUser) return;

  // Usa deviceId como identificador estável e único por instalação.
  // O nome do contato representa a máquina (hostAlias > machineName > hostname),
  // não o usuário logado — assim cada instalação tem um contato permanente no Chatwoot.
  const identifier = context.deviceId || context.hostname || context.machineName || "";
  if (!identifier) return;

  const name =
    context.hostAlias ||
    context.machineName ||
    context.hostname ||
    context.contactName ||
    identifier;

  try {
    chatwoot.setUser(identifier, {
      name,
      company_name: context.companyDisplayName || "",
      description: context.description || "",
    });
  } catch {
    // ignore
  }
}

export default App;
