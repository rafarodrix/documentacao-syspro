package remote

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
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
	AgentToken          string    `json:"agent_token,omitempty"`
	HostID              string    `json:"host_id,omitempty"`
	CompanyID           string    `json:"company_id,omitempty"`
	CompanyName         string    `json:"company_name,omitempty"`
	Alias               string    `json:"alias,omitempty"`
	RustDeskID          string    `json:"rustdesk_id,omitempty"`
	MachineName         string    `json:"machine_name,omitempty"`
	ServiceStatus       string    `json:"service_status,omitempty"`
	CurrentVersion      string    `json:"current_version,omitempty"`
	ServerHost          string    `json:"server_host,omitempty"`
	APIHost             string    `json:"api_host,omitempty"`
	PublicKey           string    `json:"public_key,omitempty"`
	PublicKeyHash       string    `json:"public_key_hash,omitempty"`
	ServerConfig        string    `json:"server_config,omitempty"`
	TargetVersion       string    `json:"target_version,omitempty"`
	DefaultPassword     string    `json:"default_password,omitempty"`
	RustDeskExecutable  string    `json:"rustdesk_executable,omitempty"`
	LastConfigAppliedAt time.Time `json:"last_config_applied_at,omitempty"`
	LastAppliedHash     string    `json:"last_applied_hash,omitempty"`
	RebootstrapRequired bool      `json:"rebootstrap_required"`
	LastBootstrapFlow   string    `json:"last_bootstrap_flow,omitempty"`
	LastSyncAt          time.Time `json:"last_sync_at,omitempty"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type Module struct {
	client          PortalClient
	store           StateStore
	logger          Logger
	events          EventBus
	discoveryToken  string
	installToken    string
	agentVersion    string
	environment     string
	stateDir        string
	installerURL    string
	installerSHA256 string
	installerArgs   string
}

type Option func(*Module)

func WithDiscoveryToken(token string) Option {
	return func(m *Module) { m.discoveryToken = token }
}

func WithInstallToken(token string) Option {
	return func(m *Module) { m.installToken = token }
}

func WithAgentVersion(version string) Option {
	return func(m *Module) { m.agentVersion = version }
}

func WithEnvironment(environment string) Option {
	return func(m *Module) { m.environment = environment }
}

func WithStateDir(stateDir string) Option {
	return func(m *Module) { m.stateDir = stateDir }
}

func WithRustDeskInstaller(url, checksumSHA256, installArgs string) Option {
	return func(m *Module) {
		m.installerURL = url
		m.installerSHA256 = checksumSHA256
		m.installerArgs = installArgs
	}
}

func New(client PortalClient, store StateStore, logger Logger, events EventBus, opts ...Option) *Module {
	m := &Module{
		client:        client,
		store:         store,
		logger:        logger,
		events:        events,
		agentVersion:  "go-agent-v1",
		environment:   "Producao",
		installerArgs: "/S",
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
	if !desired.Remote.Enabled {
		return nil
	}

	if current.Status == domain.ModuleStatusReady {
		return []domain.ReconcileAction{{
			Module: "remote",
			Type:   "sync_cycle",
			Reason: "remote sync heartbeat",
		}}
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

	var st remoteState
	_ = m.store.LoadJSON(ctx, stateFile, &st)

	if st.AgentToken != "" && !st.RebootstrapRequired {
		m.logger.Debug("remote sync using persisted agent token", "host_id", st.HostID)
		return m.runSync(ctx, &st, st.AgentToken)
	}

	st.AgentToken = ""
	if st.RebootstrapRequired {
		m.logger.Info("remote rebootstrap required; clearing local agent token", "host_id", st.HostID)
	}

	return m.runDiscoverBootstrapSync(ctx, &st)
}

func (m *Module) runDiscoverBootstrapSync(ctx context.Context, st *remoteState) domain.ApplyResult {
	if m.discoveryToken == "" {
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Message: "remote discovery token not configured",
		}
	}

	hostname := currentHostname()
	if err := m.refreshRustDeskState(ctx, st, true, false, nil); err != nil {
		m.logger.Warn("remote rustdesk refresh before discover failed", "error", err)
	}
	discoverResp, err := m.client.Discover(ctx, domain.RemoteDiscoverRequest{
		DiscoveryToken: m.discoveryToken,
		RustDeskID:     st.RustDeskID,
		MachineName:    hostname,
		AgentVersion:   m.agentVersion,
		ServiceStatus:  firstNonEmpty(st.ServiceStatus, "unknown"),
		Environment:    m.environment,
		Provider:       "go-agent",
	})
	if err != nil {
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

	switch flow {
	case domain.RemoteBootstrapFlowPendingLink:
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Message: "waiting for manual host link in portal",
		}
	case domain.RemoteBootstrapFlowLinkedHostDetected,
		domain.RemoteBootstrapFlowHostBootstrapRequired,
		domain.RemoteBootstrapFlowTokenInvalid:
		if m.installToken == "" {
			return domain.ApplyResult{
				Module:  "remote",
				Changed: false,
				Message: fmt.Sprintf("bootstrap flow %s is waiting for install token from the linked host in portal", flow),
			}
		}
		return m.runBootstrapThenSync(ctx, st, hostname)
	default:
		return domain.ApplyResult{
			Module:  "remote",
			Changed: false,
			Error:   fmt.Sprintf("unknown remote bootstrap flow: %s", flow),
		}
	}
}

func (m *Module) runBootstrapThenSync(ctx context.Context, st *remoteState, hostname string) domain.ApplyResult {
	if err := m.refreshRustDeskState(ctx, st, true, false, nil); err != nil {
		m.logger.Warn("remote rustdesk refresh before bootstrap failed", "error", err)
	}

	bootstrapResp, err := m.client.Bootstrap(ctx, domain.RemoteBootstrapRequest{
		InstallToken:   m.installToken,
		RustDeskID:     st.RustDeskID,
		MachineName:    hostname,
		AgentVersion:   m.agentVersion,
		Environment:    m.environment,
		CurrentAlias:   st.Alias,
		CurrentVersion: st.CurrentVersion,
		ServerHost:     st.ServerHost,
		APIHost:        st.APIHost,
		PublicKey:      st.PublicKey,
	})
	if err != nil {
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
	st.HostID = firstNonEmpty(bootstrapResp.HostID, st.HostID)
	st.CompanyID = firstNonEmpty(bootstrapResp.CompanyID, st.CompanyID)
	st.CompanyName = firstNonEmpty(bootstrapResp.CompanyName, st.CompanyName)
	st.Alias = firstNonEmpty(bootstrapResp.Alias, st.Alias)
	st.RustDeskID = firstNonEmpty(bootstrapResp.RustDeskID, st.RustDeskID)
	st.MachineName = firstNonEmpty(bootstrapResp.MachineName, hostname)
	st.RebootstrapRequired = false
	st.LastBootstrapFlow = "bootstrap_completed"
	m.applyPortalConfig(st, rustDeskDesiredConfig{
		Alias:           bootstrapResp.Alias,
		ServerHost:      bootstrapResp.ServerHost,
		APIHost:         bootstrapResp.APIHost,
		PublicKey:       bootstrapResp.PublicKey,
		PublicKeyHash:   bootstrapResp.PublicKeyHash,
		ServerConfig:    bootstrapResp.ServerConfig,
		TargetVersion:   bootstrapResp.TargetVersion,
		DefaultPassword: bootstrapResp.DefaultPassword,
	})
	if err := m.refreshRustDeskState(ctx, st, true, true, nil); err != nil {
		return m.fail("bootstrap rustdesk apply failed", err)
	}
	_ = m.saveState(ctx, st)

	m.logger.Info("remote bootstrap completed", "host_id", st.HostID, "alias", st.Alias)
	_ = m.publish(ctx, "remote.bootstrap.completed", "bootstrap completed", map[string]any{
		"host_id": st.HostID,
		"alias":   st.Alias,
	})

	return m.runSync(ctx, st, bootstrapResp.AgentToken)
}

func (m *Module) runSync(ctx context.Context, st *remoteState, agentToken string) domain.ApplyResult {
	if err := m.refreshRustDeskState(ctx, st, true, false, nil); err != nil {
		m.logger.Warn("remote rustdesk refresh before sync failed", "error", err)
	}

	hostname := firstNonEmpty(st.MachineName, currentHostname())
	syncResp, err := m.client.Sync(ctx, domain.RemoteSyncRequest{
		AgentToken:     agentToken,
		RustDeskID:     st.RustDeskID,
		MachineName:    hostname,
		AgentVersion:   m.agentVersion,
		CurrentAlias:   st.Alias,
		CurrentVersion: st.CurrentVersion,
		ServerHost:     st.ServerHost,
		APIHost:        st.APIHost,
		PublicKey:      st.PublicKey,
		ServiceStatus:  firstNonEmpty(st.ServiceStatus, "unknown"),
	})
	if err != nil {
		st.AgentToken = ""
		st.RebootstrapRequired = true
		_ = m.saveState(ctx, st)
		return m.fail("sync failed", err)
	}

	st.HostID = firstNonEmpty(syncResp.HostID, st.HostID)
	st.CompanyName = firstNonEmpty(syncResp.CompanyName, st.CompanyName)
	st.Alias = firstNonEmpty(syncResp.Alias, st.Alias)
	st.RustDeskID = firstNonEmpty(syncResp.RustDeskID, st.RustDeskID)
	st.MachineName = firstNonEmpty(syncResp.MachineName, hostname)
	st.RebootstrapRequired = false
	st.LastSyncAt = time.Now().UTC()
	m.applyPortalConfig(st, rustDeskDesiredConfig{
		Alias:         syncResp.Alias,
		ServerHost:    syncResp.ExpectedConfig.ServerHost,
		APIHost:       syncResp.ExpectedConfig.APIHost,
		PublicKey:     syncResp.ExpectedConfig.PublicKey,
		PublicKeyHash: syncResp.ExpectedConfig.PublicKeyHash,
		ServerConfig:  syncResp.ExpectedConfig.ServerConfig,
		TargetVersion: syncResp.ExpectedConfig.TargetVersion,
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
			continue
		}
		m.logger.Info("remote command ack sent", "command_id", cmd.ID, "status", ack.status)
	}

	if invalidateToken {
		st.AgentToken = ""
		st.RebootstrapRequired = true
		m.logger.Info("remote token invalidated after command processing", "host_id", st.HostID)
	}

	if !syncResp.Compliance.AliasMatch || !syncResp.Compliance.ServerHostMatch || !syncResp.Compliance.APIHostMatch || !syncResp.Compliance.PublicKeyMatch {
		if err := m.refreshRustDeskState(ctx, st, true, true, nil); err != nil {
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
		if err := m.refreshRustDeskState(ctx, st, true, true, nil); err != nil {
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
		if err := m.refreshRustDeskState(ctx, st, true, true, nil); err != nil {
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
		if err := m.refreshRustDeskState(ctx, st, true, true, &rustDeskUpgradeSpec{
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
	manager := newRustDeskManager(m.logger, m.stateDir, m.installerURL, m.installerSHA256, m.installerArgs)
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
		Alias:           st.Alias,
		ServerHost:      st.ServerHost,
		APIHost:         st.APIHost,
		PublicKey:       st.PublicKey,
		PublicKeyHash:   st.PublicKeyHash,
		ServerConfig:    st.ServerConfig,
		TargetVersion:   st.TargetVersion,
		DefaultPassword: st.DefaultPassword,
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
	if st.MachineName == "" {
		st.MachineName = currentHostname()
	}
	return nil
}

func mustInspect(manager *rustDeskManager, ctx context.Context, fallback rustDeskStatus) rustDeskStatus {
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
	}
	joined := strings.Join(parts, "|")
	if strings.Trim(joined, "|") == "" {
		return ""
	}
	sum := sha256.Sum256([]byte(joined))
	return hex.EncodeToString(sum[:])
}

func (m *Module) saveState(ctx context.Context, st *remoteState) error {
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
