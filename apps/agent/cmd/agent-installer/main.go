package main

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	command := "stage"
	if len(os.Args) > 1 {
		command = strings.TrimSpace(strings.ToLower(os.Args[1]))
	}

	agentRoot, err := findAgentRoot()
	if err != nil {
		return err
	}

	builder := newInstallerBuilder(agentRoot)

	switch command {
	case "", "stage":
		return builder.stage()
	case "build":
		version := ""
		if len(os.Args) > 2 {
			version = strings.TrimSpace(os.Args[2])
		}
		if version == "" {
			var err error
			version, err = builder.resolveVersion()
			if err != nil {
				return err
			}
		}
		return builder.build(version)
	default:
		return fmt.Errorf("unknown command %q (use stage or build)", command)
	}
}

type installerBuilder struct {
	agentRoot           string
	installerRoot       string
	sourceDeployDir     string
	sourceServiceBuilds []string
	sourceUIBuilds      []string
	sourceUpdaterBuilds []string
	stageRoot           string
	outputRoot          string
	runtimeRoot         string
	sourceEnv           string
	sourceEnvEx         string
	issFile             string
}

func newInstallerBuilder(agentRoot string) installerBuilder {
	installerRoot := filepath.Join(agentRoot, "deploy", "windows-installer")
	return installerBuilder{
		agentRoot:       agentRoot,
		installerRoot:   installerRoot,
		sourceDeployDir: filepath.Join(agentRoot, "dist", "test-deploy", "windows-amd64"),
		sourceServiceBuilds: []string{
			filepath.Join(agentRoot, "build", "bin", "agent-service.exe"),
			filepath.Join(agentRoot, "dist", "test-deploy", "windows-amd64", "agent-service.exe"),
		},
		sourceUIBuilds: []string{
			filepath.Join(agentRoot, "build", "bin", "agent-ui.exe"),
			filepath.Join(agentRoot, "build", "bin", "agent-ui"),
			filepath.Join(agentRoot, "dist", "test-deploy", "windows-amd64", "agent-ui.exe"),
		},
		sourceUpdaterBuilds: []string{
			filepath.Join(agentRoot, "build", "bin", "agent-updater.exe"),
			filepath.Join(agentRoot, "dist", "test-deploy", "windows-amd64", "agent-updater.exe"),
		},
		stageRoot:   filepath.Join(agentRoot, "dist", "windows-installer", "staging"),
		outputRoot:  filepath.Join(agentRoot, "dist", "windows-installer", "output"),
		runtimeRoot: filepath.Join(installerRoot, "runtime"),
		sourceEnv:   filepath.Join(agentRoot, ".env"),
		sourceEnvEx: filepath.Join(agentRoot, ".env.example"),
		issFile:     filepath.Join(installerRoot, "AgenteTrilink.iss"),
	}
}

func (b installerBuilder) stage() error {
	serviceBinary, err := b.resolveServiceBinary()
	if err != nil {
		return err
	}
	uiBinary, err := b.resolveUIBinary()
	if err != nil {
		return err
	}
	updaterBinary, err := b.resolveUpdaterBinary()
	if err != nil {
		return err
	}

	if err := emptyOrCreateDir(b.stageRoot); err != nil {
		return fmt.Errorf("prepare stage root: %w", err)
	}
	for _, dir := range []string{
		b.outputRoot,
		filepath.Join(b.stageRoot, "assets", "img"),
		filepath.Join(b.stageRoot, "scripts"),
		filepath.Join(b.stageRoot, "config"),
		filepath.Join(b.stageRoot, "rustdesk"),
	} {
		if err := mkdirAllRetry(dir); err != nil {
			return fmt.Errorf("prepare directory %s: %w", dir, err)
		}
	}

	copyPairs := [][2]string{
		{serviceBinary, filepath.Join(b.stageRoot, "agent-service.exe")},
		{uiBinary, filepath.Join(b.stageRoot, "agent-ui.exe")},
		{updaterBinary, filepath.Join(b.stageRoot, "agent-updater.exe")},
		{filepath.Join(b.agentRoot, "assets", "icon.ico"), filepath.Join(b.stageRoot, "icon.ico")},
		{filepath.Join(b.agentRoot, "assets", "img", "logo-clara.png"), filepath.Join(b.stageRoot, "assets", "img", "logo-clara.png")},
		{filepath.Join(b.agentRoot, "assets", "img", "logo-escura.png"), filepath.Join(b.stageRoot, "assets", "img", "logo-escura.png")},
		{filepath.Join(b.runtimeRoot, "stop-agent.cmd"), filepath.Join(b.stageRoot, "scripts", "stop-agent.cmd")},
		{filepath.Join(b.runtimeRoot, "open-config.cmd"), filepath.Join(b.stageRoot, "scripts", "open-config.cmd")},
		{filepath.Join(b.runtimeRoot, "open-logs.cmd"), filepath.Join(b.stageRoot, "scripts", "open-logs.cmd")},
		{filepath.Join(b.runtimeRoot, "configure-agent-helper.cmd"), filepath.Join(b.stageRoot, "scripts", "configure-agent-helper.cmd")},
		{filepath.Join(b.agentRoot, "scripts", "configure_agent_helper.ps1"), filepath.Join(b.stageRoot, "scripts", "configure_agent_helper.ps1")},
		{filepath.Join(b.agentRoot, "scripts", "remove_legacy_bootstrap_residue.ps1"), filepath.Join(b.stageRoot, "scripts", "remove_legacy_bootstrap_residue.ps1")},
	}

	for _, pair := range copyPairs {
		if err := copyFile(pair[0], pair[1]); err != nil {
			return err
		}
	}

	if err := b.copyEnvSeed(); err != nil {
		return err
	}
	if err := b.copyBundledRustDesk(); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(b.stageRoot, "README-installer.txt"), []byte(buildInstallerReadme()), 0o644); err != nil {
		return fmt.Errorf("write installer readme: %w", err)
	}

	fmt.Printf("Pacote de instalador montado em: %s\n", b.stageRoot)
	fmt.Printf("Saida do instalador: %s\n", b.outputRoot)
	return nil
}

func (b installerBuilder) build(version string) error {
	if version == "" {
		return errors.New("version is required")
	}
	if err := b.stage(); err != nil {
		return err
	}
	iscc, err := locateISCC()
	if err != nil {
		return err
	}

	fmt.Printf("Compilando instalador com: %s\n", iscc)
	cmd := exec.Command(iscc, "/DMyAppVersion="+version, b.issFile)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("compile installer: %w", err)
	}

	fmt.Printf("\nInstalador gerado em: %s\n", filepath.Join(b.outputRoot, "agente-trilink-setup-"+version+".exe"))
	return nil
}

func (b installerBuilder) resolveVersion() (string, error) {
	var tagVersion *semVersion
	if resolved, ok := resolveGitTagVersion(b.installerRoot); ok {
		tagVersion = &resolved
	}
	var outputVersion *semVersion
	if resolved, ok, err := resolveLatestInstallerOutputVersion(b.outputRoot); err != nil {
		return "", err
	} else if ok {
		outputVersion = &resolved
	}

	return selectAutoVersion(tagVersion, outputVersion), nil
}

func (b installerBuilder) resolveUIBinary() (string, error) {
	return resolveBinary(
		b.sourceUIBuilds,
		"agent-ui",
		"gere a UI com Wails antes de montar o instalador (ex.: wails build -clean -platform windows/amd64 -nopackage -o agent-ui.exe)",
	)
}

func (b installerBuilder) resolveServiceBinary() (string, error) {
	return resolveBinary(
		b.sourceServiceBuilds,
		"agent-service",
		"gere o servico antes de montar o instalador (ex.: go build -o .\\build\\bin\\agent-service.exe .\\cmd\\agent-service)",
	)
}

func (b installerBuilder) resolveUpdaterBinary() (string, error) {
	return resolveBinary(
		b.sourceUpdaterBuilds,
		"agent-updater",
		"gere o updater antes de montar o instalador (ex.: go build -o .\\build\\bin\\agent-updater.exe .\\cmd\\agent-updater)",
	)
}

func resolveBinary(candidates []string, artifactName, buildHint string) (string, error) {
	for _, candidate := range candidates {
		if fileExists(candidate) {
			return candidate, nil
		}
	}

	return "", fmt.Errorf(
		"%s build nao encontrado. %s",
		strings.TrimSpace(artifactName),
		strings.TrimSpace(buildHint),
	)
}

func (b installerBuilder) copyEnvSeed() error {
	targetExample := filepath.Join(b.stageRoot, "config", ".env.example")
	switch {
	case fileExists(b.sourceEnvEx):
		if err := copyFile(b.sourceEnvEx, targetExample); err != nil {
			return err
		}
	case fileExists(b.sourceEnv):
		if err := copyFile(b.sourceEnv, targetExample); err != nil {
			return err
		}
	default:
		content := "# Trilink Agent environment seed\n# Preencha este arquivo antes de iniciar o agente fora do fluxo bootstrap.\n"
		if err := os.WriteFile(targetExample, []byte(content), 0o644); err != nil {
			return fmt.Errorf("write env example: %w", err)
		}
	}

	if fileExists(b.sourceEnv) {
		if err := copyFile(b.sourceEnv, filepath.Join(b.stageRoot, "config", ".env")); err != nil {
			return err
		}
	}
	return nil
}

func (b installerBuilder) copyBundledRustDesk() error {
	entries, err := os.ReadDir(b.sourceDeployDir)
	if err != nil {
		return fmt.Errorf("read deploy dir: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		lower := strings.ToLower(name)
		if !strings.HasPrefix(lower, "rustdesk") || (!strings.HasSuffix(lower, ".msi") && !strings.HasSuffix(lower, ".exe")) {
			continue
		}
		src := filepath.Join(b.sourceDeployDir, name)
		dst := filepath.Join(b.stageRoot, "rustdesk", name)
		if err := copyFile(src, dst); err != nil {
			return err
		}
	}
	return nil
}

func findAgentRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("get working directory: %w", err)
	}

	for {
		goMod := filepath.Join(dir, "go.mod")
		if data, readErr := os.ReadFile(goMod); readErr == nil && strings.Contains(string(data), "module trilink/agent") {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	return "", errors.New("could not locate trilink/agent root from current directory")
}

func locateISCC() (string, error) {
	candidates := []string{
		`C:\Program Files (x86)\Inno Setup 7\ISCC.exe`,
		`C:\Program Files\Inno Setup 7\ISCC.exe`,
		`C:\Program Files (x86)\Inno Setup 6\ISCC.exe`,
		`C:\Program Files\Inno Setup 6\ISCC.exe`,
		`C:\Program Files (x86)\Inno Setup 5\ISCC.exe`,
		`C:\Program Files\Inno Setup 5\ISCC.exe`,
	}

	for _, candidate := range candidates {
		if fileExists(candidate) {
			return candidate, nil
		}
	}
	return "", errors.New("ISCC.exe nao encontrado. Instale o Inno Setup e rode novamente")
}

type semVersion struct {
	major int
	minor int
	patch int
}

func (v semVersion) Less(other semVersion) bool {
	if v.major != other.major {
		return v.major < other.major
	}
	if v.minor != other.minor {
		return v.minor < other.minor
	}
	return v.patch < other.patch
}

func (v semVersion) NextPatch() semVersion {
	return semVersion{
		major: v.major,
		minor: v.minor,
		patch: v.patch + 1,
	}
}

func (v semVersion) String() string {
	return fmt.Sprintf("%d.%d.%d", v.major, v.minor, v.patch)
}

func selectAutoVersion(tagVersion, outputVersion *semVersion) string {
	switch {
	case tagVersion == nil && outputVersion == nil:
		return "1.0.0"
	case tagVersion == nil:
		return outputVersion.NextPatch().String()
	case outputVersion == nil:
		return tagVersion.NextPatch().String()
	case outputVersion.Less(*tagVersion):
		return tagVersion.NextPatch().String()
	default:
		return outputVersion.NextPatch().String()
	}
}

func resolveGitTagVersion(installerRoot string) (semVersion, bool) {
	cmd := exec.Command("git", "-C", installerRoot, "describe", "--tags", "--match", "v*", "--abbrev=0")
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = io.Discard
	if err := cmd.Run(); err != nil {
		return semVersion{}, false
	}

	version, ok := parseSemVersion(strings.TrimSpace(stdout.String()))
	return version, ok
}

func resolveLatestInstallerOutputVersion(outputRoot string) (semVersion, bool, error) {
	entries, err := os.ReadDir(outputRoot)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return semVersion{}, false, nil
		}
		return semVersion{}, false, fmt.Errorf("read installer output dir: %w", err)
	}

	latest := semVersion{}
	found := false
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		version, ok := parseInstallerFileVersion(entry.Name())
		if !ok {
			continue
		}
		if !found || latest.Less(version) {
			latest = version
			found = true
		}
	}

	return latest, found, nil
}

func parseInstallerFileVersion(name string) (semVersion, bool) {
	matches := regexp.MustCompile(`^agente-trilink-setup-(\d+\.\d+\.\d+)\.exe$`).FindStringSubmatch(strings.ToLower(strings.TrimSpace(name)))
	if len(matches) != 2 {
		return semVersion{}, false
	}
	return parseSemVersion(matches[1])
}

func parseSemVersion(raw string) (semVersion, bool) {
	matches := regexp.MustCompile(`^v?(\d+)\.(\d+)\.(\d+)$`).FindStringSubmatch(strings.TrimSpace(raw))
	if len(matches) != 4 {
		return semVersion{}, false
	}

	major, err := strconv.Atoi(matches[1])
	if err != nil {
		return semVersion{}, false
	}
	minor, err := strconv.Atoi(matches[2])
	if err != nil {
		return semVersion{}, false
	}
	patch, err := strconv.Atoi(matches[3])
	if err != nil {
		return semVersion{}, false
	}

	return semVersion{major: major, minor: minor, patch: patch}, true
}

func buildInstallerReadme() string {
	return `Agente Trilink
==============

Arquivos instalados:
- agent-service.exe
- agent-ui.exe
- agent-updater.exe
- icon.ico
- assets\img\logo-clara.png
- assets\img\logo-escura.png

Configuracao:
- O instalador grava a configuracao em C:\ProgramData\Trilink\Agent\.env na primeira execucao.
- Se o pacote foi montado com apps\agent\.env local, esse arquivo ja sera usado como seed.
- Caso contrario, o seed inicial sera apps\agent\.env.example.

Operacao:
- Iniciar: agent-ui.exe
- Update local: agent-updater.exe apply-local --source <bundle>
- Parar: scripts\stop-agent.cmd
- Configuracao assistida: scripts\configure-agent-helper.cmd
- Editar config: scripts\open-config.cmd
- Logs: scripts\open-logs.cmd
`
}

func emptyOrCreateDir(path string) error {
	if fileExists(path) {
		entries, err := os.ReadDir(path)
		if err != nil {
			return fmt.Errorf("read dir %s: %w", path, err)
		}
		for _, entry := range entries {
			if err := removeWithRetry(filepath.Join(path, entry.Name())); err != nil {
				return err
			}
		}
		return nil
	}
	return mkdirAllRetry(path)
}

func removeWithRetry(path string) error {
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		lastErr = os.RemoveAll(path)
		if lastErr == nil {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return fmt.Errorf("remove %s: %w", path, lastErr)
}

func mkdirAllRetry(path string) error {
	var lastErr error
	for attempt := 1; attempt <= 5; attempt++ {
		lastErr = os.MkdirAll(path, 0o755)
		if lastErr == nil {
			return nil
		}
		time.Sleep(500 * time.Millisecond)
	}
	return lastErr
}

func copyFile(src, dst string) error {
	if !fileExists(src) {
		return fmt.Errorf("arquivo obrigatorio nao encontrado: %s", src)
	}
	if err := mkdirAllRetry(filepath.Dir(dst)); err != nil {
		return fmt.Errorf("prepare parent dir for %s: %w", dst, err)
	}

	in, err := os.Open(src)
	if err != nil {
		return fmt.Errorf("open source %s: %w", src, err)
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return fmt.Errorf("create target %s: %w", dst, err)
	}

	_, copyErr := io.Copy(out, in)
	closeErr := out.Close()
	if copyErr != nil {
		return fmt.Errorf("copy %s -> %s: %w", src, dst, copyErr)
	}
	if closeErr != nil {
		return fmt.Errorf("close target %s: %w", dst, closeErr)
	}
	return nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
