package domain

type ReconcilePlan struct {
	DesiredVersion int64             `json:"desired_version"`
	Actions        []ReconcileAction `json:"actions"`
}

type ReconcileAction struct {
	Module  string         `json:"module"`
	Type    string         `json:"type"`
	Reason  string         `json:"reason"`
	Desired map[string]any `json:"desired,omitempty"`
	Current map[string]any `json:"current,omitempty"`
}
