package reconcile

import (
	"context"
	"time"

	"trilink/agent/internal/domain"
)

type Service struct {
	desired DesiredStateProvider
	store   StateStore
	logger  Logger
	events  EventBus
	modules []Module
	trigger chan struct{}
}

func NewService(
	desired DesiredStateProvider,
	store StateStore,
	logger Logger,
	events EventBus,
	modules []Module,
) *Service {
	return &Service{
		desired: desired,
		store:   store,
		logger:  logger,
		events:  events,
		modules: modules,
		trigger: make(chan struct{}, 1),
	}
}

func (s *Service) Trigger() {
	select {
	case s.trigger <- struct{}{}:
	default:
	}
}

func (s *Service) Start(ctx context.Context) error {
	s.runOnce(ctx)

	ticker := time.NewTicker(45 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("reconcile loop stopped")
			return nil

		case <-ticker.C:
			s.runOnce(ctx)
		case <-s.trigger:
			s.runOnce(ctx)
		}
	}
}

func (s *Service) runOnce(ctx context.Context) {
	if err := s.reconcileOnce(ctx); err != nil {
		s.logger.Error("reconcile failed", "error", err)
		_ = s.events.Publish(ctx, domain.TelemetryEvent{
			Type:       "reconcile_failed",
			Severity:   "error",
			Module:     "reconcile",
			Message:    "reconcile cycle failed",
			OccurredAt: time.Now().UTC(),
			Metadata:   map[string]any{"error": err.Error()},
		})
	}
}

func (s *Service) reconcileOnce(ctx context.Context) error {
	desired, err := s.desired.GetLast(ctx)
	if err != nil {
		return err
	}

	current, err := s.inspectCurrentState(ctx)
	if err != nil {
		return err
	}

	plan := BuildPlan(desired, current, s.modules)

	_ = s.store.SaveJSON(ctx, "current_state.json", current)
	_ = s.store.SaveJSON(ctx, "reconcile_plan.json", plan)

	if len(plan.Actions) == 0 {
		s.logger.Debug("reconcile no changes", "desired_version", desired.Version)
		return nil
	}

	trivial := allActionsOfType(plan.Actions, "sync_cycle")
	if trivial {
		s.logger.Debug("reconcile plan generated",
			"desired_version", desired.Version,
			"actions", len(plan.Actions),
		)
	} else {
		s.logger.Info("reconcile plan generated",
			"desired_version", desired.Version,
			"actions", len(plan.Actions),
		)
	}

	results := s.applyPlan(ctx, desired, current)

	_ = s.store.SaveJSON(ctx, "apply_results.json", results)

	updatedCurrent, inspectErr := s.inspectCurrentState(ctx)
	if inspectErr != nil {
		s.logger.Error("reconcile post-apply inspect failed", "error", inspectErr)
	} else {
		current = updatedCurrent
		_ = s.store.SaveJSON(ctx, "current_state.json", current)
	}

	applied := buildAppliedState(desired, current, results)
	_ = s.store.SaveJSON(ctx, "applied_state.json", applied)

	if !trivial {
		_ = s.events.Publish(ctx, domain.TelemetryEvent{
			Type:       "reconcile_applied",
			Severity:   "info",
			Module:     "reconcile",
			Message:    "reconcile applied",
			OccurredAt: time.Now().UTC(),
			Metadata: map[string]any{
				"desired_version": desired.Version,
				"actions":         len(plan.Actions),
			},
		})
	}

	return nil
}

func (s *Service) inspectCurrentState(ctx context.Context) (domain.CurrentState, error) {
	state := domain.CurrentState{
		ObservedAt: time.Now().UTC(),
	}

	for _, module := range s.modules {
		current, err := module.Inspect(ctx)
		if err != nil {
			current = domain.CurrentModuleState{
				Status:    domain.ModuleStatusError,
				LastError: err.Error(),
			}
		}

		switch module.Name() {
		case "remote":
			state.Remote = current
		case "tunnel":
			state.Tunnel = current
		case "backup":
			state.Backup = current
		case "support":
			state.Support = current
		case "device":
			state.Device = current
		}
	}

	return state, nil
}

func (s *Service) applyPlan(
	ctx context.Context,
	desired domain.DesiredState,
	current domain.CurrentState,
) []domain.ApplyResult {
	results := make([]domain.ApplyResult, 0, len(s.modules))

	for _, module := range s.modules {
		var currentModule domain.CurrentModuleState

		switch module.Name() {
		case "remote":
			currentModule = current.Remote
		case "tunnel":
			currentModule = current.Tunnel
		case "backup":
			currentModule = current.Backup
		case "support":
			currentModule = current.Support
		case "device":
			currentModule = current.Device
		}

		actions := module.Plan(desired, currentModule)
		if len(actions) == 0 {
			continue
		}

		result := module.Apply(ctx, desired, currentModule)
		results = append(results, result)
	}

	return results
}

func allActionsOfType(actions []domain.ReconcileAction, actionType string) bool {
	if len(actions) == 0 {
		return false
	}
	for _, a := range actions {
		if a.Type != actionType {
			return false
		}
	}
	return true
}

func buildAppliedState(
	desired domain.DesiredState,
	current domain.CurrentState,
	results []domain.ApplyResult,
) domain.AppliedState {
	now := time.Now().UTC()

	applied := domain.AppliedState{
		AppliedAt:      now,
		DesiredVersion: desired.Version,
		Remote: domain.AppliedModuleState{
			Enabled: desired.Remote.Enabled,
			Version: desired.Remote.Version,
		},
		Tunnel: domain.AppliedModuleState{
			Enabled: desired.Tunnel.Enabled,
			Version: desired.Tunnel.Version,
		},
		Backup: domain.AppliedModuleState{
			Enabled: desired.Backup.Enabled,
			Version: desired.Backup.Version,
		},
		Support: domain.AppliedModuleState{
			Enabled: desired.Support.Enabled,
			Version: desired.Support.Version,
		},
		Device: domain.AppliedModuleState{
			Enabled: desired.Device.Enabled,
			Version: desired.Device.Version,
		},
	}

	_ = current
	_ = results
	return applied
}
