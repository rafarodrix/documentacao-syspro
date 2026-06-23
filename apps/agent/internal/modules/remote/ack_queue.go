package remote

import (
	"context"
	"errors"
	"time"

	"trilink/agent/internal/domain"
	infrahttp "trilink/agent/internal/infra/http"
)

const (
	pendingAckFile = "pending_ack_queue.json"
	maxQueueItems  = 20
)

type pendingAck struct {
	CommandID  string                     `json:"command_id"`
	AgentToken string                     `json:"agent_token"`
	Status     domain.RemoteAckStatus     `json:"status"`
	ReasonCode domain.RemoteAckReasonCode `json:"reason_code"`
	Message    string                     `json:"message"`
	Details    map[string]any             `json:"details,omitempty"`
	EnqueuedAt time.Time                  `json:"enqueued_at"`
	Attempts   int                        `json:"attempts"`
}

type flushStats struct {
	Sent      int
	Retained  int
	Discarded int
	Failed    int
	Pending   int
}

func (m *Module) flushPendingAcks(ctx context.Context, agentToken string) flushStats {
	queue := m.loadPendingAcks(ctx)
	if len(queue) == 0 {
		return flushStats{}
	}

	stats := flushStats{}
	remaining := make([]pendingAck, 0, len(queue))

	for _, item := range queue {
		token := firstNonEmpty(item.AgentToken, agentToken)
		if token == "" {
			stats.Discarded++
			continue
		}

		err := m.client.Ack(ctx, domain.RemoteAckRequest{
			AgentToken: token,
			CommandID:  item.CommandID,
			Status:     item.Status,
			ReasonCode: item.ReasonCode,
			Message:    item.Message,
			Details:    item.Details,
		})
		if err == nil {
			stats.Sent++
			continue
		}

		item.Attempts++
		item.AgentToken = token
		if shouldDiscardPendingAck(err) {
			stats.Discarded++
			m.logger.Warn("pending ack discarded", "command_id", item.CommandID, "attempts", item.Attempts, "error", err)
			continue
		}

		stats.Retained++
		stats.Failed++
		remaining = append(remaining, item)
		m.logger.Warn("pending ack retained for retry", "command_id", item.CommandID, "attempts", item.Attempts, "error", err)
	}

	stats.Pending = len(remaining)
	m.savePendingAcks(ctx, remaining)
	return stats
}

func (m *Module) enqueueAck(ctx context.Context, ack pendingAck) {
	queue := m.loadPendingAcks(ctx)
	queue = append(queue, ack)
	if len(queue) > maxQueueItems {
		dropped := queue[:len(queue)-maxQueueItems]
		for _, d := range dropped {
			m.logger.Warn("pending ack queue full, oldest entry discarded", "command_id", d.CommandID, "enqueued_at", d.EnqueuedAt)
		}
		queue = queue[len(queue)-maxQueueItems:]
	}
	m.savePendingAcks(ctx, queue)
}

func (m *Module) loadPendingAcks(ctx context.Context) []pendingAck {
	var queue []pendingAck
	if err := m.store.LoadJSON(ctx, pendingAckFile, &queue); err != nil {
		return nil
	}
	return queue
}

func (m *Module) savePendingAcks(ctx context.Context, queue []pendingAck) {
	if len(queue) == 0 {
		queue = []pendingAck{}
	}
	if err := m.store.SaveJSON(ctx, pendingAckFile, queue); err != nil {
		m.logger.Warn("pending ack queue save failed", "error", err)
	}
}

func shouldDiscardPendingAck(err error) bool {
	if err == nil {
		return false
	}
	if infrahttp.IsStatusError(err, 401, 403) {
		return true
	}
	var statusErr *infrahttp.HTTPStatusError
	if errors.As(err, &statusErr) {
		if statusErr.StatusCode == 429 || statusErr.StatusCode >= 500 {
			return false
		}
		return true
	}
	return false
}
