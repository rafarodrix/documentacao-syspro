package domain

import "time"

type CurrentState struct {
	ObservedAt time.Time `json:"observed_at"`

	Remote  CurrentModuleState `json:"remote"`
	Tunnel  CurrentModuleState `json:"tunnel"`
	Backup  CurrentModuleState `json:"backup"`
	Support CurrentModuleState `json:"support"`
	Device  CurrentModuleState `json:"device"`
}

type CurrentModuleState struct {
	Enabled       bool         `json:"enabled"`
	Version       string       `json:"version"`
	Status        ModuleStatus `json:"status"`
	LastError     string       `json:"last_error,omitempty"`
	LastAppliedAt *time.Time   `json:"last_applied_at,omitempty"`
}
