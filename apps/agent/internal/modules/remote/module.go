package remote

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"trilink/agent/internal/domain"
)

const stateFile = "remote_state.json"

type PortalClient interface {
	Discover(ctx context.Context, req domain.RemoteDiscoverRequest) (*domain.RemoteDiscoverResponse, error)
	Bootstrap(ctx context.Context, req domain.RemoteBootstrapRequest) (*domain.RemoteBootstrapResponse, error)
	Sync(ctx context.Context, req domain.RemoteSyncRequest) (*domain.RemoteSyncResponse, error)
	Ack(ctx context.Context, req domain.RemoteAckRequest) error
}

type StateStore interface {
	SaveJSON(ctx context.Context, name string, value any) error
	LoadJSON(ctx context.Context, name string, dest any) error
}

type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
	Error(msg string, kv ...any)
}

type EventBus interface {
	Publish(ctx context.Context, event domain.TelemetryEvent) error
}

type remoteState struct {
	AgentToken               string    `json:"agent_token,omitempty"`
	AgentTokenIssuedAt       time.Time `json:"agent_token_issued_at,omitempty"`
	HostID                   string    `json:"host_id,omitempty"`
	CompanyID                string    `json:"company_id,omitempty"`
	CompanyName              string    `json:"company_name,omitempty"`
	PendingLinkReady         bool      `json:"pending_link_ready,omitempty"`
	Alias                    string    `json:"alias,omitempty"`
	RustDeskID               string    `json:"rustdesk_id,omitempty"`
	MachineName              string    `json:"machine_name,omitempty"`
	ServiceStatus            string    `json:"service_status,omitempty"`
	CurrentVersion           string    `json:"current_version,omitempty"`
	ServerHost               string    `json:"server_host,omitempty"`
	APIHost                  string    `json:"api_host,omitempty"`
	PublicKey                string    `json:"public_key,omitempty"`
	PublicKeyHash            string    `json:"public_key_hash,omitempty"`
	ReportedServerHost       string    `json:"reported_server_host,omitempty"`
	ReportedAPIHost          string    `json:"reported_api_host,omitempty"`
	ReportedPublicKey        string    `json:"reported_public_key,omitempty"`
	ReportedPublicKeyHash    string    `json:"reported_public_key_hash,omitempty"`
	ServerConfig             string    `json:"server_config,omitempty"`
	TargetVersion            string    `json:"target_version,omitempty"`
	DefaultPassword          string    `json:"default_password,omitempty"`
	AutoInstall              bool      `json:"auto_install"`
	AutoUpgrade              bool      `json:"auto_upgrade"`
	InstallerURL             string    `json:"installer_url,omitempty"`
	InstallerChecksum        string    `json:"installer_checksum_sha256,omitempty"`
	InstallerPackageType     string    `json:"installer_package_type,omitempty"`
	InstallerSilentArgs      string    `json:"installer_silent_args,omitempty"`
	RestartServiceAfterApply bool      `json:"restart_service_after_apply"`
	SuppressTrayShortcuts    bool      `json:"suppress_tray_shortcuts"`
	HideTray                 bool      `json:"hide_tray"`
	HideStopService          bool      `json:"hide_stop_service"`
	AllowRemoteConfigMod     bool      `json:"allow_remote_config_modification"`
	AllowD3DRender           bool      `json:"allow_d3d_render"`
	EnableDirectXCapture     bool      `json:"enable_directx_capture"`
	RuntimePassword          string    `json:"runtime_password,omitempty"`
	RustDeskExecutable       string    `json:"rustdesk_executable,omitempty"`
	LastConfigAppliedAt      time.Time `json:"last_config_applied_at,omitempty"`
	LastAppliedHash          string    `json:"last_applied_hash,omitempty"`
	RebootstrapRequired      bool      `json:"rebootstrap_required"`
	LastBootstrapFlow        string    `json:"last_bootstrap_flow,omitempty"`
	LastErrorCode            string    `json:"last_error_code,omitempty"`
	LastErrorMessage         string    `json:"last_error_message,omitempty"`
	LastErrorPhase           string    `json:"last_error_phase,omitempty"`
	LastErrorStatusCode      int       `json:"last_error_status_code,omitempty"`
	LastErrorAt              time.Time `json:"last_error_at,omitempty"`
	NextRetryAt              time.Time `json:"next_retry_at,omitempty"`
	ConsecutiveFailures      int       `json:"consecutive_failures,omitempty"`
	LastSyncAt               time.Time `json:"last_sync_at,omitempty"`
	UpdatedAt                time.Time `json:"updated_at"`
}

type runtimePhase string

const (
	runtimePhaseDiscover  runtimePhase = "discover"
	runtimePhaseBootstrap runtimePhase = "bootstrap"
	runtimePhaseSync      runtimePhase = "sync"
	runtimePhaseWait      runtimePhase = "wait"
)

type runtimePlan struct {
	phase      runtimePhase
	hostname   string
	agentToken string
	message    string
}

type discoverDecision struct {
	phase   runtimePhase
	flow    domain.RemoteBootstrapFlow
	message string
}

type remoteDesiredIntent struct {
	managed          bool
	installIfMissing bool
	bootstrapEnabled bool
	syncEnabled      bool
	discoveryToken   string
}

// DeviceSnapshotProvider e a interface que o remote module usa para obter snapshots
// do device module sem importar o pacote device diretamente (evita import circular).
// Os campos do RemoteSyncRequest ja sao do tipo any, entao retornar any e correto.
// rebootPending e separado pois o portal persiste como Boolean no schema.
type DeviceSnapshotProvider interface {
	GetSyncSnapshots() (metrics, system, network, software, hardware, disks, services, versions, windowsUpdate, allServices any, rebootPending *bool)
	MarkSyncSnapshotsPublished(ctx context.Context)
	GetCriticalEvents(ctx context.Context) []map[string]any
	MarkCriticalEventsPublished(ctx context.Context)
}

type namedServiceController interface {
	Start(name string) error
	Stop(name string) error
	Restart(name string) error
}

type Module struct {
	client          PortalClient
	store           StateStore
	logger          Logger
	events          EventBus
	device          DeviceSnapshotProvider
	services        namedServiceController
	discoveryToken  string
	agentVersion    string
	environment     string
	stateDir        string
	rustDeskFactory func() rustDeskController
}

type Option func(*Module)

func WithDiscoveryToken(token string) Option {
	return func(m *Module) { m.discoveryToken = token }
}

// WithDevice injeta o provider de snapshots do device module.
// O remote module usa esses dados para enriquecer o payload de sync com
// metricas de maquina, disco, servicos e versoes do Syspro.
func WithDevice(d DeviceSnapshotProvider) Option {
	return func(m *Module) { m.device = d }
}

func WithAgentVersion(version string) Option {
	return func(m *Module) { m.agentVersion = version }
}

func WithEnvironment(env string) Option {
	return func(m *Module) { m.environment = env }
}

func WithStateDir(stateDir string) Option {
	return func(m *Module) { m.stateDir = stateDir }
}

func New(client PortalClient, store StateStore, logger Logger, events EventBus, opts ...Option) *Module {
	m := &Module{
		client:       client,
		store:        store,
		logger:       logger,
		events:       events,
		services:     defaultNamedServiceController(),
		agentVersion: "go-agent-v1",
	}
	for _, opt := range opts {
		opt(m)
	}
	return m
}

func (m *Module) Name() string {
	return "remote"
}

func (m *Module) Inspect(ctx context.Context) (domain.CurrentModuleState, error) {
	var st remoteState
	if err := m.store.LoadJSON(ctx, stateFile, &st); err != nil {
		return domain.CurrentModuleState{
			Enabled: false,
			Version: m.agentVersion,
			Status:  domain.ModuleStatusMissing,
		}, nil
	}

	status := domain.ModuleStatusReady
	if st.AgentToken == "" || st.RebootstrapRequired {
		status = domain.ModuleStatusMissing
	}
	if st.LastErrorCode != "" && (st.AgentToken == "" || st.RebootstrapRequired) {
		status = domain.ModuleStatusError
	}

	return domain.CurrentModuleState{
		Enabled:       st.AgentToken != "" && !st.RebootstrapRequired,
		Version:       m.agentVersion,
		Status:        status,
		LastError:     st.LastErrorMessage,
		LastAppliedAt: timePtr(st.LastSyncAt),
	}, nil
}

func (m *Module) Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction {
	intent := resolveRemoteDesiredIntent(desired.Remote)
	if !desired.Remote.Enabled || !intent.managed {
		return nil
	}

	if current.Status == domain.ModuleStatusReady && intent.syncEnabled {
		return []domain.ReconcileAction{{
			Module: "remote",
			Type:   "sync_cycle",
			Reason: "remote sync heartbeat",
		}}
	}

	if !intent.bootstrapEnabled {
		return nil
	}

	return []domain.ReconcileAction{{
		Module: "remote",
		Type:   "discover_bootstrap_cycle",
		Reason: "remote agent token missing or invalid",
	}}
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
	_ = desired
	_ = current

	st := m.loadState(ctx)
	intent := resolveRemoteDesiredIntent(desired.Remote)
	plan := m.buildRuntimePlan(&st, intent)

	switch plan.phase {
	case runtimePhaseSync:
		m.logger.Debug("remote runtime plan", "phase", plan.phase, "host_id", st.HostID)
		return m.runSync(ctx, &st, plan.agentToken, intent)
	case runtimePhaseDiscover:
		if st.RebootstrapRequired {
			m.logger.Info("remote rebootstrap required; clearing local agent token", "host_id", st.HostID)
		}
		return m.runDiscoverBootstrapSync(ctx, &st, intent)
	default:
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Message: firstNonEmpty(plan.message, "remote runtime plan has no executable phase"),
		}
	}
}

func (m *Module) runDiscoverBootstrapSync(ctx context.Context, st *remoteState, intent remoteDesiredIntent) domain.ApplyResult {
	// Aceita token do desired-state como fallback quando não há env local.
	effectiveToken := firstNonEmpty(m.discoveryToken, intent.discoveryToken)
	if effectiveToken == "" {
		err := errors.New("DISCOVERY_TOKEN_NOT_CONFIGURED")
		m.rememberFailure(st, runtimePhaseDiscover, err)
		_ = m.saveState(ctx, st)
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Error:   "discover failed: DISCOVERY_TOKEN_NOT_CONFIGURED",
		}
	}
	if m.discoveryToken == "" && effectiveToken != "" {
		m.discoveryToken = effectiveToken
	}

	hostname := currentHostname()
	if err := m.refreshRustDeskState(ctx, st, false, false, nil); err != nil {
		m.logger.Warn("remote rustdesk refresh before discover failed", "error", err)
	}
	discoverResp, err := m.client.Discover(ctx, domain.RemoteDiscoverRequest{
		DiscoveryToken: m.discoveryToken,
		RustDeskID:     st.RustDeskID,
		MachineName:    hostname,
		AgentVersion:   m.agentVersion,
		ServiceStatus:  firstNonEmpty(st.ServiceStatus, "unknown"),
		Provider:       "go-agent",
		Environment:    m.environment,
	})
	if err != nil {
		if isApplyContextCanceled(err) {
			return m.canceled("discover cycle canceled")
		}
		m.rememberFailure(st, runtimePhaseDiscover, err)
		_ = m.saveState(ctx, st)
		return m.fail("discover failed", err)
	}
	if discoverResp == nil {
		err := errors.New("REMOTE_DISCOVER_CONTRACT_INCOMPLETE")
		m.rememberFailure(st, runtimePhaseDiscover, err)
		_ = m.saveState(ctx, st)
		return m.fail("discover failed", err)
	}

	flow := discoverResp.BootstrapFlow

	if strings.TrimSpace(discoverResp.HostID) != "" {
		st.HostID = strings.TrimSpace(discoverResp.HostID)
	} else if flow == domain.RemoteBootstrapFlowPendingLink {
		st.HostID = ""
		st.CompanyID = ""
		st.CompanyName = ""
	}
	st.MachineName = hostname
	st.LastBootstrapFlow = string(flow)
	m.clearFailure(st)
	_ = m.saveState(ctx, st)

	m.logger.Info("remote discover completed",
		"flow", flow,
		"mode", discoverResp.Mode,
		"discovered_host_id", discoverResp.DiscoveredHostID,
		"host_id", discoverResp.HostID,
		"install_token_fingerprint", tokenFingerprint(discoverResp.InstallToken),
	)
	_ = m.publish(ctx, "remote.discover.completed", "discover completed", map[string]any{
		"flow":               flow,
		"mode":               discoverResp.Mode,
		"discovered_host_id": discoverResp.DiscoveredHostID,
		"host_id":            discoverResp.HostID,
		"install_token_auto": strings.TrimSpace(discoverResp.InstallToken) != "",
	})

	decision := m.resolveDiscoverDecision(discoverResp, st)
	m.logger.Info("remote discover decision", "flow", decision.flow, "phase", decision.phase, "message", decision.message)
	switch decision.phase {
	case runtimePhaseWait:
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Message: decision.message,
		}
	case runtimePhaseBootstrap:
		return m.runBootstrapThenSync(
			ctx,
			st,
			hostname,
			strings.TrimSpace(discoverResp.InstallToken),
			strings.TrimSpace(discoverResp.DiscoveredHostID),
			flow,
			intent,
		)
	default:
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Error:   fmt.Sprintf("unknown remote discover decision for flow %s", decision.flow),
		}
	}
}

func (m *Module) runBootstrapThenSync(
	ctx context.Context,
	st *remoteState,
	hostname string,
	installToken string,
	discoveredHostID string,
	flow domain.RemoteBootstrapFlow,
	intent remoteDesiredIntent,
) domain.ApplyResult {
	if strings.TrimSpace(installToken) == "" && strings.TrimSpace(discoveredHostID) == "" {
		err := errors.New("REMOTE_DISCOVER_INSTALL_TOKEN_REQUIRED")
		m.rememberFailure(st, runtimePhaseBootstrap, err)
		_ = m.saveState(ctx, st)
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Error:   "bootstrap failed: REMOTE_DISCOVER_INSTALL_TOKEN_REQUIRED",
		}
	}

	if err := m.refreshRustDeskState(ctx, st, false, false, nil); err != nil {
		m.logger.Warn("remote rustdesk refresh before bootstrap failed", "error", err)
	}

	bootstrapResp, err := m.client.Bootstrap(ctx, domain.RemoteBootstrapRequest{
		InstallToken:     installToken,
		DiscoveryToken:   firstNonEmpty(m.discoveryToken, intent.discoveryToken),
		DiscoveredHostID: discoveredHostID,
		RustDeskID:       st.RustDeskID,
		MachineName:      hostname,
		AgentVersion:     m.agentVersion,
		CurrentAlias:     st.Alias,
		CurrentVersion:   st.CurrentVersion,
		ServerHost:       st.ServerHost,
		APIHost:          st.APIHost,
		PublicKey:        st.PublicKey,
		Environment:      m.environment,
	})
	if err != nil {
		if isApplyContextCanceled(err) {
			return m.canceled("bootstrap cycle canceled")
		}
		m.logger.Warn("remote bootstrap failed",
			"host_id", st.HostID,
			"install_token_fingerprint", tokenFingerprint(installToken),
			"error", err,
		)
		st.RebootstrapRequired = true
		m.rememberFailure(st, runtimePhaseBootstrap, err)
		_ = m.saveState(ctx, st)
		return m.fail("bootstrap failed", err)
	}
	if bootstrapResp == nil {
		err := errors.New("REMOTE_BOOTSTRAP_CONTRACT_INCOMPLETE")
		m.rememberFailure(st, runtimePhaseBootstrap, err)
		_ = m.saveState(ctx, st)
		return m.fail("bootstrap failed", err)
	}

	mode := strings.TrimSpace(strings.ToLower(bootstrapResp.BootstrapMode))
	if mode == "" {
		mode = "host"
	}

	if mode == "host" && bootstrapResp.AgentToken == "" {
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Error:   "bootstrap returned empty agent token",
		}
	}

	st.Alias = firstNonEmpty(bootstrapResp.Alias, st.Alias)
	st.RustDeskID = firstNonEmpty(bootstrapResp.RustDeskID, st.RustDeskID)
	st.MachineName = firstNonEmpty(bootstrapResp.MachineName, hostname)
	st.RebootstrapRequired = false
	if mode == "discovery" {
		st.AgentToken = ""
		st.AgentTokenIssuedAt = time.Time{}
		st.HostID = ""
		st.CompanyID = ""
		st.CompanyName = ""
		st.PendingLinkReady = true
		st.LastBootstrapFlow = "pending_link_bootstrapped"
	} else {
		st.AgentToken = bootstrapResp.AgentToken
		st.AgentTokenIssuedAt = parseRemoteTime(bootstrapResp.AgentTokenIssuedAt)
		st.HostID = firstNonEmpty(bootstrapResp.HostID, st.HostID)
		st.CompanyID = firstNonEmpty(bootstrapResp.CompanyID, st.CompanyID)
		st.CompanyName = firstNonEmpty(bootstrapResp.CompanyName, st.CompanyName)
		st.PendingLinkReady = false
		st.LastBootstrapFlow = "bootstrap_completed"
	}
	m.clearFailure(st)
	m.applyPortalConfig(st, rustDeskDesiredConfig{
		Alias:                    bootstrapResp.Alias,
		ServerHost:               bootstrapResp.ServerHost,
		APIHost:                  bootstrapResp.APIHost,
		PublicKey:                bootstrapResp.PublicKey,
		PublicKeyHash:            bootstrapResp.PublicKeyHash,
		ServerConfig:             bootstrapResp.ServerConfig,
		TargetVersion:            bootstrapResp.TargetVersion,
		DefaultPassword:          bootstrapResp.DefaultPassword,
		AutoInstall:              bootstrapResp.AutoInstall,
		AutoUpgrade:              bootstrapResp.AutoUpgrade,
		InstallerURL:             bootstrapResp.InstallerURL,
		InstallerSHA256:          bootstrapResp.InstallerChecksum,
		InstallerPackageType:     bootstrapResp.InstallerPackageType,
		InstallerArgs:            bootstrapResp.InstallerSilentArgs,
		RestartServiceAfterApply: bootstrapResp.RestartServiceAfterApply,
		SuppressTrayShortcuts:    bootstrapResp.SuppressTrayShortcuts,
		HideTray:                 bootstrapResp.HideTray,
		HideStopService:          bootstrapResp.HideStopService,
		AllowRemoteConfigMod:     bootstrapResp.AllowRemoteConfigMod,
		AllowD3DRender:           bootstrapResp.AllowD3DRender,
		EnableDirectXCapture:     bootstrapResp.EnableDirectXCapture,
	})
	if err := m.refreshRustDeskState(ctx, st, intent.installIfMissing, true, nil); err != nil {
		m.logger.Warn("remote bootstrap local apply failed after token issuance", "host_id", st.HostID, "error", err)
		return m.fail("bootstrap rustdesk apply failed", err)
	}
	_ = m.saveState(ctx, st)

	m.logger.Info("remote bootstrap completed",
		"host_id", st.HostID,
		"bootstrap_mode", mode,
		"alias", st.Alias,
		"install_token_fingerprint", tokenFingerprint(installToken),
		"token_fingerprint", tokenFingerprint(st.AgentToken),
	)
	_ = m.publish(ctx, "remote.bootstrap.completed", "bootstrap completed", map[string]any{
		"host_id":         st.HostID,
		"alias":           st.Alias,
		"bootstrap_mode":  mode,
		"pending_link":    flow == domain.RemoteBootstrapFlowPendingLink,
		"pending_link_id": discoveredHostID,
	})

	if mode == "discovery" {
		return domain.ApplyResult{
			Module:  "remote",
			Changed: true,
			Message: "bootstrap tecnico concluido; aguardando vinculo empresarial no portal",
		}
	}

	return m.runSync(ctx, st, bootstrapResp.AgentToken, intent)
}

func (m *Module) runSync(ctx context.Context, st *remoteState, agentToken string, intent remoteDesiredIntent) domain.ApplyResult {
	m.logger.Debug("remote sync cycle starting",
		"host_id", st.HostID,
		"token_fingerprint", tokenFingerprint(agentToken),
		"persisted_token_fingerprint", tokenFingerprint(st.AgentToken),
	)

	if err := m.refreshRustDeskState(ctx, st, intent.installIfMissing, false, nil); err != nil {
		m.logger.Warn("remote rustdesk refresh before sync failed", "error", err)
	}

	flushStats := m.flushPendingAcks(ctx, agentToken)
	if flushStats.Sent > 0 || flushStats.Retained > 0 || flushStats.Discarded > 0 || flushStats.Deferred > 0 {
		m.logger.Info("remote pending ack flush completed",
			"sent", flushStats.Sent,
			"retained", flushStats.Retained,
			"discarded", flushStats.Discarded,
			"deferred", flushStats.Deferred,
		)
	}

	hostname := firstNonEmpty(st.MachineName, currentHostname())

	syncReq := domain.RemoteSyncRequest{
		AgentToken:     agentToken,
		RustDeskID:     st.RustDeskID,
		MachineName:    hostname,
		AgentVersion:   m.agentVersion,
		CurrentAlias:   st.Alias,
		CurrentVersion: st.CurrentVersion,
		ServerHost:     firstNonEmpty(st.ReportedServerHost, st.ServerHost),
		APIHost:        firstNonEmpty(st.ReportedAPIHost, st.APIHost),
		PublicKey:      firstNonEmpty(st.ReportedPublicKey, st.PublicKey),
		ServiceStatus:  firstNonEmpty(st.ServiceStatus, "unknown"),
	}

	// Injeta snapshots do device module se disponivel.
	// Nil-safe: nos primeiros ciclos o device ainda nao coletou dados.
	if m.device != nil {
		devMetrics, devSystem, devNetwork, devSoftware, devHardware, devDisks, devServices, devVersions, devWindowsUpdate, devAllServices, devReboot := m.device.GetSyncSnapshots()
		syncReq.SystemSnapshot = devSystem
		syncReq.NetworkSnapshot = devNetwork
		syncReq.SoftwareSnapshot = devSoftware
		syncReq.HardwareIdentity = devHardware
		syncReq.DiskSnapshot = devDisks
		syncReq.SysproProcesses = devServices
		syncReq.SysproVersions = devVersions
		syncReq.WindowsUpdateStatus = devWindowsUpdate
		syncReq.AllServicesSnapshot = devAllServices
		syncReq.RebootPending = devReboot
		syncReq.AgentMetrics = enrichAgentMetrics(devMetrics, devSystem, devDisks, st, flushStats)
		syncReq.CriticalEvents = m.device.GetCriticalEvents(ctx)
	}

	syncResp, err := m.client.Sync(ctx, syncReq)
	if err != nil {
		if isApplyContextCanceled(err) {
			m.logger.Info("remote sync canceled", "host_id", st.HostID, "error", err)
			return m.canceled("sync cycle canceled")
		}
		failure := classifyRemoteFailure(err)
		if shouldForceRebootstrap(failure) {
			m.logger.Warn("remote sync failed with token/auth error; invalidating agent token and requiring rebootstrap",
				"host_id", st.HostID,
				"token_fingerprint", tokenFingerprint(agentToken),
				"error_code", failure.Code,
				"error", err,
			)
			st.AgentToken = ""
			st.AgentTokenIssuedAt = time.Time{}
			st.HostID = ""
			st.CompanyID = ""
			st.CompanyName = ""
			st.PendingLinkReady = false
			st.RebootstrapRequired = true
			m.rememberFailure(st, runtimePhaseSync, err)
			_ = m.saveState(ctx, st)
			if intent.bootstrapEnabled && m.discoveryToken != "" {
				m.logger.Info("remote sync auth failed; attempting immediate rediscovery", "error", err)
				return m.runDiscoverBootstrapSync(ctx, st, intent)
			}
		} else {
			m.logger.Warn("remote sync failed with transient/non-auth error; keeping current token",
				"host_id", st.HostID,
				"token_fingerprint", tokenFingerprint(agentToken),
				"error_code", failure.Code,
				"error", err,
			)
			m.rememberFailure(st, runtimePhaseSync, err)
			_ = m.saveState(ctx, st)
		}
		return m.fail("sync failed", err)
	}
	if syncResp == nil {
		err := errors.New("REMOTE_SYNC_CONTRACT_INCOMPLETE")
		m.rememberFailure(st, runtimePhaseSync, err)
		_ = m.saveState(ctx, st)
		return m.fail("sync failed", err)
	}
	if m.device != nil {
		m.device.MarkSyncSnapshotsPublished(ctx)
		m.device.MarkCriticalEventsPublished(ctx)
	}

	st.HostID = firstNonEmpty(syncResp.HostID, st.HostID)
	st.CompanyID = firstNonEmpty(syncResp.CompanyID, st.CompanyID)
	st.CompanyName = firstNonEmpty(syncResp.CompanyName, st.CompanyName)
	st.Alias = firstNonEmpty(syncResp.Alias, st.Alias)
	st.RustDeskID = firstNonEmpty(syncResp.RustDeskID, st.RustDeskID)
	st.MachineName = firstNonEmpty(syncResp.MachineName, hostname)
	if st.CompanyID != "" || st.CompanyName != "" {
		st.PendingLinkReady = false
	}
	if issuedAt := parseRemoteTime(syncResp.AgentTokenIssuedAt); !issuedAt.IsZero() {
		st.AgentTokenIssuedAt = issuedAt
	}
	st.RebootstrapRequired = false
	st.LastSyncAt = time.Now().UTC()
	m.clearFailure(st)
	m.applyPortalConfig(st, rustDeskDesiredConfig{
		Alias:                    syncResp.Alias,
		ServerHost:               syncResp.ExpectedConfig.ServerHost,
		APIHost:                  syncResp.ExpectedConfig.APIHost,
		PublicKey:                syncResp.ExpectedConfig.PublicKey,
		PublicKeyHash:            syncResp.ExpectedConfig.PublicKeyHash,
		ServerConfig:             syncResp.ExpectedConfig.ServerConfig,
		TargetVersion:            syncResp.ExpectedConfig.TargetVersion,
		AutoInstall:              syncResp.ExpectedConfig.AutoInstall,
		AutoUpgrade:              syncResp.ExpectedConfig.AutoUpgrade,
		InstallerURL:             syncResp.ExpectedConfig.InstallerURL,
		InstallerSHA256:          syncResp.ExpectedConfig.InstallerSHA,
		InstallerPackageType:     syncResp.ExpectedConfig.InstallerPackageType,
		InstallerArgs:            syncResp.ExpectedConfig.InstallerArgs,
		RestartServiceAfterApply: syncResp.ExpectedConfig.RestartServiceAfterApply,
		SuppressTrayShortcuts:    syncResp.ExpectedConfig.SuppressTrayShortcuts,
		HideTray:                 syncResp.ExpectedConfig.HideTray,
		HideStopService:          syncResp.ExpectedConfig.HideStopService,
		AllowRemoteConfigMod:     syncResp.ExpectedConfig.AllowRemoteConfigMod,
		AllowD3DRender:           syncResp.ExpectedConfig.AllowD3DRender,
		EnableDirectXCapture:     syncResp.ExpectedConfig.EnableDirectXCapture,
	})

	invalidateToken := false
	for _, cmd := range syncResp.CommandQueue {
		ack := m.executeCommand(ctx, st, cmd)
		if ack.invalidateToken {
			invalidateToken = true
		}

		if err := m.client.Ack(ctx, domain.RemoteAckRequest{
			AgentToken: agentToken,
			CommandID:  cmd.ID,
			Status:     ack.status,
			ReasonCode: ack.reasonCode,
			Message:    ack.message,
			Details:    ack.details,
		}); err != nil {
			failure := classifyRemoteFailure(err)
			now := time.Now().UTC()
			m.logger.Warn("remote command ack failed", "command_id", cmd.ID, "error_code", failure.Code, "error", err)
			m.enqueueAck(ctx, pendingAck{
				CommandID:        cmd.ID,
				AgentToken:       agentToken,
				Status:           ack.status,
				ReasonCode:       ack.reasonCode,
				Message:          ack.message,
				Details:          ack.details,
				EnqueuedAt:       now,
				LastAttemptAt:    now,
				NextAttemptAt:    now.Add(nextAckRetryDelay(1)),
				LastErrorCode:    failure.Code,
				LastErrorMessage: failure.Message,
				Attempts:         1,
			})
			continue
		}
		m.logger.Info("remote command ack sent", "command_id", cmd.ID, "status", ack.status)
	}

	if invalidateToken {
		st.AgentToken = ""
		st.AgentTokenIssuedAt = time.Time{}
		st.RebootstrapRequired = true
		m.logger.Info("remote token invalidated after command processing", "host_id", st.HostID)
	}

	if !syncResp.Compliance.AliasMatch || !syncResp.Compliance.ServerHostMatch || !syncResp.Compliance.APIHostMatch || !syncResp.Compliance.PublicKeyMatch {
		if err := m.refreshRustDeskState(ctx, st, st.AutoInstall, true, nil); err != nil {
			m.logger.Warn("remote rustdesk convergence apply after sync failed", "error", err)
		}
	}

	_ = m.saveState(ctx, st)
	_ = m.publish(ctx, "remote.sync.completed", "sync completed", map[string]any{
		"host_id":        st.HostID,
		"command_count":  len(syncResp.CommandQueue),
		"token_rotating": invalidateToken,
	})

	return domain.ApplyResult{
		Module:  "remote",
		Changed: len(syncResp.CommandQueue) > 0 || invalidateToken,
		Message: fmt.Sprintf("sync ok, %d commands processed", len(syncResp.CommandQueue)),
	}
}

type commandAck struct {
	status          domain.RemoteAckStatus
	reasonCode      domain.RemoteAckReasonCode
	message         string
	details         map[string]any
	invalidateToken bool
}

func (m *Module) executeCommand(ctx context.Context, st *remoteState, cmd domain.RemoteSyncCommand) commandAck {
	m.logger.Info("remote command received", "command_id", cmd.ID, "type", cmd.Type)

	switch cmd.Type {
	case domain.RemoteSyncCommandReapplyAlias:
		payload := parseAliasCommandPayload(cmd.Payload)
		if payload.ExpectedAlias != "" {
			st.Alias = payload.ExpectedAlias
		}
		st.LastAppliedHash = ""
		if err := m.refreshRustDeskState(ctx, st, st.AutoInstall, true, nil); err != nil {
			return commandAck{
				status:     domain.RemoteAckStatusFailed,
				reasonCode: domain.RemoteAckReasonCommandExecutionFailed,
				message:    fmt.Sprintf("reapply alias failed: %v", err),
			}
		}
		return commandAck{
			status:     domain.RemoteAckStatusAcknowledged,
			reasonCode: domain.RemoteAckReasonCommandProcessed,
			message:    "alias reapplied to local agent state",
			details: map[string]any{
				"alias": st.Alias,
			},
		}
	case domain.RemoteSyncCommandReapplyConfig:
		payload := parseConfigCommandPayload(cmd.Payload)
		if payload.ExpectedServerHost != "" {
			st.ServerHost = payload.ExpectedServerHost
		}
		if payload.ExpectedAPIHost != "" {
			st.APIHost = payload.ExpectedAPIHost
		}
		if payload.ExpectedPublicKey != "" {
			st.PublicKey = payload.ExpectedPublicKey
		}
		if payload.ExpectedPublicKeyHash != "" {
			st.PublicKeyHash = payload.ExpectedPublicKeyHash
		}
		st.LastAppliedHash = ""
		if err := m.refreshRustDeskState(ctx, st, st.AutoInstall, true, nil); err != nil {
			return commandAck{
				status:     domain.RemoteAckStatusFailed,
				reasonCode: domain.RemoteAckReasonCommandExecutionFailed,
				message:    fmt.Sprintf("reapply config failed: %v", err),
			}
		}
		return commandAck{
			status:     domain.RemoteAckStatusAcknowledged,
			reasonCode: domain.RemoteAckReasonCommandProcessed,
			message:    "rustdesk config reapplied",
			details: map[string]any{
				"serverHost": st.ServerHost,
				"apiHost":    st.APIHost,
			},
		}
	case domain.RemoteSyncCommandRotateTokenRequired:
		return commandAck{
			status:          domain.RemoteAckStatusAcknowledged,
			reasonCode:      domain.RemoteAckReasonRotateTokenRequired,
			message:         "local token marked for rebootstrap",
			invalidateToken: true,
		}
	case domain.RemoteSyncCommandUpgradeClient, domain.RemoteSyncCommandUpgradeRustDesk:
		payload := parseUpgradeCommandPayload(cmd.Payload)
		if err := m.refreshRustDeskState(ctx, st, st.AutoInstall, true, &rustDeskUpgradeSpec{
			DownloadURL:    payload.DownloadURL,
			ChecksumSHA256: payload.ChecksumSHA256,
			PackageType:    payload.PackageType,
			SilentArgs:     payload.SilentArgs,
			TargetVersion:  payload.TargetVersion,
		}); err != nil {
			return commandAck{
				status:     domain.RemoteAckStatusFailed,
				reasonCode: domain.RemoteAckReasonCommandExecutionFailed,
				message:    fmt.Sprintf("upgrade client failed: %v", err),
			}
		}
		if payload.TargetVersion != "" {
			st.TargetVersion = payload.TargetVersion
		}
		return commandAck{
			status:     domain.RemoteAckStatusAcknowledged,
			reasonCode: domain.RemoteAckReasonUpgradeClientSuccess,
			message:    "rustdesk client upgraded",
			details: map[string]any{
				"currentVersion": st.CurrentVersion,
				"targetVersion":  st.TargetVersion,
			},
		}
	case domain.RemoteSyncCommandUpgradeAgent:
		payload := parseAgentUpgradeCommandPayload(cmd.Payload)
		if payload.ManifestURL == "" {
			return commandAck{status: domain.RemoteAckStatusFailed, reasonCode: domain.RemoteAckReasonCommandExecutionFailed, message: "agent upgrade failed: missing manifestUrl"}
		}
		if err := launchAgentUpdater(payload.ManifestURL); err != nil {
			return commandAck{status: domain.RemoteAckStatusFailed, reasonCode: domain.RemoteAckReasonCommandExecutionFailed, message: fmt.Sprintf("agent upgrade failed: %v", err)}
		}
		return commandAck{
			status:     domain.RemoteAckStatusAcknowledged,
			reasonCode: domain.RemoteAckReasonUpgradeAgentScheduled,
			message:    "agent service upgrade scheduled",
			details:    map[string]any{"manifestUrl": payload.ManifestURL, "targetVersion": payload.TargetVersion},
		}
	case domain.RemoteSyncCommandServiceControl:
		payload := parseServiceControlCommandPayload(cmd.Payload)
		serviceName := strings.TrimSpace(payload.ServiceName)
		action := strings.ToLower(strings.TrimSpace(payload.Action))
		if serviceName == "" {
			return commandAck{
				status:     domain.RemoteAckStatusFailed,
				reasonCode: domain.RemoteAckReasonCommandExecutionFailed,
				message:    "service control failed: missing serviceName",
			}
		}

		var err error
		switch action {
		case "start":
			err = m.services.Start(serviceName)
		case "stop":
			err = m.services.Stop(serviceName)
		case "restart":
			err = m.services.Restart(serviceName)
		default:
			return commandAck{
				status:     domain.RemoteAckStatusFailed,
				reasonCode: domain.RemoteAckReasonCommandExecutionFailed,
				message:    fmt.Sprintf("service control failed: unsupported action %q", payload.Action),
				details: map[string]any{
					"serviceName": serviceName,
					"action":      payload.Action,
				},
			}
		}
		if err != nil {
			return commandAck{
				status:     domain.RemoteAckStatusFailed,
				reasonCode: domain.RemoteAckReasonCommandExecutionFailed,
				message:    fmt.Sprintf("service control failed: %v", err),
				details: map[string]any{
					"serviceName": serviceName,
					"action":      action,
				},
			}
		}
		return commandAck{
			status:     domain.RemoteAckStatusAcknowledged,
			reasonCode: domain.RemoteAckReasonCommandProcessed,
			message:    fmt.Sprintf("service %s %sed", serviceName, action),
			details: map[string]any{
				"serviceName": serviceName,
				"action":      action,
			},
		}
	default:
		return commandAck{
			status:     domain.RemoteAckStatusFailed,
			reasonCode: domain.RemoteAckReasonCommandUnknown,
			message:    fmt.Sprintf("unknown command type: %s", cmd.Type),
			details: map[string]any{
				"commandType": cmd.Type,
			},
		}
	}
}

func (m *Module) refreshRustDeskState(ctx context.Context, st *remoteState, requireInstall, forceApply bool, upgrade *rustDeskUpgradeSpec) error {
	manager := m.newRustDeskController(st)
	if requireInstall || upgrade != nil {
		exePath, installedNow, err := manager.ensureInstalled(ctx, upgrade)
		if err != nil {
			return err
		}
		st.RustDeskExecutable = exePath
		if installedNow {
			m.logger.Info("rustdesk installed or upgraded", "path", exePath)
			st.LastAppliedHash = ""
		}
	}

	status, err := manager.inspect(ctx)
	if err != nil {
		return err
	}
	if !status.Installed {
		st.ServiceStatus = "missing"
		return nil
	}

	st.RustDeskExecutable = firstNonEmpty(status.ExecutablePath, st.RustDeskExecutable)
	if status.ExecutablePath != "" {
		serviceStatus, err := manager.ensureServiceRunning(ctx, status.ExecutablePath)
		if err != nil {
			st.ServiceStatus = firstNonEmpty(serviceStatus, status.ServiceStatus, st.ServiceStatus)
			return fmt.Errorf("ensure rustdesk service running: %w", err)
		} else {
			status.ServiceStatus = serviceStatus
		}
	}

	if status.ExecutablePath != "" && status.RustDeskID != "" && strings.TrimSpace(status.AccessPassword) == "" {
		m.logger.Info("rustdesk access password missing, attempting service restart", "rustdesk_id", status.RustDeskID)
		if err := rustdeskServiceRestart(); err == nil {
			refreshedStatus := mustInspect(manager, ctx, status)
			if strings.TrimSpace(refreshedStatus.AccessPassword) != "" {
				m.logger.Info("rustdesk access password recovered after service restart", "rustdesk_id", refreshedStatus.RustDeskID)
				status = refreshedStatus
			}
		} else {
			m.logger.Warn("rustdesk access password recovery restart failed", "rustdesk_id", status.RustDeskID, "error", err)
		}
	}

	desired := rustDeskDesiredConfig{
		Alias:                    st.Alias,
		ServerHost:               st.ServerHost,
		APIHost:                  st.APIHost,
		PublicKey:                st.PublicKey,
		PublicKeyHash:            st.PublicKeyHash,
		ServerConfig:             st.ServerConfig,
		TargetVersion:            st.TargetVersion,
		DefaultPassword:          st.DefaultPassword,
		RestartServiceAfterApply: st.RestartServiceAfterApply,
		SuppressTrayShortcuts:    st.SuppressTrayShortcuts,
		HideTray:                 st.HideTray,
		HideStopService:          st.HideStopService,
		AllowRemoteConfigMod:     st.AllowRemoteConfigMod,
		AllowD3DRender:           st.AllowD3DRender,
		EnableDirectXCapture:     st.EnableDirectXCapture,
	}
	fingerprint := desiredConfigFingerprint(desired)
	configDriftDetected := rustDeskConfigNeedsReapply(status, desired)
	if status.ExecutablePath != "" && fingerprint != "" && (forceApply || configDriftDetected || st.LastAppliedHash != fingerprint) {
		if err := manager.applyDesiredConfig(ctx, status.ExecutablePath, desired); err != nil {
			return err
		}
		st.LastAppliedHash = fingerprint
		st.LastConfigAppliedAt = time.Now().UTC()
		status = mustInspect(manager, ctx, status)
		serviceStatus, err := manager.ensureServiceRunning(ctx, status.ExecutablePath)
		if err != nil {
			st.ServiceStatus = firstNonEmpty(serviceStatus, status.ServiceStatus, st.ServiceStatus)
			return fmt.Errorf("ensure rustdesk service running after config apply: %w", err)
		}
		status.ServiceStatus = serviceStatus
	}

	st.ServiceStatus = firstNonEmpty(status.ServiceStatus, st.ServiceStatus)
	st.RustDeskID = firstNonEmpty(status.RustDeskID, st.RustDeskID)
	st.CurrentVersion = firstNonEmpty(status.Version, st.CurrentVersion)
	st.RuntimePassword = strings.TrimSpace(status.AccessPassword)
	st.ReportedServerHost = strings.TrimSpace(status.ServerHost)
	st.ReportedAPIHost = strings.TrimSpace(status.APIHost)
	st.ReportedPublicKey = strings.TrimSpace(status.PublicKey)
	st.ReportedPublicKeyHash = strings.TrimSpace(status.PublicKeyHash)
	if st.MachineName == "" {
		st.MachineName = currentHostname()
	}
	return nil
}

func rustDeskConfigNeedsReapply(status rustDeskStatus, desired rustDeskDesiredConfig) bool {
	if strings.TrimSpace(status.ExecutablePath) == "" {
		return false
	}
	if desired.ServerHost != "" && !strings.EqualFold(strings.TrimSpace(status.ServerHost), strings.TrimSpace(desired.ServerHost)) {
		return true
	}
	if desired.APIHost != "" && !strings.EqualFold(strings.TrimSpace(status.APIHost), strings.TrimSpace(desired.APIHost)) {
		return true
	}
	if desired.PublicKeyHash != "" && !strings.EqualFold(strings.TrimSpace(status.PublicKeyHash), strings.TrimSpace(desired.PublicKeyHash)) {
		return true
	}
	return false
}

func mustInspect(manager rustDeskController, ctx context.Context, fallback rustDeskStatus) rustDeskStatus {
	status, err := manager.inspect(ctx)
	if err != nil {
		return fallback
	}
	return status
}

func (m *Module) applyPortalConfig(st *remoteState, desired rustDeskDesiredConfig) {
	st.Alias = firstNonEmpty(desired.Alias, st.Alias)
	st.ServerHost = firstNonEmpty(desired.ServerHost, st.ServerHost)
	st.APIHost = firstNonEmpty(desired.APIHost, st.APIHost)
	st.PublicKey = firstNonEmpty(desired.PublicKey, st.PublicKey)
	st.PublicKeyHash = firstNonEmpty(desired.PublicKeyHash, st.PublicKeyHash)
	st.ServerConfig = firstNonEmpty(desired.ServerConfig, st.ServerConfig)
	st.TargetVersion = firstNonEmpty(desired.TargetVersion, st.TargetVersion)
	st.DefaultPassword = firstNonEmpty(desired.DefaultPassword, st.DefaultPassword)
	st.AutoInstall = desired.AutoInstall
	st.AutoUpgrade = desired.AutoUpgrade
	st.InstallerURL = firstNonEmpty(desired.InstallerURL, st.InstallerURL)
	st.InstallerChecksum = firstNonEmpty(desired.InstallerSHA256, st.InstallerChecksum)
	st.InstallerPackageType = firstNonEmpty(desired.InstallerPackageType, st.InstallerPackageType)
	st.InstallerSilentArgs = firstNonEmpty(desired.InstallerArgs, st.InstallerSilentArgs)
	st.RestartServiceAfterApply = desired.RestartServiceAfterApply
	st.SuppressTrayShortcuts = desired.SuppressTrayShortcuts
	st.HideTray = desired.HideTray
	st.HideStopService = desired.HideStopService
	st.AllowRemoteConfigMod = desired.AllowRemoteConfigMod
	st.AllowD3DRender = desired.AllowD3DRender
	st.EnableDirectXCapture = desired.EnableDirectXCapture
}

type aliasCommandPayload struct {
	ExpectedAlias string `json:"expectedAlias"`
}

type configCommandPayload struct {
	ExpectedServerHost    string `json:"expectedServerHost"`
	ExpectedAPIHost       string `json:"expectedApiHost"`
	ExpectedPublicKey     string `json:"expectedPublicKey"`
	ExpectedPublicKeyHash string `json:"expectedPublicKeyHash"`
}

type upgradeCommandPayload struct {
	TargetVersion  string `json:"targetVersion"`
	DownloadURL    string `json:"downloadUrl"`
	ChecksumSHA256 string `json:"checksumSha256"`
	PackageType    string `json:"packageType"`
	SilentArgs     string `json:"silentArgs"`
}

type agentUpgradeCommandPayload struct {
	ManifestURL   string `json:"manifestUrl"`
	TargetVersion string `json:"targetVersion"`
}

type serviceControlCommandPayload struct {
	ServiceName string `json:"serviceName"`
	Action      string `json:"action"`
}

func parseAliasCommandPayload(raw json.RawMessage) aliasCommandPayload {
	var payload aliasCommandPayload
	_ = json.Unmarshal(raw, &payload)
	return payload
}

func parseConfigCommandPayload(raw json.RawMessage) configCommandPayload {
	var payload configCommandPayload
	_ = json.Unmarshal(raw, &payload)
	return payload
}

func parseUpgradeCommandPayload(raw json.RawMessage) upgradeCommandPayload {
	var payload upgradeCommandPayload
	_ = json.Unmarshal(raw, &payload)
	return payload
}

func parseAgentUpgradeCommandPayload(raw json.RawMessage) agentUpgradeCommandPayload {
	var payload agentUpgradeCommandPayload
	_ = json.Unmarshal(raw, &payload)
	payload.ManifestURL = strings.TrimSpace(payload.ManifestURL)
	payload.TargetVersion = strings.TrimSpace(payload.TargetVersion)
	return payload
}

func launchAgentUpdater(manifestURL string) error {
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve agent executable: %w", err)
	}
	updater := filepath.Join(filepath.Dir(executable), "agent-updater.exe")
	command := exec.Command(updater, "apply-remote", "--manifest-url", manifestURL, "--components", "service")
	if err := command.Start(); err != nil {
		return fmt.Errorf("start updater: %w", err)
	}
	return nil
}

func parseServiceControlCommandPayload(raw json.RawMessage) serviceControlCommandPayload {
	var payload serviceControlCommandPayload
	_ = json.Unmarshal(raw, &payload)
	return payload
}

func desiredConfigFingerprint(desired rustDeskDesiredConfig) string {
	parts := []string{
		strings.TrimSpace(desired.Alias),
		strings.TrimSpace(desired.ServerHost),
		strings.TrimSpace(desired.APIHost),
		strings.TrimSpace(desired.PublicKey),
		strings.TrimSpace(desired.ServerConfig),
		strings.TrimSpace(desired.TargetVersion),
		strings.TrimSpace(desired.DefaultPassword),
		fmt.Sprintf("%t", desired.RestartServiceAfterApply),
		fmt.Sprintf("%t", desired.SuppressTrayShortcuts),
		fmt.Sprintf("%t", desired.HideTray),
		fmt.Sprintf("%t", desired.HideStopService),
		fmt.Sprintf("%t", desired.AllowRemoteConfigMod),
		fmt.Sprintf("%t", desired.AllowD3DRender),
		fmt.Sprintf("%t", desired.EnableDirectXCapture),
	}
	joined := strings.Join(parts, "|")
	if strings.Trim(joined, "|") == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(joined))
	return hex.EncodeToString(sum[:])
}

func (m *Module) saveState(ctx context.Context, st *remoteState) error {
	persisted := m.loadState(ctx)
	if shouldKeepPersistedRemoteState(persisted, *st) {
		m.logger.Warn("remote state save skipped to preserve newer persisted token",
			"persisted_token_fingerprint", tokenFingerprint(persisted.AgentToken),
			"incoming_token_fingerprint", tokenFingerprint(st.AgentToken),
			"persisted_issued_at", persisted.AgentTokenIssuedAt,
			"incoming_issued_at", st.AgentTokenIssuedAt,
		)
		*st = persisted
	}

	st.UpdatedAt = time.Now().UTC()
	return m.store.SaveJSON(ctx, stateFile, st)
}

func (m *Module) publish(ctx context.Context, eventType, message string, metadata map[string]any) error {
	return m.events.Publish(ctx, domain.TelemetryEvent{
		Type:       eventType,
		Severity:   "info",
		Module:     "remote",
		Message:    message,
		OccurredAt: time.Now().UTC(),
		Metadata:   metadata,
	})
}

func (m *Module) fail(message string, err error) domain.ApplyResult {
	if err != nil {
		message = fmt.Sprintf("%s: %v", message, err)
	}
	return domain.ApplyResult{
		Module:  "remote",
		Changed: false,
		Error:   message,
	}
}

func (m *Module) rememberFailure(st *remoteState, phase runtimePhase, err error) {
	info := classifyRemoteFailure(err)
	now := time.Now().UTC()
	st.LastErrorCode = firstNonEmpty(info.Code, "REMOTE_UNEXPECTED_ERROR")
	st.LastErrorMessage = firstNonEmpty(info.Message, err.Error())
	st.LastErrorPhase = string(phase)
	st.LastErrorStatusCode = info.HTTPStatus
	st.LastErrorAt = now
	st.NextRetryAt = now.Add(remoteRetryInterval)
	st.ConsecutiveFailures++
}

func (m *Module) clearFailure(st *remoteState) {
	st.LastErrorCode = ""
	st.LastErrorMessage = ""
	st.LastErrorPhase = ""
	st.LastErrorStatusCode = 0
	st.LastErrorAt = time.Time{}
	st.NextRetryAt = time.Time{}
	st.ConsecutiveFailures = 0
}

func (m *Module) canceled(message string) domain.ApplyResult {
	return domain.ApplyResult{
		Module:  "remote",
		Changed: false,
		Message: message,
	}
}

func isApplyContextCanceled(err error) bool {
	return errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded)
}

func (m *Module) loadState(ctx context.Context) remoteState {
	var st remoteState
	_ = m.store.LoadJSON(ctx, stateFile, &st)
	return st
}

func (m *Module) newRustDeskController(st *remoteState) rustDeskController {
	if m.rustDeskFactory != nil {
		return m.rustDeskFactory()
	}
	installerURL := ""
	installerChecksum := ""
	installerPackageType := ""
	installerArgs := ""
	defaultPassword := ""
	restartServiceAfterApply := true
	suppressTrayShortcuts := true
	if st != nil {
		installerURL = st.InstallerURL
		installerChecksum = st.InstallerChecksum
		installerPackageType = st.InstallerPackageType
		installerArgs = st.InstallerSilentArgs
		defaultPassword = st.DefaultPassword
		restartServiceAfterApply = st.RestartServiceAfterApply
		suppressTrayShortcuts = st.SuppressTrayShortcuts
	}
	return newRustDeskManager(m.logger, m.stateDir, installerURL, installerChecksum, installerPackageType, installerArgs, defaultPassword, restartServiceAfterApply, suppressTrayShortcuts)
}

func (m *Module) buildRuntimePlan(st *remoteState, intent remoteDesiredIntent) runtimePlan {
	if !intent.managed {
		return runtimePlan{
			phase:   runtimePhaseWait,
			message: "remote module is not managed by desired state",
		}
	}

	if st.AgentToken != "" && !st.RebootstrapRequired {
		if !intent.syncEnabled {
			return runtimePlan{
				phase:   runtimePhaseWait,
				message: "remote sync is disabled by desired state",
			}
		}
		return runtimePlan{
			phase:      runtimePhaseSync,
			hostname:   firstNonEmpty(st.MachineName, currentHostname()),
			agentToken: st.AgentToken,
		}
	}

	st.AgentToken = ""
	if !intent.bootstrapEnabled {
		return runtimePlan{
			phase:   runtimePhaseWait,
			message: "remote bootstrap is disabled by desired state",
		}
	}

	return runtimePlan{
		phase:    runtimePhaseDiscover,
		hostname: firstNonEmpty(st.MachineName, currentHostname()),
	}
}

func (m *Module) resolveDiscoverDecision(resp *domain.RemoteDiscoverResponse, st *remoteState) discoverDecision {
	if resp == nil {
		return discoverDecision{
			phase:   runtimePhaseWait,
			flow:    "",
			message: "waiting for valid discover response from portal",
		}
	}

	switch resp.BootstrapFlow {
	case domain.RemoteBootstrapFlowPendingLink:
		if st.PendingLinkReady {
			return discoverDecision{
				phase:   runtimePhaseWait,
				flow:    resp.BootstrapFlow,
				message: "instalacao tecnica concluida; aguardando vinculo empresarial no portal",
			}
		}
		return discoverDecision{
			phase: runtimePhaseBootstrap,
			flow:  resp.BootstrapFlow,
		}
	case domain.RemoteBootstrapFlowLinkedHostDetected:
		return discoverDecision{
			phase:   runtimePhaseWait,
			flow:    resp.BootstrapFlow,
			message: "host ja vinculado no portal; aguardando heartbeat autenticado do remoto",
		}
	case domain.RemoteBootstrapFlowHostBootstrapRequired, domain.RemoteBootstrapFlowTokenInvalid:
		return discoverDecision{
			phase: runtimePhaseBootstrap,
			flow:  resp.BootstrapFlow,
		}
	default:
		return discoverDecision{
			phase:   runtimePhaseWait,
			flow:    resp.BootstrapFlow,
			message: fmt.Sprintf("unsupported discover bootstrap flow %s", resp.BootstrapFlow),
		}
	}
}

func resolveRemoteDesiredIntent(desired domain.RemoteDesiredState) remoteDesiredIntent {
	mode := strings.TrimSpace(strings.ToLower(desired.Mode))
	managed := desired.Enabled
	if mode == "observe" || mode == "disabled" {
		managed = false
	}

	return remoteDesiredIntent{
		managed:          managed,
		installIfMissing: desired.InstallIfMissing,
		bootstrapEnabled: desired.BootstrapEnabled,
		syncEnabled:      desired.SyncEnabled,
		discoveryToken:   strings.TrimSpace(desired.DiscoveryToken),
	}
}

func currentHostname() string {
	hostname, err := os.Hostname()
	if err != nil || hostname == "" {
		return "unknown-host"
	}
	return hostname
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func enrichAgentMetrics(base any, system any, disks any, st *remoteState, stats flushStats) any {
	record := normalizeAnyRecord(base)
	if record == nil {
		record = map[string]any{}
	}

	if osInfo := buildOSInfoLabel(system); osInfo != "" {
		record["osInfo"] = osInfo
	}

	if diskFree, diskTotal := selectPrimaryDiskBytes(disks); diskFree > 0 || diskTotal > 0 {
		record["diskFree"] = diskFree
		record["diskTotal"] = diskTotal
	}

	record["lastBootstrapFlow"] = firstNonEmpty(st.LastBootstrapFlow, "unknown")
	record["orchestrationStrategy"] = "sync_token_first"
	record["pendingAckQueueSize"] = stats.Pending
	record["ackQueueFlush"] = map[string]any{
		"sent":      stats.Sent,
		"retained":  stats.Retained,
		"discarded": stats.Discarded,
		"failed":    stats.Failed,
		"deferred":  stats.Deferred,
	}
	record["schemaVersions"] = map[string]any{
		"discover": domain.RemoteDiscoverSchemaVersion,
		"sync":     domain.RemoteSyncSchemaVersion,
		"ack":      domain.RemoteAckSchemaVersion,
	}

	return record
}

func normalizeAnyRecord(value any) map[string]any {
	if value == nil {
		return nil
	}

	data, err := json.Marshal(value)
	if err != nil {
		return nil
	}

	var record map[string]any
	if err := json.Unmarshal(data, &record); err != nil {
		return nil
	}
	return record
}

func normalizeAnyRecordArray(value any) []map[string]any {
	if value == nil {
		return nil
	}

	data, err := json.Marshal(value)
	if err != nil {
		return nil
	}

	var list []map[string]any
	if err := json.Unmarshal(data, &list); err != nil {
		return nil
	}
	return list
}

func buildOSInfoLabel(system any) string {
	record := normalizeAnyRecord(system)
	if record == nil {
		return ""
	}

	name, _ := record["osName"].(string)
	version, _ := record["osVersion"].(string)
	build, _ := record["osBuild"].(string)
	parts := make([]string, 0, 3)
	if strings.TrimSpace(name) != "" {
		parts = append(parts, strings.TrimSpace(name))
	}
	if strings.TrimSpace(version) != "" {
		parts = append(parts, strings.TrimSpace(version))
	}
	if strings.TrimSpace(build) != "" {
		parts = append(parts, "build "+strings.TrimSpace(build))
	}
	return strings.TrimSpace(strings.Join(parts, " "))
}

func selectPrimaryDiskBytes(disks any) (int64, int64) {
	list := normalizeAnyRecordArray(disks)
	if len(list) == 0 {
		return 0, 0
	}

	bestIndex := 0
	bestScore := int64(-1)

	for i, entry := range list {
		letter, _ := entry["letter"].(string)
		totalMb := readSnapshotNumber(entry, "totalMb")
		score := totalMb
		if strings.EqualFold(strings.TrimSpace(letter), "C") {
			score += 1 << 50
		}
		if score > bestScore {
			bestScore = score
			bestIndex = i
		}
	}

	selected := list[bestIndex]
	freeMb := readSnapshotNumber(selected, "freeMb")
	totalMb := readSnapshotNumber(selected, "totalMb")
	return freeMb * 1024 * 1024, totalMb * 1024 * 1024
}

func readSnapshotNumber(record map[string]any, key string) int64 {
	value, ok := record[key]
	if !ok {
		return 0
	}

	switch typed := value.(type) {
	case float64:
		return int64(typed)
	case float32:
		return int64(typed)
	case int:
		return int64(typed)
	case int32:
		return int64(typed)
	case int64:
		return typed
	case uint32:
		return int64(typed)
	case uint64:
		if typed > ^uint64(0)>>1 {
			return 0
		}
		return int64(typed)
	default:
		return 0
	}
}

func timePtr(value time.Time) *time.Time {
	if value.IsZero() {
		return nil
	}
	return &value
}

func parseRemoteTime(value string) time.Time {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return time.Time{}
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func tokenFingerprint(token string) string {
	trimmed := strings.TrimSpace(token)
	if trimmed == "" {
		return "empty"
	}
	sum := sha256.Sum256([]byte(trimmed))
	return hex.EncodeToString(sum[:])[:12]
}

func shouldKeepPersistedRemoteState(current, incoming remoteState) bool {
	if current.AgentToken == "" || incoming.AgentToken == current.AgentToken {
		return false
	}
	if incoming.AgentToken == "" && incoming.RebootstrapRequired {
		return false
	}

	if !current.AgentTokenIssuedAt.IsZero() && !incoming.AgentTokenIssuedAt.IsZero() {
		return current.AgentTokenIssuedAt.After(incoming.AgentTokenIssuedAt)
	}

	if !current.LastSyncAt.IsZero() && incoming.LastSyncAt.IsZero() {
		return true
	}

	if current.RebootstrapRequired != incoming.RebootstrapRequired {
		return !current.RebootstrapRequired && incoming.RebootstrapRequired
	}

	return current.UpdatedAt.After(incoming.UpdatedAt)
}
