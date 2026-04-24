package app

import (
	"context"
	"fmt"

	"trilink/agent/internal/infra/config"
	"trilink/agent/internal/infra/logging"
	"trilink/agent/internal/ui"
)

func BootstrapUI(ctx context.Context) (*Container, error) {
	_ = ctx

	cfg, err := config.Load()
	if err != nil {
		return nil, fmt.Errorf("load config: %w", err)
	}

	logger := logging.New(cfg.LogLevel)
	agentUI := ui.NewService(logger)

	return &Container{
		AgentUI: agentUI,
	}, nil
}
