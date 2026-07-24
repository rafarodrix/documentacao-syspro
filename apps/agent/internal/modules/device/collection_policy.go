package device

import (
	"strings"
	"time"

	"trilink/agent/internal/domain"
)

// Coletores alinhados ao contrato packages/contracts/src/agent/collection-profile.ts
const (
	collectorMetrics          = "metrics"
	collectorCriticalServices = "critical_services"
	collectorDisks            = "disks"
	collectorNetwork          = "network"
	collectorSystem           = "system"
	collectorSoftware         = "software"
	collectorHardware         = "hardware"
	collectorWindowsUpdate    = "windows_update"
	collectorAllServices      = "all_services"
	collectorSysproVersions      = "syspro_versions"
	collectorCriticalEvents      = "critical_events"
	collectorSysproRuntimeProbes = "syspro_runtime_probes"
)

type collectorPolicy struct {
	enabled  bool
	interval time.Duration
	jitter   time.Duration
	priority int
}

type collectionPolicy struct {
	profile   string
	collectors map[string]collectorPolicy
}

func resolveCollectionPolicy(desired domain.DeviceDesiredState) collectionPolicy {
	profile := strings.TrimSpace(desired.CollectionProfile)
	if profile == "" {
		if desired.CollectMetrics || desired.CollectInventory {
			profile = "server_syspro"
		} else {
			profile = "unlinked"
		}
	}

	base := profileDefaults(profile)

	// Flags legadas: se o portal desligar inventário/métricas, respeita.
	if !desired.CollectMetrics {
		disableCollector(base, collectorMetrics)
		disableCollector(base, collectorCriticalServices)
		disableCollector(base, collectorCriticalEvents)
	}
	if !desired.CollectInventory {
		for _, id := range []string{
			collectorDisks,
			collectorNetwork,
			collectorSystem,
			collectorSoftware,
			collectorHardware,
			collectorWindowsUpdate,
			collectorAllServices,
			collectorSysproVersions,
		} {
			disableCollector(base, id)
		}
	}

	// Overrides explícitos do desired-state (collectors map).
	applyCollectorOverrides(base, desired.Collectors)

	return collectionPolicy{profile: profile, collectors: base}
}

func (p collectionPolicy) enabled(collector string) bool {
	policy, ok := p.collectors[collector]
	return ok && policy.enabled
}

func (p collectionPolicy) schedule(collector string) collectorSchedule {
	policy, ok := p.collectors[collector]
	if !ok {
		return collectionSchedules[collector]
	}
	fallback := collectionSchedules[collector]
	interval := policy.interval
	if interval <= 0 {
		interval = fallback.interval
	}
	jitter := policy.jitter
	if jitter <= 0 {
		jitter = fallback.jitter
	}
	priority := policy.priority
	if priority <= 0 {
		priority = fallback.priority
	}
	return collectorSchedule{interval: interval, jitter: jitter, priority: priority}
}

func profileDefaults(profile string) map[string]collectorPolicy {
	switch profile {
	case "workstation":
		return map[string]collectorPolicy{
			collectorMetrics:          {enabled: true, interval: 5 * time.Minute, priority: 1},
			collectorCriticalServices: {enabled: true, interval: 5 * time.Minute, priority: 1},
			collectorDisks:            {enabled: true, interval: 10 * time.Minute, jitter: time.Minute, priority: 1},
			collectorNetwork:          {enabled: true, interval: 6 * time.Hour, jitter: 30 * time.Minute, priority: 2},
			collectorSystem:           {enabled: true, interval: 24 * time.Hour, jitter: time.Hour, priority: 3},
			collectorSoftware:         {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorHardware:         {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorWindowsUpdate:    {enabled: true, interval: 12 * time.Hour, jitter: time.Hour, priority: 3},
			collectorAllServices:      {enabled: false, interval: 12 * time.Hour, priority: 3},
			collectorSysproVersions:      {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorCriticalEvents:      {enabled: true, priority: 1},
			collectorSysproRuntimeProbes: {enabled: false, interval: 5 * time.Minute, priority: 2},
		}
	case "terminal":
		return map[string]collectorPolicy{
			collectorMetrics:             {enabled: true, interval: 5 * time.Minute, priority: 1},
			collectorCriticalServices:    {enabled: true, interval: 10 * time.Minute, priority: 1},
			collectorDisks:               {enabled: true, interval: 15 * time.Minute, jitter: 2 * time.Minute, priority: 1},
			collectorNetwork:             {enabled: true, interval: 24 * time.Hour, jitter: time.Hour, priority: 2},
			collectorSystem:              {enabled: true, interval: 24 * time.Hour, jitter: time.Hour, priority: 3},
			collectorSoftware:            {enabled: false, interval: 24 * time.Hour, priority: 3},
			collectorHardware:            {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorWindowsUpdate:       {enabled: true, interval: 24 * time.Hour, jitter: time.Hour, priority: 3},
			collectorAllServices:         {enabled: false, interval: 12 * time.Hour, priority: 3},
			collectorSysproVersions:      {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorCriticalEvents:      {enabled: false, priority: 1},
			collectorSysproRuntimeProbes: {enabled: false, interval: 5 * time.Minute, priority: 2},
		}
	case "backup_node":
		return map[string]collectorPolicy{
			collectorMetrics:             {enabled: true, interval: 2 * time.Minute, priority: 1},
			collectorCriticalServices:    {enabled: true, interval: 2 * time.Minute, priority: 1},
			collectorDisks:               {enabled: true, interval: 3 * time.Minute, jitter: 30 * time.Second, priority: 1},
			collectorNetwork:             {enabled: true, interval: 30 * time.Minute, jitter: 5 * time.Minute, priority: 2},
			collectorSystem:              {enabled: true, interval: 12 * time.Hour, jitter: time.Hour, priority: 3},
			collectorSoftware:            {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorHardware:            {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorWindowsUpdate:       {enabled: true, interval: 6 * time.Hour, jitter: 30 * time.Minute, priority: 3},
			collectorAllServices:         {enabled: true, interval: 12 * time.Hour, jitter: time.Hour, priority: 3},
			collectorSysproVersions:      {enabled: false, interval: 24 * time.Hour, priority: 3},
			collectorCriticalEvents:      {enabled: true, priority: 1},
			collectorSysproRuntimeProbes: {enabled: false, interval: 5 * time.Minute, priority: 2},
		}
	case "unlinked":
		return map[string]collectorPolicy{
			collectorMetrics:             {enabled: true, interval: 5 * time.Minute, priority: 1},
			collectorCriticalServices:    {enabled: true, interval: 5 * time.Minute, priority: 1},
			collectorDisks:               {enabled: true, interval: 15 * time.Minute, jitter: 2 * time.Minute, priority: 1},
			collectorNetwork:             {enabled: true, interval: 24 * time.Hour, jitter: time.Hour, priority: 2},
			collectorSystem:              {enabled: true, interval: 24 * time.Hour, jitter: time.Hour, priority: 3},
			collectorSoftware:            {enabled: false, interval: 24 * time.Hour, priority: 3},
			collectorHardware:            {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorWindowsUpdate:       {enabled: false, interval: 6 * time.Hour, priority: 3},
			collectorAllServices:         {enabled: false, interval: 12 * time.Hour, priority: 3},
			collectorSysproVersions:      {enabled: false, interval: 24 * time.Hour, priority: 3},
			collectorCriticalEvents:      {enabled: false, priority: 1},
			collectorSysproRuntimeProbes: {enabled: false, interval: 5 * time.Minute, priority: 2},
		}
	default: // server_syspro — RMM completo (comportamento histórico)
		return map[string]collectorPolicy{
			collectorMetrics:             {enabled: true, interval: time.Minute, priority: 1},
			collectorCriticalServices:    {enabled: true, interval: 2 * time.Minute, priority: 1},
			collectorDisks:               {enabled: true, interval: 5 * time.Minute, jitter: 30 * time.Second, priority: 1},
			collectorNetwork:             {enabled: true, interval: 15 * time.Minute, jitter: 2 * time.Minute, priority: 2},
			collectorSystem:              {enabled: true, interval: 12 * time.Hour, jitter: time.Hour, priority: 3},
			collectorSoftware:            {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorHardware:            {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorWindowsUpdate:       {enabled: true, interval: 6 * time.Hour, jitter: 30 * time.Minute, priority: 3},
			collectorAllServices:         {enabled: true, interval: 12 * time.Hour, jitter: time.Hour, priority: 3},
			collectorSysproVersions:      {enabled: true, interval: 24 * time.Hour, jitter: 90 * time.Minute, priority: 3},
			collectorCriticalEvents:      {enabled: true, priority: 1},
			collectorSysproRuntimeProbes: {enabled: true, interval: 5 * time.Minute, priority: 2},
		}
	}
}

func disableCollector(policies map[string]collectorPolicy, id string) {
	policy, ok := policies[id]
	if !ok {
		return
	}
	policy.enabled = false
	policies[id] = policy
}

func applyCollectorOverrides(policies map[string]collectorPolicy, overrides map[string]domain.CollectorPolicy) {
	if len(overrides) == 0 {
		return
	}
	for id, override := range overrides {
		policy, ok := policies[id]
		if !ok {
			policy = collectorPolicy{priority: 3}
		}
		policy.enabled = override.Enabled
		if override.IntervalSeconds > 0 {
			policy.interval = time.Duration(override.IntervalSeconds) * time.Second
		}
		policies[id] = policy
	}
}
