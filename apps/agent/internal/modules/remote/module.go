package remote

import (
	"context"
	"fmt"
	"os"
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
	Alias               string    `json:"alias,omitempty"`
	RustDeskID          string    `json:"rustdesk_id,omitempty"`
	MachineName         string    `json:"machine_name,omitempty"`
	RebootstrapRequired bool      `json:"rebootstrap_required"`
	LastBootstrapFlow   string    `json:"last_bootstrap_flow,omitempty"`
	LastSyncAt          time.Time `json:"last_sync_at,omitempty"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type Module struct {
	client         PortalClient
	store          StateStore
	logger         Logger
	events         EventBus
	discoveryToken string
	installToken   string
	agentVersion   string
	environment    string
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

func New(client PortalClient, store StateStore, logger Logger, events EventBus, opts ...Option) *Module {
	m := &Module{
		client:       client,
		store:        store,
		logger:       logger,
		events:       events,
		agentVersion: "go-agent-v1",
		environment:  "Producao",
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
	discoverResp, err := m.client.Discover(ctx, domain.RemoteDiscoverRequest{
		DiscoveryToken: m.discoveryToken,
		RustDeskID:     st.RustDeskID,
		MachineName:    hostname,
		AgentVersion:   m.agentVersion,
		ServiceStatus:  "running",
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
				Message: fmt.Sprintf("bootstrap flow %s requires REMOTE_INSTALL_TOKEN", flow),
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
	bootstrapResp, err := m.client.Bootstrap(ctx, domain.RemoteBootstrapRequest{
		InstallToken:   m.installToken,
		RustDeskID:     st.RustDeskID,
		MachineName:    hostname,
		AgentVersion:   m.agentVersion,
		Environment:    m.environment,
		CurrentAlias:   st.Alias,
		CurrentVersion: m.agentVersion,
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
	st.Alias = firstNonEmpty(bootstrapResp.Alias, st.Alias)
	st.RustDeskID = firstNonEmpty(bootstrapResp.RustDeskID, st.RustDeskID)
	st.MachineName = firstNonEmpty(bootstrapResp.MachineName, hostname)
	st.RebootstrapRequired = false
	st.LastBootstrapFlow = "bootstrap_completed"
	_ = m.saveState(ctx, st)

	m.logger.Info("remote bootstrap completed", "host_id", st.HostID, "alias", st.Alias)
	_ = m.publish(ctx, "remote.bootstrap.completed", "bootstrap completed", map[string]any{
		"host_id": st.HostID,
		"alias":   st.Alias,
	})

	return m.runSync(ctx, st, bootstrapResp.AgentToken)
}

func (m *Module) runSync(ctx context.Context, st *remoteState, agentToken string) domain.ApplyResult {
	hostname := firstNonEmpty(st.MachineName, currentHostname())
	syncResp, err := m.client.Sync(ctx, domain.RemoteSyncRequest{
		AgentToken:    agentToken,
		RustDeskID:    st.RustDeskID,
		MachineName:   hostname,
		AgentVersion:  m.agentVersion,
		ServiceStatus: "running",
	})
	if err != nil {
		st.AgentToken = ""
		st.RebootstrapRequired = true
		_ = m.saveState(ctx, st)
		return m.fail("sync failed", err)
	}

	st.HostID = firstNonEmpty(syncResp.HostID, st.HostID)
	st.Alias = firstNonEmpty(syncResp.Alias, st.Alias)
	st.RustDeskID = firstNonEmpty(syncResp.RustDeskID, st.RustDeskID)
	st.MachineName = firstNonEmpty(syncResp.MachineName, hostname)
	st.RebootstrapRequired = false
	st.LastSyncAt = time.Now().UTC()

	invalidateToken := false
	for _, cmd := range syncResp.CommandQueue {
		ack := m.executeCommand(ctx, cmd)
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

func (m *Module) executeCommand(ctx context.Context, cmd domain.RemoteSyncCommand) commandAck {
	_ = ctx
	m.logger.Info("remote command received", "command_id", cmd.ID, "type", cmd.Type)

	switch cmd.Type {
	case domain.RemoteSyncCommandReapplyAlias:
		return commandAck{
			status:     domain.RemoteAckStatusAcknowledged,
			reasonCode: domain.RemoteAckReasonReapplyAliasNoop,
			message:    "alias reapply is not implemented by go agent yet",
		}
	case domain.RemoteSyncCommandReapplyConfig:
		return commandAck{
			status:     domain.RemoteAckStatusAcknowledged,
			reasonCode: domain.RemoteAckReasonReapplyConfigNoop,
			message:    "config reapply is not implemented by go agent yet",
		}
	case domain.RemoteSyncCommandRotateTokenRequired:
		return commandAck{
			status:          domain.RemoteAckStatusAcknowledged,
			reasonCode:      domain.RemoteAckReasonRotateTokenRequired,
			message:         "local token marked for rebootstrap",
			invalidateToken: true,
		}
	case domain.RemoteSyncCommandUpgradeClient:
		return commandAck{
			status:     domain.RemoteAckStatusFailed,
			reasonCode: domain.RemoteAckReasonCommandExecutionFailed,
			message:    "client upgrade is not implemented by go agent yet",
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
