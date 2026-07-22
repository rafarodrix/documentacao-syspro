package device

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"
)

const collectorStateFile = "collectors/snapshots.json"

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
}

type collectorSchedule struct {
	interval time.Duration
	jitter   time.Duration
}

var collectionSchedules = map[string]collectorSchedule{
	"metrics":           {interval: time.Minute},
	"critical_services": {interval: 2 * time.Minute},
	"disks":             {interval: 5 * time.Minute, jitter: 30 * time.Second},
	"network":           {interval: 15 * time.Minute, jitter: 2 * time.Minute},
	"system":            {interval: 12 * time.Hour, jitter: time.Hour},
	"software":          {interval: 24 * time.Hour, jitter: 90 * time.Minute},
	"hardware":          {interval: 24 * time.Hour, jitter: 90 * time.Minute},
	"windows_update":    {interval: 6 * time.Hour, jitter: 30 * time.Minute},
	"all_services":      {interval: 12 * time.Hour, jitter: time.Hour},
	"syspro_versions":   {interval: 24 * time.Hour, jitter: 90 * time.Minute},
}

type collectorSnapshotState struct {
	Hash            string    `json:"hash"`
	LastCollectedAt time.Time `json:"lastCollectedAt"`
	LastConfirmedAt time.Time `json:"lastConfirmedAt,omitempty"`
	NextDueAt       time.Time `json:"nextDueAt"`
	Pending         bool      `json:"pending"`
}

type snapshotTracker struct {
	store   StateStore
	mu      sync.Mutex
	loaded  bool
	entries map[string]collectorSnapshotState
}

func newSnapshotTracker(store StateStore) *snapshotTracker {
	return &snapshotTracker{store: store, entries: map[string]collectorSnapshotState{}}
}

func (t *snapshotTracker) due(ctx context.Context, collector string, now time.Time) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked(ctx)
	entry, exists := t.entries[collector]
	return !exists || entry.NextDueAt.IsZero() || !now.Before(entry.NextDueAt)
}

func (t *snapshotTracker) observe(ctx context.Context, collector string, value any, now time.Time) (bool, error) {
	payload, err := json.Marshal(value)
	if err != nil {
		return false, err
	}
	hash := sha256.Sum256(payload)

	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked(ctx)
	entry := t.entries[collector]
	changed := entry.Hash != hex.EncodeToString(hash[:])
	entry.Hash = hex.EncodeToString(hash[:])
	entry.LastCollectedAt = now.UTC()
	entry.NextDueAt = now.UTC().Add(t.nextInterval(collector))
	entry.Pending = entry.Pending || changed || entry.LastConfirmedAt.IsZero()
	t.entries[collector] = entry
	return entry.Pending, t.saveLocked(ctx)
}

func (t *snapshotTracker) pending(ctx context.Context, collector string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked(ctx)
	return t.entries[collector].Pending
}

func (t *snapshotTracker) markPublished(ctx context.Context) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked(ctx)
	now := time.Now().UTC()
	for collector, entry := range t.entries {
		if entry.Pending {
			entry.Pending = false
			entry.LastConfirmedAt = now
			t.entries[collector] = entry
		}
	}
	return t.saveLocked(ctx)
}

func (t *snapshotTracker) loadLocked(ctx context.Context) {
	if t.loaded || t.store == nil {
		t.loaded = true
		return
	}
	_ = t.store.LoadJSON(ctx, collectorStateFile, &t.entries)
	if t.entries == nil {
		t.entries = map[string]collectorSnapshotState{}
	}
	t.loaded = true
}

func (t *snapshotTracker) saveLocked(ctx context.Context) error {
	if t.store == nil {
		return nil
	}
	return t.store.SaveJSON(ctx, collectorStateFile, t.entries)
}

func (t *snapshotTracker) nextInterval(collector string) time.Duration {
	schedule, exists := collectionSchedules[collector]
	if !exists || schedule.jitter <= 0 {
		return schedule.interval
	}
	var bytes [2]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return schedule.interval
	}
	jitter := time.Duration(int(bytes[0])<<8|int(bytes[1])) % (schedule.jitter + 1)
	return schedule.interval + jitter
}
