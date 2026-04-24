package app

import (
	"context"
	"fmt"
	"os/signal"
	"syscall"

	"golang.org/x/sync/errgroup"
)

func Run() error {
	return RunService()
}

func RunService() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	container, err := BootstrapService(ctx)
	if err != nil {
		return fmt.Errorf("bootstrap failed: %w", err)
	}

	if container.AgentService == nil {
		return fmt.Errorf("agent service container is not initialized")
	}

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		return container.AgentService.Run(ctx)
	})

	if container.IPCServer != nil {
		g.Go(func() error {
			return container.IPCServer.Start(ctx)
		})
	}

	return g.Wait()
}

func RunUI() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	container, err := BootstrapUI(ctx)
	if err != nil {
		return fmt.Errorf("bootstrap ui failed: %w", err)
	}

	if container.AgentUI == nil {
		return fmt.Errorf("agent ui container is not initialized")
	}

	return container.AgentUI.Run(ctx)
}
