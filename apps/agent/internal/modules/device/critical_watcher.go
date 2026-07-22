package device

import (
	"context"
	"time"
)

const criticalWatchInterval = 10 * time.Second

func (m *Module) watchCriticalServices(ctx context.Context) {
	ticker := time.NewTicker(criticalWatchInterval)
	defer ticker.Stop()
	var previous map[string]string

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.watchMu.RLock()
			enabled := m.watchOn
			trigger := m.trigger
			m.watchMu.RUnlock()
			if !enabled {
				continue
			}

			m.collectMu.Lock()
			m.mu.RLock()
			topology := m.lastVersions
			m.mu.RUnlock()
			snapshot, err := m.collector.CollectServices(topology)
			m.collectMu.Unlock()
			if err != nil {
				m.logger.Warn("device: critical watcher failed", "error", err)
				continue
			}

			current := criticalServiceStates(snapshot)
			if previous == nil {
				previous = current
				continue
			}
			if !criticalServiceStateChanged(previous, current) {
				continue
			}

			now := time.Now().UTC()
			m.mu.Lock()
			m.lastServices = snapshot
			m.mu.Unlock()
			m.observeSnapshot(ctx, "critical_services", snapshot, now)
			m.logger.Warn("device: critical service state changed", "previous", previous, "current", current)
			previous = current
			if trigger != nil {
				trigger()
			}
		}
	}
}

func criticalServiceStates(snapshot *SysproProcessSnapshot) map[string]string {
	states := map[string]string{}
	if snapshot == nil {
		return states
	}
	for _, service := range snapshot.Services {
		states[service.Name+":"+service.InstanceID] = service.Status
	}
	return states
}

func criticalServiceStateChanged(previous, current map[string]string) bool {
	if len(previous) != len(current) {
		return true
	}
	for key, status := range current {
		if previous[key] != status {
			return true
		}
	}
	return false
}

// watchCriticalProcesses catches restarts that leave the SCM service state
// unchanged. The platform implementation uses a native process snapshot, so
// the Windows service does not depend on PowerShell or WMI in Session 0.
func (m *Module) watchCriticalProcesses(ctx context.Context) {
	ticker := time.NewTicker(criticalWatchInterval)
	defer ticker.Stop()
	var previous map[string]string

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.watchMu.RLock()
			enabled := m.watchOn
			trigger := m.trigger
			m.watchMu.RUnlock()
			if !enabled {
				continue
			}
			current, err := criticalProcessStates()
			if err != nil {
				m.logger.Warn("device: critical process watcher failed", "error", err)
				continue
			}
			if previous == nil {
				previous = current
				continue
			}
			if !criticalProcessStateChanged(previous, current) {
				continue
			}

			// Persist the related service PID/state using the existing portal
			// contract before requesting an immediate remote reconciliation.
			m.refreshCriticalServices(ctx)
			m.logger.Warn("device: critical process state changed", "previous", previous, "current", current)
			previous = current
			if trigger != nil {
				trigger()
			}
		}
	}
}

func (m *Module) refreshCriticalServices(ctx context.Context) {
	m.collectMu.Lock()
	m.mu.RLock()
	topology := m.lastVersions
	m.mu.RUnlock()
	snapshot, err := m.collector.CollectServices(topology)
	m.collectMu.Unlock()
	if err != nil {
		m.logger.Warn("device: refresh services after process transition failed", "error", err)
		return
	}
	now := time.Now().UTC()
	m.mu.Lock()
	m.lastServices = snapshot
	m.mu.Unlock()
	m.observeSnapshot(ctx, "critical_services", snapshot, now)
}

func criticalProcessStateChanged(previous, current map[string]string) bool {
	if len(previous) != len(current) {
		return true
	}
	for name, processIDs := range current {
		if previous[name] != processIDs {
			return true
		}
	}
	return false
}
