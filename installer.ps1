#!/usr/bin/env pwsh
# Generated with codemeta-ps1-installer.tmpl, see https://github.com/caltechlibrary/codemeta-pandoc-examples

#
# Set the package name and version to install
#
$PACKAGE = "cold"
$VERSION = "0.0.32"
$GIT_GROUP = "caltechlibrary"
$RELEASE = "https://github.com/${GIT_GROUP}/${PACKAGE}/releases/tag/v${VERSION}"
$SYSTEM_TYPE = Get-ComputerInfo -Property CsSystemType
if ($SYSTEM_TYPE.CsSystemType.Contains("ARM64")) {
    $MACHINE = "arm64"
} else {
    $MACHINE = "x86_64"
}

# FIGURE OUT Install directory
$BIN_DIR = "${Home}\bin"
Write-Output "${PACKAGE} will be installed in ${BIN_DIR}"

#
# Figure out what the zip file is named
#
$ZIPFILE = "${PACKAGE}-v${VERSION}-Windows-${MACHINE}.zip"

#
# Check to see if this zip file has been downloaded.
#
$DOWNLOAD_URL = "https://github.com/${GIT_GROUP}/${PACKAGE}/releases/download/v${VERSION}/${ZIPFILE}"

if (!(Test-Path $BIN_DIR)) {
  New-Item $BIN_DIR -ItemType Directory | Out-Null
}
curl.exe -Lo "${ZIPFILE}" "${DOWNLOAD_URL}"

tar.exe xf "${ZIPFILE}" -C "${Home}"

Remove-Item $ZIPFILE

$User = [System.EnvironmentVariableTarget]::User
$Path = [System.Environment]::GetEnvironmentVariable('Path', $User)
if (!(";${Path};".ToLower() -like "*;${BIN_DIR};*".ToLower())) {
  [System.Environment]::SetEnvironmentVariable('Path', "${Path};${BIN_DIR}", $User)
  $Env:Path += ";${BIN_DIR}"
}

Write-Output "${PACKAGE} was installed successfully to ${BIN_DIR}"
