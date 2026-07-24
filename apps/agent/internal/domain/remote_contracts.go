package domain

import "encoding/json"

const (
	RemoteDiscoverSchemaVersion    = "discover.payload.v1"
	RemoteSyncSchemaVersion        = "sync.payload.v1"
	RemoteAckSchemaVersion         = "ack.payload.v1"
	RemoteDiscoverContractVersion  = "discover.v2"
	RemoteBootstrapContractVersion = "rustdesk.bootstrap.v1"
	RemoteSyncContractVersion      = "rustdesk.sync.v1"
)

type RemoteBootstrapFlow string

const (
	RemoteBootstrapFlowPendingLink           RemoteBootstrapFlow = "pending_link"
	RemoteBootstrapFlowLinkedHostDetected    RemoteBootstrapFlow = "linked_host_detected"
	RemoteBootstrapFlowHostBootstrapRequired RemoteBootstrapFlow = "host_bootstrap_required"
	RemoteBootstrapFlowTokenInvalid          RemoteBootstrapFlow = "token_invalid"
)

type RemoteHeartbeatAuth string

const (
	RemoteHeartbeatAuthDiscoveryToken RemoteHeartbeatAuth = "discoveryToken"
	RemoteHeartbeatAuthAgentToken     RemoteHeartbeatAuth = "agentToken"
)

type RemoteSyncCommandType string

const (
	RemoteSyncCommandReapplyAlias  RemoteSyncCommandType = "REAPPLY_ALIAS"
	RemoteSyncCommandReapplyConfig RemoteSyncCommandType = "REAPPLY_CONFIG"
	// UPGRADE_CLIENT is retained to execute commands already queued by older portals.
	RemoteSyncCommandUpgradeClient       RemoteSyncCommandType = "UPGRADE_CLIENT"
	RemoteSyncCommandUpgradeRustDesk     RemoteSyncCommandType = "UPGRADE_RUSTDESK"
	RemoteSyncCommandUpgradeAgent        RemoteSyncCommandType = "UPGRADE_AGENT"
	RemoteSyncCommandServiceControl      RemoteSyncCommandType = "SERVICE_CONTROL"
	RemoteSyncCommandRotateTokenRequired RemoteSyncCommandType = "ROTATE_TOKEN_REQUIRED"
)

type RemoteAckStatus string

const (
	RemoteAckStatusAcknowledged RemoteAckStatus = "ACKNOWLEDGED"
	RemoteAckStatusFailed       RemoteAckStatus = "FAILED"
)

type RemoteAckReasonCode string

const (
	RemoteAckReasonCommandProcessed       RemoteAckReasonCode = "COMMAND_PROCESSED"
	RemoteAckReasonReapplyAliasNoop       RemoteAckReasonCode = "REAPPLY_ALIAS_NOOP"
	RemoteAckReasonReapplyConfigNoop      RemoteAckReasonCode = "REAPPLY_CONFIG_NOOP"
	RemoteAckReasonUpgradeClientSuccess   RemoteAckReasonCode = "UPGRADE_CLIENT_SUCCESS"
	RemoteAckReasonUpgradeAgentScheduled  RemoteAckReasonCode = "UPGRADE_AGENT_SCHEDULED"
	RemoteAckReasonRotateTokenRequired    RemoteAckReasonCode = "ROTATE_TOKEN_REQUIRED"
	RemoteAckReasonCommandUnknown         RemoteAckReasonCode = "COMMAND_UNKNOWN"
	RemoteAckReasonCommandExecutionFailed RemoteAckReasonCode = "COMMAND_EXECUTION_FAILED"
)

type RemoteDiscoverRequest struct {
	SchemaVersion  string `json:"schemaVersion"`
	DiscoveryToken string `json:"discoveryToken"`
	RustDeskID     string `json:"rustdeskId,omitempty"`
	MachineName    string `json:"machineName,omitempty"`
	AgentVersion   string `json:"agentVersion,omitempty"`
	ServiceStatus  string `json:"serviceStatus,omitempty"`
	Environment    string `json:"environment,omitempty"`
	Provider       string `json:"provider,omitempty"`
	Description    string `json:"description,omitempty"`
	SysproUpdates  any    `json:"sysproUpdates,omitempty"`
	SystemMetrics  any    `json:"systemMetrics,omitempty"`
}

type RemoteDiscoverTransition struct {
	State                          string `json:"state"`
	NextStep                       string `json:"nextStep"`
	NextEndpoint                   string `json:"nextEndpoint"`
	AllowDiscoveryHeartbeat        bool   `json:"allowDiscoveryHeartbeat"`
	RequiresAuthenticatedBootstrap bool   `json:"requiresAuthenticatedBootstrap"`
}

type RemoteDiscoverResponse struct {
	ContractVersion  string                   `json:"contractVersion"`
	Mode             string                   `json:"mode"`
	DiscoveredHostID string                   `json:"discoveredHostId"`
	HostID           string                   `json:"hostId,omitempty"`
	HostName         string                   `json:"hostName,omitempty"`
	InstallToken     string                   `json:"installToken,omitempty"`
	HeartbeatAuth    RemoteHeartbeatAuth      `json:"heartbeatAuth"`
	BootstrapFlow    RemoteBootstrapFlow      `json:"bootstrapFlow"`
	Transition       RemoteDiscoverTransition `json:"transition"`
	Message          string                   `json:"message"`
}

type RemoteBootstrapRequest struct {
	InstallToken     string `json:"installToken,omitempty"`
	DiscoveryToken   string `json:"discoveryToken,omitempty"`
	DiscoveredHostID string `json:"discoveredHostId,omitempty"`
	RustDeskID       string `json:"rustdeskId,omitempty"`
	MachineName      string `json:"machineName,omitempty"`
	AgentVersion     string `json:"agentVersion,omitempty"`
	Environment      string `json:"environment,omitempty"`
	CurrentAlias     string `json:"currentAlias,omitempty"`
	CurrentVersion   string `json:"currentVersion,omitempty"`
	ServerHost       string `json:"serverHost,omitempty"`
	APIHost          string `json:"apiHost,omitempty"`
	PublicKey        string `json:"publicKey,omitempty"`
}

type RemoteBootstrapResponse struct {
	ContractVersion          string `json:"contractVersion"`
	BootstrapMode            string `json:"bootstrapMode"`
	HostID                   string `json:"hostId,omitempty"`
	CompanyID                string `json:"companyId,omitempty"`
	CompanyName              string `json:"companyName,omitempty"`
	Alias                    string `json:"alias"`
	RustDeskID               string `json:"rustdeskId"`
	MachineName              string `json:"machineName"`
	AgentToken               string `json:"agentToken,omitempty"`
	AgentTokenIssuedAt       string `json:"agentTokenIssuedAt"`
	AgentTokenExpiresAt      string `json:"agentTokenExpiresAt"`
	ServerHost               string `json:"serverHost"`
	APIHost                  string `json:"apiHost"`
	PublicKey                string `json:"publicKey"`
	PublicKeyHash            string `json:"publicKeyHash"`
	ServerConfig             string `json:"serverConfig"`
	TargetVersion            string `json:"targetVersion"`
	DefaultPassword          string `json:"defaultPassword"`
	AutoInstall              bool   `json:"autoInstall"`
	AutoUpgrade              bool   `json:"autoUpgrade"`
	InstallerURL             string `json:"installerUrl"`
	InstallerChecksum        string `json:"installerChecksumSha256"`
	InstallerPackageType     string `json:"installerPackageType"`
	InstallerSilentArgs      string `json:"installerSilentArgs"`
	RestartServiceAfterApply bool   `json:"restartServiceAfterApply"`
	SuppressTrayShortcuts    bool   `json:"suppressTrayShortcuts"`
	HideTray                 bool   `json:"hideTray"`
	HideStopService          bool   `json:"hideStopService"`
	AllowRemoteConfigMod     bool   `json:"allowRemoteConfigModification"`
	AllowD3DRender           bool   `json:"allowD3DRender"`
	EnableDirectXCapture     bool   `json:"enableDirectXCapture"`
	Compliance               struct {
		AliasMatch      bool `json:"aliasMatch"`
		VersionMatch    bool `json:"versionMatch"`
		ServerHostMatch bool `json:"serverHostMatch"`
		APIHostMatch    bool `json:"apiHostMatch"`
		PublicKeyMatch  bool `json:"publicKeyMatch"`
	} `json:"compliance"`
}

type RemoteSyncRequest struct {
	SchemaVersion       string `json:"schemaVersion"`
	AgentToken          string `json:"agentToken"`
	RustDeskID          string `json:"rustdeskId,omitempty"`
	MachineName         string `json:"machineName,omitempty"`
	AgentVersion        string `json:"agentVersion,omitempty"`
	CurrentAlias        string `json:"currentAlias,omitempty"`
	CurrentVersion      string `json:"currentVersion,omitempty"`
	ServerHost          string `json:"serverHost,omitempty"`
	APIHost             string `json:"apiHost,omitempty"`
	PublicKey           string `json:"publicKey,omitempty"`
	ServiceStatus       string `json:"serviceStatus,omitempty"`
	SysproUpdates       any    `json:"sysproUpdates,omitempty"`
	SystemSnapshot      any    `json:"systemSnapshot,omitempty"`
	NetworkSnapshot     any    `json:"networkSnapshot,omitempty"`
	SoftwareSnapshot    any    `json:"softwareSnapshot,omitempty"`
	HardwareIdentity    any    `json:"hardwareIdentity,omitempty"`
	DiskSnapshot        any    `json:"diskSnapshot,omitempty"`
	SysproProcesses     any    `json:"sysproProcesses,omitempty"`
	SysproVersions       any    `json:"sysproVersions,omitempty"`
	SysproRuntimeProbes  any    `json:"sysproRuntimeProbes,omitempty"`
	WindowsUpdateStatus  any    `json:"windowsUpdateStatus,omitempty"`
	AllServicesSnapshot any    `json:"allServicesSnapshot,omitempty"`
	RebootPending       any    `json:"rebootPending,omitempty"`
	AgentMetrics        any    `json:"agentMetrics,omitempty"`
	CriticalEvents      any    `json:"criticalEvents,omitempty"`
}

type RemoteSyncCommand struct {
	ID           string                `json:"id"`
	Type         RemoteSyncCommandType `json:"type"`
	Status       string                `json:"status,omitempty"`
	Reason       string                `json:"reason,omitempty"`
	Payload      json.RawMessage       `json:"payload,omitempty"`
	AttemptCount int                   `json:"attemptCount,omitempty"`
	CreatedAt    string                `json:"createdAt,omitempty"`
	DeliveredAt  string                `json:"deliveredAt,omitempty"`
}

type RemoteSyncResponse struct {
	ContractVersion      string `json:"contractVersion"`
	HostID               string `json:"hostId"`
	CompanyID            string `json:"companyId,omitempty"`
	CompanyName          string `json:"companyName,omitempty"`
	Alias                string `json:"alias"`
	RustDeskID           string `json:"rustdeskId"`
	MachineName          string `json:"machineName"`
	CurrentAgentVersion  string `json:"currentAgentVersion"`
	LastHeartbeatAt      string `json:"lastHeartbeatSuccessAt"`
	AgentTokenIssuedAt   string `json:"agentTokenIssuedAt"`
	AgentTokenLastUsedAt string `json:"agentTokenLastUsedAt"`
	AgentTokenExpiresAt  string `json:"agentTokenExpiresAt"`
	ExpectedConfig       struct {
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
	} `json:"expectedConfig"`
	ReportedConfig struct {
		Alias         string `json:"alias"`
		Version       string `json:"version"`
		ServerHost    string `json:"serverHost"`
		APIHost       string `json:"apiHost"`
		PublicKeyHash string `json:"publicKeyHash"`
		LastSyncAt    string `json:"lastSyncAt"`
	} `json:"reportedConfig"`
	Compliance struct {
		AliasMatch      bool `json:"aliasMatch"`
		VersionMatch    bool `json:"versionMatch"`
		ServerHostMatch bool `json:"serverHostMatch"`
		APIHostMatch    bool `json:"apiHostMatch"`
		PublicKeyMatch  bool `json:"publicKeyMatch"`
	} `json:"compliance"`
	Warnings     []string            `json:"warnings"`
	Actions      []string            `json:"actions"`
	CommandQueue []RemoteSyncCommand `json:"commandQueue"`
}

type RemoteAckRequest struct {
	SchemaVersion string              `json:"schemaVersion"`
	AgentToken    string              `json:"agentToken"`
	CommandID     string              `json:"commandId"`
	Status        RemoteAckStatus     `json:"status"`
	ReasonCode    RemoteAckReasonCode `json:"reasonCode,omitempty"`
	Message       string              `json:"message,omitempty"`
	Details       map[string]any      `json:"details,omitempty"`
}
