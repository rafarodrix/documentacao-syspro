package main

import (
	"log"

	"trilink/agent/internal/app"
)

func main() {
	if err := app.RunUI(); err != nil {
		log.Fatal(err)
	}
}
