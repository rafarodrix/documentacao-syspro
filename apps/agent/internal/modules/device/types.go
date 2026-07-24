package device

// AgentMetricsSnapshot descreve saude leve da maquina: memoria, CPU e reboot.
// Cadencia controlada pelo perfil de coleta (ex.: 1 min em servidor, 5 min em estacao).
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
	Name             string `json:"name"`                       // ServiceName no SCM
	DisplayName      string `json:"displayName"`                // nome amigavel para exibicao
	Status           string `json:"status"`                     // "running" | "stopped" | "starting" | "stopping" | "not_installed" | "error"
	StartType        string `json:"startType,omitempty"`        // "auto" | "manual" | "disabled" | "delayed_auto" | "unknown"
	PID              uint32 `json:"pid,omitempty"`              // 0 se nao estiver rodando
	CompanyID        string `json:"companyId,omitempty"`        // preenchido para servicos vinculados a empresa
	InstanceID       string `json:"instanceId,omitempty"`       // instancia Syspro validada associada
	RootPath         string `json:"rootPath,omitempty"`         // diretorio raiz da instancia validada
	ValidationStatus string `json:"validationStatus,omitempty"` // VALIDATED | PARTIAL
}

// AllServicesSnapshot lista todos os servicos Windows registrados no SCM.
// Ativo tipicamente no perfil server_syspro; desligado em estacao/terminal/unlinked.
type AllServicesSnapshot struct {
	CollectedAt string          `json:"collectedAt"`
	Services    []ServiceStatus `json:"services"`
}

// SysproVersionSnapshot contem a topologia descoberta do Syspro na maquina.
// O agente trata os caminhos vindos do portal como hints e promove apenas
// instancias validadas de SysproServer.exe para diagnostico profundo.
type SysproVersionSnapshot struct {
	CollectedAt          string                    `json:"collectedAt"`
	MachineRole          string                    `json:"machineRole"`
	ValidatedServerCount int                       `json:"validatedServerCount"`
	InstallationGroups   []SysproInstallationGroup `json:"installationGroups"`
}

type SysproInstallationGroup struct {
	ID                string                 `json:"id"`
	RootPath          string                 `json:"rootPath"`
	Roles             []string               `json:"roles,omitempty"`
	Classification    string                 `json:"classification"`
	Confidence        string                 `json:"confidence,omitempty"`
	ClientInstances   []SysproClientInstance `json:"clientInstances,omitempty"`
	ServerInstances   []SysproServerInstance `json:"serverInstances,omitempty"`
	SharedDirectories []string               `json:"sharedDirectories,omitempty"`
	DiscoveryEvidence []string               `json:"discoveryEvidence,omitempty"`
}

type SysproClientInstance struct {
	RootPath string   `json:"rootPath"`
	Status   string   `json:"status"`
	Evidence []string `json:"evidence,omitempty"`
}

type SysproServerInstance struct {
	ID                string                  `json:"id"`
	RootPath          string                  `json:"rootPath"`
	ExecutablePath    string                  `json:"executablePath,omitempty"`
	ConfigurationPath string                  `json:"configurationPath,omitempty"`
	IsapiDLLPath      string                  `json:"isapiDllPath,omitempty"`
	DataDirectories   []SysproDataDirectory   `json:"dataDirectories,omitempty"`
	Version           SysproExecutableVersion `json:"version"`
	Update            SysproUpdateInfo        `json:"update"`
	Execution         SysproServerExecution   `json:"execution"`
	Validation        SysproValidation        `json:"validation"`
	CompanyHints      []SysproCompanyHint     `json:"companyHints,omitempty"`
	ExecutableSizeMB  float64                 `json:"executableSizeMb,omitempty"`
}

type SysproDataDirectory struct {
	Path      string `json:"path"`
	Source    string `json:"source"`
	Validated bool   `json:"validated"`
}

type SysproExecutableVersion struct {
	ProductVersion string `json:"productVersion,omitempty"`
	FileVersion    string `json:"fileVersion,omitempty"`
	Source         string `json:"source,omitempty"`
}

type SysproUpdateInfo struct {
	UpdatedAt  string `json:"updatedAt,omitempty"`
	Source     string `json:"source,omitempty"`
	Confidence string `json:"confidence,omitempty"`
}

type SysproServerExecution struct {
	ProcessRunning bool   `json:"processRunning"`
	ServiceStatus  string `json:"serviceStatus,omitempty"`
	PID            uint32 `json:"pid,omitempty"`
}

type SysproValidation struct {
	Status   string   `json:"status"`
	Evidence []string `json:"evidence,omitempty"`
}

type SysproCompanyHint struct {
	CompanyID   string `json:"companyId,omitempty"`
	CompanyName string `json:"companyName,omitempty"`
	Path        string `json:"path,omitempty"`
	Source      string `json:"source,omitempty"`
}
