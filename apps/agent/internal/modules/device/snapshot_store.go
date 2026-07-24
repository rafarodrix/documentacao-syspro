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

const (
	collectorRetryBaseDelay = 30 * time.Second
	collectorRetryMaxDelay  = 30 * time.Minute
)

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
}

type collectorSchedule struct {
	interval time.Duration
	jitter   time.Duration
	priority int
}

var collectionSchedules = map[string]collectorSchedule{
	"metrics":           {interval: time.Minute, priority: 1},
	"critical_services": {interval: 2 * time.Minute, priority: 1},
	"disks":             {interval: 5 * time.Minute, jitter: 30 * time.Second, priority: 1},
	"network":           {interval: 15 * time.Minute, jitter: 2 * time.Minute, priority: 2},
	"system":            {interval: 12 * time.Hour, jitter: time.Hour, priority: 3},
	"software":          {interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
	"hardware":          {interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
	"windows_update":    {interval: 6 * time.Hour, jitter: 30 * time.Minute, priority: 3},
	"all_services":      {interval: 12 * time.Hour, jitter: time.Hour, priority: 3},
	"syspro_versions":   {interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
}

type collectorSnapshotState struct {
	Hash            string    `json:"hash"`
	LastCollectedAt time.Time `json:"lastCollectedAt"`
	LastConfirmedAt time.Time `json:"lastConfirmedAt,omitempty"`
	NextDueAt       time.Time `json:"nextDueAt"`
	Pending         bool      `json:"pending"`
	FailureCount    int       `json:"failureCount,omitempty"`
	LastError       string    `json:"lastError,omitempty"`
}

type snapshotTracker struct {
	store    StateStore
	mu       sync.Mutex
	loaded   bool
	entries  map[string]collectorSnapshotState
	schedule func(collector string) collectorSchedule
}

func newSnapshotTracker(store StateStore) *snapshotTracker {
	return &snapshotTracker{
		store:    store,
		entries:  map[string]collectorSnapshotState{},
		schedule: func(collector string) collectorSchedule { return collectionSchedules[collector] },
	}
}

func (t *snapshotTracker) setScheduleResolver(resolver func(collector string) collectorSchedule) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if resolver == nil {
		t.schedule = func(collector string) collectorSchedule { return collectionSchedules[collector] }
		return
	}
	t.schedule = resolver
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
	entry.FailureCount = 0
	entry.LastError = ""
	t.entries[collector] = entry
	return entry.Pending, t.saveLocked(ctx)
}

func (t *snapshotTracker) recordFailure(ctx context.Context, collector string, err error, now time.Time) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked(ctx)
	entry := t.entries[collector]
	entry.FailureCount++
	entry.LastError = err.Error()
	entry.NextDueAt = now.UTC().Add(retryDelay(entry.FailureCount))
	t.entries[collector] = entry
	return t.saveLocked(ctx)
}

func (t *snapshotTracker) pending(ctx context.Context, collector string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked(ctx)
	return t.entries[collector].Pending
}

func (t *snapshotTracker) nextPublishBatch(ctx context.Context) map[string]struct{} {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked(ctx)
	priority := 0
	for collector, entry := range t.entries {
		if !entry.Pending {
			continue
		}
		candidate := t.schedule(collector).priority
		if priority == 0 || candidate < priority {
			priority = candidate
		}
	}
	batch := map[string]struct{}{}
	for collector, entry := range t.entries {
		if entry.Pending && priority > 0 && t.schedule(collector).priority == priority {
			batch[collector] = struct{}{}
		}
	}
	return batch
}

func (t *snapshotTracker) markPublished(ctx context.Context, collectors map[string]struct{}) error {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.loadLocked(ctx)
	now := time.Now().UTC()
	for collector, entry := range t.entries {
		if _, published := collectors[collector]; published && entry.Pending {
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
	schedule := t.schedule(collector)
	if schedule.jitter <= 0 {
		return schedule.interval
	}
	var bytes [2]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return schedule.interval
	}
	jitter := time.Duration(int(bytes[0])<<8|int(bytes[1])) % (schedule.jitter + 1)
	return schedule.interval + jitter
}

func retryDelay(failureCount int) time.Duration {
	if failureCount < 1 {
		return collectorRetryBaseDelay
	}
	delay := collectorRetryBaseDelay
	for attempt := 1; attempt < failureCount && delay < collectorRetryMaxDelay; attempt++ {
		delay *= 2
	}
	if delay > collectorRetryMaxDelay {
		return collectorRetryMaxDelay
	}
	return delay
}
