package reconcile

import (
	"context"

	"trilink/agent/internal/domain"
)

type DesiredStateProvider interface {
	GetLast(ctx context.Context) (domain.DesiredState, error)
}

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
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

type Module interface {
	Name() string
	Inspect(ctx context.Context) (domain.CurrentModuleState, error)
	Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction
	Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult
}
