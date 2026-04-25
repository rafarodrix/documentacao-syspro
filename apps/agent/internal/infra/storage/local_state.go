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

	return s.writeJSONFile(name, data)
}

func (s *LocalStateStore) LoadJSON(ctx context.Context, name string, dest any) error {
	_ = ctx

	data, err := s.readJSONFile(name)
	if err != nil {
		return err
	}

	if err := json.Unmarshal(data, dest); err != nil {
		return fmt.Errorf("unmarshal json: %w", err)
	}

	return nil
}

func (s *LocalStateStore) readJSONFile(name string) ([]byte, error) {
	path := filepath.Join(s.baseDir, name)
	return os.ReadFile(path)
}

func (s *LocalStateStore) writeJSONFile(name string, data []byte) error {
	path := filepath.Join(s.baseDir, name)
	return writeFileAtomic(path, data, 0o644)
}
