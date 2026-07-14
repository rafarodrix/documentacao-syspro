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

	payload, err := marshalJSONValue(value)
	if err != nil {
		return err
	}

	protected, err := protectJSONValue(payload, buildProtectedFieldSet(protectedFields))
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(protected, "", "  ")
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

	var payload any
	if err := json.Unmarshal(data, &payload); err != nil {
		return fmt.Errorf("unmarshal protected json: %w", err)
	}

	decoded, migrated, needsMigration, err := decodeProtectedJSONValue(payload, buildProtectedFieldSet(protectedFields))
	if err != nil {
		return err
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
		return []string{"agent_token", "default_password", "runtime_password"}
	case "pending_ack_queue.json":
		return []string{"agent_token"}
	case "agent_config.json":
		return []string{"portal_api_key", "chatwoot_website_token", "remote_discovery_token"}
	default:
		return nil
	}
}

func encryptedFieldName(field string) string {
	return field + "_encrypted"
}

func marshalJSONValue(value any) (any, error) {
	data, err := json.Marshal(value)
	if err != nil {
		return nil, fmt.Errorf("marshal json value: %w", err)
	}

	var payload any
	if err := json.Unmarshal(data, &payload); err != nil {
		return nil, fmt.Errorf("unmarshal json value: %w", err)
	}

	return payload, nil
}

func protectJSONValue(value any, protectedFields map[string]struct{}) (any, error) {
	switch typed := value.(type) {
	case map[string]any:
		result := make(map[string]any, len(typed))
		for key, entry := range typed {
			if _, shouldProtect := protectedFields[key]; shouldProtect {
				plainText, _ := entry.(string)
				plainText = strings.TrimSpace(plainText)
				if plainText == "" {
					continue
				}
				protectedValue, err := protectString(plainText)
				if err != nil {
					return nil, fmt.Errorf("protect %s: %w", key, err)
				}
				result[encryptedFieldName(key)] = protectedValue
				continue
			}

			protectedEntry, err := protectJSONValue(entry, protectedFields)
			if err != nil {
				return nil, err
			}
			result[key] = protectedEntry
		}
		return result, nil
	case []any:
		result := make([]any, len(typed))
		for i, entry := range typed {
			protectedEntry, err := protectJSONValue(entry, protectedFields)
			if err != nil {
				return nil, err
			}
			result[i] = protectedEntry
		}
		return result, nil
	default:
		return value, nil
	}
}

func decodeProtectedJSONValue(value any, protectedFields map[string]struct{}) (decoded any, migrated any, needsMigration bool, err error) {
	switch typed := value.(type) {
	case map[string]any:
		decodedMap := make(map[string]any, len(typed))
		migratedMap := make(map[string]any, len(typed))
		for key, entry := range typed {
			if baseKey, isEncrypted := encryptedBaseField(key, protectedFields); isEncrypted {
				encryptedValue, _ := entry.(string)
				if strings.TrimSpace(encryptedValue) == "" {
					continue
				}
				plainText, err := unprotectString(encryptedValue)
				if err != nil {
					return nil, nil, false, fmt.Errorf("unprotect %s: %w", baseKey, err)
				}
				decodedMap[baseKey] = plainText
				migratedMap[key] = encryptedValue
				continue
			}

			if _, shouldProtect := protectedFields[key]; shouldProtect {
				plainText, _ := entry.(string)
				plainText = strings.TrimSpace(plainText)
				if plainText == "" {
					continue
				}
				decodedMap[key] = plainText
				protectedValue, err := protectString(plainText)
				if err != nil {
					return nil, nil, false, fmt.Errorf("migrate protected %s: %w", key, err)
				}
				migratedMap[encryptedFieldName(key)] = protectedValue
				needsMigration = true
				continue
			}

			decodedEntry, migratedEntry, childNeedsMigration, err := decodeProtectedJSONValue(entry, protectedFields)
			if err != nil {
				return nil, nil, false, err
			}
			decodedMap[key] = decodedEntry
			migratedMap[key] = migratedEntry
			needsMigration = needsMigration || childNeedsMigration
		}
		return decodedMap, migratedMap, needsMigration, nil
	case []any:
		decodedList := make([]any, len(typed))
		migratedList := make([]any, len(typed))
		for i, entry := range typed {
			decodedEntry, migratedEntry, childNeedsMigration, err := decodeProtectedJSONValue(entry, protectedFields)
			if err != nil {
				return nil, nil, false, err
			}
			decodedList[i] = decodedEntry
			migratedList[i] = migratedEntry
			needsMigration = needsMigration || childNeedsMigration
		}
		return decodedList, migratedList, needsMigration, nil
	default:
		return value, value, false, nil
	}
}

func buildProtectedFieldSet(fields []string) map[string]struct{} {
	result := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		trimmed := strings.TrimSpace(field)
		if trimmed == "" {
			continue
		}
		result[trimmed] = struct{}{}
	}
	return result
}

func encryptedBaseField(key string, protectedFields map[string]struct{}) (string, bool) {
	for field := range protectedFields {
		if key == encryptedFieldName(field) {
			return field, true
		}
	}
	return "", false
}
