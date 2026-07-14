package uistate

import (
	"testing"
	"time"
)

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

func mustParseRetryTime(t *testing.T, value string) time.Time {
	t.Helper()

	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		t.Fatalf("parse time: %v", err)
	}
	return parsed
}
