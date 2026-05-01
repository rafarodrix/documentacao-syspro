//go:build windows

package device

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/sys/windows/registry"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

// rebootPending verifica se ha reinicializacao pendente via chave de registro Windows.
// Zero PowerShell — leitura direta do registro via golang.org/x/sys/windows/registry.
func (c *Collector) rebootPending() bool {
	k, err := registry.OpenKey(registry.LOCAL_MACHINE,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired`,
		registry.QUERY_VALUE)
	if err != nil {
		return false
	}
	k.Close()
	return true
}

// CollectServices verifica o status dos servicos Windows via API nativa do SCM.
// Custo total: < 5ms para todos os servicos. Zero PowerShell.
//
// Servicos globais monitorados (sempre): Firebird, IIS (W3SVC), RustDesk.
// Servicos por empresa: SysproServer — um por entrada em sysproInstalls.
func (c *Collector) CollectServices(sysproInstalls []SysproInstallTarget) (*SysproProcessSnapshot, error) {
	m, err := mgr.Connect()
	if err != nil {
		return nil, fmt.Errorf("connect to SCM: %w", err)
	}
	defer m.Disconnect()

	snap := &SysproProcessSnapshot{CollectedAt: nowRFC3339()}

	// Servicos globais — sem vinculo de empresa
	globals := []struct {
		ServiceName string
		DisplayName string
	}{
		{"FirebirdServerDefaultInstance", "Firebird Server"},
		{"W3SVC", "IIS (W3SVC)"},
		{"RustDesk", "RustDesk"},
	}
	for _, g := range globals {
		status, pid := queryService(m, g.ServiceName)
		snap.Services = append(snap.Services, ServiceStatus{
			Name:        g.ServiceName,
			DisplayName: g.DisplayName,
			Status:      status,
			PID:         pid,
		})
	}

	// SysproServer — um por empresa com deteccao em camadas
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

// queryService abre um servico no SCM e retorna seu estado e PID.
// Retorna "not_installed" (sem erro) se o servico nao existir no SCM.
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

// detectSysproServer localiza o servico do SysPro Server em tres camadas:
//  1. ServiceName fixo "SysproServer" (nome mais comum)
//  2. Busca por DisplayName contendo "syspro" (cobre versoes com nome diferente)
//  3. Verifica existencia do SysproServer.exe no serverPath (servico nao registrado)
//
// IMPORTANTE: confirmar o ServiceName exato em producao antes de codar:
//
//	Get-Service | Where-Object { $_.DisplayName -like '*Syspro*' } | Select-Object Name, DisplayName
func detectSysproServer(m *mgr.Mgr, serverPath string) (status string, pid uint32) {
	// Camada 1: ServiceName direto
	status, pid = queryService(m, "SysproServer")
	if status != "not_installed" {
		return
	}

	// Camada 2: busca por DisplayName contendo "syspro" (case-insensitive)
	names, err := m.ListServices()
	if err == nil {
		for _, name := range names {
			s, err := m.OpenService(name)
			if err != nil {
				continue
			}
			cfg, cfgErr := s.Config()
			s.Close()
			if cfgErr != nil {
				continue
			}
			if strings.Contains(strings.ToLower(cfg.DisplayName), "syspro") {
				status, pid = queryService(m, name)
				return
			}
		}
	}

	// Camada 3: verifica existencia do exe no path do desired state
	if serverPath != "" {
		exePath := filepath.Join(serverPath, "SysproServer.exe")
		if _, statErr := os.Stat(exePath); statErr == nil {
			// Exe existe mas nao esta registrado como servico Windows
			return "stopped", 0
		}
		return "not_installed", 0
	}

	return "not_installed", 0
}

// svcStateToString converte o estado do SCM para string padronizada.
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
