// tools.js - ENHANCED WITH ERROR HANDLING
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);
const __dirname = path.dirname(new URL(import.meta.url).pathname);

export class ProjectTools {
  constructor() {
    this.rootDir = process.cwd();
    this.safePaths = new Set();
  }

  validatePath(filePath) {
    const resolved = path.resolve(this.rootDir, filePath);
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error(`Security violation: ${filePath}`);
    }
    return resolved;
  }

  async createDirectory({ directoryName }) {
    const safePath = this.validatePath(directoryName);
    await fs.mkdir(safePath, { recursive: true });
    return `Directory created: ${directoryName}`;
  }

  async createFile({ fileName, content }) {
    const safePath = this.validatePath(fileName);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content, 'utf8');
    return `File created: ${fileName}`;
  }

  async readFile({ fileName }) {
    const safePath = this.validatePath(fileName);
    return await fs.readFile(safePath, 'utf8');
  }

  async updateFile({ fileName, newContent }) {
    const safePath = this.validatePath(fileName);
    await fs.writeFile(safePath, newContent, 'utf8');
    return `File updated: ${fileName}`;
  }

  async executeCommand({ command }) {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd: this.rootDir });
      if (stderr) console.warn('Command stderr:', stderr);
      return stdout;
    } catch (error) {
      throw new Error(`Command failed: ${error.message}`);
    }
  }

  async installDependencies({ packageManager = 'npm' }) {
    const commands = {
      'npm': 'npm install --silent --no-audit',
      'yarn': 'yarn install --silent',
      'pnpm': 'pnpm install --silent'
    };
    
    const command = commands[packageManager];
    if (!command) throw new Error(`Unsupported package manager: ${packageManager}`);
    
    return await this.executeCommand({ command });
  }

  async runTests({ testCommand = 'npm test' }) {
    return await this.executeCommand({ command: testCommand });
  }

  async commitAndPushChanges({ commitMessage }) {
    await this.executeCommand({ command: 'git add .' });
    await this.executeCommand({ command: `git commit -m "${commitMessage}"` });
    await this.executeCommand({ command: 'git push origin main' });
    return 'Changes committed and pushed successfully';
  }
}

// Singleton instance
export const tools = new ProjectTools();
export default tools;
