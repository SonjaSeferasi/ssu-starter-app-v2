param([Parameter(Mandatory=$true)][string]$Batch,[Parameter(Mandatory=$true)][string]$Countries)
$ErrorActionPreference='Continue'
$repoPath=(Resolve-Path '.').Path
$candidatePath=Join-Path $repoPath 'tmp/tools/asia-enhancement-candidate'
$env:SOCIALU_BUILD_TARGET='asia-phase-a'
$previewProcess=Start-Process node -ArgumentList 'node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3013' -WorkingDirectory $candidatePath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $repoPath 'tmp/tools/asia-review/enhance-server.log') -RedirectStandardError (Join-Path $repoPath 'tmp/tools/asia-review/enhance-server-error.log') -PassThru
Set-Content tmp/tools/asia-review/enhance-server-pid.txt $previewProcess.Id
$env:EXPLORER_REVIEW_URL='http://127.0.0.1:3013'
$env:EXPLORER_BUILD_ID=Get-Content (Join-Path $candidatePath '.next-asia-phase-a/BUILD_ID')
$env:EXPLORER_GPU='hardware'
$env:EXPLORER_REVIEW_COUNTRIES=$Countries
$env:EXPLORER_REVIEW_OUTPUT="documentation/world-explorer/review/asia/enhancement/$Batch/after"
node scripts/world-explorer/capture-asia-phase-a.cjs *> "tmp/tools/asia-review/enhance-$Batch-captures.log"
if($LASTEXITCODE){throw 'Capture failure'}
$env:EXPLORER_HEADING_DESKTOP='1'
$env:EXPLORER_HEADING_COUNTRIES=$Countries
$env:EXPLORER_HEADING_OUTPUT="documentation/world-explorer/review/asia/enhancement/$Batch/layouts"
node scripts/world-explorer/check-regional-headings.cjs *> "tmp/tools/asia-review/enhance-$Batch-layouts.log"
if($LASTEXITCODE){throw 'Layout failure'}
$env:EXPLORER_INPUT_TAPES="documentation/world-explorer/review/asia/enhancement/$Batch/input-tapes.json"
$env:EXPLORER_REVIEW_WORKERS='2'
node scripts/world-explorer/review-asia-desktop.cjs *> "tmp/tools/asia-review/enhance-$Batch-replays.log"
if($LASTEXITCODE){throw 'Replay failure'}
Write-Output "$Batch captures, layouts and rendered routes passed on build $env:EXPLORER_BUILD_ID"
