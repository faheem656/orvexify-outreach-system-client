// API base - SMART auto-detect:
// - Build time: VITE_API_URL env override (agar chahiye)
// - Local dev (vite @ localhost:5173) → backend http://localhost:4000
// - Deployed (server.orvexify.com static UI ya Hostinger Node app dono pe)
//   → API hamesha Hostinger Node app par: https://saddlebrown-ape-891436.hostingersite.com
//   (Agar UI bhi Node app par serve ho to same host hai — dono haal me chalega.)
const PROD_API = 'https://saddlebrown-ape-891436.hostingersite.com';

function detectApiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  const h = (typeof window !== 'undefined' && window.location.hostname) || '';
  const isLocal = h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  return isLocal ? 'http://localhost:4000' : PROD_API;
}

export const API_BASE = "https://saddlebrown-ape-891436.hostingersite.com";

// Helper to build API URL
export const apiUrl = (path) => {
  // path should start with /api or /t or /unsubscribe
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};
