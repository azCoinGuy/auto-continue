import * as vscode from 'vscode';
import { ChatInterfaceDetector, ChatCommandExecutor, ChatContentMonitor } from './chatDetection';

interface ChatAutomationConfig {
    enabled: boolean;
    continueDelay: number; // Delay before auto-clicking continue (ms)
    maxContinuations: number; // Maximum number of automatic continuations
    monitorInterval: number; // How often to check for continue buttons (ms)
    smartDetection: boolean; // Use smart detection for continue buttons
}

interface ChatSession {
    id: string;
    continuationCount: number;
    lastContinueTime: number;
    isActive: boolean;
}

export class ChatAutomationManager {
    private config!: ChatAutomationConfig;
    private activeSessions: Map<string, ChatSession> = new Map();
    private monitorTimer: any | undefined;
    private statusBarItem: vscode.StatusBarItem;
    private isMonitoring: boolean = false;
    private lastActionTime: number = 0;
    private readonly MIN_ACTION_INTERVAL = 2000; // Increased to 2 seconds for better UX
    private windowFocusDisposable: vscode.Disposable | undefined;
    private lastWindowFocusTime: number = 0;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'auto-continue.toggleChatAutomation';
        this.updateStatusBar();
        this.setupWindowFocusDetection();
    }

    private setupWindowFocusDetection() {
        // Monitor when the window regains focus (user returns to VS Code)
        this.windowFocusDisposable = vscode.window.onDidChangeWindowState((state) => {
            if (state.focused && this.isMonitoring) {
                const now = Date.now();
                // If user returns to window and some time has passed, trigger continuation
                if (now - this.lastWindowFocusTime > 3000) { // 3 second minimum
                    this.lastWindowFocusTime = now;
                    setTimeout(() => {
                        this.detectAndContinueConversation();
                    }, 1000); // Wait 1 second after focus to continue
                }
            }
        });
        this.context.subscriptions.push(this.windowFocusDisposable);
    }

    private loadConfig() {
        const config = vscode.workspace.getConfiguration('autoContinue.chat');
        this.config = {
            enabled: config.get('enabled', false),
            continueDelay: config.get('continueDelay', 2000),
            maxContinuations: config.get('maxContinuations', 10),
            monitorInterval: config.get('monitorInterval', 1000),
            smartDetection: config.get('smartDetection', true)
        };
    }

    public start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.startMonitoring();
        this.updateStatusBar();
        
        vscode.window.showInformationMessage(
            '🤖 Chat Auto-Continue is now active! Continue buttons will be clicked automatically.',
            'Settings'
        ).then((choice: string | undefined) => {
            if (choice === 'Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'autoContinue.chat');
            }
        });
    }

    public stop() {
        this.isMonitoring = false;
        if (this.monitorTimer) {
            clearTimeout(this.monitorTimer);
            this.monitorTimer = undefined;
        }
        this.activeSessions.clear();
        this.updateStatusBar();
        
        vscode.window.showInformationMessage('Chat Auto-Continue stopped.');
    }

    public toggle() {
        if (this.isMonitoring) {
            this.stop();
        } else {
            this.start();
        }
    }

    private startMonitoring() {
        if (!this.isMonitoring) return;

        this.checkForContinueButtons();
        
        this.monitorTimer = setTimeout(() => {
            this.startMonitoring();
        }, this.config.monitorInterval);
    }

    private async checkForContinueButtons() {
        if (!this.isMonitoring) return;
        
        try {
            // Rate limiting: ensure minimum interval between actions
            const now = Date.now();
            if (now - this.lastActionTime < this.MIN_ACTION_INTERVAL) {
                return;
            }
            this.lastActionTime = now;

            // Primary Method: Check for truncated responses and auto-continue
            await this.detectAndContinueConversation();

        } catch (error) {
            console.error('Error in chat automation:', error);
        }
    }

    private async detectAndContinueConversation(): Promise<void> {
        try {
            // Method 1: Try the most direct Copilot Chat continuation
            const success = await this.tryCopilotChatCommands();
            if (success) {
                this.logContinuation('Copilot Command', 'Direct command success');
                return;
            }

            // Method 2: Try focusing chat and sending continue
            await this.focusAndSendContinue();
            this.logContinuation('Focus & Send', 'Chat focus and continue sent');

        } catch (error) {
            console.log('Continue conversation failed:', error);
        }
    }

    private async tryCopilotChatCommands(): Promise<boolean> {
        const commands = [
            // Most likely Copilot Chat commands
            'github.copilot.chat.continue',
            'github.copilot-chat.continue',
            'workbench.action.chat.continue',
            'copilot.chat.sendMessage'
        ];

        for (const command of commands) {
            try {
                const allCommands = await vscode.commands.getCommands(true);
                if (allCommands.includes(command)) {
                    if (command === 'copilot.chat.sendMessage') {
                        await vscode.commands.executeCommand(command, 'continue');
                    } else {
                        await vscode.commands.executeCommand(command);
                    }
                    return true;
                }
            } catch (error) {
                // Try next command
                continue;
            }
        }
        return false;
    }

    private async focusAndSendContinue(): Promise<void> {
        try {
            // Try to focus GitHub Copilot Chat
            const focusCommands = [
                'workbench.panel.chatSidebar.focus',
                'github.copilot-chat.focus',
                'workbench.view.chatSidebar.focus',
                'workbench.action.chat.open'
            ];

            let focused = false;
            for (const command of focusCommands) {
                try {
                    const allCommands = await vscode.commands.getCommands(true);
                    if (allCommands.includes(command)) {
                        await vscode.commands.executeCommand(command);
                        focused = true;
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (focused) {
                // Wait for focus
                await this.delay(200);
                
                // Type "continue" and press enter
                await vscode.commands.executeCommand('type', { text: 'continue' });
                await this.delay(100);
                
                // Try different ways to submit
                try {
                    await vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
                } catch {
                    try {
                        await vscode.commands.executeCommand('editor.action.insertLineAfter');
                    } catch {
                        // Fallback: simulate enter key
                        await vscode.commands.executeCommand('type', { text: '\n' });
                    }
                }
            }
        } catch (error) {
            console.log('Focus and send continue failed:', error);
        }
    }

    private async detectAndHandleChatContinuations() {
        // Method 1: Use enhanced chat interface detection
        const chatInterface = await ChatInterfaceDetector.detectActiveChatInterface();
        if (chatInterface) {
            console.log(`Detected chat interface: ${chatInterface}`);
            
            // Try to execute continue commands
            const success = await ChatCommandExecutor.executeContinueCommand();
            if (success) {
                this.logContinuation('Enhanced Command Detection', chatInterface);
                return;
            }
        }

        // Method 2: Try legacy VS Code commands
        await this.tryVSCodeChatCommands();
        
        // Method 3: Monitor chat interface for truncation patterns
        await this.monitorChatInterface();
        
        // Method 4: Try keyboard shortcuts
        await this.tryKeyboardAutomation();
    }

    private async tryVSCodeChatCommands() {
        try {
            // Try common chat continuation commands
            const chatCommands = [
                'workbench.action.chat.continue',
                'github.copilot.chat.continue',
                'copilot.chat.continue',
                'chat.action.continue'
            ];

            for (const command of chatCommands) {
                try {
                    const commands = await vscode.commands.getCommands(true);
                    if (commands.includes(command)) {
                        await vscode.commands.executeCommand(command);
                        this.logContinuation('VS Code Command', command);
                        return;
                    }
                } catch (error) {
                    // Command doesn't exist or failed, try next one
                    continue;
                }
            }
        } catch (error) {
            console.log('VS Code chat commands not available:', error);
        }
    }

    private async monitorChatInterface() {
        try {
            // Check if chat view is active and visible
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) return;

            // Try to detect patterns that indicate a continuation is needed
            await this.detectContinuationPatterns();
            
        } catch (error) {
            console.log('Chat interface monitoring error:', error);
        }
    }

    private async detectContinuationPatterns() {
        // Look for common patterns that indicate truncated responses
        const indicators = [
            /\[Continue\]/gi,
            /\.\.\.\s*$/,
            /\[Truncated\]/gi,
            /Click.*continue/gi,
            /Response.*truncated/gi
        ];

        // Check active terminals for chat sessions
        const terminals = vscode.window.terminals;
        for (const terminal of terminals) {
            if (terminal.name.toLowerCase().includes('chat') || 
                terminal.name.toLowerCase().includes('copilot')) {
                // Send continue command to terminal
                await this.sendContinueToTerminal(terminal);
            }
        }
    }

    private async sendContinueToTerminal(terminal: vscode.Terminal) {
        try {
            // Send common continue commands
            const continueCommands = [
                'continue',
                'c',
                'yes',
                'y',
                '\n'
            ];

            for (const cmd of continueCommands) {
                terminal.sendText(cmd);
                await this.delay(500); // Small delay between attempts
            }
            
            this.logContinuation('Terminal', terminal.name);
        } catch (error) {
            console.log('Terminal continue error:', error);
        }
    }

    private async tryWebviewInteraction() {
        try {
            // Try to interact with chat webviews
            const webviewCommand = `
                const continueButtons = document.querySelectorAll('[data-testid*="continue"], .continue-button, button[title*="continue"], button[aria-label*="continue"]');
                continueButtons.forEach(button => {
                    if (button.offsetParent !== null) { // Check if visible
                        button.click();
                        console.log('Auto-clicked continue button');
                    }
                });
            `;

            // This would need to be injected into active webviews
            // For now, log the attempt
            this.logContinuation('Webview Injection', 'Attempted');
            
        } catch (error) {
            console.log('Webview interaction error:', error);
        }
    }

    private async tryKeyboardAutomation() {
        try {
            // Simulate keyboard shortcuts that might trigger continue
            const shortcuts = [
                'workbench.action.chat.submit',
                'workbench.action.chat.sendMessage'
            ];

            for (const shortcut of shortcuts) {
                try {
                    await vscode.commands.executeCommand(shortcut);
                    this.logContinuation('Keyboard Shortcut', shortcut);
                    await this.delay(this.config.continueDelay);
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            console.log('Keyboard automation error:', error);
        }
    }

    private logContinuation(method: string, details: string) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Auto-Continue: ${method} - ${details}`);
        
        // Update session tracking
        const sessionId = 'current';
        let session = this.activeSessions.get(sessionId);
        
        if (!session) {
            session = {
                id: sessionId,
                continuationCount: 0,
                lastContinueTime: Date.now(),
                isActive: true
            };
            this.activeSessions.set(sessionId, session);
        }
        
        session.continuationCount++;
        session.lastContinueTime = Date.now();
        
        // Check if we've hit the max continuations limit
        if (session.continuationCount >= this.config.maxContinuations) {
            vscode.window.showWarningMessage(
                `Auto-Continue has reached the maximum limit of ${this.config.maxContinuations} continuations. Stopping to prevent infinite loops.`,
                'Reset', 'Stop'
            ).then((choice: string | undefined) => {
                if (choice === 'Reset') {
                    session!.continuationCount = 0;
                } else if (choice === 'Stop') {
                    this.stop();
                }
            });
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private updateStatusBar() {
        if (this.isMonitoring) {
            this.statusBarItem.text = "$(sync~spin) Chat Auto-Continue";
            this.statusBarItem.tooltip = "Chat Auto-Continue is active. Click to toggle.";
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = "$(circle-outline) Chat Auto-Continue";
            this.statusBarItem.tooltip = "Chat Auto-Continue is inactive. Click to toggle.";
            this.statusBarItem.backgroundColor = undefined;
        }
        this.statusBarItem.show();
    }

    public showStatistics() {
        const sessions = Array.from(this.activeSessions.values());
        const totalContinuations = sessions.reduce((sum, session) => sum + session.continuationCount, 0);
        
        const stats = `
**Chat Auto-Continue Statistics**

• Active Sessions: ${sessions.length}
• Total Continuations: ${totalContinuations}
• Status: ${this.isMonitoring ? 'Active' : 'Inactive'}
• Max Continuations: ${this.config.maxContinuations}
• Continue Delay: ${this.config.continueDelay}ms

**Session Details:**
${sessions.map(s => `• Session ${s.id}: ${s.continuationCount} continuations`).join('\n')}
        `;

        vscode.window.showInformationMessage(stats, { modal: true });
    }

    public updateConfiguration() {
        this.loadConfig();
        if (this.isMonitoring && this.config.enabled) {
            // Restart with new config
            this.stop();
            this.start();
        }
    }

    private async checkCopilotChatContinuation(): Promise<void> {
        try {
            // Method 1: Try to send a continuation command to Copilot Chat
            const copilotCommands = [
                'github.copilot-chat.continue',
                'github.copilot.chat.continue',
                'workbench.action.chat.continue'
            ];

            for (const command of copilotCommands) {
                try {
                    const allCommands = await vscode.commands.getCommands(true);
                    if (allCommands.includes(command)) {
                        await vscode.commands.executeCommand(command);
                        this.logContinuation('Copilot Command', command);
                        return;
                    }
                } catch (error) {
                    // Command failed, try next one
                    continue;
                }
            }

            // Method 2: Try to send "continue" as a chat message
            await this.sendContinueMessage();

        } catch (error) {
            console.log('Copilot chat continuation failed:', error);
        }
    }

    private async sendContinueMessage(): Promise<void> {
        try {
            // Try to execute a chat command with "continue" message
            const chatCommands = [
                'github.copilot-chat.sendMessage',
                'workbench.action.chat.sendMessage'
            ];

            for (const command of chatCommands) {
                try {
                    const allCommands = await vscode.commands.getCommands(true);
                    if (allCommands.includes(command)) {
                        await vscode.commands.executeCommand(command, 'continue');
                        this.logContinuation('Chat Message', 'continue');
                        return;
                    }
                } catch (error) {
                    continue;
                }
            }

            // Fallback: Try to focus chat and send continue via keyboard simulation
            await this.focusChatAndSendContinue();

        } catch (error) {
            console.log('Send continue message failed:', error);
        }
    }

    private async focusChatAndSendContinue(): Promise<void> {
        try {
            // Try to focus the chat panel
            const focusCommands = [
                'workbench.panel.chatSidebar.focus',
                'github.copilot-chat.focus',
                'workbench.view.chatSidebar.focus'
            ];

            for (const command of focusCommands) {
                try {
                    const allCommands = await vscode.commands.getCommands(true);
                    if (allCommands.includes(command)) {
                        await vscode.commands.executeCommand(command);
                        // Wait a bit for the chat to focus
                        await this.delay(100);
                        
                        // Try to send "continue" command
                        await vscode.commands.executeCommand('type', { text: 'continue' });
                        await this.delay(50);
                        await vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
                        
                        this.logContinuation('Keyboard Input', 'continue typed');
                        return;
                    }
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            console.log('Focus chat and send continue failed:', error);
        }
    }

    private async performContinueAction(chatInterface: string): Promise<void> {
        try {
            await this.delay(this.config.continueDelay);
            
            // Try multiple continuation methods
            await this.checkCopilotChatContinuation();
            
            this.logContinuation('Continue Action', `Executed for ${chatInterface}`);
            
        } catch (error) {
            console.log('Perform continue action failed:', error);
        }
    }

    public dispose() {
        this.stop();
        this.statusBarItem.dispose();
    }
}
