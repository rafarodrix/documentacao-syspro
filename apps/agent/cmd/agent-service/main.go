package main

import (
	"log"

	"trilink/agent/internal/app"
)

func main() {
	if err := app.RunService(); err != nil {
		log.Fatal(err)
	}
}
