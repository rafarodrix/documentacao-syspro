package webview

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	agentassets "trilink/agent/assets"
)

type ChatwootConfig struct {
	BaseURL      string
	WebsiteToken string
	Context      SupportContext
}

type SupportContext struct {
	CompanyID            string   `json:"companyId,omitempty"`
	CompanyDisplayName   string   `json:"companyDisplayName,omitempty"`
	HostID               string   `json:"hostId,omitempty"`
	HostAlias            string   `json:"hostAlias,omitempty"`
	RustDeskID           string   `json:"rustdeskId,omitempty"`
	RemoteAccessPassword string   `json:"remoteAccessPassword,omitempty"`
	RemoteStatus         string   `json:"remoteStatus,omitempty"`
	RemoteStatusText     string   `json:"remoteStatusText,omitempty"`
	ConversationTags     []string `json:"conversationTags,omitempty"`
	MachineName          string   `json:"machineName,omitempty"`
	DeviceID             string   `json:"deviceId,omitempty"`
	Hostname             string   `json:"hostname,omitempty"`
	OS                   string   `json:"os,omitempty"`
	LocalUsername        string   `json:"localUsername,omitempty"`
	AgentVersion         string   `json:"agentVersion,omitempty"`
	AgentEnvironment     string   `json:"agentEnvironment,omitempty"`
	ContactName          string   `json:"contactName,omitempty"`
	Description          string   `json:"description,omitempty"`
}

func EnsureChatwootWidgetPage(stateDir string, cfg ChatwootConfig) (string, error) {
	baseURL := strings.TrimSpace(cfg.BaseURL)
	websiteToken := strings.TrimSpace(cfg.WebsiteToken)
	if baseURL == "" || websiteToken == "" {
		return "", fmt.Errorf("chatwoot widget is not configured")
	}

	contextJSON, err := marshalSupportContext(cfg.Context)
	if err != nil {
		return "", err
	}

	uiDir := filepath.Join(stateDir, "ui")
	if err := os.MkdirAll(uiDir, 0o755); err != nil {
		return "", fmt.Errorf("create ui dir: %w", err)
	}
	if err := copyBrandAssetsToDir(uiDir); err != nil {
		return "", err
	}

	brand := resolveBrandAssets(uiDir)
	pagePath := filepath.Join(uiDir, "support-chatwoot.html")
	content := strings.NewReplacer(
		"__CHATWOOT_BASE_URL__", strconv.Quote(baseURL),
		"__SUPPORT_CONTEXT_JSON__", contextJSON,
		"__LOGO_LIGHT_URL__", strconv.Quote(brand.LogoLightURL),
		"__LOGO_DARK_URL__", strconv.Quote(brand.LogoDarkURL),
		"__CHATWOOT_WEBSITE_TOKEN__", strconv.Quote(websiteToken),
	).Replace(agentassets.SupportChatwootHTML)

	if err := os.WriteFile(pagePath, []byte(content), 0o644); err != nil {
		return "", fmt.Errorf("write chatwoot widget page: %w", err)
	}

	return pagePath, nil
}

func marshalSupportContext(context SupportContext) (string, error) {
	encoded, err := json.Marshal(context)
	if err != nil {
		return "", fmt.Errorf("marshal support context: %w", err)
	}
	return string(encoded), nil
}
