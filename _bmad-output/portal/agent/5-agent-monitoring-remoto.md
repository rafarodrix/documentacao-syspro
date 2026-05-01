# Master Agent Trilink - Monitoramento remoto da maquina

Criado em 2026-05-01.

## Objetivo

Implementar coleta real de metricas do sistema operacional Windows no `modules/device` e transmiti-las ao portal via payload de sync, permitindo que o operador visualize no portal o estado atual de cada maquina gerenciada: uso de memoria, carga de CPU, espaco em disco por unidade, e status dos servicos criticos (Firebird, SysPro Server, IIS).

## Estado atual

### O que ja existe (nao precisa criar)

**Contrato de sync (agent-side):** `internal/domain/remote_contracts.go`

O `RemoteSyncRequest` ja possui todos os campos de destino como `any`:

```go
type RemoteSyncRequest struct {
    // ... campos de identidade ja populados ...
    SysproUpdates       any `json:"sysproUpdates,omitempty"`
    SystemSnapshot      any `json:"systemSnapshot,omitempty"`
    NetworkSnapshot     any `json:"networkSnapshot,omitempty"`
    SoftwareSnapshot    any `json:"softwareSnapshot,omitempty"`
    HardwareIdentity    any `json:"hardwareIdentity,omitempty"`
    DiskSnapshot        any `json:"diskSnapshot,omitempty"`
    SysproProcesses     any `json:"sysproProcesses,omitempty"`
    WindowsUpdateStatus any `json:"windowsUpdateStatus,omitempty"`
    RebootPending       any `json:"rebootPending,omitempty"`
    AgentMetrics        any `json:"agentMetrics,omitempty"`
}
```

**Schema do portal (DB):** `packages/database/prisma/schema.prisma`

O modelo `RemoteHost` ja tem colunas para receber tudo:

```prisma
lastSystemSnapshot          Json?
lastSystemSnapshotAt        DateTime?
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
```

**Desired state:** `DeviceDesiredState` ja tem:

```go
type DeviceDesiredState struct {
    Enabled          bool `json:"enabled"`
    CollectInventory bool `json:"collect_inventory"`
    CollectMetrics   bool `json:"collect_metrics"`
}
```

**Padrao PowerShell:** `modules/remote/rustdesk.go` ja usa `runPowerShellOutput` — mesmo padrao a ser usado para coletar metricas.

### O que nao existe (precisa implementar)

- `modules/device/module.go` e um stub que retorna mensagem fixa. Nao ha coleta real.
- `runSync` em `modules/remote/module.go` nao injeta os campos de snapshot no `RemoteSyncRequest`.
- O portal precisa ser verificado para confirmar que o endpoint `/sync` de fato persiste todos os campos (provavelmente ja faz, pois os campos do schema existem).

## Arquitetura da solucao

### Responsabilidade de cada camada

```
modules/device/
  module.go         <- coleta metricas via PowerShell/WMI
  collector.go      <- logica de coleta isolada e testavel
  types.go          <- structs tipadas para cada snapshot

modules/remote/
  module.go         <- runSync injeta snapshots do device no RemoteSyncRequest
```

O fluxo no reconcile permanece o mesmo: `Inspect -> Plan -> Apply`. O modulo `device` coleta durante o `Apply`. Os dados coletados ficam disponives para o `remote.runSync` via um campo compartilhado ou via IPC-store.

### Mecanismo de compartilhamento device -> remote

Opcao recomendada: o `modules/device` armazena o ultimo snapshot coletado em `device_state.json` (ja previsto no `3-arquitetura-agent-modular.md`). O `remote.runSync` le esse arquivo antes de montar o payload.

Alternativa mais simples para comecar: o `agent.Service` injeta uma referencia ao `DeviceModule` no `RemoteModule`, que chama `device.GetLastSnapshot()` sincronamente antes de montar o request. Sem I/O extra, sem arquivo adicional na fase inicial.

Decisao: comecar com injecao direta (referencia de modulo para modulo) e migrar para arquivo de estado se houver necessidade de desacoplar.

## Estrutura de tipos

### AgentMetricsSnapshot (campo `agentMetrics`)

Resumo leve enviado em todo sync. Ideal para alertas rapidos no portal.

```go
// internal/modules/device/types.go

type AgentMetricsSnapshot struct {
    CollectedAt     string  `json:"collectedAt"`       // RFC3339
    MemoryTotalMB   uint64  `json:"memoryTotalMb"`
    MemoryUsedMB    uint64  `json:"memoryUsedMb"`
    MemoryFreeMB    uint64  `json:"memoryFreeMb"`
    MemoryUsedPct   float64 `json:"memoryUsedPct"`
    CpuLoadPct      float64 `json:"cpuLoadPct"`        // media dos nucleos, 0-100
    RebootPending   bool    `json:"rebootPending"`
}
```

### DiskVolumeSnapshot (campo `diskSnapshot`)

Array com uma entrada por volume montado.

```go
type DiskVolumeSnapshot struct {
    CollectedAt  string  `json:"collectedAt"`
    Volumes      []DiskVolume `json:"volumes"`
}

type DiskVolume struct {
    Letter    string  `json:"letter"`     // "C", "D", ...
    Label     string  `json:"label"`      // nome do volume
    FsType    string  `json:"fsType"`     // "NTFS", "FAT32"
    TotalMB   uint64  `json:"totalMb"`
    FreeMB    uint64  `json:"freeMb"`
    UsedMB    uint64  `json:"usedMb"`
    UsedPct   float64 `json:"usedPct"`
}
```

### SysproProcessSnapshot (campo `sysproProcesses`)

Status dos servicos Windows criticos monitorados.

```go
type SysproProcessSnapshot struct {
    CollectedAt string          `json:"collectedAt"`
    Services    []ServiceStatus `json:"services"`
}

type ServiceStatus struct {
    Name        string `json:"name"`         // nome interno do servico Windows
    DisplayName string `json:"displayName"`  // nome amigavel
    Status      string `json:"status"`       // "running", "stopped", "not_installed", "error"
    PID         int    `json:"pid,omitempty"`
}
```

## Servicos monitorados

| Servico | Nome do servico Windows | Quando monitorar |
|---------|------------------------|-----------------|
| Firebird | `FirebirdServerDefaultInstance` ou `Firebird*` (glob) | Sempre |
| SysPro Server | `SysproServer` (confirmar nome exato em campo) | Sempre |
| IIS (W3SVC) | `W3SVC` | Quando IIS estiver instalado |
| RustDesk | `RustDesk` | Sempre (ja monitorado no remote module; incluir aqui para consolidar) |

O nome exato do servico do SysPro Server precisa ser confirmado em uma maquina de producao. Se houver variacao por versao, usar `Get-Service -DisplayName 'Syspro*'` com fallback.

## Implementacao: `modules/device/collector.go`

```go
package device

import (
    "context"
    "fmt"
    "strconv"
    "strings"
    "time"
    "trilink/agent/internal/infra/runtime"
)

type Collector struct {
    executor runtime.Executor
}

func NewCollector(executor runtime.Executor) *Collector {
    return &Collector{executor: executor}
}

// CollectMetrics coleta memoria, CPU e reboot pending via WMI.
func (c *Collector) CollectMetrics(ctx context.Context) (*AgentMetricsSnapshot, error) {
    // Script PowerShell unico para reduzir numero de subprocessos.
    // Retorna CSV: totalMB,freeMB,cpuLoad,rebootPending
    script := `
$os   = Get-WmiObject Win32_OperatingSystem
$cpu  = (Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
$rb   = Test-Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired"
"{0},{1},{2},{3}" -f [math]::Round($os.TotalVisibleMemorySize/1024), [math]::Round($os.FreePhysicalMemory/1024), [math]::Round($cpu,1), $rb.ToString().ToLower()
`
    out, err := c.executor.RunPowerShellOutput(ctx, script)
    if err != nil {
        return nil, fmt.Errorf("collect metrics: %w", err)
    }
    parts := strings.Split(strings.TrimSpace(out), ",")
    if len(parts) != 4 {
        return nil, fmt.Errorf("collect metrics: unexpected output %q", out)
    }
    totalMB, _  := strconv.ParseUint(parts[0], 10, 64)
    freeMB, _   := strconv.ParseUint(parts[1], 10, 64)
    cpuLoad, _  := strconv.ParseFloat(parts[2], 64)
    reboot      := parts[3] == "true"
    usedMB      := totalMB - freeMB
    usedPct     := 0.0
    if totalMB > 0 {
        usedPct = float64(usedMB) / float64(totalMB) * 100
    }
    return &AgentMetricsSnapshot{
        CollectedAt:   time.Now().UTC().Format(time.RFC3339),
        MemoryTotalMB: totalMB,
        MemoryUsedMB:  usedMB,
        MemoryFreeMB:  freeMB,
        MemoryUsedPct: usedPct,
        CpuLoadPct:    cpuLoad,
        RebootPending: reboot,
    }, nil
}

// CollectDisks coleta volumes de disco via WMI.
func (c *Collector) CollectDisks(ctx context.Context) (*DiskVolumeSnapshot, error) {
    script := `
Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $usedMB = [math]::Round(($_.Size - $_.FreeSpace)/1MB)
    $freeMB = [math]::Round($_.FreeSpace/1MB)
    $totMB  = [math]::Round($_.Size/1MB)
    $pct    = if ($totMB -gt 0) { [math]::Round($usedMB*100/$totMB,1) } else { 0 }
    "{0}|{1}|{2}|{3}|{4}|{5}" -f $_.DeviceID.Replace(':',''), $_.VolumeName, $_.FileSystem, $totMB, $freeMB, $pct
}
`
    out, err := c.executor.RunPowerShellOutput(ctx, script)
    if err != nil {
        return nil, fmt.Errorf("collect disks: %w", err)
    }
    snap := &DiskVolumeSnapshot{CollectedAt: time.Now().UTC().Format(time.RFC3339)}
    for _, line := range strings.Split(strings.TrimSpace(out), "\n") {
        line = strings.TrimSpace(line)
        if line == "" {
            continue
        }
        p := strings.Split(line, "|")
        if len(p) != 6 {
            continue
        }
        total, _ := strconv.ParseUint(p[3], 10, 64)
        free, _  := strconv.ParseUint(p[4], 10, 64)
        pct, _   := strconv.ParseFloat(p[5], 64)
        snap.Volumes = append(snap.Volumes, DiskVolume{
            Letter:  p[0],
            Label:   p[1],
            FsType:  p[2],
            TotalMB: total,
            FreeMB:  free,
            UsedMB:  total - free,
            UsedPct: pct,
        })
    }
    return snap, nil
}

// servicesToCheck lista os servicos Windows que o agente deve monitorar.
// O campo Name e o ServiceName do SCM; DisplayName e so para exibicao.
var servicesToCheck = []struct{ Name, DisplayName string }{
    {"FirebirdServerDefaultInstance", "Firebird Server"},
    {"SysproServer", "SysPro Server"},
    {"W3SVC", "IIS (W3SVC)"},
    {"RustDesk", "RustDesk"},
}

// CollectServices verifica o status de cada servico via Get-Service.
func (c *Collector) CollectServices(ctx context.Context) (*SysproProcessSnapshot, error) {
    snap := &SysproProcessSnapshot{CollectedAt: time.Now().UTC().Format(time.RFC3339)}
    for _, svc := range servicesToCheck {
        status, pid, err := c.queryService(ctx, svc.Name)
        if err != nil {
            status = "error"
        }
        snap.Services = append(snap.Services, ServiceStatus{
            Name:        svc.Name,
            DisplayName: svc.DisplayName,
            Status:      status,
            PID:         pid,
        })
    }
    return snap, nil
}

func (c *Collector) queryService(ctx context.Context, name string) (status string, pid int, err error) {
    script := fmt.Sprintf(`
$svc = Get-Service -Name '%s' -ErrorAction SilentlyContinue
if ($null -eq $svc) { "not_installed|0"; return }
$wmi = Get-WmiObject Win32_Service -Filter "Name='%s'" -ErrorAction SilentlyContinue
$pid = if ($wmi) { $wmi.ProcessId } else { 0 }
"{0}|{1}" -f $svc.Status.ToString().ToLowerInvariant(), $pid
`, name, name)
    out, err := c.executor.RunPowerShellOutput(ctx, script)
    if err != nil {
        return "error", 0, err
    }
    parts := strings.Split(strings.TrimSpace(out), "|")
    if len(parts) != 2 {
        return "error", 0, fmt.Errorf("unexpected output: %q", out)
    }
    pidVal, _ := strconv.Atoi(parts[1])
    return parts[0], pidVal, nil
}
```

## Implementacao: `modules/device/module.go` (revisado)

```go
package device

import (
    "context"
    "trilink/agent/internal/domain"
    "trilink/agent/internal/infra/logging"
    "trilink/agent/internal/infra/runtime"
)

type Module struct {
    collector    *Collector
    logger       *logging.Logger
    lastMetrics  *AgentMetricsSnapshot
    lastDisks    *DiskVolumeSnapshot
    lastServices *SysproProcessSnapshot
}

func New(executor runtime.Executor, logger *logging.Logger) *Module {
    return &Module{
        collector: NewCollector(executor),
        logger:    logger,
    }
}

func (m *Module) Name() string { return "device" }

func (m *Module) Inspect(ctx context.Context) (domain.CurrentModuleState, error) {
    return domain.CurrentModuleState{
        Enabled: true,
        Status:  domain.ModuleStatusReady,
    }, nil
}

func (m *Module) Plan(desired domain.DesiredState, current domain.CurrentModuleState) []domain.ReconcileAction {
    if !desired.Device.Enabled {
        return nil
    }
    actions := []domain.ReconcileAction{}
    if desired.Device.CollectMetrics {
        actions = append(actions, domain.ReconcileAction{
            Module: "device",
            Type:   "collect_metrics",
            Reason: "collect system metrics and service status",
        })
    }
    if desired.Device.CollectInventory {
        actions = append(actions, domain.ReconcileAction{
            Module: "device",
            Type:   "collect_inventory",
            Reason: "collect disk inventory",
        })
    }
    return actions
}

func (m *Module) Apply(ctx context.Context, desired domain.DesiredState, current domain.CurrentModuleState) domain.ApplyResult {
    if !desired.Device.Enabled {
        return domain.ApplyResult{Module: "device", Changed: false, Message: "device module disabled"}
    }
    changed := false
    if desired.Device.CollectMetrics {
        metrics, err := m.collector.CollectMetrics(ctx)
        if err != nil {
            m.logger.Warn("device: collect metrics failed", "error", err)
        } else {
            m.lastMetrics = metrics
            changed = true
        }
        services, err := m.collector.CollectServices(ctx)
        if err != nil {
            m.logger.Warn("device: collect services failed", "error", err)
        } else {
            m.lastServices = services
            changed = true
        }
    }
    if desired.Device.CollectInventory {
        disks, err := m.collector.CollectDisks(ctx)
        if err != nil {
            m.logger.Warn("device: collect disks failed", "error", err)
        } else {
            m.lastDisks = disks
            changed = true
        }
    }
    return domain.ApplyResult{Module: "device", Changed: changed, Message: "device snapshot collected"}
}

// GetLastSnapshot retorna os ultimos snapshots coletados para injecao no sync payload.
// Retorna nil em cada campo se ainda nao houver coleta.
func (m *Module) GetLastSnapshot() (metrics *AgentMetricsSnapshot, disks *DiskVolumeSnapshot, services *SysproProcessSnapshot) {
    return m.lastMetrics, m.lastDisks, m.lastServices
}
```

## Integracao com o remote module

Em `modules/remote/module.go`, o `runSync` precisa receber referencia ao `DeviceModule` e injetar os snapshots:

```go
// modules/remote/module.go

type Module struct {
    // ... campos existentes ...
    device DeviceSnapshotProvider  // novo campo
}

type DeviceSnapshotProvider interface {
    GetLastSnapshot() (metrics *device.AgentMetricsSnapshot, disks *device.DiskVolumeSnapshot, services *device.SysproProcessSnapshot)
}

func (m *Module) runSync(ctx context.Context, st *remoteState, agentToken string, intent remoteDesiredIntent) domain.ApplyResult {
    // ... codigo existente ate o Sync call ...

    req := domain.RemoteSyncRequest{
        AgentToken:    agentToken,
        RustDeskID:    st.RustDeskID,
        MachineName:   hostname,
        AgentVersion:  m.agentVersion,
        // ... campos existentes ...
    }

    // Injeta snapshots do device se disponivel
    if m.device != nil {
        metrics, disks, services := m.device.GetLastSnapshot()
        if metrics != nil {
            req.AgentMetrics   = metrics
            req.RebootPending  = metrics.RebootPending
        }
        if disks != nil {
            req.DiskSnapshot = disks
        }
        if services != nil {
            req.SysproProcesses = services
        }
    }

    syncResp, err := m.client.Sync(ctx, req)
    // ... resto do codigo existente ...
}
```

## Integracao no bootstrap

Em `internal/app/bootstrap.go`, o `DeviceModule` precisa receber o executor e ser injetado no `RemoteModule`:

```go
// bootstrap.go (trecho relevante)

deviceMod := device.New(executor, logger)
remoteMod := remote.New(
    remote.WithClient(portalClient),
    remote.WithDevice(deviceMod),  // injecao via option
    // ... outras options ...
)
```

## Frequencia de coleta

| Snapshot | Frequencia | Justificativa |
|----------|-----------|---------------|
| `AgentMetrics` (memoria, CPU) | Todo ciclo de sync (45s) | Dado leve, muda frequentemente |
| `DiskSnapshot` | A cada 5 ciclos (~3.75min) | Dado medio, muda lentamente |
| `SysproProcesses` (servicos) | Todo ciclo de sync (45s) | Essencial detectar servico parado rapidamente |
| `RebootPending` | Todo ciclo de sync (45s) | Muda raramente mas impacto alto |

Implementacao inicial: coletar tudo em todo ciclo para simplicidade. Otimizar com throttle por contagem de ciclos se o overhead de PowerShell for perceptivel.

## Portal: verificacao do endpoint sync

O endpoint `POST /api/remote/rustdesk/sync` precisa ser verificado para confirmar que persiste os campos de snapshot. Esperado (pois as colunas ja existem no schema):

```typescript
// Trecho esperado no remote-admin.service.ts ou equivalente
await prisma.remoteHost.update({
    where: { id: host.id },
    data: {
        lastAgentMetrics:           payload.agentMetrics   ?? undefined,
        lastAgentMetricsAt:         payload.agentMetrics   ? new Date() : undefined,
        lastDiskSnapshot:           payload.diskSnapshot   ?? undefined,
        lastDiskSnapshotAt:         payload.diskSnapshot   ? new Date() : undefined,
        lastSysproProcessSnapshot:  payload.sysproProcesses ?? undefined,
        lastSysproProcessSnapshotAt: payload.sysproProcesses ? new Date() : undefined,
        lastRebootPending:          typeof payload.rebootPending === 'boolean' ? payload.rebootPending : undefined,
        lastRebootPendingAt:        typeof payload.rebootPending === 'boolean' ? new Date() : undefined,
    }
})
```

Se o endpoint ainda nao persiste esses campos, adicionar o `update` acima ao handler de sync.

## Portal web: exibicao das metricas

### Pagina de detalhe do host (`/portal/infraestrutura/hosts/[hostId]`)

Ja exibe `cpuLoad` e `diskFree` via `lastAgentMetrics`. Expandir para:

- **Card de recursos:** Memoria (barra de progresso total/usado/livre), CPU (gauge)
- **Card de discos:** Tabela com uma linha por volume (letra, label, total, livre, % usado, alerta visual se > 85%)
- **Card de servicos:** Lista com badge colorido por status: Firebird, SysPro Server, IIS, RustDesk
- **Indicador de reboot pendente:** Banner de aviso se `lastRebootPending = true`

### Pagina de detalhe do agente (`/portal/infraestrutura/agentes/[deviceId]`)

Ainda nao existe. Quando criada, incluir os mesmos cards acima lendo dos campos do `RemoteHost` vinculado.

## Definicao dos nomes de servico

Os nomes de servico Windows precisam ser confirmados antes de codar. Procedimento:

```powershell
# Executar em maquina de producao com Firebird
Get-Service | Where-Object { $_.DisplayName -like '*firebird*' -or $_.DisplayName -like '*syspro*' } | Select-Object Name, DisplayName, Status
```

Nomes esperados (confirmar):

| Produto | ServiceName esperado |
|---------|---------------------|
| Firebird 2.5 | `FirebirdServerDefaultInstance` |
| Firebird 3.x | `FirebirdServerDefaultInstance` ou `Firebird_3` |
| SysPro Server | `SysproServer` — confirmar |
| IIS | `W3SVC` — padrao Microsoft, estavel |

Se o servico do Firebird tiver nome variavel por versao, usar pesquisa por DisplayName com glob no PowerShell:
```powershell
Get-Service | Where-Object { $_.DisplayName -like 'Firebird*' }
```

## Ordem de implementacao sugerida

1. **`modules/device/types.go`**: Definir `AgentMetricsSnapshot`, `DiskVolumeSnapshot`, `DiskVolume`, `SysproProcessSnapshot`, `ServiceStatus`
2. **`modules/device/collector.go`**: Implementar `CollectMetrics`, `CollectDisks`, `CollectServices` com PowerShell
3. **`modules/device/module.go`**: Substituir stub atual pela implementacao real com `GetLastSnapshot()`
4. **`modules/remote/module.go`**: Adicionar `DeviceSnapshotProvider`, injetar snapshots no `runSync`
5. **`internal/app/bootstrap.go`**: Injetar `deviceMod` no `RemoteModule`
6. **Portal sync endpoint**: Verificar e complementar persistencia dos campos de snapshot
7. **Portal web host-details-page**: Expandir cards de metricas
8. **Testes**: Adicionar testes unitarios para `collector.go` com fake executor

## Riscos e mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| PowerShell lento em maquinas travadas | Timeout curto no RunPowerShellOutput (ex: 10s por coleta) |
| Nome do servico SysPro variavel | Confirmar em campo antes de codar; usar DisplayName como fallback |
| Dados de disco stale se disco desconectado | WMI DriveType=3 retorna apenas discos locais fixos; ok |
| Overhead de subprocessos PowerShell multiplos | Consolidar coletas em um unico script PowerShell por tipo |
| `GetLastSnapshot` retorna nil no primeiro ciclo | `runSync` ja trata nil com checagem before inject |
