# Setup Required GitHub Labels for Auto-Merge Workflow
Write-Host "🏷️  Setting up required GitHub labels for TierMaker2 auto-merge..." -ForegroundColor Cyan

# Function to create label if it doesn't exist
function Create-LabelIfMissing {
    param(
        [string]$Name,
        [string]$Color,
        [string]$Description
    )
    
    try {
        gh label view $Name | Out-Null
        Write-Host "✅ Label already exists: $Name" -ForegroundColor Green
    }
    catch {
        Write-Host "✅ Creating label: $Name" -ForegroundColor Green
        gh label create $Name --color $Color --description $Description
    }
}

# Check if gh CLI is installed and authenticated
try {
    gh --version | Out-Null
}
catch {
    Write-Host "❌ GitHub CLI (gh) is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check if authenticated
try {
    gh auth status | Out-Null
}
catch {
    Write-Host "❌ GitHub CLI is not authenticated. Please run: gh auth login" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Checking current repository..." -ForegroundColor Yellow
$repo = gh repo view --json nameWithOwner --jq .nameWithOwner
Write-Host "📁 Repository: $repo" -ForegroundColor White

Write-Host ""
Write-Host "🏷️  Creating required labels..." -ForegroundColor Yellow

# Create required labels with appropriate colors
Create-LabelIfMissing "validation-passed" "28a745" "Template validation completed successfully"
Create-LabelIfMissing "validation-failed" "d73a49" "Template validation failed - requires fixes"
Create-LabelIfMissing "ready-to-merge" "0366d6" "Template validated and ready for manual merge"

Write-Host ""
Write-Host "🎉 Label setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your repository now has all required labels for the auto-merge workflow:" -ForegroundColor White
Write-Host "  🟢 validation-passed - Templates that passed all checks" -ForegroundColor Green
Write-Host "  🔴 validation-failed - Templates that need fixes" -ForegroundColor Red
Write-Host "  🔵 ready-to-merge - Templates ready for manual merge" -ForegroundColor Blue
Write-Host ""
Write-Host "The auto-merge workflow should now work properly! 🚀" -ForegroundColor Green