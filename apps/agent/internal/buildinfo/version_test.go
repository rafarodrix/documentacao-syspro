package buildinfo

import "testing"

func TestRuntimeVersionUsesReleaseBuildVersion(t *testing.T) {
	previous := Version
	Version = "1.0.86"
	t.Cleanup(func() { Version = previous })

	if got := RuntimeVersion("go-agent-v2"); got != "1.0.86" {
		t.Fatalf("RuntimeVersion() = %q, want release version", got)
	}
}

func TestRuntimeVersionKeepsConfiguredVersionForDevelopmentBuild(t *testing.T) {
	previous := Version
	Version = "dev"
	t.Cleanup(func() { Version = previous })

	if got := RuntimeVersion("go-agent-v2"); got != "go-agent-v2" {
		t.Fatalf("RuntimeVersion() = %q, want configured version", got)
	}
}
