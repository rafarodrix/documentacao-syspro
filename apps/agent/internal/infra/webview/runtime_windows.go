//go:build windows

package webview

import (
	"fmt"
	"runtime"
	"strings"

	"golang.org/x/sys/windows/registry"
)

const webView2RuntimeClientID = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"

func ValidateRuntime() error {
	for _, path := range registryCandidatePaths() {
		if version := readRegistryVersion(path); version != "" && version != "0.0.0.0" {
			return nil
		}
	}

	return fmt.Errorf("webview2 runtime not installed; install Microsoft Edge WebView2 Runtime before launching the agent UI")
}

func registryCandidatePaths() []string {
	if runtime.GOARCH == "386" {
		return []string{
			`SOFTWARE\Microsoft\EdgeUpdate\Clients\` + webView2RuntimeClientID,
			`Software\Microsoft\EdgeUpdate\Clients\` + webView2RuntimeClientID,
		}
	}

	return []string{
		`SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\` + webView2RuntimeClientID,
		`Software\Microsoft\EdgeUpdate\Clients\` + webView2RuntimeClientID,
	}
}

func readRegistryVersion(path string) string {
	roots := []registry.Key{registry.LOCAL_MACHINE, registry.CURRENT_USER}
	for _, root := range roots {
		key, err := registry.OpenKey(root, path, registry.QUERY_VALUE)
		if err != nil {
			continue
		}
		version, _, err := key.GetStringValue("pv")
		key.Close()
		if err == nil && strings.TrimSpace(version) != "" {
			return strings.TrimSpace(version)
		}
	}
	return ""
}
