package domain

import "time"

type CurrentState struct {
	ObservedAt time.Time `json:"observed_at"`

	Remote CurrentModuleState `json:"remote"`
	Tunnel CurrentModuleState `json:"tunnel"`
	Backup CurrentModuleState `json:"backup"`
}

type CurrentModuleState struct {
	Enabled       bool         `json:"enabled"`
	Version       string       `json:"version"`
	Status        ModuleStatus `json:"status"`
	LastError     string       `json:"last_error,omitempty"`
	LastAppliedAt *time.Time   `json:"last_applied_at,omitempty"`
}
