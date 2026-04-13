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
	"trilink/agent/internal/infra/config"
	"trilink/agent/internal/infra/http"
	"trilink/agent/internal/infra/logging"
	"trilink/agent/internal/infra/platform"
	"trilink/agent/internal/infra/runtime"
	"trilink/agent/internal/infra/storage"
	"trilink/agent/internal/infra/telemetry"
	backupmodule "trilink/agent/internal/modules/backup"
	remotemodule "trilink/agent/internal/modules/remote"
	tunnelmodule "trilink/agent/internal/modules/tunnel"
)

func Bootstrap(ctx context.Context) (*Container, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	logger := logging.New(cfg.LogLevel)

	stateStore := storage.NewLocalStateStore(cfg.Paths.StateDir, logger)
	portalClient := http.NewPortalClient(cfg, logger)
	executor := runtime.NewExecutor(logger)

	eventBus := telemetry.NewAsyncBus(logger, 100)
	eventBus.Start(ctx)

	identitySource := platform.NewWindowsIdentitySource(logger)
	identityService := identity.NewService(identitySource, stateStore, logger)

	registrationService := registration.NewService(portalClient, stateStore, logger, eventBus)
	heartbeatService := heartbeat.NewService(portalClient, stateStore, logger, eventBus)
	desiredStateService := desiredstate.NewService(portalClient, stateStore, logger, eventBus)

	modules := []reconcile.Module{
		remotemodule.New(),
		tunnelmodule.New(),
		backupmodule.New(),
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
		Agent: agentService,
	}, nil
}
