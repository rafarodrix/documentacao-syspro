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
	infrahttp "trilink/agent/internal/infra/http"
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
			AccessPassword: "123456",
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
				CompanyID:           "company-1",
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
					ServerHost               string `json:"serverHost"`
					APIHost                  string `json:"apiHost"`
					PublicKey                string `json:"publicKey"`
					PublicKeyHash            string `json:"publicKeyHash"`
					ServerConfig             string `json:"serverConfig"`
					TargetVersion            string `json:"targetVersion"`
					AutoInstall              bool   `json:"autoInstall"`
					AutoUpgrade              bool   `json:"autoUpgrade"`
					InstallerURL             string `json:"installerUrl"`
					InstallerSHA             string `json:"installerChecksumSha256"`
					InstallerPackageType     string `json:"installerPackageType"`
					InstallerArgs            string `json:"installerSilentArgs"`
					RestartServiceAfterApply bool   `json:"restartServiceAfterApply"`
					SuppressTrayShortcuts    bool   `json:"suppressTrayShortcuts"`
					HideTray                 bool   `json:"hideTray"`
					HideStopService          bool   `json:"hideStopService"`
					AllowRemoteConfigMod     bool   `json:"allowRemoteConfigModification"`
					AllowD3DRender           bool   `json:"allowD3DRender"`
					EnableDirectXCapture     bool   `json:"enableDirectXCapture"`
				}{
					ServerHost: "relay.example.com", APIHost: "api.example.com", PublicKey: "pub-key", PublicKeyHash: "pub-hash", ServerConfig: "server-config", TargetVersion: "1.4.6", AutoInstall: true, AutoUpgrade: true, InstallerPackageType: "AUTO", InstallerArgs: "/S", RestartServiceAfterApply: true, SuppressTrayShortcuts: true, HideTray: true, HideStopService: true, AllowRemoteConfigMod: false, AllowD3DRender: false, EnableDirectXCapture: true,
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
	if persisted.CompanyID != "company-1" {
		t.Fatalf("expected company id company-1, got %q", persisted.CompanyID)
	}
	if persisted.CompanyName != "Trilink" {
		t.Fatalf("expected company name Trilink, got %q", persisted.CompanyName)
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
	if _, ok := rawPayload["default_password"]; ok {
		t.Fatalf("expected plaintext default_password to be absent from raw state file")
	}
	if _, ok := rawPayload["runtime_password"]; ok {
		t.Fatalf("expected plaintext runtime_password to be absent from raw state file")
	}
	if _, ok := rawPayload["default_password_encrypted"]; !ok {
		t.Fatalf("expected encrypted default_password field in raw state file")
	}
	if _, ok := rawPayload["runtime_password_encrypted"]; !ok {
		t.Fatalf("expected encrypted runtime_password field in raw state file")
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
			AccessPassword: "123456",
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
	if queued[0].NextAttemptAt.IsZero() {
		t.Fatalf("expected queued ack to schedule a next attempt")
	}

	rawQueue, err := os.ReadFile(filepath.Join(stateDir, pendingAckFile))
	if err != nil {
		t.Fatalf("read raw ack queue file: %v", err)
	}
	var rawQueuePayload []map[string]any
	if err := json.Unmarshal(rawQueue, &rawQueuePayload); err != nil {
		t.Fatalf("unmarshal raw ack queue file: %v", err)
	}
	if len(rawQueuePayload) != 1 {
		t.Fatalf("expected one raw queued ack entry, got %d", len(rawQueuePayload))
	}
	if _, ok := rawQueuePayload[0]["agent_token"]; ok {
		t.Fatalf("expected plaintext agent_token to be absent from raw ack queue file")
	}
	if _, ok := rawQueuePayload[0]["agent_token_encrypted"]; !ok {
		t.Fatalf("expected encrypted agent_token field in raw ack queue file")
	}

	second := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{})
	if second.Error != "" {
		t.Fatalf("second apply returned error: %s", second.Error)
	}

	if err := store.LoadJSON(ctx, pendingAckFile, &queued); err != nil {
		t.Fatalf("reload pending ack queue: %v", err)
	}
	if len(queued) != 1 {
		t.Fatalf("expected queue to wait for scheduled retry, got %d remaining items", len(queued))
	}
	if client.ackCount != 1 {
		t.Fatalf("expected no immediate retry before nextAttemptAt, got %d ack attempts", client.ackCount)
	}

	queued[0].NextAttemptAt = time.Now().UTC().Add(-time.Second)
	if err := store.SaveJSON(ctx, pendingAckFile, queued); err != nil {
		t.Fatalf("force queued retry: %v", err)
	}

	third := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{})
	if third.Error != "" {
		t.Fatalf("third apply returned error: %s", third.Error)
	}

	if err := store.LoadJSON(ctx, pendingAckFile, &queued); err != nil {
		t.Fatalf("reload pending ack queue after forced retry: %v", err)
	}
	if len(queued) != 0 {
		t.Fatalf("expected queue to be flushed, got %d remaining items", len(queued))
	}
	if client.ackCount < 2 {
		t.Fatalf("expected ack to be retried, got %d ack attempts", client.ackCount)
	}
}

func TestDiscoverLinkedHostWithoutPortalInstallTokenWaitsInsteadOfForcingBootstrap(t *testing.T) {
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
			AccessPassword: "123456",
		},
	}
	client := &fakePortalClient{
		discoverResp: &domain.RemoteDiscoverResponse{
			BootstrapFlow: domain.RemoteBootstrapFlowLinkedHostDetected,
			HostID:        "host-1",
		},
	}

	module := newTestModule(store, client, manager, stateDir)
	result := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{})
	if result.Error != "" {
		t.Fatalf("apply returned unexpected error: %s", result.Error)
	}
	if client.bootstrapCalls != 0 {
		t.Fatalf("expected bootstrap to be skipped while portal did not provide install token, got %d call(s)", client.bootstrapCalls)
	}
}

func TestPendingLinkDiscoverRunsTechnicalBootstrapWithoutHostInstallToken(t *testing.T) {
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
			AccessPassword: "123456",
		},
	}
	client := &fakePortalClient{
		discoverResp: &domain.RemoteDiscoverResponse{
			BootstrapFlow:    domain.RemoteBootstrapFlowPendingLink,
			DiscoveredHostID: "disc-1",
		},
		bootstrapResp: &domain.RemoteBootstrapResponse{
			BootstrapMode: "discovery",
			Alias:         "SERVIDOR",
			RustDeskID:    "123456789",
			MachineName:   "srv-01",
			ServerHost:    "relay.example.com",
			APIHost:       "api.example.com",
			PublicKey:     "pub-key",
			PublicKeyHash: "pub-hash",
		},
	}

	module := newTestModule(store, client, manager, stateDir)
	result := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{})
	if result.Error != "" {
		t.Fatalf("expected technical bootstrap to succeed, got %s", result.Error)
	}

	var persisted remoteState
	if err := store.LoadJSON(ctx, stateFile, &persisted); err != nil {
		t.Fatalf("load state: %v", err)
	}
	if !persisted.PendingLinkReady {
		t.Fatalf("expected pending_link_ready after technical bootstrap")
	}
	if persisted.AgentToken != "" {
		t.Fatalf("expected agent token to remain empty before host link")
	}
	if client.bootstrapCalls != 1 {
		t.Fatalf("expected one bootstrap call, got %d", client.bootstrapCalls)
	}
	if client.lastBootstrapReq.DiscoveryToken == "" || client.lastBootstrapReq.DiscoveredHostID != "disc-1" {
		t.Fatalf("expected discovery bootstrap credentials, got %+v", client.lastBootstrapReq)
	}
}

func TestDiscoverContractErrorPersistsStructuredFailure(t *testing.T) {
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
			AccessPassword: "123456",
		},
	}
	client := &fakePortalClient{
		discoverErr: &infrahttp.RemoteContractError{
			Procedure: "discover",
			Code:      "REMOTE_DISCOVER_CONTRACT_VERSION_INVALID",
			Message:   "portal returned unsupported discover contract version",
		},
	}

	module := newTestModule(store, client, manager, stateDir)
	result := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{})
	if result.Error == "" {
		t.Fatalf("expected discover contract failure")
	}

	var persisted remoteState
	if err := store.LoadJSON(ctx, stateFile, &persisted); err != nil {
		t.Fatalf("load state: %v", err)
	}
	if persisted.LastErrorCode != "REMOTE_DISCOVER_CONTRACT_VERSION_INVALID" {
		t.Fatalf("expected structured contract error code, got %q", persisted.LastErrorCode)
	}
}

func TestSyncAuthFailureUsesStructuredPortalCodeForRebootstrap(t *testing.T) {
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
			AccessPassword: "123456",
		},
	}
	client := &fakePortalClient{
		syncErr: &infrahttp.HTTPStatusError{
			StatusCode: 401,
			Method:     "POST",
			Path:       "/api/remote/rustdesk/sync",
			Code:       "AGENT_TOKEN_INVALID",
			Message:    "agentToken invalido ou expirado.",
		},
	}

	module := New(client, store, noopLogger{}, noopEventBus{},
		WithAgentVersion("go-agent-v1"),
		WithEnvironment("test"),
		WithStateDir(stateDir),
	)
	module.rustDeskFactory = func() rustDeskController { return manager }
	if err := store.SaveJSON(ctx, stateFile, remoteState{
		AgentToken:  "agent-token-1",
		HostID:      "host-1",
		CompanyID:   "company-1",
		RustDeskID:  "123456789",
		MachineName: "srv-01",
	}); err != nil {
		t.Fatalf("seed state: %v", err)
	}

	result := module.Apply(ctx, managedRemoteDesiredState(), domain.CurrentModuleState{
		Enabled: true,
		Status:  domain.ModuleStatusReady,
	})
	if result.Error == "" {
		t.Fatalf("expected sync failure result")
	}

	var persisted remoteState
	if err := store.LoadJSON(ctx, stateFile, &persisted); err != nil {
		t.Fatalf("load state: %v", err)
	}
	if persisted.AgentToken != "" {
		t.Fatalf("expected agent token to be cleared after structured auth failure")
	}
	if !persisted.RebootstrapRequired {
		t.Fatalf("expected rebootstrap flag after structured auth failure")
	}
	if persisted.LastErrorCode != "AGENT_TOKEN_INVALID" {
		t.Fatalf("expected AGENT_TOKEN_INVALID code, got %q", persisted.LastErrorCode)
	}
}

func TestRefreshRustDeskStateReusesInstalledClientAndReappliesConfigOnDrift(t *testing.T) {
	t.Parallel()

	manager := &fakeRustDeskController{
		status: rustDeskStatus{
			ExecutablePath: `C:\Program Files\RustDesk\rustdesk.exe`,
			Installed:      true,
			ServiceStatus:  "running",
			RustDeskID:     "123456789",
			Version:        "1.4.6",
			AccessPassword: "123456",
			ServerHost:     "relay.terceiro.example.com",
			APIHost:        "api.terceiro.example.com",
			PublicKeyHash:  "hash-terceiro",
		},
	}

	module := newTestModule(nil, nil, manager, t.TempDir())
	state := &remoteState{
		Alias:                 "SERVIDOR",
		ServerHost:            "acesso.trilinksoftware.com.br",
		APIHost:               "acesso.trilinksoftware.com.br",
		PublicKey:             "pub-key",
		PublicKeyHash:         "pub-hash",
		DefaultPassword:       "123456",
		CurrentVersion:        "1.4.6",
		AutoInstall:           false,
		AutoUpgrade:           true,
		AllowRemoteConfigMod:  false,
		EnableDirectXCapture:  true,
	}

	if err := module.refreshRustDeskState(context.Background(), state, false, false, nil); err != nil {
		t.Fatalf("refresh rustdesk state: %v", err)
	}

	if manager.ensureInstalledCalls != 0 {
		t.Fatalf("expected installed client to be reused without reinstall, got %d ensureInstalled call(s)", manager.ensureInstalledCalls)
	}
	if manager.applyDesiredConfigCalls != 1 {
		t.Fatalf("expected config reapply on server drift, got %d applyDesiredConfig call(s)", manager.applyDesiredConfigCalls)
	}
	if manager.lastAppliedDesired.ServerHost != "acesso.trilinksoftware.com.br" {
		t.Fatalf("expected desired server host to target Trilink relay, got %q", manager.lastAppliedDesired.ServerHost)
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
		WithAgentVersion("go-agent-v1"),
		WithEnvironment("test"),
		WithStateDir(stateDir),
	)
	module.rustDeskFactory = func() rustDeskController { return manager }
	return module
}

type fakeServiceController struct {
	started   []string
	stopped   []string
	restarted []string
	err       error
}

func (f *fakeServiceController) Start(name string) error {
	f.started = append(f.started, name)
	return f.err
}

func (f *fakeServiceController) Stop(name string) error {
	f.stopped = append(f.stopped, name)
	return f.err
}

func (f *fakeServiceController) Restart(name string) error {
	f.restarted = append(f.restarted, name)
	return f.err
}

func TestExecuteCommandServiceControlRestartsNamedService(t *testing.T) {
	t.Parallel()

	controller := &fakeServiceController{}
	module := New(nil, nil, noopLogger{}, noopEventBus{})
	module.services = controller

	payload, err := json.Marshal(serviceControlCommandPayload{
		ServiceName: "Spooler",
		Action:      "restart",
	})
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}

	ack := module.executeCommand(context.Background(), &remoteState{}, domain.RemoteSyncCommand{
		ID:      "cmd-service-1",
		Type:    domain.RemoteSyncCommandServiceControl,
		Payload: payload,
	})

	if ack.status != domain.RemoteAckStatusAcknowledged {
		t.Fatalf("expected acknowledged status, got %s", ack.status)
	}
	if len(controller.restarted) != 1 || controller.restarted[0] != "Spooler" {
		t.Fatalf("expected service restart for Spooler, got %#v", controller.restarted)
	}
	if ack.details["serviceName"] != "Spooler" {
		t.Fatalf("expected details to include serviceName, got %#v", ack.details)
	}
}

type fakePortalClient struct {
	discoverResp         *domain.RemoteDiscoverResponse
	discoverErr          error
	bootstrapResp        *domain.RemoteBootstrapResponse
	bootstrapErr         error
	syncResponses        []*domain.RemoteSyncResponse
	syncErr              error
	ackFailuresRemaining int
	ackCount             int
	bootstrapCalls       int
	lastBootstrapReq     domain.RemoteBootstrapRequest
}

func (f *fakePortalClient) Discover(ctx context.Context, req domain.RemoteDiscoverRequest) (*domain.RemoteDiscoverResponse, error) {
	return f.discoverResp, f.discoverErr
}

func (f *fakePortalClient) Bootstrap(ctx context.Context, req domain.RemoteBootstrapRequest) (*domain.RemoteBootstrapResponse, error) {
	f.bootstrapCalls++
	f.lastBootstrapReq = req
	return f.bootstrapResp, f.bootstrapErr
}

func (f *fakePortalClient) Sync(ctx context.Context, req domain.RemoteSyncRequest) (*domain.RemoteSyncResponse, error) {
	if f.syncErr != nil {
		return nil, f.syncErr
	}
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

func (f *fakePortalClient) PostTelemetry(ctx context.Context, payload map[string]any) error {
	return nil
}

type fakeRustDeskController struct {
	status                  rustDeskStatus
	ensureInstalledCalls    int
	applyDesiredConfigCalls int
	lastAppliedDesired      rustDeskDesiredConfig
}

func (f *fakeRustDeskController) inspect(ctx context.Context) (rustDeskStatus, error) {
	return f.status, nil
}

func (f *fakeRustDeskController) ensureInstalled(ctx context.Context, upgrade *rustDeskUpgradeSpec) (string, bool, error) {
	f.ensureInstalledCalls++
	return f.status.ExecutablePath, false, nil
}

func (f *fakeRustDeskController) ensureServiceRunning(ctx context.Context, exePath string) (string, error) {
	return "running", nil
}

func (f *fakeRustDeskController) applyDesiredConfig(ctx context.Context, exePath string, desired rustDeskDesiredConfig) error {
	f.applyDesiredConfigCalls++
	f.lastAppliedDesired = desired
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
