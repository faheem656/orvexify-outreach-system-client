// API base - direct to backend, no proxy needed for Windows
// If you run server on different port/host, change here
// For production preview, VITE_API_URL env can override
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Helper to build API URL
export const apiUrl = (path) => {
  // path should start with /api or /t or /unsubscribe
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};
