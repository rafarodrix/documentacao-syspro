package identity

import (
	"context"
	"testing"

	"trilink/agent/internal/domain"
	"trilink/agent/internal/infra/storage"
)

type fakeSource struct {
	identity domain.DeviceIdentity
}

func (f fakeSource) GetIdentity(ctx context.Context) (domain.DeviceIdentity, error) {
	_ = ctx
	return f.identity, nil
}

type noopLogger struct{}

func (noopLogger) Info(string, ...any) {}
func (noopLogger) Warn(string, ...any) {}

func TestGetPersistsDeviceAndInstallationIdentities(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	stateDir := t.TempDir()
	store := storage.NewProtectedStateStore(storage.NewLocalStateStore(stateDir, noopLogger{}))

	service := NewService(fakeSource{
		identity: domain.DeviceIdentity{
			DeviceID:       "device-123",
			Hostname:       "SERVIDOR",
			OS:             "windows",
			IdentitySource: "machine-guid",
		},
	}, store, noopLogger{})

	identity, err := service.Get(ctx)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}

	if identity.Device.DeviceID != "device-123" {
		t.Fatalf("expected device id to be persisted, got %q", identity.Device.DeviceID)
	}
	if identity.Installation.AgentInstanceID == "" {
		t.Fatalf("expected agent instance id to be generated")
	}
	if identity.Installation.CredentialID == "" {
		t.Fatalf("expected credential id to be generated")
	}

	var persistedDevice domain.DeviceIdentity
	if err := store.LoadJSON(ctx, "identity.json", &persistedDevice); err != nil {
		t.Fatalf("load identity.json: %v", err)
	}
	if persistedDevice.DeviceID != identity.Device.DeviceID {
		t.Fatalf("expected persisted device id %q, got %q", identity.Device.DeviceID, persistedDevice.DeviceID)
	}

	var persistedInstallation domain.AgentInstallation
	if err := store.LoadJSON(ctx, "installation.json", &persistedInstallation); err != nil {
		t.Fatalf("load installation.json: %v", err)
	}
	if persistedInstallation.AgentInstanceID != identity.Installation.AgentInstanceID {
		t.Fatalf("expected persisted agent instance id %q, got %q", identity.Installation.AgentInstanceID, persistedInstallation.AgentInstanceID)
	}
	if persistedInstallation.CredentialID != identity.Installation.CredentialID {
		t.Fatalf("expected persisted credential id %q, got %q", identity.Installation.CredentialID, persistedInstallation.CredentialID)
	}
}

func TestGetReusesExistingInstallationIdentity(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	stateDir := t.TempDir()
	store := storage.NewProtectedStateStore(storage.NewLocalStateStore(stateDir, noopLogger{}))

	if err := store.SaveJSON(ctx, "identity.json", domain.DeviceIdentity{
		DeviceID:       "device-123",
		Hostname:       "SERVIDOR",
		OS:             "windows",
		IdentitySource: "machine-guid",
	}); err != nil {
		t.Fatalf("seed identity.json: %v", err)
	}

	if err := store.SaveJSON(ctx, "installation.json", domain.AgentInstallation{
		AgentInstanceID: "install-123",
		CredentialID:    "cred-123",
	}); err != nil {
		t.Fatalf("seed installation.json: %v", err)
	}

	service := NewService(fakeSource{
		identity: domain.DeviceIdentity{
			DeviceID:       "device-456",
			Hostname:       "SERVIDOR-02",
			OS:             "windows",
			IdentitySource: "hostname-fallback",
		},
	}, store, noopLogger{})

	identity, err := service.Get(ctx)
	if err != nil {
		t.Fatalf("Get returned error: %v", err)
	}

	if identity.Installation.AgentInstanceID != "install-123" {
		t.Fatalf("expected installation identity reuse, got %q", identity.Installation.AgentInstanceID)
	}
	if identity.Installation.CredentialID != "cred-123" {
		t.Fatalf("expected credential reuse, got %q", identity.Installation.CredentialID)
	}
	if identity.Device.DeviceID != "device-123" {
		t.Fatalf("expected cached machine-guid identity to stay stable, got %q", identity.Device.DeviceID)
	}
}
