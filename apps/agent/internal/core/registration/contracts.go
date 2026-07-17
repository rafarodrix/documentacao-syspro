package registration

import (
	"context"

	"trilink/agent/internal/domain"
)

type PortalClient interface {
	RegisterDevice(ctx context.Context, id domain.AgentIdentity) error
}

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
}

type Logger interface {
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
	Error(msg string, kv ...any)
}

type EventBus interface {
	Publish(ctx context.Context, event domain.TelemetryEvent) error
}
