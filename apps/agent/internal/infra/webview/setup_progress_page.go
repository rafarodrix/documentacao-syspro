package webview

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	agentassets "trilink/agent/assets"
)

type SetupProgressConfig struct {
	InitialStatusJSON string
}

func EnsureSetupProgressPage(stateDir string, cfg SetupProgressConfig) (string, error) {
	uiDir := filepath.Join(stateDir, "ui")
	if err := os.MkdirAll(uiDir, 0o755); err != nil {
		return "", fmt.Errorf("create ui dir: %w", err)
	}
	if err := copyBrandAssetsToDir(uiDir); err != nil {
		return "", err
	}

	brand := resolveBrandAssets(uiDir)
	pagePath := filepath.Join(uiDir, "agent-setup.html")
	content := strings.NewReplacer(
		"__INITIAL_STATUS_JSON__", cfg.InitialStatusJSON,
		"__LOGO_LIGHT_URL__", strconv.Quote(brand.LogoLightURL),
		"__LOGO_DARK_URL__", strconv.Quote(brand.LogoDarkURL),
	).Replace(agentassets.AgentSetupHTML)

	if err := os.WriteFile(pagePath, []byte(content), 0o644); err != nil {
		return "", fmt.Errorf("write setup progress page: %w", err)
	}

	return pagePath, nil
}
