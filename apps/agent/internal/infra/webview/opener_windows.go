//go:build windows

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

	webview2 "github.com/jchv/go-webview2"
)

type Logger interface {
	Info(msg string, kv ...any)
}

type NativeBridge interface {
	Invoke(ctx context.Context, action string, payload string) (string, error)
}

type Opener struct {
	logger   Logger
	stateDir string
	bridge   NativeBridge
}

func NewOpener(logger Logger, stateDir string, bridge NativeBridge) *Opener {
	return &Opener{
		logger:   logger,
		stateDir: stateDir,
		bridge:   bridge,
	}
}

func (o *Opener) Open(ctx context.Context, target string) error {
	go o.openAsync(ctx, target)
	return nil
}

func (o *Opener) openAsync(ctx context.Context, target string) {
	if err := o.openWithWebView2(ctx, target); err != nil {
		o.logger.Info("webview2 open failed, falling back", "target", target, "error", err)
		if fallbackErr := o.openWithProcessFallback(ctx, target); fallbackErr != nil {
			o.logger.Info("fallback ui target open failed", "target", target, "error", fallbackErr)
		}
	}
}

func (o *Opener) openWithWebView2(ctx context.Context, target string) error {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()

	windowTitle := resolveWindowTitle(target)
	windowWidth, windowHeight := resolveWindowSize(target)
	navigateTarget, err := toWebViewTarget(target)
	if err != nil {
		return err
	}

	dataPath := filepath.Join(o.stateDir, "webview2")
	_ = os.MkdirAll(dataPath, 0o755)

	w := webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:     false,
		AutoFocus: true,
		DataPath:  dataPath,
		WindowOptions: webview2.WindowOptions{
			Title:  windowTitle,
			Width:  uint(windowWidth),
			Height: uint(windowHeight),
			Center: true,
		},
	})
	if w == nil {
		return fmt.Errorf("webview2 runtime unavailable")
	}
	defer w.Destroy()

	if err := w.Bind("agent_native_invoke", func(action string, payload string) (string, error) {
		return o.invokeBridge(action, payload)
	}); err != nil {
		return fmt.Errorf("bind webview bridge: %w", err)
	}

	w.Init(`window.agentBridge = {
  available: true,
  invoke: function(action, payload) {
    return window.agent_native_invoke(action, payload || "");
  }
};`)
	w.SetTitle(windowTitle)
	w.SetSize(windowWidth, windowHeight, webview2.HintNone)
	w.Navigate(navigateTarget)

	go func() {
		<-ctx.Done()
		w.Terminate()
	}()

	o.logger.Info("opening ui target with webview2", "target", navigateTarget, "title", windowTitle)
	w.Run()
	return nil
}

func (o *Opener) invokeBridge(action string, payload string) (string, error) {
	if o.bridge == nil {
		return "", fmt.Errorf("bridge unavailable")
	}
	return o.bridge.Invoke(context.Background(), strings.TrimSpace(action), strings.TrimSpace(payload))
}

func (o *Opener) openWithProcessFallback(ctx context.Context, target string) error {
	var cmd *exec.Cmd
	windowTitle := resolveWindowTitle(target)

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
			buildWindowsEdgeAppHostScript(edgePath, appTarget, windowTitle),
		)
		o.logger.Info("opening ui target with edge app mode fallback", "target", appTarget, "title", windowTitle)
	} else {
		cmd = exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-STA", "-Command", buildWindowsWebViewScript(target, windowTitle))
		o.logger.Info("opening ui target with winforms fallback", "target", target, "title", windowTitle)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open target %q: %w", target, err)
	}

	o.logger.Info("ui target opened with fallback", "target", target, "title", windowTitle)
	return nil
}

func resolveWindowTitle(target string) string {
	base := strings.ToLower(filepath.Base(target))
	if strings.Contains(base, "setup") {
		return "Trilink Agent Setup"
	}
	return "Trilink Support"
}

func resolveWindowSize(target string) (int, int) {
	base := strings.ToLower(filepath.Base(target))
	if strings.Contains(base, "setup") {
		return 480, 760
	}
	return 420, 760
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

func toWebViewTarget(target string) (string, error) {
	if strings.HasPrefix(target, "http://") || strings.HasPrefix(target, "https://") || strings.HasPrefix(target, "file://") {
		return target, nil
	}
	return toEdgeAppTarget(target)
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

func buildWindowsWebViewScript(target string, windowTitle string) string {
	escapedTarget := escapePowerShellSingleQuoted(target)
	escapedTitle := escapePowerShellSingleQuoted(windowTitle)

	return strings.Join([]string{
		"Add-Type -AssemblyName System.Windows.Forms",
		"Add-Type -AssemblyName System.Drawing",
		fmt.Sprintf("$target = '%s'", escapedTarget),
		"$form = New-Object System.Windows.Forms.Form",
		fmt.Sprintf("$form.Text = '%s'", escapedTitle),
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

func buildWindowsEdgeAppHostScript(edgePath, target, windowTitle string) string {
	escapedEdgePath := escapePowerShellSingleQuoted(edgePath)
	escapedTarget := escapePowerShellSingleQuoted(target)
	escapedTitle := escapePowerShellSingleQuoted(windowTitle)

	return strings.Join([]string{
		fmt.Sprintf("$edgePath = '%s'", escapedEdgePath),
		fmt.Sprintf("$target = '%s'", escapedTarget),
		fmt.Sprintf("$windowTitle = '%s'", escapedTitle),
		"$targetWidth = 420",
		"$targetHeight = 700",
		"$screen = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea",
		"$targetX = [Math]::Max(0, $screen.Right - $targetWidth - 18)",
		"$targetY = [Math]::Max(0, $screen.Bottom - $targetHeight - 18)",
		"$existing = Get-Process -Name 'msedge' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like ('*' + $windowTitle + '*') } | Select-Object -First 1",
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
		"$newWindow = Get-Process -Name 'msedge' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like ('*' + $windowTitle + '*') -and ($before -notcontains $_.Id) } | Sort-Object StartTime -Descending | Select-Object -First 1",
		"if (-not $newWindow) { $newWindow = Get-Process -Name 'msedge' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like ('*' + $windowTitle + '*') } | Sort-Object StartTime -Descending | Select-Object -First 1 }",
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
