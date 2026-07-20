package domain

import "time"

type SupportContext struct {
	CompanyID          string    `json:"companyId,omitempty"`
	CompanyDisplayName string    `json:"companyDisplayName,omitempty"`
	HostID             string    `json:"hostId,omitempty"`
	HostAlias          string    `json:"hostAlias,omitempty"`
	PendingLinkReady   bool      `json:"pendingLinkReady,omitempty"`
	RustDeskID         string    `json:"rustdeskId,omitempty"`
	RemoteStatus       string    `json:"remoteStatus,omitempty"`
	RemoteStatusText   string    `json:"remoteStatusText,omitempty"`
	ConversationTags   []string  `json:"conversationTags,omitempty"`
	MachineName        string    `json:"machineName,omitempty"`
	DeviceID           string    `json:"deviceId,omitempty"`
	Hostname           string    `json:"hostname,omitempty"`
	OS                 string    `json:"os,omitempty"`
	LocalUsername      string    `json:"localUsername,omitempty"`
	AgentVersion       string    `json:"agentVersion,omitempty"`
	ContactName        string    `json:"contactName,omitempty"`
	Description        string    `json:"description,omitempty"`
	LastSyncAt         time.Time `json:"lastSyncAt,omitempty"`
}

type SupportConversationContext struct {
	CompanyID        string   `json:"companyId,omitempty"`
	CompanyName      string   `json:"companyDisplayName,omitempty"`
	HostID           string   `json:"hostId,omitempty"`
	HostAlias        string   `json:"hostAlias,omitempty"`
	PendingLinkReady bool     `json:"pendingLinkReady,omitempty"`
	RustDeskID       string   `json:"rustdeskId,omitempty"`
	RemoteStatus     string   `json:"remoteStatus,omitempty"`
	RemoteStatusText string   `json:"remoteStatusText,omitempty"`
	ConversationTags []string `json:"conversationTags,omitempty"`
	MachineName      string   `json:"machineName,omitempty"`
	DeviceID         string   `json:"deviceId,omitempty"`
	Hostname         string   `json:"hostname,omitempty"`
	OS               string   `json:"os,omitempty"`
	LocalUsername    string   `json:"localUsername,omitempty"`
	AgentVersion     string   `json:"agentVersion,omitempty"`
	ContactName      string   `json:"contactName,omitempty"`
	Description      string   `json:"description,omitempty"`
}

func (c SupportContext) ToConversationContext() SupportConversationContext {
	return SupportConversationContext{
		CompanyID:        c.CompanyID,
		CompanyName:      c.CompanyDisplayName,
		HostID:           c.HostID,
		HostAlias:        c.HostAlias,
		PendingLinkReady: c.PendingLinkReady,
		RustDeskID:       c.RustDeskID,
		RemoteStatus:     c.RemoteStatus,
		RemoteStatusText: c.RemoteStatusText,
		ConversationTags: c.ConversationTags,
		MachineName:      c.MachineName,
		DeviceID:         c.DeviceID,
		Hostname:         c.Hostname,
		OS:               c.OS,
		LocalUsername:    c.LocalUsername,
		AgentVersion:     c.AgentVersion,
		ContactName:      c.ContactName,
		Description:      c.Description,
	}
}

type PersistedRemoteState struct {
	AgentToken          string    `json:"agent_token"`
	CompanyID           string    `json:"company_id"`
	CompanyName         string    `json:"company_name"`
	HostID              string    `json:"host_id"`
	PendingLinkReady    bool      `json:"pending_link_ready"`
	Alias               string    `json:"alias"`
	RustDeskID          string    `json:"rustdesk_id"`
	DefaultPassword     string    `json:"default_password"`
	RuntimePassword     string    `json:"runtime_password"`
	MachineName         string    `json:"machine_name"`
	CurrentVersion      string    `json:"current_version"`
	RustDeskExecutable  string    `json:"rustdesk_executable"`
	RebootstrapRequired bool      `json:"rebootstrap_required"`
	LastBootstrapFlow   string    `json:"last_bootstrap_flow"`
	LastErrorCode       string    `json:"last_error_code"`
	LastErrorMessage    string    `json:"last_error_message"`
	LastErrorPhase      string    `json:"last_error_phase"`
	LastErrorStatusCode int       `json:"last_error_status_code"`
	LastErrorAt         time.Time `json:"last_error_at"`
	NextRetryAt         time.Time `json:"next_retry_at"`
	ConsecutiveFailures int       `json:"consecutive_failures"`
	LastSyncAt          time.Time `json:"last_sync_at"`
}
