// Day 48 Task 12: the app must not depend on localhost in production.
//
// Dev: VITE_API_BASE_URL is unset -> API_BASE is '' -> fetch('/api/...')
//      stays relative and goes through the Vite proxy (vite.config.js),
//      which forwards to http://localhost:5000. Nothing changes locally.
//
// Prod (after `npm run build`): set VITE_API_BASE_URL to the deployed
//      backend's URL (e.g. https://your-backend.onrender.com) in a
//      .env.production file or your hosting platform's env settings.
//      There is no dev proxy in a static production build, so requests
//      need the full URL.
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
