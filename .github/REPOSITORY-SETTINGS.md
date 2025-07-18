# GitHub Repository Settings Configuration

This file contains recommended settings for the auto-continue VS Code extension repository.

## Repository Settings to Check/Update

### 1. Actions Settings
- Go to: Settings → Actions → General
- **Actions permissions**: Allow all actions and reusable workflows
- **Workflow permissions**: Read and write permissions
- **Allow GitHub Actions to create and approve pull requests**: ✅ Enabled

### 2. Security Settings
- Go to: Settings → Security & analysis
- **Dependency graph**: ✅ Enabled
- **Dependabot alerts**: ✅ Enabled
- **Dependabot security updates**: ✅ Enabled
- **Code scanning**: ✅ Enabled
- **Secret scanning**: ✅ Enabled (if available for your repo type)

### 3. Branch Protection (if needed)
- Go to: Settings → Branches
- **Protect matching branches**: main
- **Require status checks**: ✅
  - Require branches to be up to date: ✅
  - Status checks: CI, CodeQL
- **Require pull request reviews**: Optional (your choice)
- **Dismiss stale reviews**: Optional
- **Require review from CODEOWNERS**: Optional
- **Restrict pushes**: Optional
- **Allow force pushes**: ❌ (recommended off)
- **Allow deletions**: ❌ (recommended off)

### 4. Pages Settings (if using GitHub Pages)
- Go to: Settings → Pages
- **Source**: Deploy from a branch or GitHub Actions

## Workflow Token Permissions

Our workflows now include explicit permissions:

```yaml
permissions:
  contents: read
  security-events: write
  actions: read
```

## Common Issues and Solutions

### If Actions are Failing Due to Permissions:
1. Check if your repository is private (some features require GitHub Pro)
2. Verify Actions are enabled in repository settings
3. Check if organization has restricted Actions permissions

### If CodeQL is Failing:
1. Ensure the repository language is detected as JavaScript/TypeScript
2. Check if the build process completes successfully
3. Verify CodeQL has proper permissions

### If Security Scans are Too Strict:
1. Review Dependabot alerts and dismiss false positives
2. Add .gitignore entries for build artifacts
3. Use continue-on-error for non-critical security checks

## Testing Your Settings

Run these commands locally to verify everything works:

```bash
npm ci
npm run check-types
node esbuild.js
npm run lint
npm run security-check
npm audit
```

All should pass before pushing to GitHub.
