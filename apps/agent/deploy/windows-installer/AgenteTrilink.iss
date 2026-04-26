; Versao pode ser sobrescrita via linha de comando: ISCC.exe /DMyAppVersion=1.2.3
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

#define MyAppName      "Agente Trilink"
#define MyAppPublisher "Trilink Software"
#define MyAppAssocName MyAppName + " Runtime"
#define SourceDir      "..\..\dist\windows-installer\staging"
#define ServiceName    "TrillinkAgent"

[Setup]
AppId={{8F4D6C55-96D8-4B9A-AB32-4DCA167A8D36}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
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
; Versao embutida no nome do arquivo de saida
OutputDir=..\..\dist\windows-installer\output
OutputBaseFilename=agente-trilink-setup-{#MyAppVersion}
; Permite upgrade silencioso pelo MSI/SCCM
CloseApplications=yes
CloseApplicationsFilter=agent-ui.exe,agent-service.exe
RestartApplications=no

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
; .env local e opcional — usado como seed quando presente no pacote de build
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

; Inicia agent-ui apenas para o usuario que instalou (nao para todos os usuarios da maquina)
Name: "{userstartup}\Agente Trilink UI"; Filename: "{app}\agent-ui.exe"; WorkingDir: "{app}"

[Run]
; 1. Verificar e instalar WebView2 Runtime se ausente
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{app}\scripts\ensure-webview2-runtime.ps1"""; Flags: runhidden; StatusMsg: "Verificando WebView2 Runtime..."
; 2. Registrar servico Windows como LocalSystem (idempotente — ignora erro se ja existe)
Filename: "{app}\agent-service.exe"; Parameters: "install"; Flags: runhidden; StatusMsg: "Registrando servico Windows..."
; 3. Iniciar o servico
Filename: "{app}\agent-service.exe"; Parameters: "start"; Flags: runhidden; StatusMsg: "Iniciando servico..."
; 4. Iniciar a interface (tray) na sessao do usuario atual, opcionalmente
Filename: "{app}\agent-ui.exe"; Description: "Iniciar interface do Agente Trilink agora"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Para e remove o servico antes de deletar os arquivos
Filename: "{app}\agent-service.exe"; Parameters: "stop"; Flags: runhidden skipifdoesntexist
Filename: "{app}\agent-service.exe"; Parameters: "uninstall"; Flags: runhidden skipifdoesntexist

[UninstallDelete]
; Remove diretorios criados pelo agente que o Inno nao rastreia
Type: filesandordirs; Name: "{commonappdata}\Trilink\Agent\runtime-state"

[Code]

// ---------------------------------------------------------------------------
// Utilitarios
// ---------------------------------------------------------------------------

function GenerateGuid: string;
var
  Guid: TGUID;
begin
  CreateGUID(Guid);
  Result := GUIDToString(Guid);
  Result := Copy(Result, 2, Length(Result) - 2);
  Result := StringReplace(Result, '-', '', [rfReplaceAll]);
  Result := LowerCase(Result);
end;

// Para o servico via SCM sem depender do executavel (util antes da copia dos arquivos)
procedure StopServiceViaSCM(ServiceName: string);
var
  ResultCode: Integer;
begin
  Exec('net.exe', 'stop ' + ServiceName, '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

// Copia arquivo sem sobrescrever se o destino ja existe
procedure CopyFileIfMissing(Src, Dst: string);
begin
  if not FileExists(Dst) and FileExists(Src) then
    FileCopy(Src, Dst, False);
end;

// Injeta AGENT_IPC_TOKEN no arquivo .env se a chave nao existir ainda
procedure InjectIPCToken(EnvPath: string);
var
  Lines: TStringList;
  i: Integer;
  HasToken: Boolean;
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
      Lines.Add('AGENT_IPC_TOKEN=' + GenerateGuid());
      Lines.SaveToFile(EnvPath);
    end;
  finally
    Lines.Free;
  end;
end;

// ---------------------------------------------------------------------------
// Ciclo de vida do instalador
// ---------------------------------------------------------------------------

// Para o servico ANTES de copiar os arquivos — evita "file in use" em upgrades
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  StopServiceViaSCM('{#ServiceName}');
  // Aguarda o processo liberar os arquivos
  Sleep(2000);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvSeed: string;
  EnvTarget: string;
begin
  if CurStep = ssPostInstall then
  begin
    EnvSeed   := ExpandConstant('{app}\config\.env');
    EnvTarget := ExpandConstant('{commonappdata}\Trilink\Agent\.env');

    // Copia .env para ProgramData apenas se ainda nao existe (preserva config existente)
    CopyFileIfMissing(EnvSeed, EnvTarget);

    // Se nao havia .env de seed, usa o .env.example como base
    if not FileExists(EnvTarget) then
      CopyFileIfMissing(ExpandConstant('{app}\config\.env.example'), EnvTarget);

    // Garante AGENT_IPC_TOKEN unico nos dois locais
    if FileExists(EnvSeed) then
      InjectIPCToken(EnvSeed);
    if FileExists(EnvTarget) then
      InjectIPCToken(EnvTarget);
  end;
end;

// ---------------------------------------------------------------------------
// Desinstalacao
// ---------------------------------------------------------------------------

// Pergunta se o usuario quer remover dados de configuracao e estado
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: string;
  Answer: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    DataDir := ExpandConstant('{commonappdata}\Trilink\Agent');
    if DirExists(DataDir) then
    begin
      Answer := MsgBox(
        'Deseja remover tambem os dados de configuracao e logs do agente?' + #13#10 +
        '(' + DataDir + ')' + #13#10#13#10 +
        'Clique Sim para remover tudo ou Nao para manter a configuracao.',
        mbConfirmation, MB_YESNO
      );
      if Answer = IDYES then
        DelTree(DataDir, True, True, True);
    end;
  end;
end;
