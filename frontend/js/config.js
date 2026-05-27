// Frontend config: set API base URL for backend
window.API_BASE = (window.__API_BASE__ || 'http://localhost:4000');

// helper to get auth headers
window.authHeaders = function() {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
};

