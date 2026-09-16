// ==================== TAMBAH LAPORAN MODULE ====================
// File terpisah untuk form tambah & edit maintenance
// Memudahkan editing dan penambahan field baru

const TambahLaporan = {
    
    // ==================== FORM SUBMISSION ====================
    save: async function(e) {
        e.preventDefault();
        const now = new Date().toISOString();
        const status = document.getElementById('formStatus').value;
        
        const item = {
            id: Date.now(),
            date: document.getElementById('formDate').value,
            time: document.getElementById('formTime').value,
            location: document.getElementById('formLocation').value,
            category: document.getElementById('formCategory').value,
            problem: document.getElementById('formProblem').value,
            solution: document.getElementById('formSolution').value,
            technician: currentUser.fullname,
            priority: document.getElementById('formPriority').value,
            status: status,
            createdBy: currentUser.username,
            createdAt: now,
            completedAt: status === 'Selesai' ? now : null
        };
        
        maintenanceData.push(item);
        const ok = await saveAll();
        this.resetForm();
        renderAll();
        if (ok) showToast('Data berhasil disimpan!');
    },
    
    // ==================== RESET FORM ====================
    resetForm: function() {
        document.getElementById('addForm').reset();
        setDefaultDates();
    },
    
    // ==================== MODAL: OPEN ADD ====================
    openAddModal: function() {
        document.getElementById('modalTitle').innerHTML = 
            '<i class="fas fa-plus-circle" style="color:var(--primary);margin-right:8px"></i>Tambah Data';
        document.getElementById('modalId').value = '';
        document.getElementById('modalForm').reset();
        // Item pemeriksaan kembali kosong (menunggu pemeriksaan dipilih)
        if (typeof DROPDOWN !== 'undefined') DROPDOWN.isiItem('modalPriority', '', '');
        document.getElementById('modalDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('modalTime').value = new Date().toTimeString().slice(0, 5);
        openModal('dataModal');
    },
    
    // ==================== MODAL: OPEN EDIT ====================
    openEditModal: function(id) {
        const d = maintenanceData.find(x => x.id === id);
        if (!d) return;
        // User biasa hanya boleh mengedit data miliknya sendiri (hapus = admin)
        if (!isAdmin() && (!currentUser || d.createdBy !== currentUser.username)) {
            showToast('Anda hanya bisa mengedit data milik sendiri!', 'error');
            return;
        }
        
        document.getElementById('modalTitle').innerHTML = 
            '<i class="fas fa-edit" style="color:var(--primary);margin-right:8px"></i>Edit Data';
        document.getElementById('modalId').value = id;
        document.getElementById('modalDate').value = d.date;
        document.getElementById('modalTime').value = d.time;
        document.getElementById('modalLocation').value = d.location;
        // Pemeriksaan: kalau data lama punya kategori yang tidak ada di daftar
        // baru, tetap ditawarkan supaya datanya tidak hilang saat disimpan.
        const selCat = document.getElementById('modalCategory');
        selCat.value = d.category;
        if (d.category && selCat.value !== d.category) {
            const opt = document.createElement('option');
            opt.value = d.category;
            opt.textContent = d.category;
            selCat.appendChild(opt);
            selCat.value = d.category;
        }
        // Item pemeriksaan otomatis tersortir sesuai pemeriksaan
        if (typeof DROPDOWN !== 'undefined') DROPDOWN.isiItem('modalPriority', d.category, d.priority);
        document.getElementById('modalProblem').value = d.problem;
        document.getElementById('modalSolution').value = d.solution || '';
        document.getElementById('modalStatus').value = d.status;
        openModal('dataModal');
    },
    
    // ==================== MODAL: SAVE ====================
    saveFromModal: async function(e) {
        e.preventDefault();
        const id = document.getElementById('modalId').value;
        const newStatus = document.getElementById('modalStatus').value;
        const now = new Date().toISOString();
        
        const obj = {
            date: document.getElementById('modalDate').value,
            time: document.getElementById('modalTime').value,
            location: document.getElementById('modalLocation').value,
            category: document.getElementById('modalCategory').value,
            problem: document.getElementById('modalProblem').value,
            solution: document.getElementById('modalSolution').value,
            technician: currentUser.fullname,
            priority: document.getElementById('modalPriority').value,
            status: newStatus
        };
        
        let jadiSelesai = false;
        if (id) {
            // EDIT existing
            const idx = maintenanceData.findIndex(d => d.id === parseInt(id));
            if (idx !== -1) {
                const statusLama = maintenanceData[idx].status;
                if (newStatus === 'Selesai' && statusLama !== 'Selesai') {
                    obj.completedAt = now;
                    jadiSelesai = true;
                }
                maintenanceData[idx] = { ...maintenanceData[idx], ...obj };
            }
        } else {
            // ADD new
            maintenanceData.push({
                id: Date.now(),
                ...obj,
                createdBy: currentUser.username,
                createdAt: now,
                completedAt: newStatus === 'Selesai' ? now : null
            });
        }
        
        const ok = await saveAll();
        closeModal('dataModal');
        renderAll();
        if (typeof DataMaintenancePage !== 'undefined' && document.getElementById('dataTableBody')) DataMaintenancePage.render();
        if (ok) showToast(jadiSelesai
            ? 'Data ditandai Selesai — keluar dari daftar Belum Selesai (ubah filter Status untuk melihatnya kembali)'
            : (id ? 'Data berhasil diupdate!' : 'Data berhasil disimpan!'));
    },
    
    // ==================== DELETE ====================
    confirmDelete: async function(id) {
        // Penghapusan data hanya boleh dilakukan admin
        if (!isAdmin()) {
            showToast('Penghapusan data hanya boleh dilakukan admin!', 'error');
            return;
        }
        const btn = document.getElementById('confirmBtn');
        document.getElementById('confirmMsg').textContent = 'Yakin hapus data ini?';
        btn.onclick = async () => {
            maintenanceData = maintenanceData.filter(d => d.id !== id);
            const ok = await saveAll();
            closeModal('confirmModal');
            renderAll();
            if (typeof DataMaintenancePage !== 'undefined' && document.getElementById('dataTableBody')) DataMaintenancePage.render();
            if (ok) showToast('Data dihapus!', 'error');
        };
        openModal('confirmModal');
    }
};
