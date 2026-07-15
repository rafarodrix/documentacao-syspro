package uiwails

import (
	"context"
	"errors"
	"testing"

	uistate "trilink/agent/internal/core/ui_state"
)

type testLogger struct{}

func (testLogger) Debug(string, ...any) {}
func (testLogger) Info(string, ...any)  {}

type fakeSupportSessionClient struct {
	session uistate.SupportSession
	err     error
}

func (f fakeSupportSessionClient) GetSupportSession(context.Context) (uistate.SupportSession, error) {
	return f.session, f.err
}

type fakeLocalState struct {
	session uistate.SupportSession
	err     error
}

func (f fakeLocalState) SetupStatus(context.Context) (uistate.SetupStatus, error) {
	return uistate.SetupStatus{}, nil
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

func (f fakeLocalState) OpenRemoteClient(context.Context) (uistate.ActionResult, error) {
	return uistate.ActionResult{}, nil
}

func (f fakeLocalState) SyncSupportConversationContext(context.Context, string) (uistate.SupportContextSyncResult, error) {
	return uistate.SupportContextSyncResult{}, nil
}

func (f fakeLocalState) SupportSession(context.Context) (uistate.SupportSession, error) {
	return f.session, f.err
}

func TestGetSupportSessionPrefersIPC(t *testing.T) {
	expected := uistate.SupportSession{
		Context: uistate.SupportContext{
			RustDeskID: "123456789",
		},
	}

	api := &API{
		logger: testLogger{},
		support: fakeSupportSessionClient{
			session: expected,
		},
		localState: fakeLocalState{
			session: uistate.SupportSession{
				Context: uistate.SupportContext{RustDeskID: "fallback"},
			},
		},
	}

	got, err := api.GetSupportSession()
	if err != nil {
		t.Fatalf("GetSupportSession returned error: %v", err)
	}
	if got.Context.RustDeskID != expected.Context.RustDeskID {
		t.Fatalf("expected IPC rustdesk id %q, got %q", expected.Context.RustDeskID, got.Context.RustDeskID)
	}
}

func TestGetSupportSessionFallsBackToLocalState(t *testing.T) {
	expected := uistate.SupportSession{
		Context: uistate.SupportContext{
			RustDeskID: "987654321",
		},
	}

	api := &API{
		logger: testLogger{},
		support: fakeSupportSessionClient{
			err: errors.New("ipc unavailable"),
		},
		localState: fakeLocalState{
			session: expected,
		},
	}

	got, err := api.GetSupportSession()
	if err != nil {
		t.Fatalf("GetSupportSession returned error: %v", err)
	}
	if got.Context.RustDeskID != expected.Context.RustDeskID {
		t.Fatalf("expected local fallback rustdesk id %q, got %q", expected.Context.RustDeskID, got.Context.RustDeskID)
	}
}
