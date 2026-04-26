package app

import (
	"context"
	"encoding/json"
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
	if err := webview.ValidateRuntime(); err != nil {
		return nil, fmt.Errorf("validate webview2 runtime: %w", err)
	}
	trayService := tray.NewService(logger, cfg.Paths.StateDir)
	ipcClient := ipc.NewClient(cfg.Agent.IPCAddress, cfg.Agent.IPCToken, logger)
	webviewOpener := webview.NewOpener(logger, cfg.Paths.StateDir, ipcNativeBridge{client: ipcClient})
	agentUI := ui.NewService(logger, trayService, trayService, ipcClient, ipcClient, ipcClient, ipcClient, webviewOpener, trayService)

	return &Container{
		AgentUI: agentUI,
	}, nil
}

type ipcNativeBridge struct {
	client *ipc.Client
}

func (b ipcNativeBridge) Invoke(ctx context.Context, action string, payload string) (string, error) {
	switch action {
	case "get_setup_status":
		status, err := b.client.GetSetupStatus(ctx)
		if err != nil {
			return "", err
		}
		return marshalBridgePayload(status)
	case "sync_support_conversation_context":
		result, err := b.client.SyncSupportConversationContext(ctx, payload)
		if err != nil {
			return "", err
		}
		return marshalBridgePayload(result)
	default:
		return "", fmt.Errorf("unknown bridge action: %s", action)
	}
}

func marshalBridgePayload(value any) (string, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
