# save-dev.ps1
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

if ($branch -eq "main") {
    Write-Host "❌ You are on 'main'. Use save-main.ps1 for production commits." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Current branch: $branch" -ForegroundColor Green
git status

$confirm = Read-Host "Commit and PUSH branch '$branch'? (y/n)"
if ($confirm -notin @("y", "Y")) {
    Write-Host "Aborted. Nothing committed."
    exit 0
}

git add -A

$changes = git status --porcelain
if (-not $changes) {
    Write-Host "Nothing to commit on '$branch'. Working tree clean."
    exit 0
}

if (-not $Message) {
    $Message = Read-Host "Enter commit message for $branch (e.g. 'overlay wiring step 2')"
}

if (-not $Message) {
    Write-Host "❌ Empty commit message. Aborting." -ForegroundColor Red
    exit 1
}

$fullMessage = "DEV ($branch): $Message"
Write-Host "Committing with message: $fullMessage" -ForegroundColor Cyan
git commit -m "$fullMessage"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed." -ForegroundColor Red
    exit 1
}

Write-Host "Pushing to origin/$branch..." -ForegroundColor Yellow
git push origin $branch

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed." -ForegroundColor Red
    exit 1
}

Write-Host "✅ DEV branch '$branch' saved & pushed to origin/$branch." -ForegroundColor Green
