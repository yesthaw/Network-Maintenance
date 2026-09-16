// ==================== LOGIN PAGE ====================
// File ini berisi tampilan & logika halaman login
// Edit file ini untuk mengubah logo, warna, layout login

const LoginPage = {

    // ==================== KONFIGURASI ====================
    // Edit bagian ini untuk mengubah tampilan login
    config: {
        // Logo: 'api.php?ep=logo' mengambil logo yang diunggah lewat menu
        // Kelola User. Kalau belum ada logo -> otomatis pakai ikon di bawah.
        logo: 'api.php?ep=logo',
        logoFallback: 'fas fa-network-wired',  // Icon jika gambar tidak ada
        
        // Judul & subtitle
        title: 'IT Pancaran Kasih',
        subtitle: 'Network Maintenance System',
        
        // Footer
        footer: '&copy; IT Pancaran Kasih 2026',
        
        // Warna gradient background
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        
        // Warna gradient logo box
        logoGradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
        
        // Warna tombol login
        btnGradient: 'linear-gradient(135deg, #6366f1, #a855f7)',
        
        // Placeholder input
        usernamePlaceholder: 'Masukkan username',
        passwordPlaceholder: 'Masukkan password',
        
        // Teks tombol
        btnText: 'Masuk',
        btnIcon: 'fas fa-sign-in-alt'
    },

    // ==================== HTML TEMPLATE ====================
    getHTML: function() {
        const c = this.config;
        return `
        <div id="loginPage" class="login-wrapper" style="background:${c.bgGradient}">
            <div class="login-container">
                <div class="login-logo">
                    <img src="${c.logo}" alt="Logo" class="login-logo-img" 
                         onload="if(this.naturalWidth<=1){this.style.display='none';this.nextElementSibling.style.display='flex'}else{this.style.display='block';this.nextElementSibling.style.display='none'}"
                         onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                    <div class="logo-icon" style="display:none;background:${c.logoGradient}">
                        <i class="${c.logoFallback}"></i>
                    </div>
                    <h1>${c.title}</h1>
                    <p>${c.subtitle}</p>
                </div>
                
                <div class="login-error" id="loginError">
                    <i class="fas fa-exclamation-circle"></i>
                    <span id="loginErrorMsg">Username atau password salah!</span>
                </div>
                
                <form class="login-form" onsubmit="LoginPage.handleLogin(event)">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="loginUsername" placeholder="${c.usernamePlaceholder}" 
                               required autocomplete="off" style="padding:12px 14px">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="loginPassword" placeholder="${c.passwordPlaceholder}" 
                               required style="padding:12px 14px">
                    </div>
                    <button type="submit" class="login-btn" id="loginBtn" style="background:${c.btnGradient}">
                        <i class="${c.btnIcon}"></i> ${c.btnText}
                    </button>
                </form>
                
                <div class="login-footer">
                    <p>${c.footer}</p>
                </div>
            </div>
        </div>`;
    },

    // ==================== RENDER ====================
    render: function() {
        // Inject HTML ke body (sebelum app wrapper)
        const appPage = document.getElementById('appPage');
        if (appPage) {
            appPage.insertAdjacentHTML('beforebegin', this.getHTML());
        }
    },

    // ==================== LOGIN HANDLER ====================
    handleLogin: async function(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            document.getElementById('loginError').classList.add('show');
            document.getElementById('loginErrorMsg').textContent = 'Username dan password wajib diisi!';
            return;
        }

        const btn = document.getElementById('loginBtn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        
        try {
            const result = await _AUTH.login(username, password);
            
            if (result.success) {
                currentUser = result.user;
                document.getElementById('loginError').classList.remove('show');
                // Ambil data setelah login (butuh cookie sesi dari server)
                if (typeof loadData === 'function') await loadData();
                showApp();
                showToast('Selamat datang, ' + currentUser.fullname + '!', 'success');
            } else {
                document.getElementById('loginError').classList.add('show');
                document.getElementById('loginErrorMsg').textContent = result.error || 'Username atau password salah!';
                document.getElementById('loginPassword').value = '';
            }
        } catch(e) {
            document.getElementById('loginError').classList.add('show');
            document.getElementById('loginErrorMsg').textContent = 'Gagal terhubung ke server!';
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
    },

    // ==================== HELPERS ====================
    togglePassword: function() {
        const inp = document.getElementById('loginPassword');
        const icon = document.getElementById('passToggleIcon');
        if (inp.type === 'password') {
            inp.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            inp.type = 'password';
            icon.className = 'fas fa-eye';
        }
    },

    hide: function() {
        const el = document.getElementById('loginPage');
        if (el) el.classList.add('hidden');
    },

    show: function() {
        const el = document.getElementById('loginPage');
        if (el) el.classList.remove('hidden');
    }
};
