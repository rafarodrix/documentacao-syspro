package tray

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	uistate "trilink/agent/internal/core/ui_state"
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

// Service owns the user-visible tray host. On Windows it launches a lightweight
// NotifyIcon host via PowerShell and translates its menu clicks into actions.
type Service struct {
	logger     Logger
	stateDir   string
	actions    chan Action
	actionFile string
}

func NewService(logger Logger, stateDir string) *Service {
	return &Service{
		logger:     logger,
		stateDir:   stateDir,
		actions:    make(chan Action, 8),
		actionFile: filepath.Join(stateDir, "ui", "tray-actions.log"),
	}
}

func (s *Service) Run(ctx context.Context) error {
	s.logger.Info("tray service starting", "primary_action", ActionOpenSupport, "secondary_action", ActionOpenSetup)
	defer s.logger.Info("tray service stopped")

	if runtime.GOOS != "windows" {
		<-ctx.Done()
		return nil
	}

	if err := s.ensureTrayFiles(); err != nil {
		return err
	}

	cmd, err := s.startWindowsTrayHost(ctx)
	if err != nil {
		return err
	}

	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	pollTicker := time.NewTicker(750 * time.Millisecond)
	defer pollTicker.Stop()

	var offset int64
	for {
		select {
		case <-ctx.Done():
			if cmd.Process != nil {
				_ = cmd.Process.Kill()
			}
			return nil
		case err := <-done:
			if ctx.Err() != nil {
				return nil
			}
			return err
		case <-pollTicker.C:
			nextOffset, err := s.readPendingActions(offset)
			if err != nil {
				s.logger.Info("tray action poll failed", "error", err)
				continue
			}
			offset = nextOffset
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

func (s *Service) UpdateSummary(summary uistate.Summary) {
	s.logger.Info("tray summary updated", "service_status", summary.ServiceStatus, "user_visible", summary.UserVisible)
}

func (s *Service) ShowNotifications(notifications []uistate.Notification) {
	s.logger.Info("tray notifications updated", "count", len(notifications))
}

func (s *Service) SupportActionReady(result uistate.ActionResult) {
	s.logger.Info("tray support action ready", "accepted", result.Accepted, "target", result.Target)
}

func (s *Service) ensureTrayFiles() error {
	uiDir := filepath.Dir(s.actionFile)
	if err := os.MkdirAll(uiDir, 0o755); err != nil {
		return fmt.Errorf("create tray ui dir: %w", err)
	}

	if _, err := os.Stat(s.actionFile); err != nil {
		if os.IsNotExist(err) {
			if err := os.WriteFile(s.actionFile, nil, 0o644); err != nil {
				return fmt.Errorf("create tray action file: %w", err)
			}
			return nil
		}
		return fmt.Errorf("stat tray action file: %w", err)
	}

	return nil
}

func (s *Service) startWindowsTrayHost(ctx context.Context) (*exec.Cmd, error) {
	script := buildWindowsTrayScript(s.actionFile)
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-Command", script)
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start tray host: %w", err)
	}

	s.logger.Info("windows tray host started", "pid", cmd.Process.Pid)
	return cmd, nil
}

func (s *Service) readPendingActions(offset int64) (int64, error) {
	file, err := os.Open(s.actionFile)
	if err != nil {
		return offset, fmt.Errorf("open tray action file: %w", err)
	}
	defer file.Close()

	if _, err := file.Seek(offset, 0); err != nil {
		return offset, fmt.Errorf("seek tray action file: %w", err)
	}

	data, err := os.ReadFile(s.actionFile)
	if err != nil {
		return offset, fmt.Errorf("read tray action file: %w", err)
	}
	if int64(len(data)) < offset {
		return 0, nil
	}

	pending := string(data[offset:])
	if strings.TrimSpace(pending) == "" {
		return int64(len(data)), nil
	}

	for _, line := range strings.Split(pending, "\n") {
		action := strings.TrimSpace(line)
		if action == "" {
			continue
		}
		switch Action(action) {
		case ActionOpenSupport, ActionOpenSetup, ActionExit:
			s.Trigger(Action(action))
		default:
			s.logger.Info("tray emitted unknown action", "action", action)
		}
	}

	return int64(len(data)), nil
}

func buildWindowsTrayScript(actionFile string) string {
	actionFile = strings.ReplaceAll(actionFile, "'", "''")
	lines := []string{
		"Add-Type -AssemblyName System.Windows.Forms",
		"Add-Type -AssemblyName System.Drawing",
		fmt.Sprintf("$actionFile = '%s'", actionFile),
		"$notifyIcon = New-Object System.Windows.Forms.NotifyIcon",
		"$notifyIcon.Icon = [System.Drawing.SystemIcons]::Information",
		"$notifyIcon.Text = 'Trilink Support'",
		"$notifyIcon.Visible = $true",
		"$menu = New-Object System.Windows.Forms.ContextMenuStrip",
		"$supportItem = $menu.Items.Add('Abrir suporte')",
		"$setupItem = $menu.Items.Add('Acompanhar instalacao')",
		"$exitItem = $menu.Items.Add('Sair')",
		"$supportItem.Add_Click({ Add-Content -LiteralPath $actionFile -Value 'open_support' })",
		"$setupItem.Add_Click({ Add-Content -LiteralPath $actionFile -Value 'open_setup' })",
		"$exitItem.Add_Click({ Add-Content -LiteralPath $actionFile -Value 'exit'; $notifyIcon.Visible = $false; [System.Windows.Forms.Application]::Exit() })",
		"$notifyIcon.ContextMenuStrip = $menu",
		"$notifyIcon.Add_DoubleClick({ Add-Content -LiteralPath $actionFile -Value 'open_support' })",
		"[System.Windows.Forms.Application]::Run()",
	}
	return strings.Join(lines, "; ")
}
