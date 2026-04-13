package http

import (
	"context"
	"time"

	"trilink/agent/internal/domain"
	"trilink/agent/internal/infra/config"
)

type Logger interface {
	Info(msg string, kv ...any)
}

type PortalClient struct {
	cfg    config.Config
	logger Logger
}

func NewPortalClient(cfg config.Config, logger Logger) *PortalClient {
	return &PortalClient{
		cfg:    cfg,
		logger: logger,
	}
}

func (c *PortalClient) RegisterDevice(ctx context.Context, id domain.DeviceIdentity) error {
	_ = ctx
	c.logger.Info("register device stub", "device_id", id.DeviceID)
	return nil
}

func (c *PortalClient) SendHeartbeat(ctx context.Context) error {
	_ = ctx
	c.logger.Info("heartbeat stub")
	return nil
}

func (c *PortalClient) GetDesiredState(ctx context.Context) (domain.DesiredState, error) {
	_ = ctx
	return domain.DesiredState{
		Version:   1,
		UpdatedAt: time.Now().UTC(),
	}, nil
}
