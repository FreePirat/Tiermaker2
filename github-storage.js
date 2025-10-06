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
            const response = await fetch(`${this.apiBase}/user`, {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Token validation failed:', error);
            return false;
        }
    }

    // Test repository access specifically
    async testRepositoryAccess() {
        if (!this.accessToken) return false;
        
        try {
            // Try to access the repository
            const response = await fetch(`${this.apiBase}/repos/${this.owner}/${this.repo}`, {
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                console.error('Repository access test failed:', response.status, response.statusText);
                return false;
            }
            
            const repo = await response.json();
            console.log('Repository access successful:', repo.full_name);
            
            // Check if we can access the contents (this tests write permissions indirectly)
            const contentsResponse = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/`,
                {
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            return contentsResponse.ok;
        } catch (error) {
            console.error('Repository access test failed:', error);
            return false;
        }
    }

    // GitHub OAuth login (simplified for GitHub Pages)
    async login() {
        // For demo purposes, we'll use a manual token input
        // In production, you'd use proper OAuth flow
        const token = prompt(
            'To save templates publicly, please enter a GitHub Personal Access Token.\n\n' +
            '⚠️ REQUIRED: Your token needs this permission:\n' +
            '• gist (to create GitHub Gists for your templates)\n\n' +
            '📝 Create token at: https://github.com/settings/tokens\n' +
            '1. Click "Generate new token (classic)"\n' +
            '2. Select ONLY the "gist" scope\n' +
            '3. Click "Generate token"\n' +
            '4. Copy the token and paste it below\n\n' +
            '✨ Your templates will be saved as public GitHub Gists!\n' +
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

    // Get templates created by the current authenticated user
    async getUserTemplates() {
        if (!this.authenticated || !this.currentUser) {
            return [];
        }

        try {
            const allTemplates = await this.getPublicTemplates();
            // Filter templates created by the current user
            return allTemplates.filter(template => 
                template.creator && 
                template.creator.username === this.currentUser.login
            );
        } catch (error) {
            console.error('Error fetching user templates:', error);
            return [];
        }
    }

    // Save template to GitHub
    async saveTemplate(template) {
        if (!this.authenticated) {
            const loggedIn = await this.login();
            if (!loggedIn) {
                throw new Error('Authentication required to save public templates');
            }
        }

        // For public templates, we'll use GitHub Gists instead of the main repository
        // This allows any authenticated user to save templates without needing repository access
        if (template.public || template.isPublic) {
            return await this.saveTemplateAsGist(template);
        }

        // For private templates, save to the main repository (only works for repository collaborators)
        return await this.saveTemplateToRepository(template);
    }

    // Save template as a GitHub Gist (accessible to all authenticated users)
    async saveTemplateAsGist(template) {
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

        const gistData = {
            description: `TierMaker2 Template: ${template.name}`,
            public: true,
            files: {
                [`${template.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${template.id}.json`]: {
                    content: JSON.stringify(templateData, null, 2)
                }
            }
        };

        try {
            const response = await fetch(`${this.apiBase}/gists`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(gistData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                let errorMessage = `GitHub API error: ${errorData.message}`;
                
                if (response.status === 403) {
                    errorMessage = 'Permission denied: Your GitHub token needs "gist" scope to save templates. Please create a new token with the correct permissions.';
                } else if (response.status === 401) {
                    errorMessage = 'Authentication failed: Your GitHub token may be invalid or expired. Please log out and log in again.';
                }
                
                throw new Error(errorMessage);
            }

            const gistResult = await response.json();
            
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

            return gistResult;
        } catch (error) {
            console.error('Error saving template as gist:', error);
            throw error;
        }
    }

    // Save template to repository (original method, for repository collaborators only)
    async saveTemplateToRepository(template) {
        const filename = `${template.id}.json`;
        const filePath = `${this.templatesPath}/${filename}`;
        
        // Check if file exists
        let sha = null;
        try {
            const existingResponse = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
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

        // Prepare template data with creator information
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

        const content = btoa(JSON.stringify(templateData, null, 2));
        
        const creatorInfo = this.currentUser ? ` by @${this.currentUser.login}` : '';
        const commitData = {
            message: sha ? `Update template: ${template.name}${creatorInfo}` : `Add template: ${template.name}${creatorInfo}`,
            content: content,
            branch: this.branch
        };
        
        if (sha) {
            commitData.sha = sha;
        }

        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
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
                let errorMessage = `GitHub API error: ${errorData.message}`;
                
                // Provide specific guidance for common errors
                if (response.status === 403) {
                    if (errorData.message.includes('Resource not accessible')) {
                        errorMessage = 'Permission denied: You need to be a repository collaborator to save templates directly. Templates will be saved as GitHub Gists instead.';
                        // Fallback to gist saving
                        return await this.saveTemplateAsGist(template);
                    } else if (errorData.message.includes('API rate limit')) {
                        errorMessage = 'GitHub API rate limit exceeded. Please try again later.';
                    }
                } else if (response.status === 401) {
                    errorMessage = 'Authentication failed: Your GitHub token may be invalid or expired. Please log out and log in again.';
                } else if (response.status === 404) {
                    errorMessage = 'Repository not found: Saving template as GitHub Gist instead.';
                    // Fallback to gist saving
                    return await this.saveTemplateAsGist(template);
                }
                
                console.error('GitHub API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
                
                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving template to GitHub:', error);
            throw error;
        }
    }

    // Delete template from GitHub
    async deleteTemplate(templateId) {
        if (!this.authenticated) {
            throw new Error('Authentication required to delete templates');
        }

        const filename = `${templateId}.json`;
        const filePath = `${this.templatesPath}/${filename}`;

        try {
            // Get file SHA
            const fileResponse = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
                {
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!fileResponse.ok) {
                throw new Error('Template not found');
            }

            const fileData = await fileResponse.json();

            // Delete file
            const deleteResponse = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: `Delete template: ${templateId}`,
                        sha: fileData.sha,
                        branch: this.branch
                    })
                }
            );

            if (!deleteResponse.ok) {
                const error = await deleteResponse.json();
                throw new Error(`GitHub API error: ${error.message}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting template from GitHub:', error);
            throw error;
        }
    }

    // Get current user info
    async getCurrentUser() {
        if (!this.authenticated) return null;

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
            console.error('Error getting user info:', error);
        }
        return null;
    }

    // Generic function to save any file to GitHub
    async saveFileToGitHub(filePath, content, commitMessage, sha = null) {
        if (!this.authenticated) {
            throw new Error('Authentication required to save files');
        }

        try {
            const encodedContent = btoa(content);
            const commitData = {
                message: commitMessage,
                content: encodedContent,
                branch: this.branch
            };

            if (sha) {
                commitData.sha = sha;
            }

            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${filePath}`,
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

    // Like/unlike a template
    async likeTemplate(templateId) {
        if (!this.authenticated) {
            throw new Error('Authentication required to like templates');
        }

        const likesPath = 'likes';
        const userLikesFile = `${likesPath}/user_likes.json`;
        const templateLikesFile = `${likesPath}/${templateId}_likes.json`;

        try {
            // Get current user
            const user = await this.getCurrentUser();
            if (!user) throw new Error('Unable to get user info');

            // Get user's current likes
            let userLikes = [];
            try {
                const userLikesResponse = await fetch(
                    `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${userLikesFile}`,
                    {
                        headers: {
                            'Authorization': `token ${this.accessToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                if (userLikesResponse.ok) {
                    const userLikesData = await userLikesResponse.json();
                    userLikes = JSON.parse(atob(userLikesData.content));
                }
            } catch (error) {
                // File doesn't exist yet, start with empty array
            }

            // Check if already liked
            const userLikeEntry = userLikes.find(entry => entry.username === user.login);
            const isCurrentlyLiked = userLikeEntry && userLikeEntry.likedTemplates.includes(templateId);

            // Get template likes count
            let templateLikes = { templateId, likes: 0, likedBy: [] };
            let templateLikesSha = null;
            try {
                const templateLikesResponse = await fetch(
                    `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${templateLikesFile}`,
                    {
                        headers: {
                            'Authorization': `token ${this.accessToken}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    }
                );
                if (templateLikesResponse.ok) {
                    const templateLikesData = await templateLikesResponse.json();
                    templateLikes = JSON.parse(atob(templateLikesData.content));
                    templateLikesSha = templateLikesData.sha;
                }
            } catch (error) {
                // File doesn't exist yet
            }

            // Toggle like status
            if (isCurrentlyLiked) {
                // Unlike: remove from user's likes and template's likes
                userLikeEntry.likedTemplates = userLikeEntry.likedTemplates.filter(id => id !== templateId);
                templateLikes.likedBy = templateLikes.likedBy.filter(username => username !== user.login);
                templateLikes.likes = Math.max(0, templateLikes.likes - 1);
            } else {
                // Like: add to user's likes and template's likes
                if (!userLikeEntry) {
                    userLikes.push({ username: user.login, likedTemplates: [templateId] });
                } else {
                    userLikeEntry.likedTemplates.push(templateId);
                }
                if (!templateLikes.likedBy.includes(user.login)) {
                    templateLikes.likedBy.push(user.login);
                    templateLikes.likes += 1;
                }
            }

            // Save updated files
            await this.saveFileToGitHub(userLikesFile, JSON.stringify(userLikes, null, 2), 'Update user likes');
            await this.saveFileToGitHub(templateLikesFile, JSON.stringify(templateLikes, null, 2), `Update likes for ${templateId}`, templateLikesSha);

            return {
                liked: !isCurrentlyLiked,
                totalLikes: templateLikes.likes
            };
        } catch (error) {
            console.error('Error toggling like:', error);
            throw error;
        }
    }

    // Get template likes
    async getTemplateLikes(templateId) {
        const templateLikesFile = `likes/${templateId}_likes.json`;
        
        try {
            const response = await fetch(
                `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${templateLikesFile}`,
                {
                    headers: {
                        'Authorization': `token ${this.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                return JSON.parse(atob(data.content));
            }
        } catch (error) {
            console.error('Error getting template likes:', error);
        }
        
        return { templateId, likes: 0, likedBy: [] };
    }

    // Get user's liked templates
    async getUserLikes() {
        if (!this.authenticated) return [];
        
        const user = await this.getCurrentUser();
        if (!user) return [];
        
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
                const data = await response.json();
                const userLikes = JSON.parse(atob(data.content));
                const userEntry = userLikes.find(entry => entry.username === user.login);
                return userEntry ? userEntry.likedTemplates : [];
            }
        } catch (error) {
            console.error('Error getting user likes:', error);
        }
        
        return [];
    }
}

// Global instance
window.githubStorage = new GitHubStorage();