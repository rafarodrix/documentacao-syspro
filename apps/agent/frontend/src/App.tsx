import { useEffect, useRef, useState } from "react";
import {
  GetSetupStatus,
  GetSupportSession,
  ListNotifications,
  OpenSetupExperience,
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
    if (route !== "agent://support" || !supportSession) {
      return;
    }

    let cancelled = false;
    const scriptId = "trilink-chatwoot-sdk";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    const onReady = () => {
      if (cancelled) return;
      hideChatwootBubble();
      setChatwootReady(true);
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
      };
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      window.removeEventListener("chatwoot:ready", onReady);
      window.removeEventListener("chatwoot:on-message", onMessage);
    };
  }, [route, supportSession]);

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
          <span className="navbar-dot" />
          <span className="navbar-name">Trilink</span>
          <span className="navbar-divider" />
          <span className="navbar-product">Enterprise Agent</span>
        </div>
        <div className={`navbar-badge state-${overallState}`}>
          {overallState === "complete" && "Ativo"}
          {overallState === "error" && "Erro"}
          {overallState === "running" && "Configurando"}
          {overallState === "idle" && "Iniciando"}
        </div>
      </nav>

      {route === "agent://support" ? (
        <SupportScreen
          session={supportSession}
          chatwootReady={chatwootReady}
          onOpenSupport={() => {
            if (chatwootReady && openChatwoot()) return;
            void OpenSupportConversation();
          }}
          onOpenSetup={() => void OpenSetupExperience()}
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

function SupportScreen(props: {
  session: uistate.SupportSession | null;
  chatwootReady: boolean;
  onOpenSupport: () => void;
  onOpenSetup: () => void;
}) {
  const { session, chatwootReady, onOpenSupport, onOpenSetup } = props;
  const context = session?.context;

  return (
    <main className="panel support-panel">
      <section className="support-hero">
        <div>
          <div className="support-hero-label">Atendimento oficial</div>
          <div className="support-hero-title">Suporte Trilink</div>
        </div>
        <button type="button" className="btn-ghost" onClick={onOpenSetup} title="Ver status do agente">
          <StatusIcon />
        </button>
      </section>

      <section className="support-body">
        <div className="support-card">
          <div className="support-card-head">
            <span className="support-card-label">Acesso remoto corporativo</span>
            <span className={`support-status-pill ${context?.remoteStatus ?? "pending"}`}>
              {context?.remoteStatusText ?? "Em analise"}
            </span>
          </div>

          <div className="support-fields">
            <div className="support-field">
              <div className="support-field-label">ID remoto</div>
              <div className="support-field-value mono">
                {context?.rustdeskId ?? "Aguardando identificacao"}
              </div>
            </div>
            <div className="support-field">
              <div className="support-field-label">Senha de acesso</div>
              <div className="support-field-value mono">
                {context?.remoteAccessPassword ??
                  (context?.remoteStatus === "ready" || context?.remoteStatus === "pending"
                    ? "Disponivel no aplicativo RustDesk"
                    : "Aguardando configuracao")}
              </div>
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={onOpenSupport}>
            {chatwootReady ? "Abrir atendimento" : "Tentar novamente"}
          </button>
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
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 9h7M9 5.5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
    $chatwoot?: { toggle?: (mode: string) => void; toggleBubbleVisibility?: (mode: string) => void };
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

export default App;
