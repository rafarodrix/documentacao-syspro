package webview

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type SetupProgressConfig struct {
	IPCBaseURL        string
	InitialStatusJSON string
	SupportBaseURL    string
}

func EnsureSetupProgressPage(stateDir string, cfg SetupProgressConfig) (string, error) {
	uiDir := filepath.Join(stateDir, "ui")
	if err := os.MkdirAll(uiDir, 0o755); err != nil {
		return "", fmt.Errorf("create ui dir: %w", err)
	}

	pagePath := filepath.Join(uiDir, "agent-setup.html")
	content := fmt.Sprintf(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trilink Agent Setup</title>
  <style>
    :root {
      --bg: #eef2f5;
      --panel: #ffffff;
      --text: #1f2f3d;
      --muted: #617281;
      --line: #dbe5ec;
      --brand: #0f3d66;
      --brand-soft: #dceaf5;
      --ok: #0b6b41;
      --ok-soft: #e7f7ef;
      --warn: #8a5a0a;
      --warn-soft: #fff3df;
      --err: #9b2d30;
      --err-soft: #f8e8e8;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%%;
      height: 100%%;
      background: linear-gradient(180deg, #edf2f6 0%%, #e6edf3 100%%);
      font-family: Segoe UI, sans-serif;
      color: var(--text);
    }
    body {
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 18px;
      box-sizing: border-box;
    }
    .shell {
      width: 100%%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .panel {
      background: var(--panel);
      border-radius: 24px;
      box-shadow: 0 18px 38px rgba(28,45,64,0.12);
      border: 1px solid rgba(255,255,255,0.8);
      overflow: hidden;
    }
    .hero {
      padding: 20px 20px 16px;
      background: linear-gradient(180deg, #fdfefe 0%%, #f5f9fc 100%%);
      border-bottom: 1px solid var(--line);
    }
    .eyebrow {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .12em;
      font-weight: 700;
      color: var(--muted);
    }
    h1 {
      margin: 8px 0 6px;
      font-size: 24px;
      line-height: 1.2;
    }
    .summary {
      font-size: 14px;
      line-height: 1.6;
      color: var(--muted);
    }
    .progress-card {
      padding: 16px 20px 18px;
    }
    .progress-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .stage {
      font-size: 15px;
      font-weight: 700;
    }
    .percent {
      font-size: 13px;
      font-weight: 700;
      color: var(--brand);
    }
    .bar {
      width: 100%%;
      height: 12px;
      border-radius: 999px;
      background: #e8eef3;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%%;
      width: 0%%;
      border-radius: 999px;
      background: linear-gradient(90deg, #0f3d66 0%%, #1870b8 100%%);
      transition: width .3s ease;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 0 12px;
      border-radius: 999px;
      background: var(--brand-soft);
      color: var(--brand);
      font-size: 12px;
      font-weight: 700;
    }
    .error {
      margin-top: 14px;
      padding: 12px 14px;
      border-radius: 16px;
      background: var(--err-soft);
      color: var(--err);
      display: none;
      font-size: 13px;
      line-height: 1.5;
    }
    .error.visible { display: block; }
    .steps {
      padding: 0 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .step {
      display: grid;
      grid-template-columns: 14px 1fr;
      gap: 12px;
      align-items: start;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: #fbfdfe;
    }
    .dot {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      margin-top: 3px;
      background: #c2d0dc;
      box-shadow: inset 0 0 0 2px rgba(255,255,255,.85);
    }
    .step.complete .dot { background: #0b6b41; }
    .step.error .dot { background: #9b2d30; }
    .step.pending .dot { background: #c88b1f; }
    .step-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .step-label {
      font-size: 14px;
      font-weight: 700;
    }
    .step-status {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .step-detail {
      margin-top: 6px;
      font-size: 13px;
      line-height: 1.55;
      color: var(--muted);
    }
    .focus-step {
      margin: 0 20px 18px;
      padding: 16px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #ffffff 0%%, #f7fbfe 100%%);
    }
    .focus-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--muted);
      font-weight: 800;
    }
    .focus-title {
      margin-top: 8px;
      font-size: 17px;
      font-weight: 800;
    }
    .focus-detail {
      margin-top: 8px;
      font-size: 13px;
      line-height: 1.6;
      color: var(--muted);
    }
    .subtle {
      margin: 0 20px 16px;
      font-size: 12px;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .completed-wrap {
      margin: 0 20px 20px;
      border-top: 1px solid var(--line);
      padding-top: 14px;
    }
    .completed-toggle {
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
      color: var(--muted);
      list-style: none;
    }
    .completed-toggle::-webkit-details-marker {
      display: none;
    }
    .completed-list {
      margin-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .actions {
      display: flex;
      gap: 10px;
      padding: 0 20px 20px;
      flex-wrap: wrap;
    }
    .actions a, .actions button {
      border: 0;
      border-radius: 999px;
      min-height: 42px;
      padding: 0 16px;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      background: var(--brand);
      color: white;
    }
    .actions .secondary {
      background: #d9e1e7;
      color: var(--text);
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="panel">
      <div class="hero">
        <div class="eyebrow">Agente Trilink</div>
        <h1 id="title">Instalacao do Agente Trilink</h1>
        <div class="summary" id="summary"></div>
      </div>
      <div class="progress-card">
        <div class="progress-head">
          <div class="stage" id="stage"></div>
          <div class="percent" id="percent">0%%</div>
        </div>
        <div class="bar"><div class="bar-fill" id="bar-fill"></div></div>
        <div class="meta" id="meta"></div>
        <div class="error" id="error"></div>
      </div>
      <div class="focus-step">
        <div class="focus-label">Etapa atual</div>
        <div class="focus-title" id="focus-title"></div>
        <div class="focus-detail" id="focus-detail"></div>
      </div>
      <div class="subtle">
        <span id="step-count"></span>
        <span id="polling-status">Atualizacao automatica a cada 5s</span>
      </div>
      <div class="steps" id="steps"></div>
      <div class="completed-wrap" id="completed-wrap" style="display:none;">
        <details>
          <summary class="completed-toggle" id="completed-toggle"></summary>
          <div class="completed-list" id="completed-steps"></div>
        </details>
      </div>
      <div class="actions">
        <button type="button" class="secondary" id="refresh-btn">Atualizar agora</button>
      </div>
    </div>
  </div>
  <script>
    const ipcBaseUrl = %q;
    let currentStatus = %s;

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[char]));
    }

    function statusLabel(value) {
      if (value === 'complete') return 'Concluido';
      if (value === 'error') return 'Erro';
      return 'Pendente';
    }

    function render(status) {
      currentStatus = status;
      document.getElementById('title').textContent = status.title || 'Instalacao do Agente Trilink';
      document.getElementById('summary').textContent = status.summary || '';
      document.getElementById('stage').textContent = status.stage || 'Inicializando';
      document.getElementById('percent').textContent = (status.progress_pct || 0) + '%%';
      document.getElementById('bar-fill').style.width = (status.progress_pct || 0) + '%%';
      document.getElementById('polling-status').textContent = 'Atualizado em ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const meta = document.getElementById('meta');
      meta.innerHTML = '';
      const pills = [];
      if (status.company_name) pills.push('Empresa: ' + status.company_name);
      if (status.host_id) pills.push('Host: ' + status.host_id);
      if (status.rustdesk_id) pills.push('RustDesk ID: ' + status.rustdesk_id);
      if (status.complete) pills.push('Status: pronto');
      pills.forEach((text) => {
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = text;
        meta.appendChild(pill);
      });

      const error = document.getElementById('error');
      if (status.last_error) {
        error.classList.add('visible');
        error.textContent = status.last_error;
      } else {
        error.classList.remove('visible');
        error.textContent = '';
      }

      const allSteps = status.steps || [];
      const pendingSteps = allSteps.filter((step) => step.status !== 'complete');
      const completedSteps = allSteps.filter((step) => step.status === 'complete');
      const currentStep = pendingSteps[0] || completedSteps[completedSteps.length - 1] || null;
      document.getElementById('focus-title').textContent = currentStep ? currentStep.label : 'Inicializando';
      document.getElementById('focus-detail').textContent = currentStep ? (currentStep.detail || '') : '';
      document.getElementById('step-count').textContent = completedSteps.length + ' de ' + allSteps.length + ' etapas concluidas';

      const steps = document.getElementById('steps');
      steps.innerHTML = '';
      pendingSteps.forEach((step) => {
        const article = document.createElement('article');
        article.className = 'step ' + (step.status || 'pending');
        article.innerHTML =
          '<div class="dot"></div>' +
          '<div>' +
            '<div class="step-head">' +
              '<div class="step-label">' + escapeHtml(step.label) + '</div>' +
              '<div class="step-status">' + escapeHtml(statusLabel(step.status)) + '</div>' +
            '</div>' +
            '<div class="step-detail">' + escapeHtml(step.detail || '') + '</div>' +
          '</div>';
        steps.appendChild(article);
      });

      const completedWrap = document.getElementById('completed-wrap');
      const completedTitle = document.getElementById('completed-toggle');
      const completedList = document.getElementById('completed-steps');
      completedList.innerHTML = '';
      if (completedSteps.length > 0) {
        completedWrap.style.display = '';
        completedTitle.textContent = 'Etapas concluidas (' + completedSteps.length + ')';
        completedSteps.forEach((step) => {
          const article = document.createElement('article');
          article.className = 'step complete';
          article.innerHTML =
            '<div class="dot"></div>' +
            '<div>' +
              '<div class="step-head">' +
                '<div class="step-label">' + escapeHtml(step.label) + '</div>' +
                '<div class="step-status">Concluido</div>' +
              '</div>' +
              '<div class="step-detail">' + escapeHtml(step.detail || '') + '</div>' +
            '</div>';
          completedList.appendChild(article);
        });
      } else {
        completedWrap.style.display = 'none';
      }
    }

    async function refresh() {
      if (!ipcBaseUrl) return;
      try {
        const response = await fetch(ipcBaseUrl + '/setup', { cache: 'no-store' });
        if (!response.ok) return;
        const status = await response.json();
        render(status);
      } catch (_) {}
    }

    document.getElementById('refresh-btn').addEventListener('click', refresh);
    render(currentStatus);
    window.setInterval(refresh, 5000);
  </script>
</body>
</html>
`, strings.TrimSpace(cfg.IPCBaseURL), cfg.InitialStatusJSON)

	if err := os.WriteFile(pagePath, []byte(content), 0o644); err != nil {
		return "", fmt.Errorf("write setup progress page: %w", err)
	}

	return pagePath, nil
}
