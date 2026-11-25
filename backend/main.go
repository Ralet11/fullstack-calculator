package main

import (
	"calculator/internal/httpapi"
	"log"
	"net/http"
	"time"
)

func main() {
	server := &http.Server{
		Addr:              "127.0.0.1:8080",
		Handler:           httpapi.NewHandler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}
	log.Printf("Calculator API listening on http://%s", server.Addr)
	log.Fatal(server.ListenAndServe())
}
