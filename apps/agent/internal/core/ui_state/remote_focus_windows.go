//go:build windows

package uistate

import (
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	swRestore = 9
)

var (
	modUser32                    = windows.NewLazySystemDLL("user32.dll")
	procEnumWindows              = modUser32.NewProc("EnumWindows")
	procGetWindowThreadProcessID = modUser32.NewProc("GetWindowThreadProcessId")
	procIsWindowVisible          = modUser32.NewProc("IsWindowVisible")
	procIsIconic                 = modUser32.NewProc("IsIconic")
	procShowWindow               = modUser32.NewProc("ShowWindow")
	procSetForegroundWindow      = modUser32.NewProc("SetForegroundWindow")
	procGetWindowTextW           = modUser32.NewProc("GetWindowTextW")
)

func focusRustDeskWindow() bool {
	processIDs := rustDeskProcessIDs()
	if len(processIDs) == 0 {
		return false
	}

	pidSet := make(map[uint32]struct{}, len(processIDs))
	for _, pid := range processIDs {
		pidSet[pid] = struct{}{}
	}

	var target windows.Handle
	callback := windows.NewCallback(func(hwnd uintptr, _ uintptr) uintptr {
		if !belongsToRustDeskWindow(hwnd, pidSet) {
			return 1
		}
		target = windows.Handle(hwnd)
		return 0
	})

	procEnumWindows.Call(callback, 0)
	if target == 0 {
		return false
	}

	if iconic, _, _ := procIsIconic.Call(uintptr(target)); iconic != 0 {
		procShowWindow.Call(uintptr(target), swRestore)
	}

	if shown, _, _ := procShowWindow.Call(uintptr(target), swRestore); shown == 0 {
		// Even when ShowWindow reports no change, SetForegroundWindow can still succeed.
	}

	foreground, _, _ := procSetForegroundWindow.Call(uintptr(target))
	return foreground != 0
}

func rustDeskProcessIDs() []uint32 {
	snap, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil
	}
	defer windows.CloseHandle(snap)

	var entry windows.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))

	if err := windows.Process32First(snap, &entry); err != nil {
		return nil
	}

	processIDs := []uint32{}
	for {
		if strings.EqualFold(windows.UTF16ToString(entry.ExeFile[:]), "rustdesk.exe") {
			processIDs = append(processIDs, entry.ProcessID)
		}

		if err := windows.Process32Next(snap, &entry); err != nil {
			break
		}
	}

	return processIDs
}

func belongsToRustDeskWindow(hwnd uintptr, pidSet map[uint32]struct{}) bool {
	visible, _, _ := procIsWindowVisible.Call(hwnd)
	if visible == 0 {
		return false
	}

	var pid uint32
	procGetWindowThreadProcessID.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
	if _, ok := pidSet[pid]; !ok {
		return false
	}

	return strings.TrimSpace(windowText(windows.Handle(hwnd))) != ""
}

func windowText(hwnd windows.Handle) string {
	buffer := make([]uint16, 256)
	length, _, _ := procGetWindowTextW.Call(
		uintptr(hwnd),
		uintptr(unsafe.Pointer(&buffer[0])),
		uintptr(len(buffer)),
	)
	if length == 0 {
		return ""
	}
	return windows.UTF16ToString(buffer[:length])
}
