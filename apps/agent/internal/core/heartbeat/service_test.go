package heartbeat

import (
	"context"
	"sync"
	"testing"

	"trilink/agent/internal/domain"
)

type heartbeatTestClient struct {
	mu     sync.Mutex
	calls  int
	cancel context.CancelFunc
}

func (c *heartbeatTestClient) SendHeartbeat(context.Context) error {
	c.mu.Lock()
	c.calls++
	cancel := c.cancel
	c.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	return nil
}

func (c *heartbeatTestClient) CallCount() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.calls
}

type heartbeatTestStore struct {
	mu    sync.Mutex
	saved map[string]any
}

func (s *heartbeatTestStore) SaveJSON(_ context.Context, name string, value any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.saved == nil {
		s.saved = make(map[string]any)
	}
	s.saved[name] = value
	return nil
}

func (s *heartbeatTestStore) Has(name string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.saved[name]
	return ok
}

type heartbeatTestLogger struct{}

func (heartbeatTestLogger) Debug(string, ...any) {}
func (heartbeatTestLogger) Info(string, ...any)  {}
func (heartbeatTestLogger) Warn(string, ...any)  {}
func (heartbeatTestLogger) Error(string, ...any) {}

type heartbeatTestEvents struct{}

func (heartbeatTestEvents) Publish(context.Context, domain.TelemetryEvent) error { return nil }

func TestStartSendsHeartbeatImmediately(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	client := &heartbeatTestClient{cancel: cancel}
	store := &heartbeatTestStore{}
	service := NewService(client, store, heartbeatTestLogger{}, heartbeatTestEvents{})

	if err := service.Start(ctx); err != nil {
		t.Fatalf("Start returned error: %v", err)
	}

	if got := client.CallCount(); got != 1 {
		t.Fatalf("expected 1 immediate heartbeat, got %d", got)
	}
	if !store.Has("heartbeat.json") {
		t.Fatalf("expected heartbeat.json to be written on immediate heartbeat")
	}
}
