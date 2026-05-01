# Master Agent Trilink - Monitoramento remoto da maquina

Atualizado em 2026-05-01.

## Objetivo

Implementar coleta real de metricas do sistema operacional Windows no `modules/device` e
transmiti-las ao portal via payload de sync. O operador visualiza no portal o estado de cada
maquina: uso de memoria, carga de CPU, espaco em disco por unidade e status dos servicos
criticos (Firebird, SysPro Server, IIS).

**Restricao central:** uma maquina pode ter multiplas instalacoes do Syspro — uma por empresa.
A coleta de dados do SysPro (versao, processo, caminho) precisa identificar a qual empresa cada
instalacao pertence. Esse vinculo vem do portal via desired state.

---

## Arquitetura multi-empresa / multi-diretorio

### Problema

```
C:\Syspro\Server\SysproServer.exe  ->  Empresa A
D:\Syspro\Server\SysproServer.exe  ->  Empresa B
```

O agente nao pode adivinhar qual instalacao pertence a qual empresa. O portal sabe, porque cada
empresa tem sua configuracao de RemoteHost e instalacao de Syspro cadastrada.

### Solucao: desired state carrega os alvos de Syspro por empresa

O portal injeta no `DeviceDesiredState` a lista de instalacoes que o agente deve monitorar:

```go
// internal/domain/module_state.go

type DeviceDesiredState struct {
    Enabled          bool                  `json:"enabled"`
    Version          string                `json:"version"`
    CollectInventory bool                  `json:"collect_inventory"`
    CollectMetrics   bool                  `json:"collect_metrics"`
    SysproInstalls   []SysproInstallTarget `json:"syspro_installs,omitempty"`
}

type SysproInstallTarget struct {
    CompanyID   string `json:"company_id"`
    CompanyName string `json:"company_name"`
    ServerPath  string `json:"server_path"`  // ex: "C:\Syspro\Server"
    DataPath    string `json:"data_path"`    // ex: "C:\Syspro\Base" (opcional)
}
```

O agente nao descobre os caminhos — recebe do portal. Isso elimina ambiguidade.

---

## O que ja existe (nao precisa criar)

### Contrato de sync — `internal/domain/remote_contracts.go`

`RemoteSyncRequest` ja tem todos os campos de destino:

```go
DiskSnapshot        any `json:"diskSnapshot,omitempty"`
SysproProcesses     any `json:"sysproProcesses,omitempty"`
AgentMetrics        any `json:"agentMetrics,omitempty"`
RebootPending       any `json:"rebootPending,omitempty"`
SystemSnapshot      any `json:"systemSnapshot,omitempty"`
WindowsUpdateStatus any `json:"windowsUpdateStatus,omitempty"`
```

Nenhum desses campos e preenchido hoje. O `runSync` envia apenas identidade e RustDesk.

### Schema do portal — `packages/database/prisma/schema.prisma`

O modelo `RemoteHost` ja tem colunas para receber tudo:

```prisma
lastAgentMetrics            Json?
lastAgentMetricsAt          DateTime?
lastDiskSnapshot            Json?
lastDiskSnapshotAt          DateTime?
lastSysproProcessSnapshot   Json?
lastSysproProcessSnapshotAt DateTime?
lastWindowsUpdateStatus     Json?
lastWindowsUpdateStatusAt   DateTime?
lastRebootPending           Boolean?
lastRebootPendingAt         DateTime?
lastSystemSnapshot          Json?
lastSystemSnapshotAt        DateTime?
```

### Dependencias Go — `go.mod`

`golang.org/x/sys v0.38.0` ja esta importado. O pacote `golang.org/x/sys/windows/svc/mgr`
ja e usado em `internal/infra/winsvc/` para gerenciar o proprio servico do agente.
Zero dependencias novas necessarias para coleta de servicos.

---

## Abordagem tecnica: nativo vs PowerShell

| Dado | Metodo | Motivo |
|------|--------|--------|
| Status de servico Windows | `svc/mgr` nativo (SCM API) | Zero subprocess, < 1ms, ja no codebase |
| Memoria / CPU | `Win32_OperatingSystem` via PowerShell | Simples; overhead aceitavel (< 200ms) |
| Disco por unidade | `GetDiskFreeSpaceEx` nativo ou PowerShell | GetDiskFreeSpaceEx e a API certa; PowerShell OK para MVP |
| Versao do SysproServer.exe | `GetFileVersionInfoW` nativo | Roda como SYSTEM sem GUI; PowerShell pode falhar em Session 0 |
| Reboot pending | `registry` nativo (`golang.org/x/sys/windows/registry`) | Simples, 1 chave de registro |

### Servico Windows — API nativa (ZERO PowerShell)

```go
import (
    "golang.org/x/sys/windows/svc"
    "golang.org/x/sys/windows/svc/mgr"
)

func queryWindowsService(name string) (status string, pid uint32, err error) {
    m, err := mgr.Connect()
    if err != nil {
        return "error", 0, err
    }
    defer m.Disconnect()

    s, err := m.OpenService(name)
    if err != nil {
        // ERROR_SERVICE_DOES_NOT_EXIST -> not_installed
        return "not_installed", 0, nil
    }
    defer s.Close()

    q, err := s.Query()
    if err != nil {
        return "error", 0, err
    }

    var state string
    switch q.State {
    case svc.Running:
        state = "running"
    case svc.Stopped:
        state = "stopped"
    case svc.StartPending:
        state = "starting"
    case svc.StopPending:
        state = "stopping"
    default:
        state = "unknown"
    }
    return state, q.ProcessId, nil
}
```

### Reboot pending — registry nativo

```go
import "golang.org/x/sys/windows/registry"

func rebootPending() bool {
    k, err := registry.OpenKey(registry.LOCAL_MACHINE,
        `SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired`,
        registry.QUERY_VALUE)
    if err != nil {
        return false
    }
    k.Close()
    return true
}
```

---

## Servicos monitorados

| Servico | ServiceName Windows | DisplayName | Quando monitorar |
|---------|-------------------|-------------|-----------------|
| Firebird | `FirebirdServerDefaultInstance` | Firebird Server | Sempre |
| SysPro Server | `SysproServer` * | Syspro Server | Sempre (ver nota abaixo) |
| IIS | `W3SVC` | World Wide Web Publishing Service | Se W3SVC existir |
| RustDesk | `RustDesk` | RustDesk | Sempre |

**Nota SysproServer:** o ServiceName precisa ser confirmado em maquina de producao.
SysproServer.exe esta em `C:\Syspro\Server` (confirmado pela screenshot), mas o nome do
servico Windows pode variar por versao do Syspro. Estrategia de deteccao:

```go
// Estrategia em camadas para SysproServer
// 1. Tenta ServiceName exato
// 2. Se nao encontrar, busca por DisplayName (glob) — fallback por versao
// 3. Se ainda nao, verifica processo SysproServer.exe pelo path do desired state

func detectSysproServer(serverPath string) (status, pid) {
    // Camada 1: ServiceName direto
    status, pid, _ = queryWindowsService("SysproServer")
    if status != "not_installed" {
        return
    }
    // Camada 2: busca por DisplayName via EnumServices
    status, pid = findServiceByDisplayNameGlob("Syspro*")
    if status != "not_installed" {
        return
    }
    // Camada 3: processo pelo path do desired state
    if serverPath != "" {
        status, pid = findProcessByPath(filepath.Join(serverPath, "SysproServer.exe"))
    }
    return
}
```

**Acao necessaria antes de codar:** confirmar ServiceName em producao:

```powershell
Get-Service | Where-Object { $_.DisplayName -like '*Syspro*' -or $_.Name -like '*Syspro*' } |
    Select-Object Name, DisplayName, Status
```

---

## Frequencia de coleta

| Snapshot | Frequencia | API | Justificativa |
|----------|-----------|-----|---------------|
| Status de servicos (Firebird, SysproServer, IIS, RustDesk) | Todo sync (45s) | `svc/mgr` nativo — < 1ms | Critico: detectar queda de servico em < 1 minuto |
| Memoria total/usado/livre | Todo sync (45s) | PowerShell WMI — ~100ms | Dado leve, muda continuamente |
| CPU load (%) | Todo sync (45s) | PowerShell WMI — ~100ms | Mesclado na mesma chamada WMI da memoria |
| Reboot pending | Todo sync (45s) | registry nativo — < 1ms | Muda raramente mas e critico |
| Disco por unidade (total/livre) | A cada 4 ciclos (~3 min) | PowerShell WMI — ~150ms | Disco enche lentamente; 3 min e suficiente |
| Versao do SysproServer.exe | A cada 80 ciclos (~1h) | `GetFileVersionInfoW` nativo | Muda so em atualizacoes |
| Inventario completo (SO, patches) | 1x ao dia | PowerShell — pode ser lento | Dado historico; nao requer frequencia alta |

**Implementacao do throttle por contagem de ciclos:**

```go
type Module struct {
    // ...
    cycleCount uint64
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
    m.cycleCount++
    // Servicos e metricas leves: todo ciclo
    m.collectServices(ctx, desired.Device.SysproInstalls)
    m.collectMetrics(ctx)

    // Disco: a cada 4 ciclos
    if m.cycleCount%4 == 0 {
        m.collectDisks(ctx)
    }

    // Versao SysproServer: a cada 80 ciclos (~1h)
    if m.cycleCount%80 == 0 || m.lastVersions == nil {
        m.collectSysproVersions(ctx, desired.Device.SysproInstalls)
    }
}
```

---

## Tipos Go — `modules/device/types.go`

```go
package device

// AgentMetricsSnapshot e enviado em todo sync como dado leve de saude da maquina.
type AgentMetricsSnapshot struct {
    CollectedAt   string  `json:"collectedAt"`    // RFC3339
    MemoryTotalMB uint64  `json:"memoryTotalMb"`
    MemoryUsedMB  uint64  `json:"memoryUsedMb"`
    MemoryFreeMB  uint64  `json:"memoryFreeMb"`
    MemoryUsedPct float64 `json:"memoryUsedPct"`  // 0-100
    CpuLoadPct    float64 `json:"cpuLoadPct"`     // media dos nucleos, 0-100
    RebootPending bool    `json:"rebootPending"`
}

// DiskVolumeSnapshot lista todos os volumes de disco fixo (DriveType=3).
// Enviado a cada ~3 minutos (4 ciclos de sync).
type DiskVolumeSnapshot struct {
    CollectedAt string       `json:"collectedAt"`
    Volumes     []DiskVolume `json:"volumes"`
}

type DiskVolume struct {
    Letter  string  `json:"letter"`  // "C", "D", ...
    Label   string  `json:"label"`   // nome do volume (pode ser vazio)
    FsType  string  `json:"fsType"`  // "NTFS", "FAT32", ...
    TotalMB uint64  `json:"totalMb"`
    FreeMB  uint64  `json:"freeMb"`
    UsedMB  uint64  `json:"usedMb"`
    UsedPct float64 `json:"usedPct"` // 0-100
}

// SysproProcessSnapshot lista o status dos servicos criticos monitorados.
// Enviado em todo sync via API nativa (SCM) — custo zero.
type SysproProcessSnapshot struct {
    CollectedAt string          `json:"collectedAt"`
    Services    []ServiceStatus `json:"services"`
}

type ServiceStatus struct {
    Name        string `json:"name"`             // ServiceName do SCM
    DisplayName string `json:"displayName"`      // nome amigavel para exibicao
    Status      string `json:"status"`           // "running" | "stopped" | "starting" | "stopping" | "not_installed" | "error"
    PID         uint32 `json:"pid,omitempty"`    // 0 se nao estiver rodando
    CompanyID   string `json:"companyId,omitempty"`  // preenchido para servicos vinculados a empresa
}

// SysproVersionSnapshot e coletado a cada ~1h. Contem versao e path de cada instalacao.
type SysproVersionSnapshot struct {
    CollectedAt  string               `json:"collectedAt"`
    Installations []SysproInstallInfo `json:"installations"`
}

type SysproInstallInfo struct {
    CompanyID      string `json:"companyId"`
    CompanyName    string `json:"companyName"`
    ServerPath     string `json:"serverPath"`
    ExeVersion     string `json:"exeVersion"`     // versao do SysproServer.exe
    ExeExists      bool   `json:"exeExists"`      // se o arquivo existe no path
    ExeSizeMB      float64 `json:"exeSizeMb,omitempty"`
}
```

---

## Implementacao: `modules/device/collector.go`

```go
package device

import (
    "context"
    "fmt"
    "os"
    "path/filepath"
    "strings"
    "time"

    "golang.org/x/sys/windows/registry"
    "golang.org/x/sys/windows/svc"
    "golang.org/x/sys/windows/svc/mgr"
    "trilink/agent/internal/infra/logging"
    "trilink/agent/internal/infra/runtime"
)

type Collector struct {
    executor runtime.Executor
    logger   *logging.Logger
}

func NewCollector(executor runtime.Executor, logger *logging.Logger) *Collector {
    return &Collector{executor: executor, logger: logger}
}

// CollectMetrics coleta memoria, CPU e reboot pending em um unico script PowerShell.
// Custo: ~100-150ms por chamada.
func (c *Collector) CollectMetrics(ctx context.Context) (*AgentMetricsSnapshot, error) {
    script := `
$os  = Get-WmiObject Win32_OperatingSystem
$cpu = (Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
$rb  = [int](Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired")
"{0},{1},{2},{3}" -f [long]($os.TotalVisibleMemorySize/1KB), [long]($os.FreePhysicalMemory/1KB), [math]::Round($cpu,1), $rb
`
    out, err := c.runPS(ctx, script)
    if err != nil {
        return nil, fmt.Errorf("collect metrics: %w", err)
    }
    var totalMB, freeMB uint64
    var cpuLoad float64
    var rebootInt int
    _, err = fmt.Sscanf(strings.TrimSpace(out), "%d,%d,%f,%d", &totalMB, &freeMB, &cpuLoad, &rebootInt)
    if err != nil {
        return nil, fmt.Errorf("parse metrics output %q: %w", out, err)
    }
    usedMB := totalMB - freeMB
    usedPct := 0.0
    if totalMB > 0 {
        usedPct = float64(usedMB) / float64(totalMB) * 100
    }
    return &AgentMetricsSnapshot{
        CollectedAt:   now(),
        MemoryTotalMB: totalMB,
        MemoryUsedMB:  usedMB,
        MemoryFreeMB:  freeMB,
        MemoryUsedPct: round2(usedPct),
        CpuLoadPct:    cpuLoad,
        RebootPending: rebootInt == 1,
    }, nil
}

// RebootPending verifica a chave de registro sem PowerShell.
// Usado como alternativa ao check via WMI se ja estiver disponivel.
func (c *Collector) RebootPending() bool {
    k, err := registry.OpenKey(registry.LOCAL_MACHINE,
        `SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired`,
        registry.QUERY_VALUE)
    if err != nil {
        return false
    }
    k.Close()
    return true
}

// CollectDisks coleta volumes de disco fixo via PowerShell/WMI.
func (c *Collector) CollectDisks(ctx context.Context) (*DiskVolumeSnapshot, error) {
    script := `
Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $used = [long](($_.Size - $_.FreeSpace)/1MB)
    $free = [long]($_.FreeSpace/1MB)
    $tot  = [long]($_.Size/1MB)
    $pct  = if ($tot -gt 0) { [math]::Round($used*100/$tot,1) } else { 0 }
    "{0}|{1}|{2}|{3}|{4}|{5}" -f $_.DeviceID.Replace(':',''), $_.VolumeName, $_.FileSystem, $tot, $free, $pct
}
`
    out, err := c.runPS(ctx, script)
    if err != nil {
        return nil, fmt.Errorf("collect disks: %w", err)
    }
    snap := &DiskVolumeSnapshot{CollectedAt: now()}
    for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
        line = strings.TrimSpace(line)
        if line == "" {
            continue
        }
        var letter, label, fstype string
        var total, free uint64
        var pct float64
        parts := strings.SplitN(line, "|", 6)
        if len(parts) != 6 {
            continue
        }
        letter, label, fstype = parts[0], parts[1], parts[2]
        fmt.Sscanf(parts[3], "%d", &total)
        fmt.Sscanf(parts[4], "%d", &free)
        fmt.Sscanf(parts[5], "%f", &pct)
        snap.Volumes = append(snap.Volumes, DiskVolume{
            Letter:  letter,
            Label:   label,
            FsType:  fstype,
            TotalMB: total,
            FreeMB:  free,
            UsedMB:  total - free,
            UsedPct: pct,
        })
    }
    return snap, nil
}

// serviceDefs lista os servicos Windows monitorados em todo sync.
// ServiceName e o nome interno do SCM; DisplayName e so para exibicao no portal.
var serviceDefs = []struct {
    ServiceName string
    DisplayName string
    CompanyID   string // vazio = servico global, nao vinculado a empresa
}{
    {"FirebirdServerDefaultInstance", "Firebird Server", ""},
    {"W3SVC", "IIS (W3SVC)", ""},
    {"RustDesk", "RustDesk", ""},
    // SysproServer e adicionado dinamicamente por empresa via desired state
}

// CollectServices verifica o status dos servicos via API nativa do SCM.
// Custo: < 5ms total para todos os servicos. Zero PowerShell.
func (c *Collector) CollectServices(ctx context.Context, sysproInstalls []SysproInstallTarget) (*SysproProcessSnapshot, error) {
    m, err := mgr.Connect()
    if err != nil {
        return nil, fmt.Errorf("connect to SCM: %w", err)
    }
    defer m.Disconnect()

    snap := &SysproProcessSnapshot{CollectedAt: now()}

    // Servicos globais (Firebird, IIS, RustDesk)
    for _, def := range serviceDefs {
        status, pid := queryService(m, def.ServiceName)
        snap.Services = append(snap.Services, ServiceStatus{
            Name:        def.ServiceName,
            DisplayName: def.DisplayName,
            Status:      status,
            PID:         pid,
        })
    }

    // SysproServer: um por empresa, com deteccao em camadas
    for _, install := range sysproInstalls {
        status, pid := detectSysproServer(m, install.ServerPath)
        snap.Services = append(snap.Services, ServiceStatus{
            Name:        "SysproServer",
            DisplayName: fmt.Sprintf("SysPro Server (%s)", install.CompanyName),
            Status:      status,
            PID:         pid,
            CompanyID:   install.CompanyID,
        })
    }

    return snap, nil
}

// queryService abre o servico no SCM e retorna status e PID.
// Retorna "not_installed" sem erro se o servico nao existir.
func queryService(m *mgr.Mgr, name string) (status string, pid uint32) {
    s, err := m.OpenService(name)
    if err != nil {
        return "not_installed", 0
    }
    defer s.Close()

    q, err := s.Query()
    if err != nil {
        return "error", 0
    }
    return svcStateToString(q.State), q.ProcessId
}

// detectSysproServer tenta encontrar o servico do SysPro Server em camadas:
// 1. ServiceName fixo "SysproServer"
// 2. Busca por DisplayName contendo "syspro" (fallback para versoes com nome diferente)
// 3. Verifica se o processo SysproServer.exe esta rodando pelo path
func detectSysproServer(m *mgr.Mgr, serverPath string) (status string, pid uint32) {
    // Camada 1: ServiceName direto
    status, pid = queryService(m, "SysproServer")
    if status != "not_installed" {
        return
    }

    // Camada 2: busca por DisplayName (cobre versoes com nome diferente)
    names, err := m.ListServices()
    if err == nil {
        for _, name := range names {
            s, err := m.OpenService(name)
            if err != nil {
                continue
            }
            cfg, err := s.Config()
            s.Close()
            if err != nil {
                continue
            }
            if strings.Contains(strings.ToLower(cfg.DisplayName), "syspro") {
                status, pid = queryService(m, name)
                return
            }
        }
    }

    // Camada 3: processo pelo path do desired state
    if serverPath != "" {
        exePath := filepath.Join(serverPath, "SysproServer.exe")
        if _, err := os.Stat(exePath); err == nil {
            // Arquivo existe mas servico nao encontrado — provavelmente nao roda como servico
            return "stopped", 0
        }
        return "not_installed", 0
    }

    return "not_installed", 0
}

// CollectSysproVersions le a versao do SysproServer.exe de cada instalacao.
// Coletado a cada ~1h. Usa GetFileVersionInfoW (nativo, funciona como SYSTEM).
func (c *Collector) CollectSysproVersions(ctx context.Context, installs []SysproInstallTarget) *SysproVersionSnapshot {
    snap := &SysproVersionSnapshot{CollectedAt: now()}
    for _, install := range installs {
        info := SysproInstallInfo{
            CompanyID:   install.CompanyID,
            CompanyName: install.CompanyName,
            ServerPath:  install.ServerPath,
        }
        exePath := filepath.Join(install.ServerPath, "SysproServer.exe")
        fi, err := os.Stat(exePath)
        if err != nil {
            info.ExeExists = false
            snap.Installations = append(snap.Installations, info)
            continue
        }
        info.ExeExists = true
        info.ExeSizeMB = round2(float64(fi.Size()) / 1024 / 1024)
        info.ExeVersion = readExeVersion(ctx, exePath)
        snap.Installations = append(snap.Installations, info)
    }
    return snap
}

// readExeVersion le a versao do executavel via PowerShell.
// Alternativa nativa (GetFileVersionInfoW) pode ser implementada depois se necessario.
func (c *Collector) readExeVersion(ctx context.Context, exePath string) string {
    script := fmt.Sprintf(
        `(Get-Item '%s' -ErrorAction SilentlyContinue).VersionInfo.ProductVersion`,
        strings.ReplaceAll(exePath, "'", "''"),
    )
    out, err := c.runPS(ctx, script)
    if err != nil {
        c.logger.Warn("device: read exe version failed", "path", exePath, "error", err)
        return ""
    }
    return strings.TrimSpace(out)
}

func (c *Collector) runPS(ctx context.Context, script string) (string, error) {
    // Delega ao executor existente — mesmo padrao do remote module
    return c.executor.RunPowerShellOutput(ctx, script)
}

func svcStateToString(state svc.State) string {
    switch state {
    case svc.Running:
        return "running"
    case svc.Stopped:
        return "stopped"
    case svc.StartPending:
        return "starting"
    case svc.StopPending:
        return "stopping"
    default:
        return "unknown"
    }
}

func now() string { return time.Now().UTC().Format(time.RFC3339) }

func round2(v float64) float64 {
    return float64(int(v*100+0.5)) / 100
}
```

---

## Implementacao: `modules/device/module.go` (revisado)

```go
package device

import (
    "context"
    "sync"
    "trilink/agent/internal/domain"
    "trilink/agent/internal/infra/logging"
    "trilink/agent/internal/infra/runtime"
)

type Module struct {
    collector *Collector
    logger    *logging.Logger

    mu           sync.RWMutex
    lastMetrics  *AgentMetricsSnapshot
    lastDisks    *DiskVolumeSnapshot
    lastServices *SysproProcessSnapshot
    lastVersions *SysproVersionSnapshot

    cycleCount uint64
}

func New(executor runtime.Executor, logger *logging.Logger) *Module {
    return &Module{
        collector: NewCollector(executor, logger),
        logger:    logger,
    }
}

func (m *Module) Name() string { return "device" }

func (m *Module) Inspect(ctx context.Context) (domain.CurrentModuleState, error) {
    return domain.CurrentModuleState{Enabled: true, Status: domain.ModuleStatusReady}, nil
}

func (m *Module) Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction {
    if !desired.Device.Enabled {
        return nil
    }
    return []domain.ReconcileAction{{Module: "device", Type: "collect", Reason: "device snapshot cycle"}}
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
    if !desired.Device.Enabled {
        return domain.ApplyResult{Module: "device", Message: "disabled"}
    }

    m.cycleCount++
    installs := desired.Device.SysproInstalls

    // Servicos e metricas leves: todo ciclo (45s)
    if desired.Device.CollectMetrics {
        if metrics, err := m.collector.CollectMetrics(ctx); err != nil {
            m.logger.Warn("device: collect metrics failed", "error", err)
        } else {
            m.mu.Lock()
            m.lastMetrics = metrics
            m.mu.Unlock()
        }

        if services, err := m.collector.CollectServices(ctx, installs); err != nil {
            m.logger.Warn("device: collect services failed", "error", err)
        } else {
            m.mu.Lock()
            m.lastServices = services
            m.mu.Unlock()
        }
    }

    // Disco: a cada 4 ciclos (~3 min)
    if desired.Device.CollectInventory && m.cycleCount%4 == 0 {
        if disks, err := m.collector.CollectDisks(ctx); err != nil {
            m.logger.Warn("device: collect disks failed", "error", err)
        } else {
            m.mu.Lock()
            m.lastDisks = disks
            m.mu.Unlock()
        }
    }

    // Versao SysproServer: a cada 80 ciclos (~1h) ou na primeira coleta
    if len(installs) > 0 && (m.cycleCount%80 == 1 || m.lastVersions == nil) {
        snap := m.collector.CollectSysproVersions(ctx, installs)
        m.mu.Lock()
        m.lastVersions = snap
        m.mu.Unlock()
    }

    return domain.ApplyResult{Module: "device", Changed: true, Message: "device snapshot collected"}
}

// GetLastSnapshot retorna os ultimos snapshots coletados.
// Chamado pelo remote module antes de montar o payload de sync.
func (m *Module) GetLastSnapshot() (
    metrics *AgentMetricsSnapshot,
    disks *DiskVolumeSnapshot,
    services *SysproProcessSnapshot,
    versions *SysproVersionSnapshot,
) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    return m.lastMetrics, m.lastDisks, m.lastServices, m.lastVersions
}
```

---

## Integracao: remote module injeta snapshots no sync

Em `modules/remote/module.go`, o `runSync` precisa de acesso ao device module:

```go
// Interface — evita import circular
type DeviceSnapshotProvider interface {
    GetLastSnapshot() (
        metrics *device.AgentMetricsSnapshot,
        disks *device.DiskVolumeSnapshot,
        services *device.SysproProcessSnapshot,
        versions *device.SysproVersionSnapshot,
    )
}

func (m *Module) runSync(ctx context.Context, st *remoteState, agentToken string, intent remoteDesiredIntent) domain.ApplyResult {
    // ... codigo existente ...

    req := domain.RemoteSyncRequest{
        AgentToken:    agentToken,
        // ... campos de identidade ja existentes ...
    }

    // Injeta snapshots do device (nil-safe — primeiros ciclos ainda nao tem dado)
    if m.device != nil {
        met, disks, svc, ver := m.device.GetLastSnapshot()
        if met != nil {
            req.AgentMetrics  = met
            req.RebootPending = met.RebootPending
        }
        if disks != nil {
            req.DiskSnapshot = disks
        }
        if svc != nil {
            req.SysproProcesses = svc
        }
        if ver != nil {
            req.SystemSnapshot = ver  // reutiliza SystemSnapshot para versoes
        }
    }

    syncResp, err := m.client.Sync(ctx, req)
    // ... resto inalterado ...
}
```

---

## Integracao: bootstrap

```go
// internal/app/bootstrap.go (trecho)

deviceMod  := device.New(executor, logger)
remoteMod  := remote.New(
    remote.WithDevice(deviceMod),
    // ... outras opcoes ...
)
```

---

## Portal: endpoint de sync — VERIFICADO E JA IMPLEMENTADO

O endpoint `POST /api/remote/rustdesk/sync` ja persiste todos os campos de snapshot.
Nenhuma alteracao necessaria no portal.

**Arquivo de persistencia:** `packages/remote-infra/src/remote-domain-ports.ts`

Todos os campos sao gravados em transacao atomica:

| Payload do agente | Campo DB | Condicao de gravacao |
|------------------|----------|--------------------|
| `agentMetrics` (objeto) | `lastAgentMetrics` / `lastAgentMetricsAt` | Nao-nulo |
| `diskSnapshot` (array) | `lastDiskSnapshot` / `lastDiskSnapshotAt` | `length > 0` |
| `sysproProcesses` (array) | `lastSysproProcessSnapshot` / `lastSysproProcessSnapshotAt` | `length > 0` |
| `rebootPending` (boolean) | `lastRebootPending` / `lastRebootPendingAt` | `typeof === "boolean"` |
| `systemSnapshot` (objeto) | `lastSystemSnapshot` / `lastSystemSnapshotAt` | Nao-nulo |
| `networkSnapshot` (objeto) | `lastNetworkSnapshot` / `lastNetworkSnapshotAt` | Nao-nulo |
| `softwareSnapshot` (array) | `lastSoftwareSnapshot` / `lastSoftwareSnapshotAt` | `length > 0` |
| `hardwareIdentity` (objeto) | `lastHardwareIdentity` / `lastHardwareIdentityAt` | Nao-nulo |
| `windowsUpdateStatus` (objeto) | `lastWindowsUpdateStatus` / `lastWindowsUpdateStatusAt` | Nao-nulo |

### Regras de normalizacao — CRITICO

O portal normaliza cada campo antes de persistir via `process-sync.use-case.ts`:

- Campos que o portal espera como **objeto** (`Record`): `agentMetrics`, `systemSnapshot`, `hardwareIdentity`, `networkSnapshot`, `windowsUpdateStatus`
  - Funcao: `normalizeOptionalRecordWithWarning` — rejeita arrays, strings, numeros
- Campos que o portal espera como **array de objetos**: `diskSnapshot`, `sysproProcesses`, `softwareSnapshot`
  - Funcao: `normalizeOptionalRecordArrayWithWarning` — rejeita qualquer nao-array; limite de 200 itens
- Campo `rebootPending`: espera **boolean**
  - Funcao: `normalizeOptionalBooleanWithWarning` — aceita `true`/`false`, rejeita strings arbitrarias

**Se o formato estiver errado, o campo e descartado com warning `SYNC_INVALID_*` e a sync continua sem erro.**

### Formato correto que o agente envia (apos correcao)

O agente envia os arrays internos dos structs — NAO os structs wrapper com `collectedAt`:

```
RemoteSyncRequest.DiskSnapshot    = disks.Volumes    // []DiskVolume  (array) ✅
RemoteSyncRequest.SysproProcesses = services.Services // []ServiceStatus (array) ✅
RemoteSyncRequest.AgentMetrics    = metrics           // *AgentMetricsSnapshot (objeto) ✅
RemoteSyncRequest.SystemSnapshot  = versions          // *SysproVersionSnapshot (objeto) ✅
RemoteSyncRequest.RebootPending   = &bool             // boolean JSON ✅
```

O `collectedAt` dos structs de disco e servicos nao e enviado — o portal registra seu proprio timestamp via `heartbeatAt`.

### Teste existente que valida o comportamento de rejeicao

`packages/remote-domain/tests/agent-token-lifecycle.test.ts`:

```typescript
// Formato ERRADO (como o agente enviava ANTES da correcao):
diskSnapshot: { drive: "C" }  // objeto em vez de array
sysproProcesses: "invalid"     // string em vez de array
// Resultado: SYNC_INVALID_DISK_SNAPSHOT e SYNC_INVALID_SYSPRO_PROCESSES warnings; campos descartados
```

---

## Portal web: exibicao das metricas

### Pagina de detalhe do host

Campos ja lidos (expandir exibicao):

- **Card de recursos:** barra horizontal com Memoria (total / usado / livre em GB) e gauge de CPU
- **Card de discos:** tabela com coluna por unidade — Letra, Label, Total, Livre, % usado, alerta visual se > 85%
- **Card de servicos:** lista com badge colorido: `running` = verde, `stopped` = vermelho, `not_installed` = cinza
  - Firebird, SysPro Server (por empresa), IIS, RustDesk
- **Banner de reboot pendente:** faixa amarela se `lastRebootPending = true`
- **Card de versoes SysPro:** por empresa — path, versao do exe, status de existencia

### Alertas automaticos sugeridos (portal)

| Condicao | Severidade | Mensagem |
|----------|-----------|---------|
| `memoryUsedPct > 90` | warning | Memoria acima de 90% |
| `diskUsedPct > 85` em qualquer volume | warning | Disco {letra} com menos de 15% livre |
| `diskUsedPct > 95` em qualquer volume | critical | Disco {letra} com menos de 5% livre |
| SysproServer `stopped` | critical | SysPro Server parado |
| Firebird `stopped` | critical | Firebird parado |
| `rebootPending = true` | info | Reinicializacao pendente |

---

## Ordem de implementacao — Step 1

O step 1 consiste em criar os tipos e o collector de servicos (que e o dado mais critico
e o mais simples de implementar — zero PowerShell):

**Arquivos a criar/modificar:**

1. `internal/domain/module_state.go` — adicionar `SysproInstallTarget` e campo `SysproInstalls` no `DeviceDesiredState`
2. `apps/agent/internal/modules/device/types.go` — definir todos os tipos de snapshot
3. `apps/agent/internal/modules/device/collector.go` — implementar `CollectServices` (SCM nativo)
4. `apps/agent/internal/modules/device/module.go` — substituir stub, expor `GetLastSnapshot`
5. `apps/agent/internal/modules/remote/module.go` — adicionar `DeviceSnapshotProvider`, injetar no `runSync`
6. `apps/agent/internal/app/bootstrap.go` — injetar `deviceMod` no `RemoteModule`

**Verificacoes antes de codar:**

```powershell
# 1. Confirmar ServiceName do SysPro Server em producao
Get-Service | Where-Object { $_.DisplayName -like '*Syspro*' -or $_.Name -like '*Syspro*' } |
    Select-Object Name, DisplayName, Status, StartType

# 2. Confirmar nome do servico Firebird
Get-Service | Where-Object { $_.DisplayName -like '*firebird*' } |
    Select-Object Name, DisplayName, Status

# 3. Verificar se IIS esta instalado
Get-Service W3SVC -ErrorAction SilentlyContinue
```

---

## Riscos e mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| ServiceName do SysproServer variavel por versao | Deteccao em 3 camadas: ServiceName fixo + DisplayName glob + processo pelo path |
| PowerShell lento em maquinas travadas | Timeout de 10s em cada chamada `runPS`; falha e logada mas nao bloqueia sync |
| `GetLastSnapshot` retorna nil nos primeiros ciclos | `runSync` checa nil antes de injetar — comportamento correto |
| Maquina com Syspro mas sem desired state atualizado | `SysproInstalls` vazio: agente monitora servicos globais mas nao SysproServer |
| Lock de leitura (`sync.RWMutex`) em alto paralelismo | Coleta e feita em goroutine do reconcile; leitura e feita no mesmo goroutine — na pratica sem contencao |
| `CollectServices` lento se SCM estiver ocupado | Timeout via `ctx` herdado do ciclo de reconcile (45s total) |
