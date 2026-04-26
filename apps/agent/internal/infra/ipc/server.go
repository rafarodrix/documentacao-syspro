package ipc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"time"

	uistate "trilink/agent/internal/core/ui_state"
)

type Logger interface {
	Info(msg string, kv ...any)
}

type SummaryProvider interface {
	Snapshot(ctx context.Context) (uistate.Summary, error)
}

type NotificationProvider interface {
	ListNotifications(ctx context.Context) ([]uistate.Notification, error)
}

type SetupProvider interface {
	SetupStatus(ctx context.Context) (uistate.SetupStatus, error)
}

type ActionProvider interface {
	OpenSupportConversation(ctx context.Context) (uistate.ActionResult, error)
	OpenSetupExperience(ctx context.Context) (uistate.ActionResult, error)
	SyncSupportConversationContext(ctx context.Context, conversationID string) (uistate.SupportContextSyncResult, error)
}

type Server struct {
	addr           string
	httpBridgeAddr string
	logger         Logger
	summary        SummaryProvider
	notifications  NotificationProvider
	setup          SetupProvider
	actions        ActionProvider
}

func NewServer(
	addr string,
	httpBridgeAddr string,
	logger Logger,
	summary SummaryProvider,
	notifications NotificationProvider,
	setup SetupProvider,
	actions ActionProvider,
) *Server {
	return &Server{
		addr:           addr,
		httpBridgeAddr: httpBridgeAddr,
		logger:         logger,
		summary:        summary,
		notifications:  notifications,
		setup:          setup,
		actions:        actions,
	}
}

func (s *Server) Start(ctx context.Context) error {
	summary, err := s.summary.Snapshot(ctx)
	if err != nil {
		s.logger.Info("ipc server started without initial summary", "error", err)
	} else {
		s.logger.Info("ipc server starting", "addr", s.addr, "http_bridge_addr", s.httpBridgeAddr, "service_status", summary.ServiceStatus, "user_visible", summary.UserVisible)
	}

	mux := s.newMux()
	servers := make([]*http.Server, 0, 2)
	errCh := make(chan error, 2)

	mainServer := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	mainListener, err := listenIPC(s.addr)
	if err != nil {
		return err
	}
	defer mainListener.Close()
	servers = append(servers, mainServer)
	go serveHTTP(mainServer, mainListener, errCh)

	bridgeAddr := s.resolvedHTTPBridgeAddr()
	if bridgeAddr != "" && shouldStartSeparateHTTPBridge(s.addr, bridgeAddr) {
		bridgeListener, err := net.Listen("tcp", bridgeAddr)
		if err != nil {
			return fmt.Errorf("start ipc http bridge: %w", err)
		}
		defer bridgeListener.Close()

		bridgeServer := &http.Server{
			Addr:              bridgeAddr,
			Handler:           mux,
			ReadHeaderTimeout: 5 * time.Second,
		}
		servers = append(servers, bridgeServer)
		go serveHTTP(bridgeServer, bridgeListener, errCh)
		s.logger.Info("ipc http bridge started", "addr", bridgeAddr)
	}

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		for _, server := range servers {
			_ = server.Shutdown(shutdownCtx)
		}
		return nil
	case err := <-errCh:
		return err
	}
}

func (s *Server) resolvedHTTPBridgeAddr() string {
	if s.httpBridgeAddr != "" {
		return s.httpBridgeAddr
	}
	if isPipeAddress(s.addr) {
		return ""
	}
	return s.addr
}

func shouldStartSeparateHTTPBridge(mainAddr, bridgeAddr string) bool {
	if bridgeAddr == "" {
		return false
	}
	if isPipeAddress(mainAddr) {
		return true
	}
	return mainAddr != bridgeAddr
}

func serveHTTP(server *http.Server, listener net.Listener, errCh chan<- error) {
	if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		errCh <- err
		return
	}
	errCh <- nil
}

func (s *Server) newMux() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/summary", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		summary, err := s.summary.Snapshot(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, summary)
	})
	mux.HandleFunc("/notifications", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		notifications, err := s.notifications.ListNotifications(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, notifications)
	})
	mux.HandleFunc("/setup", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}

		status, err := s.setup.SetupStatus(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, status)
	})
	mux.HandleFunc("/events/setup", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodGet) {
			return
		}
		s.serveSetupEvents(w, r)
	})
	mux.HandleFunc("/actions/support/open", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodPost) {
			return
		}
		result, err := s.actions.OpenSupportConversation(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, result)
	})
	mux.HandleFunc("/actions/setup/open", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodPost) {
			return
		}
		result, err := s.actions.OpenSetupExperience(r.Context())
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, result)
	})
	mux.HandleFunc("/actions/support/sync-context", func(w http.ResponseWriter, r *http.Request) {
		if !allowMethod(w, r, http.MethodPost) {
			return
		}

		var payload struct {
			ConversationID string `json:"conversationId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json payload"})
			return
		}

		result, err := s.actions.SyncSupportConversationContext(r.Context(), payload.ConversationID)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
			return
		}
		writeJSON(w, http.StatusOK, result)
	})
	return mux
}

func (s *Server) serveSetupEvents(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "streaming unsupported"})
		return
	}

	setCORSHeaders(w)
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	send := func(status uistate.SetupStatus) bool {
		data, err := json.Marshal(status)
		if err != nil {
			return false
		}
		_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
		return true
	}

	initialStatus, err := s.setup.SetupStatus(r.Context())
	if err == nil {
		send(initialStatus)
	}

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	keepAlive := time.NewTicker(15 * time.Second)
	defer keepAlive.Stop()

	lastPayload := ""
	if err == nil {
		if data, marshalErr := json.Marshal(initialStatus); marshalErr == nil {
			lastPayload = string(data)
		}
	}

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			status, err := s.setup.SetupStatus(r.Context())
			if err != nil {
				continue
			}
			data, err := json.Marshal(status)
			if err != nil {
				continue
			}
			if string(data) == lastPayload {
				continue
			}
			lastPayload = string(data)
			_, _ = fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		case <-keepAlive.C:
			_, _ = fmt.Fprintf(w, ": keepalive\n\n")
			flusher.Flush()
		}
	}
}

func allowMethod(w http.ResponseWriter, r *http.Request, method string) bool {
	setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return false
	}
	if r.Method != method {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, statusCode int, value any) {
	setCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(value)
}

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}
