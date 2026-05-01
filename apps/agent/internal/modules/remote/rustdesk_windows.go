//go:build windows

package remote

import (
	"fmt"
	"strings"
	"time"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

const rustDeskServiceName = "RustDesk"

// ── Service control ──────────────────────────────────────────────────────────

func rustdeskServiceStatus() string {
	m, err := mgr.Connect()
	if err != nil {
		return "unknown"
	}
	defer m.Disconnect()

	s, err := m.OpenService(rustDeskServiceName)
	if err != nil {
		return "missing"
	}
	defer s.Close()

	q, err := s.Query()
	if err != nil {
		return "unknown"
	}
	switch q.State {
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

func rustdeskServiceStart() error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect SCM: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(rustDeskServiceName)
	if err != nil {
		return fmt.Errorf("open service: %w", err)
	}
	defer s.Close()
	err = s.Start()
	if err != nil {
		lower := strings.ToLower(err.Error())
		if strings.Contains(lower, "already been started") || strings.Contains(lower, "service has already been started") {
			return nil
		}
		return err
	}
	return nil
}

func rustdeskServiceStop() error {
	m, err := mgr.Connect()
	if err != nil {
		return fmt.Errorf("connect SCM: %w", err)
	}
	defer m.Disconnect()

	s, err := m.OpenService(rustDeskServiceName)
	if err != nil {
		return nil // not installed — nothing to stop
	}
	defer s.Close()

	_, err = s.Control(svc.Stop)
	// "has not been started" means it is already stopped — not an error.
	if err != nil && !strings.Contains(strings.ToLower(err.Error()), "has not been started") {
		return fmt.Errorf("stop service: %w", err)
	}
	return nil
}

// rustdeskServiceRestart stops the RustDesk service and starts it again.
// Waits up to 10 s for the stopped state before re-starting.
func rustdeskServiceRestart() error {
	_ = rustdeskServiceStop()
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		if rustdeskServiceStatus() == "stopped" {
			break
		}
		time.Sleep(300 * time.Millisecond)
	}
	return rustdeskServiceStart()
}

func waitForRustDeskServiceState(expected string, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if rustdeskServiceStatus() == expected {
			return true
		}
		time.Sleep(400 * time.Millisecond)
	}
	return rustdeskServiceStatus() == expected
}

// ── Process control ──────────────────────────────────────────────────────────

// killRustDeskProcesses terminates every running rustdesk.exe process.
// Uses CreateToolhelp32Snapshot — zero subprocess, zero PowerShell, ~0 ms.
func killRustDeskProcesses() {
	snap, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return
	}
	defer windows.CloseHandle(snap)

	var entry windows.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))

	if err := windows.Process32First(snap, &entry); err != nil {
		return
	}
	for {
		if strings.EqualFold(windows.UTF16ToString(entry.ExeFile[:]), "rustdesk.exe") {
			if h, err := windows.OpenProcess(windows.PROCESS_TERMINATE, false, entry.ProcessID); err == nil {
				_ = windows.TerminateProcess(h, 1)
				windows.CloseHandle(h)
			}
		}
		if err := windows.Process32Next(snap, &entry); err != nil {
			break
		}
	}
}

// ── Exe version ──────────────────────────────────────────────────────────────

var (
	modVersion                  = windows.NewLazySystemDLL("version.dll")
	procGetFileVersionInfoSizeW = modVersion.NewProc("GetFileVersionInfoSizeW")
	procGetFileVersionInfoW     = modVersion.NewProc("GetFileVersionInfoW")
	procVerQueryValueW          = modVersion.NewProc("VerQueryValueW")
)

// vsFixedFileInfo mirrors VS_FIXEDFILEINFO from version.h.
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

// readExeProductVersion reads the ProductVersion resource from a Windows PE
// executable via GetFileVersionInfoW + VerQueryValueW.
// Zero subprocess, zero PowerShell, works in Session 0. Cost: ~0 ms.
func readExeProductVersion(exePath string) string {
	pathPtr, err := windows.UTF16PtrFromString(exePath)
	if err != nil {
		return ""
	}

	var handle uintptr
	size, _, _ := procGetFileVersionInfoSizeW.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		uintptr(unsafe.Pointer(&handle)),
	)
	if size == 0 {
		return ""
	}

	buf := make([]byte, size)
	r1, _, _ := procGetFileVersionInfoW.Call(
		uintptr(unsafe.Pointer(pathPtr)),
		0,
		size,
		uintptr(unsafe.Pointer(&buf[0])),
	)
	if r1 == 0 {
		return ""
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
		return ""
	}

	major := info.ProductVersionMS >> 16
	minor := info.ProductVersionMS & 0xFFFF
	patch := info.ProductVersionLS >> 16
	build := info.ProductVersionLS & 0xFFFF
	return fmt.Sprintf("%d.%d.%d.%d", major, minor, patch, build)
}

// ── Elevation ────────────────────────────────────────────────────────────────

// isProcessElevated reports whether the current process has Administrator
// privileges via OpenCurrentProcessToken. Zero subprocess, zero PowerShell.
func isProcessElevated() bool {
	token, err := windows.OpenCurrentProcessToken()
	if err != nil {
		return false
	}
	defer token.Close()
	return token.IsElevated()
}

// ── Reboot pending ───────────────────────────────────────────────────────────

// isRebootPendingNative checks three registry locations for pending-reboot
// indicators. Zero subprocess, zero PowerShell.
func isRebootPendingNative() bool {
	for _, key := range []string{
		`SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending`,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired`,
	} {
		k, err := registry.OpenKey(registry.LOCAL_MACHINE, key, registry.QUERY_VALUE)
		if err == nil {
			k.Close()
			return true
		}
	}

	k, err := registry.OpenKey(registry.LOCAL_MACHINE,
		`SYSTEM\CurrentControlSet\Control\Session Manager`,
		registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	defer k.Close()

	vals, _, err := k.GetStringsValue("PendingFileRenameOperations")
	return err == nil && len(vals) > 0
}
