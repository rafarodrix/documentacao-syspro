package http

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"trilink/agent/internal/domain"
	"trilink/agent/internal/infra/config"
)

type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
	Error(msg string, kv ...any)
}

type StateStore interface {
	LoadJSON(ctx context.Context, name string, dest any) error
}

type PortalClient struct {
	cfg        config.Config
	store      StateStore
	logger     Logger
	httpClient *http.Client
	baseURL    string
}

func NewPortalClient(cfg config.Config, store StateStore, logger Logger) *PortalClient {
	return &PortalClient{
		cfg:    cfg,
		store:  store,
		logger: logger,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL: strings.TrimRight(cfg.Portal.BaseURL, "/"),
	}
}

func (c *PortalClient) RegisterDevice(ctx context.Context, id domain.DeviceIdentity) error {
	if !c.cfg.Portal.AgentAPIEnabled {
		c.logger.Info("agent registration api disabled; using local registration state", "device_id", id.DeviceID)
		return nil
	}

	body := map[string]any{
		"deviceId":       id.DeviceID,
		"hostname":       id.Hostname,
		"os":             id.OS,
		"identitySource": id.IdentitySource,
		"agentVersion":   c.cfg.Agent.Version,
	}
	_, err := c.post(ctx, "/api/agents/register", body)
	return err
}

func (c *PortalClient) SendHeartbeat(ctx context.Context) error {
	if !c.cfg.Portal.AgentAPIEnabled {
		c.logger.Debug("agent heartbeat api disabled; heartbeat skipped")
		return nil
	}

	var id domain.DeviceIdentity
	_ = c.store.LoadJSON(ctx, "identity.json", &id)

	body := map[string]any{
		"deviceId":     id.DeviceID,
		"agentVersion": c.cfg.Agent.Version,
		"at":           time.Now().UTC(),
	}
	_, err := c.post(ctx, "/api/agents/heartbeat", body)
	return err
}

func (c *PortalClient) GetDesiredState(ctx context.Context) (domain.DesiredState, error) {
	if !c.cfg.Portal.AgentAPIEnabled {
		state := c.localDesiredState()
		c.logger.Debug("agent desired state api disabled; using local desired state", "version", state.Version)
		return state, nil
	}

	var id domain.DeviceIdentity
	if err := c.store.LoadJSON(ctx, "identity.json", &id); err != nil {
		return domain.DesiredState{}, fmt.Errorf("load identity for desired state: %w", err)
	}

	resp, err := c.get(ctx, fmt.Sprintf("/api/agents/%s/desired-state", id.DeviceID))
	if err != nil {
		return domain.DesiredState{}, err
	}

	var state domain.DesiredState
	if err := json.Unmarshal(resp, &state); err != nil {
		return domain.DesiredState{}, fmt.Errorf("parse desired state: %w", err)
	}
	return state, nil
}

func (c *PortalClient) Discover(ctx context.Context, req domain.RemoteDiscoverRequest) (*domain.RemoteDiscoverResponse, error) {
	req.SchemaVersion = domain.RemoteDiscoverSchemaVersion
	resp, err := c.post(ctx, "/api/remote/agents/discover", req)
	if err != nil {
		return nil, err
	}

	var result domain.RemoteDiscoverResponse
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("parse discover response: %w", err)
	}
	return &result, nil
}

func (c *PortalClient) Bootstrap(ctx context.Context, req domain.RemoteBootstrapRequest) (*domain.RemoteBootstrapResponse, error) {
	resp, err := c.post(ctx, "/api/remote/rustdesk/bootstrap", req)
	if err != nil {
		return nil, err
	}

	var result domain.RemoteBootstrapResponse
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("parse bootstrap response: %w", err)
	}
	return &result, nil
}

func (c *PortalClient) Sync(ctx context.Context, req domain.RemoteSyncRequest) (*domain.RemoteSyncResponse, error) {
	req.SchemaVersion = domain.RemoteSyncSchemaVersion
	resp, err := c.post(ctx, "/api/remote/rustdesk/sync", req)
	if err != nil {
		return nil, err
	}

	var result domain.RemoteSyncResponse
	if err := json.Unmarshal(resp, &result); err != nil {
		return nil, fmt.Errorf("parse sync response: %w", err)
	}
	return &result, nil
}

func (c *PortalClient) Ack(ctx context.Context, req domain.RemoteAckRequest) error {
	req.SchemaVersion = domain.RemoteAckSchemaVersion
	_, err := c.post(ctx, "/api/remote/rustdesk/ack", req)
	return err
}

func (c *PortalClient) localDesiredState() domain.DesiredState {
	return domain.DesiredState{
		Version:   1,
		UpdatedAt: time.Now().UTC(),
		Remote: domain.RemoteDesiredState{
			Enabled: c.cfg.Remote.Enabled,
			Version: c.cfg.Agent.Version,
		},
	}
}

func (c *PortalClient) post(ctx context.Context, path string, body any) (json.RawMessage, error) {
	return c.doRequest(ctx, http.MethodPost, path, body)
}

func (c *PortalClient) get(ctx context.Context, path string) (json.RawMessage, error) {
	return c.doRequest(ctx, http.MethodGet, path, nil)
}

func (c *PortalClient) doRequest(ctx context.Context, method, path string, body any) (json.RawMessage, error) {
	var lastErr error

	for attempt := 1; attempt <= 3; attempt++ {
		resp, status, err := c.doRequestOnce(ctx, method, path, body)
		if err == nil {
			return resp, nil
		}

		lastErr = err
		if !isRetryableStatus(status) || attempt == 3 {
			break
		}

		delay := time.Duration(attempt) * 250 * time.Millisecond
		c.logger.Warn("http request retry scheduled",
			"method", method,
			"path", path,
			"status", status,
			"attempt", attempt,
			"delay_ms", delay.Milliseconds(),
			"error", err,
		)

		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-timer.C:
		}
	}

	return nil, lastErr
}

func (c *PortalClient) doRequestOnce(ctx context.Context, method, path string, body any) (json.RawMessage, int, error) {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, 0, fmt.Errorf("marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bodyReader)
	if err != nil {
		return nil, 0, fmt.Errorf("build request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if c.cfg.Portal.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.cfg.Portal.APIKey)
	}

	start := time.Now()
	resp, err := c.httpClient.Do(req)
	elapsed := time.Since(start)
	if err != nil {
		c.logger.Warn("http request failed",
			"method", method,
			"path", path,
			"elapsed_ms", elapsed.Milliseconds(),
			"error", err,
		)
		return nil, 0, fmt.Errorf("http %s %s: %w", method, path, err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("read response body: %w", err)
	}

	c.logger.Debug("http request done",
		"method", method,
		"path", path,
		"status", resp.StatusCode,
		"elapsed_ms", elapsed.Milliseconds(),
	)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, resp.StatusCode, fmt.Errorf("unexpected status %d on %s %s: %s", resp.StatusCode, method, path, string(respBody))
	}

	var envelope struct {
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(respBody, &envelope); err == nil && len(envelope.Data) > 0 {
		return envelope.Data, resp.StatusCode, nil
	}

	return respBody, resp.StatusCode, nil
}

func isRetryableStatus(status int) bool {
	return status == 0 || status == http.StatusTooManyRequests || status >= 500
}
