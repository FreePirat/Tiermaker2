# Auto-Merge Setup Guide

This repository is now configured to automatically merge template submission pull requests that pass validation. Here's what you need to know:

## How It Works

1. **User Submits Template**: When someone creates a template via the web interface, it automatically creates a pull request
2. **Validation Runs**: GitHub Actions automatically validates the template
3. **Auto-Merge**: If validation passes, the PR is automatically merged
4. **User Notification**: The user gets a success comment on their PR

## Required Repository Settings

To ensure auto-merge works properly, make sure these settings are configured in your GitHub repository:

### 1. Repository Permissions
- Go to Settings → Actions → General
- Under "Workflow permissions", select **"Read and write permissions"**
- Check **"Allow GitHub Actions to create and approve pull requests"**

### 2. Branch Protection (Optional but Recommended)
- Go to Settings → Branches
- Add a rule for `main` branch
- **Enable**: "Require status checks to pass before merging"
- **Select**: "validate-template" as a required status check
- **Enable**: "Require branches to be up to date before merging"

### 3. Auto-merge Settings
- Go to Settings → General
- Under "Pull Requests", ensure **"Allow auto-merge"** is enabled

## Workflow Features

### ✅ Automatic Validation
- JSON syntax validation
- Required fields verification
- File size limits
- Template ID consistency
- Safe file changes only

### ✅ Automatic Merging
- Squash merge for clean history
- Automatic branch deletion
- Success notifications
- Failure handling with labels

### ✅ Security Measures
- Only processes PRs with specific title patterns
- Validates file changes are safe
- Prevents unauthorized modifications
- Comprehensive error handling

## Success Flow
```
User Creates Template → PR Created → Validation Passes → Auto-Merge → Template Live
```

## Fallback Flow
```
User Creates Template → PR Created → Validation Passes → Auto-Merge Fails → Manual Merge Required
```

## Labels Used
- `validation-passed`: All checks passed
- `validation-failed`: Validation errors found
- `ready-to-merge`: Auto-merge failed, manual merge needed

## Troubleshooting

### If Auto-Merge Doesn't Work:
1. Check repository permissions (see above)
2. Verify the workflow has write permissions
3. Ensure branch protection isn't blocking the merge
4. Check if "Allow auto-merge" is enabled

### Manual Override:
If needed, you can always manually merge PRs with the `ready-to-merge` label.

## Monitoring
- Check the Actions tab to see workflow runs
- Look for PRs with validation labels
- Monitor for any failed auto-merges

Your repository is now fully automated for template submissions! 🚀