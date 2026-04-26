#define MyAppName "Agente Trilink"
#define MyAppPublisher "Trilink Software"
#define MyAppVersion "1.0.0"
#define MyAppAssocName MyAppName + " Runtime"
#define SourceDir "..\..\dist\windows-installer\staging"
#define ServiceName "TrillinkAgent"

[Setup]
AppId={{8F4D6C55-96D8-4B9A-AB32-4DCA167A8D36}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Trilink\Agente
DefaultGroupName={#MyAppName}
UninstallDisplayIcon={app}\icon.ico
SetupIconFile={#SourceDir}\icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
DisableDirPage=no
DisableProgramGroupPage=yes
OutputDir=..\..\dist\windows-installer\output
OutputBaseFilename=agente-trilink-setup

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na area de trabalho"; GroupDescription: "Atalhos"

[Dirs]
Name: "{commonappdata}\Trilink\Agent"
Name: "{commonappdata}\Trilink\Agent\runtime-state"
Name: "{commonappdata}\Trilink\Agent\runtime-state\logs"

[Files]
Source: "{#SourceDir}\agent-service.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\agent-ui.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\start-agent.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\start-agent.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\stop-agent.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\stop-agent.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\open-config.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\open-logs.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\ensure-webview2-runtime.ps1"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\config\.env.example"; DestDir: "{app}\config"; Flags: ignoreversion
Source: "{#SourceDir}\config\.env"; DestDir: "{app}\config"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#SourceDir}\README-installer.txt"; DestDir: "{app}"; DestName: "LEIA-ME.txt"; Flags: ignoreversion
Source: "{#SourceDir}\rustdesk\*"; DestDir: "{app}\rustdesk"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

[Icons]
Name: "{group}\Iniciar Interface do Agente"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start-agent.ps1"""; WorkingDir: "{app}"
Name: "{group}\Parar Interface do Agente"; Filename: "{app}\scripts\stop-agent.cmd"; WorkingDir: "{app}"
Name: "{group}\Editar configuracao"; Filename: "{app}\scripts\open-config.cmd"; WorkingDir: "{app}"
Name: "{group}\Abrir logs"; Filename: "{app}\scripts\open-logs.cmd"; WorkingDir: "{app}"
Name: "{group}\Verificar WebView2 Runtime"; Filename: "{cmd}"; Parameters: "/c powershell -ExecutionPolicy Bypass -File ""{app}\scripts\ensure-webview2-runtime.ps1"""; WorkingDir: "{app}"
Name: "{autodesktop}\Agente Trilink"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start-agent.ps1"""; WorkingDir: "{app}"; Tasks: desktopicon

; start-agent.cmd ensures the service and IPC are ready before opening the UI
Name: "{commonstartup}\Agente Trilink UI"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start-agent.ps1"""; WorkingDir: "{app}"

[Run]
; 1. Copiar .env para ProgramData (local lido pelo servico como SYSTEM)
Filename: "{cmd}"; Parameters: "/c if not exist ""{commonappdata}\Trilink\Agent\.env"" copy ""{app}\config\.env"" ""{commonappdata}\Trilink\Agent\.env"""; Flags: runhidden; StatusMsg: "Copiando configuracao..."
; 2. Registrar servico Windows como LocalSystem
Filename: "{app}\agent-service.exe"; Parameters: "install"; Flags: runhidden; StatusMsg: "Registrando servico Windows..."
; 3. Iniciar o servico
Filename: "{app}\agent-service.exe"; Parameters: "start"; Flags: runhidden; StatusMsg: "Iniciando servico..."
; 4. Iniciar a interface (tray) passando pelo launcher, que espera o IPC ficar pronto
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start-agent.ps1"""; Description: "Iniciar interface do Agente Trilink agora"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Parar e remover servico antes de deletar arquivos
Filename: "{app}\agent-service.exe"; Parameters: "stop"; Flags: runhidden skipifdoesntexist; RunOnceId: "StopTrillinkAgentService"
Filename: "{app}\agent-service.exe"; Parameters: "uninstall"; Flags: runhidden skipifdoesntexist; RunOnceId: "UninstallTrillinkAgentService"
