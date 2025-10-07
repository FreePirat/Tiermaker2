// Tier List Creator JavaScript

let draggedElement = null;
let templates = [];
let currentTemplate = {
    id: null,
    name: '',
    description: '',
    category: '',
    thumbnail: null,
    thumbnailType: 'auto', // 'auto', 'custom', 'selected'
    tiers: [],
    images: []
};

// Get default color for tier labels
function getDefaultTierColor(label) {
    const defaultColors = {
        'S': '#ff0000',    // Red
        'A': '#ff8000',    // Orange
        'B': '#ffbf00',    // Orange/Yellow
        'C': '#ffff00',    // Yellow
        'D': '#00ff00',    // Green
        'E': '#00ffff',    // Cyan
        'F': '#0080ff',    // Blue
        'G': '#8000ff'     // Purple
    };
    return defaultColors[label] || '#ff6b9d'; // Default pink for any other tiers
}

// Auto-resize tier label text to fit container
function autoResizeTierLabel(label) {
    const text = label.textContent || label.innerText;
    const textLength = text.length;
    
    // Calculate font size based on text length
    let fontSize;
    if (textLength <= 3) {
        fontSize = 24; // Default size for short text
    } else if (textLength <= 6) {
        fontSize = 20;
    } else if (textLength <= 10) {
        fontSize = 16;
    } else if (textLength <= 15) {
        fontSize = 14;
    } else if (textLength <= 20) {
        fontSize = 12;
    } else {
        fontSize = 10; // Minimum size for very long text
    }
    
    label.style.fontSize = fontSize + 'px';
}

// Setup tier label event listeners for auto-resizing
function setupTierLabelListeners() {
    document.querySelectorAll('.tier-label').forEach(label => {
        // Auto-resize on input
        label.addEventListener('input', function() {
            autoResizeTierLabel(this);
            updateTemplateState();
        });
        
        // Auto-resize on paste
        label.addEventListener('paste', function() {
            setTimeout(() => {
                autoResizeTierLabel(this);
                updateTemplateState();
            }, 10);
        });
        
        // Initial resize
        autoResizeTierLabel(label);
    });
}

// Remove draggable functionality from tier rows
// Initialize templates from localStorage with error handling
function initializeStorage() {
    try {
        if (typeof(Storage) !== "undefined") {
            templates = JSON.parse(localStorage.getItem('tierTemplates')) || [];
        } else {
            console.warn('localStorage not supported, using session storage');
            showMessage('Local storage not available. Templates will not persist between sessions.', 'warning');
        }
    } catch (error) {
        console.error('Error loading templates from storage:', error);
        templates = [];
        showMessage('Error loading saved templates. Starting fresh.', 'warning');
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM Content Loaded - initializing...');
    
    // Immediately remove eyedropper from existing color pickers
    forceRemoveEyedropperFromExisting();
    
    initializeStorage();
    await initializeGitHubAuth();
    initializeEventListeners();
    await loadTemplate();
    
    // Setup navbar auth (if elements exist)
    setupNavbarAuth();
    
    // Force a second setup after everything is loaded (in case of timing issues)
    setTimeout(() => {
        console.log('Running delayed setup...');
        setupColorPickers();
        setupTierLabelListeners();
        setupTierRowSorting();
        addDragHandlesToExistingTiers();
        updateTierLabelSizes(); // Initial tier label sizing
        initializeTemplateInfoSection(); // Initialize collapse state
    }, 500);
});

// Add window resize listener for responsive tier label sizing
window.addEventListener('resize', debouncedUpdateTierLabelSizes);

function forceRemoveEyedropperFromExisting() {
    console.log('🎯 Force removing eyedropper from existing color pickers...');
    
    // Get all existing color pickers in the static HTML
    const existingPickers = document.querySelectorAll('.color-picker');
    console.log('Found', existingPickers.length, 'existing color pickers');
    
    existingPickers.forEach((picker, index) => {
        console.log('Processing existing picker', index, 'value:', picker.value);
        
        // Force replace the picker entirely with a new one
        const newPicker = document.createElement('input');
        newPicker.type = 'color';
        newPicker.className = 'color-picker';
        newPicker.value = picker.value;
        newPicker.title = picker.title || 'Change tier color';
        
        // Apply all eyedropper removal properties
        removeEyedropperFromPicker(newPicker);
        
        // Replace the old picker with the new one
        picker.parentNode.replaceChild(newPicker, picker);
        
        console.log('✅ Replaced existing picker', index, 'with eyedropper-free version');
    });
    
    console.log('✅ All existing color pickers processed');
}

async function setupNavbarAuth() {
    const loginBtn = document.getElementById('github-login-btn');
    const logoutBtn = document.getElementById('github-logout-btn');
    
    if (loginBtn && logoutBtn) {
        updateNavAuthUI();
        
        loginBtn.addEventListener('click', async () => {
            const success = await githubStorage.login();
            if (success) {
                updateNavAuthUI();
                updateAuthIndicator();
            }
        });
        
        logoutBtn.addEventListener('click', () => {
            githubStorage.logout();
            updateNavAuthUI();
            updateAuthIndicator();
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
            githubStorage.logout();
            loginBtn.style.display = 'block';
            userInfo.style.display = 'none';
        }
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
    }
}

async function initializeGitHubAuth() {
    await githubStorage.initAuth();
    updateAuthIndicator();
}

function initializeEventListeners() {
    // Image upload
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    
    // Template name and description
    document.getElementById('template-name').addEventListener('input', updateTemplateName);
    document.getElementById('template-description').addEventListener('input', updateTemplateDescription);
    
    // Category selection
    document.getElementById('template-category').addEventListener('change', updateTemplateCategory);
    
    // Thumbnail controls
    document.getElementById('clear-thumbnail-btn').addEventListener('click', clearThumbnail);
    document.getElementById('upload-thumbnail-btn').addEventListener('click', triggerThumbnailUpload);
    document.getElementById('thumbnail-upload').addEventListener('change', handleThumbnailUpload);
    
    // Sort options (only if it exists)
    const sortOptions = document.getElementById('sort-options');
    if (sortOptions) {
        sortOptions.addEventListener('change', sortImages);
    }
    
    // Public sharing checkbox
    const shareCheckbox = document.getElementById('share-publicly');
    if (shareCheckbox) {
        shareCheckbox.addEventListener('change', handlePublicSharingChange);
    }
    
    // Color pickers for tier rows
    setupColorPickers();
    
    // Auto-resize tier labels
    setupTierLabelListeners();
}

function updateAuthIndicator() {
    const indicator = document.getElementById('auth-status-indicator');
    const checkbox = document.getElementById('share-publicly');
    
    if (githubStorage.authenticated) {
        indicator.textContent = '✓ GitHub authenticated';
        indicator.className = 'auth-indicator authenticated';
        checkbox.disabled = false;
    } else {
        indicator.textContent = '⚠ GitHub login required for public sharing';
        indicator.className = 'auth-indicator unauthenticated';
        checkbox.disabled = true;
        checkbox.checked = false;
    }
}

async function handlePublicSharingChange() {
    const checkbox = document.getElementById('share-publicly');
    
    if (checkbox.checked && !githubStorage.authenticated) {
        const success = await githubStorage.login();
        if (success) {
            updateAuthIndicator();
        } else {
            checkbox.checked = false;
        }
    }
}

// Color Picker Functions
function setupColorPickers() {
    const colorPickers = document.querySelectorAll('.color-picker');
    console.log('Setting up', colorPickers.length, 'color pickers');
    
    // First, apply eyedropper removal to existing pickers
    colorPickers.forEach((picker, index) => {
        console.log('Removing eyedropper from existing picker', index);
        removeEyedropperFromPicker(picker);
    });
    
    // Remove all existing event listeners from all color pickers
    colorPickers.forEach(picker => {
        const newPicker = picker.cloneNode(true);
        // Apply eyedropper removal to the cloned picker as well
        removeEyedropperFromPicker(newPicker);
        picker.parentNode.replaceChild(newPicker, picker);
    });
    
    // Re-query after replacement
    const freshColorPickers = document.querySelectorAll('.color-picker');
    
    freshColorPickers.forEach((picker, index) => {
        console.log('Setting up color picker', index, 'with value:', picker.value);
        
        // Ensure eyedropper is removed from fresh pickers too
        removeEyedropperFromPicker(picker);
        
        // Add both change and input listeners for better responsiveness
        picker.addEventListener('change', function(event) {
            console.log('Color picker CHANGE event fired for picker', index);
            handleColorChange(event);
        });
        
        picker.addEventListener('input', function(event) {
            console.log('Color picker INPUT event fired for picker', index);
            handleColorChange(event);
        });
        
        // Test click listener to ensure picker is responsive
        picker.addEventListener('click', function() {
            console.log('Color picker CLICKED:', index, 'current value:', picker.value);
        });
        
        console.log('✓ Color picker', index, 'listeners attached');
    });
    
    console.log('✓ All color pickers setup complete');
}

function removeEyedropperFromPicker(picker) {
    // Disable eyedropper programmatically for Edge/Chrome
    picker.setAttribute('aria-label', 'Color picker');
    picker.removeAttribute('eyedropper');
    picker.style.webkitAppearance = 'none';
    picker.style.mozAppearance = 'none';
    picker.style.appearance = 'none';
    
    // Force remove any eyedropper functionality
    if (picker.showEyeDropper) {
        picker.showEyeDropper = undefined;
    }
    
    // Additional aggressive removal
    picker.style.position = 'relative';
    picker.style.overflow = 'hidden';
    
    console.log('Eyedropper removed from picker with value:', picker.value);
}

function handleColorChange(event) {
    console.log('🎨 handleColorChange called with event:', event.type);
    const picker = event.target;
    console.log('🎨 Picker element:', picker, 'Value:', picker.value);
    
    const tierRow = picker.closest('.tier-row');
    
    if (!tierRow) {
        console.error('❌ Could not find tier row for color picker');
        return;
    }
    
    const tierLabel = tierRow.querySelector('.tier-label');
    const newColor = picker.value;
    const tierName = tierRow.getAttribute('data-tier');
    
    console.log('🎨 Color changed to:', newColor, 'for tier:', tierName);
    console.log('🎨 Tier label element:', tierLabel);
    
    if (tierLabel) {
        // Update the tier label background color
        tierLabel.style.backgroundColor = newColor;
        console.log('✅ Updated tier label background color to:', newColor);
        
        // Update the data attribute
        tierRow.setAttribute('data-color', newColor);
        console.log('✅ Updated data-color attribute to:', newColor);
        
        // Update template state to save the color
        updateTemplateState();
        console.log('✅ Template state updated');
    } else {
        console.error('❌ Could not find tier label element');
    }
}

// Load template if editing
async function loadTemplate() {
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('edit');
    const publicTemplate = urlParams.get('public') === 'true';
    const templateParam = urlParams.get('template');
    const isEditing = urlParams.get('edit') === 'true';
    
    if (templateId && !publicTemplate) {
        // Load local template for editing
        const template = templates.find(t => t.id === templateId);
        if (template) {
            loadTemplateData(template, false, true);
            document.querySelector('.save-btn').textContent = '✅ Update Template';
        }
    } else if (templateParam && publicTemplate) {
        // Load public template
        try {
            const publicTemplates = await githubStorage.getPublicTemplates();
            const template = publicTemplates.find(t => t.id === templateParam);
            if (template) {
                if (isEditing && githubStorage.authenticated && 
                    template.creator && template.creator.username === githubStorage.currentUser?.login) {
                    // User is editing their own public template
                    loadTemplateData(template, false, true);
                    document.querySelector('.save-btn').textContent = '✅ Update Public Template';
                    document.getElementById('share-publicly').checked = true;
                } else {
                    // User is copying someone else's template or not editing
                    loadTemplateData(template, true, false);
                    document.querySelector('.save-btn').textContent = '✅ Save as New Template';
                }
            }
        } catch (error) {
            console.error('Error loading public template:', error);
            showMessage('Failed to load public template', 'error');
        }
    }
}

function loadTemplateData(template, isPublicCopy = false, isEditing = false) {
    // Create a copy to avoid modifying the original
    currentTemplate = { ...template };
    
    // If copying a public template, create a new ID
    if (isPublicCopy) {
        delete currentTemplate.id;
        currentTemplate.name = template.name + ' (Copy)';
    }
    
    document.getElementById('template-name').value = currentTemplate.name;
    document.getElementById('template-description').value = currentTemplate.description || '';
    
    // Load category if it exists
    if (currentTemplate.category) {
        document.getElementById('template-category').value = currentTemplate.category;
    }
    
    // Load thumbnail if it exists
    if (currentTemplate.thumbnail) {
        updateThumbnailPreview();
    }
    
    // Set public sharing checkbox based on template status
    if (template.isPublic || template.public) {
        document.getElementById('share-publicly').checked = isEditing; // Only check if editing existing public template
    }
    
    // Load tier structure
    if (template.tiers && template.tiers.length > 0) {
        recreateTierStructure(template.tiers);
    }
    
    // Load images
    if (template.images && template.images.length > 0) {
        loadTemplateImages(template.images);
    }
}

// Image Upload Handling
function handleImageUpload(event) {
    const files = event.target.files;
    const imagePool = document.querySelector('.image-pool-container');
    
    for (let file of files) {
        if (file.type.startsWith('image/')) {
            // Compress image before storing
            compressImage(file, function(compressedDataUrl) {
                createImageElement(compressedDataUrl, file.name);
            });
        }
    }
}

function compressImage(file, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Calculate new dimensions (max 200x200 for storage efficiency)
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
            if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed data URL (JPEG with 0.7 quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        console.log('Image compressed from', file.size, 'bytes to approximately', 
                   Math.round(compressedDataUrl.length * 0.75), 'bytes');
        
        callback(compressedDataUrl);
    };
    
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function createImageElement(src, name) {
    const imagePool = document.querySelector('.image-pool-container');
    const imgElement = document.createElement('div');
    imgElement.className = 'tier-item';
    imgElement.draggable = true;
    
    // Create image with remove button
    imgElement.innerHTML = `
        <img src="${src}" alt="${name}" title="${name}">
        <button class="remove-btn" title="Remove image">×</button>
    `;
    
    // Add timestamp for sorting
    const timestamp = Date.now();
    imgElement.setAttribute('data-timestamp', timestamp);
    
    // Add drag event listeners
    imgElement.addEventListener('dragstart', handleDragStart);
    imgElement.addEventListener('dragend', handleDragEnd);
    
    // Add remove button functionality
    const removeBtn = imgElement.querySelector('.remove-btn');
    removeBtn.addEventListener('click', removeImageFromTemplate);
    
    // Add double-click for thumbnail selection
    imgElement.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        setThumbnail(src, 'selected');
        showMessage('Image set as thumbnail!', 'success');
    });
    
    imagePool.appendChild(imgElement);
    
    // Store image data
    currentTemplate.images.push({
        src: src,
        name: name,
        position: 'pool',
        timestamp: timestamp
    });
    
    // Auto-set first image as thumbnail if none exists
    if (!currentTemplate.thumbnail) {
        setThumbnail(src);
    }
    
    // Update template state and tier label sizes
    updateTemplateState();
}

// Drag and Drop Functions
function handleDragStart(e) {
    draggedElement = e.target.closest('.tier-item');
    draggedElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function drop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (draggedElement && (e.currentTarget.classList.contains('tier-items') || e.currentTarget.classList.contains('image-pool-container'))) {
        // Handle pinned character drops
        if (draggedElement.classList.contains('pinned-character')) {
            // Create a new tier item from the pinned character
            const newItem = document.createElement('div');
            newItem.className = 'tier-item';
            newItem.draggable = true;
            
            const img = document.createElement('img');
            img.src = draggedElement.dataset.src;
            img.alt = 'Character';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = removeImage;
            
            newItem.appendChild(img);
            newItem.appendChild(removeBtn);
            
            // Setup drag events for the new item
            setupDragEvents(newItem);
            
            e.currentTarget.appendChild(newItem);
            
            // Remove the original image from the main pool
            const poolContainer = document.querySelector('.image-pool-container');
            const originalImages = poolContainer.querySelectorAll('.tier-item img');
            
            for (let originalImg of originalImages) {
                if (originalImg.src === draggedElement.dataset.src) {
                    // Remove the parent tier-item
                    const tierItem = originalImg.closest('.tier-item');
                    if (tierItem) {
                        tierItem.remove();
                        break; // Only remove the first match
                    }
                }
            }
            
            // Update the pinned pool to reflect the change
            updatePinnedPool();
        } else {
            // Handle regular drops
            e.currentTarget.appendChild(draggedElement);
        }
        updateTemplateState();
    }
}

// Tier Management
function addTierRow() {
    const container = document.querySelector('.tier-list-container');
    const newTier = document.createElement('div');
    newTier.className = 'tier-row';
    newTier.setAttribute('data-tier', 'New');
    
    // Get default color for new tier
    const defaultColor = '#ff6b9d'; // Default pink color
    newTier.setAttribute('data-color', defaultColor);
    
    newTier.innerHTML = `
        <div class="tier-label" contenteditable="true" style="background-color: ${defaultColor}">New</div>
        <div class="tier-controls">
            <input type="color" class="color-picker" value="${defaultColor}" title="Change tier color">
        </div>
        <div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
        <div class="tier-drag-handle" title="Drag to reorder tiers">⋮⋮</div>
    `;
    
    container.appendChild(newTier);
    
    console.log('New tier row added, re-setting up event listeners');
    
    // Re-setup all listeners for all tier rows
    setupColorPickers();
    setupTierLabelListeners();
    setupTierRowSorting();
    
    updateTemplateState();
}

// Tier Row Sorting Setup
function setupTierRowSorting() {
    const container = document.querySelector('.tier-list-container');
    const tierRows = container.querySelectorAll('.tier-row');
    
    tierRows.forEach(tierRow => {
        const dragHandle = tierRow.querySelector('.tier-drag-handle');
        if (dragHandle) {
            // Make the drag handle draggable
            dragHandle.draggable = true;
            dragHandle.style.cursor = 'grab';
            
            dragHandle.addEventListener('dragstart', handleTierDragStart);
            dragHandle.addEventListener('dragend', handleTierDragEnd);
        }
        
        // Set up drop zones on tier rows
        tierRow.addEventListener('dragover', handleTierDragOver);
        tierRow.addEventListener('drop', handleTierDrop);
    });
}

let draggedTierRow = null;

function handleTierDragStart(e) {
    draggedTierRow = e.target.closest('.tier-row');
    draggedTierRow.style.opacity = '0.5';
    e.target.style.cursor = 'grabbing';
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
}

function handleTierDragEnd(e) {
    if (draggedTierRow) {
        draggedTierRow.style.opacity = '';
        e.target.style.cursor = 'grab';
        draggedTierRow = null;
    }
    
    // Remove any drop indicators
    document.querySelectorAll('.tier-row').forEach(row => {
        row.classList.remove('tier-drop-above', 'tier-drop-below');
    });
}

function handleTierDragOver(e) {
    if (!draggedTierRow) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const targetRow = e.currentTarget;
    if (targetRow === draggedTierRow) return;
    
    // Remove existing drop indicators
    document.querySelectorAll('.tier-row').forEach(row => {
        row.classList.remove('tier-drop-above', 'tier-drop-below');
    });
    
    // Determine if we should drop above or below
    const rect = targetRow.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    if (e.clientY < midpoint) {
        targetRow.classList.add('tier-drop-above');
    } else {
        targetRow.classList.add('tier-drop-below');
    }
}

function handleTierDrop(e) {
    if (!draggedTierRow) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const targetRow = e.currentTarget;
    if (targetRow === draggedTierRow) return;
    
    const container = document.querySelector('.tier-list-container');
    const rect = targetRow.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    // Insert the dragged row before or after the target
    if (e.clientY < midpoint) {
        container.insertBefore(draggedTierRow, targetRow);
    } else {
        container.insertBefore(draggedTierRow, targetRow.nextSibling);
    }
    
    // Clean up
    document.querySelectorAll('.tier-row').forEach(row => {
        row.classList.remove('tier-drop-above', 'tier-drop-below');
    });
    
    // Update template state after reordering
    updateTemplateState();
    
    console.log('Tier row reordered');
}

// Add drag handles to existing tier rows that don't have them
function addDragHandlesToExistingTiers() {
    const tierRows = document.querySelectorAll('.tier-row');
    tierRows.forEach(tierRow => {
        // Check if drag handle already exists
        if (!tierRow.querySelector('.tier-drag-handle')) {
            const dragHandle = document.createElement('div');
            dragHandle.className = 'tier-drag-handle';
            dragHandle.innerHTML = '⋮⋮';
            dragHandle.title = 'Drag to reorder tiers';
            
            // Insert as first child
            tierRow.insertBefore(dragHandle, tierRow.firstChild);
        }
    });
    
    // Re-setup sorting after adding handles
    setupTierRowSorting();
}

function removeTierRow() {
    const container = document.querySelector('.tier-list-container');
    const tierRows = container.querySelectorAll('.tier-row');
    
    if (tierRows.length > 1) {
        const lastRow = tierRows[tierRows.length - 1];
        const images = lastRow.querySelectorAll('.tier-item');
        const imagePool = document.querySelector('.image-pool-container');
        
        // Move images back to pool
        images.forEach(img => imagePool.appendChild(img));
        
        lastRow.remove();
        updateTemplateState();
    } else {
        showMessage('Cannot remove the last tier row', 'warning');
    }
}

function changeTierFormat() {
    const format = parseInt(document.getElementById('tier-format').value);
    const container = document.querySelector('.tier-list-container');
    const imagePool = document.querySelector('.image-pool-container');
    
    // Move all images back to pool
    const allImages = container.querySelectorAll('.tier-item');
    allImages.forEach(img => imagePool.appendChild(img));
    
    // Clear existing tiers
    container.innerHTML = '';
    
    // Create new tier structure
    const tierLabels = ['S', 'A', 'B', 'C', 'D', 'E', 'F', 'G'];
    for (let i = 0; i < format; i++) {
        const tierRow = document.createElement('div');
        tierRow.className = 'tier-row';
        tierRow.setAttribute('data-tier', tierLabels[i]);
        
        // Apply default color for this tier
        const defaultColor = getDefaultTierColor(tierLabels[i]);
        tierRow.setAttribute('data-color', defaultColor);
        
        tierRow.innerHTML = `
            <div class="tier-label" contenteditable="true" style="background-color: ${defaultColor}">${tierLabels[i]}</div>
            <div class="tier-controls">
                <input type="color" class="color-picker" value="${defaultColor}" title="Change tier color">
            </div>
            <div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
        `;
        
        // Ensure tier row is NOT draggable
        tierRow.draggable = false;
        tierRow.removeAttribute('draggable');
        
        container.appendChild(tierRow);
    }
    
    // Setup color picker event listeners
    setupColorPickers();
    
    // Setup tier label auto-resize listeners
    setupTierLabelListeners();
    
    updateTemplateState();
}

// Image Management
function clearAllImages() {
    if (confirm('Are you sure you want to remove all images?')) {
        document.querySelectorAll('.tier-item').forEach(item => item.remove());
        currentTemplate.images = [];
        updateTemplateState();
    }
}

function randomizeImages() {
    const imagePool = document.querySelector('.image-pool-container');
    const allImages = Array.from(document.querySelectorAll('.tier-item'));
    
    // Move all images to pool first
    allImages.forEach(img => imagePool.appendChild(img));
    
    // Get all images now in the pool
    const poolImages = Array.from(imagePool.querySelectorAll('.tier-item'));
    
    // Shuffle the images in the pool
    const shuffledImages = poolImages.sort(() => Math.random() - 0.5);
    
    // Re-append shuffled images to pool to change their order
    shuffledImages.forEach(img => imagePool.appendChild(img));
    
    updateTemplateState();
}

function removeImage(e) {
    const imgElement = e.target.closest('.tier-item');
    const imgSrc = imgElement.querySelector('img').src;
    
    // Check if user wants to skip confirmation
    const skipConfirmation = localStorage.getItem('skipImageDeleteConfirm') === 'true';
    
    if (skipConfirmation) {
        // Remove from current template images
        currentTemplate.images = currentTemplate.images.filter(img => img.src !== imgSrc);
        imgElement.remove();
        updateTemplateState();
        return;
    }
    
    // Show custom confirmation dialog
    showImageDeleteConfirmation(() => {
        // Remove from current template images
        currentTemplate.images = currentTemplate.images.filter(img => img.src !== imgSrc);
        imgElement.remove();
        updateTemplateState();
    });
}

function sortImages() {
    const sortOption = document.getElementById('sort-options').value;
    const imagePool = document.querySelector('.image-pool-container');
    const images = Array.from(imagePool.querySelectorAll('.tier-item'));
    
    switch (sortOption) {
        case 'alphabetical':
            images.sort((a, b) => {
                const nameA = a.querySelector('img').alt.toLowerCase();
                const nameB = b.querySelector('img').alt.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            break;
        case 'reverse':
            images.reverse();
            break;
        case 'newest':
            images.sort((a, b) => {
                const timestampA = parseInt(a.getAttribute('data-timestamp')) || 0;
                const timestampB = parseInt(b.getAttribute('data-timestamp')) || 0;
                return timestampB - timestampA; // Newest first (higher timestamp)
            });
            break;
        case 'oldest':
            images.sort((a, b) => {
                const timestampA = parseInt(a.getAttribute('data-timestamp')) || 0;
                const timestampB = parseInt(b.getAttribute('data-timestamp')) || 0;
                return timestampA - timestampB; // Oldest first (lower timestamp)
            });
            break;
        case 'random':
            images.sort(() => Math.random() - 0.5);
            break;
        default:
            return;
    }
    
    // Re-append in new order
    images.forEach(img => imagePool.appendChild(img));
}

// Template Management
function updateTemplateName() {
    currentTemplate.name = document.getElementById('template-name').value;
}

function updateTemplateDescription() {
    currentTemplate.description = document.getElementById('template-description').value;
}

function updateTemplateCategory() {
    currentTemplate.category = document.getElementById('template-category').value;
    updateTemplateState();
}

// Thumbnail Management
function autoSelectThumbnail() {
    const firstImage = currentTemplate.images.find(img => img.src);
    if (firstImage) {
        setThumbnail(firstImage.src, 'auto');
        showMessage('First image selected as thumbnail', 'success');
    } else {
        showMessage('No images available to use as thumbnail', 'warning');
    }
}

function clearThumbnail() {
    setThumbnail(null);
    showMessage('Thumbnail cleared', 'info');
}

function triggerThumbnailUpload() {
    document.getElementById('thumbnail-upload').click();
}

function handleThumbnailUpload(event) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        // Compress the thumbnail image
        compressThumbnailImage(file, function(compressedDataUrl) {
            setThumbnail(compressedDataUrl, 'custom');
            showMessage('Custom thumbnail uploaded successfully!', 'success');
        });
    } else {
        showMessage('Please select a valid image file', 'error');
    }
    
    // Clear the input so the same file can be selected again
    event.target.value = '';
}

function compressThumbnailImage(file, callback) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        // Calculate dimensions for thumbnail (16:10 aspect ratio, max 240x150)
        const targetWidth = 240;
        const targetHeight = 150;
        
        // Calculate scale to fit within target dimensions while maintaining aspect ratio
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = Math.floor(img.width * scale);
        const scaledHeight = Math.floor(img.height * scale);
        
        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        
        // Draw and compress with high quality for thumbnails
        ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);
        
        // Convert to compressed data URL (JPEG with 0.8 quality for good thumbnail quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        console.log('Thumbnail compressed from', file.size, 'bytes to approximately', 
                   Math.round(compressedDataUrl.length * 0.75), 'bytes');
        
        callback(compressedDataUrl);
    };
    
    const reader = new FileReader();
    reader.onload = function(e) {
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function setThumbnail(imageSrc, type = 'selected') {
    currentTemplate.thumbnail = imageSrc;
    currentTemplate.thumbnailType = imageSrc ? type : 'auto';
    updateThumbnailPreview();
    updateTemplateState();
}

function updateThumbnailPreview() {
    const thumbnailImg = document.getElementById('selected-thumbnail');
    if (currentTemplate.thumbnail) {
        thumbnailImg.src = currentTemplate.thumbnail;
        thumbnailImg.parentElement.classList.add('selected');
    } else {
        thumbnailImg.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80' fill='%23666'><rect width='120' height='80'/><text x='60' y='40' text-anchor='middle' dy='.3em' fill='white' font-size='12'>No Thumbnail</text></svg>";
        thumbnailImg.parentElement.classList.remove('selected');
    }
}

// Image Management
function removeImageFromTemplate(event) {
    event.stopPropagation();
    const imgElement = event.target.closest('.tier-item');
    const imgSrc = imgElement.querySelector('img').src;
    
    // Check if user wants to skip confirmation
    const skipConfirmation = localStorage.getItem('skipImageDeleteConfirm') === 'true';
    
    if (skipConfirmation) {
        // Remove from template data
        currentTemplate.images = currentTemplate.images.filter(img => img.src !== imgSrc);
        
        // If this was the thumbnail, clear it
        if (currentTemplate.thumbnail === imgSrc) {
            clearThumbnail();
        }
        
        // Remove from DOM
        imgElement.remove();
        
        updateTemplateState();
        showMessage('Image removed', 'info');
        return;
    }
    
    // Show custom confirmation dialog
    showImageDeleteConfirmation(() => {
        // Remove from template data
        currentTemplate.images = currentTemplate.images.filter(img => img.src !== imgSrc);
        
        // If this was the thumbnail, clear it
        if (currentTemplate.thumbnail === imgSrc) {
            clearThumbnail();
        }
        
        // Remove from DOM
        imgElement.remove();
        
        updateTemplateState();
        showMessage('Image removed', 'info');
    });
}

function enableThumbnailSelection() {
    const allImages = document.querySelectorAll('.tier-item');
    allImages.forEach(item => {
        item.classList.add('thumbnail-selectable');
        item.title = 'Click to set as template thumbnail';
        
        // Add thumbnail selection click listener
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const imgSrc = this.querySelector('img').src;
            setThumbnail(imgSrc);
            disableThumbnailSelection();
            showMessage('Thumbnail updated!', 'success');
        }, { once: true });
    });
    
    showMessage('Click on any image to set it as template thumbnail', 'info');
}

function disableThumbnailSelection() {
    const allImages = document.querySelectorAll('.tier-item');
    allImages.forEach(item => {
        item.classList.remove('thumbnail-selectable');
        item.title = '';
    });
}

function updateTemplateState() {
    // Update tier structure
    currentTemplate.tiers = [];
    document.querySelectorAll('.tier-row').forEach(row => {
        const label = row.querySelector('.tier-label').textContent;
        const color = row.getAttribute('data-color') || '#ff6b9d';
        const items = Array.from(row.querySelectorAll('.tier-item')).map(item => ({
            src: item.querySelector('img').src,
            name: item.querySelector('img').alt,
            timestamp: item.getAttribute('data-timestamp') || Date.now()
        }));
        
        currentTemplate.tiers.push({
            label: label,
            color: color,
            items: items
        });
    });
    
    // Update tier label sizes based on row height
    updateTierLabelSizes();
}

// Dynamic tier label sizing function
function updateTierLabelSizes() {
    document.querySelectorAll('.tier-row').forEach(row => {
        const tierLabel = row.querySelector('.tier-label');
        const tierItems = row.querySelector('.tier-items');
        
        if (tierLabel && tierItems) {
            // Get the actual height of the tier items container
            const containerHeight = tierItems.offsetHeight;
            
            // Base font size calculation based on container height
            // 80px height = 24px font size (base)
            // Scale proportionally with a minimum and maximum
            const baseFontSize = 24;
            const baseHeight = 80;
            const scaleFactor = Math.max(0.7, Math.min(2, containerHeight / baseHeight));
            const newFontSize = Math.round(baseFontSize * scaleFactor);
            
            // Apply the calculated font size
            tierLabel.style.fontSize = `${Math.max(16, Math.min(48, newFontSize))}px`;
        }
    });
}

// Debounced version for performance
let tierLabelSizeUpdateTimeout;
function debouncedUpdateTierLabelSizes() {
    clearTimeout(tierLabelSizeUpdateTimeout);
    tierLabelSizeUpdateTimeout = setTimeout(updateTierLabelSizes, 100);
}

function resetTierList() {
    if (confirm('Reset the entire tier list? This will move all images back to the pool.')) {
        const imagePool = document.querySelector('.image-pool-container');
        const allImages = document.querySelectorAll('.tier-items .tier-item');
        
        allImages.forEach(img => imagePool.appendChild(img));
        updateTemplateState();
    }
}

function downloadImage() {
    updateTemplateState();
    
    if (!currentTemplate.name.trim()) {
        showMessage('Please enter a template name', 'warning');
        return;
    }
    
    // Create canvas for download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 1200;
    canvas.height = currentTemplate.tiers.length * 88 + 100;
    
    // Fill background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(currentTemplate.name, 20, 40);
    
    // Draw tiers (simplified version)
    let yOffset = 80;
    currentTemplate.tiers.forEach(tier => {
        // Draw tier label
        ctx.fillStyle = '#ff6b9d';
        ctx.fillRect(20, yOffset, 100, 80);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(tier.label, 70, yOffset + 50);
        
        // Draw tier background
        ctx.fillStyle = '#404040';
        ctx.fillRect(120, yOffset, canvas.width - 140, 80);
        
        yOffset += 88;
    });
    
    // Download canvas as image
    const link = document.createElement('a');
    link.download = `${currentTemplate.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_tierlist.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    showMessage('Tier list downloaded!', 'success');
}

async function saveTemplate() {
    updateTemplateState();
    
    if (!currentTemplate.name.trim()) {
        showMessage('Please enter a template name', 'error');
        return;
    }
    
    if (currentTemplate.images.length === 0) {
        showMessage('Please add at least one image', 'error');
        return;
    }
    
    const sharePublicly = document.getElementById('share-publicly').checked;
    
    // Generate ID if new template
    if (!currentTemplate.id) {
        currentTemplate.id = 'template_' + Date.now();
    }
    
    // Save locally first
    const existingIndex = templates.findIndex(t => t.id === currentTemplate.id);
    if (existingIndex >= 0) {
        templates[existingIndex] = { ...currentTemplate };
    } else {
        templates.push({ ...currentTemplate });
    }
    
    // Save to localStorage with error handling
    try {
        if (typeof(Storage) !== "undefined") {
            const dataToStore = JSON.stringify(templates);
            const sizeInMB = (new Blob([dataToStore]).size / 1024 / 1024).toFixed(2);
            
            console.log('Attempting to save', sizeInMB, 'MB to localStorage');
            
            // Check if storage is getting full (warn at 4MB, typical limit is 5-10MB)
            if (sizeInMB > 4) {
                console.warn('Storage size is getting large:', sizeInMB, 'MB');
                
                // Offer to clean up old LOCAL templates only
                const oldLocalTemplates = templates.filter(t => 
                    !t.isPublic && // Only clean up local templates, not public ones
                    Date.now() - new Date(t.id.split('_')[1]).getTime() > 30 * 24 * 60 * 60 * 1000 // 30 days
                );
                
                if (oldLocalTemplates.length > 0) {
                    const cleanup = confirm(`Storage is getting full (${sizeInMB}MB). Delete ${oldLocalTemplates.length} old local templates older than 30 days?`);
                    if (cleanup) {
                        templates = templates.filter(t => !oldLocalTemplates.includes(t));
                        // Save only local templates to localStorage (same logic as saveTemplates in manage-templates.js)
                        const localTemplates = templates.filter(t => !t.isPublic);
                        localStorage.setItem('tierTemplates', JSON.stringify(localTemplates));
                        showMessage(`Cleaned up ${oldLocalTemplates.length} old local templates`, 'info');
                        return; // Exit early since we already saved
                    }
                }
            }
            
            // Save only local templates to localStorage (same logic as manage-templates.js)
            const localTemplates = templates.filter(t => !t.isPublic);
            localStorage.setItem('tierTemplates', JSON.stringify(localTemplates));
        } else {
            showMessage('Cannot save: Local storage not supported', 'error');
            return;
        }
    } catch (error) {
        console.error('Error saving template:', error);
        if (error.name === 'QuotaExceededError') {
            showMessage('Storage is full. Try deleting some old templates from the manage page.', 'error');
        } else {
            showMessage('Error saving template: ' + error.message, 'error');
        }
        return;
    }
    
    // Save publicly if requested
    if (sharePublicly) {
        try {
            showMessage('Submitting template via Pull Request...', 'info');
            // Set the public flag on the template before saving
            const publicTemplate = { ...currentTemplate, public: true, isPublic: true };
            const result = await githubStorage.saveTemplate(publicTemplate);
            
            if (result && result.success) {
                showMessage('Template saved locally and submitted as Pull Request! 🎉', 'success');
                if (result.pullRequestUrl) {
                    console.log('Pull Request URL:', result.pullRequestUrl);
                }
            } else {
                showMessage('Template saved locally and submitted to repository!', 'success');
            }
        } catch (error) {
            console.error('Error submitting template:', error);
            
            // Provide helpful error message and fallback
            const useAlternative = confirm(
                `Failed to submit template: ${error.message}\n\n` +
                'Would you like to download your template as a JSON file instead?\n' +
                'You can then manually fork the repository and add it yourself.\n\n' +
                'Click OK to download, or Cancel to continue.'
            );
            
            if (useAlternative) {
                // Download the template as JSON
                const templateData = {
                    ...currentTemplate,
                    createdAt: currentTemplate.createdAt || new Date().toISOString(),
                    public: true,
                    creator: null // No creator info since not saved via API
                };
                
                const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${currentTemplate.id}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                showMessage('Template saved locally and downloaded! Manual submission instructions in console.', 'success');
                console.log('Manual submission instructions:');
                console.log('1. Go to https://github.com/FreePirat/Tiermaker2');
                console.log('2. Click "Fork" to create your own copy');
                console.log('3. In your fork, go to the "templates" folder');
                console.log('4. Click "Add file" > "Upload files"');
                console.log('5. Upload the downloaded JSON file');
                console.log('6. Create a Pull Request back to the main repository');
            } else {
                showMessage('Template saved locally, but failed to submit publicly: ' + error.message, 'warning');
            }
        }
    } else {
        showMessage('Template saved locally!', 'success');
    }
    
    // Redirect after short delay
    setTimeout(() => {
        window.location.href = 'manage-templates.html';
    }, 2000);
}

// Utility Functions
function showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.remove();
    }, 3000);
}

function recreateTierStructure(tiers) {
    const container = document.querySelector('.tier-list-container');
    container.innerHTML = '';
    
    tiers.forEach(tier => {
        const tierRow = document.createElement('div');
        tierRow.className = 'tier-row';
        tierRow.setAttribute('data-tier', tier.label);
        
        // Set tier color if available
        const tierColor = tier.color || getDefaultTierColor(tier.label);
        tierRow.setAttribute('data-color', tierColor);
        
        tierRow.innerHTML = `
            <div class="tier-label" contenteditable="true" style="background-color: ${tierColor}">${tier.label}</div>
            <div class="tier-controls">
                <input type="color" class="color-picker" value="${tierColor}" title="Change tier color">
            </div>
            <div class="tier-items" ondrop="drop(event)" ondragover="allowDrop(event)"></div>
            <div class="tier-drag-handle" title="Drag to reorder tiers">⋮⋮</div>
        `;
        
        container.appendChild(tierRow);
        
        // Add items to tier
        const tierItems = tierRow.querySelector('.tier-items');
        tier.items.forEach(item => {
            const imgElement = document.createElement('div');
            imgElement.className = 'tier-item';
            imgElement.draggable = true;
            
            // Create image with remove button
            imgElement.innerHTML = `
                <img src="${item.src}" alt="${item.name}" title="${item.name}">
                <button class="remove-btn" title="Remove image">×</button>
            `;
            
            // Preserve timestamp if available, otherwise use current time
            const timestamp = item.timestamp || Date.now();
            imgElement.setAttribute('data-timestamp', timestamp);
            
            imgElement.addEventListener('dragstart', handleDragStart);
            imgElement.addEventListener('dragend', handleDragEnd);
            
            // Add remove button functionality
            const removeBtn = imgElement.querySelector('.remove-btn');
            removeBtn.addEventListener('click', removeImageFromTemplate);
            
            // Add double-click for thumbnail selection
            imgElement.addEventListener('dblclick', function(e) {
                e.stopPropagation();
                setThumbnail(item.src, 'selected');
                showMessage('Image set as thumbnail!', 'success');
            });
            
            tierItems.appendChild(imgElement);
        });
    });
    
    // Setup color picker event listeners
    setupColorPickers();
    
    // Setup tier label auto-resize listeners
    setupTierLabelListeners();
    
    // Setup tier row sorting
    setupTierRowSorting();
    
    // Update tier label sizes based on content
    setTimeout(updateTierLabelSizes, 100); // Small delay to ensure DOM is ready
}

function loadTemplateImages(images) {
    const imagePool = document.querySelector('.image-pool-container');
    
    // Get all image sources that are already placed in tiers
    const placedImages = new Set();
    document.querySelectorAll('.tier-items img').forEach(img => {
        placedImages.add(img.src);
    });
    
    images.forEach(img => {
        // Only load images that are in the pool AND haven't been placed in tiers
        if (img.position === 'pool' && !placedImages.has(img.src)) {
            const imgElement = document.createElement('div');
            imgElement.className = 'tier-item';
            imgElement.draggable = true;
            
            // Create image with remove button
            imgElement.innerHTML = `
                <img src="${img.src}" alt="${img.name}" title="${img.name}">
                <button class="remove-btn" title="Remove image">×</button>
            `;
            
            // Preserve timestamp if available, otherwise use current time
            const timestamp = img.timestamp || Date.now();
            imgElement.setAttribute('data-timestamp', timestamp);
            
            imgElement.addEventListener('dragstart', handleDragStart);
            imgElement.addEventListener('dragend', handleDragEnd);
            
            // Add remove button functionality
            const removeBtn = imgElement.querySelector('.remove-btn');
            removeBtn.addEventListener('click', removeImageFromTemplate);
            
            // Add double-click for thumbnail selection
            imgElement.addEventListener('dblclick', function(e) {
                e.stopPropagation();
                setThumbnail(img.src, 'selected');
                showMessage('Image set as thumbnail!', 'success');
            });
            
            imagePool.appendChild(imgElement);
        }
    });
}

// Add event listeners for drag over effects
document.addEventListener('dragover', function(e) {
    if (e.target.classList.contains('tier-items') || e.target.classList.contains('image-pool-container')) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }
});

document.addEventListener('dragleave', function(e) {
    if (e.target.classList.contains('tier-items') || e.target.classList.contains('image-pool-container')) {
        e.target.classList.remove('drag-over');
    }
});

document.addEventListener('drop', function(e) {
    if (e.target.classList.contains('tier-items') || e.target.classList.contains('image-pool-container')) {
        e.target.classList.remove('drag-over');
    }
});

// Pinned Character Pool System
let pinnedPoolVisible = false;
let pinnedPoolImages = [];

function togglePinnedPool() {
    const pinnedPool = document.getElementById('pinned-pool');
    const pinBtn = document.getElementById('pin-pool-btn');
    
    pinnedPoolVisible = !pinnedPoolVisible;
    
    if (pinnedPoolVisible) {
        // Show pinned pool
        pinnedPool.classList.remove('hidden');
        document.body.classList.add('pinned-pool-active');
        pinBtn.classList.add('active');
        pinBtn.innerHTML = '📌 Unpin Pool';
        
        // Populate with current images
        populatePinnedPool();
    } else {
        // Hide pinned pool
        pinnedPool.classList.add('hidden');
        document.body.classList.remove('pinned-pool-active');
        pinBtn.classList.remove('active');
        pinBtn.innerHTML = '📌 Pin Pool';
    }
}

function populatePinnedPool() {
    const poolContainer = document.querySelector('.image-pool-container');
    const pinnedRows = document.querySelectorAll('.pinned-pool-row');
    
    // Clear existing pinned images
    pinnedRows.forEach(row => row.innerHTML = '');
    
    // Get all actual images from the main pool (only tier-items with images)
    const images = Array.from(poolContainer.querySelectorAll('.tier-item img'));
    
    // Only proceed if there are actual images
    if (images.length === 0) {
        return;
    }
    
    // Distribute images across two rows
    const imagesPerRow = Math.ceil(images.length / 2);
    
    images.forEach((img, index) => {
        const rowIndex = Math.floor(index / imagesPerRow);
        const targetRow = pinnedRows[rowIndex];
        
        if (targetRow) {
            // Create pinned version using the actual image
            const pinnedImg = createPinnedCharacter(img);
            targetRow.appendChild(pinnedImg);
        }
    });
}

function createPinnedCharacter(originalImg) {
    const pinnedChar = document.createElement('div');
    pinnedChar.className = 'pinned-character';
    pinnedChar.draggable = true;
    
    // Use the actual image element directly
    const imgClone = document.createElement('img');
    imgClone.src = originalImg.src;
    imgClone.alt = originalImg.alt;
    pinnedChar.appendChild(imgClone);
    
    // Store the source for drag operations
    pinnedChar.dataset.src = originalImg.src;
    
    // Add drag events
    pinnedChar.addEventListener('dragstart', function(e) {
        draggedElement = pinnedChar;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', originalImg.src);
        pinnedChar.style.opacity = '0.5';
    });
    
    pinnedChar.addEventListener('dragend', function(e) {
        pinnedChar.style.opacity = '1';
        draggedElement = null;
    });
    
    return pinnedChar;
}

// Setup drag events for tier items
function setupDragEvents(tierItem) {
    tierItem.addEventListener('dragstart', function(e) {
        draggedElement = tierItem;
        e.dataTransfer.effectAllowed = 'move';
        tierItem.style.opacity = '0.5';
    });
    
    tierItem.addEventListener('dragend', function(e) {
        tierItem.style.opacity = '1';
        draggedElement = null;
    });
}

// Setup drag events for tier items
function setupDragEvents(element) {
    element.addEventListener('dragstart', function(e) {
        draggedElement = element;
        e.dataTransfer.effectAllowed = 'move';
        element.style.opacity = '0.5';
    });
    
    element.addEventListener('dragend', function(e) {
        element.style.opacity = '1';
        draggedElement = null;
    });
}

// Update the main pool when images are added/removed
function updatePinnedPool() {
    if (pinnedPoolVisible) {
        populatePinnedPool();
    }
}

// Hook into image addition by monitoring the pool container
const imagePoolContainer = document.querySelector('.image-pool-container');
if (imagePoolContainer) {
    // Use MutationObserver to detect changes in the image pool
    const poolObserver = new MutationObserver(function(mutations) {
        let shouldUpdate = false;
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                shouldUpdate = true;
            }
        });
        if (shouldUpdate) {
            updatePinnedPool();
        }
    });
    
    poolObserver.observe(imagePoolContainer, { 
        childList: true, 
        subtree: true 
    });
}

// Handle keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + P to toggle pinned pool
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        togglePinnedPool();
    }
});

// Auto-scroll functionality for dragging
let autoScrollInterval = null;
let isAutoScrolling = false;

function startAutoScroll(direction, speed = 5) {
    if (isAutoScrolling) return;
    
    isAutoScrolling = true;
    autoScrollInterval = setInterval(() => {
        if (direction === 'up') {
            window.scrollBy(0, -speed);
        } else if (direction === 'down') {
            window.scrollBy(0, speed);
        }
    }, 16); // ~60fps for smooth scrolling
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
        isAutoScrolling = false;
    }
}

function checkAutoScroll(e) {
    const scrollZone = 100; // pixels from edge to trigger scroll
    const viewportHeight = window.innerHeight;
    const mouseY = e.clientY;
    
    // Check if near top of screen
    if (mouseY < scrollZone && window.scrollY > 0) {
        const speed = Math.max(2, (scrollZone - mouseY) / 10); // Faster near edge
        startAutoScroll('up', speed);
    }
    // Check if near bottom of screen
    else if (mouseY > viewportHeight - scrollZone) {
        const speed = Math.max(2, (mouseY - (viewportHeight - scrollZone)) / 10);
        startAutoScroll('down', speed);
    }
    // Stop scrolling if not in scroll zones
    else {
        stopAutoScroll();
    }
}

// Add dragover event to document for auto-scrolling
document.addEventListener('dragover', function(e) {
    if (draggedElement) {
        checkAutoScroll(e);
    }
});

// Stop auto-scrolling when drag ends
document.addEventListener('dragend', function(e) {
    stopAutoScroll();
});

// Stop auto-scrolling when drop occurs
document.addEventListener('drop', function(e) {
    stopAutoScroll();
});

// Stop auto-scrolling when dragging is cancelled (like pressing ESC)
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && draggedElement) {
        stopAutoScroll();
    }
});

// Custom Image Delete Confirmation Dialog
function showImageDeleteConfirmation(onConfirm) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';
    dialog.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        min-width: 300px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        text-align: center;
    `;

    dialog.innerHTML = `
        <h3 style="margin: 0 0 16px 0; color: #333;">Remove Image</h3>
        <p style="margin: 0 0 20px 0; color: #666;">Are you sure you want to remove this image?</p>
        
        <div style="margin: 20px 0;">
            <label style="display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; color: #666; cursor: pointer;">
                <input type="checkbox" id="dont-ask-again" style="margin: 0;">
                Don't ask again
            </label>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="cancel-delete" style="
                padding: 8px 20px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                cursor: pointer;
                color: #666;
            ">Cancel</button>
            <button id="confirm-delete" style="
                padding: 8px 20px;
                border: none;
                background: #dc3545;
                color: white;
                border-radius: 4px;
                cursor: pointer;
            ">Remove</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Handle buttons
    const cancelBtn = dialog.querySelector('#cancel-delete');
    const confirmBtn = dialog.querySelector('#confirm-delete');
    const dontAskCheckbox = dialog.querySelector('#dont-ask-again');

    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });

    confirmBtn.addEventListener('click', () => {
        // Save preference if checkbox is checked
        if (dontAskCheckbox.checked) {
            localStorage.setItem('skipImageDeleteConfirm', 'true');
        }
        
        document.body.removeChild(overlay);
        onConfirm();
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });

    // Close on escape key
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(overlay);
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);
}

// Function to reset the "don't ask again" preference
function resetImageDeleteConfirmation() {
    localStorage.removeItem('skipImageDeleteConfirm');
    showMessage('Image deletion confirmations will now be shown again', 'info');
}

// Collapsible Template Info Section
function toggleTemplateInfoSection() {
    const content = document.getElementById('template-info-content');
    const arrow = document.getElementById('template-info-arrow');
    
    if (content && arrow) {
        const isCollapsed = content.classList.contains('collapsed');
        
        if (isCollapsed) {
            // Expand
            content.classList.remove('collapsed');
            arrow.classList.remove('collapsed');
            arrow.textContent = '▼';
            // Set a high max-height to allow natural expansion
            content.style.maxHeight = '1000px';
        } else {
            // Collapse
            // First set the current height, then transition to 0
            const currentHeight = content.scrollHeight;
            content.style.maxHeight = currentHeight + 'px';
            
            // Force a reflow
            content.offsetHeight;
            
            // Then collapse
            content.classList.add('collapsed');
            arrow.classList.add('collapsed');
            arrow.textContent = '▶';
            content.style.maxHeight = '0px';
        }
        
        // Save collapse state to localStorage
        localStorage.setItem('templateInfoCollapsed', !isCollapsed);
    }
}

// Initialize collapse state on page load
function initializeTemplateInfoSection() {
    const isCollapsed = localStorage.getItem('templateInfoCollapsed') === 'true';
    const content = document.getElementById('template-info-content');
    const arrow = document.getElementById('template-info-arrow');
    
    if (isCollapsed && content && arrow) {
        content.classList.add('collapsed');
        arrow.classList.add('collapsed');
        arrow.textContent = '▶';
    }
}