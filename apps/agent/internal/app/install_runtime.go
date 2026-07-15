package app

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"trilink/agent/internal/infra/config"
)

// PrepareInstallRuntime seeds the runtime folders and env file expected by the
// Windows service before SCM registration/start. This keeps installer startup
// logic inside the Go binary rather than PowerShell wrappers.
func PrepareInstallRuntime(exePath string) error {
	return ensureRuntimeLayout(exePath)
}

func ensureRuntimeLayout(exePath string) error {
	stateDir := config.DefaultStateDir()
	envTarget := config.DefaultEnvFilePath()
	installRoot := filepath.Dir(exePath)

	if err := os.MkdirAll(stateDir, 0o755); err != nil {
		return fmt.Errorf("create state dir: %w", err)
	}
	if err := os.MkdirAll(filepath.Join(stateDir, "logs"), 0o755); err != nil {
		return fmt.Errorf("create logs dir: %w", err)
	}
	if err := os.MkdirAll(filepath.Dir(envTarget), 0o755); err != nil {
		return fmt.Errorf("create env dir: %w", err)
	}

	if err := seedRuntimeEnvIfMissing(envTarget, installRoot); err != nil {
		return err
	}

	if err := ensureEnvKey(envTarget, "AGENT_IPC_TOKEN", generateInstallToken()); err != nil {
		return err
	}

	return nil
}

func seedRuntimeEnvIfMissing(envTarget, installRoot string) error {
	if _, err := os.Stat(envTarget); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return fmt.Errorf("stat env target: %w", err)
	}

	seedCandidates := []string{
		filepath.Join(installRoot, "config", ".env"),
		filepath.Join(installRoot, "config", ".env.example"),
	}

	for _, candidate := range seedCandidates {
		if _, statErr := os.Stat(candidate); statErr != nil {
			continue
		}

		data, readErr := os.ReadFile(candidate)
		if readErr != nil {
			return fmt.Errorf("read env seed %s: %w", candidate, readErr)
		}
		if writeErr := os.WriteFile(envTarget, data, 0o600); writeErr != nil {
			return fmt.Errorf("write env seed %s: %w", envTarget, writeErr)
		}
		return nil
	}

	if err := os.WriteFile(envTarget, []byte("# Trilink Agent runtime config\n"), 0o600); err != nil {
		return fmt.Errorf("create empty env file: %w", err)
	}
	return nil
}

func ensureEnvKey(path, key, fallbackValue string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read env file %s: %w", path, err)
	}

	content := strings.ReplaceAll(string(data), "\r\n", "\n")
	lines := strings.Split(content, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		parts := strings.SplitN(trimmed, "=", 2)
		if len(parts) == 2 && strings.TrimSpace(parts[0]) == key && strings.TrimSpace(parts[1]) != "" {
			return nil
		}
	}

	if !strings.HasSuffix(content, "\n") {
		content += "\n"
	}
	content += key + "=" + fallbackValue + "\n"
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		return fmt.Errorf("write env file %s: %w", path, err)
	}
	return nil
}

func generateInstallToken() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "trilink-agent-local"
	}
	return hex.EncodeToString(buf)
}
