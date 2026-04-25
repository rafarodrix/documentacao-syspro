package webview

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type ChatwootConfig struct {
	BaseURL      string
	WebsiteToken string
	Context      SupportContext
	IPCBaseURL   string
}

type SupportContext struct {
	CompanyID            string   `json:"companyId,omitempty"`
	CompanyDisplayName   string   `json:"companyDisplayName,omitempty"`
	HostID               string   `json:"hostId,omitempty"`
	HostAlias            string   `json:"hostAlias,omitempty"`
	RustDeskID           string   `json:"rustdeskId,omitempty"`
	RemoteAccessPassword string   `json:"remoteAccessPassword,omitempty"`
	RemoteStatus         string   `json:"remoteStatus,omitempty"`
	RemoteStatusText     string   `json:"remoteStatusText,omitempty"`
	ConversationTags     []string `json:"conversationTags,omitempty"`
	MachineName          string   `json:"machineName,omitempty"`
	DeviceID             string   `json:"deviceId,omitempty"`
	Hostname             string   `json:"hostname,omitempty"`
	OS                   string   `json:"os,omitempty"`
	LocalUsername        string   `json:"localUsername,omitempty"`
	AgentVersion         string   `json:"agentVersion,omitempty"`
	AgentEnvironment     string   `json:"agentEnvironment,omitempty"`
	ContactName          string   `json:"contactName,omitempty"`
	Description          string   `json:"description,omitempty"`
}

func EnsureChatwootWidgetPage(stateDir string, cfg ChatwootConfig) (string, error) {
	baseURL := strings.TrimSpace(cfg.BaseURL)
	websiteToken := strings.TrimSpace(cfg.WebsiteToken)
	ipcBaseURL := strings.TrimSpace(cfg.IPCBaseURL)
	if baseURL == "" || websiteToken == "" {
		return "", fmt.Errorf("chatwoot widget is not configured")
	}

	contextJSON, err := marshalSupportContext(cfg.Context)
	if err != nil {
		return "", err
	}

	uiDir := filepath.Join(stateDir, "ui")
	if err := os.MkdirAll(uiDir, 0o755); err != nil {
		return "", fmt.Errorf("create ui dir: %w", err)
	}
	if err := copyBrandAssetsToDir(uiDir); err != nil {
		return "", err
	}
	brand := resolveBrandAssets(stateDir)

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
      background: #eef2f5;
      font-family: Segoe UI, sans-serif;
    }

    .agent-support-shell {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-end;
      width: 100%%;
      height: 100%%;
      color: #24323f;
      letter-spacing: 0.02em;
      text-align: center;
      padding: 10px;
      box-sizing: border-box;
    }

    .agent-support-panel {
      position: relative;
      width: 100%%;
      height: 100%%;
      border-radius: 22px;
      background: linear-gradient(180deg, #ffffff 0%%, #f8fafc 100%%);
      box-shadow: 0 16px 40px rgba(28, 45, 64, 0.18);
      overflow: hidden;
    }

    .agent-support-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2;
      padding: 16px 16px 10px;
      background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%%, rgba(255,255,255,0.82) 100%%);
      backdrop-filter: blur(8px);
    }

    .agent-support-title {
      font-size: 17px;
      font-weight: 700;
      text-align: left;
    }
    .agent-support-brand {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .agent-support-logo {
      height: 28px;
      width: auto;
      object-fit: contain;
    }

    .agent-support-copy {
      margin-top: 6px;
      text-align: left;
      line-height: 1.45;
      color: #4e5d6b;
      font-size: 13px;
    }

    .agent-support-meta {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-start;
    }

    .agent-support-meta.primary {
      margin-top: 12px;
    }

    .agent-support-pill {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      background: #e9f0f5;
      color: #28435a;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
    }

    .agent-support-pill.remote-ready {
      background: #e6f7ee;
      color: #0b6b41;
    }

    .agent-support-pill.remote-pending {
      background: #fff3df;
      color: #8a5a0a;
    }

    .agent-support-pill.remote-offline {
      background: #f7e8e8;
      color: #9b2d30;
    }

    .agent-support-alert {
      margin-top: 12px;
      display: none;
      border-radius: 16px;
      padding: 12px 14px;
      text-align: left;
      background: #fff4e8;
      border: 1px solid #f3cfab;
      color: #714b12;
      box-shadow: 0 8px 18px rgba(140, 84, 17, 0.08);
    }

    .agent-support-alert.visible {
      display: block;
    }

    .agent-support-alert-title {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .agent-support-alert-copy {
      font-size: 12px;
      line-height: 1.5;
    }

    .agent-support-remote-card {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      padding: 12px;
      border-radius: 18px;
      background: #f3f7fa;
      border: 1px solid #dbe5ec;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
    }

    .agent-support-remote-title {
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      color: #415364;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .agent-support-remote-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .agent-support-remote-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: left;
      min-width: 0;
    }

    .agent-support-remote-label {
      font-size: 11px;
      color: #607282;
      font-weight: 600;
    }

    .agent-support-remote-value-row {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .agent-support-remote-value {
      flex: 1;
      min-width: 0;
      display: inline-flex;
      align-items: center;
      min-height: 38px;
      padding: 0 12px;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid #d3dee7;
      color: #24323f;
      font-size: 14px;
      font-weight: 700;
      font-family: Consolas, 'Courier New', monospace;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .agent-support-remote-copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 38px;
      height: 38px;
      border-radius: 12px;
      border: 0;
      background: #0f3d66;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .agent-support-remote-copy.secondary {
      background: #d9e1e7;
      color: #24323f;
    }

    .agent-support-remote-hint {
      text-align: left;
      font-size: 11px;
      line-height: 1.5;
      color: #607282;
    }

    .agent-support-actions {
      position: absolute;
      inset: auto 16px 16px 16px;
      z-index: 4;
      display: none;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
      border-radius: 18px;
      background: rgba(255,255,255,0.96);
      padding: 14px;
      box-shadow: 0 8px 24px rgba(28, 45, 64, 0.12);
    }

    .agent-support-actions a,
    .agent-support-actions button {
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
      background: #0f3d66;
      color: #ffffff;
    }

    .agent-support-actions a.secondary,
    .agent-support-actions button.secondary {
      background: #d9e1e7;
      color: #24323f;
    }

    .agent-support-stage {
      position: absolute;
      inset: 116px 0 0 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      color: #3c4d5e;
      z-index: 1;
      pointer-events: none;
    }

    .agent-support-stage-content {
      max-width: 280px;
    }

    .agent-support-stage-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .agent-support-stage-copy {
      line-height: 1.55;
      color: #607282;
      font-size: 13px;
    }

    .agent-support-stage.hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="agent-support-shell">
    <div class="agent-support-panel">
      <div class="agent-support-header">
        <div class="agent-support-brand">
          <div class="agent-support-title">Suporte Trilink</div>
          <img class="agent-support-logo" id="support-brand-logo" alt="Trilink" />
        </div>
        <div class="agent-support-copy" id="status-copy">
          Estamos iniciando o canal oficial de atendimento.
        </div>
        <div class="agent-support-meta primary">
          <span class="agent-support-pill" id="company-pill">Empresa: aguardando vinculo</span>
          <span class="agent-support-pill" id="host-pill">Host: preparando contexto</span>
        </div>
        <div class="agent-support-meta">
          <span class="agent-support-pill remote-pending" id="remote-pill">Remoto: verificando configuracao</span>
        </div>
        <div class="agent-support-remote-card" id="remote-card">
          <div class="agent-support-remote-title">Acesso remoto</div>
          <div class="agent-support-remote-grid">
            <div class="agent-support-remote-item">
              <div class="agent-support-remote-label">ID remoto</div>
              <div class="agent-support-remote-value-row">
                <div class="agent-support-remote-value" id="remote-id-value">Aguardando identificacao</div>
                <button class="agent-support-remote-copy secondary" id="copy-remote-id" type="button">Copiar</button>
              </div>
            </div>
            <div class="agent-support-remote-item">
              <div class="agent-support-remote-label">Senha de acesso</div>
              <div class="agent-support-remote-value-row">
                <div class="agent-support-remote-value" id="remote-password-value">Aguardando configuracao</div>
                <button class="agent-support-remote-copy secondary" id="copy-remote-password" type="button">Copiar</button>
              </div>
            </div>
          </div>
          <div class="agent-support-remote-hint" id="remote-hint">
            O cliente pode informar esses dados ao suporte sem abrir o aplicativo do RustDesk.
          </div>
        </div>
        <div class="agent-support-alert" id="remote-alert">
          <div class="agent-support-alert-title" id="remote-alert-title">RustDesk ainda nao instalado</div>
          <div class="agent-support-alert-copy" id="remote-alert-copy">
            O atendimento pode seguir normalmente, mas o acesso remoto ainda nao esta disponivel nesta maquina.
          </div>
        </div>
      </div>
      <div class="agent-support-stage" id="support-stage">
        <div class="agent-support-stage-content">
          <div class="agent-support-stage-title">Carregando atendimento...</div>
          <div class="agent-support-stage-copy">
            O agente ja esta preparando o contexto do dispositivo e do vinculo remoto para o suporte.
          </div>
        </div>
      </div>
    </div>
    <div class="agent-support-actions" id="support-actions">
      <a id="open-browser-link" target="_blank" rel="noreferrer">Abrir no navegador</a>
      <button class="secondary" onclick="location.reload()">Tentar novamente</button>
    </div>
  </div>
  <script>
    (function(d,t) {
      var BASE_URL=%q;
      var SUPPORT_CONTEXT=%s;
      var IPC_BASE_URL=%q;
      var LOGO_LIGHT_URL=%q;
      var LOGO_DARK_URL=%q;
      var statusCopy=d.getElementById('status-copy');
      var supportStage=d.getElementById('support-stage');
      var supportActions=d.getElementById('support-actions');
      var openBrowserLink=d.getElementById('open-browser-link');
      var companyPill=d.getElementById('company-pill');
      var hostPill=d.getElementById('host-pill');
      var remotePill=d.getElementById('remote-pill');
      var remoteIdValue=d.getElementById('remote-id-value');
      var remotePasswordValue=d.getElementById('remote-password-value');
      var remoteHint=d.getElementById('remote-hint');
      var copyRemoteIdButton=d.getElementById('copy-remote-id');
      var copyRemotePasswordButton=d.getElementById('copy-remote-password');
      var remoteAlert=d.getElementById('remote-alert');
      var remoteAlertTitle=d.getElementById('remote-alert-title');
      var remoteAlertCopy=d.getElementById('remote-alert-copy');
      var supportBrandLogo=d.getElementById('support-brand-logo');
      openBrowserLink.href = BASE_URL;
      var preferredLogo = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? (LOGO_LIGHT_URL || LOGO_DARK_URL)
        : (LOGO_DARK_URL || LOGO_LIGHT_URL);
      if (preferredLogo) {
        supportBrandLogo.src = preferredLogo;
      } else {
        supportBrandLogo.style.display = 'none';
      }

      if (SUPPORT_CONTEXT.companyDisplayName) {
        companyPill.textContent = 'Empresa: ' + SUPPORT_CONTEXT.companyDisplayName;
      }
      if (SUPPORT_CONTEXT.hostAlias || SUPPORT_CONTEXT.machineName || SUPPORT_CONTEXT.hostname) {
        hostPill.textContent = 'Host: ' + (SUPPORT_CONTEXT.hostAlias || SUPPORT_CONTEXT.machineName || SUPPORT_CONTEXT.hostname);
      }
      if (SUPPORT_CONTEXT.remoteStatusText) {
        remotePill.textContent = 'Remoto: ' + SUPPORT_CONTEXT.remoteStatusText;
        remotePill.className = 'agent-support-pill ' + (
          SUPPORT_CONTEXT.remoteStatus === 'ready'
            ? 'remote-ready'
            : SUPPORT_CONTEXT.remoteStatus === 'pending'
              ? 'remote-pending'
              : 'remote-offline'
        );
      }

      if (SUPPORT_CONTEXT.rustdeskId) {
        remoteIdValue.textContent = SUPPORT_CONTEXT.rustdeskId;
      }
      if (SUPPORT_CONTEXT.remoteAccessPassword) {
        remotePasswordValue.textContent = SUPPORT_CONTEXT.remoteAccessPassword;
      } else if (SUPPORT_CONTEXT.remoteStatus === 'ready' || SUPPORT_CONTEXT.remoteStatus === 'pending') {
        remotePasswordValue.textContent = 'Senha nao carregada';
      }

      var copyText = function (value) {
        if (!value) {
          return Promise.reject(new Error('empty'));
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(value);
        }
        var el = d.createElement('textarea');
        el.value = value;
        d.body.appendChild(el);
        el.select();
        d.execCommand('copy');
        d.body.removeChild(el);
        return Promise.resolve();
      };

      copyRemoteIdButton.addEventListener('click', function () {
        var value = String(SUPPORT_CONTEXT.rustdeskId || '').trim();
        copyText(value).then(function () {
          copyRemoteIdButton.textContent = 'Copiado';
          window.setTimeout(function () { copyRemoteIdButton.textContent = 'Copiar'; }, 1200);
        }).catch(function () {});
      });

      copyRemotePasswordButton.addEventListener('click', function () {
        var value = String(SUPPORT_CONTEXT.remoteAccessPassword || '').trim();
        copyText(value).then(function () {
          copyRemotePasswordButton.textContent = 'Copiado';
          window.setTimeout(function () { copyRemotePasswordButton.textContent = 'Copiar'; }, 1200);
        }).catch(function () {});
      });

      if (SUPPORT_CONTEXT.remoteStatus === 'offline') {
        remoteAlert.classList.add('visible');
        remoteAlertTitle.textContent = 'RustDesk nao instalado nesta maquina';
        remoteAlertCopy.textContent = 'A conversa ja pode ser iniciada, mas o operador vera que o modulo remoto ainda nao esta disponivel para este dispositivo.';
        remoteHint.textContent = 'Assim que o modulo remoto for provisionado, o agente exibira o ID e a senha de acesso aqui.';
      } else if (SUPPORT_CONTEXT.remoteStatus === 'pending') {
        remoteAlert.classList.add('visible');
        remoteAlertTitle.textContent = 'Vinculo remoto em preparacao';
        remoteAlertCopy.textContent = 'O agente detectou configuracao parcial do remoto. O atendimento segue com contexto tecnico e o vinculo sera concluido no ciclo de sincronizacao.';
        remoteHint.textContent = SUPPORT_CONTEXT.remoteAccessPassword
          ? 'O ID e a senha ja podem ser informados ao suporte enquanto o vinculo remoto finaliza em segundo plano.'
          : 'O ID remoto pode aparecer antes da senha final. O agente concluira a configuracao em segundo plano.';
      } else if (SUPPORT_CONTEXT.remoteStatus === 'ready') {
        remoteHint.textContent = SUPPORT_CONTEXT.remoteAccessPassword
          ? 'O cliente pode informar esses dados ao suporte sem abrir o aplicativo do RustDesk.'
          : 'O ID remoto esta pronto. Se a senha ainda nao apareceu, o agente deve recebe-la no proximo ciclo de sincronizacao.';
      }

      window.chatwootSettings = {
        hideMessageBubble: true,
        showUnreadMessagesDialog: false,
        welcomeTitle: 'Suporte Trilink',
        welcomeDescription: SUPPORT_CONTEXT.remoteStatus === 'ready'
          ? 'Atendimento contextualizado com identificacao tecnica pronta.'
          : 'Atendimento contextualizado com diagnostico inicial do dispositivo.',
        availableMessage: 'Equipe online para dar continuidade ao atendimento.',
        unavailableMessage: 'Equipe offline no momento. O contexto tecnico desta maquina ja foi preparado.'
      };

      var fallbackTimer = window.setTimeout(function () {
        statusCopy.innerHTML = 'O host embarcado atual pode nao renderizar o Chatwoot corretamente. Use o navegador como fallback nesta homologacao.';
        supportStage.classList.remove('hidden');
        supportActions.style.display = 'flex';
      }, 5000);

      var applySupportContext = function () {
        if (!window.$chatwoot) {
          return;
        }
        window.$chatwoot.toggle('open');
      };

      var syncedConversationIds = {};
      var trySyncConversationContext = function (conversationId) {
        var normalizedConversationId = String(conversationId || '').trim();
        if (!normalizedConversationId || syncedConversationIds[normalizedConversationId] || !IPC_BASE_URL) {
          return;
        }

        syncedConversationIds[normalizedConversationId] = true;

        window.fetch(IPC_BASE_URL + '/actions/support/sync-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: normalizedConversationId })
        }).catch(function () {
          syncedConversationIds[normalizedConversationId] = false;
        });
      };

      var extractConversationId = function (detail) {
        if (!detail || typeof detail !== 'object') {
          return '';
        }

        return String(
          detail.conversationId ||
          detail.conversation_id ||
          detail.id ||
          (detail.conversation && (detail.conversation.id || detail.conversation.conversation_id)) ||
          (detail.message && (detail.message.conversation_id || (detail.message.conversation && detail.message.conversation.id))) ||
          ''
        ).trim();
      };

      window.addEventListener('chatwoot:ready', function () {
        window.clearTimeout(fallbackTimer);
        supportStage.classList.add('hidden');
        statusCopy.innerHTML = SUPPORT_CONTEXT.remoteStatus === 'ready'
          ? 'Atendimento pronto com contexto tecnico e vinculo remoto carregados.'
          : SUPPORT_CONTEXT.remoteStatus === 'offline'
            ? 'Atendimento pronto com contexto parcial. RustDesk nao instalado nesta maquina.'
            : 'Atendimento pronto com contexto parcial. O vinculo remoto ainda nao esta disponivel nesta maquina.';
        applySupportContext();
      });

      window.addEventListener('chatwoot:on-message', function (event) {
        trySyncConversationContext(extractConversationId(event && event.detail));
      });

      var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
      g.src=BASE_URL+"/packs/js/sdk.js";
      g.async = true;
      g.onerror = function () {
        window.clearTimeout(fallbackTimer);
        statusCopy.innerHTML = 'Nao foi possivel carregar o SDK do atendimento. Verifique acesso ao Chatwoot ou abra no navegador.';
        supportStage.classList.remove('hidden');
        supportActions.style.display = 'flex';
      };
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
`, baseURL, contextJSON, ipcBaseURL, brand.LogoLightURL, brand.LogoDarkURL, websiteToken)

	if err := os.WriteFile(pagePath, []byte(content), 0o644); err != nil {
		return "", fmt.Errorf("write chatwoot widget page: %w", err)
	}

	return pagePath, nil
}

func marshalSupportContext(context SupportContext) (string, error) {
	encoded, err := json.Marshal(context)
	if err != nil {
		return "", fmt.Errorf("marshal support context: %w", err)
	}
	return string(encoded), nil
}
