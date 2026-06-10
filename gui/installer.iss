; Inno Setup Script — Fetchr Installer
#define MyAppName "Fetchr"
#define MyAppVersion "1.3.0"
#define MyAppPublisher "muhafif24"
#define MyAppURL "https://github.com/muhafif24/Fetchr"
#define MyAppExeName "yt-dlp.exe"

[Setup]
AppId={{2A8E1D94-E825-47AB-8C08-F4DE6119EF21}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename=Fetchr-setup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
SetupIconFile=..\fetchr.ico
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\dist\yt-dlp\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; Browser extension — copied to AppData so Fetchr can locate it at runtime
Source: "..\extension\*"; DestDir: "{userappdata}\Fetchr\extension"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; \
  Flags: nowait postinstall skipifsilent

