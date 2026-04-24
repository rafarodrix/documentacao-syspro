package app

import (
	"trilink/agent/internal/core/agent"
	"trilink/agent/internal/infra/ipc"
	"trilink/agent/internal/ui"
)

type Container struct {
	AgentService *agent.Service
	IPCServer    *ipc.Server
	AgentUI      *ui.Service
}
