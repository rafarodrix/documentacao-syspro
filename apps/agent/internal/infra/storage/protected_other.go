//go:build !windows

package storage

func protectString(value string) (string, error) {
	return value, nil
}

func unprotectString(value string) (string, bool, error) {
	return value, false, nil
}
