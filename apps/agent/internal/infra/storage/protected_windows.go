//go:build windows

package storage

import (
	"encoding/base64"
	"fmt"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	cryptProtectUIForbidden  = 0x1
	cryptProtectLocalMachine = 0x4
	machineProtectedPrefix   = "dpapi-machine:"
)

var (
	modCrypt32             = windows.NewLazySystemDLL("crypt32.dll")
	procCryptProtectData   = modCrypt32.NewProc("CryptProtectData")
	procCryptUnprotectData = modCrypt32.NewProc("CryptUnprotectData")
)

type dataBlob struct {
	cbData uint32
	pbData *byte
}

func protectString(value string) (string, error) {
	plainBytes := []byte(value)
	input := newDataBlob(plainBytes)
	var output dataBlob

	r1, _, callErr := procCryptProtectData.Call(
		uintptr(unsafe.Pointer(&input)),
		0,
		0,
		0,
		0,
		uintptr(cryptProtectUIForbidden|cryptProtectLocalMachine),
		uintptr(unsafe.Pointer(&output)),
	)
	if r1 == 0 {
		return "", fmt.Errorf("CryptProtectData failed: %w", callErr)
	}
	defer windows.LocalFree(windows.Handle(uintptr(unsafe.Pointer(output.pbData))))

	protectedBytes := copyBlobBytes(output)
	return machineProtectedPrefix + base64.StdEncoding.EncodeToString(protectedBytes), nil
}

func unprotectString(value string) (string, bool, error) {
	trimmed := strings.TrimSpace(value)
	needsMigration := !strings.HasPrefix(trimmed, machineProtectedPrefix)
	if !needsMigration {
		trimmed = strings.TrimPrefix(trimmed, machineProtectedPrefix)
	}

	protectedBytes, err := base64.StdEncoding.DecodeString(trimmed)
	if err != nil {
		return "", false, fmt.Errorf("decode protected payload: %w", err)
	}

	input := newDataBlob(protectedBytes)
	var output dataBlob

	r1, _, callErr := procCryptUnprotectData.Call(
		uintptr(unsafe.Pointer(&input)),
		0,
		0,
		0,
		0,
		uintptr(cryptProtectUIForbidden),
		uintptr(unsafe.Pointer(&output)),
	)
	if r1 == 0 {
		return "", false, fmt.Errorf("CryptUnprotectData failed: %w", callErr)
	}
	defer windows.LocalFree(windows.Handle(uintptr(unsafe.Pointer(output.pbData))))

	return string(copyBlobBytes(output)), needsMigration, nil
}

func newDataBlob(data []byte) dataBlob {
	if len(data) == 0 {
		return dataBlob{}
	}
	return dataBlob{
		cbData: uint32(len(data)),
		pbData: &data[0],
	}
}

func copyBlobBytes(blob dataBlob) []byte {
	if blob.cbData == 0 || blob.pbData == nil {
		return nil
	}

	source := unsafe.Slice(blob.pbData, blob.cbData)
	copied := make([]byte, len(source))
	copy(copied, source)
	return copied
}
