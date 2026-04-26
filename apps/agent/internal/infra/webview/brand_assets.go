package webview

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	agentassets "trilink/agent/assets"
)

type BrandAssets struct {
	LogoLightURL string
	LogoDarkURL  string
}

func resolveBrandAssets(targetDir string) BrandAssets {
	return BrandAssets{
		LogoLightURL: fileURL(filepath.Join(targetDir, "logo-clara.png")),
		LogoDarkURL:  fileURL(filepath.Join(targetDir, "logo-escura.png")),
	}
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
	files := map[string][]byte{
		"logo-clara.png":  agentassets.LogoLightPNG,
		"logo-escura.png": agentassets.LogoDarkPNG,
		"icon.ico":        agentassets.IconICO,
	}

	for name, data := range files {
		target := filepath.Join(targetDir, name)
		if err := os.WriteFile(target, data, 0o644); err != nil {
			return fmt.Errorf("write brand asset %s: %w", target, err)
		}
	}

	return nil
}
