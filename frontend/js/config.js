// Frontend config: set API base URL for backend
window.API_BASE = (window.__API_BASE__ || 'http://localhost:4000');

// helper to get auth headers
window.authHeaders = function() {
  const token = localStorage.getItem('accessToken');
  return token ? { 'Authorization': 'Bearer ' + token } : {};
};

// Global fetch wrapper: automatically attach accessToken and attempt refresh on 401
(function() {
  const _fetch = window.fetch.bind(window);
  window.fetch = async function(input, init = {}) {
    init = init || {};
    init.headers = init.headers || {};

    // Attach Authorization header when missing
    try {
      const token = localStorage.getItem('accessToken');
      if (token && !init.headers['Authorization'] && !init.headers['authorization']) {
        init.headers['Authorization'] = 'Bearer ' + token;
      }
    } catch (e) {}

    let res = await _fetch(input, init);
    if (res.status !== 401) return res;

    // Try refresh token flow
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return res;
      const refreshRes = await _fetch((window.API_BASE || 'http://localhost:4000') + '/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!refreshRes.ok) { if (window.handleLogout) window.handleLogout(); return res; }
      const tokens = await refreshRes.json();
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      // retry original request with new token
      init.headers['Authorization'] = 'Bearer ' + tokens.accessToken;
      return _fetch(input, init);
    } catch (e) {
      console.warn('Refresh failed', e);
      if (window.handleLogout) window.handleLogout();
      return res;
    }
  };
})();

