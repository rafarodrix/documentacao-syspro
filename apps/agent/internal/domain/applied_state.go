package domain

import "time"

type AppliedState struct {
	AppliedAt      time.Time `json:"applied_at"`
	DesiredVersion int64     `json:"desired_version"`

	Remote AppliedModuleState `json:"remote"`
	Tunnel AppliedModuleState `json:"tunnel"`
	Backup AppliedModuleState `json:"backup"`
}

type AppliedModuleState struct {
	Enabled bool   `json:"enabled"`
	Version string `json:"version"`
}
