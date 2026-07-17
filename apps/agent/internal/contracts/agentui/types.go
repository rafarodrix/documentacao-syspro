package agentui

import "time"

type Summary struct {
	ServiceStatus string `json:"service_status"`
	UserVisible   bool   `json:"user_visible"`
}

type Notification struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Message    string    `json:"message"`
	Severity   string    `json:"severity"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ActionResult struct {
	Accepted bool   `json:"accepted"`
	Message  string `json:"message"`
	Target   string `json:"target,omitempty"`
}

type OpenRemoteAccessResult struct {
	Opened  bool   `json:"opened"`
	Running bool   `json:"running"`
	Message string `json:"message"`
}

type SetupStep struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Status string `json:"status"`
	Detail string `json:"detail,omitempty"`
}

type DeviceView struct {
	DeviceID      string `json:"deviceId,omitempty"`
	Hostname      string `json:"hostname,omitempty"`
	OS            string `json:"os,omitempty"`
	LocalUsername string `json:"localUsername,omitempty"`
	MachineName   string `json:"machineName,omitempty"`
	AgentVersion  string `json:"agentVersion,omitempty"`
}

type AgentInstallationView struct {
	CompanyID   string `json:"companyId,omitempty"`
	CompanyName string `json:"companyName,omitempty"`
	HostID      string `json:"hostId,omitempty"`
	HostAlias   string `json:"hostAlias,omitempty"`
	ContactName string `json:"contactName,omitempty"`
	Description string `json:"description,omitempty"`
}

type AgentCapabilityView struct {
	Kind       string `json:"kind"`
	ExternalID string `json:"externalId,omitempty"`
	Status     string `json:"status,omitempty"`
	StatusText string `json:"statusText,omitempty"`
	LastSyncAt string `json:"lastSyncAt,omitempty"`
	Ready      bool   `json:"ready"`
}

type AgentCapabilitiesView struct {
	Remote *AgentCapabilityView `json:"remote,omitempty"`
}

type AgentSetupView struct {
	Complete     bool                  `json:"complete"`
	Stage        string                `json:"stage"`
	Title        string                `json:"title"`
	Summary      string                `json:"summary"`
	ProgressPct  int                   `json:"progressPct"`
	LastError    string                `json:"lastError,omitempty"`
	Steps        []SetupStep           `json:"steps"`
	Device       DeviceView            `json:"device"`
	Installation AgentInstallationView `json:"installation"`
	Capabilities AgentCapabilitiesView `json:"capabilities"`
}

type SupportChannelView struct {
	BaseURL      string `json:"baseUrl"`
	WebsiteToken string `json:"websiteToken"`
	Configured   bool   `json:"configured"`
}

type AgentSupportView struct {
	Channel          SupportChannelView    `json:"channel"`
	Device           DeviceView            `json:"device"`
	Installation     AgentInstallationView `json:"installation"`
	Capabilities     AgentCapabilitiesView `json:"capabilities"`
	ConversationTags []string              `json:"conversationTags"`
}

type SupportContextSyncResult struct {
	Accepted bool   `json:"accepted"`
	Message  string `json:"message"`
}
