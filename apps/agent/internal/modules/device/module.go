package device

import (
	"context"

	"trilink/agent/internal/domain"
)

// Module is the device context boundary that will own inventory and local health signals.
type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "device"
}

func (m *Module) Inspect(ctx context.Context) (domain.CurrentModuleState, error) {
	_ = ctx

	return domain.CurrentModuleState{
		Enabled: true,
		Version: "",
		Status:  domain.ModuleStatusReady,
	}, nil
}

func (m *Module) Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction {
	_ = current

	if !desired.Device.Enabled {
		return nil
	}

	return []domain.ReconcileAction{{
		Module: "device",
		Type:   "snapshot_refresh",
		Reason: "device context snapshot refresh",
	}}
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
	_ = ctx
	_ = desired
	_ = current

	return domain.ApplyResult{
		Module:  "device",
		Changed: false,
		Message: "device module scaffolded; runtime integration pending",
	}
}
