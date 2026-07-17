package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestBuildRemoteComponentStatuses(t *testing.T) {
	manifest := updaterManifest{
		Components: map[string]updaterArtifactSpec{
			"service": {Version: "2.0.0", URL: "https://example.com/service.exe", SHA256: "abc"},
			"ui":      {Version: "1.0.0", URL: "https://example.com/ui.exe", SHA256: "def"},
			"updater": {Version: "1.2.0", URL: "https://example.com/updater.exe", SHA256: "ghi"},
		},
	}
	current := currentComponentVersions{
		Service: "1.0.0",
		UI:      "1.0.0",
		Updater: "1.0.0",
	}

	statuses := buildRemoteComponentStatuses(manifest, current)
	if len(statuses) != 3 {
		t.Fatalf("expected 3 statuses, got %d", len(statuses))
	}
	if !statuses[0].NeedsUpdate || statuses[1].NeedsUpdate || !statuses[2].NeedsUpdate {
		t.Fatalf("unexpected update flags: %#v", statuses)
	}
}

func TestSelectRemoteUpdatePlanDefaultsToVersionDiff(t *testing.T) {
	manifest := updaterManifest{
		Components: map[string]updaterArtifactSpec{
			"service": {Version: "2.0.0", URL: "https://example.com/service.exe", SHA256: "abc"},
			"ui":      {Version: "1.0.0", URL: "https://example.com/ui.exe", SHA256: "def"},
			"updater": {Version: "1.2.0", URL: "https://example.com/updater.exe", SHA256: "ghi"},
		},
	}
	current := currentComponentVersions{
		Service: "1.0.0",
		UI:      "1.0.0",
		Updater: "1.0.0",
	}

	plan, err := selectRemoteUpdatePlan(manifest, current, nil)
	if err != nil {
		t.Fatalf("selectRemoteUpdatePlan returned error: %v", err)
	}
	if len(plan) != 2 {
		t.Fatalf("expected 2 planned components, got %d", len(plan))
	}
	if plan[0].Name != "service" || plan[1].Name != "updater" {
		t.Fatalf("unexpected plan order: %#v", plan)
	}
}

func TestDownloadRemoteArtifactValidatesSHA256(t *testing.T) {
	body := []byte("artifact-bytes")
	sum := sha256.Sum256(body)
	expectedSHA := hex.EncodeToString(sum[:])

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write(body)
	}))
	defer server.Close()

	targetDir := t.TempDir()
	targetFile := filepath.Join(targetDir, "agent-service.exe")
	err := downloadRemoteArtifact(context.Background(), "service", updaterArtifactSpec{
		Version: "2.0.0",
		URL:     server.URL,
		SHA256:  expectedSHA,
	}, targetFile)
	if err != nil {
		t.Fatalf("downloadRemoteArtifact returned error: %v", err)
	}

	data, err := os.ReadFile(targetFile)
	if err != nil {
		t.Fatalf("read target file: %v", err)
	}
	if string(data) != string(body) {
		t.Fatalf("unexpected artifact content: %q", string(data))
	}
}
