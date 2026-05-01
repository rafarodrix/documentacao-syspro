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
	agentRoot       string
	installerRoot   string
	sourceDeployDir string
	stageRoot       string
	outputRoot      string
	runtimeRoot     string
	sourceEnv       string
	sourceEnvEx     string
	issFile         string
}

func newInstallerBuilder(agentRoot string) installerBuilder {
	installerRoot := filepath.Join(agentRoot, "deploy", "windows-installer")
	return installerBuilder{
		agentRoot:       agentRoot,
		installerRoot:   installerRoot,
		sourceDeployDir: filepath.Join(agentRoot, "dist", "test-deploy", "windows-amd64"),
		stageRoot:       filepath.Join(agentRoot, "dist", "windows-installer", "staging"),
		outputRoot:      filepath.Join(agentRoot, "dist", "windows-installer", "output"),
		runtimeRoot:     filepath.Join(installerRoot, "runtime"),
		sourceEnv:       filepath.Join(agentRoot, ".env"),
		sourceEnvEx:     filepath.Join(agentRoot, ".env.example"),
		issFile:         filepath.Join(installerRoot, "AgenteTrilink.iss"),
	}
}

func (b installerBuilder) stage() error {
	if _, err := os.Stat(b.sourceDeployDir); err != nil {
		return fmt.Errorf("pacote base nao encontrado: %s", b.sourceDeployDir)
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
		{filepath.Join(b.sourceDeployDir, "agent-service.exe"), filepath.Join(b.stageRoot, "agent-service.exe")},
		{filepath.Join(b.sourceDeployDir, "agent-ui.exe"), filepath.Join(b.stageRoot, "agent-ui.exe")},
		{filepath.Join(b.agentRoot, "assets", "icon.ico"), filepath.Join(b.stageRoot, "icon.ico")},
		{filepath.Join(b.agentRoot, "assets", "img", "logo-clara.png"), filepath.Join(b.stageRoot, "assets", "img", "logo-clara.png")},
		{filepath.Join(b.agentRoot, "assets", "img", "logo-escura.png"), filepath.Join(b.stageRoot, "assets", "img", "logo-escura.png")},
		{filepath.Join(b.runtimeRoot, "stop-agent.cmd"), filepath.Join(b.stageRoot, "scripts", "stop-agent.cmd")},
		{filepath.Join(b.runtimeRoot, "open-config.cmd"), filepath.Join(b.stageRoot, "scripts", "open-config.cmd")},
		{filepath.Join(b.runtimeRoot, "open-logs.cmd"), filepath.Join(b.stageRoot, "scripts", "open-logs.cmd")},
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
	cmd := exec.Command("git", "-C", b.installerRoot, "describe", "--tags", "--match", "v*", "--abbrev=0")
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = io.Discard
	if err := cmd.Run(); err == nil {
		re := regexp.MustCompile(`^v?(\d+\.\d+\.\d+)`)
		if match := re.FindStringSubmatch(strings.TrimSpace(stdout.String())); len(match) == 2 {
			return match[1], nil
		}
	}
	return "1.0.0", nil
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

func buildInstallerReadme() string {
	return `Agente Trilink
==============

Arquivos instalados:
- agent-service.exe
- agent-ui.exe
- icon.ico
- assets\img\logo-clara.png
- assets\img\logo-escura.png

Configuracao:
- O instalador grava a configuracao em C:\ProgramData\Trilink\Agent\.env na primeira execucao.
- Se o pacote foi montado com apps\agent\.env local, esse arquivo ja sera usado como seed.
- Caso contrario, o seed inicial sera apps\agent\.env.example.

Operacao:
- Iniciar: agent-ui.exe
- Parar: scripts\stop-agent.cmd
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
