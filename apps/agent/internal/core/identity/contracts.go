package identity

import (
	"context"

	"trilink/agent/internal/domain"
)

type Source interface {
	GetIdentity(ctx context.Context) (domain.DeviceIdentity, error)
}

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
}

type Logger interface {
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
}
