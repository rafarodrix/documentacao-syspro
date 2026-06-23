//go:build windows

package device

import (
	"context"
	"net"
	"os"
	"runtime"
	"sort"
	"strings"

	"golang.org/x/sys/windows/registry"
)

const maxSoftwareEntries = 200

func (c *Collector) CollectSystemSnapshot(_ context.Context) (*SystemSnapshot, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return nil, err
	}

	key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion`, registry.QUERY_VALUE)
	if err != nil {
		return &SystemSnapshot{
			CollectedAt:    nowRFC3339(),
			Hostname:       hostname,
			ComputerName:   hostname,
			OSArchitecture: runtime.GOARCH,
		}, nil
	}
	defer key.Close()

	return &SystemSnapshot{
		CollectedAt:    nowRFC3339(),
		Hostname:       hostname,
		ComputerName:   hostname,
		OSName:         firstRegistryStringValue(key, "ProductName"),
		OSVersion:      firstNonEmptyString(firstRegistryStringValue(key, "DisplayVersion"), firstRegistryStringValue(key, "ReleaseId")),
		OSBuild:        firstNonEmptyString(firstRegistryStringValue(key, "CurrentBuildNumber"), firstRegistryStringValue(key, "CurrentBuild")),
		OSArchitecture: runtime.GOARCH,
	}, nil
}

func (c *Collector) CollectNetworkSnapshot(_ context.Context) (*NetworkSnapshot, error) {
	hostname, _ := os.Hostname()
	snap := &NetworkSnapshot{
		CollectedAt: nowRFC3339(),
		Hostname:    hostname,
		DnsServers:  collectDnsServers(),
	}

	ifaces, err := net.Interfaces()
	if err != nil {
		return nil, err
	}

	for _, iface := range ifaces {
		entry := NetworkAdapter{
			Name:         iface.Name,
			FriendlyName: iface.Name,
			Mac:          iface.HardwareAddr.String(),
			Mtu:          iface.MTU,
			Up:           iface.Flags&net.FlagUp != 0,
			Flags:        networkFlagsToStrings(iface.Flags),
		}

		addrs, err := iface.Addrs()
		if err == nil {
			for _, addr := range addrs {
				raw := addr.String()
				if slash := strings.Index(raw, "/"); slash >= 0 {
					raw = raw[:slash]
				}
				raw = strings.TrimSpace(raw)
				if raw == "" {
					continue
				}
				entry.Addresses = append(entry.Addresses, raw)
			}
			sort.Strings(entry.Addresses)
		}

		snap.Adapters = append(snap.Adapters, entry)
	}

	sort.Slice(snap.Adapters, func(i, j int) bool {
		if snap.Adapters[i].Up != snap.Adapters[j].Up {
			return snap.Adapters[i].Up
		}
		return strings.ToLower(snap.Adapters[i].Name) < strings.ToLower(snap.Adapters[j].Name)
	})

	return snap, nil
}

func (c *Collector) CollectSoftwareSnapshot(_ context.Context) ([]SoftwareEntry, error) {
	sources := []struct {
		path         string
		architecture string
	}{
		{path: `SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`, architecture: "x64"},
		{path: `SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`, architecture: "x86"},
	}

	entries := make([]SoftwareEntry, 0, 64)
	seen := make(map[string]struct{})

	for _, source := range sources {
		key, err := registry.OpenKey(registry.LOCAL_MACHINE, source.path, registry.ENUMERATE_SUB_KEYS|registry.QUERY_VALUE)
		if err != nil {
			continue
		}

		names, err := key.ReadSubKeyNames(-1)
		if err != nil {
			key.Close()
			continue
		}

		for _, name := range names {
			subKey, err := registry.OpenKey(key, name, registry.QUERY_VALUE)
			if err != nil {
				continue
			}

			displayName := strings.TrimSpace(firstRegistryStringValue(subKey, "DisplayName"))
			if displayName == "" {
				subKey.Close()
				continue
			}

			entry := SoftwareEntry{
				Name:            displayName,
				DisplayVersion:  strings.TrimSpace(firstRegistryStringValue(subKey, "DisplayVersion")),
				Publisher:       strings.TrimSpace(firstRegistryStringValue(subKey, "Publisher")),
				InstallLocation: strings.TrimSpace(firstRegistryStringValue(subKey, "InstallLocation")),
				InstallDate:     strings.TrimSpace(firstRegistryStringValue(subKey, "InstallDate")),
				Architecture:    source.architecture,
				Source:          "registry_uninstall",
			}
			subKey.Close()

			dedupeKey := strings.ToLower(entry.Name + "|" + entry.DisplayVersion + "|" + entry.InstallLocation)
			if _, exists := seen[dedupeKey]; exists {
				continue
			}
			seen[dedupeKey] = struct{}{}
			entries = append(entries, entry)
			if len(entries) >= maxSoftwareEntries {
				break
			}
		}

		key.Close()
		if len(entries) >= maxSoftwareEntries {
			break
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return strings.ToLower(entries[i].Name) < strings.ToLower(entries[j].Name)
	})

	return entries, nil
}

func (c *Collector) CollectHardwareIdentity(_ context.Context) (*HardwareIdentitySnapshot, error) {
	snap := &HardwareIdentitySnapshot{
		CollectedAt:     nowRFC3339(),
		CPUArchitecture: runtime.GOARCH,
	}

	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Cryptography`, registry.QUERY_VALUE); err == nil {
		snap.MachineGuid = strings.TrimSpace(firstRegistryStringValue(key, "MachineGuid"))
		key.Close()
	}

	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, `HARDWARE\DESCRIPTION\System\BIOS`, registry.QUERY_VALUE); err == nil {
		snap.SystemSerial = strings.TrimSpace(firstRegistryStringValue(key, "SystemSerialNumber"))
		snap.SystemManufacturer = strings.TrimSpace(firstRegistryStringValue(key, "SystemManufacturer"))
		snap.SystemModel = strings.TrimSpace(firstRegistryStringValue(key, "SystemProductName"))
		snap.BaseboardVendor = strings.TrimSpace(firstRegistryStringValue(key, "BaseBoardManufacturer"))
		snap.BaseboardModel = strings.TrimSpace(firstRegistryStringValue(key, "BaseBoardProduct"))
		snap.BiosVersion = strings.TrimSpace(firstRegistryStringValue(key, "BIOSVersion"))
		key.Close()
	}

	return snap, nil
}

func (c *Collector) CollectWindowsUpdateStatus(_ context.Context) (*WindowsUpdateStatusSnapshot, error) {
	signals := make([]string, 0, 3)

	if registryKeyExists(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired`) {
		signals = append(signals, "windows_update_reboot_required")
	}
	if registryKeyExists(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending`) {
		signals = append(signals, "component_servicing_reboot_pending")
	}
	if registryValueExists(registry.LOCAL_MACHINE, `SYSTEM\CurrentControlSet\Control\Session Manager`, "PendingFileRenameOperations") {
		signals = append(signals, "pending_file_rename")
	}

	return &WindowsUpdateStatusSnapshot{
		CollectedAt:    nowRFC3339(),
		RebootRequired: len(signals) > 0,
		PendingCount:   len(signals),
		PendingSignals: signals,
	}, nil
}

func collectDnsServers() []string {
	seen := make(map[string]struct{})
	servers := make([]string, 0, 4)

	addValue := func(raw string) {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			return
		}
		for _, part := range strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == ';' || r == ' '
		}) {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			if _, exists := seen[part]; exists {
				continue
			}
			seen[part] = struct{}{}
			servers = append(servers, part)
		}
	}

	if key, err := registry.OpenKey(registry.LOCAL_MACHINE, `SYSTEM\CurrentControlSet\Services\Tcpip\Parameters`, registry.QUERY_VALUE); err == nil {
		addValue(firstRegistryStringValue(key, "NameServer"))
		addValue(firstRegistryStringValue(key, "DhcpNameServer"))
		key.Close()
	}

	if interfacesKey, err := registry.OpenKey(registry.LOCAL_MACHINE, `SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces`, registry.ENUMERATE_SUB_KEYS); err == nil {
		names, err := interfacesKey.ReadSubKeyNames(-1)
		if err == nil {
			for _, name := range names {
				subKey, err := registry.OpenKey(interfacesKey, name, registry.QUERY_VALUE)
				if err != nil {
					continue
				}
				addValue(firstRegistryStringValue(subKey, "NameServer"))
				addValue(firstRegistryStringValue(subKey, "DhcpNameServer"))
				subKey.Close()
			}
		}
		interfacesKey.Close()
	}

	sort.Strings(servers)
	return servers
}

func networkFlagsToStrings(flags net.Flags) []string {
	result := make([]string, 0, 6)
	if flags&net.FlagUp != 0 {
		result = append(result, "up")
	}
	if flags&net.FlagBroadcast != 0 {
		result = append(result, "broadcast")
	}
	if flags&net.FlagLoopback != 0 {
		result = append(result, "loopback")
	}
	if flags&net.FlagPointToPoint != 0 {
		result = append(result, "point_to_point")
	}
	if flags&net.FlagMulticast != 0 {
		result = append(result, "multicast")
	}
	return result
}

func firstRegistryStringValue(key registry.Key, names ...string) string {
	for _, name := range names {
		if value, _, err := key.GetStringValue(name); err == nil {
			return value
		}
		if values, _, err := key.GetStringsValue(name); err == nil && len(values) > 0 {
			return strings.Join(values, ", ")
		}
	}
	return ""
}

func registryKeyExists(root registry.Key, path string) bool {
	key, err := registry.OpenKey(root, path, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	key.Close()
	return true
}

func registryValueExists(root registry.Key, path, valueName string) bool {
	key, err := registry.OpenKey(root, path, registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	defer key.Close()
	if _, _, err := key.GetStringsValue(valueName); err == nil {
		return true
	}
	if _, _, err := key.GetStringValue(valueName); err == nil {
		return true
	}
	return false
}

func firstNonEmptyString(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
