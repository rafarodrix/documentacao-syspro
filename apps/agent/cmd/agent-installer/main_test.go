package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveLatestInstallerOutputVersion(t *testing.T) {
	outputDir := t.TempDir()
	files := []string{
		"agente-trilink-setup-1.0.59.exe",
		"agente-trilink-setup-1.0.61.exe",
		"agente-trilink-setup-1.0.60.exe",
		"README.txt",
	}

	for _, name := range files {
		path := filepath.Join(outputDir, name)
		if err := os.WriteFile(path, []byte("test"), 0o644); err != nil {
			t.Fatalf("write %s: %v", name, err)
		}
	}

	version, ok, err := resolveLatestInstallerOutputVersion(outputDir)
	if err != nil {
		t.Fatalf("resolveLatestInstallerOutputVersion returned error: %v", err)
	}
	if !ok {
		t.Fatal("expected version to be found")
	}
	if got := version.String(); got != "1.0.61" {
		t.Fatalf("expected 1.0.61, got %s", got)
	}
}

func TestSelectAutoVersion(t *testing.T) {
	tests := []struct {
		name          string
		tagVersion    *semVersion
		outputVersion *semVersion
		expected      string
	}{
		{
			name:     "falls back to initial version",
			expected: "1.0.0",
		},
		{
			name:          "bumps output version when tags are absent",
			outputVersion: &semVersion{major: 1, minor: 0, patch: 61},
			expected:      "1.0.62",
		},
		{
			name:       "bumps tag version when outputs are absent",
			tagVersion: &semVersion{major: 1, minor: 3, patch: 9},
			expected:   "1.3.10",
		},
		{
			name:          "chooses newest source before bumping",
			tagVersion:    &semVersion{major: 1, minor: 0, patch: 62},
			outputVersion: &semVersion{major: 1, minor: 0, patch: 61},
			expected:      "1.0.63",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := selectAutoVersion(tt.tagVersion, tt.outputVersion); got != tt.expected {
				t.Fatalf("expected %s, got %s", tt.expected, got)
			}
		})
	}
}

func TestResolveBinaryReturnsFirstExistingCandidate(t *testing.T) {
	root := t.TempDir()
	second := filepath.Join(root, "agent-service.exe")
	if err := os.WriteFile(second, []byte("test"), 0o644); err != nil {
		t.Fatalf("write candidate: %v", err)
	}

	got, err := resolveBinary(
		[]string{filepath.Join(root, "missing.exe"), second},
		"agent-service",
		"build it first",
	)
	if err != nil {
		t.Fatalf("resolveBinary returned error: %v", err)
	}
	if got != second {
		t.Fatalf("expected %s, got %s", second, got)
	}
}
