package remote

import (
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"
)

func TestRustDeskConfigPathsIncludeSystemProfile(t *testing.T) {
	t.Parallel()

	paths := rustDeskConfigPaths()
	expected := `C:\Windows\system32\config\systemprofile\AppData\Roaming\RustDesk\config\RustDesk2.toml`
	if !slices.Contains(paths, expected) {
		t.Fatalf("expected config paths to include %q, got %v", expected, paths)
	}
}

func TestReadRustDeskIDFromConfig(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "relay-server = 'relay.example.com'\nid = '123456789'\nenc-id = 'ignored'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	got := readRustDeskIDFromConfig(path)
	if got != "123456789" {
		t.Fatalf("expected rustdesk id 123456789, got %q", got)
	}
}

func TestReadRustDeskIDFromConfigIgnoresEncID(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "enc-id = '999999999'\nid = '123456789'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	got := readRustDeskIDFromConfig(path)
	if got != "123456789" {
		t.Fatalf("expected rustdesk id 123456789, got %q", got)
	}
}

func TestReadRustDeskPasswordFromConfigIgnoresEncodedValues(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "password = '00wdpnE7T2omZG8nGuUHR/zC45wIlwYkSUqts='\npermanent-password = '123456'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	got, _ := readRustDeskPasswordFromConfig(path, "")
	if got != "123456" {
		t.Fatalf("expected plain RustDesk password 123456, got %q", got)
	}
}

func TestReadRustDeskPasswordFromConfigPrefersTemporaryAccessPassword(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "permanent-password = 'Trilink098'\naccess-password = '5u4fy9'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	got, _ := readRustDeskPasswordFromConfig(path, "Trilink098")
	if got != "5u4fy9" {
		t.Fatalf("expected temporary access password 5u4fy9, got %q", got)
	}
}

func TestReadRustDeskConfigValue(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "relay-server = 'relay.example.com'\napi-server = 'https://api.example.com'\nkey = 'pub-key'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	if got := readRustDeskConfigValue(path, "relay-server", "custom-rendezvous-server"); got != "relay.example.com" {
		t.Fatalf("expected relay server, got %q", got)
	}
	if got := readRustDeskConfigValue(path, "api-server"); got != "https://api.example.com" {
		t.Fatalf("expected api server, got %q", got)
	}
	if got := readRustDeskConfigValue(path, "key"); got != "pub-key" {
		t.Fatalf("expected public key, got %q", got)
	}
}

func TestBuildRustDeskMSIInstallArgsDisablesTrayLaunch(t *testing.T) {
	t.Parallel()

	args := buildRustDeskMSIInstallArgs(`C:\tmp\rustdesk.msi`, `C:\tmp\rustdesk.log`, true)
	if !slices.Contains(args, "LAUNCH_TRAY_APP=0") {
		t.Fatalf("expected LAUNCH_TRAY_APP=0 in args, got %v", args)
	}
	if !slices.Contains(args, "STARTUPSHORTCUTS=0") {
		t.Fatalf("expected STARTUPSHORTCUTS=0 in args, got %v", args)
	}
	if !slices.Contains(args, "/l*v") {
		t.Fatalf("expected verbose log flag in args, got %v", args)
	}
}

func TestUpsertRustDeskConfigValueUpdatesExistingKey(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "verification-method = 'use-permanent-password'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	if err := upsertRustDeskConfigValue(path, "verification-method", "use-both-passwords"); err != nil {
		t.Fatalf("upsert config: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	if !strings.Contains(string(data), "verification-method = 'use-both-passwords'") {
		t.Fatalf("expected verification-method updated, got %q", string(data))
	}
}

func TestUpsertRustDeskConfigValueAppendsMissingKey(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "id = '123456789'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	if err := upsertRustDeskConfigValue(path, "verification-method", "use-both-passwords"); err != nil {
		t.Fatalf("upsert config: %v", err)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	if !strings.Contains(string(data), "verification-method = 'use-both-passwords'") {
		t.Fatalf("expected verification-method appended, got %q", string(data))
	}
}

func TestRustDeskDualPasswordSettingsCanBePersisted(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "RustDesk2.toml")
	content := "id = '123456789'\n"
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write config: %v", err)
	}

	settings := []struct {
		key   string
		value string
	}{
		{key: "approve-mode", value: "password"},
		{key: "verification-method", value: "use-both-passwords"},
	}
	for _, setting := range settings {
		if err := upsertRustDeskConfigValue(path, setting.key, setting.value); err != nil {
			t.Fatalf("upsert %s: %v", setting.key, err)
		}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}

	got := string(data)
	if !strings.Contains(got, "approve-mode = 'password'") {
		t.Fatalf("expected approve-mode=password, got %q", got)
	}
	if !strings.Contains(got, "verification-method = 'use-both-passwords'") {
		t.Fatalf("expected verification-method use-both-passwords, got %q", got)
	}
}

func TestRustDeskConfigBoolValue(t *testing.T) {
	t.Parallel()

	if got := rustDeskConfigBoolValue(true); got != "Y" {
		t.Fatalf("expected Y for true, got %q", got)
	}
	if got := rustDeskConfigBoolValue(false); got != "N" {
		t.Fatalf("expected N for false, got %q", got)
	}
}
