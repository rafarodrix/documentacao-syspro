package retry

import (
	"time"
)

func Times(attempts int, delay time.Duration, fn func() error) error {
	var lastErr error

	for i := 0; i < attempts; i++ {
		if err := fn(); err != nil {
			lastErr = err
			if i < attempts-1 {
				time.Sleep(delay)
			}
			continue
		}
		return nil
	}

	return lastErr
}