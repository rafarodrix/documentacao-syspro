package ipc

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"trilink/agent/internal/contracts/agentui"
)

func TestClientRejectsProtocolMismatch(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(agentui.ProtocolVersionHeader, "agent-ui.v0")
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"service_status":"ok","user_visible":true}`))
	}))
	defer srv.Close()

	client := &Client{
		baseURL:    srv.URL,
		httpClient: srv.Client(),
		logger:     noopLogger{},
	}

	_, err := client.GetSummary(context.Background())
	if err == nil {
		t.Fatalf("expected protocol mismatch error")
	}
	if !strings.Contains(err.Error(), "protocol version mismatch") {
		t.Fatalf("expected protocol mismatch error, got %v", err)
	}
}
