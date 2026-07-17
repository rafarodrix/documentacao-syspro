package main

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"trilink/agent/internal/infra/winsvc"
)

var buildVersion = "dev"

const usage = `Uso: agent-updater <comando> [opcoes]

Comandos:
  version
      Exibe a versao embutida do updater.

  inspect-bundle --source <diretorio>
      Lista os artefatos reconhecidos em um bundle local de update.

  apply-local --source <diretorio> [--install-dir <diretorio>] [--dry-run]
      Aplica um bundle local no diretorio instalado do agente.
      Atualiza service/ui/assets/scripts/config quando presentes.
      O proprio agent-updater.exe e detectado, mas a troca in-place e
      marcada como pendente para um corte posterior.
`

type bundleEntry struct {
	RelativePath string
}

type applyResult struct {
	Copied  []string
	Pending []string
}

func main() {
	if err := run(os.Args[1:], os.Stdout, os.Stderr); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string, stdout, stderr io.Writer) error {
	if len(args) == 0 {
		_, _ = io.WriteString(stdout, usage)
		return nil
	}

	switch strings.TrimSpace(strings.ToLower(args[0])) {
	case "help", "--help", "-h":
		_, _ = io.WriteString(stdout, usage)
		return nil

	case "version":
		_, _ = fmt.Fprintf(stdout, "agent-updater %s\n", strings.TrimSpace(buildVersion))
		return nil

	case "inspect-bundle":
		fs := flag.NewFlagSet("inspect-bundle", flag.ContinueOnError)
		fs.SetOutput(stderr)

		sourceDir := fs.String("source", "", "Diretorio do bundle local")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}

		entries, err := discoverBundleEntries(strings.TrimSpace(*sourceDir))
		if err != nil {
			return err
		}

		_, _ = fmt.Fprintf(stdout, "Bundle local: %s\n", strings.TrimSpace(*sourceDir))
		for _, entry := range entries {
			_, _ = fmt.Fprintf(stdout, "- %s\n", entry.RelativePath)
		}
		return nil

	case "apply-local":
		fs := flag.NewFlagSet("apply-local", flag.ContinueOnError)
		fs.SetOutput(stderr)

		sourceDir := fs.String("source", "", "Diretorio do bundle local")
		installDir := fs.String("install-dir", "", "Diretorio instalado do agente")
		dryRun := fs.Bool("dry-run", false, "Nao copia arquivos; apenas valida o plano")
		if err := fs.Parse(args[1:]); err != nil {
			return err
		}

		result, err := applyLocalBundle(strings.TrimSpace(*sourceDir), strings.TrimSpace(*installDir), *dryRun)
		if err != nil {
			return err
		}

		mode := "apply"
		if *dryRun {
			mode = "dry-run"
		}
		_, _ = fmt.Fprintf(stdout, "Bundle local processado (%s).\n", mode)
		for _, rel := range result.Copied {
			_, _ = fmt.Fprintf(stdout, "copied: %s\n", rel)
		}
		for _, rel := range result.Pending {
			_, _ = fmt.Fprintf(stdout, "pending: %s\n", rel)
		}
		return nil

	default:
		return fmt.Errorf("unknown command %q\n\n%s", args[0], usage)
	}
}

func applyLocalBundle(sourceDir, installDir string, dryRun bool) (applyResult, error) {
	sourceDir = strings.TrimSpace(sourceDir)
	if sourceDir == "" {
		return applyResult{}, errors.New("source is required")
	}

	entries, err := discoverBundleEntries(sourceDir)
	if err != nil {
		return applyResult{}, err
	}

	if installDir == "" {
		exePath, err := os.Executable()
		if err != nil {
			return applyResult{}, fmt.Errorf("resolve updater executable path: %w", err)
		}
		installDir = filepath.Dir(exePath)
	}

	currentExe, _ := os.Executable()
	currentExe = filepath.Clean(currentExe)

	result := applyResult{}
	needsUIStop := bundleTouchesUI(entries)
	needsServiceRestart := bundleContains(entries, "agent-service.exe")

	if !dryRun && needsUIStop {
		if err := stopUIProcess(); err != nil {
			return result, err
		}
	}
	if !dryRun && needsServiceRestart {
		if err := stopServiceIfPresent(); err != nil {
			return result, err
		}
	}

	backupRoot := filepath.Join(installDir, "updates", time.Now().UTC().Format("20060102-150405"), "backup")
	for _, entry := range entries {
		src := filepath.Join(sourceDir, filepath.FromSlash(entry.RelativePath))
		dst := filepath.Join(installDir, filepath.FromSlash(entry.RelativePath))

		if sameFilePath(currentExe, dst) {
			result.Pending = append(result.Pending, entry.RelativePath)
			continue
		}

		if dryRun {
			result.Copied = append(result.Copied, entry.RelativePath)
			continue
		}

		if err := backupExistingFile(dst, filepath.Join(backupRoot, filepath.FromSlash(entry.RelativePath))); err != nil {
			return result, err
		}
		if err := copyFile(src, dst); err != nil {
			return result, err
		}
		result.Copied = append(result.Copied, entry.RelativePath)
	}

	if !dryRun && needsServiceRestart {
		if err := startServiceIfPresent(); err != nil {
			return result, err
		}
	}

	return result, nil
}

func discoverBundleEntries(root string) ([]bundleEntry, error) {
	root = strings.TrimSpace(root)
	if root == "" {
		return nil, errors.New("source is required")
	}

	topLevelFiles := []string{
		"agent-service.exe",
		"agent-ui.exe",
		"agent-updater.exe",
		"icon.ico",
		"LEIA-ME.txt",
	}
	topLevelDirs := []string{
		"assets",
		"scripts",
		"config",
		"rustdesk",
	}

	var entries []bundleEntry
	for _, name := range topLevelFiles {
		path := filepath.Join(root, name)
		info, err := os.Stat(path)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, fmt.Errorf("stat %s: %w", path, err)
		}
		if info.IsDir() {
			continue
		}
		entries = append(entries, bundleEntry{RelativePath: name})
	}

	for _, dir := range topLevelDirs {
		base := filepath.Join(root, dir)
		info, err := os.Stat(base)
		if err != nil {
			if os.IsNotExist(err) {
				continue
			}
			return nil, fmt.Errorf("stat %s: %w", base, err)
		}
		if !info.IsDir() {
			continue
		}

		walkErr := filepath.WalkDir(base, func(path string, d fs.DirEntry, err error) error {
			if err != nil {
				return err
			}
			if d.IsDir() {
				return nil
			}

			rel, err := filepath.Rel(root, path)
			if err != nil {
				return err
			}
			entries = append(entries, bundleEntry{RelativePath: filepath.ToSlash(rel)})
			return nil
		})
		if walkErr != nil {
			return nil, fmt.Errorf("walk %s: %w", base, walkErr)
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].RelativePath < entries[j].RelativePath
	})

	if len(entries) == 0 {
		return nil, fmt.Errorf("no recognized updater artifacts found in %s", root)
	}
	return entries, nil
}

func bundleContains(entries []bundleEntry, relativePath string) bool {
	target := strings.TrimSpace(relativePath)
	for _, entry := range entries {
		if entry.RelativePath == target {
			return true
		}
	}
	return false
}

func bundleTouchesUI(entries []bundleEntry) bool {
	for _, entry := range entries {
		switch {
		case entry.RelativePath == "agent-ui.exe":
			return true
		case entry.RelativePath == "icon.ico":
			return true
		case strings.HasPrefix(entry.RelativePath, "assets/"):
			return true
		}
	}
	return false
}

func stopServiceIfPresent() error {
	if err := winsvc.Stop(); err != nil {
		lower := strings.ToLower(err.Error())
		if strings.Contains(lower, "not found") || strings.Contains(lower, "only supported on windows") {
			return nil
		}
		return fmt.Errorf("stop service before update: %w", err)
	}
	return nil
}

func startServiceIfPresent() error {
	if err := winsvc.Start(); err != nil {
		lower := strings.ToLower(err.Error())
		if strings.Contains(lower, "not found") || strings.Contains(lower, "only supported on windows") {
			return nil
		}
		return fmt.Errorf("start service after update: %w", err)
	}
	return nil
}

func stopUIProcess() error {
	cmd := exec.Command("taskkill.exe", "/IM", "agent-ui.exe", "/F", "/T")
	output, err := cmd.CombinedOutput()
	if err == nil {
		return nil
	}

	lower := strings.ToLower(string(output) + " " + err.Error())
	if strings.Contains(lower, "not found") || strings.Contains(lower, "nenhuma inst") {
		return nil
	}
	return fmt.Errorf("stop agent-ui.exe before update: %w", err)
}

func backupExistingFile(targetPath, backupPath string) error {
	info, err := os.Stat(targetPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("stat existing target %s: %w", targetPath, err)
	}
	if info.IsDir() {
		return nil
	}

	if err := copyFile(targetPath, backupPath); err != nil {
		return fmt.Errorf("backup %s: %w", targetPath, err)
	}
	return nil
}

func copyFile(src, dst string) error {
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
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

func sameFilePath(left, right string) bool {
	if strings.TrimSpace(left) == "" || strings.TrimSpace(right) == "" {
		return false
	}
	return strings.EqualFold(filepath.Clean(left), filepath.Clean(right))
}
