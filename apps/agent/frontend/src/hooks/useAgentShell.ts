import { useEffect, useRef, useState } from "react";
import { EventsOn } from "../runtime";
import { uistate } from "../../wailsjs/go/models";
import { Route, normalizeRoute } from "../types/route";
import type { NotificationView, AgentSetupViewModel, SetupStepView, AgentSupportViewModel } from "../types/agent-ui";
import { resolveStartupRoute } from "../features/setup/setup-helpers";
import {
  hasChatwootClient,
  hideChatwootBubble,
  identifyChatwootContact,
  openChatwootInline,
} from "../features/support/chatwoot";
import { fetchCurrentTarget, fetchNotifications, mapNotifications } from "../services/shell-service";
import { defaultAgentSetupViewModel, fetchAgentSetupView, normalizeAgentSetupView, openSetupExperience } from "../services/setup-service";
import {
  fetchAgentSupportView,
  normalizeAgentSupportView,
  openRemoteClient,
  openSupportConversation,
  syncSupportConversationContext,
} from "../services/support-service";

type OverallState = "complete" | "error" | "running" | "idle";

export function useAgentShell() {
  const [route, setRoute] = useState<Route>("agent://setup");
  const [setupStatus, setSetupStatus] = useState<AgentSetupViewModel>(defaultAgentSetupViewModel);
  const [supportSession, setSupportSession] = useState<AgentSupportViewModel | null>(null);
  const [, setNotifications] = useState<NotificationView[]>([]);
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
          fetchCurrentTarget().catch((err) => {
            console.error("GetCurrentTarget failed:", err);
            return "agent://setup";
          }),
          fetchAgentSetupView().catch((err) => {
            console.error("GetAgentSetupView failed:", err);
            return defaultAgentSetupViewModel;
          }),
          fetchNotifications().catch((err) => {
            console.error("ListNotifications failed:", err);
            return [];
          }),
        ]);

        const nextRoute = resolveStartupRoute(target, status);
        setRoute(nextRoute);
        setSetupStatus(status);
        setNotifications(notifications);

        if (nextRoute === "agent://support") {
          try {
            const session = await fetchAgentSupportView();
            setSupportSession(session);
          } catch (err) {
            console.error("GetAgentSupportView failed:", err);
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

          void fetchAgentSupportView()
            .then((session) => {
              setSupportSession(session);
            })
            .catch((err) => console.error("GetAgentSupportView failed:", err));
        }
      }),
      EventsOn("agent:setup-view", (payload: uistate.AgentSetupView) => {
        setSetupStatus(normalizeAgentSetupView(payload));
      }),
      EventsOn("agent:notifications", (payload: Array<uistate.Notification>) => {
        setNotifications(mapNotifications(payload));
      }),
      EventsOn("agent:support-view", (payload: uistate.AgentSupportView) => {
        setSupportSession(normalizeAgentSupportView(payload));
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  useEffect(() => {
    if (route !== "agent://support") return;

    const poll = () => {
      void fetchAgentSupportView()
        .then((session) => setSupportSession(session))
        .catch(() => {
          // silent
        });
    };

    poll();
    const id = window.setInterval(poll, 15_000);
    return () => window.clearInterval(id);
  }, [route]);

  useEffect(() => {
    if (route !== "agent://support" || !supportSession) return;
    if (!supportSession.channel.baseUrl.trim() || !supportSession.channel.websiteToken.trim()) {
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
      identifyChatwootContact(supportSession);
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
      void syncSupportConversationContext(conversationId).catch(() => {
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
        websiteToken: supportSession.channel.websiteToken,
        baseUrl: supportSession.channel.baseUrl,
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
      script.src = `${supportSession.channel.baseUrl}/packs/js/sdk.js`;
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

    void openSupportConversation().catch((err) => {
      console.error("OpenSupportConversation failed:", err);
      setChatwootLoading(false);
    });
  };

  const openRemote = () => {
    setRemoteOpening(true);
    void openRemoteClient()
      .catch((err) => {
        console.error("OpenRemoteClient failed:", err);
      })
      .finally(() => {
        setRemoteOpening(false);
      });
  };

  const openSetup = () => {
    void openSetupExperience().catch((err) => {
      console.error("OpenSetupExperience failed:", err);
      setRoute("agent://setup");
    });
  };

  const pendingSteps = setupStatus.steps.filter((step: SetupStepView) => step.status !== "complete");
  const completedSteps = setupStatus.steps.filter((step: SetupStepView) => step.status === "complete");
  const activeStep = pendingSteps[0] ?? null;

  const setupOverallState: OverallState = setupStatus.complete
    ? "complete"
    : setupStatus.lastError
      ? "error"
      : setupStatus.progressPct > 0
        ? "running"
        : "idle";

  const supportOverallState: OverallState = supportSession?.capabilities.remote?.externalId
    ? "complete"
    : supportSession?.capabilities.remote?.status === "pending"
      ? "running"
      : setupOverallState;

  const overallState = route === "agent://support" ? supportOverallState : setupOverallState;

  return {
    route,
    setupStatus,
    supportSession,
    pendingSteps,
    completedSteps,
    activeStep,
    setupOverallState,
    overallState,
    chatwootReady,
    chatwootLoading,
    remoteOpening,
    openSupport,
    openRemote,
    openSetup,
  };
}
