package domain

import "time"

type DeviceIdentity struct {
	DeviceID       string `json:"device_id"`
	Hostname       string `json:"hostname"`
	OS             string `json:"os"`
	IdentitySource string `json:"identity_source"`
}

type AgentInstallation struct {
	AgentInstanceID     string    `json:"agent_instance_id"`
	CredentialID        string    `json:"credential_id"`
	InstallationToken   string    `json:"installation_token,omitempty"`
	InstalledAt         time.Time `json:"installed_at"`
}

type AgentIdentity struct {
	Device       DeviceIdentity    `json:"device"`
	Installation AgentInstallation `json:"installation"`
}
