package tray

import (
	"context"

	uistate "trilink/agent/internal/core/ui_state"
)

type Logger interface {
	Info(msg string, kv ...any)
}

type Action string

const (
	ActionOpenSupport Action = "open_support"
)

// Service will own the system tray integration for the desktop agent.
type Service struct {
	logger  Logger
	actions chan Action
}

func NewService(logger Logger) *Service {
	return &Service{
		logger:  logger,
		actions: make(chan Action, 8),
	}
}

func (s *Service) Run(ctx context.Context) error {
	s.logger.Info("tray service starting")
	defer s.logger.Info("tray service stopped")

	<-ctx.Done()
	return nil
}

func (s *Service) Actions() <-chan Action {
	return s.actions
}

func (s *Service) Trigger(action Action) {
	select {
	case s.actions <- action:
		s.logger.Info("tray action queued", "action", action)
	default:
		s.logger.Info("tray action dropped because queue is full", "action", action)
	}
}

func (s *Service) UpdateSummary(summary uistate.Summary) {
	s.logger.Info("tray summary updated", "service_status", summary.ServiceStatus, "user_visible", summary.UserVisible)
}

func (s *Service) ShowNotifications(notifications []uistate.Notification) {
	s.logger.Info("tray notifications updated", "count", len(notifications))
}

func (s *Service) SupportActionReady(result uistate.ActionResult) {
	s.logger.Info("tray support action ready", "accepted", result.Accepted, "target", result.Target)
}
