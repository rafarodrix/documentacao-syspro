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

const (
	TargetSupportConversation = "agent://support"
	TargetSetupExperience     = "agent://setup"
)

type SetupStep struct {
	Key    string `json:"key"`
	Label  string `json:"label"`
	Status string `json:"status"`
	Detail string `json:"detail,omitempty"`
}

type SetupStatus struct {
	Complete    bool        `json:"complete"`
	Stage       string      `json:"stage"`
	Title       string      `json:"title"`
	Summary     string      `json:"summary"`
	ProgressPct int         `json:"progress_pct"`
	LastError   string      `json:"last_error,omitempty"`
	CompanyName string      `json:"company_name,omitempty"`
	HostID      string      `json:"host_id,omitempty"`
	RustDeskID  string      `json:"rustdesk_id,omitempty"`
	Steps       []SetupStep `json:"steps"`
}

type SupportContextSyncResult struct {
	Accepted bool   `json:"accepted"`
	Message  string `json:"message"`
}

type SupportSession struct {
	BaseURL      string         `json:"base_url"`
	WebsiteToken string         `json:"website_token"`
	Context      SupportContext `json:"context"`
}

type SupportContextPublisher interface {
	SyncSupportConversationContext(ctx context.Context, conversationID string, supportContext domain.SupportConversationContext) error
}

// Service is the future state composer for tray/window rendering.
type Service struct {
	stateDir         string
	chatwoot         ChatwootConfig
	agentVersion     string
	agentEnvironment string
	publisher        SupportContextPublisher
}

func NewService(
	stateDir string,
	chatwoot ChatwootConfig,
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

	session, err := s.SupportSession(ctx)
	if err != nil {
		return ActionResult{
			Accepted: false,
			Message:  "support conversation request rejected",
		}, err
	}
	if session.BaseURL == "" || session.WebsiteToken == "" {
		return ActionResult{
			Accepted: false,
			Message:  "support conversation request rejected",
		}, fmt.Errorf("chatwoot widget is not configured")
	}

	return ActionResult{
		Accepted: true,
		Message:  "support conversation request accepted",
		Target:   TargetSupportConversation,
	}, nil
}

func (s *Service) SetupStatus(ctx context.Context) (SetupStatus, error) {
	_ = ctx

	context := s.buildSupportContext()
	desired, _ := loadJSON[domain.DesiredState](filepath.Join(s.stateDir, "desired_state.json"))
	current, _ := loadJSON[domain.CurrentState](filepath.Join(s.stateDir, "current_state.json"))
	results, _ := loadJSON[[]domain.ApplyResult](filepath.Join(s.stateDir, "apply_results.json"))
	remoteState, _ := loadJSON[persistedRemoteState](filepath.Join(s.stateDir, "remote_state.json"))

	remoteResult := findModuleResult(results, "remote")
	steps := []SetupStep{
		buildStep(
			"identity",
			"Identidade do agente",
			context.DeviceID != "",
			"",
			firstNonEmpty("Dispositivo registrado: "+context.DeviceID, "Gerando identidade local"),
		),
		buildStep(
			"portal",
			"Conexao com o portal",
			desired.Version > 0,
			derivePortalError(remoteResult),
			fmt.Sprintf("Desired state atual: v%d", desired.Version),
		),
		buildStep(
			"discover",
			"Descoberta da maquina",
			remoteState.LastBootstrapFlow != "" || remoteState.HostID != "",
			deriveDiscoverError(remoteResult),
			deriveDiscoverDetail(remoteState, remoteResult),
		),
		buildStep(
			"rustdesk",
			"Instalacao do remoto",
			remoteState.RustDeskID != "" || remoteState.CurrentVersion != "" || remoteState.RustDeskExecutable != "",
			deriveRustDeskInstallError(remoteResult),
			deriveRustDeskDetail(remoteState),
		),
		buildStep(
			"link",
			"Vinculo com a empresa",
			remoteState.HostID != "" && remoteState.CompanyID != "",
			"",
			deriveLinkDetail(remoteState),
		),
		buildStep(
			"sync",
			"Remoto operacional",
			isRemoteOperational(remoteState, current),
			deriveSyncError(remoteResult),
			deriveSyncDetail(remoteState, current),
		),
	}

	completed := 0
	lastError := ""
	stage := "Concluido"
	summary := "Agente pronto para atendimento e remoto."
	complete := true
	for _, step := range steps {
		if step.Status == "complete" {
			completed++
			continue
		}
		complete = false
		stage = step.Label
		summary = firstNonEmpty(step.Detail, "Aguardando proxima etapa do onboarding.")
		if step.Status == "error" {
			lastError = step.Detail
		}
		break
	}

	progress := 0
	if len(steps) > 0 {
		progress = int(float64(completed) / float64(len(steps)) * 100)
	}

	if !complete && lastError == "" {
		for _, step := range steps {
			if step.Status == "error" {
				lastError = step.Detail
				break
			}
		}
	}

	return SetupStatus{
		Complete:    complete,
		Stage:       stage,
		Title:       "Instalacao do Agente Trilink",
		Summary:     summary,
		ProgressPct: progress,
		LastError:   lastError,
		CompanyName: context.CompanyDisplayName,
		HostID:      context.HostID,
		RustDeskID:  context.RustDeskID,
		Steps:       steps,
	}, nil
}

func (s *Service) OpenSetupExperience(ctx context.Context) (ActionResult, error) {
	if _, err := s.SetupStatus(ctx); err != nil {
		return ActionResult{
			Accepted: false,
			Message:  "setup experience request rejected",
		}, err
	}

	return ActionResult{
		Accepted: true,
		Message:  "setup experience request accepted",
		Target:   TargetSetupExperience,
	}, nil
}

func (s *Service) SupportSession(ctx context.Context) (SupportSession, error) {
	_ = ctx

	baseURL := strings.TrimSpace(s.chatwoot.BaseURL)
	websiteToken := strings.TrimSpace(s.chatwoot.WebsiteToken)
	if baseURL == "" || websiteToken == "" {
		return SupportSession{}, fmt.Errorf("chatwoot widget is not configured")
	}

	return SupportSession{
		BaseURL:      baseURL,
		WebsiteToken: websiteToken,
		Context:      s.buildSupportContext(),
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
	AgentToken          string    `json:"agent_token"`
	CompanyID           string    `json:"company_id"`
	CompanyName         string    `json:"company_name"`
	HostID              string    `json:"host_id"`
	Alias               string    `json:"alias"`
	RustDeskID          string    `json:"rustdesk_id"`
	DefaultPassword     string    `json:"default_password"`
	RuntimePassword     string    `json:"runtime_password"`
	MachineName         string    `json:"machine_name"`
	CurrentVersion      string    `json:"current_version"`
	RustDeskExecutable  string    `json:"rustdesk_executable"`
	RebootstrapRequired bool      `json:"rebootstrap_required"`
	LastBootstrapFlow   string    `json:"last_bootstrap_flow"`
	LastSyncAt          time.Time `json:"last_sync_at"`
}

func (s *Service) buildSupportContext() SupportContext {
	context := SupportContext{
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
		context.RemoteAccessPassword = resolveDisplayedRustDeskPassword(remoteState)
		context.MachineName = strings.TrimSpace(remoteState.MachineName)
	}

	context.RemoteStatus, context.RemoteStatusText = resolveRemoteStatus(context)
	context.ConversationTags = buildConversationTags(context)
	context.CompanyDisplayName = resolveCompanyDisplayName(context)
	context.ContactName = resolveContactName(context)
	context.Description = buildContextDescription(context)

	return context
}

func resolveCompanyDisplayName(context SupportContext) string {
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

func resolveDisplayedRustDeskPassword(remoteState persistedRemoteState) string {
	defaultPassword := strings.TrimSpace(remoteState.DefaultPassword)
	if defaultPassword != "" {
		return defaultPassword
	}

	runtimePassword := strings.TrimSpace(remoteState.RuntimePassword)
	if looksLikeDisplayedRustDeskPassword(runtimePassword) {
		return runtimePassword
	}

	return ""
}

func looksLikeDisplayedRustDeskPassword(value string) bool {
	if value == "" {
		return false
	}
	if strings.ContainsAny(value, "/+=") {
		return false
	}
	if strings.ContainsAny(value, " \t\r\n") {
		return false
	}
	if len(value) < 4 || len(value) > 16 {
		return false
	}
	return true
}

func resolveContactName(context SupportContext) string {
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

func buildContextDescription(context SupportContext) string {
	if context.RemoteStatusText != "" {
		return "Atendimento iniciado pelo agente da Trilink. Estado remoto: " + context.RemoteStatusText + "."
	}

	return "Atendimento iniciado pelo agente da Trilink."
}

func resolveRemoteStatus(context SupportContext) (string, string) {
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

func buildConversationTags(context SupportContext) []string {
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

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func findModuleResult(results []domain.ApplyResult, module string) *domain.ApplyResult {
	for i := range results {
		if results[i].Module == module {
			return &results[i]
		}
	}
	return nil
}

func buildStep(key, label string, complete bool, errDetail, pendingDetail string) SetupStep {
	if complete {
		return SetupStep{Key: key, Label: label, Status: "complete", Detail: pendingDetail}
	}
	if strings.TrimSpace(errDetail) != "" {
		return SetupStep{Key: key, Label: label, Status: "error", Detail: errDetail}
	}
	return SetupStep{Key: key, Label: label, Status: "pending", Detail: pendingDetail}
}

func derivePortalError(result *domain.ApplyResult) string {
	if result == nil {
		return ""
	}
	if strings.Contains(strings.ToLower(result.Message), "desired state") {
		return firstNonEmpty(result.Error, result.Message)
	}
	if strings.Contains(strings.ToLower(result.Error), "desired state") {
		return result.Error
	}
	return ""
}

func deriveDiscoverError(result *domain.ApplyResult) string {
	if result == nil {
		return ""
	}
	value := strings.ToLower(firstNonEmpty(result.Error, result.Message))
	if strings.Contains(value, "discover") || strings.Contains(value, "discovery token") {
		return firstNonEmpty(result.Error, result.Message)
	}
	return ""
}

func deriveDiscoverDetail(st persistedRemoteState, result *domain.ApplyResult) string {
	if st.HostID != "" {
		return "Host identificado no portal."
	}
	if st.LastBootstrapFlow != "" {
		return "Fluxo remoto atual: " + st.LastBootstrapFlow
	}
	if result != nil && strings.TrimSpace(result.Message) != "" {
		return result.Message
	}
	return "Aguardando descoberta inicial da maquina no portal."
}

func deriveRustDeskInstallError(result *domain.ApplyResult) string {
	if result == nil {
		return ""
	}
	value := strings.ToLower(firstNonEmpty(result.Error, result.Message))
	if strings.Contains(value, "msi installer") || strings.Contains(value, "exit status 1603") || strings.Contains(value, "rustdesk") {
		return firstNonEmpty(result.Error, result.Message)
	}
	return ""
}

func deriveRustDeskDetail(st persistedRemoteState) string {
	switch {
	case st.RustDeskID != "":
		return "RustDesk detectado no host: " + st.RustDeskID
	case st.RustDeskExecutable != "":
		return "Executavel remoto localizado no host."
	default:
		return "Aguardando instalacao e deteccao do RustDesk."
	}
}

func deriveLinkDetail(st persistedRemoteState) string {
	switch {
	case st.CompanyID != "" && st.CompanyName != "":
		return "Empresa vinculada: " + st.CompanyName
	case st.HostID != "":
		return "Host remoto criado e aguardando vinculo empresarial."
	default:
		return "Aguardando vinculacao da maquina a um host/empresa no portal."
	}
}

func deriveSyncError(result *domain.ApplyResult) string {
	if result == nil {
		return ""
	}
	value := strings.ToLower(firstNonEmpty(result.Error, result.Message))
	if strings.Contains(value, "sync failed") || strings.Contains(value, "bootstrap failed") {
		return firstNonEmpty(result.Error, result.Message)
	}
	return ""
}

func deriveSyncDetail(st persistedRemoteState, current domain.CurrentState) string {
	switch {
	case isRemoteOperational(st, current):
		return "Configuracao remota sincronizada e operacional."
	case st.AgentToken != "":
		return "Credencial remota emitida; aguardando sincronizacao final."
	default:
		return "Aguardando bootstrap e sync autenticado do remoto."
	}
}

func isRemoteOperational(st persistedRemoteState, current domain.CurrentState) bool {
	return !st.LastSyncAt.IsZero() && !st.RebootstrapRequired && current.Remote.Status == domain.ModuleStatusReady
}
