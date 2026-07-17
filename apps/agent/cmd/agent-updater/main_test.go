package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestDiscoverBundleEntries(t *testing.T) {
	root := t.TempDir()

	files := []string{
		"agent-service.exe",
		filepath.Join("assets", "img", "logo-clara.png"),
		filepath.Join("scripts", "open-logs.cmd"),
		filepath.Join("config", ".env.example"),
	}
	for _, name := range files {
		path := filepath.Join(root, name)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("mkdir %s: %v", path, err)
		}
		if err := os.WriteFile(path, []byte("test"), 0o644); err != nil {
			t.Fatalf("write %s: %v", path, err)
		}
	}

	entries, err := discoverBundleEntries(root)
	if err != nil {
		t.Fatalf("discoverBundleEntries returned error: %v", err)
	}

	var got []string
	for _, entry := range entries {
		got = append(got, entry.RelativePath)
	}

	want := []string{
		"agent-service.exe",
		"assets/img/logo-clara.png",
		"config/.env.example",
		"scripts/open-logs.cmd",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected entries\nwant: %#v\ngot:  %#v", want, got)
	}
}

func TestDiscoverBundleEntriesRejectsEmptyBundle(t *testing.T) {
	root := t.TempDir()

	if _, err := discoverBundleEntries(root); err == nil {
		t.Fatal("expected error for empty bundle")
	}
}
