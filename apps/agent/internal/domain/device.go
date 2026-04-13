package domain

type DeviceIdentity struct {
	DeviceID       string `json:"device_id"`
	Hostname       string `json:"hostname"`
	OS             string `json:"os"`
	IdentitySource string `json:"identity_source"`
}