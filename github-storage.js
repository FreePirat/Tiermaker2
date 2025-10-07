// GitHub API Storage System for TierMaker Templates
class GitHubStorage {
    constructor() {
        this.owner = 'FreePirat';
        this.repo = 'Tiermaker2';
        this.branch = 'main';
        this.templatesPath = 'templates';
        this.apiBase = 'https://api.github.com';
        
        // For GitHub Pages, we'll use GitHub's public API
        // Users will authenticate with their GitHub accounts to contribute templates
        this.accessToken = null;
        this.authenticated = false;
        this.currentUser = null;
    }

    // Initialize GitHub authentication
    async initAuth() {
        // Check if user has stored auth token
        const storedToken = localStorage.getItem('github_token');
        if (storedToken) {
            this.accessToken = storedToken;
            this.authenticated = await this.validateToken();
            if (this.authenticated) {
                this.currentUser = await this.getCurrentUser();
            }
        }
        return this.authenticated;
    }

    // Validate GitHub token
    async validateToken() {
        if (!this.accessToken) return false;
        
        try {
            console.log('Validating GitHub token...');
            const response = await fetch(`${this.apiBase}/user`, {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            console.log('Token validation response status:', response.status);
            
            if (response.ok) {
                const user = await response.json();
                console.log('Token validated successfully for user:', user.login);
                return true;
            } else {
                console.error('Token validation failed:', response.status, response.statusText);
                return false;
            }
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    }

    // GitHub OAuth login (simplified for GitHub Pages)
    async login() {
        const token = prompt(
            'To contribute templates to the TierMaker2 repository, please enter a GitHub Personal Access Token.\n\n' +
            '⚠️ REQUIRED: Your token needs this permission:\n' +
            '• public_repo (to fork repositories and create pull requests)\n\n' +
            '📝 Create token at: https://github.com/settings/tokens\n' +
            '1. Click "Generate new token (classic)"\n' +
            '2. Select "public_repo" scope\n' +
            '3. Click "Generate token"\n' +
            '4. Copy the token and paste it below\n\n' +
            '✨ Your template will be submitted as a Pull Request to the main repository!\n' +
            '🔒 Token is stored locally in your browser only\n\n' +
            'Token:'
        );
        
        if (token) {
            this.accessToken = token;
            const isValid = await this.validateToken();
            if (isValid) {
                localStorage.setItem('github_token', token);
                this.authenticated = true;
                this.currentUser = await this.getCurrentUser();
                console.log('Authentication successful - templates will be saved as GitHub Gists');
                return true;
            } else {
                alert('Invalid token. Please check your token and try again.');
                return false;
            }
        }
        return false;
    }

    // Get current user
    async getCurrentUser() {
        if (!this.accessToken) return null;
        
        try {
            const response = await fetch(`${this.apiBase}/user`, {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
        return null;
    }

    // Logout
    logout() {
        localStorage.removeItem('github_token');
        this.accessToken = null;
        this.authenticated = false;
        this.currentUser = null;
    }

    // Get all public templates
    async getPublicTemplates() {
        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.templatesPath}`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Templates folder doesn't exist yet
                    return [];
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const files = await response.json();
            const templates = [];
            
            // Fetch each template file
            for (const file of files.filter(f => f.name.endsWith('.json'))) {
                try {
                    const templateResponse = await fetch(file.download_url);
                    const template = await templateResponse.json();
                    templates.push(template);
                } catch (error) {
                    console.error(`Error loading template ${file.name}:`, error);
                }
            }
            
            return templates;
        } catch (error) {
            console.error('Error fetching public templates:', error);
            return [];
        }
    }

    // Save template to GitHub via Fork + Pull Request (standard open source workflow)
    async saveTemplate(template) {
        if (!this.authenticated) {
            const loggedIn = await this.login();
            if (!loggedIn) {
                throw new Error('Authentication required to save public templates');
            }
        }

        // For public templates, create a fork and submit PR
        if (template.public || template.isPublic) {
            return await this.saveTemplateViaPR(template);
        }

        // For private templates, keep local only
        return { success: true, local: true };
    }

    // Save template via Fork + Pull Request workflow
    async saveTemplateViaPR(template) {
        console.log('Starting template submission via Fork + PR for:', template.name);
        
        try {
            // Step 1: Fork the repository
            console.log('Step 1: Creating fork...');
            const fork = await this.createFork();
            
            // Step 2: Create the template file in the fork
            console.log('Step 2: Adding template to fork...');
            const filename = `${template.id}.json`;
            const templateData = {
                ...template,
                createdAt: template.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                public: true,
                creator: this.currentUser ? {
                    username: this.currentUser.login,
                    avatarUrl: this.currentUser.avatar_url,
                    profileUrl: this.currentUser.html_url
                } : null
            };
            
            await this.createFileInFork(filename, templateData, fork.owner.login);
            
            // Step 3: Create Pull Request
            console.log('Step 3: Creating Pull Request...');
            const pr = await this.createPullRequest(template, fork.owner.login);
            
            return {
                success: true,
                pullRequestUrl: pr.html_url,
                message: 'Template submitted successfully! Your Pull Request is under review.'
            };
            
        } catch (error) {
            console.error('Error in Fork + PR workflow:', error);
            
            // If fork/PR fails, provide helpful instructions
            if (error.message.includes('fork') || error.message.includes('repository')) {
                throw new Error(
                    'Unable to create fork. Please:\n' +
                    '1. Make sure your GitHub token has "public_repo" scope\n' +
                    '2. Try manually forking FreePirat/Tiermaker2 first\n' +
                    '3. Then save your template again'
                );
            }
            
            throw error;
        }
    }

    // Create a fork of the main repository
    async createFork() {
        const response = await fetch(`${this.apiBase}/repos/${this.owner}/${this.repo}/forks`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Permission denied: Your GitHub token needs "public_repo" scope to fork repositories.');
            }
            const errorData = await response.json();
            throw new Error(`Failed to create fork: ${errorData.message}`);
        }

        const fork = await response.json();
        console.log('Fork created successfully:', fork.html_url);
        
        // Wait a moment for the fork to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return fork;
    }

    // Create template file in the user's fork
    async createFileInFork(filename, templateData, forkOwner) {
        const filePath = `${this.templatesPath}/${filename}`;
        const content = btoa(JSON.stringify(templateData, null, 2));
        
        const commitData = {
            message: `Add template: ${templateData.name}`,
            content: content,
            branch: this.branch
        };

        const response = await fetch(
            `${this.apiBase}/repos/${forkOwner}/${this.repo}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(commitData)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create template file: ${errorData.message}`);
        }

        const result = await response.json();
        console.log('Template file created in fork:', result.content.html_url);
        return result;
    }

    // Create Pull Request from fork to main repository
    async createPullRequest(template, forkOwner) {
        const prTitle = `Add template: ${template.name}`;
        const prBody = `## New Template Submission

**Template Name:** ${template.name}
**Category:** ${template.category || 'Uncategorized'}
**Description:** ${template.description || 'No description provided'}
**Created by:** @${this.currentUser?.login || 'Anonymous'}

### Template Details
- **Number of images:** ${template.images?.length || 0}
- **Number of tiers:** ${template.tiers?.length || 0}
- **Template ID:** ${template.id}

This template has been automatically submitted via TierMaker2 and will be auto-merged if validation passes.

### Auto-merge Criteria
✅ Valid JSON structure
✅ Required fields present (id, name, images, tiers)
✅ Template ID matches filename
✅ Within size limits (≤1000 images, ≤50 tiers, ≤10MB)
✅ Only adds new template files

---
*Submitted via TierMaker2 template creator*`;

        // Validate required data
        if (!forkOwner || !this.branch || !template.name) {
            throw new Error('Missing required data for Pull Request creation');
        }

        const prData = {
            title: prTitle,
            body: prBody,
            head: `${forkOwner}:${this.branch}`,
            base: this.branch
        };

        console.log('Creating PR with data:', prData);

        const response = await fetch(
            `${this.apiBase}/repos/${this.owner}/${this.repo}/pulls`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(prData)
            }
        );

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                throw new Error(`Failed to create pull request: HTTP ${response.status} ${response.statusText}`);
            }
            
            console.error('PR Creation Failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                prData: prData
            });
            
            let errorMessage = `Failed to create pull request: ${errorData.message || 'Unknown error'}`;
            
            // Enhanced error handling for validation failures
            if (response.status === 422) {
                if (errorData.errors && errorData.errors.length > 0) {
                    const validationErrors = errorData.errors.map(err => `${err.field}: ${err.message || err.code}`).join(', ');
                    errorMessage = `Validation Failed: ${validationErrors}`;
                } else if (errorData.message.includes('No commits between')) {
                    errorMessage = 'No changes detected. The template may already exist in the repository.';
                } else if (errorData.message.includes('head sha')) {
                    errorMessage = 'Fork synchronization issue. Please wait a moment and try again.';
                } else {
                    errorMessage = `Validation Failed: ${errorData.message}`;
                }
            } else if (response.status === 403) {
                errorMessage = 'Permission denied: Your GitHub token may need additional permissions.';
            } else if (response.status === 404) {
                errorMessage = 'Repository or fork not found. Please check that your fork exists.';
            }
            
            throw new Error(errorMessage);
        }

        const pr = await response.json();
        console.log('Pull Request created:', pr.html_url);
        
        // Add labels to the PR for easier tracking
        try {
            await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/issues/${pr.number}/labels`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(['template-submission', 'auto-merge-candidate'])
                }
            );
            console.log('Labels added to PR');
        } catch (labelError) {
            console.warn('Could not add labels to PR:', labelError);
            // Non-critical, continue anyway
        }
        
        return pr;
    }

    // Save template as a GitHub Gist (accessible to all authenticated users)
    async saveTemplateAsGist(template) {
        console.log('Creating GitHub Gist for template:', template.name);
        
        const templateData = {
            ...template,
            createdAt: template.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            public: true,
            creator: this.currentUser ? {
                username: this.currentUser.login,
                avatarUrl: this.currentUser.avatar_url,
                profileUrl: this.currentUser.html_url
            } : null
        };

        // Create a safe filename
        const safeTemplateName = template.name.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
        const filename = `tiermaker2_${safeTemplateName}_${template.id}.json`;

        const gistData = {
            description: `TierMaker2 Template: ${template.name} (Category: ${template.category || 'Uncategorized'})`,
            public: true,
            files: {
                [filename]: {
                    content: JSON.stringify(templateData, null, 2)
                }
            }
        };

        try {
            console.log('Creating template Gist with filename:', filename);
            
            const response = await fetch(`${this.apiBase}/gists`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            console.log('GitHub Gist API response status:', response.status);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                    console.error('GitHub Gist API error details:', errorData);
                } catch (parseError) {
                    console.error('Could not parse error response:', parseError);
                    throw new Error(`GitHub API error ${response.status}: ${response.statusText}`);
                }
                
                let errorMessage = `GitHub API error: ${errorData.message || response.statusText}`;
                
                if (response.status === 403) {
                    errorMessage = 'Permission denied: Your GitHub token needs "gist" scope to save templates. Please create a new token with the correct permissions.';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication failed: Your GitHub token may be invalid or expired. Please log out and log in again.';
                } else if (response.status === 404) {
                    errorMessage = 'GitHub API endpoint not found. Please check your internet connection and try again.';
                } else if (response.status === 422) {
                    errorMessage = `Invalid data: ${errorData.message || 'Please check your template data and try again.'}`;
                }
                
                throw new Error(errorMessage);
            }

            const gistResult = await response.json();
            console.log('Template Gist created successfully:', gistResult.html_url);
            
            // Store the gist information for later retrieval
            const gistInfo = {
                templateId: template.id,
                gistId: gistResult.id,
                gistUrl: gistResult.html_url,
                createdAt: gistResult.created_at,
                updatedAt: gistResult.updated_at
            };
            
            // Store gist mapping in localStorage for this user
            const userGists = JSON.parse(localStorage.getItem('user_template_gists') || '{}');
            userGists[template.id] = gistInfo;
            localStorage.setItem('user_template_gists', JSON.stringify(userGists));

            return {
                success: true,
                gistUrl: gistResult.html_url,
                message: 'Template saved as GitHub Gist successfully!'
            };
        } catch (error) {
            console.error('Error saving template as gist:', error);
            throw error;
        }
    }

    // Get user's own templates from GitHub
    async getUserTemplates() {
        if (!this.authenticated) return [];
        
        try {
            // Get templates that user has created in this repository (if they have access)
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.templatesPath}`,
                {
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (!response.ok) {
                return [];
            }
            
            const files = await response.json();
            const userTemplates = [];
            
            for (const file of files.filter(f => f.name.endsWith('.json'))) {
                try {
                    const templateResponse = await fetch(file.download_url);
                    const template = await templateResponse.json();
                    
                    // Only include templates created by current user
                    if (template.creator && template.creator.username === this.currentUser?.login) {
                        userTemplates.push(template);
                    }
                } catch (error) {
                    console.error(`Error loading template ${file.name}:`, error);
                }
            }
            
            return userTemplates;
        } catch (error) {
            console.error('Error fetching user templates:', error);
            return [];
        }
    }

    // Like a template
    async likeTemplate(templateId) {
        if (!this.authenticated) {
            throw new Error('Authentication required to like templates');
        }
        
        try {
            // Save like to user likes file
            const userLikes = await this.getUserLikes();
            if (!userLikes.includes(templateId)) {
                userLikes.push(templateId);
                await this.saveUserLikes(userLikes);
            }
            
            // Update template likes count
            const templateLikes = await this.getTemplateLikes(templateId);
            const updatedLikes = templateLikes + 1;
            await this.saveTemplateLikes(templateId, updatedLikes);
            
            return updatedLikes;
        } catch (error) {
            console.error('Error liking template:', error);
            throw error;
        }
    }

    // Unlike a template
    async unlikeTemplate(templateId) {
        if (!this.authenticated) {
            throw new Error('Authentication required to unlike templates');
        }
        
        try {
            // Remove like from user likes file
            const userLikes = await this.getUserLikes();
            const index = userLikes.indexOf(templateId);
            if (index > -1) {
                userLikes.splice(index, 1);
                await this.saveUserLikes(userLikes);
            }
            
            // Update template likes count
            const templateLikes = await this.getTemplateLikes(templateId);
            const updatedLikes = Math.max(0, templateLikes - 1);
            await this.saveTemplateLikes(templateId, updatedLikes);
            
            return updatedLikes;
        } catch (error) {
            console.error('Error unliking template:', error);
            throw error;
        }
    }

    // Get user's likes
    async getUserLikes() {
        if (!this.authenticated) return [];
        
        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/likes/user_likes.json`,
                {
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (response.ok) {
                const file = await response.json();
                const content = JSON.parse(atob(file.content));
                return content[this.currentUser?.login] || [];
            }
            
            return [];
        } catch (error) {
            console.error('Error getting user likes:', error);
            return [];
        }
    }

    // Save user's likes
    async saveUserLikes(likes) {
        if (!this.authenticated) return;
        
        // For now, just store locally since we can't write to the repository
        const allUserLikes = JSON.parse(localStorage.getItem('all_user_likes') || '{}');
        allUserLikes[this.currentUser?.login] = likes;
        localStorage.setItem('all_user_likes', JSON.stringify(allUserLikes));
    }

    // Get template likes count
    async getTemplateLikes(templateId) {
        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/likes/${templateId}_likes.json`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (response.ok) {
                const file = await response.json();
                const content = JSON.parse(atob(file.content));
                return content.count || 0;
            }
            
            return 0;
        } catch (error) {
            console.error('Error getting template likes:', error);
            return 0;
        }
    }

    // Save template likes count
    async saveTemplateLikes(templateId, count) {
        // For now, just store locally since we can't write to the repository
        const templateLikes = JSON.parse(localStorage.getItem('template_likes') || '{}');
        templateLikes[templateId] = count;
        localStorage.setItem('template_likes', JSON.stringify(templateLikes));
    }

    // Save a file to GitHub (for repository collaborators only)
    async saveFileToGitHub(path, content, message) {
        if (!this.authenticated) {
            throw new Error('Authentication required');
        }
        
        try {
            // Check if file exists first
            let sha = null;
            try {
                const existingResponse = await fetch(
                    `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`,
                    {
                        headers: {
                            'Authorization': `token ${this.accessToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (existingResponse.ok) {
                    const existingFile = await existingResponse.json();
                    sha = existingFile.sha;
                }
            } catch (error) {
                // File doesn't exist, that's okay
            }
            
            const commitData = {
                message: message,
                content: btoa(content),
                branch: this.branch
            };
            
            if (sha) {
                commitData.sha = sha;
            }
            
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${path}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(commitData)
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${errorData.message}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error saving file to GitHub:', error);
            throw error;
        }
    }
}

// Create global instance
const githubStorage = new GitHubStorage();