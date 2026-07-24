package device

import (
	"testing"
	"time"

	"trilink/agent/internal/domain"
)

func TestResolveCollectionPolicyWorkstationDisablesAllServices(t *testing.T) {
	policy := resolveCollectionPolicy(domain.DeviceDesiredState{
		Enabled:           true,
		CollectInventory:  true,
		CollectMetrics:    true,
		CollectionProfile: "workstation",
	})

	if policy.profile != "workstation" {
		t.Fatalf("profile=%q", policy.profile)
	}
	if !policy.enabled(collectorMetrics) {
		t.Fatal("expected metrics enabled on workstation")
	}
	if policy.enabled(collectorAllServices) {
		t.Fatal("expected all_services disabled on workstation")
	}
	if got := policy.schedule(collectorMetrics).interval; got != 5*time.Minute {
		t.Fatalf("metrics interval=%v", got)
	}
}

func TestResolveCollectionPolicyUnlinkedKeepsMinimalFootprint(t *testing.T) {
	policy := resolveCollectionPolicy(domain.DeviceDesiredState{
		Enabled:           true,
		CollectInventory:  true,
		CollectMetrics:    true,
		CollectionProfile: "unlinked",
	})

	if policy.enabled(collectorSysproVersions) {
		t.Fatal("unlinked must not run deep Syspro discovery")
	}
	if policy.enabled(collectorSoftware) {
		t.Fatal("unlinked must not collect software inventory")
	}
	if policy.enabled(collectorCriticalEvents) {
		t.Fatal("unlinked must not watch Event Log")
	}
	if !policy.enabled(collectorHardware) || !policy.enabled(collectorSystem) {
		t.Fatal("unlinked still needs minimal onboarding inventory")
	}
}

func TestResolveCollectionPolicyRespectsCollectorOverrides(t *testing.T) {
	policy := resolveCollectionPolicy(domain.DeviceDesiredState{
		Enabled:           true,
		CollectInventory:  true,
		CollectMetrics:    true,
		CollectionProfile: "server_syspro",
		Collectors: map[string]domain.CollectorPolicy{
			collectorSoftware: {Enabled: false},
			collectorMetrics:  {Enabled: true, IntervalSeconds: 120},
		},
	})

	if policy.enabled(collectorSoftware) {
		t.Fatal("override should disable software")
	}
	if got := policy.schedule(collectorMetrics).interval; got != 2*time.Minute {
		t.Fatalf("override metrics interval=%v", got)
	}
}

func TestResolveCollectionPolicyLegacyFlagsDisableFamilies(t *testing.T) {
	policy := resolveCollectionPolicy(domain.DeviceDesiredState{
		Enabled:           true,
		CollectInventory:  false,
		CollectMetrics:    true,
		CollectionProfile: "server_syspro",
	})

	if !policy.enabled(collectorMetrics) {
		t.Fatal("metrics should remain enabled")
	}
	if policy.enabled(collectorSoftware) || policy.enabled(collectorSysproVersions) {
		t.Fatal("inventory collectors should be disabled by legacy flag")
	}
}
