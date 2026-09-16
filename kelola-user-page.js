// ==================== KELOLA USER PAGE ====================
// File ini berisi tampilan & logika halaman Kelola User
// Edit file ini untuk mengubah tabel user, form, dll

const KelolaUserPage = {

    // ==================== HTML TEMPLATE ====================
    getHTML: function() {
        const admin = isAdmin();
        const passCol = admin ? '<th>Password</th>' : '';
        return `
            <!-- LOGO APLIKASI (khusus admin) -->
            ${admin ? `
            <div class="table-section" style="margin-bottom:18px">
                <div class="table-header">
                    <h3><i class="fas fa-image" style="color:var(--primary);margin-right:8px"></i>Logo Aplikasi</h3>
                </div>
                <div style="display:flex;align-items:center;gap:18px;padding:18px;flex-wrap:wrap">
                    <div style="width:80px;height:80px;flex-shrink:0;border-radius:14px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;overflow:hidden">
                        <img id="logoPreview" src="api.php?ep=logo" alt="Logo" style="width:100%;height:100%;object-fit:contain"
                             onload="if(this.naturalWidth<=1){this.style.display='none';this.nextElementSibling.style.display='block'}else{this.style.display='block';this.nextElementSibling.style.display='none'}"
                             onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                        <i class="fas fa-image" style="display:none;color:var(--text-secondary);font-size:1.4rem"></i>
                    </div>
                    <div style="flex:1;min-width:230px">
                        <p style="font-size:.82rem;margin-bottom:4px"><b>Logo dipakai di:</b> halaman login, sidebar, dan ikon tab browser</p>
                        <p style="font-size:.75rem;color:var(--text-secondary);margin-bottom:12px">Disarankan PNG dengan latar transparan. Gambar otomatis dikecilkan ke 512&times;512 px. Tanpa logo, aplikasi memakai ikon bawaan.</p>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                            <input type="file" id="logoFile" accept="image/*" style="display:none" onchange="KelolaUserPage.pilihLogo(event)">
                            <button class="btn btn-primary" onclick="document.getElementById('logoFile').click()"><i class="fas fa-upload"></i> Pilih &amp; Unggah Logo</button>
                            <button class="btn btn-danger" onclick="KelolaUserPage.hapusLogo()"><i class="fas fa-trash"></i> Hapus Logo</button>
                        </div>
                    </div>
                </div>
            </div>` : ''}
            <!-- KELOLA USER -->
            <div class="table-section">
                <div class="table-header">
                    <h3><i class="fas fa-users-cog" style="color:var(--primary);margin-right:8px"></i>Kelola User</h3>
                    <button class="btn btn-primary" onclick="KelolaUserPage.openAddModal()">
                        <i class="fas fa-user-plus"></i> Tambah User
                    </button>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Username</th>
                                <th>Nama</th>
                                <th>No. Telepon</th>
                                <th>Email</th>
                                ${passCol}
                                <th>Role</th>
                                <th>Dibuat</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody"></tbody>
                    </table>
                </div>
            </div>`;
    },

    // ==================== MODAL HTML ====================
    getModalHTML: function() {
        return `
        <div class="modal-overlay" id="userModal">
            <div class="modal modal-sm">
                <div class="modal-header">
                    <h3 id="userModalTitle">Tambah User</h3>
                    <button class="modal-close" onclick="closeModal('userModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="userForm" onsubmit="KelolaUserPage.save(event)">
                        <input type="hidden" id="userEditId">
                        <div class="form-group">
                            <label>Username</label>
                            <input type="text" id="userUsername" required>
                        </div>
                        <div class="form-group">
                            <label>Nama Lengkap</label>
                            <input type="text" id="userFullname" required>
                        </div>
                        <div class="form-group">
                            <label>No. Telepon</label>
                            <input type="tel" id="userPhone" placeholder="08xxxxxxxxxx">
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="userEmail" placeholder="nama@email.com">
                        </div>
                        <div class="form-group">
                            <label>Password <small id="passNote"></small></label>
                            <input type="password" id="userPassword">
                        </div>
                        <div class="form-group">
                            <label>Role</label>
                            <select id="userRole" required>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('userModal')">Batal</button>
                    <button class="btn btn-primary" onclick="document.getElementById('userForm').requestSubmit()">
                        <i class="fas fa-save"></i> Simpan
                    </button>
                </div>
            </div>
        </div>`;
    },

    // ==================== RENDER ====================
    renderPage: function() {
        const container = document.getElementById('page-users');
        if (container) {
            container.innerHTML = this.getHTML();
        }
    },

    renderModal: function() {
        // Inject modal jika belum ada
        if (!document.getElementById('userModal')) {
            document.body.insertAdjacentHTML('beforeend', this.getModalHTML());
        }
    },

    // ==================== RENDER TABEL ====================
    renderTable: function() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        const admin = isAdmin();

        // Data kosong -> tampilkan pesan jelas (bukan tabel kosong diam-diam)
        if (!usersData.length) {
            tbody.innerHTML = `<tr><td colspan="${admin ? 9 : 8}" style="text-align:center;padding:26px;color:var(--text-secondary)">
                Tidak ada data user yang tampil.<br>
                <small>Jika seharusnya ada: muat ulang halaman (Ctrl+F5), lalu login ulang.</small>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = usersData.map((u, i) => {
            // Password kini tersimpan terenkripsi (bcrypt) dan tidak pernah
            // dikirim ke browser — kolom ini hanya penanda, tidak bisa dibuka.
            const passCell = admin ? `
                <td>
                    <span style="font-family:monospace;font-size:.78rem;color:var(--text-secondary)">(terenkripsi)</span>
                </td>` : '';

            return `
            <tr>
                <td><strong>${i + 1}</strong></td>
                <td>${u.username}</td>
                <td>${u.fullname}</td>
                <td style="font-size:.76rem">${u.phone || '-'}</td>
                <td style="font-size:.76rem">${u.email || '-'}</td>
                ${passCell}
                <td><span class="role-tag ${u.role}">${u.role === 'admin' ? 'Admin' : 'User'}</span></td>
                <td style="font-size:.76rem;color:var(--text-secondary)">${u.createdAt || '-'}</td>
                <td>
                    <div style="display:flex;gap:4px">
                        <button class="btn btn-primary btn-sm btn-icon" onclick="KelolaUserPage.edit(${u.id})">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="btn btn-danger btn-sm btn-icon" onclick="confirmDelete('user',${u.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    },

    // ==================== MODAL ACTIONS ====================
    openAddModal: function() {
        document.getElementById('userModalTitle').innerHTML = 'Tambah User';
        document.getElementById('userEditId').value = '';
        document.getElementById('userForm').reset();
        document.getElementById('passNote').textContent = '';
        document.getElementById('userPassword').required = true;
        openModal('userModal');
    },

    edit: function(id) {
        const u = usersData.find(x => x.id === id);
        if (!u) return;
        document.getElementById('userModalTitle').innerHTML = 'Edit User';
        document.getElementById('userEditId').value = id;
        document.getElementById('userUsername').value = u.username;
        document.getElementById('userFullname').value = u.fullname;
        document.getElementById('userPhone').value = u.phone || '';
        document.getElementById('userEmail').value = u.email || '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userPassword').required = false;
        document.getElementById('passNote').textContent = '(kosongkan jika tidak diubah)';
        document.getElementById('userRole').value = u.role;
        openModal('userModal');
    },

    // ==================== LOGO APLIKASI ====================
    // Segarkan semua tempat logo tampil (preview, sidebar, halaman login)
    // tanpa perlu memuat ulang halaman.
    refreshLogo: function() {
        const t = Date.now();
        const src = 'api.php?ep=logo&t=' + t;
        const preview = document.getElementById('logoPreview');
        if (preview) { preview.style.display = ''; preview.src = src; }
        const side = document.querySelector('.brand-logo-img');
        if (side) { side.style.display = ''; side.src = src; }
        const login = document.querySelector('.login-logo-img');
        if (login) { login.style.display = ''; login.src = src; }
    },

    pilihLogo: async function(e) {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type || !file.type.startsWith('image/')) {
            showToast('File harus berupa gambar (PNG / JPG)', 'error');
            return;
        }

        // Kecilkan & konversi ke PNG di browser (maks 512x512, latar transparan tetap aman)
        let dataUrl = null;
        try {
            dataUrl = await new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        const maks = 512;
                        const skala = Math.min(1, maks / Math.max(img.width, img.height));
                        const c = document.createElement('canvas');
                        c.width  = Math.max(1, Math.round(img.width  * skala));
                        c.height = Math.max(1, Math.round(img.height * skala));
                        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                        resolve(c.toDataURL('image/png'));
                    };
                    img.onerror = () => reject(new Error('bukan gambar'));
                    img.src = fr.result;
                };
                fr.onerror = () => reject(new Error('gagal membaca file'));
                fr.readAsDataURL(file);
            });
        } catch (err) {
            showToast('File tidak bisa dibaca sebagai gambar', 'error');
            return;
        }

        try {
            const r = await nmFetch('api.php?ep=logo&act=upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logo: dataUrl })
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j.success) {
                showToast(j.error || 'Gagal mengunggah logo', 'error');
                return;
            }
            this.refreshLogo();
            showToast('Logo berhasil diganti!');
        } catch (err) {
            showToast('Tidak dapat terhubung ke server — logo belum tersimpan', 'error');
        }
    },

    hapusLogo: async function() {
        if (!confirm('Hapus logo dan kembali ke ikon bawaan?')) return;
        try {
            const r = await nmFetch('api.php?ep=logo&act=hapus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j.success) {
                showToast(j.error || 'Gagal menghapus logo', 'error');
                return;
            }
            this.refreshLogo();
            showToast('Logo dihapus — kembali ke ikon bawaan', 'info');
        } catch (err) {
            showToast('Tidak dapat terhubung ke server', 'error');
        }
    },

    // ==================== SAVE ====================
    save: async function(e) {
        e.preventDefault();
        const id = document.getElementById('userEditId').value;
        const username = document.getElementById('userUsername').value.trim();
        const fullname = document.getElementById('userFullname').value.trim();
        const phone = document.getElementById('userPhone').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const password = document.getElementById('userPassword').value;
        const role = document.getElementById('userRole').value;

        // Cek duplikat username
        if (usersData.find(u => u.username === username && u.id !== parseInt(id))) {
            showToast('Username sudah ada!', 'error');
            return;
        }

        // Cek duplikat email
        if (email && usersData.find(u => u.email === email && u.id !== parseInt(id))) {
            showToast('Email sudah digunakan!', 'error');
            return;
        }

        if (id) {
            // Edit
            const idx = usersData.findIndex(u => u.id === parseInt(id));
            if (idx !== -1) {
                usersData[idx].username = username;
                usersData[idx].fullname = fullname;
                usersData[idx].phone = phone;
                usersData[idx].email = email;
                usersData[idx].role = role;
                if (password) usersData[idx].password = password;
            }
        } else {
            // Tambah baru
            if (!password) {
                showToast('Password wajib!', 'error');
                return;
            }
            usersData.push({
                id: Date.now(),
                username,
                password,
                fullname,
                phone,
                email,
                role,
                createdAt: new Date().toISOString().split('T')[0]
            });
        }

        const ok = await saveAll();
        if (!ok) return;
        closeModal('userModal');
        this.renderTable();
        showToast('User berhasil disimpan!');
    }
};
