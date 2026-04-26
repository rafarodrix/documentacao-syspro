//go:build !windows

package winsvc

import (
	"context"
	"fmt"
)

const Name = "TrillinkAgent"

// IsWindowsService always returns false on non-Windows platforms.
func IsWindowsService() (bool, error) { return false, nil }

// Run executes run directly since there is no SCM on non-Windows.
func Run(run func(ctx context.Context) error) error { return run(context.Background()) }

func Install(_ string) error { return fmt.Errorf("service install only supported on Windows") }
func Uninstall() error       { return fmt.Errorf("service uninstall only supported on Windows") }
func Start() error           { return fmt.Errorf("service start only supported on Windows") }
func Stop() error            { return fmt.Errorf("service stop only supported on Windows") }
