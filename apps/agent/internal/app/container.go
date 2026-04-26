package app

import (
	"context"

	"trilink/agent/internal/core/agent"
	"trilink/agent/internal/infra/ipc"
	"trilink/agent/internal/uiwails"
)

type UIRunner interface {
	Run(ctx context.Context) error
}

type Container struct {
	AgentService *agent.Service
	IPCServer    *ipc.Server
	AgentUI      UIRunner
	UIHost       *uiwails.Host
}
