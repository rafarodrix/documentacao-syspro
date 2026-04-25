package app

import (
	"context"
	"fmt"

	"trilink/agent/internal/infra/config"
	"trilink/agent/internal/infra/ipc"
	"trilink/agent/internal/infra/logging"
	"trilink/agent/internal/infra/tray"
	"trilink/agent/internal/infra/webview"
	"trilink/agent/internal/ui"
)

func BootstrapUI(ctx context.Context) (*Container, error) {
	_ = ctx

	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	logger := logging.New(cfg.LogLevel)
	trayService := tray.NewService(logger, cfg.Paths.StateDir)
	ipcClient := ipc.NewClient(cfg.Agent.IPCAddress, logger)
	webviewOpener := webview.NewOpener(logger)
	agentUI := ui.NewService(logger, trayService, trayService, ipcClient, ipcClient, ipcClient, ipcClient, webviewOpener, trayService)

	return &Container{
		AgentUI: agentUI,
	}, nil
}
