package app

import (
	"context"
	"fmt"
	"os"
	"strings"

	"trilink/agent/internal/infra/storage"
)

const agentSecretsFile = "agent_config.json"

type agentSecrets struct {
	PortalAPIKey         string `json:"portal_api_key,omitempty"`
	ChatwootWebsiteToken string `json:"chatwoot_website_token,omitempty"`
	RemoteDiscoveryToken string `json:"remote_discovery_token,omitempty"`
	RemoteInstallToken   string `json:"remote_install_token,omitempty"`
}

type nopLogger struct{}

func (nopLogger) Warn(_ string, _ ...any) {}

func newSecretsStore(stateDir string) *storage.ProtectedStateStore {
	return storage.NewProtectedStateStore(storage.NewLocalStateStore(stateDir, nopLogger{}))
}

// loadSecretsIntoEnv reads DPAPI-protected secrets and populates env vars that
// are not already set. Called before LoadEnvFile so encrypted values take
// precedence over any residual plaintext in .env.
func loadSecretsIntoEnv(stateDir string) {
	store := newSecretsStore(stateDir)
	var s agentSecrets
	if err := store.LoadJSON(context.Background(), agentSecretsFile, &s); err != nil {
		return
	}
	setEnvIfEmpty("PORTAL_API_KEY", s.PortalAPIKey)
	setEnvIfEmpty("SUPPORT_CHATWOOT_WEBSITE_TOKEN", s.ChatwootWebsiteToken)
	setEnvIfEmpty("REMOTE_DISCOVERY_TOKEN", s.RemoteDiscoveryToken)
	setEnvIfEmpty("REMOTE_INSTALL_TOKEN", s.RemoteInstallToken)
}

// migrateSecretsFromEnvFile detects plaintext sensitive values in the .env file,
// saves them to DPAPI-protected storage, and redacts them from the file.
// No-op if secrets are already migrated or the file does not exist.
func migrateSecretsFromEnvFile(envFilePath, stateDir string) {
	raw, err := os.ReadFile(envFilePath)
	if err != nil {
		return
	}

	found, redacted := extractAndRedactSecrets(string(raw))
	if len(found) == 0 {
		return
	}

	store := newSecretsStore(stateDir)
	ctx := context.Background()

	var existing agentSecrets
	_ = store.LoadJSON(ctx, agentSecretsFile, &existing)

	merged := agentSecrets{
		PortalAPIKey:         coalesceStr(found["PORTAL_API_KEY"], found["INTERNAL_API_KEY"], existing.PortalAPIKey),
		ChatwootWebsiteToken: coalesceStr(found["SUPPORT_CHATWOOT_WEBSITE_TOKEN"], existing.ChatwootWebsiteToken),
		RemoteDiscoveryToken: coalesceStr(found["REMOTE_DISCOVERY_TOKEN"], existing.RemoteDiscoveryToken),
		RemoteInstallToken:   coalesceStr(found["REMOTE_INSTALL_TOKEN"], existing.RemoteInstallToken),
	}

	if err := store.SaveJSON(ctx, agentSecretsFile, merged); err != nil {
		return
	}

	_ = os.WriteFile(envFilePath, []byte(redacted), 0o600)
}

// extractAndRedactSecrets parses .env content, extracts sensitive plaintext values,
// and returns the values found plus a redacted version of the content.
func extractAndRedactSecrets(content string) (map[string]string, string) {
	found := make(map[string]string)
	var out []string

	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			out = append(out, line)
			continue
		}
		idx := strings.IndexByte(trimmed, '=')
		if idx < 1 {
			out = append(out, line)
			continue
		}
		key := strings.TrimSpace(trimmed[:idx])
		val := strings.TrimSpace(trimmed[idx+1:])
		if len(val) >= 2 && ((val[0] == '"' && val[len(val)-1] == '"') || (val[0] == '\'' && val[len(val)-1] == '\'')) {
			val = val[1 : len(val)-1]
		}

		if isSensitiveEnvKey(key) && val != "" && !isPlaceholderValue(val) {
			found[key] = val
			out = append(out, fmt.Sprintf("# %s migrated to protected storage", key))
		} else {
			out = append(out, line)
		}
	}

	if len(found) == 0 {
		return nil, content
	}
	return found, strings.Join(out, "\n")
}

func isSensitiveEnvKey(key string) bool {
	switch key {
	case "PORTAL_API_KEY", "INTERNAL_API_KEY",
		"SUPPORT_CHATWOOT_WEBSITE_TOKEN",
		"REMOTE_DISCOVERY_TOKEN", "REMOTE_INSTALL_TOKEN":
		return true
	}
	return false
}

// isPlaceholderValue returns true for the example values shipped in .env.example
// that should never be migrated to the protected store.
func isPlaceholderValue(v string) bool {
	return strings.HasPrefix(v, "replace-")
}

func setEnvIfEmpty(key, value string) {
	if value != "" && os.Getenv(key) == "" {
		_ = os.Setenv(key, value)
	}
}

func coalesceStr(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}
