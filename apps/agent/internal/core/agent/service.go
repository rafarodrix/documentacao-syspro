package agent

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/sync/errgroup"
)

type Service struct {
	identity     IdentityProvider
	registration RegistrationService
	heartbeat    HeartbeatService
	desiredState DesiredStateService
	store        StateStore
	executor     Executor
	logger       Logger
	events       EventBus
	reconcile    ReconcileService
}

func NewService(
	identity IdentityProvider,
	registration RegistrationService,
	heartbeat HeartbeatService,
	desiredState DesiredStateService,
	reconcile ReconcileService,
	store StateStore,
	executor Executor,
	logger Logger,
	events EventBus,
) *Service {
	return &Service{
		identity:     identity,
		registration: registration,
		heartbeat:    heartbeat,
		desiredState: desiredState,
		reconcile:    reconcile,
		store:        store,
		executor:     executor,
		logger:       logger,
		events:       events,
	}
}

func (s *Service) Run(ctx context.Context) error {
	s.logger.Info("agent starting")

	id, err := s.identity.Get(ctx)
	if err != nil {
		return fmt.Errorf("resolve identity: %w", err)
	}

	if err := s.registration.EnsureRegistered(ctx, id); err != nil {
		return fmt.Errorf("ensure registration: %w", err)
	}

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		return s.heartbeat.Start(ctx)
	})

	g.Go(func() error {
		return s.desiredState.Start(ctx)
	})

	g.Go(func() error {
		return s.runHealthLoop(ctx)
	})

	g.Go(func() error {
		return s.reconcile.Start(ctx)
	})

	if err := g.Wait(); err != nil {
		s.logger.Error("agent stopped with error", "error", err)
		return err
	}

	s.logger.Info("agent stopped")
	return nil
}

func (s *Service) runHealthLoop(ctx context.Context) error {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("health loop stopped")
			return nil
		case <-ticker.C:
			s.logger.Debug("health loop tick")
		}
	}
}
