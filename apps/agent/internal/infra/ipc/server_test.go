package ipc

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"trilink/agent/internal/contracts/agentui"
	uistate "trilink/agent/internal/core/ui_state"
)

type noopLogger struct{}

func (noopLogger) Debug(string, ...any) {}
func (noopLogger) Info(string, ...any)  {}

type stubSummaryProvider struct{}

func (stubSummaryProvider) Snapshot(context.Context) (uistate.Summary, error) {
	return uistate.Summary{ServiceStatus: "ok", UserVisible: true}, nil
}

type stubNotificationProvider struct{}

func (stubNotificationProvider) ListNotifications(context.Context) ([]uistate.Notification, error) {
	return []uistate.Notification{{
		ID:         "n1",
		Title:      "Aviso",
		Message:    "Teste",
		Severity:   "warn",
		OccurredAt: time.Now().UTC(),
	}}, nil
}

type stubSetupViewProvider struct{}

func (stubSetupViewProvider) AgentSetupView(context.Context) (uistate.AgentSetupView, error) {
	return uistate.AgentSetupView{Complete: true, Stage: "Concluido"}, nil
}

type stubSupportViewProvider struct{}

func (stubSupportViewProvider) AgentSupportView(context.Context) (uistate.AgentSupportView, error) {
	return uistate.AgentSupportView{}, nil
}

type stubActionProvider struct{}

func (stubActionProvider) OpenSupportConversation(context.Context) (uistate.ActionResult, error) {
	return uistate.ActionResult{Accepted: true, Target: uistate.TargetSupportConversation}, nil
}

func (stubActionProvider) OpenSetupExperience(context.Context) (uistate.ActionResult, error) {
	return uistate.ActionResult{Accepted: true, Target: uistate.TargetSetupExperience}, nil
}

func (stubActionProvider) OpenRemoteClient(context.Context) (uistate.ActionResult, error) {
	return uistate.ActionResult{Accepted: true}, nil
}

func (stubActionProvider) SyncSupportConversationContext(context.Context, string) (uistate.SupportContextSyncResult, error) {
	return uistate.SupportContextSyncResult{Accepted: true, Message: "ok"}, nil
}

func newTestServer(token string) *Server {
	return NewServer(
		`\\.\pipe\trilink-agent-ipc`,
		token,
		noopLogger{},
		stubSummaryProvider{},
		stubNotificationProvider{},
		stubSetupViewProvider{},
		stubSupportViewProvider{},
		stubActionProvider{},
	)
}

func TestServerIncludesProtocolVersionHeader(t *testing.T) {
	server := newTestServer("secret")
	handler := server.withAuth(server.newMux())

	req := httptest.NewRequest(http.MethodGet, "/summary", nil)
	req.Header.Set("X-IPC-Token", "secret")
	req.Header.Set(agentui.ProtocolVersionHeader, agentui.ProtocolVersion)

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if got := rec.Header().Get(agentui.ProtocolVersionHeader); got != agentui.ProtocolVersion {
		t.Fatalf("expected protocol version header %q, got %q", agentui.ProtocolVersion, got)
	}
}

func TestServerRejectsMismatchedProtocolVersion(t *testing.T) {
	server := newTestServer("secret")
	handler := server.withAuth(server.newMux())

	req := httptest.NewRequest(http.MethodGet, "/summary", nil)
	req.Header.Set("X-IPC-Token", "secret")
	req.Header.Set(agentui.ProtocolVersionHeader, "agent-ui.v0")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusPreconditionFailed {
		t.Fatalf("expected status 412, got %d", rec.Code)
	}

	var payload agentui.ErrorResponse
	if err := json.NewDecoder(rec.Body).Decode(&payload); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	if payload.Error != "IPC_PROTOCOL_VERSION_MISMATCH" {
		t.Fatalf("expected version mismatch error, got %q", payload.Error)
	}
}
