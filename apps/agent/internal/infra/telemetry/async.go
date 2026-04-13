package telemetry

import (
	"context"

	"trilink/agent/internal/domain"
)

type Logger interface {
	Debug(msg string, kv ...any)
	Warn(msg string, kv ...any)
}

type AsyncBus struct {
	logger Logger
	ch     chan domain.TelemetryEvent
}

func NewAsyncBus(logger Logger, buffer int) *AsyncBus {
	return &AsyncBus{
		logger: logger,
		ch:     make(chan domain.TelemetryEvent, buffer),
	}
}

func (b *AsyncBus) Start(ctx context.Context) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				b.logger.Debug("telemetry bus stopped")
				return
			case event := <-b.ch:
				b.logger.Debug("telemetry event queued",
					"type", event.Type,
					"module", event.Module,
					"severity", event.Severity,
				)
			}
		}
	}()
}

func (b *AsyncBus) Publish(ctx context.Context, event domain.TelemetryEvent) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	select {
	case b.ch <- event:
		return nil
	default:
		b.logger.Warn("telemetry buffer full",
			"type", event.Type,
			"module", event.Module,
		)
		return nil
	}
}
