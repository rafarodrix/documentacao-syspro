package device

import (
	"context"
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// Logger define o contrato de logging esperado pelo Collector.
type Logger interface {
	Debug(msg string, kv ...any)
	Info(msg string, kv ...any)
	Warn(msg string, kv ...any)
	Error(msg string, kv ...any)
}

// SysproInstallationHint replica o campo do desired state para evitar import circular.
// O module.go converte domain.SysproInstallationHint para este tipo.
type SysproInstallationHint struct {
	CompanyID      string
	CompanyName    string
	Path           string
	InstallationID string
	RuntimeType    string
	Port           int
	Protocol       string
	Host           string
	IISPath        string
}

// Collector executa coleta de metricas do sistema operacional Windows.
//
// Todas as coletas usam APIs nativas Win32 — zero PowerShell, zero subprocess:
//   - Memoria:       GlobalMemoryStatusEx (~0ms)
//   - CPU load:      GetSystemTimes com delta entre ciclos (~0ms)
//   - Disco:         GetLogicalDriveStrings + GetDiskFreeSpaceEx + GetVolumeInformation (~0ms)
//   - Servicos:      SCM via svc/mgr (~5ms total)
//   - Reboot:        registro Windows (~0ms)
//   - Versao de exe: GetFileVersionInfoW + VerQueryValueW (~0ms)
type Collector struct {
	logger Logger

	// Estado para calculo de CPU por delta de GetSystemTimes.
	// Inicializado na primeira coleta; zerado nao produz erro, apenas retorna 0%.
	prevCPUIdle   uint64
	prevCPUKernel uint64
	prevCPUUser   uint64
	hasPrevCPU    bool
}

// NewCollector cria um Collector com o logger fornecido.
func NewCollector(logger Logger) *Collector {
	return &Collector{logger: logger}
}

// CollectSysproInstallations descobre grupos/instancias Syspro sem tratar um
// diretorio raiz como uma unica instalacao valida. Os caminhos vindos do portal
// entram apenas como hints; a verdade final eh a presenca validada do
// SysproServer.exe e arquivos auxiliares.
func (c *Collector) CollectSysproInstallations(_ context.Context, hints []SysproInstallationHint) *SysproVersionSnapshot {
	groups := c.discoverSysproInstallationGroups(hints)
	snap := &SysproVersionSnapshot{
		CollectedAt:        nowRFC3339(),
		InstallationGroups: groups,
		MachineRole:        classifySysproMachine(groups),
	}
	for _, group := range groups {
		for _, server := range group.ServerInstances {
			if strings.EqualFold(server.Validation.Status, "VALIDATED") {
				snap.ValidatedServerCount++
			}
		}
	}
	return snap
}

func nowRFC3339() string { return time.Now().UTC().Format(time.RFC3339) }

func round2(v float64) float64 { return math.Round(v*100) / 100 }

func (c *Collector) discoverSysproInstallationGroups(hints []SysproInstallationHint) []SysproInstallationGroup {
	candidates := buildSysproCandidateRoots(hints)
	groups := make([]SysproInstallationGroup, 0, len(candidates))
	seen := make(map[string]struct{}, len(candidates))

	for _, candidate := range candidates {
		group, ok := c.inspectSysproInstallationGroup(candidate.rootPath, candidate.evidence, candidate.hints)
		if !ok {
			continue
		}
		key := normalizeSysproPath(group.RootPath)
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		groups = append(groups, group)
	}

	sort.Slice(groups, func(i, j int) bool {
		return strings.ToLower(groups[i].RootPath) < strings.ToLower(groups[j].RootPath)
	})
	return groups
}

type sysproCandidateRoot struct {
	rootPath string
	evidence []string
	hints    []SysproCompanyHint
}

func buildSysproCandidateRoots(hints []SysproInstallationHint) []sysproCandidateRoot {
	candidates := []sysproCandidateRoot{
		{rootPath: `C:\Syspro`, evidence: []string{"COMMON_ROOT"}},
		{rootPath: `D:\Syspro`, evidence: []string{"COMMON_ROOT"}},
		{rootPath: `C:\Program Files\Syspro`, evidence: []string{"COMMON_ROOT"}},
		{rootPath: `D:\Sistemas\Syspro`, evidence: []string{"COMMON_ROOT"}},
	}

	indexByPath := map[string]int{}
	for i, candidate := range candidates {
		indexByPath[normalizeSysproPath(candidate.rootPath)] = i
	}

	appendCandidate := func(rootPath string, evidence string, hint *SysproInstallationHint) {
		rootPath = normalizeWindowsDir(rootPath)
		if rootPath == "" {
			return
		}
		key := normalizeSysproPath(rootPath)
		idx, exists := indexByPath[key]
		if !exists {
			idx = len(candidates)
			candidates = append(candidates, sysproCandidateRoot{rootPath: rootPath})
			indexByPath[key] = idx
		}
		if evidence != "" && !containsFold(candidates[idx].evidence, evidence) {
			candidates[idx].evidence = append(candidates[idx].evidence, evidence)
		}
		if hint != nil {
			hintEntry := SysproCompanyHint{
				CompanyID:   hint.CompanyID,
				CompanyName: hint.CompanyName,
				Path:        normalizeWindowsDir(hint.Path),
				Source:      "PORTAL_LINK",
			}
			if !containsCompanyHint(candidates[idx].hints, hintEntry) {
				candidates[idx].hints = append(candidates[idx].hints, hintEntry)
			}
		}
	}

	for i := range hints {
		hint := hints[i]
		resolvedPath := normalizeHintPath(hint.Path)
		if resolvedPath == "" {
			continue
		}
		// Hints can point to the server directory or the executable itself.
		// Keep only the installation root: adding both creates a second group
		// that discovers the same SysproServer.exe through two paths.
		appendCandidate(deriveSysproGroupRoot(resolvedPath), "PORTAL_HINT", &hint)
	}

	return candidates
}

func (c *Collector) inspectSysproInstallationGroup(rootPath string, evidence []string, hints []SysproCompanyHint) (SysproInstallationGroup, bool) {
	rootPath = normalizeWindowsDir(rootPath)
	if rootPath == "" {
		return SysproInstallationGroup{}, false
	}

	rootInfo, err := os.Stat(rootPath)
	if err != nil || !rootInfo.IsDir() {
		return SysproInstallationGroup{}, false
	}

	group := SysproInstallationGroup{
		ID:                rootPath,
		RootPath:          rootPath,
		DiscoveryEvidence: append([]string(nil), evidence...),
		Confidence:        "LOW",
	}

	serverCandidates := orderedSysproServerRoots(rootPath)
	for _, serverRoot := range serverCandidates {
		server, ok := c.inspectSysproServerInstance(serverRoot, hints)
		if !ok {
			continue
		}
		group.ServerInstances = append(group.ServerInstances, server)
		group.Roles = appendRole(group.Roles, "SERVER")
		group.DiscoveryEvidence = appendUniqueEvidence(group.DiscoveryEvidence, server.Validation.Evidence...)
	}

	clientPath := filepath.Join(rootPath, "Client")
	hasServerInstallation := len(group.ServerInstances) > 0
	if !hasServerInstallation && dirExists(clientPath) {
		group.ClientInstances = append(group.ClientInstances, SysproClientInstance{
			RootPath: clientPath,
			Status:   "DISCOVERED",
			Evidence: []string{"CLIENT_DIRECTORY"},
		})
		group.Roles = appendRole(group.Roles, "CLIENT")
		group.DiscoveryEvidence = appendUniqueEvidence(group.DiscoveryEvidence, "CLIENT_DIRECTORY")
	}

	sharedPath := filepath.Join(rootPath, "Dlls")
	if dirExists(sharedPath) {
		group.SharedDirectories = append(group.SharedDirectories, sharedPath)
		group.DiscoveryEvidence = appendUniqueEvidence(group.DiscoveryEvidence, "SHARED_DLLS_DIRECTORY")
	}

	group.Classification = classifySysproGroup(group)
	switch group.Classification {
	case "SERVER", "MIXED":
		group.Confidence = "HIGH"
	case "CLIENT", "PARTIAL":
		group.Confidence = "MEDIUM"
	case "UNKNOWN":
		group.Confidence = "LOW"
	}

	if len(group.ServerInstances) == 0 && len(group.ClientInstances) == 0 && len(group.SharedDirectories) == 0 && len(group.DiscoveryEvidence) == 0 {
		return SysproInstallationGroup{}, false
	}

	sort.Strings(group.Roles)
	sort.Strings(group.SharedDirectories)
	sort.Strings(group.DiscoveryEvidence)
	sort.Slice(group.ServerInstances, func(i, j int) bool {
		return strings.ToLower(group.ServerInstances[i].RootPath) < strings.ToLower(group.ServerInstances[j].RootPath)
	})
	return group, true
}

func (c *Collector) inspectSysproServerInstance(serverRoot string, hints []SysproCompanyHint) (SysproServerInstance, bool) {
	serverRoot = normalizeWindowsDir(serverRoot)
	if serverRoot == "" || !dirExists(serverRoot) {
		return SysproServerInstance{}, false
	}

	executablePath := filepath.Join(serverRoot, "SysproServer.exe")
	configurationPath := filepath.Join(serverRoot, "SysproServer.ini")
	isapiDLLPath := filepath.Join(serverRoot, "SysproServerISAPI.dll")
	evidence := make([]string, 0, 4)

	exeInfo, exeExists := safeFileInfo(executablePath)
	if exeExists {
		evidence = append(evidence, "SYSPRO_SERVER_EXECUTABLE")
	}
	if fileExists(configurationPath) {
		evidence = append(evidence, "SYSPRO_SERVER_INI")
	}
	if fileExists(isapiDLLPath) {
		evidence = append(evidence, "SYSPRO_SERVER_ISAPI_DLL")
	}

	dataDirectories := make([]SysproDataDirectory, 0, 1)
	defaultDataPath := filepath.Join(serverRoot, "Data")
	if dirExists(defaultDataPath) {
		dataDirectories = append(dataDirectories, SysproDataDirectory{
			Path:      defaultDataPath,
			Source:    "DEFAULT_DATA_SUBDIRECTORY",
			Validated: true,
		})
		evidence = append(evidence, "DATA_DIRECTORY")
	}

	if len(evidence) == 0 {
		return SysproServerInstance{}, false
	}

	server := SysproServerInstance{
		ID:                coalesceNonEmpty(executablePath, serverRoot),
		RootPath:          serverRoot,
		ExecutablePath:    emptyUnlessExists(executablePath, exeExists),
		ConfigurationPath: emptyUnlessFile(configurationPath),
		IsapiDLLPath:      emptyUnlessFile(isapiDLLPath),
		DataDirectories:   dataDirectories,
		CompanyHints:      matchCompanyHints(serverRoot, hints),
	}

	if exeExists {
		server.ExecutableSizeMB = round2(float64(exeInfo.Size()) / 1024 / 1024)
		server.Version = c.readExeVersionDetails(executablePath)
		server.Validation = SysproValidation{
			Status:   "VALIDATED",
			Evidence: dedupeAndSort(evidence),
		}
	} else {
		server.Validation = SysproValidation{
			Status:   "PARTIAL",
			Evidence: dedupeAndSort(evidence),
		}
	}

	server.Update = readSysproUpdateInformation(serverRoot, executablePath, isapiDLLPath)
	return server, true
}

func orderedSysproServerRoots(rootPath string) []string {
	serverPath := filepath.Join(rootPath, "Server")
	roots := []string{serverPath, rootPath}
	if strings.EqualFold(rootPath, serverPath) {
		return []string{rootPath}
	}
	return roots
}

func classifySysproGroup(group SysproInstallationGroup) string {
	hasValidatedServer := false
	hasPartialServer := false
	for _, server := range group.ServerInstances {
		switch strings.ToUpper(strings.TrimSpace(server.Validation.Status)) {
		case "VALIDATED":
			hasValidatedServer = true
		case "PARTIAL":
			hasPartialServer = true
		}
	}
	hasClient := len(group.ClientInstances) > 0

	switch {
	case hasValidatedServer:
		return "SERVER"
	case hasPartialServer:
		return "PARTIAL"
	case hasClient:
		return "CLIENT"
	case len(group.SharedDirectories) > 0:
		return "PARTIAL"
	default:
		return "UNKNOWN"
	}
}

func classifySysproMachine(groups []SysproInstallationGroup) string {
	hasServer := false
	hasClient := false
	hasPartial := false
	for _, group := range groups {
		switch group.Classification {
		case "MIXED":
			return "MIXED"
		case "SERVER":
			hasServer = true
		case "CLIENT":
			hasClient = true
		case "PARTIAL":
			hasPartial = true
		}
	}
	switch {
	case hasServer && hasClient:
		return "MIXED"
	case hasServer:
		return "SERVER"
	case hasClient:
		return "CLIENT"
	case hasPartial:
		return "PARTIAL"
	default:
		return "UNKNOWN"
	}
}

func normalizeHintPath(path string) string {
	path = normalizeWindowsDir(path)
	if strings.HasSuffix(strings.ToLower(path), ".exe") {
		return normalizeWindowsDir(filepath.Dir(path))
	}
	return path
}

func deriveSysproGroupRoot(path string) string {
	path = normalizeWindowsDir(path)
	base := strings.ToLower(filepath.Base(path))
	switch base {
	case "server", "client", "dlls", "data":
		return normalizeWindowsDir(filepath.Dir(path))
	default:
		return path
	}
}

func normalizeWindowsDir(path string) string {
	path = strings.TrimSpace(path)
	path = strings.Trim(path, `"`)
	if path == "" {
		return ""
	}
	path = filepath.Clean(path)
	if strings.HasSuffix(path, ".") {
		path = strings.TrimSuffix(path, ".")
	}
	return path
}

func normalizeSysproPath(path string) string {
	return strings.ToLower(strings.ReplaceAll(normalizeWindowsDir(path), `/`, `\`))
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && info.IsDir()
}

func safeFileInfo(path string) (os.FileInfo, bool) {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return nil, false
	}
	return info, true
}

func appendRole(roles []string, role string) []string {
	if containsFold(roles, role) {
		return roles
	}
	return append(roles, role)
}

func appendUniqueEvidence(target []string, values ...string) []string {
	for _, value := range values {
		if !containsFold(target, value) {
			target = append(target, value)
		}
	}
	return target
}

func containsFold(values []string, target string) bool {
	for _, value := range values {
		if strings.EqualFold(value, target) {
			return true
		}
	}
	return false
}

func containsCompanyHint(values []SysproCompanyHint, target SysproCompanyHint) bool {
	for _, value := range values {
		if strings.EqualFold(value.CompanyID, target.CompanyID) && normalizeSysproPath(value.Path) == normalizeSysproPath(target.Path) {
			return true
		}
	}
	return false
}

func matchCompanyHints(serverRoot string, hints []SysproCompanyHint) []SysproCompanyHint {
	if len(hints) == 0 {
		return nil
	}
	serverKey := normalizeSysproPath(serverRoot)
	matches := make([]SysproCompanyHint, 0, len(hints))
	for _, hint := range hints {
		hintKey := normalizeSysproPath(hint.Path)
		if hintKey == "" {
			continue
		}
		if strings.HasPrefix(serverKey, hintKey) || strings.HasPrefix(hintKey, serverKey) {
			matches = append(matches, hint)
		}
	}
	return matches
}

func emptyUnlessExists(path string, exists bool) string {
	if !exists {
		return ""
	}
	return path
}

func emptyUnlessFile(path string) string {
	if fileExists(path) {
		return path
	}
	return ""
}

func dedupeAndSort(values []string) []string {
	if len(values) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(values))
	out := make([]string, 0, len(values))
	for _, value := range values {
		key := strings.ToLower(strings.TrimSpace(value))
		if key == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, value)
	}
	sort.Strings(out)
	return out
}

func coalesceNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

type sysproInstallationManifest struct {
	InstalledAt string `json:"installedAt"`
	UpdatedAt   string `json:"updatedAt"`
	Version     string `json:"version"`
}

func parseSysproManifestTimestamp(value string) (time.Time, bool) {
	value = strings.TrimSpace(value)
	if value == "" {
		return time.Time{}, false
	}

	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	for _, layout := range layouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed.UTC(), true
		}
	}
	return time.Time{}, false
}

func readSysproUpdateInformation(serverRoot, executablePath, isapiDLLPath string) SysproUpdateInfo {
	var manifestTimestamp time.Time
	var manifestAvailable bool

	manifestPath := filepath.Join(serverRoot, "syspro-installation.json")
	if payload, err := os.ReadFile(manifestPath); err == nil {
		var manifest sysproInstallationManifest
		if json.Unmarshal(payload, &manifest) == nil {
			if timestamp := strings.TrimSpace(coalesceNonEmpty(manifest.UpdatedAt, manifest.InstalledAt)); timestamp != "" {
				manifestTimestamp, manifestAvailable = parseSysproManifestTimestamp(timestamp)
				if !manifestAvailable {
					return SysproUpdateInfo{
						UpdatedAt:  timestamp,
						Source:     "INSTALLATION_MANIFEST",
						Confidence: "CONFIRMED",
					}
				}
			}
		}
	}

	var latest time.Time
	for _, candidate := range []string{executablePath, isapiDLLPath} {
		if info, ok := safeFileInfo(candidate); ok && info.ModTime().After(latest) {
			latest = info.ModTime()
		}
	}
	if latest.IsZero() {
		if manifestAvailable {
			return SysproUpdateInfo{
				UpdatedAt:  manifestTimestamp.Format(time.RFC3339),
				Source:     "INSTALLATION_MANIFEST",
				Confidence: "CONFIRMED",
			}
		}
		return SysproUpdateInfo{}
	}

	if manifestAvailable && !manifestTimestamp.Before(latest.UTC()) {
		return SysproUpdateInfo{
			UpdatedAt:  manifestTimestamp.Format(time.RFC3339),
			Source:     "INSTALLATION_MANIFEST",
			Confidence: "CONFIRMED",
		}
	}

	return SysproUpdateInfo{
		UpdatedAt:  latest.UTC().Format(time.RFC3339),
		Source:     "CORE_FILES_LAST_WRITE",
		Confidence: "ESTIMATED",
	}
}
