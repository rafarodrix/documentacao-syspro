package device

// AgentMetricsSnapshot e enviado em todo ciclo de sync (~45s).
// Contem dados leves de saude da maquina: memoria, CPU e flag de reboot.
type AgentMetricsSnapshot struct {
	CollectedAt   string  `json:"collectedAt"`   // RFC3339
	MemoryTotalMB uint64  `json:"memoryTotalMb"`
	MemoryUsedMB  uint64  `json:"memoryUsedMb"`
	MemoryFreeMB  uint64  `json:"memoryFreeMb"`
	MemoryUsedPct float64 `json:"memoryUsedPct"` // 0-100
	CpuLoadPct    float64 `json:"cpuLoadPct"`    // media dos nucleos, 0-100
	RebootPending bool    `json:"rebootPending"`
}

// DiskVolumeSnapshot lista todos os volumes de disco fixo (DriveType=3).
// Enviado a cada ~3 minutos (4 ciclos de sync de 45s).
type DiskVolumeSnapshot struct {
	CollectedAt string       `json:"collectedAt"`
	Volumes     []DiskVolume `json:"volumes"`
}

// DiskVolume representa um volume de disco individual.
type DiskVolume struct {
	Letter  string  `json:"letter"`  // "C", "D", sem dois-pontos
	Label   string  `json:"label"`   // nome do volume (pode ser vazio)
	FsType  string  `json:"fsType"`  // "NTFS", "FAT32", ...
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
	Name        string `json:"name"`                   // ServiceName no SCM
	DisplayName string `json:"displayName"`            // nome amigavel para exibicao
	Status      string `json:"status"`                 // "running" | "stopped" | "starting" | "stopping" | "not_installed" | "error"
	PID         uint32 `json:"pid,omitempty"`          // 0 se nao estiver rodando
	CompanyID   string `json:"companyId,omitempty"`    // preenchido para servicos vinculados a empresa
}

// SysproVersionSnapshot contem a versao e estado dos executaveis de cada instalacao Syspro.
// Coletado a cada ~1h (80 ciclos de sync). Usa GetFileVersionInfoW ou PowerShell.
type SysproVersionSnapshot struct {
	CollectedAt   string               `json:"collectedAt"`
	Installations []SysproInstallInfo  `json:"installations"`
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
