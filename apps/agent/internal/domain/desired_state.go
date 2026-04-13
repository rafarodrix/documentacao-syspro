package domain

import "time"

type DesiredState struct {
	Version   int64     `json:"version"`
	UpdatedAt time.Time `json:"updated_at"`
}