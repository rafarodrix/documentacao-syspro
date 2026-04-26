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
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
DisableDirPage=no
DisableProgramGroupPage=yes
OutputDir=..\..\dist\windows-installer\output
OutputBaseFilename=agente-trilink-setup-{#MyAppVersion}
; Fecha agent-ui e agent-service automaticamente se estiverem rodando durante upgrade
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
Source: "{#SourceDir}\config\.env"; DestDir: "{app}\config"; Flags: ignoreversion skipifsourcedoesntexist
Source: "{#SourceDir}\README-installer.txt"; DestDir: "{app}"; DestName: "LEIA-ME.txt"; Flags: ignoreversion
Source: "{#SourceDir}\rustdesk\*"; DestDir: "{app}\rustdesk"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

[Icons]
Name: "{group}\Iniciar Interface do Agente"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start-agent.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{group}\Parar Interface do Agente"; Filename: "{app}\scripts\stop-agent.cmd"; WorkingDir: "{app}"
Name: "{group}\Editar configuracao"; Filename: "{app}\scripts\open-config.cmd"; WorkingDir: "{app}"
Name: "{group}\Abrir logs"; Filename: "{app}\scripts\open-logs.cmd"; WorkingDir: "{app}"
Name: "{group}\Verificar WebView2 Runtime"; Filename: "{cmd}"; Parameters: "/c powershell -ExecutionPolicy Bypass -File ""{app}\scripts\ensure-webview2-runtime.ps1"""; WorkingDir: "{app}"
Name: "{autodesktop}\Agente Trilink"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start-agent.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

; {commonstartup}: inicia para qualquer usuario que fizer logon na maquina
; Usa PowerShell direto para suprimir a janela CMD que .cmd abre brevemente
Name: "{commonstartup}\Agente Trilink"; Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start-agent.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"


[Run]
; 1. Verificar e instalar WebView2 Runtime se ausente (necessario para agent-ui)
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{app}\scripts\ensure-webview2-runtime.ps1"""; Flags: runhidden; StatusMsg: "Verificando WebView2 Runtime..."
; 2. Registrar servico Windows como LocalSystem (idempotente — ignora erro se ja existe)
Filename: "{app}\agent-service.exe"; Parameters: "install"; Flags: runhidden; StatusMsg: "Registrando servico Windows..."
; 3. Iniciar o servico
Filename: "{app}\agent-service.exe"; Parameters: "start"; Flags: runhidden; StatusMsg: "Iniciando servico..."
; 4. Iniciar a interface (tray) na sessao do usuario atual, opcionalmente
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\start-agent.ps1"""; Description: "Iniciar interface do Agente Trilink agora"; Flags: nowait postinstall skipifsilent

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

function GenerateGuid: string;
begin
  Result := LowerCase(
    GetMD5OfString(
      GetDateTimeString('yyyymmddhhnnsszzz', '-', '-') +
      IntToStr(Random(MaxInt)) +
      ExpandConstant('{computername}')
    )
  );
end;


procedure StopServiceViaSCM(SvcName: string);
var
  RC: Integer;
begin
  Exec('net.exe', 'stop ' + SvcName, '', SW_HIDE, ewWaitUntilTerminated, RC);
end;

procedure CopyFileIfMissing(Src, Dst: string);
begin
  if not FileExists(Dst) and FileExists(Src) then
    CopyFile(Src, Dst, False);
end;

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
      if Pos('AGENT_IPC_TOKEN=', Lines[i]) = 1 then
      begin
        HasToken := True;
        Break;
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

// Para o servico RustDesk e desinstala o programa
procedure TryUninstallRustDesk;
var
  RC: Integer;
begin
  // Para o servico RustDesk antes de desinstalar
  Exec('net.exe', 'stop RustDesk', '', SW_HIDE, ewWaitUntilTerminated, RC);
  Sleep(2000);
  UninstallProgramByName('RustDesk');
end;

// ---------------------------------------------------------------------------
// Ciclo de vida do instalador
// ---------------------------------------------------------------------------

// Para servicos ANTES de copiar arquivos — evita "file in use" em upgrades
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  RC: Integer;
begin
  Result := '';
  // Encerra a UI se estiver rodando (complementa CloseApplications=yes)
  Exec('taskkill.exe', '/IM agent-ui.exe /F', '', SW_HIDE, ewWaitUntilTerminated, RC);
  StopServiceViaSCM('{#ServiceName}');
  Sleep(2000);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvSeed, EnvTarget: string;
begin
  if CurStep = ssPostInstall then
  begin
    EnvSeed   := ExpandConstant('{app}\config\.env');
    EnvTarget := ExpandConstant('{commonappdata}\Trilink\Agent\.env');

    // Copia .env para ProgramData apenas se ainda nao existe (preserva config de upgrade)
    CopyFileIfMissing(EnvSeed, EnvTarget);

    // Fallback: usa .env.example como base se nenhum .env foi encontrado
    if not FileExists(EnvTarget) then
      CopyFileIfMissing(ExpandConstant('{app}\config\.env.example'), EnvTarget);

    // Garante AGENT_IPC_TOKEN unico nos dois arquivos
    if FileExists(EnvSeed) then   InjectIPCToken(EnvSeed);
    if FileExists(EnvTarget) then InjectIPCToken(EnvTarget);
  end;
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
    // 1. Encerra agent-ui se estiver na bandeja
    Exec('taskkill.exe', '/IM agent-ui.exe /F', '', SW_HIDE, ewWaitUntilTerminated, Answer);

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
