package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"trilink/agent/assets"
	"trilink/agent/internal/app"
	"trilink/agent/internal/uiwails"
)

func main() {
	app.LoadEnvFile()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	container, err := app.BootstrapUI(ctx)
	if err != nil {
		log.Fatal(err)
	}
	if container.AgentUI == nil || container.UIHost == nil {
		log.Fatal("agent ui container is not initialized")
	}

	if err := uiwails.RunApp(ctx, container.AgentUI, container.UIHost, frontendAssets, assets.IconICO); err != nil {
		log.Fatal(err)
	}
}
