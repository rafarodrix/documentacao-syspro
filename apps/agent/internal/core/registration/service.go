package registration

import (
	"context"
	"fmt"
	"time"

	"trilink/agent/internal/domain"
)

type registrationState struct {
	Registered bool   `json:"registered"`
	DeviceID   string `json:"device_id"`
}

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

func (s *Service) EnsureRegistered(ctx context.Context, id domain.DeviceIdentity) error {
	var st registrationState
	_ = s.store.LoadJSON(ctx, "registration.json", &st)

	if st.Registered && st.DeviceID == id.DeviceID {
		s.logger.Info("device already registered", "device_id", id.DeviceID)
		return nil
	}

	if err := s.client.RegisterDevice(ctx, id); err != nil {
		_ = s.events.Publish(ctx, domain.TelemetryEvent{
			Type:       "registration_failed",
			Severity:   "error",
			Module:     "registration",
			Message:    "device registration failed",
			DeviceID:   id.DeviceID,
			OccurredAt: time.Now().UTC(),
			Metadata:   map[string]any{"device_id": id.DeviceID},
		})
		return fmt.Errorf("register device: %w", err)
	}

	st = registrationState{
		Registered: true,
		DeviceID:   id.DeviceID,
	}

	if err := s.store.SaveJSON(ctx, "registration.json", st); err != nil {
		return fmt.Errorf("persist registration state: %w", err)
	}

	_ = s.events.Publish(ctx, domain.TelemetryEvent{
		Type:       "registration_succeeded",
		Severity:   "info",
		Module:     "registration",
		Message:    "device registered successfully",
		DeviceID:   id.DeviceID,
		OccurredAt: time.Now().UTC(),
		Metadata:   map[string]any{"device_id": id.DeviceID},
	})

	s.logger.Info("device registered", "device_id", id.DeviceID)
	return nil
}
