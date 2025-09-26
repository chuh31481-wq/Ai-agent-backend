import Tools from './tools.js';

class SelfHeal {
    constructor() {
        this.tools = new Tools();
        this.errorPatterns = new Map();
        this.loadErrorPatterns();
    }

    loadErrorPatterns() {
        this.errorPatterns.set('MODULE_NOT_FOUND', {
            solution: 'npm install',
            description: 'Missing dependencies'
        });
        
        this.errorPatterns.set('EADDRINUSE', {
            solution: 'change port number',
            description: 'Port already in use'
        });
        
        this.errorPatterns.set('ENOENT', {
            solution: 'create missing file/directory',
            description: 'File or directory not found'
        });
    }

    async handleError(error, project) {
        console.log('🛠️ Self-healing activated...');
        
        const errorType = this.identifyErrorType(error);
        const solution = this.errorPatterns.get(errorType);
        
        if (solution) {
            console.log(`🔧 Applying solution: ${solution.description}`);
            return await this.applySolution(solution, error, project);
        }
        
        console.warn('⚠️ No known solution, trying generic fix...');
        return await this.genericFix(error, project);
    }

    identifyErrorType(error) {
        const message = error.message || error.toString();
        
        for (const [pattern] of this.errorPatterns) {
            if (message.includes(pattern)) {
                return pattern;
            }
        }
        
        return 'UNKNOWN_ERROR';
    }

    async applySolution(solution, error, project) {
        try {
            switch(solution.solution) {
                case 'npm install':
                    await this.tools.executeCommand('npm install', {
                        cwd: project.directory
                    });
                    break;
                    
                case 'change port number':
                    await this.fixPortConflict(project);
                    break;
                    
                case 'create missing file/directory':
                    await this.createMissingFiles(error, project);
                    break;
            }
            
            return { fixed: true, solution: solution.description };
        } catch (fixError) {
            return { fixed: false, error: fixError.message };
        }
    }

    async genericFix(error, project) {
        // Try common fixes
        const fixes = [
            () => this.tools.executeCommand('npm cache clean --force'),
            () => this.tools.executeCommand('rm -rf node_modules package-lock.json'),
            () => this.tools.executeCommand('npm install', { cwd: project.directory })
        ];

        for (const fix of fixes) {
            try {
                await fix();
                return { fixed: true, method: 'generic' };
            } catch (e) {
                continue;
            }
        }
        
        return { fixed: false, error: 'All recovery attempts failed' };
    }

    async fixPortConflict(project) {
        // Read package.json and change port
        const packagePath = path.join(project.directory, 'package.json');
        if (await this.tools.fileExists(packagePath)) {
            const pkg = await this.tools.readFile(packagePath);
            const updated = pkg.replace(/3000/g, '3001');
            await this.tools.createFile(packagePath, updated);
        }
    }

    async createMissingFiles(error, project) {
        const message = error.message;
        const fileMatch = message.match(/'([^']+)'/);
        if (fileMatch) {
            const missingFile = fileMatch[1];
            await this.tools.createFile(
                path.join(project.directory, missingFile),
                '// Created by self-heal system'
            );
        }
    }
}

export default SelfHeal;
