package remote

import (
	"context"
	"time"

	"trilink/agent/internal/domain"
)

type Module struct{}

func New() *Module {
	return &Module{}
}

func (m *Module) Name() string {
	return "remote"
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

	if desired.Remote.Enabled != current.Enabled {
		actions = append(actions, domain.ReconcileAction{
			Module: "remote",
			Type:   "sync_enabled",
			Reason: "enabled state differs",
		})
	}

	if desired.Remote.Version != current.Version {
		actions = append(actions, domain.ReconcileAction{
			Module: "remote",
			Type:   "sync_version",
			Reason: "version differs",
		})
	}

	return actions
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
	_ = ctx
	_ = current

	now := time.Now().UTC()
	_ = now

	return domain.ApplyResult{
		Module:  "remote",
		Changed: true,
		Message: "remote module applied (stub)",
	}
}
