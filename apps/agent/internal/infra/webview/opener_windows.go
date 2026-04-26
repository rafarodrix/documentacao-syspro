//go:build windows

package webview

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unsafe"

	webview2 "github.com/jchv/go-webview2"
	"golang.org/x/sys/windows"
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

var (
	user32ProcSetForegroundWindow = windows.NewLazySystemDLL("user32.dll").NewProc("SetForegroundWindow")
	user32ProcBringWindowToTop    = windows.NewLazySystemDLL("user32.dll").NewProc("BringWindowToTop")
	user32ProcShowWindow          = windows.NewLazySystemDLL("user32.dll").NewProc("ShowWindow")
	user32ProcSetWindowPos        = windows.NewLazySystemDLL("user32.dll").NewProc("SetWindowPos")
)

const (
	swRestore     = 9
	swpNoSize     = 0x0001
	swpNoMove     = 0x0002
	swpShowWindow = 0x0040
)

func NewOpener(logger Logger, stateDir string, bridge NativeBridge) *Opener {
	return &Opener{
		logger:   logger,
		stateDir: stateDir,
		bridge:   bridge,
	}
}

func (o *Opener) Open(ctx context.Context, target string) error {
	go func() {
		if err := o.openWithWebView2(ctx, target); err != nil {
			o.logger.Info("webview2 open failed", "target", target, "error", err)
		}
	}()
	return nil
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
		time.Sleep(180 * time.Millisecond)
		w.Dispatch(func() {
			promoteWindow(w.Window())
		})
	}()

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
		return 430, 640
	}
	return 400, 560
}

func toWebViewTarget(target string) (string, error) {
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

func promoteWindow(handle unsafe.Pointer) {
	if handle == nil {
		return
	}

	hwnd := uintptr(handle)
	topMost := ^uintptr(0)
	notTopMost := ^uintptr(1)

	_, _, _ = user32ProcShowWindow.Call(hwnd, uintptr(swRestore))
	_, _, _ = user32ProcSetWindowPos.Call(hwnd, topMost, 0, 0, 0, 0, uintptr(swpNoMove|swpNoSize|swpShowWindow))
	_, _, _ = user32ProcSetWindowPos.Call(hwnd, notTopMost, 0, 0, 0, 0, uintptr(swpNoMove|swpNoSize|swpShowWindow))
	_, _, _ = user32ProcBringWindowToTop.Call(hwnd)
	_, _, _ = user32ProcSetForegroundWindow.Call(hwnd)
}
