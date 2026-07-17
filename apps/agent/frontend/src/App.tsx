import { SetupScreen } from "./features/setup/SetupScreen";
import { SupportScreen } from "./features/support/SupportScreen";
import { useAgentShell } from "./hooks/useAgentShell";

function App() {
  const shell = useAgentShell();

  return (
    <div className={`shell route-${shell.route === "agent://support" ? "support" : "setup"}`}>
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
        <div className={`navbar-badge state-${shell.overallState}`}>
          <span className={`navbar-badge-dot state-${shell.overallState}`} />
          <span>{shell.headerStatusLabel}</span>
        </div>
      </nav>

      {shell.route === "agent://support" ? (
        <SupportScreen
          supportView={shell.supportView}
          setupView={shell.setupView}
          activeStep={shell.activeStep}
          setupOverallState={shell.setupOverallState}
          chatwootReady={shell.chatwootReady}
          chatwootLoading={shell.chatwootLoading}
          remoteOpening={shell.remoteOpening}
          onOpenRemote={shell.openRemote}
          onOpenSetup={shell.openSetup}
          onOpenSupport={shell.openSupport}
        />
      ) : (
        <SetupScreen
          status={shell.setupView}
          pendingSteps={shell.pendingSteps}
          completedSteps={shell.completedSteps}
          activeStep={shell.activeStep}
          overallState={shell.setupOverallState}
        />
      )}
    </div>
  );
}

export default App;
