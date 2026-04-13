package reconcile

import "trilink/agent/internal/domain"

func BuildPlan(desired domain.DesiredState, current domain.CurrentState, modules []Module) domain.ReconcilePlan {
	plan := domain.ReconcilePlan{
		DesiredVersion: desired.Version,
		Actions:        make([]domain.ReconcileAction, 0),
	}

	for _, module := range modules {
		switch module.Name() {
		case "remote":
			plan.Actions = append(plan.Actions, module.Plan(desired, current.Remote)...)
		case "tunnel":
			plan.Actions = append(plan.Actions, module.Plan(desired, current.Tunnel)...)
		case "backup":
			plan.Actions = append(plan.Actions, module.Plan(desired, current.Backup)...)
		}
	}

	return plan
}
