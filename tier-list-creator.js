// Tier List Creator JavaScript

// Constants
const MAX_TIER_LABEL_LENGTH = 35; // Character limit for tier labels

let draggedElement = null;
let templates = [];

// Touch drag variables
let touchStartPos = { x: 0, y: 0 };
let touchOffset = { x: 0, y: 0 };
let isDragging = false;
let dragPreview = null;

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

// Auto-resize tier label text to fit in the available container space with overflow protection
function autoResizeTierLabel(label) {
    let text = label.textContent || label.innerText;
    
    // Get the actual dimensions of the tier label
    const labelHeight = label.offsetHeight || 80;
    const labelWidth = 70; // 80px width - 10px padding = 70px usable width
    
    // Calculate height-based multiplier (more height = allow bigger text and more characters)
    const heightMultiplier = Math.max(1, Math.min(2.5, labelHeight / 80));
    
    // Dynamic character limit based on available height
    const baseCharLimit = 35;
    const heightBasedCharLimit = Math.floor(baseCharLimit * heightMultiplier);
    const dynamicCharLimit = Math.min(60, heightBasedCharLimit);
    
    // Enforce dynamic character limit
    if (text.length > dynamicCharLimit) {
        text = text.substring(0, dynamicCharLimit);
        label.textContent = text;
    }
    
    // Start with base font size calculation
    const textLength = text.length;
    let baseFontSize;
    
    if (textLength <= 2) {
        baseFontSize = 28;
    } else if (textLength <= 4) {
        baseFontSize = 24;
    } else if (textLength <= 6) {
        baseFontSize = 20;
    } else if (textLength <= 8) {
        baseFontSize = 18;
    } else if (textLength <= 12) {
        baseFontSize = 16;
    } else if (textLength <= 16) {
        baseFontSize = 14;
    } else if (textLength <= 20) {
        baseFontSize = 12;
    } else if (textLength <= 25) {
        baseFontSize = 11;
    } else if (textLength <= 35) {
        baseFontSize = 10;
    } else if (textLength <= 45) {
        baseFontSize = 9;
    } else {
        baseFontSize = 8;
    }
    
    // Apply height multiplier to base font size
    let fontSize = Math.round(baseFontSize * heightMultiplier);
    
    // Apply bounds
    fontSize = Math.max(6, Math.min(36, fontSize));
    
    // Test if text fits at this size and reduce if necessary
    fontSize = fitTextToContainer(label, text, fontSize, labelWidth, labelHeight);
    
    label.style.fontSize = fontSize + 'px';
    
    // Store the current dynamic char limit for use in event handlers
    label.setAttribute('data-char-limit', dynamicCharLimit);
}

// Test if text fits in container and reduce font size until it fits
function fitTextToContainer(label, text, startFontSize, maxWidth, maxHeight) {
    let fontSize = startFontSize;
    const minFontSize = 6; // Absolute minimum readable size
    
    // Create a temporary element to measure text dimensions
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.whiteSpace = 'normal';
    tempElement.style.wordBreak = 'break-word';
    tempElement.style.overflowWrap = 'anywhere';
    tempElement.style.width = maxWidth + 'px';
    tempElement.style.fontFamily = getComputedStyle(label).fontFamily;
    tempElement.style.fontWeight = getComputedStyle(label).fontWeight;
    tempElement.style.textAlign = 'center';
    tempElement.style.padding = '0';
    tempElement.style.margin = '0';
    tempElement.style.lineHeight = '1.2';
    tempElement.textContent = text;
    
    document.body.appendChild(tempElement);
    
    try {
        // Test decreasing font sizes until text fits
        while (fontSize >= minFontSize) {
            tempElement.style.fontSize = fontSize + 'px';
            
            // Force layout update
            tempElement.offsetHeight;
            
            const textHeight = tempElement.offsetHeight;
            const textWidth = tempElement.offsetWidth;
            
            // Check if text fits within bounds (with some padding tolerance)
            if (textHeight <= (maxHeight - 10) && textWidth <= maxWidth) {
                break;
            }
            
            fontSize -= 0.5; // Reduce by half pixel for fine control
        }
        
        // Ensure we don't go below minimum
        fontSize = Math.max(minFontSize, fontSize);
        
    } finally {
        document.body.removeChild(tempElement);
    }
    
    return fontSize;
}

// Setup tier label event listeners for auto-resizing
function setupTierLabelListeners() {
    document.querySelectorAll('.tier-label').forEach(label => {
        // Auto-resize on input with dynamic character limit and overflow protection
        label.addEventListener('input', function() {
            // Clean up the text - remove problematic characters
            let text = this.textContent || this.innerText;
            
            // Remove excessive whitespace (more than 2 consecutive spaces)
            text = text.replace(/\s{3,}/g, '  ');
            
            // Remove line breaks and tabs
            text = text.replace(/[\r\n\t]/g, ' ');
            
            // Update the content if it was cleaned
            if (text !== (this.textContent || this.innerText)) {
                this.textContent = text;
                
                // Restore cursor position to end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(this);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // Apply sizing first to get current char limit
            autoResizeTierLabel(this);
            
            // Re-check text after sizing (in case it was truncated)
            text = this.textContent || this.innerText;
            const currentCharLimit = parseInt(this.getAttribute('data-char-limit')) || MAX_TIER_LABEL_LENGTH;
            
            // Double-check character limit enforcement
            if (text.length > currentCharLimit) {
                const truncatedText = text.substring(0, currentCharLimit);
                this.textContent = truncatedText;
                
                // Move cursor to end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(this);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
                
                showMessage(`Tier label limited to ${currentCharLimit} characters for current size`, 'warning');
                
                // Re-apply sizing after truncation
                autoResizeTierLabel(this);
            }
            
            updateTemplateState();
        });
        
        // Auto-resize on paste with dynamic character limit
        label.addEventListener('paste', function(e) {
            e.preventDefault(); // Prevent default paste
            
            // Get current dynamic character limit
            const currentCharLimit = parseInt(this.getAttribute('data-char-limit')) || MAX_TIER_LABEL_LENGTH;
            
            // Get pasted text
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const currentText = this.textContent || this.innerText;
            
            // Calculate how much text we can add
            const remainingChars = currentCharLimit - currentText.length;
            
            if (remainingChars <= 0) {
                showMessage(`Tier label limited to ${currentCharLimit} characters for current size`, 'warning');
                return;
            }
            
            // Truncate pasted text if necessary
            const textToInsert = pastedText.substring(0, remainingChars);
            
            // Insert the text at cursor position
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(textToInsert));
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                // Fallback: append to end
                this.textContent = currentText + textToInsert;
            }
            
            if (pastedText.length > textToInsert.length) {
                showMessage(`Pasted text truncated to ${currentCharLimit} character limit for current size`, 'warning');
            }
            
            setTimeout(() => {
                autoResizeTierLabel(this);
                updateTemplateState();
            }, 10);
        });
        
        // Prevent line breaks and enforce dynamic character limit on keydown with enhanced validation
        label.addEventListener('keydown', function(e) {
            const text = this.textContent || this.innerText;
            
            // Prevent problematic keys
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                return;
            }
            
            // Allow navigation and editing keys
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
            if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) {
                return;
            }
            
            // Prevent multiple consecutive spaces
            if (e.key === ' ') {
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const beforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || '';
                    const afterCursor = range.startContainer.textContent?.substring(range.startOffset) || '';
                    
                    // Check if there are already spaces around the cursor
                    if (beforeCursor.endsWith('  ') || afterCursor.startsWith('  ') || 
                        (beforeCursor.endsWith(' ') && afterCursor.startsWith(' '))) {
                        e.preventDefault();
                        return;
                    }
                }
            }
            
            // Get current character limit and test if we can add more
            autoResizeTierLabel(this);
            const currentCharLimit = parseInt(this.getAttribute('data-char-limit')) || MAX_TIER_LABEL_LENGTH;
            
            // Prevent adding more characters if at current limit
            if (text.length >= currentCharLimit) {
                e.preventDefault();
                showMessage(`Tier label limited to ${currentCharLimit} characters for current size`, 'warning');
                return;
            }
            
            // For very long strings without spaces, start refusing new characters earlier
            const words = text.split(/\s+/);
            const longestWord = Math.max(...words.map(word => word.length));
            if (longestWord > 15 && !e.key.match(/\s/)) {
                // If we're typing a non-space character and there's already a very long word
                const selection = window.getSelection();
                if (selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    const currentWord = getCurrentWord(range);
                    if (currentWord.length > 15) {
                        e.preventDefault();
                        showMessage('Word too long - add a space or hyphen to continue', 'warning');
                        return;
                    }
                }
            }
        });
        
        // Initial resize
        autoResizeTierLabel(label);
    });
}

// Helper function to get the current word being typed at cursor position
function getCurrentWord(range) {
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return '';
    
    const text = textNode.textContent || '';
    const offset = range.startOffset;
    
    // Find word boundaries around the cursor
    let start = offset;
    let end = offset;
    
    // Move start backward to find word start
    while (start > 0 && !text[start - 1].match(/\s/)) {
        start--;
    }
    
    // Move end forward to find word end
    while (end < text.length && !text[end].match(/\s/)) {
        end++;
    }
    
    return text.substring(start, end);
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

// Remove window resize listener since tier labels no longer scale with row height
// Text now only scales based on content length
// window.addEventListener('resize', debouncedUpdateTierLabelSizes);

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
    
    // Image size controls
    const imageSizeRadios = document.querySelectorAll('input[name="imageSize"]');
    imageSizeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                changeImageSize(this.value);
            }
        });
    });
    
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
            const saveBtn = document.querySelector('.save-btn');
            saveBtn.textContent = '🔄 Update Template';
            saveBtn.classList.add('update-mode');
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
                    const saveBtn = document.querySelector('.save-btn');
                    saveBtn.textContent = '🔄 Update Public Template';
                    saveBtn.classList.add('update-mode');
                    document.getElementById('share-publicly').checked = true;
                } else {
                    // User is copying someone else's template or not editing
                    loadTemplateData(template, true, false);
                    const saveBtn = document.querySelector('.save-btn');
                    saveBtn.textContent = '✅ Save as New Template';
                    saveBtn.classList.add('copy-mode');
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
        
        // Clear the canvas to ensure transparency is preserved
        ctx.clearRect(0, 0, width, height);
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Check if the original file is PNG to preserve transparency
        let compressedDataUrl;
        if (file.type === 'image/png') {
            // Keep as PNG to preserve transparency
            compressedDataUrl = canvas.toDataURL('image/png');
        } else {
            // Convert to compressed JPEG for other formats
            compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        }
        
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
    
    // Use setupDragEvents for consistency
    setupDragEvents(imgElement);
    
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
    
    // Apply current size class to the new image
    applySizeClasses([imgElement], []);
    
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
function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function drop(e) {
    e.preventDefault();
    
    // Get the actual drop target - could be currentTarget or target
    const dropTarget = e.currentTarget || e.target;
    
    // Early safety check - ensure we have a valid drop target
    if (!dropTarget) {
        console.error('Drop function called without valid target');
        return;
    }
    
    // Safely remove drag-over class if it exists
    if (dropTarget && dropTarget.classList && dropTarget.classList.contains('drag-over')) {
        dropTarget.classList.remove('drag-over');
    }
    
    console.log('Drop event triggered:', {
        currentTarget: e.currentTarget,
        target: e.target,
        dropTarget: dropTarget,
        classList: dropTarget ? dropTarget.classList.toString() : 'No classList',
        draggedElement: draggedElement
    });
    
    if (!draggedElement) {
        console.log('No dragged element');
        return;
    }
    
    // Early return if dropTarget is not valid
    if (!dropTarget || !dropTarget.classList) {
        console.log('Invalid drop target - no classList');
        return;
    }
    
    const isDropTarget = dropTarget.classList.contains('tier-items') || 
                        dropTarget.classList.contains('image-pool-container') ||
                        dropTarget.classList.contains('pinned-pool-container') ||
                        dropTarget.classList.contains('pinned-pool-row');
    
    if (!isDropTarget) {
        console.log('Not a valid drop target');
        return;
    }
    
    console.log('Valid drop detected');
    
    // Handle drops to image pool (return images from tier rows)
    if (dropTarget.classList.contains('image-pool-container')) {
        console.log('Dropping to image pool');
        if (draggedElement.classList.contains('tier-item')) {
            console.log('Moving tier item to image pool');
            
            // Move tier item back to main image pool
            dropTarget.appendChild(draggedElement);
            
            // Ensure the tier item has the correct size class
            const selectedRadio = document.querySelector('input[name="imageSize"]:checked');
            const currentSize = selectedRadio ? selectedRadio.value : 'medium';
            const sizeClass = `size-${currentSize}`;
            
            // Remove all size classes and add the current one
            draggedElement.classList.remove('size-small', 'size-medium', 'size-large');
            draggedElement.classList.add(sizeClass);
            
            updateTemplateState();
            updatePinnedPool(); // Refresh pinned pool
            console.log('Successfully moved to image pool');
            return;
        }
    }
    
    // Handle drops to pinned pool (return to main pool)
    if (dropTarget.classList.contains('pinned-pool-container') || 
        dropTarget.classList.contains('pinned-pool-row')) {
        
        if (draggedElement.classList.contains('tier-item')) {
            // Move tier item back to main image pool
            const imagePool = document.querySelector('.image-pool-container');
            imagePool.appendChild(draggedElement);
            
            // Ensure the tier item has the correct size class
            const selectedRadio = document.querySelector('input[name="imageSize"]:checked');
            const currentSize = selectedRadio ? selectedRadio.value : 'medium';
            const sizeClass = `size-${currentSize}`;
            
            // Remove all size classes and add the current one
            draggedElement.classList.remove('size-small', 'size-medium', 'size-large');
            draggedElement.classList.add(sizeClass);
            
            updateTemplateState();
            updatePinnedPool(); // Refresh pinned pool
            return;
        }
    }
    
    // Handle pinned character drops
    if (draggedElement.classList.contains('pinned-character')) {
        // Only allow dropping pinned characters into tier rows
        if (!dropTarget.classList.contains('tier-items')) {
            // Ignore drops onto image pool or pinned pool to avoid creating duplicates
            console.log('Ignored drop of pinned-character on non-tier area');
            return;
        }
        // Only create and insert a new tier item, do NOT append the dragged pinned character itself
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

        // Apply current size class to the new item
        const selectedRadio = document.querySelector('input[name="imageSize"]:checked');
        const currentSize = selectedRadio ? selectedRadio.value : 'medium';
        const sizeClass = `size-${currentSize}`;
        newItem.classList.add(sizeClass);

        // Handle positioning within tier rows
        insertAtPosition(dropTarget, newItem, e.clientX, e.clientY);

        // Remove the original image from the pool
        const poolContainer = document.querySelector('.image-pool-container');
        const originalImages = poolContainer.querySelectorAll('.tier-item img');
        for (let originalImg of originalImages) {
            if (originalImg.src === draggedElement.dataset.src) {
                const tierItem = originalImg.closest('.tier-item');
                if (tierItem) {
                    tierItem.remove();
                    break;
                }
            }
        }

        updatePinnedPool();
    } else {
        // Handle regular drops (existing tier items)
        if (dropTarget.classList.contains('tier-items')) {
            // Handle positioning within tier rows
            insertAtPosition(dropTarget, draggedElement, e.clientX, e.clientY);
        } else {
            // Simple append for image pool
            dropTarget.appendChild(draggedElement);
            
            // Ensure proper size class when moving to pools
            const selectedRadio = document.querySelector('input[name="imageSize"]:checked');
            const currentSize = selectedRadio ? selectedRadio.value : 'medium';
            const sizeClass = `size-${currentSize}`;
            
            // Remove all size classes and add the current one
            draggedElement.classList.remove('size-small', 'size-medium', 'size-large');
            draggedElement.classList.add(sizeClass);
        }
    }
    updateTemplateState();
}

// Function to insert element at the correct position based on mouse coordinates
function insertAtPosition(container, element, clientX, clientY) {
    const items = Array.from(container.children).filter(child => 
        child !== element && child.classList.contains('tier-item')
    );
    
    if (items.length === 0) {
        container.appendChild(element);
        return;
    }
    
    // Find the best position to insert the element
    let insertBefore = null;
    let minDistance = Infinity;
    
    for (let item of items) {
        const rect = item.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const itemCenterY = rect.top + rect.height / 2;
        
        // Calculate distance from mouse to item center
        const distance = Math.sqrt(
            Math.pow(clientX - itemCenterX, 2) + 
            Math.pow(clientY - itemCenterY, 2)
        );
        
        // If mouse is to the left of the item center, consider inserting before this item
        if (clientX < itemCenterX && distance < minDistance) {
            minDistance = distance;
            insertBefore = item;
        }
    }
    
    if (insertBefore) {
        container.insertBefore(element, insertBefore);
    } else {
        container.appendChild(element);
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
        <div class="tier-items"></div>
        <div class="tier-drag-handle" title="Drag to reorder tiers">⋮⋮</div>
    `;
    
    container.appendChild(newTier);
    
    // Apply current size class to the new tier label, row, and tier-items container
    const newTierLabel = newTier.querySelector('.tier-label');
    const newTierItemsContainer = newTier.querySelector('.tier-items');
    applySizeClasses([], [newTierLabel], [newTier], [newTierItemsContainer]);
    
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
            <div class="tier-items"></div>
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
    
    // Apply auto-resize to all existing tier labels with a delay to ensure DOM has updated
    setTimeout(() => {
        document.querySelectorAll('.tier-label').forEach(autoResizeTierLabel);
    }, 50); // Small delay to ensure tier row heights have updated after image movement
}

// Update all tier label text sizes based on their content and available space
function updateTierLabelSizes() {
    // Add a small delay to ensure DOM heights are updated
    setTimeout(() => {
        document.querySelectorAll('.tier-label').forEach(label => {
            autoResizeTierLabel(label);
        });
    }, 50);
}

// Debounced version for performance
let tierLabelSizeUpdateTimeout;
function debouncedUpdateTierLabelSizes() {
    clearTimeout(tierLabelSizeUpdateTimeout);
    tierLabelSizeUpdateTimeout = setTimeout(updateTierLabelSizes, 100);
}

// Function to change image size and update tier labels accordingly
function changeImageSize(size) {
    // Remove existing size classes from all elements
    const tierItems = document.querySelectorAll('.tier-item');
    const tierLabels = document.querySelectorAll('.tier-label');
    const tierRows = document.querySelectorAll('.tier-row');
    const tierItemsContainers = document.querySelectorAll('.tier-items');
    const pinnedCharacters = document.querySelectorAll('.pinned-character');
    const pinnedPoolRows = document.querySelectorAll('.pinned-pool-row');
    
    // Remove all size classes
    tierItems.forEach(item => {
        item.classList.remove('size-small', 'size-medium', 'size-large');
    });
    
    tierLabels.forEach(label => {
        label.classList.remove('size-small', 'size-medium', 'size-large');
    });
    
    tierRows.forEach(row => {
        row.classList.remove('size-small', 'size-medium', 'size-large');
    });
    
    tierItemsContainers.forEach(container => {
        container.classList.remove('size-small', 'size-medium', 'size-large');
    });
    
    pinnedCharacters.forEach(character => {
        character.classList.remove('size-small', 'size-medium', 'size-large');
    });
    
    pinnedPoolRows.forEach(row => {
        row.classList.remove('size-small', 'size-medium', 'size-large');
    });
    
    // Add the new size class to all elements
    const sizeClass = `size-${size}`;
    tierItems.forEach(item => {
        item.classList.add(sizeClass);
    });
    
    tierLabels.forEach(label => {
        label.classList.add(sizeClass);
    });
    
    tierRows.forEach(row => {
        row.classList.add(sizeClass);
    });
    
    tierItemsContainers.forEach(container => {
        container.classList.add(sizeClass);
    });
    
    pinnedCharacters.forEach(character => {
        character.classList.add(sizeClass);
    });
    
    pinnedPoolRows.forEach(row => {
        row.classList.add(sizeClass);
    });
    
    // Update tier label sizes after size change
    setTimeout(() => {
        updateTierLabelSizes();
    }, 100);
}

// Helper function to apply current size classes to specific elements
function applySizeClasses(tierItems, tierLabels, tierRows = [], tierItemsContainers = [], pinnedCharacters = []) {
    // Get the currently selected size from radio buttons
    const selectedRadio = document.querySelector('input[name="imageSize"]:checked');
    const currentSize = selectedRadio ? selectedRadio.value : 'medium';
    
    // Apply size class
    const sizeClass = `size-${currentSize}`;
    tierItems.forEach(item => {
        // Remove existing size classes first
        item.classList.remove('size-small', 'size-medium', 'size-large');
        item.classList.add(sizeClass);
    });
    
    tierLabels.forEach(label => {
        label.classList.remove('size-small', 'size-medium', 'size-large');
        label.classList.add(sizeClass);
    });
    
    tierRows.forEach(row => {
        row.classList.remove('size-small', 'size-medium', 'size-large');
        row.classList.add(sizeClass);
    });
    
    tierItemsContainers.forEach(container => {
        container.classList.remove('size-small', 'size-medium', 'size-large');
        container.classList.add(sizeClass);
    });
    
    pinnedCharacters.forEach(character => {
        character.classList.remove('size-small', 'size-medium', 'size-large');
        character.classList.add(sizeClass);
    });
}

// Helper function to get current image size setting
function getCurrentImageSize() {
    const sizeRadios = document.querySelectorAll('input[name="imageSize"]');
    for (let radio of sizeRadios) {
        if (radio.checked) {
            return radio.value;
        }
    }
    return 'medium'; // default
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
    const isUpdating = !!currentTemplate.id && templates.some(t => t.id === currentTemplate.id);
    
    // Set creation/update timestamps
    if (!currentTemplate.id) {
        // New template
        currentTemplate.id = 'template_' + Date.now();
        currentTemplate.createdAt = new Date().toISOString();
    } else {
        // Updating existing template
        currentTemplate.updatedAt = new Date().toISOString();
    }
    
    // Mark template as public if sharing publicly
    if (sharePublicly) {
        currentTemplate.public = true;
        currentTemplate.isPublic = true;
    }

    // Save locally first
    const existingIndex = templates.findIndex(t => t.id === currentTemplate.id);
    if (existingIndex >= 0) {
        // Update existing template
        templates[existingIndex] = { ...currentTemplate };
    } else {
        // Add new template
        templates.push({ ...currentTemplate });
    }    // Save to localStorage with advanced storage management
    try {
        if (typeof(Storage) !== "undefined") {
            // Attempt to save with storage optimization
            if (!await saveTemplatesWithOptimization(templates)) {
                return; // Failed to save even after optimization
            }
        } else {
            showMessage('Cannot save: Local storage not supported', 'error');
            return;
        }
    } catch (error) {
        console.error('Error saving template:', error);
        showMessage('Error saving template: ' + error.message, 'error');
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
                const action = isUpdating ? 'updated' : 'saved';
                showMessage(`Template ${action} locally and submitted as Pull Request! 🎉`, 'success');
                if (result.pullRequestUrl) {
                    console.log('Pull Request URL:', result.pullRequestUrl);
                }
            } else if (result && result.local) {
                const action = isUpdating ? 'updated' : 'saved';
                showMessage(`Template ${action} locally! (Public sharing not available)`, 'success');
            } else {
                const action = isUpdating ? 'updated' : 'saved';
                showMessage(`Template ${action} locally and submitted to repository!`, 'success');
            }
        } catch (error) {
            console.error('Error submitting template:', error);
            
            // Only show error dialog for genuine failures, not when local save succeeded
            if (error.message.includes('Authentication required') || error.message.includes('token')) {
                // Authentication-related errors - suggest alternative
                const useAlternative = confirm(
                    `Authentication required to submit template publicly.\n\n` +
                    'Your template has been saved locally. Would you like to download it as a JSON file for manual submission?\n\n' +
                    'Click OK to download, or Cancel to continue.'
                );
                
                if (useAlternative) {
                    downloadTemplateAsJSON();
                    const action = isUpdating ? 'updated' : 'saved';
                    showMessage(`Template ${action} locally and downloaded! Check console for manual submission instructions.`, 'success');
                    logManualSubmissionInstructions();
                } else {
                    const action = isUpdating ? 'updated' : 'saved';
                    showMessage(`Template ${action} locally! (GitHub authentication required for public sharing)`, 'warning');
                }
            } else if (error.message.includes('fork') || error.message.includes('pull request') || error.message.includes('GitHub')) {
                // GitHub-specific errors - offer download option
                const useAlternative = confirm(
                    `Failed to submit template: ${error.message}\n\n` +
                    'Your template has been saved locally. Would you like to download it as a JSON file for manual submission?\n\n' +
                    'Click OK to download, or Cancel to continue.'
                );
                
                if (useAlternative) {
                    downloadTemplateAsJSON();
                    const action = isUpdating ? 'updated' : 'saved';
                    showMessage(`Template ${action} locally and downloaded! Check console for manual submission instructions.`, 'success');
                    logManualSubmissionInstructions();
                } else {
                    const action = isUpdating ? 'updated' : 'saved';
                    showMessage(`Template ${action} locally, but failed to submit publicly: ${error.message}`, 'warning');
                }
            } else {
                // Other errors - just show warning without interrupting workflow
                const action = isUpdating ? 'updated' : 'saved';
                showMessage(`Template ${action} locally, but public submission failed: ${error.message}`, 'warning');
                console.error('Public submission error details:', error);
            }
        }
    } else {
        const action = isUpdating ? 'updated' : 'saved';
        showMessage(`Template ${action} locally!`, 'success');
    }

    // Helper function to download template as JSON
    function downloadTemplateAsJSON() {
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
    }
    
    // Helper function to log manual submission instructions
    function logManualSubmissionInstructions() {
        console.log('Manual submission instructions:');
        console.log('1. Go to https://github.com/FreePirat/Tiermaker2');
        console.log('2. Click "Fork" to create your own copy');
        console.log('3. In your fork, go to the "templates" folder');
        console.log('4. Click "Add file" > "Upload files"');
        console.log('5. Upload the downloaded JSON file');
        console.log('6. Create a Pull Request back to the main repository');
    }
    
    // Redirect after short delay
    setTimeout(() => {
        window.location.href = 'manage-templates.html';
    }, 2000);
}

// Advanced Storage Management Functions
async function saveTemplatesWithOptimization(templates) {
    try {
        // First attempt: normal save
        const dataToStore = JSON.stringify(templates);
        const sizeInMB = (new Blob([dataToStore]).size / 1024 / 1024).toFixed(2);
        
        console.log('Attempting to save', sizeInMB, 'MB to localStorage');
        
        try {
            localStorage.setItem('tierTemplates', dataToStore);
            return true; // Success on first attempt
        } catch (quotaError) {
            if (quotaError.name !== 'QuotaExceededError') {
                throw quotaError; // Re-throw if it's not a quota error
            }
        }
        
        // If we reach here, storage is full - try optimization strategies
        console.warn('Storage quota exceeded, attempting optimization...');
        
        // Strategy 1: Clean up old local templates (30+ days old)
        const oldLocalTemplates = templates.filter(t => 
            !t.isPublic && !t.public && 
            t.id.startsWith('template_') &&
            Date.now() - parseInt(t.id.split('_')[1]) > 30 * 24 * 60 * 60 * 1000
        );
        
        if (oldLocalTemplates.length > 0) {
            const shouldCleanup = confirm(
                `Storage is full! Found ${oldLocalTemplates.length} local templates older than 30 days.\n\n` +
                'Delete them to make room? (Your public templates will be preserved)'
            );
            
            if (shouldCleanup) {
                const optimizedTemplates = templates.filter(t => !oldLocalTemplates.includes(t));
                try {
                    localStorage.setItem('tierTemplates', JSON.stringify(optimizedTemplates));
                    templates.length = 0; // Clear original array
                    templates.push(...optimizedTemplates); // Update with cleaned version
                    showMessage(`Cleaned up ${oldLocalTemplates.length} old templates to make room`, 'info');
                    return true;
                } catch (error) {
                    console.error('Still not enough space after cleanup:', error);
                }
            }
        }
        
        // Strategy 2: Compress template data by removing redundant information
        const compressedTemplates = compressTemplateData(templates);
        try {
            localStorage.setItem('tierTemplates', JSON.stringify(compressedTemplates));
            showMessage('Storage optimized with data compression', 'info');
            return true;
        } catch (error) {
            console.error('Still not enough space after compression:', error);
        }
        
        // Strategy 3: Store only essential templates (public + recent local)
        const essentialTemplates = templates.filter(t => {
            if (t.isPublic || t.public) return true; // Keep all public templates
            if (!t.id.startsWith('template_')) return true; // Keep non-standard IDs
            
            // Keep recent local templates (last 7 days)
            const templateAge = Date.now() - parseInt(t.id.split('_')[1]);
            return templateAge < 7 * 24 * 60 * 60 * 1000;
        });
        
        if (essentialTemplates.length < templates.length) {
            const shouldKeepEssential = confirm(
                `Storage is critically full! Keep only essential templates?\n\n` +
                `This will keep ${essentialTemplates.length} templates (all public + recent local) ` +
                `and remove ${templates.length - essentialTemplates.length} older local templates.`
            );
            
            if (shouldKeepEssential) {
                try {
                    localStorage.setItem('tierTemplates', JSON.stringify(essentialTemplates));
                    templates.length = 0;
                    templates.push(...essentialTemplates);
                    showMessage('Kept only essential templates to free up space', 'warning');
                    return true;
                } catch (error) {
                    console.error('Even essential templates too large:', error);
                }
            }
        }
        
        // Last resort: Show manual cleanup options
        showStorageFullDialog();
        return false;
        
    } catch (error) {
        console.error('Storage optimization failed:', error);
        showMessage('Failed to save template: ' + error.message, 'error');
        return false;
    }
}

function compressTemplateData(templates) {
    // Create compressed versions of templates to save space
    return templates.map(template => {
        const compressed = { ...template };
        
        // Compress image data by removing redundant properties
        if (compressed.images) {
            compressed.images = compressed.images.map(img => ({
                src: img.src,
                name: img.name || '',
                position: img.position || 'pool'
            }));
        }
        
        // Remove unnecessary whitespace from descriptions
        if (compressed.description) {
            compressed.description = compressed.description.trim();
        }
        
        // Compress tier data
        if (compressed.tiers) {
            compressed.tiers = compressed.tiers.map(tier => ({
                label: tier.label,
                color: tier.color,
                items: tier.items.map(item => ({
                    src: item.src,
                    name: item.name || ''
                }))
            }));
        }
        
        return compressed;
    });
}

function showStorageFullDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
        align-items: center; justify-content: center; padding: 20px;
    `;
    
    dialog.innerHTML = `
        <div style="background: #2a2a2a; padding: 30px; border-radius: 12px; max-width: 500px; color: white;">
            <h3 style="margin-top: 0; color: #ff6b6b;">🚨 Storage Full</h3>
            <p>Your browser's storage is completely full and cannot save more templates.</p>
            <p><strong>Options to free up space:</strong></p>
            <ul style="text-align: left; margin: 15px 0;">
                <li>Go to <strong>Manage Templates</strong> and delete old templates</li>
                <li>Export your templates as backup, then delete local copies</li>
                <li>Use browser tools to clear site data (Settings → Storage)</li>
            </ul>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.location.href='manage-templates.html'" 
                        style="background: #38bdf8; border: none; padding: 10px 20px; border-radius: 8px; color: white; margin-right: 10px; cursor: pointer;">
                    Manage Templates
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        style="background: #666; border: none; padding: 10px 20px; border-radius: 8px; color: white; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.remove();
    });
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
            <div class="tier-items"></div>
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
            
            // Use setupDragEvents for consistency
            setupDragEvents(imgElement);
            
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
    
    // Apply current size classes to all recreated elements
    const allTierItems = container.querySelectorAll('.tier-item');
    const allTierLabels = container.querySelectorAll('.tier-label');
    const allTierRows = container.querySelectorAll('.tier-row');
    const allTierItemsContainers = container.querySelectorAll('.tier-items');
    applySizeClasses(allTierItems, allTierLabels, allTierRows, allTierItemsContainers);
    
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
            
            // Use setupDragEvents for consistency
            setupDragEvents(imgElement);
            
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
    
    // Apply current size classes to all loaded pool images
    const poolTierItems = imagePool.querySelectorAll('.tier-item');
    applySizeClasses(poolTierItems, []);
}

// Add event listeners for drag over effects
document.addEventListener('dragover', function(e) {
    const isDropTarget = e.target.classList.contains('tier-items') || 
                        e.target.classList.contains('image-pool-container') ||
                        e.target.classList.contains('pinned-pool-container') ||
                        e.target.classList.contains('pinned-pool-row');
    
    if (isDropTarget) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    }
});

document.addEventListener('dragleave', function(e) {
    const isDropTarget = e.target.classList.contains('tier-items') || 
                        e.target.classList.contains('image-pool-container') ||
                        e.target.classList.contains('pinned-pool-container') ||
                        e.target.classList.contains('pinned-pool-row');
    
    if (isDropTarget) {
        e.target.classList.remove('drag-over');
    }
});

document.addEventListener('drop', function(e) {
    const isDropTarget = e.target.classList.contains('tier-items') || 
                        e.target.classList.contains('image-pool-container') ||
                        e.target.classList.contains('pinned-pool-container') ||
                        e.target.classList.contains('pinned-pool-row');
    
    if (isDropTarget) {
        e.preventDefault();
        e.stopPropagation();
        
        // Create a modified event object where currentTarget is the actual drop target
        const modifiedEvent = {
            ...e,
            currentTarget: e.target,
            target: e.target,
            preventDefault: () => e.preventDefault(),
            clientX: e.clientX,
            clientY: e.clientY
        };
        
        // Call the main drop function with modified event
        drop(modifiedEvent);
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
    // Deduplicate by image src to avoid duplicates in pinned pool
    const seen = new Set();
    const images = [];
    Array.from(poolContainer.querySelectorAll('.tier-item img')).forEach(img => {
        if (!seen.has(img.src)) {
            seen.add(img.src);
            images.push(img);
        }
    });
    
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
    
    // Apply current size classes to pinned pool rows and characters
    const selectedRadio = document.querySelector('input[name="imageSize"]:checked');
    const currentSize = selectedRadio ? selectedRadio.value : 'medium';
    const sizeClass = `size-${currentSize}`;
    
    pinnedRows.forEach(row => {
        row.classList.remove('size-small', 'size-medium', 'size-large');
        row.classList.add(sizeClass);
    });
    
    // Apply size classes to all pinned characters
    const allPinnedCharacters = document.querySelectorAll('.pinned-character');
    allPinnedCharacters.forEach(character => {
        character.classList.remove('size-small', 'size-medium', 'size-large');
        character.classList.add(sizeClass);
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
    
    // Apply current size class to the pinned character
    const selectedRadio = document.querySelector('input[name="imageSize"]:checked');
    const currentSize = selectedRadio ? selectedRadio.value : 'medium';
    const sizeClass = `size-${currentSize}`;
    pinnedChar.classList.add(sizeClass);
    
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
    
    // Add touch support for mobile devices
    setupTouchEvents(pinnedChar);
    
    return pinnedChar;
}

// Setup drag events for tier items
function setupDragEvents(element) {
    element.addEventListener('dragstart', function(e) {
        draggedElement = element;
        console.log('Setup drag events - Drag started:', draggedElement);
        e.dataTransfer.effectAllowed = 'move';
        element.style.opacity = '0.5';
        element.classList.add('dragging');
    });
    
    element.addEventListener('dragend', function(e) {
        console.log('Setup drag events - Drag ended:', draggedElement);
        element.style.opacity = '1';
        element.classList.remove('dragging');
        draggedElement = null;
    });
    
    // Add touch support for mobile devices
    setupTouchEvents(element);
}

// Touch events for mobile drag-and-drop
function setupTouchEvents(element) {
    element.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) return; // Only handle single touch
        
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        
        // Calculate offset from element center
        const rect = element.getBoundingClientRect();
        touchOffset = {
            x: touch.clientX - rect.left - rect.width / 2,
            y: touch.clientY - rect.top - rect.height / 2
        };
        
        e.preventDefault(); // Prevent scrolling
    }, { passive: false });
    
    element.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) return;
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);
        
        // Start dragging if moved more than 10px
        if (!isDragging && (deltaX > 10 || deltaY > 10)) {
            isDragging = true;
            draggedElement = element;
            
            // Create drag preview
            createTouchDragPreview(element, touch);
            
            // Style original element
            element.style.opacity = '0.5';
            element.classList.add('dragging');
            
            console.log('Touch drag started:', draggedElement);
        }
        
        if (isDragging && dragPreview) {
            // Update preview position
            dragPreview.style.left = (touch.clientX - touchOffset.x) + 'px';
            dragPreview.style.top = (touch.clientY - touchOffset.y) + 'px';
            
            // Add drag-over effect to drop targets
            updateTouchDropTarget(touch.clientX, touch.clientY);
        }
        
        e.preventDefault();
    }, { passive: false });
    
    element.addEventListener('touchend', function(e) {
        if (!isDragging) return;
        
        // Prevent default to stop synthetic mouse/click/drop events from firing
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.changedTouches[0];
        const dropTarget = findDropTargetAtPosition(touch.clientX, touch.clientY);
        
        if (dropTarget && draggedElement) {
            // Create a mock drop event
            const mockDropEvent = {
                currentTarget: dropTarget,
                target: dropTarget,
                preventDefault: () => {},
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            
            console.log('Touch drop on:', dropTarget);
            drop(mockDropEvent);
        }
        
        // Cleanup
        cleanupTouchDrag();
    }, { passive: false });
    
    element.addEventListener('touchcancel', function(e) {
        cleanupTouchDrag();
        e.preventDefault();
    });
}

function createTouchDragPreview(element, touch) {
    dragPreview = element.cloneNode(true);
    dragPreview.style.position = 'fixed';
    dragPreview.style.pointerEvents = 'none';
    dragPreview.style.zIndex = '9999';
    dragPreview.style.opacity = '0.8';
    dragPreview.style.transform = 'scale(1.1)';
    dragPreview.style.left = (touch.clientX - touchOffset.x) + 'px';
    dragPreview.style.top = (touch.clientY - touchOffset.y) + 'px';
    dragPreview.classList.add('touch-drag-preview');
    
    document.body.appendChild(dragPreview);
}

function updateTouchDropTarget(x, y) {
    // Remove existing drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
    });
    
    const dropTarget = findDropTargetAtPosition(x, y);
    if (dropTarget) {
        dropTarget.classList.add('drag-over');
    }
}

function findDropTargetAtPosition(x, y) {
    // Hide the drag preview temporarily to get element underneath
    if (dragPreview) {
        dragPreview.style.display = 'none';
    }
    
    const elementAtPosition = document.elementFromPoint(x, y);
    
    if (dragPreview) {
        dragPreview.style.display = 'block';
    }
    
    if (!elementAtPosition) return null;
    
    // Find the actual drop target (tier-items, image-pool-container, etc.)
    let dropTarget = elementAtPosition.closest('.tier-items, .image-pool-container, .pinned-pool-container, .pinned-pool-row');
    
    return dropTarget;
}

function cleanupTouchDrag() {
    isDragging = false;
    
    if (dragPreview) {
        dragPreview.remove();
        dragPreview = null;
    }
    
    if (draggedElement) {
        draggedElement.style.opacity = '1';
        draggedElement.classList.remove('dragging');
        draggedElement = null;
    }
    
    // Remove all drag-over classes
    document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
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

// Export tier list as image - Using dom-to-image-more for accurate rendering
async function exportTierListAsImage() {
    const exportBtn = document.querySelector('.export-image-btn');
    
    if (!exportBtn) {
        console.error('Export button not found');
        return;
    }
    
    // Show loading state
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '⏳ Capturing...';
    exportBtn.disabled = true;
    
    try {
        // Get the tier list container to capture
        const tierListContainer = document.querySelector('.tier-list-container');
        
        if (!tierListContainer) {
            throw new Error('Tier list container not found');
        }

        // Get template name for filename
        const templateNameInput = document.getElementById('template-name');
        const templateName = templateNameInput ? templateNameInput.value.trim() : 'tier-list';
        const sanitizedFileName = (templateName || 'tier-list').replace(/[^a-zA-Z0-9\-_]/g, '_');

        // Hide UI elements temporarily
        const controlsToHide = tierListContainer.querySelectorAll('.tier-controls, .tier-drag-handle');
        controlsToHide.forEach(el => el.style.display = 'none');

        // Get actual dimensions of the tier list
        const width = tierListContainer.offsetWidth;
        const height = tierListContainer.offsetHeight;
        
        // Use dom-to-image-more for high-quality rendering
        const dataUrl = await domtoimage.toPng(tierListContainer, {
            quality: 1.0,
            bgcolor: '#3a3a3a',
            width: width,
            height: height,
            style: {
                'transform': 'scale(1)',
                'transform-origin': 'top left'
            }
        });

        // Restore hidden elements
        controlsToHide.forEach(el => el.style.display = '');

        // Download the image
        const link = document.createElement('a');
        link.download = `${sanitizedFileName}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showMessage('✅ Tier list image downloaded!', 'success');
        
    } catch (error) {
        console.error('Error exporting tier list:', error);
        showMessage('❌ Error capturing tier list. Please try again.', 'error');
        
        // Restore hidden elements in case of error
        const controlsToHide = document.querySelectorAll('.tier-controls, .tier-drag-handle');
        controlsToHide.forEach(el => el.style.display = '');
    } finally {
        // Restore button state
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}

// Helper function to show temporary messages
function showTempMessage(message, type = 'info') {
    // Remove any existing temp messages
    const existingMessage = document.querySelector('.temp-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `temp-message temp-message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-weight: 600;
        transition: all 0.3s ease;
        transform: translateX(100%);
    `;
    
    document.body.appendChild(messageDiv);
    
    // Animate in
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 3000);
}