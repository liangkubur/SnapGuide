// frontend/src/lib/api.js
// Lightweight API client wrapper

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Returns the JWT token stored in localStorage.
 */
function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('snapguide_token');
}

/**
 * Base fetch wrapper that attaches the JWT and handles JSON parsing.
 */
async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  // Only set Content-Type for JSON bodies (not FormData)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg);
  }

  // Export routes return binary blobs
  const contentType = res.headers.get('content-type') || '';
  if (
    contentType.includes('application/pdf') ||
    contentType.includes('application/vnd.openxmlformats') ||
    contentType.includes('text/html')
  ) {
    return res.blob();
  }

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (email, password, name) =>
    apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

  login: (email, password) =>
    apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  me: () => apiFetch('/api/auth/me'),
};

// ─── Tutorials ────────────────────────────────────────────────────────────────

export const tutorialsApi = {
  list: () => apiFetch('/api/tutorials'),

  get: (id) => apiFetch(`/api/tutorials/${id}`),

  getPublic: (token) => apiFetch(`/api/tutorials/share/${token}`),

  create: (title, description) =>
    apiFetch('/api/tutorials', { method: 'POST', body: JSON.stringify({ title, description }) }),

  update: (id, data) =>
    apiFetch(`/api/tutorials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) => apiFetch(`/api/tutorials/${id}`, { method: 'DELETE' }),

  toggleShare: (id) => apiFetch(`/api/tutorials/${id}/share`, { method: 'POST' }),
};

// ─── Steps ────────────────────────────────────────────────────────────────────

export const stepsApi = {
  list: (tutorialId) => apiFetch(`/api/steps/${tutorialId}`),

  create: (formData) =>
    apiFetch('/api/steps', { method: 'POST', body: formData }),

  update: (id, formData) =>
    apiFetch(`/api/steps/${id}`, { method: 'PUT', body: formData }),

  delete: (id) => apiFetch(`/api/steps/${id}`, { method: 'DELETE' }),

  reorder: (tutorial_id, step_ids) =>
    apiFetch('/api/steps/reorder', { method: 'POST', body: JSON.stringify({ tutorial_id, step_ids }) }),
};

// ─── Assets ───────────────────────────────────────────────────────────────────

export const assetsApi = {
  uploadBase64: (dataUrl, tutorial_id, step_id) =>
    apiFetch('/api/assets/upload-base64', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, tutorial_id, step_id }),
    }),
};

// ─── Export ───────────────────────────────────────────────────────────────────

export const exportApi = {
  download: async (tutorialId, format, filename) => {
    const blob = await apiFetch(`/api/export/${tutorialId}/${format}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export { API_URL };
