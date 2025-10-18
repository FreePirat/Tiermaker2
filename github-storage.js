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
            // Add cache-busting parameter to prevent browser caching
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.templatesPath}${cacheBuster}`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
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
            
            // Fetch each template file with cache-busting
            for (const file of files.filter(f => f.name.endsWith('.json'))) {
                try {
                    const templateResponse = await fetch(`${file.download_url}${cacheBuster}`, {
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache'
                        }
                    });
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

    // Get a specific template by ID with cache-busting
    async getTemplateById(templateId) {
        try {
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.templatesPath}/template_${templateId}.json${cacheBuster}`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
                    }
                }
            );
            
            if (!response.ok) {
                if (response.status === 404) {
                    return null; // Template not found
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const file = await response.json();
            const templateResponse = await fetch(`${file.download_url}${cacheBuster}`, {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });
            const template = await templateResponse.json();
            
            return template;
        } catch (error) {
            console.error(`Error fetching template ${templateId}:`, error);
            return null;
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

    // Create or update template file in the user's fork
    async createFileInFork(filename, templateData, forkOwner) {
        const filePath = `${this.templatesPath}/${filename}`;
        const content = btoa(JSON.stringify(templateData, null, 2));
        
        let sha = null;
        let action = 'Add';
        
        // First check if template exists in main repository (for updates)
        let existsInMain = false;
        try {
            const mainRepoResponse = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (mainRepoResponse.ok) {
                existsInMain = true;
                action = 'Update';
                console.log('Template exists in main repository, this is an update');
            }
        } catch (error) {
            console.log('Template not found in main repository, creating new');
        }
        
        // If updating existing template, check if it exists in fork and get SHA
        if (existsInMain) {
            try {
                const forkResponse = await fetch(
                    `${this.apiBase}/repos/${forkOwner}/${this.repo}/contents/${filePath}`,
                    {
                        headers: {
                            'Authorization': `token ${this.accessToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                
                if (forkResponse.ok) {
                    const existingFile = await forkResponse.json();
                    sha = existingFile.sha;
                    console.log('Found existing file in fork, updating with SHA:', sha);
                } else if (forkResponse.status === 404) {
                    // Template exists in main repo but not in fork
                    // We need to get the SHA from main repo to properly update
                    console.log('Template not in fork but exists in main repo, this is a fork-based update');
                    
                    const mainRepoFileResponse = await fetch(
                        `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
                        {
                            headers: {
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        }
                    );
                    
                    if (mainRepoFileResponse.ok) {
                        const mainFile = await mainRepoFileResponse.json();
                        console.log('Will create update based on main repo file SHA:', mainFile.sha);
                        // Don't set SHA here - this is a new file in the fork that will update main repo
                    }
                } else {
                    console.warn('Unexpected response when checking fork for existing file:', forkResponse.status);
                }
            } catch (error) {
                console.log('Could not check for existing file in fork:', error.message);
            }
        }
        
        const commitData = {
            message: `${action} template: ${templateData.name}`,
            content: content,
            branch: this.branch
        };
        
        // Only include SHA if we found the file in the fork (not main repo)
        if (sha) {
            commitData.sha = sha;
        }

        console.log('Creating/updating file in fork with data:', {
            action,
            filePath,
            hasSha: !!sha,
            existsInMain
        });

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
            console.error('GitHub API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                commitData: { ...commitData, content: '[BASE64 CONTENT]' } // Hide content in logs
            });
            
            let errorMessage = `Failed to ${action.toLowerCase()} template file: ${errorData.message}`;
            
            if (response.status === 409) {
                errorMessage = 'File conflict detected. The template may have been modified by another user. Please try again.';
            } else if (response.status === 422 && errorData.message.includes('sha')) {
                errorMessage = 'File version mismatch. Please refresh and try updating again.';
            }
            
            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log(`Template file ${action.toLowerCase()}d in fork:`, result.content.html_url);
        return result;
    }

    // Create Pull Request from fork to main repository
    async createPullRequest(template, forkOwner) {
        // Check if this is an update to existing template
        const isUpdate = await this.checkTemplateExists(template.id);
        const action = isUpdate ? 'Update' : 'Add';
        
        const prTitle = `${action} template: ${template.name}`;
        const prBody = `## Template ${action} Request

**Template Name:** ${template.name}
**Category:** ${template.category || 'Uncategorized'}
**Description:** ${template.description || 'No description provided'}
**${isUpdate ? 'Updated' : 'Created'} by:** @${this.currentUser?.login || 'Anonymous'}

### Template Details
- **Number of images:** ${template.images?.length || 0}
- **Number of tiers:** ${template.tiers?.length || 0}
- **Template ID:** ${template.id}
- **Action:** ${isUpdate ? 'Update existing template' : 'Add new template'}

${isUpdate ? `This is an update to an existing template with new content.

### Changes
- Updated content and metadata
- Preserves original template ID
- New timestamp: ${new Date().toISOString()}

` : ''}This template has been automatically submitted via TierMaker2 and will be auto-merged if validation passes.

### Auto-merge Criteria
✅ Valid JSON structure
✅ Required fields present (id, name, images, tiers)
✅ Template ID matches filename
✅ Within size limits (≤1000 images, ≤50 tiers, ≤10MB)
✅ ${isUpdate ? 'Updates existing template file only' : 'Only adds new template files'}

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
            // Add cache-busting parameter to prevent browser caching
            const cacheBuster = `?t=${Date.now()}`;
            // Get templates that user has created in this repository (if they have access)
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.templatesPath}${cacheBuster}`,
                {
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache'
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
                    const templateResponse = await fetch(`${file.download_url}${cacheBuster}`, {
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache'
                        }
                    });
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

    // Delete a template via Fork + Pull Request workflow
    async deleteTemplate(templateId) {
        if (!this.authenticated) {
            throw new Error('Authentication required to delete public templates');
        }

        console.log('Starting template deletion via Fork + PR for template ID:', templateId);
        
        try {
            // Step 1: Check if template exists in the main repository
            console.log('Step 1: Checking if template exists...');
            const templateExists = await this.checkTemplateExists(templateId);
            if (!templateExists) {
                throw new Error('Template not found in the repository');
            }

            // Step 2: Fork the repository (if not already forked)
            console.log('Step 2: Creating/checking fork...');
            const fork = await this.createFork();
            
            // Step 3: Delete the template file in the fork
            console.log('Step 3: Deleting template from fork...');
            await this.deleteFileInFork(`${templateId}.json`, fork.owner.login);
            
            // Step 4: Create Pull Request for deletion
            console.log('Step 4: Creating deletion Pull Request...');
            const pr = await this.createDeletionPullRequest(templateId, fork.owner.login);
            
            return {
                success: true,
                pullRequestUrl: pr.html_url,
                message: 'Template deletion submitted successfully! Your Pull Request is under review.'
            };
            
        } catch (error) {
            console.error('Error in template deletion workflow:', error);
            
            if (error.message.includes('Template not found')) {
                throw new Error('Template not found in the repository. It may have already been deleted or was never shared publicly.');
            } else if (error.message.includes('fork') || error.message.includes('repository')) {
                throw new Error(
                    'Unable to access fork. Please:\n' +
                    '1. Make sure your GitHub token has "public_repo" scope\n' +
                    '2. Try manually forking FreePirat/Tiermaker2 first\n' +
                    '3. Then try deletion again'
                );
            }
            
            throw error;
        }
    }

    // Check if a template exists in the main repository
    async checkTemplateExists(templateId) {
        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.templatesPath}/${templateId}.json`,
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            return response.ok;
        } catch (error) {
            console.error('Error checking template existence:', error);
            return false;
        }
    }

    // Delete template file in the user's fork
    async deleteFileInFork(filename, forkOwner) {
        const filePath = `${this.templatesPath}/${filename}`;
        
        // First, get the file to get its SHA
        const getResponse = await fetch(
            `${this.apiBase}/repos/${forkOwner}/${this.repo}/contents/${filePath}`,
            {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!getResponse.ok) {
            if (getResponse.status === 404) {
                throw new Error('Template file not found in fork');
            }
            const errorData = await getResponse.json();
            throw new Error(`Failed to get template file: ${errorData.message}`);
        }

        const fileData = await getResponse.json();
        
        // Delete the file
        const deleteData = {
            message: `Delete template: ${filename.replace('.json', '')}`,
            sha: fileData.sha,
            branch: this.branch
        };

        const deleteResponse = await fetch(
            `${this.apiBase}/repos/${forkOwner}/${this.repo}/contents/${filePath}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deleteData)
            }
        );

        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            throw new Error(`Failed to delete template file: ${errorData.message}`);
        }

        const result = await deleteResponse.json();
        console.log('Template file deleted from fork');
        return result;
    }

    // Create Pull Request for template deletion
    async createDeletionPullRequest(templateId, forkOwner) {
        const prTitle = `Delete template: ${templateId}`;
        const prBody = `## Template Deletion Request

**Template ID:** ${templateId}
**Requested by:** @${this.currentUser?.login || 'Anonymous'}

### Deletion Details
This is an automated request to delete a template from the TierMaker2 repository.

The template file \`${templateId}.json\` has been removed from the fork and this PR will delete it from the main repository if merged.

### Auto-merge Criteria
✅ Valid deletion request
✅ Template file exists in repository
✅ Only removes specified template file
✅ No other files modified

---
*Submitted via TierMaker2 template manager*`;

        const prData = {
            title: prTitle,
            body: prBody,
            head: `${forkOwner}:${this.branch}`,
            base: this.branch
        };

        console.log('Creating deletion PR with data:', prData);

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
                throw new Error(`Failed to create deletion pull request: HTTP ${response.status} ${response.statusText}`);
            }
            
            console.error('Deletion PR Creation Failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData,
                prData: prData
            });
            
            let errorMessage = `Failed to create deletion pull request: ${errorData.message || 'Unknown error'}`;
            
            if (response.status === 422) {
                if (errorData.message.includes('No commits between')) {
                    errorMessage = 'No changes detected. The template may have already been deleted.';
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
        console.log('Deletion Pull Request created:', pr.html_url);
        
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
                    body: JSON.stringify(['template-deletion', 'auto-merge-candidate'])
                }
            );
            console.log('Labels added to deletion PR');
        } catch (labelError) {
            console.warn('Could not add labels to deletion PR:', labelError);
            // Non-critical, continue anyway
        }
        
        return pr;
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