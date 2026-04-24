package webview

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type ChatwootConfig struct {
	BaseURL      string
	WebsiteToken string
}

func EnsureChatwootWidgetPage(stateDir string, cfg ChatwootConfig) (string, error) {
	baseURL := strings.TrimSpace(cfg.BaseURL)
	websiteToken := strings.TrimSpace(cfg.WebsiteToken)
	if baseURL == "" || websiteToken == "" {
		return "", fmt.Errorf("chatwoot widget is not configured")
	}

	uiDir := filepath.Join(stateDir, "ui")
	if err := os.MkdirAll(uiDir, 0o755); err != nil {
		return "", fmt.Errorf("create ui dir: %w", err)
	}

	pagePath := filepath.Join(uiDir, "support-chatwoot.html")
	content := fmt.Sprintf(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trilink Support</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%%;
      height: 100%%;
      overflow: hidden;
      background: #f4f6f8;
      font-family: Segoe UI, sans-serif;
    }

    .agent-support-shell {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%%;
      height: 100%%;
      color: #24323f;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div class="agent-support-shell">Carregando atendimento Trilink...</div>
  <script>
    (function(d,t) {
      var BASE_URL=%q;
      var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
      g.src=BASE_URL+"/packs/js/sdk.js";
      g.async = true;
      s.parentNode.insertBefore(g,s);
      g.onload=function(){
        window.chatwootSDK.run({
          websiteToken: %q,
          baseUrl: BASE_URL
        });
      };
    })(document,"script");
  </script>
</body>
</html>
`, baseURL, websiteToken)

	if err := os.WriteFile(pagePath, []byte(content), 0o644); err != nil {
		return "", fmt.Errorf("write chatwoot widget page: %w", err)
	}

	return pagePath, nil
}
