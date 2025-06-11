# Der Wortschatz – German Vocabulary Flashcards

A modern, mobile-friendly, offline-capable React + TypeScript app for learning German vocabulary using flashcards.

## Features
- **Upload** `.txt` files with German-English word pairs (one per line, e.g. `Haus - house`)
- **Flashcard mode**: Randomized cards, reveal English, mark as known or for review
- **Review mode**: See a list of words you marked for review
- **Article mode**: Practice German articles (der/die/das/etc.)
- **Progress bars**: Track seen and known words
- **Theme support**: Nord color themes, light/dark
- **Mobile-friendly**: Responsive UI, swipe gestures
- **PWA**: Installable, works offline, sync vocab files between devices
- **Deployable to GitHub Pages**

## Usage
1. **Upload vocabulary**: Click or drag `.txt` files into the app (format: `German - English` per line)
2. **Practice**: Use the flashcards, mark words as known or for review
3. **Review**: Click the Review button to see your review list
4. **Sync**: Download/upload vocab files to move between devices

## Development
- `npm install` – install dependencies
- `npm run dev` – start local dev server
- `npm run build` – build for production
- `npm run deploy` – deploy to GitHub Pages (see below)

## Deploying to GitHub Pages
- The app is configured for deployment to [https://PaulthiV.github.io/German_vocab](https://PaulthiV.github.io/German_vocab)
- Make sure your repo is public and named `German_vocab`
- Run `npm run deploy` to publish

## Project Structure
- `src/` – React app source code
- `public/` – PWA assets, service worker, manifest
- `vite.config.ts` – Vite config (with correct `base` for GitHub Pages)

## License
MIT
