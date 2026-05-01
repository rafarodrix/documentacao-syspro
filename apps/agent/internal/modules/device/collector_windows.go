//go:build windows

package device

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

// driveFixed e o tipo de unidade de disco fixo (DRIVE_FIXED = 3 na API Windows).
const driveFixed = 3

// kernel32 e a DLL de sistema base do Windows.
// GlobalMemoryStatusEx nao e exposto em golang.org/x/sys/windows v0.38 —
// chamamos via NewLazyProc, o mesmo padrao usado em infra/storage/protected_windows.go.
var (
	modKernel32              = windows.NewLazySystemDLL("kernel32.dll")
	procGlobalMemoryStatusEx = modKernel32.NewProc("GlobalMemoryStatusEx")
)

// memoryStatusEx espelha a struct MEMORYSTATUSEX da Win32 API.
// Layout: 4+4+8*7 = 64 bytes, sem padding adicional necessario.
type memoryStatusEx struct {
	Length                uint32
	MemoryLoad            uint32
	TotalPhys             uint64
	AvailPhys             uint64
	TotalPageFile         uint64
	AvailPageFile         uint64
	TotalVirtual          uint64
	AvailVirtual          uint64
	AvailExtendedVirtual  uint64
}

// CollectMetrics coleta memoria via GlobalMemoryStatusEx (API nativa, ~0ms)
// e CPU via PowerShell WMI (~50-80ms).
// Total estimado: 50-100ms — reducao de ~60% em relacao a abordagem 100% PowerShell.
func (c *Collector) CollectMetrics(ctx context.Context) (*AgentMetricsSnapshot, error) {
	totalMB, freeMB, err := c.collectMemoryNative()
	if err != nil {
		return nil, fmt.Errorf("collect memory: %w", err)
	}

	cpuLoad, err := c.collectCPU(ctx)
	if err != nil {
		c.logger.Warn("device: collect CPU failed, reporting 0", "error", err)
		cpuLoad = 0
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

// collectMemoryNative chama GlobalMemoryStatusEx diretamente via syscall.
// Zero subprocess, zero PowerShell, ~0ms.
func (c *Collector) collectMemoryNative() (totalMB, freeMB uint64, err error) {
	var stat memoryStatusEx
	stat.Length = uint32(unsafe.Sizeof(stat))
	r1, _, e := procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&stat)))
	if r1 == 0 {
		return 0, 0, fmt.Errorf("GlobalMemoryStatusEx: %w", e)
	}
	return stat.TotalPhys / 1024 / 1024, stat.AvailPhys / 1024 / 1024, nil
}

// rebootPending verifica se ha reinicializacao pendente via chave de registro Windows.
// Zero PowerShell — leitura direta via golang.org/x/sys/windows/registry.
func (c *Collector) rebootPending() bool {
	k, err := registry.OpenKey(registry.LOCAL_MACHINE,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired`,
		registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	k.Close()
	return true
}

// CollectDisks enumera volumes de disco fixo usando APIs nativas do Windows.
// GetLogicalDriveStrings + GetDriveType + GetDiskFreeSpaceEx + GetVolumeInformation.
// Zero PowerShell, ~0ms total independente do numero de volumes.
func (c *Collector) CollectDisks(_ context.Context) (*DiskVolumeSnapshot, error) {
	snap := &DiskVolumeSnapshot{CollectedAt: nowRFC3339()}

	roots, err := logicalDriveStrings()
	if err != nil {
		return nil, fmt.Errorf("enumerate drives: %w", err)
	}

	for _, root := range roots {
		rootPtr, err := windows.UTF16PtrFromString(root)
		if err != nil {
			continue
		}

		// Ignora tudo que nao for disco fixo local (removivel, rede, CD, etc.)
		if windows.GetDriveType(rootPtr) != driveFixed {
			continue
		}

		var freeBytesAvail, totalBytes, totalFreeBytes uint64
		if err := windows.GetDiskFreeSpaceEx(rootPtr, &freeBytesAvail, &totalBytes, &totalFreeBytes); err != nil {
			c.logger.Warn("device: GetDiskFreeSpaceEx failed", "root", root, "error", err)
			continue
		}

		var volNameBuf [windows.MAX_PATH + 1]uint16
		var fsTypeBuf [windows.MAX_PATH + 1]uint16
		_ = windows.GetVolumeInformation(
			rootPtr,
			&volNameBuf[0], uint32(len(volNameBuf)),
			nil, nil, nil,
			&fsTypeBuf[0], uint32(len(fsTypeBuf)),
		)

		totalMB := totalBytes / 1024 / 1024
		freeMB := totalFreeBytes / 1024 / 1024
		usedMB := totalMB - freeMB
		usedPct := 0.0
		if totalMB > 0 {
			usedPct = float64(usedMB) / float64(totalMB) * 100
		}

		// "C:\" → "C"
		letter := strings.TrimSuffix(strings.TrimSuffix(root, `\`), ":")

		snap.Volumes = append(snap.Volumes, DiskVolume{
			Letter:  letter,
			Label:   windows.UTF16ToString(volNameBuf[:]),
			FsType:  windows.UTF16ToString(fsTypeBuf[:]),
			TotalMB: totalMB,
			FreeMB:  freeMB,
			UsedMB:  usedMB,
			UsedPct: round2(usedPct),
		})
	}
	return snap, nil
}

// logicalDriveStrings chama GetLogicalDriveStrings e retorna a lista de raizes
// no formato ["C:\", "D:\", ...].
func logicalDriveStrings() ([]string, error) {
	var buf [1024]uint16
	n, err := windows.GetLogicalDriveStrings(uint32(len(buf)), &buf[0])
	if err != nil {
		return nil, fmt.Errorf("GetLogicalDriveStrings: %w", err)
	}
	var result []string
	remaining := buf[:n]
	for {
		end := 0
		for end < len(remaining) && remaining[end] != 0 {
			end++
		}
		if end == 0 {
			break
		}
		result = append(result, syscall.UTF16ToString(remaining[:end]))
		if end+1 >= len(remaining) {
			break
		}
		remaining = remaining[end+1:]
	}
	return result, nil
}

// CollectServices verifica o status dos servicos Windows via API nativa do SCM.
// Custo total: < 5ms para todos os servicos. Zero PowerShell.
func (c *Collector) CollectServices(sysproInstalls []SysproInstallTarget) (*SysproProcessSnapshot, error) {
	m, err := mgr.Connect()
	if err != nil {
		return nil, fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	snap := &SysproProcessSnapshot{CollectedAt: nowRFC3339()}

	globals := []struct {
		ServiceName string
		DisplayName string
	}{
		{"FirebirdServerDefaultInstance", "Firebird Server"},
		{"W3SVC", "IIS (W3SVC)"},
		{"RustDesk", "RustDesk"},
	}
	for _, g := range globals {
		status, pid := queryService(m, g.ServiceName)
		snap.Services = append(snap.Services, ServiceStatus{
			Name:        g.ServiceName,
			DisplayName: g.DisplayName,
			Status:      status,
			PID:         pid,
		})
	}

	for _, install := range sysproInstalls {
		status, pid := detectSysproServer(m, install.ServerPath)
		snap.Services = append(snap.Services, ServiceStatus{
			Name:        "SysproServer",
			DisplayName: fmt.Sprintf("SysPro Server (%s)", install.CompanyName),
			Status:      status,
			PID:         pid,
			CompanyID:   install.CompanyID,
		})
	}

	return snap, nil
}

func queryService(m *mgr.Mgr, name string) (status string, pid uint32) {
	s, err := m.OpenService(name)
	if err != nil {
		return "not_installed", 0
	}
	defer s.Close()
	q, err := s.Query()
	if err != nil {
		return "error", 0
	}
	return svcStateToString(q.State), q.ProcessId
}

// detectSysproServer localiza o servico do SysPro Server em tres camadas:
//  1. ServiceName fixo "SysproServer"
//  2. DisplayName contendo "syspro" (cobre versoes com nome diferente)
//  3. Existencia do SysproServer.exe no serverPath
func detectSysproServer(m *mgr.Mgr, serverPath string) (status string, pid uint32) {
	status, pid = queryService(m, "SysproServer")
	if status != "not_installed" {
		return
	}
	names, err := m.ListServices()
	if err == nil {
		for _, name := range names {
			s, err := m.OpenService(name)
			if err != nil {
				continue
			}
			cfg, cfgErr := s.Config()
			s.Close()
			if cfgErr != nil {
				continue
			}
			if strings.Contains(strings.ToLower(cfg.DisplayName), "syspro") {
				status, pid = queryService(m, name)
				return
			}
		}
	}
	if serverPath != "" {
		if _, statErr := os.Stat(filepath.Join(serverPath, "SysproServer.exe")); statErr == nil {
			return "stopped", 0
		}
	}
	return "not_installed", 0
}

func svcStateToString(state svc.State) string {
	switch state {
	case svc.Running:
		return "running"
	case svc.Stopped:
		return "stopped"
	case svc.StartPending:
		return "starting"
	case svc.StopPending:
		return "stopping"
	default:
		return "unknown"
	}
}
