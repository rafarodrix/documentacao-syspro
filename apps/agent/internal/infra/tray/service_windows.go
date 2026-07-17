//go:build windows

package tray

import (
	"context"
	"fmt"
	"sync"

	"fyne.io/systray"

	agentassets "trilink/agent/assets"
	"trilink/agent/internal/contracts/agentui"
)

type Logger interface {
	Debug(msg string, kv ...any)
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

	mu                   sync.Mutex
	currentSummary       agentui.Summary
	currentNotifications []agentui.Notification
	ready                bool
}

func NewService(logger Logger, stateDir string) *Service {
	return &Service{
		logger:   logger,
		stateDir: stateDir,
		actions:  make(chan Action, 8),
	}
}

func (s *Service) Run(ctx context.Context) error {
	s.logger.Info("tray service starting", "primary_action", ActionOpenSupport)
	defer s.logger.Info("tray service stopped")

	var readyOnce sync.Once
	var supportItem *systray.MenuItem
	var quitItem *systray.MenuItem

	onReady := func() {
		readyOnce.Do(func() {
			s.mu.Lock()
			s.ready = true
			s.mu.Unlock()
			systray.SetIcon(agentassets.IconICO)
			systray.SetTitle("Trilink Agent")
			systray.SetTooltip(s.tooltipText())
			systray.SetOnTapped(func() {
				s.Trigger(ActionOpenSupport)
			})

			supportItem = systray.AddMenuItem("Suporte Trilink", "Canal oficial de atendimento")
			systray.AddSeparator()
			quitItem = systray.AddMenuItem("Fechar interface", "Encerrar apenas a interface do agente")

			go s.handleClicks(ctx, supportItem, quitItem)
			go func() {
				<-ctx.Done()
				systray.Quit()
			}()
		})
	}

	onExit := func() {
		close(s.actions)
	}

	systray.Run(onReady, onExit)
	return nil
}

func (s *Service) handleClicks(ctx context.Context, supportItem, quitItem *systray.MenuItem) {
	for {
		select {
		case <-ctx.Done():
			return
		case <-supportItem.ClickedCh:
			s.Trigger(ActionOpenSupport)
		case <-quitItem.ClickedCh:
			s.Trigger(ActionExit)
			systray.Quit()
			return
		}
	}
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

func (s *Service) UpdateSummary(summary agentui.Summary) {
	s.mu.Lock()
	s.currentSummary = summary
	ready := s.ready
	s.mu.Unlock()

	if ready {
		systray.SetTooltip(s.tooltipText())
	}
	s.logger.Debug("tray summary updated", "service_status", summary.ServiceStatus, "user_visible", summary.UserVisible)
}

func (s *Service) ShowNotifications(notifications []agentui.Notification) {
	s.mu.Lock()
	s.currentNotifications = notifications
	ready := s.ready
	s.mu.Unlock()

	if ready {
		systray.SetTooltip(s.tooltipText())
	}
	s.logger.Debug("tray notifications updated", "count", len(notifications))
}

func (s *Service) SupportActionReady(result agentui.ActionResult) {
	s.logger.Info("tray support action ready", "accepted", result.Accepted, "target", result.Target)
}

func (s *Service) tooltipText() string {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.currentSummary.ServiceStatus == "" {
		return "Trilink Agent"
	}

	visibility := "oculto"
	if s.currentSummary.UserVisible {
		visibility = "visivel"
	}

	text := fmt.Sprintf("Trilink Agent\nServico: %s\nUI: %s", s.currentSummary.ServiceStatus, visibility)

	warns, errs := 0, 0
	for _, n := range s.currentNotifications {
		switch n.Severity {
		case "error":
			errs++
		case "warn", "warning":
			warns++
		}
	}
	switch {
	case errs > 0:
		text += fmt.Sprintf("\n! %d erro(s)", errs)
	case warns > 0:
		text += fmt.Sprintf("\n! %d aviso(s)", warns)
	}

	return text
}
