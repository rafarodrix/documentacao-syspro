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

type ActionProvider interface {
	OpenSupportConversation(ctx context.Context) (uistate.ActionResult, error)
	SyncSupportConversationContext(ctx context.Context, conversationID string) (uistate.SupportContextSyncResult, error)
}

// Server will host the local service-to-UI transport.
// For now it only defines the lifecycle and exposes the expected service-side boundary.
type Server struct {
	addr          string
	logger        Logger
	summary       SummaryProvider
	notifications NotificationProvider
	actions       ActionProvider
}

func NewServer(
	addr string,
	logger Logger,
	summary SummaryProvider,
	notifications NotificationProvider,
	actions ActionProvider,
) *Server {
	return &Server{
		addr:          addr,
		logger:        logger,
		summary:       summary,
		notifications: notifications,
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

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/summary", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		summary, err := s.summary.Snapshot(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(summary)
	})
	mux.HandleFunc("/notifications", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		notifications, err := s.notifications.ListNotifications(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(notifications)
	})
	mux.HandleFunc("/actions/support/open", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		result, err := s.actions.OpenSupportConversation(r.Context())
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	})
	mux.HandleFunc("/actions/support/sync-context", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		var payload struct {
			ConversationID string `json:"conversationId"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"error": "invalid json payload"})
			return
		}

		result, err := s.actions.SyncSupportConversationContext(r.Context(), payload.ConversationID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(result)
	})

	listener, err := net.Listen("tcp", s.addr)
	if err != nil {
		return err
	}
	defer listener.Close()

	server := &http.Server{
		Addr:              s.addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
			return
		}
		serverErr <- nil
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
		return nil
	case err := <-serverErr:
		return err
	}
}
