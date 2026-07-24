package device

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

const runtimeProbeTimeout = 3 * time.Second

// CollectSysproRuntimeProbes testa porta/protocolo configurados no portal por instalação.
// Só probeia hints com installation_id + porta; resultado: VERIFIED | UNREACHABLE.
func (c *Collector) CollectSysproRuntimeProbes(_ context.Context, hints []SysproInstallationHint) *SysproRuntimeProbeSnapshot {
	now := time.Now().UTC()
	results := make([]SysproRuntimeProbeResult, 0, len(hints))

	for _, hint := range hints {
		installationID := strings.TrimSpace(hint.InstallationID)
		if installationID == "" || hint.Port <= 0 || hint.Port > 65535 {
			continue
		}

		host := strings.TrimSpace(hint.Host)
		if host == "" {
			host = "127.0.0.1"
		}
		protocol := normalizeProbeProtocol(hint.Protocol, hint.RuntimeType)
		started := time.Now()
		ok, detail := probeRuntimeEndpoint(host, hint.Port, protocol, hint.IISPath)
		latency := time.Since(started).Milliseconds()
		status := "UNREACHABLE"
		if ok {
			status = "VERIFIED"
		}

		results = append(results, SysproRuntimeProbeResult{
			InstallationID: installationID,
			RuntimeType:    strings.TrimSpace(hint.RuntimeType),
			Host:           host,
			Port:           hint.Port,
			Protocol:       protocol,
			Status:         status,
			LatencyMs:      latency,
			Detail:         detail,
			CheckedAt:      now.Format(time.RFC3339),
		})
	}

	c.logger.Debug("device: runtime probes collected", "count", len(results))
	return &SysproRuntimeProbeSnapshot{
		CollectedAt: now.Format(time.RFC3339),
		Results:     results,
	}
}

func normalizeProbeProtocol(protocol, runtimeType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(protocol))
	switch normalized {
	case "HTTP", "HTTPS", "TCP":
		return normalized
	}
	if strings.EqualFold(strings.TrimSpace(runtimeType), "IIS") {
		return "HTTP"
	}
	return "TCP"
}

func probeRuntimeEndpoint(host string, port int, protocol, iisPath string) (bool, string) {
	address := net.JoinHostPort(host, fmt.Sprintf("%d", port))
	switch protocol {
	case "TCP":
		conn, err := net.DialTimeout("tcp", address, runtimeProbeTimeout)
		if err != nil {
			return false, err.Error()
		}
		_ = conn.Close()
		return true, "tcp_open"
	case "HTTP", "HTTPS":
		return probeHTTP(protocol, host, port, iisPath)
	default:
		return false, "unsupported_protocol"
	}
}

func probeHTTP(protocol, host string, port int, iisPath string) (bool, string) {
	path := strings.TrimSpace(iisPath)
	if path == "" {
		path = "/"
	}
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	url := fmt.Sprintf("%s://%s%s", strings.ToLower(protocol), net.JoinHostPort(host, fmt.Sprintf("%d", port)), path)

	client := &http.Client{
		Timeout: runtimeProbeTimeout,
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true, //nolint:gosec // probe local/self-signed IIS
			},
			DisableKeepAlives: true,
		},
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return false, err.Error()
	}
	resp, err := client.Do(req)
	if err != nil {
		return false, err.Error()
	}
	defer resp.Body.Close()

	// Qualquer resposta HTTP prova que o listener está ativo (mesmo 401/404).
	if resp.StatusCode > 0 {
		return true, fmt.Sprintf("http_%d", resp.StatusCode)
	}
	return false, "http_no_status"
}
