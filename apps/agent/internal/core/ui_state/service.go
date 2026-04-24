package uistate

import "context"

type Summary struct {
	ServiceStatus string `json:"service_status"`
	UserVisible   bool   `json:"user_visible"`
}

// Service is the future state composer for tray/window rendering.
type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) Snapshot(ctx context.Context) (Summary, error) {
	_ = ctx

	return Summary{
		ServiceStatus: "running",
		UserVisible:   true,
	}, nil
}
