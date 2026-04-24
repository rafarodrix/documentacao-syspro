package app

import (
	"trilink/agent/internal/core/agent"
	"trilink/agent/internal/ui"
)

type Container struct {
	AgentService *agent.Service
	AgentUI      *ui.Service
}
