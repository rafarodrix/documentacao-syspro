package ui

import "context"

type Logger interface {
	Info(msg string, kv ...any)
}

type Service struct {
	logger Logger
}

func NewService(logger Logger) *Service {
	return &Service{logger: logger}
}

func (s *Service) Run(ctx context.Context) error {
	s.logger.Info("agent ui starting")
	defer s.logger.Info("agent ui stopped")

	<-ctx.Done()
	return nil
}
