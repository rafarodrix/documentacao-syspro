//go:build !windows

package device

func criticalProcessStates() (map[string]string, error) {
	return map[string]string{}, nil
}
