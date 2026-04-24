package ipc

import "context"

type Logger interface {
	Info(msg string, kv ...any)
}

// Server will host the local service-to-UI transport.
// For now it only defines the boundary and lifecycle methods.
type Server struct {
	logger Logger
}

func NewServer(logger Logger) *Server {
	return &Server{logger: logger}
}

func (s *Server) Start(ctx context.Context) error {
	s.logger.Info("ipc server scaffolded")
	<-ctx.Done()
	return nil
}
