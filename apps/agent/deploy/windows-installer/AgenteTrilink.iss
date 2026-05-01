; Versao pode ser sobrescrita via linha de comando: ISCC.exe /DMyAppVersion=1.2.3
; Sem o parametro usa "1.0.0" como fallback.
#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

#define MyAppName      "Agente Trilink"
#define MyAppPublisher "Trilink Software"
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
Compression=lzma2
SolidCompression=no
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
DisableDirPage=no
DisableProgramGroupPage=yes
OutputDir=..\..\dist\windows-installer\output
OutputBaseFilename=agente-trilink-setup-{#MyAppVersion}
; Fecha agent-ui e agent-service automaticamente se estiverem rodando durante upgrade
CloseApplications=no
RestartApplications=no

[Tasks]
Name: "desktopicon"; Description: "Criar atalho na area de trabalho"; GroupDescription: "Atalhos"

[Dirs]
Name: "{commonappdata}\Trilink\Agent"
Name: "{commonappdata}\Trilink\Agent\runtime-state"
Name: "{commonappdata}\Trilink\Agent\runtime-state\logs"

[Files]
Source: "{#SourceDir}\agent-service.exe"; DestDir: "{app}"; Flags: ignoreversion restartreplace
Source: "{#SourceDir}\agent-ui.exe"; DestDir: "{app}"; Flags: ignoreversion restartreplace
Source: "{#SourceDir}\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\stop-agent.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\open-config.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\scripts\open-logs.cmd"; DestDir: "{app}\scripts"; Flags: ignoreversion
Source: "{#SourceDir}\config\.env.example"; DestDir: "{app}\config"; Flags: ignoreversion
Source: "{#SourceDir}\config\.env"; DestDir: "{app}\config"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#SourceDir}\README-installer.txt"; DestDir: "{app}"; DestName: "LEIA-ME.txt"; Flags: ignoreversion
Source: "{#SourceDir}\rustdesk\*"; DestDir: "{app}\rustdesk"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

[Icons]
Name: "{group}\Iniciar Interface do Agente"; Filename: "{app}\agent-ui.exe"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{group}\Parar Interface do Agente"; Filename: "{app}\scripts\stop-agent.cmd"; WorkingDir: "{app}"
Name: "{group}\Editar configuracao"; Filename: "{app}\scripts\open-config.cmd"; WorkingDir: "{app}"
Name: "{group}\Abrir logs"; Filename: "{app}\scripts\open-logs.cmd"; WorkingDir: "{app}"
Name: "{autodesktop}\Agente Trilink"; Filename: "{app}\agent-ui.exe"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

; {commonstartup}: inicia a interface na sessao do usuario; o servico sobe via SCM
Name: "{commonstartup}\Agente Trilink"; Filename: "{app}\agent-ui.exe"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"


[Run]
; 2. Registrar servico Windows como LocalSystem (idempotente — ignora erro se ja existe)
Filename: "{app}\agent-service.exe"; Parameters: "install"; Flags: runhidden; StatusMsg: "Registrando servico Windows..."
; 3. Iniciar o servico
Filename: "{app}\agent-service.exe"; Parameters: "start"; Flags: runhidden; StatusMsg: "Iniciando servico..."
; 4. Iniciar a interface (tray) na sessao do usuario atual, opcionalmente
Filename: "{app}\agent-ui.exe"; Description: "Iniciar interface do Agente Trilink agora"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Para e remove o servico antes de deletar os arquivos
Filename: "{app}\agent-service.exe"; Parameters: "stop"; Flags: runhidden skipifdoesntexist; RunOnceId: "StopTrillinkAgentService"
Filename: "{app}\agent-service.exe"; Parameters: "uninstall"; Flags: runhidden skipifdoesntexist; RunOnceId: "UninstallTrillinkAgentService"

[UninstallDelete]
; Remove o diretorio de estado criado em tempo de execucao (nao rastreado pelo Inno)
Type: filesandordirs; Name: "{commonappdata}\Trilink\Agent\runtime-state"

[Code]

// ---------------------------------------------------------------------------
// Utilitarios de instalacao
// ---------------------------------------------------------------------------

procedure StopServiceViaSCM(SvcName: string);
var
  RC: Integer;
begin
  Exec('net.exe', 'stop ' + SvcName, '', SW_HIDE, ewWaitUntilTerminated, RC);
end;

function ResolveInstalledAgentDir(): string;
var
  InstallDir: string;
  UninstallKey: string;
begin
  Result := ExpandConstant('{commonpf}\Trilink\Agente');
  UninstallKey := 'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{{8F4D6C55-96D8-4B9A-AB32-4DCA167A8D36}_is1';

  if RegQueryStringValue(HKLM64, UninstallKey, 'Inno Setup: App Path', InstallDir) and (Trim(InstallDir) <> '') then
  begin
    Result := InstallDir;
    Exit;
  end;

  if RegQueryStringValue(HKLM64, UninstallKey, 'InstallLocation', InstallDir) and (Trim(InstallDir) <> '') then
  begin
    Result := InstallDir;
    Exit;
  end;

  if RegQueryStringValue(HKLM, UninstallKey, 'Inno Setup: App Path', InstallDir) and (Trim(InstallDir) <> '') then
  begin
    Result := InstallDir;
    Exit;
  end;

  if RegQueryStringValue(HKLM, UninstallKey, 'InstallLocation', InstallDir) and (Trim(InstallDir) <> '') then
    Result := InstallDir;
end;

procedure StopInstalledAgentViaBinary;
var
  RC: Integer;
  ServiceExePath: string;
begin
  ServiceExePath := AddBackslash(ResolveInstalledAgentDir()) + 'agent-service.exe';
  if FileExists(ServiceExePath) then
    Exec(
      ServiceExePath,
      'stop',
      '',
      SW_HIDE,
      ewWaitUntilTerminated,
      RC
    );
end;

procedure WaitForProcessExit(ImageName: string; TimeoutSeconds: Integer);
var
  RC: Integer;
  Elapsed: Integer;
begin
  Elapsed := 0;
  while Elapsed < TimeoutSeconds do
  begin
    Exec(
      'cmd.exe',
      '/c tasklist /FI "IMAGENAME eq ' + ImageName + '" | find /I "' + ImageName + '" >nul',
      '',
      SW_HIDE,
      ewWaitUntilTerminated,
      RC
    );

    if RC <> 0 then
      Exit;

    Sleep(1000);
    Elapsed := Elapsed + 1;
  end;
end;

procedure CloseRunningAgentProcesses;
var
  RC: Integer;
begin
  StopInstalledAgentViaBinary;
  Exec('taskkill.exe', '/IM agent-ui.exe /F /T', '', SW_HIDE, ewWaitUntilTerminated, RC);
  Exec('taskkill.exe', '/IM agent-service.exe /F /T', '', SW_HIDE, ewWaitUntilTerminated, RC);
  StopServiceViaSCM('{#ServiceName}');
  WaitForProcessExit('agent-ui.exe', 20);
  WaitForProcessExit('agent-service.exe', 20);
  Sleep(1000);
end;

procedure PrepareInstalledBinaryForReplacement(FileName: string);
var
  TargetPath: string;
  BackupPath: string;
  Attempt: Integer;
begin
  TargetPath := AddBackslash(ResolveInstalledAgentDir()) + FileName;
  if not FileExists(TargetPath) then
    Exit;

  BackupPath := TargetPath + '.old';
  if FileExists(BackupPath) then
    DeleteFile(BackupPath);

  for Attempt := 1 to 20 do
  begin
    if DeleteFile(TargetPath) then
      Exit;

    if RenameFile(TargetPath, BackupPath) then
    begin
      DeleteFile(BackupPath);
      Exit;
    end;

    Sleep(500);
  end;
end;

// ---------------------------------------------------------------------------
// Desinstalacao de programas instalados pelo agente (RustDesk etc.)
// ---------------------------------------------------------------------------

// Escreve um script PowerShell temporario para desinstalar um programa pelo DisplayName.
// Suporta desinstaladores MSI (MsiExec /X{GUID}) e EXE (/S).
// Retorna True se o script foi executado (nao necessariamente se o programa foi removido).
function UninstallProgramByName(DisplayNamePattern: string): Boolean;
var
  TmpScript: string;
  Lines: TStringList;
  RC: Integer;
begin
  Result := False;
  TmpScript := ExpandConstant('{tmp}\uninstall-' + DisplayNamePattern + '.ps1');

  Lines := TStringList.Create;
  try
    Lines.Add('$pattern = ''' + DisplayNamePattern + '''');
    Lines.Add('$regPaths = @(');
    Lines.Add('  ''HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'',');
    Lines.Add('  ''HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*''');
    Lines.Add(')');
    Lines.Add('$entry = $regPaths | ForEach-Object {');
    Lines.Add('  Get-ItemProperty $_ -ErrorAction SilentlyContinue');
    Lines.Add('} | Where-Object { $_.DisplayName -like "*$pattern*" } | Select-Object -First 1');
    Lines.Add('if (-not $entry) { Write-Host "Not found: $pattern"; exit 0 }');
    Lines.Add('Write-Host "Uninstalling: $($entry.DisplayName)"');
    Lines.Add('$quiet = $entry.QuietUninstallString');
    Lines.Add('$uninstall = $entry.UninstallString');
    Lines.Add('if ($quiet) {');
    Lines.Add('  cmd /c $quiet | Out-Null');
    Lines.Add('} elseif ($uninstall -match ''MsiExec'') {');
    Lines.Add('  $guid = [regex]::Match($uninstall, ''\{[^}]+\}'').Value');
    Lines.Add('  if ($guid) { & msiexec.exe /x $guid /qn /norestart | Out-Null }');
    Lines.Add('} elseif ($uninstall) {');
    Lines.Add('  $exe = $uninstall -replace ''^"([^"]+)".*'', ''$1''');
    Lines.Add('  if (Test-Path $exe) { & $exe /S | Out-Null }');
    Lines.Add('}');
    Lines.SaveToFile(TmpScript);
  finally
    Lines.Free;
  end;

  Result := Exec(
    'powershell.exe',
    '-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + TmpScript + '"',
    '', SW_HIDE, ewWaitUntilTerminated, RC
  );

  DeleteFile(TmpScript);
end;

// Para o servico RustDesk, encerra o processo e desinstala o programa
procedure TryUninstallRustDesk;
var
  RC: Integer;
begin
  // Para o servico Windows antes de encerrar o processo
  Exec('net.exe', 'stop RustDesk', '', SW_HIDE, ewWaitUntilTerminated, RC);
  Sleep(1000);
  // Encerra forcosamente o processo (cobre instalacoes sem servico e sessoesinterativas)
  Exec('taskkill.exe', '/IM rustdesk.exe /F /T', '', SW_HIDE, ewWaitUntilTerminated, RC);
  Sleep(1000);
  UninstallProgramByName('RustDesk');
end;

// ---------------------------------------------------------------------------
// Ciclo de vida do instalador
// ---------------------------------------------------------------------------

// Para servicos ANTES de copiar arquivos — evita "file in use" em upgrades
function InitializeSetup(): Boolean;
begin
  CloseRunningAgentProcesses;
  Result := True;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := '';
  CloseRunningAgentProcesses;
  PrepareInstalledBinaryForReplacement('agent-ui.exe');
  PrepareInstalledBinaryForReplacement('agent-service.exe');
end;

// ---------------------------------------------------------------------------
// Ciclo de vida da desinstalacao
// ---------------------------------------------------------------------------

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataDir: string;
  Answer: Integer;
begin
  if CurUninstallStep = usUninstall then
  begin
    // 1. Encerra UI/processos do agente antes de desinstalar
    CloseRunningAgentProcesses;

    // 2. Pergunta se deve desinstalar programas instalados pelo agente (ex: RustDesk)
    Answer := MsgBox(
      'O Agente Trilink pode ter instalado programas auxiliares (ex: RustDesk).' + #13#10 +
      'Deseja desinstala-los tambem?' + #13#10#13#10 +
      'Clique Sim para remover ou Nao para manter.',
      mbConfirmation, MB_YESNO
    );
    if Answer = IDYES then
    begin
      TryUninstallRustDesk;
      // Adicione aqui outros programas instalados pelo agente no futuro:
      // TryUninstallProgramByName('OutroPrograma');
    end;

    // 3. Pergunta se deve remover dados de configuracao e logs
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
