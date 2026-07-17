package registration

import (
	"context"
	"fmt"
	"time"

	"trilink/agent/internal/domain"
)

type registrationState struct {
	Registered      bool   `json:"registered"`
	DeviceID        string `json:"device_id"`
	AgentInstanceID string `json:"agent_instance_id"`
	CredentialID    string `json:"credential_id"`
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

func (s *Service) EnsureRegistered(ctx context.Context, id domain.AgentIdentity) error {
	var st registrationState
	_ = s.store.LoadJSON(ctx, "registration.json", &st)

	if st.Registered &&
		st.DeviceID == id.Device.DeviceID &&
		st.AgentInstanceID == id.Installation.AgentInstanceID &&
		st.CredentialID == id.Installation.CredentialID {
		s.logger.Info("device already registered",
			"device_id", id.Device.DeviceID,
			"agent_instance_id", id.Installation.AgentInstanceID,
		)
		return nil
	}

	if err := s.client.RegisterDevice(ctx, id); err != nil {
		_ = s.events.Publish(ctx, domain.TelemetryEvent{
			Type:       "registration_failed",
			Severity:   "error",
			Module:     "registration",
			Message:    "device registration failed",
			DeviceID:   id.Device.DeviceID,
			OccurredAt: time.Now().UTC(),
			Metadata: map[string]any{
				"device_id":         id.Device.DeviceID,
				"agent_instance_id": id.Installation.AgentInstanceID,
			},
		})
		return fmt.Errorf("register device: %w", err)
	}

	st = registrationState{
		Registered:      true,
		DeviceID:        id.Device.DeviceID,
		AgentInstanceID: id.Installation.AgentInstanceID,
		CredentialID:    id.Installation.CredentialID,
	}

	if err := s.store.SaveJSON(ctx, "registration.json", st); err != nil {
		return fmt.Errorf("persist registration state: %w", err)
	}

	_ = s.events.Publish(ctx, domain.TelemetryEvent{
		Type:       "registration_succeeded",
		Severity:   "info",
		Module:     "registration",
		Message:    "device registered successfully",
		DeviceID:   id.Device.DeviceID,
		OccurredAt: time.Now().UTC(),
		Metadata: map[string]any{
			"device_id":         id.Device.DeviceID,
			"agent_instance_id": id.Installation.AgentInstanceID,
		},
	})

	s.logger.Info("device registered",
		"device_id", id.Device.DeviceID,
		"agent_instance_id", id.Installation.AgentInstanceID,
	)
	return nil
}
