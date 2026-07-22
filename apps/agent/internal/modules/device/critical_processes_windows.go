//go:build windows

package device

import (
	"sort"
	"strconv"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

var watchedCriticalProcesses = map[string]struct{}{
	"fbguard.exe":      {},
	"fbserver.exe":     {},
	"rustdesk.exe":     {},
	"sysproserver.exe": {},
	"w3wp.exe":         {},
}

// criticalProcessStates returns each watched executable and its sorted process
// IDs. PID changes detect a restart even while the executable remains present.
func criticalProcessStates() (map[string]string, error) {
	states := map[string][]uint32{}
	snapshot, err := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if err != nil {
		return nil, err
	}
	defer windows.CloseHandle(snapshot)

	var entry windows.ProcessEntry32
	entry.Size = uint32(unsafe.Sizeof(entry))
	if err := windows.Process32First(snapshot, &entry); err != nil {
		return nil, err
	}
	for {
		name := strings.ToLower(windows.UTF16ToString(entry.ExeFile[:]))
		if _, watched := watchedCriticalProcesses[name]; watched {
			states[name] = append(states[name], entry.ProcessID)
		}
		if err := windows.Process32Next(snapshot, &entry); err != nil {
			break
		}
	}

	result := make(map[string]string, len(states))
	for name, processIDs := range states {
		sort.Slice(processIDs, func(i, j int) bool { return processIDs[i] < processIDs[j] })
		values := make([]string, len(processIDs))
		for i, processID := range processIDs {
			values[i] = strconv.FormatUint(uint64(processID), 10)
		}
		result[name] = strings.Join(values, ",")
	}
	return result, nil
}
