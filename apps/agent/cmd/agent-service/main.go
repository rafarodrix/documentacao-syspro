package main

import (
	"fmt"
	"log"
	"os"

	"trilink/agent/internal/app"
	"trilink/agent/internal/infra/winsvc"
)

const usage = `
Uso: agent-service [comando]

Comandos:
  install    Registra o servico Windows como LocalSystem (requer admin)
  uninstall  Remove o servico Windows (requer admin)
  start      Inicia o servico via SCM
  stop       Para o servico via SCM
  debug      Executa em modo console (sem SCM, para testes)
  run        Executado pelo SCM ao iniciar o servico (padrao)

Sem argumento: detecta automaticamente se esta rodando via SCM ou console.
`

func main() {
	cmd := ""
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	var err error
	switch cmd {
	case "install":
		exePath, exeErr := os.Executable()
		if exeErr != nil {
			log.Fatalf("resolve executable path: %v", exeErr)
		}
		err = winsvc.Install(exePath)
		if err == nil {
			fmt.Printf("Servico %q registrado com sucesso.\n", winsvc.Name)
			fmt.Printf("Inicie com: agent-service.exe start\n")
		}

	case "uninstall":
		err = winsvc.Uninstall()
		if err == nil {
			fmt.Printf("Servico %q removido.\n", winsvc.Name)
		}

	case "start":
		err = winsvc.Start()
		if err == nil {
			fmt.Printf("Servico %q iniciado.\n", winsvc.Name)
		}

	case "stop":
		err = winsvc.Stop()
		if err == nil {
			fmt.Printf("Servico %q parado.\n", winsvc.Name)
		}

	case "debug":
		err = app.RunServiceDebug()

	case "run", "":
		err = app.RunService()

	default:
		fmt.Fprintf(os.Stderr, "Comando desconhecido: %q\n%s", cmd, usage)
		os.Exit(1)
	}

	if err != nil {
		log.Fatal(err)
	}
}
