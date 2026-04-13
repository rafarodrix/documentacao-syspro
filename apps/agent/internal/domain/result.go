package domain

type ApplyResult struct {
	Module  string `json:"module"`
	Changed bool   `json:"changed"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
}
