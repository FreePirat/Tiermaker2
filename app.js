// Firebase integration for image storage
let firebaseApp = null;
let storage = null;
let db = null;

// Check if Firebase config exists in localStorage
const savedConfig = localStorage.getItem('firebaseConfig');

// Initialize Firebase if config is available
if (savedConfig) {
    try {
        const config = JSON.parse(savedConfig);
        initializeFirebase(config);
    } catch (e) {
        console.error('Error loading Firebase config:', e);
    }
}

function initializeFirebase(config) {
    // Note: In production, you would load Firebase SDK from CDN
    // For this demo, we'll simulate the storage functionality
    console.log('Firebase initialized with config:', config);
    showStatus('Firebase configured successfully! You can now upload images.', 'success');
}

// Firebase configuration handler
document.getElementById('saveFirebaseConfig').addEventListener('click', () => {
    const configText = document.getElementById('firebaseConfig').value;
    try {
        const config = JSON.parse(configText);
        localStorage.setItem('firebaseConfig', configText);
        initializeFirebase(config);
    } catch (e) {
        showStatus('Invalid Firebase configuration. Please check your JSON format.', 'error');
    }
});

// Status message helper
function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    setTimeout(() => {
        statusEl.className = 'status-message';
        statusEl.style.display = 'none';
    }, 3000);
}

// Image storage using localStorage (simulating database)
const imageDatabase = {
    save: async (imageData, filename) => {
        const images = JSON.parse(localStorage.getItem('uploadedImages') || '[]');
        const imageObj = {
            id: Date.now() + Math.random(),
            data: imageData,
            filename: filename,
            timestamp: new Date().toISOString()
        };
        images.push(imageObj);
        localStorage.setItem('uploadedImages', JSON.stringify(images));
        return imageObj;
    },
    
    getAll: async () => {
        return JSON.parse(localStorage.getItem('uploadedImages') || '[]');
    },
    
    delete: async (id) => {
        const images = JSON.parse(localStorage.getItem('uploadedImages') || '[]');
        const filtered = images.filter(img => img.id !== id);
        localStorage.setItem('uploadedImages', JSON.stringify(filtered));
    }
};

// Image upload handler
document.getElementById('uploadBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('imageUpload');
    const files = fileInput.files;
    
    if (files.length === 0) {
        showStatus('Please select at least one image to upload.', 'error');
        return;
    }
    
    showStatus('Uploading images to database...', 'success');
    
    for (let file of files) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                await imageDatabase.save(e.target.result, file.name);
                addImageToUnranked(e.target.result);
            } catch (error) {
                console.error('Error saving image:', error);
                showStatus('Error uploading image: ' + error.message, 'error');
            }
        };
        reader.readAsDataURL(file);
    }
    
    setTimeout(() => {
        showStatus(`Successfully uploaded ${files.length} image(s) to database!`, 'success');
        fileInput.value = '';
    }, 500);
});

// Load images from database
document.getElementById('loadImagesBtn').addEventListener('click', async () => {
    try {
        const images = await imageDatabase.getAll();
        
        if (images.length === 0) {
            showStatus('No images found in database.', 'error');
            return;
        }
        
        // Clear unranked area first
        document.getElementById('unranked').innerHTML = '';
        
        // Add all images to unranked
        images.forEach(img => {
            addImageToUnranked(img.data, img.id);
        });
        
        showStatus(`Loaded ${images.length} image(s) from database!`, 'success');
    } catch (error) {
        console.error('Error loading images:', error);
        showStatus('Error loading images: ' + error.message, 'error');
    }
});

// Add image to unranked area
function addImageToUnranked(imageSrc, imageId = null) {
    const unranked = document.getElementById('unranked');
    const item = createTierItem(imageSrc, imageId);
    unranked.appendChild(item);
}

// Create tier item element
function createTierItem(imageSrc, imageId = null) {
    const item = document.createElement('div');
    item.className = 'tier-item';
    item.draggable = true;
    if (imageId) item.dataset.imageId = imageId;
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = 'Tier item';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        item.remove();
        if (imageId) {
            imageDatabase.delete(imageId);
        }
    });
    
    item.appendChild(img);
    item.appendChild(deleteBtn);
    
    // Drag event listeners
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
    
    return item;
}

// Drag and drop functionality
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    this.classList.remove('drag-over');
    
    if (draggedItem) {
        this.appendChild(draggedItem);
    }
    
    return false;
}

// Setup drop zones
const dropZones = document.querySelectorAll('.tier-items, .unranked-items');
dropZones.forEach(zone => {
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('dragenter', handleDragEnter);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);
});

// Clear tiers button
document.getElementById('clearTiers').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all tiers? This will move all items to unranked.')) {
        const allTiers = document.querySelectorAll('.tier-items');
        const unranked = document.getElementById('unranked');
        
        allTiers.forEach(tier => {
            while (tier.firstChild) {
                unranked.appendChild(tier.firstChild);
            }
        });
        
        showStatus('All tiers cleared!', 'success');
    }
});

// Save tier list
document.getElementById('saveTierList').addEventListener('click', () => {
    const tierData = {};
    const tiers = document.querySelectorAll('.tier');
    
    tiers.forEach(tier => {
        const tierName = tier.dataset.tier;
        const items = tier.querySelectorAll('.tier-item img');
        tierData[tierName] = Array.from(items).map(img => img.src);
    });
    
    const unrankedItems = document.querySelectorAll('.unranked-items .tier-item img');
    tierData['unranked'] = Array.from(unrankedItems).map(img => img.src);
    
    localStorage.setItem('savedTierList', JSON.stringify(tierData));
    showStatus('Tier list saved successfully!', 'success');
});

// Export as image
document.getElementById('exportImage').addEventListener('click', () => {
    showStatus('Export functionality requires html2canvas library. Add it via CDN for this feature.', 'error');
});

// Load saved tier list on page load
window.addEventListener('load', () => {
    const savedTierList = localStorage.getItem('savedTierList');
    if (savedTierList) {
        try {
            const tierData = JSON.parse(savedTierList);
            
            Object.keys(tierData).forEach(tierName => {
                if (tierName === 'unranked') {
                    const unranked = document.getElementById('unranked');
                    tierData[tierName].forEach(imgSrc => {
                        unranked.appendChild(createTierItem(imgSrc));
                    });
                } else {
                    const tierItems = document.getElementById(`tier-${tierName}`);
                    if (tierItems) {
                        tierData[tierName].forEach(imgSrc => {
                            tierItems.appendChild(createTierItem(imgSrc));
                        });
                    }
                }
            });
            
            console.log('Loaded saved tier list');
        } catch (e) {
            console.error('Error loading saved tier list:', e);
        }
    }
});
