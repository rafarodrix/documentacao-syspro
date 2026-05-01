package device

import (
	"context"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Logger define o contrato de logging esperado pelo Collector.
type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
	Error(msg string, kv ...any)
}

// Collector executa coleta de metricas do sistema operacional Windows.
// Operacoes leves (status de servico) usam a API nativa do SCM via collector_windows.go.
// Operacoes de leitura de WMI usam PowerShell.
type Collector struct {
	logger Logger
}

// NewCollector cria um Collector com o logger fornecido.
func NewCollector(logger Logger) *Collector {
	return &Collector{logger: logger}
}

// CollectMetrics coleta memoria (total/usado/livre), CPU load e reboot pending
// em um unico script PowerShell para minimizar subprocessos.
// Custo estimado: 100-200ms.
func (c *Collector) CollectMetrics(ctx context.Context) (*AgentMetricsSnapshot, error) {
	// Retorna: totalMB,freeMB,cpuLoad
	// Reboot pending e verificado via registro (collector_windows.go / collector_other.go).
	script := `
$os  = Get-WmiObject Win32_OperatingSystem
$cpu = (Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
"{0},{1},{2}" -f [long]($os.TotalVisibleMemorySize/1KB), [long]($os.FreePhysicalMemory/1KB), [math]::Round($cpu,1)
`
	out, err := c.runPS(ctx, script)
	if err != nil {
		return nil, fmt.Errorf("collect metrics: %w", err)
	}

	var totalMB, freeMB uint64
	var cpuLoad float64
	_, err = fmt.Sscanf(strings.TrimSpace(out), "%d,%d,%f", &totalMB, &freeMB, &cpuLoad)
	if err != nil {
		return nil, fmt.Errorf("parse metrics output %q: %w", out, err)
	}

	usedMB := totalMB - freeMB
	usedPct := 0.0
	if totalMB > 0 {
		usedPct = float64(usedMB) / float64(totalMB) * 100
	}

	return &AgentMetricsSnapshot{
		CollectedAt:   nowRFC3339(),
		MemoryTotalMB: totalMB,
		MemoryUsedMB:  usedMB,
		MemoryFreeMB:  freeMB,
		MemoryUsedPct: round2(usedPct),
		CpuLoadPct:    cpuLoad,
		RebootPending: c.rebootPending(),
	}, nil
}

// CollectDisks coleta volumes de disco fixo (DriveType=3) via PowerShell/WMI.
// Retorna uma entrada por unidade (C, D, ...) com total, livre e percentual usado.
// Custo estimado: 100-150ms.
func (c *Collector) CollectDisks(ctx context.Context) (*DiskVolumeSnapshot, error) {
	script := `
Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $tot  = [long]($_.Size/1MB)
    $free = [long]($_.FreeSpace/1MB)
    $used = $tot - $free
    $pct  = if ($tot -gt 0) { [math]::Round($used*100/$tot,1) } else { 0 }
    "{0}|{1}|{2}|{3}|{4}|{5}" -f $_.DeviceID.Replace(':',''), $_.VolumeName, $_.FileSystem, $tot, $free, $pct
}
`
	out, err := c.runPS(ctx, script)
	if err != nil {
		return nil, fmt.Errorf("collect disks: %w", err)
	}

	snap := &DiskVolumeSnapshot{CollectedAt: nowRFC3339()}
	for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 6)
		if len(parts) != 6 {
			continue
		}
		var total, free uint64
		var pct float64
		fmt.Sscanf(parts[3], "%d", &total)
		fmt.Sscanf(parts[4], "%d", &free)
		fmt.Sscanf(parts[5], "%f", &pct)
		snap.Volumes = append(snap.Volumes, DiskVolume{
			Letter:  parts[0],
			Label:   parts[1],
			FsType:  parts[2],
			TotalMB: total,
			FreeMB:  free,
			UsedMB:  total - free,
			UsedPct: pct,
		})
	}
	return snap, nil
}

// CollectSysproVersions le a versao e valida a existencia do SysproServer.exe
// para cada instalacao configurada no desired state.
// Coletado a cada ~1h (80 ciclos). Usa PowerShell para leitura de versao do PE.
func (c *Collector) CollectSysproVersions(ctx context.Context, installs []SysproInstallTarget) *SysproVersionSnapshot {
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
			info.ExeExists = false
			snap.Installations = append(snap.Installations, info)
			continue
		}

		info.ExeExists = true
		info.ExeSizeMB = round2(float64(fi.Size()) / 1024 / 1024)
		info.ExeVersion = c.readExeVersion(ctx, exePath)
		snap.Installations = append(snap.Installations, info)
	}
	return snap
}

// readExeVersion le o ProductVersion de um executavel Windows via PowerShell.
func (c *Collector) readExeVersion(ctx context.Context, exePath string) string {
	escaped := strings.ReplaceAll(exePath, "'", "''")
	script := fmt.Sprintf(
		`(Get-Item '%s' -ErrorAction SilentlyContinue).VersionInfo.ProductVersion`,
		escaped,
	)
	out, err := c.runPS(ctx, script)
	if err != nil {
		c.logger.Warn("device: read exe version failed", "path", exePath, "error", err)
		return ""
	}
	return strings.TrimSpace(out)
}

// SysproInstallTarget replica o campo do desired state para evitar import circular.
// O module.go converte domain.SysproInstallTarget para este tipo.
type SysproInstallTarget struct {
	CompanyID   string
	CompanyName string
	ServerPath  string
	DataPath    string
}

// runPS executa um script PowerShell e retorna a saida combinada.
// Mesmo padrao de exec.CommandContext ja usado em modules/remote/rustdesk.go.
func (c *Collector) runPS(ctx context.Context, script string) (string, error) {
	cmd := exec.CommandContext(ctx, "powershell.exe",
		"-NoProfile", "-NonInteractive", "-Command", script)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return string(out), nil
}

func nowRFC3339() string { return time.Now().UTC().Format(time.RFC3339) }

func round2(v float64) float64 { return math.Round(v*100) / 100 }
