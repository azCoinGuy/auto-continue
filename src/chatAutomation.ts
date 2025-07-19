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
            enabled: config.get('enabled', true), // Fixed: default to true
            continueDelay: config.get('continueDelay', 2000),
            maxContinuations: config.get('maxContinuations', 10),
            monitorInterval: config.get('monitorInterval', 1000),
            smartDetection: config.get('smartDetection', true)
        };
        
        console.log('🔧 Chat Auto-Continue Config Loaded:', this.config);
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
        if (!this.config.enabled || !this.isMonitoring) return;

        const now = Date.now();
        if (now - this.lastActionTime < this.MIN_ACTION_INTERVAL) return;

        try {
            console.log('🔍 Checking for GitHub Copilot Chat continuation opportunity...');

            // Step 1: Always attempt continuation if monitoring is enabled (for debugging)
            // Later we can add smarter detection, but for now let's make it work
            let shouldContinue = true;

            // Optional smart detection (can be disabled for testing)
            if (this.config.smartDetection) {
                const needsContinuation = await this.checkIfCopilotChatNeedsContinuation();
                if (!needsContinuation) {
                    console.log('💡 Smart detection: No continuation needed at this time');
                    return;
                }
            }

            if (shouldContinue) {
                console.log('🚀 Attempting GitHub Copilot Chat continuation...');

                // Step 2: Try the most direct Copilot Chat continuation first
                const success = await this.tryCopilotChatCommands();
                
                if (success) {
                    this.lastActionTime = now;
                    this.logContinuation('GitHub Copilot Commands', 'Direct command success');
                    console.log('✅ Continuation attempt completed successfully');
                    return;
                } else {
                    console.log('⚠️ Direct commands failed, trying alternative methods...');
                    
                    // Step 3: Try the legacy focus and send method
                    await this.focusAndSendContinue();
                    this.lastActionTime = now;
                    this.logContinuation('Focus & Send Fallback', 'Alternative method used');
                    console.log('✅ Fallback continuation attempt completed');
                }
            }

        } catch (error) {
            console.error('❌ Error in detectAndContinueConversation:', error);
        }
    }

    private async checkIfCopilotChatNeedsContinuation(): Promise<boolean> {
        try {
            // Check if GitHub Copilot Chat is available
            const allCommands = await vscode.commands.getCommands(true);
            const hasCopilotChat = allCommands.some(cmd => 
                cmd.includes('copilot') && cmd.includes('chat')
            );

            if (!hasCopilotChat) {
                console.log('GitHub Copilot Chat not detected');
                return false;
            }

            // If smart detection is disabled, always try to continue
            if (!this.config.smartDetection) {
                return true;
            }

            // Check active editor for truncation patterns
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const text = activeEditor.document.getText();
                const truncationPatterns = [
                    /\[Response was truncated\]/gi,
                    /\[Output truncated\]/gi,
                    /\[Continued in next message\]/gi,
                    /Response limit reached/gi,
                    /\.{3,}\s*$/m, // Ends with ellipsis
                    /\bcontinue\b.*\?/gi // Contains "continue?"
                ];

                const hasPattern = truncationPatterns.some(pattern => pattern.test(text));
                if (hasPattern) {
                    console.log('Detected truncation pattern in active editor');
                    return true;
                }
            }

            // Default behavior based on configuration
            return true; // Always try if we have Copilot Chat available

        } catch (error) {
            console.log('Error checking continuation need:', error);
            return true; // Default to trying continuation
        }
    }

    private async tryCopilotChatCommands(): Promise<boolean> {
        // Get all available commands to debug what's actually available
        const allCommands = await vscode.commands.getCommands(true);
        const copilotCommands = allCommands.filter(cmd => 
            cmd.toLowerCase().includes('copilot') && 
            (cmd.toLowerCase().includes('chat') || cmd.toLowerCase().includes('continue'))
        );
        
        console.log('🔍 Available GitHub Copilot commands:', copilotCommands);

        const commands = [
            // GitHub Copilot Chat specific commands (most likely to work)
            'github.copilot.chat.continue',
            'github.copilot-chat.continue',
            'workbench.panel.chat.view.copilot.focus',
            'workbench.action.chat.continue',
            'workbench.panel.chat.view.copilot.newChat',
            'github.copilot.chat.sendMessage',
            // More general chat commands
            'workbench.action.chat.sendMessage',
            'copilot.chat.sendMessage',
            'chat.continue'
        ];

        // First, ensure GitHub Copilot Chat is focused
        try {
            const focusCommands = [
                'workbench.panel.chat.view.copilot.focus',
                'github.copilot.chat.focus',
                'workbench.action.chat.open'
            ];
            
            for (const focusCmd of focusCommands) {
                if (allCommands.includes(focusCmd)) {
                    await vscode.commands.executeCommand(focusCmd);
                    console.log(`✅ Focused using: ${focusCmd}`);
                    await this.delay(300);
                    break;
                }
            }
        } catch (error) {
            console.log('Could not focus Copilot Chat:', error);
        }

        // Try each continue command
        for (const command of commands) {
            try {
                if (allCommands.includes(command)) {
                    if (command.includes('sendMessage')) {
                        await vscode.commands.executeCommand(command, 'continue');
                        console.log(`✅ Successfully executed: ${command} with "continue"`);
                    } else {
                        await vscode.commands.executeCommand(command);
                        console.log(`✅ Successfully executed: ${command}`);
                    }
                    return true;
                }
            } catch (error) {
                console.log(`❌ Command ${command} failed:`, error);
                continue;
            }
        }
        
        // If no commands worked, try the text input method
        console.log('🔄 No direct commands worked, trying text input method...');
        return await this.tryTextInputMethod();
    }

    private async tryTextInputMethod(): Promise<boolean> {
        try {
            console.log('🎯 Attempting text input method for GitHub Copilot Chat...');

            // Focus GitHub Copilot Chat sidebar with multiple attempts
            const focusCommands = [
                'workbench.panel.chat.view.copilot.focus',
                'workbench.view.extension.github-copilot-chat',
                'github.copilot.chat.focus',
                'workbench.action.chat.open',
                'workbench.panel.chatSidebar.focus'
            ];

            const allCommands = await vscode.commands.getCommands(true);
            let focused = false;
            
            for (const command of focusCommands) {
                try {
                    if (allCommands.includes(command)) {
                        await vscode.commands.executeCommand(command);
                        console.log(`✅ Focused using: ${command}`);
                        focused = true;
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (!focused) {
                console.log('❌ Could not focus GitHub Copilot Chat');
                return false;
            }

            // Wait for chat to fully load and focus
            await this.delay(1000);

            // Try multiple ways to focus the input and send continue
            const inputMethods = [
                async () => {
                    // Method 1: Direct input commands
                    await vscode.commands.executeCommand('workbench.action.focusChatInput');
                    await this.delay(200);
                    await vscode.commands.executeCommand('type', { text: 'continue' });
                    await this.delay(200);
                    await vscode.commands.executeCommand('workbench.action.chat.submit');
                },
                async () => {
                    // Method 2: Alternative input focus
                    await vscode.commands.executeCommand('workbench.action.chat.focusInput');
                    await this.delay(200);
                    await vscode.commands.executeCommand('type', { text: 'continue' });
                    await this.delay(200);
                    await vscode.commands.executeCommand('workbench.action.acceptSelectedSuggestion');
                },
                async () => {
                    // Method 3: Simple type and enter
                    await vscode.commands.executeCommand('type', { text: 'continue\n' });
                },
                async () => {
                    // Method 4: Type continue and multiple enter attempts
                    await vscode.commands.executeCommand('type', { text: 'continue' });
                    await this.delay(100);
                    await vscode.commands.executeCommand('type', { text: '\n' });
                }
            ];

            // Try each input method
            for (let i = 0; i < inputMethods.length; i++) {
                try {
                    console.log(`🔄 Trying input method ${i + 1}...`);
                    await inputMethods[i]();
                    console.log(`✅ Text input method ${i + 1} completed`);
                    return true;
                } catch (error) {
                    console.log(`❌ Input method ${i + 1} failed:`, error);
                    continue;
                }
            }

            return false;

        } catch (error) {
            console.log('❌ Text input method failed completely:', error);
            return false;
        }
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

    public async testContinuation(): Promise<void> {
        console.log('🧪 =================================');
        console.log('🧪 MANUAL TEST: GitHub Copilot Chat Auto-Continue');
        console.log('🧪 =================================');
        
        // Show a prominent test message
        await vscode.window.showInformationMessage('🧪 Testing GitHub Copilot Chat Auto-Continue...', 'OK');
        
        // Check if extension is properly configured
        const config = vscode.workspace.getConfiguration('autoContinue.chat');
        const enabled = config.get('enabled', true);
        console.log(`📋 Extension enabled: ${enabled}`);
        console.log(`📋 Continue delay: ${config.get('continueDelay', 2000)}ms`);
        console.log(`📋 Smart detection: ${config.get('smartDetection', true)}`);
        
        if (!enabled) {
            const response = await vscode.window.showWarningMessage(
                '⚠️ Chat Auto-Continue is disabled in settings. Enable it now?', 
                'Yes, Enable', 'No'
            );
            if (response === 'Yes, Enable') {
                await config.update('enabled', true, vscode.ConfigurationTarget.Global);
                console.log('✅ Enabled Chat Auto-Continue');
            } else {
                console.log('❌ Test cancelled - extension disabled');
                return;
            }
        }
        
        // Check if GitHub Copilot is available
        const allCommands = await vscode.commands.getCommands(true);
        const copilotCommands = allCommands.filter(cmd => 
            cmd.toLowerCase().includes('copilot') && 
            (cmd.toLowerCase().includes('chat') || cmd.toLowerCase().includes('continue'))
        );
        
        console.log(`🔍 Found ${copilotCommands.length} GitHub Copilot commands:`);
        copilotCommands.forEach(cmd => console.log(`   • ${cmd}`));
        
        if (copilotCommands.length === 0) {
            await vscode.window.showErrorMessage(
                '❌ No GitHub Copilot commands found. Is GitHub Copilot installed and active?'
            );
            console.log('❌ GitHub Copilot not detected');
            return;
        }
        
        // Test continuation detection
        console.log('🎯 Testing continuation detection...');
        const needsContinuation = await this.checkIfCopilotChatNeedsContinuation();
        console.log(`📊 Continuation needed: ${needsContinuation}`);
        
        // Force a continuation attempt with visual feedback
        console.log('🚀 Testing continuation methods...');
        
        await vscode.window.showInformationMessage('🚀 Now attempting to continue GitHub Copilot Chat...', 'OK');
        
        // Method 1: Direct commands
        console.log('🔄 Testing direct GitHub Copilot commands...');
        const directSuccess = await this.tryCopilotChatCommands();
        
        if (directSuccess) {
            console.log('✅ Direct command method: SUCCESS');
            await vscode.window.showInformationMessage('✅ Direct command method worked!');
        } else {
            console.log('❌ Direct command method: FAILED');
            
            // Method 2: Text input fallback
            console.log('🔄 Testing text input method...');
            const textSuccess = await this.tryTextInputMethod();
            
            if (textSuccess) {
                console.log('✅ Text input method: SUCCESS');
                await vscode.window.showInformationMessage('✅ Text input method worked!');
            } else {
                console.log('❌ Text input method: FAILED');
                await vscode.window.showErrorMessage('❌ All continuation methods failed. Check console for details.');
            }
        }
        
        // Final status
        console.log('🏁 =================================');
        console.log('🏁 TEST COMPLETED');
        console.log('🏁 =================================');
        
        // Start monitoring if not already started
        if (!this.isMonitoring && config.get('enabled', true)) {
            console.log('🎬 Starting automatic monitoring...');
            this.start();
        }
    }

    public dispose() {
        this.stop();
        this.statusBarItem.dispose();
    }
}
