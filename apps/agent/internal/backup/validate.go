package backup

import (
	"fmt"
	"os"
)

func validateFileExists(path string, minSizeBytes int64) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, fmt.Errorf("arquivo não encontrado: %s: %w", path, err)
	}
	if info.IsDir() {
		return 0, fmt.Errorf("caminho é um diretório, não arquivo: %s", path)
	}
	if info.Size() < minSizeBytes {
		return info.Size(), fmt.Errorf("arquivo muito pequeno: %s (%d bytes)", path, info.Size())
	}
	return info.Size(), nil
}