package logging

import (
	"log"
	"strings"
)

const (
	levelDebug = 0
	levelInfo  = 1
	levelWarn  = 2
	levelError = 3
)

type Logger struct {
	minLevel int
}

func New(level string) *Logger {
	return &Logger{minLevel: parseLevel(level)}
}

func (l *Logger) Debug(msg string, kv ...any) {
	if l.minLevel <= levelDebug {
		log.Println(append([]any{"DEBUG", msg}, kv...)...)
	}
}
func (l *Logger) Info(msg string, kv ...any) {
	if l.minLevel <= levelInfo {
		log.Println(append([]any{"INFO", msg}, kv...)...)
	}
}
func (l *Logger) Warn(msg string, kv ...any) {
	if l.minLevel <= levelWarn {
		log.Println(append([]any{"WARN", msg}, kv...)...)
	}
}
func (l *Logger) Error(msg string, kv ...any) {
	if l.minLevel <= levelError {
		log.Println(append([]any{"ERROR", msg}, kv...)...)
	}
}

func parseLevel(s string) int {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return levelDebug
	case "warn", "warning":
		return levelWarn
	case "error":
		return levelError
	default:
		return levelInfo
	}
}
