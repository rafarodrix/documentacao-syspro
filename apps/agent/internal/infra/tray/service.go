package tray

import "context"

type Logger interface {
	Info(msg string, kv ...any)
}

// Service will own the system tray integration for the desktop agent.
type Service struct {
	logger Logger
}

func NewService(logger Logger) *Service {
	return &Service{logger: logger}
}

func (s *Service) Run(ctx context.Context) error {
	s.logger.Info("tray service scaffolded")
	<-ctx.Done()
	return nil
}
