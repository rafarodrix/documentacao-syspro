package app

import (
	"context"
	"fmt"

	"trilink/agent/internal/core/agent"
	"trilink/agent/internal/core/desiredstate"
	"trilink/agent/internal/core/heartbeat"
	"trilink/agent/internal/core/identity"
	"trilink/agent/internal/core/reconcile"
	"trilink/agent/internal/core/registration"
	uistate "trilink/agent/internal/core/ui_state"
	"trilink/agent/internal/infra/config"
	"trilink/agent/internal/infra/http"
	"trilink/agent/internal/infra/ipc"
	"trilink/agent/internal/infra/logging"
	"trilink/agent/internal/infra/platform"
	"trilink/agent/internal/infra/runtime"
	"trilink/agent/internal/infra/storage"
	"trilink/agent/internal/infra/telemetry"
	backupmodule "trilink/agent/internal/modules/backup"
	devicemodule "trilink/agent/internal/modules/device"
	remotemodule "trilink/agent/internal/modules/remote"
	supportmodule "trilink/agent/internal/modules/support"
	tunnelmodule "trilink/agent/internal/modules/tunnel"
)

func Bootstrap(ctx context.Context) (*Container, error) {
	return BootstrapService(ctx)
}

func BootstrapService(ctx context.Context) (*Container, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	logger := logging.New(cfg.LogLevel)

	localStateStore := storage.NewLocalStateStore(cfg.Paths.StateDir, logger)
	stateStore := storage.NewProtectedStateStore(localStateStore)
	portalClient := http.NewPortalClient(cfg, stateStore, logger)
	executor := runtime.NewExecutor(logger)

	eventBus := telemetry.NewAsyncBus(logger, 100)
	eventBus.Start(ctx)

	identitySource := platform.NewWindowsIdentitySource(logger)
	identityService := identity.NewService(identitySource, stateStore, logger)

	registrationService := registration.NewService(portalClient, stateStore, logger, eventBus)
	heartbeatService := heartbeat.NewService(portalClient, stateStore, logger, eventBus)
	desiredStateService := desiredstate.NewService(portalClient, stateStore, logger, eventBus)
	uiStateService := uistate.NewService(cfg.Paths.StateDir, uistate.ChatwootConfig{
		BaseURL:      cfg.Support.ChatwootBaseURL,
		WebsiteToken: cfg.Support.ChatwootWebsiteToken,
	}, cfg.Agent.Version, cfg.Agent.Environment, portalClient)

	modules := []reconcile.Module{
		remotemodule.New(
			portalClient,
			stateStore,
			logger,
			eventBus,
			remotemodule.WithDiscoveryToken(cfg.Remote.DiscoveryToken),
			remotemodule.WithInstallToken(cfg.Remote.InstallToken),
			remotemodule.WithAgentVersion(cfg.Agent.Version),
			remotemodule.WithEnvironment(cfg.Agent.Environment),
			remotemodule.WithStateDir(cfg.Paths.StateDir),
			remotemodule.WithRustDeskInstaller(
				cfg.Remote.RustDeskInstallerURL,
				cfg.Remote.RustDeskInstallerSHA256,
				cfg.Remote.RustDeskInstallArgs,
			),
		),
		tunnelmodule.New(),
		backupmodule.New(),
		supportmodule.New(),
		devicemodule.New(),
	}

	reconcileService := reconcile.NewService(
		desiredStateService,
		stateStore,
		logger,
		eventBus,
		modules,
	)

	agentService := agent.NewService(
		identityService,
		registrationService,
		heartbeatService,
		desiredStateService,
		reconcileService,
		stateStore,
		executor,
		logger,
		eventBus,
	)

	return &Container{
		AgentService: agentService,
		IPCServer:    ipc.NewServer(cfg.Agent.IPCAddress, cfg.Agent.IPCToken, logger, uiStateService, uiStateService, uiStateService, uiStateService),
	}, nil
}
