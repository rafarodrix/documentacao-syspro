package remote

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

var rustDeskIDPattern = regexp.MustCompile(`\d{6,12}`)
var rustDeskConfigEntryPattern = regexp.MustCompile(`^\s*([A-Za-z0-9._-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\r\n#]+))`)


type rustDeskDesiredConfig struct {
	Alias           string
	ServerHost      string
	APIHost         string
	PublicKey       string
	PublicKeyHash   string
	ServerConfig    string
	TargetVersion   string
	DefaultPassword string
}

type rustDeskUpgradeSpec struct {
	DownloadURL    string
	ChecksumSHA256 string
	PackageType    string
	SilentArgs     string
	TargetVersion  string
}

type rustDeskStatus struct {
	ExecutablePath string
	Installed      bool
	ServiceStatus  string
	RustDeskID     string
	Version        string
	AccessPassword string
}

type rustDeskController interface {
	inspect(ctx context.Context) (rustDeskStatus, error)
	ensureInstalled(ctx context.Context, upgrade *rustDeskUpgradeSpec) (string, bool, error)
	ensureServiceRunning(ctx context.Context, exePath string) (string, error)
	applyDesiredConfig(ctx context.Context, exePath string, desired rustDeskDesiredConfig) error
}

type rustDeskManager struct {
	logger          Logger
	stateDir        string
	installerURL    string
	installerSHA256 string
	installerArgs   string
	httpClient      *http.Client
}

func newRustDeskManager(logger Logger, stateDir, installerURL, installerSHA256, installerArgs string) *rustDeskManager {
	args := strings.TrimSpace(installerArgs)
	if args == "" {
		switch strings.ToLower(filepath.Ext(strings.TrimSpace(installerURL))) {
		case ".msi":
			args = "/qn /norestart"
		default:
			args = "/S"
		}
	}

	return &rustDeskManager{
		logger:          logger,
		stateDir:        stateDir,
		installerURL:    strings.TrimSpace(installerURL),
		installerSHA256: strings.TrimSpace(installerSHA256),
		installerArgs:   args,
		httpClient: &http.Client{
			Timeout: 5 * time.Minute,
		},
	}
}

func (m *rustDeskManager) inspect(ctx context.Context) (rustDeskStatus, error) {
	status := rustDeskStatus{
		ServiceStatus: "missing",
	}

	exePath, err := m.resolveExecutable()
	if err != nil {
		return status, err
	}
	if exePath == "" {
		return status, nil
	}

	status.ExecutablePath = exePath
	status.Installed = true
	status.ServiceStatus = m.getServiceStatus(ctx)
	status.RustDeskID = m.getID(ctx, exePath)
	status.Version = m.getVersion(ctx, exePath)
	status.AccessPassword = m.getAccessPassword()
	return status, nil
}

func (m *rustDeskManager) ensureInstalled(ctx context.Context, upgrade *rustDeskUpgradeSpec) (string, bool, error) {
	exePath, err := m.resolveExecutable()
	if err != nil {
		return "", false, err
	}
	if exePath != "" && (upgrade == nil || strings.TrimSpace(upgrade.DownloadURL) == "") {
		return exePath, false, nil
	}

	downloadURL := m.installerURL
	checksum := m.installerSHA256
	silentArgs := m.installerArgs
	if upgrade != nil && strings.TrimSpace(upgrade.DownloadURL) != "" {
		downloadURL = strings.TrimSpace(upgrade.DownloadURL)
		if strings.TrimSpace(upgrade.ChecksumSHA256) != "" {
			checksum = strings.TrimSpace(upgrade.ChecksumSHA256)
		}
		if strings.TrimSpace(upgrade.SilentArgs) != "" {
			silentArgs = strings.TrimSpace(upgrade.SilentArgs)
		} else if strings.ToLower(filepath.Ext(downloadURL)) == ".msi" {
			silentArgs = "/qn /norestart"
		}
	}

	if downloadURL == "" {
		if exePath != "" {
			return exePath, false, nil
		}
		return "", false, fmt.Errorf("rustdesk is not installed and no installer url is configured")
	}

	installerPath, err := m.downloadInstaller(ctx, downloadURL, checksum)
	if err != nil {
		return "", false, err
	}

	if err := m.runInstaller(ctx, installerPath, silentArgs); err != nil {
		return "", false, err
	}

	exePath, err = m.resolveExecutable()
	if err != nil {
		return "", false, err
	}
	if exePath == "" {
		return "", false, fmt.Errorf("rustdesk installation completed but executable was not found")
	}

	return exePath, true, nil
}

func (m *rustDeskManager) ensureServiceRunning(ctx context.Context, exePath string) (string, error) {
	if runtime.GOOS != "windows" {
		return "unsupported", nil
	}

	status := m.getServiceStatus(ctx)
	if status == "running" {
		return status, nil
	}

	if status == "missing" {
		if err := m.runRustDeskCommand(ctx, exePath, "--install-service"); err != nil {
			return status, fmt.Errorf("install rustdesk service: %w", err)
		}
	}

	if err := m.runPowerShell(ctx, "Start-Service -Name 'RustDesk' -ErrorAction Stop"); err != nil {
		return status, fmt.Errorf("start rustdesk service: %w", err)
	}

	// Poll until the service reports "running" or the deadline expires.
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		current := m.getServiceStatus(ctx)
		if current == "running" {
			return current, nil
		}
		select {
		case <-ctx.Done():
			return current, nil
		case <-time.After(500 * time.Millisecond):
		}
	}
	return m.getServiceStatus(ctx), nil
}

func (m *rustDeskManager) applyDesiredConfig(ctx context.Context, exePath string, desired rustDeskDesiredConfig) error {
	if strings.TrimSpace(desired.ServerConfig) != "" {
		if err := m.runRustDeskCommand(ctx, exePath, "--config", desired.ServerConfig); err != nil {
			return fmt.Errorf("apply rustdesk config: %w", err)
		}
	}
	if strings.TrimSpace(desired.DefaultPassword) != "" {
		if err := m.runRustDeskCommand(ctx, exePath, "--password", desired.DefaultPassword); err != nil {
			return fmt.Errorf("apply rustdesk password: %w", err)
		}
	}
	return nil
}

func (m *rustDeskManager) getID(ctx context.Context, exePath string) string {
	// Fast path: read config file directly — works in Session 0 (SYSTEM) where
	// rustdesk.exe --get-id returns empty because RustDesk CLI IPC only works
	// in interactive sessions.
	if id := m.getIDFromConfig(); id != "" {
		return id
	}

	const maxAttempts = 8
	waitSeconds := 2
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		output, err := m.runPowerShellOutput(ctx, fmt.Sprintf("& '%s' --get-id 2>&1 | Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] } | Out-String", escapePowerShellSingleQuoted(exePath)))
		if err == nil {
			if id := normalizeRustDeskID(output); id != "" {
				return id
			}
		} else {
			m.logger.Warn("rustdesk id capture failed", "attempt", attempt, "max", maxAttempts, "error", err)
		}

		// Config file appears once the service registers with the relay server.
		if id := m.getIDFromConfig(); id != "" {
			m.logger.Info("rustdesk id resolved from config", "attempt", attempt, "id", id)
			return id
		}

		if attempt == maxAttempts {
			break
		}

		m.logger.Warn("rustdesk id unavailable, retrying", "attempt", attempt, "max", maxAttempts, "wait_seconds", waitSeconds)
		select {
		case <-ctx.Done():
			return ""
		case <-time.After(time.Duration(waitSeconds) * time.Second):
		}
		if waitSeconds < 16 {
			waitSeconds *= 2
		}
	}

	return ""
}

func (m *rustDeskManager) getIDFromConfig() string {
	for _, path := range rustDeskConfigPaths() {
		if id := readRustDeskIDFromConfig(path); id != "" {
			return id
		}
	}
	return ""
}


func (m *rustDeskManager) getVersion(ctx context.Context, exePath string) string {
	output, err := m.runPowerShellOutput(ctx, fmt.Sprintf("(Get-Item '%s').VersionInfo.ProductVersion | Out-String", escapePowerShellSingleQuoted(exePath)))
	if err != nil {
		m.logger.Warn("rustdesk version capture failed", "error", err)
		return ""
	}
	return strings.TrimSpace(output)
}

func (m *rustDeskManager) getAccessPassword() string {
	defaultPassword := strings.TrimSpace(readPersistedDefaultPassword(filepath.Join(m.stateDir, stateFile)))
	for _, path := range rustDeskConfigPaths() {
		if password := readRustDeskPasswordFromConfig(path, defaultPassword); password != "" {
			return password
		}
	}
	return ""
}

func (m *rustDeskManager) resolveExecutable() (string, error) {
	candidates := []string{
		filepath.Join(os.Getenv("ProgramFiles"), "RustDesk", "rustdesk.exe"),
		filepath.Join(os.Getenv("ProgramFiles(x86)"), "RustDesk", "rustdesk.exe"),
		`C:\Program Files\RustDesk\rustdesk.exe`,
		`C:\Program Files (x86)\RustDesk\rustdesk.exe`,
	}

	for _, candidate := range candidates {
		if strings.TrimSpace(candidate) == "" {
			continue
		}
		if _, err := os.Stat(candidate); err == nil {
			return candidate, nil
		}
	}

	return "", nil
}

func (m *rustDeskManager) getServiceStatus(ctx context.Context) string {
	if runtime.GOOS != "windows" {
		return "unsupported"
	}

	output, err := m.runPowerShellOutput(ctx, "$svc = Get-Service -Name 'RustDesk' -ErrorAction SilentlyContinue; if ($null -eq $svc) { 'missing' } else { $svc.Status.ToString().ToLowerInvariant() }")
	if err != nil {
		m.logger.Warn("rustdesk service status lookup failed", "error", err)
		return "unknown"
	}
	status := strings.TrimSpace(strings.ToLower(output))
	if status == "" {
		return "unknown"
	}
	return status
}

func (m *rustDeskManager) downloadInstaller(ctx context.Context, rawURL, checksum string) (string, error) {
	if localPath, ok := m.resolveLocalInstallerPath(rawURL); ok {
		return m.prepareLocalInstaller(localPath, checksum)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", fmt.Errorf("build installer request: %w", err)
	}
	req.Header.Set("User-Agent", "trilink-agent")

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("download installer: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("download installer: unexpected status %d", resp.StatusCode)
	}

	downloadsDir := filepath.Join(m.stateDir, "downloads")
	if err := os.MkdirAll(downloadsDir, 0o755); err != nil {
		return "", fmt.Errorf("create downloads dir: %w", err)
	}

	fileName := installerFileName(rawURL)
	if fileName == "" {
		fileName = "rustdesk-installer.exe"
	}
	installerPath := filepath.Join(downloadsDir, fileName)

	file, err := os.Create(installerPath)
	if err != nil {
		return "", fmt.Errorf("create installer file: %w", err)
	}
	defer file.Close()

	hash := sha256.New()
	writer := io.MultiWriter(file, hash)
	if _, err := io.Copy(writer, resp.Body); err != nil {
		return "", fmt.Errorf("write installer file: %w", err)
	}

	if expected := strings.TrimSpace(strings.ToLower(checksum)); expected != "" {
		actual := hex.EncodeToString(hash.Sum(nil))
		if actual != expected {
			return "", fmt.Errorf("installer checksum mismatch: expected %s got %s", expected, actual)
		}
	}

	return installerPath, nil
}

func (m *rustDeskManager) resolveLocalInstallerPath(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", false
	}

	if strings.HasPrefix(strings.ToLower(trimmed), "file://") {
		parsed, err := url.Parse(trimmed)
		if err != nil {
			return "", false
		}
		if parsed.Scheme != "file" {
			return "", false
		}
		localPath := parsed.Path
		if runtime.GOOS == "windows" {
			localPath = strings.TrimPrefix(localPath, "/")
			localPath = strings.ReplaceAll(localPath, "/", `\`)
		}
		return localPath, true
	}

	if strings.HasPrefix(strings.ToLower(trimmed), "http://") || strings.HasPrefix(strings.ToLower(trimmed), "https://") {
		return "", false
	}

	return trimmed, true
}

func (m *rustDeskManager) prepareLocalInstaller(localPath, checksum string) (string, error) {
	resolvedPath := filepath.Clean(strings.TrimSpace(localPath))
	if resolvedPath == "" {
		return "", fmt.Errorf("local installer path is empty")
	}

	info, err := os.Stat(resolvedPath)
	if err != nil {
		return "", fmt.Errorf("stat local installer: %w", err)
	}
	if info.IsDir() {
		return "", fmt.Errorf("local installer path points to a directory")
	}

	if err := verifyInstallerChecksum(resolvedPath, checksum); err != nil {
		return "", err
	}

	downloadsDir := filepath.Join(m.stateDir, "downloads")
	if err := os.MkdirAll(downloadsDir, 0o755); err != nil {
		return "", fmt.Errorf("create downloads dir: %w", err)
	}

	targetPath := filepath.Join(downloadsDir, filepath.Base(resolvedPath))
	if sameFile(targetPath, resolvedPath) {
		return resolvedPath, nil
	}

	if err := copyFile(resolvedPath, targetPath, info.Mode()); err != nil {
		return "", err
	}

	return targetPath, nil
}

func verifyInstallerChecksum(path, checksum string) error {
	expected := strings.TrimSpace(strings.ToLower(checksum))
	if expected == "" {
		return nil
	}

	file, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open installer for checksum: %w", err)
	}
	defer file.Close()

	hash := sha256.New()
	if _, err := io.Copy(hash, file); err != nil {
		return fmt.Errorf("read installer for checksum: %w", err)
	}

	actual := hex.EncodeToString(hash.Sum(nil))
	if actual != expected {
		return fmt.Errorf("installer checksum mismatch: expected %s got %s", expected, actual)
	}

	return nil
}

func copyFile(src, dst string, mode fs.FileMode) error {
	source, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open local installer: %w", err)
	}
	defer source.Close()

	target, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("create local installer copy: %w", err)
	}
	defer target.Close()

	if _, err := io.Copy(target, source); err != nil {
		return fmt.Errorf("copy local installer: %w", err)
	}

	if err := os.Chmod(dst, mode); err != nil {
		return fmt.Errorf("chmod local installer copy: %w", err)
	}

	return nil
}

func sameFile(a, b string) bool {
	return strings.EqualFold(filepath.Clean(a), filepath.Clean(b))
}

func (m *rustDeskManager) runInstaller(ctx context.Context, installerPath, silentArgs string) error {
	args := splitWindowsArgs(silentArgs)
	ext := strings.ToLower(filepath.Ext(installerPath))
	switch ext {
	case ".msi":
		if elevated, err := m.isRunningElevated(ctx); err != nil {
			return fmt.Errorf("run msi installer: nao foi possivel verificar privilegios de administrador: %w", err)
		} else if !elevated {
			return fmt.Errorf("run msi installer: agente nao esta rodando com privilegios de administrador; configure o servico do agente para rodar como SYSTEM ou Administrador")
		}

		_ = m.runPowerShell(ctx, "Stop-Service -Name 'RustDesk' -Force -ErrorAction SilentlyContinue")
		time.Sleep(2 * time.Second)

		if pending, _ := m.isRebootPending(ctx); pending {
			m.logger.Warn("system has a pending reboot; msi installation may fail — consider rebooting first")
		}

		logPath, logErr := m.prepareInstallerLogPath("rustdesk-msi-install")
		if logErr != nil {
			m.logger.Warn("rustdesk installer log path prepare failed", "error", logErr)
		}
		msiArgs := buildRustDeskMSIInstallArgs(installerPath, logPath)
		if logPath != "" {
			m.logger.Info("rustdesk msi install configured", "launch_tray", false, "log_path", logPath)
		}
		output, err := m.runMSIInstaller(ctx, msiArgs)
		if err != nil {
			return classifyInstallerError("run msi installer", err, output, logPath)
		}
		time.Sleep(3 * time.Second)
		_ = m.runPowerShell(ctx, "Start-Service -Name 'RustDesk' -ErrorAction SilentlyContinue")
		if logPath != "" {
			m.logger.Info("rustdesk msi installer completed", "log_path", logPath)
		}
	default:
		cmd := exec.CommandContext(ctx, installerPath, args...)
		output, err := cmd.CombinedOutput()
		if err != nil {
			return classifyInstallerError("run installer", err, output, "")
		}
	}
	return nil
}

func classifyInstallerError(prefix string, err error, output []byte, logPath string) error {
	message := strings.TrimSpace(string(output))

	// msiexec /qn does not write errors to stdout; check the log file for known failure codes.
	if logPath != "" {
		if logContent, readErr := os.ReadFile(logPath); readErr == nil {
			logText := string(logContent)
			if strings.Contains(logText, "Error 1925") || strings.Contains(logText, "sufficient privileges") {
				return fmt.Errorf("%s: privilegios de administrador necessarios — configure o servico do agente como SYSTEM ou Administrador (installer log: %s)", prefix, logPath)
			}
			if strings.Contains(logText, "MsiSystemRebootPending") {
				return fmt.Errorf("%s: instalacao bloqueada por reinicializacao pendente do sistema — reinicie a maquina e tente novamente (installer log: %s)", prefix, logPath)
			}
		}
	}

	if strings.Contains(strings.ToLower(message), "error 1925") || strings.Contains(strings.ToLower(message), "sufficient privileges") {
		if logPath != "" {
			return fmt.Errorf("%s: privilegios de administrador necessarios (installer log: %s)", prefix, logPath)
		}
		return fmt.Errorf("%s: privilegios de administrador necessarios", prefix)
	}
	if logPath != "" {
		return fmt.Errorf("%s: %w: %s (installer log: %s)", prefix, err, message, logPath)
	}
	return fmt.Errorf("%s: %w: %s", prefix, err, message)
}

func (m *rustDeskManager) prepareInstallerLogPath(prefix string) (string, error) {
	logsDir := filepath.Join(m.stateDir, "logs")
	if err := os.MkdirAll(logsDir, 0o755); err != nil {
		return "", fmt.Errorf("create logs dir: %w", err)
	}

	filename := fmt.Sprintf("%s-%s.log", prefix, time.Now().UTC().Format("20060102-150405"))
	return filepath.Join(logsDir, filename), nil
}

func (m *rustDeskManager) runRustDeskCommand(ctx context.Context, exePath string, args ...string) error {
	command := fmt.Sprintf("& '%s' %s | Out-String", escapePowerShellSingleQuoted(exePath), joinPowerShellArgs(args))
	_, err := m.runPowerShellOutput(ctx, command)
	return err
}

func (m *rustDeskManager) runMSIInstaller(ctx context.Context, args []string) ([]byte, error) {
	script := fmt.Sprintf(
		"$p = Start-Process -FilePath 'msiexec.exe' -ArgumentList @(%s) -WindowStyle Hidden -Wait -PassThru; exit $p.ExitCode",
		joinPowerShellStringArray(args),
	)

	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return output, err
	}
	return output, nil
}

func (m *rustDeskManager) runPowerShell(ctx context.Context, script string) error {
	_, err := m.runPowerShellOutput(ctx, script)
	return err
}

func (m *rustDeskManager) runPowerShellOutput(ctx context.Context, script string) (string, error) {
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("%w: %s", err, strings.TrimSpace(string(output)))
	}
	return string(output), nil
}

func normalizeRustDeskID(value string) string {
	match := rustDeskIDPattern.FindString(value)
	return strings.TrimSpace(match)
}

func installerFileName(rawURL string) string {
	parts := strings.Split(rawURL, "/")
	if len(parts) == 0 {
		return ""
	}
	name := strings.TrimSpace(parts[len(parts)-1])
	if idx := strings.Index(name, "?"); idx >= 0 {
		name = name[:idx]
	}
	return name
}

func rustDeskConfigPaths() []string {
	paths := []string{}
	if appData := strings.TrimSpace(os.Getenv("APPDATA")); appData != "" {
		paths = append(paths, filepath.Join(appData, "RustDesk", "config", "RustDesk2.toml"))
		paths = append(paths, filepath.Join(appData, "RustDesk", "config", "RustDesk.toml"))
	}
	paths = append(paths,
		`C:\Windows\system32\config\systemprofile\AppData\Roaming\RustDesk\config\RustDesk2.toml`,
		`C:\Windows\system32\config\systemprofile\AppData\Roaming\RustDesk\config\RustDesk.toml`,
		`C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk2.toml`,
		`C:\Windows\ServiceProfiles\LocalService\AppData\Roaming\RustDesk\config\RustDesk.toml`,
	)
	return paths
}

func readRustDeskIDFromConfig(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}

	for _, line := range strings.Split(string(data), "\n") {
		match := rustDeskConfigEntryPattern.FindStringSubmatch(line)
		if len(match) == 0 {
			continue
		}

		key := strings.ToLower(strings.TrimSpace(match[1]))
		if !isRustDeskIDKey(key) {
			continue
		}

		value := strings.TrimSpace(firstNonEmpty(match[2], match[3], match[4]))
		value = strings.Trim(value, `"`)
		if id := normalizeRustDeskID(value); id != "" {
			return id
		}
	}

	return ""
}

func buildRustDeskMSIInstallArgs(installerPath, logPath string) []string {
	args := []string{
		"/i", installerPath,
		"REBOOT=ReallySuppress",
		"LAUNCH_TRAY_APP=0",
		"STARTUPSHORTCUTS=0",
		"DESKTOPSHORTCUTS=0",
		"STARTMENUSHORTCUTS=0",
		"/qn",
		"/norestart",
	}
	if strings.TrimSpace(logPath) != "" {
		args = append(args, "/l*v", logPath)
	}
	return args
}

func readPersistedDefaultPassword(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	match := regexp.MustCompile(`"default_password"\s*:\s*"([^"]*)"`).FindSubmatch(data)
	if len(match) != 2 {
		return ""
	}
	return strings.TrimSpace(string(match[1]))
}

func readRustDeskPasswordFromConfig(path, defaultPassword string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}

	bestPriority := 0
	bestValue := ""
	for _, line := range strings.Split(string(data), "\n") {
		match := rustDeskConfigEntryPattern.FindStringSubmatch(line)
		if len(match) == 0 {
			continue
		}

		key := strings.ToLower(strings.TrimSpace(match[1]))
		value := strings.TrimSpace(firstNonEmpty(match[2], match[3], match[4]))
		value = strings.Trim(value, `"`)
		priority := rustDeskPasswordPriority(key, value, defaultPassword)
		if priority <= bestPriority {
			continue
		}

		bestPriority = priority
		bestValue = value
	}

	return bestValue
}

func rustDeskPasswordPriority(key, value, defaultPassword string) int {
	key = strings.ToLower(strings.TrimSpace(key))
	value = strings.TrimSpace(value)
	defaultPassword = strings.TrimSpace(defaultPassword)
	if key == "" || value == "" || !strings.Contains(key, "password") {
		return 0
	}
	if !looksLikeRustDeskAccessPassword(value) {
		return 0
	}

	switch {
	case strings.Contains(key, "temporary") || strings.Contains(key, "one-time") || strings.Contains(key, "one_time"):
		return 300
	case strings.Contains(key, "permanent") || strings.Contains(key, "default") || strings.Contains(key, "preset"):
		if defaultPassword != "" && strings.EqualFold(value, defaultPassword) {
			return 0
		}
		return 40
	default:
		if defaultPassword != "" && strings.EqualFold(value, defaultPassword) {
			return 0
		}
		return 120
	}
}

func isRustDeskIDKey(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "id", "rustdesk-id", "rustdesk_id":
		return true
	default:
		return false
	}
}

func looksLikeRustDeskAccessPassword(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return false
	}
	if strings.ContainsAny(value, "/+=") {
		return false
	}
	if strings.ContainsAny(value, " \t\r\n") {
		return false
	}
	if len(value) < 4 || len(value) > 16 {
		return false
	}
	return true
}

func splitWindowsArgs(raw string) []string {
	if strings.TrimSpace(raw) == "" {
		return nil
	}
	return strings.Fields(raw)
}

func joinPowerShellArgs(args []string) string {
	escaped := make([]string, 0, len(args))
	for _, arg := range args {
		escaped = append(escaped, fmt.Sprintf("'%s'", escapePowerShellSingleQuoted(arg)))
	}
	return strings.Join(escaped, " ")
}

func joinPowerShellStringArray(args []string) string {
	escaped := make([]string, 0, len(args))
	for _, arg := range args {
		escaped = append(escaped, fmt.Sprintf("'%s'", escapePowerShellSingleQuoted(arg)))
	}
	return strings.Join(escaped, ", ")
}

func escapePowerShellSingleQuoted(value string) string {
	return strings.ReplaceAll(value, "'", "''")
}

func (m *rustDeskManager) isRunningElevated(ctx context.Context) (bool, error) {
	if runtime.GOOS != "windows" {
		return true, nil
	}
	out, err := m.runPowerShellOutput(ctx, "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)")
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(strings.ToLower(out)) == "true", nil
}

func (m *rustDeskManager) isRebootPending(ctx context.Context) (bool, error) {
	if runtime.GOOS != "windows" {
		return false, nil
	}
	out, err := m.runPowerShellOutput(ctx, `
		$pending = $false
		if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending') { $pending = $true }
		if ((Get-ItemProperty 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name PendingFileRenameOperations -ErrorAction SilentlyContinue) -ne $null) { $pending = $true }
		$pending
	`)
	if err != nil {
		return false, err
	}
	return strings.TrimSpace(strings.ToLower(out)) == "true", nil
}
