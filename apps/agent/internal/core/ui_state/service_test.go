package uistate

import (
	"context"
	"strings"
	"testing"
	"time"

	"trilink/agent/internal/domain"
	"trilink/agent/internal/infra/storage"
)

type noopLogger struct{}

func (noopLogger) Warn(string, ...any) {}

func TestSetupStatusPrioritizesPortalLinkBeforeRustDesk(t *testing.T) {
	store, localStore, stateDir := newTestStateStore(t)

	if err := localStore.SaveJSON(context.Background(), "identity.json", domain.DeviceIdentity{
		DeviceID: "device-123",
		Hostname: "SERVIDOR",
		OS:       "windows",
	}); err != nil {
		t.Fatalf("save identity: %v", err)
	}

	if err := localStore.SaveJSON(context.Background(), "desired_state.json", domain.DesiredState{
		Version:   1,
		UpdatedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("save desired state: %v", err)
	}

	if err := localStore.SaveJSON(context.Background(), "current_state.json", domain.CurrentState{}); err != nil {
		t.Fatalf("save current state: %v", err)
	}

	if err := store.SaveJSON(context.Background(), "remote_state.json", domain.PersistedRemoteState{
		MachineName:       "SERVIDOR",
		LastBootstrapFlow: "pending_link",
	}); err != nil {
		t.Fatalf("save remote state: %v", err)
	}

	service := NewService(stateDir, ChatwootConfig{}, "1.0.64", nil)

	status, err := service.SetupStatus(context.Background())
	if err != nil {
		t.Fatalf("SetupStatus returned error: %v", err)
	}

	if status.Stage != "Vinculo com a empresa" {
		t.Fatalf("expected stage %q, got %q", "Vinculo com a empresa", status.Stage)
	}

	if len(status.Steps) < 5 {
		t.Fatalf("expected setup steps to be populated, got %d", len(status.Steps))
	}

	if status.Steps[3].Key != "link" {
		t.Fatalf("expected link step before rustdesk, got %q at index 3", status.Steps[3].Key)
	}

	if status.Steps[3].Status != "pending" {
		t.Fatalf("expected link step pending, got %q", status.Steps[3].Status)
	}

	if !strings.Contains(strings.ToLower(status.Summary), "vinculo") {
		t.Fatalf("expected summary to mention portal link, got %q", status.Summary)
	}
}

func TestDescribeBootstrapFlowPendingLinkIsHumanReadable(t *testing.T) {
	got := describeBootstrapFlow("pending_link")
	if !strings.Contains(strings.ToLower(got), "aguardando vinculo") {
		t.Fatalf("expected human-readable pending_link detail, got %q", got)
	}
}

func TestResolveDisplayedRustDeskPasswordPrefersRuntimePassword(t *testing.T) {
	t.Parallel()

	got := resolveDisplayedRustDeskPassword(persistedRemoteState{
		RuntimePassword: "998877",
		DefaultPassword: "112233",
	})
	if got != "998877" {
		t.Fatalf("expected runtime password, got %q", got)
	}
}

func TestResolveDisplayedRustDeskPasswordDoesNotExposeDefaultPassword(t *testing.T) {
	t.Parallel()

	got := resolveDisplayedRustDeskPassword(persistedRemoteState{
		RuntimePassword: "",
		DefaultPassword: "112233",
	})
	if got != "" {
		t.Fatalf("expected empty password when only bootstrap password exists, got %q", got)
	}
}

func TestResolveDisplayedRustDeskPasswordIgnoresRuntimeWhenItMatchesDefault(t *testing.T) {
	t.Parallel()

	got := resolveDisplayedRustDeskPassword(persistedRemoteState{
		RuntimePassword: "112233",
		DefaultPassword: "112233",
	})
	if got != "" {
		t.Fatalf("expected empty password when runtime matches bootstrap password, got %q", got)
	}
}

func TestBuildRemoteErrorDetailIncludesNextRetry(t *testing.T) {
	t.Parallel()

	detail := buildRemoteErrorDetail(persistedRemoteState{
		LastErrorMessage: "agentToken invalido ou expirado.",
		NextRetryAt:      mustParseRetryTime(t, "2026-07-14T20:15:00Z"),
	})
	if detail == "" {
		t.Fatalf("expected detail to include retry guidance")
	}
}

func TestDeriveStructuredRemoteErrorUsesPhase(t *testing.T) {
	t.Parallel()

	detail := deriveStructuredRemoteError(persistedRemoteState{
		LastErrorPhase:   "discover",
		LastErrorMessage: "Token de descoberta invalido.",
	}, "discover")
	if detail == "" {
		t.Fatalf("expected structured discover error detail")
	}
}

func newTestStateStore(t *testing.T) (*storage.ProtectedStateStore, *storage.LocalStateStore, string) {
	t.Helper()

	stateDir := t.TempDir()
	localStore := storage.NewLocalStateStore(stateDir, noopLogger{})
	return storage.NewProtectedStateStore(localStore), localStore, stateDir
}

func mustParseRetryTime(t *testing.T, value string) time.Time {
	t.Helper()

	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		t.Fatalf("parse time: %v", err)
	}
	return parsed
}
