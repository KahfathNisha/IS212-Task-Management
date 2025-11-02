<#
PowerShell orchestration script for local testing on Windows.
Starts Firebase emulators (auth, firestore), backend dev server, and frontend dev server
as background processes, waits for readiness, runs backend Jest integration tests and
Playwright E2E (using existing servers), then gracefully shuts down the background processes.

Run from repository root: powershell -NoProfile -ExecutionPolicy Bypass -File frontend\scripts\start-with-emulators.ps1
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "Orchestrator started: starting Firebase emulators, backend, and frontend..."

function Start-BackgroundProcess($cwd, $file, $argumentList) {
    Push-Location $cwd
    try {
        $argDisplay = if ($null -eq $argumentList) { '<none>' } else { $argumentList -join ' ' }
        Write-Host "Starting: $file $argDisplay (cwd: $cwd)"
        # On Windows, npm and npx are usually shell scripts (.cmd) so invoke via cmd.exe /c
        if ($file -in @('npm','npx','yarn')) {
            $cmd = $file
            $argsForCmd = if ($null -eq $argumentList -or $argumentList.Count -eq 0) { '' } else { $argumentList -join ' ' }
            $proc = Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', "$cmd $argsForCmd") -WorkingDirectory $cwd -NoNewWindow -PassThru
        } else {
            if ($null -eq $argumentList -or $argumentList.Count -eq 0) {
                $proc = Start-Process -FilePath $file -WorkingDirectory $cwd -NoNewWindow -PassThru
            } else {
                $proc = Start-Process -FilePath $file -ArgumentList $argumentList -WorkingDirectory $cwd -NoNewWindow -PassThru
            }
        }
        return $proc
    } finally {
        Pop-Location
    }
}
# compute repo root (two levels up from frontend/scripts)
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

# Start Firebase emulators (auth + firestore) from repo root so firebase.json is picked up
$emulatorProc = Start-BackgroundProcess -cwd $repoRoot -file "npx" -argumentList @('firebase','emulators:start','--only','auth,firestore')
Start-Sleep -Seconds 3

# Start backend
$backendProc = Start-BackgroundProcess -cwd (Join-Path $repoRoot 'backend') -file "npm" -argumentList @('run','dev')
Start-Sleep -Seconds 2

# Start frontend
$frontendProc = Start-BackgroundProcess -cwd (Join-Path $repoRoot 'frontend') -file "npm" -argumentList @('run','dev')
Start-Sleep -Seconds 3

try {
    Write-Host "Waiting for backend and frontend to respond..."
    # wait-on is used to check readiness; allow up to 120s
    & npx wait-on http://localhost:3000 http://localhost:5173 -t 120000

    Write-Host "Running backend integration tests (Jest)"
    Push-Location (Join-Path $PSScriptRoot "..\backend")
    & npx jest --runInBand --ci
    Pop-Location

    Write-Host "Running Playwright E2E (using existing servers)"
    Push-Location (Join-Path $PSScriptRoot "..\frontend")
    $env:PLAYWRIGHT_USE_EXISTING = '1'
    & npx playwright install --with-deps
    & npx playwright test --reporter=list
    Pop-Location

} catch {
    Write-Error "Error during orchestration: $_"
    throw
} finally {
    Write-Host "Shutting down background processes..."
    if ($backendProc -and $backendProc.Id) { Try { Stop-Process -Id $backendProc.Id -Force } Catch {} }
    if ($frontendProc -and $frontendProc.Id) { Try { Stop-Process -Id $frontendProc.Id -Force } Catch {} }
    if ($emulatorProc -and $emulatorProc.Id) { Try { Stop-Process -Id $emulatorProc.Id -Force } Catch {} }
    Write-Host "Orchestration finished."
}
