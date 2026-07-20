package uistate

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"trilink/agent/internal/domain"
	"trilink/agent/internal/infra/storage"
)

type noopLogger struct{}

func (noopLogger) Warn(string, ...any) {}

func TestAgentSetupViewPrioritizesPortalLinkBeforeRustDesk(t *testing.T) {
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

	view, err := service.AgentSetupView(context.Background())
	if err != nil {
		t.Fatalf("AgentSetupView returned error: %v", err)
	}

	if view.Stage != "Vinculo com a empresa" {
		t.Fatalf("expected stage %q, got %q", "Vinculo com a empresa", view.Stage)
	}

	if len(view.Steps) < 5 {
		t.Fatalf("expected setup steps to be populated, got %d", len(view.Steps))
	}

	if view.Steps[3].Key != "link" {
		t.Fatalf("expected link step before rustdesk, got %q at index 3", view.Steps[3].Key)
	}

	if view.Steps[3].Status != "pending" {
		t.Fatalf("expected link step pending, got %q", view.Steps[3].Status)
	}

	if !strings.Contains(strings.ToLower(view.Summary), "vinculo") {
		t.Fatalf("expected summary to mention portal link, got %q", view.Summary)
	}
}

func TestDescribeBootstrapFlowPendingLinkIsHumanReadable(t *testing.T) {
	got := describeBootstrapFlow("pending_link")
	if !strings.Contains(strings.ToLower(got), "bootstrap tecnico") {
		t.Fatalf("expected human-readable pending_link detail, got %q", got)
	}
}

func TestAgentSetupViewMarksTechnicalBootstrapAsCompleteWhileAwaitingLink(t *testing.T) {
	store, localStore, stateDir := newTestStateStore(t)

	if err := localStore.SaveJSON(context.Background(), "identity.json", domain.DeviceIdentity{
		DeviceID: "device-456",
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
		RustDeskID:        "123456789",
		PendingLinkReady:  true,
		LastBootstrapFlow: "pending_link_bootstrapped",
	}); err != nil {
		t.Fatalf("save remote state: %v", err)
	}

	service := NewService(stateDir, ChatwootConfig{}, "1.0.64", nil)

	view, err := service.AgentSetupView(context.Background())
	if err != nil {
		t.Fatalf("AgentSetupView returned error: %v", err)
	}

	if !view.Complete {
		t.Fatalf("expected technical bootstrap to mark setup as complete")
	}
	if view.ProgressPct != 100 {
		t.Fatalf("expected progress to be 100, got %d", view.ProgressPct)
	}
	if !strings.Contains(strings.ToLower(view.Summary), "vincular") {
		t.Fatalf("expected summary to mention pending link, got %q", view.Summary)
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

func TestResolveRustDeskExecutablePrefersConfiguredPath(t *testing.T) {
	t.Parallel()

	store, _, stateDir := newTestStateStore(t)
	exeDir := t.TempDir()
	exePath := filepath.Join(exeDir, "rustdesk.exe")
	if err := os.WriteFile(exePath, []byte("stub"), 0o644); err != nil {
		t.Fatalf("write executable stub: %v", err)
	}

	if err := store.SaveJSON(context.Background(), "remote_state.json", domain.PersistedRemoteState{
		RustDeskExecutable: exePath,
	}); err != nil {
		t.Fatalf("save remote state: %v", err)
	}

	service := NewService(stateDir, ChatwootConfig{}, "1.0.71", nil)

	got := service.resolveRustDeskExecutable()
	if got != exePath {
		t.Fatalf("expected configured executable %q, got %q", exePath, got)
	}
}

func TestOpenRemoteClientRejectsUntrustedExecutablePath(t *testing.T) {
	t.Parallel()

	store, _, stateDir := newTestStateStore(t)
	exePath := filepath.Join(t.TempDir(), "cmd.exe")
	if err := os.WriteFile(exePath, []byte("stub"), 0o644); err != nil {
		t.Fatalf("write executable stub: %v", err)
	}
	if err := store.SaveJSON(context.Background(), "remote_state.json", domain.PersistedRemoteState{
		RustDeskExecutable: exePath,
	}); err != nil {
		t.Fatalf("save remote state: %v", err)
	}

	service := NewService(stateDir, ChatwootConfig{}, "1.0.71", nil)

	result, err := service.OpenRemoteClient(context.Background())
	if err != nil {
		t.Fatalf("OpenRemoteClient returned unexpected error: %v", err)
	}
	if result.Opened || result.Running {
		t.Fatalf("expected untrusted path to be rejected, got %+v", result)
	}
	if !strings.Contains(strings.ToLower(result.Message), "invalido") {
		t.Fatalf("expected invalid path guidance, got %q", result.Message)
	}
}

func TestIsTrustedRustDeskExecutable(t *testing.T) {
	t.Parallel()

	if !isTrustedRustDeskExecutable(`C:\Program Files\RustDesk\rustdesk.exe`) {
		t.Fatalf("expected rustdesk executable to be trusted")
	}
	if isTrustedRustDeskExecutable(`C:\Windows\System32\cmd.exe`) {
		t.Fatalf("expected non-rustdesk executable to be rejected")
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
