package app

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"time"
)

type runtimeLock struct {
	path string
}

func acquireRuntimeLock(stateDir string) (*runtimeLock, error) {
	if err := os.MkdirAll(stateDir, 0o755); err != nil {
		return nil, fmt.Errorf("mkdir runtime state dir: %w", err)
	}

	path := filepath.Join(stateDir, "agent-service.lock")
	file, err := os.OpenFile(path, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		if os.IsExist(err) {
			return nil, fmt.Errorf("agent service already running (%s)", path)
		}
		return nil, fmt.Errorf("open runtime lock: %w", err)
	}

	content := []byte(strconv.Itoa(os.Getpid()) + "\n" + time.Now().UTC().Format(time.RFC3339) + "\n")
	if _, writeErr := file.Write(content); writeErr != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return nil, fmt.Errorf("write runtime lock: %w", writeErr)
	}
	if closeErr := file.Close(); closeErr != nil {
		_ = os.Remove(path)
		return nil, fmt.Errorf("close runtime lock: %w", closeErr)
	}

	return &runtimeLock{path: path}, nil
}

func (l *runtimeLock) Release() error {
	if l == nil || l.path == "" {
		return nil
	}
	err := os.Remove(l.path)
	if err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove runtime lock: %w", err)
	}
	return nil
}
