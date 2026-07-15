package device

// AgentMetricsSnapshot e enviado em todo ciclo de sync (~45s).
// Contem dados leves de saude da maquina: memoria, CPU e flag de reboot.
type AgentMetricsSnapshot struct {
	CollectedAt   string  `json:"collectedAt"` // RFC3339
	MemoryTotalMB uint64  `json:"memoryTotalMb"`
	MemoryUsedMB  uint64  `json:"memoryUsedMb"`
	MemoryFreeMB  uint64  `json:"memoryFreeMb"`
	MemoryUsedPct float64 `json:"memoryUsedPct"` // 0-100
	CpuLoadPct    float64 `json:"cpuLoadPct"`    // media dos nucleos, 0-100
	RebootPending bool    `json:"rebootPending"`
}

// SystemSnapshot descreve a identidade basica do Windows reportada pelo agente.
type SystemSnapshot struct {
	CollectedAt    string `json:"collectedAt"`
	Hostname       string `json:"hostname"`
	ComputerName   string `json:"computerName"`
	OSName         string `json:"osName"`
	OSVersion      string `json:"osVersion"`
	OSBuild        string `json:"osBuild"`
	OSArchitecture string `json:"osArchitecture"`
}

// NetworkSnapshot agrega adaptadores, enderecos e DNS conhecidos localmente.
type NetworkSnapshot struct {
	CollectedAt string           `json:"collectedAt"`
	Hostname    string           `json:"hostname"`
	DnsServers  []string         `json:"dnsServers,omitempty"`
	Adapters    []NetworkAdapter `json:"adapters"`
}

type NetworkAdapter struct {
	Name         string   `json:"name"`
	FriendlyName string   `json:"friendlyName,omitempty"`
	Mac          string   `json:"mac,omitempty"`
	Mtu          int      `json:"mtu,omitempty"`
	Up           bool     `json:"up"`
	Flags        []string `json:"flags,omitempty"`
	Addresses    []string `json:"addresses,omitempty"`
}

// SoftwareEntry representa um software instalado lido do registry do Windows.
type SoftwareEntry struct {
	Name            string `json:"name"`
	DisplayVersion  string `json:"displayVersion,omitempty"`
	Publisher       string `json:"publisher,omitempty"`
	InstallLocation string `json:"installLocation,omitempty"`
	InstallDate     string `json:"installDate,omitempty"`
	Architecture    string `json:"architecture,omitempty"`
	Source          string `json:"source,omitempty"`
}

// HardwareIdentitySnapshot concentra identificadores e modelo do hardware.
type HardwareIdentitySnapshot struct {
	CollectedAt        string `json:"collectedAt"`
	MachineGuid        string `json:"machineGuid,omitempty"`
	SystemSerial       string `json:"systemSerial,omitempty"`
	SystemManufacturer string `json:"systemManufacturer,omitempty"`
	SystemModel        string `json:"systemModel,omitempty"`
	BaseboardVendor    string `json:"baseboardVendor,omitempty"`
	BaseboardModel     string `json:"baseboardModel,omitempty"`
	BiosVersion        string `json:"biosVersion,omitempty"`
	CPUArchitecture    string `json:"cpuArchitecture,omitempty"`
}

// WindowsUpdateStatusSnapshot resume sinais de update pendente.
type WindowsUpdateStatusSnapshot struct {
	CollectedAt    string   `json:"collectedAt"`
	RebootRequired bool     `json:"rebootRequired"`
	PendingCount   int      `json:"pendingCount"`
	PendingSignals []string `json:"pendingSignals,omitempty"`
}

// DiskVolumeSnapshot lista todos os volumes de disco fixo (DriveType=3).
// Enviado a cada ~3 minutos (4 ciclos de sync de 45s).
type DiskVolumeSnapshot struct {
	CollectedAt string       `json:"collectedAt"`
	Volumes     []DiskVolume `json:"volumes"`
}

// DiskVolume representa um volume de disco individual.
type DiskVolume struct {
	Letter  string  `json:"letter"` // "C", "D", sem dois-pontos
	Label   string  `json:"label"`  // nome do volume (pode ser vazio)
	FsType  string  `json:"fsType"` // "NTFS", "FAT32", ...
	TotalMB uint64  `json:"totalMb"`
	FreeMB  uint64  `json:"freeMb"`
	UsedMB  uint64  `json:"usedMb"`
	UsedPct float64 `json:"usedPct"` // 0-100
}

// SysproProcessSnapshot lista o status dos servicos Windows monitorados.
// Enviado em todo ciclo de sync via API nativa do SCM — custo < 5ms total.
type SysproProcessSnapshot struct {
	CollectedAt string          `json:"collectedAt"`
	Services    []ServiceStatus `json:"services"`
}

// ServiceStatus representa o estado de um servico Windows.
type ServiceStatus struct {
	Name        string `json:"name"`                // ServiceName no SCM
	DisplayName string `json:"displayName"`         // nome amigavel para exibicao
	Status      string `json:"status"`              // "running" | "stopped" | "starting" | "stopping" | "not_installed" | "error"
	StartType   string `json:"startType,omitempty"` // "auto" | "manual" | "disabled" | "delayed_auto" | "unknown"
	PID         uint32 `json:"pid,omitempty"`       // 0 se nao estiver rodando
	CompanyID   string `json:"companyId,omitempty"` // preenchido para servicos vinculados a empresa
}

// AllServicesSnapshot lista todos os servicos Windows registrados no SCM.
// Coletado a cada 4 ciclos (~3 min) junto com o inventario geral.
type AllServicesSnapshot struct {
	CollectedAt string          `json:"collectedAt"`
	Services    []ServiceStatus `json:"services"`
}

// SysproVersionSnapshot contem a versao e estado dos executaveis de cada instalacao Syspro.
// Coletado a cada ~1h (80 ciclos de sync). Usa GetFileVersionInfoW nativo — zero PowerShell.
type SysproVersionSnapshot struct {
	CollectedAt   string              `json:"collectedAt"`
	Installations []SysproInstallInfo `json:"installations"`
}

// SysproInstallInfo descreve o estado atual de uma instalacao Syspro monitorada.
type SysproInstallInfo struct {
	CompanyID   string  `json:"companyId"`
	CompanyName string  `json:"companyName"`
	ServerPath  string  `json:"serverPath"`
	ExeExists   bool    `json:"exeExists"`
	ExeVersion  string  `json:"exeVersion,omitempty"`
	ExeSizeMB   float64 `json:"exeSizeMb,omitempty"`
}
