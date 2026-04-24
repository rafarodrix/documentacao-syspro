package webview

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
)

type Logger interface {
	Info(msg string, kv ...any)
}

// Opener hosts the support target in a dedicated agent-owned window on Windows.
// Non-Windows platforms still fall back to the OS default handler until a native
// embedded webview is added there as well.
type Opener struct {
	logger Logger
}

func NewOpener(logger Logger) *Opener {
	return &Opener{logger: logger}
}

func (o *Opener) Open(ctx context.Context, target string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-Command", buildWindowsWebViewScript(target))
	case "darwin":
		cmd = exec.CommandContext(ctx, "open", target)
	default:
		cmd = exec.CommandContext(ctx, "xdg-open", target)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open target %q: %w", target, err)
	}

	o.logger.Info("support target opened", "target", target)
	return nil
}

func buildWindowsWebViewScript(target string) string {
	escapedTarget := escapePowerShellSingleQuoted(target)

	return strings.Join([]string{
		"Add-Type -AssemblyName System.Windows.Forms",
		"Add-Type -AssemblyName System.Drawing",
		fmt.Sprintf("$target = '%s'", escapedTarget),
		"$form = New-Object System.Windows.Forms.Form",
		"$form.Text = 'Trilink Support'",
		"$form.Width = 420",
		"$form.Height = 760",
		"$form.StartPosition = 'CenterScreen'",
		"$form.TopMost = $false",
		"$form.BackColor = [System.Drawing.Color]::FromArgb(244,246,248)",
		"$browser = New-Object System.Windows.Forms.WebBrowser",
		"$browser.Dock = 'Fill'",
		"$browser.ScriptErrorsSuppressed = $true",
		"$browser.IsWebBrowserContextMenuEnabled = $false",
		"$browser.WebBrowserShortcutsEnabled = $true",
		"$browser.AllowWebBrowserDrop = $false",
		"$form.Controls.Add($browser)",
		"$form.Add_Shown({ $browser.Navigate($target) })",
		"[void]$form.ShowDialog()",
	}, "; ")
}

func escapePowerShellSingleQuoted(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}
