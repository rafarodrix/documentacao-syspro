package uistate

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/user"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"trilink/agent/internal/domain"
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

type SupportContextSyncResult struct {
	Accepted bool   `json:"accepted"`
	Message  string `json:"message"`
}

type SupportContextPublisher interface {
	SyncSupportConversationContext(ctx context.Context, conversationID string, supportContext domain.SupportConversationContext) error
}

// Service is the future state composer for tray/window rendering.
type Service struct {
	stateDir         string
	chatwoot         webview.ChatwootConfig
	agentVersion     string
	agentEnvironment string
	publisher        SupportContextPublisher
}

func NewService(
	stateDir string,
	chatwoot webview.ChatwootConfig,
	agentVersion,
	agentEnvironment string,
	publisher SupportContextPublisher,
) *Service {
	return &Service{
		stateDir:         stateDir,
		chatwoot:         chatwoot,
		agentVersion:     strings.TrimSpace(agentVersion),
		agentEnvironment: strings.TrimSpace(agentEnvironment),
		publisher:        publisher,
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

	chatwootCfg := s.chatwoot
	chatwootCfg.Context = s.buildSupportContext()
	chatwootCfg.IPCBaseURL = s.chatwoot.IPCBaseURL

	target, err := webview.EnsureChatwootWidgetPage(s.stateDir, chatwootCfg)
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

func (s *Service) SyncSupportConversationContext(ctx context.Context, conversationID string) (SupportContextSyncResult, error) {
	if strings.TrimSpace(conversationID) == "" {
		return SupportContextSyncResult{
			Accepted: false,
			Message:  "support context sync rejected",
		}, fmt.Errorf("conversation id is required")
	}

	if s.publisher == nil {
		return SupportContextSyncResult{
			Accepted: false,
			Message:  "support context sync rejected",
		}, fmt.Errorf("support context publisher is not configured")
	}

	supportContext := s.buildSupportContext()
	payload := domain.SupportConversationContext{
		CompanyID:        supportContext.CompanyID,
		CompanyName:      supportContext.CompanyDisplayName,
		HostID:           supportContext.HostID,
		HostAlias:        supportContext.HostAlias,
		RustDeskID:       supportContext.RustDeskID,
		RemoteStatus:     supportContext.RemoteStatus,
		RemoteStatusText: supportContext.RemoteStatusText,
		ConversationTags: supportContext.ConversationTags,
		MachineName:      supportContext.MachineName,
		DeviceID:         supportContext.DeviceID,
		Hostname:         supportContext.Hostname,
		OS:               supportContext.OS,
		LocalUsername:    supportContext.LocalUsername,
		AgentVersion:     supportContext.AgentVersion,
		AgentEnvironment: supportContext.AgentEnvironment,
	}

	if err := s.publisher.SyncSupportConversationContext(ctx, conversationID, payload); err != nil {
		return SupportContextSyncResult{
			Accepted: false,
			Message:  "support context sync failed",
		}, err
	}

	return SupportContextSyncResult{
		Accepted: true,
		Message:  "support context synced",
	}, nil
}

type persistedRemoteState struct {
	CompanyID       string `json:"company_id"`
	CompanyName     string `json:"company_name"`
	HostID          string `json:"host_id"`
	Alias           string `json:"alias"`
	RustDeskID      string `json:"rustdesk_id"`
	DefaultPassword string `json:"default_password"`
	MachineName     string `json:"machine_name"`
}

func (s *Service) buildSupportContext() webview.SupportContext {
	context := webview.SupportContext{
		LocalUsername:    currentLocalUsername(),
		AgentVersion:     s.agentVersion,
		AgentEnvironment: s.agentEnvironment,
	}

	if identity, err := loadJSON[domain.DeviceIdentity](filepath.Join(s.stateDir, "identity.json")); err == nil {
		context.DeviceID = strings.TrimSpace(identity.DeviceID)
		context.Hostname = strings.TrimSpace(identity.Hostname)
		context.OS = strings.TrimSpace(identity.OS)
	}

	if remoteState, err := loadJSON[persistedRemoteState](filepath.Join(s.stateDir, "remote_state.json")); err == nil {
		context.CompanyID = strings.TrimSpace(remoteState.CompanyID)
		context.CompanyDisplayName = strings.TrimSpace(remoteState.CompanyName)
		context.HostID = strings.TrimSpace(remoteState.HostID)
		context.HostAlias = strings.TrimSpace(remoteState.Alias)
		context.RustDeskID = strings.TrimSpace(remoteState.RustDeskID)
		context.RemoteAccessPassword = strings.TrimSpace(remoteState.DefaultPassword)
		context.MachineName = strings.TrimSpace(remoteState.MachineName)
	}

	context.RemoteStatus, context.RemoteStatusText = resolveRemoteStatus(context)
	context.ConversationTags = buildConversationTags(context)
	context.CompanyDisplayName = resolveCompanyDisplayName(context)
	context.ContactName = resolveContactName(context)
	context.Description = buildContextDescription(context)

	return context
}

func resolveCompanyDisplayName(context webview.SupportContext) string {
	switch {
	case context.CompanyDisplayName != "":
		return context.CompanyDisplayName
	case context.CompanyID != "":
		return "Empresa vinculada " + context.CompanyID
	case context.HostAlias != "":
		return context.HostAlias
	default:
		return "Cliente Trilink"
	}
}

func resolveContactName(context webview.SupportContext) string {
	switch {
	case context.LocalUsername != "":
		return context.LocalUsername
	case context.MachineName != "":
		return context.MachineName
	case context.Hostname != "":
		return context.Hostname
	default:
		return "Cliente Trilink"
	}
}

func buildContextDescription(context webview.SupportContext) string {
	lines := []string{
		"Atendimento iniciado pelo agente da Trilink.",
	}

	if context.RemoteStatusText != "" {
		lines = append(lines, "Estado remoto: "+context.RemoteStatusText)
	}
	if context.CompanyID != "" {
		lines = append(lines, "Empresa vinculada: "+context.CompanyID)
	}
	if context.HostAlias != "" {
		lines = append(lines, "Host vinculado: "+context.HostAlias)
	}
	if context.RustDeskID != "" {
		lines = append(lines, "RustDesk ID: "+context.RustDeskID)
	}
	if context.Hostname != "" {
		lines = append(lines, "Hostname: "+context.Hostname)
	}
	if context.LocalUsername != "" {
		lines = append(lines, "Usuario local: "+context.LocalUsername)
	}
	if context.AgentVersion != "" {
		lines = append(lines, "Agente: "+context.AgentVersion)
	}

	return strings.Join(lines, "\n")
}

func resolveRemoteStatus(context webview.SupportContext) (string, string) {
	switch {
	case context.RustDeskID != "" && (context.HostID != "" || context.HostAlias != ""):
		return "ready", "identificacao remota pronta"
	case context.RustDeskID != "":
		return "pending", "RustDesk detectado, aguardando vinculo completo"
	case context.HostID != "" || context.HostAlias != "" || context.CompanyID != "":
		return "pending", "vinculo remoto em preparacao"
	default:
		return "offline", "RustDesk nao instalado ou ainda nao vinculado"
	}
}

func buildConversationTags(context webview.SupportContext) []string {
	tags := []string{"agent-desktop"}

	switch context.RemoteStatus {
	case "ready":
		tags = append(tags, "remote-ready")
	case "pending":
		tags = append(tags, "remote-pending")
	default:
		tags = append(tags, "remote-offline")
	}

	if context.CompanyID != "" {
		tags = append(tags, "company-linked")
	}

	return tags
}

func currentLocalUsername() string {
	if current, err := user.Current(); err == nil {
		if name := strings.TrimSpace(current.Username); name != "" {
			return name
		}
	}

	for _, key := range []string{"USERNAME", "USER"} {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}

	return runtime.GOOS
}

func loadJSON[T any](path string) (T, error) {
	var value T

	data, err := os.ReadFile(path)
	if err != nil {
		return value, err
	}

	if err := json.Unmarshal(data, &value); err != nil {
		return value, fmt.Errorf("unmarshal %s: %w", path, err)
	}

	return value, nil
}
