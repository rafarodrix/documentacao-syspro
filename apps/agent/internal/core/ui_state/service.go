package uistate

import (
	"context"
	"time"

	"trilink/agent/internal/infra/webview"
)

type Summary struct {
	ServiceStatus string `json:"service_status"`
	UserVisible   bool   `json:"user_visible"`
}

type Notification struct {
	ID         string    `json:"id"`
	Title      string    `json:"title"`
	Message    string    `json:"message"`
	Severity   string    `json:"severity"`
	OccurredAt time.Time `json:"occurred_at"`
}

type ActionResult struct {
	Accepted bool   `json:"accepted"`
	Message  string `json:"message"`
	Target   string `json:"target,omitempty"`
}

// Service is the future state composer for tray/window rendering.
type Service struct {
	stateDir string
	chatwoot webview.ChatwootConfig
}

func NewService(stateDir string, chatwoot webview.ChatwootConfig) *Service {
	return &Service{
		stateDir: stateDir,
		chatwoot: chatwoot,
	}
}

func (s *Service) Snapshot(ctx context.Context) (Summary, error) {
	_ = ctx

	return Summary{
		ServiceStatus: "running",
		UserVisible:   true,
	}, nil
}

func (s *Service) ListNotifications(ctx context.Context) ([]Notification, error) {
	_ = ctx

	return []Notification{
		{
			ID:         "agent-online",
			Title:      "Agent online",
			Message:    "Servico local e IPC estao disponiveis.",
			Severity:   "info",
			OccurredAt: time.Now().UTC(),
		},
		{
			ID:         "support-ready",
			Title:      "Suporte pronto",
			Message:    "Canal oficial da Trilink preparado com Chatwoot.",
			Severity:   "info",
			OccurredAt: time.Now().UTC(),
		},
	}, nil
}

func (s *Service) OpenSupportConversation(ctx context.Context) (ActionResult, error) {
	_ = ctx

	target, err := webview.EnsureChatwootWidgetPage(s.stateDir, s.chatwoot)
	if err != nil {
		return ActionResult{
			Accepted: false,
			Message:  "support conversation request rejected",
		}, err
	}

	return ActionResult{
		Accepted: true,
		Message:  "support conversation request accepted",
		Target:   target,
	}, nil
}
