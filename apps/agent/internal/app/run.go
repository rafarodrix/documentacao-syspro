package app

import (
	"context"
	"fmt"
	"log"
	"os/signal"
	"syscall"

	"golang.org/x/sync/errgroup"
	"trilink/agent/internal/infra/config"
	"trilink/agent/internal/infra/winsvc"
)

func Run() error {
	return RunService()
}

// RunService detects whether the process was invoked by the Windows SCM and
// delegates accordingly. When running interactively it behaves as before.
func RunService() error {
	loadEnvFile()

	isService, err := winsvc.IsWindowsService()
	if err != nil {
		return fmt.Errorf("detect service context: %w", err)
	}

	if isService {
		return winsvc.Run(runServiceLogic)
	}

	return runServiceInteractive()
}

// RunServiceDebug forces interactive mode regardless of SCM context.
func RunServiceDebug() error {
	loadEnvFile()
	return runServiceInteractive()
}

func RunUI() error {
	LoadEnvFile()

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

func runServiceInteractive() error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	return runServiceLogic(ctx)
}

func runServiceLogic(ctx context.Context) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config for runtime lock: %w", err)
	}

	lock, err := acquireRuntimeLock(cfg.Paths.StateDir)
	if err != nil {
		return err
	}
	defer func() { _ = lock.Release() }()

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

func loadEnvFile() {
	LoadEnvFile()
}

func LoadEnvFile() {
	stateDir := config.DefaultStateDir()
	path := config.DefaultEnvFilePath()

	// Load DPAPI-protected secrets first so encrypted values take precedence.
	loadSecretsIntoEnv(stateDir)

	// Load .env (skips keys already set by protected store).
	if err := config.LoadEnvFile(path); err != nil {
		log.Printf("warn: could not load env file at %s: %v", path, err)
	}

	// On first boot: migrate plaintext secrets from .env to DPAPI store and redact.
	migrateSecretsFromEnvFile(path, stateDir)
}
