package domain

import "time"

type DesiredState struct {
	Version   int64     `json:"version"`
	UpdatedAt time.Time `json:"updated_at"`

	Remote  RemoteDesiredState  `json:"remote"`
	Tunnel  TunnelDesiredState  `json:"tunnel"`
	Backup  BackupDesiredState  `json:"backup"`
	Support SupportDesiredState `json:"support"`
	Device  DeviceDesiredState  `json:"device"`
}
