# CodeQL Troubleshooting Guide

This document helps resolve common CodeQL configuration issues for the Auto Continue VS Code Extension.

## ✅ Recent Fixes Applied

### 1. **Dedicated CodeQL Workflow**
- Created separate `.github/workflows/codeql.yml` for better isolation
- Removed CodeQL from the main security workflow to prevent conflicts

### 2. **Proper Language Configuration**
- Configured for `javascript` language (which includes TypeScript)
- Added proper build steps for TypeScript compilation
- Matrix strategy for scalable language analysis

### 3. **Enhanced Build Process**
- Added Node.js setup with npm cache
- Proper dependency installation with `npm ci`
- TypeScript compilation before analysis

### 4. **CodeQL Configuration File**
- Created `.github/codeql/codeql-config.yml`
- Proper path exclusions (node_modules, tests, build artifacts)
- Security-focused query selection

## 🔧 Configuration Details

### Workflow Features:
- **Scheduled scans**: Weekly on Tuesdays
- **Event triggers**: Push and PR to main branch
- **Timeout**: 6-hour maximum (360 minutes)
- **Security queries**: Extended security and quality queries

### Build Process:
1. Checkout repository
2. Setup Node.js 18 with npm caching
3. Install dependencies (`npm ci`)
4. Initialize CodeQL with security queries
5. Build TypeScript (`npm run check-types && npm run compile`)
6. Perform CodeQL analysis

## 🚨 Common Issues & Solutions

### Issue: "No languages detected"
**Solution**: ✅ Fixed by specifying `javascript` in matrix strategy

### Issue: "Build failed during autobuild"
**Solution**: ✅ Fixed by replacing autobuild with explicit Node.js build steps

### Issue: "Analysis timeout"
**Solution**: ✅ Fixed by excluding unnecessary paths and setting reasonable timeout

### Issue: "Permission denied"
**Solution**: ✅ Fixed by adding proper permissions for security-events

## 📊 What CodeQL Will Analyze

### Included Paths:
- `src/**` - All source code
- `*.ts`, `*.js` - TypeScript and JavaScript files
- `*.tsx`, `*.jsx` - React components (if any)

### Excluded Paths:
- `node_modules/**` - Dependencies
- `out/**`, `dist/**` - Build outputs
- `.vscode-test/**` - VS Code test artifacts
- `**/*.test.ts`, `**/*.spec.ts` - Test files
- `esbuild.js` - Build configuration

## 🎯 Security Queries Enabled

- **Security-extended**: Advanced security vulnerability detection
- **Security-and-quality**: Code quality and security best practices
- **JavaScript/TypeScript specific**: Language-specific security patterns

## 📈 Expected Results

After pushing these fixes, CodeQL should:
1. ✅ Successfully detect the JavaScript/TypeScript codebase
2. ✅ Build the project without errors
3. ✅ Analyze source code for security vulnerabilities
4. ✅ Generate security alerts if any issues are found
5. ✅ Complete within the 6-hour timeout

## 🔄 Monitoring Status

To check if the fixes worked:
1. Go to your repository on GitHub
2. Navigate to the "Actions" tab
3. Look for "CodeQL" workflow runs
4. Check the "Security" tab for any alerts

## 🆘 If Issues Persist

If CodeQL is still reporting errors:

1. **Check GitHub Actions logs** for specific error messages
2. **Verify Node.js version** compatibility (using 18.x)
3. **Check build process** - ensure `npm run compile` works locally
4. **Review dependencies** - ensure no conflicting packages
5. **Contact GitHub Support** for CodeQL-specific platform issues

---

**Status**: 🟢 **CodeQL Configuration Fixed**  
**Last Updated**: July 17, 2025  
**Next Check**: Monitor GitHub Actions for successful runs
