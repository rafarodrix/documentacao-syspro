package uistate

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"trilink/agent/internal/domain"
	"trilink/agent/internal/infra/storage"
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

type OpenRemoteAccessResult struct {
	Opened  bool   `json:"opened"`
	Running bool   `json:"running"`
	Message string `json:"message"`
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

type SupportContextSyncResult struct {
	Accepted bool   `json:"accepted"`
	Message  string `json:"message"`
}

type DesiredStateProvider interface {
	GetLast(ctx context.Context) (domain.DesiredState, error)
}

func (s *Service) AgentSetupView(ctx context.Context) (AgentSetupView, error) {
	context := s.buildSupportContext()
	desired, _ := s.loadDesiredState(ctx)
	current, _ := loadJSON[domain.CurrentState](filepath.Join(s.stateDir, "current_state.json"))
	results, _ := loadJSON[[]domain.ApplyResult](filepath.Join(s.stateDir, "apply_results.json"))
	remoteState, _ := s.loadPersistedRemoteState()

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
			deriveDiscoverError(remoteState, remoteResult),
			deriveDiscoverDetail(remoteState, remoteResult),
		),
		buildStep(
			"link",
			"Vinculo com a empresa",
			remoteState.HostID != "" && remoteState.CompanyID != "",
			"",
			deriveLinkDetail(remoteState),
		),
		buildStep(
			"rustdesk",
			"Cliente remoto",
			remoteState.RustDeskID != "" || remoteState.CurrentVersion != "" || remoteState.RustDeskExecutable != "",
			deriveRustDeskInstallError(remoteState, remoteResult),
			deriveRustDeskDetail(remoteState),
		),
		buildStep(
			"sync",
			"Remoto operacional",
			isRemoteOperational(remoteState, current),
			deriveSyncError(remoteState, remoteResult),
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

	if isPendingLinkReady(remoteState) {
		complete = true
		stage = "Instalacao concluida"
		summary = "Agente instalado e acesso remoto preparado. Falta apenas vincular esta maquina no portal."
		progress = 100
	}

	if !complete && lastError == "" {
		for _, step := range steps {
			if step.Status == "error" {
				lastError = step.Detail
				break
			}
		}
	}

	view := BuildAgentSetupView(
		context,
		complete,
		stage,
		"Instalacao do Agente Trilink",
		summary,
		progress,
		lastError,
		steps,
	)
	view.Complete = complete
	return view, nil
}

func (s *Service) AgentSupportView(ctx context.Context) (AgentSupportView, error) {
	_ = ctx

	baseURL := strings.TrimSpace(s.chatwoot.BaseURL)
	websiteToken := strings.TrimSpace(s.chatwoot.WebsiteToken)

	return BuildAgentSupportView(s.buildSupportContext(), baseURL, websiteToken), nil
}

type SupportContextPublisher interface {
	SyncSupportConversationContext(ctx context.Context, conversationID string, supportContext domain.SupportConversationContext) error
}

// Service is the future state composer for tray/window rendering.
type Service struct {
	stateDir     string
	chatwoot     ChatwootConfig
	agentVersion string
	publisher    SupportContextPublisher
	desired      DesiredStateProvider
}

type uiStateStorageLogger struct{}

func (uiStateStorageLogger) Warn(msg string, kv ...any) {}

type persistedRemoteState = domain.PersistedRemoteState

func NewService(
	stateDir string,
	chatwoot ChatwootConfig,
	agentVersion string,
	publisher SupportContextPublisher,
	desired DesiredStateProvider,
) *Service {
	return &Service{
		stateDir:     stateDir,
		chatwoot:     chatwoot,
		agentVersion: strings.TrimSpace(agentVersion),
		publisher:    publisher,
		desired:      desired,
	}
}

func (s *Service) loadDesiredState(ctx context.Context) (domain.DesiredState, error) {
	if s.desired != nil {
		if desired, err := s.desired.GetLast(ctx); err == nil {
			return desired, nil
		}
	}

	return loadJSON[domain.DesiredState](filepath.Join(s.stateDir, "desired_state.json"))
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

	return ActionResult{
		Accepted: true,
		Message:  "support conversation request accepted",
		Target:   TargetSupportConversation,
	}, nil
}

func (s *Service) OpenRemoteClient(ctx context.Context) (OpenRemoteAccessResult, error) {
	exePath := s.resolveRustDeskExecutable()
	if exePath == "" {
		return OpenRemoteAccessResult{
			Opened:  false,
			Running: false,
			Message: "Executavel do suporte remoto nao encontrado. Reinstale ou repare o acesso remoto.",
		}, nil
	}

	if !isTrustedRustDeskExecutable(exePath) {
		return OpenRemoteAccessResult{
			Opened:  false,
			Running: false,
			Message: "Caminho do suporte remoto invalido. Reinstale ou repare o acesso remoto.",
		}, nil
	}

	if isRustDeskProcessRunning() {
		if focusRustDeskWindow() {
			return OpenRemoteAccessResult{
				Opened:  true,
				Running: true,
				Message: "Janela do suporte remoto exibida.",
			}, nil
		}

		return OpenRemoteAccessResult{
			Opened:  true,
			Running: true,
			Message: "Suporte remoto aberto.",
		}, nil
	}

	cmd := exec.CommandContext(ctx, exePath)
	cmd.Dir = filepath.Dir(exePath)
	if err := cmd.Start(); err != nil {
		return OpenRemoteAccessResult{
			Opened:  false,
			Running: false,
			Message: "Nao foi possivel abrir o suporte remoto. Tente novamente ou repare o acesso remoto.",
		}, nil
	}

	return OpenRemoteAccessResult{
		Opened:  true,
		Running: true,
		Message: "Abrindo suporte remoto...",
	}, nil
}

func (s *Service) OpenSetupExperience(ctx context.Context) (ActionResult, error) {
	if _, err := s.AgentSetupView(ctx); err != nil {
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
	if err := s.publisher.SyncSupportConversationContext(ctx, conversationID, supportContext.ToConversationContext()); err != nil {
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

func (s *Service) buildSupportContext() SupportContext {
	context := SupportContext{
		LocalUsername: currentLocalUsername(),
		AgentVersion:  s.agentVersion,
	}

	if identity, err := loadJSON[domain.DeviceIdentity](filepath.Join(s.stateDir, "identity.json")); err == nil {
		context.DeviceID = strings.TrimSpace(identity.DeviceID)
		context.Hostname = strings.TrimSpace(identity.Hostname)
		context.OS = strings.TrimSpace(identity.OS)
	}

	if remoteState, err := s.loadPersistedRemoteState(); err == nil {
		context.CompanyID = strings.TrimSpace(remoteState.CompanyID)
		context.CompanyDisplayName = strings.TrimSpace(remoteState.CompanyName)
		context.HostID = strings.TrimSpace(remoteState.HostID)
		context.HostAlias = strings.TrimSpace(remoteState.Alias)
		context.PendingLinkReady = remoteState.PendingLinkReady
		context.RustDeskID = strings.TrimSpace(remoteState.RustDeskID)
		context.MachineName = strings.TrimSpace(remoteState.MachineName)
		context.LastSyncAt = remoteState.LastSyncAt
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

func resolveDisplayedRustDeskPassword(remoteState domain.PersistedRemoteState) string {
	// Prefere a senha em tempo de execução (lida do RustDesk2.toml a cada sync)
	// sobre a senha padrão do bootstrap, que é estática.
	runtimePassword := strings.TrimSpace(remoteState.RuntimePassword)
	defaultPassword := strings.TrimSpace(remoteState.DefaultPassword)
	if defaultPassword != "" && strings.EqualFold(runtimePassword, defaultPassword) {
		return ""
	}
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
	// O contato representa a instalação (máquina), não o usuário logado.
	// hostAlias é o nome legível definido no portal (ex: "Recepção - Filial SP").
	switch {
	case context.HostAlias != "":
		return context.HostAlias
	case context.MachineName != "":
		return context.MachineName
	case context.Hostname != "":
		return context.Hostname
	default:
		return "Cliente Trilink"
	}
}

func buildContextDescription(context SupportContext) string {
	parts := []string{"Atendimento iniciado pelo agente da Trilink."}
	if context.RemoteStatusText != "" {
		parts = append(parts, "Estado remoto: "+context.RemoteStatusText+".")
	}
	if context.LocalUsername != "" {
		parts = append(parts, "Usuario logado: "+context.LocalUsername+".")
	}
	return strings.Join(parts, " ")
}

func resolveRemoteStatus(context SupportContext) (string, string) {
	switch {
	case context.RustDeskID != "" && (context.HostID != "" || context.HostAlias != ""):
		return "ready", "identificacao remota pronta"
	case context.PendingLinkReady && context.RustDeskID != "":
		return "pending", "instalacao tecnica concluida; aguardando vinculo empresarial"
	case context.RustDeskID != "":
		return "pending", "RustDesk detectado; configuracao tecnica em andamento"
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

func (s *Service) resolveRustDeskExecutable() string {
	if remoteState, err := s.loadPersistedRemoteState(); err == nil {
		if candidate := strings.TrimSpace(remoteState.RustDeskExecutable); candidate != "" {
			if _, err := os.Stat(candidate); err == nil {
				return candidate
			}
		}
	}

	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles"), "RustDesk", "rustdesk.exe"),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "RustDesk", "rustdesk.exe"),
		`C:\Program Files\RustDesk\rustdesk.exe`,
		`C:\Program Files (x86)\RustDesk\rustdesk.exe`,
	}

	for _, candidate := range candidates {
		if strings.TrimSpace(candidate) == "" {
			continue
		}
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}

	return ""
}

func isTrustedRustDeskExecutable(path string) bool {
	base := strings.ToLower(strings.TrimSpace(filepath.Base(path)))
	switch base {
	case "rustdesk", "rustdesk.exe":
		return true
	default:
		return false
	}
}

func isRustDeskProcessRunning() bool {
	switch runtime.GOOS {
	case "windows":
		output, err := exec.Command("tasklist", "/FI", "IMAGENAME eq rustdesk.exe").CombinedOutput()
		if err != nil {
			return false
		}
		return strings.Contains(strings.ToLower(string(output)), "rustdesk.exe")
	case "darwin", "linux":
		return exec.Command("pgrep", "-f", "rustdesk").Run() == nil
	default:
		return false
	}
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

func (s *Service) loadPersistedRemoteState() (domain.PersistedRemoteState, error) {
	store := storage.NewProtectedStateStore(storage.NewLocalStateStore(s.stateDir, uiStateStorageLogger{}))
	var value domain.PersistedRemoteState
	if err := store.LoadJSON(context.Background(), "remote_state.json", &value); err != nil {
		return value, err
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

func deriveDiscoverError(st persistedRemoteState, result *domain.ApplyResult) string {
	if detail := deriveStructuredRemoteError(st, "discover"); detail != "" {
		return detail
	}
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
		return describeBootstrapFlow(st.LastBootstrapFlow)
	}
	if result != nil && strings.TrimSpace(result.Message) != "" {
		return result.Message
	}
	return "Aguardando descoberta inicial da maquina no portal."
}

func deriveRustDeskInstallError(st persistedRemoteState, result *domain.ApplyResult) string {
	if detail := deriveStructuredRemoteError(st, "bootstrap", "sync"); detail != "" &&
		(strings.Contains(strings.ToLower(detail), "rustdesk") || strings.Contains(strings.ToLower(detail), "installer")) {
		return detail
	}
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
	case st.PendingLinkReady && st.RustDeskID != "":
		return "RustDesk preparado nesta maquina. O portal ainda precisa apenas concluir o vinculo empresarial."
	case st.LastBootstrapFlow == "pending_link" && st.HostID == "" && st.CompanyID == "":
		return "A descoberta ja foi registrada. O bootstrap tecnico do RustDesk sera executado nesta mesma instalacao."
	case st.RustDeskID != "":
		return "RustDesk detectado no host: " + st.RustDeskID + ". Se necessario, o agente reaplica a configuracao desta instalacao."
	case st.RustDeskExecutable != "":
		return "Cliente RustDesk localizado. Aguardando convergencia e configuracao."
	default:
		return "Aguardando instalacao ou configuracao do RustDesk."
	}
}

func deriveLinkDetail(st persistedRemoteState) string {
	switch {
	case st.CompanyID != "" && st.CompanyName != "":
		return "Empresa vinculada: " + st.CompanyName
	case st.PendingLinkReady:
		return "Instalacao concluida. Falta apenas associar esta maquina a uma empresa no portal."
	case st.HostID != "":
		return "Host remoto criado e aguardando vinculo empresarial."
	case st.LastBootstrapFlow == "pending_link":
		return "Maquina descoberta. O portal ainda precisa concluir o vinculo empresarial."
	default:
		return "Aguardando vinculacao da maquina a um host/empresa no portal."
	}
}

func deriveSyncError(st persistedRemoteState, result *domain.ApplyResult) string {
	if detail := deriveStructuredRemoteError(st, "bootstrap", "sync"); detail != "" {
		return detail
	}
	if result == nil {
		return ""
	}
	value := strings.ToLower(firstNonEmpty(result.Error, result.Message))
	if strings.Contains(value, "context canceled") || strings.Contains(value, "deadline exceeded") || strings.Contains(value, "cycle canceled") {
		return ""
	}
	if strings.Contains(value, "sync failed") || strings.Contains(value, "bootstrap failed") {
		return firstNonEmpty(result.Error, result.Message)
	}
	return ""
}

func deriveSyncDetail(st persistedRemoteState, current domain.CurrentState) string {
	switch {
	case isRemoteOperational(st, current):
		return "Configuracao remota sincronizada e operacional."
	case st.PendingLinkReady:
		return "A comunicacao tecnica foi preparada. O sync autenticado sera liberado apos o vinculo empresarial."
	case st.AgentToken != "":
		return "Credencial remota emitida; aguardando sincronizacao final."
	default:
		return "Aguardando bootstrap e sync autenticado do remoto."
	}
}

func isPendingLinkReady(st persistedRemoteState) bool {
	return st.PendingLinkReady && st.RustDeskID != "" && !st.RebootstrapRequired
}

func isRemoteOperational(st persistedRemoteState, current domain.CurrentState) bool {
	return !st.LastSyncAt.IsZero() && !st.RebootstrapRequired && current.Remote.Status == domain.ModuleStatusReady
}

func deriveStructuredRemoteError(st persistedRemoteState, phases ...string) string {
	if strings.TrimSpace(st.LastErrorMessage) == "" {
		return ""
	}
	for _, phase := range phases {
		if strings.EqualFold(strings.TrimSpace(st.LastErrorPhase), strings.TrimSpace(phase)) {
			return buildRemoteErrorDetail(st)
		}
	}
	return ""
}

func describeBootstrapFlow(flow string) string {
	switch strings.TrimSpace(strings.ToLower(flow)) {
	case "pending_link":
		return "Maquina descoberta. O bootstrap tecnico pode seguir antes do vinculo."
	case "pending_link_bootstrapped":
		return "Instalacao tecnica concluida. Aguardando vinculo empresarial no portal."
	case "host_bootstrap_required":
		return "Host vinculado sem agentToken ativo. Bootstrap autenticado necessario."
	case "token_invalid":
		return "Credencial remota invalida ou expirada. Novo bootstrap necessario."
	case "linked_host_detected":
		return "Host vinculado detectado no portal."
	default:
		return "Fluxo remoto atual: " + flow
	}
}

func buildRemoteErrorDetail(st persistedRemoteState) string {
	message := strings.TrimSpace(st.LastErrorMessage)
	if message == "" {
		return ""
	}
	if !st.NextRetryAt.IsZero() {
		return fmt.Sprintf("%s Nova tentativa prevista em %s.", message, st.NextRetryAt.Local().Format("15:04:05"))
	}
	return message
}
