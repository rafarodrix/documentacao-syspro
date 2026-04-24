package ui

import (
	"context"
	"time"

	"golang.org/x/sync/errgroup"

	uistate "trilink/agent/internal/core/ui_state"
)

type Logger interface {
	Info(msg string, kv ...any)
}

type TrayRunner interface {
	Run(ctx context.Context) error
}

type SummaryClient interface {
	GetSummary(ctx context.Context) (uistate.Summary, error)
}

type Service struct {
	logger  Logger
	tray    TrayRunner
	summary SummaryClient
}

func NewService(logger Logger, tray TrayRunner, summary SummaryClient) *Service {
	return &Service{
		logger:  logger,
		tray:    tray,
		summary: summary,
	}
}

func (s *Service) Run(ctx context.Context) error {
	s.logger.Info("agent ui starting")
	defer s.logger.Info("agent ui stopped")

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		return s.tray.Run(ctx)
	})

	g.Go(func() error {
		return s.pollSummaryLoop(ctx)
	})

	return g.Wait()
}

func (s *Service) pollSummaryLoop(ctx context.Context) error {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		summary, err := s.summary.GetSummary(ctx)
		if err != nil {
			s.logger.Info("agent ui summary refresh failed", "error", err)
		} else {
			s.logger.Info("agent ui summary refreshed", "service_status", summary.ServiceStatus, "user_visible", summary.UserVisible)
		}

		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}
