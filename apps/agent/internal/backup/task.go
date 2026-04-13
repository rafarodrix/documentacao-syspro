package backup

import "time"

type Stage string

const (
	StagePrepare         Stage = "prepare"
	StageGbak            Stage = "gbak"
	StageValidateFBK     Stage = "validate_fbk"
	StageCompress        Stage = "compress"
	StageValidateArchive Stage = "validate_archive"
	StageUpload          Stage = "upload"
)

type Task struct {
	ID           string
	Policy       BackupPolicy
	StartedAt    time.Time
	FinishedAt   time.Time
	CurrentStage Stage

	FBKPath     string
	ArchivePath string

	FBKSizeBytes     int64
	ArchiveSizeBytes int64

	GbakDuration     time.Duration
	CompressDuration time.Duration
	UploadDuration   time.Duration

	LastError error
}