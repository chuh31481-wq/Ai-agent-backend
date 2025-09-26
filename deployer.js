import Tools from './tools.js';

class Deployer {
    constructor() {
        this.tools = new Tools();
        this.platforms = ['vercel', 'netlify', 'heroku', 'github-pages'];
    }

    async autoConfigure(project) {
        console.log('☁️ Configuring deployment...');
        
        const config = {
            platform: this.detectBestPlatform(project),
            scripts: this.generateDeployScripts(project),
            configFiles: await this.generateConfigFiles(project)
        };

        project.deployment = config;
        return config;
    }

    detectBestPlatform(project) {
        if (project.analysis.projectType === 'webapp') {
            return 'vercel';
        } else if (project.analysis.projectType === 'api') {
            return 'heroku';
        }
        return 'netlify';
    }

    generateDeployScripts(project) {
        return {
            'deploy:vercel': 'vercel --prod',
            'deploy:netlify': 'netlify deploy --prod',
            'deploy:heroku': 'git push heroku main'
        };
    }

    async generateConfigFiles(project) {
        const files = [];
        
        // Generate vercel.json for Vercel
        if (this.detectBestPlatform(project) === 'vercel') {
            const vercelConfig = {
                version: 2,
                builds: [{ src: "package.json", use: "@vercel/static-build" }],
                routes: [{ handle: "filesystem" }, { src: ".*", dest: "index.html" }]
            };
            
            await this.tools.createFile(
                path.join(project.directory, 'vercel.json'),
                JSON.stringify(vercelConfig, null, 2)
            );
            files.push('vercel.json');
        }

        return files;
    }

    async deploy(project, platform = 'auto') {
        const targetPlatform = platform === 'auto' ? 
            this.detectBestPlatform(project) : platform;

        console.log(`🚀 Deploying to ${targetPlatform}...`);

        switch(targetPlatform) {
            case 'vercel':
                return await this.deployToVercel(project);
            case 'netlify':
                return await this.deployToNetlify(project);
            case 'heroku':
                return await this.deployToHeroku(project);
            default:
                return await this.deployToVercel(project);
        }
    }

    async deployToVercel(project) {
        const result = await this.tools.executeCommand('npx vercel --prod', {
            cwd: project.directory
        });
        
        if (result.success) {
            console.log('✅ Deployed to Vercel!');
            return { success: true, url: this.extractUrl(result.output) };
        }
        
        return { success: false, error: result.error };
    }

    extractUrl(output) {
        const urlMatch = output.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[0] : 'Unknown URL';
    }
}

export default Deployer;
