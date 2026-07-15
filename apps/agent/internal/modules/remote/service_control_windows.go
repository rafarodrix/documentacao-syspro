//go:build windows

package remote

import (
	"fmt"
	"time"

	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

type windowsNamedServiceController struct{}

func defaultNamedServiceController() namedServiceController {
	return windowsNamedServiceController{}
}

func (windowsNamedServiceController) Start(name string) error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(name)
	if err != nil {
		return fmt.Errorf("service %q not found: %w", name, err)
	}
	defer s.Close()

	status, err := s.Query()
	if err != nil {
		return fmt.Errorf("query service state: %w", err)
	}
	if status.State == svc.Running || status.State == svc.StartPending {
		return nil
	}

	if err := s.Start(); err != nil {
		return fmt.Errorf("start service %q: %w", name, err)
	}
	return nil
}

func (windowsNamedServiceController) Stop(name string) error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(name)
	if err != nil {
		return fmt.Errorf("service %q not found: %w", name, err)
	}
	defer s.Close()

	status, err := s.Query()
	if err == nil && (status.State == svc.Stopped || status.State == svc.StopPending) {
		return nil
	}

	if _, err := s.Control(svc.Stop); err != nil {
		return fmt.Errorf("send stop control for %q: %w", name, err)
	}

	deadline := time.Now().Add(15 * time.Second)
	for time.Now().Before(deadline) {
		time.Sleep(500 * time.Millisecond)
		status, queryErr := s.Query()
		if queryErr != nil || status.State == svc.Stopped {
			return nil
		}
	}

	return fmt.Errorf("service %q did not stop within 15s", name)
}

func (c windowsNamedServiceController) Restart(name string) error {
	if err := c.Stop(name); err != nil {
		return err
	}
	return c.Start(name)
}
