package support

import (
	"context"

	"trilink/agent/internal/domain"
)

// Module is the future home of the official support/chat channel inside the agent.
// It is intentionally scaffolded before runtime wiring so the module boundary stays explicit.
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
	_ = desired
	_ = current
	return nil
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
	_ = ctx
	_ = desired
	_ = current

	return domain.ApplyResult{
		Module:  "support",
		Changed: false,
		Message: "support module scaffolded; runtime integration pending",
	}
}
