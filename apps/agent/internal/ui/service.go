package ui

import (
	"context"
	"time"

	"golang.org/x/sync/errgroup"

	"trilink/agent/internal/contracts/agentui"
	uistate "trilink/agent/internal/core/ui_state"
	"trilink/agent/internal/infra/tray"
)

type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
}

type TrayRunner interface {
	Run(ctx context.Context) error
}

type TrayActions interface {
	Actions() <-chan tray.Action
}

type SummaryClient interface {
	GetSummary(ctx context.Context) (agentui.Summary, error)
}

type NotificationsClient interface {
	ListNotifications(ctx context.Context) ([]agentui.Notification, error)
}

type ActionsClient interface {
	OpenSupportConversation(ctx context.Context) (agentui.ActionResult, error)
	OpenSetupExperience(ctx context.Context) (agentui.ActionResult, error)
	OpenRemoteClient(ctx context.Context) (agentui.ActionResult, error)
}

type SetupClient interface {
	GetAgentSetupView(ctx context.Context) (agentui.AgentSetupView, error)
}

type TargetOpener interface {
	Open(ctx context.Context, target string) error
}

type TrayStateUpdater interface {
	UpdateSummary(summary agentui.Summary)
	ShowNotifications(notifications []agentui.Notification)
	SupportActionReady(result agentui.ActionResult)
}

type Service struct {
	logger        Logger
	tray          TrayRunner
	trayActions   TrayActions
	summary       SummaryClient
	notifications NotificationsClient
	setup         SetupClient
	actions       ActionsClient
	opener        TargetOpener
	trayState     TrayStateUpdater
}

func NewService(
	logger Logger,
	tray TrayRunner,
	trayActions TrayActions,
	summary SummaryClient,
	notifications NotificationsClient,
	setup SetupClient,
	actions ActionsClient,
	opener TargetOpener,
	trayState TrayStateUpdater,
) *Service {
	return &Service{
		logger:        logger,
		tray:          tray,
		trayActions:   trayActions,
		summary:       summary,
		notifications: notifications,
		setup:         setup,
		actions:       actions,
		opener:        opener,
		trayState:     trayState,
	}
}

func (s *Service) Run(ctx context.Context) error {
	s.logger.Info("agent ui starting")
	defer s.logger.Info("agent ui stopped")

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	// On startup, open setup window only if provisioning is not yet complete.
	// A brief delay lets the IPC connection settle before the first call.
	go s.autoOpenSetupIfNeeded(ctx)

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		return s.pollSummaryLoop(ctx)
	})

	g.Go(func() error {
		return s.pollNotificationsLoop(ctx)
	})

	g.Go(func() error {
		return s.handleTrayActions(ctx)
	})

	trayErr := s.tray.Run(ctx)
	cancel()

	if err := g.Wait(); err != nil {
		return err
	}
	return trayErr
}

func (s *Service) autoOpenSetupIfNeeded(ctx context.Context) {
	select {
	case <-ctx.Done():
		return
	case <-time.After(1200 * time.Millisecond):
	}
	s.maybeOpenSetupExperience(ctx)
}

func (s *Service) maybeOpenSetupExperience(ctx context.Context) {
	view, err := s.setup.GetAgentSetupView(ctx)
	if err != nil {
		s.logger.Info("agent ui setup view fetch failed", "error", err)
		return
	}
	if view.Complete {
		s.logger.Info("agent ui setup experience skipped because onboarding is complete")
		return
	}

	result, err := s.actions.OpenSetupExperience(ctx)
	if err != nil {
		s.logger.Info("agent ui setup experience action failed", "error", err)
		return
	}
	if result.Target == "" {
		return
	}
	if err := s.opener.Open(ctx, result.Target); err != nil {
		s.logger.Info("agent ui setup experience open failed", "error", err, "target", result.Target)
		return
	}
	s.logger.Info("agent ui setup experience opened", "target", result.Target, "stage", view.Stage)
}

func (s *Service) pollSummaryLoop(ctx context.Context) error {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		summary, err := s.summary.GetSummary(ctx)
		if err != nil {
			s.logger.Info("agent ui summary refresh failed", "error", err)
		} else {
			s.trayState.UpdateSummary(summary)
			s.logger.Debug("agent ui summary refreshed", "service_status", summary.ServiceStatus, "user_visible", summary.UserVisible)
		}

		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}

func (s *Service) pollNotificationsLoop(ctx context.Context) error {
	ticker := time.NewTicker(45 * time.Second)
	defer ticker.Stop()

	for {
		notifications, err := s.notifications.ListNotifications(ctx)
		if err != nil {
			s.logger.Info("agent ui notifications refresh failed", "error", err)
		} else {
			s.trayState.ShowNotifications(notifications)
			s.logger.Debug("agent ui notifications refreshed", "count", len(notifications))
		}

		select {
		case <-ctx.Done():
			return nil
		case <-ticker.C:
		}
	}
}

func (s *Service) OpenSupportConversation(ctx context.Context) error {
	supportResult, err := s.actions.OpenSupportConversation(ctx)
	if err != nil {
		s.logger.Info("agent ui support action failed", "error", err)
		if openErr := s.opener.Open(ctx, uistate.TargetSupportConversation); openErr != nil {
			s.logger.Info("agent ui support fallback open failed", "error", openErr)
			return err
		}
		s.logger.Info("agent ui support fallback opened after ipc failure")
		return nil
	}

	s.trayState.SupportActionReady(supportResult)
	if supportResult.Target != "" {
		if err := s.opener.Open(ctx, supportResult.Target); err != nil {
			s.logger.Info("agent ui support target open failed", "error", err, "target", supportResult.Target)
			return err
		}
	}
	s.logger.Info("agent ui support action completed", "accepted", supportResult.Accepted, "message", supportResult.Message, "target", supportResult.Target)
	return nil
}

func (s *Service) handleTrayActions(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return nil
		case action, ok := <-s.trayActions.Actions():
			if !ok {
				return nil
			}

			switch action {
			case tray.ActionOpenSupport:
				if err := s.OpenSupportConversation(ctx); err != nil {
					s.logger.Info("agent ui tray support action failed", "error", err)
				}
			case tray.ActionOpenSetup:
				s.maybeOpenSetupExperience(ctx)
			case tray.ActionExit:
				s.logger.Info("agent ui received tray exit action")
				return nil
			default:
				s.logger.Info("agent ui received unknown tray action", "action", action)
			}
		}
	}
}
