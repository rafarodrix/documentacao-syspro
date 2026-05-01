//go:build windows

package winsvc

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

const (
	Name        = "TrillinkAgent"
	DisplayName = "Trilink Agent"
	Description = "Gerencia instalacao e monitoramento remoto de dispositivos Trilink"
)

type handler struct {
	run func(ctx context.Context) error
}

func (h *handler) Execute(_ []string, r <-chan svc.ChangeRequest, changes chan<- svc.Status) (bool, uint32) {
	const accepted = svc.AcceptStop | svc.AcceptShutdown
	changes <- svc.Status{State: svc.StartPending}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	done := make(chan error, 1)
	go func() { done <- h.run(ctx) }()

	changes <- svc.Status{State: svc.Running, Accepts: accepted}

	for {
		select {
		case c := <-r:
			switch c.Cmd {
			case svc.Stop, svc.Shutdown:
				changes <- svc.Status{State: svc.StopPending}
				cancel()
				select {
				case <-done:
				case <-time.After(15 * time.Second):
				}
				return false, 0
			}
		case <-done:
			return false, 0
		}
	}
}

// IsWindowsService reports whether the current process was invoked by SCM.
func IsWindowsService() (bool, error) {
	return svc.IsWindowsService()
}

// Run starts the SCM service loop. The agent logic runs inside run(ctx).
func Run(run func(ctx context.Context) error) error {
	return svc.Run(Name, &handler{run: run})
}

// Install registers the agent as a Windows Service running as LocalSystem.
// Uses delayed auto-start so the agent only launches after boot stabilizes
// (network, DNS and dependent services are ready).
// Configures three-tier recovery: restart after 5s, 30s, then 5min on any failure.
func Install(exePath string) error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	if s, err := m.OpenService(Name); err == nil {
		s.Close()
		return fmt.Errorf("service %q already exists; run 'uninstall' first", Name)
	}

	s, err := m.CreateService(Name, exePath, mgr.Config{
		StartType:        mgr.StartAutomatic,
		DelayedAutoStart: true,
		DisplayName:      DisplayName,
		Description:      Description,
		ServiceStartName: "LocalSystem",
		Dependencies:     []string{"Tcpip"},
	}, "run")
	if err != nil {
		return fmt.Errorf("create service: %w", err)
	}
	defer s.Close()

	// Restart on crash: 5s → 30s → 5min. Reset counters after 24h of clean uptime.
	recoveryActions := []mgr.RecoveryAction{
		{Type: mgr.ServiceRestart, Delay: 5 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 30 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 5 * time.Minute},
	}
	if err := s.SetRecoveryActions(recoveryActions, 86400); err != nil {
		return fmt.Errorf("set recovery actions: %w", err)
	}
	if err := s.SetRecoveryActionsOnNonCrashFailures(true); err != nil {
		return fmt.Errorf("set recovery on non-crash failures: %w", err)
	}

	return nil
}

// Uninstall stops and removes the Windows Service from SCM.
// Polls until the service reaches Stopped state (up to 15s) before deleting.
func Uninstall() error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(Name)
	if err != nil {
		return fmt.Errorf("service %q not found: %w", Name, err)
	}
	defer s.Close()

	// Request stop; ignore error if already stopped.
	_, _ = s.Control(svc.Stop)

	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		q, qErr := s.Query()
		if qErr != nil || q.State == svc.Stopped {
			break
		}
		time.Sleep(500 * time.Millisecond)
	}

	return s.Delete()
}

// Start triggers SCM to start the service.
// Returns nil without error if the service is already running.
func Start() error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(Name)
	if err != nil {
		return fmt.Errorf("service %q not found: %w", Name, err)
	}
	defer s.Close()

	q, err := s.Query()
	if err != nil {
		return fmt.Errorf("query service state: %w", err)
	}
	if q.State == svc.Running || q.State == svc.StartPending {
		return nil
	}

	return s.Start()
}

// Stop signals SCM to stop the service and waits up to 15s for it to reach
// Stopped state.
func Stop() error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(Name)
	if err != nil {
		return fmt.Errorf("service %q not found: %w", Name, err)
	}
	defer s.Close()

	q, qErr := s.Query()
	if qErr == nil && (q.State == svc.Stopped || q.State == svc.StopPending) {
		return nil
	}

	if _, err := s.Control(svc.Stop); err != nil {
		return fmt.Errorf("send stop control: %w", err)
	}

	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		time.Sleep(500 * time.Millisecond)
		q, qErr := s.Query()
		if qErr != nil || q.State == svc.Stopped {
			return nil
		}
	}

	return fmt.Errorf("service did not stop within 15s")
}
