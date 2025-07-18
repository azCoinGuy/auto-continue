#!/bin/bash

# Enhanced Security Validation Script for Auto Continue Extension
# This script performs comprehensive security checks

set -e

echo "🔒 Enhanced Security Validation Starting..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SECURITY_ISSUES=0

# Function to report security issues
report_issue() {
    echo -e "${RED}🚨 SECURITY ISSUE: $1${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
}

report_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

report_pass() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "📋 Checking for dangerous patterns in code..."

# Check for eval() usage
if grep -r "eval(" src/ --include="*.ts" --include="*.js" 2>/dev/null; then
    report_issue "Found eval() usage - potential code injection vulnerability"
else
    report_pass "No eval() usage found"
fi

# Check for unsafe JSON.parse without validation
if grep -r "JSON\.parse(" src/ --include="*.ts" --include="*.js" | grep -v "try\|catch\|validate\|sanitize" 2>/dev/null; then
    report_warning "Found JSON.parse() usage - ensure proper validation"
else
    report_pass "JSON.parse() usage appears safe"
fi

# Check for command execution patterns
if grep -r "executeCommand\|sendText\|spawn\|exec" src/ --include="*.ts" --include="*.js" | grep -v "vscode\.commands\.executeCommand" 2>/dev/null; then
    report_warning "Found command execution patterns - verify input validation"
else
    report_pass "Command execution patterns appear safe"
fi

# Check for prototype pollution vulnerabilities
if grep -r "__proto__\|constructor\|prototype" src/ --include="*.ts" --include="*.js" | grep -v "// \|/\*\|\*\/" | grep -v "typeof\|instanceof" 2>/dev/null; then
    report_warning "Found prototype-related patterns - check for pollution vulnerabilities"
else
    report_pass "No prototype pollution patterns found"
fi

# Check for hardcoded secrets (enhanced)
echo "🔍 Checking for hardcoded secrets..."
SECRET_PATTERNS=(
    "api[_-]?key"
    "secret[_-]?key"
    "private[_-]?key"
    "access[_-]?token"
    "auth[_-]?token"
    "password"
    "passwd"
    "credentials"
    "bearer"
    "oauth"
    "jwt"
    "ssh-rsa"
    "-----BEGIN"
    "AKIA[0-9A-Z]{16}"
    "AIza[0-9A-Za-z\\-_]{35}"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -ri "$pattern" src/ --include="*.ts" --include="*.js" --exclude="*.test.ts" 2>/dev/null | grep -v "// \|/\*\|\*\/" | grep -v "description\|comment\|TODO"; then
        report_issue "Found potential secret pattern: $pattern"
    fi
done

# Check for unsafe file operations
echo "📁 Checking file operations..."
if grep -r "fs\.readFile\|fs\.writeFile" src/ --include="*.ts" --include="*.js" | grep -v "vscode\.workspace\.fs" 2>/dev/null; then
    report_warning "Found direct file system access - ensure proper sanitization"
else
    report_pass "File operations use VS Code API safely"
fi

# Check for XSS vulnerabilities in webview content
echo "🌐 Checking for XSS vulnerabilities..."
if grep -r "innerHTML\|outerHTML\|document\.write" src/ --include="*.ts" --include="*.js" 2>/dev/null; then
    report_issue "Found potential XSS vulnerability patterns"
else
    report_pass "No XSS vulnerability patterns found"
fi

# Check for unsafe regular expressions (ReDoS)
echo "🔄 Checking for ReDoS vulnerabilities..."
if grep -r "\(\.\*\)\+\|\(\.\+\)\+\|\(\[.*\]\)\*\|\(\[.*\]\)\+" src/ --include="*.ts" --include="*.js" 2>/dev/null; then
    report_warning "Found potentially vulnerable regex patterns"
else
    report_pass "No ReDoS vulnerability patterns found"
fi

# Check dependencies for known vulnerabilities
echo "📦 Running npm audit..."
if ! npm audit --audit-level=moderate; then
    report_issue "npm audit found vulnerabilities"
else
    report_pass "No npm vulnerabilities found"
fi

# Check for missing input validation on user inputs
echo "🎯 Checking input validation..."
if grep -r "window\.showInputBox\|window\.showOpenDialog" src/ --include="*.ts" --include="*.js" -A 10 | grep -v "validate\|sanitize\|filter\|check" 2>/dev/null; then
    report_warning "Found user input without apparent validation"
else
    report_pass "User input validation appears present"
fi

# Check for unsafe URL handling
echo "🔗 Checking URL handling..."
if grep -r "http://\|ftp://\|file://" src/ --include="*.ts" --include="*.js" --exclude="*.test.ts" 2>/dev/null | grep -v "// \|/\*\|\*\/"; then
    report_warning "Found hardcoded URLs - verify security"
else
    report_pass "No hardcoded insecure URLs found"
fi

# Check for proper error handling
echo "🛡️ Checking error handling..."
if grep -r "catch" src/ --include="*.ts" --include="*.js" | grep -c "console\.log\|console\.error" >/dev/null; then
    report_pass "Error handling with logging found"
else
    report_warning "Limited error handling found"
fi

# Summary
echo ""
echo "📊 Security Validation Summary:"
echo "=============================="

if [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 No critical security issues found!${NC}"
    echo -e "${GREEN}✅ Extension appears secure for release${NC}"
    exit 0
else
    echo -e "${RED}🚨 Found $SECURITY_ISSUES critical security issues${NC}"
    echo -e "${RED}❌ Fix these issues before release${NC}"
    exit 1
fi
