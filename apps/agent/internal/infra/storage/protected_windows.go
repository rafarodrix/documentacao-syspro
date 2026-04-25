//go:build windows

package storage

import (
	"encoding/base64"
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
)

const cryptProtectUIForbidden = 0x1

var (
	modCrypt32          = windows.NewLazySystemDLL("crypt32.dll")
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
		uintptr(cryptProtectUIForbidden),
		uintptr(unsafe.Pointer(&output)),
	)
	if r1 == 0 {
		return "", fmt.Errorf("CryptProtectData failed: %w", callErr)
	}
	defer windows.LocalFree(windows.Handle(uintptr(unsafe.Pointer(output.pbData))))

	protectedBytes := copyBlobBytes(output)
	return base64.StdEncoding.EncodeToString(protectedBytes), nil
}

func unprotectString(value string) (string, error) {
	protectedBytes, err := base64.StdEncoding.DecodeString(value)
	if err != nil {
		return "", fmt.Errorf("decode protected payload: %w", err)
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
		return "", fmt.Errorf("CryptUnprotectData failed: %w", callErr)
	}
	defer windows.LocalFree(windows.Handle(uintptr(unsafe.Pointer(output.pbData))))

	return string(copyBlobBytes(output)), nil
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
