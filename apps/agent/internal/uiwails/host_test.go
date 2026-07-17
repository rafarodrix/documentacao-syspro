package uiwails

import (
	"context"
	"errors"
	"testing"
	"testing/fstest"

	"trilink/agent/internal/contracts/agentui"
	uistate "trilink/agent/internal/core/ui_state"
)

type testLogger struct{}

func (testLogger) Debug(string, ...any) {}
func (testLogger) Info(string, ...any)  {}

type fakeSupportViewClient struct {
	view agentui.AgentSupportView
	err  error
}

func (f fakeSupportViewClient) GetAgentSupportView(context.Context) (agentui.AgentSupportView, error) {
	return f.view, f.err
}

type fakeLocalState struct {
	setupView   uistate.AgentSetupView
	supportView uistate.AgentSupportView
	err         error
}

func (f fakeLocalState) Snapshot(context.Context) (uistate.Summary, error) {
	return uistate.Summary{}, nil
}

func (f fakeLocalState) ListNotifications(context.Context) ([]uistate.Notification, error) {
	return nil, nil
}

func (f fakeLocalState) OpenSupportConversation(context.Context) (uistate.ActionResult, error) {
	return uistate.ActionResult{}, nil
}

func (f fakeLocalState) OpenSetupExperience(context.Context) (uistate.ActionResult, error) {
	return uistate.ActionResult{}, nil
}

func (f fakeLocalState) OpenRemoteClient(context.Context) (uistate.OpenRemoteAccessResult, error) {
	return uistate.OpenRemoteAccessResult{}, nil
}

func (f fakeLocalState) SyncSupportConversationContext(context.Context, string) (uistate.SupportContextSyncResult, error) {
	return uistate.SupportContextSyncResult{}, nil
}

func (f fakeLocalState) AgentSetupView(ctx context.Context) (uistate.AgentSetupView, error) {
	_ = ctx
	return f.setupView, f.err
}

func (f fakeLocalState) AgentSupportView(ctx context.Context) (uistate.AgentSupportView, error) {
	_ = ctx
	return f.supportView, f.err
}

func TestGetAgentSupportViewPrefersIPC(t *testing.T) {
	expected := agentui.AgentSupportView{
		Capabilities: agentui.AgentCapabilitiesView{
			Remote: &agentui.AgentCapabilityView{ExternalID: "123456789"},
		},
	}
	fallback := uistate.AgentSupportView{
		Capabilities: uistate.AgentCapabilitiesView{
			Remote: &uistate.AgentCapabilityView{ExternalID: "fallback"},
		},
	}

	api := &API{
		logger: testLogger{},
		support: fakeSupportViewClient{
			view: expected,
		},
		localState: fakeLocalState{
			supportView: fallback,
		},
	}

	got, err := api.GetAgentSupportView()
	if err != nil {
		t.Fatalf("GetAgentSupportView returned error: %v", err)
	}
	if got.Capabilities.Remote == nil || got.Capabilities.Remote.ExternalID != expected.Capabilities.Remote.ExternalID {
		t.Fatalf("expected IPC rustdesk id %q, got %+v", expected.Capabilities.Remote.ExternalID, got.Capabilities.Remote)
	}
}

func TestGetAgentSupportViewFallsBackToLocalState(t *testing.T) {
	expected := uistate.AgentSupportView{
		Capabilities: uistate.AgentCapabilitiesView{
			Remote: &uistate.AgentCapabilityView{ExternalID: "987654321"},
		},
	}

	api := &API{
		logger: testLogger{},
		support: fakeSupportViewClient{
			err: errors.New("ipc unavailable"),
		},
		localState: fakeLocalState{
			supportView: expected,
		},
	}

	got, err := api.GetAgentSupportView()
	if err != nil {
		t.Fatalf("GetAgentSupportView returned error: %v", err)
	}
	if got.Capabilities.Remote == nil || got.Capabilities.Remote.ExternalID != expected.Capabilities.Remote.ExternalID {
		t.Fatalf("expected local fallback rustdesk id %q, got %+v", expected.Capabilities.Remote.ExternalID, got.Capabilities.Remote)
	}
}

func TestHandleSecondInstanceLaunchBackgroundDoesNotForceReveal(t *testing.T) {
	host := NewHost(testLogger{}, nil, fakeLocalState{})
	host.ConfigureStartup(uistate.TargetSetupExperience, false)

	host.HandleSecondInstanceLaunch([]string{"--background"}, `C:\Users\rafael`)

	host.mu.Lock()
	defer host.mu.Unlock()
	if host.showOnStartup {
		t.Fatalf("expected background second instance to keep startup hidden")
	}
}

func TestHandleSecondInstanceLaunchRevealsCurrentTarget(t *testing.T) {
	host := NewHost(testLogger{}, nil, fakeLocalState{})
	host.ConfigureStartup(uistate.TargetSupportConversation, false)

	host.HandleSecondInstanceLaunch(nil, `C:\Users\rafael`)

	host.mu.Lock()
	defer host.mu.Unlock()
	if !host.showOnStartup {
		t.Fatalf("expected second instance to reveal current target")
	}
	if host.currentTarget != uistate.TargetSupportConversation {
		t.Fatalf("expected current target to remain %q, got %q", uistate.TargetSupportConversation, host.currentTarget)
	}
}

func TestBuildAppOptionsConfiguresSingleInstanceLock(t *testing.T) {
	host := NewHost(testLogger{}, nil, fakeLocalState{})
	api := &API{logger: testLogger{}, host: host}
	opts := buildAppOptions(host, api, fstest.MapFS{}, func() {}, func() {})

	if opts.SingleInstanceLock == nil {
		t.Fatalf("expected single instance lock to be configured")
	}
	if opts.SingleInstanceLock.UniqueId != singleInstanceID {
		t.Fatalf("expected single instance id %q, got %q", singleInstanceID, opts.SingleInstanceLock.UniqueId)
	}
	if opts.OnStartup == nil {
		t.Fatalf("expected OnStartup to be configured")
	}
}
