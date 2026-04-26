package uistate

type ChatwootConfig struct {
	BaseURL      string
	WebsiteToken string
}

type SupportContext struct {
	CompanyID            string   `json:"companyId,omitempty"`
	CompanyDisplayName   string   `json:"companyDisplayName,omitempty"`
	HostID               string   `json:"hostId,omitempty"`
	HostAlias            string   `json:"hostAlias,omitempty"`
	RustDeskID           string   `json:"rustdeskId,omitempty"`
	RemoteAccessPassword string   `json:"remoteAccessPassword,omitempty"`
	RemoteStatus         string   `json:"remoteStatus,omitempty"`
	RemoteStatusText     string   `json:"remoteStatusText,omitempty"`
	ConversationTags     []string `json:"conversationTags,omitempty"`
	MachineName          string   `json:"machineName,omitempty"`
	DeviceID             string   `json:"deviceId,omitempty"`
	Hostname             string   `json:"hostname,omitempty"`
	OS                   string   `json:"os,omitempty"`
	LocalUsername        string   `json:"localUsername,omitempty"`
	AgentVersion         string   `json:"agentVersion,omitempty"`
	AgentEnvironment     string   `json:"agentEnvironment,omitempty"`
	ContactName          string   `json:"contactName,omitempty"`
	Description          string   `json:"description,omitempty"`
}
