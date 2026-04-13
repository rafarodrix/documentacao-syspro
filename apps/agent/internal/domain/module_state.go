package domain

type ModuleStatus string

const (
	ModuleStatusUnknown ModuleStatus = "unknown"
	ModuleStatusReady   ModuleStatus = "ready"
	ModuleStatusMissing ModuleStatus = "missing"
	ModuleStatusError   ModuleStatus = "error"
)

type RemoteDesiredState struct {
	Enabled bool   `json:"enabled"`
	Version string `json:"version"`
}

type TunnelDesiredState struct {
	Enabled     bool   `json:"enabled"`
	Version     string `json:"version"`
	ServerHost  string `json:"server_host"`
	ServerPort  int    `json:"server_port"`
	RemotePort  int    `json:"remote_port"`
	LocalTarget string `json:"local_target"`
	Token       string `json:"token"`
}

type BackupDesiredState struct {
	Enabled       bool   `json:"enabled"`
	Version       string `json:"version"`
	Schedule      string `json:"schedule"`
	RetentionDays int    `json:"retention_days"`
	Target        string `json:"target"`
}
