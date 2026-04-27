package support

import (
	"context"
	"strings"

	"trilink/agent/internal/domain"
)

type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "support"
}

func (m *Module) Inspect(ctx context.Context) (domain.CurrentModuleState, error) {
	_ = ctx

	return domain.CurrentModuleState{
		Enabled: false,
		Version: "",
		Status:  domain.ModuleStatusMissing,
	}, nil
}

func (m *Module) Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction {
	if !desired.Support.Enabled {
		return nil
	}

	widgetURL := strings.TrimSpace(desired.Support.WidgetBaseURL)
	if widgetURL == "" {
		return nil
	}

	if current.Status == domain.ModuleStatusReady {
		return nil
	}

	return []domain.ReconcileAction{{
		Module: "support",
		Type:   "configure",
		Reason: "support widget url configured but module not ready",
	}}
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
	_ = ctx
	_ = current

	if !desired.Support.Enabled {
		return domain.ApplyResult{
			Module:  "support",
			Changed: false,
			Message: "support module disabled by desired state",
		}
	}

	widgetURL := strings.TrimSpace(desired.Support.WidgetBaseURL)
	if widgetURL == "" {
		return domain.ApplyResult{
			Module:  "support",
			Changed: false,
			Message: "support widget url not configured in desired state",
		}
	}

	return domain.ApplyResult{
		Module:  "support",
		Changed: true,
		Message: "support module configured via desired state",
	}
}
