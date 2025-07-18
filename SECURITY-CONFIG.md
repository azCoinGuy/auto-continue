# Security Configuration for Auto Continue Extension

## Content Security Policy
This extension enforces strict content security policies:

### Command Execution
- Only whitelisted VS Code commands are allowed
- Command names are validated with regex patterns
- Rate limiting prevents abuse

### Input Validation
- All JSON inputs are sanitized to prevent prototype pollution
- Terminal commands are restricted to safe continuation commands only
- Keyboard shortcuts are validated for safe patterns

### File Operations
- Only VS Code Workspace FS APIs are used
- No direct Node.js file system access
- Settings import/export is sanitized

### Network Security
- No external network requests
- All operations are local to VS Code environment
- No data transmission outside VS Code

## Allowed Command Patterns
```regex
^[a-zA-Z0-9._-]+$
```

## Allowed Terminal Commands
- continue
- c
- yes
- y
- (newline)

## Rate Limiting
- Minimum 500ms between automation actions
- Maximum 10 continuations per session (configurable)
- Monitor interval minimum 1000ms

## Data Sanitization
### JSON Parsing
- Validates structure before parsing
- Filters dangerous properties (__proto__, constructor, prototype)
- Type validation for all imported data

### String Inputs
- Removes shell metacharacters: ;&|`$()
- Length limits on all inputs
- Pattern validation for commands and shortcuts

## Security Headers
This extension implements security best practices:
- Input validation on all user inputs
- Output encoding for any dynamic content
- Principle of least privilege
- Defense in depth

## Vulnerability Mitigation
- **Code Injection**: Command validation and whitelisting
- **Prototype Pollution**: JSON sanitization and property filtering
- **DoS**: Rate limiting and resource constraints
- **XSS**: No innerHTML or dangerous DOM manipulation
- **Command Injection**: Terminal command sanitization

## Security Testing
Run security validation:
```bash
./scripts/security-validation-enhanced.sh
```

## Incident Response
If security issues are discovered:
1. Disable affected functionality immediately
2. Update to patched version
3. Report to VS Code Marketplace if needed
4. Notify users through update changelog

## Security Contact
For security issues, please follow responsible disclosure practices.
