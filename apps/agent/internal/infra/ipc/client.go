package ipc

import (
	"context"

	uistate "trilink/agent/internal/core/ui_state"
)

type Client struct {
	logger Logger
}

func NewClient(logger Logger) *Client {
	return &Client{logger: logger}
}

func (c *Client) GetSummary(ctx context.Context) (uistate.Summary, error) {
	_ = ctx

	summary := uistate.Summary{
		ServiceStatus: "disconnected",
		UserVisible:   true,
	}
	c.logger.Info("ipc client fetched scaffold summary", "service_status", summary.ServiceStatus)
	return summary, nil
}
