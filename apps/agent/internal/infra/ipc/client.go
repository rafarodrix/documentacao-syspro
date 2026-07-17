package ipc

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"trilink/agent/internal/contracts/agentui"
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

func (c *Client) GetSummary(ctx context.Context) (agentui.Summary, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/summary", nil)
	if err != nil {
		return agentui.Summary{}, fmt.Errorf("build ipc summary request: %w", err)
	}
	c.applyHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return agentui.Summary{}, fmt.Errorf("fetch ipc summary: %w", err)
	}
	defer resp.Body.Close()
	if err := c.ensureCompatibleProtocol(resp); err != nil {
		return agentui.Summary{}, err
	}

	if resp.StatusCode != http.StatusOK {
		return agentui.Summary{}, fmt.Errorf("ipc summary returned status %d", resp.StatusCode)
	}

	var summary agentui.Summary
	if err := json.NewDecoder(resp.Body).Decode(&summary); err != nil {
		return agentui.Summary{}, fmt.Errorf("decode ipc summary: %w", err)
	}

	c.logger.Debug("ipc client fetched summary", "service_status", summary.ServiceStatus)
	return summary, nil
}

func (c *Client) ListNotifications(ctx context.Context) ([]agentui.Notification, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/notifications", nil)
	if err != nil {
		return nil, fmt.Errorf("build ipc notifications request: %w", err)
	}
	c.applyHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch ipc notifications: %w", err)
	}
	defer resp.Body.Close()
	if err := c.ensureCompatibleProtocol(resp); err != nil {
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ipc notifications returned status %d", resp.StatusCode)
	}

	var notifications []agentui.Notification
	if err := json.NewDecoder(resp.Body).Decode(&notifications); err != nil {
		return nil, fmt.Errorf("decode ipc notifications: %w", err)
	}

	c.logger.Debug("ipc client fetched notifications", "count", len(notifications))
	return notifications, nil
}

func (c *Client) GetAgentSetupView(ctx context.Context) (agentui.AgentSetupView, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/agent/setup-view", nil)
	if err != nil {
		return agentui.AgentSetupView{}, fmt.Errorf("build ipc agent setup view request: %w", err)
	}
	c.applyHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return agentui.AgentSetupView{}, fmt.Errorf("fetch ipc agent setup view: %w", err)
	}
	defer resp.Body.Close()
	if err := c.ensureCompatibleProtocol(resp); err != nil {
		return agentui.AgentSetupView{}, err
	}

	if resp.StatusCode != http.StatusOK {
		return agentui.AgentSetupView{}, fmt.Errorf("ipc agent setup view returned status %d", resp.StatusCode)
	}

	var view agentui.AgentSetupView
	if err := json.NewDecoder(resp.Body).Decode(&view); err != nil {
		return agentui.AgentSetupView{}, fmt.Errorf("decode ipc agent setup view: %w", err)
	}

	c.logger.Debug("ipc client fetched agent setup view", "stage", view.Stage, "progress_pct", view.ProgressPct, "complete", view.Complete)
	return view, nil
}

func (c *Client) GetAgentSupportView(ctx context.Context) (agentui.AgentSupportView, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/agent/support-view", nil)
	if err != nil {
		return agentui.AgentSupportView{}, fmt.Errorf("build ipc agent support view request: %w", err)
	}
	c.applyHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return agentui.AgentSupportView{}, fmt.Errorf("fetch ipc agent support view: %w", err)
	}
	defer resp.Body.Close()
	if err := c.ensureCompatibleProtocol(resp); err != nil {
		return agentui.AgentSupportView{}, err
	}

	if resp.StatusCode != http.StatusOK {
		return agentui.AgentSupportView{}, fmt.Errorf("ipc agent support view returned status %d", resp.StatusCode)
	}

	var view agentui.AgentSupportView
	if err := json.NewDecoder(resp.Body).Decode(&view); err != nil {
		return agentui.AgentSupportView{}, fmt.Errorf("decode ipc agent support view: %w", err)
	}

	remoteStatus := ""
	remoteExternalID := ""
	if view.Capabilities.Remote != nil {
		remoteStatus = view.Capabilities.Remote.Status
		remoteExternalID = view.Capabilities.Remote.ExternalID
	}
	c.logger.Debug("ipc client fetched agent support view", "remote_status", remoteStatus, "rustdesk_id", remoteExternalID)
	return view, nil
}

func (c *Client) OpenSupportConversation(ctx context.Context) (agentui.ActionResult, error) {
	return c.postAction(ctx, "/actions/support/open")
}

func (c *Client) OpenSetupExperience(ctx context.Context) (agentui.ActionResult, error) {
	return c.postAction(ctx, "/actions/setup/open")
}

func (c *Client) OpenRemoteClient(ctx context.Context) (agentui.OpenRemoteAccessResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/actions/remote/open", nil)
	if err != nil {
		return agentui.OpenRemoteAccessResult{}, fmt.Errorf("build ipc remote action request: %w", err)
	}
	c.applyHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return agentui.OpenRemoteAccessResult{}, fmt.Errorf("execute ipc remote action: %w", err)
	}
	defer resp.Body.Close()
	if err := c.ensureCompatibleProtocol(resp); err != nil {
		return agentui.OpenRemoteAccessResult{}, err
	}

	if resp.StatusCode != http.StatusOK {
		return agentui.OpenRemoteAccessResult{}, fmt.Errorf("ipc remote action returned status %d", resp.StatusCode)
	}

	var result agentui.OpenRemoteAccessResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return agentui.OpenRemoteAccessResult{}, fmt.Errorf("decode ipc remote action response: %w", err)
	}

	c.logger.Info("ipc client executed remote action", "opened", result.Opened, "running", result.Running)
	return result, nil
}

func (c *Client) SyncSupportConversationContext(ctx context.Context, conversationID string) (agentui.SupportContextSyncResult, error) {
	payload := agentui.SupportContextSyncRequest{ConversationID: strings.TrimSpace(conversationID)}
	body := strings.NewReader(fmt.Sprintf(`{"conversationId":%q}`, payload.ConversationID))
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/actions/support/sync-context", body)
	if err != nil {
		return agentui.SupportContextSyncResult{}, fmt.Errorf("build ipc support context sync request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	c.applyHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return agentui.SupportContextSyncResult{}, fmt.Errorf("execute ipc support context sync: %w", err)
	}
	defer resp.Body.Close()
	if err := c.ensureCompatibleProtocol(resp); err != nil {
		return agentui.SupportContextSyncResult{}, err
	}

	if resp.StatusCode != http.StatusOK {
		return agentui.SupportContextSyncResult{}, fmt.Errorf("ipc support context sync returned status %d", resp.StatusCode)
	}

	var result agentui.SupportContextSyncResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return agentui.SupportContextSyncResult{}, fmt.Errorf("decode ipc support context sync response: %w", err)
	}

	c.logger.Info("ipc client synced support context", "conversation_id", conversationID, "accepted", result.Accepted)
	return result, nil
}

func (c *Client) postAction(ctx context.Context, path string) (agentui.ActionResult, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, nil)
	if err != nil {
		return agentui.ActionResult{}, fmt.Errorf("build ipc action request: %w", err)
	}
	c.applyHeaders(req)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return agentui.ActionResult{}, fmt.Errorf("execute ipc action: %w", err)
	}
	defer resp.Body.Close()
	if err := c.ensureCompatibleProtocol(resp); err != nil {
		return agentui.ActionResult{}, err
	}

	if resp.StatusCode != http.StatusOK {
		return agentui.ActionResult{}, fmt.Errorf("ipc action returned status %d", resp.StatusCode)
	}

	var result agentui.ActionResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return agentui.ActionResult{}, fmt.Errorf("decode ipc action response: %w", err)
	}

	c.logger.Info("ipc client executed action", "path", path, "accepted", result.Accepted)
	return result, nil
}

func (c *Client) applyHeaders(req *http.Request) {
	if c.token != "" {
		req.Header.Set("X-IPC-Token", c.token)
	}
	req.Header.Set(agentui.ProtocolVersionHeader, agentui.ProtocolVersion)
}

func (c *Client) ensureCompatibleProtocol(resp *http.Response) error {
	version := strings.TrimSpace(resp.Header.Get(agentui.ProtocolVersionHeader))
	if version == agentui.ProtocolVersion {
		return nil
	}

	if version == "" {
		return fmt.Errorf("ipc protocol version missing from response")
	}

	return fmt.Errorf("ipc protocol version mismatch: expected %s, got %s", agentui.ProtocolVersion, version)
}
