import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ClientPortal {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.projects = new Map();
        this.setupServer();
    }

    setupServer() {
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(express.json());

        this.app.get('/', (req, res) => {
            res.send(`
                <html>
                <head><title>Project God AI</title></head>
                <body>
                    <h1>🚀 Project God AI Client Portal</h1>
                    <p>Your projects are managed here</p>
                    <a href="/projects">View Projects</a>
                </body>
                </html>
            `);
        });

        this.app.get('/projects', (req, res) => {
            const projectsList = Array.from(this.projects.entries()).map(([id, project]) => `
                <div class="project">
                    <h3>${project.goal}</h3>
                    <p>Status: ${project.status}</p>
                    <p>Created: ${new Date(project.startTime).toLocaleString()}</p>
                    <a href="/project/${id}">View Details</a>
                </div>
            `).join('');

            res.send(`
                <html>
                <head><title>My Projects</title></head>
                <body>
                    <h1>My Projects</h1>
                    ${projectsList}
                </body>
                </html>
            `);
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🌐 Client portal running at http://localhost:${this.port}`);
        });
    }

    addProject(project) {
        this.projects.set(project.id, project);
    }
}

export default ClientPortal;
