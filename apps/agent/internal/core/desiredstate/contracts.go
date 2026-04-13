package desiredstate

import (
	"context"

	"trilink/agent/internal/domain"
)

type PortalClient interface {
	GetDesiredState(ctx context.Context) (domain.DesiredState, error)
}

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
}

type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
}

type EventBus interface {
	Publish(ctx context.Context, event domain.TelemetryEvent) error
}
