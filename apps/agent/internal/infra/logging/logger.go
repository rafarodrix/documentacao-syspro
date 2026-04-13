package logging

import "log"

type Logger struct {
	level string
}

func New(level string) *Logger {
	return &Logger{level: level}
}

func (l *Logger) Debug(msg string, kv ...any) { log.Println(append([]any{"DEBUG", msg}, kv...)...) }
func (l *Logger) Info(msg string, kv ...any)  { log.Println(append([]any{"INFO", msg}, kv...)...) }
func (l *Logger) Warn(msg string, kv ...any)  { log.Println(append([]any{"WARN", msg}, kv...)...) }
func (l *Logger) Error(msg string, kv ...any) { log.Println(append([]any{"ERROR", msg}, kv...)...) }