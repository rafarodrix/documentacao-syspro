package runtime

import (
	"bytes"
	"context"
	"os/exec"

	"trilink/agent/internal/core/agent"
)

type Logger interface {
	Info(msg string, kv ...any)
	Error(msg string, kv ...any)
}

type Executor struct {
	logger Logger
}

func NewExecutor(logger Logger) *Executor {
	return &Executor{logger: logger}
}

func (e *Executor) Run(ctx context.Context, req agent.ExecRequest) agent.ExecResult {
	cmd := exec.CommandContext(ctx, req.Command, req.Args...)
	cmd.Dir = req.Dir

	var stdout bytes.Buffer
	var stderr bytes.Buffer

	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := agent.ExecResult{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
		Err:    err,
	}

	if cmd.ProcessState != nil {
		result.ExitCode = cmd.ProcessState.ExitCode()
	}

	if err != nil {
		e.logger.Error("command failed",
			"name", req.Name,
			"command", req.Command,
			"exit_code", result.ExitCode,
			"stderr", result.Stderr,
		)
	} else {
		e.logger.Info("command finished",
			"name", req.Name,
			"command", req.Command,
			"exit_code", result.ExitCode,
		)
	}

	return result
}
