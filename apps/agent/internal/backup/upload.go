package backup

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"time"
)

func UploadWithRclone(ctx context.Context, task *Task) error {
	task.CurrentStage = StageUpload

	source := task.ArchivePath
	if source == "" {
		source = task.FBKPath
	}

	fileName := filepath.Base(source)
	target := fmt.Sprintf("%s:%s/%s",
		task.Policy.Upload.RemoteName,
		task.Policy.Upload.RemotePath,
		fileName,
	)

	args := []string{"copyto", source, target}
	if task.Policy.Upload.BwLimit != "" {
		args = append(args, "--bwlimit", task.Policy.Upload.BwLimit)
	}

	start := time.Now()
	cmd := exec.CommandContext(ctx, task.Policy.RclonePath, args...)
	output, err := cmd.CombinedOutput()
	task.UploadDuration = time.Since(start)

	if err != nil {
		return fmt.Errorf("falha no upload: %w | saída: %s", err, string(output))
	}

	return nil
}