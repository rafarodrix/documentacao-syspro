package http

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
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
	SaveJSON(ctx context.Context, name string, value any) error
}

type PortalClient struct {
	cfg        config.Config
	store      StateStore
	logger     Logger
	httpClient *http.Client
	baseURL    string
}

type HTTPStatusError struct {
	StatusCode int
	Method     string
	Path       string
	Body       string
	Code       string
	Message    string
}

func (e *HTTPStatusError) Error() string {
	message := firstNonEmpty(strings.TrimSpace(e.Message), strings.TrimSpace(e.Body))
	if e.Code != "" {
		return fmt.Sprintf("unexpected status %d on %s %s [%s]: %s", e.StatusCode, e.Method, e.Path, e.Code, message)
	}
	return fmt.Sprintf("unexpected status %d on %s %s: %s", e.StatusCode, e.Method, e.Path, message)
}

func IsStatusError(err error, statuses ...int) bool {
	var statusErr *HTTPStatusError
	if !errors.As(err, &statusErr) {
		return false
	}
	for _, status := range statuses {
		if statusErr.StatusCode == status {
			return true
		}
	}
	return false
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

func (c *PortalClient) RegisterDevice(ctx context.Context, id domain.AgentIdentity) error {
	if !c.cfg.Portal.AgentAPIEnabled {
		c.logger.Info("agent registration api disabled; using local registration state", "device_id", id.Device.DeviceID)
		return nil
	}

	body := map[string]any{
		"deviceId":        id.Device.DeviceID,
		"agentInstanceId": id.Installation.AgentInstanceID,
		"credentialId":    id.Installation.CredentialID,
		"hostname":        id.Device.Hostname,
		"os":              id.Device.OS,
		"identitySource":  id.Device.IdentitySource,
		"agentVersion":    c.cfg.Agent.Version,
	}
	if link := c.loadRemoteLinkContext(ctx); link != nil {
		body["remoteLinkContext"] = map[string]any{
			"remoteHostId": link.HostID,
			"companyId":    link.CompanyID,
			"rustdeskId":   link.RustDeskID,
		}
	}
	resp, err := c.post(ctx, "/api/agents/register", body)
	if err != nil {
		return err
	}

	var result struct {
		InstallationToken string `json:"installationToken"`
	}
	if err := json.Unmarshal(resp, &result); err == nil && strings.TrimSpace(result.InstallationToken) != "" {
		id.Installation.InstallationToken = strings.TrimSpace(result.InstallationToken)
		if saveErr := c.store.SaveJSON(ctx, "installation.json", id.Installation); saveErr != nil {
			c.logger.Warn("persist installation token failed", "error", saveErr)
		}
	}
	return nil
}

func (c *PortalClient) SendHeartbeat(ctx context.Context) error {
	if !c.cfg.Portal.AgentAPIEnabled {
		c.logger.Debug("agent heartbeat api disabled; heartbeat skipped")
		return nil
	}

	identity, err := c.loadAgentIdentity(ctx)
	if err != nil {
		return fmt.Errorf("load local identity for heartbeat: %w", err)
	}

	body := map[string]any{
		"deviceId":        identity.Device.DeviceID,
		"agentInstanceId": identity.Installation.AgentInstanceID,
		"credentialId":    identity.Installation.CredentialID,
		"agentVersion":    c.cfg.Agent.Version,
		"at":              time.Now().UTC(),
	}
	if link := c.loadRemoteLinkContext(ctx); link != nil {
		body["remoteLinkContext"] = map[string]any{
			"remoteHostId": link.HostID,
			"companyId":    link.CompanyID,
			"rustdeskId":   link.RustDeskID,
		}
	}
	resp, err := c.postFleet(ctx, "/api/agents/heartbeat", body, identity.Installation.InstallationToken)
	if err != nil {
		return err
	}
	c.persistInstallationTokenFromFleetResponse(ctx, identity.Installation, resp)
	return nil
}

func (c *PortalClient) GetDesiredState(ctx context.Context) (domain.DesiredState, error) {
	if !c.cfg.Portal.AgentAPIEnabled {
		state := c.localDesiredState()
		c.logger.Debug("agent desired state api disabled; using local desired state", "version", state.Version)
		return state, nil
	}

	identity, err := c.loadAgentIdentity(ctx)
	if err != nil {
		return domain.DesiredState{}, fmt.Errorf("load identity for desired state: %w", err)
	}

	resp, err := c.getFleet(ctx, fmt.Sprintf("/api/agents/%s/desired-state", identity.Device.DeviceID), identity.Installation.InstallationToken)
	if err != nil {
		return domain.DesiredState{}, err
	}

	var state domain.DesiredState
	if err := json.Unmarshal(resp, &state); err != nil {
		return domain.DesiredState{}, fmt.Errorf("parse desired state: %w", err)
	}
	return state, nil
}

func (c *PortalClient) PostTelemetry(ctx context.Context, payload map[string]any) error {
	if !c.cfg.Portal.AgentAPIEnabled {
		return nil
	}
	identity, err := c.loadAgentIdentity(ctx)
	if err != nil {
		return fmt.Errorf("load identity for telemetry: %w", err)
	}
	deviceID := identity.Device.DeviceID
	payload["deviceId"] = deviceID
	payload["agentInstanceId"] = identity.Installation.AgentInstanceID
	payload["credentialId"] = identity.Installation.CredentialID
	payload["agentVersion"] = c.cfg.Agent.Version
	if _, ok := payload["schemaVersion"]; !ok {
		payload["schemaVersion"] = "agent.telemetry.v1"
	}
	_, err = c.postFleet(ctx, fmt.Sprintf("/api/agents/%s/telemetry", deviceID), payload, identity.Installation.InstallationToken)
	return err
}

func (c *PortalClient) loadRemoteLinkContext(ctx context.Context) *domain.PersistedRemoteState {
	var link domain.PersistedRemoteState
	if err := c.store.LoadJSON(ctx, "remote_state.json", &link); err != nil {
		return nil
	}

	if strings.TrimSpace(link.HostID) == "" &&
		strings.TrimSpace(link.CompanyID) == "" &&
		strings.TrimSpace(link.RustDeskID) == "" {
		return nil
	}

	return &link
}

const headerSkipInternalAPIKey = "X-Trilink-Skip-Internal-Api-Key"

func (c *PortalClient) postFleet(ctx context.Context, path string, body any, installationToken string) (json.RawMessage, error) {
	return c.doRequestWithHeaders(ctx, http.MethodPost, path, body, fleetAuthHeaders(installationToken))
}

func (c *PortalClient) getFleet(ctx context.Context, path string, installationToken string) (json.RawMessage, error) {
	return c.doRequestWithHeaders(ctx, http.MethodGet, path, nil, fleetAuthHeaders(installationToken))
}

// fleetAuthHeaders prefers per-installation token and omits the shared INTERNAL_API_KEY when present.
// Without a token (legacy installs), the default client still sends x-internal-api-key for transition.
func fleetAuthHeaders(installationToken string) map[string]string {
	headers := map[string]string{}
	if token := strings.TrimSpace(installationToken); token != "" {
		headers["x-agent-installation-token"] = token
		headers[headerSkipInternalAPIKey] = "1"
	}
	return headers
}

func (c *PortalClient) loadAgentIdentity(ctx context.Context) (domain.AgentIdentity, error) {
	var device domain.DeviceIdentity
	if err := c.store.LoadJSON(ctx, "identity.json", &device); err != nil {
		return domain.AgentIdentity{}, err
	}

	var installation domain.AgentInstallation
	if err := c.store.LoadJSON(ctx, "installation.json", &installation); err != nil {
		return domain.AgentIdentity{}, err
	}

	return domain.AgentIdentity{
		Device:       device,
		Installation: installation,
	}, nil
}

func (c *PortalClient) persistInstallationTokenFromFleetResponse(ctx context.Context, installation domain.AgentInstallation, resp json.RawMessage) {
	var result struct {
		InstallationToken string `json:"installationToken"`
	}
	if err := json.Unmarshal(resp, &result); err != nil {
		return
	}
	token := strings.TrimSpace(result.InstallationToken)
	if token == "" || token == strings.TrimSpace(installation.InstallationToken) {
		return
	}
	installation.InstallationToken = token
	if err := c.store.SaveJSON(ctx, "installation.json", installation); err != nil {
		c.logger.Warn("persist installation token from heartbeat failed", "error", err)
	}
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
	if err := validateDiscoverResponse(&result); err != nil {
		return nil, err
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
	if err := validateBootstrapResponse(&result); err != nil {
		return nil, err
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
	if err := validateSyncResponse(&result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *PortalClient) Ack(ctx context.Context, req domain.RemoteAckRequest) error {
	req.SchemaVersion = domain.RemoteAckSchemaVersion
	_, err := c.post(ctx, "/api/remote/rustdesk/ack", req)
	return err
}

func (c *PortalClient) SyncSupportConversationContext(ctx context.Context, conversationID string, supportContext domain.SupportConversationContext) error {
	body := map[string]any{
		"conversationId": conversationID,
		"context":        supportContext,
	}
	_, err := c.postInternal(ctx, "/api/integrations/chatwoot/agent-context/sync", body)
	return err
}

func (c *PortalClient) localDesiredState() domain.DesiredState {
	return domain.DesiredState{
		Version:   1,
		UpdatedAt: time.Now().UTC(),
		Remote: domain.RemoteDesiredState{
			Enabled:          c.cfg.Remote.Enabled,
			Version:          c.cfg.Agent.Version,
			Mode:             "managed",
			InstallIfMissing: true,
			BootstrapEnabled: true,
			SyncEnabled:      true,
		},
		Device: domain.DeviceDesiredState{
			Enabled:          true,
			Version:          c.cfg.Agent.Version,
			CollectInventory: true,
			CollectMetrics:   true,
		},
	}
}

func (c *PortalClient) post(ctx context.Context, path string, body any) (json.RawMessage, error) {
	return c.doRequest(ctx, http.MethodPost, path, body)
}

func (c *PortalClient) postInternal(ctx context.Context, path string, body any) (json.RawMessage, error) {
	return c.doRequestWithHeaders(ctx, http.MethodPost, path, body, map[string]string{
		"x-internal-api-key": c.cfg.Portal.APIKey,
	})
}

func (c *PortalClient) get(ctx context.Context, path string) (json.RawMessage, error) {
	return c.doRequest(ctx, http.MethodGet, path, nil)
}

func (c *PortalClient) doRequest(ctx context.Context, method, path string, body any) (json.RawMessage, error) {
	return c.doRequestWithHeaders(ctx, method, path, body, nil)
}

func (c *PortalClient) doRequestWithHeaders(ctx context.Context, method, path string, body any, extraHeaders map[string]string) (json.RawMessage, error) {
	var lastErr error

	for attempt := 1; attempt <= 3; attempt++ {
		resp, status, err := c.doRequestOnce(ctx, method, path, body, extraHeaders)
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

func (c *PortalClient) doRequestOnce(ctx context.Context, method, path string, body any, extraHeaders map[string]string) (json.RawMessage, int, error) {
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
	req.Header.Set("User-Agent", c.userAgent())
	req.Header.Set("x-agent-version", c.cfg.Agent.Version)
	req.Header.Set("x-agent-runtime", "go-agent")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	skipInternalAPIKey := false
	for key, value := range extraHeaders {
		if strings.EqualFold(strings.TrimSpace(key), headerSkipInternalAPIKey) {
			skipInternalAPIKey = strings.TrimSpace(value) == "1"
			continue
		}
		if strings.TrimSpace(key) == "" || strings.TrimSpace(value) == "" {
			continue
		}
		req.Header.Set(key, value)
	}
	if c.cfg.Portal.APIKey != "" && !skipInternalAPIKey {
		req.Header.Set("x-internal-api-key", c.cfg.Portal.APIKey)
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
		"user_agent", req.Header.Get("User-Agent"),
		"request_fingerprint", requestFingerprint(body),
	)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		code, message := parseHTTPErrorBody(respBody)
		return nil, resp.StatusCode, &HTTPStatusError{
			StatusCode: resp.StatusCode,
			Method:     method,
			Path:       path,
			Body:       string(respBody),
			Code:       code,
			Message:    message,
		}
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

func (c *PortalClient) userAgent() string {
	version := strings.TrimSpace(c.cfg.Agent.Version)
	if version == "" {
		return "trilink-agent"
	}
	return "trilink-agent/" + version
}

func requestFingerprint(body any) string {
	if body == nil {
		return "empty"
	}

	data, err := json.Marshal(body)
	if err != nil || len(data) == 0 {
		return "unavailable"
	}

	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])[:12]
}

func parseHTTPErrorBody(respBody []byte) (string, string) {
	var envelope struct {
		Code    string `json:"code"`
		Error   string `json:"error"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal(respBody, &envelope); err != nil {
		return "", ""
	}
	return strings.TrimSpace(envelope.Code), firstNonEmpty(strings.TrimSpace(envelope.Message), strings.TrimSpace(envelope.Error))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
