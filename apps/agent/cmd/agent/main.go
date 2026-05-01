package main

import (
	"log"
	"os"
	"strings"

	"trilink/agent/internal/app"
	"trilink/agent/internal/infra/winsvc"
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

func run() error {
	command := ""
	if len(os.Args) > 1 {
		command = strings.TrimSpace(strings.ToLower(os.Args[1]))
	}

	switch command {
	case "", "run":
		return app.Run()
	case "debug":
		return app.RunServiceDebug()
	case "install":
		exePath, err := os.Executable()
		if err != nil {
			return err
		}
		return winsvc.Install(exePath)
	case "start":
		return winsvc.Start()
	case "stop":
		return winsvc.Stop()
	case "uninstall", "remove":
		return winsvc.Uninstall()
	default:
		return app.Run()
	}
}
