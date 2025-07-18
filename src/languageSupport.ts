/**
 * Language-specific code pattern definitions and utilities
 */

export interface LanguageConfig {
	commentSyntax: {
		single: string;
		multiStart?: string;
		multiEnd?: string;
	};
	blockDelimiters: {
		open: string;
		close: string;
	};
	functionKeywords: string[];
	loopKeywords: string[];
	conditionalKeywords: string[];
}

export const LANGUAGE_CONFIGS: { [key: string]: LanguageConfig } = {
	javascript: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['function', '=>'],
		loopKeywords: ['for', 'while', 'do'],
		conditionalKeywords: ['if', 'else', 'switch']
	},
	typescript: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['function', '=>'],
		loopKeywords: ['for', 'while', 'do'],
		conditionalKeywords: ['if', 'else', 'switch']
	},
	python: {
		commentSyntax: { single: '#', multiStart: '"""', multiEnd: '"""' },
		blockDelimiters: { open: ':', close: '' },
		functionKeywords: ['def', 'lambda'],
		loopKeywords: ['for', 'while'],
		conditionalKeywords: ['if', 'elif', 'else']
	},
	java: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['public', 'private', 'protected', 'static'],
		loopKeywords: ['for', 'while', 'do'],
		conditionalKeywords: ['if', 'else', 'switch']
	},
	csharp: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['public', 'private', 'protected', 'static'],
		loopKeywords: ['for', 'while', 'do', 'foreach'],
		conditionalKeywords: ['if', 'else', 'switch']
	},
	cpp: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['int', 'void', 'char', 'float', 'double'],
		loopKeywords: ['for', 'while', 'do'],
		conditionalKeywords: ['if', 'else', 'switch']
	},
	c: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['int', 'void', 'char', 'float', 'double'],
		loopKeywords: ['for', 'while', 'do'],
		conditionalKeywords: ['if', 'else', 'switch']
	},
	go: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['func'],
		loopKeywords: ['for', 'range'],
		conditionalKeywords: ['if', 'else', 'switch']
	},
	rust: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['fn'],
		loopKeywords: ['for', 'while', 'loop'],
		conditionalKeywords: ['if', 'else', 'match']
	},
	php: {
		commentSyntax: { single: '//', multiStart: '/*', multiEnd: '*/' },
		blockDelimiters: { open: '{', close: '}' },
		functionKeywords: ['function'],
		loopKeywords: ['for', 'while', 'foreach'],
		conditionalKeywords: ['if', 'else', 'switch']
	}
};

export class LanguageDetector {
	public static getLanguageConfig(languageId: string): LanguageConfig | null {
		return LANGUAGE_CONFIGS[languageId] || null;
	}

	public static isSupported(languageId: string): boolean {
		return languageId in LANGUAGE_CONFIGS;
	}

	public static getSupportedLanguages(): string[] {
		return Object.keys(LANGUAGE_CONFIGS);
	}

	public static detectPatternType(line: string, languageId: string): string | null {
		const config = this.getLanguageConfig(languageId);
		if (!config) {return null;}

		const lowerLine = line.toLowerCase().trim();

		// Check for loops
		for (const keyword of config.loopKeywords) {
			if (lowerLine.includes(keyword)) {
				return 'loop';
			}
		}

		// Check for conditionals
		for (const keyword of config.conditionalKeywords) {
			if (lowerLine.includes(keyword)) {
				return 'conditional';
			}
		}

		// Check for functions
		for (const keyword of config.functionKeywords) {
			if (lowerLine.includes(keyword)) {
				return 'function';
			}
		}

		// Check for data structures
		if (line.includes('[') && !line.includes(']')) {
			return 'array';
		}
		if (line.includes('{') && !line.includes('}') && 
			!config.conditionalKeywords.some(k => lowerLine.includes(k)) &&
			!config.loopKeywords.some(k => lowerLine.includes(k))) {
			return 'object';
		}

		return null;
	}

	public static generateTodoComment(languageId: string): string {
		const config = this.getLanguageConfig(languageId);
		if (!config) {return '// TODO: ';}

		return `${config.commentSyntax.single} TODO: `;
	}
}

export class IndentationHelper {
	public static detectIndentationType(text: string): 'tabs' | 'spaces' {
		const lines = text.split('\n');
		let tabCount = 0;
		let spaceCount = 0;

		for (const line of lines) {
			if (line.startsWith('\t')) {
				tabCount++;
			} else if (line.startsWith(' ')) {
				spaceCount++;
			}
		}

		return tabCount > spaceCount ? 'tabs' : 'spaces';
	}

	public static detectIndentationSize(text: string): number {
		const lines = text.split('\n');
		const spaceSizes: number[] = [];

		for (const line of lines) {
			if (line.startsWith(' ')) {
				const match = line.match(/^( +)/);
				if (match) {
					spaceSizes.push(match[1].length);
				}
			}
		}

		if (spaceSizes.length === 0) {return 4;} // Default to 4 spaces

		// Find the most common indentation size
		const counts = new Map<number, number>();
		for (const size of spaceSizes) {
			counts.set(size, (counts.get(size) || 0) + 1);
		}

		let maxCount = 0;
		let mostCommonSize = 4;
		for (const [size, count] of counts) {
			if (count > maxCount) {
				maxCount = count;
				mostCommonSize = size;
			}
		}

		return mostCommonSize;
	}

	public static createIndentation(level: number, type: 'tabs' | 'spaces', size: number = 4): string {
		if (type === 'tabs') {
			return '\t'.repeat(level);
		} else {
			return ' '.repeat(level * size);
		}
	}

	public static getIndentationLevel(line: string, type: 'tabs' | 'spaces', size: number = 4): number {
		if (type === 'tabs') {
			const match = line.match(/^(\t*)/);
			return match ? match[1].length : 0;
		} else {
			const match = line.match(/^( *)/);
			return match ? Math.floor(match[1].length / size) : 0;
		}
	}
}

export class PatternValidator {
	public static isValidPattern(pattern: string, languageId: string): boolean {
		if (!pattern || pattern.trim().length === 0) {return false;}

		const config = LanguageDetector.getLanguageConfig(languageId);
		if (!config) {return false;}

		// Basic validation - check if pattern contains language-appropriate keywords
		const lowerPattern = pattern.toLowerCase();
		const allKeywords = [
			...config.functionKeywords,
			...config.loopKeywords,
			...config.conditionalKeywords
		];

		return allKeywords.some(keyword => lowerPattern.includes(keyword.toLowerCase()));
	}

	public static sanitizePattern(pattern: string): string {
		// Remove potentially dangerous characters
		return pattern
			.replace(/[<>]/g, '') // Remove angle brackets
			.replace(/script/gi, '') // Remove script tags
			.replace(/eval/gi, '') // Remove eval calls
			.trim();
	}

	public static validateCompletion(completion: string, maxLines: number): boolean {
		if (!completion) {return false;}

		const lines = completion.split('\n');
		return lines.length <= maxLines;
	}
}
