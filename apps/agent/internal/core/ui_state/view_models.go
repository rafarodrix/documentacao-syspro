package uistate

import "strings"

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
	Kind           string `json:"kind"`
	ExternalID     string `json:"externalId,omitempty"`
	AccessPassword string `json:"accessPassword,omitempty"`
	Status         string `json:"status,omitempty"`
	StatusText     string `json:"statusText,omitempty"`
	Ready          bool   `json:"ready"`
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
	Channel          SupportChannelView     `json:"channel"`
	Device           DeviceView             `json:"device"`
	Installation     AgentInstallationView  `json:"installation"`
	Capabilities     AgentCapabilitiesView  `json:"capabilities"`
	ConversationTags []string               `json:"conversationTags"`
}

func BuildAgentSetupView(status SetupStatus, session SupportSession) AgentSetupView {
	device, installation, capabilities := buildPresentationParts(session.Context)

	if capabilities.Remote == nil && strings.TrimSpace(status.RustDeskID) != "" {
		capabilities.Remote = &AgentCapabilityView{
			Kind:       "remote",
			ExternalID: strings.TrimSpace(status.RustDeskID),
			Status:     "ready",
			StatusText: "identificacao remota pronta",
			Ready:      true,
		}
	}

	if installation.CompanyName == "" {
		installation.CompanyName = strings.TrimSpace(status.CompanyName)
	}
	if installation.HostID == "" {
		installation.HostID = strings.TrimSpace(status.HostID)
	}

	return AgentSetupView{
		Complete:     status.Complete,
		Stage:        status.Stage,
		Title:        status.Title,
		Summary:      status.Summary,
		ProgressPct:  status.ProgressPct,
		LastError:    status.LastError,
		Steps:        append([]SetupStep(nil), status.Steps...),
		Device:       device,
		Installation: installation,
		Capabilities: capabilities,
	}
}

func BuildAgentSupportView(session SupportSession) AgentSupportView {
	device, installation, capabilities := buildPresentationParts(session.Context)
	baseURL := strings.TrimSpace(session.BaseURL)
	websiteToken := strings.TrimSpace(session.WebsiteToken)

	return AgentSupportView{
		Channel: SupportChannelView{
			BaseURL:      baseURL,
			WebsiteToken: websiteToken,
			Configured:   baseURL != "" && websiteToken != "",
		},
		Device:           device,
		Installation:     installation,
		Capabilities:     capabilities,
		ConversationTags: append([]string(nil), session.Context.ConversationTags...),
	}
}

func buildPresentationParts(context SupportContext) (DeviceView, AgentInstallationView, AgentCapabilitiesView) {
	device := DeviceView{
		DeviceID:      strings.TrimSpace(context.DeviceID),
		Hostname:      strings.TrimSpace(context.Hostname),
		OS:            strings.TrimSpace(context.OS),
		LocalUsername: strings.TrimSpace(context.LocalUsername),
		MachineName:   strings.TrimSpace(context.MachineName),
		AgentVersion:  strings.TrimSpace(context.AgentVersion),
	}

	installation := AgentInstallationView{
		CompanyID:   strings.TrimSpace(context.CompanyID),
		CompanyName: strings.TrimSpace(context.CompanyDisplayName),
		HostID:      strings.TrimSpace(context.HostID),
		HostAlias:   strings.TrimSpace(context.HostAlias),
		ContactName: strings.TrimSpace(context.ContactName),
		Description: strings.TrimSpace(context.Description),
	}

	var remote *AgentCapabilityView
	if context.RustDeskID != "" || context.RemoteStatus != "" || context.RemoteStatusText != "" {
		remote = &AgentCapabilityView{
			Kind:           "remote",
			ExternalID:     strings.TrimSpace(context.RustDeskID),
			AccessPassword: strings.TrimSpace(context.RemoteAccessPassword),
			Status:         normalizeCapabilityStatus(context.RemoteStatus),
			StatusText:     strings.TrimSpace(context.RemoteStatusText),
			Ready:          strings.TrimSpace(context.RustDeskID) != "",
		}
	}

	return device, installation, AgentCapabilitiesView{Remote: remote}
}

func normalizeCapabilityStatus(value string) string {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "ready":
		return "ready"
	case "pending":
		return "pending"
	default:
		return "offline"
	}
}
