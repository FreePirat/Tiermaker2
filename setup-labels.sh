#!/bin/bash

# Setup Required GitHub Labels for Auto-Merge Workflow
echo "🏷️  Setting up required GitHub labels for TierMaker2 auto-merge..."

# Function to create label if it doesn't exist
create_label_if_missing() {
  local name="$1"
  local color="$2"
  local description="$3"
  
  if ! gh label view "$name" >/dev/null 2>&1; then
    echo "✅ Creating label: $name"
    gh label create "$name" --color "$color" --description "$description"
  else
    echo "✅ Label already exists: $name"
  fi
}

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI is not authenticated. Please run: gh auth login"
    exit 1
fi

echo "🔍 Checking current repository..."
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "📁 Repository: $repo"

echo ""
echo "🏷️  Creating required labels..."

# Create required labels with appropriate colors
create_label_if_missing "validation-passed" "28a745" "Template validation completed successfully"
create_label_if_missing "validation-failed" "d73a49" "Template validation failed - requires fixes"
create_label_if_missing "ready-to-merge" "0366d6" "Template validated and ready for manual merge"

echo ""
echo "🎉 Label setup complete!"
echo ""
echo "Your repository now has all required labels for the auto-merge workflow:"
echo "  🟢 validation-passed - Templates that passed all checks"
echo "  🔴 validation-failed - Templates that need fixes"
echo "  🔵 ready-to-merge - Templates ready for manual merge"
echo ""
echo "The auto-merge workflow should now work properly! 🚀"