package platform

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"runtime"

	"trilink/agent/internal/domain"
)

type Logger interface {
	Warn(msg string, kv ...any)
}

type WindowsIdentitySource struct {
	logger Logger
}

func NewWindowsIdentitySource(logger Logger) *WindowsIdentitySource {
	return &WindowsIdentitySource{logger: logger}
}

func (s *WindowsIdentitySource) GetIdentity(ctx context.Context) (domain.DeviceIdentity, error) {
	_ = ctx

	hostname, err := os.Hostname()
	if err != nil {
		return domain.DeviceIdentity{}, fmt.Errorf("hostname: %w", err)
	}

	sum := sha256.Sum256([]byte(hostname + "|" + runtime.GOOS))

	return domain.DeviceIdentity{
		DeviceID:       hex.EncodeToString(sum[:16]),
		Hostname:       hostname,
		OS:             runtime.GOOS,
		IdentitySource: "hostname-fallback",
	}, nil
}
