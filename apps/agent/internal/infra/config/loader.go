package config

func Load() (Config, error) {
	return Config{
		LogLevel: "debug",
		Portal: PortalConfig{
			BaseURL: "http://localhost:3000",
			APIKey:  "dev-key",
		},
		Paths: PathsConfig{
			StateDir: `C:\ProgramData\Trilink\agent`,
		},
	}, nil
}