//go:build windows

package ipc

import (
	"context"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/Microsoft/go-winio"
)

func isPipeAddress(addr string) bool {
	return strings.HasPrefix(strings.TrimSpace(strings.ToLower(addr)), `\\.\pipe\`)
}

func listenIPC(addr string) (net.Listener, error) {
	if isPipeAddress(addr) {
		return winio.ListenPipe(addr, &winio.PipeConfig{
			InputBufferSize:  65536,
			OutputBufferSize: 65536,
		})
	}
	return net.Listen("tcp", addr)
}

func newHTTPClient(addr string) (*http.Client, string) {
	if isPipeAddress(addr) {
		transport := &http.Transport{
			DialContext: func(ctx context.Context, network, _ string) (net.Conn, error) {
				return winio.DialPipeContext(ctx, addr)
			},
		}
		return &http.Client{
			Timeout:   5 * time.Second,
			Transport: transport,
		}, "http://ipc"
	}
	baseURL := strings.TrimSpace(addr)
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		baseURL = "http://" + baseURL
	}
	return &http.Client{Timeout: 5 * time.Second}, baseURL
}
