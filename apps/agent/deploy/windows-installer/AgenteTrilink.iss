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
ArchitecturesInstallIn64BitMode=x64
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
Name: "{group}\Iniciar Interface do Agente"; Filename: "{app}\scripts\start-agent.cmd"; WorkingDir: "{app}"
Name: "{group}\Parar Interface do Agente"; Filename: "{app}\scripts\stop-agent.cmd"; WorkingDir: "{app}"
Name: "{group}\Editar configuracao"; Filename: "{app}\scripts\open-config.cmd"; WorkingDir: "{app}"
Name: "{group}\Abrir logs"; Filename: "{app}\scripts\open-logs.cmd"; WorkingDir: "{app}"
Name: "{group}\Verificar WebView2 Runtime"; Filename: "{cmd}"; Parameters: "/c powershell -ExecutionPolicy Bypass -File ""{app}\scripts\ensure-webview2-runtime.ps1"""; WorkingDir: "{app}"
Name: "{autodesktop}\Agente Trilink"; Filename: "{app}\scripts\start-agent.cmd"; WorkingDir: "{app}"; Tasks: desktopicon

; agent-ui starts in user session at logon (not the service — that starts automatically with Windows)
Name: "{commonstartup}\Agente Trilink UI"; Filename: "{app}\agent-ui.exe"; WorkingDir: "{app}"

[Run]
; 1. Copiar .env para ProgramData (local lido pelo servico como SYSTEM)
Filename: "{cmd}"; Parameters: "/c if not exist ""{commonappdata}\Trilink\Agent\.env"" copy ""{app}\config\.env"" ""{commonappdata}\Trilink\Agent\.env"""; Flags: runhidden; StatusMsg: "Copiando configuracao..."
; 2. Registrar servico Windows como LocalSystem
Filename: "{app}\agent-service.exe"; Parameters: "install"; Flags: runhidden; StatusMsg: "Registrando servico Windows..."
; 3. Iniciar o servico
Filename: "{app}\agent-service.exe"; Parameters: "start"; Flags: runhidden; StatusMsg: "Iniciando servico..."
; 4. Iniciar a interface (tray) na sessao do usuario atual, opcionally
Filename: "{app}\agent-ui.exe"; Description: "Iniciar interface do Agente Trilink agora"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Parar e remover servico antes de deletar arquivos
Filename: "{app}\agent-service.exe"; Parameters: "stop"; Flags: runhidden skipifdoesntexist
Filename: "{app}\agent-service.exe"; Parameters: "uninstall"; Flags: runhidden skipifdoesntexist

[Code]

// Gera um GUID no formato sem hifens para usar como IPC token
function GenerateGuid: string;
var
  Guid: TGUID;
begin
  CreateGUID(Guid);
  Result := GUIDToString(Guid);
  // Remove { } e -
  Result := Copy(Result, 2, Length(Result) - 2);
  Result := StringReplace(Result, '-', '', [rfReplaceAll]);
  Result := LowerCase(Result);
end;

// Injeta AGENT_IPC_TOKEN no arquivo .env se a chave nao existir ainda
procedure InjectIPCToken(EnvPath: string);
var
  Lines: TStringList;
  i: Integer;
  HasToken: Boolean;
  Token: string;
begin
  HasToken := False;
  Lines := TStringList.Create;
  try
    if FileExists(EnvPath) then
      Lines.LoadFromFile(EnvPath);

    for i := 0 to Lines.Count - 1 do
    begin
      if Pos('AGENT_IPC_TOKEN=', Lines[i]) = 1 then
      begin
        HasToken := True;
        Break;
      end;
    end;

    if not HasToken then
    begin
      Token := GenerateGuid();
      Lines.Add('AGENT_IPC_TOKEN=' + Token);
      Lines.SaveToFile(EnvPath);
    end;
  finally
    Lines.Free;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvInApp: string;
  EnvInData: string;
begin
  if CurStep = ssPostInstall then
  begin
    // Injetar token no .env do diretorio do app (fonte)
    EnvInApp := ExpandConstant('{app}\config\.env');
    if FileExists(EnvInApp) then
      InjectIPCToken(EnvInApp);

    // Injetar no .env do ProgramData (lido pelo servico)
    EnvInData := ExpandConstant('{commonappdata}\Trilink\Agent\.env');
    if FileExists(EnvInData) then
      InjectIPCToken(EnvInData);
  end;
end;
