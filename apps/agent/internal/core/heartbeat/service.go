package heartbeat

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
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("heartbeat loop stopped")
			return nil
		case <-ticker.C:
			if err := s.client.SendHeartbeat(ctx); err != nil {
				s.logger.Warn("heartbeat failed", "error", err)
				_ = s.events.Publish(ctx, domain.TelemetryEvent{
					Type:       "heartbeat_failed",
					Severity:   "warn",
					Module:     "heartbeat",
					Message:    "heartbeat failed",
					OccurredAt: time.Now().UTC(),
				})
				continue
			}

			_ = s.store.SaveJSON(ctx, "heartbeat.json", map[string]any{
				"last_success_at": time.Now().UTC(),
			})

			s.logger.Debug("heartbeat sent")
		}
	}
}
