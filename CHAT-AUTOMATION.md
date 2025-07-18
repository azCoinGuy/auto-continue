# Chat Auto-Continue Feature

The Auto Continue extension now includes powerful chat automation capabilities that automatically detect and click "Continue" buttons in chat interfaces, allowing you to go get coffee while long conversations complete unattended.

## 🚀 Key Features

### Automatic Chat Continuation
- **Smart Detection**: Automatically detects when chat responses are truncated
- **Multiple Interface Support**: Works with GitHub Copilot Chat, VS Code built-in chat, and other AI chat extensions
- **Safe Limits**: Configurable maximum continuations to prevent infinite loops
- **Background Operation**: Runs in the background while you work

### Detection Methods
The extension uses multiple sophisticated methods to detect continuation opportunities:

1. **Command Detection**: Identifies and executes VS Code chat continuation commands
2. **Pattern Recognition**: Detects truncation patterns like "[Continue]", "...", "[Truncated]"
3. **Interface Monitoring**: Monitors active chat interfaces for continuation needs
4. **Terminal Integration**: Works with chat sessions running in terminals

## 🛠️ Setup and Configuration

### Enable Chat Auto-Continue
1. Open VS Code settings (`Cmd/Ctrl + ,`)
2. Search for "Auto Continue Chat"
3. Enable `autoContinue.chat.enabled`
4. Configure other settings as needed:

```json
{
  "autoContinue.chat.enabled": true,
  "autoContinue.chat.continueDelay": 2000,
  "autoContinue.chat.maxContinuations": 10,
  "autoContinue.chat.monitorInterval": 1000,
  "autoContinue.chat.smartDetection": true
}
```

### Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `autoContinue.chat.enabled` | `false` | Enable automatic chat continuation |
| `autoContinue.chat.continueDelay` | `2000` | Delay before auto-clicking continue (ms) |
| `autoContinue.chat.maxContinuations` | `10` | Maximum auto-continuations per session |
| `autoContinue.chat.monitorInterval` | `1000` | How often to check for continue buttons (ms) |
| `autoContinue.chat.smartDetection` | `true` | Use intelligent pattern detection |

## 🎮 Commands and Shortcuts

### Commands
- **Start Chat Auto-Continue**: `Auto Continue: Start Chat Auto-Continue`
- **Stop Chat Auto-Continue**: `Auto Continue: Stop Chat Auto-Continue`
- **Toggle Chat Auto-Continue**: `Auto Continue: Toggle Chat Auto-Continue`
- **Show Chat Statistics**: `Auto Continue: Show Chat Statistics`

### Keyboard Shortcuts
- **Toggle Chat Auto-Continue**: `Cmd/Ctrl + Shift + Alt + C`

## 📊 Status Bar Integration

When chat auto-continue is active, you'll see:
- 🟢 `$(sync~spin) Chat Auto-Continue` - Active and monitoring
- ⚪ `$(circle-outline) Chat Auto-Continue` - Inactive

Click the status bar item to toggle chat automation on/off.

## 🔍 How It Works

### Detection Process
1. **Interface Detection**: Scans for active chat interfaces (Copilot Chat, VS Code Chat, etc.)
2. **Content Monitoring**: Monitors chat content for truncation indicators
3. **Command Execution**: Executes appropriate continue commands when needed
4. **Safety Checks**: Respects maximum continuation limits to prevent infinite loops

### Supported Chat Interfaces
- ✅ GitHub Copilot Chat
- ✅ VS Code built-in Chat
- ✅ Terminal-based chat sessions
- ✅ Other AI chat extensions (CodeWhisperer, Claude, etc.)

### Truncation Pattern Recognition
The extension recognizes these patterns as indicators that continuation is needed:
- `[Continue]`
- `...` (at end of responses)
- `[Truncated]`
- `Click to continue`
- `Response truncated`
- `Output truncated`
- `Message too long`
- `[Show more]`

## 🛡️ Safety Features

### Automatic Limits
- **Maximum Continuations**: Prevents infinite loops by limiting auto-continuations per session
- **Smart Detection**: Only continues when genuine truncation is detected
- **User Control**: Easy toggle on/off via status bar or commands

### Error Handling
- Graceful fallback when commands aren't available
- Comprehensive error logging for debugging
- Safe operation that won't interfere with normal VS Code usage

## 📈 Statistics and Monitoring

Use `Auto Continue: Show Chat Statistics` to see:
- Number of active chat sessions
- Total continuations performed
- Current automation status
- Configuration details

## 🎯 Usage Examples

### Example 1: Long Code Generation
1. Start a chat session: "Generate a complete React application with authentication"
2. Enable chat auto-continue: `Cmd/Ctrl + Shift + Alt + C`
3. Go get coffee ☕ - the extension will automatically continue the conversation as needed
4. Return to find the complete application generated

### Example 2: Complex Debugging Session
1. Ask: "Help me debug this complex async/await issue with detailed explanation"
2. Turn on auto-continue
3. Let the AI provide a comprehensive debugging guide automatically
4. Review the complete analysis when you're ready

## 🔧 Troubleshooting

### Chat Auto-Continue Not Working?
1. **Check Settings**: Ensure `autoContinue.chat.enabled` is `true`
2. **Verify Chat Interface**: Make sure you're using a supported chat interface
3. **Check Status Bar**: Look for the chat auto-continue status indicator
4. **Review Output**: Check the Output panel for "Auto Continue" logs

### Common Issues
- **No Continue Buttons Detected**: The chat interface might not be supported yet
- **Too Many Continuations**: Adjust `maxContinuations` setting if hitting limits
- **Slow Response**: Increase `continueDelay` for better reliability

## 🚀 Pro Tips

1. **Adjust Timing**: Increase `continueDelay` for slower systems or unstable connections
2. **Monitor Sessions**: Keep an eye on the statistics to optimize settings
3. **Use with Code Generation**: Perfect for generating large codebases or documentation
4. **Combine Features**: Use alongside regular Auto Continue for complete automation

## 🤝 Contributing

Found a chat interface that should be supported? Want to improve detection algorithms? See our [Contributing Guide](CONTRIBUTING.md) for how to help make chat automation even better!
