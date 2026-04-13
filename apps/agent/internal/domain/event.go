package domain

import "time"

type TelemetryEvent struct {
	Type       string         `json:"type"`
	Severity   string         `json:"severity"`
	Module     string         `json:"module"`
	Message    string         `json:"message"`
	DeviceID   string         `json:"device_id,omitempty"`
	OccurredAt time.Time      `json:"occurred_at"`
	Metadata   map[string]any `json:"metadata,omitempty"`
}