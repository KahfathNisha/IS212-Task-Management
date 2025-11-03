// Centralized API base helper
// Use VITE_API_BASE at build time if provided, otherwise default to same-origin /api
const raw = import.meta.env.VITE_API_BASE || '';
const trimmed = raw.replace(/\/$/, '');
export const API_BASE = trimmed; // e.g. https://api.example.com (no trailing slash)
export const API_ROOT = API_BASE ? `${API_BASE}/api` : '/api';

export function buildApiPath(path) {
  if (!path) return API_ROOT;
  if (path.startsWith('/')) return `${API_ROOT}${path}`;
  return `${API_ROOT}/${path}`;
}

export default {
  API_BASE,
  API_ROOT,
  buildApiPath
}
