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
  title: "Instalacao do Agente Trilink",
  summary: "Preparando contexto inicial do agente.",
  progress_pct: 0,
  steps: [],
});

function App() {
  const [route, setRoute] = useState<Route>("agent://setup");
  const [setupStatus, setSetupStatus] = useState<uistate.SetupStatus>(defaultSetupStatus);
  const [supportSession, setSupportSession] = useState<uistate.SupportSession | null>(null);
  const [, setNotifications] = useState<Array<uistate.Notification>>([]);
  const [supportStage, setSupportStage] = useState("Preparando atendimento");
  const [supportStageCopy, setSupportStageCopy] = useState(
    "O canal oficial da Trilink esta sendo preparado nesta janela.",
  );
  const [chatwootReady, setChatwootReady] = useState(false);
  const [chatwootVisible, setChatwootVisible] = useState(false);
  const syncedConversationIds = useRef<Record<string, boolean>>({});

  useEffect(() => {
    void Promise.all([
      GetSetupStatus().then(setSetupStatus).catch(() => undefined),
      ListNotifications().then(setNotifications).catch(() => undefined),
    ]);

    const unsubscribers = [
      EventsOn("agent:navigate", (payload: { target?: string }) => {
        const nextRoute = payload?.target === "agent://support" ? "agent://support" : "agent://setup";
        setRoute(nextRoute);

        if (nextRoute === "agent://support") {
          setChatwootReady(false);
          setChatwootVisible(false);

          void GetSupportSession()
            .then((session) => {
              setSupportSession(session);
              setSupportStage("Preparando atendimento");
              setSupportStageCopy(
                "O canal oficial da Trilink esta pronto nesta janela. Abra o atendimento somente quando quiser iniciar a conversa.",
              );
            })
            .catch(() => undefined);
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
      if (cancelled) {
        return;
      }

      setChatwootReady(true);
      setSupportStage("Atendimento pronto");
      setSupportStageCopy(
        "O canal de atendimento ja esta carregado. Clique em Abrir atendimento quando quiser exibir o widget.",
      );
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

      if (!conversationId || syncedConversationIds.current[conversationId]) {
        return;
      }

      syncedConversationIds.current[conversationId] = true;
      void SyncSupportConversationContext(conversationId).catch(() => {
        syncedConversationIds.current[conversationId] = false;
      });
    };

    window.addEventListener("chatwoot:ready", onReady);
    window.addEventListener("chatwoot:on-message", onMessage);

    (window as unknown as { chatwootSettings?: Record<string, unknown> }).chatwootSettings = {
      hideMessageBubble: false,
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
        if (cancelled) {
          return;
        }

        setSupportStage("Falha ao carregar o atendimento");
        setSupportStageCopy(
          "O SDK do Chatwoot nao carregou nesta maquina. Revise conectividade, politica de rede e acesso ao dominio do suporte.",
        );
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
  const focusStep = pendingSteps[0] ?? completedSteps[completedSteps.length - 1];

  return (
    <div className={`shell route-${route === "agent://support" ? "support" : "setup"}`}>
      {route === "agent://support" ? (
        <SupportScreen
          session={supportSession}
          stage={supportStage}
          stageCopy={supportStageCopy}
          chatwootReady={chatwootReady}
          chatwootVisible={chatwootVisible}
          onOpenSupport={() => {
            if (chatwootReady && openChatwoot()) {
              setChatwootVisible(true);
              return;
            }
            void OpenSupportConversation();
          }}
        />
      ) : (
        <SetupScreen
          status={setupStatus}
          pendingSteps={pendingSteps}
          completedSteps={completedSteps}
          focusStep={focusStep}
          onOpenSetup={() => void OpenSetupExperience()}
        />
      )}
    </div>
  );
}

function SetupScreen(props: {
  status: uistate.SetupStatus;
  pendingSteps: uistate.SetupStep[];
  completedSteps: uistate.SetupStep[];
  focusStep?: uistate.SetupStep;
  onOpenSetup: () => void;
}) {
  const { status, pendingSteps, completedSteps, focusStep, onOpenSetup } = props;

  return (
    <main className="panel setup-panel">
      <section className="hero">
        <div className="eyebrow">Trilink Enterprise Agent</div>
        <h1>{status.title}</h1>
        <p className="summary">{status.summary}</p>
        <div className="hero-grid">
          <div className="hero-stat">
            <span className="hero-stat-label">Etapa</span>
            <strong>{status.stage}</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Progresso</span>
            <strong className="brand">{status.progress_pct}%</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-label">Pipeline</span>
            <strong>
              {completedSteps.length}/{status.steps.length}
            </strong>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card soft">
          <div className="card-body">
            <div className="progress-head">
              <div>
                <div className="progress-label">Fase operacional</div>
                <div className="stage">{status.stage}</div>
              </div>
              <div className="percent">{status.progress_pct}%</div>
            </div>
            <div className="bar">
              <div className="bar-fill" style={{ width: `${status.progress_pct}%` }} />
            </div>
            <div className="meta">
              {status.company_name ? <span className="pill">Empresa: {status.company_name}</span> : null}
              {status.host_id ? <span className="pill">Host: {status.host_id}</span> : null}
              {status.rustdesk_id ? <span className="pill">RustDesk ID: {status.rustdesk_id}</span> : null}
            </div>
            {status.last_error ? <div className="error visible">{status.last_error}</div> : null}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div className="card-body focus-card">
            <div>
              <div className="progress-label">Etapa em execucao</div>
              <div className="focus-title">{focusStep?.label ?? "Inicializando"}</div>
              <div className="focus-detail">{focusStep?.detail ?? "Preparando contexto inicial do agente."}</div>
            </div>
            <div className="focus-badge">
              {focusStep?.status === "error" ? "Atencao" : focusStep?.status === "complete" ? "Concluido" : "Em curso"}
            </div>
          </div>
        </div>
      </section>

      <section className="steps-section">
        <div className="section-title">Pipeline de provisionamento</div>
        <div className="steps">
          {pendingSteps.map((step, index) => (
            <article className={`step ${step.status}`} key={step.key}>
              <div className="step-index">{String(index + 1).padStart(2, "0")}</div>
              <div className="step-copy">
                <div className="step-label">{step.label}</div>
                <div className="step-detail">{step.detail}</div>
              </div>
              <div className="step-status">{statusText(step.status)}</div>
            </article>
          ))}
        </div>

        {completedSteps.length > 0 ? (
          <details className="completed-wrap">
            <summary className="completed-toggle">Etapas concluidas ({completedSteps.length})</summary>
            <div className="completed-list">
              {completedSteps.map((step, index) => (
                <article className="step complete" key={step.key}>
                  <div className="step-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="step-copy">
                    <div className="step-label">{step.label}</div>
                    <div className="step-detail">{step.detail}</div>
                  </div>
                  <div className="step-status">Concluido</div>
                </article>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      <div className="actions">
        <button type="button" onClick={onOpenSetup}>
          Reabrir janela
        </button>
      </div>
    </main>
  );
}

function SupportScreen(props: {
  session: uistate.SupportSession | null;
  stage: string;
  stageCopy: string;
  chatwootReady: boolean;
  chatwootVisible: boolean;
  onOpenSupport: () => void;
}) {
  const { session, stage, stageCopy, chatwootReady, chatwootVisible, onOpenSupport } = props;
  const context = session?.context;

  return (
    <main className="panel support-panel">
      <section className="hero support-hero">
        <div className="eyebrow">Trilink Support Console</div>
        <h1>Suporte corporativo</h1>
        <p className="summary">Canal oficial da Trilink com contexto tecnico do dispositivo.</p>
      </section>

      <section className="section">
        <div className="card soft">
          <div className="card-body support-body">
            <div className="support-head">
              <div className="progress-label">Acesso remoto corporativo</div>
              <div className={`support-status ${context?.remoteStatus ?? "pending"}`}>
                {context?.remoteStatusText ?? "Em analise"}
              </div>
            </div>

            <div className="support-grid-values">
              <div>
                <div className="support-label">ID remoto</div>
                <div className="support-value">{context?.rustdeskId ?? "Aguardando identificacao"}</div>
              </div>
              <div>
                <div className="support-label">Senha de acesso</div>
                <div className="support-value">
                  {context?.remoteAccessPassword ??
                    (context?.remoteStatus === "ready" || context?.remoteStatus === "pending"
                      ? "Disponivel no app RustDesk"
                      : "Aguardando configuracao")}
                </div>
              </div>
            </div>

            <div className="support-stage">
              <div className="focus-title">{stage}</div>
              <div className="focus-detail">{stageCopy}</div>
              <div className="actions compact">
                <button type="button" onClick={onOpenSupport}>
                  {chatwootReady ? "Abrir atendimento" : "Tentar novamente"}
                </button>
              </div>
            </div>

            <div className="support-note">
              {chatwootVisible
                ? "Atendimento aberto nesta janela."
                : "O widget permanece fechado ate o usuario clicar em Abrir atendimento."}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function statusText(status: uistate.SetupStep["status"]) {
  if (status === "complete") return "Concluido";
  if (status === "error") return "Erro";
  return "Pendente";
}

function openChatwoot() {
  const chatwoot = (window as unknown as {
    $chatwoot?: { toggle?: (mode: string) => void; toggleBubbleVisibility?: (mode: string) => void };
  }).$chatwoot;

  if (!chatwoot) {
    return false;
  }

  try {
    chatwoot.toggle?.("open");
    chatwoot.toggleBubbleVisibility?.("show");
    return true;
  } catch {
    return false;
  }
}

export default App;
