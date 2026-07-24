package device

import (
	"context"
	"net"
	"net/http"
	"testing"
	"time"
)

type probeTestLogger struct{}

func (probeTestLogger) Debug(string, ...any) {}
func (probeTestLogger) Info(string, ...any)  {}
func (probeTestLogger) Warn(string, ...any)  {}
func (probeTestLogger) Error(string, ...any) {}

func TestCollectSysproRuntimeProbesTCPVerifiedAndUnreachable(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	go func() {
		for {
			conn, acceptErr := ln.Accept()
			if acceptErr != nil {
				return
			}
			_ = conn.Close()
		}
	}()

	port := ln.Addr().(*net.TCPAddr).Port
	collector := NewCollector(probeTestLogger{})
	snapshot := collector.CollectSysproRuntimeProbes(context.Background(), []SysproInstallationHint{
		{
			InstallationID: "inst-ok",
			RuntimeType:    "SYSPRO_SERVER",
			Port:           port,
			Protocol:       "TCP",
			Host:           "127.0.0.1",
		},
		{
			InstallationID: "inst-fail",
			RuntimeType:    "SYSPRO_SERVER",
			Port:           1,
			Protocol:       "TCP",
			Host:           "127.0.0.1",
		},
		{
			CompanyID: "skip-no-id",
			Port:      port,
			Protocol:  "TCP",
		},
	})

	if snapshot == nil || len(snapshot.Results) != 2 {
		t.Fatalf("expected 2 results, got %#v", snapshot)
	}
	if snapshot.Results[0].Status != "VERIFIED" {
		t.Fatalf("first status=%s detail=%s", snapshot.Results[0].Status, snapshot.Results[0].Detail)
	}
	if snapshot.Results[1].Status != "UNREACHABLE" {
		t.Fatalf("second status=%s", snapshot.Results[1].Status)
	}
}

func TestCollectSysproRuntimeProbesHTTPVerified(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/SYSPROSERVERISAPI.DLL", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	})
	server := &http.Server{Handler: mux, ReadHeaderTimeout: time.Second}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	go func() { _ = server.Serve(ln) }()
	defer server.Close()

	port := ln.Addr().(*net.TCPAddr).Port
	collector := NewCollector(probeTestLogger{})
	snapshot := collector.CollectSysproRuntimeProbes(context.Background(), []SysproInstallationHint{
		{
			InstallationID: "iis-1",
			RuntimeType:    "IIS",
			Port:           port,
			Protocol:       "HTTP",
			Host:           "127.0.0.1",
			IISPath:        "/SYSPROSERVERISAPI.DLL",
		},
	})
	if len(snapshot.Results) != 1 || snapshot.Results[0].Status != "VERIFIED" {
		t.Fatalf("unexpected %#v", snapshot)
	}
}
