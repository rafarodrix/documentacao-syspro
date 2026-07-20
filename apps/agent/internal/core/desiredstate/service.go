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

	consecutiveFailures := 0
	baseDelay := 1 * time.Minute
	maxDelay := 30 * time.Minute

	// Initial fetch
	if err := s.fetchOnce(ctx); err != nil {
		s.logger.Warn("initial desired state fetch failed", "error", err)
		consecutiveFailures++
	}

	for {
		// Calculate next delay using exponential backoff & jitter
		delay := baseDelay
		if consecutiveFailures > 0 {
			// exponential backoff: baseDelay * 2^(consecutiveFailures-1)
			multiplier := 1 << (consecutiveFailures - 1)
			delay = baseDelay * time.Duration(multiplier)
			if delay > maxDelay {
				delay = maxDelay
			}

			// Add 15% random jitter using simple pseudo-random noise
			// to avoid seeding issues or heavy imports
			noise := float64(time.Now().UnixNano()%1000) / 1000.0 // value between 0.0 and 1.0
			jitterPercent := 0.15 * (2.0*noise - 1.0)             // value between -0.15 and +0.15
			delay = delay + time.Duration(float64(delay)*jitterPercent)
		}

		s.logger.Debug("scheduling next desired state fetch", "delay", delay)

		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			s.logger.Info("desired state loop stopped")
			return nil

		case <-timer.C:
			if err := s.fetchOnce(ctx); err != nil {
				s.logger.Warn("desired state fetch failed", "error", err)
				if consecutiveFailures < 6 { // Limit multiplier to 2^5 = 32 (32 minutes max base delay)
					consecutiveFailures++
				}
			} else {
				consecutiveFailures = 0
			}
		}
	}
}

func (s *Service) fetchOnce(ctx context.Context) error {
	state, err := s.client.GetDesiredState(ctx)
	if err != nil {
		return err
	}

	if saveErr := s.store.SaveJSON(ctx, "desired_state.json", state); saveErr != nil {
		s.logger.Warn("persist desired state failed", "version", state.Version, "error", saveErr)
	}

	if state.Version != s.last.Version {
		s.logger.Info("desired state changed",
			"old_version", s.last.Version,
			"new_version", state.Version,
		)

		s.last = state

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
	} else {
		s.last = state
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
