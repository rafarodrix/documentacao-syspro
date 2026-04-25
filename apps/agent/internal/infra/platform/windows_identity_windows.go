//go:build windows

package platform

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"runtime"
	"strings"

	"golang.org/x/sys/windows/registry"

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

	deviceID, source := resolveMachineIdentityID(hostname, s.logger)
	return domain.DeviceIdentity{
		DeviceID:       deviceID,
		Hostname:       hostname,
		OS:             runtime.GOOS,
		IdentitySource: source,
	}, nil
}

func resolveMachineIdentityID(hostname string, logger Logger) (string, string) {
	key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Cryptography`, registry.QUERY_VALUE)
	if err == nil {
		defer key.Close()

		if guid, _, err := key.GetStringValue("MachineGuid"); err == nil {
			if sanitized := sanitizeGUID(guid); sanitized != "" {
				return sanitized, "machine-guid"
			}
		} else if logger != nil {
			logger.Warn("machine guid lookup failed", "error", err)
		}
	} else if logger != nil {
		logger.Warn("machine guid registry open failed", "error", err)
	}

	sum := sha256.Sum256([]byte(hostname + "|" + runtime.GOOS))
	return hex.EncodeToString(sum[:16]), "hostname-fallback"
}

func sanitizeGUID(value string) string {
	var b strings.Builder
	b.Grow(len(value))
	for _, r := range strings.ToLower(strings.TrimSpace(value)) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}
