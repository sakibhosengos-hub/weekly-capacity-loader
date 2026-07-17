<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Weekly Capacity Loader

This app now runs as a static Vite site with no Firebase or server dependency. It supports local Excel/CSV import, in-browser planning, and Excel export.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`

## Build for GitHub Pages

1. Build the site:
   `npm run build`
2. Deploy the generated `dist/` folder to GitHub Pages.

This repository already includes a GitHub Actions workflow that publishes the site from the `main` branch. If you rename the repository, update the Vite base path in [vite.config.ts](vite.config.ts).
