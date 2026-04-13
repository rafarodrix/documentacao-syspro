package config

type Config struct {
	LogLevel string
	Portal   PortalConfig
	Paths    PathsConfig
}

type PortalConfig struct {
	BaseURL string
	APIKey  string
}

type PathsConfig struct {
	StateDir string
}