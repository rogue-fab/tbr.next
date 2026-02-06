# save-main.ps1
param(
    [string]$Message
)

if (-not (Test-Path ".git")) {
    Write-Host "❌ Not in a git repo (no .git folder found)." -ForegroundColor Red
    exit 1
}

$branch = git rev-parse --abbrev-ref HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git error while reading current branch." -ForegroundColor Red
    exit 1
}

if ($branch -ne "main") {
    Write-Host "❌ You're on branch '$branch', not 'main'." -ForegroundColor Red
    Write-Host "   Checkout main first: git checkout main" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Current branch: main" -ForegroundColor Green
git status

$confirm = Read-Host "Commit and PUSH to 'main'? (y/n)"
if ($confirm -notin @("y", "Y")) {
    Write-Host "Aborted. Nothing committed to main."
    exit 0
}

git add -A

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Nothing to commit on 'main'. Working tree clean."
    exit 0
}

if (-not $Message) {
    $Message = Read-Host "Enter commit message for MAIN (e.g. 'Neon admin wiring step 3')"
}

if (-not $Message) {
    Write-Host "❌ Empty commit message. Aborting." -ForegroundColor Red
    exit 1
}

$fullMessage = "MAIN: $Message"
Write-Host "Committing with message: $fullMessage" -ForegroundColor Cyan
git commit -m "$fullMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed." -ForegroundColor Red
    exit 1
}

Write-Host "Pushing to origin/main..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed." -ForegroundColor Red
    exit 1
}

Write-Host "✅ MAIN saved & pushed to origin/main." -ForegroundColor Green
