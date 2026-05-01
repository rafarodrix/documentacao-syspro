import { useEffect, useRef, useState } from "react";
import {
  GetSetupStatus,
  GetSupportSession,
  ListNotifications,
  OpenRemoteClient,
  OpenSupportConversation,
  SyncSupportConversationContext,
} from "./bindings";
import { EventsOn } from "./runtime";
import { uistate } from "../wailsjs/go/models";

type Route = "agent://setup" | "agent://support";

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
  const [remoteOpening, setRemoteOpening] = useState(false);
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

  useEffect(() => {
    if (route !== "agent://support") return;

    const poll = () => {
      void GetSupportSession()
        .then((session) => setSupportSession(session))
        .catch(() => {
          // silent
        });
    };

    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, [route]);

  useEffect(() => {
    if (route !== "agent://support" || !supportSession) return;
    if (!supportSession.base_url?.trim() || !supportSession.website_token?.trim()) {
      setChatwootReady(false);
      setChatwootLoading(false);
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
      position: "right",
      locale: "pt_BR",
    };

    const bootChatwoot = () => {
      const sdk = (window as unknown as {
        chatwootSDK?: { run: (cfg: { websiteToken: string; baseUrl: string }) => void };
      }).chatwootSDK;

      if (!sdk) return;

      setChatwootLoading(true);
      sdk.run({
        websiteToken: supportSession.website_token,
        baseUrl: supportSession.base_url,
      });
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

  const openSupport = () => {
    setRoute("agent://support");

    if (chatwootReady && openChatwootInline()) return;

    if (supportSession) {
      setChatwootReady(false);
      setChatwootBootNonce((value) => value + 1);
      return;
    }

    void OpenSupportConversation();
  };

  const openRemote = () => {
    setRemoteOpening(true);
    void OpenRemoteClient()
      .catch((err) => {
        console.error("OpenRemoteClient failed:", err);
      })
      .finally(() => {
        setRemoteOpening(false);
      });
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
          remoteOpening={remoteOpening}
          onOpenRemote={openRemote}
          onOpenSupport={openSupport}
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
          <div className="ring-label">
            {status.progress_pct}
            <span>%</span>
          </div>
        </div>
      </section>

      <div className="setup-bar-wrap">
        <div className={`setup-bar-fill state-${overallState}`} style={{ width: `${status.progress_pct}%` }} />
      </div>

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

      {status.last_error && (
        <div className="error-banner">
          <span className="error-icon">!</span>
          <span>{status.last_error}</span>
        </div>
      )}

      <section className="timeline-section">
        <div className="timeline-header">
          <span className="timeline-title">Pipeline de provisionamento</span>
          <span className="timeline-count">
            {completedSteps.length}/{status.steps.length} etapas
          </span>
        </div>

        <div className="timeline">
          {pendingSteps.map((step, i) => (
            <TimelineItem key={step.key} step={step} isFirst={i === 0 && overallState === "running"} />
          ))}

          {completedSteps.length > 0 && (
            <>
              <button
                type="button"
                className="timeline-toggle"
                onClick={() => setShowCompleted((value) => !value)}
              >
                <span className="timeline-toggle-icon">{showCompleted ? "-" : "+"}</span>
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
      // silent fallback
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
  remoteOpening: boolean;
  onOpenRemote: () => void;
  onOpenSupport: () => void;
}) {
  const { session, chatwootReady, chatwootLoading, remoteOpening, onOpenRemote, onOpenSupport } = props;
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const context = session?.context;
  const chatConfigured = Boolean(session?.base_url?.trim() && session?.website_token?.trim());

  const remoteId = context?.rustdeskId ?? "";
  const remotePassword = context?.remoteAccessPassword ?? "";
  const companyName = context?.companyDisplayName ?? "Cliente Trilink";
  const machineName = context?.machineName || context?.hostname || "Maquina em preparacao";
  const operatorName = context?.localUsername || "Operador local";
  const remoteStateLabel =
    context?.remoteStatus === "ready"
      ? "Pronto para conexao"
      : context?.remoteStatus === "pending"
        ? "Provisionando acesso remoto"
        : "Instalacao remota em analise";
  const chatStateLabel = !chatConfigured
    ? "Chat indisponivel nesta instalacao"
    : chatwootLoading
      ? "Preparando canal seguro"
      : chatwootReady
        ? "Chat pronto para abrir"
        : "Conexao sera iniciada sob demanda";
  const chatStateClass = chatwootReady ? "ready" : chatwootLoading ? "loading" : "idle";

  const buttonLabel = !chatConfigured
    ? "Canal nao configurado"
    : chatwootLoading
      ? "Conectando ao suporte..."
      : chatwootReady
        ? "Abrir conversa agora"
        : "Iniciar atendimento";

  useEffect(() => {
    if (!chatwootReady) return;
    mountChatwootEmbed(chatContainerRef.current);
    openChatwootInline();
  }, [chatwootReady, session?.website_token]);

  return (
    <main className="panel support-panel compact">
      <section className="support-hero compact">
        <div className="support-hero-copy compact">
          <div className="support-hero-eyebrow compact">
            Atendimento corporativo
          </div>
          <div className="support-hero-title compact">Central de Suporte</div>
          <div className="support-hero-subtitle compact">
            Atendimento autenticado com contexto tecnico sincronizado em tempo real.
          </div>
        </div>
        <div className="support-hero-state">
          <span className={`support-status-pill ${context?.remoteStatus ?? "pending"}`}>
            <span className="support-status-pill-dot" />
            {context?.remoteStatusText ?? "Em analise"}
          </span>
          <span className={`support-chat-pill support-chat-pill-${chatStateClass}`}>
            {chatStateLabel}
          </span>
        </div>
      </section>

      <section className="support-body compact">
        <div className="support-summary-grid">
          <div className="support-summary-card support-summary-card-wide">
            <span className="support-summary-label">Empresa</span>
            <span className="support-summary-value">{companyName}</span>
          </div>
          <div className="support-summary-card">
            <span className="support-summary-label">ID RustDesk</span>
            <div className="support-summary-inline">
              <span className="support-summary-value mono">{remoteId || "Aguardando"}</span>
              {remoteId && <CopyButton value={remoteId} label="Copiar ID remoto" />}
            </div>
          </div>
          <div className="support-summary-card">
            <span className="support-summary-label">Senha</span>
            <div className="support-summary-inline">
              <span className="support-summary-value mono">
                {remotePassword ||
                  (context?.remoteStatus === "ready" || context?.remoteStatus === "pending"
                    ? "Sincronizando"
                    : "Aguardando")}
              </span>
              {remotePassword && <CopyButton value={remotePassword} label="Copiar senha" />}
            </div>
          </div>
          <div className="support-summary-card">
            <span className="support-summary-label">Maquina</span>
            <span className="support-summary-value">{machineName}</span>
          </div>
          <div className="support-summary-card">
            <span className="support-summary-label">Operador</span>
            <span className="support-summary-value">{operatorName}</span>
          </div>
        </div>

        <div className="support-remote-strip">
          <span className="support-card-icon compact">
            <RemoteIcon />
          </span>
          <div className="support-remote-strip-copy">
            <div className="support-remote-strip-title">Acesso remoto assistido</div>
            <div className="support-remote-strip-subtitle">{remoteStateLabel}</div>
          </div>
          <button
            type="button"
            className={`btn-secondary-inline ${remoteOpening ? "btn-loading" : ""}`}
            onClick={onOpenRemote}
            disabled={remoteOpening}
          >
            {remoteOpening && <span className="btn-spinner btn-spinner-dark" />}
            <span>{remoteOpening ? "Abrindo..." : "Abrir remoto"}</span>
          </button>
        </div>

        <div className="support-chat-shell">
          <div className="support-chat-shell-header">
            <div>
              <div className="support-chat-shell-title">Chat de atendimento</div>
              <div className="support-chat-shell-subtitle">
                O chat deve ficar visivel no painel, sem depender de popout externo.
              </div>
            </div>
            <button
              type="button"
              className={`btn-primary btn-primary-inline ${chatwootLoading ? "btn-loading" : ""}`}
              onClick={onOpenSupport}
              disabled={chatwootLoading || !chatConfigured}
            >
              {chatwootLoading && <span className="btn-spinner" />}
              <span>{buttonLabel}</span>
            </button>
          </div>

          <div ref={chatContainerRef} className="support-chat-embed">
            {!chatwootReady ? (
              <div className="support-chat-placeholder">
                <ShieldIcon />
                <div className="support-chat-placeholder-copy">
                  <div className="support-chat-placeholder-title">{chatStateLabel}</div>
                  <div className="support-chat-placeholder-text">
                    {chatConfigured
                      ? "Assim que o canal responder, a conversa sera exibida diretamente nesta area."
                      : "A interface do agent continua disponivel, mas o Chatwoot nao foi configurado neste ambiente."}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M2 6l3 3 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M3 8.5H2A1.5 1.5 0 0 1 .5 7V2A1.5 1.5 0 0 1 2 .5h5A1.5 1.5 0 0 1 8.5 2v1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CopiedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path
        d="M2 7l3 3 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
      <path
        d="M7 1.5 2 3.5v3.2c0 3 2.1 5.4 5 5.8 2.9-.4 5-2.8 5-5.8V3.5L7 1.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="m5.2 7.2 1.4 1.4 2.6-2.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function stepBadge(status: uistate.SetupStep["status"]) {
  if (status === "complete") return "Concluido";
  if (status === "error") return "Erro";
  return "Pendente";
}

function openChatwootInline() {
  const chatwoot = (window as unknown as {
    $chatwoot?: {
      toggle?: (mode: string) => void;
      toggleBubbleVisibility?: (mode: string) => void;
    };
  }).$chatwoot;

  if (!chatwoot) return false;

  try {
    chatwoot.toggle?.("open");
    chatwoot.toggleBubbleVisibility?.("hide");
    return true;
  } catch {
    return false;
  }
}

function mountChatwootEmbed(container: HTMLDivElement | null) {
  if (!container) return;

  const holder = document.querySelector(".woot-widget-holder");
  const bubble = document.querySelector(".woot--bubble-holder");

  if (holder instanceof HTMLElement && holder.parentElement !== container) {
    container.appendChild(holder);
  }

  if (bubble instanceof HTMLElement && bubble.parentElement !== container) {
    container.appendChild(bubble);
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
