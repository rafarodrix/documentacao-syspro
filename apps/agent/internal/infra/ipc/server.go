package ipc

import (
	"context"
	"encoding/json"
	"errors"
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
	addr          string
	token         string
	logger        Logger
	summary       SummaryProvider
	notifications NotificationProvider
	setup         SetupProvider
	actions       ActionProvider
}

func NewServer(
	addr string,
	token string,
	logger Logger,
	summary SummaryProvider,
	notifications NotificationProvider,
	setup SetupProvider,
	actions ActionProvider,
) *Server {
	return &Server{
		addr:          addr,
		token:         token,
		logger:        logger,
		summary:       summary,
		notifications: notifications,
		setup:         setup,
		actions:       actions,
	}
}

func (s *Server) Start(ctx context.Context) error {
	summary, err := s.summary.Snapshot(ctx)
	if err != nil {
		s.logger.Info("ipc server started without initial summary", "error", err)
	} else {
		s.logger.Info("ipc server starting", "addr", s.addr, "service_status", summary.ServiceStatus, "user_visible", summary.UserVisible)
	}

	mux := s.withAuth(s.newMux())
	errCh := make(chan error, 1)

	mainServer := &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	mainListener, err := listenIPC(s.addr)
	if err != nil {
		return err
	}
	defer mainListener.Close()
	go serveHTTP(mainServer, mainListener, errCh)

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = mainServer.Shutdown(shutdownCtx)
		return nil
	case err := <-errCh:
		return err
	}
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
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-IPC-Token")
}

func (s *Server) withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if s.token != "" && r.Header.Get("X-IPC-Token") != s.token {
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
