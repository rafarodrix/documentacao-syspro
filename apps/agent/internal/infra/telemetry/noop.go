package telemetry

import (
	"context"

	"trilink/agent/internal/domain"
)

type Noop struct{}

func NewNoop() *Noop {
	return &Noop{}
}

func (n *Noop) Start(ctx context.Context) {
	_ = ctx
}

func (n *Noop) Publish(ctx context.Context, event domain.TelemetryEvent) error {
	_ = ctx
	_ = event
	return nil
}
