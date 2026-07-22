package device

import (
	"context"
	"sync"
	"time"
)

const criticalEventStateFile = "events/critical-events.json"
const maxCriticalEvents = 200

type criticalEvent struct {
	EventID    string         `json:"eventId"`
	Source     string         `json:"source"`
	Provider   string         `json:"provider"`
	EventCode  string         `json:"eventCode"`
	Severity   string         `json:"severity"`
	Message    string         `json:"message"`
	OccurredAt time.Time      `json:"occurredAt"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}

type criticalEventState struct {
	Known   map[string]time.Time `json:"known"`
	Pending []criticalEvent      `json:"pending"`
}

type criticalEventQueue struct {
	store  StateStore
	mu     sync.Mutex
	loaded bool
	state  criticalEventState
}

func newCriticalEventQueue(store StateStore) *criticalEventQueue {
	return &criticalEventQueue{store: store}
}

func (q *criticalEventQueue) observe(ctx context.Context, events []criticalEvent) ([]criticalEvent, error) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.loadLocked(ctx)
	added := make([]criticalEvent, 0, len(events))
	for _, event := range events {
		if event.EventID == "" || !q.state.Known[event.EventID].IsZero() {
			continue
		}
		q.state.Known[event.EventID] = time.Now().UTC()
		q.state.Pending = append(q.state.Pending, event)
		added = append(added, event)
	}
	if len(q.state.Pending) > maxCriticalEvents {
		q.state.Pending = q.state.Pending[len(q.state.Pending)-maxCriticalEvents:]
	}
	return added, q.saveLocked(ctx)
}

func (q *criticalEventQueue) seed(ctx context.Context, events []criticalEvent) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.loadLocked(ctx)
	for _, event := range events {
		if event.EventID != "" && q.state.Known[event.EventID].IsZero() {
			q.state.Known[event.EventID] = time.Now().UTC()
		}
	}
	return q.saveLocked(ctx)
}

func (q *criticalEventQueue) pending(ctx context.Context) []map[string]any {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.loadLocked(ctx)
	result := make([]map[string]any, 0, len(q.state.Pending))
	for _, event := range q.state.Pending {
		result = append(result, map[string]any{"eventId": event.EventID, "source": event.Source, "provider": event.Provider, "eventCode": event.EventCode, "severity": event.Severity, "message": event.Message, "occurredAt": event.OccurredAt.Format(time.RFC3339Nano), "metadata": event.Metadata})
	}
	return result
}

func (q *criticalEventQueue) markPublished(ctx context.Context) error {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.loadLocked(ctx)
	q.state.Pending = nil
	return q.saveLocked(ctx)
}
func (q *criticalEventQueue) loadLocked(ctx context.Context) {
	if q.loaded {
		return
	}
	q.state.Known = map[string]time.Time{}
	if q.store != nil {
		_ = q.store.LoadJSON(ctx, criticalEventStateFile, &q.state)
	}
	if q.state.Known == nil {
		q.state.Known = map[string]time.Time{}
	}
	q.loaded = true
}
func (q *criticalEventQueue) saveLocked(ctx context.Context) error {
	if q.store == nil {
		return nil
	}
	return q.store.SaveJSON(ctx, criticalEventStateFile, q.state)
}
