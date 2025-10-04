# Tiermaker2
This is an updated version of Tiermaker, the website that's used for creating Tier Lists

## Features

- 📤 **Upload Images**: Upload multiple images to build your tier list
- 💾 **Database Storage**: Images are saved to a database for persistence
- 🎯 **Drag & Drop**: Intuitive drag-and-drop interface to organize items
- 📊 **Tier Rankings**: Classic S, A, B, C, D, F tier system
- 💿 **Save & Load**: Save your tier lists and load them later
- 📱 **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. **Upload Images**: 
   - Click the file input to select one or multiple images
   - Click "Upload to Database" to save them to the database
   - Images will appear in the "Unranked Images" section

2. **Create Your Tier List**:
   - Drag images from the unranked section to any tier (S, A, B, C, D, F)
   - Rearrange images within tiers by dragging them
   - Remove images by clicking the × button on any item

3. **Save Your Work**:
   - Click "Save Tier List" to save your current arrangement
   - Your tier list will be automatically loaded when you return
   - Click "Load My Images" to retrieve previously uploaded images

4. **Optional - Firebase Configuration**:
   - For production use with Firebase Storage, scroll to the Firebase Configuration section
   - Paste your Firebase config object and click "Save Configuration"
   - This enables cloud-based image storage instead of browser localStorage

## Technical Details

- **Frontend**: Pure HTML, CSS, and JavaScript (no frameworks required)
- **Storage**: LocalStorage API for client-side data persistence
- **Image Database**: Images are stored as base64 data URLs in localStorage
- **Drag & Drop**: Native HTML5 Drag and Drop API
- **GitHub Pages**: Hosted as a static website

## Limitations

- **Storage Size**: Browser localStorage has a ~5-10MB limit per domain
- **Client-Side Only**: Images are stored in the browser's localStorage
- **No Backend**: This is a static site without server-side processing

## Future Enhancements

- Integration with Firebase for cloud storage
- Export tier lists as images
- Share tier lists with others
- Custom tier colors and labels
- Multiple tier list templates

## Deployment

This project is configured for automatic deployment to GitHub Pages. Every push to the `main` branch will trigger a deployment.

## License

MIT License
