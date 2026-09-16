// ==================== FOTO DOKUMENTASI PAGE ====================
// File ini berisi HTML template + logika halaman foto
// Edit file ini untuk mengubah tampilan & fitur foto

const FotoPage = {

    // ==================== STATE ====================
    data: [],
    viewMode: 'list',  // 'grid' atau 'list'
    currentPhotoIndex: 0,

    // ==================== HTML TEMPLATE ====================
    html: `
        <!-- UPLOAD FORM -->
        <div class="chart-card" style="max-width:700px;margin-bottom:20px">
            <div class="chart-header">
                <h3><i class="fas fa-camera" style="color:var(--primary);margin-right:8px"></i>Upload Foto Dokumentasi</h3>
            </div>
            <form id="photoForm" onsubmit="FotoPage.save(event)">
                <div class="form-grid">
                    <div class="form-group">
                        <label><i class="fas fa-calendar"></i> Tanggal</label>
                        <input type="date" id="photoDate" required>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-map-marker-alt"></i> Lokasi</label>
                        <input type="text" id="photoLocation" placeholder="Lokasi pengambilan foto" required>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="fas fa-tag"></i> Keterangan</label>
                        <input type="text" id="photoCaption" placeholder="Deskripsi foto..." required>
                    </div>
                    <div class="form-group full-width">
                        <label><i class="fas fa-image"></i> Foto</label>
                        <div class="photo-upload-area">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Klik atau seret foto ke sini (otomatis dikompres, maks 50MB)</p>
                            <p style="font-size:.7rem;color:var(--text-secondary)">Format: JPG, PNG, GIF, WEBP</p>
                            <input type="file" id="photoFile" accept="image/jpeg,image/png,image/gif,image/webp" onchange="FotoPage.preview(this)" required>
                        </div>
                        <div class="photo-preview" id="photoPreview"></div>
                        <div id="uploadProgress" style="display:none;margin-top:8px">
                            <div style="background:var(--border);border-radius:8px;overflow:hidden;height:8px">
                                <div id="progressBar" style="background:var(--primary);height:100%;width:0%;transition:width 0.3s"></div>
                            </div>
                            <small id="progressText" style="color:var(--text-secondary)">Mengupload...</small>
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
                    <button type="button" class="btn btn-outline" onclick="FotoPage.reset()"><i class="fas fa-redo"></i> Reset</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Simpan Foto</button>
                </div>
            </form>
        </div>

        <!-- GALERI -->
        <div class="table-section">
            <div class="table-header">
                <h3><i class="fas fa-images" style="color:var(--primary);margin-right:8px"></i>Galeri Foto</h3>
                <div class="table-actions" style="display:flex;align-items:center;gap:12px">
                    <span style="font-size:.78rem;color:var(--text-secondary)" id="photoCount">0 foto</span>
                    <div style="display:flex;gap:4px;background:var(--bg-secondary);padding:3px;border-radius:8px">
                        <button class="btn btn-sm btn-icon" id="btnListView" onclick="FotoPage.setView('list')" style="background:var(--primary);color:white;padding:6px 10px">
                            <i class="fas fa-list"></i>
                        </button>
                        <button class="btn btn-sm btn-icon" id="btnGridView" onclick="FotoPage.setView('grid')" style="background:transparent;color:var(--text-secondary);padding:6px 10px">
                            <i class="fas fa-th-large"></i>
                        </button>
                    </div>
                </div>
            </div>
            <div id="photoGallery"></div>
        </div>
    `,

    // ==================== INIT ====================
    init: async function() {
        try {
            const resp = await nmFetch('api.php?ep=photos');
            this.data = await resp.json();
            if (!Array.isArray(this.data)) this.data = [];
        } catch(e) {
            this.data = [];
        }
        const pd = document.getElementById('photoDate');
        if (pd && !pd.value) pd.value = new Date().toISOString().split('T')[0];
    },

    // ==================== RENDER PAGE ====================
    renderPage: function() {
        const container = document.getElementById('page-foto');
        if (container) container.innerHTML = this.html;
    },

    // ==================== SET VIEW MODE ====================
    setView: function(mode) {
        this.viewMode = mode;
        // Update button styles
        const listBtn = document.getElementById('btnListView');
        const gridBtn = document.getElementById('btnGridView');
        if (mode === 'list') {
            listBtn.style.background = 'var(--primary)';
            listBtn.style.color = 'white';
            gridBtn.style.background = 'transparent';
            gridBtn.style.color = 'var(--text-secondary)';
        } else {
            gridBtn.style.background = 'var(--primary)';
            gridBtn.style.color = 'white';
            listBtn.style.background = 'transparent';
            listBtn.style.color = 'var(--text-secondary)';
        }
        this.renderGallery();
    },

    // ==================== SAVE PHOTO ====================
    save: async function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('photoFile');
        if (!fileInput.files || !fileInput.files[0]) {
            showToast('Pilih foto terlebih dahulu!', 'error');
            return;
        }

        const file = fileInput.files[0];
        if (file.size > 50 * 1024 * 1024) {
            showToast('Ukuran foto maksimal 50MB!', 'error');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showToast('Format file tidak didukung!', 'error');
            return;
        }

        const progressDiv = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        progressDiv.style.display = 'block';
        progressText.textContent = 'Mengompres foto...';

        // Kompres & perkecil foto di browser supaya upload ringan
        // dan selalu lolos batas upload PHP di server
        let blob = file;
        try { blob = await FotoPage.compressImage(file, 1920, 0.85); }
        catch (e) { blob = file; }

        const formData = new FormData();
        formData.append('photo', blob, 'foto.jpg');
        formData.append('date', document.getElementById('photoDate').value);
        formData.append('location', document.getElementById('photoLocation').value);
        formData.append('caption', document.getElementById('photoCaption').value);
        formData.append('uploadedBy', currentUser.fullname);

        try {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', function(e) {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    progressBar.style.width = percent + '%';
                    progressText.textContent = 'Mengupload... ' + percent + '%';
                }
            });

            const response = await new Promise((resolve, reject) => {
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        try { resolve(JSON.parse(xhr.responseText)); }
                        catch(e) { reject(new Error('Invalid response')); }
                    } else { reject(new Error('Upload failed')); }
                };
                xhr.onerror = function() { reject(new Error('Network error')); };
                xhr.open('POST', 'api.php?ep=photos&act=upload');
                if (_AUTH._token) xhr.setRequestHeader('X-Session-Id', _AUTH._token);
                xhr.send(formData);
            });

            if (response.error) {
                showToast(response.error, 'error');
            } else {
                this.data.unshift(response);
                this.reset();
                this.renderGallery();
                showToast('Foto berhasil diupload!');
            }
        } catch(e) {
            showToast('Gagal mengupload foto!', 'error');
        }

        progressDiv.style.display = 'none';
        progressBar.style.width = '0%';
    },

    // ==================== KOMPRES FOTO (di browser) ====================
    // Resize ke maksimal maxDim px & konversi ke JPEG supaya file kecil.
    compressImage: function(file, maxDim, quality) {
        return new Promise(function(resolve, reject) {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = function() {
                try {
                    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
                    const w = Math.max(1, Math.round(img.naturalWidth * scale));
                    const h = Math.max(1, Math.round(img.naturalHeight * scale));
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = '#fff';           // latar putih utk PNG transparan
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    c.toBlob(function(b) {
                        URL.revokeObjectURL(url);
                        if (b) resolve(b); else reject(new Error('Gagal kompres'));
                    }, 'image/jpeg', quality);
                } catch (e) { URL.revokeObjectURL(url); reject(e); }
            };
            img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Bukan gambar')); };
            img.src = url;
        });
    },

    // ==================== PREVIEW ====================
    preview: async function(input) {
        const preview = document.getElementById('photoPreview');
        if (input.files && input.files[0]) {
            const file = input.files[0];
            preview.innerHTML = '<div style="font-size:.75rem;color:var(--text-secondary)"><i class="fas fa-spinner fa-spin"></i> Menyiapkan pratinjau...</div>';
            try {
                // Pratinjau memakai hasil kompresi (sama dgn yang diupload)
                const blob = await FotoPage.compressImage(file, 1920, 0.85);
                const url = URL.createObjectURL(blob);
                const sizeMB = (blob.size / 1048576).toFixed(2);
                preview.innerHTML =
                    '<div style="position:relative">' +
                    '<img src="' + url + '" alt="Preview">' +
                    '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;font-size:.7rem;border-radius:0 0 8px 8px">' +
                    file.name + ' &rarr; JPG ' + sizeMB + ' MB (terkompresi)' +
                    '</div></div>';
            } catch (e) {
                // Fallback: tampilkan file asli
                const reader = new FileReader();
                reader.onload = function(ev) {
                    preview.innerHTML = '<img src="' + ev.target.result + '" alt="Preview">';
                };
                reader.readAsDataURL(file);
            }
        }
    },

    // ==================== RESET FORM ====================
    reset: function() {
        document.getElementById('photoForm').reset();
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('photoFile').value = '';
        document.getElementById('photoDate').value = new Date().toISOString().split('T')[0];
    },

    // ==================== RENDER GALLERY ====================
    renderGallery: function() {
        const gallery = document.getElementById('photoGallery');
        const count = document.getElementById('photoCount');
        if (!gallery) return;

        count.textContent = this.data.length + ' foto';

        if (this.data.length === 0) {
            gallery.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary)">' +
                '<i class="fas fa-images" style="font-size:2.5rem;opacity:0.3;margin-bottom:10px;display:block"></i>' +
                '<p>Belum ada foto dokumentasi</p></div>';
            return;
        }

        if (this.viewMode === 'list') {
            this.renderListView(gallery);
        } else {
            this.renderGridView(gallery);
        }
    },

    // ==================== LIST VIEW ====================
    renderListView: function(gallery) {
        const self = this;
        const fmtDate = function(d) {
            return new Date(d).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
        };
        const isAdmin = currentUser && currentUser.role === 'admin';

        gallery.innerHTML = '<div style="display:flex;flex-direction:column;gap:8px">' +
            this.data.map(function(p, i) {
                return '<div class="photo-list-item" style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--card-bg);border-radius:10px;border:1px solid var(--border);cursor:pointer;transition:all 0.2s" ' +
                    'onclick="FotoPage.openViewer(' + i + ')" ' +
                    'onmouseover="this.style.borderColor=\'var(--primary)\';this.style.boxShadow=\'0 2px 12px rgba(99,102,241,.15)\'" ' +
                    'onmouseout="this.style.borderColor=\'var(--border)\';this.style.boxShadow=\'none\'">' +
                    // Thumbnail
                    '<img src="' + p.photo + '" alt="' + p.caption + '" ' +
                        'style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0">' +
                    // Info
                    '<div style="flex:1;min-width:0">' +
                        '<div style="font-weight:600;font-size:.85rem;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.caption + '</div>' +
                        '<div style="display:flex;flex-wrap:wrap;gap:8px;font-size:.72rem;color:var(--text-secondary)">' +
                            '<span><i class="fas fa-map-marker-alt"></i> ' + p.location + '</span>' +
                            '<span><i class="fas fa-calendar"></i> ' + fmtDate(p.date) + '</span>' +
                            '<span><i class="fas fa-user"></i> ' + p.uploadedBy + '</span>' +
                        '</div>' +
                    '</div>' +
                    // Actions
                    '<div style="display:flex;gap:6px;flex-shrink:0">' +
                        '<button class="btn btn-sm btn-icon" style="background:var(--primary);color:white;padding:6px 8px" onclick="event.stopPropagation();FotoPage.openViewer(' + i + ')" title="Lihat">' +
                            '<i class="fas fa-eye"></i>' +
                        '</button>' +
                        (isAdmin ? '<button class="btn btn-sm btn-icon" style="background:#ef4444;color:white;padding:6px 8px" onclick="event.stopPropagation();FotoPage.confirmDelete(' + p.id + ')" title="Hapus"><i class="fas fa-trash"></i></button>' : '') +
                    '</div>' +
                '</div>';
            }).join('') +
            '</div>';
    },

    // ==================== GRID VIEW ====================
    renderGridView: function(gallery) {
        const self = this;
        const fmtDate = function(d) {
            return new Date(d).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'});
        };
        const isAdmin = currentUser && currentUser.role === 'admin';

        gallery.innerHTML = '<div class="photo-grid">' +
            this.data.map(function(p, i) {
                return '<div class="photo-card">' +
                    '<img class="photo-card-img" src="' + p.photo + '" alt="' + p.caption + '" onclick="FotoPage.openViewer(' + i + ')" loading="lazy">' +
                    '<div class="photo-card-body">' +
                        '<h4>' + p.caption + '</h4>' +
                        '<p><i class="fas fa-map-marker-alt"></i> ' + p.location + '</p>' +
                        '<p><i class="fas fa-calendar"></i> ' + fmtDate(p.date) + '</p>' +
                        '<p><i class="fas fa-user"></i> ' + p.uploadedBy + '</p>' +
                    '</div>' +
                    '<div class="photo-card-actions">' +
                        (isAdmin ? '<button class="btn btn-danger btn-sm" onclick="FotoPage.confirmDelete(' + p.id + ')"><i class="fas fa-trash"></i> Hapus</button>' : '') +
                    '</div></div>';
            }).join('') +
            '</div>';
    },

    // ==================== PHOTO VIEWER (LIGHTBOX) ====================
    openViewer: function(index) {
        this.currentPhotoIndex = index;
        const p = this.data[index];
        if (!p) return;

        const fmtDate = function(d) {
            return new Date(d).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
        };

        // Create viewer HTML if not exists
        let viewer = document.getElementById('photoViewer');
        if (!viewer) {
            viewer = document.createElement('div');
            viewer.id = 'photoViewer';
            viewer.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:10000;display:none;flex-direction:column';
            document.body.appendChild(viewer);
        }

        viewer.innerHTML = 
            // Header
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(0,0,0,0.5)">' +
                '<div style="color:white;font-size:.85rem">' +
                    '<i class="fas fa-image" style="margin-right:6px"></i>Foto ' + (index + 1) + ' dari ' + this.data.length +
                '</div>' +
                '<div style="display:flex;gap:8px">' +
                    '<button onclick="FotoPage.downloadPhoto()" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:.78rem"><i class="fas fa-download"></i> Download</button>' +
                    '<button onclick="FotoPage.closeViewer()" style="background:rgba(255,255,255,0.15);border:none;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:.78rem"><i class="fas fa-times"></i> Tutup</button>' +
                '</div>' +
            '</div>' +
            // Image Container
            '<div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">' +
                // Prev Button
                '<button onclick="FotoPage.prevPhoto()" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:white;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:1.1rem;z-index:2;display:' + (index > 0 ? 'flex' : 'none') + ';align-items:center;justify-content:center">' +
                    '<i class="fas fa-chevron-left"></i>' +
                '</button>' +
                // Image
                '<img id="viewerImg" src="' + p.photo + '" alt="' + p.caption + '" style="max-width:90%;max-height:calc(100vh - 180px);object-fit:contain;border-radius:8px">' +
                // Next Button
                '<button onclick="FotoPage.nextPhoto()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:white;width:44px;height:44px;border-radius:50%;cursor:pointer;font-size:1.1rem;z-index:2;display:' + (index < this.data.length - 1 ? 'flex' : 'none') + ';align-items:center;justify-content:center">' +
                    '<i class="fas fa-chevron-right"></i>' +
                '</button>' +
            '</div>' +
            // Info Panel
            '<div style="padding:12px 16px;background:rgba(0,0,0,0.5)">' +
                '<div style="display:flex;flex-wrap:wrap;gap:16px;color:white">' +
                    '<div style="flex:1;min-width:200px">' +
                        '<div style="font-weight:600;font-size:1rem;margin-bottom:4px">' + p.caption + '</div>' +
                        '<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:.78rem;color:rgba(255,255,255,0.7)">' +
                            '<span><i class="fas fa-map-marker-alt"></i> ' + p.location + '</span>' +
                            '<span><i class="fas fa-calendar"></i> ' + fmtDate(p.date) + '</span>' +
                            '<span><i class="fas fa-user"></i> ' + p.uploadedBy + '</span>' +
                        '</div>' +
                    '</div>' +
                    // Thumbnail Strip
                    '<div style="display:flex;gap:4px;overflow-x:auto;max-width:300px;padding:4px 0">' +
                        this.data.map(function(img, idx) {
                            return '<img src="' + img.photo + '" ' +
                                'onclick="FotoPage.openViewer(' + idx + ')" ' +
                                'style="width:40px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;border:2px solid ' + (idx === index ? 'var(--primary)' : 'transparent') + ';opacity:' + (idx === index ? '1' : '0.6') + '">' ;
                        }).join('') +
                    '</div>' +
                '</div>' +
            '</div>';

        viewer.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Keyboard navigation
        this._keyHandler = function(e) {
            if (e.key === 'Escape') FotoPage.closeViewer();
            if (e.key === 'ArrowLeft') FotoPage.prevPhoto();
            if (e.key === 'ArrowRight') FotoPage.nextPhoto();
        };
        document.addEventListener('keydown', this._keyHandler);
    },

    closeViewer: function() {
        const viewer = document.getElementById('photoViewer');
        if (viewer) viewer.style.display = 'none';
        document.body.style.overflow = '';
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
        }
    },

    prevPhoto: function() {
        if (this.currentPhotoIndex > 0) {
            this.openViewer(this.currentPhotoIndex - 1);
        }
    },

    nextPhoto: function() {
        if (this.currentPhotoIndex < this.data.length - 1) {
            this.openViewer(this.currentPhotoIndex + 1);
        }
    },

    downloadPhoto: function() {
        const p = this.data[this.currentPhotoIndex];
        if (!p) return;
        const a = document.createElement('a');
        a.href = p.photo;
        a.download = p.caption + '.jpg';
        a.click();
    },

    // ==================== DELETE ====================
    confirmDelete: async function(id) {
        if (!confirm('Yakin ingin menghapus foto ini?')) return;
        try {
            await nmFetch('api.php?ep=photos&act=delete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id: id})
            });
            this.data = this.data.filter(function(p) { return p.id !== id; });
        } catch(e) {}
        this.renderGallery();
        showToast('Foto berhasil dihapus!', 'error');
    }
};
