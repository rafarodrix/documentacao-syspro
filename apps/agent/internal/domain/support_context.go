package domain

type SupportConversationContext struct {
	CompanyID        string   `json:"companyId,omitempty"`
	CompanyName      string   `json:"companyDisplayName,omitempty"`
	HostID           string   `json:"hostId,omitempty"`
	HostAlias        string   `json:"hostAlias,omitempty"`
	RustDeskID       string   `json:"rustdeskId,omitempty"`
	RemoteStatus     string   `json:"remoteStatus,omitempty"`
	RemoteStatusText string   `json:"remoteStatusText,omitempty"`
	ConversationTags []string `json:"conversationTags,omitempty"`
	MachineName      string   `json:"machineName,omitempty"`
	DeviceID         string   `json:"deviceId,omitempty"`
	Hostname         string   `json:"hostname,omitempty"`
	OS               string   `json:"os,omitempty"`
	LocalUsername    string   `json:"localUsername,omitempty"`
	AgentVersion string   `json:"agentVersion,omitempty"`
	ContactName      string   `json:"contactName,omitempty"`
	Description      string   `json:"description,omitempty"`
}
