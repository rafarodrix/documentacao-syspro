package storage

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

type ProtectedStateStore struct {
	inner *LocalStateStore
}

func NewProtectedStateStore(inner *LocalStateStore) *ProtectedStateStore {
	return &ProtectedStateStore{inner: inner}
}

func (s *ProtectedStateStore) SaveJSON(ctx context.Context, name string, value any) error {
	_ = ctx

	protectedFields := protectedFieldsForFile(name)
	if len(protectedFields) == 0 {
		return s.inner.SaveJSON(ctx, name, value)
	}

	payload, err := marshalJSONObject(value)
	if err != nil {
		return err
	}

	for _, field := range protectedFields {
		plainText, _ := payload[field].(string)
		delete(payload, field)
		delete(payload, encryptedFieldName(field))

		plainText = strings.TrimSpace(plainText)
		if plainText == "" {
			continue
		}

		protectedValue, err := protectString(plainText)
		if err != nil {
			return fmt.Errorf("protect %s in %s: %w", field, name, err)
		}

		payload[encryptedFieldName(field)] = protectedValue
	}

	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal protected json: %w", err)
	}

	return s.inner.writeJSONFile(name, data)
}

func (s *ProtectedStateStore) LoadJSON(ctx context.Context, name string, dest any) error {
	_ = ctx

	protectedFields := protectedFieldsForFile(name)
	if len(protectedFields) == 0 {
		return s.inner.LoadJSON(ctx, name, dest)
	}

	data, err := s.inner.readJSONFile(name)
	if err != nil {
		return err
	}

	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		return fmt.Errorf("unmarshal protected json: %w", err)
	}

	decoded := cloneJSONObject(payload)
	migrated := cloneJSONObject(payload)
	needsMigration := false

	for _, field := range protectedFields {
		encryptedName := encryptedFieldName(field)

		if encryptedValue, ok := payload[encryptedName].(string); ok && strings.TrimSpace(encryptedValue) != "" {
			plainText, err := unprotectString(encryptedValue)
			if err != nil {
				return fmt.Errorf("unprotect %s in %s: %w", field, name, err)
			}
			decoded[field] = plainText
			continue
		}

		if plainText, ok := payload[field].(string); ok && strings.TrimSpace(plainText) != "" {
			decoded[field] = plainText

			protectedValue, err := protectString(plainText)
			if err != nil {
				return fmt.Errorf("migrate protected %s in %s: %w", field, name, err)
			}

			delete(migrated, field)
			migrated[encryptedName] = protectedValue
			needsMigration = true
		}
	}

	decodedData, err := json.Marshal(decoded)
	if err != nil {
		return fmt.Errorf("marshal decoded json: %w", err)
	}
	if err := json.Unmarshal(decodedData, dest); err != nil {
		return fmt.Errorf("unmarshal decoded json: %w", err)
	}

	if needsMigration {
		migratedData, err := json.MarshalIndent(migrated, "", "  ")
		if err != nil {
			return fmt.Errorf("marshal migrated protected json: %w", err)
		}
		if err := s.inner.writeJSONFile(name, migratedData); err != nil {
			return fmt.Errorf("persist migrated protected json: %w", err)
		}
	}

	return nil
}

func protectedFieldsForFile(name string) []string {
	switch strings.TrimSpace(strings.ToLower(name)) {
	case "remote_state.json":
		return []string{"agent_token"}
	default:
		return nil
	}
}

func encryptedFieldName(field string) string {
	return field + "_encrypted"
}

func marshalJSONObject(value any) (map[string]any, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("marshal json object: %w", err)
	}

	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("unmarshal json object: %w", err)
	}

	return payload, nil
}

func cloneJSONObject(input map[string]any) map[string]any {
	cloned := make(map[string]any, len(input))
	for key, value := range input {
		cloned[key] = value
	}
	return cloned
}
