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
