package webview

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type BrandAssets struct {
	LogoLightURL string
	LogoDarkURL  string
}

func resolveBrandAssets(stateDir string) BrandAssets {
	assets := BrandAssets{}
	assets.LogoLightURL = resolveBrandAssetURL(stateDir, []string{
		filepath.Join("assets", "img", "logo-clara.png"),
		filepath.Join("img", "logo-clara.png"),
		filepath.Join("ui", "logo-clara.png"),
	})
	assets.LogoDarkURL = resolveBrandAssetURL(stateDir, []string{
		filepath.Join("assets", "img", "logo-escura.png"),
		filepath.Join("img", "logo-escura.png"),
		filepath.Join("ui", "logo-escura.png"),
	})
	return assets
}

func resolveBrandAssetURL(stateDir string, relativeCandidates []string) string {
	candidates := make([]string, 0, len(relativeCandidates)*3)

	if exePath, err := os.Executable(); err == nil {
		exeDir := filepath.Dir(exePath)
		for _, relative := range relativeCandidates {
			candidates = append(candidates, filepath.Join(exeDir, relative))
		}
	}

	if wd, err := os.Getwd(); err == nil {
		for _, relative := range relativeCandidates {
			candidates = append(candidates, filepath.Join(wd, "apps", "agent", relative))
		}
	}

	for _, relative := range relativeCandidates {
		candidates = append(candidates, filepath.Join(stateDir, relative))
	}

	for _, candidate := range candidates {
		if strings.TrimSpace(candidate) == "" {
			continue
		}
		if _, err := os.Stat(candidate); err == nil {
			return fileURL(candidate)
		}
	}

	return ""
}

func fileURL(path string) string {
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = path
	}
	slashed := filepath.ToSlash(abs)
	if strings.HasPrefix(slashed, "/") {
		return "file://" + slashed
	}
	return "file:///" + slashed
}

func copyBrandAssetsToDir(targetDir string) error {
	assets := resolveBrandAssets(targetDir)
	files := map[string]string{
		"logo-clara.png":  brandAssetPathFromURL(assets.LogoLightURL),
		"logo-escura.png": brandAssetPathFromURL(assets.LogoDarkURL),
	}

	for name, source := range files {
		if strings.TrimSpace(source) == "" {
			continue
		}
		data, err := os.ReadFile(source)
		if err != nil {
			return fmt.Errorf("read brand asset %s: %w", source, err)
		}
		target := filepath.Join(targetDir, name)
		if err := os.WriteFile(target, data, 0o644); err != nil {
			return fmt.Errorf("write brand asset %s: %w", target, err)
		}
	}

	return nil
}

func brandAssetPathFromURL(value string) string {
	if strings.HasPrefix(value, "file:///") {
		return strings.ReplaceAll(strings.TrimPrefix(value, "file:///"), "/", string(filepath.Separator))
	}
	if strings.HasPrefix(value, "file://") {
		return strings.ReplaceAll(strings.TrimPrefix(value, "file://"), "/", string(filepath.Separator))
	}
	return value
}

func executableDir() string {
	if exePath, err := os.Executable(); err == nil {
		return filepath.Dir(exePath)
	}
	if wd, err := os.Getwd(); err == nil {
		return wd
	}
	return ""
}

func copyAssetFileIfPresent(source, target string) error {
	if strings.TrimSpace(source) == "" {
		return nil
	}
	if _, err := os.Stat(source); err != nil {
		return nil
	}
	data, err := os.ReadFile(source)
	if err != nil {
		return err
	}
	return os.WriteFile(target, data, 0o644)
}

func currentExecutableName() string {
	if path, err := exec.LookPath(os.Args[0]); err == nil {
		return filepath.Base(path)
	}
	return filepath.Base(os.Args[0])
}
