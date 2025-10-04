# GitHub Pages Setup Instructions

This repository is configured to automatically deploy to GitHub Pages.

## Enabling GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (top right)
3. Navigate to **Pages** in the left sidebar
4. Under "Source", select **GitHub Actions**
5. The site will automatically deploy when you push to the `main` branch

## Accessing Your Site

After deployment, your tier maker will be available at:
```
https://[your-username].github.io/Tiermaker2/
```

For example: `https://freepirat.github.io/Tiermaker2/`

## First Deployment

- The first deployment will happen automatically when you merge this PR
- Subsequent updates will deploy automatically on every push to `main`
- You can view deployment status in the **Actions** tab

## Troubleshooting

If the site doesn't deploy:
1. Check the **Actions** tab for any errors
2. Ensure GitHub Pages is enabled in Settings → Pages
3. Verify the workflow file exists at `.github/workflows/pages.yml`
4. Make sure GitHub Actions has proper permissions (Settings → Actions → General)

## Using the Site

Once deployed, users can:
- Upload images that are saved to their browser's localStorage
- Create tier lists by dragging images between tiers
- Save and load their tier lists
- Optionally configure Firebase for cloud-based storage

Enjoy your tier maker! 🎉
