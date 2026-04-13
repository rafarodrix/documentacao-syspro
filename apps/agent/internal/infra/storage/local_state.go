package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type Logger interface {
	Warn(msg string, kv ...any)
}

type LocalStateStore struct {
	baseDir string
	logger  Logger
}

func NewLocalStateStore(baseDir string, logger Logger) *LocalStateStore {
	return &LocalStateStore{
		baseDir: baseDir,
		logger:  logger,
	}
}

func (s *LocalStateStore) SaveJSON(ctx context.Context, name string, value any) error {
	_ = ctx

	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal json: %w", err)
	}

	path := filepath.Join(s.baseDir, name)
	return writeFileAtomic(path, data, 0o644)
}

func (s *LocalStateStore) LoadJSON(ctx context.Context, name string, dest any) error {
	_ = ctx

	path := filepath.Join(s.baseDir, name)
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}

	if err := json.Unmarshal(data, dest); err != nil {
		return fmt.Errorf("unmarshal json: %w", err)
	}

	return nil
}