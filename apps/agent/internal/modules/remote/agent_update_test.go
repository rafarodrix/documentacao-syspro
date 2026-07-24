package remote

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestAgentUpdateLauncherStartsServiceAndUIUpdate(t *testing.T) {
	var command string
	var args []string
	launcher := agentUpdateLauncher{
		executable: func() (string, error) { return `C:\Program Files\Trilink\Agente\agent-service.exe`, nil },
		stat:       func(string) (os.FileInfo, error) { return nil, nil },
		start: func(name string, gotArgs ...string) error {
			command = name
			args = gotArgs
			return nil
		},
	}

	if err := launcher.launch(" https://ajuda.trilinksoftware.com.br/agent/manifest.json ", " 1.0.92 "); err != nil {
		t.Fatalf("launch returned error: %v", err)
	}

	if want := filepath.Join(`C:\Program Files\Trilink\Agente`, "agent-updater.exe"); command != want {
		t.Fatalf("command = %q, want %q", command, want)
	}
	wantArgs := []string{"apply-remote", "--manifest-url", "https://ajuda.trilinksoftware.com.br/agent/manifest.json", "--components", "service,ui", "--service-version", "1.0.92"}
	if !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("args = %#v, want %#v", args, wantArgs)
	}
}

func TestAgentUpdateLauncherReturnsStartFailure(t *testing.T) {
	launcher := agentUpdateLauncher{
		executable: func() (string, error) { return `C:\agent-service.exe`, nil },
		stat:       func(string) (os.FileInfo, error) { return nil, nil },
		start:      func(string, ...string) error { return errors.New("denied") },
	}

	if err := launcher.launch("https://example.test/manifest.json", "1.0.92"); err == nil {
		t.Fatal("expected start failure")
	}
}
