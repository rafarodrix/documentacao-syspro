package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"trilink/agent/internal/infra/config"
)

const (
	manifestEnvKey         = "AGENT_UPDATE_MANIFEST_URL"
	agentVersionEnvKey     = "AGENT_VERSION"
	serviceVersionEnvKey   = "AGENT_SERVICE_VERSION"
	uiVersionEnvKey        = "AGENT_UI_VERSION"
	updaterVersionEnvKey   = "AGENT_UPDATER_VERSION"
	updateUserAgentBase    = "trilink-agent-updater"
	remoteManifestSchemaV1 = "agent-updater.v1"
)

type updaterManifest struct {
	SchemaVersion string                         `json:"schemaVersion,omitempty"`
	Channel       string                         `json:"channel,omitempty"`
	Components    map[string]updaterArtifactSpec `json:"components"`
}

type updaterArtifactSpec struct {
	Version string `json:"version"`
	URL     string `json:"url"`
	SHA256  string `json:"sha256"`
}

type currentComponentVersions struct {
	Service string
	UI      string
	Updater string
}

type remoteComponentStatus struct {
	Name           string
	CurrentVersion string
	TargetVersion  string
	URL            string
	NeedsUpdate    bool
	Available      bool
}

func loadUpdaterRuntimeEnv() {
	_ = config.LoadEnvFile(config.DefaultEnvFilePath())
}

func resolveManifestURL(explicit string) string {
	return strings.TrimSpace(firstNonEmpty(explicit, os.Getenv(manifestEnvKey)))
}

func resolveCurrentComponentVersions(serviceVersion, uiVersion, updaterVersion string) currentComponentVersions {
	service := firstNonEmpty(serviceVersion, os.Getenv(serviceVersionEnvKey), os.Getenv(agentVersionEnvKey), "dev")
	ui := firstNonEmpty(uiVersion, os.Getenv(uiVersionEnvKey), os.Getenv(agentVersionEnvKey), service)
	updater := firstNonEmpty(updaterVersion, os.Getenv(updaterVersionEnvKey), os.Getenv(agentVersionEnvKey), buildVersion)

	return currentComponentVersions{
		Service: strings.TrimSpace(service),
		UI:      strings.TrimSpace(ui),
		Updater: strings.TrimSpace(updater),
	}
}

func fetchRemoteManifest(ctx context.Context, manifestURL string) (updaterManifest, error) {
	manifestURL = strings.TrimSpace(manifestURL)
	if manifestURL == "" {
		return updaterManifest{}, fmt.Errorf("%s is required", manifestEnvKey)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, manifestURL, nil)
	if err != nil {
		return updaterManifest{}, fmt.Errorf("build manifest request: %w", err)
	}
	req.Header.Set("User-Agent", updaterUserAgent())
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return updaterManifest{}, fmt.Errorf("download manifest: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return updaterManifest{}, fmt.Errorf("download manifest: unexpected status %d", resp.StatusCode)
	}

	var manifest updaterManifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return updaterManifest{}, fmt.Errorf("decode manifest: %w", err)
	}

	if len(manifest.Components) == 0 {
		return updaterManifest{}, fmt.Errorf("remote manifest does not declare any components")
	}
	if manifest.SchemaVersion != "" && !strings.EqualFold(strings.TrimSpace(manifest.SchemaVersion), remoteManifestSchemaV1) {
		return updaterManifest{}, fmt.Errorf("unsupported updater manifest schema %q", strings.TrimSpace(manifest.SchemaVersion))
	}

	return manifest, nil
}

func buildRemoteComponentStatuses(manifest updaterManifest, current currentComponentVersions) []remoteComponentStatus {
	statuses := make([]remoteComponentStatus, 0, len(canonicalUpdaterComponents()))
	for _, name := range canonicalUpdaterComponents() {
		spec, ok := manifest.Components[name]
		status := remoteComponentStatus{
			Name:           name,
			CurrentVersion: currentVersionForComponent(current, name),
			TargetVersion:  strings.TrimSpace(spec.Version),
			URL:            strings.TrimSpace(spec.URL),
			Available:      ok,
		}
		if ok {
			status.NeedsUpdate = status.TargetVersion != "" && !strings.EqualFold(status.CurrentVersion, status.TargetVersion)
		}
		statuses = append(statuses, status)
	}
	return statuses
}

func selectRemoteUpdatePlan(manifest updaterManifest, current currentComponentVersions, requested []string) ([]remoteComponentStatus, error) {
	requestedSet := make(map[string]bool, len(requested))
	if len(requested) > 0 {
		for _, raw := range requested {
			name := strings.TrimSpace(strings.ToLower(raw))
			if name == "" {
				continue
			}
			if !isCanonicalUpdaterComponent(name) {
				return nil, fmt.Errorf("unknown component %q", raw)
			}
			requestedSet[name] = true
		}
		if len(requestedSet) == 0 {
			return nil, fmt.Errorf("no valid components provided")
		}
	}

	statuses := buildRemoteComponentStatuses(manifest, current)
	plan := make([]remoteComponentStatus, 0, len(statuses))
	for _, status := range statuses {
		if len(requestedSet) > 0 && !requestedSet[status.Name] {
			continue
		}
		if !status.Available {
			if len(requestedSet) > 0 {
				return nil, fmt.Errorf("manifest does not provide component %q", status.Name)
			}
			continue
		}
		if strings.TrimSpace(status.URL) == "" {
			if len(requestedSet) > 0 {
				return nil, fmt.Errorf("manifest component %q does not provide a download url", status.Name)
			}
			continue
		}
		if strings.TrimSpace(status.TargetVersion) == "" {
			if len(requestedSet) > 0 {
				return nil, fmt.Errorf("manifest component %q does not provide a target version", status.Name)
			}
			continue
		}
		if len(requestedSet) == 0 && !status.NeedsUpdate {
			continue
		}
		plan = append(plan, status)
	}

	return plan, nil
}

func downloadRemoteBundle(ctx context.Context, manifest updaterManifest, plan []remoteComponentStatus) (string, error) {
	bundleRoot, err := os.MkdirTemp("", "trilink-agent-update-*")
	if err != nil {
		return "", fmt.Errorf("create updater temp dir: %w", err)
	}

	for _, status := range plan {
		spec := manifest.Components[status.Name]
		target := filepath.Join(bundleRoot, componentArtifactFileName(status.Name))
		if err := downloadRemoteArtifact(ctx, status.Name, spec, target); err != nil {
			return "", err
		}
	}

	return bundleRoot, nil
}

func downloadRemoteArtifact(ctx context.Context, component string, spec updaterArtifactSpec, targetPath string) error {
	downloadURL := strings.TrimSpace(spec.URL)
	expectedSHA := strings.ToLower(strings.TrimSpace(spec.SHA256))
	if downloadURL == "" {
		return fmt.Errorf("manifest component %q does not provide a download url", component)
	}
	if expectedSHA == "" {
		return fmt.Errorf("manifest component %q requires sha256 for remote download", component)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, downloadURL, nil)
	if err != nil {
		return fmt.Errorf("build artifact request for %s: %w", component, err)
	}
	req.Header.Set("User-Agent", updaterUserAgent())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("download artifact %s: %w", component, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download artifact %s: unexpected status %d", component, resp.StatusCode)
	}

	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return fmt.Errorf("prepare artifact dir for %s: %w", component, err)
	}

	file, err := os.Create(targetPath)
	if err != nil {
		return fmt.Errorf("create artifact file for %s: %w", component, err)
	}

	hasher := sha256.New()
	_, copyErr := io.Copy(io.MultiWriter(file, hasher), resp.Body)
	closeErr := file.Close()
	if copyErr != nil {
		return fmt.Errorf("write artifact %s: %w", component, copyErr)
	}
	if closeErr != nil {
		return fmt.Errorf("close artifact %s: %w", component, closeErr)
	}

	actualSHA := hex.EncodeToString(hasher.Sum(nil))
	if !strings.EqualFold(expectedSHA, actualSHA) {
		return fmt.Errorf("artifact checksum mismatch for %s: expected %s got %s", component, expectedSHA, actualSHA)
	}
	return nil
}

func currentVersionForComponent(current currentComponentVersions, component string) string {
	switch strings.TrimSpace(component) {
	case "service":
		return current.Service
	case "ui":
		return current.UI
	case "updater":
		return current.Updater
	default:
		return ""
	}
}

func componentArtifactFileName(component string) string {
	switch strings.TrimSpace(component) {
	case "service":
		return "agent-service.exe"
	case "ui":
		return "agent-ui.exe"
	case "updater":
		return "agent-updater.exe"
	default:
		return filepath.Base(component)
	}
}

func canonicalUpdaterComponents() []string {
	return []string{"service", "ui", "updater"}
}

func isCanonicalUpdaterComponent(component string) bool {
	for _, candidate := range canonicalUpdaterComponents() {
		if candidate == strings.TrimSpace(component) {
			return true
		}
	}
	return false
}

func parseRequestedComponents(raw string) []string {
	parts := strings.Split(raw, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(strings.ToLower(part))
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

func updaterUserAgent() string {
	version := strings.TrimSpace(buildVersion)
	if version == "" {
		version = "dev"
	}
	return updateUserAgentBase + "/" + version
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func newUpdaterHTTPContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Minute)
}
