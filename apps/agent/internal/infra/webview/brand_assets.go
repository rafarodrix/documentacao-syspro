package webview

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"

	agentassets "trilink/agent/assets"
)

type BrandAssets struct {
	LogoLightURL string
	LogoDarkURL  string
}

func resolveBrandAssets(targetDir string) BrandAssets {
	_ = targetDir
	return BrandAssets{
		LogoLightURL: pngDataURL(agentassets.LogoLightPNG),
		LogoDarkURL:  pngDataURL(agentassets.LogoDarkPNG),
	}
}

func pngDataURL(data []byte) string {
	if len(data) == 0 {
		return ""
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(data)
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
