// One explicit backend per page; API errors never fall back to localStorage.
const QNX = (() => {
  const mode = window.QNX_MODE;
  if (!['server', 'static'].includes(mode)) throw new Error('Modo de biblioteca no configurado');
  let user = null;
  const tokenKey = 'qnx_token';
  function clearSession() { user = null; localStorage.removeItem(tokenKey); localStorage.removeItem('qnx_user'); window.dispatchEvent?.(new Event('qnx-session-changed')); }
  function token() { return mode === 'server' ? localStorage.getItem(tokenKey) : null; }
  async function request(url, options = {}) {
    const headers = { ...options.headers };
    if (token()) headers.Authorization = 'Bearer ' + token();
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, { ...options, headers, cache: 'no-store' });
    let data;
    try { data = await response.json(); } catch { throw new Error('Respuesta de API invalida'); }
    if (!response.ok) {
      if (response.status === 401) clearSession();
      const error = new Error(data.error || 'Operacion rechazada'); error.status = response.status; throw error;
    }
    return data;
  }
  function serverOnly() { if (mode !== 'server') throw new Error('Esta operacion requiere el servidor de QNX Library'); }
  async function authenticate(endpoint, data) {
    serverOnly();
    const result = await request('/api/auth/' + endpoint, { method: 'POST', body: JSON.stringify(data) });
    localStorage.setItem(tokenKey, result.token); localStorage.removeItem('qnx_user'); user = result.usuario;
    window.dispatchEvent?.(new Event('qnx-session-changed'));
    return user;
  }
  const ready = (async () => {
    // Never accept legacy roles or fabricated static tokens as an identity.
    if (mode === 'static') { initDB(); return; }
    localStorage.removeItem('qnx_user');
    if (token()?.startsWith('static-')) clearSession();
    if (token()) {
      try { user = await request('/api/auth/me'); } catch (error) { if (error.status !== 401) throw error; }
    }
  })();
  ready.catch(() => {}); // Page initializers display errors and stop dependent actions.
  return {
    mode, ready, token, getUser: () => user ? { ...user } : null, logout: clearSession,
    login: data => authenticate('login', data), register: data => authenticate('register', data),
    async books(filters = {}) {
      if (mode === 'static') return getLibros(filters);
      const query = new URLSearchParams(Object.entries({ page: 1, limit: 50, ...filters }).filter(([, value]) => value !== undefined && value !== null));
      return request('/api/libros?' + query);
    },
    async book(id) { return mode === 'static' ? getLibro(id) : request('/api/libros/' + encodeURIComponent(id)); },
    async genres() { return mode === 'static' ? getGeneros() : request('/api/libros/generos'); },
    async saveBook(id, data) { serverOnly(); return request('/api/libros' + (id ? '/' + encodeURIComponent(id) : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }); },
    async deleteBook(id) { serverOnly(); return request('/api/libros/' + encodeURIComponent(id), { method: 'DELETE' }); },
    async borrow(id) { serverOnly(); return request('/api/prestamos', { method: 'POST', body: JSON.stringify({ libro_id: id }) }); },
    async loans() { serverOnly(); return request('/api/prestamos/mis'); },
    async returnLoan(id) { serverOnly(); return request('/api/prestamos/' + encodeURIComponent(id) + '/devolver', { method: 'PUT', body: '{}' }); },
    async upload(file) { serverOnly(); const data = new FormData(); data.append('portada', file); return request('/api/upload', { method: 'POST', body: data }); }
  };
})();
