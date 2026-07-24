package uistate

import (
	"strings"
	"time"
)

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
	Monitoring       MonitoringView        `json:"monitoring"`
	ConversationTags []string              `json:"conversationTags"`
}

type MonitoringView struct {
	CollectionProfile string `json:"collectionProfile,omitempty"`
	CollectInventory  bool   `json:"collectInventory"`
	CollectMetrics    bool   `json:"collectMetrics"`
	AgentVersion      string `json:"agentVersion,omitempty"`
}

func BuildAgentSetupView(
	context SupportContext,
	complete bool,
	stage string,
	title string,
	summary string,
	progressPct int,
	lastError string,
	steps []SetupStep,
) AgentSetupView {
	device, installation, capabilities := buildPresentationParts(context)

	if capabilities.Remote == nil && strings.TrimSpace(context.RustDeskID) != "" {
		capabilities.Remote = &AgentCapabilityView{
			Kind:       "remote",
			ExternalID: strings.TrimSpace(context.RustDeskID),
			Status:     normalizeCapabilityStatus(context.RemoteStatus),
			StatusText: strings.TrimSpace(context.RemoteStatusText),
			LastSyncAt: formatTimestamp(context.LastSyncAt),
			Ready:      strings.TrimSpace(context.RemoteStatus) == "ready",
		}
	}

	return AgentSetupView{
		Complete:     complete,
		Stage:        stage,
		Title:        title,
		Summary:      summary,
		ProgressPct:  progressPct,
		LastError:    lastError,
		Steps:        append([]SetupStep(nil), steps...),
		Device:       device,
		Installation: installation,
		Capabilities: capabilities,
	}
}

func BuildAgentSupportView(context SupportContext, baseURL string, websiteToken string) AgentSupportView {
	device, installation, capabilities := buildPresentationParts(context)
	baseURL = strings.TrimSpace(baseURL)
	websiteToken = strings.TrimSpace(websiteToken)

	return AgentSupportView{
		Channel: SupportChannelView{
			BaseURL:      baseURL,
			WebsiteToken: websiteToken,
			Configured:   baseURL != "" && websiteToken != "",
		},
		Device:           device,
		Installation:     installation,
		Capabilities:     capabilities,
		ConversationTags: append([]string(nil), context.ConversationTags...),
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
			Kind:       "remote",
			ExternalID: strings.TrimSpace(context.RustDeskID),
			Status:     normalizeCapabilityStatus(context.RemoteStatus),
			StatusText: strings.TrimSpace(context.RemoteStatusText),
			LastSyncAt: formatTimestamp(context.LastSyncAt),
			Ready:      strings.TrimSpace(context.RemoteStatus) == "ready",
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

func formatTimestamp(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
