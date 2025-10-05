# TierMaker2 🎯

This is really just TierMaker but with additional user-friendly features that the first lacks.

## ✨ Features

- **Exact TierMaker Interface**: Pixel-perfect recreation of the original TierMaker design
- **Dark Theme**: Modern dark UI with TierMaker's signature pink accent color
- **Drag & Drop**: Full drag-and-drop functionality for creating tier lists
- **Template Management**: Create, edit, delete, and duplicate templates
- **Public Sharing**: Share your templates publicly via GitHub integration
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **GitHub Pages Ready**: Fully static site that works on GitHub Pages

## 🔧 GitHub Integration Setup

To enable public template sharing, you'll need to create a GitHub Personal Access Token:

### Step 1: Create Personal Access Token
1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name like "TierMaker2 Template Sharing"
4. Select the `public_repo` scope
5. Click "Generate token"
6. **Copy the token** 

## 🎮 How to Use

### Creating Templates
1. Click "Create a Template"
2. Upload images by clicking "📁 Upload Images"
3. Drag images into tier rows (S, A, B, C, D)
4. Edit tier labels by clicking on them
5. Enter template name and description
6. Check "Share this template publicly" to make it public
7. Click "✅ Save Template"

### Using Public Templates
1. Browse public templates on the homepage
2. Click any public template to use it
3. It loads as a copy you can modify and save

### Managing Templates
1. Click your username or go to manage templates
2. View, edit, duplicate, or delete your templates
3. Export/import templates as JSON files

## 🌐 GitHub Pages Compatibility

This application is fully compatible with GitHub Pages because:
- ✅ Pure client-side code (HTML, CSS, JavaScript)
- ✅ No server-side dependencies
- ✅ Uses localStorage for local data persistence
- ✅ Uses GitHub API for public template sharing
- ✅ Graceful error handling for storage limitations

## 🔒 Privacy & Data

- **Local Templates**: Stored in your browser's localStorage
- **Public Templates**: Stored as JSON files in your GitHub repository
- **Images**: Embedded as base64 data URLs (no external hosting needed)
- **Authentication**: Uses GitHub Personal Access Tokens (stored locally)

## 📝 License

This project is open source and available under the MIT License.

## ⭐ Acknowledgments

- Original design inspired by [TierMaker.com](https://tiermaker.com)
- Built with vanilla HTML, CSS, and JavaScript
- GitHub API integration for public template sharing
- A lot of vibe-coding using Co-Pilot
This is an update version of Tiermaker, the website that's used for creating Tier Lists
