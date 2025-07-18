# Contributing to Auto Continue VS Code Extension

Thank you for your interest in contributing to the Auto Continue VS Code Extension! This document provides guidelines and instructions for contributing to this project.

## 🔒 Security First

**CRITICAL**: Before contributing, please review our security requirements:

### 🛡️ **Security Guidelines for Contributors**

1. **Never commit secrets or credentials**:
   - No API keys, tokens, or passwords
   - No hardcoded credentials
   - No personal information
   - No internal URLs or server names

2. **Run security checks before committing**:
   ```bash
   npm run security-check
   ```

3. **Use secure coding practices**:
   - Sanitize all user inputs
   - Validate file paths to prevent directory traversal
   - Never log sensitive information
   - Use VS Code's secure storage for sensitive data

4. **Review the security checklist**:
   - Read `SECURITY-CHECKLIST.md` before contributing
   - Ensure your changes don't introduce vulnerabilities
   - Test your code with malicious inputs

### 🚨 **Security Violations**

If you accidentally commit sensitive data:
1. **Immediately** contact the maintainers
2. **Do NOT** create a public issue
3. Follow the emergency response process in `SECURITY.md`

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- VS Code latest version
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/auto-continue.git
   cd auto-continue
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run security checks:
   ```bash
   npm run security-check
   ```

5. Start development:
   ```bash
   npm run watch
   ```

## 🔧 Development Workflow

### Before Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Ensure all security checks pass:
   ```bash
   npm run security-check
   ```

### Making Changes

1. Follow TypeScript best practices
2. Add tests for new functionality
3. Update documentation if needed
4. Run tests:
   ```bash
   npm test
   ```

5. Run security checks:
   ```bash
   npm run security-check
   ```

### Before Committing

1. **MANDATORY**: Run security check:
   ```bash
   npm run security-check
   ```

2. Run all tests:
   ```bash
   npm test
   ```

3. Check for TypeScript errors:
   ```bash
   npm run check-types
   ```

4. Lint your code:
   ```bash
   npm run lint
   ```

### Commit Guidelines

- Use conventional commit format: `type(scope): description`
- Keep commits atomic and focused
- Write clear, descriptive commit messages
- Reference issues when applicable

Example:
```
feat(completion): add support for Python async patterns

- Implements async/await pattern detection
- Adds tests for async function completion
- Updates documentation

Fixes #123
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run watch-tests

# Run security checks
npm run security-check
```

### Writing Tests

- Place tests in `src/test/`
- Use descriptive test names
- Test both positive and negative cases
- Include security-focused tests
- **Never** use real user data in tests

## 📝 Documentation

When contributing, please update:

- README.md for user-facing changes
- Code comments for complex logic
- CHANGELOG.md for notable changes
- Security documentation for security-related changes

## 🔍 Code Review Process

### Security Review

All contributions undergo security review:

1. **Automated security checks** run on all PRs
2. **Manual security review** by maintainers
3. **Dependency vulnerability scanning**
4. **Code analysis** for security anti-patterns

### Review Criteria

- Security compliance
- Code quality and style
- Test coverage
- Documentation completeness
- Performance impact

## 🚫 What We Don't Accept

- Code with security vulnerabilities
- Contributions that expose sensitive data
- Changes that bypass security measures
- Code that violates user privacy
- Contributions without proper testing

## 📊 Performance Guidelines

- Keep extension startup time minimal
- Use lazy loading for heavy operations
- Monitor memory usage
- Profile performance-critical code

## 🌍 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Give constructive feedback
- Follow our community guidelines

### Security Reporting

- **Do NOT** create public issues for security vulnerabilities
- Use GitHub's private vulnerability reporting
- Follow responsible disclosure practices
- See `SECURITY.md` for details

## 📞 Getting Help

- **General questions**: Create a discussion
- **Bug reports**: Use the bug report template
- **Security issues**: Follow `SECURITY.md`
- **Feature requests**: Use the feature request template

## 🏷️ Labels and Issue Management

- `security`: Security-related issues
- `bug`: Bug reports
- `enhancement`: Feature requests
- `documentation`: Documentation improvements
- `good first issue`: Beginner-friendly issues

## 🎯 Contribution Goals

We welcome contributions that:

- Improve extension functionality
- Enhance security and privacy
- Optimize performance
- Improve user experience
- Add comprehensive tests
- Enhance documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

**Remember**: Security is our top priority. When in doubt about security implications, ask the maintainers before proceeding.

Thank you for helping make Auto Continue better and more secure! 🚀🔒