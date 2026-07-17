//go:build !windows

package remote

import "time"

// Stubs para compilacao cruzada em plataformas nao-Windows.
// O agente e Windows-only; estes stubs garantem que `go build` passe em CI
// sem GOOS=windows.

func rustdeskServiceStatus() string                              { return "unsupported" }
func rustdeskServiceStart() error                                { return nil }
func rustdeskServiceStop() error                                 { return nil }
func rustdeskServiceRestart() error                              { return nil }
func waitForRustDeskServiceState(_ string, _ time.Duration) bool { return true }
func killRustDeskProcesses()                                     {}
func readExeProductVersion(_ string) string                      { return "" }
func isProcessElevated() bool                                    { return true }
func isRebootPendingNative() bool                                { return false }
