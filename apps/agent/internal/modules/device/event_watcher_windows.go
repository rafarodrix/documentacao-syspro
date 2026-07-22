//go:build windows

package device

import (
	"context"
	"encoding/xml"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

type windowsEventXML struct {
	System struct {
		Provider struct {
			Name string `xml:"Name,attr"`
		} `xml:"Provider"`
		EventID     string `xml:"EventID"`
		RecordID    string `xml:"EventRecordID"`
		Channel     string `xml:"Channel"`
		TimeCreated struct {
			SystemTime string `xml:"SystemTime,attr"`
		} `xml:"TimeCreated"`
	} `xml:"System"`
	RenderingInfo struct {
		Message string `xml:"Message"`
	} `xml:"RenderingInfo"`
}

func collectCriticalWindowsEvents(ctx context.Context) ([]criticalEvent, error) {
	queries := []struct{ channel, filter string }{
		{"System", "*[System[(EventID=6008 or EventID=7031 or EventID=7034)]]"},
		{"Application", "*[System[(EventID=1000)]]"},
	}
	var result []criticalEvent
	for _, query := range queries {
		commandCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		output, err := exec.CommandContext(commandCtx, "wevtutil.exe", "qe", query.channel, "/q:"+query.filter, "/f:RenderedXml", "/c:25", "/rd:true", "/uni:false").Output()
		cancel()
		if err != nil {
			return nil, fmt.Errorf("query %s: %w", query.channel, err)
		}
		for _, raw := range strings.Split(string(output), "</Event>") {
			raw = strings.TrimSpace(raw)
			if raw == "" {
				continue
			}
			raw += "</Event>"
			var parsed windowsEventXML
			if xml.Unmarshal([]byte(raw), &parsed) != nil || !isCriticalAllowedEvent(parsed, raw) {
				continue
			}
			occurredAt, err := time.Parse(time.RFC3339Nano, parsed.System.TimeCreated.SystemTime)
			if err != nil {
				occurredAt = time.Now().UTC()
			}
			message := strings.TrimSpace(parsed.RenderingInfo.Message)
			if message == "" {
				message = strings.TrimSpace(raw)
			}
			result = append(result, criticalEvent{EventID: parsed.System.Channel + ":" + parsed.System.RecordID, Source: "windows_event_log", Provider: parsed.System.Provider.Name, EventCode: parsed.System.EventID, Severity: "critical", Message: message, OccurredAt: occurredAt.UTC(), Metadata: map[string]any{"channel": parsed.System.Channel, "recordId": parsed.System.RecordID}})
		}
	}
	return result, nil
}

func isCriticalAllowedEvent(event windowsEventXML, raw string) bool {
	code := strings.TrimSpace(event.System.EventID)
	if code == "6008" {
		return event.System.Channel == "System"
	}
	lower := strings.ToLower(raw)
	hasTarget := strings.Contains(lower, "firebird") || strings.Contains(lower, "syspro") || strings.Contains(lower, "w3svc") || strings.Contains(lower, "rustdesk")
	return hasTarget && ((event.System.Channel == "System" && (code == "7031" || code == "7034")) || (event.System.Channel == "Application" && code == "1000"))
}
