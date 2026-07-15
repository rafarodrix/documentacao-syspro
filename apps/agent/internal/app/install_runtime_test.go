package app

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"trilink/agent/internal/infra/config"
)

func TestEnsureRuntimeLayoutSeedsProgramDataEnvFromInstallConfig(t *testing.T) {
	t.Parallel()

	programData := t.TempDir()
	previousProgramData := os.Getenv("ProgramData")
	previousStateDir := os.Getenv("AGENT_STATE_DIR")
	t.Cleanup(func() {
		_ = os.Setenv("ProgramData", previousProgramData)
		_ = os.Setenv("AGENT_STATE_DIR", previousStateDir)
	})

	if err := os.Setenv("ProgramData", programData); err != nil {
		t.Fatalf("set ProgramData: %v", err)
	}
	if err := os.Unsetenv("AGENT_STATE_DIR"); err != nil {
		t.Fatalf("unset AGENT_STATE_DIR: %v", err)
	}

	installRoot := filepath.Join(t.TempDir(), "Agente")
	if err := os.MkdirAll(filepath.Join(installRoot, "config"), 0o755); err != nil {
		t.Fatalf("mkdir install config: %v", err)
	}

	seedContent := "PORTAL_BASE_URL=https://backend.trilinksoftware.com.br\nPORTAL_API_KEY=abc123\n"
	if err := os.WriteFile(filepath.Join(installRoot, "config", ".env"), []byte(seedContent), 0o600); err != nil {
		t.Fatalf("write env seed: %v", err)
	}

	exePath := filepath.Join(installRoot, "agent-service.exe")
	if err := ensureRuntimeLayout(exePath); err != nil {
		t.Fatalf("ensureRuntimeLayout: %v", err)
	}

	envTarget := config.DefaultEnvFilePath()
	data, err := os.ReadFile(envTarget)
	if err != nil {
		t.Fatalf("read seeded env: %v", err)
	}

	content := string(data)
	if !strings.Contains(content, "PORTAL_BASE_URL=https://backend.trilinksoftware.com.br") {
		t.Fatalf("expected seeded portal base url, got %q", content)
	}
	if !strings.Contains(content, "PORTAL_API_KEY=abc123") {
		t.Fatalf("expected seeded api key, got %q", content)
	}
	if !strings.Contains(content, "AGENT_IPC_TOKEN=") {
		t.Fatalf("expected AGENT_IPC_TOKEN to be appended, got %q", content)
	}

	if got := config.DefaultStateDir(); got != filepath.Join(programData, "Trilink", "Agent") {
		t.Fatalf("expected canonical state dir, got %s", got)
	}
}
