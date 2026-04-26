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
		DisplayName:      DisplayName,
		Description:      Description,
		ServiceStartName: "LocalSystem",
		Dependencies:     []string{"Tcpip"},
	}, "run")
	if err != nil {
		return fmt.Errorf("create service: %w", err)
	}
	s.Close()
	return nil
}

// Uninstall stops and removes the Windows Service from SCM.
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

	_, _ = s.Control(svc.Stop)
	time.Sleep(3 * time.Second)

	return s.Delete()
}

// Start triggers SCM to start the service.
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

	return s.Start()
}

// Stop signals SCM to stop the service.
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

	_, err = s.Control(svc.Stop)
	return err
}
