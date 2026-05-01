package device

import (
	"context"
	"math"
	"os"
	"path/filepath"
	"time"
)

// Logger define o contrato de logging esperado pelo Collector.
type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
	Error(msg string, kv ...any)
}

// SysproInstallTarget replica o campo do desired state para evitar import circular.
// O module.go converte domain.SysproInstallTarget para este tipo.
type SysproInstallTarget struct {
	CompanyID   string
	CompanyName string
	ServerPath  string
	DataPath    string
}

// Collector executa coleta de metricas do sistema operacional Windows.
//
// Todas as coletas usam APIs nativas Win32 — zero PowerShell, zero subprocess:
//   - Memoria:       GlobalMemoryStatusEx (~0ms)
//   - CPU load:      GetSystemTimes com delta entre ciclos (~0ms)
//   - Disco:         GetLogicalDriveStrings + GetDiskFreeSpaceEx + GetVolumeInformation (~0ms)
//   - Servicos:      SCM via svc/mgr (~5ms total)
//   - Reboot:        registro Windows (~0ms)
//   - Versao de exe: GetFileVersionInfoW + VerQueryValueW (~0ms)
type Collector struct {
	logger Logger

	// Estado para calculo de CPU por delta de GetSystemTimes.
	// Inicializado na primeira coleta; zerado nao produz erro, apenas retorna 0%.
	prevCPUIdle   uint64
	prevCPUKernel uint64
	prevCPUUser   uint64
	hasPrevCPU    bool
}

// NewCollector cria um Collector com o logger fornecido.
func NewCollector(logger Logger) *Collector {
	return &Collector{logger: logger}
}

// CollectSysproVersions le a versao e valida a existencia do SysproServer.exe
// para cada instalacao configurada no desired state.
// Coletado a cada ~1h (80 ciclos). Usa GetFileVersionInfoW nativo — zero PowerShell.
func (c *Collector) CollectSysproVersions(_ context.Context, installs []SysproInstallTarget) *SysproVersionSnapshot {
	snap := &SysproVersionSnapshot{CollectedAt: nowRFC3339()}
	for _, install := range installs {
		info := SysproInstallInfo{
			CompanyID:   install.CompanyID,
			CompanyName: install.CompanyName,
			ServerPath:  install.ServerPath,
		}

		exePath := filepath.Join(install.ServerPath, "SysproServer.exe")
		fi, err := os.Stat(exePath)
		if err != nil {
			snap.Installations = append(snap.Installations, info)
			continue
		}

		info.ExeExists = true
		info.ExeSizeMB = round2(float64(fi.Size()) / 1024 / 1024)
		info.ExeVersion = c.readExeVersion(exePath) // implementado em collector_windows.go
		snap.Installations = append(snap.Installations, info)
	}
	return snap
}

func nowRFC3339() string { return time.Now().UTC().Format(time.RFC3339) }

func round2(v float64) float64 { return math.Round(v*100) / 100 }
