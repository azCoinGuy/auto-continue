import * as vscode from 'vscode';

export class ChatInterfaceDetector {
    private static readonly CHAT_INDICATORS = [
        // GitHub Copilot Chat indicators
        'github.copilot.chat',
        'copilot-chat',
        'chat-view',
        
        // VS Code built-in chat
        'workbench.panel.chat',
        'chat-panel',
        
        // Other AI chat extensions
        'codewhisperer',
        'claude',
        'chatgpt'
    ];

    private static readonly CONTINUE_BUTTON_SELECTORS = [
        '[data-testid*="continue"]',
        '.continue-button',
        'button[title*="continue"]',
        'button[aria-label*="continue"]',
        'button[title*="Continue"]',
        'button[aria-label*="Continue"]',
        '.btn-continue',
        '[role="button"][aria-label*="continue"]'
    ];

    public static async detectActiveChatInterface(): Promise<string | null> {
        try {
            // Method 1: Check active webview panels
            const activePanel = await this.checkWebviewPanels();
            if (activePanel) return activePanel;

            // Method 2: Check if chat commands are available
            const chatCommand = await this.checkChatCommands();
            if (chatCommand) return chatCommand;

            // Method 3: Check terminal titles for chat sessions
            const chatTerminal = this.checkTerminals();
            if (chatTerminal) return chatTerminal;

            return null;
        } catch (error) {
            console.error('Error detecting chat interface:', error);
            return null;
        }
    }

    private static async checkWebviewPanels(): Promise<string | null> {
        // This is a conceptual implementation - VS Code doesn't expose active webviews directly
        // We would need to use extension APIs or commands to detect this
        return null;
    }

    private static async checkChatCommands(): Promise<string | null> {
        try {
            const allCommands = await vscode.commands.getCommands(true);
            
            for (const indicator of this.CHAT_INDICATORS) {
                const chatCommands = allCommands.filter(cmd => 
                    cmd.toLowerCase().includes(indicator) || 
                    cmd.toLowerCase().includes('chat')
                );
                
                if (chatCommands.length > 0) {
                    return chatCommands[0];
                }
            }
        } catch (error) {
            console.error('Error checking chat commands:', error);
        }
        
        return null;
    }

    private static checkTerminals(): string | null {
        const terminals = vscode.window.terminals;
        
        for (const terminal of terminals) {
            const name = terminal.name.toLowerCase();
            if (this.CHAT_INDICATORS.some(indicator => name.includes(indicator))) {
                return terminal.name;
            }
        }
        
        return null;
    }

    public static async findContinueButtons(): Promise<string[]> {
        // This would require DOM access in webviews, which is limited
        // For now, return the selectors that could be used
        return this.CONTINUE_BUTTON_SELECTORS;
    }

    public static async detectTruncationPatterns(text: string): Promise<boolean> {
        const truncationPatterns = [
            /\[Continue\]/gi,
            /\.\.\.\s*$/,
            /\[Truncated\]/gi,
            /Click.*continue/gi,
            /Response.*truncated/gi,
            /Output.*truncated/gi,
            /Message.*too.*long/gi,
            /\[\.\.\.continue\]/gi,
            /Continue.*response/gi,
            /\[Show.*more\]/gi
        ];

        return truncationPatterns.some(pattern => pattern.test(text));
    }
}

export class ChatCommandExecutor {
    private static readonly CHAT_CONTINUE_COMMANDS = [
        // GitHub Copilot specific
        'github.copilot.chat.continue',
        'github.copilot.interactiveEditor.continue',
        'copilot.chat.continue',
        
        // VS Code built-in chat
        'workbench.action.chat.continue',
        'workbench.action.chat.submit',
        'workbench.action.chat.sendMessage',
        
        // Generic continue commands
        'chat.action.continue',
        'chat.continue',
        'interactive.continue'
    ];

    public static async executeContinueCommand(): Promise<boolean> {
        for (const command of this.CHAT_CONTINUE_COMMANDS) {
            try {
                const allCommands = await vscode.commands.getCommands(true);
                if (allCommands.includes(command)) {
                    await vscode.commands.executeCommand(command);
                    console.log(`Successfully executed continue command: ${command}`);
                    return true;
                }
            } catch (error) {
                console.log(`Failed to execute command ${command}:`, error);
                continue;
            }
        }
        
        return false;
    }

    public static async sendKeyboardShortcut(shortcut: string): Promise<boolean> {
        try {
            await vscode.commands.executeCommand('workbench.action.sendInputSequence', {
                text: shortcut
            });
            return true;
        } catch (error) {
            console.error('Failed to send keyboard shortcut:', error);
            return false;
        }
    }

    public static async sendTextToActiveTerminal(text: string): Promise<boolean> {
        try {
            const activeTerminal = vscode.window.activeTerminal;
            if (activeTerminal) {
                activeTerminal.sendText(text);
                return true;
            }
        } catch (error) {
            console.error('Failed to send text to terminal:', error);
        }
        
        return false;
    }
}

export class ChatContentMonitor {
    private lastContent: string = '';
    private static readonly CHECK_INTERVAL = 1000;

    public async monitorForContinuationNeeds(callback: (needsContinuation: boolean) => void) {
        setInterval(async () => {
            try {
                const currentContent = await this.getCurrentChatContent();
                if (currentContent && currentContent !== this.lastContent) {
                    const needsContinuation = await ChatInterfaceDetector.detectTruncationPatterns(currentContent);
                    callback(needsContinuation);
                    this.lastContent = currentContent;
                }
            } catch (error) {
                console.error('Error monitoring chat content:', error);
            }
        }, ChatContentMonitor.CHECK_INTERVAL);
    }

    private async getCurrentChatContent(): Promise<string | null> {
        // Try to get content from various sources
        
        // Method 1: Check active text editor (if chat is in editor)
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const document = activeEditor.document;
            if (this.isChatDocument(document)) {
                return document.getText();
            }
        }

        // Method 2: Check terminal output
        const terminals = vscode.window.terminals;
        for (const terminal of terminals) {
            if (this.isChatTerminal(terminal)) {
                // Unfortunately, we can't directly read terminal content
                // But we can trigger commands to get the last output
                return null;
            }
        }

        return null;
    }

    private isChatDocument(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        const languageId = document.languageId.toLowerCase();
        
        return fileName.includes('chat') || 
               fileName.includes('copilot') || 
               languageId === 'chat' ||
               document.uri.scheme === 'copilot-chat';
    }

    private isChatTerminal(terminal: vscode.Terminal): boolean {
        const name = terminal.name.toLowerCase();
        return name.includes('chat') || 
               name.includes('copilot') || 
               name.includes('ai');
    }
}
