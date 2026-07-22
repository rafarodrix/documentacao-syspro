//go:build !windows

package device

import "context"

func collectCriticalWindowsEvents(_ context.Context) ([]criticalEvent, error) { return nil, nil }
