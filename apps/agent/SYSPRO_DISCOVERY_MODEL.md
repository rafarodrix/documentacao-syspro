# Modelo de Descoberta Syspro

Data de corte: 2026-07-17

## Objetivo

O agent deixou de tratar `C:\Syspro` como uma instalacao unica. O runtime agora
descobre grupos e instancias reais do Syspro no host e so habilita
diagnosticos profundos quando existe uma instancia validada de
`SysproServer.exe`.

## Desired state

O portal projeta apenas hints de descoberta:

```json
{
  "device": {
    "syspro_installation_hints": [
      {
        "company_id": "company-1",
        "company_name": "Empresa A",
        "path": "C:\\Syspro\\Server"
      }
    ]
  }
}
```

Esses hints orientam a descoberta local. Eles nao validam a instalacao por si
so.

## Snapshot local

O snapshot Syspro sincronizado pelo agent passou a expor:

```text
machineRole
validatedServerCount
installationGroups[]
```

`machineRole` pode assumir:

```text
SERVER
CLIENT
MIXED
PARTIAL
UNKNOWN
```

## Installation group

Cada grupo representa uma raiz descoberta no host:

```json
{
  "id": "C:\\Syspro",
  "rootPath": "C:\\Syspro",
  "classification": "MIXED",
  "roles": ["CLIENT", "SERVER"],
  "sharedDirectories": ["C:\\Syspro\\Dlls"],
  "clientInstances": [],
  "serverInstances": []
}
```

O grupo pode conter:

- `clientInstances[]`
- `serverInstances[]`
- `sharedDirectories[]`
- `discoveryEvidence[]`

## Server instance

Cada `SysproServer.exe` validado gera uma instancia separada:

```json
{
  "rootPath": "C:\\Syspro\\Server",
  "executablePath": "C:\\Syspro\\Server\\SysproServer.exe",
  "configurationPath": "C:\\Syspro\\Server\\SysproServer.ini",
  "isapiDllPath": "C:\\Syspro\\Server\\SysproServerISAPI.dll",
  "validation": {
    "status": "VALIDATED",
    "evidence": [
      "SYSPRO_SERVER_EXECUTABLE",
      "SYSPRO_SERVER_INI",
      "SYSPRO_SERVER_ISAPI_DLL"
    ]
  }
}
```

O diagnostico profundo do servidor so roda quando a validacao esta em
`VALIDATED`.

## Versao e data de atualizacao

O agent usa a seguinte ordem:

1. `ProductVersion` do `SysproServer.exe`
2. `FileVersion` do `SysproServer.exe`
3. manifesto `syspro-installation.json`, se existir
4. timestamp dos binarios centrais (`SysproServer.exe` e `SysproServerISAPI.dll`)

O agent nao usa timestamp da pasta inteira como verdade de atualizacao.

## Beneficios

- remove o acoplamento anterior a um `server_path` unico
- suporta maquinas apenas cliente, apenas servidor ou mistas
- suporta instalacoes parciais
- suporta mais de um `SysproServer.exe` no mesmo host
- separa hint projetado pelo portal de instalacao realmente validada
