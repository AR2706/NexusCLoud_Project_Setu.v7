!macro customInstall
  DetailPrint "Checking system for Docker Engine..."
  
  ; Check the Windows Registry to see if Docker Desktop is installed
  ClearErrors
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop" "UninstallString"
  IfErrors 0 DockerExists

  ; If we get here, Docker is NOT installed. Ask the user for permission.
  MessageBox MB_YESNO|MB_ICONEXCLAMATION "Nexus Edge requires Docker to safely isolate edge workloads. Would you like to automatically download and install Docker Desktop now?" IDNO SkipDocker

  DetailPrint "Downloading Docker Desktop (This may take a minute)..."
  ; Download the official installer to the temporary directory
  NSISdl::download "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" "$TEMP\DockerInstaller.exe"
  Pop $R0 ; Get the return value
  StrCmp $R0 "success" DownloadSuccess DownloadFailed

  DownloadFailed:
    MessageBox MB_OK|MB_ICONSTOP "Failed to download Docker: $R0. Please install it manually."
    Goto SkipDocker

  DownloadSuccess:
    DetailPrint "Installing Docker Engine natively..."
    ; Run the Docker installer in silent mode
    ExecWait '"$TEMP\DockerInstaller.exe" install --quiet'
    DetailPrint "Docker installation finished."
    Goto DockerExists

  SkipDocker:
    DetailPrint "Docker installation skipped. Nexus edge routing may fail."

  DockerExists:
    DetailPrint "Docker Engine dependency satisfied."
!macroend