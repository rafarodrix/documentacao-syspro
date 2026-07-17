//go:build !windows

package tray

import (
	"context"

	"trilink/agent/internal/contracts/agentui"
)

type Logger interface {
	Info(msg string, kv ...any)
}

type Action string

const (
	ActionOpenSupport Action = "open_support"
	ActionOpenSetup   Action = "open_setup"
	ActionExit        Action = "exit"
)

type Service struct {
	logger   Logger
	stateDir string
	actions  chan Action
}

func NewService(logger Logger, stateDir string) *Service {
	return &Service{logger: logger, stateDir: stateDir, actions: make(chan Action, 8)}
}

func (s *Service) Run(ctx context.Context) error {
	<-ctx.Done()
	close(s.actions)
	return nil
}

func (s *Service) Actions() <-chan Action { return s.actions }

func (s *Service) Trigger(action Action) {
	select {
	case s.actions <- action:
	default:
	}
}

func (s *Service) UpdateSummary(summary agentui.Summary) {}

func (s *Service) ShowNotifications(notifications []agentui.Notification) {}

func (s *Service) SupportActionReady(result agentui.ActionResult) {}
