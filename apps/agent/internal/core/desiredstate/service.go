package desiredstate

import (
	"context"
	"time"

	"trilink/agent/internal/domain"
)

type Service struct {
	client PortalClient
	store  StateStore
	logger Logger
	events EventBus
	last   domain.DesiredState
}

func NewService(client PortalClient, store StateStore, logger Logger, events EventBus) *Service {
	return &Service{
		client: client,
		store:  store,
		logger: logger,
		events: events,
	}
}

func (s *Service) Start(ctx context.Context) error {
	var cached domain.DesiredState
	if err := s.store.LoadJSON(ctx, "desired_state.json", &cached); err == nil {
		s.last = cached
		s.logger.Debug("desired state loaded from cache", "version", cached.Version)
	}

	if err := s.fetchOnce(ctx); err != nil {
		s.logger.Warn("initial desired state fetch failed", "error", err)
	}

	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("desired state loop stopped")
			return nil

		case <-ticker.C:
			if err := s.fetchOnce(ctx); err != nil {
				s.logger.Warn("desired state fetch failed", "error", err)
				continue
			}
		}
	}
}

func (s *Service) fetchOnce(ctx context.Context) error {
	state, err := s.client.GetDesiredState(ctx)
	if err != nil {
		return err
	}

	if state.Version != s.last.Version {
		s.logger.Info("desired state changed",
			"old_version", s.last.Version,
			"new_version", state.Version,
		)

		s.last = state

		_ = s.store.SaveJSON(ctx, "desired_state.json", state)

		_ = s.events.Publish(ctx, domain.TelemetryEvent{
			Type:       "desired_state_updated",
			Severity:   "info",
			Module:     "desiredstate",
			Message:    "desired state updated",
			OccurredAt: time.Now().UTC(),
			Metadata: map[string]any{
				"version": state.Version,
			},
		})
	}

	s.logger.Debug("desired state checked", "version", state.Version)
	return nil
}

func (s *Service) GetLast(ctx context.Context) (domain.DesiredState, error) {
	if s.last.Version != 0 {
		return s.last, nil
	}

	var state domain.DesiredState
	if err := s.store.LoadJSON(ctx, "desired_state.json", &state); err != nil {
		return domain.DesiredState{}, err
	}

	s.last = state
	return state, nil
}
