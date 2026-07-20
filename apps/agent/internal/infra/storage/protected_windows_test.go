//go:build windows

package storage

import (
	"encoding/base64"
	"testing"
	"unsafe"

	"golang.org/x/sys/windows"
)

func TestProtectStringUsesMachineScopePrefixAndRoundTrips(t *testing.T) {
	t.Parallel()

	protectedValue, err := protectString("internal-key")
	if err != nil {
		t.Fatalf("protectString returned error: %v", err)
	}
	if len(protectedValue) <= len(machineProtectedPrefix) || protectedValue[:len(machineProtectedPrefix)] != machineProtectedPrefix {
		t.Fatalf("expected machine-scoped prefix, got %q", protectedValue)
	}

	plainText, needsMigration, err := unprotectString(protectedValue)
	if err != nil {
		t.Fatalf("unprotectString returned error: %v", err)
	}
	if needsMigration {
		t.Fatalf("expected machine-scoped payload to avoid migration")
	}
	if plainText != "internal-key" {
		t.Fatalf("expected roundtrip value, got %q", plainText)
	}
}

func TestDecodeProtectedJSONValueMigratesLegacyUserScopedPayload(t *testing.T) {
	t.Parallel()

	legacyValue, err := protectLegacyUserString("legacy-key")
	if err != nil {
		t.Fatalf("protectLegacyUserString returned error: %v", err)
	}

	decoded, migrated, needsMigration, err := decodeProtectedJSONValue(
		map[string]any{
			encryptedFieldName("portal_api_key"): legacyValue,
		},
		buildProtectedFieldSet([]string{"portal_api_key"}),
	)
	if err != nil {
		t.Fatalf("decodeProtectedJSONValue returned error: %v", err)
	}
	if !needsMigration {
		t.Fatalf("expected legacy payload to require migration")
	}

	decodedMap, ok := decoded.(map[string]any)
	if !ok {
		t.Fatalf("expected decoded map, got %T", decoded)
	}
	if got := decodedMap["portal_api_key"]; got != "legacy-key" {
		t.Fatalf("expected decoded value %q, got %#v", "legacy-key", got)
	}

	migratedMap, ok := migrated.(map[string]any)
	if !ok {
		t.Fatalf("expected migrated map, got %T", migrated)
	}
	migratedValue, _ := migratedMap[encryptedFieldName("portal_api_key")].(string)
	if len(migratedValue) <= len(machineProtectedPrefix) || migratedValue[:len(machineProtectedPrefix)] != machineProtectedPrefix {
		t.Fatalf("expected migrated payload to gain machine prefix, got %q", migratedValue)
	}

	plainText, fieldNeedsMigration, err := unprotectString(migratedValue)
	if err != nil {
		t.Fatalf("unprotectString on migrated value returned error: %v", err)
	}
	if fieldNeedsMigration {
		t.Fatalf("expected migrated payload to be machine-scoped")
	}
	if plainText != "legacy-key" {
		t.Fatalf("expected migrated roundtrip value, got %q", plainText)
	}
}

func protectLegacyUserString(value string) (string, error) {
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
		return "", callErr
	}
	defer windows.LocalFree(windows.Handle(uintptr(unsafe.Pointer(output.pbData))))

	protectedBytes := copyBlobBytes(output)
	return base64.StdEncoding.EncodeToString(protectedBytes), nil
}
