package remote

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type agentUpdateLauncher struct {
	executable func() (string, error)
	stat       func(string) (os.FileInfo, error)
	start      func(string, ...string) error
}

func newAgentUpdateLauncher() agentUpdateLauncher {
	return agentUpdateLauncher{
		executable: os.Executable,
		stat:       os.Stat,
		start: func(name string, args ...string) error {
			return exec.Command(name, args...).Start()
		},
	}
}

func (l agentUpdateLauncher) launch(manifestURL, serviceVersion string) error {
	executable, err := l.executable()
	if err != nil {
		return fmt.Errorf("resolve agent executable: %w", err)
	}

	updater := filepath.Join(filepath.Dir(executable), "agent-updater.exe")
	if _, err := l.stat(updater); err != nil {
		return fmt.Errorf("locate updater %s: %w", updater, err)
	}

	args := []string{
		"apply-remote",
		"--manifest-url", strings.TrimSpace(manifestURL),
		"--components", "service,ui",
		"--service-version", strings.TrimSpace(serviceVersion),
	}
	if err := l.start(updater, args...); err != nil {
		return fmt.Errorf("start updater: %w", err)
	}

	return nil
}
