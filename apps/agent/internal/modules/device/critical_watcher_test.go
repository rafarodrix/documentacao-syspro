package device

import "testing"

func TestCriticalServiceStateChangedDetectsStatusAndInstanceChanges(t *testing.T) {
	previous := map[string]string{"FirebirdServerDefaultInstance:": "running"}
	if criticalServiceStateChanged(previous, map[string]string{"FirebirdServerDefaultInstance:": "running"}) {
		t.Fatal("equal state must not trigger a duplicate event")
	}
	if !criticalServiceStateChanged(previous, map[string]string{"FirebirdServerDefaultInstance:": "stopped"}) {
		t.Fatal("status transition must trigger an event")
	}
	if !criticalServiceStateChanged(previous, map[string]string{"FirebirdServerDefaultInstance:": "running", "SysproServer:instance-1": "running"}) {
		t.Fatal("instance set transition must trigger an event")
	}
}

func TestCriticalProcessStateChanged(t *testing.T) {
	if criticalProcessStateChanged(map[string]string{"fbserver.exe": "100"}, map[string]string{"fbserver.exe": "100"}) {
		t.Fatal("equal process state must not be reported as changed")
	}
	if !criticalProcessStateChanged(map[string]string{"fbserver.exe": "100"}, map[string]string{"fbserver.exe": "200"}) {
		t.Fatal("PID transition must be reported as changed")
	}
	if !criticalProcessStateChanged(map[string]string{"fbserver.exe": "100"}, map[string]string{"fbserver.exe": "100", "sysproserver.exe": "300"}) {
		t.Fatal("process appearance must be reported as changed")
	}
}
