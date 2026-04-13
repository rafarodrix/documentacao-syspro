package backup

import (
	"context"
	"fmt"
	"os/exec"
	"time"
)

func ExecuteGbak(ctx context.Context, task *Task) error {
	task.CurrentStage = StageGbak

	start := time.Now()
	cmd := exec.CommandContext(
		ctx,
		task.Policy.GbakPath,
		"-b",
		"-v",
		"-user", task.Policy.Credentials.Username,
		"-pass", task.Policy.Credentials.Password,
		task.Policy.DatabasePath,
		task.FBKPath,
	)

	output, err := cmd.CombinedOutput()
	task.GbakDuration = time.Since(start)

	if err != nil {
		return fmt.Errorf("falha no gbak: %w | saída: %s", err, string(output))
	}

	size, err := validateFileExists(task.FBKPath, 1024)
	if err != nil {
		return fmt.Errorf("falha validando fbk: %w", err)
	}
	task.FBKSizeBytes = size

	return nil
}