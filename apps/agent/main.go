package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"trilink/agent/assets"
	"trilink/agent/internal/app"
	uistate "trilink/agent/internal/core/ui_state"
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

	backgroundMode := false
	for _, arg := range os.Args[1:] {
		normalized := strings.TrimSpace(strings.ToLower(arg))
		if normalized == "--background" || normalized == "/background" || normalized == "background" {
			backgroundMode = true
			break
		}
	}

	if backgroundMode {
		container.UIHost.ConfigureStartup(uistate.TargetSetupExperience, false)
	} else {
		container.UIHost.ConfigureStartup(uistate.TargetSetupExperience, true)
	}

	if err := uiwails.RunApp(ctx, container.AgentUI, container.UIHost, frontendAssets, assets.IconICO); err != nil {
		log.Fatal(err)
	}
}
