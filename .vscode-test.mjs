import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	workspaceFolder: './src/test/fixtures',
	extensionDevelopmentPath: '.',
	extensionTestsPath: './out/test',
	userDataDir: '/tmp/vscode-auto-continue-test'
});
