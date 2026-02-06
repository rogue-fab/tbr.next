# create-dev-branch.ps1
param(
    [string]$Name
)

if (-not (Test-Path ".git")) {
    Write-Host "❌ Not in a git repo (no .git folder found)." -ForegroundColor Red
    exit 1
}

$current = git rev-parse --abbrev-ref HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git error while reading current branch." -ForegroundColor Red
    exit 1
}

if ($current -ne "main") {
    Write-Host "You are currently on '$current', not 'main'." -ForegroundColor Yellow
    $switch = Read-Host "Checkout 'main' now? (y/n)"
    if ($switch -in @("y", "Y")) {
        git checkout main
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to checkout main." -ForegroundColor Red
            exit 1
        }
        $current = "main"
    } else {
        Write-Host "Aborted. New dev branch must be created from 'main'." -ForegroundColor Red
        exit 1
    }
}

# Ensure working tree is clean before branching
$changes = git status --porcelain
if ($changes) {
    Write-Host "⚠ There are uncommitted changes on 'main'." -ForegroundColor Yellow
    Write-Host "   Commit or stash them before branching, or branch will include them." -ForegroundColor Yellow
    $cont = Read-Host "Continue creating branch anyway? (y/n)"
    if ($cont -notin @("y", "Y")) {
        Write-Host "Aborted."
        exit 0
    }
}

if (-not $Name) {
    $Name = Read-Host "New dev branch name (e.g. dev1, dev2)"
}

if (-not $Name) {
    Write-Host "❌ No branch name provided. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "Creating branch '$Name' from 'main'..." -ForegroundColor Yellow
git checkout -b $Name

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create/switch to '$Name'." -ForegroundColor Red
    exit 1
}

Write-Host "Pushing and setting upstream origin/$Name..." -ForegroundColor Yellow
git push -u origin $Name

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed. Branch created locally but not on remote." -ForegroundColor Red
    exit 1
}

Write-Host "✅ New dev branch '$Name' created from main and pushed to origin/$Name." -ForegroundColor Green
