package logging

import (
	"log"
	"strings"
)

const (
	levelDebug = iota
	levelInfo
	levelWarn
	levelError
)

type Logger struct {
	level int
}

func New(level string) *Logger {
	return &Logger{level: parseLevel(level)}
}

func (l *Logger) Debug(msg string, kv ...any) { l.print(levelDebug, "DEBUG", msg, kv...) }
func (l *Logger) Info(msg string, kv ...any)  { l.print(levelInfo, "INFO", msg, kv...) }
func (l *Logger) Warn(msg string, kv ...any)  { l.print(levelWarn, "WARN", msg, kv...) }
func (l *Logger) Error(msg string, kv ...any) { l.print(levelError, "ERROR", msg, kv...) }

func (l *Logger) print(level int, label string, msg string, kv ...any) {
	if level < l.level {
		return
	}
	log.Println(append([]any{label, msg}, kv...)...)
}

func parseLevel(level string) int {
	switch strings.ToLower(strings.TrimSpace(level)) {
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
