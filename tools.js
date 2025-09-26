import fs from 'fs-extra';
import path from 'path';
import { exec } from 'child-process-promise';
import axios from 'axios';

class Tools {
    constructor() {
        this.workDir = process.cwd();
    }

    async createFile(filePath, content) {
        try {
            await fs.ensureDir(path.dirname(filePath));
            await fs.writeFile(filePath, content, 'utf8');
            return { success: true, path: filePath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async readFile(filePath) {
        return await fs.readFile(filePath, 'utf8');
    }

    async fileExists(filePath) {
        return await fs.pathExists(filePath);
    }

    async executeCommand(cmd, options = {}) {
        try {
            const result = await exec(cmd, { 
                cwd: options.cwd || this.workDir,
                timeout: 300000
            });
            return { success: true, output: result.stdout };
        } catch (error) {
            return { 
                success: false, 
                error: error.message,
                stderr: error.stderr 
            };
        }
    }

    async installDependencies(projectPath) {
        const commands = [
            { cmd: 'npm init -y', desc: 'Initialize package.json' },
            { cmd: 'npm install express react react-dom', desc: 'Install basic dependencies' },
            { cmd: 'npm install -D nodemon concurrently', desc: 'Install dev dependencies' }
        ];

        for (const { cmd, desc } of commands) {
            console.log(`📦 ${desc}...`);
            const result = await this.executeCommand(cmd, { cwd: projectPath });
            if (!result.success) {
                console.warn(`⚠️ Failed: ${cmd}`, result.error);
            }
        }
    }

    async setupGit(projectPath) {
        const commands = [
            'git init',
            'git add .',
            'git commit -m "Initial commit by Project God AI"'
        ];

        for (const cmd of commands) {
            await this.executeCommand(cmd, { cwd: projectPath });
        }
    }

    async createProjectStructure(basePath, structure) {
        const dirs = [
            'src/components',
            'src/pages', 
            'src/utils',
            'public',
            'docs',
            'tests'
        ];

        for (const dir of dirs) {
            await fs.ensureDir(path.join(basePath, dir));
        }

        console.log('✅ Project structure created');
    }

    async validateProject(projectPath) {
        const checks = [
            this.checkPackageJson(projectPath),
            this.checkMainFiles(projectPath),
            this.testBuild(projectPath)
        ];

        const results = await Promise.all(checks);
        return results.every(r => r.valid);
    }

    async checkPackageJson(projectPath) {
        const packagePath = path.join(projectPath, 'package.json');
        if (await this.fileExists(packagePath)) {
            const pkg = await fs.readJson(packagePath);
            return { valid: true, name: pkg.name };
        }
        return { valid: false, error: 'package.json missing' };
    }

    async checkMainFiles(projectPath) {
        const requiredFiles = ['package.json', 'README.md'];
        const missing = [];

        for (const file of requiredFiles) {
            if (!(await this.fileExists(path.join(projectPath, file)))) {
                missing.push(file);
            }
        }

        return { 
            valid: missing.length === 0, 
            missing 
        };
    }

    async testBuild(projectPath) {
        if (await this.fileExists(path.join(projectPath, 'package.json'))) {
            const result = await this.executeCommand('npm run build --dry-run', { 
                cwd: projectPath 
            });
            return { valid: result.success };
        }
        return { valid: true, skip: true };
    }

    async downloadTemplate(templateUrl, destination) {
        try {
            const response = await axios.get(templateUrl);
            await this.createFile(destination, response.data);
            return true;
        } catch (error) {
            console.error('Download failed:', error.message);
            return false;
        }
    }
}

export default Tools;
