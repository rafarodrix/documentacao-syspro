package telemetry

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"trilink/agent/internal/domain"
	"trilink/agent/internal/infra/storage"
)

func TestAsyncBusPersistsAndObservesPublishedEvent(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	store := newTelemetryTestStore(t)
	bus := NewAsyncBus(testTelemetryLogger{}, store, 4)
	bus.Start(ctx)

	if err := bus.Publish(ctx, domain.TelemetryEvent{
		Type:       "remote.sync.completed",
		Severity:   "info",
		Module:     "remote",
		Message:    "sync completed",
		OccurredAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("publish: %v", err)
	}

	waitForTelemetryStatus(t, store, "observed")
}

func TestAsyncBusReplaysPendingEventsFromDisk(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	store := newTelemetryTestStore(t)
	if err := store.SaveJSON(ctx, telemetryOutboxFile, []persistedTelemetryEntry{{
		ID:         "evt-1",
		Status:     "pending",
		OccurredAt: time.Now().UTC(),
		EnqueuedAt: time.Now().UTC(),
		Event: domain.TelemetryEvent{
			Type:     "heartbeat_failed",
			Severity: "warn",
			Module:   "heartbeat",
			Message:  "heartbeat failed",
		},
	}}); err != nil {
		t.Fatalf("seed outbox: %v", err)
	}

	bus := NewAsyncBus(testTelemetryLogger{}, store, 4)
	bus.Start(ctx)

	waitForTelemetryStatus(t, store, "observed")
}

func waitForTelemetryStatus(t *testing.T, store *storage.LocalStateStore, expected string) {
	t.Helper()

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		var queue []persistedTelemetryEntry
		if err := store.LoadJSON(context.Background(), telemetryOutboxFile, &queue); err == nil && len(queue) > 0 {
			if queue[0].Status == expected {
				return
			}
		}
		time.Sleep(25 * time.Millisecond)
	}

	var queue []persistedTelemetryEntry
	_ = store.LoadJSON(context.Background(), telemetryOutboxFile, &queue)
	t.Fatalf("expected telemetry status %q, got %+v", expected, queue)
}

func newTelemetryTestStore(t *testing.T) *storage.LocalStateStore {
	t.Helper()

	return storage.NewLocalStateStore(filepath.Clean(t.TempDir()), testTelemetryLogger{})
}

type testTelemetryLogger struct{}

func (testTelemetryLogger) Debug(msg string, kv ...any) {}
func (testTelemetryLogger) Warn(msg string, kv ...any)  {}
