package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const defaultSupportChatwootBaseURL = "https://chat.trilinksoftware.com.br"
const defaultSupportChatwootWebsiteToken = "GoMFRV3pyJf4sh9CKYqQpWkh"

func Load() (Config, error) {
	cfg := Config{
		LogLevel: getEnv("AGENT_LOG_LEVEL", "debug"),
		Portal: PortalConfig{
			BaseURL:         getEnvAny([]string{"PORTAL_BASE_URL", "PORTAL_API_BASE_URL"}, "http://localhost:3000"),
			APIKey:          getEnvAny([]string{"PORTAL_API_KEY", "INTERNAL_API_KEY"}, ""),
			AgentAPIEnabled: getEnvBool("PORTAL_AGENT_API_ENABLED", true),
		},
		Paths: PathsConfig{
			StateDir: getStateDir(),
		},
		Remote: RemoteConfig{
			Enabled:        getEnvBool("REMOTE_ENABLED", true),
			DiscoveryToken: getEnv("REMOTE_DISCOVERY_TOKEN", ""),
		},
		Support: SupportConfig{
			ChatwootBaseURL:      getEnvAny([]string{"SUPPORT_CHATWOOT_BASE_URL", "CHATWOOT_URL"}, defaultSupportChatwootBaseURL),
			ChatwootWebsiteToken: getEnv("SUPPORT_CHATWOOT_WEBSITE_TOKEN", defaultSupportChatwootWebsiteToken),
		},
		Agent: AgentConfig{
			Version:    getEnv("AGENT_VERSION", "go-agent-v1"),
			IPCAddress: getEnv("AGENT_IPC_ADDRESS", `\\.\pipe\trilink-agent-ipc`),
			IPCToken:   getEnv("AGENT_IPC_TOKEN", "trilink-agent-local"),
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

// DefaultEnvFilePath returns the canonical .env path for the current OS.
// On Windows this is %ProgramData%\Trilink\Agent\.env, readable by SYSTEM and users.
func DefaultEnvFilePath() string {
	if runtime.GOOS == "windows" {
		programData := os.Getenv("ProgramData")
		if programData == "" {
			programData = `C:\ProgramData`
		}
		return filepath.Join(programData, "Trilink", "Agent", ".env")
	}
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		return filepath.Join(home, ".trilink", "agent", ".env")
	}
	return filepath.Join(".", ".env")
}

// LoadEnvFile reads a .env file and populates os environment variables.
// Existing env vars are not overwritten (explicit env takes precedence over file).
// Missing file is silently ignored.
func LoadEnvFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read env file %s: %w", path, err)
	}

	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		idx := strings.IndexByte(line, '=')
		if idx < 1 {
			continue
		}
		key := strings.TrimSpace(line[:idx])
		value := strings.TrimSpace(line[idx+1:])
		if len(value) >= 2 &&
			((value[0] == '"' && value[len(value)-1] == '"') ||
				(value[0] == '\'' && value[len(value)-1] == '\'')) {
			value = value[1 : len(value)-1]
		}
		if key != "" && os.Getenv(key) == "" {
			_ = os.Setenv(key, value)
		}
	}
	return nil
}

// DefaultStateDir returns the canonical state directory path for the current OS.
func DefaultStateDir() string {
	return getStateDir()
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
