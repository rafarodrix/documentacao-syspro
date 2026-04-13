package backup

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Reporter struct {
	BaseURL    string
	Token      string
	HTTPClient *http.Client
}

type ReportPayload struct {
	InstanceID string `json:"instance_id"`
	Result
}

func NewReporter(baseURL, token string) *Reporter {
	return &Reporter{
		BaseURL: baseURL,
		Token:   token,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (r *Reporter) SendBackupResult(ctx context.Context, instanceID string, result Result) error {
	if r == nil {
		return fmt.Errorf("reporter is nil")
	}
	if instanceID == "" {
		return fmt.Errorf("instanceID vazio")
	}

	payload := ReportPayload{
		InstanceID: instanceID,
		Result:     result,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("erro ao serializar report payload: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		r.BaseURL+"/agents/backup/result",
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("erro ao criar request de report: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if r.Token != "" {
		req.Header.Set("Authorization", "Bearer "+r.Token)
	}

	resp, err := r.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("erro ao enviar resultado de backup: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("portal respondeu com status inválido: %d", resp.StatusCode)
	}

	return nil
}