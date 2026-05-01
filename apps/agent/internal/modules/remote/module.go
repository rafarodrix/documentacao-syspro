package remote

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
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
	Alias                    string    `json:"alias,omitempty"`
	RustDeskID               string    `json:"rustdesk_id,omitempty"`
	MachineName              string    `json:"machine_name,omitempty"`
	ServiceStatus            string    `json:"service_status,omitempty"`
	CurrentVersion           string    `json:"current_version,omitempty"`
	ServerHost               string    `json:"server_host,omitempty"`
	APIHost                  string    `json:"api_host,omitempty"`
	PublicKey                string    `json:"public_key,omitempty"`
	PublicKeyHash            string    `json:"public_key_hash,omitempty"`
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
	GetSyncSnapshots() (metrics, disks, services, versions any, rebootPending *bool)
}

type Module struct {
	client          PortalClient
	store           StateStore
	logger          Logger
	events          EventBus
	device          DeviceSnapshotProvider
	discoveryToken string
	installToken   string
	agentVersion   string
	stateDir       string
	rustDeskFactory func() rustDeskController
}

type Option func(*Module)

func WithDiscoveryToken(token string) Option {
	return func(m *Module) { m.discoveryToken = token }
}

func WithInstallToken(token string) Option {
	return func(m *Module) { m.installToken = token }
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

func WithStateDir(stateDir string) Option {
	return func(m *Module) { m.stateDir = stateDir }
}

func New(client PortalClient, store StateStore, logger Logger, events EventBus, opts ...Option) *Module {
	m := &Module{
		client:       client,
		store:        store,
		logger:       logger,
		events:       events,
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

	return domain.CurrentModuleState{
		Enabled:       st.AgentToken != "" && !st.RebootstrapRequired,
		Version:       m.agentVersion,
		Status:        status,
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
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Message: "remote discovery token not configured",
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
	})
	if err != nil {
		if isApplyContextCanceled(err) {
			return m.canceled("discover cycle canceled")
		}
		return m.fail("discover failed", err)
	}

	flow := discoverResp.BootstrapFlow
	if flow == "" {
		flow = inferBootstrapFlow(discoverResp)
	}

	st.HostID = firstNonEmpty(discoverResp.HostID, st.HostID)
	m.installToken = firstNonEmpty(strings.TrimSpace(m.installToken), strings.TrimSpace(discoverResp.InstallToken))
	st.MachineName = hostname
	st.LastBootstrapFlow = string(flow)
	_ = m.saveState(ctx, st)

	m.logger.Info("remote discover completed",
		"flow", flow,
		"mode", discoverResp.Mode,
		"discovered_host_id", discoverResp.DiscoveredHostID,
		"host_id", discoverResp.HostID,
	)
	_ = m.publish(ctx, "remote.discover.completed", "discover completed", map[string]any{
		"flow":               flow,
		"mode":               discoverResp.Mode,
		"discovered_host_id": discoverResp.DiscoveredHostID,
		"host_id":            discoverResp.HostID,
		"install_token_auto": strings.TrimSpace(discoverResp.InstallToken) != "",
	})

	decision := m.resolveDiscoverDecision(discoverResp)
	m.logger.Info("remote discover decision", "flow", decision.flow, "phase", decision.phase, "message", decision.message)
	switch decision.phase {
	case runtimePhaseWait:
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Message: decision.message,
		}
	case runtimePhaseBootstrap:
		return m.runBootstrapThenSync(ctx, st, hostname, intent)
	default:
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Error:   fmt.Sprintf("unknown remote discover decision for flow %s", decision.flow),
		}
	}
}

func (m *Module) runBootstrapThenSync(ctx context.Context, st *remoteState, hostname string, intent remoteDesiredIntent) domain.ApplyResult {
	if err := m.refreshRustDeskState(ctx, st, false, false, nil); err != nil {
		m.logger.Warn("remote rustdesk refresh before bootstrap failed", "error", err)
	}

	bootstrapResp, err := m.client.Bootstrap(ctx, domain.RemoteBootstrapRequest{
		InstallToken:   m.installToken,
		RustDeskID:     st.RustDeskID,
		MachineName:    hostname,
		AgentVersion:   m.agentVersion,
		CurrentAlias:   st.Alias,
		CurrentVersion: st.CurrentVersion,
		ServerHost:     st.ServerHost,
		APIHost:        st.APIHost,
		PublicKey:      st.PublicKey,
	})
	if err != nil {
		if isApplyContextCanceled(err) {
			return m.canceled("bootstrap cycle canceled")
		}
		st.RebootstrapRequired = true
		_ = m.saveState(ctx, st)
		return m.fail("bootstrap failed", err)
	}

	if bootstrapResp.AgentToken == "" {
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Error:   "bootstrap returned empty agent token",
		}
	}

	st.AgentToken = bootstrapResp.AgentToken
	st.AgentTokenIssuedAt = parseRemoteTime(bootstrapResp.AgentTokenIssuedAt)
	st.HostID = firstNonEmpty(bootstrapResp.HostID, st.HostID)
	st.CompanyID = firstNonEmpty(bootstrapResp.CompanyID, st.CompanyID)
	st.CompanyName = firstNonEmpty(bootstrapResp.CompanyName, st.CompanyName)
	st.Alias = firstNonEmpty(bootstrapResp.Alias, st.Alias)
	st.RustDeskID = firstNonEmpty(bootstrapResp.RustDeskID, st.RustDeskID)
	st.MachineName = firstNonEmpty(bootstrapResp.MachineName, hostname)
	st.RebootstrapRequired = false
	st.LastBootstrapFlow = "bootstrap_completed"
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
		"alias", st.Alias,
		"token_fingerprint", tokenFingerprint(st.AgentToken),
	)
	_ = m.publish(ctx, "remote.bootstrap.completed", "bootstrap completed", map[string]any{
		"host_id": st.HostID,
		"alias":   st.Alias,
	})

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
	if flushStats.Sent > 0 || flushStats.Retained > 0 || flushStats.Discarded > 0 {
		m.logger.Info("remote pending ack flush completed",
			"sent", flushStats.Sent,
			"retained", flushStats.Retained,
			"discarded", flushStats.Discarded,
		)
	}

	hostname := firstNonEmpty(st.MachineName, currentHostname())

	syncReq := domain.RemoteSyncRequest{
		AgentToken:    agentToken,
		RustDeskID:    st.RustDeskID,
		MachineName:   hostname,
		AgentVersion:  m.agentVersion,
		CurrentAlias:  st.Alias,
		CurrentVersion: st.CurrentVersion,
		ServerHost:    st.ServerHost,
		APIHost:       st.APIHost,
		PublicKey:     st.PublicKey,
		ServiceStatus: firstNonEmpty(st.ServiceStatus, "unknown"),
	}

	// Injeta snapshots do device module se disponivel.
	// Nil-safe: nos primeiros ciclos o device ainda nao coletou dados.
	if m.device != nil {
		devMetrics, devDisks, devServices, devVersions, devReboot := m.device.GetSyncSnapshots()
		syncReq.AgentMetrics    = devMetrics
		syncReq.DiskSnapshot    = devDisks
		syncReq.SysproProcesses = devServices
		syncReq.SysproVersions  = devVersions
		syncReq.RebootPending   = devReboot
	}

	syncResp, err := m.client.Sync(ctx, syncReq)
	if err != nil {
		if isApplyContextCanceled(err) {
			m.logger.Info("remote sync canceled", "host_id", st.HostID, "error", err)
			return m.canceled("sync cycle canceled")
		}
		m.logger.Warn("remote sync failed, invalidating agent token and requiring rebootstrap",
			"host_id", st.HostID,
			"token_fingerprint", tokenFingerprint(agentToken),
			"error", err,
		)
		st.AgentToken = ""
		st.AgentTokenIssuedAt = time.Time{}
		st.HostID = ""
		st.CompanyID = ""
		st.CompanyName = ""
		st.RebootstrapRequired = true
		_ = m.saveState(ctx, st)
		if intent.bootstrapEnabled && m.discoveryToken != "" {
			m.logger.Info("remote sync failed; attempting immediate rediscovery", "error", err)
			return m.runDiscoverBootstrapSync(ctx, st, intent)
		}
		return m.fail("sync failed", err)
	}

	st.HostID = firstNonEmpty(syncResp.HostID, st.HostID)
	st.CompanyName = firstNonEmpty(syncResp.CompanyName, st.CompanyName)
	st.Alias = firstNonEmpty(syncResp.Alias, st.Alias)
	st.RustDeskID = firstNonEmpty(syncResp.RustDeskID, st.RustDeskID)
	st.MachineName = firstNonEmpty(syncResp.MachineName, hostname)
	if issuedAt := parseRemoteTime(syncResp.AgentTokenIssuedAt); !issuedAt.IsZero() {
		st.AgentTokenIssuedAt = issuedAt
	}
	st.RebootstrapRequired = false
	st.LastSyncAt = time.Now().UTC()
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
			m.logger.Warn("remote command ack failed", "command_id", cmd.ID, "error", err)
			m.enqueueAck(ctx, pendingAck{
				CommandID:  cmd.ID,
				AgentToken: agentToken,
				Status:     ack.status,
				ReasonCode: ack.reasonCode,
				Message:    ack.message,
				Details:    ack.details,
				EnqueuedAt: time.Now().UTC(),
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
	case domain.RemoteSyncCommandUpgradeClient:
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
			m.logger.Warn("rustdesk service ensure failed", "error", err)
		} else {
			status.ServiceStatus = serviceStatus
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
	if status.ExecutablePath != "" && fingerprint != "" && (forceApply || st.LastAppliedHash != fingerprint) {
		if err := manager.applyDesiredConfig(ctx, status.ExecutablePath, desired); err != nil {
			return err
		}
		st.LastAppliedHash = fingerprint
		st.LastConfigAppliedAt = time.Now().UTC()
		status = mustInspect(manager, ctx, status)
	}

	st.ServiceStatus = firstNonEmpty(status.ServiceStatus, st.ServiceStatus)
	st.RustDeskID = firstNonEmpty(status.RustDeskID, st.RustDeskID)
	st.CurrentVersion = firstNonEmpty(status.Version, st.CurrentVersion)
	st.RuntimePassword = strings.TrimSpace(status.AccessPassword)
	if st.MachineName == "" {
		st.MachineName = currentHostname()
	}
	return nil
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

func (m *Module) resolveDiscoverDecision(resp *domain.RemoteDiscoverResponse) discoverDecision {
	flow := inferBootstrapFlow(resp)
	requiresBootstrap := flow == domain.RemoteBootstrapFlowHostBootstrapRequired || flow == domain.RemoteBootstrapFlowTokenInvalid
	if resp != nil {
		requiresBootstrap = requiresBootstrap || resp.Transition.RequiresAuthenticatedBootstrap
	}
	if !requiresBootstrap && flow == domain.RemoteBootstrapFlowLinkedHostDetected && strings.TrimSpace(m.installToken) != "" {
		requiresBootstrap = true
	}

	if !requiresBootstrap {
		return discoverDecision{
			phase:   runtimePhaseWait,
			flow:    flow,
			message: "waiting for host link in portal before remote bootstrap",
		}
	}

	if strings.TrimSpace(m.installToken) == "" {
		return discoverDecision{
			phase:   runtimePhaseWait,
			flow:    flow,
			message: fmt.Sprintf("linked host is waiting for bootstrap token delivery from portal (flow %s)", flow),
		}
	}

	return discoverDecision{
		phase: runtimePhaseBootstrap,
		flow:  flow,
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

func inferBootstrapFlow(resp *domain.RemoteDiscoverResponse) domain.RemoteBootstrapFlow {
	if resp == nil {
		return ""
	}
	if resp.BootstrapFlow != "" {
		return resp.BootstrapFlow
	}
	if resp.Transition.NextEndpoint == "/api/remote/rustdesk/bootstrap" {
		return domain.RemoteBootstrapFlowHostBootstrapRequired
	}
	if resp.Mode == "linked" {
		return domain.RemoteBootstrapFlowLinkedHostDetected
	}
	return domain.RemoteBootstrapFlowPendingLink
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
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
