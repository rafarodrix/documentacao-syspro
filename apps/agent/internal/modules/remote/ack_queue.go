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
	maxQueueItems  = 100
)

type pendingAck struct {
	CommandID        string                     `json:"command_id"`
	AgentToken       string                     `json:"agent_token"`
	Status           domain.RemoteAckStatus     `json:"status"`
	ReasonCode       domain.RemoteAckReasonCode `json:"reason_code"`
	Message          string                     `json:"message"`
	Details          map[string]any             `json:"details,omitempty"`
	EnqueuedAt       time.Time                  `json:"enqueued_at"`
	LastAttemptAt    time.Time                  `json:"last_attempt_at,omitempty"`
	NextAttemptAt    time.Time                  `json:"next_attempt_at,omitempty"`
	LastErrorCode    string                     `json:"last_error_code,omitempty"`
	LastErrorMessage string                     `json:"last_error_message,omitempty"`
	Attempts         int                        `json:"attempts"`
}

type flushStats struct {
	Sent      int
	Retained  int
	Discarded int
	Failed    int
	Deferred  int
	Pending   int
}

func (m *Module) flushPendingAcks(ctx context.Context, agentToken string) flushStats {
	queue := m.loadPendingAcks(ctx)
	if len(queue) == 0 {
		return flushStats{}
	}

	stats := flushStats{}
	remaining := make([]pendingAck, 0, len(queue))
	now := time.Now().UTC()

	for _, item := range queue {
		if !item.NextAttemptAt.IsZero() && item.NextAttemptAt.After(now) {
			stats.Deferred++
			stats.Retained++
			remaining = append(remaining, item)
			continue
		}

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

		failure := classifyRemoteFailure(err)
		item.Attempts++
		item.LastAttemptAt = now
		item.AgentToken = token
		item.LastErrorCode = failure.Code
		item.LastErrorMessage = failure.Message
		if shouldDiscardPendingAck(err) {
			stats.Discarded++
			m.logger.Warn("pending ack discarded",
				"command_id", item.CommandID,
				"attempts", item.Attempts,
				"error_code", failure.Code,
				"error", err,
			)
			continue
		}

		item.NextAttemptAt = now.Add(nextAckRetryDelay(item.Attempts))
		stats.Retained++
		stats.Failed++
		remaining = append(remaining, item)
		m.logger.Warn("pending ack retained for retry",
			"command_id", item.CommandID,
			"attempts", item.Attempts,
			"next_attempt_at", item.NextAttemptAt,
			"error_code", failure.Code,
			"error", err,
		)
	}

	stats.Pending = len(remaining)
	m.savePendingAcks(ctx, remaining)
	return stats
}

func (m *Module) enqueueAck(ctx context.Context, ack pendingAck) {
	queue := m.loadPendingAcks(ctx)
	replaced := false
	for i := range queue {
		if queue[i].CommandID != ack.CommandID {
			continue
		}
		ack.EnqueuedAt = firstNonZeroTime(queue[i].EnqueuedAt, ack.EnqueuedAt)
		ack.Attempts = queue[i].Attempts
		queue[i] = ack
		replaced = true
		break
	}
	if !replaced {
		queue = append(queue, ack)
	}
	if len(queue) > maxQueueItems {
		dropped := queue[:len(queue)-maxQueueItems]
		for _, d := range dropped {
			m.logger.Warn("pending ack queue full, oldest entry discarded",
				"command_id", d.CommandID,
				"enqueued_at", d.EnqueuedAt,
				"attempts", d.Attempts,
			)
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

func nextAckRetryDelay(attempt int) time.Duration {
	if attempt <= 0 {
		return 30 * time.Second
	}

	delay := 30 * time.Second
	for i := 1; i < attempt; i++ {
		delay *= 2
		if delay >= 15*time.Minute {
			return 15 * time.Minute
		}
	}
	return delay
}

func firstNonZeroTime(values ...time.Time) time.Time {
	for _, value := range values {
		if !value.IsZero() {
			return value
		}
	}
	return time.Time{}
}
