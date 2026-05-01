package uistate

import "testing"

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

func TestResolveDisplayedRustDeskPasswordFallsBackToDefaultPassword(t *testing.T) {
	t.Parallel()

	got := resolveDisplayedRustDeskPassword(persistedRemoteState{
		RuntimePassword: "",
		DefaultPassword: "112233",
	})
	if got != "112233" {
		t.Fatalf("expected default password fallback, got %q", got)
	}
}
