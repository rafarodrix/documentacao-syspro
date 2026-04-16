package config

type Config struct {
	LogLevel string
	Portal   PortalConfig
	Paths    PathsConfig
	Remote   RemoteConfig
	Agent    AgentConfig
}

type PortalConfig struct {
	BaseURL         string
	APIKey          string
	AgentAPIEnabled bool
}

type PathsConfig struct {
	StateDir string
}

type RemoteConfig struct {
	Enabled        bool
	DiscoveryToken string
	InstallToken   string
}

type AgentConfig struct {
	Version     string
	Environment string
}
