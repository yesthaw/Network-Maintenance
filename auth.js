// ==================== AUTH ====================
// Sesi login disimpan di SERVER (PHP session).
// - Utama: cookie httponly.
// - Fallback: header X-Session-Id (kalau cookie diblokir browser,
//   mis. web dibuka dalam iframe/preview).
// - TIDAK ADA localStorage / sessionStorage / IndexedDB sama sekali.

// Fetch global untuk SEMUA panggilan api.php.
// Otomatis menyertakan header X-Session-Id bila tersedia.
async function nmFetch(url, opts) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {});
    if (_AUTH._token && !opts.headers['X-Session-Id']) {
        opts.headers['X-Session-Id'] = _AUTH._token;
    }
    return fetch(url, opts);
}

const _AUTH = {
    _user: null,   // user hanya di memori JS (tidak disimpan di browser)
    _perms: null,
    _token: null,  // ID sesi server utk header X-Session-Id (fallback tanpa cookie)

    SESSION_DURATION: 60 * 60 * 1000, // 1 jam (dipakai juga di server)

    // Fetch wrapper: tangani error HTTP + sesi habis (401)
    _fetch: async function(url, opts) {
        opts = opts || {};
        try {
            const r = await nmFetch(url, opts);
            if (r.status === 401 && this._user) { this._sessionExpired(); return { __error: 'Sesi berakhir' }; }
            let data = null;
            try { data = await r.json(); } catch (e) {}
            if (!r.ok) {
                return { __error: (data && data.error) ? data.error
                    : ('HTTP ' + r.status + ' — cek server: api.php?ep=diagnosa&html=1') };
            }
            return data;
        } catch (e) {
            return { __error: 'Tidak dapat terhubung ke server' };
        }
    },

    _sessionExpired: function() {
        this._user = null;
        this._perms = null;
        this._token = null;
        if (typeof handleSessionExpired === 'function') handleSessionExpired();
    },

    // Dipanggil saat halaman dibuka: pulihkan sesi dari cookie server
    checkSession: async function() {
        const res = await this._fetch('api.php?ep=session');
        this._user = (res && res.user) ? res.user : null;
        if (this._user) await this.loadPerms();
        return this._user;
    },

    login: async function(username, password) {
        const res = await this._fetch('api.php?ep=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password })
        });
        if (!res || res.__error) {
            return { success: false, error: (res && res.__error) || 'Gagal login' };
        }
        this._user = res.user || null;
        this._token = res.token || this._token;
        await this.loadPerms();
        return { success: true, user: this._user };
    },

    logout: async function() {
        try { await this._fetch('api.php?ep=logout', { method: 'POST' }); } catch (e) {}
        this._user = null;
        this._perms = null;
        this._token = null;
    },

    // Permission diambil dari server sesuai role user yang login
    loadPerms: async function() {
        const u = this.currentUser();
        if (!u) { this._perms = null; return {}; }
        const res = await this._fetch('api.php?ep=perms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: u.role })
        });
        if (res && res.menu) { this._perms = res; return res; }
        // Cadangan jika server tidak merespons
        this._perms = (u.role === 'admin')
            ? { menu: ['dashboard', 'data', 'tambah', 'foto', 'users'], actions: ['view', 'add', 'edit', 'delete', 'export'] }
            : { menu: ['dashboard', 'data', 'tambah', 'foto'], actions: ['view', 'add', 'export'] };
        return this._perms;
    },

    getPerms: function() { return this._perms || {}; },

    currentUser: function() { return this._user; },

    can: function(action) {
        const u = this.currentUser();
        if (!u) return false;
        return (this.getPerms().actions || []).includes(action);
    },

    canAccess: function(menu) {
        const u = this.currentUser();
        if (!u) return false;
        return (this.getPerms().menu || []).includes(menu);
    },

    isAdmin: function() {
        const u = this.currentUser();
        return !!(u && u.role === 'admin');
    },

    getRoleName: function() {
        const u = this.currentUser();
        if (!u) return '';
        return u.role === 'admin' ? 'Administrator' : 'Teknisi';
    },

    getRoleBadgeClass: function() {
        const u = this.currentUser();
        if (!u) return '';
        return u.role === 'admin' ? 'role-admin-badge' : 'role-user-badge';
    }
};
