package storage

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"trilink/agent/internal/shared/retry"
)

func writeFileAtomic(path string, data []byte, perm os.FileMode) error {
	dir := filepath.Dir(path)
	tmp := path + ".tmp"

	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("mkdir: %w", err)
	}

	if err := os.WriteFile(tmp, data, perm); err != nil {
		return fmt.Errorf("write temp: %w", err)
	}

	err := retry.Times(5, 150*time.Millisecond, func() error {
		return os.Rename(tmp, path)
	})
	if err != nil {
		return fmt.Errorf("rename temp: %w", err)
	}

	return nil
}
