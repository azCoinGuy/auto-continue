// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface AutoContinueConfig {
	enabled: boolean;
	delay: number;
	maxLines: number;
}

class AutoContinueManager {
	private isActive: boolean = false;
	private timeout: NodeJS.Timeout | undefined;
	private statusBarItem: vscode.StatusBarItem;
	private config!: AutoContinueConfig; // Using definite assignment assertion

	constructor(private context: vscode.ExtensionContext) {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.statusBarItem.command = 'auto-continue.toggleMode';
		this.context.subscriptions.push(this.statusBarItem);
		this.updateConfig();
		this.updateStatusBar();
	}

	private updateConfig() {
		const config = vscode.workspace.getConfiguration('autoContinue');
		this.config = {
			enabled: config.get('enabled', false),
			delay: config.get('delay', 1000),
			maxLines: config.get('maxLines', 10)
		};
	}

	private updateStatusBar() {
		if (this.isActive) {
			this.statusBarItem.text = "$(sync~spin) Auto Continue";
			this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
		} else {
			this.statusBarItem.text = "$(circle-outline) Auto Continue";
			this.statusBarItem.backgroundColor = undefined;
		}
		this.statusBarItem.show();
	}

	public start() {
		this.isActive = true;
		this.updateStatusBar();
		vscode.window.showInformationMessage('Auto Continue started! It will automatically continue patterns in your code.');
		this.setupDocumentChangeListener();
	}

	public stop() {
		this.isActive = false;
		this.updateStatusBar();
		if (this.timeout) {
			clearTimeout(this.timeout);
			this.timeout = undefined;
		}
		vscode.window.showInformationMessage('Auto Continue stopped.');
	}

	public toggle() {
		if (this.isActive) {
			this.stop();
		} else {
			this.start();
		}
	}

	private setupDocumentChangeListener() {
		if (!this.isActive) {
			return;
		}

		const disposable = vscode.workspace.onDidChangeTextDocument((event) => {
			if (!this.isActive || !event.document || event.document.isClosed) {
				return;
			}

			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.document !== event.document) {
				return;
			}

			// Clear existing timeout
			if (this.timeout) {
				clearTimeout(this.timeout);
			}

			// Set new timeout for auto-continue
			this.timeout = setTimeout(() => {
				this.performAutoContinue(editor);
			}, this.config.delay);
		});

		this.context.subscriptions.push(disposable);
	}

	private async performAutoContinue(editor: vscode.TextEditor) {
		if (!this.isActive) {
			return;
		}

		const document = editor.document;
		const position = editor.selection.active;
		const currentLine = document.lineAt(position.line);
		
		// Analyze the current context and generate continuation
		const continuation = this.generateContinuation(document, position);
		
		if (continuation) {
			const edit = new vscode.WorkspaceEdit();
			const insertPosition = new vscode.Position(position.line, currentLine.text.length);
			edit.insert(document.uri, insertPosition, continuation);
			
			await vscode.workspace.applyEdit(edit);
			
			// Move cursor to end of inserted text
			const newPosition = new vscode.Position(
				insertPosition.line + continuation.split('\n').length - 1,
				continuation.split('\n').pop()?.length || 0
			);
			editor.selection = new vscode.Selection(newPosition, newPosition);
		}
	}

	private generateContinuation(document: vscode.TextDocument, position: vscode.Position): string | null {
		const currentLine = document.lineAt(position.line);
		const lineText = currentLine.text.trim();
		
		// Detect patterns and generate appropriate continuations
		if (this.isLoopPattern(lineText)) {
			return this.generateLoopContinuation(document, position);
		}
		
		if (this.isConditionalPattern(lineText)) {
			return this.generateConditionalContinuation(document, position);
		}
		
		if (this.isFunctionPattern(lineText)) {
			return this.generateFunctionContinuation(document, position);
		}
		
		if (this.isArrayOrObjectPattern(lineText)) {
			return this.generateArrayObjectContinuation(document, position);
		}
		
		return null;
	}

	private isLoopPattern(line: string): boolean {
		return /\b(for|while|forEach)\b/.test(line) && line.includes('{') && !line.includes('}');
	}

	private isConditionalPattern(line: string): boolean {
		return /\b(if|else|switch)\b/.test(line) && line.includes('{') && !line.includes('}');
	}

	private isFunctionPattern(line: string): boolean {
		return /\b(function|=>|\w+\s*\(.*\)\s*{)\b/.test(line) && !line.includes('}');
	}

	private isArrayOrObjectPattern(line: string): boolean {
		return (line.includes('[') && !line.includes(']')) || 
			   (line.includes('{') && !line.includes('}') && !this.isLoopPattern(line) && !this.isConditionalPattern(line));
	}

	private generateLoopContinuation(document: vscode.TextDocument, position: vscode.Position): string {
		const indentation = this.getIndentation(document.lineAt(position.line).text);
		return `\n${indentation}    // TODO: Implement loop body\n${indentation}}`;
	}

	private generateConditionalContinuation(document: vscode.TextDocument, position: vscode.Position): string {
		const indentation = this.getIndentation(document.lineAt(position.line).text);
		return `\n${indentation}    // TODO: Implement condition body\n${indentation}}`;
	}

	private generateFunctionContinuation(document: vscode.TextDocument, position: vscode.Position): string {
		const indentation = this.getIndentation(document.lineAt(position.line).text);
		return `\n${indentation}    // TODO: Implement function body\n${indentation}}`;
	}

	private generateArrayObjectContinuation(document: vscode.TextDocument, position: vscode.Position): string {
		const currentLine = document.lineAt(position.line).text;
		const indentation = this.getIndentation(currentLine);
		
		if (currentLine.includes('[')) {
			return `\n${indentation}    // TODO: Add array elements\n${indentation}]`;
		} else {
			return `\n${indentation}    // TODO: Add object properties\n${indentation}}`;
		}
	}

	private getIndentation(line: string): string {
		const match = line.match(/^(\s*)/);
		return match ? match[1] : '';
	}

	public async continueCurrentPattern() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor found.');
			return;
		}

		await this.performAutoContinue(editor);
		vscode.window.showInformationMessage('Pattern continuation applied!');
	}
}

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Auto Continue extension is now active!');

	const autoContinueManager = new AutoContinueManager(context);

	// Register commands
	const startCommand = vscode.commands.registerCommand('auto-continue.start', () => {
		autoContinueManager.start();
	});

	const stopCommand = vscode.commands.registerCommand('auto-continue.stop', () => {
		autoContinueManager.stop();
	});

	const toggleCommand = vscode.commands.registerCommand('auto-continue.toggleMode', () => {
		autoContinueManager.toggle();
	});

	const continueTypingCommand = vscode.commands.registerCommand('auto-continue.continueTyping', () => {
		autoContinueManager.continueCurrentPattern();
	});

	// Add commands to subscriptions
	context.subscriptions.push(startCommand, stopCommand, toggleCommand, continueTypingCommand);

	// Listen for configuration changes
	const configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('autoContinue')) {
			vscode.window.showInformationMessage('Auto Continue configuration updated!');
		}
	});

	context.subscriptions.push(configChangeListener);

	vscode.window.showInformationMessage('Auto Continue extension loaded! Use Cmd+Shift+A to toggle or Cmd+Shift+C to continue current pattern.');
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('Auto Continue extension deactivated.');
}
