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
//
// Estrategia de coleta:
//   - Memoria: GlobalMemoryStatusEx (API nativa, ~0ms)
//   - Disco: GetLogicalDriveStrings + GetDiskFreeSpaceEx + GetVolumeInformation (API nativa, ~0ms)
//   - Servicos: SCM via svc/mgr (API nativa, ~5ms total)
//   - Reboot pending: registro Windows (API nativa, ~0ms)
//   - CPU load: PowerShell WMI (~50-80ms) — unico uso restante de PowerShell
//   - Versao de executavel: PowerShell (~30ms, coletado a cada 1h)
type Collector struct {
	logger Logger
}

// NewCollector cria um Collector com o logger fornecido.
func NewCollector(logger Logger) *Collector {
	return &Collector{logger: logger}
}

// collectCPU retorna o percentual medio de carga de CPU via WMI.
// Unica coleta que ainda usa PowerShell; todas as demais sao APIs nativas.
// Custo: ~50-80ms por chamada.
func (c *Collector) collectCPU(ctx context.Context) (float64, error) {
	script := `[math]::Round((Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average, 1)`
	out, err := c.runPS(ctx, script)
	if err != nil {
		return 0, fmt.Errorf("collect CPU: %w", err)
	}
	var load float64
	_, err = fmt.Sscanf(strings.TrimSpace(out), "%f", &load)
	if err != nil {
		return 0, fmt.Errorf("parse CPU output %q: %w", out, err)
	}
	return load, nil
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
