package identity

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"trilink/agent/internal/domain"
)

type Service struct {
	source Source
	store  StateStore
	logger Logger
}

func NewService(source Source, store StateStore, logger Logger) *Service {
	return &Service{
		source: source,
		store:  store,
		logger: logger,
	}
}

func (s *Service) Get(ctx context.Context) (domain.AgentIdentity, error) {
	deviceIdentity, err := s.loadOrCreateDeviceIdentity(ctx)
	if err != nil {
		return domain.AgentIdentity{}, err
	}

	installation, err := s.loadOrCreateInstallation(ctx)
	if err != nil {
		return domain.AgentIdentity{}, err
	}

	return domain.AgentIdentity{
		Device:       deviceIdentity,
		Installation: installation,
	}, nil
}

func (s *Service) loadOrCreateDeviceIdentity(ctx context.Context) (domain.DeviceIdentity, error) {
	var cached domain.DeviceIdentity
	if err := s.store.LoadJSON(ctx, "identity.json", &cached); err == nil && cached.DeviceID != "" {
		if cached.IdentitySource == "machine-guid" {
			return cached, nil
		}

		id, err := s.source.GetIdentity(ctx)
		if err != nil {
			s.logger.Info("identity source refresh failed; using cached identity", "device_id", cached.DeviceID, "source", cached.IdentitySource, "error", err)
			return cached, nil
		}
		if id.DeviceID == cached.DeviceID && id.IdentitySource == cached.IdentitySource {
			return cached, nil
		}
		if err := s.store.SaveJSON(ctx, "identity.json", id); err != nil {
			return domain.DeviceIdentity{}, fmt.Errorf("persist refreshed identity: %w", err)
		}

		s.logger.Info("identity upgraded", "previous_source", cached.IdentitySource, "source", id.IdentitySource, "device_id", id.DeviceID)
		return id, nil
	}

	id, err := s.source.GetIdentity(ctx)
	if err != nil {
		return domain.DeviceIdentity{}, fmt.Errorf("identity source: %w", err)
	}

	if err := s.store.SaveJSON(ctx, "identity.json", id); err != nil {
		return domain.DeviceIdentity{}, fmt.Errorf("persist identity: %w", err)
	}

	s.logger.Info("identity created", "device_id", id.DeviceID, "source", id.IdentitySource)
	return id, nil
}

func (s *Service) loadOrCreateInstallation(ctx context.Context) (domain.AgentInstallation, error) {
	var cached domain.AgentInstallation
	if err := s.store.LoadJSON(ctx, "installation.json", &cached); err == nil && cached.AgentInstanceID != "" && cached.CredentialID != "" {
		return cached, nil
	}

	installation := domain.AgentInstallation{
		AgentInstanceID: uuid.NewString(),
		CredentialID:    uuid.NewString(),
		InstalledAt:     time.Now().UTC(),
	}

	if err := s.store.SaveJSON(ctx, "installation.json", installation); err != nil {
		return domain.AgentInstallation{}, fmt.Errorf("persist installation identity: %w", err)
	}

	s.logger.Info("installation identity created",
		"agent_instance_id", installation.AgentInstanceID,
		"credential_id", installation.CredentialID,
	)

	return installation, nil
}
