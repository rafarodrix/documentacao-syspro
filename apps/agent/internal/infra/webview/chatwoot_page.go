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
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      width: 100%%;
      height: 100%%;
      color: #24323f;
      letter-spacing: 0.02em;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
    }

    .agent-support-title {
      font-size: 18px;
      font-weight: 600;
    }

    .agent-support-copy {
      max-width: 320px;
      line-height: 1.5;
      color: #4e5d6b;
    }

    .agent-support-actions {
      display: none;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .agent-support-actions a,
    .agent-support-actions button {
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
      background: #24323f;
      color: #ffffff;
    }

    .agent-support-actions a.secondary,
    .agent-support-actions button.secondary {
      background: #d9e1e7;
      color: #24323f;
    }
  </style>
</head>
<body>
  <div class="agent-support-shell">
    <div class="agent-support-title">Carregando atendimento Trilink...</div>
    <div class="agent-support-copy" id="status-copy">
      Estamos iniciando o canal oficial de suporte.
    </div>
    <div class="agent-support-actions" id="support-actions">
      <a id="open-browser-link" target="_blank" rel="noreferrer">Abrir no navegador</a>
      <button class="secondary" onclick="location.reload()">Tentar novamente</button>
    </div>
  </div>
  <script>
    (function(d,t) {
      var BASE_URL=%q;
      var statusCopy=d.getElementById('status-copy');
      var supportActions=d.getElementById('support-actions');
      var openBrowserLink=d.getElementById('open-browser-link');
      openBrowserLink.href = BASE_URL;

      var fallbackTimer = window.setTimeout(function () {
        statusCopy.innerHTML = 'O host embarcado atual pode nao renderizar o Chatwoot corretamente. Use o navegador como fallback nesta homologacao.';
        supportActions.style.display = 'flex';
      }, 5000);

      var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
      g.src=BASE_URL+"/packs/js/sdk.js";
      g.async = true;
      g.onerror = function () {
        window.clearTimeout(fallbackTimer);
        statusCopy.innerHTML = 'Nao foi possivel carregar o SDK do atendimento. Verifique acesso ao Chatwoot ou abra no navegador.';
        supportActions.style.display = 'flex';
      };
      s.parentNode.insertBefore(g,s);
      g.onload=function(){
        window.clearTimeout(fallbackTimer);
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
