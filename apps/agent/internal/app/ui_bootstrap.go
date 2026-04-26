package app

import (
	"context"
	"fmt"

	uistate "trilink/agent/internal/core/ui_state"
	"trilink/agent/internal/infra/config"
	"trilink/agent/internal/infra/ipc"
	"trilink/agent/internal/infra/logging"
	"trilink/agent/internal/infra/tray"
	"trilink/agent/internal/ui"
	"trilink/agent/internal/uiwails"
)

func BootstrapUI(ctx context.Context) (*Container, error) {
	_ = ctx

	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	logger := logging.New(cfg.LogLevel)
	if err := uiwails.ValidateRuntime(); err != nil {
		return nil, fmt.Errorf("validate webview2 runtime: %w", err)
	}
	trayService := tray.NewService(logger, cfg.Paths.StateDir)
	ipcClient := ipc.NewClient(cfg.Agent.IPCAddress, cfg.Agent.IPCToken, logger)
	localUIState := uistate.NewService(cfg.Paths.StateDir, uistate.ChatwootConfig{
		BaseURL:      cfg.Support.ChatwootBaseURL,
		WebsiteToken: cfg.Support.ChatwootWebsiteToken,
	}, cfg.Agent.Version, cfg.Agent.Environment, nil)
	wailsHost := uiwails.NewHost(logger, ipcClient, localUIState)
	agentUIService := ui.NewService(logger, trayService, trayService, ipcClient, ipcClient, ipcClient, ipcClient, wailsHost, trayService)

	return &Container{
		AgentUI: agentUIService,
		UIHost:  wailsHost,
	}, nil
}
