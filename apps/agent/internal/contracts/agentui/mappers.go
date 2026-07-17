package agentui

import uistate "trilink/agent/internal/core/ui_state"

func FromUISummary(value uistate.Summary) Summary {
	return Summary{
		ServiceStatus: value.ServiceStatus,
		UserVisible:   value.UserVisible,
	}
}

func ToUISummary(value Summary) uistate.Summary {
	return uistate.Summary{
		ServiceStatus: value.ServiceStatus,
		UserVisible:   value.UserVisible,
	}
}

func FromUINotification(value uistate.Notification) Notification {
	return Notification{
		ID:         value.ID,
		Title:      value.Title,
		Message:    value.Message,
		Severity:   value.Severity,
		OccurredAt: value.OccurredAt,
	}
}

func ToUINotification(value Notification) uistate.Notification {
	return uistate.Notification{
		ID:         value.ID,
		Title:      value.Title,
		Message:    value.Message,
		Severity:   value.Severity,
		OccurredAt: value.OccurredAt,
	}
}

func FromUINotifications(values []uistate.Notification) []Notification {
	if len(values) == 0 {
		return nil
	}

	items := make([]Notification, 0, len(values))
	for _, value := range values {
		items = append(items, FromUINotification(value))
	}
	return items
}

func ToUINotifications(values []Notification) []uistate.Notification {
	if len(values) == 0 {
		return nil
	}

	items := make([]uistate.Notification, 0, len(values))
	for _, value := range values {
		items = append(items, ToUINotification(value))
	}
	return items
}

func FromUIActionResult(value uistate.ActionResult) ActionResult {
	return ActionResult{
		Accepted: value.Accepted,
		Message:  value.Message,
		Target:   value.Target,
	}
}

func ToUIActionResult(value ActionResult) uistate.ActionResult {
	return uistate.ActionResult{
		Accepted: value.Accepted,
		Message:  value.Message,
		Target:   value.Target,
	}
}

func FromUISetupStep(value uistate.SetupStep) SetupStep {
	return SetupStep{
		Key:    value.Key,
		Label:  value.Label,
		Status: value.Status,
		Detail: value.Detail,
	}
}

func ToUISetupStep(value SetupStep) uistate.SetupStep {
	return uistate.SetupStep{
		Key:    value.Key,
		Label:  value.Label,
		Status: value.Status,
		Detail: value.Detail,
	}
}

func fromUISetupSteps(values []uistate.SetupStep) []SetupStep {
	if len(values) == 0 {
		return nil
	}

	items := make([]SetupStep, 0, len(values))
	for _, value := range values {
		items = append(items, FromUISetupStep(value))
	}
	return items
}

func toUISetupSteps(values []SetupStep) []uistate.SetupStep {
	if len(values) == 0 {
		return nil
	}

	items := make([]uistate.SetupStep, 0, len(values))
	for _, value := range values {
		items = append(items, ToUISetupStep(value))
	}
	return items
}

func fromUIDeviceView(value uistate.DeviceView) DeviceView {
	return DeviceView{
		DeviceID:      value.DeviceID,
		Hostname:      value.Hostname,
		OS:            value.OS,
		LocalUsername: value.LocalUsername,
		MachineName:   value.MachineName,
		AgentVersion:  value.AgentVersion,
	}
}

func toUIDeviceView(value DeviceView) uistate.DeviceView {
	return uistate.DeviceView{
		DeviceID:      value.DeviceID,
		Hostname:      value.Hostname,
		OS:            value.OS,
		LocalUsername: value.LocalUsername,
		MachineName:   value.MachineName,
		AgentVersion:  value.AgentVersion,
	}
}

func fromUIInstallationView(value uistate.AgentInstallationView) AgentInstallationView {
	return AgentInstallationView{
		CompanyID:   value.CompanyID,
		CompanyName: value.CompanyName,
		HostID:      value.HostID,
		HostAlias:   value.HostAlias,
		ContactName: value.ContactName,
		Description: value.Description,
	}
}

func toUIInstallationView(value AgentInstallationView) uistate.AgentInstallationView {
	return uistate.AgentInstallationView{
		CompanyID:   value.CompanyID,
		CompanyName: value.CompanyName,
		HostID:      value.HostID,
		HostAlias:   value.HostAlias,
		ContactName: value.ContactName,
		Description: value.Description,
	}
}

func fromUICapabilityView(value *uistate.AgentCapabilityView) *AgentCapabilityView {
	if value == nil {
		return nil
	}
	return &AgentCapabilityView{
		Kind:           value.Kind,
		ExternalID:     value.ExternalID,
		AccessPassword: value.AccessPassword,
		Status:         value.Status,
		StatusText:     value.StatusText,
		Ready:          value.Ready,
	}
}

func toUICapabilityView(value *AgentCapabilityView) *uistate.AgentCapabilityView {
	if value == nil {
		return nil
	}
	return &uistate.AgentCapabilityView{
		Kind:           value.Kind,
		ExternalID:     value.ExternalID,
		AccessPassword: value.AccessPassword,
		Status:         value.Status,
		StatusText:     value.StatusText,
		Ready:          value.Ready,
	}
}

func fromUICapabilitiesView(value uistate.AgentCapabilitiesView) AgentCapabilitiesView {
	return AgentCapabilitiesView{
		Remote: fromUICapabilityView(value.Remote),
	}
}

func toUICapabilitiesView(value AgentCapabilitiesView) uistate.AgentCapabilitiesView {
	return uistate.AgentCapabilitiesView{
		Remote: toUICapabilityView(value.Remote),
	}
}

func FromUIAgentSetupView(value uistate.AgentSetupView) AgentSetupView {
	return AgentSetupView{
		Complete:     value.Complete,
		Stage:        value.Stage,
		Title:        value.Title,
		Summary:      value.Summary,
		ProgressPct:  value.ProgressPct,
		LastError:    value.LastError,
		Steps:        fromUISetupSteps(value.Steps),
		Device:       fromUIDeviceView(value.Device),
		Installation: fromUIInstallationView(value.Installation),
		Capabilities: fromUICapabilitiesView(value.Capabilities),
	}
}

func ToUIAgentSetupView(value AgentSetupView) uistate.AgentSetupView {
	return uistate.AgentSetupView{
		Complete:     value.Complete,
		Stage:        value.Stage,
		Title:        value.Title,
		Summary:      value.Summary,
		ProgressPct:  value.ProgressPct,
		LastError:    value.LastError,
		Steps:        toUISetupSteps(value.Steps),
		Device:       toUIDeviceView(value.Device),
		Installation: toUIInstallationView(value.Installation),
		Capabilities: toUICapabilitiesView(value.Capabilities),
	}
}

func fromUISupportChannelView(value uistate.SupportChannelView) SupportChannelView {
	return SupportChannelView{
		BaseURL:      value.BaseURL,
		WebsiteToken: value.WebsiteToken,
		Configured:   value.Configured,
	}
}

func toUISupportChannelView(value SupportChannelView) uistate.SupportChannelView {
	return uistate.SupportChannelView{
		BaseURL:      value.BaseURL,
		WebsiteToken: value.WebsiteToken,
		Configured:   value.Configured,
	}
}

func FromUIAgentSupportView(value uistate.AgentSupportView) AgentSupportView {
	return AgentSupportView{
		Channel:          fromUISupportChannelView(value.Channel),
		Device:           fromUIDeviceView(value.Device),
		Installation:     fromUIInstallationView(value.Installation),
		Capabilities:     fromUICapabilitiesView(value.Capabilities),
		ConversationTags: append([]string(nil), value.ConversationTags...),
	}
}

func ToUIAgentSupportView(value AgentSupportView) uistate.AgentSupportView {
	return uistate.AgentSupportView{
		Channel:          toUISupportChannelView(value.Channel),
		Device:           toUIDeviceView(value.Device),
		Installation:     toUIInstallationView(value.Installation),
		Capabilities:     toUICapabilitiesView(value.Capabilities),
		ConversationTags: append([]string(nil), value.ConversationTags...),
	}
}

func FromUISupportContextSyncResult(value uistate.SupportContextSyncResult) SupportContextSyncResult {
	return SupportContextSyncResult{
		Accepted: value.Accepted,
		Message:  value.Message,
	}
}

func ToUISupportContextSyncResult(value SupportContextSyncResult) uistate.SupportContextSyncResult {
	return uistate.SupportContextSyncResult{
		Accepted: value.Accepted,
		Message:  value.Message,
	}
}
