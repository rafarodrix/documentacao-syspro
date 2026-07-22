package device

import (
	"context"
	"encoding/json"
	"testing"
	"time"
)

type snapshotTestStore struct {
	files map[string][]byte
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
	if err := tracker.markPublished(ctx); err != nil {
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
