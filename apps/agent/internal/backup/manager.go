package backup

import (
	"context"
	"fmt"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

type Manager struct{}

func (m *Manager) Run(ctx context.Context, policy BackupPolicy) (Result, error) {
	task := &Task{
		ID:        uuid.NewString(),
		Policy:    policy,
		StartedAt: time.Now(),
	}

	baseName := filepath.Base(policy.DatabasePath)
	task.FBKPath = filepath.Join(policy.WorkingDir, fmt.Sprintf("%s_%s.fbk", baseName, task.ID))
	task.ArchivePath = filepath.Join(policy.WorkingDir, fmt.Sprintf("%s_%s.7z", baseName, task.ID))

	runCtx := ctx
	if policy.Timeout > 0 {
		var cancel context.CancelFunc
		runCtx, cancel = context.WithTimeout(ctx, policy.Timeout)
		defer cancel()
	}

	if err := ExecuteGbak(runCtx, task); err != nil {
		task.LastError = err
		task.FinishedAt = time.Now()
		return task.ToResult(""), err
	}

	if err := CompressTo7z(runCtx, task); err != nil {
		task.LastError = err
		task.FinishedAt = time.Now()
		return task.ToResult(""), err
	}

	hashPath := task.ArchivePath
	if !policy.Compression.Enabled {
		hashPath = task.FBKPath
	}
	hash, err := fileSHA256(hashPath)
	if err != nil {
		task.LastError = err
		task.FinishedAt = time.Now()
		return task.ToResult(""), err
	}

	if err := UploadWithRclone(runCtx, task); err != nil {
		task.LastError = err
		task.FinishedAt = time.Now()
		return task.ToResult(hash), err
	}

	task.FinishedAt = time.Now()
	return task.ToResult(hash), nil
}