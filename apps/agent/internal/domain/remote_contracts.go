package domain

import "encoding/json"

const (
	RemoteDiscoverSchemaVersion = "discover.payload.v1"
	RemoteSyncSchemaVersion     = "sync.payload.v1"
	RemoteAckSchemaVersion      = "ack.payload.v1"
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
	HeartbeatAuth    string                   `json:"heartbeatAuth"`
	BootstrapFlow    string                   `json:"bootstrapFlow"`
	Transition       RemoteDiscoverTransition `json:"transition"`
	Message          string                   `json:"message"`
}

type RemoteBootstrapRequest struct {
	InstallToken   string `json:"installToken"`
	RustDeskID     string `json:"rustdeskId,omitempty"`
	MachineName    string `json:"machineName,omitempty"`
	AgentVersion   string `json:"agentVersion,omitempty"`
	Environment    string `json:"environment,omitempty"`
	CurrentAlias   string `json:"currentAlias,omitempty"`
	CurrentVersion string `json:"currentVersion,omitempty"`
	ServerHost     string `json:"serverHost,omitempty"`
	APIHost        string `json:"apiHost,omitempty"`
	PublicKey      string `json:"publicKey,omitempty"`
}

type RemoteBootstrapResponse struct {
	ContractVersion     string `json:"contractVersion"`
	BootstrapMode       string `json:"bootstrapMode"`
	HostID              string `json:"hostId"`
	CompanyID           string `json:"companyId"`
	Alias               string `json:"alias"`
	RustDeskID          string `json:"rustdeskId"`
	MachineName         string `json:"machineName"`
	AgentToken          string `json:"agentToken"`
	AgentTokenIssuedAt  string `json:"agentTokenIssuedAt"`
	AgentTokenExpiresAt string `json:"agentTokenExpiresAt"`
	ServerHost          string `json:"serverHost"`
	APIHost             string `json:"apiHost"`
	PublicKey           string `json:"publicKey"`
	PublicKeyHash       string `json:"publicKeyHash"`
	ServerConfig        string `json:"serverConfig"`
	TargetVersion       string `json:"targetVersion"`
	DefaultPassword     string `json:"defaultPassword"`
}

type RemoteSyncRequest struct {
	SchemaVersion string `json:"schemaVersion"`
	AgentToken    string `json:"agentToken"`
	RustDeskID    string `json:"rustdeskId,omitempty"`
	MachineName   string `json:"machineName,omitempty"`
	AgentVersion  string `json:"agentVersion,omitempty"`
	ServiceStatus string `json:"serviceStatus,omitempty"`
}

type RemoteSyncCommand struct {
	ID           string          `json:"id"`
	Type         string          `json:"type"`
	Status       string          `json:"status,omitempty"`
	Reason       string          `json:"reason,omitempty"`
	Payload      json.RawMessage `json:"payload,omitempty"`
	AttemptCount int             `json:"attemptCount,omitempty"`
	CreatedAt    string          `json:"createdAt,omitempty"`
	DeliveredAt  string          `json:"deliveredAt,omitempty"`
}

type RemoteSyncResponse struct {
	ContractVersion string              `json:"contractVersion"`
	HostID          string              `json:"hostId"`
	Alias           string              `json:"alias"`
	RustDeskID      string              `json:"rustdeskId"`
	MachineName     string              `json:"machineName"`
	CommandQueue    []RemoteSyncCommand `json:"commandQueue"`
}

type RemoteAckRequest struct {
	SchemaVersion string         `json:"schemaVersion"`
	AgentToken    string         `json:"agentToken"`
	CommandID     string         `json:"commandId"`
	Status        string         `json:"status"`
	ReasonCode    string         `json:"reasonCode,omitempty"`
	Message       string         `json:"message,omitempty"`
	Details       map[string]any `json:"details,omitempty"`
}
