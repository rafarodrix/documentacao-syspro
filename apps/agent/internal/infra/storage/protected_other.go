//go:build !windows

package storage

func protectString(value string) (string, error) {
	return value, nil
}

func unprotectString(value string) (string, error) {
	return value, nil
}
