package remote

import (
	"os"
	"path/filepath"
	"slices"
	"testing"
)

func TestRustDeskConfigPathsIncludeSystemProfile(t *testing.T) {
	t.Parallel()

	paths := rustDeskConfigPaths()
	expected := `C:\Windows\system32\config\systemprofile\AppData\Roaming\RustDesk\config\RustDesk2.toml`
	if !slices.Contains(paths, expected) {
		t.Fatalf("expected config paths to include %q, got %v", expected, paths)
	}
}

func TestReadRustDeskIDFromConfig(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "relay-server = 'relay.example.com'\nid = '123456789'\nenc-id = 'ignored'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	got := readRustDeskIDFromConfig(path)
	if got != "123456789" {
		t.Fatalf("expected rustdesk id 123456789, got %q", got)
	}
}

func TestBuildRustDeskMSIInstallArgsDisablesTrayLaunch(t *testing.T) {
	t.Parallel()

	args := buildRustDeskMSIInstallArgs(`C:\tmp\rustdesk.msi`, `C:\tmp\rustdesk.log`)
	if !slices.Contains(args, "LAUNCH_TRAY_APP=") {
		t.Fatalf("expected LAUNCH_TRAY_APP= in args, got %v", args)
	}
	if !slices.Contains(args, "/l*v") {
		t.Fatalf("expected verbose log flag in args, got %v", args)
	}
}
