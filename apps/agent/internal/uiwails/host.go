package uiwails

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"trilink/agent/internal/contracts/agentui"
	uistate "trilink/agent/internal/core/ui_state"
	"trilink/agent/internal/infra/ipc"

	wruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	eventNavigate      = "agent:navigate"
	eventSetupView     = "agent:setup-view"
	eventSummary       = "agent:summary"
	eventNotifications = "agent:notifications"
	eventSupportView   = "agent:support-view"
)

type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
}

type summaryClient interface {
	GetSummary(ctx context.Context) (agentui.Summary, error)
}

type notificationsClient interface {
	ListNotifications(ctx context.Context) ([]agentui.Notification, error)
}

type agentSetupViewClient interface {
	GetAgentSetupView(ctx context.Context) (agentui.AgentSetupView, error)
}

type agentSupportViewClient interface {
	GetAgentSupportView(ctx context.Context) (agentui.AgentSupportView, error)
}

type actionsClient interface {
	OpenSupportConversation(ctx context.Context) (agentui.ActionResult, error)
	OpenSetupExperience(ctx context.Context) (agentui.ActionResult, error)
	OpenRemoteClient(ctx context.Context) (agentui.OpenRemoteAccessResult, error)
	SyncSupportConversationContext(ctx context.Context, conversationID string) (agentui.SupportContextSyncResult, error)
}

type localNotificationsProvider interface {
	ListNotifications(ctx context.Context) ([]uistate.Notification, error)
}

type localActionsProvider interface {
	OpenSupportConversation(ctx context.Context) (uistate.ActionResult, error)
	OpenSetupExperience(ctx context.Context) (uistate.ActionResult, error)
	OpenRemoteClient(ctx context.Context) (uistate.OpenRemoteAccessResult, error)
	SyncSupportConversationContext(ctx context.Context, conversationID string) (uistate.SupportContextSyncResult, error)
}

type localAgentSetupViewProvider interface {
	AgentSetupView(ctx context.Context) (uistate.AgentSetupView, error)
}

type localAgentSupportViewProvider interface {
	AgentSupportView(ctx context.Context) (uistate.AgentSupportView, error)
}

type localSummaryProvider interface {
	Snapshot(ctx context.Context) (uistate.Summary, error)
}

type localStateProvider interface {
	localSummaryProvider
	localNotificationsProvider
	localActionsProvider
	localAgentSetupViewProvider
	localAgentSupportViewProvider
}

type Host struct {
	logger     Logger
	ipc        *ipc.Client
	localState localStateProvider

	mu            sync.Mutex
	runtimeCtx    context.Context
	currentTarget string
	started       bool
	showOnStartup bool // set to true only when explicitly requested before Wails is ready
}

func NewHost(logger Logger, ipcClient *ipc.Client, localState localStateProvider) *Host {
	return &Host{
		logger:        logger,
		ipc:           ipcClient,
		localState:    localState,
		currentTarget: uistate.TargetSetupExperience,
		showOnStartup: false, // start hidden in tray; ui.Service decides when to open
	}
}

func (h *Host) ConfigureStartup(target string, show bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.currentTarget = normalizeTarget(target)
	h.showOnStartup = show
}

func (h *Host) Open(ctx context.Context, target string) error {
	_ = ctx

	target = normalizeTarget(target)
	h.mu.Lock()
	h.currentTarget = target
	h.showOnStartup = true // ensure it shows when Startup runs if not yet ready
	runtimeCtx := h.runtimeCtx
	started := h.started
	h.mu.Unlock()

	if started && runtimeCtx != nil {
		h.showTarget(runtimeCtx, target)
	}
	return nil
}

func (h *Host) RevealCurrent() {
	h.mu.Lock()
	runtimeCtx := h.runtimeCtx
	started := h.started
	target := h.currentTarget
	h.showOnStartup = true
	h.mu.Unlock()

	if started && runtimeCtx != nil {
		h.showTarget(runtimeCtx, target)
	}
}

func (h *Host) HandleSecondInstanceLaunch(args []string, workingDirectory string) {
	backgroundLaunch := hasBackgroundLaunchArg(args)
	h.logger.Info(
		"agent ui second instance intercepted",
		"args", args,
		"working_directory", workingDirectory,
		"background", backgroundLaunch,
	)
	if backgroundLaunch {
		return
	}

	h.RevealCurrent()
}

func (h *Host) Quit() {
	h.mu.Lock()
	runtimeCtx := h.runtimeCtx
	h.mu.Unlock()
	if runtimeCtx != nil {
		wruntime.Quit(runtimeCtx)
	}
}

func (h *Host) showTarget(runtimeCtx context.Context, target string) {
	target = normalizeTarget(target)
	width, height, title := targetWindow(target)

	wruntime.WindowSetSize(runtimeCtx, width, height)
	wruntime.WindowSetTitle(runtimeCtx, title)
	wruntime.WindowUnminimise(runtimeCtx)
	wruntime.WindowShow(runtimeCtx)
	wruntime.WindowCenter(runtimeCtx)
	wruntime.EventsEmit(runtimeCtx, eventNavigate, map[string]string{"target": target})

	h.logger.Info("opening ui target with wails", "target", target, "title", title)
}

func (h *Host) Startup(runtimeCtx context.Context, api *API) {
	h.mu.Lock()
	h.runtimeCtx = runtimeCtx
	h.started = true
	target := h.currentTarget
	show := h.showOnStartup
	h.mu.Unlock()

	// Only show if explicitly requested (e.g. via Open() before Wails was ready).
	// The ui.Service decides whether to open based on setup completion state.
	if show {
		h.showTarget(runtimeCtx, target)
	}
	api.startPushLoops(runtimeCtx)
}

func (h *Host) Shutdown() {
	h.mu.Lock()
	h.runtimeCtx = nil
	h.started = false
	h.mu.Unlock()
}

func normalizeTarget(target string) string {
	switch strings.TrimSpace(strings.ToLower(target)) {
	case "", strings.ToLower(uistate.TargetSetupExperience), strings.ToLower(filepath.Base(uistate.TargetSetupExperience)):
		return uistate.TargetSetupExperience
	case strings.ToLower(uistate.TargetSupportConversation), strings.ToLower(filepath.Base(uistate.TargetSupportConversation)):
		return uistate.TargetSupportConversation
	default:
		if strings.Contains(strings.ToLower(target), "support") {
			return uistate.TargetSupportConversation
		}
		return uistate.TargetSetupExperience
	}
}

func hasBackgroundLaunchArg(args []string) bool {
	for _, arg := range args {
		switch strings.TrimSpace(strings.ToLower(arg)) {
		case "--background", "/background", "background":
			return true
		}
	}
	return false
}

func targetWindow(target string) (int, int, string) {
	switch normalizeTarget(target) {
	case uistate.TargetSupportConversation:
		return 420, 620, "Trilink Agent"
	default:
		return 430, 640, "Trilink Agent"
	}
}

type API struct {
	logger        Logger
	host          *Host
	setup         agentSetupViewClient
	summary       summaryClient
	notifications notificationsClient
	support       agentSupportViewClient
	actions       actionsClient
	localState    localStateProvider

	pushOnce sync.Once
}

func NewAPI(logger Logger, host *Host, ipcClient *ipc.Client, localState localStateProvider) *API {
	return &API{
		logger:        logger,
		host:          host,
		setup:         ipcClient,
		summary:       ipcClient,
		notifications: ipcClient,
		support:       ipcClient,
		actions:       ipcClient,
		localState:    localState,
	}
}

func (a *API) GetAgentSetupView() (uistate.AgentSetupView, error) {
	view, err := a.setup.GetAgentSetupView(context.Background())
	if err == nil {
		return agentui.ToUIAgentSetupView(view), nil
	}

	a.logger.Info("wails setup view fallback to local state", "error", err)
	if a.localState == nil {
		return uistate.AgentSetupView{}, err
	}

	fallback, fallbackErr := a.localState.AgentSetupView(context.Background())
	if fallbackErr != nil {
		return uistate.AgentSetupView{}, err
	}

	if !fallback.Complete && fallback.ProgressPct == 0 && strings.TrimSpace(fallback.LastError) == "" {
		fallback.Stage = "Servico local indisponivel"
		fallback.Summary = "A interface nao conseguiu falar com o agent-service. Verifique se o servico Windows esta em execucao."
		fallback.LastError = fmt.Sprintf("Falha de IPC: %v", err)
	}

	return fallback, nil
}

func (a *API) GetAgentSupportView() (uistate.AgentSupportView, error) {
	view, err := a.support.GetAgentSupportView(context.Background())
	if err == nil {
		return agentui.ToUIAgentSupportView(view), nil
	}

	a.logger.Info("wails support view fallback to local state", "error", err)
	if a.localState == nil {
		return uistate.AgentSupportView{}, err
	}

	fallback, fallbackErr := a.localState.AgentSupportView(context.Background())
	if fallbackErr != nil {
		return uistate.AgentSupportView{}, err
	}

	return fallback, nil
}

func (a *API) GetSummary() (uistate.Summary, error) {
	summary, err := a.summary.GetSummary(context.Background())
	if err == nil {
		return agentui.ToUISummary(summary), nil
	}

	a.logger.Info("wails summary fallback to local state", "error", err)
	if a.localState == nil {
		return uistate.Summary{}, err
	}

	fallback, fallbackErr := a.localState.Snapshot(context.Background())
	if fallbackErr != nil {
		return uistate.Summary{}, err
	}
	fallback.ServiceStatus = "service_unavailable"
	return fallback, nil
}

func (a *API) ListNotifications() ([]uistate.Notification, error) {
	notifications, err := a.notifications.ListNotifications(context.Background())
	if err == nil {
		return agentui.ToUINotifications(notifications), nil
	}

	a.logger.Info("wails notifications fallback to local state", "error", err)
	if a.localState == nil {
		return nil, err
	}

	fallback, fallbackErr := a.localState.ListNotifications(context.Background())
	if fallbackErr != nil {
		return nil, err
	}

	return append([]uistate.Notification{{
		ID:         "agent-service-unavailable",
		Title:      "Servico local indisponivel",
		Message:    "A interface nao conseguiu se conectar ao agent-service.",
		Severity:   "warn",
		OccurredAt: time.Now().UTC(),
	}}, fallback...), nil
}

func (a *API) GetCurrentTarget() string {
	a.host.mu.Lock()
	defer a.host.mu.Unlock()
	return normalizeTarget(a.host.currentTarget)
}

func (a *API) OpenSupportConversation() (uistate.ActionResult, error) {
	result, err := a.actions.OpenSupportConversation(context.Background())
	uiResult := agentui.ToUIActionResult(result)
	if err != nil {
		a.logger.Info("wails support action fallback to local state", "error", err)
		if a.localState == nil {
			return uiResult, err
		}
		fallback, fallbackErr := a.localState.OpenSupportConversation(context.Background())
		if fallbackErr != nil {
			return uiResult, err
		}
		uiResult = fallback
	}
	if uiResult.Target != "" {
		if navErr := a.host.Open(context.Background(), uiResult.Target); navErr != nil {
			a.logger.Info("navigate to support conversation failed", "target", uiResult.Target, "error", navErr)
		}
	}
	return uiResult, nil
}

func (a *API) OpenSetupExperience() (uistate.ActionResult, error) {
	result, err := a.actions.OpenSetupExperience(context.Background())
	uiResult := agentui.ToUIActionResult(result)
	if err != nil {
		a.logger.Info("wails setup action fallback to local state", "error", err)
		if a.localState == nil {
			return uiResult, err
		}
		fallback, fallbackErr := a.localState.OpenSetupExperience(context.Background())
		if fallbackErr != nil {
			return uiResult, err
		}
		uiResult = fallback
	}
	if uiResult.Target != "" {
		if navErr := a.host.Open(context.Background(), uiResult.Target); navErr != nil {
			a.logger.Info("navigate to setup experience failed", "target", uiResult.Target, "error", navErr)
		}
	}
	return uiResult, nil
}

func (a *API) OpenRemoteClient() (uistate.OpenRemoteAccessResult, error) {
	result, err := a.actions.OpenRemoteClient(context.Background())
	if err == nil {
		return agentui.ToUIOpenRemoteAccessResult(result), nil
	}

	a.logger.Info("wails remote open fallback to local state", "error", err)
	if a.localState == nil {
		return agentui.ToUIOpenRemoteAccessResult(result), err
	}

	fallback, fallbackErr := a.localState.OpenRemoteClient(context.Background())
	if fallbackErr != nil {
		return agentui.ToUIOpenRemoteAccessResult(result), err
	}

	return fallback, nil
}

func (a *API) SyncSupportConversationContext(conversationID string) (uistate.SupportContextSyncResult, error) {
	result, err := a.actions.SyncSupportConversationContext(context.Background(), conversationID)
	if err == nil {
		return agentui.ToUISupportContextSyncResult(result), nil
	}

	a.logger.Info("wails support context sync fallback to local state", "error", err)
	if a.localState == nil {
		return agentui.ToUISupportContextSyncResult(result), err
	}

	fallback, fallbackErr := a.localState.SyncSupportConversationContext(context.Background(), conversationID)
	if fallbackErr != nil {
		return agentui.ToUISupportContextSyncResult(result), err
	}

	return fallback, nil
}

func (a *API) startPushLoops(runtimeCtx context.Context) {
	a.pushOnce.Do(func() {
		go a.emitSetupViewLoop(runtimeCtx)
		go a.emitSummaryLoop(runtimeCtx)
		go a.emitNotificationsLoop(runtimeCtx)
		go a.emitSupportViewLoop(runtimeCtx)
	})
}

func (a *API) emitSetupViewLoop(runtimeCtx context.Context) {
	ticker := time.NewTicker(3 * time.Second)
	defer ticker.Stop()

	for {
		view, err := a.GetAgentSetupView()
		if err != nil {
			a.logger.Info("wails setup view push failed", "error", err)
		} else {
			wruntime.EventsEmit(runtimeCtx, eventSetupView, view)
		}

		select {
		case <-runtimeCtx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (a *API) emitSummaryLoop(runtimeCtx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		summary, err := a.GetSummary()
		if err != nil {
			a.logger.Info("wails summary push failed", "error", err)
		} else {
			wruntime.EventsEmit(runtimeCtx, eventSummary, summary)
		}

		select {
		case <-runtimeCtx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (a *API) emitNotificationsLoop(runtimeCtx context.Context) {
	ticker := time.NewTicker(45 * time.Second)
	defer ticker.Stop()

	for {
		notifications, err := a.ListNotifications()
		if err != nil {
			a.logger.Info("wails notifications push failed", "error", err)
		} else {
			wruntime.EventsEmit(runtimeCtx, eventNotifications, notifications)
		}

		select {
		case <-runtimeCtx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (a *API) emitSupportViewLoop(runtimeCtx context.Context) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()

	for {
		view, err := a.GetAgentSupportView()
		if err != nil {
			a.logger.Info("wails support view push failed", "error", err)
		} else {
			wruntime.EventsEmit(runtimeCtx, eventSupportView, view)
		}

		select {
		case <-runtimeCtx.Done():
			return
		case <-ticker.C:
		}
	}
}
