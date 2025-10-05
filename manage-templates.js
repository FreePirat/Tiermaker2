// Manage Templates JavaScript

let templates = [];
let templateToDelete = null;

// Safe localStorage operations
function saveTemplates() {
    try {
        if (typeof(Storage) !== "undefined") {
            // Save only non-public templates to localStorage (local templates only)
            // Public templates are managed through GitHub and loaded dynamically
            const localTemplates = templates.filter(t => !t.isPublic);
            localStorage.setItem('tierTemplates', JSON.stringify(localTemplates));
            return true;
        } else {
            showMessage('Cannot save: Local storage not supported', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error saving templates:', error);
        showMessage('Error saving templates. Storage may be full.', 'error');
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    loadTemplates();
    await loadUserPublicTemplates();
    renderTemplates();
    
    // Initialize GitHub authentication for navbar
    await githubStorage.initAuth();
    updateNavAuthUI();
    setupNavAuthButtons();
});

async function loadUserPublicTemplates() {
    if (githubStorage.authenticated) {
        try {
            const userPublicTemplates = await githubStorage.getUserTemplates();
            
            // Mark public templates and merge with local templates
            userPublicTemplates.forEach(template => {
                template.isPublic = true;
                // Check if we already have this template locally
                const existingIndex = templates.findIndex(t => t.id === template.id);
                if (existingIndex >= 0) {
                    // Update local version with public version (it's more recent)
                    templates[existingIndex] = template;
                } else {
                    // Add new public template
                    templates.push(template);
                }
            });
            
            // Sort by creation date (newest first)
            templates.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        } catch (error) {
            console.error('Error loading user public templates:', error);
        }
    }
}

function loadTemplates() {
    try {
        if (typeof(Storage) !== "undefined") {
            templates = JSON.parse(localStorage.getItem('tierTemplates')) || [];
        } else {
            console.warn('localStorage not supported');
            showMessage('Local storage not available. Templates may not persist.', 'warning');
            templates = [];
        }
    } catch (error) {
        console.error('Error loading templates:', error);
        templates = [];
        showMessage('Error loading saved templates.', 'warning');
    }
}

function renderTemplates() {
    const container = document.getElementById('templates-container');
    const emptyState = document.getElementById('empty-state');
    const templateCount = document.getElementById('template-count');
    
    // Update count
    templateCount.textContent = `${templates.length} template${templates.length !== 1 ? 's' : ''}`;
    
    if (templates.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    emptyState.style.display = 'none';
    
    container.innerHTML = templates.map(template => createTemplateCard(template)).join('');
}

function createTemplateCard(template) {
    const previewTiers = template.tiers.slice(0, 5); // Show max 5 tiers in preview
    const imageCount = template.images.length;
    const tierCount = template.tiers.length;
    const createdDate = new Date(parseInt(template.id.split('_')[1])).toLocaleDateString();
    
    // Use template thumbnail if available, otherwise fallback to first image or placeholder
    const thumbnailImage = template.thumbnail 
        ? template.thumbnail 
        : (template.images && template.images.length > 0 
            ? template.images[0].src 
            : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" fill="%23666"><rect width="120" height="120"/><text x="60" y="60" text-anchor="middle" dy=".3em" fill="white">No Image</text></svg>');
    
    return `
        <div class="template-card">
            <div class="template-header">
                <div class="template-thumbnail">
                    <img src="${thumbnailImage}" alt="${escapeHtml(template.name)}" onerror="this.src='data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\" fill=\"%23666\"><rect width=\"120\" height=\"120\"/><text x=\"60\" y=\"60\" text-anchor=\"middle\" dy=\".3em\" fill=\"white\">No Image</text></svg>'">
                </div>
                <div class="template-basic-info">
                    <h3 class="template-title">${escapeHtml(template.name)}</h3>
                    ${template.description ? `<p class="template-description">${escapeHtml(template.description)}</p>` : ''}
                    <div class="template-stats">
                        <span>📸 ${imageCount} images</span>
                        <span>📊 ${tierCount} tiers</span>
                        ${template.isPublic ? '<span class="public-badge">🌐 Public</span>' : '<span class="local-badge">💾 Local</span>'}
                    </div>
                </div>
            </div>
            <div class="template-preview">
                ${previewTiers.map(tier => `
                    <div class="tier-preview">
                        <div class="tier-label-preview">${tier.label}</div>
                        <div class="tier-items-preview">
                            ${tier.items.slice(0, 8).map(item => `
                                <div class="tier-item-preview">
                                    <img src="${item.src}" alt="${item.name}">
                                </div>
                            `).join('')}
                            ${tier.items.length > 8 ? `<span style="color: #aaa; font-size: 10px; margin-left: 5px;">+${tier.items.length - 8}</span>` : ''}
                        </div>
                    </div>
                `).join('')}
                ${template.tiers.length > 5 ? `<div style="color: #aaa; font-size: 12px; text-align: center; margin-top: 5px;">+${template.tiers.length - 5} more tiers</div>` : ''}
            </div>
            
            <div class="template-info">
                <div class="template-meta">
                    <span>Created: ${createdDate}</span>
                </div>
                
                <div class="template-actions">
                    <a href="create-template.html?${template.isPublic ? `template=${template.id}&public=true&edit=true` : `edit=${template.id}`}" class="action-btn edit-btn">
                        ✏️ Edit
                    </a>
                    <button class="action-btn duplicate-btn" onclick="duplicateTemplate('${template.id}')">
                        📋 Duplicate
                    </button>
                    <button class="action-btn delete-btn" onclick="showDeleteModal('${template.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        </div>
    `;
}

function duplicateTemplate(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    const duplicate = {
        ...template,
        id: 'template_' + Date.now(),
        name: template.name + ' (Copy)'
    };
    
    templates.push(duplicate);
    if (saveTemplates()) {
        renderTemplates();
        showMessage('Template duplicated successfully!', 'success');
    }
}

function showDeleteModal(templateId) {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    
    templateToDelete = templateId;
    document.getElementById('delete-template-name').textContent = template.name;
    document.getElementById('delete-modal').classList.add('show');
}

function closeDeleteModal() {
    templateToDelete = null;
    document.getElementById('delete-modal').classList.remove('show');
}

async function confirmDelete() {
    if (!templateToDelete) return;
    
    const template = templates.find(t => t.id === templateToDelete);
    if (!template) return;
    
    try {
        let deletedFromGitHub = false;
        let attemptedGitHubDelete = false;
        
        // Always try to delete from GitHub if user is authenticated
        // This handles both public templates and local templates that might exist on GitHub
        if (githubStorage.authenticated) {
            try {
                await githubStorage.deleteTemplate(templateToDelete);
                deletedFromGitHub = true;
                attemptedGitHubDelete = true;
            } catch (error) {
                attemptedGitHubDelete = true;
                // If the error is "Template not found", it means it wasn't on GitHub anyway
                if (error.message && error.message.includes('Template not found')) {
                    console.log('Template was not on GitHub, only deleting locally');
                } else {
                    console.error('Failed to delete from GitHub:', error);
                }
            }
        }
        
        // Remove from local array (both public and local templates)
        templates = templates.filter(t => t.id !== templateToDelete);
        
        // Save remaining local templates to localStorage
        // (saveTemplates automatically filters out public templates)
        if (saveTemplates()) {
            renderTemplates();
            closeDeleteModal();
            
            // Show appropriate success message
            if (deletedFromGitHub) {
                showMessage('Template deleted from both GitHub and locally!', 'success');
            } else if (attemptedGitHubDelete && !deletedFromGitHub) {
                showMessage('Template deleted locally! (Note: GitHub deletion failed or template not found on GitHub)', 'warning');
            } else if (!githubStorage.authenticated) {
                showMessage('Template deleted locally! (Login to also delete from GitHub if it exists there)', 'warning');
            } else {
                showMessage('Local template deleted successfully!', 'success');
            }
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        showMessage('Error deleting template: ' + error.message, 'error');
    }
}

function exportTemplates() {
    if (templates.length === 0) {
        showMessage('No templates to export', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(templates, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `tiermaker2_templates_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showMessage('Templates exported successfully!', 'success');
}

function importTemplates(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTemplates = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedTemplates)) {
                throw new Error('Invalid file format');
            }
            
            // Validate template structure
            const validTemplates = importedTemplates.filter(template => {
                return template.id && template.name && template.tiers && template.images;
            });
            
            if (validTemplates.length === 0) {
                throw new Error('No valid templates found in file');
            }
            
            // Merge with existing templates, avoiding duplicates
            const existingIds = new Set(templates.map(t => t.id));
            const newTemplates = validTemplates.filter(t => !existingIds.has(t.id));
            
            if (newTemplates.length === 0) {
                showMessage('All templates already exist', 'warning');
                return;
            }
            
            // Add new templates
            templates.push(...newTemplates);
            if (saveTemplates()) {
                renderTemplates();
                showMessage(`Successfully imported ${newTemplates.length} template(s)!`, 'success');
            }
            
        } catch (error) {
            showMessage('Error importing templates: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

// Close modal when clicking outside
document.getElementById('delete-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDeleteModal();
    }
});

// Handle escape key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDeleteModal();
    }
});

// Navbar Authentication Functions
function setupNavAuthButtons() {
    const loginBtn = document.getElementById('github-login-btn');
    const logoutBtn = document.getElementById('github-logout-btn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const success = await githubStorage.login();
            if (success) {
                updateNavAuthUI();
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            githubStorage.logout();
            updateNavAuthUI();
        });
    }
}

async function updateNavAuthUI() {
    const loginBtn = document.getElementById('github-login-btn');
    const userInfo = document.getElementById('user-info');
    const username = document.getElementById('username');
    
    if (!loginBtn || !userInfo || !username) return;
    
    if (githubStorage.authenticated) {
        const user = await githubStorage.getCurrentUser();
        if (user) {
            username.textContent = `@${user.login}`;
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
        } else {
            // Token might be invalid
            githubStorage.logout();
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        }
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
    }
}