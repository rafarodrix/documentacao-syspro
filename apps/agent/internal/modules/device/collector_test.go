package device

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func writeTestFile(t *testing.T, path string, modTime time.Time) {
	t.Helper()

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatalf("mkdir %s: %v", filepath.Dir(path), err)
	}
	if err := os.WriteFile(path, []byte("test"), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
	if err := os.Chtimes(path, modTime, modTime); err != nil {
		t.Fatalf("chtimes %s: %v", path, err)
	}
}

func TestReadSysproUpdateInformationPrefersNewestCoreFileOverOldManifest(t *testing.T) {
	root := t.TempDir()
	exePath := filepath.Join(root, "SysproServer.exe")
	isapiPath := filepath.Join(root, "SysproServerISAPI.dll")

	writeTestFile(t, exePath, time.Date(2026, time.July, 16, 9, 9, 0, 0, time.UTC))
	writeTestFile(t, isapiPath, time.Date(2026, time.July, 16, 8, 0, 0, 0, time.UTC))

	manifest := `{"updatedAt":"2026-02-02T12:09:00Z"}`
	if err := os.WriteFile(filepath.Join(root, "syspro-installation.json"), []byte(manifest), 0o644); err != nil {
		t.Fatalf("write manifest: %v", err)
	}

	info := readSysproUpdateInformation(root, exePath, isapiPath)

	if info.Source != "CORE_FILES_LAST_WRITE" {
		t.Fatalf("expected CORE_FILES_LAST_WRITE, got %s", info.Source)
	}
	if info.UpdatedAt != "2026-07-16T09:09:00Z" {
		t.Fatalf("expected updatedAt from executable, got %s", info.UpdatedAt)
	}
}

func TestReadSysproUpdateInformationUsesManifestWhenItIsNewest(t *testing.T) {
	root := t.TempDir()
	exePath := filepath.Join(root, "SysproServer.exe")

	writeTestFile(t, exePath, time.Date(2026, time.July, 16, 9, 9, 0, 0, time.UTC))

	manifest := `{"updatedAt":"2026-07-20T15:30:00Z"}`
	if err := os.WriteFile(filepath.Join(root, "syspro-installation.json"), []byte(manifest), 0o644); err != nil {
		t.Fatalf("write manifest: %v", err)
	}

	info := readSysproUpdateInformation(root, exePath, "")

	if info.Source != "INSTALLATION_MANIFEST" {
		t.Fatalf("expected INSTALLATION_MANIFEST, got %s", info.Source)
	}
	if info.UpdatedAt != "2026-07-20T15:30:00Z" {
		t.Fatalf("expected updatedAt from manifest, got %s", info.UpdatedAt)
	}
}

func TestBuildSysproCandidateRootsDoesNotDuplicateServerDirectoryHint(t *testing.T) {
	candidates := buildSysproCandidateRoots([]SysproInstallationHint{{
		CompanyID:   "company-1",
		CompanyName: "Empresa A",
		Path:        `C:\Syspro\Server`,
	}})

	count := 0
	for _, candidate := range candidates {
		if normalizeSysproPath(candidate.rootPath) == normalizeSysproPath(`C:\Syspro`) {
			count++
		}
		if normalizeSysproPath(candidate.rootPath) == normalizeSysproPath(`C:\Syspro\Server`) {
			t.Fatalf("server directory must be normalized to its installation root")
		}
	}
	if count != 1 {
		t.Fatalf("expected exactly one C:\\Syspro candidate, got %d", count)
	}
}
