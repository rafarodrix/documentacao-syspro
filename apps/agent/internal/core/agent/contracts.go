package agent

import (
	"context"

	"trilink/agent/internal/domain"
)

type IdentityProvider interface {
	Get(ctx context.Context) (domain.AgentIdentity, error)
}

type RegistrationService interface {
	EnsureRegistered(ctx context.Context, id domain.AgentIdentity) error
}

type HeartbeatService interface {
	Start(ctx context.Context) error
}

type DesiredStateService interface {
	Start(ctx context.Context) error
	GetLast(ctx context.Context) (domain.DesiredState, error)
}

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
}

type Executor interface {
	Run(ctx context.Context, req ExecRequest) ExecResult
}

type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
	Error(msg string, kv ...any)
}

type EventBus interface {
	Publish(ctx context.Context, event domain.TelemetryEvent) error
}

type ExecRequest struct {
	Name    string
	Command string
	Args    []string
	Dir     string
}

type ExecResult struct {
	ExitCode int
	Stdout   string
	Stderr   string
	Err      error
}

type ReconcileService interface {
	Start(ctx context.Context) error
}
