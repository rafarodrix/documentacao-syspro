import { useEffect, useRef, useState } from "react";
import {
  GetCurrentTarget,
  GetSetupStatus,
  GetSupportSession,
  ListNotifications,
  OpenRemoteClient,
  OpenSupportConversation,
  SyncSupportConversationContext,
} from "./bindings";
import { EventsOn } from "./runtime";
import { domain, uistate } from "../wailsjs/go/models";

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

function normalizeRoute(target?: string): Route {
  return target === "agent://support" ? "agent://support" : "agent://setup";
}

function App() {
  const [route, setRoute] = useState<Route>("agent://setup");
  const [setupStatus, setSetupStatus] = useState<uistate.SetupStatus>(defaultSetupStatus);
  const [supportSession, setSupportSession] = useState<uistate.SupportSession | null>(null);
  const [, setNotifications] = useState<Array<uistate.Notification>>([]);
  const [chatwootReady, setChatwootReady] = useState(false);
  const [chatwootLoading, setChatwootLoading] = useState(false);
  const [remoteOpening, setRemoteOpening] = useState(false);
  const [chatwootBootNonce, setChatwootBootNonce] = useState(0);
  const [pendingChatOpen, setPendingChatOpen] = useState(false);
  const syncedConversationIds = useRef<Record<string, boolean>>({});

  useEffect(() => {
    void (async () => {
      try {
        const [target, status, notifications] = await Promise.all([
          GetCurrentTarget().catch((err) => {
            console.error("GetCurrentTarget failed:", err);
            return "agent://setup";
          }),
          GetSetupStatus().catch((err) => {
            console.error("GetSetupStatus failed:", err);
            return defaultSetupStatus;
          }),
          ListNotifications().catch((err) => {
            console.error("ListNotifications failed:", err);
            return [];
          }),
        ]);

        const nextRoute = normalizeRoute(target);
        setRoute(nextRoute);
        setSetupStatus(status);
        setNotifications(notifications);

        if (nextRoute === "agent://support") {
          try {
            const session = await GetSupportSession();
            setSupportSession(session);
          } catch (err) {
            console.error("GetSupportSession failed:", err);
          }
        }
      } catch (err) {
        console.error("Initial app bootstrap failed:", err);
      }
    })();

    const unsubscribers = [
      EventsOn("agent:navigate", (payload: { target?: string }) => {
        const nextRoute = normalizeRoute(payload?.target);
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
      type: "standard",
      hideMessageBubble: true,
      showUnreadMessagesDialog: false,
      launcherTitle: "",
      welcomeTitle: "Suporte Trilink",
      welcomeDescription: "Canal oficial da Trilink com contexto tecnico do dispositivo.",
      position: "right",
      locale: "pt_BR",
    };

    const bootChatwoot = () => {
      const sdk = (window as unknown as {
        chatwootSDK?: { run: (cfg: { websiteToken: string; baseUrl: string }) => void };
      }).chatwootSDK;

      if (!sdk) {
        if (hasChatwootClient()) onReady();
        return;
      }

      setChatwootLoading(true);
      sdk.run({
        websiteToken: supportSession.website_token,
        baseUrl: supportSession.base_url,
      });

      if (hasChatwootClient()) {
        window.setTimeout(() => {
          if (!cancelled) onReady();
        }, 250);
      }
    };

    if (existingScript) {
      if (hasChatwootClient()) {
        onReady();
      }
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

  useEffect(() => {
    if (!pendingChatOpen || !chatwootReady) return;
    if (openChatwootInline()) {
      setPendingChatOpen(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      openChatwootInline();
      setPendingChatOpen(false);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [pendingChatOpen, chatwootReady]);

  const openSupport = () => {
    setRoute("agent://support");
    setPendingChatOpen(true);

    if (chatwootReady && openChatwootInline()) return;

    if (supportSession) {
      setChatwootReady(false);
      setChatwootLoading(true);
      setChatwootBootNonce((value) => value + 1);
      return;
    }

    void OpenSupportConversation()
      .catch((err) => {
        console.error("OpenSupportConversation failed:", err);
        setChatwootLoading(false);
      });
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

  const setupOverallState: "complete" | "error" | "running" | "idle" = setupStatus.complete
    ? "complete"
    : setupStatus.last_error
      ? "error"
      : setupStatus.progress_pct > 0
        ? "running"
        : "idle";

  const supportOverallState: "complete" | "error" | "running" | "idle" = supportSession?.context?.rustdeskId
    ? "complete"
    : supportSession?.context?.remoteStatus === "pending"
      ? "running"
      : setupOverallState;

  const overallState = route === "agent://support" ? supportOverallState : setupOverallState;

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
          overallState={setupOverallState}
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
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [chatDrawerExpanded, setChatDrawerExpanded] = useState(false);
  const context = session?.context;
  const chatConfigured = Boolean(session?.base_url?.trim() && session?.website_token?.trim());

  const remoteId = context?.rustdeskId ?? "";
  const remotePassword = context?.remoteAccessPassword ?? "";
  const companyName = context?.companyDisplayName ?? "Cliente Trilink";
  const machineName = context?.machineName || context?.hostname || "Maquina em preparacao";
  const operatorName = context?.localUsername || "Operador local";
  const remoteStateLabel =
    context?.remoteStatus === "ready"
      ? "Abrir aplicativo de atendimento"
      : context?.remoteStatus === "pending"
        ? "Configurando acesso remoto"
        : "Instalacao remota em analise";
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
            disabled={remoteOpening}
          >
            {remoteOpening && <span className="btn-spinner btn-spinner-dark" />}
            <span>{remoteOpening ? "Abrindo..." : "Abrir remoto"}</span>
          </button>
        </div>
      </section>

      <section className="support-body compact">
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
              {remoteId && <CopyButton value={remoteId} label="Copiar ID remoto" />}
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
              {remotePassword && <CopyButton value={remotePassword} label="Copiar senha" />}
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
              {chatwootLoading && <span className="btn-spinner" />}
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
            <div className="support-chat-shell-subtitle">
              {chatStateLabel}
            </div>
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

function ChatBubbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2.2c-3.2 0-5.8 2.16-5.8 4.9 0 1.47.76 2.79 2.04 3.69l-.43 2.56 2.51-1.18c.54.13 1.1.19 1.68.19 3.2 0 5.8-2.17 5.8-4.91S11.2 2.2 8 2.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
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

function hasChatwootClient() {
  const chatwoot = (window as unknown as {
    $chatwoot?: {
      toggle?: (mode: string) => void;
      setUser?: (identifier: string, attributes: Record<string, string>) => void;
    };
  }).$chatwoot;

  return Boolean(chatwoot?.toggle || chatwoot?.setUser);
}

function identifyChatwootContact(context: domain.SupportContext | undefined) {
  if (!context) return;

  const chatwoot = (window as unknown as {
    $chatwoot?: {
      setUser?: (identifier: string, attributes: Record<string, string>) => void;
    };
  }).$chatwoot;

  if (!chatwoot?.setUser) return;

  const identifier = buildChatwootContactIdentifier(context);
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
      company_id: context.companyId || "",
      host_id: context.hostId || "",
      host_alias: context.hostAlias || "",
      rustdesk_id: context.rustdeskId || "",
      machine_name: context.machineName || context.hostname || "",
      local_username: context.localUsername || "",
      os: context.os || "",
      agent_version: context.agentVersion || "",
      description: context.description || "",
    });
  } catch {
    // ignore
  }
}

function buildChatwootContactIdentifier(context: domain.SupportContext) {
  if (context.hostId?.trim()) return `remote-host:${context.hostId.trim()}`;
  if (context.deviceId?.trim()) return `agent-device:${context.deviceId.trim()}`;
  if (context.hostname?.trim()) return `hostname:${context.hostname.trim().toLowerCase()}`;
  if (context.machineName?.trim()) return `machine:${context.machineName.trim().toLowerCase()}`;
  return "";
}

export default App;
