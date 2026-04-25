#define MyAppName "Agente Trilink"
#define MyAppPublisher "Trilink Software"
#define MyAppVersion "1.0.0"
#define MyAppExeName "agent-ui.exe"
#define MyAppAssocName MyAppName + " Runtime"
#define SourceDir "..\..\dist\windows-installer\staging"

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
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
DisableDirPage=no
DisableProgramGroupPage=yes
OutputDir=..\..\dist\windows-installer\output
OutputBaseFilename=agente-trilink-setup

[Tasks]
Name: "autostart"; Description: "Iniciar Agente Trilink com o Windows"; GroupDescription: "Inicializacao"
Name: "desktopicon"; Description: "Criar atalho na area de trabalho"; GroupDescription: "Atalhos"

[Dirs]
Name: "{commonappdata}\Trilink\Agent"
Name: "{commonappdata}\Trilink\Agent\runtime-state"
Name: "{commonappdata}\Trilink\Agent\runtime-state\logs"

[Files]
Source: "{#SourceDir}\agent-service.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\agent-ui.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\assets\img\logo-clara.png"; DestDir: "{app}\assets\img"; Flags: ignoreversion
Source: "{#SourceDir}\assets\img\logo-escura.png"; DestDir: "{app}\assets\img"; Flags: ignoreversion
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
Name: "{group}\Iniciar Agente Trilink"; Filename: "{app}\scripts\start-agent.cmd"; WorkingDir: "{app}"
Name: "{group}\Parar Agente Trilink"; Filename: "{app}\scripts\stop-agent.cmd"; WorkingDir: "{app}"
Name: "{group}\Editar configuracao"; Filename: "{app}\scripts\open-config.cmd"; WorkingDir: "{app}"
Name: "{group}\Abrir logs"; Filename: "{app}\scripts\open-logs.cmd"; WorkingDir: "{app}"
Name: "{group}\Verificar WebView2 Runtime"; Filename: "{cmd}"; Parameters: "/c powershell -ExecutionPolicy Bypass -File ""{app}\scripts\ensure-webview2-runtime.ps1"""; WorkingDir: "{app}"
Name: "{autodesktop}\Agente Trilink"; Filename: "{app}\scripts\start-agent.cmd"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{commonstartup}\Agente Trilink"; Filename: "{app}\scripts\start-agent.cmd"; WorkingDir: "{app}"; Tasks: autostart

[Run]
Filename: "{app}\scripts\start-agent.cmd"; Description: "Iniciar Agente Trilink agora"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{app}\scripts\stop-agent.cmd"; Flags: runhidden skipifdoesntexist

