package backup

import "time"

type ResultStatus string

const (
	ResultSuccess ResultStatus = "success"
	ResultFailed  ResultStatus = "failed"
)

type Result struct {
	TaskID          string       `json:"task_id"`
	PolicyID        string       `json:"policy_id"`
	ServiceID       string       `json:"service_id"`
	DatabasePath    string       `json:"database_path"`
	Status          ResultStatus `json:"status"`
	ErrorStage      string       `json:"error_stage,omitempty"`
	ErrorMessage    string       `json:"error_message,omitempty"`
	StartedAt       time.Time    `json:"started_at"`
	FinishedAt      time.Time    `json:"finished_at"`
	DurationSeconds int          `json:"duration_seconds"`

	FBKSizeBytes     int64   `json:"fbk_size_bytes"`
	ArchiveSizeBytes int64   `json:"archive_size_bytes"`
	CompressionRatio float64 `json:"compression_ratio"`

	GbakDurationSeconds     int `json:"gbak_duration_seconds"`
	CompressDurationSeconds int `json:"compress_duration_seconds"`
	UploadDurationSeconds   int `json:"upload_duration_seconds"`

	Hash string `json:"hash,omitempty"`
}

func (t *Task) ToResult(hash string) Result {
	total := t.FinishedAt.Sub(t.StartedAt)
	var ratio float64
	if t.FBKSizeBytes > 0 && t.ArchiveSizeBytes > 0 {
		ratio = float64(t.ArchiveSizeBytes) / float64(t.FBKSizeBytes)
	}

	status := ResultSuccess
	errStage := ""
	errMsg := ""
	if t.LastError != nil {
		status = ResultFailed
		errStage = string(t.CurrentStage)
		errMsg = t.LastError.Error()
	}

	return Result{
		TaskID:                   t.ID,
		PolicyID:                 t.Policy.ID,
		ServiceID:                t.Policy.ServiceID,
		DatabasePath:             t.Policy.DatabasePath,
		Status:                   status,
		ErrorStage:               errStage,
		ErrorMessage:             errMsg,
		StartedAt:                t.StartedAt,
		FinishedAt:               t.FinishedAt,
		DurationSeconds:          int(total.Seconds()),
		FBKSizeBytes:             t.FBKSizeBytes,
		ArchiveSizeBytes:         t.ArchiveSizeBytes,
		CompressionRatio:         ratio,
		GbakDurationSeconds:      int(t.GbakDuration.Seconds()),
		CompressDurationSeconds:  int(t.CompressDuration.Seconds()),
		UploadDurationSeconds:    int(t.UploadDuration.Seconds()),
		Hash:                     hash,
	}
}