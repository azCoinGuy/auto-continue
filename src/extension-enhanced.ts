// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';

interface AutoContinueConfig {
	enabled: boolean;
	delay: number;
	maxLines: number;
	enabledLanguages: string[];
	useInlineCompletion: boolean;
	learnPatterns: boolean;
	customTemplates: { [key: string]: string };
	showPreview: boolean;
	minimumTriggerLength: number;
}

interface CodePattern {
	pattern: RegExp;
	language: string[];
	generator: (match: RegExpMatchArray, context: PatternContext) => string | null;
	description: string;
}

interface PatternContext {
	document: vscode.TextDocument;
	position: vscode.Position;
	line: vscode.TextLine;
	indentation: string;
	languageId: string;
}

interface LearnedPattern {
	trigger: string;
	completion: string;
	language: string;
	frequency: number;
	lastUsed: Date;
}

class PatternLearner {
	private patterns: Map<string, LearnedPattern> = new Map();
	private maxPatterns = 1000;

	public learnPattern(trigger: string, completion: string, language: string) {
		const key = `${language}:${trigger}`;
		const existing = this.patterns.get(key);
		
		if (existing) {
			existing.frequency++;
			existing.lastUsed = new Date();
		} else {
			if (this.patterns.size >= this.maxPatterns) {
				this.cleanupOldPatterns();
			}
			
			this.patterns.set(key, {
				trigger,
				completion,
				language,
				frequency: 1,
				lastUsed: new Date()
			});
		}
	}

	public getPattern(trigger: string, language: string): string | null {
		const key = `${language}:${trigger}`;
		const pattern = this.patterns.get(key);
		return pattern?.completion || null;
	}

	private cleanupOldPatterns() {
		const entries = Array.from(this.patterns.entries());
		entries.sort((a, b) => {
			// Sort by frequency (descending) and then by last used (descending)
			if (a[1].frequency !== b[1].frequency) {
				return b[1].frequency - a[1].frequency;
			}
			return b[1].lastUsed.getTime() - a[1].lastUsed.getTime();
		});

		// Keep only the top 80% of patterns
		const keepCount = Math.floor(this.maxPatterns * 0.8);
		this.patterns.clear();
		
		for (let i = 0; i < keepCount && i < entries.length; i++) {
			this.patterns.set(entries[i][0], entries[i][1]);
		}
	}

	public exportPatterns(): string {
		return JSON.stringify(Array.from(this.patterns.entries()));
	}

	public importPatterns(data: string) {
		try {
			const entries = JSON.parse(data);
			this.patterns = new Map(entries.map(([key, value]: [string, any]) => [
				key,
				{
					...value,
					lastUsed: new Date(value.lastUsed)
				}
			]));
		} catch (error) {
			console.error('Failed to import patterns:', error);
		}
	}
}

class LanguagePatterns {
	private static patterns: CodePattern[] = [
		// JavaScript/TypeScript patterns
		{
			pattern: /^(\s*)(for\s*\([^)]*\)\s*\{)\s*$/,
			language: ['javascript', 'typescript'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Implement for loop body\n${match[1]}}`,
			description: 'For loop completion'
		},
		{
			pattern: /^(\s*)(while\s*\([^)]*\)\s*\{)\s*$/,
			language: ['javascript', 'typescript'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Implement while loop body\n${match[1]}}`,
			description: 'While loop completion'
		},
		{
			pattern: /^(\s*)(if\s*\([^)]*\)\s*\{)\s*$/,
			language: ['javascript', 'typescript'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Implement condition\n${match[1]}}`,
			description: 'If statement completion'
		},
		{
			pattern: /^(\s*)(function\s+\w+\s*\([^)]*\)\s*\{)\s*$/,
			language: ['javascript', 'typescript'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Implement function body\n${match[1]}}`,
			description: 'Function declaration completion'
		},
		{
			pattern: /^(\s*)(const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{)\s*$/,
			language: ['javascript', 'typescript'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Implement arrow function\n${match[1]}};`,
			description: 'Arrow function completion'
		},
		{
			pattern: /^(\s*)(class\s+\w+\s*.*\{)\s*$/,
			language: ['javascript', 'typescript'],
			generator: (match, ctx) => `\n${match[1]}    constructor() {\n${match[1]}        // TODO: Implement constructor\n${match[1]}    }\n${match[1]}}`,
			description: 'Class declaration completion'
		},
		{
			pattern: /^(\s*)(try\s*\{)\s*$/,
			language: ['javascript', 'typescript'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Add try block content\n${match[1]}} catch (error) {\n${match[1]}    // TODO: Handle error\n${match[1]}}`,
			description: 'Try-catch completion'
		},

		// Python patterns
		{
			pattern: /^(\s*)(for\s+\w+\s+in\s+[^:]+:)\s*$/,
			language: ['python'],
			generator: (match, ctx) => `\n${match[1]}    # TODO: Implement for loop body\n${match[1]}    pass`,
			description: 'Python for loop completion'
		},
		{
			pattern: /^(\s*)(while\s+[^:]+:)\s*$/,
			language: ['python'],
			generator: (match, ctx) => `\n${match[1]}    # TODO: Implement while loop body\n${match[1]}    pass`,
			description: 'Python while loop completion'
		},
		{
			pattern: /^(\s*)(if\s+[^:]+:)\s*$/,
			language: ['python'],
			generator: (match, ctx) => `\n${match[1]}    # TODO: Implement condition\n${match[1]}    pass`,
			description: 'Python if statement completion'
		},
		{
			pattern: /^(\s*)(def\s+\w+\s*\([^)]*\):)\s*$/,
			language: ['python'],
			generator: (match, ctx) => `\n${match[1]}    """TODO: Add function documentation"""\n${match[1]}    pass`,
			description: 'Python function completion'
		},
		{
			pattern: /^(\s*)(class\s+\w+.*:)\s*$/,
			language: ['python'],
			generator: (match, ctx) => `\n${match[1]}    """TODO: Add class documentation"""\n${match[1]}    \n${match[1]}    def __init__(self):\n${match[1]}        # TODO: Implement constructor\n${match[1]}        pass`,
			description: 'Python class completion'
		},

		// Java patterns
		{
			pattern: /^(\s*)(for\s*\([^)]*\)\s*\{)\s*$/,
			language: ['java'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Implement for loop body\n${match[1]}}`,
			description: 'Java for loop completion'
		},
		{
			pattern: /^(\s*)(public\s+class\s+\w+\s*.*\{)\s*$/,
			language: ['java'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Add class members and methods\n${match[1]}}`,
			description: 'Java class completion'
		},

		// Generic patterns for arrays and objects
		{
			pattern: /^(\s*)(.*\[\s*)$/,
			language: ['javascript', 'typescript', 'python', 'java'],
			generator: (match, ctx) => `\n${match[1]}    // TODO: Add array elements\n${match[1]}]`,
			description: 'Array literal completion'
		},
		{
			pattern: /^(\s*)(.*\{\s*)$/,
			language: ['javascript', 'typescript'],
			generator: (match, ctx) => {
				if (match[2].includes('function') || match[2].includes('class') || match[2].includes('if') || match[2].includes('for') || match[2].includes('while')) {
					return null; // Skip if it's already handled by other patterns
				}
				return `\n${match[1]}    // TODO: Add object properties\n${match[1]}}`;
			},
			description: 'Object literal completion'
		}
	];

	public static getMatchingPattern(context: PatternContext): CodePattern | null {
		const lineText = context.line.text;
		
		for (const pattern of this.patterns) {
			if (pattern.language.includes(context.languageId)) {
				const match = lineText.match(pattern.pattern);
				if (match) {
					return pattern;
				}
			}
		}
		
		return null;
	}

	public static getAllPatterns(): CodePattern[] {
		return [...this.patterns];
	}

	public static addCustomPattern(pattern: CodePattern) {
		this.patterns.push(pattern);
	}
}

class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
	constructor(private autoContinueManager: AutoContinueManager) {}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {
		
		if (!this.autoContinueManager.isEnabled() || context.triggerKind !== vscode.InlineCompletionTriggerKind.Automatic) {
			return undefined;
		}

		const line = document.lineAt(position.line);
		const completion = this.autoContinueManager.generateInlineCompletion(document, position);
		
		if (completion) {
			return [{
				insertText: completion,
				range: new vscode.Range(position, position)
			}];
		}

		return undefined;
	}
}

class AutoContinueManager {
	private isActive: boolean = false;
	private timeout: NodeJS.Timeout | undefined;
	private statusBarItem: vscode.StatusBarItem;
	private config!: AutoContinueConfig;
	private patternLearner: PatternLearner;
	private inlineProvider: InlineCompletionProvider;
	private diagnosticCollection: vscode.DiagnosticCollection;

	constructor(private context: vscode.ExtensionContext) {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.statusBarItem.command = 'auto-continue.toggleMode';
		this.context.subscriptions.push(this.statusBarItem);
		
		this.patternLearner = new PatternLearner();
		this.inlineProvider = new InlineCompletionProvider(this);
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection('auto-continue');
		
		this.updateConfig();
		this.updateStatusBar();
		this.loadLearnedPatterns();
		this.registerInlineCompletionProvider();
	}

	private registerInlineCompletionProvider() {
		const disposable = vscode.languages.registerInlineCompletionItemProvider(
			{ pattern: '**' },
			this.inlineProvider
		);
		this.context.subscriptions.push(disposable);
	}

	private updateConfig() {
		const config = vscode.workspace.getConfiguration('autoContinue');
		this.config = {
			enabled: config.get('enabled', false),
			delay: config.get('delay', 1000),
			maxLines: config.get('maxLines', 10),
			enabledLanguages: config.get('enabledLanguages', ['javascript', 'typescript', 'python', 'java']),
			useInlineCompletion: config.get('useInlineCompletion', true),
			learnPatterns: config.get('learnPatterns', true),
			customTemplates: config.get('customTemplates', {}),
			showPreview: config.get('showPreview', true),
			minimumTriggerLength: config.get('minimumTriggerLength', 3)
		};
	}

	private updateStatusBar() {
		if (this.isActive) {
			this.statusBarItem.text = "$(sync~spin) Auto Continue";
			this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
			this.statusBarItem.tooltip = "Auto Continue is active. Click to toggle.";
		} else {
			this.statusBarItem.text = "$(circle-outline) Auto Continue";
			this.statusBarItem.backgroundColor = undefined;
			this.statusBarItem.tooltip = "Auto Continue is inactive. Click to toggle.";
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
		this.diagnosticCollection.clear();
		vscode.window.showInformationMessage('Auto Continue stopped.');
	}

	public toggle() {
		if (this.isActive) {
			this.stop();
		} else {
			this.start();
		}
	}

	public isEnabled(): boolean {
		return this.isActive && this.config.enabled;
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

			if (!this.config.enabledLanguages.includes(event.document.languageId)) {
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

		try {
			const document = editor.document;
			const position = editor.selection.active;
			const currentLine = document.lineAt(position.line);
			
			if (currentLine.text.trim().length < this.config.minimumTriggerLength) {
				return;
			}

			// Analyze the current context and generate continuation
			const continuation = this.generateContinuation(document, position);
			
			if (continuation) {
				if (this.config.showPreview) {
					const previewResult = await this.showPreview(continuation);
					if (!previewResult) {
						return;
					}
				}

				await this.applyContinuation(editor, continuation, position);
				
				// Learn from this pattern if enabled
				if (this.config.learnPatterns) {
					this.learnFromPattern(currentLine.text.trim(), continuation, document.languageId);
				}
			}
		} catch (error) {
			console.error('Auto Continue error:', error);
			this.showDiagnostic(editor.document, editor.selection.active, 'Auto Continue encountered an error');
		}
	}

	public generateInlineCompletion(document: vscode.TextDocument, position: vscode.Position): string | null {
		if (!this.config.useInlineCompletion) {
			return null;
		}

		return this.generateContinuation(document, position);
	}

	private generateContinuation(document: vscode.TextDocument, position: vscode.Position): string | null {
		const currentLine = document.lineAt(position.line);
		const lineText = currentLine.text;
		const languageId = document.languageId;
		
		// Check learned patterns first
		if (this.config.learnPatterns) {
			const learnedCompletion = this.patternLearner.getPattern(lineText.trim(), languageId);
			if (learnedCompletion) {
				return learnedCompletion;
			}
		}

		// Check custom templates
		const customTemplate = this.config.customTemplates[lineText.trim()];
		if (customTemplate) {
			return this.processTemplate(customTemplate, {
				document,
				position,
				line: currentLine,
				indentation: this.getIndentation(lineText),
				languageId
			});
		}

		// Check built-in patterns
		const context: PatternContext = {
			document,
			position,
			line: currentLine,
			indentation: this.getIndentation(lineText),
			languageId
		};

		const matchedPattern = LanguagePatterns.getMatchingPattern(context);
		if (matchedPattern) {
			const match = lineText.match(matchedPattern.pattern);
			if (match) {
				const result = matchedPattern.generator(match, context);
				return result;
			}
		}
		
		return null;
	}

	private async showPreview(continuation: string): Promise<boolean> {
		const action = await vscode.window.showInformationMessage(
			`Auto Continue suggests: ${continuation.slice(0, 50)}${continuation.length > 50 ? '...' : ''}`,
			{ modal: false },
			'Apply',
			'Dismiss'
		);
		
		return action === 'Apply';
	}

	private async applyContinuation(editor: vscode.TextEditor, continuation: string, position: vscode.Position) {
		const document = editor.document;
		const currentLine = document.lineAt(position.line);
		
		const edit = new vscode.WorkspaceEdit();
		const insertPosition = new vscode.Position(position.line, currentLine.text.length);
		edit.insert(document.uri, insertPosition, continuation);
		
		await vscode.workspace.applyEdit(edit);
		
		// Move cursor to appropriate position
		const lines = continuation.split('\n');
		const lastLine = lines[lines.length - 1];
		const newPosition = new vscode.Position(
			insertPosition.line + lines.length - 1,
			lines.length === 1 ? insertPosition.character + continuation.length : lastLine.length
		);
		
		// Find the TODO comment and position cursor there if possible
		const todoMatch = continuation.match(/\/\/ TODO:|# TODO:/);
		if (todoMatch) {
			const todoIndex = continuation.indexOf(todoMatch[0]);
			const beforeTodo = continuation.slice(0, todoIndex);
			const todoLines = beforeTodo.split('\n');
			const todoPosition = new vscode.Position(
				insertPosition.line + todoLines.length - 1,
				todoLines[todoLines.length - 1].length + todoMatch[0].length + 1
			);
			editor.selection = new vscode.Selection(todoPosition, todoPosition);
		} else {
			editor.selection = new vscode.Selection(newPosition, newPosition);
		}
	}

	private learnFromPattern(trigger: string, completion: string, language: string) {
		this.patternLearner.learnPattern(trigger, completion, language);
		this.saveLearnedPatterns();
	}

	private processTemplate(template: string, context: PatternContext): string {
		return template
			.replace(/\{indent\}/g, context.indentation)
			.replace(/\{language\}/g, context.languageId)
			.replace(/\{line\}/g, context.position.line.toString());
	}

	private getIndentation(line: string): string {
		const match = line.match(/^(\s*)/);
		return match ? match[1] : '';
	}

	private showDiagnostic(document: vscode.TextDocument, position: vscode.Position, message: string) {
		const diagnostic = new vscode.Diagnostic(
			new vscode.Range(position, position),
			message,
			vscode.DiagnosticSeverity.Information
		);
		this.diagnosticCollection.set(document.uri, [diagnostic]);
		
		// Clear diagnostic after 3 seconds
		setTimeout(() => {
			this.diagnosticCollection.clear();
		}, 3000);
	}

	private loadLearnedPatterns() {
		const savedPatterns = this.context.globalState.get<string>('learnedPatterns');
		if (savedPatterns) {
			this.patternLearner.importPatterns(savedPatterns);
		}
	}

	private saveLearnedPatterns() {
		const patterns = this.patternLearner.exportPatterns();
		this.context.globalState.update('learnedPatterns', patterns);
	}

	public async continueCurrentPattern() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('No active editor found.');
			return;
		}

		if (!this.config.enabledLanguages.includes(editor.document.languageId)) {
			vscode.window.showWarningMessage(`Auto Continue is not enabled for ${editor.document.languageId} files.`);
			return;
		}

		await this.performAutoContinue(editor);
	}

	public showStatistics() {
		const patterns = LanguagePatterns.getAllPatterns();
		const languageCount = this.config.enabledLanguages.length;
		
		const message = `Auto Continue Statistics:
- Supported Languages: ${languageCount}
- Built-in Patterns: ${patterns.length}
- Status: ${this.isActive ? 'Active' : 'Inactive'}
- Inline Completion: ${this.config.useInlineCompletion ? 'Enabled' : 'Disabled'}
- Pattern Learning: ${this.config.learnPatterns ? 'Enabled' : 'Disabled'}`;

		vscode.window.showInformationMessage(message, { modal: false });
	}

	public async exportSettings() {
		const settings = {
			config: this.config,
			learnedPatterns: this.patternLearner.exportPatterns()
		};

		const uri = await vscode.window.showSaveDialog({
			defaultUri: vscode.Uri.file('auto-continue-settings.json'),
			filters: { 'JSON': ['json'] }
		});

		if (uri) {
			await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(settings, null, 2)));
			vscode.window.showInformationMessage('Settings exported successfully!');
		}
	}

	public async importSettings() {
		const uris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: { 'JSON': ['json'] }
		});

		if (uris && uris[0]) {
			try {
				const content = await vscode.workspace.fs.readFile(uris[0]);
				const settings = JSON.parse(content.toString());
				
				if (settings.learnedPatterns) {
					this.patternLearner.importPatterns(settings.learnedPatterns);
					this.saveLearnedPatterns();
				}

				vscode.window.showInformationMessage('Settings imported successfully!');
			} catch (error) {
				vscode.window.showErrorMessage('Failed to import settings: ' + error);
			}
		}
	}

	public dispose() {
		this.stop();
		this.diagnosticCollection.dispose();
		this.saveLearnedPatterns();
	}
}

// Extension activation
export function activate(context: vscode.ExtensionContext) {
	console.log('Auto Continue extension is now active!');

	const autoContinueManager = new AutoContinueManager(context);

	// Register commands
	const commands = [
		vscode.commands.registerCommand('auto-continue.start', () => autoContinueManager.start()),
		vscode.commands.registerCommand('auto-continue.stop', () => autoContinueManager.stop()),
		vscode.commands.registerCommand('auto-continue.toggleMode', () => autoContinueManager.toggle()),
		vscode.commands.registerCommand('auto-continue.continueTyping', () => autoContinueManager.continueCurrentPattern()),
		vscode.commands.registerCommand('auto-continue.showStatistics', () => autoContinueManager.showStatistics()),
		vscode.commands.registerCommand('auto-continue.exportSettings', () => autoContinueManager.exportSettings()),
		vscode.commands.registerCommand('auto-continue.importSettings', () => autoContinueManager.importSettings())
	];

	context.subscriptions.push(...commands);

	// Listen for configuration changes
	const configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
		if (event.affectsConfiguration('autoContinue')) {
			vscode.window.showInformationMessage('Auto Continue configuration updated!');
		}
	});

	context.subscriptions.push(configChangeListener);

	// Dispose handler
	context.subscriptions.push({
		dispose: () => autoContinueManager.dispose()
	});

	vscode.window.showInformationMessage('Auto Continue extension loaded! Use Cmd+Shift+A to toggle or Cmd+Shift+C to continue current pattern.');
}

// Extension deactivation
export function deactivate() {
	console.log('Auto Continue extension deactivated.');
}
