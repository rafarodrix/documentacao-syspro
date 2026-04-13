package backup

import "time"

type CompressionProfile string

const (
	CompressionFast     CompressionProfile = "fast"
	CompressionBalanced CompressionProfile = "balanced"
	CompressionMax      CompressionProfile = "max"
)

type UploadType string

const (
	UploadTypeSFTP UploadType = "sftp"
	UploadTypeS3   UploadType = "s3"
)

type DatabaseCredentials struct {
	Username string
	Password string
}

type CompressionPolicy struct {
	Enabled                  bool
	Profile                  CompressionProfile
	DeleteSourceAfterSuccess bool
}

type UploadPolicy struct {
	Type       UploadType
	RemoteName string // ex: "trilink-remote"
	RemotePath string // ex: "/backup/clientes/cliente-a/prod"
	BwLimit    string // ex: "2M"
}

type BackupPolicy struct {
	ID           string
	ServiceID    string
	DatabasePath string
	GbakPath     string
	SevenZipPath string
	RclonePath   string
	WorkingDir   string
	Timeout      time.Duration
	Credentials  DatabaseCredentials
	Compression  CompressionPolicy
	Upload       UploadPolicy
}