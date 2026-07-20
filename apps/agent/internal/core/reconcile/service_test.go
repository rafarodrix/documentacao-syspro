package reconcile

import (
	"context"
	"sync"
	"testing"

	"trilink/agent/internal/domain"
)

type reconcileTestDesired struct {
	state domain.DesiredState
}

func (d reconcileTestDesired) GetLast(context.Context) (domain.DesiredState, error) {
	return d.state, nil
}

type reconcileTestStore struct {
	mu    sync.Mutex
	saved map[string]any
}

func (s *reconcileTestStore) SaveJSON(_ context.Context, name string, value any) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.saved == nil {
		s.saved = make(map[string]any)
	}
	s.saved[name] = value
	return nil
}

func (s *reconcileTestStore) LoadJSON(context.Context, string, any) error {
	return nil
}

func (s *reconcileTestStore) Has(name string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.saved[name]
	return ok
}

type reconcileTestLogger struct{}

func (reconcileTestLogger) Debug(string, ...any) {}
func (reconcileTestLogger) Info(string, ...any)  {}
func (reconcileTestLogger) Warn(string, ...any)  {}
func (reconcileTestLogger) Error(string, ...any) {}

type reconcileTestEvents struct{}

func (reconcileTestEvents) Publish(context.Context, domain.TelemetryEvent) error { return nil }

type reconcileTestModule struct {
	cancel  context.CancelFunc
	inspect int
}

func (m *reconcileTestModule) Name() string { return "device" }

func (m *reconcileTestModule) Inspect(context.Context) (domain.CurrentModuleState, error) {
	m.inspect++
	if m.cancel != nil && m.inspect == 1 {
		m.cancel()
	}
	return domain.CurrentModuleState{
		Enabled: true,
		Status:  domain.ModuleStatusReady,
	}, nil
}

func (m *reconcileTestModule) Plan(domain.DesiredState, domain.CurrentModuleState) []domain.ReconcileAction {
	return nil
}

func (m *reconcileTestModule) Apply(context.Context, domain.DesiredState, domain.CurrentModuleState) domain.ApplyResult {
	return domain.ApplyResult{}
}

func TestStartReconcilesImmediately(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	store := &reconcileTestStore{}
	module := &reconcileTestModule{cancel: cancel}
	service := NewService(
		reconcileTestDesired{state: domain.DesiredState{Version: 1}},
		store,
		reconcileTestLogger{},
		reconcileTestEvents{},
		[]Module{module},
	)

	if err := service.Start(ctx); err != nil {
		t.Fatalf("Start returned error: %v", err)
	}

	if module.inspect == 0 {
		t.Fatalf("expected immediate reconcile inspection to run")
	}
	if !store.Has("current_state.json") {
		t.Fatalf("expected current_state.json to be written on immediate reconcile")
	}
}
