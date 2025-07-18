#!/bin/bash

# Security check script for Auto Continue VS Code Extension
# Run this before committing to ensure no secrets are included

echo "🔒 Running security checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Exit on any error
set -e

# Flag to track if any security issues are found
SECURITY_ISSUES=0

echo "📋 Checking for API keys and secrets..."
if grep -r -i -E "(api[_-]?key|apikey|secret[_-]?key|access[_-]?token|bearer)\s*[:=]\s*[\"'][^\"']+[\"']" src/ --exclude-dir=node_modules --exclude="*.test.ts" --exclude="*.spec.ts" 2>/dev/null; then
    echo -e "${RED}❌ Potential API keys or secrets detected! Please remove them.${NC}"
    SECURITY_ISSUES=1
fi

echo "🔐 Checking for hardcoded credentials..."
if grep -r -i -E "(username|password|passwd|pwd|token|key|secret|credential)\s*[:=]\s*[\"'][^\"']+[\"']" src/ --exclude-dir=node_modules --exclude="*.test.ts" --exclude="*.spec.ts" 2>/dev/null; then
    echo -e "${RED}❌ Potential hardcoded credentials detected! Please remove them.${NC}"
    SECURITY_ISSUES=1
fi

echo "📁 Checking for environment files..."
if find . -name ".env*" -not -path "./node_modules/*" -not -name ".env.example" -not -name ".env.template" | grep -q .; then
    echo -e "${RED}❌ Environment files detected! Add them to .gitignore.${NC}"
    SECURITY_ISSUES=1
fi

echo "🔍 Checking for sensitive data in logs..."
if grep -r -i -E "(console\.log|console\.error|console\.warn).*(\bpassword\b|\btoken\b|\bkey\b|\bsecret\b)" src/ 2>/dev/null; then
    echo -e "${RED}❌ Potential logging of sensitive data detected!${NC}"
    SECURITY_ISSUES=1
fi

echo "📧 Checking for email addresses (excluding package.json)..."
if grep -r -E "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" src/ --exclude-dir=node_modules 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Email addresses found in source code. Review if intentional.${NC}"
fi

echo "🌐 Checking for URLs and IP addresses..."
if grep -r -E "(https?://[^\s\"'<>]+|(?:[0-9]{1,3}\.){3}[0-9]{1,3})" src/ --exclude-dir=node_modules 2>/dev/null; then
    echo -e "${YELLOW}⚠️  URLs or IP addresses found in source code. Review if they're safe to expose.${NC}"
fi

echo "🔑 Checking for private keys..."
if find . -name "*.pem" -o -name "*.key" -o -name "*.p12" -o -name "*.pfx" -o -name "*.keystore" | grep -v node_modules | grep -q .; then
    echo -e "${RED}❌ Private key files detected! Remove them immediately.${NC}"
    SECURITY_ISSUES=1
fi

echo "💾 Checking for backup files..."
if find . -name "*.bak" -o -name "*.backup" -o -name "*.old" -o -name "*~" | grep -v node_modules | grep -q .; then
    echo -e "${YELLOW}⚠️  Backup files found. Review and remove if they contain sensitive data.${NC}"
fi

echo "📦 Running npm audit..."
if ! npm audit --audit-level moderate; then
    echo -e "${RED}❌ Security vulnerabilities found in dependencies!${NC}"
    SECURITY_ISSUES=1
fi

# Final result
if [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All security checks passed! Safe to commit.${NC}"
    exit 0
else
    echo -e "${RED}❌ Security issues found! Please fix them before committing.${NC}"
    exit 1
fi
