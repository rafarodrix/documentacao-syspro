package webview

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

type Logger interface {
	Info(msg string, kv ...any)
}

// Opener prefers a modern app-like host on Windows. It first tries Microsoft Edge
// in app mode for Chromium rendering and a dedicated window. If Edge isn't
// available, it falls back to the legacy WinForms host.
// Non-Windows platforms still use the OS default handler for now.
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
		if edgePath, ok := findEdgeExecutable(); ok {
			appTarget, err := toEdgeAppTarget(target)
			if err != nil {
				return err
			}

			cmd = exec.CommandContext(
				ctx,
				"powershell.exe",
				"-NoProfile",
				"-ExecutionPolicy",
				"Bypass",
				"-STA",
				"-Command",
				buildWindowsEdgeAppHostScript(edgePath, appTarget),
			)
			o.logger.Info("opening support target with edge app mode", "target", appTarget)
		} else {
			cmd = exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-Command", buildWindowsWebViewScript(target))
			o.logger.Info("opening support target with winforms fallback", "target", target)
		}
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

func findEdgeExecutable() (string, bool) {
	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "Microsoft", "Edge", "Application", "msedge.exe"),
		filepath.Join(os.Getenv("ProgramFiles"), "Microsoft", "Edge", "Application", "msedge.exe"),
	}

	for _, candidate := range candidates {
		if strings.TrimSpace(candidate) == "" {
			continue
		}
		if _, err := os.Stat(candidate); err == nil {
			return candidate, true
		}
	}

	return "", false
}

func toEdgeAppTarget(target string) (string, error) {
	if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") || strings.HasPrefix(target, "file://") {
		return target, nil
	}

	absTarget, err := filepath.Abs(target)
	if err != nil {
		return "", fmt.Errorf("resolve support target path: %w", err)
	}

	u := url.URL{
		Scheme: "file",
		Path:   filepath.ToSlash(absTarget),
	}
	return u.String(), nil
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

func buildWindowsEdgeAppHostScript(edgePath, target string) string {
	escapedEdgePath := escapePowerShellSingleQuoted(edgePath)
	escapedTarget := escapePowerShellSingleQuoted(target)

	return strings.Join([]string{
		fmt.Sprintf("$edgePath = '%s'", escapedEdgePath),
		fmt.Sprintf("$target = '%s'", escapedTarget),
		"$windowTitle = 'Trilink Support'",
		"$targetWidth = 420",
		"$targetHeight = 700",
		"$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea",
		"$targetX = [Math]::Max(0, $screen.Right - $targetWidth - 18)",
		"$targetY = [Math]::Max(0, $screen.Bottom - $targetHeight - 18)",
		"$existing = Get-Process -Name 'msedge' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Trilink Support*' } | Select-Object -First 1",
		"Add-Type -AssemblyName System.Windows.Forms",
		"if ($existing) {",
		"  Add-Type -Namespace Win32 -Name Native -MemberDefinition '[System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(System.IntPtr hWnd, int nCmdShow); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(System.IntPtr hWnd); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool SetWindowPos(System.IntPtr hWnd, System.IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);'",
		"  [Win32.Native]::ShowWindowAsync($existing.MainWindowHandle, 9) | Out-Null",
		"  [Win32.Native]::SetWindowPos($existing.MainWindowHandle, [IntPtr]::Zero, $targetX, $targetY, $targetWidth, $targetHeight, 0x0040) | Out-Null",
		"  [Win32.Native]::SetForegroundWindow($existing.MainWindowHandle) | Out-Null",
		"  exit 0",
		"}",
		"$before = @(Get-Process -Name 'msedge' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)",
		"$null = Start-Process -FilePath $edgePath -ArgumentList @('--app=' + $target, '--window-size=' + $targetWidth + ',' + $targetHeight, '--window-position=' + $targetX + ',' + $targetY, '--disable-features=msEdgeSidebarV2')",
		"Start-Sleep -Milliseconds 1800",
		"$newWindow = Get-Process -Name 'msedge' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like '*Trilink Support*' -and ($before -notcontains $_.Id) } | Sort-Object StartTime -Descending | Select-Object -First 1",
		"if (-not $newWindow) { $newWindow = Get-Process -Name 'msedge' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like '*Trilink Support*' } | Sort-Object StartTime -Descending | Select-Object -First 1 }",
		"if ($newWindow) {",
		"  Add-Type -Namespace Win32 -Name Native2 -MemberDefinition '[System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool SetWindowPos(System.IntPtr hWnd, System.IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags); [System.Runtime.InteropServices.DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(System.IntPtr hWnd);'",
		"  [Win32.Native2]::SetWindowPos($newWindow.MainWindowHandle, [IntPtr]::Zero, $targetX, $targetY, $targetWidth, $targetHeight, 0x0040) | Out-Null",
		"  [Win32.Native2]::SetForegroundWindow($newWindow.MainWindowHandle) | Out-Null",
		"}",
	}, "; ")
}

func escapePowerShellSingleQuoted(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}
