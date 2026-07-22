package device

import (
	"context"
	"time"
)

const eventLogWatchInterval = 30 * time.Second

func (m *Module) watchWindowsEventLog(ctx context.Context) {
	ticker := time.NewTicker(eventLogWatchInterval)
	defer ticker.Stop()
	initialized := false
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			m.watchMu.RLock()
			enabled, trigger := m.watchOn, m.trigger
			m.watchMu.RUnlock()
			if !enabled {
				continue
			}
			events, err := collectCriticalWindowsEvents(ctx)
			if err != nil {
				m.logger.Warn("device: event log watcher failed", "error", err)
				continue
			}
			if !initialized {
				_ = m.events.seed(ctx, events)
				initialized = true
				continue
			}
			added, err := m.events.observe(ctx, events)
			if err != nil {
				m.logger.Warn("device: persist critical events failed", "error", err)
				continue
			}
			if len(added) > 0 && trigger != nil {
				m.logger.Warn("device: critical Windows events observed", "count", len(added))
				trigger()
			}
		}
	}
}
