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

	state := domain.DesiredState{
		Version:   2,
		UpdatedAt: time.Now().UTC(),

		Remote: domain.RemoteDesiredState{
			Enabled: true,
			Version: "1.0.0",
		},

		Tunnel: domain.TunnelDesiredState{
			Enabled:     true,
			Version:     "1.0.0",
			ServerHost:  "tunnel.trilink.local",
			ServerPort:  2333,
			RemotePort:  5001,
			LocalTarget: "127.0.0.1:3050",
			Token:       "dev-token",
		},

		Backup: domain.BackupDesiredState{
			Enabled:       true,
			Version:       "1.0.0",
			Schedule:      "0 0 * * *",
			RetentionDays: 7,
			Target:        "sftp://backup",
		},
	}

	c.logger.Info("desired state stub returned", "version", state.Version)
	return state, nil
}
