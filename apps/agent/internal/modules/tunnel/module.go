package tunnel

import (
	"context"

	"trilink/agent/internal/domain"
)

type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "tunnel"
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
	actions := make([]domain.ReconcileAction, 0)

	if desired.Tunnel.Enabled != current.Enabled {
		actions = append(actions, domain.ReconcileAction{
			Module: "tunnel",
			Type:   "sync_enabled",
			Reason: "enabled state differs",
		})
	}

	if desired.Tunnel.Version != current.Version {
		actions = append(actions, domain.ReconcileAction{
			Module: "tunnel",
			Type:   "sync_version",
			Reason: "version differs",
		})
	}

	return actions
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
	_ = ctx
	_ = desired
	_ = current

	return domain.ApplyResult{
		Module:  "tunnel",
		Changed: true,
		Message: "tunnel module applied (stub)",
	}
}
