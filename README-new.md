# Auto Continue VS Code Extension

A powerful VS Code extension that automatically continues code patterns and development workflows, making coding more efficient and reducing repetitive typing.

## Features

- **Automatic Pattern Detection**: Intelligently detects common code patterns like loops, conditionals, functions, and data structures
- **Smart Code Continuation**: Automatically generates appropriate code continuations based on context
- **Configurable Timing**: Customize the delay before auto-continuation triggers
- **Manual Trigger**: Use keyboard shortcuts to manually trigger pattern continuation
- **Visual Status**: Status bar indicator shows when Auto Continue is active
- **Flexible Configuration**: Customize behavior through VS Code settings

## Usage

### Commands

- **Start Auto Continue**: `Auto Continue: Start Auto Continue`
- **Stop Auto Continue**: `Auto Continue: Stop Auto Continue`
- **Toggle Mode**: `Auto Continue: Toggle Auto Continue Mode`
- **Continue Current Pattern**: `Auto Continue: Continue Typing Current Pattern`

### Keyboard Shortcuts

- `Cmd+Shift+A` (Mac) / `Ctrl+Shift+A` (Windows/Linux): Toggle Auto Continue mode
- `Cmd+Shift+C` (Mac) / `Ctrl+Shift+C` (Windows/Linux): Continue current pattern manually

### Supported Patterns

The extension automatically detects and continues these code patterns:

1. **Loops**: `for`, `while`, `forEach` statements
2. **Conditionals**: `if`, `else`, `switch` statements
3. **Functions**: Function declarations and arrow functions
4. **Arrays and Objects**: Array and object literal initialization

## Configuration

Configure Auto Continue through VS Code settings:

```json
{
  "autoContinue.enabled": false,        // Enable/disable functionality
  "autoContinue.delay": 1000,           // Delay in milliseconds before auto-continuing
  "autoContinue.maxLines": 10           // Maximum number of lines to auto-continue
}
```

## Examples

### Loop Continuation
When you type:
```javascript
for (let i = 0; i < array.length; i++) {
```

Auto Continue will add:
```javascript
for (let i = 0; i < array.length; i++) {
    // TODO: Implement loop body
}
```

### Function Continuation
When you type:
```javascript
function calculateSum(a, b) {
```

Auto Continue will add:
```javascript
function calculateSum(a, b) {
    // TODO: Implement function body
}
```

## Installation

1. Install from VS Code Marketplace (when published)
2. Or install from VSIX file:
   - Download the `.vsix` file
   - Open VS Code
   - Run command `Extensions: Install from VSIX...`
   - Select the downloaded file

## Development

### Prerequisites

- Node.js 20.x or higher
- npm
- VS Code

### Building

```bash
npm install
npm run compile
```

### Testing

```bash
npm test
```

### Debugging

1. Open the project in VS Code
2. Press `F5` to open a new Extension Development Host window
3. Test your extension in the new window

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Release Notes

### 0.0.1

- Initial release
- Basic auto-continuation for loops, conditionals, functions, and data structures
- Configurable settings
- Keyboard shortcuts
- Status bar integration
