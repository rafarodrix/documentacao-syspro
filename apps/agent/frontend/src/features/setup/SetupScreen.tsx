import { useState } from "react";
import { uistate } from "../../../wailsjs/go/models";
import { RemoteAccessCard } from "../../components/RemoteAccessCard";
import { CheckIcon } from "../../components/icons";
import {
  getSetupDetail,
  getSetupHeadline,
  getSetupHint,
  stepBadge,
} from "./setup-helpers";

type SetupOverallState = "complete" | "error" | "running" | "idle";

type SetupScreenProps = {
  status: uistate.SetupStatus;
  pendingSteps: uistate.SetupStep[];
  completedSteps: uistate.SetupStep[];
  activeStep?: uistate.SetupStep | null;
  overallState: SetupOverallState;
};

export function SetupScreen(props: SetupScreenProps) {
  const { status, pendingSteps, completedSteps, activeStep, overallState } = props;
  const [showCompleted, setShowCompleted] = useState(false);
  const setupHeadline = getSetupHeadline(status, activeStep, overallState);
  const setupDetail = getSetupDetail(status, activeStep, overallState);
  const setupHint = getSetupHint(status, activeStep);
  const visibleSteps = showCompleted || pendingSteps.length === 0 ? [...pendingSteps, ...completedSteps] : pendingSteps;

  return (
    <main className="panel setup-panel">
      <section className="setup-hero">
        <div className="setup-hero-left">
          <div className="setup-stage-label">{setupHeadline}</div>
          <div className="setup-stage-detail">{setupDetail}</div>
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

      <section className="setup-content-grid">
        <div className={`setup-diagnostic-card state-${overallState}`}>
          <div className="setup-card-kicker">Diagnostico atual</div>
          <div className="setup-card-title">{setupHeadline}</div>
          <div className="setup-card-detail">{setupDetail}</div>

          {setupHint ? <div className="setup-callout">{setupHint}</div> : null}

          {status.last_error ? (
            <div className="setup-error-banner">
              <span className="setup-error-title">Ultimo erro</span>
              <span>{status.last_error}</span>
            </div>
          ) : null}

          <div className="setup-facts-grid">
            <div className="setup-fact-card">
              <span className="setup-fact-label">Empresa</span>
              <span className="setup-fact-value">{status.company_name || "Aguardando vinculo"}</span>
            </div>
            <div className="setup-fact-card">
              <span className="setup-fact-label">Host</span>
              <span className="setup-fact-value mono">{status.host_id || "Nao vinculado"}</span>
            </div>
          </div>
        </div>

        <RemoteAccessCard rustdeskId={status.rustdesk_id} />
      </section>

      <section className="setup-timeline-card">
        <div className="setup-timeline-header">
          <div>
            <div className="setup-card-kicker">Checklist do onboarding</div>
            <div className="setup-timeline-title">
              {pendingSteps.length > 0
                ? `${pendingSteps.length} etapa(s) restante(s)`
                : "Todos os passos foram concluidos"}
            </div>
          </div>
          {completedSteps.length > 0 && pendingSteps.length > 0 ? (
            <button
              type="button"
              className="timeline-toggle"
              onClick={() => setShowCompleted((value) => !value)}
            >
              <span className="timeline-toggle-icon">{showCompleted ? "-" : "+"}</span>
              {showCompleted ? "Ocultar concluidas" : `Mostrar ${completedSteps.length} concluidas`}
            </button>
          ) : null}
        </div>

        <div className="setup-timeline-list">
          {visibleSteps.length > 0 ? (
            visibleSteps.map((step, index) => (
              <TimelineItem key={`${step.key}-${index}`} step={step} isFirst={index === 0} />
            ))
          ) : (
            <div className="timeline-empty">Nenhuma etapa registrada ainda.</div>
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
