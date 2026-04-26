//go:build !windows

package webview

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
)

type Logger interface {
	Info(msg string, kv ...any)
}

type NativeBridge interface {
	Invoke(ctx context.Context, action string, payload string) (string, error)
}

type Opener struct {
	logger   Logger
	stateDir string
	bridge   NativeBridge
}

func NewOpener(logger Logger, stateDir string, bridge NativeBridge) *Opener {
	return &Opener{logger: logger, stateDir: stateDir, bridge: bridge}
}

func (o *Opener) Open(ctx context.Context, target string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.CommandContext(ctx, "open", target)
	default:
		cmd = exec.CommandContext(ctx, "xdg-open", target)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open target %q: %w", target, err)
	}
	o.logger.Info("ui target opened", "target", target)
	return nil
}
