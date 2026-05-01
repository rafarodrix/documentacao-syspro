package domain

type ModuleStatus string

const (
	ModuleStatusUnknown ModuleStatus = "unknown"
	ModuleStatusReady   ModuleStatus = "ready"
	ModuleStatusMissing ModuleStatus = "missing"
	ModuleStatusError   ModuleStatus = "error"
)

type RemoteDesiredState struct {
	Enabled          bool   `json:"enabled"`
	Version          string `json:"version"`
	Mode             string `json:"mode,omitempty"`
	InstallIfMissing bool   `json:"install_if_missing,omitempty"`
	BootstrapEnabled bool   `json:"bootstrap_enabled,omitempty"`
	SyncEnabled      bool   `json:"sync_enabled,omitempty"`
	DiscoveryToken   string `json:"discovery_token,omitempty"`
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

type SupportDesiredState struct {
	Enabled           bool   `json:"enabled"`
	Version           string `json:"version"`
	Provider          string `json:"provider"`
	WidgetBaseURL     string `json:"widget_base_url"`
	AutoAttachContext bool   `json:"auto_attach_context"`
}

type DeviceDesiredState struct {
	Enabled          bool                  `json:"enabled"`
	Version          string                `json:"version"`
	CollectInventory bool                  `json:"collect_inventory"`
	CollectMetrics   bool                  `json:"collect_metrics"`
	SysproInstalls   []SysproInstallTarget `json:"syspro_installs,omitempty"`
}

// SysproInstallTarget descreve uma instalacao do Syspro que o agente deve monitorar.
// O portal injeta essa lista no desired state; o agente nao descobre os caminhos por conta propria.
// Isso suporta multiplas instalacoes na mesma maquina (uma por empresa).
type SysproInstallTarget struct {
	CompanyID   string `json:"company_id"`
	CompanyName string `json:"company_name"`
	ServerPath  string `json:"server_path"` // ex: "C:\Syspro\Server"
	DataPath    string `json:"data_path"`   // ex: "C:\Syspro\Base" (opcional)
}
