package ipc

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	uistate "trilink/agent/internal/core/ui_state"
)

type Client struct {
	baseURL    string
	token      string
	httpClient *http.Client
	logger     Logger
}

func NewClient(addr string, token string, logger Logger) *Client {
	httpClient, baseURL := newHTTPClient(strings.TrimSpace(addr))

	return &Client{
		baseURL:    baseURL,
		token:      strings.TrimSpace(token),
		httpClient: httpClient,
		logger:     logger,
	}
}

func (c *Client) GetSummary(ctx context.Context) (uistate.Summary, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/summary", nil)
	if err != nil {
		return uistate.Summary{}, fmt.Errorf("build ipc summary request: %w", err)
	}
	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return uistate.Summary{}, fmt.Errorf("fetch ipc summary: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return uistate.Summary{}, fmt.Errorf("ipc summary returned status %d", resp.StatusCode)
	}

	var summary uistate.Summary
	if err := json.NewDecoder(resp.Body).Decode(&summary); err != nil {
		return uistate.Summary{}, fmt.Errorf("decode ipc summary: %w", err)
	}

	c.logger.Debug("ipc client fetched summary", "service_status", summary.ServiceStatus)
	return summary, nil
}

func (c *Client) ListNotifications(ctx context.Context) ([]uistate.Notification, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/notifications", nil)
	if err != nil {
		return nil, fmt.Errorf("build ipc notifications request: %w", err)
	}
	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch ipc notifications: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ipc notifications returned status %d", resp.StatusCode)
	}

	var notifications []uistate.Notification
	if err := json.NewDecoder(resp.Body).Decode(&notifications); err != nil {
		return nil, fmt.Errorf("decode ipc notifications: %w", err)
	}

	c.logger.Debug("ipc client fetched notifications", "count", len(notifications))
	return notifications, nil
}

func (c *Client) GetSetupStatus(ctx context.Context) (uistate.SetupStatus, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/setup", nil)
	if err != nil {
		return uistate.SetupStatus{}, fmt.Errorf("build ipc setup request: %w", err)
	}
	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return uistate.SetupStatus{}, fmt.Errorf("fetch ipc setup: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return uistate.SetupStatus{}, fmt.Errorf("ipc setup returned status %d", resp.StatusCode)
	}

	var status uistate.SetupStatus
	if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
		return uistate.SetupStatus{}, fmt.Errorf("decode ipc setup: %w", err)
	}

	c.logger.Debug("ipc client fetched setup", "stage", status.Stage, "progress_pct", status.ProgressPct, "complete", status.Complete)
	return status, nil
}

func (c *Client) OpenSupportConversation(ctx context.Context) (uistate.ActionResult, error) {
	return c.postAction(ctx, "/actions/support/open")
}

func (c *Client) OpenSetupExperience(ctx context.Context) (uistate.ActionResult, error) {
	return c.postAction(ctx, "/actions/setup/open")
}

func (c *Client) OpenRemoteClient(ctx context.Context) (uistate.ActionResult, error) {
	return c.postAction(ctx, "/actions/remote/open")
}

func (c *Client) SyncSupportConversationContext(ctx context.Context, conversationID string) (uistate.SupportContextSyncResult, error) {
	body := strings.NewReader(fmt.Sprintf(`{"conversationId":%q}`, strings.TrimSpace(conversationID)))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/actions/support/sync-context", body)
	if err != nil {
		return uistate.SupportContextSyncResult{}, fmt.Errorf("build ipc support context sync request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return uistate.SupportContextSyncResult{}, fmt.Errorf("execute ipc support context sync: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return uistate.SupportContextSyncResult{}, fmt.Errorf("ipc support context sync returned status %d", resp.StatusCode)
	}

	var result uistate.SupportContextSyncResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return uistate.SupportContextSyncResult{}, fmt.Errorf("decode ipc support context sync response: %w", err)
	}

	c.logger.Info("ipc client synced support context", "conversation_id", conversationID, "accepted", result.Accepted)
	return result, nil
}

func (c *Client) postAction(ctx context.Context, path string) (uistate.ActionResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, nil)
	if err != nil {
		return uistate.ActionResult{}, fmt.Errorf("build ipc action request: %w", err)
	}
	c.applyAuth(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return uistate.ActionResult{}, fmt.Errorf("execute ipc action: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return uistate.ActionResult{}, fmt.Errorf("ipc action returned status %d", resp.StatusCode)
	}

	var result uistate.ActionResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return uistate.ActionResult{}, fmt.Errorf("decode ipc action response: %w", err)
	}

	c.logger.Info("ipc client executed action", "path", path, "accepted", result.Accepted)
	return result, nil
}

func (c *Client) applyAuth(req *http.Request) {
	if c.token != "" {
		req.Header.Set("X-IPC-Token", c.token)
	}
}
