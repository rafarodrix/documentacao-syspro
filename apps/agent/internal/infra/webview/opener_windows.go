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
	"sync"
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

// windowTracker prevents duplicate WebView2 windows for the same target.
// acquireOrPromote is the single lock operation: if the key is already tracked
// it brings the existing window to the front and returns false (caller must NOT
// open a new window); if the key is free it reserves it and returns true.
type windowTracker struct {
	mu      sync.Mutex
	handles map[string]unsafe.Pointer // key → HWND (nil while window is initialising)
}

var openWindows = &windowTracker{handles: make(map[string]unsafe.Pointer)}

func (t *windowTracker) acquireOrPromote(key string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	if handle, exists := t.handles[key]; exists {
		if handle != nil {
			go promoteWindow(handle)
		}
		return false
	}
	t.handles[key] = nil
	return true
}

func (t *windowTracker) setHandle(key string, handle unsafe.Pointer) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if _, exists := t.handles[key]; exists {
		t.handles[key] = handle
	}
}

func (t *windowTracker) release(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.handles, key)
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

func windowKey(target string) string {
	return strings.ToLower(filepath.Base(target))
}

func (o *Opener) Open(ctx context.Context, target string) error {
	key := windowKey(target)
	if !openWindows.acquireOrPromote(key) {
		o.logger.Info("webview2 window already open, brought to front", "target", target)
		return nil
	}
	go func() {
		defer openWindows.release(key)
		if err := o.openWithWebView2(ctx, target, key); err != nil {
			o.logger.Info("webview2 open failed", "target", target, "error", err)
		}
	}()
	return nil
}

func (o *Opener) openWithWebView2(ctx context.Context, target string, key string) error {
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

	openWindows.setHandle(key, w.Window())

	if err := w.Bind("agent_native_invoke", func(action string, payload string) (string, error) {
		if o.bridge == nil {
			return "", fmt.Errorf("bridge unavailable")
		}
		return o.bridge.Invoke(ctx, strings.TrimSpace(action), strings.TrimSpace(payload))
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
