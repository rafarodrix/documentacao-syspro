package ipc

import (
	"context"

	uistate "trilink/agent/internal/core/ui_state"
)

type Logger interface {
	Info(msg string, kv ...any)
}

type SummaryProvider interface {
	Snapshot(ctx context.Context) (uistate.Summary, error)
}

// Server will host the local service-to-UI transport.
// For now it only defines the lifecycle and exposes the expected service-side boundary.
type Server struct {
	logger   Logger
	provider SummaryProvider
}

func NewServer(logger Logger, provider SummaryProvider) *Server {
	return &Server{
		logger:   logger,
		provider: provider,
	}
}

func (s *Server) Start(ctx context.Context) error {
	summary, err := s.provider.Snapshot(ctx)
	if err != nil {
		s.logger.Info("ipc server started without initial summary", "error", err)
	} else {
		s.logger.Info("ipc server scaffolded", "service_status", summary.ServiceStatus, "user_visible", summary.UserVisible)
	}

	<-ctx.Done()
	return nil
}
