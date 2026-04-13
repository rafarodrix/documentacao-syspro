package heartbeat

import (
	"context"

	"trilink/agent/internal/domain"
)

type PortalClient interface {
	SendHeartbeat(ctx context.Context) error
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

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
}
