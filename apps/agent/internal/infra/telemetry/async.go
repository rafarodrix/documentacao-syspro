package telemetry

import (
	"context"
	"sync/atomic"
	"time"

	"trilink/agent/internal/domain"
)

const (
	telemetryOutboxFile = "telemetry_outbox.json"
	maxOutboxEntries    = 200
	flushInterval       = 5 * time.Second
)

type Logger interface {
	Debug(msg string, kv ...any)
	Warn(msg string, kv ...any)
}

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
}

type persistedTelemetryEntry struct {
	ID          string                `json:"id"`
	Status      string                `json:"status"`
	OccurredAt  time.Time             `json:"occurred_at"`
	EnqueuedAt  time.Time             `json:"enqueued_at"`
	ProcessedAt time.Time             `json:"processed_at,omitempty"`
	Attempts    int                   `json:"attempts"`
	Event       domain.TelemetryEvent `json:"event"`
}

type AsyncBus struct {
	logger Logger
	store  StateStore
	signal chan struct{}
	seq    atomic.Uint64
}

func NewAsyncBus(logger Logger, store StateStore, buffer int) *AsyncBus {
	if buffer < 1 {
		buffer = 1
	}
	return &AsyncBus{
		logger: logger,
		store:  store,
		signal: make(chan struct{}, buffer),
	}
}

func (b *AsyncBus) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(flushInterval)
		defer ticker.Stop()

		_ = b.flushPending(ctx)

		for {
			select {
			case <-ctx.Done():
				b.logger.Debug("telemetry bus stopped")
				return
			case <-b.signal:
				_ = b.flushPending(ctx)
			case <-ticker.C:
				_ = b.flushPending(ctx)
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

	now := time.Now().UTC()
	if event.OccurredAt.IsZero() {
		event.OccurredAt = now
	}
	if b.store == nil {
		return nil
	}

	queue := b.loadQueue(ctx)
	entry := persistedTelemetryEntry{
		ID:         b.nextID(now),
		Status:     "pending",
		OccurredAt: event.OccurredAt,
		EnqueuedAt: now,
		Event:      event,
	}
	queue = append(queue, entry)
	queue = b.trimQueue(queue)
	if err := b.store.SaveJSON(ctx, telemetryOutboxFile, queue); err != nil {
		b.logger.Warn("telemetry outbox save failed", "error", err)
		return err
	}

	select {
	case b.signal <- struct{}{}:
	default:
	}

	return nil
}

func (b *AsyncBus) flushPending(ctx context.Context) error {
	queue := b.loadQueue(ctx)
	if len(queue) == 0 {
		return nil
	}

	changed := false
	now := time.Now().UTC()
	for i := range queue {
		if queue[i].Status != "pending" {
			continue
		}

		queue[i].Status = "observed"
		queue[i].ProcessedAt = now
		queue[i].Attempts++
		changed = true

		event := queue[i].Event
		b.logger.Debug("telemetry event queued",
			"id", queue[i].ID,
			"type", event.Type,
			"module", event.Module,
			"severity", event.Severity,
		)
	}

	if !changed {
		return nil
	}

	queue = b.trimQueue(queue)
	if err := b.store.SaveJSON(ctx, telemetryOutboxFile, queue); err != nil {
		b.logger.Warn("telemetry outbox flush save failed", "error", err)
		return err
	}
	return nil
}

func (b *AsyncBus) loadQueue(ctx context.Context) []persistedTelemetryEntry {
	if b.store == nil {
		return nil
	}
	var queue []persistedTelemetryEntry
	if err := b.store.LoadJSON(ctx, telemetryOutboxFile, &queue); err != nil {
		return nil
	}
	return queue
}

func (b *AsyncBus) trimQueue(queue []persistedTelemetryEntry) []persistedTelemetryEntry {
	if len(queue) <= maxOutboxEntries {
		return queue
	}

	overflow := len(queue) - maxOutboxEntries
	trimmed := make([]persistedTelemetryEntry, 0, len(queue))
	for _, entry := range queue {
		if overflow > 0 && entry.Status != "pending" {
			overflow--
			continue
		}
		trimmed = append(trimmed, entry)
	}

	if len(trimmed) > maxOutboxEntries {
		dropCount := len(trimmed) - maxOutboxEntries
		for i := 0; i < dropCount; i++ {
			b.logger.Warn("telemetry outbox full, dropping oldest pending event",
				"id", trimmed[i].ID,
				"type", trimmed[i].Event.Type,
				"module", trimmed[i].Event.Module,
			)
		}
		trimmed = trimmed[dropCount:]
	}

	return trimmed
}

func (b *AsyncBus) nextID(now time.Time) string {
	return now.Format("20060102150405.000000000") + "-" + itoa(b.seq.Add(1))
}

func itoa(value uint64) string {
	if value == 0 {
		return "0"
	}
	buffer := [20]byte{}
	index := len(buffer)
	for value > 0 {
		index--
		buffer[index] = byte('0' + value%10)
		value /= 10
	}
	return string(buffer[index:])
}
