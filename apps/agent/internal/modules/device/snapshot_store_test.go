package device

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"
)

type snapshotTestStore struct {
	files map[string][]byte
}

func TestSnapshotTrackerUsesPersistedExponentialBackoffAndResetsAfterSuccess(t *testing.T) {
	ctx := context.Background()
	tracker := newSnapshotTracker(&snapshotTestStore{})
	now := time.Date(2026, time.July, 22, 10, 0, 0, 0, time.UTC)

	if err := tracker.recordFailure(ctx, "software", errors.New("registry unavailable"), now); err != nil {
		t.Fatalf("record first failure: %v", err)
	}
	if tracker.due(ctx, "software", now.Add(collectorRetryBaseDelay-time.Second)) {
		t.Fatal("collector retried before the first backoff elapsed")
	}
	if !tracker.due(ctx, "software", now.Add(collectorRetryBaseDelay)) {
		t.Fatal("collector did not retry after the first backoff elapsed")
	}

	if err := tracker.recordFailure(ctx, "software", errors.New("registry unavailable"), now.Add(collectorRetryBaseDelay)); err != nil {
		t.Fatalf("record second failure: %v", err)
	}
	if tracker.due(ctx, "software", now.Add(collectorRetryBaseDelay+collectorRetryBaseDelay)) {
		t.Fatal("collector retried before the exponential backoff elapsed")
	}

	if _, err := tracker.observe(ctx, "software", []string{"Syspro"}, now.Add(2*time.Minute)); err != nil {
		t.Fatalf("observe success: %v", err)
	}
	entry := tracker.entries["software"]
	if entry.FailureCount != 0 || entry.LastError != "" {
		t.Fatalf("expected success to reset failure state, got %+v", entry)
	}
}

func (s *snapshotTestStore) SaveJSON(_ context.Context, name string, value any) error {
	if s.files == nil {
		s.files = map[string][]byte{}
	}
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	s.files[name] = payload
	return nil
}

func (s *snapshotTestStore) LoadJSON(_ context.Context, name string, dest any) error {
	payload := s.files[name]
	return json.Unmarshal(payload, dest)
}

func TestSnapshotTrackerPublishesOnlyChangedOrUnconfirmedSnapshots(t *testing.T) {
	ctx := context.Background()
	store := &snapshotTestStore{}
	tracker := newSnapshotTracker(store)
	now := time.Date(2026, time.July, 22, 10, 0, 0, 0, time.UTC)

	pending, err := tracker.observe(ctx, "software", []string{"Syspro"}, now)
	if err != nil || !pending {
		t.Fatalf("expected first snapshot to be pending, pending=%v err=%v", pending, err)
	}
	if err := tracker.markPublished(ctx, map[string]struct{}{"software": {}}); err != nil {
		t.Fatalf("mark published: %v", err)
	}

	pending, err = tracker.observe(ctx, "software", []string{"Syspro"}, now.Add(24*time.Hour))
	if err != nil || pending {
		t.Fatalf("expected unchanged confirmed snapshot to stay clean, pending=%v err=%v", pending, err)
	}

	pending, err = tracker.observe(ctx, "software", []string{"Syspro", "Firebird"}, now.Add(48*time.Hour))
	if err != nil || !pending {
		t.Fatalf("expected changed snapshot to be pending, pending=%v err=%v", pending, err)
	}
}

func TestSnapshotTrackerPublishesCriticalCollectorsBeforeInventory(t *testing.T) {
	ctx := context.Background()
	tracker := newSnapshotTracker(&snapshotTestStore{})
	now := time.Date(2026, time.July, 22, 10, 0, 0, 0, time.UTC)

	if _, err := tracker.observe(ctx, "software", []string{"Syspro"}, now); err != nil {
		t.Fatalf("observe software: %v", err)
	}
	if _, err := tracker.observe(ctx, "metrics", map[string]any{"cpu": 10}, now); err != nil {
		t.Fatalf("observe metrics: %v", err)
	}

	batch := tracker.nextPublishBatch(ctx)
	if _, ok := batch["metrics"]; !ok {
		t.Fatalf("expected metrics in the first publish batch, got %#v", batch)
	}
	if _, ok := batch["software"]; ok {
		t.Fatalf("did not expect low-priority inventory in the first batch: %#v", batch)
	}

	if err := tracker.markPublished(ctx, batch); err != nil {
		t.Fatalf("mark critical batch published: %v", err)
	}
	batch = tracker.nextPublishBatch(ctx)
	if _, ok := batch["software"]; !ok {
		t.Fatalf("expected inventory after critical batch confirmation, got %#v", batch)
	}
}

func TestSnapshotTrackerKeepsPendingSnapshotAcrossRestart(t *testing.T) {
	ctx := context.Background()
	store := &snapshotTestStore{}
	now := time.Date(2026, time.July, 22, 10, 0, 0, 0, time.UTC)

	first := newSnapshotTracker(store)
	if _, err := first.observe(ctx, "disks", map[string]any{"freeMb": 100}, now); err != nil {
		t.Fatalf("observe: %v", err)
	}

	restarted := newSnapshotTracker(store)
	if !restarted.pending(ctx, "disks") {
		t.Fatal("expected pending snapshot to survive restart until remote sync confirms it")
	}
}

func TestCriticalEventQueueReplaysUntilPublishedAndDeduplicates(t *testing.T) {
	ctx := context.Background()
	store := &snapshotTestStore{}
	event := criticalEvent{EventID: "System:42", Source: "windows_event_log", EventCode: "7031", OccurredAt: time.Now().UTC()}

	first := newCriticalEventQueue(store)
	added, err := first.observe(ctx, []criticalEvent{event, event})
	if err != nil || len(added) != 1 {
		t.Fatalf("expected one deduplicated event, added=%d err=%v", len(added), err)
	}

	restarted := newCriticalEventQueue(store)
	if pending := restarted.pending(ctx); len(pending) != 1 || pending[0]["eventId"] != "System:42" {
		t.Fatalf("expected event replay after restart, got %#v", pending)
	}
	if err := restarted.markPublished(ctx); err != nil {
		t.Fatalf("mark published: %v", err)
	}
	if pending := restarted.pending(ctx); len(pending) != 0 {
		t.Fatalf("expected queue empty after confirmation, got %#v", pending)
	}
}
