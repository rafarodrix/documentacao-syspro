package app

import (
	"context"
	"fmt"

	"trilink/agent/internal/infra/config"
	"trilink/agent/internal/infra/ipc"
	"trilink/agent/internal/infra/logging"
	"trilink/agent/internal/infra/tray"
	"trilink/agent/internal/ui"
)

func BootstrapUI(ctx context.Context) (*Container, error) {
	_ = ctx

	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	logger := logging.New(cfg.LogLevel)
	trayService := tray.NewService(logger)
	ipcClient := ipc.NewClient(cfg.Agent.IPCAddress, logger)
	agentUI := ui.NewService(logger, trayService, trayService, ipcClient, ipcClient, ipcClient, trayService)

	return &Container{
		AgentUI: agentUI,
	}, nil
}
