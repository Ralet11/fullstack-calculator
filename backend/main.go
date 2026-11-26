package main

import (
	"calculator/internal/httpapi"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	addr := os.Getenv("CALCULATOR_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}

	server := &http.Server{
		Addr:              addr,
		Handler:           httpapi.NewHandler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}
	log.Printf("Calculator API listening on http://%s", server.Addr)
	log.Fatal(server.ListenAndServe())
}
