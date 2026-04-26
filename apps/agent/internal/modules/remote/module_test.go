package remote

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"trilink/agent/internal/domain"
	"trilink/agent/internal/infra/storage"
)

func TestDiscoverBootstrapSyncCyclePersistsProtectedState(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	store, stateDir := newTestStateStore(t)
	manager := &fakeRustDeskController{
		status: rustDeskStatus{
			ExecutablePath: `C:\Program Files\RustDesk\rustdesk.exe`,
			Installed:      true,
			ServiceStatus:  "running",
			RustDeskID:     "123456789",
			Version:        "1.4.6",
		},
	}
	client := &fakePortalClient{
		discoverResp: &domain.RemoteDiscoverResponse{
			BootstrapFlow: domain.RemoteBootstrapFlowHostBootstrapRequired,
			InstallToken:  "install-token-1",
			HostID:        "host-1",
		},
		bootstrapResp: &domain.RemoteBootstrapResponse{
			HostID:          "host-1",
			CompanyID:       "company-1",
			CompanyName:     "Trilink",
			Alias:           "Servidor",
			RustDeskID:      "123456789",
			MachineName:     "srv-01",
			AgentToken:      "agent-token-1",
			ServerHost:      "relay.example.com",
			APIHost:         "api.example.com",
			PublicKey:       "pub-key",
			PublicKeyHash:   "pub-hash",
			ServerConfig:    "server-config",
			TargetVersion:   "1.4.6",
			DefaultPassword: "123456",
		},
		syncResponses: []*domain.RemoteSyncResponse{
			{
				HostID:              "host-1",
				CompanyName:         "Trilink",
				Alias:               "Servidor",
				RustDeskID:          "123456789",
				MachineName:         "srv-01",
				CurrentAgentVersion: "go-agent-v1",
				Compliance: struct {
					AliasMatch      bool `json:"aliasMatch"`
					VersionMatch    bool `json:"versionMatch"`
					ServerHostMatch bool `json:"serverHostMatch"`
					APIHostMatch    bool `json:"apiHostMatch"`
					PublicKeyMatch  bool `json:"publicKeyMatch"`
				}{
					AliasMatch: true, VersionMatch: true, ServerHostMatch: true, APIHostMatch: true, PublicKeyMatch: true,
				},
				ExpectedConfig: struct {
					ServerHost    string `json:"serverHost"`
					APIHost       string `json:"apiHost"`
					PublicKey     string `json:"publicKey"`
					PublicKeyHash string `json:"publicKeyHash"`
					ServerConfig  string `json:"serverConfig"`
					TargetVersion string `json:"targetVersion"`
					InstallerURL  string `json:"installerUrl"`
					InstallerSHA  string `json:"installerChecksumSha256"`
					InstallerArgs string `json:"installerSilentArgs"`
				}{
					ServerHost: "relay.example.com", APIHost: "api.example.com", PublicKey: "pub-key", PublicKeyHash: "pub-hash", ServerConfig: "server-config", TargetVersion: "1.4.6", InstallerArgs: "/S",
				},
			},
		},
	}

	module := newTestModule(store, client, manager, stateDir)
	result := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{})
	if result.Error != "" {
		t.Fatalf("apply returned error: %s", result.Error)
	}

	var persisted remoteState
	if err := store.LoadJSON(ctx, stateFile, &persisted); err != nil {
		t.Fatalf("load state: %v", err)
	}
	if persisted.AgentToken != "agent-token-1" {
		t.Fatalf("expected persisted agent token, got %q", persisted.AgentToken)
	}
	if persisted.HostID != "host-1" {
		t.Fatalf("expected host id host-1, got %q", persisted.HostID)
	}
	if persisted.RebootstrapRequired {
		t.Fatalf("expected rebootstrap flag to be false")
	}

	rawState, err := os.ReadFile(filepath.Join(stateDir, stateFile))
	if err != nil {
		t.Fatalf("read raw state file: %v", err)
	}
	var rawPayload map[string]any
	if err := json.Unmarshal(rawState, &rawPayload); err != nil {
		t.Fatalf("unmarshal raw state file: %v", err)
	}
	if _, ok := rawPayload["agent_token"]; ok {
		t.Fatalf("expected plaintext agent_token to be absent from raw state file")
	}
	if _, ok := rawPayload["agent_token_encrypted"]; !ok {
		t.Fatalf("expected encrypted agent_token field in raw state file")
	}
}

func TestPendingAckQueueFlushesOnNextSync(t *testing.T) {
	t.Parallel()

	ctx := context.Background()
	store, stateDir := newTestStateStore(t)
	manager := &fakeRustDeskController{
		status: rustDeskStatus{
			ExecutablePath: `C:\Program Files\RustDesk\rustdesk.exe`,
			Installed:      true,
			ServiceStatus:  "running",
			RustDeskID:     "123456789",
			Version:        "1.4.6",
		},
	}
	commandPayload, _ := json.Marshal(aliasCommandPayload{ExpectedAlias: "Servidor Atualizado"})
	client := &fakePortalClient{
		discoverResp: &domain.RemoteDiscoverResponse{
			BootstrapFlow: domain.RemoteBootstrapFlowHostBootstrapRequired,
			InstallToken:  "install-token-1",
			HostID:        "host-1",
		},
		bootstrapResp: &domain.RemoteBootstrapResponse{
			HostID:      "host-1",
			Alias:       "Servidor",
			RustDeskID:  "123456789",
			MachineName: "srv-01",
			AgentToken:  "agent-token-1",
		},
		syncResponses: []*domain.RemoteSyncResponse{
			{
				HostID:              "host-1",
				Alias:               "Servidor",
				RustDeskID:          "123456789",
				MachineName:         "srv-01",
				CurrentAgentVersion: "go-agent-v1",
				Compliance: struct {
					AliasMatch      bool `json:"aliasMatch"`
					VersionMatch    bool `json:"versionMatch"`
					ServerHostMatch bool `json:"serverHostMatch"`
					APIHostMatch    bool `json:"apiHostMatch"`
					PublicKeyMatch  bool `json:"publicKeyMatch"`
				}{
					AliasMatch: true, VersionMatch: true, ServerHostMatch: true, APIHostMatch: true, PublicKeyMatch: true,
				},
				CommandQueue: []domain.RemoteSyncCommand{
					{ID: "cmd-1", Type: domain.RemoteSyncCommandReapplyAlias, Payload: commandPayload},
				},
			},
			{
				HostID:              "host-1",
				Alias:               "Servidor Atualizado",
				RustDeskID:          "123456789",
				MachineName:         "srv-01",
				CurrentAgentVersion: "go-agent-v1",
				Compliance: struct {
					AliasMatch      bool `json:"aliasMatch"`
					VersionMatch    bool `json:"versionMatch"`
					ServerHostMatch bool `json:"serverHostMatch"`
					APIHostMatch    bool `json:"apiHostMatch"`
					PublicKeyMatch  bool `json:"publicKeyMatch"`
				}{
					AliasMatch: true, VersionMatch: true, ServerHostMatch: true, APIHostMatch: true, PublicKeyMatch: true,
				},
			},
		},
		ackFailuresRemaining: 1,
	}

	module := newTestModule(store, client, manager, stateDir)
	first := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{})
	if first.Error != "" {
		t.Fatalf("first apply returned error: %s", first.Error)
	}

	var queued []pendingAck
	if err := store.LoadJSON(ctx, pendingAckFile, &queued); err != nil {
		t.Fatalf("load pending ack queue: %v", err)
	}
	if len(queued) != 1 {
		t.Fatalf("expected one queued ack, got %d", len(queued))
	}

	second := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{})
	if second.Error != "" {
		t.Fatalf("second apply returned error: %s", second.Error)
	}

	if err := store.LoadJSON(ctx, pendingAckFile, &queued); err != nil {
		t.Fatalf("reload pending ack queue: %v", err)
	}
	if len(queued) != 0 {
		t.Fatalf("expected queue to be flushed, got %d remaining items", len(queued))
	}
	if client.ackCount < 2 {
		t.Fatalf("expected ack to be retried, got %d ack attempts", client.ackCount)
	}
}

func managedRemoteDesiredState() domain.DesiredState {
	return domain.DesiredState{
		Version:   1,
		UpdatedAt: time.Now().UTC(),
		Remote: domain.RemoteDesiredState{
			Enabled:          true,
			Mode:             "managed",
			InstallIfMissing: true,
			BootstrapEnabled: true,
			SyncEnabled:      true,
		},
	}
}

func newTestStateStore(t *testing.T) (*storage.ProtectedStateStore, string) {
	t.Helper()

	stateDir := t.TempDir()
	localStore := storage.NewLocalStateStore(stateDir, noopLogger{})
	return storage.NewProtectedStateStore(localStore), stateDir
}

func newTestModule(store StateStore, client PortalClient, manager rustDeskController, stateDir string) *Module {
	module := New(client, store, noopLogger{}, noopEventBus{},
		WithDiscoveryToken("discovery-token"),
		WithInstallToken("install-token"),
		WithAgentVersion("go-agent-v1"),
		WithEnvironment("test"),
		WithStateDir(stateDir),
	)
	module.rustDeskFactory = func() rustDeskController { return manager }
	return module
}

type fakePortalClient struct {
	discoverResp         *domain.RemoteDiscoverResponse
	bootstrapResp        *domain.RemoteBootstrapResponse
	syncResponses        []*domain.RemoteSyncResponse
	ackFailuresRemaining int
	ackCount             int
}

func (f *fakePortalClient) Discover(ctx context.Context, req domain.RemoteDiscoverRequest) (*domain.RemoteDiscoverResponse, error) {
	return f.discoverResp, nil
}

func (f *fakePortalClient) Bootstrap(ctx context.Context, req domain.RemoteBootstrapRequest) (*domain.RemoteBootstrapResponse, error) {
	return f.bootstrapResp, nil
}

func (f *fakePortalClient) Sync(ctx context.Context, req domain.RemoteSyncRequest) (*domain.RemoteSyncResponse, error) {
	if len(f.syncResponses) == 0 {
		return &domain.RemoteSyncResponse{}, nil
	}
	resp := f.syncResponses[0]
	if len(f.syncResponses) > 1 {
		f.syncResponses = f.syncResponses[1:]
	}
	return resp, nil
}

func (f *fakePortalClient) Ack(ctx context.Context, req domain.RemoteAckRequest) error {
	f.ackCount++
	if f.ackFailuresRemaining > 0 {
		f.ackFailuresRemaining--
		return errors.New("temporary ack failure")
	}
	return nil
}

type fakeRustDeskController struct {
	status rustDeskStatus
}

func (f *fakeRustDeskController) inspect(ctx context.Context) (rustDeskStatus, error) {
	return f.status, nil
}

func (f *fakeRustDeskController) ensureInstalled(ctx context.Context, upgrade *rustDeskUpgradeSpec) (string, bool, error) {
	return f.status.ExecutablePath, false, nil
}

func (f *fakeRustDeskController) ensureServiceRunning(ctx context.Context, exePath string) (string, error) {
	return "running", nil
}

func (f *fakeRustDeskController) applyDesiredConfig(ctx context.Context, exePath string, desired rustDeskDesiredConfig) error {
	return nil
}

type noopLogger struct{}

func (noopLogger) Debug(msg string, kv ...any) {}
func (noopLogger) Info(msg string, kv ...any)  {}
func (noopLogger) Warn(msg string, kv ...any)  {}
func (noopLogger) Error(msg string, kv ...any) {}

type noopEventBus struct{}

func (noopEventBus) Publish(ctx context.Context, event domain.TelemetryEvent) error {
	return nil
}
