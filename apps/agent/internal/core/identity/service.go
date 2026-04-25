package identity

import (
	"context"
	"fmt"

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

func (s *Service) Get(ctx context.Context) (domain.DeviceIdentity, error) {
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
