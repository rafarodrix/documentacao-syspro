package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

func Load() (Config, error) {
	cfg := Config{
		LogLevel: getEnv("AGENT_LOG_LEVEL", "debug"),
		Portal: PortalConfig{
			BaseURL:         getEnvAny([]string{"PORTAL_BASE_URL", "PORTAL_API_BASE_URL"}, "http://localhost:3000"),
			APIKey:          getEnvAny([]string{"PORTAL_API_KEY", "INTERNAL_API_KEY"}, ""),
			AgentAPIEnabled: getEnvBool("PORTAL_AGENT_API_ENABLED", false),
		},
		Paths: PathsConfig{
			StateDir: getStateDir(),
		},
		Remote: RemoteConfig{
			Enabled:                 getEnvBool("REMOTE_ENABLED", true),
			DiscoveryToken:          getEnv("REMOTE_DISCOVERY_TOKEN", ""),
			InstallToken:            getEnv("REMOTE_INSTALL_TOKEN", ""),
			RustDeskInstallerURL:    getEnvAny([]string{"REMOTE_RUSTDESK_INSTALLER_URL", "REMOTE_RUSTDESK_UPGRADE_URL"}, ""),
			RustDeskInstallerSHA256: getEnvAny([]string{"REMOTE_RUSTDESK_INSTALLER_SHA256", "REMOTE_RUSTDESK_UPGRADE_SHA256"}, ""),
			RustDeskInstallArgs:     getEnvAny([]string{"REMOTE_RUSTDESK_INSTALL_ARGS", "REMOTE_RUSTDESK_UPGRADE_SILENT_ARGS"}, ""),
		},
		Support: SupportConfig{
			ChatwootBaseURL:      getEnvAny([]string{"SUPPORT_CHATWOOT_BASE_URL", "CHATWOOT_URL"}, "https://chat.trilinksoftware.com.br"),
			ChatwootWebsiteToken: getEnv("SUPPORT_CHATWOOT_WEBSITE_TOKEN", "GoMFRV3pyJf4sh9CKYqQpWkh"),
		},
		Agent: AgentConfig{
			Version:     getEnv("AGENT_VERSION", "go-agent-v1"),
			Environment: getEnv("AGENT_ENVIRONMENT", "Producao"),
			IPCAddress:  getEnv("AGENT_IPC_ADDRESS", `\\.\pipe\trilink-agent-ipc`),
		},
	}

	if err := cfg.validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func (c Config) validate() error {
	if strings.TrimSpace(c.Portal.BaseURL) == "" {
		return fmt.Errorf("PORTAL_BASE_URL is required")
	}
	return nil
}

func getEnv(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func getEnvAny(keys []string, fallback string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(os.Getenv(key)); value != "" {
			return value
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	switch value {
	case "1", "true", "yes", "y", "sim", "s":
		return true
	case "0", "false", "no", "n", "nao":
		return false
	default:
		return fallback
	}
}

func getStateDir() string {
	if value := strings.TrimSpace(os.Getenv("AGENT_STATE_DIR")); value != "" {
		return value
	}

	if runtime.GOOS == "windows" {
		programData := os.Getenv("ProgramData")
		if programData == "" {
			programData = `C:\ProgramData`
		}
		return filepath.Join(programData, "Trilink", "agent")
	}

	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return filepath.Join(".", ".trilink", "agent")
	}
	return filepath.Join(home, ".trilink", "agent")
}
