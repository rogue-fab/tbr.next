# git-status-compact.ps1

if (-not (Test-Path ".git")) {
    Write-Host "❌ Not in a git repo (no .git folder found)." -ForegroundColor Red
    exit 1
}

$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $branch" -ForegroundColor Cyan

Write-Host "`n== Status ==" -ForegroundColor Yellow
git status -sb

Write-Host "`n== Recent commits (last 5) ==" -ForegroundColor Yellow
git log -5 --oneline

Write-Host "`n== Remotes ==" -ForegroundColor Yellow
git remote -v
