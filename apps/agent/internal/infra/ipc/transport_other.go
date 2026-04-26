//go:build !windows

package ipc

import (
	"net"
	"net/http"
	"strings"
	"time"
)

func isPipeAddress(addr string) bool {
	return false
}

func listenIPC(addr string) (net.Listener, error) {
	return net.Listen("tcp", addr)
}

func newHTTPClient(addr string) (*http.Client, string) {
	baseURL := strings.TrimSpace(addr)
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		baseURL = "http://" + baseURL
	}
	return &http.Client{Timeout: 5 * time.Second}, baseURL
}
