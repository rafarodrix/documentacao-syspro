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

const driveFixed = 3

var (
	modKernel32              = windows.NewLazySystemDLL("kernel32.dll")
	procGlobalMemoryStatusEx = modKernel32.NewProc("GlobalMemoryStatusEx")
	procGetSystemTimes       = modKernel32.NewProc("GetSystemTimes")

	modVersion                  = windows.NewLazySystemDLL("version.dll")
	procGetFileVersionInfoSizeW = modVersion.NewProc("GetFileVersionInfoSizeW")
	procGetFileVersionInfoW     = modVersion.NewProc("GetFileVersionInfoW")
	procVerQueryValueW          = modVersion.NewProc("VerQueryValueW")
)

// memoryStatusEx espelha a struct MEMORYSTATUSEX da Win32 API (64 bytes).
type memoryStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

// vsFixedFileInfo espelha VS_FIXEDFILEINFO de version.h.
type vsFixedFileInfo struct {
	Signature        uint32
	StrucVersion     uint32
	FileVersionMS    uint32
	FileVersionLS    uint32
	ProductVersionMS uint32
	ProductVersionLS uint32
	FileFlagsMask    uint32
	FileFlags        uint32
	FileOS           uint32
	FileType         uint32
	FileSubtype      uint32
	FileDateMS       uint32
	FileDateLS       uint32
}

// CollectMetrics coleta memoria, CPU e reboot pending via APIs nativas Win32.
// Zero PowerShell, zero subprocess. Custo total < 1ms.
func (c *Collector) CollectMetrics(_ context.Context) (*AgentMetricsSnapshot, error) {
	totalMB, freeMB, err := c.collectMemoryNative()
	if err != nil {
		return nil, fmt.Errorf("collect memory: %w", err)
	}

	cpuLoad := c.collectCPUNative()

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

// collectMemoryNative chama GlobalMemoryStatusEx via syscall. Zero subprocess, ~0ms.
func (c *Collector) collectMemoryNative() (totalMB, freeMB uint64, err error) {
	var stat memoryStatusEx
	stat.Length = uint32(unsafe.Sizeof(stat))
	r1, _, e := procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&stat)))
	if r1 == 0 {
		return 0, 0, fmt.Errorf("GlobalMemoryStatusEx: %w", e)
	}
	return stat.TotalPhys / 1024 / 1024, stat.AvailPhys / 1024 / 1024, nil
}

// collectCPUNative calcula o percentual de carga de CPU usando GetSystemTimes
// com delta entre o ciclo atual e o anterior. Zero subprocess, ~0ms.
//
// GetSystemTimes retorna tempo acumulado em unidades de 100ns desde o boot:
//   - kernelTime inclui idleTime
//   - busy = (deltaKernel + deltaUser) - deltaIdle
//   - cpuPct = busy / (deltaKernel + deltaUser) * 100
//
// Na primeira chamada nao ha delta: armazena o sample e retorna 0.
func (c *Collector) collectCPUNative() float64 {
	var idleTime, kernelTime, userTime windows.Filetime
	r1, _, _ := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idleTime)),
		uintptr(unsafe.Pointer(&kernelTime)),
		uintptr(unsafe.Pointer(&userTime)),
	)
	if r1 == 0 {
		return 0
	}

	toU64 := func(ft windows.Filetime) uint64 {
		return uint64(ft.HighDateTime)<<32 | uint64(ft.LowDateTime)
	}
	idle := toU64(idleTime)
	kernel := toU64(kernelTime)
	user := toU64(userTime)

	if !c.hasPrevCPU {
		c.prevCPUIdle = idle
		c.prevCPUKernel = kernel
		c.prevCPUUser = user
		c.hasPrevCPU = true
		return 0
	}

	deltaIdle := idle - c.prevCPUIdle
	deltaKernel := kernel - c.prevCPUKernel
	deltaUser := user - c.prevCPUUser

	c.prevCPUIdle = idle
	c.prevCPUKernel = kernel
	c.prevCPUUser = user

	deltaTotal := deltaKernel + deltaUser
	if deltaTotal == 0 {
		return 0
	}
	return round2(float64(deltaTotal-deltaIdle) / float64(deltaTotal) * 100)
}

// rebootPending verifica reinicializacao pendente via chave de registro. Zero PowerShell, ~0ms.
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

// CollectDisks enumera volumes de disco fixo via APIs nativas.
// GetLogicalDriveStrings + GetDriveType + GetDiskFreeSpaceEx + GetVolumeInformation.
// Zero PowerShell, ~0ms total.
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

// logicalDriveStrings retorna raizes de drives no formato ["C:\", "D:\", ...].
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

// CollectServices verifica servicos Windows via SCM nativo. Custo < 5ms. Zero PowerShell.
func (c *Collector) CollectServices(sysproTopology *SysproVersionSnapshot) (*SysproProcessSnapshot, error) {
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

	if sysproTopology != nil {
		for _, group := range sysproTopology.InstallationGroups {
			for _, server := range group.ServerInstances {
				if !strings.EqualFold(server.Validation.Status, "VALIDATED") {
					continue
				}
				status, pid := detectSysproServer(m, server.RootPath, server.ExecutablePath)
				displayName := "Syspro Server"
				if len(server.CompanyHints) > 0 && strings.TrimSpace(server.CompanyHints[0].CompanyName) != "" {
					displayName = fmt.Sprintf("Syspro Server (%s)", server.CompanyHints[0].CompanyName)
				} else if base := filepath.Base(server.RootPath); strings.TrimSpace(base) != "" {
					displayName = fmt.Sprintf("Syspro Server (%s)", base)
				}
				snap.Services = append(snap.Services, ServiceStatus{
					Name:             "SysproServer",
					DisplayName:      displayName,
					Status:           status,
					PID:              pid,
					CompanyID:        firstServerCompanyID(server.CompanyHints),
					InstanceID:       server.ID,
					RootPath:         server.RootPath,
					ValidationStatus: server.Validation.Status,
				})
			}
		}
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

// detectSysproServer localiza o servico SysPro Server em tres camadas:
//  1. ServiceName fixo "SysproServer"
//  2. DisplayName contendo "syspro" (cobre versoes com nome diferente)
//  3. Existencia do SysproServer.exe na instancia validada
func detectSysproServer(m *mgr.Mgr, serverPath string, executablePath string) (status string, pid uint32) {
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

	switch {
	case executablePath != "":
		if _, statErr := os.Stat(executablePath); statErr == nil {
			return "stopped", 0
		}
	case serverPath != "":
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

func svcStartTypeToString(startType uint32) string {
	switch startType {
	case windows.SERVICE_AUTO_START:
		return "auto"
	case windows.SERVICE_DEMAND_START:
		return "manual"
	case windows.SERVICE_DISABLED:
		return "disabled"
	case windows.SERVICE_BOOT_START, windows.SERVICE_SYSTEM_START:
		return "auto"
	default:
		return "unknown"
	}
}

// CollectAllServices enumera todos os servicos Windows registrados no SCM.
// Usa mgr.ListServices + Config + Query para obter nome, status e tipo de inicio.
// Custo ~20-50ms para ~200-300 servicos tipicos. Zero PowerShell.
func (c *Collector) CollectAllServices() (*AllServicesSnapshot, error) {
	m, err := mgr.Connect()
	if err != nil {
		return nil, fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	names, err := m.ListServices()
	if err != nil {
		return nil, fmt.Errorf("list services: %w", err)
	}

	snap := &AllServicesSnapshot{CollectedAt: nowRFC3339()}
	snap.Services = make([]ServiceStatus, 0, len(names))

	for _, name := range names {
		s, openErr := m.OpenService(name)
		if openErr != nil {
			continue
		}

		cfg, cfgErr := s.Config()
		q, qErr := s.Query()
		s.Close()

		entry := ServiceStatus{
			Name: name,
		}

		if cfgErr == nil {
			entry.DisplayName = cfg.DisplayName
			entry.StartType = svcStartTypeToString(cfg.StartType)
		} else {
			entry.DisplayName = name
			entry.StartType = "unknown"
		}

		if qErr == nil {
			entry.Status = svcStateToString(q.State)
			entry.PID = q.ProcessId
		} else {
			entry.Status = "error"
		}

		snap.Services = append(snap.Services, entry)
	}

	return snap, nil
}

// readExeVersionDetails le ProductVersion e FileVersion de um executavel PE via
// GetFileVersionInfoW + VerQueryValueW. Zero PowerShell, zero subprocess, funciona
// em Session 0 (LocalSystem). Custo ~0ms.
func (c *Collector) readExeVersionDetails(exePath string) SysproExecutableVersion {
	pathPtr, err := windows.UTF16PtrFromString(exePath)
	if err != nil {
		return SysproExecutableVersion{}
	}

	var handle uintptr
	size, _, _ := procGetFileVersionInfoSizeW.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		uintptr(unsafe.Pointer(&handle)),
	)
	if size == 0 {
		return SysproExecutableVersion{}
	}

	buf := make([]byte, size)
	r1, _, _ := procGetFileVersionInfoW.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		0,
		size,
		uintptr(unsafe.Pointer(&buf[0])),
	)
	if r1 == 0 {
		return SysproExecutableVersion{}
	}

	var info *vsFixedFileInfo
	var infoLen uint32
	subBlock, _ := windows.UTF16PtrFromString(`\`)
	r1, _, _ = procVerQueryValueW.Call(
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(subBlock)),
		uintptr(unsafe.Pointer(&info)),
		uintptr(unsafe.Pointer(&infoLen)),
	)
	if r1 == 0 || info == nil {
		return SysproExecutableVersion{}
	}

	formatVersion := func(ms, ls uint32) string {
		major := ms >> 16
		minor := ms & 0xFFFF
		patch := ls >> 16
		build := ls & 0xFFFF
		return fmt.Sprintf("%d.%d.%d.%d", major, minor, patch, build)
	}

	return SysproExecutableVersion{
		ProductVersion: formatVersion(info.ProductVersionMS, info.ProductVersionLS),
		FileVersion:    formatVersion(info.FileVersionMS, info.FileVersionLS),
		Source:         "EXECUTABLE_VERSION_RESOURCE",
	}
}

func firstServerCompanyID(hints []SysproCompanyHint) string {
	for _, hint := range hints {
		if strings.TrimSpace(hint.CompanyID) != "" {
			return hint.CompanyID
		}
	}
	return ""
}
