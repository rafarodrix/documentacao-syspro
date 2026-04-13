package backup

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"
)

func compressionArgs(profile CompressionProfile) []string {
	switch profile {
	case CompressionFast:
		return []string{"-mx=3", "-mmt=on"}
	case CompressionBalanced:
		return []string{"-mx=5", "-mmt=on"}
	case CompressionMax:
		fallthrough
	default:
		return []string{"-mx=9", "-mmt=on"}
	}
}

func CompressTo7z(ctx context.Context, task *Task) error {
	if !task.Policy.Compression.Enabled {
		task.ArchivePath = task.FBKPath
		task.ArchiveSizeBytes = task.FBKSizeBytes
		return nil
	}

	task.CurrentStage = StageCompress

	args := []string{"a", task.ArchivePath, task.FBKPath}
	args = append(args, compressionArgs(task.Policy.Compression.Profile)...)

	start := time.Now()
	cmd := exec.CommandContext(ctx, task.Policy.SevenZipPath, args...)
	output, err := cmd.CombinedOutput()
	task.CompressDuration = time.Since(start)

	if err != nil {
		return fmt.Errorf("falha na compressão: %w | saída: %s", err, string(output))
	}

	size, err := validateFileExists(task.ArchivePath, 1024)
	if err != nil {
		return fmt.Errorf("falha validando arquivo compactado: %w", err)
	}
	task.ArchiveSizeBytes = size

	if task.Policy.Compression.DeleteSourceAfterSuccess {
		if err := os.Remove(task.FBKPath); err != nil {
			return fmt.Errorf("compactou mas falhou ao remover fbk: %w", err)
		}
	}

	return nil
}